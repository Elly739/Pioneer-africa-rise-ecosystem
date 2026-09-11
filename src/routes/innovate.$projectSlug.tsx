import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getProject, toggleProjectLike, uploadProjectCover, setProjectCover } from "@/lib/api/ecosystem.functions";
import { getMyCollabStatus, requestCollaboration, updateProjectCollab } from "@/lib/api/collab.functions";
import { supabase } from "@/integrations/supabase/client";

const projectQuery = (slug: string) => queryOptions({
  queryKey: ["project", slug],
  queryFn: () => getProject({ data: { slug } }),
});

export const Route = createFileRoute("/innovate/$projectSlug")({
  validateSearch: (search: Record<string, unknown>): { new?: "1" } => ({
    new: search['new'] === "1" ? ("1" as const) : undefined,
  }),

  head: ({ loaderData }) => {
    const p = (loaderData as { project?: { title: string; summary: string } } | undefined)?.project;
    return {
      meta: p ? [
        { title: `${p.title} — Pioneer Africa Hub Innovation Hub` },
        { name: "description", content: p.summary },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.summary },
      ] : [{ title: "Project — Pioneer Africa Hub" }],
    };
  },
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(projectQuery(params.projectSlug));
    if (!data) throw notFound();
    return data;
  },
  errorComponent: () => <div className="p-10">Failed to load project.</div>,
  notFoundComponent: () => <div className="p-10">Project not found.</div>,
  component: ProjectPage,
});


function ProjectPage() {
  const { projectSlug } = Route.useParams();
  const { new: isNew } = Route.useSearch();
  const { data } = useSuspenseQuery(projectQuery(projectSlug));
  const qc = useQueryClient();
  const toggle = useServerFn(toggleProjectLike);
  const requestFn = useServerFn(requestCollaboration);
  const statusFn = useServerFn(getMyCollabStatus);
  const collabSettingsFn = useServerFn(updateProjectCollab);
  const uploadFn = useServerFn(uploadProjectCover);
  const setCoverFn = useServerFn(setProjectCover);
  const [meId, setMeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);


  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null)); }, []);

  const signedIn = !!meId;
  const project = data?.project;
  const isOwner = !!project && meId === project.user_id;

  const like = useMutation({
    mutationFn: () => toggle({ data: { projectId: project!.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectSlug] }),
  });

  const { data: myRequest } = useQuery({
    queryKey: ["collab-status", project?.id, meId],
    queryFn: () => statusFn({ data: { projectId: project!.id } }),
    enabled: signedIn && !!project && !isOwner,
  });

  const sendRequest = useMutation({
    mutationFn: () => requestFn({ data: { projectId: project!.id, message } }),
    onSuccess: () => {
      toast.success("Request sent — the builder has been notified");
      setShowForm(false);
      setMessage("");
      qc.invalidateQueries({ queryKey: ["collab-status", project?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send request"),
  });

  const toggleOpen = useMutation({
    mutationFn: (open: boolean) =>
      collabSettingsFn({
        data: {
          projectId: project!.id,
          looking_for_collaborators: open,
          roles_needed: (project!.roles_needed as string[] | null) ?? [],
        },
      }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["project", projectSlug] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function onPickCover(file: File) {
    if (file.size > 5_000_000) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
      const res = await uploadFn({ data: { fileName: file.name, contentType: file.type, dataBase64: btoa(bin) } });
      await setCoverFn({ data: { projectId: project!.id, coverUrl: res.url } });
      toast.success("Cover image added");
      qc.invalidateQueries({ queryKey: ["project", projectSlug] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!data || !project) return null;
  const { likes, author } = data;
  const rolesNeeded = (project.roles_needed as string[] | null) ?? [];

  return (
    <div className="min-h-screen bg-brand-bg text-brand-navy">
      <SiteNav />
      <div className="px-6 py-12 max-w-3xl mx-auto">
        <Link to="/innovate" className="text-sm text-brand-navy/60 hover:text-brand-navy">← Back to Innovation Hub</Link>

        {isOwner && isNew === "1" && (
          <section className="mt-6 rounded-3xl bg-brand-navy text-white p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-mint">You're live</p>
            <h2 className="font-display text-2xl font-bold mt-2">Your project is published. Here's what happens next.</h2>
            <ol className="mt-4 space-y-2 text-sm text-white/80 list-decimal list-inside">
              <li>{project.cover_url ? "Cover image added ✓" : "Add a cover image so your project stands out in the hub."}</li>
              <li>{project.looking_for_collaborators ? "Open to collaborators ✓" : "Open it to collaborators — builders can ask to join and you approve every request."}</li>
              <li>Share it on your public profile and attach it when you apply to hackathons or internships.</li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/portfolio" className="px-5 py-2.5 rounded-full bg-white text-brand-navy text-sm font-bold">Update my portfolio</Link>
              <Link to="/careers" className="px-5 py-2.5 rounded-full bg-white/10 text-white text-sm font-bold">Find an opportunity to apply to</Link>
            </div>
          </section>
        )}

        {project.cover_url && (
          <img src={project.cover_url} alt={`${project.title} cover`} className="mt-6 w-full h-56 sm:h-72 object-cover rounded-3xl" />
        )}

        {isOwner && (
          <div className="mt-4 flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              aria-label={project.cover_url ? "Replace cover image" : "Add cover image"}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickCover(f); }}
              className="text-sm file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-brand-clay file:font-semibold file:text-brand-navy"
            />
            {uploading && <span className="text-xs text-brand-navy/50">Uploading…</span>}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-brand-navy/60">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-navy/5">{project.status}</span>
          {project.looking_for_collaborators && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-mint/20 text-brand-mint">Seeking collaborators</span>
          )}
          {author?.display_name && (
            <Link to="/u/$userId" params={{ userId: project.user_id }} className="hover:text-brand-navy">by {author.display_name}</Link>
          )}
          <span>· {new Date(project.created_at).toLocaleDateString()}</span>
        </div>
        <h1 className="mt-3 font-display text-4xl md:text-5xl font-bold leading-tight">{project.title}</h1>
        <p className="mt-4 text-xl text-brand-navy/70">{project.summary}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => signedIn ? like.mutate() : null}
            disabled={!signedIn || like.isPending}
            className="px-5 py-2.5 bg-brand-clay rounded-full font-bold text-sm hover:bg-brand-clay/70 disabled:opacity-60"
          >
            <Heart className="size-4 inline -mt-0.5" aria-hidden /> {likes} {signedIn ? "Like" : "Sign in to like"}
          </button>
          {project.repo_url && <a href={project.repo_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-orange hover:underline">Repo →</a>}
          {project.demo_url && <a href={project.demo_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-orange hover:underline">Live demo →</a>}
          {signedIn && (
            <AskCoachButton
              context={`Project: ${project.title}`}
              prompt={`I'm looking at the project "${project.title}" — ${project.summary}. How could I build something like this, or improve my own version?`}
            />
          )}
        </div>

        {project.tags?.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {project.tags.map((t: string) => <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-brand-clay text-brand-navy/70">{t}</span>)}
          </div>
        )}

        {/* Collaboration panel */}
        <section className="mt-10 rounded-3xl border border-brand-navy/10 bg-white p-6">
          {isOwner ? (
            <>
              <h2 className="font-display text-xl font-bold">Build this with others</h2>
              <p className="text-sm text-brand-navy/70 mt-1">
                Open your project to collaborators and other builders can ask to join. You approve every request.
              </p>
              <button
                onClick={() => toggleOpen.mutate(!project.looking_for_collaborators)}
                disabled={toggleOpen.isPending}
                className={`mt-4 px-6 py-2.5 rounded-full text-sm font-bold ${project.looking_for_collaborators ? "bg-brand-clay text-brand-navy" : "bg-brand-navy text-white"}`}
              >
                {project.looking_for_collaborators ? "Stop looking for collaborators" : "Look for collaborators"}
              </button>
              <Link to="/portfolio" className="ml-3 text-sm font-bold text-brand-orange">Review requests →</Link>
            </>
          ) : project.looking_for_collaborators ? (
            <>
              <h2 className="font-display text-xl font-bold">This project is looking for collaborators</h2>
              {rolesNeeded.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {rolesNeeded.map((r) => <span key={r} className="text-xs px-2.5 py-1 rounded-full bg-brand-mint/15 text-brand-mint font-semibold">{r}</span>)}
                </div>
              )}
              {!signedIn ? (
                <Link to="/auth" search={{ mode: "signup" }} className="inline-flex mt-4 px-6 py-2.5 rounded-full bg-brand-navy text-white text-sm font-bold">
                  Sign in to ask to join
                </Link>
              ) : myRequest?.status ? (
                <p className="mt-4 text-sm font-semibold text-brand-navy/70">Your request is <span className="text-brand-orange">{myRequest.status}</span>.</p>
              ) : showForm ? (
                <div className="mt-4 space-y-3">
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What can you bring to this project? Share a skill, a link, or an idea."
                    className="w-full p-4 rounded-2xl bg-brand-bg border border-brand-navy/10 text-sm focus:outline-none focus:border-brand-orange"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendRequest.mutate()}
                      disabled={message.trim().length < 10 || sendRequest.isPending}
                      className="px-6 py-2.5 rounded-full bg-brand-orange text-white text-sm font-bold disabled:opacity-60"
                    >{sendRequest.isPending ? "Sending…" : "Send request"}</button>
                    <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-full bg-brand-clay text-sm font-semibold">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowForm(true)} className="mt-4 px-6 py-2.5 rounded-full bg-brand-navy text-white text-sm font-bold">
                  Ask to collaborate
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-brand-navy/60">This builder isn't taking collaborators right now.</p>
          )}
        </section>

        {project.description && (
          <div className="prose prose-lg mt-10 whitespace-pre-wrap text-brand-navy/80">{project.description}</div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

