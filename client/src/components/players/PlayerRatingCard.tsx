import { motion } from "framer-motion";

/**
 * NBA2K-style player rating card — the basketball equivalent of the
 * football app's Madden-style PlayerRatingCard. OVR derived from threat
 * level, attribute bars derived deterministically from profile content.
 */

type Tendency = { action: string; frequency: string; situation: string };

type PlayerProfileData = {
  id: number;
  playerNumber: number | null;
  playerName: string;
  position: string | null;
  tendencies: unknown;
  strengths: string | null;
  weaknesses: string | null;
  threatLevel: "low" | "medium" | "high" | "elite";
  notes: string | null;
};

const THREAT_OVR: Record<string, number> = { low: 68, medium: 78, high: 87, elite: 94 };
const THREAT_COLOR: Record<string, string> = {
  low: "#9CA3AF",
  medium: "#60A5FA",
  high: "#FF7A1A",
  elite: "#FFD700",
};
const THREAT_LABEL: Record<string, string> = {
  low: "ROLE PLAYER",
  medium: "STARTER",
  high: "GO-TO GUY",
  elite: "SUPERSTAR",
};

// Deterministic hash so attribute bars are stable per player
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function deriveAttributes(p: PlayerProfileData): Array<{ label: string; value: number }> {
  const base = THREAT_OVR[p.threatLevel];
  const seed = hashString(p.playerName + (p.playerNumber ?? ""));
  const jitter = (i: number, range: number) => ((seed >> (i * 3)) % (range * 2 + 1)) - range;
  const text = `${p.strengths || ""} ${p.notes || ""}`.toLowerCase();

  const boost = (keywords: string[]) => (keywords.some(k => text.includes(k)) ? 5 : 0);

  const attrs = [
    { label: "3PT Shot", value: base + jitter(0, 6) + boost(["three", "3-point", "shooter", "catch and shoot", "corner 3"]) },
    { label: "Driving", value: base + jitter(1, 6) + boost(["drive", "slash", "rim", "attack"]) },
    { label: "Playmaking", value: base + jitter(2, 6) + boost(["pass", "assist", "playmak", "vision", "pick and roll"]) },
    { label: "Perimeter D", value: base + jitter(3, 7) + boost(["on-ball", "steal", "perimeter defen", "lockdown"]) },
    { label: "Rebounding", value: base + jitter(4, 7) + boost(["rebound", "glass", "box out", "putback"]) },
    { label: "Basketball IQ", value: base + jitter(5, 5) + boost(["smart", "iq", "decision", "reads"]) },
  ];
  return attrs.map(a => ({ ...a, value: Math.max(55, Math.min(99, a.value)) }));
}

function barColor(value: number): string {
  if (value >= 90) return "#FFD700";
  if (value >= 82) return "#FF7A1A";
  if (value >= 74) return "#60A5FA";
  return "#9CA3AF";
}

export default function PlayerRatingCard({ player, index }: { player: PlayerProfileData; index: number }) {
  const ovr = THREAT_OVR[player.threatLevel];
  const color = THREAT_COLOR[player.threatLevel];
  const attributes = deriveAttributes(player);
  const tendencies = (player.tendencies as Tendency[]) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl overflow-hidden border bg-card"
      style={{ borderColor: `${color}55` }}
    >
      {/* Card header */}
      <div className="p-4 flex items-center gap-4" style={{ background: `linear-gradient(135deg, ${color}22, transparent)` }}>
        <div
          className="w-16 h-16 rounded-lg flex flex-col items-center justify-center shrink-0 border"
          style={{ borderColor: color, background: "#0d1117" }}
        >
          <span className="text-2xl font-bold leading-none" style={{ color }}>{ovr}</span>
          <span className="text-[9px] font-bold text-muted-foreground tracking-wider">OVR</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {player.playerNumber != null && (
              <span className="text-sm font-mono font-bold" style={{ color }}>#{player.playerNumber}</span>
            )}
            <h3 className="font-bold truncate">{player.playerName}</h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary font-mono">{player.position || "?"}</span>
            <span className="text-[10px] font-bold tracking-wider" style={{ color }}>{THREAT_LABEL[player.threatLevel]}</span>
          </div>
        </div>
      </div>

      {/* Attribute bars */}
      <div className="px-4 pb-3 pt-2 grid grid-cols-2 gap-x-4 gap-y-2">
        {attributes.map(attr => (
          <div key={attr.label}>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-muted-foreground">{attr.label}</span>
              <span className="font-mono font-bold" style={{ color: barColor(attr.value) }}>{attr.value}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: barColor(attr.value) }}
                initial={{ width: 0 }}
                animate={{ width: `${attr.value}%` }}
                transition={{ delay: 0.3 + index * 0.08, duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tendencies */}
      {tendencies.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Tendencies</div>
          <div className="space-y-1.5">
            {tendencies.slice(0, 3).map((t, i) => (
              <div key={i} className="text-xs bg-secondary/50 rounded px-2 py-1.5">
                <span className="font-medium">{t.action}</span>
                <span className="text-muted-foreground"> — {t.frequency}, {t.situation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scout notes */}
      <div className="px-4 pb-4 grid gap-2">
        {player.strengths && (
          <div className="text-xs">
            <span className="text-green-400 font-bold">+ </span>
            <span className="text-muted-foreground">{player.strengths}</span>
          </div>
        )}
        {player.weaknesses && (
          <div className="text-xs">
            <span className="text-red-400 font-bold">− </span>
            <span className="text-muted-foreground">{player.weaknesses}</span>
          </div>
        )}
        {player.notes && (
          <div className="text-xs rounded-lg border border-primary/20 bg-primary/5 p-2 mt-1">
            <span className="text-primary font-bold text-[10px] uppercase tracking-wider block mb-0.5">How to Guard</span>
            <span className="text-foreground/80">{player.notes}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
