import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// Mock db and analysis modules before importing the router
vi.mock("./db", () => ({
  listSessions: vi.fn(),
  getSession: vi.fn(),
  createSession: vi.fn(),
  updateSessionStatus: vi.fn(),
  deleteSession: vi.fn(),
  getReportBySession: vi.fn(),
  saveReport: vi.fn(),
  listPlayersBySession: vi.fn(),
  getGamePlan: vi.fn(),
  saveGamePlan: vi.fn(),
  savePlayerProfiles: vi.fn(),
  getAnnotation: vi.fn(),
  saveAnnotation: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./analysis", () => ({
  generateReport: vi.fn().mockResolvedValue(undefined),
}));

import { appRouter } from "./routers";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCtx(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: "coach@example.com",
    name: "Coach",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sessions router", () => {
  it("lists sessions for the current user", async () => {
    const rows = [{ id: 1, userId: 1, opponentName: "Riverside Hawks", status: "complete" }];
    vi.mocked(db.listSessions).mockResolvedValue(rows as never);
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.sessions.list();
    expect(result).toEqual(rows);
    expect(db.listSessions).toHaveBeenCalledWith(1);
  });

  it("blocks access to another user's session", async () => {
    vi.mocked(db.getSession).mockResolvedValue({ id: 5, userId: 99, opponentName: "X", status: "complete" } as never);
    const caller = appRouter.createCaller(createCtx(1));
    await expect(caller.sessions.get({ id: 5 })).rejects.toThrow();
  });

  it("creates a YouTube session and kicks off analysis", async () => {
    vi.mocked(db.createSession).mockResolvedValue(10 as never);
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.sessions.create({
      opponentName: "Bayside Bulls",
      sourceType: "youtube",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(result.id).toBe(10);
    expect(db.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        opponentName: "Bayside Bulls",
        youtubeVideoId: "dQw4w9WgXcQ",
        status: "analyzing",
      })
    );
  });

  it("rejects youtube session without a valid URL", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.sessions.create({
        opponentName: "Bad URL Team",
        sourceType: "youtube",
        youtubeUrl: "not-a-url",
      })
    ).rejects.toThrow();
  });
});

describe("reports router", () => {
  it("returns the report for the owner", async () => {
    vi.mocked(db.getSession).mockResolvedValue({ id: 3, userId: 1 } as never);
    vi.mocked(db.getReportBySession).mockResolvedValue({ id: 7, sessionId: 3, executiveSummary: "They run horns." } as never);
    const caller = appRouter.createCaller(createCtx());
    const report = await caller.reports.getBySession({ sessionId: 3 });
    expect(report.executiveSummary).toContain("horns");
  });

  it("404s when report is not ready", async () => {
    vi.mocked(db.getSession).mockResolvedValue({ id: 3, userId: 1 } as never);
    vi.mocked(db.getReportBySession).mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.reports.getBySession({ sessionId: 3 })).rejects.toThrow();
  });
});

describe("gamePlan router", () => {
  it("returns null when no plan exists", async () => {
    vi.mocked(db.getSession).mockResolvedValue({ id: 3, userId: 1 } as never);
    vi.mocked(db.getGamePlan).mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(createCtx());
    const plan = await caller.gamePlan.get({ sessionId: 3 });
    expect(plan).toBeNull();
  });

  it("returns the stored plan JSON", async () => {
    vi.mocked(db.getSession).mockResolvedValue({ id: 3, userId: 1 } as never);
    vi.mocked(db.getGamePlan).mockResolvedValue({ plan: { overview: "Push pace", scriptedPlays: [] } } as never);
    const caller = appRouter.createCaller(createCtx());
    const plan = (await caller.gamePlan.get({ sessionId: 3 })) as { overview: string };
    expect(plan.overview).toBe("Push pace");
  });
});
