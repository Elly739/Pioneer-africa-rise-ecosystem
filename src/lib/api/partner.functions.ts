import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider, CHAT_MODEL } from "@/lib/ai-gateway.server";

async function assertPartner(supabase: any, userId: string) {
  const results = await Promise.all(
    (["partner", "admin"] as const).map((r) => supabase.rpc("has_role", { _user_id: userId, _role: r })),
  );
  if (!results.some((r: any) => r.data)) throw new Error("Only partners can review applicants");
}

/** Listings this partner posted, with applicant counts. */
export const listMyListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPartner(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("opportunities")
      .select("id,title,organization,type,location,remote,deadline,created_at,applications:applications(count)")
      .eq("created_by", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      title: z.string().min(3).max(140),
      organization: z.string().min(2).max(120),
      type: z.enum(["internship", "job", "scholarship", "hackathon", "fellowship", "grant", "incubator"]),
      description: z.string().min(10).max(4000),
      location: z.string().max(120).optional().nullable(),
      remote: z.boolean().default(false),
      applyUrl: z.string().url().optional().nullable(),
      deadline: z.string().optional().nullable(),
      tags: z.array(z.string().max(30)).max(10).default([]),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertPartner(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("opportunities")
      .insert({
        title: data.title,
        organization: data.organization,
        type: data.type,
        description: data.description,
        location: data.location ?? null,
        remote: data.remote,
        apply_url: data.applyUrl ?? null,
        deadline: data.deadline || null,
        tags: data.tags,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

/** Applicants for one of this partner's listings. */
export const listListingApplicants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ opportunityId: z.string().uuid().nullable().optional() }))
  .handler(async ({ data, context }) => {
    await assertPartner(context.supabase, context.userId);

    let query = context.supabase
      .from("applications")
      .select(
        "id,status,notes,created_at,opportunity_id,user_id,opportunities:opportunity_id(title,organization,created_by),profiles:user_id(display_name,avatar_url,headline,university,skills),projects:project_id(title,slug,summary)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.opportunityId) query = query.eq("opportunity_id", data.opportunityId);

    const { data: rows, error } = await query;
    if (error) throw error;
    return (rows ?? []).filter((r: any) => r.opportunities?.created_by === context.userId || !r.opportunities);
  });

export const setApplicantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      applicationId: z.string().uuid(),
      status: z.enum(["submitted", "under_review", "interview", "offer", "rejected"]),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertPartner(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("applications")
      .update({ status: data.status })
      .eq("id", data.applicationId);
    if (error) throw error;
    return { ok: true };
  });

/** Admin-only: mark a partner profile as verified. */
export const setPartnerVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), verified: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ partner_verified: data.verified })
      .eq("id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

/** One-click AI-tailored cover note for an opportunity, grounded in the learner's real profile. */
export const generateCoverNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ opportunityId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: opp }, { data: profile }, { data: projects }, { data: certs }] = await Promise.all([
      supabaseAdmin
        .from("opportunities")
        .select("title,organization,type,description,tags,location,remote")
        .eq("id", data.opportunityId)
        .maybeSingle(),
      context.supabase
        .from("profiles")
        .select("display_name,headline,university,study_year,bio,skills,interests,country")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("projects")
        .select("title,summary,tags,status")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(4),
      context.supabase.from("certificates").select("course_id").eq("user_id", context.userId),
    ]);

    if (!opp) throw new Error("Opportunity not found");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const prompt = `Write a short, specific cover note (max 160 words) for this application.

OPPORTUNITY
${JSON.stringify(opp)}

APPLICANT
${JSON.stringify({ profile, projects: projects ?? [], certificates: (certs ?? []).length })}

Rules:
- Use only facts present above. Never invent experience, employers or grades.
- Open with why this specific organisation/role, then one concrete proof point from their real projects or skills.
- Plain, confident, human. No greeting placeholders like [Name]. No markdown headings.
- End with a one-line close offering to share their portfolio.`;

    try {
      const { text } = await generateText({ model: gateway(CHAT_MODEL), prompt });
      return { note: text.trim() };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 402) throw new Error("AI credits are exhausted — add credits to keep using AI features.");
      if (status === 429) throw new Error("AI is busy right now. Try again in a moment.");
      throw new Error("Could not draft a cover note. Try again.");
    }
  });
