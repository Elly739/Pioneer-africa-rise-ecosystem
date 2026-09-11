import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/notification-bell";
import { getMyStats } from "@/lib/api/stats.functions";
import type { Database } from "@/integrations/supabase/types";
import pioneerLogo from "@/assets/pioneer-logo.png.asset.json";


const navLinks = [
  { to: "/courses" as const, label: "Learn" },
  { to: "/careers" as const, label: "Careers" },
  { to: "/innovate" as const, label: "Innovate" },
  { to: "/challenges" as const, label: "Challenges" },
  { to: "/community" as const, label: "Community" },
  { to: "/blog" as const, label: "Blog" },
];

const ADMIN_ROLES: Database["public"]["Enums"]["app_role"][] = ["admin", "moderator", "teacher", "partner"];

export function SiteNav() {
  const [signedIn, setSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const statsFn = useServerFn(getMyStats);
  const { data: stats } = useQuery({
    queryKey: ["my-stats"],
    queryFn: () => statsFn(),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const { data: userRoles } = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return [];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.session.user.id);
      return (data ?? []).map((r) => r.role);
    },
    enabled: signedIn,
    staleTime: 5 * 60_000,
  });

  const isPrivileged = userRoles?.some((r) => ADMIN_ROLES.includes(r));

  return (
    <nav className="sticky top-0 z-40 bg-brand-bg/85 backdrop-blur-md border-b border-brand-navy/5">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto gap-3">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={pioneerLogo.url} alt="Pioneer Africa Hub logo" className="size-9 object-contain" />
          <span className="font-display text-lg font-bold tracking-tight">Pioneer Africa Hub<span className="text-brand-orange">.</span></span>
        </Link>

        <div className="hidden md:flex gap-6 font-medium text-sm">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} className="text-brand-navy/60 hover:text-brand-navy" activeProps={{ className: "text-brand-navy" }}>{l.label}</Link>
          ))}
          {signedIn && <Link to="/mentor" className="text-brand-mint hover:text-brand-mint/80 font-semibold">AI Mentor</Link>}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {signedIn ? (
            <>
              {stats && (stats.xp > 0 || stats.streak_days > 0) && (
                <div className="hidden md:flex items-center gap-2 mr-1" aria-label={`Level ${stats.level}, ${stats.xp} XP, ${stats.streak_days} day streak`}>
                  <span className="px-2.5 py-1 rounded-full bg-brand-mint/15 text-brand-mint text-xs font-bold" title="Experience points">Lv {stats.level} · {stats.xp} XP</span>
                  {stats.streak_days > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-brand-orange/15 text-brand-orange text-xs font-bold" title="Daily streak"><Flame className="size-3.5 inline -mt-0.5" aria-hidden /> {stats.streak_days}d</span>
                  )}
                </div>
              )}
              <NotificationBell />
              <Link to="/dashboard" className="hidden sm:inline-flex px-3 py-2 text-sm font-semibold text-brand-navy">Dashboard</Link>
              {isPrivileged && (
                <Link to="/admin" className="hidden sm:inline-flex px-3 py-2 text-sm font-semibold text-brand-orange">Admin</Link>
              )}
              <button
                onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
                className="hidden sm:inline-flex px-4 py-2 bg-brand-navy text-white rounded-full text-sm font-semibold hover:bg-brand-navy/90"
              >Sign out</button>
            </>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "signin" }} className="hidden sm:inline-flex px-3 py-2 text-sm font-semibold text-brand-navy">Sign in</Link>
              <Link to="/auth" search={{ mode: "signup" }} className="hidden sm:inline-flex px-4 py-2 bg-brand-navy text-white rounded-full text-sm font-semibold hover:bg-brand-navy/90">Get Started</Link>
            </>
          )}

          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden size-10 flex items-center justify-center rounded-full hover:bg-brand-clay"
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-brand-navy/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-brand-bg shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-navy/5">
              <span className="font-display font-bold">Menu</span>
              <button onClick={() => setMenuOpen(false)} className="size-9 flex items-center justify-center rounded-full hover:bg-brand-clay" aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex flex-col p-5 gap-1">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-semibold hover:bg-brand-clay">{l.label}</Link>
              ))}
              {signedIn && (
                <>
                  <Link to="/mentor" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-semibold text-brand-mint hover:bg-brand-clay">AI Mentor</Link>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-semibold hover:bg-brand-clay">Dashboard</Link>
                  {isPrivileged && (
                    <Link to="/admin" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-semibold text-brand-orange hover:bg-brand-clay">Admin</Link>
                  )}
                  <Link to="/portfolio" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-semibold hover:bg-brand-clay">My portfolio</Link>
                  {userRoles?.some((r) => r === "partner" || r === "admin") && (
                    <Link to="/talent" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-semibold hover:bg-brand-clay">Talent directory</Link>
                  )}
                  <Link to="/cv" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-semibold hover:bg-brand-clay">My CV</Link>
                  <Link to="/certificates" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-semibold hover:bg-brand-clay">Certificates</Link>
                  <Link to="/applications" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-semibold hover:bg-brand-clay">My Applications</Link>

                  <Link to="/request-access" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-semibold hover:bg-brand-clay">Request access</Link>
                </>
              )}
            </div>
            <div className="mt-auto p-5 border-t border-brand-navy/5">
              {signedIn ? (
                <button
                  onClick={async () => { await supabase.auth.signOut(); setMenuOpen(false); navigate({ to: "/" }); }}
                  className="w-full px-4 py-3 bg-brand-navy text-white rounded-full font-semibold"
                >Sign out</button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/auth" search={{ mode: "signin" }} onClick={() => setMenuOpen(false)} className="px-4 py-3 text-center rounded-full font-semibold border border-brand-navy/15">Sign in</Link>
                  <Link to="/auth" search={{ mode: "signup" }} onClick={() => setMenuOpen(false)} className="px-4 py-3 text-center bg-brand-orange text-white rounded-full font-semibold">Get Started</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
