import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Users } from "lucide-react";
import { toast } from "sonner";
import { listMyListings, listListingApplicants, setApplicantStatus } from "@/lib/api/partner.functions";

const STATUSES = ["submitted", "under_review", "interview", "offer", "rejected"] as const;

export const Route = createFileRoute("/_authenticated/admin/applicants")({
  head: () => ({ meta: [{ title: "Applicants · Pioneer Africa Hub" }] }),
  component: ApplicantsPage,
});

function ApplicantsPage() {
  const listings = useServerFn(listMyListings);
  const applicants = useServerFn(listListingApplicants);
  const setStatus = useServerFn(setApplicantStatus);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const listingsQ = useQuery({ queryKey: ["my-listings"], queryFn: () => listings() });
  const applicantsQ = useQuery({
    queryKey: ["listing-applicants", selected],
    queryFn: () => applicants({ data: { opportunityId: selected } }),
  });

  const m = useMutation({
    mutationFn: (v: { applicationId: string; status: (typeof STATUSES)[number] }) => setStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listing-applicants"] });
      toast.success("Applicant updated — they get a notification");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Applicants</h1>
        <p className="text-sm text-brand-navy/60">Review and move people through your hiring stages.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelected(null)}
          className={`px-4 py-2 rounded-full text-sm font-bold border ${selected === null ? "bg-brand-navy text-white border-brand-navy" : "bg-white border-brand-navy/10"}`}
        >
          All listings
        </button>
        {(listingsQ.data ?? []).map((l: any) => (
          <button
            key={l.id}
            onClick={() => setSelected(l.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold border ${selected === l.id ? "bg-brand-navy text-white border-brand-navy" : "bg-white border-brand-navy/10"}`}
          >
            {l.title}
          </button>
        ))}
      </div>

      {listingsQ.data && listingsQ.data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-brand-navy/15 bg-white p-10 text-center">
          <div className="mx-auto mb-3 size-11 rounded-xl bg-brand-clay flex items-center justify-center">
            <Briefcase className="size-5 text-brand-navy/60" aria-hidden />
          </div>
          <p className="font-display font-bold">You have no listings yet</p>
          <p className="text-sm text-brand-navy/60 mt-1">Post an opportunity and applicants will appear here.</p>
          <Link to="/admin/opportunities" className="mt-5 inline-flex px-5 py-2.5 rounded-full bg-brand-orange text-white font-bold text-sm">
            Post an opportunity
          </Link>
        </div>
      )}

      {applicantsQ.isLoading && <p className="text-sm text-brand-navy/60">Loading applicants…</p>}

      {applicantsQ.data && applicantsQ.data.length === 0 && listingsQ.data && listingsQ.data.length > 0 && (
        <div className="rounded-2xl border border-dashed border-brand-navy/15 bg-white p-10 text-center">
          <div className="mx-auto mb-3 size-11 rounded-xl bg-brand-clay flex items-center justify-center">
            <Users className="size-5 text-brand-navy/60" aria-hidden />
          </div>
          <p className="font-display font-bold">No applicants yet</p>
        </div>
      )}

      <div className="space-y-3">
        {(applicantsQ.data ?? []).map((a: any) => (
          <div key={a.id} className="p-5 rounded-2xl bg-white border border-brand-navy/5">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="min-w-0">
                <Link to="/u/$userId" params={{ userId: a.user_id }} className="font-display font-bold hover:text-brand-orange">
                  {a.profiles?.display_name ?? "Pioneer member"}
                </Link>
                <p className="text-sm text-brand-navy/60">
                  {[a.profiles?.headline, a.profiles?.university].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs text-brand-navy/40 mt-1">
                  Applied {new Date(a.created_at).toLocaleDateString()} to {a.opportunities?.title}
                </p>
              </div>
              <span className="px-3 py-1 h-fit rounded-full bg-brand-navy/5 text-xs font-bold uppercase">{a.status}</span>
            </div>

            {a.notes && <p className="mt-3 text-sm text-brand-navy/80 whitespace-pre-wrap">{a.notes}</p>}

            {a.projects && (
              <Link
                to="/innovate/$projectSlug"
                params={{ projectSlug: a.projects.slug }}
                className="mt-3 block p-3 rounded-xl bg-brand-clay/60 hover:bg-brand-clay"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/40">Attached project</p>
                <p className="font-semibold text-sm">{a.projects.title}</p>
              </Link>
            )}

            {Array.isArray(a.profiles?.skills) && a.profiles.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {a.profiles.skills.slice(0, 8).map((s: string) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-brand-navy/5 text-[11px] font-semibold">{s}</span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={m.isPending || a.status === s}
                  onClick={() => m.mutate({ applicationId: a.id, status: s })}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border disabled:opacity-40 ${
                    s === "rejected" ? "border-red-200 text-red-600" : "border-brand-navy/10"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
