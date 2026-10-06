import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { getConversationMessages, sendMessage } from "@/lib/api/messages.functions";
import { ReportButton } from "@/components/thread-actions";

const conversationQuery = (conversationId: string) =>
  queryOptions({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversationMessages({ data: { conversationId } }),
  });

export const Route = createFileRoute("/_authenticated/inbox/$conversationId")({
  head: () => ({
    meta: [
      { title: "Message — Pioneer Africa Hub" },
      { name: "description", content: "A private conversation between two Pioneer Africa Hub members." },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(conversationQuery(params.conversationId)),
  errorComponent: () => (
    <div className="p-10 text-center">
      <p className="font-display text-lg font-bold">This conversation isn't available</p>
      <p className="text-sm text-brand-navy/60 mt-1">It may have been removed, or it isn't yours to open.</p>
    </div>
  ),
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useQuery(conversationQuery(conversationId));
  const sendFn = useServerFn(sendMessage);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
          qc.invalidateQueries({ queryKey: ["inbox"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [data?.messages.length]);

  const send = useMutation({
    mutationFn: () => sendFn({ data: { conversationId, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send"),
  });

  if (!data) return null;
  const other = data.other;

  return (
    <div className="min-h-dvh bg-brand-bg text-brand-navy flex flex-col">
      <SiteNav />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-5">
          <Link
            to="/inbox"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy/60 hover:text-brand-navy rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" aria-hidden /> Back to inbox
          </Link>
          <ReportButton targetType="conversation" targetId={conversationId} />
        </div>

        <header className="bg-white border border-brand-navy/5 rounded-2xl p-4 flex items-center gap-3 mb-4">
          <Link
            to="/u/$userId"
            params={{ userId: other?.id ?? conversationId }}
            className="size-11 shrink-0 rounded-full bg-brand-orange/15 text-brand-orange font-bold flex items-center justify-center text-sm overflow-hidden hover:ring-2 hover:ring-brand-orange/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`View ${other?.name ?? "this member"}'s profile`}
          >
            {other?.avatar ? (
              <img src={other.avatar} alt="" className="size-full object-cover" />
            ) : (
              (other?.name ?? "P").slice(0, 2).toUpperCase()
            )}
          </Link>
          <div className="min-w-0">
            <p className="font-display font-bold truncate">{other?.name ?? "Pioneer member"}</p>
            <p className="text-xs text-brand-navy/50">Private conversation</p>
          </div>
        </header>

        <div className="flex-1 bg-white border border-brand-navy/5 rounded-2xl p-4 sm:p-5 space-y-3 overflow-y-auto max-h-[52vh]">
          {data.messages.length === 0 ? (
            <p className="text-sm text-brand-navy/60 text-center py-10">
              No messages yet — say hello and start the conversation.
            </p>
          ) : (
            data.messages.map((msg) => {
              const mine = msg.sender_id !== other?.id;
              return (
                <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? "bg-brand-navy text-white" : "bg-brand-clay text-brand-navy"}`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${mine ? "text-white/50" : "text-brand-navy/40"}`}>
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim()) send.mutate();
          }}
          className="mt-4 flex items-end gap-2"
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Write a message…"
            aria-label="Message"
            className="flex-1 px-4 py-3 rounded-xl border border-brand-navy/10 bg-white text-sm focus:outline-none focus:border-brand-orange resize-none"
          />
          <button
            type="submit"
            disabled={send.isPending || !body.trim()}
            className="px-5 py-3 rounded-xl bg-brand-orange text-white font-bold text-sm disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Send className="size-4" aria-hidden /> {send.isPending ? "Sending" : "Send"}
          </button>
        </form>

        <p className="text-[11px] text-brand-navy/45 mt-3">
          Private between two members. Moderators can only read a conversation after someone reports it.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
