import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BadgeRow = {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  sort_order: number;
  earned_at?: string | null;
};

export const listBadges = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("badges")
    .select("code,name,description,icon,tier,sort_order")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as BadgeRow[];
});

export const getUserBadges = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const [all, earned] = await Promise.all([
      supabaseAdmin.from("badges").select("code,name,description,icon,tier,sort_order").order("sort_order"),
      supabaseAdmin.from("user_badges").select("badge_code,earned_at").eq("user_id", data.userId),
    ]);
    const earnedMap = new Map((earned.data ?? []).map((r) => [r.badge_code, r.earned_at]));
    return ((all.data ?? []) as BadgeRow[]).map((b) => ({
      ...b,
      earned_at: earnedMap.get(b.code) ?? null,
    }));
  });

export const getMyBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [all, earned] = await Promise.all([
      supabaseAdmin.from("badges").select("code,name,description,icon,tier,sort_order").order("sort_order"),
      context.supabase.from("user_badges").select("badge_code,earned_at").eq("user_id", context.userId),
    ]);
    const earnedMap = new Map((earned.data ?? []).map((r) => [r.badge_code, r.earned_at]));
    return ((all.data ?? []) as BadgeRow[]).map((b) => ({
      ...b,
      earned_at: earnedMap.get(b.code) ?? null,
    }));
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({ limit: z.number().int().min(1).max(100).optional() })
      .optional()
      .default({}),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("leaderboard")
      .select("user_id,display_name,avatar_url,headline,university,country,score,projects_count,certificates_count,level,xp,badge_count")
      .order("score", { ascending: false })
      .order("xp", { ascending: false })
      .limit(data?.limit ?? 50);
    if (error) throw error;
    return (rows ?? []).filter((r) => (r.score ?? 0) > 0 || (r.xp ?? 0) > 0);
  });

export const getMyRank = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows } = await supabaseAdmin
      .from("leaderboard")
      .select("user_id,score,xp")
      .order("score", { ascending: false })
      .order("xp", { ascending: false })
      .limit(500);
    const list = (rows ?? []).filter((r) => (r.score ?? 0) > 0 || (r.xp ?? 0) > 0);
    const index = list.findIndex((r) => r.user_id === context.userId);
    return {
      rank: index >= 0 ? index + 1 : null,
      total: list.length,
      score: index >= 0 ? list[index].score ?? 0 : 0,
    };
  });
