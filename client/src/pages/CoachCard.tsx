import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { COACH_BADGES, rarityFromOverall, RARITY_STYLES } from "@shared/twok";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Clapperboard,
  Film,
  PenTool,
  BookOpen,
  ShieldCheck,
  Presentation,
  Brain,
  GraduationCap,
  Eye,
  Trophy,
  Coins,
  Target,
  Lock,
} from "lucide-react";

const BADGE_ICONS: Record<string, typeof Trophy> = {
  clapperboard: Clapperboard,
  film: Film,
  "pen-tool": PenTool,
  "book-open": BookOpen,
  "shield-check": ShieldCheck,
  presentation: Presentation,
  brain: Brain,
  "graduation-cap": GraduationCap,
  eye: Eye,
};

export default function CoachCard() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.progress.me.useQuery();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container max-w-5xl py-8 space-y-4">
          <Skeleton className="h-[220px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="container max-w-5xl py-16 text-center">
          <Trophy className="h-9 w-9 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-bold mb-1">No coach profile yet</h2>
          <p className="text-sm text-muted-foreground">
            Run your first film analysis and your Coach Card will start building itself.
          </p>
        </div>
      </AppLayout>
    );
  }

  // Coach OVR is derived from activity volume + prediction accuracy, capped at 99.
  const activityScore = Math.min(
    60,
    data.filmsAnalyzed * 3 +
      data.plansGenerated * 2 +
      data.playsDesigned * 2 +
      Math.floor(data.challengesWon / 2)
  );
  const accuracyScore = data.scoutingAccuracy ? Math.round((data.scoutingAccuracy / 100) * 25) : 0;
  const levelScore = Math.min(14, data.level);
  const coachOvr = Math.max(40, Math.min(99, 40 + activityScore + accuracyScore + levelScore));
  const rarity = rarityFromOverall(coachOvr);
  const style = RARITY_STYLES[rarity];

  const earned = new Set(data.badges);

  const stats = [
    { label: "Films Analyzed", value: data.filmsAnalyzed, icon: Clapperboard },
    { label: "Game Plans", value: data.plansGenerated, icon: Presentation },
    { label: "Plays Designed", value: data.playsDesigned, icon: PenTool },
    { label: "Challenge Wins", value: data.challengesWon, icon: Brain },
    { label: "Results Logged", value: data.predictionsLogged, icon: Eye },
  ];

  return (
    <AppLayout>
      <div className="container max-w-5xl py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black">Coach Card</h1>
          <p className="text-sm text-muted-foreground">
            Your scouting career, rated. Everything you do in CourtVision moves these numbers.
          </p>
        </div>

        {/* ---- the card ---- */}
        <div
          className="relative rounded-2xl border-2 overflow-hidden gold-glow-strong"
          tabIndex={0}
          style={{
            borderColor: style.ring,
            background: "linear-gradient(155deg,#2b1249 0%,#180a2b 50%,#100719 100%)",
            boxShadow: `0 20px 60px -22px ${style.glow}`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(112deg, transparent 32%, ${style.glow} 50%, transparent 64%)`,
              animation: "cardShimmer 5s ease-in-out infinite",
              opacity: rarity === "diamond" ? 0.85 : 0.4,
            }}
          />
          <div
            className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full blur-3xl"
            style={{ background: style.ring, opacity: 0.14 }}
          />

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <span
                  className="inline-block text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded mb-3"
                  style={{
                    background: `${style.ring}22`,
                    color: style.text,
                    border: `1px solid ${style.ring}55`,
                  }}
                >
                  {style.label} Coach
                </span>
                <h2 className="text-2xl sm:text-3xl font-black leading-tight truncate">
                  {user?.name ?? "Coach"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Level {data.level} ·{" "}
                  <span className="text-[#FDB927] font-semibold tabular-nums">
                    {data.xp.toLocaleString()} XP
                  </span>
                  {data.record.wins + data.record.losses > 0 && (
                    <>
                      {" · "}
                      <span className="font-semibold">
                        {data.record.wins}-{data.record.losses}
                      </span>{" "}
                      logged
                    </>
                  )}
                </p>
              </div>

              <div
                className="shrink-0 flex flex-col items-center justify-center rounded-xl px-5 py-3 gold-glow-strong"
                tabIndex={0}
                style={{
                  background: `linear-gradient(160deg,${style.ring}33,${style.ring}0d)`,
                  border: `2px solid ${style.ring}`,
                  boxShadow: `0 0 26px -6px ${style.glow}`,
                }}
              >
                <span
                  className="text-[9px] font-black tracking-[0.18em]"
                  style={{ color: style.text }}
                >
                  COACH OVR
                </span>
                <span
                  className="text-[44px] font-black leading-none tabular-nums"
                  style={{
                    color: style.text,
                    animation: "ovrReveal 720ms cubic-bezier(0.23,1,0.32,1) 200ms both",
                  }}
                >
                  {coachOvr}
                </span>
              </div>
            </div>

            {/* XP progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] mb-1.5">
                <span className="text-muted-foreground">Level {data.level}</span>
                <span className="text-muted-foreground tabular-nums">
                  {data.progress.into.toLocaleString()} / {data.progress.needed.toLocaleString()} XP
                  to Level {data.level + 1}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className="h-full rounded-full relative"
                  style={{
                    width: `${data.progress.pct}%`,
                    background: "linear-gradient(90deg,#552583,#FDB927)",
                    boxShadow: "0 0 16px rgba(253,185,39,0.5)",
                    animation: "xpFill 900ms cubic-bezier(0.23,1,0.32,1) 300ms both",
                    transformOrigin: "left center",
                  }}
                />
              </div>
            </div>

            {/* headline metrics */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1">
                  <Target className="h-3 w-3" /> Accuracy
                </div>
                <div
                  className="text-xl font-black tabular-nums"
                  style={{
                    color:
                      data.scoutingAccuracy === null
                        ? "#8b8f98"
                        : data.scoutingAccuracy >= 80
                          ? "#22C55E"
                          : data.scoutingAccuracy >= 60
                            ? "#FFC53D"
                            : "#EF4444",
                  }}
                >
                  {data.scoutingAccuracy === null ? "—" : `${data.scoutingAccuracy}%`}
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1">
                  <Coins className="h-3 w-3" /> Coins
                </div>
                <div className="text-xl font-black tabular-nums text-yellow-400">
                  {data.coins.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1">
                  <Trophy className="h-3 w-3" /> Badges
                </div>
                <div className="text-xl font-black tabular-nums text-[#FDB927]">
                  {data.badges.length}
                  <span className="text-sm text-muted-foreground font-bold">
                    /{COACH_BADGES.length}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1">
                  <Clapperboard className="h-3 w-3" /> Films
                </div>
                <div className="text-xl font-black tabular-nums text-foreground">
                  {data.filmsAnalyzed}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- career stats ---- */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">
            Career Totals
          </h3>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-3 text-center gold-glow"
                  tabIndex={0}
                  style={{
                    animation: `statIn 420ms cubic-bezier(0.23,1,0.32,1) ${i * 60}ms both`,
                  }}
                >
                  <Icon className="h-4 w-4 mx-auto text-[#FDB927]/80 mb-1.5" />
                  <div className="text-2xl font-black tabular-nums leading-none">{s.value}</div>
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold mt-1">
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- badge case ---- */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-muted-foreground mb-1">
            Badge Case
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {data.badges.length} of {COACH_BADGES.length} unlocked. Locked badges show what it takes.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COACH_BADGES.map((b, i) => {
              const Icon = BADGE_ICONS[b.icon] ?? Trophy;
              const has = earned.has(b.id);
              return (
                <div
                  key={b.id}
                  className="rounded-lg border px-3 py-3 flex items-start gap-3 gold-glow"
                  tabIndex={0}
                  style={{
                    borderColor: has ? "rgba(253,185,39,0.45)" : "rgba(255,255,255,0.06)",
                    background: has ? "linear-gradient(120deg,rgba(85,37,131,0.26),rgba(253,185,39,0.08))" : "rgba(255,255,255,0.015)",
                    opacity: has ? 1 : 0.55,
                    animation: `statIn 420ms cubic-bezier(0.23,1,0.32,1) ${i * 45}ms both`,
                  }}
                >
                  <div
                    className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center"
                    style={{
                      background: has ? "rgba(253,185,39,0.16)" : "rgba(255,255,255,0.04)",
                      border: has
                        ? "1px solid rgba(253,185,39,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: has ? "0 0 16px -4px rgba(253,185,39,0.5)" : undefined,
                    }}
                  >
                    {has ? (
                      <Icon className="h-4 w-4 text-[#FDB927]" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[13px] font-bold leading-tight"
                      style={{ color: has ? "#FDE68A" : undefined }}
                    >
                      {b.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                      {b.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cardShimmer {
          0%,100% { transform: translateX(-55%); }
          50% { transform: translateX(55%); }
        }
        @keyframes ovrReveal {
          from { opacity: 0; transform: scale(0.55); }
          62% { transform: scale(1.12); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes xpFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes statIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppLayout>
  );
}
