import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Inbox as InboxIcon, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { listConversations } from "@/lib/api/messages.functions";

const inboxQuery = queryOptions({
  queryKey: ["inbox"],
  queryFn: () => listConversations(),
});

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — Pioneer Africa Hub" },
      { name: "description", content: "Your private conversations with other Pioneer Africa Hub members." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(inboxQuery),
  errorComponent: () => <div className="p-10 text-center">Could not load your inbox.</div>,
  component: InboxPage,
});

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function InboxPage() {
  const fetchInbox = useServerFn(listConversations);
  const { data } = useQuery({ ...inboxQuery, queryFn: fetchInbox });
  const conversations = data?.conversations ?? [];

  return (
    <div className="min-h-dvh bg-brand-bg text-brand-navy">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Inbox</h1>
          <p className="text-brand-navy/60 mt-2">
            Private conversations with other members. Messages are only ever read by the two people in them —
            a moderator can open a conversation only after someone reports it.
          </p>
        </header>

        {conversations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-navy/15 bg-white p-10 text-center">
            <div className="mx-auto mb-3 size-12 rounded-2xl bg-brand-clay text-brand-navy/60 flex items-center justify-center">
              <InboxIcon className="size-6" aria-hidden />
            </div>
            <p className="font-display text-lg font-bold">No conversations yet</p>
            <p className="text-sm text-brand-navy/60 mt-1 max-w-sm mx-auto">
              Open someone's profile and choose <span className="font-bold">Message</span> to start a private chat —
              about a project, a role on a team, or a mentorship.
            </p>
            <Link
              to="/community"
              className="mt-5 inline-flex px-5 py-2.5 rounded-full bg-brand-orange text-white text-sm font-bold"
            >
              Find people in the community
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => (
              <li key={c.conversationId}>
                <Link
                  to="/inbox/$conversationId"
                  params={{ conversationId: c.conversationId }}
                  className="flex items-start gap-4 bg-white border border-brand-navy/5 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="size-11 shrink-0 rounded-full bg-brand-orange/15 text-brand-orange font-bold flex items-center justify-center text-sm overflow-hidden">
                    {c.otherAvatar ? (
                      <img src={c.otherAvatar} alt="" className="size-full object-cover" />
                    ) : (
                      c.otherName.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-display font-bold truncate">{c.otherName}</span>
                      <span className="text-xs text-brand-navy/40 shrink-0">{timeAgo(c.lastMessageAt)}</span>
                    </span>
                    <span className="block text-sm text-brand-navy/60 line-clamp-1 mt-0.5">
                      {c.lastMessageBody ?? "No messages yet"}
                    </span>
                  </span>
                  {c.unread > 0 && (
                    <span
                      className="shrink-0 min-w-6 h-6 px-1.5 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center"
                      aria-label={`${c.unread} unread`}
                    >
                      {c.unread}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 flex items-start gap-2 text-xs text-brand-navy/45">
          <ShieldCheck className="size-4 shrink-0 mt-0.5" aria-hidden />
          Something wrong in a conversation? Open it and use <span className="font-bold">Report</span> — a moderator
          will only be able to read it once you've reported it.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
