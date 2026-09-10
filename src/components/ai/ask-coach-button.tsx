import { Link } from "@tanstack/react-router";
import { Sparkle } from "lucide-react";

/**
 * Context-aware entry point into the AI coach: opens the chat pre-loaded with
 * the lesson / quiz / project / opportunity the learner is looking at.
 */
export function AskCoachButton({
  kind = "mentor",
  label = "Ask the mentor",
  context,
  prompt,
  className = "",
}: {
  kind?: "mentor" | "advisor";
  label?: string;
  context: string;
  prompt: string;
  className?: string;
}) {
  return (
    <Link
      to={kind === "mentor" ? "/mentor" : "/advisor"}
      search={{ q: prompt, context }}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-brand-mint/15 text-brand-navy hover:bg-brand-mint/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint ${className}`}
    >
      <Sparkle className="size-3.5" aria-hidden />
      {label}
    </Link>
  );
}
