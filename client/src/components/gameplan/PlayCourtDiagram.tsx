import { useMemo, useState, useEffect, useRef, useCallback } from "react";

/**
 * Animated half-court play diagram — the basketball equivalent of the
 * football app's Madden-style FormationDiagram. Offense = orange circles
 * with position labels, defense = red X marks. Routes animate over 2.5s
 * with Run Play / Reset controls: solid = cut, dashed = screen, dotted = dribble.
 */

interface PlayerPos {
  x: number;
  y: number;
  label: string;
  side: "offense" | "defense";
  route?: { points: [number, number][]; type: "cut" | "screen" | "dribble" };
}

interface PlayCourtDiagramProps {
  set: string;
  playName: string;
  playType: string;
  target?: string;
  compact?: boolean;
  defenseScheme?: string;
}

// Court geometry (viewBox 0 0 100 85): baseline at top, hoop at (50, 9)
const HOOP = { x: 50, y: 9 };

// ===== OFFENSIVE SETS =====
function getOffensivePlayers(set: string, playType: string, target?: string): PlayerPos[] {
  const s = set.toLowerCase();
  const players: PlayerPos[] = [];
  const tgt = (target || "").toUpperCase();

  // Base spots per set (x, y) — top of key ~ y 55, wings ~ y 40, corners ~ y 14
  let spots: Record<string, [number, number]>;
  if (s.includes("horns")) {
    spots = { PG: [50, 60], SG: [12, 16], SF: [88, 16], PF: [36, 32], C: [64, 32] };
  } else if (s.includes("5-out") || s.includes("5 out")) {
    spots = { PG: [50, 62], SG: [18, 48], SF: [82, 48], PF: [10, 18], C: [90, 18] };
  } else if (s.includes("4-out") || s.includes("4 out")) {
    spots = { PG: [50, 62], SG: [16, 46], SF: [84, 46], PF: [80, 16], C: [42, 20] };
  } else if (s.includes("box")) {
    spots = { PG: [50, 64], SG: [38, 18], SF: [62, 18], PF: [38, 38], C: [62, 38] };
  } else if (s.includes("stack")) {
    spots = { PG: [50, 64], SG: [58, 22], SF: [58, 30], PF: [58, 38], C: [58, 14] };
  } else if (s.includes("1-4") || s.includes("1 4")) {
    spots = { PG: [50, 62], SG: [14, 34], SF: [86, 34], PF: [38, 32], C: [62, 32] };
  } else {
    // motion / default 3-out 2-in
    spots = { PG: [50, 60], SG: [16, 42], SF: [84, 42], PF: [34, 22], C: [66, 22] };
  }

  const pt = playType.toLowerCase();
  for (const pos of ["PG", "SG", "SF", "PF", "C"] as const) {
    const [x, y] = spots[pos];
    let route: PlayerPos["route"];
    const isTarget = tgt === pos;

    if (pt.includes("pnr")) {
      if (pos === "PG") route = { points: [[x + 8, y - 10], [x + 14, y - 22]], type: "dribble" };
      else if (pos === "C") route = { points: [[50, 52], [56, 30], [HOOP.x + 2, HOOP.y + 8]], type: "screen" };
      else if (isTarget) route = { points: [[x > 50 ? x + 2 : x - 2, y - 14]], type: "cut" };
      else if (pos === "SG") route = { points: [[x - 4, y - 18]], type: "cut" };
    } else if (pt.includes("iso")) {
      if (isTarget || (!tgt && pos === "PG")) route = { points: [[x, y - 14], [x + (x > 50 ? -8 : 8), y - 26]], type: "dribble" };
      else route = { points: [[x > 50 ? Math.min(x + 6, 92) : Math.max(x - 6, 8), y - 4]], type: "cut" };
    } else if (pt.includes("post")) {
      if (pos === "C" || isTarget) route = { points: [[x > 50 ? 62 : 38, 20], [x > 50 ? 58 : 42, 14]], type: "cut" };
      else if (pos === "PG") route = { points: [[x - 10, y - 4]], type: "dribble" };
      else route = { points: [[x, y - 8]], type: "cut" };
    } else if (pt.includes("offball")) {
      if (isTarget || pos === "SG") route = { points: [[50, 30], [x > 50 ? 20 : 80, 18]], type: "cut" };
      else if (pos === "PF") route = { points: [[46, 28]], type: "screen" };
      else if (pos === "C") route = { points: [[54, 26]], type: "screen" };
    } else if (pt.includes("transition")) {
      if (pos === "PG") route = { points: [[50, 40], [50, 24]], type: "dribble" };
      else if (pos === "SG" || pos === "SF") route = { points: [[x > 50 ? 90 : 10, 14]], type: "cut" };
      else route = { points: [[x, y - 14], [50, HOOP.y + 8]], type: "cut" };
    } else {
      // catch & shoot / generic motion
      if (isTarget || pos === "SG") route = { points: [[x > 50 ? x - 16 : x + 16, y - 10], [x > 50 ? x - 10 : x + 10, y - 22]], type: "cut" };
      else if (pos === "C") route = { points: [[x - 8, y + 6]], type: "screen" };
      else if (pos === "PG") route = { points: [[x + 6, y - 6]], type: "dribble" };
    }

    players.push({ x, y, label: pos, side: "offense", route });
  }
  return players;
}

// ===== DEFENSIVE SCHEMES =====
function getDefensivePlayers(defenseScheme?: string): PlayerPos[] {
  const scheme = (defenseScheme || "man").toLowerCase();
  const players: PlayerPos[] = [];

  if (scheme.includes("2-3")) {
    [[38, 40], [62, 40], [24, 18], [50, 14], [76, 18]].forEach(([x, y], i) =>
      players.push({ x, y, label: `${i + 1}`, side: "defense" }));
  } else if (scheme.includes("3-2")) {
    [[50, 46], [28, 38], [72, 38], [36, 16], [64, 16]].forEach(([x, y], i) =>
      players.push({ x, y, label: `${i + 1}`, side: "defense" }));
  } else if (scheme.includes("1-3-1")) {
    [[50, 50], [26, 32], [50, 30], [74, 32], [50, 12]].forEach(([x, y], i) =>
      players.push({ x, y, label: `${i + 1}`, side: "defense" }));
  } else if (scheme.includes("press")) {
    [[36, 56], [64, 56], [50, 42], [30, 26], [70, 26]].forEach(([x, y], i) =>
      players.push({ x, y, label: `${i + 1}`, side: "defense" }));
  } else {
    // man-to-man: shadow typical offensive spots
    [[50, 52], [22, 38], [78, 38], [38, 24], [62, 24]].forEach(([x, y], i) =>
      players.push({ x, y, label: ["X1", "X2", "X3", "X4", "X5"][i], side: "defense" }));
  }
  return players;
}

// ===== PATH HELPERS (same math as the football app) =====
function buildRoutePath(startX: number, startY: number, points: [number, number][]): string {
  let path = `M ${startX} ${startY}`;
  for (const [px, py] of points) path += ` L ${px} ${py}`;
  return path;
}

function interpolateRoute(startX: number, startY: number, points: [number, number][], progress: number): { x: number; y: number } {
  if (progress <= 0 || points.length === 0) return { x: startX, y: startY };
  const allPoints: [number, number][] = [[startX, startY], ...points];
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < allPoints.length; i++) {
    const dx = allPoints[i][0] - allPoints[i - 1][0];
    const dy = allPoints[i][1] - allPoints[i - 1][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(len);
    totalLength += len;
  }
  const targetDist = progress * totalLength;
  let accumulated = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulated + segmentLengths[i] >= targetDist) {
      const segProgress = (targetDist - accumulated) / segmentLengths[i];
      return {
        x: allPoints[i][0] + (allPoints[i + 1][0] - allPoints[i][0]) * segProgress,
        y: allPoints[i][1] + (allPoints[i + 1][1] - allPoints[i][1]) * segProgress,
      };
    }
    accumulated += segmentLengths[i];
  }
  return { x: points[points.length - 1][0], y: points[points.length - 1][1] };
}

function buildPartialPath(startX: number, startY: number, points: [number, number][], progress: number): string {
  if (progress <= 0) return "";
  const allPoints: [number, number][] = [[startX, startY], ...points];
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < allPoints.length; i++) {
    const dx = allPoints[i][0] - allPoints[i - 1][0];
    const dy = allPoints[i][1] - allPoints[i - 1][1];
    segmentLengths.push(Math.sqrt(dx * dx + dy * dy));
    totalLength += segmentLengths[segmentLengths.length - 1];
  }
  const targetDist = progress * totalLength;
  let accumulated = 0;
  let path = `M ${allPoints[0][0]} ${allPoints[0][1]}`;
  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulated + segmentLengths[i] >= targetDist) {
      const segProgress = (targetDist - accumulated) / segmentLengths[i];
      const x = allPoints[i][0] + (allPoints[i + 1][0] - allPoints[i][0]) * segProgress;
      const y = allPoints[i][1] + (allPoints[i + 1][1] - allPoints[i][1]) * segProgress;
      path += ` L ${x} ${y}`;
      break;
    }
    path += ` L ${allPoints[i + 1][0]} ${allPoints[i + 1][1]}`;
    accumulated += segmentLengths[i];
  }
  return path;
}

// ===== MAIN COMPONENT =====
export function PlayCourtDiagram({ set, playName, playType, target, compact = false, defenseScheme }: PlayCourtDiagramProps) {
  const offensePlayers = useMemo(() => getOffensivePlayers(set, playType, target), [set, playType, target]);
  const defensePlayers = useMemo(() => getDefensivePlayers(defenseScheme), [defenseScheme]);

  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState(1);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const PLAY_DURATION = 2500;

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const p = Math.min(elapsed / PLAY_DURATION, 1);
    setProgress(p);
    if (p < 1) animFrameRef.current = requestAnimationFrame(animate);
    else setIsAnimating(false);
  }, []);

  const handlePlayToggle = useCallback(() => {
    if (isAnimating) {
      cancelAnimationFrame(animFrameRef.current);
      setIsAnimating(false);
    } else {
      setProgress(0);
      startTimeRef.current = 0;
      setIsAnimating(true);
      animFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isAnimating, animate]);

  const handleReset = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setIsAnimating(false);
    setProgress(1);
  }, []);

  useEffect(() => () => cancelAnimationFrame(animFrameRef.current), []);

  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  return (
    <div className={compact ? "w-[160px] h-[160px]" : "w-full max-w-[360px]"}>
      <svg viewBox="0 0 100 85" className="w-full rounded-md overflow-hidden" style={{ background: "#2b1608" }}>
        {/* Hardwood background */}
        <rect x="0" y="0" width="100" height="85" fill="#2b1608" />
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(x => (
          <rect key={x} x={x} y="0" width="5" height="85" fill="#331b0a" />
        ))}

        {/* Court lines */}
        {/* Baseline */}
        <line x1="4" y1="4" x2="96" y2="4" stroke="#c8834a" strokeWidth="0.5" />
        {/* Sidelines */}
        <line x1="4" y1="4" x2="4" y2="78" stroke="#c8834a" strokeWidth="0.5" />
        <line x1="96" y1="4" x2="96" y2="78" stroke="#c8834a" strokeWidth="0.5" />
        {/* Half-court line */}
        <line x1="4" y1="78" x2="96" y2="78" stroke="#c8834a" strokeWidth="0.5" />
        <path d="M 38 78 A 12 12 0 0 1 62 78" fill="none" stroke="#c8834a" strokeWidth="0.5" />
        {/* Paint / key */}
        <rect x="42" y="4" width="16" height="26" fill="#3a2210" stroke="#c8834a" strokeWidth="0.5" />
        {/* Free-throw circle */}
        <path d="M 42 30 A 8 8 0 0 0 58 30" fill="none" stroke="#c8834a" strokeWidth="0.5" />
        <path d="M 42 30 A 8 8 0 0 1 58 30" fill="none" stroke="#c8834a" strokeWidth="0.5" strokeDasharray="2,1.5" />
        {/* 3-point arc: corner lines + arc */}
        <line x1="10" y1="4" x2="10" y2="18" stroke="#c8834a" strokeWidth="0.5" />
        <line x1="90" y1="4" x2="90" y2="18" stroke="#c8834a" strokeWidth="0.5" />
        <path d="M 10 18 Q 50 62 90 18" fill="none" stroke="#c8834a" strokeWidth="0.5" />
        {/* Backboard + hoop */}
        <line x1="45" y1="7" x2="55" y2="7" stroke="#e5e5e5" strokeWidth="0.7" />
        <circle cx={HOOP.x} cy={HOOP.y} r="1.8" fill="none" stroke="#FF7A1A" strokeWidth="0.6" />

        {/* Arrow marker defs */}
        <defs>
          <marker id={`ra-${uid}`} markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
            <polygon points="0 0, 4 2, 0 4" fill="#FF7A1A" />
          </marker>
          <marker id={`sa-${uid}`} markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <line x1="2" y1="0" x2="2" y2="4" stroke="#facc15" strokeWidth="1.2" />
          </marker>
        </defs>

        {/* Offensive routes */}
        {offensePlayers.filter(p => p.route).map((player, i) => {
          const routeType = player.route!.type;
          const isScreen = routeType === "screen";
          const routeProgress = isScreen ? Math.min(progress * 1.6, 1) : progress;
          const pathD = progress >= 1
            ? buildRoutePath(player.x, player.y, player.route!.points)
            : buildPartialPath(player.x, player.y, player.route!.points, routeProgress);
          const stroke = isScreen ? "#facc15" : routeType === "dribble" ? "#60a5fa" : "#FF7A1A";
          return pathD ? (
            <path
              key={`off-route-${i}`}
              d={pathD}
              fill="none"
              stroke={stroke}
              strokeWidth={isScreen ? "0.6" : "0.8"}
              strokeDasharray={isScreen ? "1.4,0.8" : routeType === "dribble" ? "0.6,0.8" : "none"}
              opacity={0.9}
              markerEnd={progress >= 1 ? (isScreen ? `url(#sa-${uid})` : `url(#ra-${uid})`) : undefined}
            />
          ) : null;
        })}

        {/* Offensive players */}
        {offensePlayers.map((player, i) => {
          let px = player.x;
          let py = player.y;
          if (player.route && progress < 1 && progress > 0) {
            const isScreen = player.route.type === "screen";
            const routeProgress = isScreen ? Math.min(progress * 1.6, 1) : progress;
            const pos = interpolateRoute(player.x, player.y, player.route.points, routeProgress);
            px = pos.x;
            py = pos.y;
          }
          const showAtOrigin = progress >= 1;
          const displayX = showAtOrigin ? player.x : px;
          const displayY = showAtOrigin ? player.y : py;
          return (
            <g key={`off-${i}`}>
              <circle cx={displayX} cy={displayY} r={compact ? "2.2" : "2.8"} fill="#1a0f06" stroke="#FF7A1A" strokeWidth="0.7" />
              <text x={displayX} y={displayY + 0.8} textAnchor="middle" fontSize={compact ? "1.9" : "2"} fill="#FF7A1A" fontWeight="bold" fontFamily="monospace">
                {player.label}
              </text>
            </g>
          );
        })}

        {/* Defensive players (red X marks) */}
        {defensePlayers.map((player, i) => (
          <g key={`def-${i}`}>
            <line x1={player.x - 1.5} y1={player.y - 1.5} x2={player.x + 1.5} y2={player.y + 1.5} stroke="#FF4444" strokeWidth="0.8" />
            <line x1={player.x + 1.5} y1={player.y - 1.5} x2={player.x - 1.5} y2={player.y + 1.5} stroke="#FF4444" strokeWidth="0.8" />
            {!compact && (
              <text x={player.x} y={player.y + 4.2} textAnchor="middle" fontSize="1.6" fill="#FF8888" fontFamily="monospace">
                {player.label}
              </text>
            )}
          </g>
        ))}

        {/* Play name label */}
        {!compact && (
          <>
            <rect x="2" y="79.5" width="96" height="5" fill="#000" opacity="0.5" rx="1" />
            <text x="50" y="83" textAnchor="middle" fontSize="2.4" fill="#FF7A1A" fontWeight="bold" fontFamily="monospace">
              {playName.length > 35 ? playName.slice(0, 35) + "..." : playName}
            </text>
          </>
        )}
      </svg>

      {/* Animation Controls */}
      {!compact && (
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handlePlayToggle}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[#FF7A1A]/10 text-[#FF7A1A] border border-[#FF7A1A]/30 hover:bg-[#FF7A1A]/20 transition-colors"
          >
            {isAnimating ? (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="3" height="8" fill="currentColor"/><rect x="6" y="1" width="3" height="8" fill="currentColor"/></svg>
                Pause
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10"><polygon points="2,1 9,5 2,9" fill="currentColor"/></svg>
                {progress < 1 && progress > 0 ? "Resume" : "Run Play"}
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="px-2 py-1 rounded text-xs font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground transition-colors"
          >
            Reset
          </button>
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-[#FF7A1A] rounded-full transition-[width] duration-75" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">
            {progress < 1 ? `${Math.round(progress * 2.5 * 10) / 10}s` : "2.5s"}
          </span>
        </div>
      )}
    </div>
  );
}
