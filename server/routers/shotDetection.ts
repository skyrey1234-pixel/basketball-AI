import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { shotDetectionReports } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { invokeJson } from "../aiJson";

export const shotDetectionRouter = router({
  analyze: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");

      const session = await db.getSession(input.sessionId);
      if (!session) throw new Error("Session not found");
      const report = await db.getReportBySession(input.sessionId);

      const [existing] = await drizzle.select().from(shotDetectionReports)
        .where(and(eq(shotDetectionReports.sessionId, input.sessionId), eq(shotDetectionReports.userId, ctx.user.id)));

      let reportId: number;
      if (existing) {
        reportId = existing.id;
        await drizzle.update(shotDetectionReports).set({ status: "analyzing" }).where(eq(shotDetectionReports.id, existing.id));
      } else {
        const [result] = await drizzle.insert(shotDetectionReports).values({
          sessionId: input.sessionId, userId: ctx.user.id, status: "analyzing",
        });
        reportId = (result as any).insertId;
      }

      (async () => {
        try {
          const analytics = await invokeJson(`You are an advanced basketball analytics system with shot detection capabilities.

Analyze this game film and provide comprehensive shot detection analytics.
Opponent: ${session.opponentName}
Video: ${session.videoUrl || "uploaded film"}
Scouting report: ${report?.offenseAnalysis || ""}

Return a JSON object:
{
  "totalShots": 67,
  "madeShots": 28,
  "missedShots": 39,
  "fieldGoalPct": 41.8,
  "threePtAttempts": 22,
  "threePtMade": 8,
  "threePtPct": 36.4,
  "twoPointAttempts": 45,
  "twoPointMade": 20,
  "twoPointPct": 44.4,
  "shotsByZone": {
    "corner3L": {"attempts": 6, "made": 3, "pct": 50},
    "corner3R": {"attempts": 5, "made": 2, "pct": 40},
    "wing3L": {"attempts": 4, "made": 1, "pct": 25},
    "wing3R": {"attempts": 4, "made": 2, "pct": 50},
    "top3": {"attempts": 3, "made": 0, "pct": 0},
    "midL": {"attempts": 8, "made": 3, "pct": 37.5},
    "midR": {"attempts": 7, "made": 2, "pct": 28.6},
    "paint": {"attempts": 22, "made": 13, "pct": 59.1},
    "freeThrow": {"attempts": 8, "made": 5, "pct": 62.5}
  },
  "hotZones": ["corner3L", "paint"],
  "coldZones": ["top3", "wing3L"],
  "scoringRuns": [{"quarter": 1, "startTime": 240, "endTime": 360, "points": 8, "description": "8-0 run off turnovers"}],
  "keyPatterns": ["Heavy reliance on paint scoring", "Struggles from top of key", "Corner 3s most efficient zone"],
  "shotTimeline": [
    {"quarter": 1, "made": 8, "missed": 10},
    {"quarter": 2, "made": 7, "missed": 9},
    {"quarter": 3, "made": 8, "missed": 11},
    {"quarter": 4, "made": 5, "missed": 9}
  ],
  "topScorer": {"name": "inferred from report", "shots": 18, "made": 9, "pct": 50},
  "defenseRecommendation": "specific defensive strategy based on shot patterns"
}`);

          if (!analytics || typeof analytics !== "object" || typeof analytics.totalShots !== "number") {
            throw new Error("AI returned incomplete shot analytics");
          }

          await drizzle.update(shotDetectionReports)
            .set({ analyticsJson: JSON.stringify(analytics), status: "complete" })
            .where(eq(shotDetectionReports.id, reportId));
          await db.updateCoachProgress(ctx.user.id, { xp: 300 });
        } catch (err) {
          console.error("[shotDetection.analyze] failed:", err);
          await drizzle.update(shotDetectionReports)
            .set({
              status: "error",
              analyticsJson: JSON.stringify({ __error: err instanceof Error ? err.message : String(err) }),
            })
            .where(eq(shotDetectionReports.id, reportId));
        }
      })();

      return { id: reportId, status: "analyzing" };
    }),

  get: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const [report] = await drizzle.select().from(shotDetectionReports)
        .where(and(eq(shotDetectionReports.sessionId, input.sessionId), eq(shotDetectionReports.userId, ctx.user.id)));
      if (!report) return null;
      let analytics: any = null;
      let errorMessage: string | null = null;
      if (report.analyticsJson) {
        try {
          const parsed = JSON.parse(report.analyticsJson);
          if (parsed && parsed.__error) errorMessage = String(parsed.__error);
          else analytics = parsed;
        } catch {
          errorMessage = "Stored analytics were unreadable";
        }
      }
      return { ...report, analytics, errorMessage };
    }),
});
