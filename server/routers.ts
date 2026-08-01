import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { sessionsRouter } from "./routers/sessions";
import { reportsRouter } from "./routers/reports";
import { aiRouter } from "./routers/ai";
import { playersRouter } from "./routers/players";
import { gamePlanRouter } from "./routers/gamePlan";
import { seasonRouter } from "./routers/season";
import { coachStyleRouter } from "./routers/coachStyle";
import { attackPackageRouter } from "./routers/attackPackage";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  sessions: sessionsRouter,
  reports: reportsRouter,
  ai: aiRouter,
  players: playersRouter,
  gamePlan: gamePlanRouter,
  season: seasonRouter,
  coachStyle: coachStyleRouter,
  attackPackage: attackPackageRouter,
});

export type AppRouter = typeof appRouter;
