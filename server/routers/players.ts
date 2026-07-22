import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";

const PLAYERS_SCHEMA = {
  type: "object" as const,
  properties: {
    players: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      description: "3-6 key opponent player profiles",
      items: {
        type: "object",
        properties: {
          playerNumber: { type: "integer", description: "Jersey number" },
          playerName: { type: "string", description: "Player name or descriptor like 'No. 23 (PG)' if unknown" },
          position: { type: "string", enum: ["PG", "SG", "SF", "PF", "C"] },
          tendencies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string", description: "e.g. 'Drives left off PnR', 'Corner 3 specialist', 'Posts up smaller guards'" },
                frequency: { type: "string", description: "e.g. '70% of possessions', 'every ATO'" },
                situation: { type: "string", description: "When it happens, e.g. 'late clock', 'transition', 'vs zone'" },
              },
              required: ["action", "frequency", "situation"],
              additionalProperties: false,
            },
          },
          strengths: { type: "string" },
          weaknesses: { type: "string" },
          threatLevel: { type: "string", enum: ["low", "medium", "high", "elite"] },
          notes: { type: "string", description: "How to defend this player" },
        },
        required: ["playerNumber", "playerName", "position", "tendencies", "strengths", "weaknesses", "threatLevel", "notes"],
        additionalProperties: false,
      },
    },
  },
  required: ["players"],
  additionalProperties: false,
};

export const playersRouter = router({
  listBySession: protectedProcedure.input(z.object({ sessionId: z.number() })).query(async ({ ctx, input }) => {
    const session = await db.getSession(input.sessionId);
    if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
    return db.listPlayersBySession(input.sessionId);
  }),

  generate: protectedProcedure.input(z.object({ sessionId: z.number() })).mutation(async ({ ctx, input }) => {
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
            "You are a basketball scouting analyst generating individual opponent player tendency profiles from film study. Generate realistic, specific, actionable profiles a coach can use to build defensive assignments.",
        },
        {
          role: "user",
          content: `Based on this scouting report of ${session.opponentName}, generate 3-6 key player profiles with jersey numbers, positions (PG/SG/SF/PF/C), tendencies (action + frequency + situation), strengths, weaknesses, threat level, and defensive notes.\n\nREPORT:\n${report.executiveSummary}\n\n${report.offenseAnalysis}\n\n${report.mistakes}`,
        },
      ],
      max_tokens: 8000,
      response_format: {
        type: "json_schema",
        json_schema: { name: "player_profiles", strict: true, schema: PLAYERS_SCHEMA },
      },
    });

    const raw = response.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof raw === "string" ? raw : "{}") as {
      players?: Array<{
        playerNumber: number;
        playerName: string;
        position: string;
        tendencies: unknown;
        strengths: string;
        weaknesses: string;
        threatLevel: "low" | "medium" | "high" | "elite";
        notes: string;
      }>;
    };

    const profiles = (parsed.players || []).map(p => ({
      sessionId: input.sessionId,
      opponentName: session.opponentName,
      playerNumber: p.playerNumber,
      playerName: p.playerName,
      position: p.position,
      tendencies: p.tendencies,
      strengths: p.strengths,
      weaknesses: p.weaknesses,
      threatLevel: p.threatLevel,
      notes: p.notes,
    }));

    await db.savePlayerProfiles(input.sessionId, profiles);
    return db.listPlayersBySession(input.sessionId);
  }),
});
