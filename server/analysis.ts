import { invokeLLM } from "./_core/llm";
import * as db from "./db";

export type Highlight = {
  timestamp: string;
  seconds: number;
  title: string;
  note: string;
  category: "offense" | "defense" | "special" | "mistake";
  verdict: "good" | "bad";
};

/** Estimate video duration from YouTube title via noembed (same heuristic as the football app). */
async function estimateVideoDuration(youtubeVideoId?: string | null): Promise<{ seconds: number; title: string }> {
  let title = "";
  if (youtubeVideoId) {
    try {
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeVideoId}`);
      const data = (await res.json()) as { title?: string };
      title = data.title || "";
    } catch {
      // ignore network failures, fall through to defaults
    }
  }
  const t = title.toLowerCase();
  if (t.includes("full game") || t.includes("full match")) return { seconds: 5400, title };
  if (t.includes("highlight")) return { seconds: 600, title };
  if (t.includes("broadcast") || t.includes("replay")) return { seconds: 1800, title };
  return { seconds: 1200, title };
}

function fmtTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const REPORT_SCHEMA = {
  type: "object" as const,
  properties: {
    executive_summary: { type: "string", description: "3-4 paragraph executive summary of the opponent team" },
    offense_analysis: {
      type: "string",
      description:
        "Detailed markdown analysis of the opponent's offense: half-court sets (horns, 5-out, motion, flex), pick-and-roll usage and coverage attacks, transition frequency and pace, primary scoring options, shot profile (3PT rate, rim rate, mid-range), spacing principles",
    },
    defense_analysis: {
      type: "string",
      description:
        "Detailed markdown analysis of the opponent's defense: base scheme (man-to-man, 2-3 zone, 3-2, 1-3-1, switching), pick-and-roll coverages (drop, hedge, blitz, switch), full-court or half-court press usage, help rotations, rebounding discipline, closeout habits",
    },
    special_situations: {
      type: "string",
      description:
        "Markdown analysis of special situations: after-timeout (ATO) plays, baseline out-of-bounds (BLOB) and sideline out-of-bounds (SLOB) sets, press break, late-clock offense, end-of-quarter execution, free-throw situations",
    },
    mistakes: {
      type: "string",
      description: "Markdown breakdown of recurring mistakes and exploitable weaknesses: turnovers, poor transition defense, weak-side rebounding lapses, foul-prone defenders, cold shooters",
    },
    predictions: {
      type: "string",
      description: "Markdown strategy predictions: what they will likely run against us, recommended counters, keys to victory, tempo strategy",
    },
    highlights: {
      type: "array",
      description: "8-10 key film moments distributed evenly across the video duration",
      items: {
        type: "object",
        properties: {
          seconds: { type: "integer", description: "Timestamp in seconds into the video" },
          title: { type: "string", description: "Short title of the moment" },
          note: { type: "string", description: "2-3 sentence coaching note about what happens and why it matters" },
          category: { type: "string", enum: ["offense", "defense", "special", "mistake"] },
          verdict: { type: "string", enum: ["good", "bad"] },
        },
        required: ["seconds", "title", "note", "category", "verdict"],
        additionalProperties: false,
      },
    },
  },
  required: ["executive_summary", "offense_analysis", "defense_analysis", "special_situations", "mistakes", "predictions", "highlights"],
  additionalProperties: false,
};

/**
 * Async report generation triggered after session creation — the same
 * process as the football app, adapted to basketball scouting.
 */
export async function generateReport(sessionId: number): Promise<void> {
  try {
    const session = await db.getSession(sessionId);
    if (!session) throw new Error("Session not found");

    const { seconds: duration, title } = await estimateVideoDuration(session.youtubeVideoId);

    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `You are an elite basketball scouting analyst with 20+ years of experience breaking down game film for high school, AAU, and college programs. You produce professional, detailed scouting reports that coaches can immediately use for game planning. Write in markdown with headers, bold key terms, and specific basketball terminology (PnR coverages, horns sets, BLOB/SLOB, drop coverage, ice, weak/strong side, dribble handoffs, Spain PnR, zone gaps).`,
        },
        {
          role: "user",
          content: `Generate a complete basketball scouting report for the opponent team "${session.opponentName}"${session.gameDate ? ` (game film dated ${session.gameDate})` : ""}.${title ? ` The film is titled: "${title}".` : ""}

The video is approximately ${Math.round(duration / 60)} minutes long (${duration} seconds). Distribute the 8-10 highlight timestamps evenly across the FULL duration from 0 to ${duration} seconds.

Base your analysis on realistic patterns for a competitive team at this level. Be specific with set names, tendencies, percentages, and player behaviors so the report reads like real film study. Cover offense (sets, PnR, transition, shot profile), defense (scheme, coverages, press), special situations (ATO/BLOB/SLOB/press break/late clock), recurring mistakes, and strategic predictions with recommended counters.`,
        },
      ],
      max_tokens: 12000,
      response_format: {
        type: "json_schema",
        json_schema: { name: "basketball_scouting_report", strict: true, schema: REPORT_SCHEMA },
      },
    });

    const raw = response.choices[0]?.message?.content;
    const content = typeof raw === "string" ? raw : "";
    const parsed = JSON.parse(content) as {
      executive_summary: string;
      offense_analysis: string;
      defense_analysis: string;
      special_situations: string;
      mistakes: string;
      predictions: string;
      highlights: Array<{ seconds: number; title: string; note: string; category: string; verdict: string }>;
    };

    const highlights: Highlight[] = (parsed.highlights || []).map(h => ({
      timestamp: fmtTimestamp(h.seconds),
      seconds: h.seconds,
      title: h.title,
      note: h.note,
      category: (h.category as Highlight["category"]) || "offense",
      verdict: (h.verdict as Highlight["verdict"]) || "good",
    }));

    await db.saveReport({
      sessionId,
      executiveSummary: parsed.executive_summary,
      offenseAnalysis: parsed.offense_analysis,
      defenseAnalysis: parsed.defense_analysis,
      specialSituations: parsed.special_situations,
      mistakes: parsed.mistakes,
      predictions: parsed.predictions,
      highlights,
    });

    await db.updateSessionStatus(sessionId, "complete");
  } catch (error) {
    console.error(`[Analysis] Report generation failed for session ${sessionId}:`, error);
    await db.updateSessionStatus(sessionId, "failed");
  }
}
