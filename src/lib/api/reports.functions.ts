import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TargetType = z.enum(["project", "discussion", "reply"]);

export const reportContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      targetType: TargetType,
      targetId: z.string().uuid(),
      reason: z.string().min(4).max(600),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("content_reports").insert({
      reporter_id: context.userId,
      target_type: data.targetType,
      target_id: data.targetId,
      reason: data.reason,
    });
    if (error) throw error;
    return { ok: true };
  });

async function assertStaff(supabase: any, userId: string) {
  const results = await Promise.all(
    (["admin", "moderator"] as const).map((r) => supabase.rpc("has_role", { _user_id: userId, _role: r })),
  );
  if (!results.some((r: any) => r.data)) throw new Error("Forbidden");
}

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: reports, error } = await supabaseAdmin
      .from("content_reports")
      .select("id,target_type,target_id,reason,status,created_at,reporter_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const rows = reports ?? [];
    if (rows.length === 0) return [];

    const byType = (t: string) => rows.filter((r) => r.target_type === t).map((r) => r.target_id);
    const [projects, discussions, replies, profiles] = await Promise.all([
      supabaseAdmin.from("projects").select("id,title,slug").in("id", byType("project")),
      supabaseAdmin.from("discussions").select("id,title").in("id", byType("discussion")),
      supabaseAdmin.from("discussion_replies").select("id,body,discussion_id").in("id", byType("reply")),
      supabaseAdmin
        .from("profiles")
        .select("id,display_name")
        .in("id", Array.from(new Set(rows.map((r) => r.reporter_id)))),
    ]);

    const pMap = new Map((projects.data ?? []).map((p) => [p.id, p]));
    const dMap = new Map((discussions.data ?? []).map((d) => [d.id, d]));
    const rMap = new Map((replies.data ?? []).map((r) => [r.id, r]));
    const profMap = new Map((profiles.data ?? []).map((p) => [p.id, p]));

    return rows.map((r) => {
      const project = r.target_type === "project" ? pMap.get(r.target_id) : null;
      const discussion = r.target_type === "discussion" ? dMap.get(r.target_id) : null;
      const reply = r.target_type === "reply" ? rMap.get(r.target_id) : null;
      return {
        ...r,
        reporter: profMap.get(r.reporter_id)?.display_name ?? "Someone",
        label: project?.title ?? discussion?.title ?? reply?.body?.slice(0, 90) ?? "Removed content",
        link: project
          ? `/innovate/${project.slug}`
          : discussion
            ? `/community/${discussion.id}`
            : reply
              ? `/community/${reply.discussion_id}`
              : null,
      };
    });
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      reportId: z.string().uuid(),
      status: z.enum(["resolved", "dismissed"]),
      deleteTarget: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: report } = await supabaseAdmin
      .from("content_reports")
      .select("target_type,target_id")
      .eq("id", data.reportId)
      .maybeSingle();

    if (data.deleteTarget && report) {
      const table =
        report.target_type === "project"
          ? "projects"
          : report.target_type === "discussion"
            ? "discussions"
            : "discussion_replies";
      await supabaseAdmin.from(table).delete().eq("id", report.target_id);
    }

    const { error } = await supabaseAdmin
      .from("content_reports")
      .update({ status: data.status, reviewed_by: context.userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.reportId);
    if (error) throw error;
    return { ok: true };
  });
