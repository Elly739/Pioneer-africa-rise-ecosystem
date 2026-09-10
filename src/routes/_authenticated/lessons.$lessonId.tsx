import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { completeLesson, getLesson } from "@/lib/api/learn.functions";
import { SiteNav } from "@/components/site-nav";
import { AskCoachButton } from "@/components/ai/ask-coach-button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lessons/$lessonId")({
  head: () => ({ meta: [{ title: "Lesson · Pioneer Africa Hub" }] }),
  component: LessonPage,
});

function LessonPage() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getLesson);
  const completeFn = useServerFn(completeLesson);

  const { data, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => getFn({ data: { lessonId } }),
  });

  const complete = useMutation({
    mutationFn: () => completeFn({ data: { lessonId } }),
    onSuccess: () => {
      toast.success("Lesson marked complete");
      qc.invalidateQueries({ queryKey: ["my-course-state"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      const idx = data?.siblings.findIndex((s) => s.id === lessonId) ?? -1;
      const next = idx >= 0 ? data?.siblings[idx + 1] : null;
      if (next) navigate({ to: "/lessons/$lessonId", params: { lessonId: next.id } });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-brand-bg"><SiteNav />
        <p className="max-w-3xl mx-auto px-6 py-20 text-brand-navy/60">Loading lesson…</p>
      </div>
    );
  }

  const idx = data.siblings.findIndex((s) => s.id === lessonId);
  const prev = idx > 0 ? data.siblings[idx - 1] : null;
  const next = idx >= 0 && idx < data.siblings.length - 1 ? data.siblings[idx + 1] : null;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          to="/courses/$courseId"
          params={{ courseId: data.lesson.course_id }}
          className="text-sm font-semibold text-brand-navy/60 hover:text-brand-navy"
        >
          ← Back to course
        </Link>

        <article className="mt-8 bg-white border border-brand-navy/5 rounded-3xl p-10 md:p-14">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-3">
            Lesson {data.lesson.order} · {data.lesson.duration_min} min
          </p>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">{data.lesson.title}</h1>
            <AskCoachButton
              context={`Lesson: ${data.lesson.title}`}
              prompt={`I'm working through the lesson "${data.lesson.title}". Explain the key idea simply and give me one practice task.`}
            />
          </div>
          <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-2xl prose-pre:bg-brand-navy prose-pre:text-white prose-code:text-brand-orange prose-code:font-mono">
            <ReactMarkdown>{data.lesson.content}</ReactMarkdown>
          </div>
        </article>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-between items-center">
          {prev ? (
            <Link
              to="/lessons/$lessonId"
              params={{ lessonId: prev.id }}
              className="px-6 py-3 rounded-full border border-brand-navy/10 bg-white font-semibold text-sm"
            >
              ← {prev.title}
            </Link>
          ) : <span />}
          <button
            onClick={() => complete.mutate()}
            disabled={complete.isPending}
            className="px-8 py-3 rounded-full bg-brand-orange text-white font-bold disabled:opacity-60"
          >
            {complete.isPending ? "Saving…" : next ? "Mark complete & continue" : "Mark complete"}
          </button>
        </div>
      </div>
    </div>
  );
}
