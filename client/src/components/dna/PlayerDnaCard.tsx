import { useState } from "react";
import {
  TENDENCY_KEYS,
  TENDENCY_LABELS,
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  PLAYER_BADGES,
  RARITY_STYLES,
  POSITION_COLORS,
  type TendencyKey,
  type AttributeKey,
} from "@shared/twok";
import RatingBar from "./RatingBar";
import HotZoneCourt from "./HotZoneCourt";
import {
  Flame,
  Shield,
  Target,
  Zap,
  Brain,
  Crosshair,
  Anchor,
  Trophy,
  Layers,
  CircleDot,
  RotateCcw,
  ChevronRight,
} from "lucide-react";

const BADGE_ICONS: Record<string, typeof Flame> = {
  flame: Flame,
  shield: Shield,
  target: Target,
  zap: Zap,
  brain: Brain,
  crosshair: Crosshair,
  anchor: Anchor,
  trophy: Trophy,
  layers: Layers,
  "circle-dot": CircleDot,
};

export interface DnaRow {
  id: number;
  playerProfileId: number;
  overall: number;
  rarity: string;
  tendencies: unknown;
  attributes: unknown;
  hotZones: unknown;
  badges: unknown;
  clutchRating: number;
  underPressure: number;
  lateShotClock: number;
}

export interface ProfileRow {
  id: number;
  playerNumber: number;
  playerName: string;
  position: string;
  threatLevel: string;
  strengths: string;
  weaknesses: string;
  notes: string;
}

interface PlayerDnaCardProps {
  dna: DnaRow;
  profile: ProfileRow;
  index?: number;
}

export default function PlayerDnaCard({ dna, profile, index = 0 }: PlayerDnaCardProps) {
  const [flipped, setFlipped] = useState(false);
  const rarity = (dna.rarity as keyof typeof RARITY_STYLES) ?? "bronze";
  const style = RARITY_STYLES[rarity] ?? RARITY_STYLES.bronze;
  const posColor = POSITION_COLORS[profile.position] ?? "#FF7A1A";

  const attributes = (dna.attributes ?? {}) as Record<string, number>;
  const tendencies = (dna.tendencies ?? {}) as Record<string, number>;
  const hotZones = (dna.hotZones ?? {}) as Record<string, number>;
  const badges = (Array.isArray(dna.badges) ? dna.badges : []) as string[];

  // Top 6 tendencies by value — the ones that actually matter for a game plan.
  const topTendencies = [...TENDENCY_KEYS]
    .sort((a, b) => (tendencies[b] ?? 0) - (tendencies[a] ?? 0))
    .slice(0, 6);

  return (
    <div
      className="relative"
      style={{
        perspective: "1400px",
        animation: `cardDeal 560ms cubic-bezier(0.23,1,0.32,1) ${index * 90}ms both`,
      }}
    >
      <div
        className="relative w-full transition-transform"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transitionDuration: "560ms",
          transitionTimingFunction: "cubic-bezier(0.77,0,0.175,1)",
          minHeight: 468,
        }}
      >
        {/* ---------------- FRONT ---------------- */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border-2"
          style={{
            backfaceVisibility: "hidden",
            borderColor: style.ring,
            background:
              "linear-gradient(158deg, #14161c 0%, #0d0f14 46%, #0a0b0f 100%)",
            boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 12px 40px -12px ${style.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        >
          {/* rarity shimmer sweep */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(115deg, transparent 30%, ${style.glow} 48%, transparent 62%)`,
              animation: "shimmer 4.5s ease-in-out infinite",
              opacity: rarity === "diamond" ? 0.9 : rarity === "gold" ? 0.6 : 0.32,
            }}
          />
          {/* position color wash */}
          <div
            className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full blur-3xl"
            style={{ background: posColor, opacity: 0.16 }}
          />

          <div className="relative p-4">
            {/* header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="text-[9px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                    style={{ background: `${style.ring}22`, color: style.text, border: `1px solid ${style.ring}55` }}
                  >
                    {style.label}
                  </span>
                  <span
                    className="text-[9px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                    style={{ background: `${posColor}22`, color: posColor, border: `1px solid ${posColor}55` }}
                  >
                    {profile.position}
                  </span>
                </div>
                <h3 className="text-base font-black leading-tight text-foreground truncate">
                  {profile.playerName}
                </h3>
                <p className="text-[11px] text-muted-foreground font-semibold">
                  #{profile.playerNumber} · {profile.threatLevel.toUpperCase()} THREAT
                </p>
              </div>

              {/* OVR badge */}
              <div
                className="shrink-0 flex flex-col items-center justify-center rounded-lg px-3 py-1.5"
                style={{
                  background: `linear-gradient(160deg, ${style.ring}33, ${style.ring}0d)`,
                  border: `1.5px solid ${style.ring}`,
                  boxShadow: `0 0 18px -4px ${style.glow}`,
                }}
              >
                <span
                  className="text-[8px] font-black tracking-[0.16em]"
                  style={{ color: style.text }}
                >
                  OVR
                </span>
                <span
                  className="text-[26px] font-black leading-none tabular-nums"
                  style={{
                    color: style.text,
                    animation: "ovrPop 620ms cubic-bezier(0.23,1,0.32,1) 260ms both",
                  }}
                >
                  {dna.overall}
                </span>
              </div>
            </div>

            {/* badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {badges.map((id, i) => {
                  const meta = PLAYER_BADGES.find(b => b.id === id);
                  if (!meta) return null;
                  const Icon = BADGE_ICONS[meta.icon] ?? Flame;
                  return (
                    <span
                      key={id}
                      title={meta.desc}
                      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-1 rounded"
                      style={{
                        background: "rgba(255,122,26,0.13)",
                        border: "1px solid rgba(255,122,26,0.4)",
                        color: "#FFB27A",
                        animation: `badgePop 380ms cubic-bezier(0.23,1,0.32,1) ${420 + i * 70}ms both`,
                      }}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* attributes */}
            <div className="mt-3 space-y-1.5">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                Attributes
              </div>
              {ATTRIBUTE_KEYS.slice(0, 6).map((k, i) => (
                <RatingBar
                  key={k}
                  label={ATTRIBUTE_LABELS[k as AttributeKey]}
                  value={attributes[k] ?? 50}
                  delay={180 + i * 55}
                />
              ))}
            </div>

            {/* clutch trio */}
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {[
                { label: "Clutch", value: dna.clutchRating },
                { label: "Pressure", value: dna.underPressure },
                { label: "Late Clock", value: dna.lateShotClock },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1.5 text-center"
                  style={{ animation: `badgePop 380ms cubic-bezier(0.23,1,0.32,1) ${520 + i * 70}ms both` }}
                >
                  <div className="text-[8px] uppercase tracking-wide text-muted-foreground font-bold">
                    {s.label}
                  </div>
                  <div
                    className="text-base font-black tabular-nums leading-tight"
                    style={{ color: s.value >= 75 ? "#22C55E" : s.value >= 55 ? "#FFC53D" : "#EF4444" }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setFlipped(true)}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-bold uppercase tracking-wide transition-transform active:scale-[0.97]"
              style={{
                background: `linear-gradient(135deg, ${style.ring}26, ${style.ring}0f)`,
                border: `1px solid ${style.ring}66`,
                color: style.text,
                transitionDuration: "160ms",
              }}
            >
              Tendencies &amp; Shot Chart
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* ---------------- BACK ---------------- */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border-2 p-4"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderColor: style.ring,
            background: "linear-gradient(158deg, #14161c 0%, #0a0b0f 100%)",
            boxShadow: `0 12px 40px -12px ${style.glow}`,
            overflowY: "auto",
          }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="min-w-0">
              <h4 className="text-sm font-black text-foreground truncate">
                #{profile.playerNumber} {profile.playerName}
              </h4>
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                Tendency Ratings
              </p>
            </div>
            <button
              onClick={() => setFlipped(false)}
              className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide border transition-transform active:scale-[0.97]"
              style={{ borderColor: `${style.ring}66`, color: style.text, transitionDuration: "160ms" }}
            >
              <RotateCcw className="h-3 w-3" />
              Back
            </button>
          </div>

          <div className="space-y-1.5">
            {topTendencies.map((k, i) => (
              <RatingBar
                key={k}
                label={TENDENCY_LABELS[k as TendencyKey]}
                value={tendencies[k] ?? 50}
                delay={i * 50}
                tendency
              />
            ))}
          </div>

          <div className="mt-3">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
              Hot / Cold Zones
            </div>
            <HotZoneCourt zones={hotZones} compact interactive={false} />
            <div className="flex items-center justify-center gap-3 mt-2 text-[8px] uppercase font-bold tracking-wide">
              <span className="flex items-center gap-1 text-green-400">
                <span className="w-2 h-2 rounded-sm bg-green-500/70" /> Hot
              </span>
              <span className="flex items-center gap-1 text-yellow-400">
                <span className="w-2 h-2 rounded-sm bg-yellow-400/70" /> Avg
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <span className="w-2 h-2 rounded-sm bg-red-500/70" /> Cold
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-md border border-orange-500/25 bg-orange-500/[0.07] px-2.5 py-2">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-orange-400 mb-1">
              How To Guard Him
            </div>
            <p className="text-[11px] text-foreground/85 leading-snug">{profile.notes}</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cardDeal {
          from { opacity: 0; transform: translateY(22px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ovrPop {
          from { opacity: 0; transform: scale(0.6); }
          60% { transform: scale(1.14); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes badgePop {
          from { opacity: 0; transform: scale(0.9) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shimmer {
          0%, 100% { transform: translateX(-60%); }
          50% { transform: translateX(60%); }
        }
      `}</style>
    </div>
  );
}
