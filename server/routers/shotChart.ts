import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { shotCharts } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const shotChartRouter = router({
  create: protectedProcedure
    .input(z.object({
      teamName: z.string().min(1),
      opponentName: z.string().optional(),
      gameDate: z.string().optional(),
      sessionId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");
      const [result] = await drizzle.insert(shotCharts).values({
        userId: ctx.user.id,
        teamName: input.teamName,
        opponentName: input.opponentName,
        gameDate: input.gameDate,
        sessionId: input.sessionId ?? null,
        shotsJson: "[]",
      });
      const charts = await drizzle.select().from(shotCharts)
        .where(eq(shotCharts.id, (result as any).insertId)).limit(1);
      return charts[0];
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const drizzle = await db.getDb();
    if (!drizzle) return [];
    return drizzle.select().from(shotCharts)
      .where(eq(shotCharts.userId, ctx.user.id))
      .orderBy(desc(shotCharts.createdAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");
      const [chart] = await drizzle.select().from(shotCharts)
        .where(and(eq(shotCharts.id, input.id), eq(shotCharts.userId, ctx.user.id)));
      if (!chart) throw new Error("Shot chart not found");
      return chart;
    }),

  logShot: protectedProcedure
    .input(z.object({
      chartId: z.number(),
      shot: z.object({
        x: z.number(),
        y: z.number(),
        zone: z.string(),
        made: z.boolean(),
        player: z.string().optional(),
        quarter: z.number().min(1).max(4).optional(),
        shotType: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");
      const [chart] = await drizzle.select().from(shotCharts)
        .where(and(eq(shotCharts.id, input.chartId), eq(shotCharts.userId, ctx.user.id)));
      if (!chart) throw new Error("Shot chart not found");
      const shots = JSON.parse(chart.shotsJson || "[]");
      shots.push({ ...input.shot, id: Date.now(), timestamp: new Date().toISOString() });
      await drizzle.update(shotCharts)
        .set({ shotsJson: JSON.stringify(shots) })
        .where(eq(shotCharts.id, input.chartId));
      return { success: true, totalShots: shots.length };
    }),

  undoShot: protectedProcedure
    .input(z.object({ chartId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");
      const [chart] = await drizzle.select().from(shotCharts)
        .where(and(eq(shotCharts.id, input.chartId), eq(shotCharts.userId, ctx.user.id)));
      if (!chart) throw new Error("Shot chart not found");
      const shots = JSON.parse(chart.shotsJson || "[]");
      shots.pop();
      await drizzle.update(shotCharts)
        .set({ shotsJson: JSON.stringify(shots) })
        .where(eq(shotCharts.id, input.chartId));
      return { success: true, totalShots: shots.length };
    }),

  getStats: protectedProcedure
    .input(z.object({
      chartId: z.number(),
      player: z.string().optional(),
      quarter: z.number().int().min(1).max(4).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");
      const [chart] = await drizzle.select().from(shotCharts)
        .where(and(eq(shotCharts.id, input.chartId), eq(shotCharts.userId, ctx.user.id)));
      if (!chart) throw new Error("Shot chart not found");
      const allShots: any[] = JSON.parse(chart.shotsJson || "[]");
      const shots = allShots.filter(s => {
        if (input.player && (s.player ?? "Team") !== input.player) return false;
        if (input.quarter && (s.quarter ?? 1) !== input.quarter) return false;
        return true;
      });
      const total = shots.length;
      const made = shots.filter(s => s.made).length;
      const zones: Record<string, { made: number; total: number }> = {};
      for (const s of shots) {
        if (!zones[s.zone]) zones[s.zone] = { made: 0, total: 0 };
        zones[s.zone].total++;
        if (s.made) zones[s.zone].made++;
      }
      const hotZones = Object.entries(zones)
        .filter(([, z]) => z.total >= 3 && z.made / z.total > 0.5).map(([z]) => z);
      const coldZones = Object.entries(zones)
        .filter(([, z]) => z.total >= 3 && z.made / z.total < 0.3).map(([z]) => z);
      const byQuarter: Record<number, { made: number; total: number }> = {};
      for (const s of shots) {
        const q = s.quarter || 1;
        if (!byQuarter[q]) byQuarter[q] = { made: 0, total: 0 };
        byQuarter[q].total++;
        if (s.made) byQuarter[q].made++;
      }
      return {
        total, made, missed: total - made,
        pct: total > 0 ? Math.round((made / total) * 100) : 0,
        zones, hotZones, coldZones, byQuarter,
        unfilteredTotal: allShots.length,
        players: Array.from(new Set(allShots.map(s => String(s.player ?? "Team")))).sort(),
      };
    }),

  /** Charts grouped for the session filter, plus the sessions they can be linked to. */
  filterOptions: protectedProcedure.query(async ({ ctx }) => {
    const drizzle = await db.getDb();
    if (!drizzle) return { charts: [], sessions: [] };
    const charts = await drizzle.select().from(shotCharts)
      .where(eq(shotCharts.userId, ctx.user.id))
      .orderBy(desc(shotCharts.createdAt));
    const sessions = await db.listSessions(ctx.user.id);
    return {
      charts: charts.map(c => ({
        id: c.id,
        teamName: c.teamName,
        opponentName: c.opponentName,
        sessionId: c.sessionId,
        createdAt: c.createdAt,
        players: Array.from(
          new Set((JSON.parse(c.shotsJson || "[]") as any[]).map(s => String(s.player ?? "Team")))
        ).sort(),
      })),
      sessions: sessions.map(s => ({ id: s.id, opponentName: s.opponentName, status: s.status })),
    };
  }),

  /** Link an existing chart to a scouting session so charts can be filtered by session. */
  linkSession: protectedProcedure
    .input(z.object({ chartId: z.number(), sessionId: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");
      const [chart] = await drizzle.select().from(shotCharts)
        .where(and(eq(shotCharts.id, input.chartId), eq(shotCharts.userId, ctx.user.id)));
      if (!chart) throw new Error("Shot chart not found");
      await drizzle.update(shotCharts)
        .set({ sessionId: input.sessionId })
        .where(eq(shotCharts.id, input.chartId));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");
      await drizzle.delete(shotCharts)
        .where(and(eq(shotCharts.id, input.id), eq(shotCharts.userId, ctx.user.id)));
      return { success: true };
    }),
});
