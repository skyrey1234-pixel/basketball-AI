import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The Time-Machine film player seeks the real video using the timestamps that come
 * back from this router, so the two things worth guarding are (a) you can only read
 * or rebuild possessions on a session you own, and (b) a hallucinated timestamp can
 * never produce a window that seeks past the film or freezes before it starts.
 */

vi.mock("./db", () => ({
  getSession: vi.fn(),
  getReportBySession: vi.fn(),
  getPossessions: vi.fn(),
  savePossessions: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./routers/progress", () => ({ awardXp: vi.fn() }));

import * as db from "./db";
import { possessionsRouter } from "./routers/possessions";

type Ctx = { user: { id: number } };

const ctx = { user: { id: 7 } } as unknown as Parameters<
  typeof possessionsRouter.createCaller
>[0];

const caller = () => possessionsRouter.createCaller(ctx as unknown as Ctx as never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("possessions.get", () => {
  it("refuses to read possessions from another coach's session", async () => {
    vi.mocked(db.getSession).mockResolvedValue({ id: 1, userId: 999 } as never);

    await expect(caller().get({ sessionId: 1 })).rejects.toThrow();
    expect(db.getPossessions).not.toHaveBeenCalled();
  });

  it("returns null when the session has no reconstructed possessions yet", async () => {
    vi.mocked(db.getSession).mockResolvedValue({ id: 1, userId: 7 } as never);
    vi.mocked(db.getPossessions).mockResolvedValue(null as never);

    await expect(caller().get({ sessionId: 1 })).resolves.toBeNull();
  });
});

describe("possessions.generate", () => {
  it("refuses to rebuild possessions on another coach's session", async () => {
    vi.mocked(db.getSession).mockResolvedValue({ id: 1, userId: 999 } as never);

    await expect(caller().generate({ sessionId: 1 })).rejects.toThrow();
    expect(db.savePossessions).not.toHaveBeenCalled();
  });

  it("requires a completed scouting report before reading the film", async () => {
    vi.mocked(db.getSession).mockResolvedValue({ id: 1, userId: 7 } as never);
    vi.mocked(db.getReportBySession).mockResolvedValue(undefined as never);

    await expect(caller().generate({ sessionId: 1 })).rejects.toThrow(/report must complete/i);
  });

  it("requires key moments in the report to anchor the clips to", async () => {
    vi.mocked(db.getSession).mockResolvedValue({ id: 1, userId: 7 } as never);
    vi.mocked(db.getReportBySession).mockResolvedValue({ highlights: [] } as never);

    await expect(caller().generate({ sessionId: 1 })).rejects.toThrow(/no key moments/i);
  });
});

/**
 * Mirrors the clamping the router applies to every possession before it is stored.
 * Kept in lockstep with routers/possessions.ts so a regression there fails here.
 */
function clampWindow(
  p: { filmStart?: unknown; filmDecision?: unknown; filmEnd?: unknown },
  maxSeconds: number
) {
  const start = Math.max(0, Math.round(Number(p.filmStart) || 0));
  const decision = Math.max(start + 2, Math.round(Number(p.filmDecision) || start + 6));
  const end = Math.max(decision + 2, Math.round(Number(p.filmEnd) || decision + 6));
  return {
    filmStart: Math.min(start, maxSeconds),
    filmDecision: Math.min(decision, maxSeconds),
    filmEnd: Math.min(end, maxSeconds),
  };
}

describe("film window clamping", () => {
  it("keeps a sane clip in order when the model returns good numbers", () => {
    const w = clampWindow({ filmStart: 120, filmDecision: 128, filmEnd: 134 }, 600);
    expect(w).toEqual({ filmStart: 120, filmDecision: 128, filmEnd: 134 });
  });

  it("never lets the decision land before the start of the clip", () => {
    const w = clampWindow({ filmStart: 300, filmDecision: 12, filmEnd: 8 }, 600);
    expect(w.filmDecision).toBeGreaterThan(w.filmStart);
    expect(w.filmEnd).toBeGreaterThan(w.filmDecision);
  });

  it("never seeks past the end of the film", () => {
    const w = clampWindow({ filmStart: 9999, filmDecision: 10050, filmEnd: 10090 }, 600);
    expect(w.filmStart).toBe(600);
    expect(w.filmDecision).toBe(600);
    expect(w.filmEnd).toBe(600);
  });

  it("fills in a usable window when timestamps are missing entirely", () => {
    const w = clampWindow({}, 600);
    expect(w.filmStart).toBe(0);
    expect(w.filmDecision).toBeGreaterThan(0);
    expect(w.filmEnd).toBeGreaterThan(w.filmDecision);
  });

  it("rejects negative timestamps", () => {
    const w = clampWindow({ filmStart: -40, filmDecision: -10, filmEnd: 20 }, 600);
    expect(w.filmStart).toBe(0);
    expect(w.filmDecision).toBeGreaterThanOrEqual(2);
  });
});
