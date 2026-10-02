import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { listProjects, createProject, uploadProjectCover } from "@/lib/api/ecosystem.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { getFeaturedProject } from "@/lib/api/milestones.functions";

function FeaturedProject() {
  const fn = useServerFn(getFeaturedProject);
  const { data: p } = useQuery({ queryKey: ["featured-project"], queryFn: () => fn(), staleTime: 10 * 60_000 });
  if (!p) return null;
  return (
    <Link to="/innovate/$projectSlug" params={{ projectSlug: p.slug }} className="mb-10 flex flex-col md:flex-row gap-6 rounded-3xl bg-brand-navy text-white p-6 md:p-8 overflow-hidden hover:opacity-95">
      {p.cover_url && <img src={p.cover_url} alt="" className="md:w-72 h-44 object-cover rounded-2xl" />}
      <div className="flex-1">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-mint mb-3"><Trophy className="size-4" aria-hidden /> Project of the week</p>
        <h2 className="font-display text-3xl font-bold leading-tight">{p.title}</h2>
        <p className="mt-2 text-white/70">{p.summary}</p>
        {p.author?.display_name && <p className="mt-4 text-sm text-white/50">by {p.author.display_name}</p>}
      </div>
    </Link>
  );
}

const projectsQuery = queryOptions({
  queryKey: ["projects", "all"],
  queryFn: () => listProjects(),
});

export const Route = createFileRoute("/innovate/")({
  head: () => ({
    meta: [
      { title: "Innovation Hub — Pioneer Africa Hub" },
      { name: "description", content: "Showcase your projects, prototypes, and startup ideas. Turn ideas into real-world impact." },
      { property: "og:title", content: "Innovation Hub — Pioneer Africa Hub" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery),
  component: InnovatePage,
});

const STATUS_LABEL: Record<string, string> = { idea: "Idea", building: "Building", launched: "Launched" };

function InnovatePage() {
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />

      <header className="px-6 pt-16 pb-12 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-block px-3 py-1 bg-brand-mint/20 text-brand-mint rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            Innovation Hub
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold leading-tight max-w-3xl">
            Turn ideas into <span className="text-brand-mint">real impact</span>.
          </h1>
          <p className="mt-6 text-lg text-brand-navy/60 max-w-2xl">
            Showcase what you're building. Find collaborators. Inspire the next wave of African innovators.
          </p>
        </div>
        {signedIn ? (
          <button onClick={() => setOpen(true)} className="px-6 py-3 bg-brand-orange text-white rounded-full font-bold whitespace-nowrap">
            + Submit a project
          </button>
        ) : (
          <Link to="/auth" search={{ mode: "signup" }} className="px-6 py-3 bg-brand-orange text-white rounded-full font-bold whitespace-nowrap">
            Sign in to submit
          </Link>
        )}
      </header>

      <div className="px-6 max-w-7xl mx-auto pb-24">
        <FeaturedProject />
        {projects.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-brand-navy/50 mb-4">No projects yet — be the first to ship.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
              <Link
                key={p.id}
                to="/innovate/$projectSlug"
                params={{ projectSlug: p.slug }}
                className="bg-white border border-brand-navy/5 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
              >
                {p.cover_url && (
                  <img src={p.cover_url} alt={`${p.title} cover`} loading="lazy" className="h-40 w-full object-cover" />
                )}
                <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-navy/5 text-brand-navy/70">
                    {STATUS_LABEL[p.status]}
                  </span>
                  <span className="text-xs text-brand-navy/40">❤ {p.likes}</span>
                </div>

                <h3 className="font-display text-xl font-bold mb-2">{p.title}</h3>
                <p className="text-sm text-brand-navy/60 line-clamp-3 flex-1">{p.summary}</p>
                {p.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 4).map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-clay text-brand-navy/70">{t}</span>
                    ))}
                  </div>
                )}
                </div>
              </Link>

            ))}
          </div>
        )}
      </div>

      {open && <SubmitProjectModal onClose={() => setOpen(false)} />}
      <SiteFooter />
    </div>
  );
}

function SubmitProjectModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(createProject);
  const upload = useServerFn(uploadProjectCover);
  const [coverUrl, setCoverUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const m = useMutation({
    mutationFn: (vars: { title: string; summary: string; description: string; status: "idea" | "building" | "launched"; tags: string[]; repo_url: string; demo_url: string; cover_url: string }) =>
      create({ data: vars }),
    onSuccess: (row) => {
      toast.success("Project submitted!");
      qc.invalidateQueries({ queryKey: ["projects"] });
      onClose();
      navigate({ to: "/innovate/$projectSlug", params: { projectSlug: row.slug }, search: { new: "1" } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to submit"),
  });

  const [form, setForm] = useState({ title: "", summary: "", description: "", status: "idea" as const, tags: "", repo_url: "", demo_url: "" });

  async function onPickImage(file: File) {
    if (file.size > 5_000_000) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
      const res = await upload({ data: { fileName: file.name, contentType: file.type, dataBase64: btoa(bin) } });
      setCoverUrl(res.url);
      toast.success("Cover image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-brand-bg w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-3xl font-bold mb-6">Submit your project</h2>
        <form onSubmit={(e) => { e.preventDefault(); m.mutate({ ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean), cover_url: coverUrl }); }} className="space-y-4">
          <Field label="Title"><input required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" /></Field>
          <Field label="One-line summary"><input required minLength={10} maxLength={280} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" /></Field>
          <Field label="Cover image (optional)">
            <div className="flex items-center gap-4">
              {coverUrl ? (
                <img src={coverUrl} alt="Project cover preview" className="h-20 w-32 object-cover rounded-xl border border-brand-navy/10" />
              ) : (
                <div className="h-20 w-32 rounded-xl border border-dashed border-brand-navy/20 grid place-items-center text-[10px] text-brand-navy/40 text-center px-2">No image yet</div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Upload project cover image"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickImage(f); }}
                  className="text-sm file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-brand-clay file:font-semibold file:text-brand-navy"
                />
                <p className="text-xs text-brand-navy/50 mt-1">{uploading ? "Uploading…" : "PNG or JPG, up to 5MB."}</p>
              </div>
            </div>
          </Field>
          <Field label="Description (optional)"><textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white">
                <option value="idea">Idea</option><option value="building">Building</option><option value="launched">Launched</option>
              </select>
            </Field>
            <Field label="Tags (comma-separated)"><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="fintech, agritech" className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Repo URL"><input type="url" value={form.repo_url} onChange={(e) => setForm({ ...form, repo_url: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" /></Field>
            <Field label="Demo URL"><input type="url" value={form.demo_url} onChange={(e) => setForm({ ...form, demo_url: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-brand-navy/10 bg-white" /></Field>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-3 rounded-full font-semibold border border-brand-navy/10">Cancel</button>
            <button type="submit" disabled={m.isPending || uploading} className="flex-1 px-5 py-3 bg-brand-orange text-white rounded-full font-bold disabled:opacity-60">
              {m.isPending ? "Submitting…" : "Submit project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wider text-brand-navy/60 mb-2">{label}</span>
      {children}
    </label>
  );
}
