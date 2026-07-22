import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";

const PLAY_ITEM = {
  type: "object" as const,
  properties: {
    name: { type: "string", description: "Play name, e.g. 'Horns Flare', 'Spain PnR', 'Zipper Iso'" },
    set: { type: "string", description: "Starting set/alignment: horns, 5-out, 4-out-1-in, box, stack, 1-4 high, motion" },
    playType: { type: "string", enum: ["pnr", "iso", "post", "offball", "transition", "catchshoot"] },
    target: { type: "string", description: "Primary option position: PG/SG/SF/PF/C" },
    description: { type: "string", description: "How the play develops and why it attacks this opponent" },
    counters: { type: "string", description: "Counter option if defense takes away the first read" },
  },
  required: ["name", "set", "playType", "target", "description", "counters"],
  additionalProperties: false,
};

const GAMEPLAN_SCHEMA = {
  type: "object" as const,
  properties: {
    overview: { type: "string", description: "Markdown game plan overview and tempo strategy" },
    opponentDefenseScheme: { type: "string", description: "Their base defense: man-to-man, 2-3 zone, 3-2 zone, 1-3-1, switching, press" },
    scriptedPlays: { type: "array", minItems: 8, maxItems: 8, description: "First 8 scripted possessions", items: PLAY_ITEM },
    atoPackage: { type: "array", minItems: 4, maxItems: 5, description: "4-5 ATO/BLOB/SLOB out-of-bounds plays", items: PLAY_ITEM },
    lateClockPlays: { type: "array", minItems: 3, maxItems: 4, description: "3-4 late shot-clock and end-of-quarter plays", items: PLAY_ITEM },
    defensiveAdjustments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          situation: { type: "string" },
          adjustment: { type: "string" },
          scheme: { type: "string", description: "Defense to show: man, 2-3 zone, 3-2 zone, 1-3-1, press, switch" },
        },
        required: ["situation", "adjustment", "scheme"],
        additionalProperties: false,
      },
    },
    keyMatchups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          theirPlayer: { type: "string" },
          assignment: { type: "string", description: "Our defensive assignment and approach" },
          advantage: { type: "string", enum: ["us", "them", "even"] },
        },
        required: ["theirPlayer", "assignment", "advantage"],
        additionalProperties: false,
      },
    },
    halftimeChecklist: { type: "array", items: { type: "string" } },
  },
  required: ["overview", "opponentDefenseScheme", "scriptedPlays", "atoPackage", "lateClockPlays", "defensiveAdjustments", "keyMatchups", "halftimeChecklist"],
  additionalProperties: false,
};

export const gamePlanRouter = router({
  get: protectedProcedure.input(z.object({ sessionId: z.number() })).query(async ({ ctx, input }) => {
    const session = await db.getSession(input.sessionId);
    if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
    const row = await db.getGamePlan(input.sessionId);
    return row?.plan ?? null;
  }),

  generate: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        teamStrengths: z.string().optional(),
        preferredStyle: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await db.getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const report = await db.getReportBySession(input.sessionId);
      if (!report) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Scouting report must complete first" });

      const response = await invokeLLM({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an elite basketball offensive coordinator and game planner. Generate a complete, professional game plan attacking the scouted opponent. Use real basketball set names and terminology (horns, Spain PnR, zipper, floppy, hammer, elevator, box BLOB, stack SLOB, drop coverage, ice, 2-3 zone gaps). Every play must specifically exploit something in the scouting report.",
          },
          {
            role: "user",
            content: `Build a game plan against ${session.opponentName}.${input.teamStrengths ? `\n\nOUR TEAM STRENGTHS: ${input.teamStrengths}` : ""}${input.preferredStyle ? `\nOUR PREFERRED STYLE: ${input.preferredStyle}` : ""}\n\nSCOUTING REPORT:\n${report.executiveSummary}\n\nTHEIR OFFENSE:\n${report.offenseAnalysis}\n\nTHEIR DEFENSE:\n${report.defenseAnalysis}\n\nSPECIAL SITUATIONS:\n${report.specialSituations}\n\nWEAKNESSES:\n${report.mistakes}`,
          },
        ],
        max_tokens: 16000,
        response_format: {
          type: "json_schema",
          json_schema: { name: "basketball_game_plan", strict: true, schema: GAMEPLAN_SCHEMA },
        },
      });

      const raw = response.choices[0]?.message?.content;
      const plan = JSON.parse(typeof raw === "string" ? raw : "{}");
      await db.saveGamePlan(input.sessionId, plan);
      return plan;
    }),
});
