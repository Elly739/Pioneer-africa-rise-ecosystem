import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { getMyPortfolio, updateMyPortfolio } from "@/lib/api/portfolio.functions";
import { listMyCollabRequests, respondToCollabRequest } from "@/lib/api/collab.functions";

export const Route = createFileRoute("/_authenticated/portfolio")({
  head: () => ({
    meta: [
      { title: "Your builder portfolio · Pioneer Africa Hub" },
      { name: "description", content: "Tell partners who you are, what you build, and what you're open to." },
    ],
  }),
  component: PortfolioPage,
});

const OPEN_TO = [
  { id: "internship", label: "Internships" },
  { id: "job", label: "Graduate roles" },
  { id: "collaboration", label: "Project collaboration" },
  { id: "mentorship", label: "Mentorship" },
] as const;

function PortfolioPage() {
  const getFn = useServerFn(getMyPortfolio);
  const saveFn = useServerFn(updateMyPortfolio);
  const collabFn = useServerFn(listMyCollabRequests);
  const respondFn = useServerFn(respondToCollabRequest);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["my-portfolio"], queryFn: () => getFn() });
  const { data: requests } = useQuery({ queryKey: ["my-collab-requests"], queryFn: () => collabFn() });

  const [form, setForm] = useState({
    display_name: "",
    headline: "",
    bio: "",
    country: "",
    university: "",
    study_year: "",
    github_url: "",
    linkedin_url: "",
    website_url: "",
    talent_visible: false,
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [openTo, setOpenTo] = useState<string[]>([]);

  useEffect(() => {
    if (!data) return;
    setForm({
      display_name: data.display_name ?? "",
      headline: data.headline ?? "",
      bio: data.bio ?? "",
      country: data.country ?? "",
      university: data.university ?? "",
      study_year: data.study_year ?? "",
      github_url: data.github_url ?? "",
      linkedin_url: data.linkedin_url ?? "",
      website_url: data.website_url ?? "",
      talent_visible: data.talent_visible ?? false,
    });
    setSkills((data.skills as string[] | null) ?? []);
    setOpenTo((data.open_to as string[] | null) ?? []);
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const fixUrl = (u: string) => {
        const t = u.trim();
        return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t;
      };
      if (form.display_name.trim().length < 2) throw new Error("Please enter your full name (at least 2 letters).");
      return saveFn({
        data: {
          ...form,
          display_name: form.display_name.trim(),
          github_url: fixUrl(form.github_url),
          linkedin_url: fixUrl(form.linkedin_url),
          website_url: fixUrl(form.website_url),
          skills,
          open_to: openTo as ("internship" | "job" | "collaboration" | "mentorship")[],
        },
      });
    },
    onSuccess: () => {
      toast.success("Portfolio updated");
      qc.invalidateQueries({ queryKey: ["my-portfolio"] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "";
      if (msg.trim().startsWith("[") || msg.includes("invalid_")) {
        toast.error("Some fields look off — check your links are valid web addresses and text isn't too long.");
      } else toast.error(msg || "Could not save");
    },
  });

  const respond = useMutation({
    mutationFn: (v: { requestId: string; status: "accepted" | "declined" }) => respondFn({ data: v }),
    onSuccess: () => {
      toast.success("Response sent");
      qc.invalidateQueries({ queryKey: ["my-collab-requests"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const addSkill = () => {
    const v = skillDraft.trim();
    if (!v || skills.includes(v) || skills.length >= 20) return;
    setSkills([...skills, v]);
    setSkillDraft("");
  };

  const incoming = (requests ?? []).filter((r) => r.incoming && r.status === "pending");
  const outgoing = (requests ?? []).filter((r) => !r.incoming);

  const field = "w-full h-12 px-4 rounded-xl bg-brand-bg border border-brand-navy/10 text-sm focus:outline-none focus:border-brand-orange";
  const label = "text-xs font-bold uppercase tracking-wider text-brand-navy/50";

  return (
    <div className="min-h-dvh bg-brand-bg text-brand-navy">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-orange">Get discovered</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Your builder portfolio</h1>
          <p className="text-brand-navy/70">
            This is what partners, employers and collaborators see. The more real detail you add, the better your matches.
          </p>
        </header>

        {isLoading ? (
          <p className="text-brand-navy/60">Loading…</p>
        ) : (
          <>
            <section className="bg-white rounded-3xl border border-brand-navy/5 p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={label} htmlFor="pf-name">Full name</label>
                  <input id="pf-name" maxLength={80} className={field} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className={label} htmlFor="pf-country">Country</label>
                  <input id="pf-country" maxLength={60} className={field} placeholder="Kenya" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={label} htmlFor="pf-headline">Headline</label>
                <input id="pf-headline" maxLength={200} className={field} placeholder="Final-year CS student building AI tools for smallholder farmers" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={label} htmlFor="pf-uni">University / institution</label>
                  <input id="pf-uni" maxLength={160} className={field} value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className={label} htmlFor="pf-year">Year of study</label>
                  <input id="pf-year" maxLength={40} className={field} placeholder="Year 3" value={form.study_year} onChange={(e) => setForm({ ...form, study_year: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={label} htmlFor="pf-bio">About you</label>
                <textarea id="pf-bio" maxLength={1500} rows={4} className="w-full p-4 rounded-xl bg-brand-bg border border-brand-navy/10 text-sm focus:outline-none focus:border-brand-orange" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>

              <div className="space-y-2">
                <span className={label}>Skills</span>
                <div className="flex gap-2">
                  <input
                    className={field}
                    placeholder="Python, product design, Solidity…"
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  />
                  <button type="button" onClick={addSkill} className="shrink-0 px-5 rounded-xl bg-brand-navy text-white text-sm font-semibold">Add</button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skills.map((s) => (
                      <button key={s} type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} className="text-xs px-2.5 py-1 rounded-full bg-brand-clay hover:bg-brand-orange hover:text-white transition-colors">
                        {s} ✕
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className={label} htmlFor="pf-gh">GitHub</label>
                  <input id="pf-gh" className={field} placeholder="https://github.com/…" value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className={label} htmlFor="pf-li">LinkedIn</label>
                  <input id="pf-li" className={field} placeholder="https://linkedin.com/in/…" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className={label} htmlFor="pf-web">Website</label>
                  <input id="pf-web" className={field} placeholder="https://…" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-brand-navy/5 p-6 space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">Discovery settings</h2>
                <p className="text-sm text-brand-navy/70 mt-1">Choose what you're open to and whether partners can find you.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {OPEN_TO.map((o) => {
                  const on = openTo.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOpenTo(on ? openTo.filter((x) => x !== o.id) : [...openTo, o.id])}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${on ? "bg-brand-navy text-white border-brand-navy" : "border-brand-navy/15 text-brand-navy/70 hover:border-brand-navy/40"}`}
                    >{o.label}</button>
                  );
                })}
              </div>
              <label className="flex items-start gap-3 p-4 rounded-2xl bg-brand-bg border border-brand-navy/10 cursor-pointer">
                <input type="checkbox" className="mt-1 accent-brand-orange" checked={form.talent_visible} onChange={(e) => setForm({ ...form, talent_visible: e.target.checked })} />
                <span>
                  <span className="font-semibold block">List me in the talent directory</span>
                  <span className="text-sm text-brand-navy/70">Verified partners and admins can find you by skill, university and innovation score. Turn this off any time.</span>
                </span>
              </label>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending || form.display_name.trim().length < 2}
                className="px-7 py-3 rounded-full bg-brand-orange text-white font-bold disabled:opacity-60"
              >{save.isPending ? "Saving…" : "Save portfolio"}</button>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold">Collaboration requests</h2>
              {incoming.length === 0 && outgoing.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-brand-navy/15 p-8 text-center bg-white">
                  <p className="font-display font-bold">Nothing here yet</p>
                  <p className="text-sm text-brand-navy/70 mt-1">Mark a project as “looking for collaborators” to start getting requests.</p>
                  <Link to="/innovate" className="mt-5 inline-flex px-5 py-2.5 rounded-full bg-brand-navy text-white text-sm font-semibold">Go to Innovate</Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {incoming.map((r) => (
                    <li key={r.id} className="bg-white rounded-2xl border border-brand-navy/5 p-5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">Incoming</p>
                      <p className="font-display font-bold mt-1">
                        {r.requester?.display_name ?? "A builder"} wants to join “{(r.projects as { title?: string } | null)?.title}”
                      </p>
                      <p className="text-sm text-brand-navy/70 mt-2">{r.message}</p>
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => respond.mutate({ requestId: r.id, status: "accepted" })} className="px-4 py-2 rounded-full bg-brand-navy text-white text-sm font-semibold">Accept</button>
                        <button onClick={() => respond.mutate({ requestId: r.id, status: "declined" })} className="px-4 py-2 rounded-full bg-brand-clay text-sm font-semibold">Decline</button>
                      </div>
                    </li>
                  ))}
                  {outgoing.map((r) => (
                    <li key={r.id} className="bg-white rounded-2xl border border-brand-navy/5 p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/40">Sent</p>
                        <p className="font-semibold">{(r.projects as { title?: string } | null)?.title}</p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-brand-clay">{r.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
