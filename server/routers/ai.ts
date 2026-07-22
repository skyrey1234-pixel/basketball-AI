import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";

const ANNOTATION_SCHEMA = {
  type: "object" as const,
  properties: {
    shapes: {
      type: "array",
      description: "SVG annotation shapes drawn over the video frame, coordinates as percentages 0-100",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["circle", "arrow", "zone", "label"] },
          x: { type: "number", description: "X coordinate 0-100 (percent of frame width)" },
          y: { type: "number", description: "Y coordinate 0-100 (percent of frame height)" },
          x2: { type: "number", description: "End X for arrows, width for zones (0-100)" },
          y2: { type: "number", description: "End Y for arrows, height for zones (0-100)" },
          radius: { type: "number", description: "Radius for circles (0-30)" },
          color: { type: "string", enum: ["red", "green", "yellow", "blue", "white"] },
          text: { type: "string", description: "Label text (for label type, or annotation on other shapes)" },
        },
        required: ["type", "x", "y", "x2", "y2", "radius", "color", "text"],
        additionalProperties: false,
      },
    },
    coaching_callout: { type: "string", description: "1-2 sentence coaching point about this moment" },
    alternative_play: { type: "string", description: "What the team should have done instead, or how to exploit this" },
    verdict: { type: "string", enum: ["good", "bad"] },
  },
  required: ["shapes", "coaching_callout", "alternative_play", "verdict"],
  additionalProperties: false,
};

type ReportRow = NonNullable<Awaited<ReturnType<typeof db.getReportBySession>>>;

function reportContext(report: ReportRow, opponentName: string): string {
  return `OPPONENT: ${opponentName}

EXECUTIVE SUMMARY:
${report.executiveSummary || "N/A"}

OFFENSE ANALYSIS:
${report.offenseAnalysis || "N/A"}

DEFENSE ANALYSIS:
${report.defenseAnalysis || "N/A"}

SPECIAL SITUATIONS:
${report.specialSituations || "N/A"}

MISTAKES & WEAKNESSES:
${report.mistakes || "N/A"}

PREDICTIONS & STRATEGY:
${report.predictions || "N/A"}`;
}

export const aiRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        message: z.string().min(1),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await db.getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const report = await db.getReportBySession(input.sessionId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "No report available yet" });

      const response = await invokeLLM({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `You are an elite basketball analyst assistant. Answer the coach's questions using the scouting report context below. Be specific, tactical, and concise. Use basketball terminology naturally.\n\n${reportContext(report, session.opponentName)}`,
          },
          ...input.history.map(m => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: input.message },
        ],
        max_tokens: 2000,
      });

      const raw = response.choices[0]?.message?.content;
      return { response: typeof raw === "string" ? raw : "Sorry, I couldn't generate a response." };
    }),

  annotateHighlight: protectedProcedure
    .input(z.object({ sessionId: z.number(), highlightIndex: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const session = await db.getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      const cached = await db.getAnnotation(input.sessionId, input.highlightIndex);
      if (cached?.annotation) return cached.annotation;

      const report = await db.getReportBySession(input.sessionId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "No report available" });
      const highlights = (report.highlights as Array<{ title: string; note: string; category: string; verdict: string; timestamp: string }>) || [];
      const highlight = highlights[input.highlightIndex];
      if (!highlight) throw new TRPCError({ code: "NOT_FOUND", message: "Highlight not found" });

      const response = await invokeLLM({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a basketball film-room annotation engine. Generate SVG overlay annotations for a frozen video frame of a basketball play. Use red for mistakes, green for good execution, yellow for key players, blue for suggested movement/spacing. Coordinates are percentages of the frame (0-100). Assume a standard broadcast camera angle of a basketball court. Place 3-6 shapes that tell the story of the play.",
          },
          {
            role: "user",
            content: `Annotate this moment against ${session.opponentName}:\n\nTitle: ${highlight.title}\nTimestamp: ${highlight.timestamp}\nCategory: ${highlight.category}\nVerdict: ${highlight.verdict}\nNote: ${highlight.note}`,
          },
        ],
        max_tokens: 3000,
        response_format: {
          type: "json_schema",
          json_schema: { name: "film_annotation", strict: true, schema: ANNOTATION_SCHEMA },
        },
      });

      const raw = response.choices[0]?.message?.content;
      const annotation = JSON.parse(typeof raw === "string" ? raw : "{}");
      await db.saveAnnotation(input.sessionId, input.highlightIndex, annotation);
      return annotation;
    }),
});
