import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  FileBadge,
  Flame,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Newspaper,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/notification-bell";
import { getMyStats } from "@/lib/api/stats.functions";
import type { Database } from "@/integrations/supabase/types";
import pioneerLogo from "@/assets/pioneer-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MentorLauncher } from "@/components/ai/mentor-launcher";


const coreLinks = [
  { to: "/courses" as const, label: "Learn" },
  { to: "/innovate" as const, label: "Build" },
  { to: "/careers" as const, label: "Opportunities" },
  { to: "/community" as const, label: "Community" },
];

const moreLinks = [
  { to: "/challenges" as const, label: "Challenges", Icon: Trophy },
  { to: "/leaderboard" as const, label: "Leaderboard", Icon: Award },
  { to: "/blog" as const, label: "Articles", Icon: Newspaper },
];

const ADMIN_ROLES: Database["public"]["Enums"]["app_role"][] = ["admin", "moderator", "teacher", "partner"];

export function SiteNav() {
  const [signedIn, setSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userLabel, setUserLabel] = useState("Account");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setUserLabel(data.session?.user.user_metadata?.display_name ?? data.session?.user.email?.split("@")[0] ?? "Account");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
      setUserLabel(session?.user.user_metadata?.display_name ?? session?.user.email?.split("@")[0] ?? "Account");
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
  const isCoreActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);
  const isMoreActive = moreLinks.some((item) => isCoreActive(item.to));
  const initials = userLabel.slice(0, 2).toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate({ to: "/" });
  };

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md" aria-label="Main navigation">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-7">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src={pioneerLogo.url} alt="Pioneer Africa Hub" className="size-9 shrink-0 object-contain" />
          <span className="truncate font-display text-base font-bold xl:text-lg">Pioneer Africa Hub<span className="text-primary">.</span></span>
        </Link>

        <div className="hidden min-w-0 items-center justify-center gap-1 lg:flex">
          {coreLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isCoreActive(item.to) ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
            >
              {item.label}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`h-9 gap-1 px-3 font-semibold ${isMoreActive ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
                More <ChevronDown className="size-3.5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52 rounded-lg p-2">
              {moreLinks.map(({ to, label, Icon }) => (
                <DropdownMenuItem key={to} asChild className="rounded-md py-2.5">
                  <Link to={to}><Icon aria-hidden />{label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
          {signedIn ? (
            <>
              {stats && (stats.xp > 0 || stats.streak_days > 0) && (
                <Link to="/leaderboard" className="hidden h-9 items-center gap-2 rounded-full border border-border bg-secondary/70 px-3 text-xs font-bold xl:flex" aria-label={`Level ${stats.level}, ${stats.xp} XP, ${stats.streak_days} day streak`}>
                  <span className="text-brand-blue">Lv {stats.level}</span>
                  <span className="text-muted-foreground">{stats.xp} XP</span>
                  {stats.streak_days > 0 && (
                    <span className="flex items-center gap-1 border-l border-border pl-2 text-primary" title="Daily streak"><Flame className="size-3.5" aria-hidden /> {stats.streak_days}d</span>
                  )}
                </Link>
              )}
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden h-10 items-center gap-2 border-l border-border pl-3 pr-1 sm:flex" aria-label="Open account menu">
                    <span className="hidden max-w-28 truncate text-xs font-semibold xl:block">{userLabel}</span>
                    <span className="grid size-8 place-items-center rounded-full bg-foreground text-xs font-bold text-background">{initials}</span>
                    <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-lg p-2">
                  <DropdownMenuLabel className="truncate">{userLabel}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-md py-2.5"><Link to="/dashboard"><LayoutDashboard aria-hidden />Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-md py-2.5"><Link to="/portfolio"><UserRound aria-hidden />My portfolio</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-md py-2.5"><Link to="/applications"><BriefcaseBusiness aria-hidden />My applications</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-md py-2.5"><Link to="/certificates"><FileBadge aria-hidden />Certificates</Link></DropdownMenuItem>
                  {isPrivileged && <DropdownMenuItem asChild className="rounded-md py-2.5"><Link to="/admin"><ShieldCheck aria-hidden />Workspace</Link></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()} className="rounded-md py-2.5 text-destructive focus:text-destructive"><LogOut aria-hidden />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "signin" }} className="hidden sm:inline-flex px-3 py-2 text-sm font-semibold text-brand-navy">Sign in</Link>
              <Link to="/auth" search={{ mode: "signup" }} className="hidden rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:inline-flex">Get Started</Link>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen((open) => !open)}
            className="lg:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-background px-4 py-4 shadow-lg lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">
            {[...coreLinks, ...moreLinks.map(({ to, label }) => ({ to, label }))].map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={`rounded-md px-4 py-3 font-semibold ${isCoreActive(item.to) ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}>{item.label}</Link>
            ))}
            {signedIn ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-semibold">Dashboard</Link>
                <Link to="/portfolio" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-semibold">My portfolio</Link>
                <Link to="/applications" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-semibold">My applications</Link>
                <Link to="/cv" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-semibold">My CV</Link>
                <Link to="/certificates" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-semibold">Certificates</Link>
                {userRoles?.some((role) => role === "partner" || role === "admin") && <Link to="/talent" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-semibold">Talent directory</Link>}
                {isPrivileged && <Link to="/admin" onClick={() => setMenuOpen(false)} className="rounded-md px-4 py-3 font-semibold text-primary">Workspace</Link>}
                <Button variant="outline" onClick={() => void signOut()} className="mt-2 justify-start sm:col-span-2"><LogOut aria-hidden />Sign out</Button>
              </>
            ) : (
              <div className="mt-2 flex gap-2 sm:col-span-2">
                <Button asChild variant="outline" className="flex-1"><Link to="/auth" search={{ mode: "signin" }} onClick={() => setMenuOpen(false)}>Sign in</Link></Button>
                <Button asChild className="flex-1"><Link to="/auth" search={{ mode: "signup" }} onClick={() => setMenuOpen(false)}>Get Started</Link></Button>
              </div>
            )}
          </div>
        </div>
      )}
      </nav>
      <MentorLauncher signedIn={signedIn} />
    </>
  );
}
