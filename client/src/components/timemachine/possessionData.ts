/**
 * Time-Machine possession scenarios.
 *
 * Each scenario is a single half-court possession that the player "relives".
 * The possession runs, freezes at a decision point, and then reveals the read
 * that was actually made (a contested/covered pass, drawn in red) versus the
 * better read that was available (an open teammate, drawn in green). This is
 * the "you realizing it" moment — you don't get told you were wrong, you see
 * the open man you didn't.
 *
 * Court coordinate space matches PlayCourtDiagram: viewBox 100 x 85, baseline
 * at top, hoop at (50, 9). x grows to the right, y grows away from the hoop.
 */

export const HOOP = { x: 50, y: 9 };
export const COURT_W = 100;
export const COURT_H = 85;

export type PlayerLabel = "PG" | "SG" | "SF" | "PF" | "C";

export interface PossessionPlayer {
  label: PlayerLabel;
  /** Position at the start of the possession. */
  start: [number, number];
  /** Position at the decision-point freeze. */
  end: [number, number];
  /** True for the ball-handler making the decision ("you"). */
  isBallHandler?: boolean;
}

export interface DefenderPos {
  label: string;
  start: [number, number];
  end: [number, number];
}

export interface Read {
  /** Which offensive player the pass goes to. */
  to: PlayerLabel;
  /** Short label shown on the read chip. */
  outcome: string;
  /** Detail line under the outcome. */
  detail: string;
}

export interface Possession {
  id: string;
  title: string;
  /** Situation banner, e.g. "4th Q · 0:48 · Down 3". */
  situation: string;
  set: string;
  playType: string;
  defenseScheme: string;
  /** Fraction of the run (0..1) where the possession freezes to decide. */
  decisionAt: number;
  players: PossessionPlayer[];
  defenders: DefenderPos[];
  /** What actually happened — the covered/contested pass. */
  actual: Read;
  /** The better read that was open. */
  best: Read;
  /** One-line narration that appears at the freeze, before the reveal. */
  narration: string;
  /** The coaching takeaway shown after the reveal. */
  lesson: string;
  /** Point swing you left on the table, e.g. "+1.2 pts / poss". */
  valueLeft: string;
  /** Seconds into the source film where this possession happens, if known. */
  timestampSeconds?: number | null;
}

/** Format seconds as m:ss for display. */
export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Helper: mirror a spot horizontally around center court (x=50).
const m = (x: number): number => 100 - x;

export const POSSESSIONS: Possession[] = [
  {
    id: "baseline-drive",
    title: "The corner you didn't see",
    situation: "4th Q · 0:48 · Down 3",
    set: "5-Out Motion",
    playType: "iso drive",
    defenseScheme: "man",
    decisionAt: 0.72,
    players: [
      { label: "PG", start: [50, 60], end: [58, 18], isBallHandler: true },
      { label: "SG", start: [18, 46], end: [12, 15] }, // drifts to near corner
      { label: "SF", start: [82, 46], end: [90, 15] }, // WIDE OPEN weakside corner
      { label: "PF", start: [30, 22], end: [34, 26] },
      { label: "C", start: [70, 22], end: [60, 14] }, // rolls, covered
    ],
    defenders: [
      { label: "X1", start: [50, 52], end: [55, 24] }, // your man, on your hip
      { label: "X2", start: [22, 40], end: [16, 18] },
      { label: "X3", start: [78, 40], end: [64, 20] }, // helped off SF — that's the leak
      { label: "X4", start: [34, 26], end: [42, 22] },
      { label: "X5", start: [64, 22], end: [58, 14] }, // walls up the rim on your drive
    ],
    actual: {
      to: "C",
      outcome: "Contested layup, missed",
      detail: "You drove baseline into two defenders and forced it at the rim.",
    },
    best: {
      to: "SF",
      outcome: "Wide-open corner 3",
      detail: "X3 sank to help. Marcus was standing alone in the weakside corner.",
    },
    narration: "You put your head down and drove into the wall...",
    lesson:
      "On a baseline drive, the weakside corner is the first read when help commits. Two defenders sank to the rim — the skip pass beats the contest every time.",
    valueLeft: "+0.9 pts / possession",
  },
  {
    id: "pnr-reject",
    title: "The roll man at the rim",
    situation: "3rd Q · 6:12 · Tied",
    set: "Horns",
    playType: "pnr",
    defenseScheme: "man",
    decisionAt: 0.68,
    players: [
      { label: "PG", start: [50, 60], end: [40, 34], isBallHandler: true }, // used the screen into traffic
      { label: "SG", start: [12, 16], end: [12, 14] },
      { label: "SF", start: [88, 16], end: [88, 14] },
      { label: "PF", start: [36, 32], end: [30, 26] },
      { label: "C", start: [64, 32], end: [52, 12] }, // rolls hard, OPEN at rim
    ],
    defenders: [
      { label: "X1", start: [50, 52], end: [44, 40] }, // trailed over the screen
      { label: "X2", start: [16, 20], end: [16, 18] },
      { label: "X3", start: [84, 20], end: [84, 18] },
      { label: "X4", start: [40, 30], end: [36, 32] },
      { label: "X5", start: [60, 30], end: [50, 30] }, // hedged high, late to recover — rim is empty
    ],
    actual: {
      to: "PF",
      outcome: "Reset, shot-clock drained",
      detail: "You picked up your dribble in the crowd and kicked it back out.",
    },
    best: {
      to: "C",
      outcome: "Roll man, dunk at the rim",
      detail: "X5 hedged and never recovered. Your center rolled into a wide-open lane.",
    },
    narration: "The hedge stopped you and you gave the ball up early...",
    lesson:
      "When the big hedges high on the pick-and-roll, the roller is open on the short roll. Split the coverage or hit the roll man before the low defender rotates over.",
    valueLeft: "+1.1 pts / possession",
  },
  {
    id: "skip-swing",
    title: "One more pass",
    situation: "2nd Q · 2:30 · Up 5",
    set: "4-Out 1-In",
    playType: "catch & shoot",
    defenseScheme: "2-3 zone",
    decisionAt: 0.7,
    players: [
      { label: "PG", start: [50, 62], end: [30, 44], isBallHandler: true }, // swung to the wing
      { label: "SG", start: [16, 46], end: [14, 40] }, // covered wing (you passed here)
      { label: "SF", start: [84, 46], end: [88, 15] }, // OPEN opposite corner
      { label: "PF", start: [80, 16], end: [78, 16] },
      { label: "C", start: [42, 20], end: [48, 14] },
    ],
    defenders: [
      { label: "1", start: [38, 40], end: [30, 40] }, // top of zone slides to your wing
      { label: "2", start: [62, 40], end: [58, 40] },
      { label: "3", start: [24, 18], end: [18, 20] }, // covers the wing you threw to
      { label: "4", start: [50, 14], end: [50, 14] },
      { label: "5", start: [76, 18], end: [70, 18] }, // stuck ball-side — far corner is bare
    ],
    actual: {
      to: "SG",
      outcome: "Covered wing, tough contested 3",
      detail: "You swung it to the near wing straight into the zone's shooter.",
    },
    best: {
      to: "SF",
      outcome: "Open skip to the far corner",
      detail: "The zone was shifted ball-side. The weakside corner never got covered.",
    },
    narration: "You took the first pass the zone gave you...",
    lesson:
      "Against a 2-3 zone, the skip pass to the weakside corner is the highest-value read. When the zone loads to the ball, one more pass across the floor gets a clean look.",
    valueLeft: "+0.7 pts / possession",
  },
];

/** Convert court x (0..100) to a left percentage for absolute positioning. */
export const toLeft = (x: number): number => (x / COURT_W) * 100;
/** Convert court y (0..85) to a top percentage for absolute positioning. */
export const toTop = (y: number): number => (y / COURT_H) * 100;

/** Linear interpolation between two positions. */
export function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Ease-out cubic for natural motion. */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Referenced to keep the mirror helper available for future left/right variants.
void m;
