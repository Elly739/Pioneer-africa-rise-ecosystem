import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Trophy, Medal, Award } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getLeaderboard } from "@/lib/api/gamification.functions";

const leaderboardQuery = queryOptions({
  queryKey: ["leaderboard"],
  queryFn: () => getLeaderboard({ data: { limit: 50 } }),
});

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Innovation Leaderboard — Pioneer Africa Hub" },
      {
        name: "description",
        content:
          "The top builders on Pioneer Africa Hub, ranked by Innovation Score earned from shipped projects, challenge entries, certificates and community help.",
      },
      { property: "og:title", content: "Innovation Leaderboard — Pioneer Africa Hub" },
      { property: "og:description", content: "See Africa's top student builders ranked by real, verified activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(leaderboardQuery),
  errorComponent: () => <div className="p-10">Failed to load the leaderboard.</div>,
  notFoundComponent: () => <div className="p-10">Not found.</div>,
  component: LeaderboardPage,
});

function rankStyle(i: number) {
  if (i === 0) return { Icon: Trophy, cls: "bg-brand-orange text-white" };
  if (i === 1) return { Icon: Medal, cls: "bg-brand-navy text-white" };
  if (i === 2) return { Icon: Award, cls: "bg-brand-mint text-white" };
  return null;
}

function LeaderboardPage() {
  const { data: rows } = useSuspenseQuery(leaderboardQuery);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <header className="rounded-3xl bg-brand-navy text-white p-6 sm:p-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-mint">Leaderboard</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-2">Africa&rsquo;s top builders</h1>
          <p className="text-sm sm:text-base text-white/70 mt-3 max-w-xl">
            Ranked by Innovation Score — earned from shipped projects, challenge entries, course certificates,
            lessons finished and helping others in the community. No vanity metrics.
          </p>
          <Link
            to="/innovate"
            className="inline-flex mt-6 px-5 py-2.5 rounded-full bg-brand-orange text-white text-sm font-bold hover:bg-brand-orange/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Ship a project to join the board
          </Link>
        </header>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-brand-navy/20 p-10 text-center">
            <h2 className="font-display text-xl font-bold">The board is wide open</h2>
            <p className="text-sm text-brand-navy/60 mt-2">
              Nobody has scored yet. Publish a project or finish a course and you&rsquo;ll be first.
            </p>
            <Link to="/courses" className="inline-flex mt-5 px-5 py-2.5 rounded-full bg-brand-navy text-white text-sm font-bold">
              Start learning
            </Link>
          </div>
        ) : (
          <ol className="mt-8 space-y-3">
            {rows.map((r, i) => {
              const rs = rankStyle(i);
              return (
                <li key={r.user_id as string}>
                  <Link
                    to="/u/$userId"
                    params={{ userId: r.user_id as string }}
                    className="flex items-center gap-4 rounded-2xl bg-white border border-brand-navy/10 p-4 hover:shadow-lg transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
                  >
                    <span
                      className={`grid place-items-center size-10 shrink-0 rounded-xl font-display font-bold ${
                        rs ? rs.cls : "bg-brand-clay text-brand-navy/70"
                      }`}
                      aria-hidden
                    >
                      {rs ? <rs.Icon className="size-5" /> : i + 1}
                    </span>
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="size-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="grid place-items-center size-11 rounded-full bg-brand-navy/10 font-display font-bold shrink-0" aria-hidden>
                        {(r.display_name ?? "?").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold truncate">
                        <span className="sr-only">Rank {i + 1}: </span>
                        {r.display_name ?? "Pioneer"}
                      </p>
                      <p className="text-xs text-brand-navy/60 truncate">
                        {[r.headline, r.university, r.country].filter(Boolean).join(" · ") || "Building in public"}
                      </p>
                      <p className="text-[11px] text-brand-navy/50 mt-1">
                        {r.projects_count ?? 0} projects · {r.certificates_count ?? 0} certificates · {r.badge_count ?? 0} badges
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display text-2xl font-bold leading-none">{r.score ?? 0}</p>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-brand-navy/50 mt-1">Lv {r.level ?? 1}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
