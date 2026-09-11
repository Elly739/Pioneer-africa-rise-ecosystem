import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { listDiscussions, createDiscussion } from "@/lib/api/ecosystem.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessagesSquare, BookOpen, Briefcase, Hammer, Compass, Sprout } from "lucide-react";

const discussionsQuery = queryOptions({
  queryKey: ["discussions"],
  queryFn: () => listDiscussions(),
});

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — Pioneer Africa Hub" },
      { name: "description", content: "Connect, discuss, and grow with young African builders. Study groups, peer mentorship, and conversations." },
      { property: "og:title", content: "Pioneer Africa Hub Community" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(discussionsQuery),
  component: CommunityPage,
});

const TOPICS = [
  { id: "general", label: "General", Icon: MessagesSquare, desc: "Open discussions, intros, and updates." },
  { id: "learning", label: "Learning", Icon: BookOpen, desc: "Ask for help, share study tips, find study buddies." },
  { id: "careers", label: "Careers", Icon: Briefcase, desc: "Job hunts, interviews, scholarships, CV reviews." },
  { id: "building", label: "Building", Icon: Hammer, desc: "Show your projects, find collaborators, get feedback." },
  { id: "mentorship", label: "Mentorship", Icon: Compass, desc: "Ask for guidance or offer to mentor someone." },
];

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function CommunityPage() {
  const { data: threads } = useSuspenseQuery(discussionsQuery);
  const [signedIn, setSignedIn] = useState(false);
  const [composing, setComposing] = useState(false);
  const [topic, setTopic] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session)); }, []);

  const filtered = useMemo(() => {
    return threads
      .filter((t: any) => topic === "all" || t.topic === topic)
      .filter((t: any) => !q.trim() || `${t.title} ${t.body}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a: any, b: any) => (b.last_activity ?? b.created_at).localeCompare(a.last_activity ?? a.created_at));
  }, [threads, topic, q]);

  const stats = useMemo(() => {
    const totalReplies = threads.reduce((s: number, t: any) => s + (t.reply_count ?? 0), 0);
    const builders = new Set<string>();
    threads.forEach((t: any) => builders.add(t.user_id));
    return { threads: threads.length, replies: totalReplies, builders: builders.size };
  }, [threads]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />

      <header className="px-4 sm:px-6 pt-12 sm:pt-16 pb-10 max-w-6xl mx-auto">
        <div className="inline-block px-3 py-1 bg-brand-navy/10 rounded-full text-xs font-bold uppercase tracking-wider mb-5">
          Community
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
          Grow together, <span className="text-brand-orange">not alone</span>.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-brand-navy/60 max-w-2xl">
          Ask questions, share wins, find study partners. Your peers across Africa are building right now.
        </p>

        {/* Stats strip */}
        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4 max-w-xl">
          {[
            { label: "Discussions", value: stats.threads },
            { label: "Replies", value: stats.replies },
            { label: "Builders", value: stats.builders },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-brand-navy/5 rounded-2xl px-4 py-3">
              <div className="font-display text-2xl font-bold">{s.value}</div>
              <div className="text-[11px] uppercase tracking-wider text-brand-navy/50 font-bold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="px-4 sm:px-6 max-w-6xl mx-auto pb-24 grid lg:grid-cols-[1fr_280px] gap-8">
        <div>
          {/* Composer / CTA */}
          <div className="bg-white border border-brand-navy/5 rounded-3xl p-4 sm:p-5 mb-6">
            {signedIn ? (
              !composing ? (
                <button
                  onClick={() => setComposing(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-bg border border-brand-navy/10 text-left text-brand-navy/50 hover:border-brand-orange transition-colors"
                >
                  <span className="size-8 rounded-full bg-brand-orange text-white font-bold flex items-center justify-center">+</span>
                  Start a discussion…
                </button>
              ) : (
                <ComposeForm onDone={() => setComposing(false)} />
              )
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-1">
                <p className="text-sm text-brand-navy/70 flex-1">Join the conversation — meet builders, ask questions, share wins.</p>
                <Link to="/auth" search={{ mode: "signup" }} className="px-5 py-2.5 bg-brand-orange text-white rounded-full font-bold text-sm whitespace-nowrap text-center">
                  Sign in to post
                </Link>
              </div>
            )}
          </div>

          {/* Search + topic chips */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/40" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search discussions…"
                className="w-full pl-10 pr-4 h-11 rounded-xl bg-white border border-brand-navy/10 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-6">
            <button
              onClick={() => setTopic("all")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full ${topic === "all" ? "bg-brand-navy text-white" : "bg-brand-clay text-brand-navy hover:bg-brand-clay/70"}`}
            >All</button>
            {TOPICS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTopic(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full ${topic === t.id ? "bg-brand-navy text-white" : "bg-brand-clay text-brand-navy hover:bg-brand-clay/70"}`}
              ><t.Icon className="size-3.5" aria-hidden /> {t.label}</button>
            ))}
          </div>

          {/* Thread list */}
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-navy/15 p-10 text-center bg-white">
              <div className="mx-auto mb-3 size-12 rounded-2xl bg-brand-mint/15 text-brand-mint flex items-center justify-center">
                <Sprout className="size-6" aria-hidden />
              </div>
              <p className="font-display text-lg font-bold">Nothing here yet</p>
              <p className="text-sm text-brand-navy/60 mt-1 max-w-sm mx-auto">
                {q || topic !== "all" ? "Try a different topic or clear the search." : "Be the first to start a conversation in this space."}
              </p>
              {signedIn && (
                <button onClick={() => { setTopic("all"); setQ(""); setComposing(true); }} className="mt-5 px-5 py-2.5 bg-brand-orange text-white rounded-full font-bold text-sm">
                  Start a discussion
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((t: any) => {
                const meta = TOPICS.find((x) => x.id === t.topic);
                const initials = (t.author?.display_name ?? "A").slice(0, 2).toUpperCase();
                return (
                  <Link
                    key={t.id}
                    to="/community/$discussionId"
                    params={{ discussionId: t.id }}
                    className="block bg-white border border-brand-navy/5 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="size-10 shrink-0 rounded-full bg-brand-orange/15 text-brand-orange font-bold flex items-center justify-center text-sm">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-clay text-brand-navy/70 uppercase font-bold tracking-wider">
                            {meta?.emoji} {meta?.label ?? t.topic}
                          </span>
                          <span className="text-xs text-brand-navy/50">{t.author?.display_name ?? "Anonymous"}</span>
                          <span className="text-xs text-brand-navy/30">·</span>
                          <span className="text-xs text-brand-navy/40">{timeAgo(t.last_activity ?? t.created_at)}</span>
                        </div>
                        <h3 className="font-display text-lg font-bold leading-snug mb-1">{t.title}</h3>
                        <p className="text-sm text-brand-navy/60 line-clamp-2">{t.body}</p>
                        <div className="mt-3 flex items-center gap-4 text-xs text-brand-navy/50">
                          <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            <span className="font-semibold">{t.reply_count}</span> {t.reply_count === 1 ? "reply" : "replies"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            <span className="font-semibold">{t.participants}</span> {t.participants === 1 ? "person" : "people"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-24 self-start">
          <div className="bg-white border border-brand-navy/5 rounded-3xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-orange mb-3">Spaces</p>
            <ul className="space-y-3">
              {TOPICS.map((t) => {
                const count = threads.filter((th: any) => th.topic === t.id).length;
                return (
                  <li key={t.id}>
                    <button onClick={() => setTopic(t.id)} className="w-full text-left flex items-start gap-3 group">
                      <span className="text-lg">{t.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-sm group-hover:text-brand-orange">{t.label}</span>
                          <span className="text-xs text-brand-navy/40">{count}</span>
                        </div>
                        <p className="text-xs text-brand-navy/55 leading-snug">{t.desc}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="bg-brand-navy text-white rounded-3xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-mint mb-2">Community guidelines</p>
            <ul className="text-sm space-y-2 text-white/80">
              <li>· Be kind. Everyone starts somewhere.</li>
              <li>· Share resources, not just questions.</li>
              <li>· Celebrate wins, big or small.</li>
              <li>· No spam, no self-promo without value.</li>
            </ul>
          </div>
        </aside>
      </div>

      <SiteFooter />
    </div>
  );
}

function ComposeForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createDiscussion);
  const m = useMutation({
    mutationFn: (vars: { title: string; body: string; topic: string }) => create({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["discussions"] }); toast.success("Posted to the community!"); onDone(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to post"),
  });
  const [form, setForm] = useState({ title: "", body: "", topic: "general" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(form); }} className="space-y-3">
      <input required minLength={4} placeholder="Give it a clear title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 font-semibold focus:outline-none focus:border-brand-orange" />
      <textarea required rows={4} placeholder="Share the context, what you've tried, what you need…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 focus:outline-none focus:border-brand-orange resize-none" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-navy/50">Space:</span>
        {TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setForm({ ...form, topic: t.id })}
            className={`px-3 py-1 rounded-full text-xs font-bold ${form.topic === t.id ? "bg-brand-navy text-white" : "bg-brand-clay text-brand-navy hover:bg-brand-clay/70"}`}
          >{t.emoji} {t.label}</button>
        ))}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onDone} className="px-4 py-2 text-sm font-bold text-brand-navy/60 hover:text-brand-navy">Cancel</button>
          <button type="submit" disabled={m.isPending} className="px-5 py-2 bg-brand-orange text-white rounded-full font-bold text-sm disabled:opacity-60">
            {m.isPending ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}
