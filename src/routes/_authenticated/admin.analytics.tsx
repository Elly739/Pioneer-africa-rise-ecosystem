import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getFunnelAnalytics } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Funnel analytics · Pioneer Africa Hub" },
      { name: "description", content: "See where learners drop off between signup, onboarding, learning, building and applying." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const fn = useServerFn(getFunnelAnalytics);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-funnel"], queryFn: () => fn() });

  const top = data?.steps?.[0]?.value ?? 0;
  const maxTrend = Math.max(1, ...(data?.trend ?? []).map((t) => t.count));

  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-gradient-to-br from-brand-navy to-brand-navy/80 text-white p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-brand-mint">Analytics</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">Learner funnel</h1>
        <p className="text-sm text-white/70 mt-2 max-w-2xl">
          Signup → onboarding → learning → building → applying. Use the drop-off between steps to see where to focus.
        </p>
      </header>

      {isLoading && <p className="text-sm text-brand-navy/60">Loading analytics…</p>}
      {error && <p className="text-sm text-red-600">Could not load analytics: {(error as Error).message}</p>}

      {data && (
        <>
          <section aria-labelledby="funnel-heading" className="space-y-3">
            <h2 id="funnel-heading" className="font-display text-lg font-bold">Conversion steps</h2>
            <div className="rounded-3xl bg-white border border-brand-navy/10 p-4 sm:p-6 space-y-4">
              {data.steps.map((step, i) => {
                const prev = i === 0 ? step.value : data.steps[i - 1].value;
                const pctOfTop = top ? Math.round((step.value / top) * 100) : 0;
                const dropOff = prev ? Math.round(((prev - step.value) / prev) * 100) : 0;
                return (
                  <div key={step.key}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-semibold">{step.label}</span>
                      <span className="tabular-nums text-brand-navy/70">
                        {step.value} · {pctOfTop}%
                        {i > 0 && dropOff > 0 && (
                          <span className="ml-2 text-red-600 font-semibold">−{dropOff}%</span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1.5 h-3 rounded-full bg-brand-navy/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-orange"
                        style={{ width: `${Math.max(pctOfTop, step.value > 0 ? 2 : 0)}%` }}
                        role="img"
                        aria-label={`${step.label}: ${step.value} people, ${pctOfTop}% of signups`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="trend-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="trend-heading" className="font-display text-lg font-bold">Signups, last 30 days</h2>
              <span className="text-xs font-bold text-brand-navy/60">{data.signupsLast30} new members</span>
            </div>
            <div className="rounded-3xl bg-white border border-brand-navy/10 p-4 sm:p-6">
              <div className="flex items-end gap-1 h-32" role="img" aria-label={`Daily signups over the last 30 days, ${data.signupsLast30} total`}>
                {data.trend.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col justify-end" title={`${d.date}: ${d.count}`}>
                    <div
                      className="rounded-t bg-brand-navy/70"
                      style={{ height: `${(d.count / maxTrend) * 100}%`, minHeight: d.count ? "4px" : "2px" }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-brand-navy/50 mt-2">
                <span>{data.trend[0]?.date}</span>
                <span>{data.trend[data.trend.length - 1]?.date}</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
