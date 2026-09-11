import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { saveOnboarding } from "@/lib/api/personalization.functions";
import { toast } from "sonner";
import { GraduationCap, Briefcase, Rocket, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({ meta: [{ title: "Welcome · Pioneer Africa Hub" }] }),
  component: Welcome,
});

const INTERESTS = [
  "data-science", "web-dev", "mobile", "ai", "fintech", "agritech", "healthtech",
  "design", "web3", "cybersecurity", "cloud", "product", "marketing", "startup", "climate",
];

const LEVELS = [
  { id: "beginner", label: "Just starting", desc: "New to my field" },
  { id: "intermediate", label: "Building up", desc: "Have some experience" },
  { id: "advanced", label: "Advanced", desc: "Actively shipping work" },
] as const;

const GOALS = [
  { id: "learn", label: "Learn new skills", Icon: GraduationCap },
  { id: "job", label: "Find a job or internship", Icon: Briefcase },
  { id: "build", label: "Build my own thing", Icon: Rocket },
  { id: "network", label: "Meet other builders", Icon: Users },
] as const;

function Welcome() {
  const navigate = useNavigate();
  const save = useServerFn(saveOnboarding);
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [level, setLevel] = useState<typeof LEVELS[number]["id"] | null>(null);
  const [goal, setGoal] = useState<typeof GOALS[number]["id"] | null>(null);

  const m = useMutation({
    mutationFn: () => save({ data: { interests, skill_level: level!, primary_goal: goal! } }),
    onSuccess: () => { toast.success("You're all set!"); navigate({ to: "/dashboard" }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const toggle = (i: string) => setInterests((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);
  const canNext = step === 0 ? interests.length > 0 : step === 1 ? !!level : !!goal;

  return (
    <div className="min-h-dvh bg-brand-bg text-brand-navy">
      <SiteNav />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-orange" : "bg-brand-clay"}`} />
          ))}
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-2">Step {step + 1} of 3</p>

        {step === 0 && (
          <>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">What are you into?</h1>
            <p className="text-brand-navy/70 mb-8">Pick a few. We'll use these to recommend courses, opportunities, and challenges.</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                    interests.includes(i) ? "bg-brand-navy text-white border-brand-navy" : "bg-white border-brand-navy/10 hover:border-brand-navy/30"
                  }`}
                >{i.replace("-", " ")}</button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">Where are you today?</h1>
            <p className="text-brand-navy/70 mb-8">This helps us match content to your level.</p>
            <div className="space-y-3">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                    level === l.id ? "border-brand-orange bg-brand-orange/5" : "border-brand-navy/10 bg-white hover:border-brand-navy/30"
                  }`}
                >
                  <div className="font-display font-bold text-lg">{l.label}</div>
                  <div className="text-sm text-brand-navy/60">{l.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">What brings you here?</h1>
            <p className="text-brand-navy/70 mb-8">Your primary goal — you can always change this later.</p>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${
                    goal === g.id ? "border-brand-orange bg-brand-orange/5" : "border-brand-navy/10 bg-white hover:border-brand-navy/30"
                  }`}
                >
                  <div className="mb-3 size-11 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center"><g.Icon className="size-5" aria-hidden /></div>
                  <div className="font-display font-bold">{g.label}</div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-10 flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-6 py-3 rounded-full font-semibold text-brand-navy/60 disabled:opacity-30"
          >← Back</button>
          {step < 2 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="px-8 py-3 bg-brand-orange text-white rounded-full font-bold disabled:opacity-40"
            >Continue →</button>
          ) : (
            <button
              onClick={() => m.mutate()}
              disabled={!canNext || m.isPending}
              className="px-8 py-3 bg-brand-orange text-white rounded-full font-bold disabled:opacity-40"
            >{m.isPending ? "Saving…" : "Finish"}</button>
          )}
        </div>
      </main>
    </div>
  );
}
