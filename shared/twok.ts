/** Shared 2K-style constants for player DNA, badges, and coach progression. */

export const TENDENCY_KEYS = [
  "driveLeft",
  "driveRight",
  "pullUpMid",
  "pullUpThree",
  "spotUpThree",
  "catchAndShoot",
  "postFade",
  "postHook",
  "passUnderPressure",
  "ballSecurity",
  "onBallDefense",
  "transitionPush",
] as const;

export type TendencyKey = (typeof TENDENCY_KEYS)[number];

export const TENDENCY_LABELS: Record<TendencyKey, string> = {
  driveLeft: "Drive Left",
  driveRight: "Drive Right",
  pullUpMid: "Pull-Up Mid",
  pullUpThree: "Pull-Up 3",
  spotUpThree: "Spot-Up 3",
  catchAndShoot: "Catch & Shoot",
  postFade: "Post Fade",
  postHook: "Post Hook",
  passUnderPressure: "Pass Under Pressure",
  ballSecurity: "Ball Security",
  onBallDefense: "On-Ball Defense",
  transitionPush: "Transition Push",
};

export const ATTRIBUTE_KEYS = [
  "threePoint",
  "driving",
  "playmaking",
  "perimeterDefense",
  "interiorDefense",
  "rebounding",
  "basketballIq",
  "athleticism",
] as const;

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  threePoint: "3PT Shooting",
  driving: "Driving",
  playmaking: "Playmaking",
  perimeterDefense: "Perimeter D",
  interiorDefense: "Interior D",
  rebounding: "Rebounding",
  basketballIq: "Basketball IQ",
  athleticism: "Athleticism",
};

/** The 7 half-court zones used for the hot/cold shot chart. */
export const HOT_ZONES = [
  { id: "leftCorner3", label: "Left Corner 3" },
  { id: "leftWing3", label: "Left Wing 3" },
  { id: "top3", label: "Top of Key 3" },
  { id: "rightWing3", label: "Right Wing 3" },
  { id: "rightCorner3", label: "Right Corner 3" },
  { id: "midRange", label: "Mid-Range" },
  { id: "paint", label: "Paint / Rim" },
] as const;

export type HotZoneId = (typeof HOT_ZONES)[number]["id"];

/** Opponent player badges, 2K style. */
export const PLAYER_BADGES = [
  { id: "hotZoneShooter", label: "Hot Zone Shooter", icon: "flame", desc: "Elite from his sweet spots — never leave him there." },
  { id: "clamps", label: "Clamps", icon: "shield", desc: "Lockdown on-ball defender. Screen him off the ball." },
  { id: "catchAndShoot", label: "Catch & Shoot", icon: "target", desc: "Deadly off screens. Deny the catch." },
  { id: "slithery", label: "Slithery", icon: "zap", desc: "Gets to the rim through traffic. Wall up early." },
  { id: "floorGeneral", label: "Floor General", icon: "brain", desc: "Elite passer under pressure. Pressure the outlet." },
  { id: "deadeye", label: "Deadeye", icon: "crosshair", desc: "Unbothered by a hand in his face." },
  { id: "postAnchor", label: "Post Anchor", icon: "anchor", desc: "Owns the paint. Send early help." },
  { id: "clutchGene", label: "Clutch Gene", icon: "trophy", desc: "Rises in the 4th. Take the ball out of his hands." },
  { id: "glassCleaner", label: "Glass Cleaner", icon: "layers", desc: "Crashes every board. Box out on the weak side." },
  { id: "greenLight", label: "Green Light", icon: "circle-dot", desc: "Shoots it from anywhere. Pick him up early." },
] as const;

export type PlayerBadgeId = (typeof PLAYER_BADGES)[number]["id"];

/** Coach progression badges earned through app usage. */
export const COACH_BADGES = [
  { id: "filmRat", label: "Film Rat", desc: "Analyzed 5 game films", icon: "clapperboard", threshold: 5, stat: "filmsAnalyzed" },
  { id: "filmJunkie", label: "Film Junkie", desc: "Analyzed 20 game films", icon: "film", threshold: 20, stat: "filmsAnalyzed" },
  { id: "playDesigner", label: "Play Designer", desc: "Designed 3 plays in the Play Designer", icon: "pen-tool", threshold: 3, stat: "playsDesigned" },
  { id: "playbookMaster", label: "Playbook Master", desc: "Designed 10 plays", icon: "book-open", threshold: 10, stat: "playsDesigned" },
  { id: "defensiveMastermind", label: "Defensive Mastermind", desc: "Generated 5 game plans", icon: "shield-check", threshold: 5, stat: "plansGenerated" },
  { id: "chalkboardGeneral", label: "Chalkboard General", desc: "Generated 15 game plans", icon: "presentation", threshold: 15, stat: "plansGenerated" },
  { id: "quizSharp", label: "Quiz Sharp", desc: "Won 10 Scouting Challenge questions", icon: "brain", threshold: 10, stat: "challengesWon" },
  { id: "hoopIq", label: "Hoop IQ Elite", desc: "Won 40 Scouting Challenge questions", icon: "graduation-cap", threshold: 40, stat: "challengesWon" },
  { id: "prophet", label: "The Prophet", desc: "Logged 5 post-game results", icon: "eye", threshold: 5, stat: "predictionsLogged" },
] as const;

export type CoachBadgeId = (typeof COACH_BADGES)[number]["id"];

export const XP_REWARDS = {
  filmAnalyzed: 500,
  gamePlanGenerated: 300,
  challengeCorrect: 100,
  playDesigned: 250,
  attackPackage: 200,
  coachStylePlan: 200,
  resultLogged: 150,
} as const;

/** XP needed to reach a given level (quadratic curve like 2K). */
export function xpForLevel(level: number): number {
  return Math.round(500 * Math.pow(level - 1, 1.6));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < 50 && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const pct = ceil > floor ? Math.min(100, Math.round(((xp - floor) / (ceil - floor)) * 100)) : 100;
  return { level, floor, ceil, pct, into: xp - floor, needed: ceil - floor };
}

export function rarityFromOverall(overall: number): "bronze" | "silver" | "gold" | "diamond" {
  if (overall >= 90) return "diamond";
  if (overall >= 80) return "gold";
  if (overall >= 70) return "silver";
  return "bronze";
}

export const RARITY_STYLES = {
  bronze: { label: "Bronze", ring: "#B87333", glow: "rgba(184,115,51,0.35)", text: "#E0A96D" },
  silver: { label: "Silver", ring: "#C0C6CE", glow: "rgba(192,198,206,0.35)", text: "#DCE3EA" },
  gold: { label: "Gold", ring: "#FFC53D", glow: "rgba(255,197,61,0.45)", text: "#FFD666" },
  diamond: { label: "Diamond", ring: "#7DE2FC", glow: "rgba(125,226,252,0.55)", text: "#B8F1FF" },
} as const;

export const POSITION_COLORS: Record<string, string> = {
  PG: "#3B82F6",
  SG: "#22C55E",
  SF: "#FF7A1A",
  PF: "#EF4444",
  C: "#A855F7",
};
