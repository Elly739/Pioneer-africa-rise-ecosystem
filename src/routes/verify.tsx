import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { verifyCertificate } from "@/lib/api/learning-extra.functions";

type Search = { code?: string };

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Verify a certificate · Pioneer Africa Hub" },
      { name: "description", content: "Check that a Pioneer Africa Hub certificate is genuine — enter the code to see the holder, course and issue date." },
      { property: "og:title", content: "Verify a Pioneer Africa Hub certificate" },
      { property: "og:description", content: "Enter a certificate code to confirm the holder, course and issue date." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { code: initial } = Route.useSearch();
  const [code, setCode] = useState(initial ?? "");
  const verify = useServerFn(verifyCertificate);
  const m = useMutation({ mutationFn: (c: string) => verify({ data: { code: c } }) });

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-3">Trust</p>
        <h1 className="font-display text-4xl font-bold">Verify a certificate</h1>
        <p className="text-brand-navy/60 mt-3">
          Enter the code printed on a Pioneer Africa Hub certificate to confirm it is genuine.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) m.mutate(code.trim());
          }}
          className="mt-8 flex flex-col sm:flex-row gap-3"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. PAH-4F2A9C"
            aria-label="Certificate code"
            className="flex-1 px-5 py-3 rounded-full border border-brand-navy/10 bg-white font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
          />
          <button
            type="submit"
            disabled={m.isPending || !code.trim()}
            className="px-6 py-3 rounded-full bg-brand-orange text-white font-bold disabled:opacity-50"
          >
            {m.isPending ? "Checking…" : "Verify"}
          </button>
        </form>

        {m.isSuccess && m.data && (
          <div className="mt-8 rounded-3xl bg-white border border-brand-navy/5 p-8">
            <div className="flex items-center gap-3 text-brand-mint">
              <BadgeCheck className="size-6" aria-hidden />
              <p className="font-bold">Genuine certificate</p>
            </div>
            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/40">Holder</dt>
                <dd className="font-display text-xl font-bold">{(m.data as any).holder_name ?? "Pioneer member"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/40">Course</dt>
                <dd className="font-semibold">{(m.data as any).course_title}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/40">Issued</dt>
                <dd>{new Date((m.data as any).issued_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        )}

        {m.isSuccess && !m.data && (
          <div className="mt-8 rounded-3xl border border-dashed border-brand-navy/15 bg-white p-8 text-center">
            <div className="mx-auto mb-3 size-11 rounded-xl bg-brand-clay flex items-center justify-center">
              <ShieldAlert className="size-5 text-brand-navy/60" aria-hidden />
            </div>
            <p className="font-display text-lg font-bold">No certificate found</p>
            <p className="text-sm text-brand-navy/60 mt-1">Check the code and try again.</p>
          </div>
        )}

        {m.isError && <p className="mt-6 text-sm text-red-600">Could not check that code right now.</p>}

        <p className="mt-10 text-sm text-brand-navy/50">
          Earn your own certificate by completing a course.{" "}
          <Link to="/courses" className="font-semibold text-brand-orange">
            Browse courses
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
