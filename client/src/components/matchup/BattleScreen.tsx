import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, ShieldAlert, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  RARITY_STYLES,
  POSITION_COLORS,
  type AttributeKey,
} from "@shared/twok";

interface BattleScreenProps {
  sessionId: number;
  opponentName: string;
}

/** A single attribute face-off row: their bar vs a derived "our assignment" bar. */
function VsRow({
  label,
  left,
  right,
  delay,
}: {
  label: string;
  left: number;
  right: number;
  delay: number;
}) {
  const leftWins = left > right;
  const rightWins = right > left;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="flex items-center gap-2 justify-end">
        <span
          className="text-[11px] font-black tabular-nums w-[22px] text-right"
          style={{ color: leftWins ? "#22C55E" : "#8b8f98" }}
        >
          {left}
        </span>
        <div className="flex-1 h-[6px] rounded-full bg-white/[0.06] overflow-hidden flex justify-end">
          <div
            className="h-full rounded-full"
            style={{
              width: `${left}%`,
              background: leftWins
                ? "linear-gradient(270deg,#22C55E,#16A34A)"
                : "linear-gradient(270deg,#4b5563,#374151)",
              boxShadow: leftWins ? "0 0 8px rgba(34,197,94,0.5)" : undefined,
              animation: `barGrowRight 560ms cubic-bezier(0.23,1,0.32,1) ${delay}ms both`,
              transformOrigin: "right center",
            }}
          />
        </div>
      </div>

      <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold w-[88px] text-center shrink-0">
        {label}
      </span>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-[6px] rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${right}%`,
              background: rightWins
                ? "linear-gradient(90deg,#EF4444,#DC2626)"
                : "linear-gradient(90deg,#4b5563,#374151)",
              boxShadow: rightWins ? "0 0 8px rgba(239,68,68,0.5)" : undefined,
              animation: `barGrowLeft 560ms cubic-bezier(0.23,1,0.32,1) ${delay}ms both`,
              transformOrigin: "left center",
            }}
          />
        </div>
        <span
          className="text-[11px] font-black tabular-nums w-[22px]"
          style={{ color: rightWins ? "#EF4444" : "#8b8f98" }}
        >
          {right}
        </span>
      </div>

      <style>{`
        @keyframes barGrowRight { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes barGrowLeft { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      `}</style>
    </div>
  );
}

export default function BattleScreen({ sessionId, opponentName }: BattleScreenProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const { data: profiles, isLoading: pLoading } = trpc.players.listBySession.useQuery({
    sessionId,
  });
  const { data: dnaRows, isLoading: dLoading } = trpc.dna.listBySession.useQuery({ sessionId });

  const pairs = useMemo(() => {
    if (!profiles || !dnaRows) return [];
    const out: Array<{ dna: (typeof dnaRows)[number]; profile: (typeof profiles)[number] }> = [];
    for (const d of dnaRows) {
      const profile = profiles.find(p => p.id === d.playerProfileId);
      if (profile) out.push({ dna: d, profile });
    }
    return out.sort((a, b) => b.dna.overall - a.dna.overall);
  }, [profiles, dnaRows]);

  if (pLoading || dLoading) return <Skeleton className="h-[460px] rounded-xl" />;

  if (pairs.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-10 text-center">
        <Swords className="h-9 w-9 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-base font-bold mb-1">Battle screen needs Player DNA</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Generate profiles in the <span className="text-orange-400 font-semibold">Players</span>{" "}
          tab, then build DNA cards in the{" "}
          <span className="text-orange-400 font-semibold">DNA Lab</span> to unlock head-to-head
          matchup battles.
        </p>
      </div>
    );
  }

  const active = pairs[Math.min(activeIdx, pairs.length - 1)];
  const attrs = (active.dna.attributes ?? {}) as Record<string, number>;
  const rarity = (active.dna.rarity as keyof typeof RARITY_STYLES) ?? "bronze";
  const style = RARITY_STYLES[rarity];
  const posColor = POSITION_COLORS[active.profile.position ?? ""] ?? "#FF7A1A";

  /**
   * Derive the "our assignment" difficulty per attribute. This is a scouting
   * heuristic, not a claim about our actual roster: the harder his rating, the
   * more resources the assignment demands.
   */
  const assignmentLoad = (v: number) => Math.max(20, Math.min(99, Math.round(100 - v * 0.55)));

  const advantage =
    active.dna.overall >= 85 ? "them" : active.dna.overall <= 68 ? "us" : "even";

  return (
    <div className="space-y-4">
      {/* player selector rail */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
          disabled={activeIdx === 0}
          className="shrink-0 rounded-md border border-white/[0.08] p-1.5 disabled:opacity-30 transition-transform active:scale-[0.94]"
          style={{ transitionDuration: "160ms" }}
          aria-label="Previous matchup"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pairs.map((p, i) => {
          const isActive = i === activeIdx;
          const c = POSITION_COLORS[p.profile.position ?? ""] ?? "#FF7A1A";
          return (
            <button
              key={p.dna.id}
              onClick={() => setActiveIdx(i)}
              className="shrink-0 rounded-lg px-3 py-2 text-left border transition-all"
              style={{
                borderColor: isActive ? c : "rgba(255,255,255,0.08)",
                background: isActive ? `${c}18` : "rgba(255,255,255,0.02)",
                transform: isActive ? "translateY(-2px)" : "none",
                transitionDuration: "180ms",
                transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[9px] font-black px-1 py-0.5 rounded"
                  style={{ background: `${c}26`, color: c }}
                >
                  {p.profile.position}
                </span>
                <span className="text-xs font-bold whitespace-nowrap">
                  #{p.profile.playerNumber}
                </span>
                <span className="text-xs font-black tabular-nums" style={{ color: c }}>
                  {p.dna.overall}
                </span>
              </div>
            </button>
          );
        })}
        <button
          onClick={() => setActiveIdx(i => Math.min(pairs.length - 1, i + 1))}
          disabled={activeIdx >= pairs.length - 1}
          className="shrink-0 rounded-md border border-white/[0.08] p-1.5 disabled:opacity-30 transition-transform active:scale-[0.94]"
          style={{ transitionDuration: "160ms" }}
          aria-label="Next matchup"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* the battle card */}
      <div
        key={active.dna.id}
        className="relative rounded-xl border-2 overflow-hidden"
        style={{
          borderColor: style.ring,
          background: "linear-gradient(160deg,#14161c,#0a0b0f)",
          boxShadow: `0 16px 48px -18px ${style.glow}`,
          animation: "battleIn 420ms cubic-bezier(0.23,1,0.32,1) both",
        }}
      >
        {/* split glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(34,197,94,0.10) 0%, transparent 42%, transparent 58%, rgba(239,68,68,0.10) 100%)",
          }}
        />

        <div className="relative p-5">
          {/* header: US vs THEM */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-5">
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-green-400 mb-0.5">
                Our Assignment
              </p>
              <h3 className="text-base font-black leading-tight">Defensive Load</h3>
              <p className="text-[11px] text-muted-foreground">
                How much help this matchup demands
              </p>
            </div>

            <div
              className="shrink-0 flex items-center justify-center h-12 w-12 rounded-full"
              style={{
                background: "linear-gradient(140deg,rgba(255,122,26,0.3),rgba(255,122,26,0.06))",
                border: "1.5px solid rgba(255,122,26,0.55)",
                animation: "vsPulse 2.4s ease-in-out infinite",
              }}
            >
              <Swords className="h-5 w-5 text-orange-400" />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-red-400 mb-0.5">
                {opponentName}
              </p>
              <h3 className="text-base font-black leading-tight truncate">
                #{active.profile.playerNumber} {active.profile.playerName}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                <span style={{ color: posColor }} className="font-bold">
                  {active.profile.position}
                </span>{" "}
                · OVR{" "}
                <span className="font-black" style={{ color: style.text }}>
                  {active.dna.overall}
                </span>{" "}
                · {active.profile.threatLevel.toUpperCase()}
              </p>
            </div>
          </div>

          {/* attribute face-offs */}
          <div className="space-y-2.5">
            {ATTRIBUTE_KEYS.slice(0, 6).map((k, i) => (
              <VsRow
                key={k}
                label={ATTRIBUTE_LABELS[k as AttributeKey]}
                left={assignmentLoad(attrs[k] ?? 50)}
                right={attrs[k] ?? 50}
                delay={120 + i * 70}
              />
            ))}
          </div>

          {/* verdict strip */}
          <div
            className="mt-5 rounded-lg border px-4 py-3 flex items-start gap-3"
            style={{
              borderColor:
                advantage === "us"
                  ? "rgba(34,197,94,0.35)"
                  : advantage === "them"
                    ? "rgba(239,68,68,0.35)"
                    : "rgba(250,204,21,0.35)",
              background:
                advantage === "us"
                  ? "rgba(34,197,94,0.08)"
                  : advantage === "them"
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(250,204,21,0.07)",
            }}
          >
            {advantage === "them" ? (
              <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <TrendingUp
                className={`h-4 w-4 shrink-0 mt-0.5 ${advantage === "us" ? "text-green-400" : "text-yellow-400"}`}
              />
            )}
            <div className="min-w-0">
              <p
                className="text-[10px] font-black uppercase tracking-[0.14em] mb-1"
                style={{
                  color:
                    advantage === "us"
                      ? "#4ADE80"
                      : advantage === "them"
                        ? "#F87171"
                        : "#FACC15",
                }}
              >
                {advantage === "us"
                  ? "Advantage: Us"
                  : advantage === "them"
                    ? "Advantage: Them — Send Help"
                    : "Even Matchup"}
              </p>
              <p className="text-[12px] text-foreground/85 leading-relaxed">
                {active.profile.notes}
              </p>
            </div>
          </div>

          {/* weakness callout */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-red-400 mb-1">
                His Strengths
              </p>
              <p className="text-[12px] text-foreground/85 leading-snug">
                {active.profile.strengths}
              </p>
            </div>
            <div className="rounded-lg border border-green-500/25 bg-green-500/[0.06] px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-green-400 mb-1">
                Attack This
              </p>
              <p className="text-[12px] text-foreground/85 leading-snug">
                {active.profile.weaknesses}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes battleIn {
          from { opacity: 0; transform: scale(0.97) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes vsPulse {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,122,26,0.35); }
          50% { transform: scale(1.06); box-shadow: 0 0 0 8px rgba(255,122,26,0); }
        }
      `}</style>
    </div>
  );
}
