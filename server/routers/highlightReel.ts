import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { highlightReels } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const highlightReelRouter = router({
  generate: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");

      const session = await db.getSession(input.sessionId);
      if (!session) throw new Error("Session not found");
      const report = await db.getReportBySession(input.sessionId);

      const [result] = await drizzle.insert(highlightReels).values({
        sessionId: input.sessionId,
        userId: ctx.user.id,
        title: input.title || `${session.opponentName} Highlights`,
        status: "generating",
      });
      const reelId = (result as any).insertId;

      (async () => {
        try {
          const reportData = report?.highlights ? report.highlights as any : null;
          const highlights = Array.isArray(reportData) ? reportData : [];

          const response = await invokeLLM({
            model: "gpt-5-mini",
            messages: [{
              role: "user",
              content: `You are a basketball film editor creating a highlight reel package for coaches.

Game: vs ${session.opponentName}
Video: ${session.videoUrl || "uploaded film"}
Key moments: ${JSON.stringify(highlights.slice(0, 10))}
Summary: ${report?.executiveSummary || ""}

Identify the 8 most compelling moments for a coaching highlight reel.
Focus on: key plays, mistakes to learn from, great defensive stops, clutch moments, teachable situations.

Return a JSON array of 8 moments:
[{
  "timestamp": 45,
  "endTimestamp": 58,
  "label": "descriptive title",
  "type": "great_play|mistake|defensive_stop|clutch|teachable",
  "why": "why this moment matters",
  "coachingPoint": "what to say to the team about this clip",
  "duration": 13
}]`,
            }],
            response_format: { type: "json_object" },
          });
          const raw = response.choices[0]?.message?.content;
          const moments = JSON.parse(typeof raw === "string" ? raw : "[]");
          await drizzle.update(highlightReels)
            .set({ momentsJson: JSON.stringify(moments), status: "complete" })
            .where(eq(highlightReels.id, reelId));
          await db.updateCoachProgress(ctx.user.id, { xp: 150 });
        } catch {
          await drizzle.update(highlightReels)
            .set({ status: "error" })
            .where(eq(highlightReels.id, reelId));
        }
      })();

      return { id: reelId, status: "generating" };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");
      const [reel] = await drizzle.select().from(highlightReels)
        .where(and(eq(highlightReels.id, input.id), eq(highlightReels.userId, ctx.user.id)));
      if (!reel) throw new Error("Highlight reel not found");
      return { ...reel, moments: reel.momentsJson ? JSON.parse(reel.momentsJson) : [] };
    }),

  getBySession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const [reel] = await drizzle.select().from(highlightReels)
        .where(and(eq(highlightReels.sessionId, input.sessionId), eq(highlightReels.userId, ctx.user.id)))
        .orderBy(desc(highlightReels.createdAt));
      if (!reel) return null;
      return { ...reel, moments: reel.momentsJson ? JSON.parse(reel.momentsJson) : [] };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const drizzle = await db.getDb();
    if (!drizzle) return [];
    return drizzle.select().from(highlightReels)
      .where(eq(highlightReels.userId, ctx.user.id))
      .orderBy(desc(highlightReels.createdAt));
  }),
});
