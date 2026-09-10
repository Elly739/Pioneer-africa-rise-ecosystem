import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteNav } from "@/components/site-nav";
import { CoachChat } from "@/components/ai/coach-chat";

const searchSchema = z.object({
  q: z.string().optional(),
  context: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/advisor")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "AI Career Advisor — Pioneer Africa Hub" },
      {
        name: "description",
        content:
          "CV reviews, interview prep and opportunity strategy from an advisor that knows your projects and saved roles.",
      },
      { property: "og:title", content: "AI Career Advisor — Pioneer Africa Hub" },
      {
        property: "og:description",
        content: "Career coaching grounded in your Pioneer Africa Hub portfolio and live opportunities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdvisorPage,
});

function AdvisorPage() {
  const { q, context } = Route.useSearch();
  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy flex flex-col">
      <SiteNav />
      <div className="px-6 pt-8 pb-4 max-w-6xl mx-auto w-full">
        <div className="inline-block px-3 py-1 bg-brand-orange/15 text-brand-orange rounded-full text-xs font-bold uppercase tracking-wider mb-3">
          Career Bridge
        </div>
        <h1 className="font-display text-3xl font-bold">AI Career Advisor</h1>
        <p className="text-brand-navy/60 text-sm mt-1">
          CV reviews, interview prep, internship strategy — grounded in your real portfolio.
        </p>
      </div>
      <div className="pb-6 flex-1">
        <CoachChat
          kind="advisor"
          contextLabel={context ?? null}
          initialPrompt={q ?? null}
          intro="Hey 👋 I'm your Pioneer Africa Hub Career Advisor. I can see your projects and saved opportunities — what career move are we making this week?"
          suggestions={[
            "Which live opportunities fit me best?",
            "Draft a cover note for my strongest match",
            "Review my portfolio for an internship application",
          ]}
        />
      </div>
    </div>
  );
}
