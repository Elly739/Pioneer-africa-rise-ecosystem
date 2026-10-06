import { useState } from "react";
import { ArrowBigUp, Check, Flag } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { reportContent } from "@/lib/api/reports.functions";

export function VoteButton({ count, voted, disabled, onClick }: { count: number; voted: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={voted}
      aria-label={voted ? "Remove upvote" : "Upvote"}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors disabled:opacity-50 ${voted ? "bg-brand-orange text-white border-brand-orange" : "border-brand-navy/10 text-brand-navy/70 hover:border-brand-orange"}`}
    >
      <ArrowBigUp className="size-4" aria-hidden /> {count}
    </button>
  );
}

export function AcceptedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-mint/15 text-brand-mint text-xs font-bold">
      <Check className="size-3.5" aria-hidden /> Accepted answer
    </span>
  );
}

export function ReportButton({ targetType, targetId }: { targetType: "project" | "discussion" | "reply" | "conversation"; targetId: string }) {
  const fn = useServerFn(reportContent);
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        const reason = window.prompt("What's wrong with this content? (at least 4 characters)");
        if (!reason || reason.trim().length < 4) return;
        setBusy(true);
        try {
          await fn({ data: { targetType, targetId, reason: reason.trim() } });
          toast.success("Thanks — a moderator will review it");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not send report");
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-navy/40 hover:text-brand-orange"
      aria-label="Report"
    >
      <Flag className="size-3.5" aria-hidden /> Report
    </button>
  );
}
