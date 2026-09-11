import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { listChallenges, createChallenge } from "@/lib/api/challenges.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Users, Upload } from "lucide-react";

const challengesQuery = queryOptions({
  queryKey: ["challenges", "all"],
  queryFn: () => listChallenges(),
});

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Innovation Challenges — Pioneer Africa Hub" },
      { name: "description", content: "Compete in time-bound innovation challenges. Form teams, ship submissions, vote on winners." },
      { property: "og:title", content: "Innovation Challenges" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(challengesQuery),
  component: ChallengesPage,
});

const STATUS_COLOR: Record<string, string> = {
  open: "bg-brand-mint/20 text-brand-mint",
  judging: "bg-brand-orange/20 text-brand-orange",
  closed: "bg-brand-navy/10 text-brand-navy/60",
  draft: "bg-brand-clay text-brand-navy/60",
};

function timeUntil(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return "Ended";
  const days = Math.floor(ms / 86400000);
  if (days > 1) return `${days}d left`;
  const hours = Math.floor(ms / 3600000);
  return `${hours}h left`;
}

function ChallengesPage() {
  const { data: challenges } = useSuspenseQuery(challengesQuery);
  const [signedIn, setSignedIn] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "judging" | "closed">("all");
  const [open, setOpen] = useState(false);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session)); }, []);

  const filtered = useMemo(() => filter === "all" ? challenges : challenges.filter((c) => c.status === filter), [challenges, filter]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />

      <header className="px-6 pt-16 pb-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-block px-3 py-1 bg-brand-orange/20 text-brand-orange rounded-full text-xs font-bold uppercase tracking-wider mb-6">
              Innovation Challenges
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-bold leading-tight max-w-3xl">
              Build. Ship. <span className="text-brand-orange">Win.</span>
            </h1>
            <p className="mt-6 text-lg text-brand-navy/60 max-w-2xl">
              Time-bound problems from real organizations. Form a team, submit a solution, and the community votes the winner.
            </p>
          </div>
          {signedIn ? (
            <button onClick={() => setOpen(true)} className="px-6 py-3 bg-brand-orange text-white rounded-full font-bold whitespace-nowrap">
              + Launch a challenge
            </button>
          ) : (
            <Link to="/auth" search={{ mode: "signup" }} className="px-6 py-3 bg-brand-orange text-white rounded-full font-bold whitespace-nowrap">
              Sign in to compete
            </Link>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {(["all", "open", "judging", "closed"] as const).map((f) => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition ${filter === f ? "bg-brand-navy text-white" : "bg-white text-brand-navy/70 hover:bg-brand-clay"}`}>
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="px-6 max-w-7xl mx-auto pb-24">
        {filtered.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-brand-navy/5">
            <div className="mx-auto mb-4 size-14 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center"><Trophy className="size-7" aria-hidden /></div>
            <p className="text-brand-navy/60 mb-4">No challenges here yet.</p>
            {signedIn && (
              <button onClick={() => setOpen(true)} className="px-5 py-2.5 bg-brand-orange text-white rounded-full font-semibold">
                Launch the first one
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => (
              <Link key={c.id} to="/challenges/$slug" params={{ slug: c.slug }}
                className="bg-white border border-brand-navy/5 rounded-3xl p-6 hover:shadow-lg transition flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLOR[c.status]}`}>
                    {c.status}
                  </span>
                  {c.deadline && <span className="text-xs font-semibold text-brand-navy/50">{timeUntil(c.deadline)}</span>}
                </div>
                <h3 className="font-display text-xl font-bold mb-2 leading-tight">{c.title}</h3>
                <p className="text-sm text-brand-navy/60 line-clamp-3 mb-4 flex-1">{c.description || "Open challenge — see details inside."}</p>
                {c.prize && (
                  <div className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-orange"><Trophy className="size-4" aria-hidden /> {c.prize}</div>
                )}
                <div className="flex items-center gap-4 text-xs text-brand-navy/50 pt-3 border-t border-brand-navy/5">
                  <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" aria-hidden /> {c.team_count} teams</span>
                  <span className="inline-flex items-center gap-1.5"><Upload className="size-3.5" aria-hidden /> {c.submission_count} submissions</span>
                </div>
                {c.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-clay text-brand-navy/70">{t}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {open && <CreateChallengeModal onClose={() => setOpen(false)} />}
      <SiteFooter />
    </div>
  );
}

function CreateChallengeModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(createChallenge);
  const m = useMutation({
    mutationFn: (vars: Parameters<typeof create>[0]["data"]) => create({ data: vars }),
    onSuccess: (row) => {
      toast.success("Challenge launched!");
      qc.invalidateQueries({ queryKey: ["challenges"] });
      onClose();
      navigate({ to: "/challenges/$slug", params: { slug: row.slug } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [form, setForm] = useState({ title: "", description: "", prize: "", deadline: "", tags: "", cover_url: "" });

  return (
    <div className="fixed inset-0 z-50 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-brand-bg w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-3xl font-bold mb-6">Launch a challenge</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          m.mutate({
            title: form.title,
            description: form.description,
            prize: form.prize,
            deadline: form.deadline,
            cover_url: form.cover_url,
            tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          });
        }} className="space-y-4">
          <Field label="Title"><input required minLength={4} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" /></Field>
          <Field label="Description"><textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's the problem? What does a great solution look like?" className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prize / reward"><input value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} placeholder="$500 + mentorship" className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" /></Field>
            <Field label="Deadline"><input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" /></Field>
          </div>
          <Field label="Tags (comma-separated)"><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="fintech, ai, climate" className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" /></Field>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-3 rounded-full font-semibold border border-brand-navy/10">Cancel</button>
            <button type="submit" disabled={m.isPending} className="flex-1 px-5 py-3 bg-brand-orange text-white rounded-full font-bold disabled:opacity-60">
              {m.isPending ? "Launching…" : "Launch challenge"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wider text-brand-navy/60 mb-2">{label}</span>
      {children}
    </label>
  );
}
