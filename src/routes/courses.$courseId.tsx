import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getCourse, enrollInCourse, getMyCourseState } from "@/lib/api/learn.functions";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CohortList, AssignmentBox } from "@/components/course-extras";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const courseQuery = (courseId: string) =>
  queryOptions({
    queryKey: ["course", courseId],
    queryFn: () => getCourse({ data: { courseId } }),
  });

export const Route = createFileRoute("/courses/$courseId")({
  head: ({ params }) => ({
    meta: [
      { title: "Course · Pioneer Africa Hub" },
      { name: "description", content: "Course details, lessons, and the final quiz." },
      { property: "og:title", content: `Pioneer Africa Hub course ${params.courseId}` },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(courseQuery(params.courseId)),
  component: CoursePage,
});

const levelLabel: Record<string, string> = { fundamental: "Fundamental", intermediate: "Intermediate", advanced: "Advanced" };

function CoursePage() {
  const { courseId } = Route.useParams();
  const { data } = useSuspenseQuery(courseQuery(courseId));
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-20">
        <Link to="/courses" className="text-sm font-semibold text-brand-navy/60 hover:text-brand-navy">
          ← All courses
        </Link>

        <div className="mt-6 bg-brand-navy text-white rounded-[2rem] p-10 md:p-14">
          <span className="inline-block px-3 py-1 bg-brand-orange/20 text-brand-orange rounded-full text-[11px] font-bold uppercase tracking-wider mb-6">
            {levelLabel[data.course.level] ?? data.course.level}
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight max-w-3xl">{data.course.title}</h1>
          <p className="mt-4 text-white/70 text-lg max-w-2xl">{data.course.summary}</p>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-white/60">
            <span>{data.lessons.length} lessons</span>
            {data.quiz && <span>· Final quiz · pass to earn certificate</span>}
          </div>
        </div>

        <CohortList courseId={data.course.id} signedIn={signedIn} />
        {signedIn ? (
          <>
            <EnrolledPanel courseId={courseId} lessons={data.lessons} quizId={data.quiz?.id ?? null} />
            <AssignmentBox courseId={data.course.id} />
          </>
        ) : (
          <div className="mt-8 rounded-3xl border border-brand-navy/10 bg-white p-8 text-center">
            <h2 className="font-display text-2xl font-bold">Sign in to start this course</h2>
            <p className="text-brand-navy/60 mt-2 text-sm">Track progress, take quizzes, and earn certificates.</p>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="mt-6 inline-flex px-6 py-3 bg-brand-orange text-white rounded-full font-bold"
            >
              Create your account
            </Link>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function EnrolledPanel({
  courseId,
  lessons,
  quizId,
}: {
  courseId: string;
  lessons: { id: string; order: number; title: string; duration_min: number }[];
  quizId: string | null;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const stateFn = useServerFn(getMyCourseState);
  const enrollFn = useServerFn(enrollInCourse);

  const stateKey = ["my-course-state", courseId];
  const { data: state } = useQuery({
    queryKey: stateKey,
    queryFn: () => stateFn({ data: { courseId } }),
  });

  const enroll = useMutation({
    mutationFn: () => enrollFn({ data: { courseId } }),
    onSuccess: () => {
      toast.success("Enrolled!");
      qc.invalidateQueries({ queryKey: stateKey });
      if (lessons[0]) navigate({ to: "/lessons/$lessonId", params: { lessonId: lessons[0].id } });
    },
    onError: () => toast.error("Could not enroll"),
  });

  const completedSet = new Set(state?.completedLessonIds ?? []);
  const completedCount = state?.completedLessonIds?.length ?? 0;
  const allDone = lessons.length > 0 && completedCount >= lessons.length;
  const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="mt-8 grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-white border border-brand-navy/5 rounded-3xl p-8">
        <h2 className="font-display text-2xl font-bold mb-6">Lessons</h2>
        <ol className="space-y-2">
          {lessons.map((l) => {
            const done = completedSet.has(l.id);
            return (
              <li key={l.id}>
                <Link
                  to="/lessons/$lessonId"
                  params={{ lessonId: l.id }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-brand-navy/5 hover:border-brand-navy/20 transition-colors"
                >
                  <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-brand-mint text-brand-navy" : "bg-brand-clay text-brand-navy/60"}`}>
                    {done ? "✓" : l.order}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{l.title}</p>
                    <p className="text-xs text-brand-navy/50">{l.duration_min} min</p>
                  </div>
                  <span aria-hidden className="text-brand-navy/40">→</span>
                </Link>
              </li>
            );
          })}
        </ol>

        {quizId && (
          <div className="mt-6 p-6 rounded-2xl bg-brand-clay/40 border border-brand-clay flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-lg">Final quiz</p>
              <p className="text-sm text-brand-navy/60">Pass it to earn your certificate.</p>
            </div>
            <Link
              to="/quizzes/$quizId"
              params={{ quizId }}
              className={`px-5 py-2.5 rounded-full text-sm font-bold ${allDone ? "bg-brand-orange text-white" : "bg-white border border-brand-navy/10 text-brand-navy"}`}
            >
              {allDone ? "Take quiz" : "Open quiz"}
            </Link>
          </div>
        )}
      </div>

      <aside className="bg-brand-navy text-white rounded-3xl p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Your progress</p>
        <div className="text-5xl font-display font-bold">{pct}%</div>
        <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-brand-mint transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-4 text-sm text-white/60">{completedCount} of {lessons.length} lessons completed</p>

        {!state?.enrolled ? (
          <button
            onClick={() => enroll.mutate()}
            disabled={enroll.isPending}
            className="mt-6 w-full py-3 rounded-full bg-brand-orange text-white font-bold disabled:opacity-50"
          >
            {enroll.isPending ? "Enrolling…" : "Enroll & start"}
          </button>
        ) : (
          lessons[0] && (
            <Link
              to="/lessons/$lessonId"
              params={{ lessonId: lessons[0].id }}
              className="mt-6 inline-flex w-full justify-center py-3 rounded-full bg-white text-brand-navy font-bold"
            >
              Continue learning
            </Link>
          )
        )}

        {state?.certificateCode && (
          <div className="mt-6 p-4 rounded-2xl bg-brand-mint/10 border border-brand-mint/30 text-sm">
            <p className="font-bold text-brand-mint">Certified!</p>
            <p className="text-white/60 text-xs mt-1">Code: <span className="font-mono">{state.certificateCode}</span></p>
          </div>
        )}
      </aside>
    </div>
  );
}
