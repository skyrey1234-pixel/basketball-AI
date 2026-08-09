import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { formAnalyses } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const formCoachRouter = router({
  analyze: protectedProcedure
    .input(z.object({
      playerName: z.string(),
      videoUrl: z.string().url(),
      sessionId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");

      const [result] = await drizzle.insert(formAnalyses).values({
        userId: ctx.user.id,
        playerName: input.playerName,
        videoUrl: input.videoUrl,
        sessionId: input.sessionId ?? null,
        status: "analyzing",
      });
      const analysisId = (result as any).insertId;

      (async () => {
        try {
          const response = await invokeLLM({
            model: "gpt-5-mini",
            messages: [{
              role: "user",
              content: `You are an elite basketball shooting coach with expertise in biomechanics.

Analyze the shooting form of player: ${input.playerName}
Video: ${input.videoUrl}
${input.notes ? `Coach's observations: ${input.notes}` : ""}

Return a JSON object:
{
  "overallScore": 78,
  "grade": "B+",
  "summary": "2-3 sentence overall assessment",
  "stance": {"score": 80, "feedback": "specific feedback", "fix": "one correction"},
  "release": {"score": 75, "feedback": "specific feedback", "fix": "one correction"},
  "followThrough": {"score": 82, "feedback": "specific feedback", "fix": "one correction"},
  "balance": {"score": 70, "feedback": "specific feedback", "fix": "one correction"},
  "shotPocket": {"score": 77, "feedback": "specific feedback", "fix": "one correction"},
  "strengths": ["3 specific strengths"],
  "weaknesses": ["3 areas to improve"],
  "drills": [
    {"name": "drill name", "description": "how to do it", "reps": "3x10", "targets": "what it fixes"},
    {"name": "drill name", "description": "how to do it", "reps": "5 min", "targets": "what it fixes"},
    {"name": "drill name", "description": "how to do it", "reps": "daily", "targets": "what it fixes"}
  ],
  "coachQuote": "motivating quote from a legendary coach",
  "comparedTo": "NBA player with similar style or issues"
}`,
            }],
            response_format: { type: "json_object" },
          });
          const raw = response.choices[0]?.message?.content;
          const analysis = JSON.parse(typeof raw === "string" ? raw : "{}");
          await drizzle.update(formAnalyses)
            .set({ analysisJson: JSON.stringify(analysis), status: "complete" })
            .where(eq(formAnalyses.id, analysisId));
          await db.updateCoachProgress(ctx.user.id, { xp: 200 });
        } catch {
          await drizzle.update(formAnalyses)
            .set({ status: "error" })
            .where(eq(formAnalyses.id, analysisId));
        }
      })();

      return { id: analysisId, status: "analyzing" };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");
      const [analysis] = await drizzle.select().from(formAnalyses)
        .where(and(eq(formAnalyses.id, input.id), eq(formAnalyses.userId, ctx.user.id)));
      if (!analysis) throw new Error("Analysis not found");
      return { ...analysis, analysisData: analysis.analysisJson ? JSON.parse(analysis.analysisJson) : null };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const drizzle = await db.getDb();
    if (!drizzle) return [];
    return drizzle.select().from(formAnalyses)
      .where(eq(formAnalyses.userId, ctx.user.id))
      .orderBy(desc(formAnalyses.createdAt));
  }),
});
