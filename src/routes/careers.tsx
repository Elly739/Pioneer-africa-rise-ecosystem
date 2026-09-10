import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AskCoachButton } from "@/components/ai/ask-coach-button";
import { supabase } from "@/integrations/supabase/client";
import { listMyProjects } from "@/lib/api/ecosystem.functions";
import { applyToOpportunity } from "@/lib/api/careers.functions";
import {
  listOpportunityBoard,
  listMySavedOpportunities,
  toggleSaveOpportunity,
  getMatchedOpportunities,
} from "@/lib/api/opportunities.functions";


const oppsQuery = queryOptions({
  queryKey: ["opportunities", "board"],
  queryFn: () => listOpportunityBoard(),
});

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Opportunities — internships, hackathons & grants | Pioneer Africa Hub" },
      { name: "description", content: "Discover internships, graduate roles, scholarships, hackathons, fellowships and grants open to African students — filter by skill, location and deadline." },
      { property: "og:title", content: "Opportunity board — Pioneer Africa Hub" },
      { property: "og:description", content: "Internships, hackathons, fellowships, scholarships and grants for African student builders." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pioneer-africa-hub.lovable.app/careers" },
    ],
    links: [{ rel: "canonical", href: "https://pioneer-africa-hub.lovable.app/careers" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(oppsQuery),
  component: CareersPage,
});

type Tab = "all" | "saved" | "internship" | "job" | "scholarship" | "hackathon" | "fellowship" | "grant" | "incubator";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "internship", label: "Internships" },
  { id: "job", label: "Jobs" },
  { id: "hackathon", label: "Hackathons" },
  { id: "fellowship", label: "Fellowships" },
  { id: "scholarship", label: "Scholarships" },
  { id: "grant", label: "Grants" },
  { id: "incubator", label: "Incubators" },
  { id: "saved", label: "★ Saved" },
];

function daysLeft(deadline: string | null) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}


function CareersPage() {
  const { data: opps } = useSuspenseQuery(oppsQuery);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [applyFor, setApplyFor] = useState<any | null>(null);


  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session)); }, []);

  const qc = useQueryClient();
  const savedFn = useServerFn(listMySavedOpportunities);
  const saveFn = useServerFn(toggleSaveOpportunity);
  const matchFn = useServerFn(getMatchedOpportunities);

  const { data: savedIds } = useQuery({ queryKey: ["saved-opps"], queryFn: () => savedFn(), enabled: signedIn });
  const { data: matched } = useQuery({ queryKey: ["matched-opps"], queryFn: () => matchFn(), enabled: signedIn });
  const saved = new Set(savedIds ?? []);

  const save = useMutation({
    mutationFn: (opportunityId: string) => saveFn({ data: { opportunityId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-opps"] }),
  });

  const locations = useMemo(() => {
    const set = new Set<string>();
    opps.forEach((o: any) => o.location && set.add(o.location));
    return Array.from(set).sort();
  }, [opps]);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    opps.forEach((o: any) => (o.tags ?? []).forEach((t: string) => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [opps]);

  const filtered = opps.filter((o: any) => {
    if (tab === "saved" ? !saved.has(o.id) : tab !== "all" && o.type !== tab) return false;
    if (remoteOnly && !o.remote) return false;
    if (location !== "all" && o.location !== location) return false;
    if (activeTag && !(o.tags ?? []).includes(activeTag)) return false;
    if (q.trim()) {
      const needle = q.toLowerCase();
      const hay = `${o.title} ${o.organization} ${o.description} ${(o.tags ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const clearAll = () => { setTab("all"); setQ(""); setLocation("all"); setRemoteOnly(false); setActiveTag(null); };
  const hasFilters = tab !== "all" || q || location !== "all" || remoteOnly || activeTag;



  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />

      <header className="px-4 sm:px-6 pt-12 sm:pt-16 pb-10 max-w-7xl mx-auto">
        <div className="inline-block px-3 py-1 bg-brand-orange/15 text-brand-orange rounded-full text-xs font-bold uppercase tracking-wider mb-5">
          Career Bridge
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight max-w-3xl">
          Turn your skills into <span className="text-brand-orange">opportunities</span>.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-brand-navy/60 max-w-2xl">
          Curated internships, jobs, and scholarships from organizations building the future across Africa.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/cv" className="px-5 py-2.5 bg-brand-navy text-white rounded-full text-sm font-semibold hover:bg-brand-navy/90">Build your CV</Link>
          <Link to="/advisor" className="px-5 py-2.5 bg-brand-clay text-brand-navy rounded-full text-sm font-semibold border border-brand-navy/10 hover:bg-brand-clay/70">Talk to AI Advisor</Link>
        </div>
      </header>

      <div className="px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Search + filters bar */}
        <div className="bg-white rounded-3xl border border-brand-navy/5 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/40" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search role, company, skill…"
                className="w-full pl-11 pr-4 h-12 rounded-xl bg-brand-bg border border-brand-navy/10 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-12 px-4 rounded-xl bg-brand-bg border border-brand-navy/10 text-sm font-medium focus:outline-none focus:border-brand-orange"
            >
              <option value="all">All locations</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <label className="flex items-center gap-2 px-4 h-12 rounded-xl bg-brand-bg border border-brand-navy/10 cursor-pointer text-sm font-medium">
              <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} className="accent-brand-orange" />
              Remote only
            </label>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-colors ${
                  tab === t.id ? "bg-brand-navy text-white" : "bg-brand-clay text-brand-navy hover:bg-brand-clay/70"
                }`}
              >{t.label}</button>
            ))}
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-brand-navy/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/40 self-center mr-1">Skills:</span>
              {allTags.map(([t]) => (
                <button
                  key={t}
                  onClick={() => setActiveTag(activeTag === t ? null : t)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    activeTag === t ? "bg-brand-orange text-white border-brand-orange" : "border-brand-navy/10 text-brand-navy/70 hover:border-brand-orange"
                  }`}
                >{t}</button>
              ))}
            </div>
          )}
        </div>

        {signedIn && matched && matched.matches.length > 0 && (
          <section className="mt-8" aria-labelledby="matched-heading">
            <h2 id="matched-heading" className="font-display text-xl font-bold mb-3">Matched for you</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {matched.matches.slice(0, 3).map((m: any) => (
                <div key={m.id} className="p-5 rounded-2xl bg-brand-navy text-white">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-mint">{m.type}</p>
                  <p className="font-display font-bold mt-1 line-clamp-2">{m.title}</p>
                  <p className="text-xs text-white/60 mt-1">{m.organization}</p>
                  <p className="text-[10px] mt-2 text-white/50">Matched on {m.matchedOn.slice(0, 3).join(", ")}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center justify-between mt-6 mb-4">
          <p className="text-sm text-brand-navy/60"><span className="font-bold text-brand-navy">{filtered.length}</span> {filtered.length === 1 ? "opportunity" : "opportunities"}</p>
          {hasFilters && (
            <button onClick={clearAll} className="text-xs font-bold text-brand-orange hover:underline">Clear filters</button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-navy/15 p-12 text-center bg-white">
            <p className="font-display text-lg font-bold">{tab === "saved" ? "Nothing saved yet" : "No matches"}</p>
            <p className="text-sm text-brand-navy/60 mt-1">{tab === "saved" ? "Tap the star on any opportunity to keep it here." : "Try clearing some filters."}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 sm:gap-5 pb-24">
            {filtered.map((o: any) => {
              const left = daysLeft(o.deadline);
              return (
              <article key={o.id} className="bg-white border border-brand-navy/5 rounded-2xl p-5 sm:p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    o.type === "scholarship" || o.type === "grant" ? "bg-brand-mint/20 text-brand-mint" :
                    o.type === "internship" || o.type === "hackathon" ? "bg-brand-orange/20 text-brand-orange" :
                    "bg-brand-navy/10 text-brand-navy"
                  }`}>{o.type}</span>
                  <div className="flex items-center gap-2">
                    {left !== null && left >= 0 && left <= 14 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">{left}d left</span>
                    )}
                    {o.remote && <span className="text-[10px] font-bold uppercase tracking-wider text-brand-mint">● Remote</span>}
                    {signedIn && (
                      <button
                        onClick={() => save.mutate(o.id)}
                        aria-label={saved.has(o.id) ? "Remove from saved" : "Save opportunity"}
                        className={`text-sm ${saved.has(o.id) ? "text-brand-orange" : "text-brand-navy/30 hover:text-brand-orange"}`}
                      >{saved.has(o.id) ? "★" : "☆"}</button>
                    )}
                  </div>
                </div>

                <h3 className="font-display text-lg sm:text-xl font-bold leading-snug mb-1">{o.title}</h3>
                <p className="text-sm text-brand-navy/60 mb-3">{o.organization}{o.location ? ` · ${o.location}` : ""}</p>
                <p className="text-sm text-brand-navy/70 line-clamp-2 mb-4">{o.description}</p>
                {(o.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {(o.tags ?? []).slice(0, 4).map((t: string) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 bg-brand-clay rounded-full text-brand-navy/70">{t}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-brand-navy/5">
                  <span className="text-xs text-brand-navy/40">
                    {o.deadline ? `By ${new Date(o.deadline).toLocaleDateString()}` : "Rolling"}
                  </span>
                  <div className="flex items-center gap-3">
                    {signedIn ? (
                      <button onClick={() => setApplyFor(o)} className="px-4 py-2 rounded-full bg-brand-navy text-white text-xs font-bold">
                        Apply with a project
                      </button>
                    ) : (
                      <Link to="/auth" search={{ mode: "signup" }} className="text-xs font-bold text-brand-navy/60 hover:text-brand-navy">Sign in to apply</Link>
                    )}
                    {signedIn && (
                      <AskCoachButton
                        kind="advisor"
                        label="Ask the advisor"
                        context={`Opportunity: ${o.title} @ ${o.organization}`}
                        prompt={`I'm considering applying to "${o.title}" at ${o.organization}. Am I a good fit given my profile, and what should my application say?`}
                      />
                    )}
                    {o.apply_url && (
                      <a href={o.apply_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-orange hover:underline">External link →</a>
                    )}
                  </div>
                </div>
              </article>
              );
            })}

          </div>
        )}
      </div>

      {applyFor && <ApplyModal opportunity={applyFor} onClose={() => setApplyFor(null)} />}

      <SiteFooter />
    </div>
  );
}

function ApplyModal({ opportunity, onClose }: { opportunity: any; onClose: () => void }) {
  const qc = useQueryClient();
  const projectsFn = useServerFn(listMyProjects);
  const applyFn = useServerFn(applyToOpportunity);
  const { data: projects } = useQuery({ queryKey: ["my-projects"], queryFn: () => projectsFn() });
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");

  function pickProject(id: string) {
    setProjectId(id);
    const p = (projects ?? []).find((x: any) => x.id === id);
    if (p) {
      setNotes(
        `Project: ${p.title}\n${p.summary}\nStatus: ${p.status}${p.demo_url ? `\nDemo: ${p.demo_url}` : ""}${p.repo_url ? `\nRepo: ${p.repo_url}` : ""}`,
      );
    }
  }

  const m = useMutation({
    mutationFn: () => applyFn({ data: { opportunityId: opportunity.id, notes, projectId: projectId || null } }),
    onSuccess: (r: any) => {
      toast.success(r?.alreadyApplied ? "You already applied to this one" : "Application tracked");
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not apply"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-brand-bg w-full max-w-lg rounded-3xl p-7 max-h-[90vh] overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">{opportunity.type}</p>
        <h2 className="font-display text-2xl font-bold mt-1">{opportunity.title}</h2>
        <p className="text-sm text-brand-navy/60">{opportunity.organization}</p>

        <label className="block mt-6">
          <span className="block text-xs font-bold uppercase tracking-wider text-brand-navy/60 mb-2">Attach a project</span>
          <select
            value={projectId}
            onChange={(e) => pickProject(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white text-sm"
          >
            <option value="">No project</option>
            {(projects ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {(projects ?? []).length === 0 && (
            <p className="text-xs text-brand-navy/50 mt-2">
              No projects yet — <Link to="/innovate" className="font-bold text-brand-orange">publish one</Link> to strengthen applications.
            </p>
          )}
        </label>

        <label className="block mt-4">
          <span className="block text-xs font-bold uppercase tracking-wider text-brand-navy/60 mb-2">Notes</span>
          <textarea
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why you're a fit, links, and what you'd build."
            className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white text-sm"
          />
        </label>

        <div className="flex gap-3 pt-5">
          <button onClick={onClose} className="px-5 py-3 rounded-full font-semibold border border-brand-navy/10">Cancel</button>
          <button onClick={() => m.mutate()} disabled={m.isPending} className="flex-1 px-5 py-3 bg-brand-orange text-white rounded-full font-bold disabled:opacity-60">
            {m.isPending ? "Saving…" : "Track this application"}
          </button>
        </div>
      </div>
    </div>
  );

}
