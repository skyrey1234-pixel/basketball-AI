import { HOT_ZONES, type HotZoneId } from "@shared/twok";
import { useState } from "react";

/** Zone temperature → color. 70+ hot, 40-69 average, <40 cold. */
export function zoneColor(rating: number, alpha = 1) {
  if (rating >= 70) return `rgba(34,197,94,${alpha})`;
  if (rating >= 40) return `rgba(250,204,21,${alpha})`;
  return `rgba(239,68,68,${alpha})`;
}

export function zoneLabel(rating: number) {
  if (rating >= 70) return "HOT";
  if (rating >= 40) return "AVG";
  return "COLD";
}

/**
 * Zone polygons in a 0-100 x 0-94 half-court space.
 * Baseline at y=0, rim at (50, 6), half-court at y=94.
 */
const ZONE_SHAPES: Record<HotZoneId, string> = {
  paint: "34,0 66,0 66,19 34,19",
  midRange: "34,19 66,19 78,34 66,44 34,44 22,34",
  leftCorner3: "2,0 22,0 22,17 2,17",
  rightCorner3: "78,0 98,0 98,17 78,17",
  leftWing3: "2,17 22,17 22,34 12,46 2,46",
  rightWing3: "78,17 98,17 98,46 88,46 78,34",
  top3: "22,34 78,34 88,46 66,58 34,58 12,46",
};

const ZONE_CENTERS: Record<HotZoneId, [number, number]> = {
  paint: [50, 10],
  midRange: [50, 31],
  leftCorner3: [12, 8],
  rightCorner3: [88, 8],
  leftWing3: [11, 31],
  rightWing3: [89, 31],
  top3: [50, 46],
};

interface HotZoneCourtProps {
  zones: Record<string, number>;
  compact?: boolean;
  interactive?: boolean;
  playerName?: string;
}

export default function HotZoneCourt({
  zones,
  compact = false,
  interactive = true,
  playerName,
}: HotZoneCourtProps) {
  const [hovered, setHovered] = useState<HotZoneId | null>(null);

  const hottest = HOT_ZONES.reduce(
    (best, z) => ((zones[z.id] ?? 0) > (zones[best.id] ?? 0) ? z : best),
    HOT_ZONES[0]
  );
  const coldest = HOT_ZONES.reduce(
    (worst, z) => ((zones[z.id] ?? 99) < (zones[worst.id] ?? 99) ? z : worst),
    HOT_ZONES[0]
  );

  return (
    <div className="w-full">
      <div className="relative">
        <svg
          viewBox="0 0 100 62"
          className="w-full rounded-lg"
          style={{ background: "linear-gradient(180deg,#1a1207 0%,#120d05 100%)" }}
        >
          {/* court floor grain */}
          <defs>
            <pattern id="wood" width="4" height="62" patternUnits="userSpaceOnUse">
              <rect width="4" height="62" fill="#1a1207" />
              <line x1="0" y1="0" x2="0" y2="62" stroke="#241a0c" strokeWidth="0.3" />
            </pattern>
            <filter id="zoneGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="100" height="62" fill="url(#wood)" />

          {/* zones */}
          {HOT_ZONES.map((z, i) => {
            const rating = zones[z.id] ?? 50;
            const isHovered = hovered === z.id;
            return (
              <g key={z.id}>
                <polygon
                  points={ZONE_SHAPES[z.id]}
                  fill={zoneColor(rating, isHovered ? 0.55 : 0.3)}
                  stroke={zoneColor(rating, 0.9)}
                  strokeWidth={isHovered ? 0.8 : 0.4}
                  filter={isHovered ? "url(#zoneGlow)" : undefined}
                  style={{
                    transition: "fill 180ms cubic-bezier(0.23,1,0.32,1), stroke-width 180ms",
                    cursor: interactive ? "pointer" : "default",
                    animation: `zoneFade 420ms cubic-bezier(0.23,1,0.32,1) ${i * 55}ms both`,
                  }}
                  onMouseEnter={() => interactive && setHovered(z.id)}
                  onMouseLeave={() => interactive && setHovered(null)}
                />
                {!compact && (
                  <text
                    x={ZONE_CENTERS[z.id][0]}
                    y={ZONE_CENTERS[z.id][1]}
                    textAnchor="middle"
                    fontSize="4.2"
                    fontWeight="800"
                    fill="#fff"
                    style={{ pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
                  >
                    {rating}
                  </text>
                )}
              </g>
            );
          })}

          {/* court lines */}
          <g stroke="rgba(255,255,255,0.32)" strokeWidth="0.4" fill="none">
            <rect x="2" y="0" width="96" height="60" />
            <rect x="34" y="0" width="32" height="19" />
            <circle cx="50" cy="19" r="6" />
            <path d="M 22 0 L 22 14 A 30 30 0 0 0 78 14 L 78 0" />
            <circle cx="50" cy="6" r="1.4" fill="#FF7A1A" stroke="#FF7A1A" />
            <line x1="44" y1="3" x2="56" y2="3" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          </g>
        </svg>

        {/* hover callout */}
        {interactive && hovered && (
          <div
            className="absolute top-2 left-2 right-2 rounded-md px-3 py-2 text-[11px] backdrop-blur-sm border"
            style={{
              background: "rgba(10,10,12,0.88)",
              borderColor: zoneColor(zones[hovered] ?? 50, 0.6),
              animation: "calloutIn 160ms cubic-bezier(0.23,1,0.32,1) both",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white">
                {HOT_ZONES.find(z => z.id === hovered)?.label}
              </span>
              <span
                className="font-black tabular-nums"
                style={{ color: zoneColor(zones[hovered] ?? 50) }}
              >
                {zones[hovered] ?? 50} · {zoneLabel(zones[hovered] ?? 50)}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 leading-snug">
              {(zones[hovered] ?? 50) >= 70
                ? "Take this away. Do not let him get comfortable here."
                : (zones[hovered] ?? 50) >= 40
                  ? "Live with this one. Contest without over-committing."
                  : "Force him here. This is where his shot dies."}
            </p>
          </div>
        )}
      </div>

      {!compact && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md border border-green-500/30 bg-green-500/10 px-2.5 py-2">
            <div className="text-green-400 font-bold uppercase tracking-wide text-[9px]">
              Take Away
            </div>
            <div className="text-foreground font-semibold mt-0.5">{hottest.label}</div>
            <div className="text-muted-foreground tabular-nums">{zones[hottest.id] ?? 0} rating</div>
          </div>
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-2">
            <div className="text-red-400 font-bold uppercase tracking-wide text-[9px]">
              Force Him Here
            </div>
            <div className="text-foreground font-semibold mt-0.5">{coldest.label}</div>
            <div className="text-muted-foreground tabular-nums">{zones[coldest.id] ?? 0} rating</div>
          </div>
        </div>
      )}

      {playerName && compact && (
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          {playerName} shot chart
        </p>
      )}

      <style>{`
        @keyframes zoneFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes calloutIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
