import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { COURT_AREAS } from "@shared/timeMachine";
import * as db from "../db";

const READ_SCHEMA = {
  type: "object" as const,
  properties: {
    to: { type: "string", enum: ["PG", "SG", "SF", "PF", "C"] },
    area: { type: "string", enum: COURT_AREAS },
    outcome: { type: "string", description: "Short result label, e.g. 'Contested layup, missed' or 'Open corner 3'" },
    detail: { type: "string", description: "One sentence explaining the read" },
  },
  required: ["to", "area", "outcome", "detail"],
  additionalProperties: false,
};

const POSSESSION_SCHEMA = {
  type: "object" as const,
  properties: {
    id: { type: "string", description: "kebab-case id unique within the set" },
    title: { type: "string", description: "Evocative title, e.g. 'The corner you didn't see'" },
    situation: { type: "string", description: "Game situation banner, e.g. '4th Q · 0:48 · Down 3'" },
    set: { type: "string", description: "Offensive set: horns, 5-out, 4-out, box, stack, 1-4, motion" },
    playType: { type: "string", enum: ["pnr", "iso", "post", "offball", "transition", "catchshoot", "drive"] },
    defenseScheme: { type: "string", description: "Defense faced: man, 2-3 zone, 3-2 zone, 1-3-1, press" },
    ballHandler: { type: "string", enum: ["PG", "SG", "SF", "PF", "C"] },
    actualRead: { ...READ_SCHEMA, description: "The pass actually made — the covered or contested read" },
    bestRead: { ...READ_SCHEMA, description: "The better read that was open and got missed" },
    narration: { type: "string", description: "One line shown at the freeze, before the reveal" },
    lesson: { type: "string", description: "Coaching takeaway after the reveal" },
    valueLeft: { type: "string", description: "Points left on the table, e.g. '+0.9 pts / possession'" },
    timestampSeconds: {
      type: ["integer", "null"],
      description: "Seconds into the film where this possession occurs. Copy the timestamp of the seed decision moment when one is given; otherwise null.",
    },
  },
  required: [
    "id",
    "title",
    "situation",
    "set",
    "playType",
    "defenseScheme",
    "ballHandler",
    "actualRead",
    "bestRead",
    "narration",
    "lesson",
    "valueLeft",
    "timestampSeconds",
  ],
  additionalProperties: false,
};

const TIME_MACHINE_SCHEMA = {
  type: "object" as const,
  properties: {
    possessions: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      description: "3-5 decision-point possessions to relive",
      items: POSSESSION_SCHEMA,
    },
  },
  required: ["possessions"],
  additionalProperties: false,
};

type Highlight = { seconds?: number; title?: string; note?: string; category?: string; verdict?: string };

export const timeMachineRouter = router({
  get: protectedProcedure.input(z.object({ sessionId: z.number() })).query(async ({ ctx, input }) => {
    const session = await db.getSession(input.sessionId);
    if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
    const row = await db.getTimeMachine(input.sessionId);
    return (row?.possessions as unknown) ?? null;
  }),

  generate: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const session = await db.getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const report = await db.getReportBySession(input.sessionId);
      if (!report) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Scouting report must complete first" });

      const highlights = (Array.isArray(report.highlights) ? report.highlights : []) as Highlight[];
      const decisionMoments = highlights
        .filter(h => h.verdict !== "good")
        .map(h => `- (at ${typeof h.seconds === "number" ? h.seconds : "?"}s) [${h.category}] ${h.title}: ${h.note}`)
        .join("\n");

      const response = await invokeLLM({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an elite basketball skills coach who reviews film to teach players the reads they missed. From the scouting report, reconstruct 3-5 specific half-court possessions where a better decision was available. Each possession names the set, who had the ball, the pass that was actually made (a covered or contested read), and the open teammate who was missed, using real basketball spacing and terminology. The 'bestRead' is always the higher-value look that was open (usually a weakside corner, a short-roll big, or a skip against a shifted zone). Keep the tone like a coach reliving the play with the player: honest, specific, instructive.",
          },
          {
            role: "user",
            content: `Reconstruct teachable possessions from this scouting film of "${session.opponentName}".

Use the DECISION MOMENTS below (verdicts that were mistakes/bad) as the seeds when available; otherwise infer realistic possessions from the analysis.

DECISION MOMENTS:
${decisionMoments || "(none flagged — infer from the analysis)"}

OFFENSE ANALYSIS:
${report.offenseAnalysis ?? ""}

DEFENSE ANALYSIS:
${report.defenseAnalysis ?? ""}

MISTAKES / WEAKNESSES:
${report.mistakes ?? ""}

SPECIAL SITUATIONS:
${report.specialSituations ?? ""}

For each possession make the "actualRead" and "bestRead" go to DIFFERENT players in DIFFERENT areas, so the missed read is visually distinct from the contested one.`,
          },
        ],
        max_tokens: 12000,
        response_format: {
          type: "json_schema",
          json_schema: { name: "time_machine_possessions", strict: true, schema: TIME_MACHINE_SCHEMA },
        },
      });

      const raw = response.choices[0]?.message?.content;
      const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
      const possessions = Array.isArray(parsed.possessions) ? parsed.possessions : [];
      await db.saveTimeMachine(input.sessionId, possessions);
      return possessions;
    }),
});
