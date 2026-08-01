import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { XP_REWARDS } from "../../shared/twok";
import { awardXp } from "./progress";

/** Pull a predicted opponent score out of the report's prediction text, if present. */
function extractPredictedScore(text: string | null | undefined): number | null {
  if (!text) return null;
  // Look for score-like patterns: "68-64", "68 to 64", "score 68"
  const range = text.match(/(\d{2,3})\s*[-–to]{1,3}\s*(\d{2,3})/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    // Assume the lower number is the opponent being held to; take the second listed.
    if (a >= 30 && a <= 200 && b >= 30 && b <= 200) return b;
  }
  const single = text.match(/(?:score|hold them to|around|about)\s*(\d{2,3})/i);
  if (single) {
    const n = Number(single[1]);
    if (n >= 30 && n <= 200) return n;
  }
  return null;
}

export const resultsRouter = router({
  getBySession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const session = await db.getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return (await db.getGameResult(input.sessionId)) ?? null;
    }),

  listMine: protectedProcedure.query(({ ctx }) => db.listGameResults(ctx.user.id)),

  log: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        ourScore: z.number().int().min(0).max(300),
        theirScore: z.number().int().min(0).max(300),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await db.getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      const report = await db.getReportBySession(input.sessionId);
      const predicted = extractPredictedScore(report?.predictions);

      let accuracyPct: number | null = null;
      if (predicted !== null && input.theirScore > 0) {
        const diff = Math.abs(predicted - input.theirScore);
        accuracyPct = Math.max(0, Math.round(100 - (diff / input.theirScore) * 100));
      }

      const won = input.ourScore > input.theirScore ? 1 : 0;

      let aiReview: string | null = null;
      if (report) {
        try {
          const response = await invokeLLM({
            model: "gpt-5-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a basketball analytics coach reviewing how well a pre-game scouting report predicted what actually happened. Be honest and specific. Write 2 short paragraphs: what the report got right, and what it missed. Then one line of advice for scouting this opponent next time. Plain prose, no headers.",
              },
              {
                role: "user",
                content: `Opponent: ${session.opponentName}\nFinal score: us ${input.ourScore} — them ${input.theirScore} (${won ? "WIN" : "LOSS"})\nCoach notes: ${input.notes || "none"}\n\nWhat the report predicted:\n${report.predictions}\n\nKey mistakes we were told to exploit:\n${report.mistakes}`,
              },
            ],
            max_tokens: 2500,
          });
          const raw = response.choices[0]?.message?.content;
          aiReview = typeof raw === "string" ? raw : null;
        } catch {
          aiReview = null;
        }
      }

      await db.saveGameResult({
        sessionId: input.sessionId,
        userId: ctx.user.id,
        ourScore: input.ourScore,
        theirScore: input.theirScore,
        predictedTheirScore: predicted,
        accuracyPct,
        won,
        notes: input.notes ?? null,
        aiReview,
      });

      const xp = await awardXp(ctx.user.id, XP_REWARDS.resultLogged, "predictionsLogged");
      return { accuracyPct, predicted, won, aiReview, xp };
    }),
});
