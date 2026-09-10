import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type ProjectStatus = Database["public"]["Enums"]["project_status"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const ROLES: AppRole[] = ["admin", "moderator", "teacher", "partner"];

async function hasRole(supabase: any, userId: string, role: AppRole): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
  if (error) throw error;
  return !!data;
}

async function assertAnyRole(supabase: any, userId: string, roles: AppRole[]): Promise<AppRole> {
  for (const role of roles) {
    if (await hasRole(supabase, userId, role)) return role;
  }
  throw new Error("Forbidden");
}

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Dashboard stats — available to any privileged role
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ROLES);
    const admin = await loadAdmin();

    const [
      { count: users },
      { count: courses },
      { count: lessons },
      { count: quizzes },
      { count: opportunities },
      { count: projects },
      { count: discussions },
      { count: applications },
      { count: challengeSubmissions },
    ] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("courses").select("*", { count: "exact", head: true }),
      admin.from("lessons").select("*", { count: "exact", head: true }),
      admin.from("quizzes").select("*", { count: "exact", head: true }),
      admin.from("opportunities").select("*", { count: "exact", head: true }),
      admin.from("projects").select("*", { count: "exact", head: true }),
      admin.from("discussions").select("*", { count: "exact", head: true }),
      admin.from("applications").select("*", { count: "exact", head: true }),
      admin.from("challenge_submissions").select("*", { count: "exact", head: true }),
    ]);

    return {
      users: users ?? 0,
      courses: courses ?? 0,
      lessons: lessons ?? 0,
      quizzes: quizzes ?? 0,
      opportunities: opportunities ?? 0,
      projects: projects ?? 0,
      discussions: discussions ?? 0,
      applications: applications ?? 0,
      challengeSubmissions: challengeSubmissions ?? 0,
    };
  });

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { page?: number; pageSize?: number; search?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin"]);
    const admin = await loadAdmin();

    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.max(5, Math.min(50, data.pageSize ?? 20));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = admin.from("profiles").select("*", { count: "exact" });
    if (data.search?.trim()) {
      const term = data.search.trim();
      query = query.ilike("display_name", `%${term}%`);
    }

    const { data: profiles, error, count } = await query.range(from, to).order("created_at", { ascending: false });
    if (error) throw error;

    const userIds = profiles?.map((p) => p.id) ?? [];
    const { data: roles } = await admin.from("user_roles").select("user_id, role").in("user_id", userIds);

    const rolesByUser = new Map<string, AppRole[]>();
    for (const r of roles ?? []) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    }

    return {
      users: profiles?.map((p) => ({ ...p, roles: rolesByUser.get(p.id) ?? [] })) ?? [],
      count: count ?? 0,
      page,
      pageSize,
    };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; role: AppRole; action: "add" | "remove" }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin"]);
    const admin = await loadAdmin();

    if (data.action === "add") {
      const { error } = await admin.from("user_roles").insert({ user_id: data.userId, role: data.role });
      if (error) throw error;
    } else {
      const { error } = await admin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
      if (error) throw error;
    }
    return { ok: true };
  });

export const listContentForModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin", "moderator"]);
    const admin = await loadAdmin();

    const [{ data: projects }, { data: discussions }] = await Promise.all([
      admin
        .from("projects")
        .select("id, title, slug, summary, status, user_id, created_at, profiles:profiles!user_id(display_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("discussions")
        .select("id, title, topic, user_id, created_at, profiles:profiles!user_id(display_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return {
      projects: projects ?? [],
      discussions: discussions ?? [],
    };
  });

export const moderateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { type: "project" | "discussion"; id: string; action: "delete" | "approve" }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin", "moderator"]);
    const admin = await loadAdmin();

    if (data.type === "project") {
      if (data.action === "delete") {
        const { error } = await admin.from("projects").delete().eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await admin.from("projects").update({ status: "launched" as ProjectStatus }).eq("id", data.id);
        if (error) throw error;
      }
    } else {
      if (data.action === "delete") {
        const { error } = await admin.from("discussions").delete().eq("id", data.id);
        if (error) throw error;
      } else {
        // Discussions have no status; approve is a no-op for now.
        return { ok: true };
      }
    }
    return { ok: true };
  });

export const listOpportunitiesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin", "partner"]);
    const admin = await loadAdmin();

    const { data: opportunities, error } = await admin
      .from("opportunities")
      .select("id, title, organization, location, type, tags, created_at, applications:applications(count)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return { opportunities: opportunities ?? [] };
  });

export const listApplicationsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { opportunityId?: string; status?: ApplicationStatus | "all" }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin", "partner"]);
    const admin = await loadAdmin();

    let query = admin
      .from("applications")
      .select(
        "id, status, notes, created_at, opportunity_id, user_id, opportunities:opportunity_id(title, organization), profiles:user_id(display_name, avatar_url)",
      )
      .order("created_at", { ascending: false });

    if (data.opportunityId && data.opportunityId !== "all") {
      query = query.eq("opportunity_id", data.opportunityId);
    }
    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const { data: applications, error } = await query.limit(100);
    if (error) throw error;

    return { applications: applications ?? [] };
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string; status: ApplicationStatus }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin", "partner"]);
    const admin = await loadAdmin();

    const { error } = await admin.from("applications").update({ status: data.status }).eq("id", data.applicationId);
    if (error) throw error;
    return { ok: true };
  });

export const listCoursesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin", "teacher"]);
    const admin = await loadAdmin();

    const { data: courses, error } = await admin
      .from("courses")
      .select("id, title, slug, level, summary, cover_url, subject_id, subjects:subject_id(title), lessons:lessons(count), quizzes:quizzes(count)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return { courses: courses ?? [] };
  });

// ============ Role requests (option A) ============

const REQUESTABLE_ROLES: AppRole[] = ["teacher", "moderator", "partner"];

export const requestRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { role: AppRole; note?: string }) => {
    if (!REQUESTABLE_ROLES.includes(data.role)) throw new Error("Invalid role");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("role_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("requested_role", data.role)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) return { ok: true, alreadyPending: true };
    const { error } = await supabase
      .from("role_requests")
      .insert({ user_id: userId, requested_role: data.role, note: data.note ?? null });
    if (error) throw error;
    return { ok: true };
  });

export const listMyRoleRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("role_requests")
      .select("id, requested_role, note, status, created_at, reviewed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { requests: data ?? [] };
  });

export const listRoleRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin"]);
    const admin = await loadAdmin();
    const { data, error } = await admin
      .from("role_requests")
      .select("id, user_id, requested_role, note, status, created_at, reviewed_at, profiles:user_id(display_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return { requests: data ?? [] };
  });

export const reviewRoleRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; approve: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin"]);
    const admin = await loadAdmin();
    const { data: req, error: fetchErr } = await admin
      .from("role_requests").select("user_id, requested_role, status").eq("id", data.id).single();
    if (fetchErr) throw fetchErr;
    if (req.status !== "pending") throw new Error("Request already reviewed");
    if (data.approve) {
      const { error } = await admin.from("user_roles").insert({ user_id: req.user_id, role: req.requested_role });
      if (error && !String(error.message).includes("duplicate")) throw error;
    }
    const { error: updErr } = await admin
      .from("role_requests")
      .update({ status: data.approve ? "approved" : "rejected", reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (updErr) throw updErr;
    return { ok: true };
  });

// ============ Role invites (option C) ============

export const createRoleInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { role: AppRole; email?: string; expiresInDays?: number }) => {
    if (!["teacher", "moderator", "partner"].includes(data.role)) throw new Error("Invalid role");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin"]);
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const days = Math.max(1, Math.min(365, data.expiresInDays ?? 30));
    const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
    const { data: invite, error } = await supabase
      .from("role_invites")
      .insert({ token, role: data.role, email: data.email?.toLowerCase() ?? null, expires_at: expiresAt, created_by: userId })
      .select("id, token, role, email, expires_at, created_at")
      .single();
    if (error) throw error;
    return { invite };
  });

export const listRoleInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin"]);
    const admin = await loadAdmin();
    const { data, error } = await admin
      .from("role_invites")
      .select("id, token, role, email, expires_at, created_at, used_by, used_at, profiles:used_by(display_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return { invites: data ?? [] };
  });

export const deleteRoleInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin"]);
    const { error } = await supabase.from("role_invites").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const redeemRoleInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const admin = await loadAdmin();

    const { data: invite, error } = await admin
      .from("role_invites")
      .select("id, role, email, expires_at, used_by")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw error;
    if (!invite) throw new Error("Invite not found");
    if (invite.used_by) throw new Error("Invite already used");
    if (new Date(invite.expires_at) < new Date()) throw new Error("Invite expired");

    if (invite.email) {
      const { data: me } = await admin.auth.admin.getUserById(userId);
      if (me?.user?.email?.toLowerCase() !== invite.email.toLowerCase()) {
        throw new Error("This invite is reserved for another email address");
      }
    }

    const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role: invite.role });
    if (roleErr && !String(roleErr.message).includes("duplicate")) throw roleErr;

    await admin.from("role_invites").update({ used_by: userId, used_at: new Date().toISOString() }).eq("id", invite.id);
    return { ok: true, role: invite.role };
  });

// ============ Announcements ============

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, body, link, target_roles, created_at, created_by, profiles:created_by(display_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return { announcements: data ?? [] };
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { title: string; body: string; link?: string; targetRoles?: AppRole[] }) => {
    if (!data.title?.trim() || !data.body?.trim()) throw new Error("Title and body are required");
    if (data.title.length > 140) throw new Error("Title too long");
    if (data.body.length > 2000) throw new Error("Body too long");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin"]);
    const admin = await loadAdmin();

    const targetRoles = data.targetRoles && data.targetRoles.length > 0 ? data.targetRoles : null;
    const { data: created, error } = await admin
      .from("announcements")
      .insert({
        title: data.title.trim(),
        body: data.body.trim(),
        link: data.link?.trim() || null,
        target_roles: targetRoles,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    const { data: fanout, error: fanoutErr } = await admin.rpc("fanout_announcement", { _announcement_id: created.id });
    if (fanoutErr) throw fanoutErr;
    return { ok: true, id: created.id, notified: fanout ?? 0 };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin"]);
    const admin = await loadAdmin();
    const { error } = await admin.from("announcements").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Teacher workspace summary
export const getTeacherWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin", "teacher"]);
    const admin = await loadAdmin();

    const [{ count: totalCourses }, { count: totalLessons }, { count: totalEnrollments }, { count: passedQuizzes }] = await Promise.all([
      admin.from("courses").select("*", { count: "exact", head: true }),
      admin.from("lessons").select("*", { count: "exact", head: true }),
      admin.from("enrollments").select("*", { count: "exact", head: true }),
      admin.from("quiz_attempts").select("*", { count: "exact", head: true }).eq("passed", true),
    ]);

    return {
      totalCourses: totalCourses ?? 0,
      totalLessons: totalLessons ?? 0,
      totalEnrollments: totalEnrollments ?? 0,
      passedQuizzes: passedQuizzes ?? 0,
    };
  });

// Partner workspace summary
export const getPartnerWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin", "partner"]);
    const admin = await loadAdmin();

    const [{ count: opportunities }, { count: pending }, { count: interview }, { count: offer }] = await Promise.all([
      admin.from("opportunities").select("*", { count: "exact", head: true }),
      admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "submitted"),
      admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "interview"),
      admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "offer"),
    ]);

    return {
      opportunities: opportunities ?? 0,
      pendingApplications: pending ?? 0,
      interviews: interview ?? 0,
      offers: offer ?? 0,
    };
  });

// Admin overview: pending queues
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin"]);
    const admin = await loadAdmin();

    const [{ count: pendingRequests }, { count: activeInvites }, { count: pendingApps }, { data: recentAnnouncements }] = await Promise.all([
      admin.from("role_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("role_invites").select("*", { count: "exact", head: true }).is("used_by", null),
      admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "submitted"),
      admin.from("announcements").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
    ]);

    return {
      pendingRoleRequests: pendingRequests ?? 0,
      activeInvites: activeInvites ?? 0,
      pendingApplications: pendingApps ?? 0,
      recentAnnouncements: recentAnnouncements ?? [],
    };
  });


// Admin funnel analytics: signup -> onboarded -> enrolled -> project shipped -> applied
export const getFunnelAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase, userId, ["admin"]);
    const admin = await loadAdmin();

    const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: profiles },
      { data: enrollments },
      { data: projects },
      { data: applications },
      { data: certificates },
    ] = await Promise.all([
      admin.from("profiles").select("id, onboarded_at, created_at"),
      admin.from("enrollments").select("user_id"),
      admin.from("projects").select("user_id"),
      admin.from("applications").select("user_id"),
      admin.from("certificates").select("user_id"),
    ]);

    const uniq = (rows: { user_id: string }[] | null) =>
      new Set((rows ?? []).map((r) => r.user_id)).size;

    const signups = profiles?.length ?? 0;
    const onboarded = (profiles ?? []).filter((p: any) => !!p.onboarded_at).length;

    const steps = [
      { key: "signup", label: "Signed up", value: signups },
      { key: "onboarded", label: "Completed onboarding", value: onboarded },
      { key: "enrolled", label: "Enrolled in a course", value: uniq(enrollments as any) },
      { key: "certified", label: "Earned a certificate", value: uniq(certificates as any) },
      { key: "shipped", label: "Shipped a project", value: uniq(projects as any) },
      { key: "applied", label: "Applied to an opportunity", value: uniq(applications as any) },
    ];

    // 30-day signup trend
    const buckets = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      buckets.set(d, 0);
    }
    for (const p of profiles ?? []) {
      const day = String((p as any).created_at ?? "").slice(0, 10);
      if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }

    return {
      steps,
      signupsLast30: (profiles ?? []).filter((p: any) => p.created_at >= since).length,
      trend: Array.from(buckets, ([date, count]) => ({ date, count })),
    };
  });
