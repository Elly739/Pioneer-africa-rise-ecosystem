import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteNav } from "@/components/site-nav";
import { CoachChat } from "@/components/ai/coach-chat";

const searchSchema = z.object({
  q: z.string().optional(),
  context: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/mentor")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "AI Mentor — Pioneer Africa Hub" },
      {
        name: "description",
        content:
          "Your grounded AI learning coach: study plans, skill gaps, quiz feedback and real actions on Pioneer Africa Hub.",
      },
      { property: "og:title", content: "AI Mentor — Pioneer Africa Hub" },
      {
        property: "og:description",
        content: "A learning coach that knows your courses, quizzes and projects — and can act on them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MentorPage,
});

function MentorPage() {
  const { q, context } = Route.useSearch();
  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col">
      <SiteNav />
      <div className="px-6 pt-8 pb-4 max-w-6xl mx-auto w-full">
        <div className="inline-block px-3 py-1 bg-brand-mint/20 text-brand-mint rounded-full text-xs font-bold uppercase tracking-wider mb-3">
          AI Layer
        </div>
        <h1 className="font-display text-3xl font-bold">AI Mentor</h1>
        <p className="text-brand-navy/60 text-sm mt-1">
          Grounded in your real progress — it can enrol you, build a study plan and remember your goals.
        </p>
      </div>
      <div className="pb-6 flex-1">
        <CoachChat
          kind="mentor"
          contextLabel={context ?? null}
          initialPrompt={q ?? null}
          intro="Hi! I'm your Pioneer Africa Hub AI Mentor. I can see your courses, quiz scores and projects — tell me what you're working on and I'll plan the next step with you."
          suggestions={[
            "What should I learn next based on my progress?",
            "Build me a 4-week study plan",
            "Where am I weakest right now?",
          ]}
        />
      </div>
    </div>
  );
}
