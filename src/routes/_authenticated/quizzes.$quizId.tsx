import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getQuiz, submitQuiz } from "@/lib/api/learn.functions";
import { SiteNav } from "@/components/site-nav";
import { AskCoachButton } from "@/components/ai/ask-coach-button";

export const Route = createFileRoute("/_authenticated/quizzes/$quizId")({
  head: () => ({ meta: [{ title: "Quiz · Pioneer Africa Hub" }] }),
  component: QuizPage,
});

function QuizPage() {
  const { quizId } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getQuiz);
  const submitFn = useServerFn(submitQuiz);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => getFn({ data: { quizId } }),
  });

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<null | {
    score: number;
    passed: boolean;
    certificateCode: string | null;
    breakdown: Array<{ questionId: string; userChoice: number; correctIndex: number; explanation: string | null; isCorrect: boolean }>;
  }>(null);

  const submit = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          quizId,
          answers: Object.entries(answers).map(([questionId, choice]) => ({ questionId, choice })),
        },
      }),
    onSuccess: (r) => {
      setResult({ score: r.score, passed: r.passed, certificateCode: r.certificateCode, breakdown: r.breakdown });
      qc.invalidateQueries({ queryKey: ["my-course-state"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (isLoading || !data) {
    return <div className="min-h-screen bg-brand-bg"><SiteNav /><p className="px-6 py-20 max-w-3xl mx-auto text-brand-navy/60">Loading quiz…</p></div>;
  }

  const allAnswered = data.questions.every((q) => answers[q.id] !== undefined);
  const breakdownMap = new Map(result?.breakdown.map((b) => [b.questionId, b]) ?? []);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-3">Final quiz</p>
        <h1 className="font-display text-4xl font-bold mb-8">{data.quiz.title}</h1>

        {result ? (
          <div className="space-y-6">
            <div className={`p-10 rounded-3xl ${result.passed ? "bg-brand-mint/10 border border-brand-mint/30" : "bg-brand-clay border border-brand-navy/10"}`}>
              <div className="text-6xl font-display font-bold">{result.score}%</div>
              <p className="mt-2 text-lg font-bold">{result.passed ? "You passed! 🎉" : "Keep going — try again."}</p>
              <p className="text-brand-navy/60 text-sm mt-1">Passing score: {data.quiz.passing_score}%</p>
              {result.certificateCode && (
                <div className="mt-6 p-4 rounded-2xl bg-white border border-brand-mint/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-mint">Certificate issued</p>
                  <p className="font-mono mt-1">{result.certificateCode}</p>
                </div>
              )}
              <div className="mt-6">
                <AskCoachButton
                  context={`Quiz: ${data.quiz.title} (${result.score}%)`}
                  label="Ask the mentor what to do next"
                  prompt={`I scored ${result.score}% on the "${data.quiz.title}" quiz (pass mark ${data.quiz.passing_score}%). What exactly should I study next, and can you add it to my plan?`}
                />
              </div>
              <div className="mt-8 flex gap-3">
                <Link to="/dashboard" className="px-6 py-3 rounded-full bg-brand-navy text-white font-bold">Back to dashboard</Link>
                {!result.passed && (
                  <button onClick={() => { setResult(null); setAnswers({}); }} className="px-6 py-3 rounded-full bg-white border border-brand-navy/10 font-bold">
                    Retake quiz
                  </button>
                )}
              </div>
            </div>

            <h2 className="font-display text-2xl font-bold pt-4">Review</h2>
            {data.questions.map((q, i) => {
              const opts = (q.options as string[]) ?? [];
              const b = breakdownMap.get(q.id);
              return (
                <div key={q.id} className="bg-white border border-brand-navy/5 rounded-3xl p-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-brand-navy/40">Question {i + 1}</span>
                    {b?.isCorrect
                      ? <span className="text-xs font-bold uppercase tracking-wider text-brand-mint">✓ Correct</span>
                      : <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">✗ Incorrect</span>}
                  </div>
                  <h3 className="font-display text-lg font-bold mb-4">{q.question}</h3>
                  <div className="space-y-2">
                    {opts.map((opt, idx) => {
                      const isRight = b?.correctIndex === idx;
                      const isYours = b?.userChoice === idx;
                      return (
                        <div key={idx} className={`p-3 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
                          isRight ? "border-brand-mint bg-brand-mint/10" :
                          isYours ? "border-brand-orange bg-brand-orange/5" :
                          "border-brand-navy/10"
                        }`}>
                          <span>{opt}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/50">
                            {isRight ? "Correct answer" : isYours ? "Your answer" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {b?.explanation && (
                    <div className="mt-4 p-4 rounded-2xl bg-brand-clay text-sm text-brand-navy/80">
                      <span className="font-bold">Why:</span> {b.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {data.questions.map((q, i) => {
              const opts = (q.options as string[]) ?? [];
              return (
                <div key={q.id} className="bg-white border border-brand-navy/5 rounded-3xl p-8">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-navy/40 mb-2">Question {i + 1}</p>
                  <h3 className="font-display text-xl font-bold mb-6">{q.question}</h3>
                  <div className="space-y-2">
                    {opts.map((opt, idx) => (
                      <label
                        key={idx}
                        className={`block p-4 rounded-2xl border cursor-pointer transition-colors ${
                          answers[q.id] === idx ? "border-brand-orange bg-brand-orange/5" : "border-brand-navy/10 hover:border-brand-navy/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          className="sr-only"
                          checked={answers[q.id] === idx}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                        />
                        <span className="font-semibold">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => submit.mutate()}
              disabled={!allAnswered || submit.isPending}
              className="w-full py-4 rounded-full bg-brand-orange text-white font-bold text-lg disabled:opacity-50"
            >
              {submit.isPending ? "Scoring…" : "Submit quiz"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
