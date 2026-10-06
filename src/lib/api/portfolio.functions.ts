import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const urlOrEmpty = z.string().url().max(300).optional().or(z.literal(""));

export const getMyPortfolio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "id,display_name,bio,country,headline,university,study_year,skills,github_url,linkedin_url,website_url,open_to,talent_visible,interests",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const updateMyPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      display_name: z.string().min(2).max(80),
      headline: z.string().max(200).optional().default(""),
      bio: z.string().max(1500).optional().default(""),
      country: z.string().max(60).optional().default(""),
      university: z.string().max(160).optional().default(""),
      study_year: z.string().max(40).optional().default(""),
      skills: z.array(z.string().min(1).max(40)).max(20).default([]),
      github_url: urlOrEmpty,
      linkedin_url: urlOrEmpty,
      website_url: urlOrEmpty,
      open_to: z.array(z.enum(["internship", "job", "collaboration", "mentorship"])).max(4).default([]),
      talent_visible: z.boolean().default(false),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        headline: data.headline || null,
        bio: data.bio || null,
        country: data.country || null,
        university: data.university || null,
        study_year: data.study_year || null,
        skills: data.skills,
        github_url: data.github_url || null,
        linkedin_url: data.linkedin_url || null,
        website_url: data.website_url || null,
        open_to: data.open_to,
        talent_visible: data.talent_visible,
      })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
