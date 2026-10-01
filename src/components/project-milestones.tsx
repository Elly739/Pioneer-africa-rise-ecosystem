import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Milestone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listProjectMilestones, addProjectMilestone, deleteProjectMilestone } from "@/lib/api/milestones.functions";

export function ProjectMilestones({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const listFn = useServerFn(listProjectMilestones);
  const addFn = useServerFn(addProjectMilestone);
  const delFn = useServerFn(deleteProjectMilestone);
  const qc = useQueryClient();
  const key = ["milestones", projectId];
  const { data: rows } = useQuery({ queryKey: key, queryFn: () => listFn({ data: { projectId } }) });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const add = useMutation({
    mutationFn: () => addFn({ data: { projectId, title, body } }),
    onSuccess: () => { setTitle(""); setBody(""); qc.invalidateQueries({ queryKey: key }); toast.success("Update posted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  if (!isOwner && (!rows || rows.length === 0)) return null;
  return (
    <section className="mt-10 rounded-3xl bg-white border border-brand-navy/5 p-6">
      <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><Milestone className="size-5 text-brand-orange" aria-hidden /> Progress timeline</h2>
      {isOwner && (
        <form onSubmit={(e) => { e.preventDefault(); if (title.trim().length >= 3) add.mutate(); }} className="mb-6 space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What did you ship? e.g. First 100 users" className="w-full px-4 py-2.5 rounded-xl border border-brand-navy/10 text-sm focus:outline-none focus:border-brand-orange" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="A few details (optional)" className="w-full px-4 py-2.5 rounded-xl border border-brand-navy/10 text-sm focus:outline-none focus:border-brand-orange" />
          <div className="flex justify-end"><button disabled={add.isPending || title.trim().length < 3} className="px-5 py-2 rounded-full bg-brand-navy text-white text-sm font-bold disabled:opacity-50">Post update</button></div>
        </form>
      )}
      {rows && rows.length > 0 ? (
        <ol className="relative border-l-2 border-brand-orange/30 ml-2 space-y-5">
          {rows.map((m) => (
            <li key={m.id} className="pl-5 relative">
              <span className="absolute -left-[7px] top-1.5 size-3 rounded-full bg-brand-orange" aria-hidden />
              <p className="text-xs text-brand-navy/50">{new Date(m.happened_on).toLocaleDateString()}</p>
              <p className="font-semibold">{m.title}</p>
              {m.body && <p className="text-sm text-brand-navy/70 whitespace-pre-wrap">{m.body}</p>}
              {isOwner && <button onClick={() => del.mutate(m.id)} className="mt-1 text-xs text-brand-navy/40 hover:text-brand-orange inline-flex items-center gap-1"><Trash2 className="size-3" aria-hidden /> Remove</button>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-brand-navy/60">Share your first milestone so supporters can follow along.</p>
      )}
    </section>
  );
}
