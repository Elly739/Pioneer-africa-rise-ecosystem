import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Vote counts for a discussion and its replies, plus what the viewer voted on. */
export const getThreadVotes = createServerFn({ method: "GET" })
  .inputValidator(z.object({ discussionId: z.string().uuid(), viewerId: z.string().uuid().nullable().optional() }))
  .handler(async ({ data }) => {
    const { data: replies } = await supabaseAdmin
      .from("discussion_replies")
      .select("id")
      .eq("discussion_id", data.discussionId);
    const replyIds = (replies ?? []).map((r) => r.id);

    const { data: votes } = await supabaseAdmin
      .from("discussion_votes")
      .select("discussion_id,reply_id,user_id")
      .or(
        [`discussion_id.eq.${data.discussionId}`, replyIds.length ? `reply_id.in.(${replyIds.join(",")})` : null]
          .filter(Boolean)
          .join(","),
      );

    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    for (const v of votes ?? []) {
      const key = v.reply_id ?? v.discussion_id;
      if (!key) continue;
      counts[key] = (counts[key] ?? 0) + 1;
      if (data.viewerId && v.user_id === data.viewerId) mine.add(key);
    }
    return { counts, mine: Array.from(mine) };
  });

export const toggleThreadVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ discussionId: z.string().uuid().nullable(), replyId: z.string().uuid().nullable() }))
  .handler(async ({ data, context }) => {
    if (!data.discussionId === !data.replyId) throw new Error("Vote on a discussion or a reply, not both");
    const col = data.replyId ? "reply_id" : "discussion_id";
    const value = data.replyId ?? data.discussionId!;

    const { data: existing } = await context.supabase
      .from("discussion_votes")
      .select("id")
      .eq(col, value)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await context.supabase.from("discussion_votes").delete().eq("id", existing.id);
      if (error) throw error;
      return { voted: false };
    }
    const { error } = await context.supabase
      .from("discussion_votes")
      .insert({ user_id: context.userId, [col]: value } as never);
    if (error) throw error;
    return { voted: true };
  });

/** Only the discussion owner may mark (or clear) the accepted answer. */
export const setAcceptedAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ discussionId: z.string().uuid(), replyId: z.string().uuid().nullable() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("discussions")
      .update({ accepted_reply_id: data.replyId })
      .eq("id", data.discussionId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/** Mentors (teacher/admin/moderator) can open an office-hours thread. */
export const createOfficeHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      title: z.string().min(4).max(140),
      body: z.string().min(1).max(5000),
      startsAt: z.string().min(4),
    }),
  )
  .handler(async ({ data, context }) => {
    const roles = await Promise.all(
      (["admin", "teacher", "moderator"] as const).map((r) =>
        context.supabase.rpc("has_role", { _user_id: context.userId, _role: r }),
      ),
    );
    if (!roles.some((r) => r.data)) throw new Error("Only mentors can host office hours");

    const { data: row, error } = await context.supabase
      .from("discussions")
      .insert({
        user_id: context.userId,
        topic: "mentorship",
        title: data.title,
        body: data.body,
        is_office_hours: true,
        office_hours_at: new Date(data.startsAt).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const listOfficeHours = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("discussions")
    .select("id,title,body,office_hours_at,user_id")
    .eq("is_office_hours", true)
    .order("office_hours_at", { ascending: true })
    .limit(6);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id,display_name,avatar_url")
    .in("id", Array.from(new Set(rows.map((r) => r.user_id))));
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, host: map.get(r.user_id) ?? null }));
});
