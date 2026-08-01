import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";

export const COACH_STYLES = [
  {
    id: "popovich",
    name: "Gregg Popovich",
    team: "San Antonio Spurs",
    era: "1996–2022",
    philosophy: "Ball movement, spacing, unselfish play, motion offense, disciplined man defense with switching principles. Emphasizes player development and team over individual. Known for 'Pass the ball, move without it, and make the extra pass.'",
    signature: ["Triangle actions", "Spain PnR", "Weak-side cuts", "Dribble handoffs", "Drop coverage"],
    style: "Motion / Spacing",
    color: "#C0C0C0",
  },
  {
    id: "stevens",
    name: "Brad Stevens",
    team: "Boston Celtics",
    era: "2013–2021",
    philosophy: "Reads-based offense, heavy off-ball movement, screen-the-screener actions, mismatch hunting. Defensive versatility with switching and help principles. Data-driven, exploits opponent tendencies.",
    signature: ["Floppy action", "Horns sets", "Elevator screens", "DHO chains", "Switching defense"],
    style: "Reads / Mismatch",
    color: "#007A33",
  },
  {
    id: "thibodeau",
    name: "Tom Thibodeau",
    team: "New York Knicks",
    era: "2010–present",
    philosophy: "Physical, defensive-first basketball. Iso-heavy offense for stars, hard hedges, help defense rotations. Grind-it-out pace, post-up actions, mid-range efficiency.",
    signature: ["Post-up isolation", "Hard hedge PnR", "Weak-side help rotations", "Slow pace", "Physical defense"],
    style: "Defensive / Physical",
    color: "#006BB6",
  },
  {
    id: "kerr",
    name: "Steve Kerr",
    team: "Golden State Warriors",
    era: "2014–present",
    philosophy: "Movement, 3-point shooting, pace-and-space, ball reversal, corner 3s off drive-and-kick. Defensive versatility, switching, help rotations. Fun, free-flowing basketball.",
    signature: ["Dribble handoffs", "Corner 3 actions", "Transition 3s", "Drive-and-kick", "Switching defense"],
    style: "Pace & Space",
    color: "#FFC72C",
  },
  {
    id: "rivers",
    name: "Doc Rivers",
    team: "Various",
    era: "1999–present",
    philosophy: "Star-driven offense, pick-and-roll heavy, physical defense, zone wrinkles. Emphasizes trust and team chemistry. Adjusts scheme to fit personnel.",
    signature: ["PnR for stars", "Zone wrinkles", "ATO plays", "Isolation scoring", "Defensive rotations"],
    style: "Star-Driven",
    color: "#C8102E",
  },
  {
    id: "spoelstra",
    name: "Erik Spoelstra",
    team: "Miami Heat",
    era: "2008–present",
    philosophy: "Positionless basketball, versatile defenders, zone defense, heat-check culture. Innovative sets, multi-action plays, players playing multiple positions.",
    signature: ["Zone defense", "Positionless lineups", "Transition offense", "Multi-action sets", "Culture-driven"],
    style: "Positionless / Zone",
    color: "#98002E",
  },
];

const ATTACK_PLAY_SCHEMA = {
  type: "object" as const,
  properties: {
    name: { type: "string" },
    set: { type: "string" },
    playType: { type: "string", enum: ["pnr", "iso", "post", "offball", "transition", "catchshoot"] },
    target: { type: "string" },
    description: { type: "string" },
    counters: { type: "string" },
    whyItWorks: { type: "string", description: "Specific weakness from the scouting report this play exploits" },
  },
  required: ["name", "set", "playType", "target", "description", "counters", "whyItWorks"],
  additionalProperties: false,
};

const COACH_PLAN_SCHEMA = {
  type: "object" as const,
  properties: {
    coachId: { type: "string" },
    overview: { type: "string", description: "How this coach would approach this game — their philosophy applied to this opponent" },
    scriptedPlays: { type: "array", minItems: 5, maxItems: 8, items: ATTACK_PLAY_SCHEMA },
    defensiveApproach: { type: "string", description: "How this coach would defend the opponent based on their system" },
    coachingCues: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" }, description: "Things this coach would say in the locker room and on the sideline" },
    halftimeAdjustments: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
  },
  required: ["coachId", "overview", "scriptedPlays", "defensiveApproach", "coachingCues", "halftimeAdjustments"],
  additionalProperties: false,
};

export const coachStyleRouter = router({
  listCoaches: protectedProcedure.query(() => COACH_STYLES),

  generate: protectedProcedure
    .input(z.object({ sessionId: z.number(), coachId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await db.getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const report = await db.getReportBySession(input.sessionId);
      if (!report) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Scouting report must complete first" });

      const coach = COACH_STYLES.find(c => c.id === input.coachId);
      if (!coach) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown coach style" });

      const response = await invokeLLM({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `You are generating a basketball game plan EXACTLY as ${coach.name} would coach it. Deeply embody their system, terminology, and philosophy. Use their actual signature plays and concepts. Make it feel like it came from their playbook.`,
          },
          {
            role: "user",
            content: `Generate a game plan against ${session.opponentName} in the style of ${coach.name} (${coach.team}, ${coach.era}).

COACH PHILOSOPHY: ${coach.philosophy}

SIGNATURE CONCEPTS: ${coach.signature.join(", ")}

SCOUTING REPORT ON ${session.opponentName}:
${report.executiveSummary}

THEIR OFFENSE: ${report.offenseAnalysis}
THEIR DEFENSE: ${report.defenseAnalysis}
SPECIAL SITUATIONS: ${report.specialSituations}
WEAKNESSES TO EXPLOIT: ${report.mistakes}

Generate plays using ${coach.name}'s actual system. Include their coaching voice in the cues.`,
          },
        ],
        max_tokens: 12000,
        response_format: {
          type: "json_schema",
          json_schema: { name: "coach_style_plan", strict: true, schema: COACH_PLAN_SCHEMA },
        },
      });

      const raw = response.choices[0]?.message?.content;
      const plan = JSON.parse(typeof raw === "string" ? raw : "{}");
      return { ...plan, coachId: input.coachId };
    }),
});

