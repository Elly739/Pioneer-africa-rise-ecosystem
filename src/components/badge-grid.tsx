import {
  Award, Rocket, GraduationCap, MessageSquare, HandHeart, Trophy, Heart, Briefcase, Sparkles, Flame,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  "graduation-cap": GraduationCap,
  "message-square": MessageSquare,
  "hand-heart": HandHeart,
  trophy: Trophy,
  heart: Heart,
  briefcase: Briefcase,
  sparkles: Sparkles,
  flame: Flame,
  award: Award,
};

const TIER_STYLES: Record<string, string> = {
  bronze: "bg-brand-orange/15 text-brand-orange",
  silver: "bg-brand-navy/10 text-brand-navy",
  gold: "bg-brand-mint/15 text-brand-mint",
};

export type BadgeItem = {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  earned_at?: string | null;
};

export function BadgeGrid({ badges, showLocked = true }: { badges: BadgeItem[]; showLocked?: boolean }) {
  const list = showLocked ? badges : badges.filter((b) => b.earned_at);
  if (list.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {list.map((b) => {
        const Icon = ICONS[b.icon] ?? Award;
        const earned = !!b.earned_at;
        return (
          <li
            key={b.code}
            className={`flex items-start gap-3 rounded-2xl border p-3.5 ${
              earned ? "bg-white border-brand-navy/10" : "bg-brand-clay/40 border-transparent opacity-60"
            }`}
          >
            <span
              className={`grid place-items-center size-10 shrink-0 rounded-xl ${
                earned ? TIER_STYLES[b.tier] ?? TIER_STYLES.bronze : "bg-brand-navy/10 text-brand-navy/40"
              }`}
              aria-hidden
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold leading-tight">{b.name}</p>
              <p className="text-xs text-brand-navy/60 mt-0.5 leading-snug">{b.description}</p>
              {earned && (
                <p className="text-[10px] uppercase tracking-wider font-bold text-brand-mint mt-1">
                  Earned {new Date(b.earned_at as string).toLocaleDateString()}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
