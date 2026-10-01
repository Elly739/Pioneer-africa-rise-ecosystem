import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { listCourseCohorts, joinCohort, getCourseAssignment, submitAssignment } from "@/lib/api/learning-extra.functions";

export function CohortList({ courseId, signedIn }: { courseId: string; signedIn: boolean }) {
  const listFn = useServerFn(listCourseCohorts);
  const joinFn = useServerFn(joinCohort);
  const { data: cohorts } = useQuery({ queryKey: ["cohorts", courseId], queryFn: () => listFn({ data: { courseId } }) });
  const join = useMutation({
    mutationFn: (cohortId: string) => joinFn({ data: { courseId, cohortId } }),
    onSuccess: () => toast.success("You're in this run"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not join"),
  });
  if (!cohorts || cohorts.length === 0) return null;
  return (
    <section className="mt-8 rounded-3xl bg-white border border-brand-navy/5 p-6">
      <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><CalendarDays className="size-5 text-brand-orange" aria-hidden /> Upcoming runs</h2>
      <div className="space-y-3">
        {cohorts.map((c) => {
          const closed = !!c.enroll_deadline && new Date(c.enroll_deadline) < new Date();
          return (
            <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-brand-navy/10">
              <div className="flex-1">
                <p className="font-semibold">{c.title}</p>
                <p className="text-xs text-brand-navy/60">
                  {new Date(c.starts_on).toLocaleDateString()} – {new Date(c.ends_on).toLocaleDateString()}
                  {c.enroll_deadline && ` · Join by ${new Date(c.enroll_deadline).toLocaleDateString()}`}
                </p>
              </div>
              {signedIn && (
                <button disabled={closed || join.isPending} onClick={() => join.mutate(c.id)} className="px-5 py-2 rounded-full bg-brand-navy text-white text-sm font-bold disabled:opacity-50">
                  {closed ? "Closed" : "Join this run"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AssignmentBox({ courseId }: { courseId: string }) {
  const getFn = useServerFn(getCourseAssignment);
  const submitFn = useServerFn(submitAssignment);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data } = useQuery({ queryKey: ["assignment", courseId], queryFn: () => getFn({ data: { courseId } }) });
  const submit = useMutation({
    mutationFn: (assignmentId: string) => submitFn({ data: { assignmentId, response: text } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assignment", courseId] }); toast.success("Graded"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Grading failed"),
  });
  if (!data?.assignment) return null;
  const { assignment, submission } = data;
  return (
    <section className="mt-8 rounded-3xl bg-white border border-brand-navy/5 p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-2">Assignment</p>
      <h2 className="font-display text-xl font-bold">{assignment.title}</h2>
      <p className="mt-2 text-sm text-brand-navy/70 whitespace-pre-wrap">{assignment.prompt}</p>
      {submission?.ai_score != null && (
        <div className="mt-4 p-4 rounded-2xl bg-brand-mint/10">
          <p className="font-bold flex items-center gap-2"><Sparkles className="size-4 text-brand-mint" aria-hidden /> Score: {submission.ai_score}/100</p>
          <p className="text-sm text-brand-navy/70 mt-1 whitespace-pre-wrap">{submission.ai_feedback}</p>
        </div>
      )}
      <textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={submission ? "Improve your answer and resubmit…" : "Write your answer (at least 20 characters)…"}
        className="mt-4 w-full px-4 py-3 rounded-xl border border-brand-navy/10 focus:outline-none focus:border-brand-orange text-sm"
      />
      <div className="flex justify-end mt-3">
        <button disabled={text.trim().length < 20 || submit.isPending} onClick={() => submit.mutate(assignment.id)} className="px-5 py-2.5 rounded-full bg-brand-orange text-white text-sm font-bold disabled:opacity-50">
          {submit.isPending ? "Grading…" : submission ? "Resubmit for feedback" : "Submit for AI feedback"}
        </button>
      </div>
    </section>
  );
}
