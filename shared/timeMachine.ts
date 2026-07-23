/**
 * Shared Time-Machine possession spec.
 *
 * The AI produces a *semantic* description of a possession — which set was run,
 * who had the ball, the pass that was actually made (covered/contested) versus
 * the open teammate that was missed, and the coaching lesson. The client turns
 * this spec into concrete court geometry with a deterministic builder, so the
 * LLM never has to invent x/y coordinates and every possession renders cleanly.
 */

export type PlayerLabel = "PG" | "SG" | "SF" | "PF" | "C";

/** Where a receiver ends up on the floor — drives the geometry builder. */
export type CourtArea =
  | "left-corner"
  | "right-corner"
  | "left-wing"
  | "right-wing"
  | "top"
  | "rim"
  | "short-roll"
  | "elbow";

export const COURT_AREAS: CourtArea[] = [
  "left-corner",
  "right-corner",
  "left-wing",
  "right-wing",
  "top",
  "rim",
  "short-roll",
  "elbow",
];

export interface ReadSpec {
  /** Offensive position the pass goes to. */
  to: PlayerLabel;
  /** Where that player was on the floor. */
  area: CourtArea;
  /** Short result label, e.g. "Contested layup, missed" or "Open corner 3". */
  outcome: string;
  /** One-sentence detail explaining the read. */
  detail: string;
}

export interface PossessionSpec {
  id: string;
  /** Evocative title, e.g. "The corner you didn't see". */
  title: string;
  /** Situation banner, e.g. "4th Q · 0:48 · Down 3". */
  situation: string;
  /** Offensive set: horns, 5-out, 4-out, box, stack, 1-4, motion. */
  set: string;
  /** pnr, iso, post, offball, transition, catchshoot, drive. */
  playType: string;
  /** Defense faced: man, 2-3 zone, 3-2 zone, 1-3-1, press. */
  defenseScheme: string;
  /** The offensive player who had the ball and made the decision ("you"). */
  ballHandler: PlayerLabel;
  /** The pass actually made — the covered/contested read. */
  actualRead: ReadSpec;
  /** The better read that was open. */
  bestRead: ReadSpec;
  /** One line shown at the freeze, before the reveal. */
  narration: string;
  /** The coaching takeaway shown after the reveal. */
  lesson: string;
  /** Points left on the table, e.g. "+0.9 pts / possession". */
  valueLeft: string;
}
