import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { COACH_BADGES, XP_REWARDS, levelFromXp, levelProgress } from "../../shared/twok";

type StatKey =
  | "filmsAnalyzed"
  | "plansGenerated"
  | "challengesWon"
  | "playsDesigned"
  | "predictionsLogged";

/**
 * Award XP and increment a usage stat, then recompute level and unlocked badges.
 * Called from other routers after meaningful actions.
 */
export async function awardXp(userId: number, amount: number, stat?: StatKey) {
  const progress = await db.getCoachProgress(userId);
  if (!progress) return null;

  const nextXp = progress.xp + amount;
  const nextLevel = levelFromXp(nextXp);
  const leveledUp = nextLevel > progress.level;

  const stats: Record<StatKey, number> = {
    filmsAnalyzed: progress.filmsAnalyzed,
    plansGenerated: progress.plansGenerated,
    challengesWon: progress.challengesWon,
    playsDesigned: progress.playsDesigned,
    predictionsLogged: progress.predictionsLogged,
  };
  if (stat) stats[stat] = stats[stat] + 1;

  const existing = new Set(Array.isArray(progress.badges) ? (progress.badges as string[]) : []);
  const newlyEarned: string[] = [];
  for (const badge of COACH_BADGES) {
    if (existing.has(badge.id)) continue;
    const value = stats[badge.stat as StatKey] ?? 0;
    if (value >= badge.threshold) {
      existing.add(badge.id);
      newlyEarned.push(badge.id);
    }
  }

  await db.updateCoachProgress(userId, {
    xp: nextXp,
    level: nextLevel,
    coins: progress.coins + Math.round(amount / 5) + (leveledUp ? 250 : 0),
    badges: Array.from(existing),
    ...(stat ? { [stat]: stats[stat] } : {}),
  });

  return { xpGained: amount, totalXp: nextXp, level: nextLevel, leveledUp, newlyEarned };
}

export const progressRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const progress = await db.getCoachProgress(ctx.user.id);
    if (!progress) return null;
    const results = await db.listGameResults(ctx.user.id);
    const accuracy =
      results.length > 0
        ? Math.round(
            results.reduce((sum, r) => sum + (r.accuracyPct ?? 0), 0) / results.length
          )
        : null;
    const wins = results.filter(r => r.won === 1).length;
    return {
      ...progress,
      badges: Array.isArray(progress.badges) ? (progress.badges as string[]) : [],
      progress: levelProgress(progress.xp),
      scoutingAccuracy: accuracy,
      record: { wins, losses: results.length - wins },
    };
  }),

  /** Called by the Scouting Challenge on a correct answer. */
  awardChallenge: protectedProcedure
    .input(z.object({ correct: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!input.correct) return null;
      return awardXp(ctx.user.id, XP_REWARDS.challengeCorrect, "challengesWon");
    }),
});
