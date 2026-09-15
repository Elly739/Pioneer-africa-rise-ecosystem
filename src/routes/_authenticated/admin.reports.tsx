import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { listReports, resolveReport } from "@/lib/api/reports.functions";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports · Pioneer Africa Hub Admin" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const list = useServerFn(listReports);
  const resolve = useServerFn(resolveReport);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["reports"], queryFn: () => list() });

  const m = useMutation({
    mutationFn: (v: { reportId: string; status: "resolved" | "dismissed"; deleteTarget?: boolean }) =>
      resolve({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report handled");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const open = (data ?? []).filter((r: any) => r.status === "open");
  const handled = (data ?? []).filter((r: any) => r.status !== "open");

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <p className="text-sm text-brand-navy/60">Member reports on projects, discussions and replies.</p>
      </div>

      {isLoading && <p className="text-brand-navy/60 text-sm">Loading…</p>}

      {!isLoading && open.length === 0 && (
        <div className="rounded-2xl border border-dashed border-brand-navy/15 bg-white p-10 text-center">
          <div className="mx-auto mb-3 size-11 rounded-xl bg-brand-clay flex items-center justify-center">
            <Flag className="size-5 text-brand-navy/60" aria-hidden />
          </div>
          <p className="font-display font-bold">Nothing to review</p>
          <p className="text-sm text-brand-navy/60 mt-1">The queue is clear.</p>
        </div>
      )}

      <div className="space-y-3">
        {open.map((r: any) => (
          <div key={r.id} className="p-4 rounded-2xl bg-white border border-brand-navy/5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange font-bold uppercase">
                {r.target_type}
              </span>
              <span className="text-brand-navy/40">
                Reported by {r.reporter} · {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="font-display font-bold mt-2">{r.label}</p>
            <p className="text-sm text-brand-navy/70 mt-1">“{r.reason}”</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {r.link && (
                <Link to={r.link} className="px-3 py-1.5 rounded-full border border-brand-navy/10 text-xs font-bold">
                  View content
                </Link>
              )}
              <button
                onClick={() => m.mutate({ reportId: r.id, status: "dismissed" })}
                className="px-3 py-1.5 rounded-full border border-brand-navy/10 text-xs font-bold"
              >
                Dismiss
              </button>
              <button
                onClick={() => m.mutate({ reportId: r.id, status: "resolved", deleteTarget: true })}
                className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold"
              >
                Remove content
              </button>
            </div>
          </div>
        ))}
      </div>

      {handled.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display font-bold mb-3">Handled</h2>
          <div className="space-y-2">
            {handled.map((r: any) => (
              <div key={r.id} className="p-3 rounded-xl bg-white/60 border border-brand-navy/5 text-sm flex justify-between gap-3">
                <span className="truncate">{r.label}</span>
                <span className="text-brand-navy/40 shrink-0">{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
