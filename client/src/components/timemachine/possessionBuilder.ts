import { HOOP, type Possession, type PlayerLabel, type PossessionPlayer, type DefenderPos } from "./possessionData";
import type { PossessionSpec, CourtArea } from "@shared/timeMachine";

/**
 * Turn a semantic possession spec (from the AI) into concrete court geometry.
 *
 * The AI describes *what happened* — the set, who had the ball, the covered
 * pass vs. the open teammate — and this builder deterministically lays out the
 * five offensive players, their movement, and a defense that collapses toward
 * the ball so the missed read genuinely reads as open. Keeping geometry on the
 * client means the LLM never invents coordinates and every possession renders
 * cleanly.
 */

const LABELS: PlayerLabel[] = ["PG", "SG", "SF", "PF", "C"];

type Pt = [number, number];

// Base offensive alignment per set (mirrors PlayCourtDiagram's spot maps).
function setSpots(set: string): Record<PlayerLabel, Pt> {
  const s = set.toLowerCase();
  if (s.includes("horns")) return { PG: [50, 60], SG: [12, 16], SF: [88, 16], PF: [36, 32], C: [64, 32] };
  if (s.includes("5-out") || s.includes("5 out")) return { PG: [50, 62], SG: [18, 48], SF: [82, 48], PF: [10, 18], C: [90, 18] };
  if (s.includes("4-out") || s.includes("4 out")) return { PG: [50, 62], SG: [16, 46], SF: [84, 46], PF: [80, 16], C: [42, 20] };
  if (s.includes("box")) return { PG: [50, 64], SG: [38, 18], SF: [62, 18], PF: [38, 38], C: [62, 38] };
  if (s.includes("stack")) return { PG: [50, 64], SG: [58, 22], SF: [58, 30], PF: [58, 38], C: [58, 14] };
  if (s.includes("1-4") || s.includes("1 4")) return { PG: [50, 62], SG: [14, 34], SF: [86, 34], PF: [38, 32], C: [62, 32] };
  return { PG: [50, 60], SG: [16, 42], SF: [84, 42], PF: [34, 22], C: [66, 22] }; // motion / default
}

// Where each named area sits on the floor.
const AREA_POS: Record<CourtArea, Pt> = {
  "left-corner": [12, 15],
  "right-corner": [88, 15],
  "left-wing": [17, 42],
  "right-wing": [83, 42],
  top: [50, 57],
  rim: [50, 13],
  "short-roll": [52, 27],
  elbow: [40, 25],
};

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// Move `p` a fixed distance toward the hoop (for guarding position).
function towardHoop(p: Pt, d: number): Pt {
  const len = dist(p, [HOOP.x, HOOP.y]) || 1;
  return lerpPt(p, [HOOP.x, HOOP.y], Math.min(d / len, 1));
}

// How far the ball-handler penetrates from their spot, by play type.
function driveFraction(playType: string): number {
  const p = playType.toLowerCase();
  if (p.includes("drive") || p.includes("iso") || p.includes("transition")) return 0.72;
  if (p.includes("post")) return 0.62;
  if (p.includes("pnr")) return 0.5;
  if (p.includes("catch") || p.includes("offball")) return 0.25;
  return 0.5;
}

function clamp(p: Pt): Pt {
  return [Math.max(7, Math.min(93, p[0])), Math.max(11, Math.min(76, p[1]))];
}

// Zone base alignments (mirrors PlayCourtDiagram's defensive schemes).
function zoneBase(scheme: string): Pt[] | null {
  const s = scheme.toLowerCase();
  if (s.includes("2-3")) return [[38, 40], [62, 40], [24, 18], [50, 14], [76, 18]];
  if (s.includes("3-2")) return [[50, 46], [28, 38], [72, 38], [36, 16], [64, 16]];
  if (s.includes("1-3-1")) return [[50, 50], [26, 32], [50, 30], [74, 32], [50, 12]];
  if (s.includes("press")) return [[36, 56], [64, 56], [50, 42], [30, 26], [70, 26]];
  return null; // man-to-man
}

export function buildPossessionFromSpec(spec: PossessionSpec): Possession {
  const spots = setSpots(spec.set);
  const bhLabel = spec.ballHandler;
  const bestTo = spec.bestRead.to;
  const actualTo = spec.actualRead.to;

  // Ball-handler penetration end point.
  const bhStart = spots[bhLabel];
  const bhEnd = clamp(towardHoop(bhStart, dist(bhStart, [HOOP.x, HOOP.y]) * driveFraction(spec.playType)));

  // Resolve receiver end positions from their described area.
  const bestPos = clamp(AREA_POS[spec.bestRead.area] ?? [88, 15]);
  let actualPos = clamp(AREA_POS[spec.actualRead.area] ?? [50, 13]);
  // Keep the two reads visually distinct if the AI put them on the same spot.
  if (dist(bestPos, actualPos) < 10) actualPos = clamp([100 - actualPos[0], actualPos[1]]);

  const ends: Record<PlayerLabel, Pt> = { ...spots };
  ends[bhLabel] = bhEnd;
  if (bestTo !== bhLabel) ends[bestTo] = bestPos;
  if (actualTo !== bhLabel && actualTo !== bestTo) ends[actualTo] = actualPos;
  // Everyone else keeps light spacing motion.
  for (const l of LABELS) {
    if (l === bhLabel || l === bestTo || l === actualTo) continue;
    ends[l] = clamp(lerpPt(spots[l], [50, spots[l][1] - 6], 0.3));
  }

  const players: PossessionPlayer[] = LABELS.map(l => ({
    label: l,
    start: spots[l],
    end: ends[l],
    isBallHandler: l === bhLabel,
  }));

  const zone = zoneBase(spec.defenseScheme);
  let defenders: DefenderPos[];

  if (zone) {
    // Zone: slide the whole defense toward the ball, leaving the weakside
    // (where the best read lives) uncovered.
    defenders = zone.map((z, i) => {
      const ballSideX = z[0] + (bhEnd[0] - z[0]) * 0.32;
      return {
        label: `${i + 1}`,
        start: z as Pt,
        end: clamp([ballSideX, z[1]]),
      };
    });
  } else {
    // Man: each defender shadows their man, but help collapses to the ball —
    // the defender on the best-read target sags off, springing the open man.
    defenders = LABELS.map((l, i) => {
      const oe = ends[l];
      let end: Pt;
      if (l === bhLabel) {
        end = towardHoop(bhEnd, 2.4); // on the hip
      } else if (l === bestTo) {
        end = lerpPt(oe, bhEnd, 0.55); // helped off — this is the leak
      } else if (l === actualTo) {
        end = towardHoop(oe, 1.8); // contesting the pass that was made
      } else {
        end = towardHoop(oe, 2.8); // normal shadow
      }
      return { label: `X${i + 1}`, start: towardHoop(spots[l], 2.8), end: clamp(end) };
    });
  }

  return {
    id: spec.id,
    title: spec.title,
    situation: spec.situation,
    set: spec.set,
    playType: spec.playType,
    defenseScheme: spec.defenseScheme,
    decisionAt: 0.7,
    players,
    defenders,
    actual: { to: actualTo, outcome: spec.actualRead.outcome, detail: spec.actualRead.detail },
    best: { to: bestTo, outcome: spec.bestRead.outcome, detail: spec.bestRead.detail },
    narration: spec.narration,
    lesson: spec.lesson,
    valueLeft: spec.valueLeft,
    timestampSeconds: spec.timestampSeconds ?? null,
  };
}

export function buildPossessions(specs: PossessionSpec[]): Possession[] {
  return specs.filter(s => s && s.ballHandler && s.bestRead && s.actualRead).map(buildPossessionFromSpec);
}
