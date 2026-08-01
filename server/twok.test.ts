import { describe, expect, it } from "vitest";
import {
  COACH_BADGES,
  PLAYER_BADGES,
  TENDENCY_KEYS,
  ATTRIBUTE_KEYS,
  HOT_ZONES,
  XP_REWARDS,
  levelFromXp,
  levelProgress,
  rarityFromOverall,
  xpForLevel,
  RARITY_STYLES,
  POSITION_COLORS,
} from "../shared/twok";

describe("2K progression math", () => {
  it("starts every coach at level 1 with zero XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(xpForLevel(1)).toBe(0);
  });

  it("increases XP requirements monotonically as levels climb", () => {
    for (let lvl = 2; lvl <= 20; lvl++) {
      expect(xpForLevel(lvl)).toBeGreaterThan(xpForLevel(lvl - 1));
    }
  });

  it("levels a coach up once they cross the threshold", () => {
    const l5 = xpForLevel(5);
    expect(levelFromXp(l5)).toBe(5);
    expect(levelFromXp(l5 - 1)).toBe(4);
  });

  it("caps progression at level 50", () => {
    expect(levelFromXp(50_000_000)).toBe(50);
  });

  it("reports progress within the current level as a 0-100 percentage", () => {
    const p = levelProgress(xpForLevel(6));
    expect(p.level).toBe(6);
    expect(p.pct).toBe(0);
    expect(p.into).toBe(0);
    expect(p.needed).toBeGreaterThan(0);

    const mid = levelProgress(Math.floor((xpForLevel(6) + xpForLevel(7)) / 2));
    expect(mid.pct).toBeGreaterThan(35);
    expect(mid.pct).toBeLessThan(65);
  });

  it("never lets percentage escape 0-100", () => {
    for (const xp of [0, 1, 500, 12_345, 999_999]) {
      const p = levelProgress(xp);
      expect(p.pct).toBeGreaterThanOrEqual(0);
      expect(p.pct).toBeLessThanOrEqual(100);
    }
  });
});

describe("card rarity tiers", () => {
  it("maps overall ratings to the right 2K rarity", () => {
    expect(rarityFromOverall(95)).toBe("diamond");
    expect(rarityFromOverall(90)).toBe("diamond");
    expect(rarityFromOverall(89)).toBe("gold");
    expect(rarityFromOverall(80)).toBe("gold");
    expect(rarityFromOverall(79)).toBe("silver");
    expect(rarityFromOverall(70)).toBe("silver");
    expect(rarityFromOverall(69)).toBe("bronze");
    expect(rarityFromOverall(40)).toBe("bronze");
  });

  it("has a style token for every rarity tier", () => {
    for (const tier of ["bronze", "silver", "gold", "diamond"] as const) {
      expect(RARITY_STYLES[tier]).toBeDefined();
      expect(RARITY_STYLES[tier].ring).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("2K rating catalogs", () => {
  it("defines a full tendency and attribute set", () => {
    expect(TENDENCY_KEYS.length).toBeGreaterThanOrEqual(10);
    expect(ATTRIBUTE_KEYS.length).toBeGreaterThanOrEqual(6);
  });

  it("covers the whole half court with hot zones", () => {
    expect(HOT_ZONES.length).toBeGreaterThanOrEqual(7);
    const ids = HOT_ZONES.map(z => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every position a card color", () => {
    for (const pos of ["PG", "SG", "SF", "PF", "C"]) {
      expect(POSITION_COLORS[pos]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("uses unique ids for player and coach badges", () => {
    const playerIds = PLAYER_BADGES.map(b => b.id);
    expect(new Set(playerIds).size).toBe(playerIds.length);
    const coachIds = COACH_BADGES.map(b => b.id);
    expect(new Set(coachIds).size).toBe(coachIds.length);
  });

  it("ties every coach badge to a real tracked stat with a positive threshold", () => {
    const validStats = new Set([
      "filmsAnalyzed",
      "plansGenerated",
      "challengesWon",
      "playsDesigned",
      "predictionsLogged",
    ]);
    for (const badge of COACH_BADGES) {
      expect(validStats.has(badge.stat)).toBe(true);
      expect(badge.threshold).toBeGreaterThan(0);
      expect(badge.label.length).toBeGreaterThan(0);
      expect(badge.desc.length).toBeGreaterThan(0);
    }
  });

  it("rewards film analysis more than a single quiz answer", () => {
    expect(XP_REWARDS.filmAnalyzed).toBeGreaterThan(XP_REWARDS.challengeCorrect);
    for (const value of Object.values(XP_REWARDS)) {
      expect(value).toBeGreaterThan(0);
    }
  });
});
