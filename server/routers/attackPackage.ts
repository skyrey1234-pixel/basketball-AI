import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";

const ATTACK_PLAY = {
  type: "object" as const,
  properties: {
    name: { type: "string", description: "Play name" },
    set: { type: "string", description: "Starting alignment" },
    playType: { type: "string", enum: ["pnr", "iso", "post", "offball", "transition", "catchshoot"] },
    target: { type: "string", description: "Primary option position" },
    description: { type: "string", description: "How the play develops" },
    counters: { type: "string", description: "Counter if defense adjusts" },
    weaknessExploited: { type: "string", description: "The SPECIFIC weakness from the scouting report this play is designed to torch" },
    expectedResult: { type: "string", description: "Why this should work — e.g. 'Their C can't hedge, leaves the PnR open every time'" },
    urgency: { type: "string", enum: ["use early", "use in crunch time", "use when up", "use when down", "use vs their star"] },
  },
  required: ["name", "set", "playType", "target", "description", "counters", "weaknessExploited", "expectedResult", "urgency"],
  additionalProperties: false,
};

const ATTACK_PACKAGE_SCHEMA = {
  type: "object" as const,
  properties: {
    summary: { type: "string", description: "2-3 sentence overview of the attack strategy and the main weaknesses being targeted" },
    plays: { type: "array", minItems: 5, maxItems: 5, items: ATTACK_PLAY, description: "Exactly 5 plays, each targeting a specific scouted weakness" },
    keyInsight: { type: "string", description: "The single biggest vulnerability to attack — the one thing that will win the game" },
    warningSign: { type: "string", description: "The one adjustment the opponent might make that could neutralize this attack package" },
  },
  required: ["summary", "plays", "keyInsight", "warningSign"],
  additionalProperties: false,
};

export const attackPackageRouter = router({
  get: protectedProcedure.input(z.object({ sessionId: z.number() })).query(async ({ ctx, input }) => {
    const session = await db.getSession(input.sessionId);
    if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
    const row = await db.getAttackPackage(input.sessionId);
    return row ?? null;
  }),

  generate: protectedProcedure.input(z.object({ sessionId: z.number() })).mutation(async ({ ctx, input }) => {
    const session = await db.getSession(input.sessionId);
    if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
    const report = await db.getReportBySession(input.sessionId);
    if (!report) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Scouting report must complete first" });

    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an elite offensive coordinator building a surgical attack package. Every single play must be specifically designed to exploit a real, documented weakness from the scouting report. No generic plays. If the report says their center can't hedge, build a PnR that exploits it. If their SG gets lost on screens, build a floppy action. Be specific, be ruthless, be surgical.",
        },
        {
          role: "user",
          content: `Build a 5-play Opponent Weakness Exploiter attack package against ${session.opponentName}.

SCOUTING REPORT:
${report.executiveSummary}

THEIR OFFENSE: ${report.offenseAnalysis}
THEIR DEFENSE: ${report.defenseAnalysis}
SPECIAL SITUATIONS: ${report.specialSituations}

DOCUMENTED WEAKNESSES (exploit these specifically):
${report.mistakes}

Each of the 5 plays must directly target one of these documented weaknesses. Name the weakness in each play's 'weaknessExploited' field.`,
        },
      ],
      max_tokens: 10000,
      response_format: {
        type: "json_schema",
        json_schema: { name: "attack_package", strict: true, schema: ATTACK_PACKAGE_SCHEMA },
      },
    });

    const raw = response.choices[0]?.message?.content;
    const pkg = JSON.parse(typeof raw === "string" ? raw : "{}");
    await db.saveAttackPackage(input.sessionId, pkg);
    return pkg;
  }),
});

