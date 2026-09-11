import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  getChallenge, createTeam, joinTeam, leaveTeam,
  submitToChallenge, uploadSubmissionFile, castVote,
  myVoteEligibility, updateChallengeStatus,
} from "@/lib/api/challenges.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const challengeQuery = (slug: string) => queryOptions({
  queryKey: ["challenge", slug],
  queryFn: () => getChallenge({ data: { slug } }),
});

export const Route = createFileRoute("/challenges/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(challengeQuery(params.slug)),
  head: ({ params }) => ({
    meta: [
      { title: `Challenge — Pioneer Africa Hub` },
      { name: "description", content: `Innovation challenge ${params.slug}` },
    ],
  }),
  component: ChallengeDetailPage,
});

function ChallengeDetailPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(challengeQuery(slug));
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const channel = supabase.channel(`challenge-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "challenge_votes" },
        () => qc.invalidateQueries({ queryKey: ["challenge", slug] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "challenge_submissions" },
        () => qc.invalidateQueries({ queryKey: ["challenge", slug] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [slug, qc]);

  if (!data) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <SiteNav />
        <div className="px-6 py-20 max-w-2xl mx-auto text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Challenge not found</h1>
          <Link to="/challenges" className="text-brand-orange font-semibold">← Back to challenges</Link>
        </div>
      </div>
    );
  }

  const { challenge, teams, submissions } = data;
  const myTeam = teams.find((t) => t.members.some((m) => m.user_id === userId));
  const myVote = data.votes.find((v) => v.user_id === userId);
  const isOwner = userId === challenge.created_by;
  const canSubmit = !!myTeam && (challenge.status === "open" || challenge.status === "judging");
  const canVote = (challenge.status === "judging" || challenge.status === "open") && !!userId;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />

      <div className="px-6 max-w-6xl mx-auto py-10">
        <Link to="/challenges" className="text-sm text-brand-navy/60 hover:text-brand-navy">← Back to challenges</Link>

        <header className="mt-4 bg-white border border-brand-navy/5 rounded-3xl p-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${challenge.status === "open" ? "bg-brand-mint/20 text-brand-mint" : challenge.status === "judging" ? "bg-brand-orange/20 text-brand-orange" : "bg-brand-navy/10 text-brand-navy/60"}`}>
              {challenge.status}
            </span>
            {challenge.deadline && <span className="text-sm font-semibold text-brand-navy/60">Deadline: {new Date(challenge.deadline).toLocaleString()}</span>}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-4">{challenge.title}</h1>
          {challenge.prize && <p className="mt-3 inline-flex items-center gap-2 text-lg font-semibold text-brand-orange"><Trophy className="size-5" aria-hidden /> {challenge.prize}</p>}
          {challenge.description && <p className="mt-6 text-brand-navy/70 whitespace-pre-line leading-relaxed">{challenge.description}</p>}
          {challenge.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {challenge.tags.map((t) => <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-brand-clay">{t}</span>)}
            </div>
          )}
          {isOwner && (
            <div className="mt-6 pt-6 border-t border-brand-navy/5 flex flex-wrap gap-2">
              <span className="text-xs font-bold uppercase text-brand-navy/50 self-center mr-2">Organizer controls:</span>
              {(["open", "judging", "closed"] as const).map((s) => (
                <StatusButton key={s} challengeId={challenge.id} status={s} current={challenge.status} slug={slug} />
              ))}
            </div>
          )}
        </header>

        {/* TEAMS */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold">Teams ({teams.length})</h2>
            {userId && !myTeam && challenge.status === "open" && (
              <CreateTeamButton challengeId={challenge.id} slug={slug} />
            )}
          </div>
          {teams.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-brand-navy/60 border border-brand-navy/5">
              No teams yet — be the first to form one.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {teams.map((t) => {
                const isMember = t.members.some((m) => m.user_id === userId);
                return (
                  <div key={t.id} className="bg-white rounded-2xl p-5 border border-brand-navy/5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-bold">{t.name}</h3>
                      <span className="text-xs text-brand-navy/50">{t.members.length} member{t.members.length === 1 ? "" : "s"}</span>
                    </div>
                    {t.pitch && <p className="text-sm text-brand-navy/60 mt-2">{t.pitch}</p>}
                    {t.looking_for.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-brand-navy/50 self-center">Looking for:</span>
                        {t.looking_for.map((s) => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-mint/20 text-brand-mint">{s}</span>)}
                      </div>
                    )}
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      <div className="flex -space-x-2">
                        {t.members.slice(0, 5).map((m) => (
                          <div key={m.user_id} className="size-7 rounded-full bg-brand-orange/30 border-2 border-white flex items-center justify-center text-[10px] font-bold">
                            {(m.profile?.display_name ?? "?")[0]?.toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <div className="ml-auto">
                        {userId && !myTeam && (
                          <JoinButton teamId={t.id} slug={slug} />
                        )}
                        {isMember && t.lead_user_id !== userId && (
                          <LeaveButton teamId={t.id} slug={slug} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* MY TEAM SUBMISSION */}
        {myTeam && canSubmit && (
          <SubmissionForm challengeId={challenge.id} team={myTeam} slug={slug} existing={submissions.find((s) => s.team_id === myTeam.id)} />
        )}

        {/* SUBMISSIONS / LEADERBOARD */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold mb-4">
            {challenge.status === "closed" ? "Final results" : "Submissions"} ({submissions.length})
          </h2>
          {submissions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-brand-navy/60 border border-brand-navy/5">
              No submissions yet.
            </div>
          ) : (
            <div className="space-y-4">
              {[...submissions].sort((a, b) => b.votes - a.votes).map((s, idx) => {
                const isWinner = challenge.winner_submission_id === s.id;
                const myTeamSub = s.team_id === myTeam?.id;
                return (
                  <div key={s.id} className={`bg-white rounded-2xl p-6 border ${isWinner ? "border-brand-orange ring-2 ring-brand-orange/30" : "border-brand-navy/5"}`}>
                    <div className="flex items-start gap-4">
                      <div className="text-3xl font-display font-bold text-brand-navy/30 w-12">#{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-xl font-bold">{s.title}</h3>
                          {isWinner && <span className="px-2 py-0.5 bg-brand-orange text-white rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1"><Trophy className="size-3" aria-hidden /> Winner</span>}
                        </div>
                        {s.description && <p className="text-sm text-brand-navy/60 mt-2 whitespace-pre-line">{s.description}</p>}
                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                          {s.demo_url && <a href={s.demo_url} target="_blank" rel="noreferrer" className="text-brand-orange font-semibold hover:underline">↗ Demo</a>}
                          {s.repo_url && <a href={s.repo_url} target="_blank" rel="noreferrer" className="text-brand-orange font-semibold hover:underline">↗ Repo</a>}
                          {s.file_url && <a href={s.file_url} target="_blank" rel="noreferrer" className="text-brand-orange font-semibold hover:underline">↗ File</a>}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 min-w-[80px]">
                        <div className="text-2xl font-bold text-brand-navy">{s.votes}</div>
                        <div className="text-[10px] uppercase text-brand-navy/50 font-bold tracking-wider">votes</div>
                        {canVote && !myTeamSub && (
                          <VoteButton challengeId={challenge.id} submissionId={s.id} slug={slug} active={myVote?.submission_id === s.id} />
                        )}
                        {myTeamSub && <span className="text-[10px] text-brand-mint font-semibold">Your team</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}

function StatusButton({ challengeId, status, current, slug }: { challengeId: string; status: "open" | "judging" | "closed"; current: string; slug: string }) {
  const qc = useQueryClient();
  const update = useServerFn(updateChallengeStatus);
  const m = useMutation({
    mutationFn: () => update({ data: { challengeId, status } }),
    onSuccess: () => { toast.success(`Moved to ${status}`); qc.invalidateQueries({ queryKey: ["challenge", slug] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const active = current === status;
  return (
    <button onClick={() => m.mutate()} disabled={active || m.isPending}
      className={`px-4 py-2 rounded-full text-xs font-bold uppercase ${active ? "bg-brand-navy text-white" : "bg-brand-clay text-brand-navy/70 hover:bg-brand-navy/10"}`}>
      {status}
    </button>
  );
}

function CreateTeamButton({ challengeId, slug }: { challengeId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pitch, setPitch] = useState("");
  const [looking, setLooking] = useState("");
  const qc = useQueryClient();
  const create = useServerFn(createTeam);
  const m = useMutation({
    mutationFn: () => create({ data: { challengeId, name, pitch, looking_for: looking.split(",").map((s) => s.trim()).filter(Boolean) } }),
    onSuccess: () => { toast.success("Team created"); qc.invalidateQueries({ queryKey: ["challenge", slug] }); setOpen(false); setName(""); setPitch(""); setLooking(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (!open) return <button onClick={() => setOpen(true)} className="px-4 py-2 bg-brand-mint text-white rounded-full text-sm font-bold">+ Form a team</button>;
  return (
    <div className="fixed inset-0 z-50 bg-brand-navy/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="bg-brand-bg w-full max-w-md rounded-3xl p-6">
        <h3 className="font-display text-2xl font-bold mb-4">Form a team</h3>
        <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white mb-3" />
        <textarea value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="One-line pitch" rows={3} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white mb-3" />
        <input value={looking} onChange={(e) => setLooking(e.target.value)} placeholder="Skills needed (designer, backend...)" className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white mb-4" />
        <div className="flex gap-2">
          <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-full border border-brand-navy/10 font-semibold">Cancel</button>
          <button disabled={!name || m.isPending} onClick={() => m.mutate()} className="flex-1 px-4 py-2 bg-brand-orange text-white rounded-full font-bold disabled:opacity-60">{m.isPending ? "Creating…" : "Create team"}</button>
        </div>
      </div>
    </div>
  );
}

function JoinButton({ teamId, slug }: { teamId: string; slug: string }) {
  const qc = useQueryClient();
  const join = useServerFn(joinTeam);
  const m = useMutation({
    mutationFn: () => join({ data: { teamId } }),
    onSuccess: () => { toast.success("Joined team"); qc.invalidateQueries({ queryKey: ["challenge", slug] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return <button onClick={() => m.mutate()} disabled={m.isPending} className="px-3 py-1.5 bg-brand-mint text-white rounded-full text-xs font-bold disabled:opacity-60">Join</button>;
}

function LeaveButton({ teamId, slug }: { teamId: string; slug: string }) {
  const qc = useQueryClient();
  const leave = useServerFn(leaveTeam);
  const m = useMutation({
    mutationFn: () => leave({ data: { teamId } }),
    onSuccess: () => { toast.success("Left team"); qc.invalidateQueries({ queryKey: ["challenge", slug] }); },
  });
  return <button onClick={() => m.mutate()} className="px-3 py-1.5 border border-brand-navy/15 rounded-full text-xs font-semibold">Leave</button>;
}

type TeamWithMembers = { id: string; name: string; members: { user_id: string }[] };
type ExistingSub = { id: string; title: string; description: string; demo_url: string | null; repo_url: string | null; file_url: string | null } | undefined;

function SubmissionForm({ challengeId, team, slug, existing }: { challengeId: string; team: TeamWithMembers; slug: string; existing: ExistingSub }) {
  const qc = useQueryClient();
  const submit = useServerFn(submitToChallenge);
  const upload = useServerFn(uploadSubmissionFile);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [demo, setDemo] = useState(existing?.demo_url ?? "");
  const [repo, setRepo] = useState(existing?.repo_url ?? "");
  const [fileUrl, setFileUrl] = useState(existing?.file_url ?? "");
  const [uploading, setUploading] = useState(false);

  const m = useMutation({
    mutationFn: () => submit({ data: { challengeId, teamId: team.id, title, description, demo_url: demo, repo_url: repo, file_url: fileUrl } }),
    onSuccess: () => { toast.success("Submission saved"); qc.invalidateQueries({ queryKey: ["challenge", slug] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const res = await upload({ data: { path: `${Date.now()}-${file.name}`, base64, contentType: file.type || "application/octet-stream" } });
      setFileUrl(res.url);
      toast.success("File uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); }
  }

  return (
    <section className="mt-10 bg-gradient-to-br from-brand-mint/10 to-brand-orange/10 rounded-3xl p-8 border border-brand-navy/5">
      <h2 className="font-display text-2xl font-bold mb-1">{existing ? "Update your submission" : "Submit for"} <span className="text-brand-orange">{team.name}</span></h2>
      <p className="text-sm text-brand-navy/60 mb-6">One submission per team. You can edit anytime before judging closes.</p>
      <div className="space-y-4">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Submission title" className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you built and how it solves the challenge" rows={4} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" />
        <div className="grid md:grid-cols-2 gap-3">
          <input type="url" value={demo} onChange={(e) => setDemo(e.target.value)} placeholder="Demo URL" className="px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" />
          <input type="url" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="Repo URL" className="px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-navy/60 mb-2">Pitch deck / file (≤20MB)</label>
          <input type="file" onChange={handleFile} disabled={uploading} className="block text-sm" />
          {fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-orange font-semibold block mt-1 truncate">✓ Uploaded — view</a>}
        </div>
        <button onClick={() => m.mutate()} disabled={!title || m.isPending || uploading} className="w-full px-5 py-3 bg-brand-orange text-white rounded-full font-bold disabled:opacity-60">
          {m.isPending ? "Saving…" : existing ? "Update submission" : "Submit"}
        </button>
      </div>
    </section>
  );
}

function VoteButton({ challengeId, submissionId, slug, active }: { challengeId: string; submissionId: string; slug: string; active: boolean }) {
  const qc = useQueryClient();
  const cast = useServerFn(castVote);
  const checkEligibility = useServerFn(myVoteEligibility);
  const m = useMutation({
    mutationFn: async () => {
      const elig = await checkEligibility();
      if (!elig.eligible) throw new Error("You must post or reply in the community to unlock voting");
      return cast({ data: { challengeId, submissionId } });
    },
    onSuccess: () => { toast.success(active ? "Vote unchanged" : "Vote cast!"); qc.invalidateQueries({ queryKey: ["challenge", slug] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <button onClick={() => m.mutate()} disabled={m.isPending}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${active ? "bg-brand-orange text-white" : "border border-brand-orange text-brand-orange hover:bg-brand-orange/10"}`}>
      {active ? "✓ Voted" : "Vote"}
    </button>
  );
}
