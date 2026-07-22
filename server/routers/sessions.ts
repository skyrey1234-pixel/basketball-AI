import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { generateReport } from "../analysis";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export const sessionsRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.listSessions(ctx.user.id)),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const session = await db.getSession(input.id);
    if (!session || session.userId !== ctx.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
    }
    return session;
  }),

  create: protectedProcedure
    .input(
      z.object({
        opponentName: z.string().min(1).max(255),
        gameDate: z.string().optional(),
        sourceType: z.enum(["youtube", "upload"]),
        youtubeUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        videoFileKey: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let youtubeVideoId: string | null = null;
      if (input.sourceType === "youtube") {
        if (!input.youtubeUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "YouTube URL required" });
        youtubeVideoId = extractYouTubeId(input.youtubeUrl);
        if (!youtubeVideoId) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid YouTube URL" });
      } else if (!input.videoUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Video upload required" });
      }

      const sessionId = await db.createSession({
        userId: ctx.user.id,
        opponentName: input.opponentName,
        gameDate: input.gameDate,
        sourceType: input.sourceType,
        youtubeVideoId,
        videoUrl: input.videoUrl,
        videoFileKey: input.videoFileKey,
        status: "analyzing",
      });

      // Fire-and-forget async AI analysis (same pattern as the football app)
      void generateReport(sessionId);

      return { id: sessionId };
    }),

  reanalyze: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const session = await db.getSession(input.id);
    if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
    await db.updateSessionStatus(input.id, "analyzing");
    void generateReport(input.id);
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const session = await db.getSession(input.id);
    if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
    await db.deleteSession(input.id);
    return { success: true };
  }),
});
