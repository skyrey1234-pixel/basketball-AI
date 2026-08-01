import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import {
  TENDENCY_KEYS,
  ATTRIBUTE_KEYS,
  HOT_ZONES,
  PLAYER_BADGES,
  rarityFromOverall,
} from "../../shared/twok";

const tendencyProps = Object.fromEntries(
  TENDENCY_KEYS.map(k => [k, { type: "integer", minimum: 0, maximum: 99 }])
);
const attributeProps = Object.fromEntries(
  ATTRIBUTE_KEYS.map(k => [k, { type: "integer", minimum: 0, maximum: 99 }])
);
const zoneProps = Object.fromEntries(
  HOT_ZONES.map(z => [z.id, { type: "integer", minimum: 0, maximum: 99 }])
);

const DNA_SCHEMA = {
  type: "object" as const,
  properties: {
    players: {
      type: "array",
      description: "One DNA entry per provided player, in the same order",
      items: {
        type: "object",
        properties: {
          playerNumber: { type: "integer" },
          overall: { type: "integer", minimum: 40, maximum: 99, description: "2K-style overall rating" },
          attributes: {
            type: "object",
            properties: attributeProps,
            required: [...ATTRIBUTE_KEYS],
            additionalProperties: false,
          },
          tendencies: {
            type: "object",
            description: "0-99 tendency ratings: how OFTEN he does this, not how well",
            properties: tendencyProps,
            required: [...TENDENCY_KEYS],
            additionalProperties: false,
          },
          hotZones: {
            type: "object",
            description: "Shooting efficiency rating per half-court zone. 70+ = hot (green), 40-69 = average (yellow), under 40 = cold (red)",
            properties: zoneProps,
            required: HOT_ZONES.map(z => z.id),
            additionalProperties: false,
          },
          badges: {
            type: "array",
            description: "0-4 earned badges from the allowed list",
            maxItems: 4,
            items: { type: "string", enum: PLAYER_BADGES.map(b => b.id) },
          },
          clutchRating: { type: "integer", minimum: 0, maximum: 99, description: "4th quarter / close game performance" },
          underPressure: { type: "integer", minimum: 0, maximum: 99, description: "Handles defensive pressure" },
          lateShotClock: { type: "integer", minimum: 0, maximum: 99, description: "Effectiveness with under 7 on the shot clock" },
        },
        required: ["playerNumber", "overall", "attributes", "tendencies", "hotZones", "badges", "clutchRating", "underPressure", "lateShotClock"],
        additionalProperties: false,
      },
    },
  },
  required: ["players"],
  additionalProperties: false,
};

export const dnaRouter = router({
  listBySession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const session = await db.getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return db.listPlayerDnaBySession(input.sessionId);
    }),

  generate: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const session = await db.getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      const players = await db.listPlayersBySession(input.sessionId);
      if (players.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Generate player profiles first — DNA builds on top of them.",
        });
      }

      const roster = players
        .map(
          p =>
            `#${p.playerNumber} ${p.playerName} (${p.position}) — threat: ${p.threatLevel}\nStrengths: ${p.strengths}\nWeaknesses: ${p.weaknesses}\nTendencies: ${JSON.stringify(p.tendencies)}`
        )
        .join("\n\n");

      const response = await invokeLLM({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a basketball analytics engine that converts qualitative scouting notes into NBA 2K-style numeric player DNA. Tendency ratings measure FREQUENCY (how often he does it). Attribute ratings measure ABILITY. Hot zone ratings measure shooting efficiency by court area. Be decisive and varied — do not cluster everything around 50. A weakness noted in the report should show up as a low rating, a documented strength as a high one.",
          },
          {
            role: "user",
            content: `Convert these ${players.length} scouted players from ${session.opponentName} into 2K-style DNA. Return one entry per player, in the same order, matching jersey numbers exactly.\n\n${roster}`,
          },
        ],
        max_tokens: 12000,
        response_format: {
          type: "json_schema",
          json_schema: { name: "player_dna", strict: true, schema: DNA_SCHEMA },
        },
      });

      const raw = response.choices[0]?.message?.content;
      const parsed = JSON.parse(typeof raw === "string" ? raw : "{}") as {
        players?: Array<{
          playerNumber: number;
          overall: number;
          attributes: Record<string, number>;
          tendencies: Record<string, number>;
          hotZones: Record<string, number>;
          badges: string[];
          clutchRating: number;
          underPressure: number;
          lateShotClock: number;
        }>;
      };

      const rows = (parsed.players || []).map((d, i) => {
        const match = players.find(p => p.playerNumber === d.playerNumber) ?? players[i];
        return {
          sessionId: input.sessionId,
          playerProfileId: match?.id ?? 0,
          overall: d.overall,
          rarity: rarityFromOverall(d.overall),
          tendencies: d.tendencies,
          attributes: d.attributes,
          hotZones: d.hotZones,
          badges: d.badges,
          clutchRating: d.clutchRating,
          underPressure: d.underPressure,
          lateShotClock: d.lateShotClock,
        };
      });

      await db.savePlayerDna(input.sessionId, rows);
      return db.listPlayerDnaBySession(input.sessionId);
    }),
});
