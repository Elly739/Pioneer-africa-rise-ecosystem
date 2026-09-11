import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ALLOWED_ROLES: AppRole[] = ["admin", "moderator", "teacher", "partner"];

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    if (!ALLOWED_ROLES.some((r) => roleSet.has(r))) {
      throw redirect({ to: "/dashboard" });
    }
    return { user, roles: Array.from(roleSet) as AppRole[] };
  },
  errorComponent: AdminError,
  notFoundComponent: AdminNotFound,
  component: AdminLayout,
});

function AdminError({ error }: { error: Error }) {
  return (
    <div className="min-h-dvh bg-brand-bg px-4 py-12 text-center">
      <p className="text-red-600">Error: {error.message}</p>
      <Link to="/dashboard" className="mt-4 inline-block text-brand-orange font-semibold">Back to dashboard</Link>
    </div>
  );
}

function AdminNotFound() {
  return (
    <div className="min-h-dvh bg-brand-bg px-4 py-12 text-center">
      <p className="text-brand-navy/70">Admin page not found.</p>
      <Link to="/admin" className="mt-4 inline-block text-brand-orange font-semibold">Back to admin</Link>
    </div>
  );
}

const navItems = [
  { to: "/admin" as const, label: "Dashboard", roles: ["admin", "moderator", "teacher", "partner"] },
  { to: "/admin/analytics" as const, label: "Analytics", roles: ["admin"] },
  { to: "/admin/users" as const, label: "Users", roles: ["admin"] },
  { to: "/admin/requests" as const, label: "Role requests", roles: ["admin"] },
  { to: "/admin/invites" as const, label: "Invites", roles: ["admin"] },
  { to: "/admin/announcements" as const, label: "Announcements", roles: ["admin"] },
  { to: "/admin/content" as const, label: "Content", roles: ["admin", "moderator"] },
  { to: "/admin/blog" as const, label: "Articles", roles: ["admin", "partner"] },

  { to: "/admin/opportunities" as const, label: "Opportunities", roles: ["admin", "partner"] },
  { to: "/admin/courses" as const, label: "Courses", roles: ["admin", "teacher"] },
];

function AdminLayout() {
  const { roles } = Route.useRouteContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const visibleNav = navItems.filter((item) => item.roles.some((r) => (roles as string[]).includes(r)));

  return (
    <div className="min-h-dvh bg-brand-bg text-brand-navy">
      <SiteNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-brand-navy/10 text-sm font-semibold"
              aria-label="Open admin menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              Admin menu
            </button>
          </div>

          {/* Sidebar */}
          <aside className="hidden md:block w-60 shrink-0">
            <div className="sticky top-24 rounded-2xl bg-white border border-brand-navy/5 p-4 shadow-sm">
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-brand-navy/40 mb-2">Admin</p>
              <nav className="flex flex-col gap-1">
                {visibleNav.map((item) => {
                  const active = currentPath === item.to || (item.to !== "/admin" && currentPath.startsWith(item.to));
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        active ? "bg-brand-orange/10 text-brand-orange" : "text-brand-navy/70 hover:bg-brand-clay"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-4 pt-4 border-t border-brand-navy/5">
                <Link to="/dashboard" className="px-3 py-2 text-xs font-semibold text-brand-navy/50 hover:text-brand-navy block">← Back to dashboard</Link>
              </div>
            </div>
          </aside>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-brand-navy/40" onClick={() => setMobileOpen(false)} />
              <div className="absolute left-0 top-0 h-full w-64 max-w-[80vw] bg-brand-bg shadow-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display font-bold">Admin</span>
                  <button onClick={() => setMobileOpen(false)} className="size-9 rounded-full hover:bg-brand-clay flex items-center justify-center" aria-label="Close">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <nav className="flex flex-col gap-1">
                  {visibleNav.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-3 rounded-xl font-semibold hover:bg-brand-clay"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {/* Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
