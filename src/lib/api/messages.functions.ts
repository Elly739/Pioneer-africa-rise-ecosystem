import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_BODY = 2000;
const HOURLY_CAP = 50;

type Summary = {
  conversation_id: string;
  other_user_id: string;
  other_name: string | null;
  other_avatar: string | null;
  last_message_at: string;
  last_message_body: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
};

export const startOrOpenConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: conversationId, error } = await context.supabase.rpc("start_or_open_conversation", {
      _other_user: data.userId,
    });
    if (error) throw new Error(error.message);
    return { conversationId: conversationId as string };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("conversation_summaries");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Summary[];
    return {
      conversations: rows.map((r) => ({
        conversationId: r.conversation_id,
        otherUserId: r.other_user_id,
        otherName: r.other_name ?? "Pioneer member",
        otherAvatar: r.other_avatar,
        lastMessageAt: r.last_message_at,
        lastMessageBody: r.last_message_body,
        lastMessageFromMe: r.last_message_sender_id != null && r.last_message_sender_id === r.other_user_id ? false : r.last_message_sender_id != null,
        unread: Number(r.unread_count ?? 0),
      })),
      unread: rows.reduce((s, r) => s + Number(r.unread_count ?? 0), 0),
    };
  });

export const getUnreadMessageCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("conversation_summaries");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Summary[];
    return { unread: rows.reduce((s, r) => s + Number(r.unread_count ?? 0), 0) };
  });

export const getConversationMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ conversationId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: me } = await supabase
      .from("conversation_participants")
      .select("last_read_at")
      .eq("conversation_id", data.conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!me) throw new Error("This conversation isn't yours");

    const [messages, summaries] = await Promise.all([
      supabase
        .from("messages")
        .select("id,body,sender_id,created_at")
        .eq("conversation_id", data.conversationId)
        .order("created_at", { ascending: true })
        .limit(300),
      supabase.rpc("conversation_summaries"),
    ]);
    if (messages.error) throw new Error(messages.error.message);

    const other = ((summaries.data ?? []) as Summary[]).find((s) => s.conversation_id === data.conversationId);

    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversationId)
      .eq("user_id", userId);

    return {
      conversationId: data.conversationId,
      messages: messages.data ?? [],
      other: other ? { id: other.other_user_id, name: other.other_name ?? "Pioneer member", avatar: other.other_avatar } : null,
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ conversationId: z.string().uuid(), body: z.string().min(1).max(MAX_BODY) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const body = data.body.trim();
    if (body.length < 2) throw new Error("Write at least 2 characters.");

    const { data: participant } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", data.conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!participant) throw new Error("This conversation isn't yours");

    const { data: recent } = await supabase
      .from("messages")
      .select("body,sender_id")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: false })
      .limit(1);
    const last = recent?.[0];
    if (last && last.sender_id === userId && last.body.trim() === body) throw new Error("That message was already sent.");

    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId)
      .gte("created_at", hourAgo);
    if ((count ?? 0) >= HOURLY_CAP) throw new Error("You've sent a lot of messages recently — please wait a little while.");

    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: data.conversationId, sender_id: userId, body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertStaff(supabase: any, userId: string) {
  const results = await Promise.all(
    (["admin", "moderator"] as const).map((r) => supabase.rpc("has_role", { _user_id: userId, _role: r })),
  );
  if (!results.some((r: any) => r.data)) throw new Error("Forbidden");
}

// Staff can read a conversation only once it has been reported — never on a hunch.
export const getReportedConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ conversationId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: report } = await supabaseAdmin
      .from("content_reports")
      .select("id")
      .eq("target_type", "conversation")
      .eq("target_id", data.conversationId)
      .limit(1);
    if (!report || report.length === 0) throw new Error("Only reported conversations can be reviewed");

    const [{ data: messages, error }, participants] = await Promise.all([
      supabaseAdmin
        .from("messages")
        .select("id,body,sender_id,created_at")
        .eq("conversation_id", data.conversationId)
        .order("created_at", { ascending: true })
        .limit(500),
      supabaseAdmin
        .from("conversation_participants")
        .select("user_id, conversation_id")
        .eq("conversation_id", data.conversationId),
    ]);
    if (error) throw new Error(error.message);

    const memberIds = (participants ?? []).map((p) => p.user_id);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id,display_name").in("id", memberIds);
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "Pioneer member"]));

    return {
      conversationId: data.conversationId,
      members: memberIds.map((id) => ({ id, name: nameMap.get(id) ?? "Pioneer member" })),
      messages: (messages ?? []).map((m) => ({ ...m, senderName: nameMap.get(m.sender_id) ?? "Pioneer member" })),
    };
  });
