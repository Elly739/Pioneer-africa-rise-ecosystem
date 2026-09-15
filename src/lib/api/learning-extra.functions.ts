import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider, CHAT_MODEL } from "@/lib/ai-gateway.server";

/** Public: upcoming scheduled runs of a course. */
export const listCourseCohorts = createServerFn({ method: "GET" })
  .inputValidator(z.object({ courseId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("course_cohorts")
      .select("id,title,starts_on,ends_on,enroll_deadline,capacity")
      .eq("course_id", data.courseId)
      .order("starts_on", { ascending: true });
    return rows ?? [];
  });

/** Staff: schedule a new run of a course. */
export const createCohort = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      courseId: z.string().uuid(),
      title: z.string().min(3).max(120),
      startsOn: z.string(),
      endsOn: z.string(),
      enrollDeadline: z.string().optional().nullable(),
      capacity: z.number().int().positive().optional().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("course_cohorts").insert({
      course_id: data.courseId,
      title: data.title,
      starts_on: data.startsOn,
      ends_on: data.endsOn,
      enroll_deadline: data.enrollDeadline || null,
      capacity: data.capacity ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const joinCohort = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ courseId: z.string().uuid(), cohortId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: cohort } = await context.supabase
      .from("course_cohorts")
      .select("enroll_deadline")
      .eq("id", data.cohortId)
      .maybeSingle();
    if (cohort?.enroll_deadline && new Date(cohort.enroll_deadline) < new Date()) {
      throw new Error("Enrolment for this run has closed");
    }

    const { data: existing } = await context.supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", data.courseId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await context.supabase
        .from("enrollments")
        .update({ cohort_id: data.cohortId })
        .eq("id", existing.id);
      if (error) throw error;
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("enrollments")
      .insert({ course_id: data.courseId, user_id: context.userId, cohort_id: data.cohortId });
    if (error) throw error;
    return { ok: true };
  });

/** The open-response assignment for a course, plus this learner's submission. */
export const getCourseAssignment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ courseId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: assignment } = await supabaseAdmin
      .from("course_assignments")
      .select("id,title,prompt,rubric")
      .eq("course_id", data.courseId)
      .maybeSingle();
    if (!assignment) return { assignment: null, submission: null };

    const { data: submission } = await context.supabase
      .from("assignment_submissions")
      .select("id,response,ai_score,ai_feedback,graded_at,updated_at")
      .eq("assignment_id", assignment.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    return { assignment, submission: submission ?? null };
  });

export const createAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      courseId: z.string().uuid(),
      title: z.string().min(3).max(140),
      prompt: z.string().min(10).max(3000),
      rubric: z.string().max(2000).default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("course_assignments").insert({
      course_id: data.courseId,
      title: data.title,
      prompt: data.prompt,
      rubric: data.rubric ?? "",
    });
    if (error) throw error;
    return { ok: true };
  });

/** Submit an open response and get it graded by AI against the rubric. */
export const submitAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ assignmentId: z.string().uuid(), response: z.string().min(20).max(8000) }))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI grading is not configured");

    const { data: assignment } = await supabaseAdmin
      .from("course_assignments")
      .select("title,prompt,rubric,course_id,courses:course_id(title)")
      .eq("id", data.assignmentId)
      .maybeSingle();
    if (!assignment) throw new Error("Assignment not found");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const prompt = `You are grading a learner's open response on Pioneer Africa Hub.

COURSE: ${(assignment as any).courses?.title ?? ""}
ASSIGNMENT: ${assignment.title}
QUESTION: ${assignment.prompt}
RUBRIC: ${assignment.rubric || "Clarity, correctness, depth of reasoning, and applicability to an African context."}

LEARNER RESPONSE:
"""${data.response}"""

Reply with strict JSON only, no markdown fence:
{"score": <integer 0-100>, "feedback": "<max 140 words: what was strong, what to improve, one concrete next step>"}`;

    let score = 0;
    let feedback = "";
    try {
      const { text } = await generateText({ model: gateway(CHAT_MODEL), prompt });
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : text);
      score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
      feedback = String(parsed.feedback ?? "").slice(0, 1500);
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 402) throw new Error("AI credits are exhausted — add credits to keep grading.");
      if (status === 429) throw new Error("AI is busy right now. Try again in a moment.");
      throw new Error("Grading failed. Your answer was not saved — please try again.");
    }

    const { error } = await context.supabase.from("assignment_submissions").upsert(
      {
        assignment_id: data.assignmentId,
        user_id: context.userId,
        response: data.response,
        ai_score: score,
        ai_feedback: feedback,
        graded_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id,user_id" },
    );
    if (error) throw error;

    return { score, feedback };
  });

/** Public certificate verification by code. */
export const verifyCertificate = createServerFn({ method: "GET" })
  .inputValidator(z.object({ code: z.string().min(4).max(64) }))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin.rpc("verify_certificate", { _code: data.code });
    if (error) throw error;
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row ?? null;
  });
