import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { highlightReels } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeJson, coerceArray } from "../aiJson";

/** momentsJson holds either the moments array or an `{__error}` marker from a failed run. */
function decodeMoments(raw: string | null): { moments: any[]; errorMessage: string | null } {
  if (!raw) return { moments: [], errorMessage: null };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { moments: parsed, errorMessage: null };
    if (parsed && typeof parsed === "object" && parsed.__error) {
      return { moments: [], errorMessage: String(parsed.__error) };
    }
    return { moments: coerceArray(parsed, "moments"), errorMessage: null };
  } catch {
    return { moments: [], errorMessage: "Stored highlight data was unreadable" };
  }
}

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

          const parsed = await invokeJson(`You are a basketball film editor creating a highlight reel package for coaches.

Game: vs ${session.opponentName}
Video: ${session.videoUrl || "uploaded film"}
Key moments: ${JSON.stringify(highlights.slice(0, 10))}
Summary: ${report?.executiveSummary || ""}

Identify the 8 most compelling moments for a coaching highlight reel.
Focus on: key plays, mistakes to learn from, great defensive stops, clutch moments, teachable situations.

Return a JSON object of this exact shape:
{"moments":[{
  "timestamp": 45,
  "endTimestamp": 58,
  "label": "descriptive title",
  "type": "great_play|mistake|defensive_stop|clutch|teachable",
  "why": "why this moment matters",
  "coachingPoint": "what to say to the team about this clip",
  "duration": 13
}]}`);

          const moments = coerceArray(parsed, "moments", "highlights", "clips");
          if (moments.length === 0) throw new Error("AI returned no highlight moments");

          await drizzle.update(highlightReels)
            .set({ momentsJson: JSON.stringify(moments), status: "complete" })
            .where(eq(highlightReels.id, reelId));
          await db.updateCoachProgress(ctx.user.id, { xp: 150 });
        } catch (err) {
          console.error("[highlightReel.generate] failed:", err);
          await drizzle.update(highlightReels)
            .set({
              status: "error",
              momentsJson: JSON.stringify({ __error: err instanceof Error ? err.message : String(err) }),
            })
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
      return { ...reel, ...decodeMoments(reel.momentsJson) };
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
      return { ...reel, ...decodeMoments(reel.momentsJson) };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const drizzle = await db.getDb();
    if (!drizzle) return [];
    return drizzle.select().from(highlightReels)
      .where(eq(highlightReels.userId, ctx.user.id))
      .orderBy(desc(highlightReels.createdAt));
  }),

  /**
   * Build an export package for a reel: Lakers-themed overlay metadata per clip
   * plus the source film reference, so the client can render/download it.
   */
  exportPackage: protectedProcedure
    .input(z.object({
      id: z.number(),
      teamName: z.string().max(40).optional(),
      accentStyle: z.enum(["showtime", "midnight", "hardwood"]).default("showtime"),
      momentIndexes: z.array(z.number().int().nonnegative()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new Error("DB unavailable");

      const [reel] = await drizzle.select().from(highlightReels)
        .where(and(eq(highlightReels.id, input.id), eq(highlightReels.userId, ctx.user.id)));
      if (!reel) throw new Error("Highlight reel not found");

      const session = await db.getSession(reel.sessionId);
      const allMoments: any[] = reel.momentsJson ? JSON.parse(reel.momentsJson) : [];
      const picked = input.momentIndexes?.length
        ? input.momentIndexes.filter(i => i < allMoments.length).map(i => ({ index: i, moment: allMoments[i] }))
        : allMoments.map((moment, index) => ({ index, moment }));

      const themes = {
        showtime: { primary: "#552583", accent: "#FDB927", text: "#FFFFFF", label: "Showtime Purple & Gold" },
        midnight: { primary: "#1B0B2E", accent: "#FDE68A", text: "#F5F3FF", label: "Midnight Film Room" },
        hardwood: { primary: "#2B1249", accent: "#C8A96E", text: "#FFF7ED", label: "Hardwood Classic" },
      } as const;
      const theme = themes[input.accentStyle];
      const team = (input.teamName || "CourtVision AI").trim().slice(0, 40);

      const clips = picked.map(({ index, moment }) => {
        const start = Number(moment?.timestamp ?? 0);
        const end = Number(moment?.endTimestamp ?? start);
        const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.round(s % 60))).padStart(2, "0")}`;
        return {
          clipNumber: index + 1,
          label: String(moment?.label ?? `Clip ${index + 1}`),
          type: String(moment?.type ?? "teachable"),
          startSeconds: start,
          endSeconds: end,
          durationSeconds: Math.max(1, Number(moment?.duration ?? Math.max(1, end - start))),
          timecode: `${fmt(start)} – ${fmt(end)}`,
          coachingPoint: String(moment?.coachingPoint ?? ""),
          why: String(moment?.why ?? ""),
          overlay: {
            topLeft: team.toUpperCase(),
            topRight: `CLIP ${String(index + 1).padStart(2, "0")}`,
            headline: String(moment?.label ?? `Clip ${index + 1}`),
            subhead: session ? `vs ${session.opponentName}` : "Opponent film",
            footer: String(moment?.coachingPoint ?? "").slice(0, 120),
            theme,
          },
        };
      });

      return {
        reelId: reel.id,
        title: reel.title ?? "Highlight Reel",
        opponentName: session?.opponentName ?? null,
        sourceType: session?.sourceType ?? null,
        youtubeVideoId: session?.youtubeVideoId ?? null,
        videoUrl: session?.videoUrl ?? null,
        teamName: team,
        theme,
        totalClips: clips.length,
        totalRuntimeSeconds: clips.reduce((acc, c) => acc + c.durationSeconds, 0),
        clips,
        generatedAt: new Date().toISOString(),
      };
    }),
});
