import { describe, it, expect } from "vitest";

/** Mirrors the shot filtering predicate used by the Shot Chart page + getStats. */
function filterShots(
  shots: { player?: string; quarter?: number; made: boolean; zone: string }[],
  filters: { player?: string; quarter?: number }
) {
  return shots.filter(s => {
    if (filters.player && (s.player ?? "Team") !== filters.player) return false;
    if (filters.quarter && (s.quarter ?? 1) !== filters.quarter) return false;
    return true;
  });
}

function summarize(shots: { made: boolean; zone: string }[]) {
  const total = shots.length;
  const made = shots.filter(s => s.made).length;
  return { total, made, missed: total - made, pct: total > 0 ? Math.round((made / total) * 100) : 0 };
}

/** Mirrors the SRT timestamp helper used for Lakers overlay burn-in titles. */
function toSrtTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s},000`;
}

const SHOTS = [
  { player: "Marcus", quarter: 1, made: true, zone: "paint" },
  { player: "Marcus", quarter: 2, made: false, zone: "top3" },
  { player: "Devin", quarter: 1, made: true, zone: "corner3L" },
  { player: undefined, quarter: undefined, made: false, zone: "midL" },
];

describe("shot chart filtering", () => {
  it("returns every shot when no filters are applied", () => {
    expect(filterShots(SHOTS, {})).toHaveLength(4);
  });

  it("filters by player name", () => {
    const filtered = filterShots(SHOTS, { player: "Marcus" });
    expect(filtered).toHaveLength(2);
    expect(filtered.every(s => s.player === "Marcus")).toBe(true);
  });

  it("treats unnamed shots as Team", () => {
    expect(filterShots(SHOTS, { player: "Team" })).toHaveLength(1);
  });

  it("filters by quarter and defaults missing quarters to Q1", () => {
    expect(filterShots(SHOTS, { quarter: 1 })).toHaveLength(3);
    expect(filterShots(SHOTS, { quarter: 2 })).toHaveLength(1);
  });

  it("combines player and quarter filters", () => {
    expect(filterShots(SHOTS, { player: "Marcus", quarter: 2 })).toHaveLength(1);
    expect(filterShots(SHOTS, { player: "Devin", quarter: 2 })).toHaveLength(0);
  });

  it("recomputes percentages against the filtered set", () => {
    expect(summarize(filterShots(SHOTS, { player: "Marcus" }))).toEqual({ total: 2, made: 1, missed: 1, pct: 50 });
    expect(summarize(filterShots(SHOTS, { player: "Devin" }))).toEqual({ total: 1, made: 1, missed: 0, pct: 100 });
  });

  it("returns zero percent for an empty filtered set", () => {
    expect(summarize(filterShots(SHOTS, { player: "Nobody" })).pct).toBe(0);
  });
});

describe("lakers overlay export", () => {
  it("formats SRT timestamps for burn-in titles", () => {
    expect(toSrtTimestamp(0)).toBe("00:00:00,000");
    expect(toSrtTimestamp(65)).toBe("00:01:05,000");
    expect(toSrtTimestamp(3725)).toBe("01:02:05,000");
  });

  it("never emits negative timestamps", () => {
    expect(toSrtTimestamp(-10)).toBe("00:00:00,000");
  });
});
