import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { useSuspenseQuery, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getPublicProfile, isFollowing, toggleFollow } from "@/lib/api/social.functions";
import { getUserBadges } from "@/lib/api/gamification.functions";
import { BadgeGrid } from "@/components/badge-grid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const profileQuery = (userId: string) => queryOptions({
  queryKey: ["public-profile", userId],
  queryFn: () => getPublicProfile({ data: { userId } }),
});

export const Route = createFileRoute("/u/$userId")({
  head: ({ loaderData }) => {
    const name = (loaderData as { profile?: { display_name?: string } } | null | undefined)?.profile?.display_name;
    return {
      meta: [
        { title: `${name ?? "Builder"} — Pioneer Africa Hub` },
        { name: "description", content: `${name ?? "A builder"}'s profile on Pioneer Africa Hub.` },
      ],
    };
  },
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(profileQuery(params.userId));
    if (!data) throw notFound();
    return data;
  },
  errorComponent: () => <div className="p-10">Failed to load profile.</div>,
  notFoundComponent: () => <div className="p-10">Profile not found.</div>,
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = Route.useParams();
  const { data } = useSuspenseQuery(profileQuery(userId));
  const qc = useQueryClient();
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null)); }, []);

  const isSelf = meId === userId;
  const followFn = useServerFn(toggleFollow);
  const isFollowingFn = useServerFn(isFollowing);
  const followingQ = useQuery({
    queryKey: ["is-following", userId, meId],
    queryFn: () => isFollowingFn({ data: { userId } }),
    enabled: !!meId && !isSelf,
  });

  const badgesQ = useQuery({
    queryKey: ["user-badges", userId],
    queryFn: () => getUserBadges({ data: { userId } }),
  });



  const follow = useMutation({
    mutationFn: () => followFn({ data: { userId } }),
    onSuccess: (r) => {
      toast.success(r.following ? "Following" : "Unfollowed");
      qc.invalidateQueries({ queryKey: ["is-following", userId] });
      qc.invalidateQueries({ queryKey: ["public-profile", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (!data) return null;
  const { profile, stats, innovation, projects, discussions, certificates, followerCount, followingCount } = data;
  const skills = (profile.skills as string[] | null) ?? [];
  const openTo = (profile.open_to as string[] | null) ?? [];
  const links = [
    { href: profile.github_url, label: "GitHub" },
    { href: profile.linkedin_url, label: "LinkedIn" },
    { href: profile.website_url, label: "Website" },
  ].filter((l) => !!l.href);

  return (
    <div className="min-h-dvh bg-brand-bg text-brand-navy">
      <SiteNav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
          <div className="size-24 rounded-full bg-brand-clay overflow-hidden shrink-0 flex items-center justify-center font-display text-3xl font-bold text-brand-navy/40">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : (profile.display_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl font-bold">{profile.display_name ?? "Anonymous builder"}</h1>
            {profile.headline && <p className="mt-1 text-lg text-brand-navy/80">{profile.headline}</p>}
            <p className="text-brand-navy/60 mt-1 text-sm">
              {[profile.university, profile.study_year, profile.country].filter(Boolean).join(" · ")}
            </p>
            {profile.bio && <p className="mt-3 text-brand-navy/80">{profile.bio}</p>}
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <span><span className="font-bold">{followerCount}</span> <span className="text-brand-navy/60">followers</span></span>
              <span><span className="font-bold">{followingCount}</span> <span className="text-brand-navy/60">following</span></span>
              <span><span className="font-bold text-brand-orange">Lv {stats.level}</span> <span className="text-brand-navy/60">· {stats.xp} XP</span></span>
              {stats.streak_days > 0 && <span className="inline-flex items-center gap-1.5"><Flame className="size-4 text-brand-orange" aria-hidden /><span className="font-bold">{stats.streak_days}</span> <span className="text-brand-navy/60">day streak</span></span>}
            </div>
            {links.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3 text-sm font-bold text-brand-orange">
                {links.map((l) => (
                  <a key={l.label} href={l.href as string} target="_blank" rel="noreferrer" className="hover:underline">{l.label} ↗</a>
                ))}
              </div>
            )}
            {openTo.length > 0 && (
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-brand-mint">Open to: {openTo.join(" · ")}</p>
            )}
            {(skills.length > 0 || (profile.interests ?? []).length > 0) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {skills.map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-brand-navy text-white">{t}</span>
                ))}
                {((profile.interests as string[] | null) ?? []).map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-brand-clay text-brand-navy/70">{t}</span>
                ))}
              </div>
            )}
          </div>
          {!isSelf && meId && (
            <button
              onClick={() => follow.mutate()}
              disabled={follow.isPending}
              className={`px-6 py-2.5 rounded-full font-bold text-sm ${
                followingQ.data?.following ? "bg-brand-clay text-brand-navy" : "bg-brand-navy text-white"
              }`}
            >{followingQ.data?.following ? "Following" : "Follow"}</button>
          )}
        </div>

        {/* Innovation score */}
        <section className="mb-10 rounded-3xl bg-brand-navy text-white p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-mint">Innovation score</p>
              <p className="font-display text-5xl font-bold leading-none mt-2">{innovation.score}</p>
              <p className="text-sm text-white/60 mt-2 max-w-sm">Earned from real activity — shipping projects, entering challenges, finishing courses and helping the community.</p>
            </div>
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
              {[
                ["Projects", innovation.projects_count],
                ["Likes", innovation.likes_received],
                ["Submissions", innovation.submissions_count],
                ["Certificates", innovation.certificates_count],
                ["Lessons", innovation.lessons_completed],
                ["Community", innovation.community_contributions],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-[10px] uppercase tracking-wider text-white/50">{k}</dt>
                  <dd className="font-display font-bold text-xl">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          {isSelf && (
            <Link to="/portfolio" className="inline-flex mt-6 px-5 py-2.5 rounded-full bg-brand-orange text-white text-sm font-bold">
              Edit your portfolio →
            </Link>
          )}
        </section>

        <section className="mb-10">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-bold">Badges</h2>
            <Link to="/leaderboard" className="text-xs font-bold text-brand-orange hover:underline">View leaderboard →</Link>
          </div>
          {badgesQ.data ? (
            <BadgeGrid badges={badgesQ.data} showLocked={isSelf} />
          ) : (
            <div className="h-24 rounded-2xl bg-brand-navy/5 animate-pulse" />
          )}
          {badgesQ.data && badgesQ.data.every((b) => !b.earned_at) && (
            <p className="text-sm text-brand-navy/60">
              {isSelf ? "No badges yet — ship a project or finish a course to unlock your first one." : "No badges yet."}
            </p>
          )}
        </section>

        {projects.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-bold mb-4">Projects</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {projects.map((p) => (
                <Link key={p.id} to="/innovate/$projectSlug" params={{ projectSlug: p.slug }} className="bg-white border border-brand-navy/5 rounded-2xl p-5 hover:shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">{p.status}</span>
                    {p.looking_for_collaborators && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-mint">· Seeking collaborators</span>
                    )}
                  </div>
                  <h3 className="font-display font-bold mt-1">{p.title}</h3>
                  <p className="text-sm text-brand-navy/60 line-clamp-2 mt-1">{p.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        )}


        {certificates.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-bold mb-4">Certificates</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {certificates.map((c: { id: string; code: string; courses: { title: string } | null }) => (
                <div key={c.id} className="p-4 rounded-2xl bg-brand-navy text-white">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-mint">Certified</p>
                  <p className="font-display font-bold">{c.courses?.title}</p>
                  <p className="font-mono text-xs text-white/60 mt-1">{c.code}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {discussions.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-bold mb-4">Recent discussions</h2>
            <ul className="space-y-2">
              {discussions.map((d) => (
                <li key={d.id}>
                  <Link to="/community/$discussionId" params={{ discussionId: d.id }} className="block bg-white border border-brand-navy/5 rounded-xl p-4 hover:shadow-sm">
                    <p className="font-semibold">{d.title}</p>
                    <p className="text-xs text-brand-navy/50 mt-1">{d.topic} · {new Date(d.created_at).toLocaleDateString()}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {projects.length === 0 && discussions.length === 0 && certificates.length === 0 && (
          <p className="text-brand-navy/60 text-center py-12">This builder hasn't shipped anything public yet.</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
