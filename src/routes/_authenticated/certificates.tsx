import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/api/learn.functions";
import { SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/_authenticated/certificates")({
  head: () => ({ meta: [{ title: "Certificates · Pioneer Africa Hub" }] }),
  component: CertsPage,
});

function CertsPage() {
  const fn = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-3">Your achievements</p>
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-10">Certificates</h1>

        {isLoading && <p className="text-brand-navy/60">Loading…</p>}

        {data && data.certificates.length === 0 && (
          <div className="rounded-3xl border border-dashed border-brand-navy/15 p-12 text-center bg-white">
            <p className="font-display text-xl font-bold">No certificates yet</p>
            <p className="text-brand-navy/60 text-sm mt-2">Pass a course quiz to earn one.</p>
            <Link to="/courses" className="mt-6 inline-flex px-6 py-3 bg-brand-orange text-white rounded-full font-bold">
              Browse courses
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {data?.certificates.map((c: any) => (
            <div key={c.id} className="p-8 rounded-3xl bg-brand-navy text-white relative overflow-hidden">
              <div className="absolute -right-12 -top-12 size-40 rounded-full bg-brand-orange/20 blur-2xl" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-mint mb-3">Certificate of Completion</p>
              <h3 className="font-display text-2xl font-bold leading-tight">{c.courses?.title}</h3>
              <p className="text-white/50 text-sm mt-4">Issued {new Date(c.issued_at).toLocaleDateString()}</p>
              <div className="mt-6 p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Verification code</p>
                <p className="font-mono text-sm mt-1">{c.code}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 relative">
                <Link to="/verify" search={{ code: c.code }} className="px-4 py-2 rounded-full bg-brand-orange text-white text-xs font-bold">View & download</Link>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/verify?code=${c.code}`); }}
                  className="px-4 py-2 rounded-full border border-white/20 text-xs font-bold"
                >Copy share link</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
