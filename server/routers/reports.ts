import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const reportsRouter = router({
  getBySession: protectedProcedure.input(z.object({ sessionId: z.number() })).query(async ({ ctx, input }) => {
    const session = await db.getSession(input.sessionId);
    if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
    const report = await db.getReportBySession(input.sessionId);
    if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not ready" });
    return report;
  }),
});
