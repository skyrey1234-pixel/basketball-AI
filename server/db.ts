import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  gameSessions,
  InsertGameSession,
  scoutingReports,
  InsertScoutingReport,
  playerProfiles,
  InsertPlayerProfile,
  filmAnnotations,
  gamePlans,
} from "../drizzle/schema";
import {
  attackPackages,
} from "../drizzle/schema";
import {
  playerDna,
  coachProgress,
  customPlays,
  gameResults,
  type InsertPlayerDna,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== Game Sessions =====
export async function listSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameSessions).where(eq(gameSessions.userId, userId)).orderBy(desc(gameSessions.createdAt));
}

export async function getSession(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(gameSessions).where(eq(gameSessions.id, id)).limit(1);
  return rows[0];
}

export async function createSession(data: InsertGameSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(gameSessions).values(data);
  return Number(result[0].insertId);
}

export async function updateSessionStatus(id: number, status: "analyzing" | "complete" | "failed") {
  const db = await getDb();
  if (!db) return;
  await db.update(gameSessions).set({ status }).where(eq(gameSessions.id, id));
}

export async function deleteSession(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(scoutingReports).where(eq(scoutingReports.sessionId, id));
  await db.delete(playerProfiles).where(eq(playerProfiles.sessionId, id));
  await db.delete(filmAnnotations).where(eq(filmAnnotations.sessionId, id));
  await db.delete(gamePlans).where(eq(gamePlans.sessionId, id));
  await db.delete(gameSessions).where(eq(gameSessions.id, id));
}

// ===== Scouting Reports =====
export async function getReportBySession(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(scoutingReports).where(eq(scoutingReports.sessionId, sessionId)).orderBy(desc(scoutingReports.createdAt)).limit(1);
  return rows[0];
}

export async function saveReport(data: InsertScoutingReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scoutingReports).where(eq(scoutingReports.sessionId, data.sessionId));
  await db.insert(scoutingReports).values(data);
}

// ===== Player Profiles =====
export async function listPlayersBySession(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(playerProfiles).where(eq(playerProfiles.sessionId, sessionId));
}

export async function savePlayerProfiles(sessionId: number, profiles: InsertPlayerProfile[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(playerProfiles).where(eq(playerProfiles.sessionId, sessionId));
  if (profiles.length > 0) await db.insert(playerProfiles).values(profiles);
}

// ===== Film Annotations (cache) =====
export async function getAnnotation(sessionId: number, highlightIndex: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(filmAnnotations)
    .where(and(eq(filmAnnotations.sessionId, sessionId), eq(filmAnnotations.highlightIndex, highlightIndex)))
    .limit(1);
  return rows[0];
}

export async function saveAnnotation(sessionId: number, highlightIndex: number, annotation: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(filmAnnotations).values({ sessionId, highlightIndex, annotation });
}

// ===== Game Plans (cache) =====
export async function getGamePlan(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(gamePlans).where(eq(gamePlans.sessionId, sessionId)).orderBy(desc(gamePlans.createdAt)).limit(1);
  return rows[0];
}

export async function saveGamePlan(sessionId: number, plan: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(gamePlans).where(eq(gamePlans.sessionId, sessionId));
  await db.insert(gamePlans).values({ sessionId, plan });
}

// ===== Attack Packages =====
export async function getAttackPackage(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(attackPackages).where(eq(attackPackages.sessionId, sessionId)).orderBy(desc(attackPackages.createdAt)).limit(1);
  return rows[0]?.package ?? null;
}

export async function saveAttackPackage(sessionId: number, pkg: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(attackPackages).where(eq(attackPackages.sessionId, sessionId));
  await db.insert(attackPackages).values({ sessionId, package: pkg });
}

/* ------------------------------------------------------------------ */
/* 2K Player DNA                                                       */
/* ------------------------------------------------------------------ */

export async function listPlayerDnaBySession(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(playerDna).where(eq(playerDna.sessionId, sessionId));
}

export async function savePlayerDna(sessionId: number, rows: InsertPlayerDna[]) {
  const db = await getDb();
  if (!db) return;
  await db.delete(playerDna).where(eq(playerDna.sessionId, sessionId));
  if (rows.length === 0) return;
  await db.insert(playerDna).values(rows);
}

/* ------------------------------------------------------------------ */
/* Coach progression (XP, level, coins, badges)                        */
/* ------------------------------------------------------------------ */

export async function getCoachProgress(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(coachProgress)
    .where(eq(coachProgress.userId, userId))
    .limit(1);
  if (rows.length > 0) return rows[0];
  await db.insert(coachProgress).values({ userId, badges: [] });
  const created = await db
    .select()
    .from(coachProgress)
    .where(eq(coachProgress.userId, userId))
    .limit(1);
  return created[0];
}

export async function updateCoachProgress(
  userId: number,
  patch: Partial<{
    xp: number;
    level: number;
    coins: number;
    badges: unknown;
    filmsAnalyzed: number;
    plansGenerated: number;
    challengesWon: number;
    playsDesigned: number;
    predictionsLogged: number;
    accuracySum: number;
  }>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(coachProgress).set(patch).where(eq(coachProgress.userId, userId));
}

/* ------------------------------------------------------------------ */
/* Play Designer — custom plays                                        */
/* ------------------------------------------------------------------ */

export async function listCustomPlays(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customPlays)
    .where(eq(customPlays.userId, userId))
    .orderBy(desc(customPlays.createdAt));
}

export async function getCustomPlayByShareId(shareId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(customPlays)
    .where(eq(customPlays.shareId, shareId))
    .limit(1);
  return rows[0];
}

export async function createCustomPlay(data: {
  userId: number;
  name: string;
  set?: string | null;
  playType?: string | null;
  positions: unknown;
  routes: unknown;
  notes?: string | null;
  aiGrade?: unknown;
  shareId: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const res = await db.insert(customPlays).values(data);
  return (res as unknown as { insertId: number }).insertId;
}

export async function deleteCustomPlay(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(customPlays)
    .where(and(eq(customPlays.id, id), eq(customPlays.userId, userId)));
}

/* ------------------------------------------------------------------ */
/* Post-game results (prediction vs reality)                           */
/* ------------------------------------------------------------------ */

export async function getGameResult(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(gameResults)
    .where(eq(gameResults.sessionId, sessionId))
    .limit(1);
  return rows[0];
}

export async function listGameResults(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(gameResults)
    .where(eq(gameResults.userId, userId))
    .orderBy(desc(gameResults.createdAt));
}

export async function saveGameResult(data: {
  sessionId: number;
  userId: number;
  ourScore: number;
  theirScore: number;
  predictedTheirScore?: number | null;
  accuracyPct?: number | null;
  won: number;
  notes?: string | null;
  aiReview?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.delete(gameResults).where(eq(gameResults.sessionId, data.sessionId));
  await db.insert(gameResults).values(data);
}
