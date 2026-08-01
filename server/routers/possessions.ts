import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { XP_REWARDS } from "../../shared/twok";
import { awardXp } from "./progress";

/**
 * Court model shared with the client diagram:
 *   x: 0 (left sideline) .. 100 (right sideline)
 *   y: 0 (baseline / rim end) .. 85 (half-court line)
 *   hoop sits near (50, 9)
 */
const SPOT = {
  type: "array" as const,
  items: { type: "number" },
  minItems: 2,
  maxItems: 2,
  description: "Court coordinate [x, y]. x 0-100 left-to-right, y 0-85 baseline-to-halfcourt. Rim is at [50, 9].",
};

const OFF_PLAYER = {
  type: "object" as const,
  properties: {
    label: { type: "string", enum: ["PG", "SG", "SF", "PF", "C"] },
    start: SPOT,
    end: SPOT,
    isBallHandler: { type: "boolean", description: "True for exactly one player — the one making the decision" },
  },
  required: ["label", "start", "end", "isBallHandler"],
  additionalProperties: false,
};

const DEF_PLAYER = {
  type: "object" as const,
  properties: {
    label: { type: "string", description: "Defender tag such as X1..X5" },
    start: SPOT,
    end: SPOT,
  },
  required: ["label", "start", "end"],
  additionalProperties: false,
};

const READ = {
  type: "object" as const,
  properties: {
    to: { type: "string", enum: ["PG", "SG", "SF", "PF", "C"] },
    outcome: { type: "string", description: "Short outcome label, e.g. 'contested layup' or 'wide-open corner 3'" },
    detail: { type: "string", description: "One sentence explaining why this read was good or bad" },
  },
  required: ["to", "outcome", "detail"],
  additionalProperties: false,
};

const POSSESSION = {
  type: "object" as const,
  properties: {
    id: { type: "string", description: "kebab-case slug, e.g. 'weakside-corner-miss'" },
    title: { type: "string", description: "Short evocative title, e.g. 'The corner you didn't see'" },
    situation: { type: "string", description: "Game context, e.g. '4th Q · 0:48 · Down 3'" },
    set: { type: "string", description: "Offensive set, e.g. 'Horns' or '5-Out Motion'" },
    playType: { type: "string", description: "e.g. 'iso drive', 'pick and roll', 'skip swing'" },
    defenseScheme: { type: "string", description: "e.g. 'man', '2-3 zone', 'switch everything'" },
    filmStart: {
      type: "integer",
      description: "Seconds into the film where this possession BEGINS. Must be inside the film's duration.",
    },
    filmDecision: {
      type: "integer",
      description: "Seconds into the film at the exact decision point (the freeze frame). Must be greater than filmStart.",
    },
    filmEnd: {
      type: "integer",
      description: "Seconds into the film where the possession ends. Must be greater than filmDecision.",
    },
    decisionAt: {
      type: "number",
      description: "Fraction 0.5-0.9 of the diagram animation where it freezes to decide",
    },
    players: { type: "array", minItems: 5, maxItems: 5, items: OFF_PLAYER },
    defenders: { type: "array", minItems: 5, maxItems: 5, items: DEF_PLAYER },
    actual: READ,
    best: READ,
    narration: { type: "string", description: "One line said at the freeze, before the reveal" },
    lesson: { type: "string", description: "The coaching takeaway after the reveal" },
    valueLeft: { type: "string", description: "Points left on the table, e.g. '+1.2 pts / poss'" },
  },
  required: [
    "id", "title", "situation", "set", "playType", "defenseScheme",
    "filmStart", "filmDecision", "filmEnd", "decisionAt",
    "players", "defenders", "actual", "best", "narration", "lesson", "valueLeft",
  ],
  additionalProperties: false,
};

const POSSESSIONS_SCHEMA = {
  type: "object" as const,
  properties: {
    possessions: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: POSSESSION,
      description: "3-4 possessions drawn from the film's key moments, each with a real decision-point timestamp",
    },
  },
  required: ["possessions"],
  additionalProperties: false,
};

type Highlight = { seconds: number; title: string; note: string; category: string; verdict: string };

export const possessionsRouter = router({
  /** Cached possessions for a session, or null if none generated yet. */
  get: protectedProcedure.input(z.object({ sessionId: z.number() })).query(async ({ ctx, input }) => {
    const session = await db.getSession(input.sessionId);
    if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
    return db.getPossessions(input.sessionId);
  }),

  /**
   * Reconstruct possessions from the film's key moments. Each possession carries a
   * real film window so the client can play the actual clip and freeze at the read.
   */
  generate: protectedProcedure.input(z.object({ sessionId: z.number() })).mutation(async ({ ctx, input }) => {
    const session = await db.getSession(input.sessionId);
    if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

    const report = await db.getReportBySession(input.sessionId);
    if (!report) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Scouting report must complete first" });
    }

    const highlights = (report.highlights ?? []) as Highlight[];
    if (highlights.length === 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No key moments found in this film. Re-run the analysis first.",
      });
    }

    // Prefer the moments where a read was actually blown — that is what Time Machine teaches.
    const ranked = [...highlights].sort((a, b) => {
      const score = (h: Highlight) => (h.verdict === "bad" ? 0 : 1) + (h.category === "mistake" ? -1 : 0);
      return score(a) - score(b);
    });
    const chosen = ranked.slice(0, 4);
    const maxSeconds = Math.max(...highlights.map(h => h.seconds)) + 120;

    const momentList = chosen
      .map(h => `- ${h.seconds}s | ${h.title} [${h.category}/${h.verdict}] — ${h.note}`)
      .join("\n");

    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a film-room coach reconstructing individual possessions for a teaching tool. " +
            "For each possession you place all 10 players on a half court using this coordinate model: " +
            "x runs 0 (left sideline) to 100 (right sideline); y runs 0 (baseline, rim end) to 85 (half-court line); " +
            "the rim sits at [50, 9]; the three-point arc is roughly 22-24 units from the rim; " +
            "the corners are near [10, 15] and [90, 15]; the top of the key is near [50, 40]. " +
            "Start positions are the alignment when the possession begins. End positions are where everyone is at the " +
            "exact decision point. Exactly one offensive player is the ball-handler. " +
            "The 'actual' read must be the covered or contested pass that was actually made. The 'best' read must be a " +
            "DIFFERENT player who was genuinely open — and their end position must clearly show the space (open corner, " +
            "empty rim, weak-side wing). Keep the film timestamps anchored to the real moment you were given: filmStart " +
            "should be a few seconds before the moment, filmDecision at the moment itself, filmEnd a few seconds after.",
        },
        {
          role: "user",
          content: `Reconstruct teaching possessions from this ${session.opponentName} film.

FILM DURATION: about ${maxSeconds} seconds — never place a timestamp beyond this.

KEY MOMENTS FROM THE FILM (use these exact timestamps as your decision points):
${momentList}

SCOUTING CONTEXT:
${report.executiveSummary}

THEIR DEFENSE (this is what the offense is reading):
${report.defenseAnalysis}

DOCUMENTED MISTAKES:
${report.mistakes}

Build one possession per key moment above (3-4 total). For each one, set filmDecision to that moment's timestamp, filmStart about 6-10 seconds earlier (never below 0), and filmEnd about 5-8 seconds later. Make the missed read specific and geometrically believable on the court coordinates.`,
        },
      ],
      max_tokens: 16000,
      response_format: {
        type: "json_schema",
        json_schema: { name: "possessions", strict: true, schema: POSSESSIONS_SCHEMA },
      },
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof raw === "string" ? raw : "{}") as {
      possessions?: Array<Record<string, unknown>>;
    };
    const list = Array.isArray(parsed.possessions) ? parsed.possessions : [];
    if (list.length === 0) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not reconstruct possessions" });
    }

    // Clamp timestamps so a hallucinated number can never seek past the film.
    const safe = list.map(p => {
      const start = Math.max(0, Math.round(Number(p.filmStart) || 0));
      const decision = Math.max(start + 2, Math.round(Number(p.filmDecision) || start + 6));
      const end = Math.max(decision + 2, Math.round(Number(p.filmEnd) || decision + 6));
      const at = Number(p.decisionAt);
      return {
        ...p,
        filmStart: Math.min(start, maxSeconds),
        filmDecision: Math.min(decision, maxSeconds),
        filmEnd: Math.min(end, maxSeconds),
        decisionAt: Number.isFinite(at) ? Math.min(0.9, Math.max(0.5, at)) : 0.72,
      };
    });

    await db.savePossessions(input.sessionId, safe);
    await awardXp(ctx.user.id, XP_REWARDS.possessionsRebuilt);
    return safe;
  }),
});
