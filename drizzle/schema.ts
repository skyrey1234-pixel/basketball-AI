import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * A scouting session for one opponent game film (YouTube link or uploaded video).
 * Mirrors the football app's game_sessions table, adapted for basketball.
 */
export const gameSessions = mysqlTable("game_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  opponentName: varchar("opponentName", { length: 255 }).notNull(),
  gameDate: varchar("gameDate", { length: 64 }),
  sourceType: mysqlEnum("sourceType", ["youtube", "upload"]).notNull(),
  youtubeVideoId: varchar("youtubeVideoId", { length: 32 }),
  videoUrl: text("videoUrl"),
  videoFileKey: text("videoFileKey"),
  status: mysqlEnum("status", ["analyzing", "complete", "failed"]).default("analyzing").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = typeof gameSessions.$inferInsert;

/**
 * AI-generated scouting report for a session. Six narrative sections plus
 * timestamped highlights JSON — basketball version of scouting_reports.
 */
export const scoutingReports = mysqlTable("scouting_reports", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  executiveSummary: text("executiveSummary"),
  offenseAnalysis: text("offenseAnalysis"),
  defenseAnalysis: text("defenseAnalysis"),
  specialSituations: text("specialSituations"),
  mistakes: text("mistakes"),
  predictions: text("predictions"),
  highlights: json("highlights"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScoutingReport = typeof scoutingReports.$inferSelect;
export type InsertScoutingReport = typeof scoutingReports.$inferInsert;

/**
 * AI-generated opponent player tendency profiles (basketball positions PG-C).
 */
export const playerProfiles = mysqlTable("player_profiles", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  opponentName: varchar("opponentName", { length: 255 }).notNull(),
  playerNumber: int("playerNumber"),
  playerName: varchar("playerName", { length: 255 }).notNull(),
  position: varchar("position", { length: 16 }),
  tendencies: json("tendencies"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  threatLevel: mysqlEnum("threatLevel", ["low", "medium", "high", "elite"]).default("medium").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type InsertPlayerProfile = typeof playerProfiles.$inferInsert;

/**
 * Cached AI film annotations per highlight (SVG overlay instructions).
 */
export const filmAnnotations = mysqlTable("film_annotations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  highlightIndex: int("highlightIndex").notNull(),
  annotation: json("annotation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FilmAnnotation = typeof filmAnnotations.$inferSelect;

/**
 * Cached AI game plans per session (JSON payload from the generator).
 */
export const gamePlans = mysqlTable("game_plans", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  plan: json("plan"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GamePlan = typeof gamePlans.$inferSelect;

/**
 * Cached AI attack packages per session (Opponent Weakness Exploiter).
 */
export const attackPackages = mysqlTable("attack_packages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  package: json("package"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AttackPackage = typeof attackPackages.$inferSelect;

/**
 * 2K-style deep player DNA: tendency ratings 0-99, hot zones, badges, clutch ratings.
 * One row per scouted opponent player.
 */
export const playerDna = mysqlTable("player_dna", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  playerProfileId: int("playerProfileId").notNull(),
  overall: int("overall").notNull(),
  rarity: mysqlEnum("rarity", ["bronze", "silver", "gold", "diamond"]).default("bronze").notNull(),
  /** 0-99 tendency ratings keyed by name */
  tendencies: json("tendencies"),
  /** Attribute ratings 0-99 keyed by name */
  attributes: json("attributes"),
  /** Array of { zone, rating, label } for the half-court heat map */
  hotZones: json("hotZones"),
  /** Array of earned badge ids */
  badges: json("badges"),
  clutchRating: int("clutchRating").default(50).notNull(),
  underPressure: int("underPressure").default(50).notNull(),
  lateShotClock: int("lateShotClock").default(50).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlayerDna = typeof playerDna.$inferSelect;
export type InsertPlayerDna = typeof playerDna.$inferInsert;

/**
 * Coach progression: XP, level, coins, earned badges, scouting accuracy.
 */
export const coachProgress = mysqlTable("coach_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  xp: int("xp").default(0).notNull(),
  level: int("level").default(1).notNull(),
  coins: int("coins").default(0).notNull(),
  /** Array of earned coach badge ids */
  badges: json("badges"),
  filmsAnalyzed: int("filmsAnalyzed").default(0).notNull(),
  plansGenerated: int("plansGenerated").default(0).notNull(),
  challengesWon: int("challengesWon").default(0).notNull(),
  playsDesigned: int("playsDesigned").default(0).notNull(),
  predictionsLogged: int("predictionsLogged").default(0).notNull(),
  accuracySum: int("accuracySum").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CoachProgress = typeof coachProgress.$inferSelect;

/**
 * User-designed plays saved from the Play Designer.
 */
export const customPlays = mysqlTable("custom_plays", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  set: varchar("set", { length: 80 }),
  playType: varchar("playType", { length: 32 }),
  /** Array of { position, x, y } player spots */
  positions: json("positions"),
  /** Array of { from, to, kind } routes */
  routes: json("routes"),
  notes: text("notes"),
  /** AI grade payload: { grade, score, strengths[], fixes[] } */
  aiGrade: json("aiGrade"),
  shareId: varchar("shareId", { length: 24 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomPlay = typeof customPlays.$inferSelect;

/**
 * Post-game actual results vs AI prediction, for scouting accuracy tracking.
 */
export const gameResults = mysqlTable("game_results", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().unique(),
  userId: int("userId").notNull(),
  ourScore: int("ourScore").notNull(),
  theirScore: int("theirScore").notNull(),
  predictedTheirScore: int("predictedTheirScore"),
  accuracyPct: int("accuracyPct"),
  won: int("won").default(0).notNull(),
  notes: text("notes"),
  /** AI comparison of prediction vs reality */
  aiReview: text("aiReview"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GameResult = typeof gameResults.$inferSelect;
