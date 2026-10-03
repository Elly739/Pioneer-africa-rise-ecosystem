import { Link } from "@tanstack/react-router";
import { BotMessageSquare } from "lucide-react";

export function MentorLauncher({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) return null;

  return (
    <div className="fixed bottom-5 right-4 z-40 flex items-center gap-3 sm:bottom-7 sm:right-7">
      <span className="hidden rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground shadow-md lg:block">
        Need a hand?
      </span>
      <Link
        to="/mentor"
        aria-label="Open AI Mentor"
        className="group relative grid size-14 shrink-0 place-items-center rounded-full bg-foreground text-background shadow-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none sm:size-16"
      >
        <span className="absolute -right-0.5 -top-0.5 rounded-full border-2 border-background bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground">
          AI
        </span>
        <BotMessageSquare className="size-6 sm:size-7" aria-hidden />
      </Link>
    </div>
  );
}