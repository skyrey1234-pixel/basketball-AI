import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { XP_REWARDS } from "../../shared/twok";
import { awardXp } from "./progress";

const GRADE_SCHEMA = {
  type: "object" as const,
  properties: {
    grade: { type: "string", enum: ["A+", "A", "B+", "B", "C+", "C", "D", "F"] },
    score: { type: "integer", minimum: 0, maximum: 100 },
    verdict: { type: "string", description: "One-sentence coach's verdict on the play" },
    strengths: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string", description: "What works about this play" },
    },
    fixes: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string", description: "Specific fix, e.g. 'Weak side is empty — add a 45 cut from the 3'" },
    },
    bestAgainst: { type: "string", description: "Which defense this play attacks best" },
    worstAgainst: { type: "string", description: "Which defense kills this play" },
  },
  required: ["grade", "score", "verdict", "strengths", "fixes", "bestAgainst", "worstAgainst"],
  additionalProperties: false,
};

const positionSchema = z.object({
  position: z.string(),
  x: z.number(),
  y: z.number(),
});

const routeSchema = z.object({
  from: z.string(),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  kind: z.enum(["cut", "screen", "pass", "dribble"]).default("cut"),
});

export const playbookRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.listCustomPlays(ctx.user.id)),

  getShared: publicProcedure
    .input(z.object({ shareId: z.string() }))
    .query(async ({ input }) => {
      const play = await db.getCustomPlayByShareId(input.shareId);
      if (!play) throw new TRPCError({ code: "NOT_FOUND" });
      return play;
    }),

  save: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        set: z.string().max(60).optional(),
        playType: z.string().max(30).optional(),
        positions: z.array(positionSchema).min(1).max(5),
        routes: z.array(routeSchema).max(10),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shareId = nanoid(12);
      const id = await db.createCustomPlay({
        userId: ctx.user.id,
        name: input.name,
        set: input.set ?? null,
        playType: input.playType ?? null,
        positions: input.positions,
        routes: input.routes,
        notes: input.notes ?? null,
        shareId,
      });
      const xp = await awardXp(ctx.user.id, XP_REWARDS.playDesigned, "playsDesigned");
      return { id, shareId, xp };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteCustomPlay(input.id, ctx.user.id);
      return { success: true };
    }),

  /** AI grades a designed play and returns coaching feedback. */
  grade: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        set: z.string().optional(),
        playType: z.string().optional(),
        positions: z.array(positionSchema),
        routes: z.array(routeSchema),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const spots = input.positions
        .map(p => `${p.position} at (${Math.round(p.x)}, ${Math.round(p.y)})`)
        .join("; ");
      const moves = input.routes
        .map(r => `${r.from} ${r.kind} through ${r.points.map(pt => `(${Math.round(pt.x)},${Math.round(pt.y)})`).join(" -> ")}`)
        .join("; ");

      const response = await invokeLLM({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a veteran basketball offensive coordinator grading a play a coach just drew up. The court coordinate system: x from 0 (left sideline) to 100 (right sideline), y from 0 (baseline under the basket) to 100 (half-court line). The rim is at roughly (50, 8). Evaluate spacing, floor balance, screen angles, weak-side action, and whether the play creates a real advantage. Be direct and specific like a real coach — reference actual positions and spacing.",
          },
          {
            role: "user",
            content: `Grade this play.\n\nName: ${input.name}\nSet: ${input.set || "unspecified"}\nType: ${input.playType || "unspecified"}\nPlayer spots: ${spots}\nMovement: ${moves || "none drawn"}\nCoach notes: ${input.notes || "none"}`,
          },
        ],
        max_tokens: 4000,
        response_format: {
          type: "json_schema",
          json_schema: { name: "play_grade", strict: true, schema: GRADE_SCHEMA },
        },
      });

      const raw = response.choices[0]?.message?.content;
      return JSON.parse(typeof raw === "string" ? raw : "{}") as {
        grade: string;
        score: number;
        verdict: string;
        strengths: string[];
        fixes: string[];
        bestAgainst: string;
        worstAgainst: string;
      };
    }),
});

