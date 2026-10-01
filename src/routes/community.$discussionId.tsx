import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MessagesSquare, CalendarClock } from "lucide-react";
import { useSuspenseQuery, useQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getDiscussion, replyToDiscussion } from "@/lib/api/ecosystem.functions";
import { getThreadVotes, toggleThreadVote, setAcceptedAnswer } from "@/lib/api/community.functions";
import { VoteButton, AcceptedBadge, ReportButton } from "@/components/thread-actions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const threadQuery = (id: string) => queryOptions({
  queryKey: ["discussion", id],
  queryFn: () => getDiscussion({ data: { id } }),
});

export const Route = createFileRoute("/community/$discussionId")({
  head: ({ loaderData }) => {
    const t = (loaderData as { discussion?: { title: string } } | undefined)?.discussion?.title;
    return { meta: [{ title: `${t ?? "Discussion"} — Pioneer Africa Hub Community` }] };
  },
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(threadQuery(params.discussionId));
    if (!data) throw notFound();
    return data;
  },
  errorComponent: () => <div className="p-10 text-center">Failed to load discussion.</div>,
  notFoundComponent: () => <div className="p-10 text-center">Discussion not found.</div>,
  component: ThreadPage,
});

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ name }: { name: string | null | undefined }) {
  const initials = (name ?? "A").slice(0, 2).toUpperCase();
  return <div className="size-10 shrink-0 rounded-full bg-brand-orange/15 text-brand-orange font-bold flex items-center justify-center text-sm">{initials}</div>;
}

function ThreadPage() {
  const { discussionId } = Route.useParams();
  const { data } = useSuspenseQuery(threadQuery(discussionId));
  const qc = useQueryClient();
  const reply = useServerFn(replyToDiscussion);
  const votesFn = useServerFn(getThreadVotes);
  const toggleFn = useServerFn(toggleThreadVote);
  const acceptFn = useServerFn(setAcceptedAnswer);
  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { setSignedIn(!!data.session); setUserId(data.session?.user.id ?? null); }); }, []);

  const { data: votes } = useQuery({
    queryKey: ["thread-votes", discussionId, userId],
    queryFn: () => votesFn({ data: { discussionId, viewerId: userId } }),
  });
  const refreshVotes = () => qc.invalidateQueries({ queryKey: ["thread-votes", discussionId] });

  const vote = useMutation({
    mutationFn: (t: { discussionId: string | null; replyId: string | null }) => toggleFn({ data: t }),
    onSuccess: refreshVotes,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Vote failed"),
  });
  const accept = useMutation({
    mutationFn: (replyId: string | null) => acceptFn({ data: { discussionId, replyId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["discussion", discussionId] }); toast.success("Updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const m = useMutation({
    mutationFn: () => reply({ data: { discussionId, body } }),
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["discussion", discussionId] }); qc.invalidateQueries({ queryKey: ["discussions"] }); toast.success("Reply posted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to reply"),
  });

  if (!data) return null;
  const { discussion, replies: rawReplies } = data as any;
  const acceptedId: string | null = discussion.accepted_reply_id ?? null;
  const isOwner = !!userId && userId === discussion.user_id;
  const counts = votes?.counts ?? {};
  const mine = new Set(votes?.mine ?? []);
  const onVote = (t: { discussionId: string | null; replyId: string | null }) => {
    if (!signedIn) { toast.info("Sign in to upvote"); return; }
    vote.mutate(t);
  };
  const replies = [...rawReplies].sort((a: any, b: any) =>
    (b.id === acceptedId ? 1 : 0) - (a.id === acceptedId ? 1 : 0) || (counts[b.id] ?? 0) - (counts[a.id] ?? 0));

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />
      <div className="px-4 sm:px-6 py-10 max-w-3xl mx-auto">
        <Link to="/community" className="text-sm font-semibold text-brand-navy/60 hover:text-brand-navy inline-flex items-center gap-1.5">
          <span>←</span> Back to Community
        </Link>

        <article className="mt-5 bg-white border border-brand-navy/5 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={discussion.author?.display_name} />
            <div>
              <p className="font-semibold text-sm">{discussion.author?.display_name ?? "Anonymous"}</p>
              <p className="text-xs text-brand-navy/40">{timeAgo(discussion.created_at)} · <span className="uppercase tracking-wider font-bold text-brand-navy/50">{discussion.topic}</span></p>
            </div>
          </div>
          {discussion.is_office_hours && (
            <p className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint/15 text-brand-mint text-xs font-bold">
              <CalendarClock className="size-3.5" aria-hidden /> Office hours{discussion.office_hours_at ? ` · ${new Date(discussion.office_hours_at).toLocaleString()}` : ""}
            </p>
          )}
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-3 leading-tight">{discussion.title}</h1>
          <p className="whitespace-pre-wrap text-brand-navy/80 leading-relaxed">{discussion.body}</p>
          <div className="mt-5 flex items-center gap-4">
            <VoteButton count={counts[discussionId] ?? 0} voted={mine.has(discussionId)} disabled={vote.isPending} onClick={() => onVote({ discussionId, replyId: null })} />
            {signedIn && !isOwner && <ReportButton targetType="discussion" targetId={discussionId} />}
          </div>
        </article>

        <h2 className="font-display text-lg font-bold mt-10 mb-4">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </h2>

        {replies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-navy/15 p-8 text-center bg-white">
            <div className="mx-auto mb-3 size-10 rounded-xl bg-brand-clay text-brand-navy/60 flex items-center justify-center"><MessagesSquare className="size-5" aria-hidden /></div>
            <p className="text-sm text-brand-navy/60">No replies yet — be the first to add to the conversation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((r: any) => (
              <div key={r.id} className={`bg-white border rounded-2xl p-5 ${r.id === acceptedId ? "border-brand-mint" : "border-brand-navy/5"}`}>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={r.author?.display_name} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{r.author?.display_name ?? "Anonymous"}</p>
                    <p className="text-xs text-brand-navy/40">{timeAgo(r.created_at)}</p>
                  </div>
                  {r.id === acceptedId && <AcceptedBadge />}
                </div>
                <p className="whitespace-pre-wrap text-brand-navy/80 text-sm leading-relaxed">{r.body}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <VoteButton count={counts[r.id] ?? 0} voted={mine.has(r.id)} disabled={vote.isPending} onClick={() => onVote({ discussionId: null, replyId: r.id })} />
                  {isOwner && (
                    <button onClick={() => accept.mutate(r.id === acceptedId ? null : r.id)} disabled={accept.isPending} className="text-xs font-bold text-brand-mint hover:underline">
                      {r.id === acceptedId ? "Unmark answer" : "Mark as accepted"}
                    </button>
                  )}
                  {signedIn && userId !== r.user_id && <ReportButton targetType="reply" targetId={r.id} />}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-white border border-brand-navy/5 rounded-3xl p-5">
          {signedIn ? (
            <form onSubmit={(e) => { e.preventDefault(); if (body.trim()) m.mutate(); }} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Add to the conversation…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 focus:outline-none focus:border-brand-orange resize-none text-sm"
              />
              <div className="flex justify-end">
                <button type="submit" disabled={m.isPending || !body.trim()} className="px-5 py-2.5 bg-brand-orange text-white rounded-full font-bold text-sm disabled:opacity-50">
                  {m.isPending ? "Sending…" : "Post reply"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-brand-navy/70 flex-1">Sign in to join the conversation.</p>
              <Link to="/auth" search={{ mode: "signin" }} className="px-5 py-2.5 bg-brand-orange text-white rounded-full font-bold text-sm text-center">
                Sign in to reply
              </Link>
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
