import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listProjectMilestones = createServerFn({ method: "GET" })
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("project_milestones")
      .select("id,title,body,happened_on,created_at")
      .eq("project_id", data.projectId)
      .order("happened_on", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const addProjectMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      projectId: z.string().uuid(),
      title: z.string().min(3).max(140),
      body: z.string().max(2000).default(""),
      happenedOn: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("project_milestones").insert({
      project_id: data.projectId,
      user_id: context.userId,
      title: data.title,
      body: data.body ?? "",
      happened_on: data.happenedOn || new Date().toISOString().slice(0, 10),
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteProjectMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("project_milestones").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Project of the week: most liked project with activity in the last 7 days, newest as tiebreak. */
export const getFeaturedProject = createServerFn({ method: "GET" }).handler(async () => {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("id,title,slug,summary,cover_url,tags,status,user_id,created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  const rows = projects ?? [];
  if (rows.length === 0) return null;

  const ids = rows.map((r) => r.id);
  const [{ data: likes }, { data: milestones }] = await Promise.all([
    supabaseAdmin.from("project_likes").select("project_id,created_at").in("project_id", ids),
    supabaseAdmin.from("project_milestones").select("project_id,created_at").in("project_id", ids),
  ]);

  const score = new Map<string, number>();
  for (const l of likes ?? []) score.set(l.project_id, (score.get(l.project_id) ?? 0) + (l.created_at >= since ? 3 : 1));
  for (const m of milestones ?? [])
    score.set(m.project_id, (score.get(m.project_id) ?? 0) + (m.created_at >= since ? 2 : 0));

  const best = rows.slice().sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0))[0];
  if (!best) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name,avatar_url")
    .eq("id", best.user_id)
    .maybeSingle();

  return { ...best, author: profile ?? null, likes: score.get(best.id) ?? 0 };
});
