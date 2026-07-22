import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const seasonRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await db.listSessions(ctx.user.id);
    const total = sessions.length;
    const complete = sessions.filter(s => s.status === "complete").length;
    const analyzing = sessions.filter(s => s.status === "analyzing").length;
    const opponents = new Map<string, { name: string; count: number; lastDate: Date }>();
    for (const s of sessions) {
      const key = s.opponentName.toLowerCase();
      const existing = opponents.get(key);
      if (existing) {
        existing.count += 1;
        if (s.createdAt > existing.lastDate) existing.lastDate = s.createdAt;
      } else {
        opponents.set(key, { name: s.opponentName, count: 1, lastDate: s.createdAt });
      }
    }
    return {
      totalSessions: total,
      completeSessions: complete,
      analyzingSessions: analyzing,
      uniqueOpponents: opponents.size,
      opponents: Array.from(opponents.values()).sort((a, b) => b.count - a.count),
    };
  }),
});
