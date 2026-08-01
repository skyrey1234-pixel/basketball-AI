import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  POSSESSIONS,
  toLeft,
  toTop,
  lerp,
  easeOut,
  type Possession,
  type PlayerLabel,
  type PossessionPlayer,
  type DefenderPos,
} from "./possessionData";
import { Eye, Grid3x3, RotateCcw, Play, Lightbulb, Sparkles } from "lucide-react";

/**
 * Time-Machine — "stand inside the possession".
 *
 * A pseudo-3D perspective replay: the possession runs across a court plane that
 * tilts toward the ball-handler's eye level, freezes at the decision point, and
 * then reveals the read that was actually made (red) versus the open teammate
 * that was missed (green). No headset, no heavy 3D engine — a CSS-3D floor plane
 * with billboarded player tokens, driven by the same court model as the play
 * diagrams elsewhere in the app.
 */

type Phase = "ready" | "running" | "decision" | "revealed";

const EYE_TILT = 58; // degrees of rotateX at eye level
const RUN_MS = 2600;
const PASS_MS = 850;

export default function TimeMachine() {
  const [idx, setIdx] = useState(0);
  const possession = POSSESSIONS[idx];

  const [eyeLevel, setEyeLevel] = useState(true);
  const [phase, setPhase] = useState<Phase>("ready");
  const [progress, setProgress] = useState(0); // 0..1 possession run
  const [passT, setPassT] = useState(0); // 0..1 ball travel on best read

  const runRaf = useRef<number>(0);
  const passRaf = useRef<number>(0);
  const runStart = useRef<number>(0);
  const passStart = useRef<number>(0);

  const tilt = eyeLevel ? EYE_TILT : 0;

  const stopRaf = useCallback(() => {
    cancelAnimationFrame(runRaf.current);
    cancelAnimationFrame(passRaf.current);
  }, []);

  const reset = useCallback(() => {
    stopRaf();
    setPhase("ready");
    setProgress(0);
    setPassT(0);
  }, [stopRaf]);

  // Switch scenario -> reset everything.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => () => stopRaf(), [stopRaf]);

  const runPossession = useCallback(() => {
    stopRaf();
    setPassT(0);
    setProgress(0);
    setPhase("running");
    runStart.current = 0;
    const step = (ts: number) => {
      if (!runStart.current) runStart.current = ts;
      const p = Math.min((ts - runStart.current) / RUN_MS, 1);
      setProgress(p);
      if (p < 1) runRaf.current = requestAnimationFrame(step);
      else setPhase("decision");
    };
    runRaf.current = requestAnimationFrame(step);
  }, [stopRaf]);

  const reveal = useCallback(() => {
    setPhase("revealed");
    setPassT(0);
    passStart.current = 0;
    const step = (ts: number) => {
      if (!passStart.current) passStart.current = ts;
      const p = Math.min((ts - passStart.current) / PASS_MS, 1);
      setPassT(p);
      if (p < 1) passRaf.current = requestAnimationFrame(step);
    };
    passRaf.current = requestAnimationFrame(step);
  }, []);

  // Eased run progress used for player interpolation.
  const t = easeOut(progress);

  const playerPos = useCallback(
    (pl: PossessionPlayer): [number, number] => lerp(pl.start, pl.end, phase === "ready" ? 0 : t),
    [phase, t]
  );
  const defPos = useCallback(
    (d: DefenderPos): [number, number] => lerp(d.start, d.end, phase === "ready" ? 0 : t),
    [phase, t]
  );

  const findPlayer = (label: PlayerLabel) => possession.players.find(p => p.label === label)!;
  const ballHandler = possession.players.find(p => p.isBallHandler)!;

  const showReads = phase === "revealed";
  const showActual = phase === "decision" || phase === "revealed";

  return (
    <div className="space-y-4">
      {/* Scenario selector */}
      <div className="flex flex-wrap items-center gap-2">
        {POSSESSIONS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIdx(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              i === idx
                ? "bg-[#FF7A1A] text-black border-[#FF7A1A]"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Situation + view controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md bg-[#FF7A1A]/10 border border-[#FF7A1A]/30 px-2.5 py-1 text-[11px] font-mono text-[#FF7A1A]">
            <Sparkles className="h-3 w-3" /> {possession.situation}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {possession.set} · {possession.playType} · vs {possession.defenseScheme}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-secondary border border-border p-1">
          <button
            onClick={() => setEyeLevel(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              eyeLevel ? "bg-[#FF7A1A] text-black" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Eye Level
          </button>
          <button
            onClick={() => setEyeLevel(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              !eyeLevel ? "bg-[#FF7A1A] text-black" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid3x3 className="h-3.5 w-3.5" /> Bird's Eye
          </button>
        </div>
      </div>

      {/* 3D court stage */}
      <div
        className="relative w-full rounded-xl overflow-hidden border border-border"
        style={{
          background: "radial-gradient(ellipse at 50% 120%, #1a1006 0%, #0D1117 70%)",
          perspective: "1000px",
          height: eyeLevel ? 460 : 520,
          transition: "height 600ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* POV badge */}
        <div className="absolute top-3 left-3 z-20 text-[10px] font-mono text-muted-foreground/80 bg-black/40 rounded px-2 py-1 backdrop-blur">
          {eyeLevel ? "◉ BALL-HANDLER POV" : "▦ TACTICAL VIEW"}
        </div>

        {/* Court plane */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: "88%",
            aspectRatio: "100 / 85",
            transform: `translate(-50%, -50%) rotateX(${tilt}deg) scale(${eyeLevel ? 1.06 : 1})`,
            transformStyle: "preserve-3d",
            transformOrigin: "center 62%",
            transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Floor: court lines + trails + glows */}
          <svg viewBox="0 0 100 85" className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
            <CourtFloor />

            {/* Read: actual pass (red) — shown at decision */}
            {showActual && (
              <PassTrail
                from={findPlayer(ballHandler.label).end}
                to={findPlayer(possession.actual.to).end}
                color="#FF4444"
                dashed
                t={1}
              />
            )}
            {/* Read: best pass (green) — revealed */}
            {showReads && (
              <PassTrail
                from={findPlayer(ballHandler.label).end}
                to={findPlayer(possession.best.to).end}
                color="#22c55e"
                t={easeOut(passT)}
              />
            )}

            {/* Open-man glow ring on the best read target */}
            {showReads && (
              <ReadGlow pos={findPlayer(possession.best.to).end} color="#22c55e" />
            )}
            {showActual && (
              <ReadGlow pos={findPlayer(possession.actual.to).end} color="#FF4444" small />
            )}
          </svg>

          {/* Ground shadows (flat on floor) */}
          {possession.players.map(pl => {
            const [x, y] = playerPos(pl);
            return <Shadow key={`sh-${pl.label}`} x={x} y={y} />;
          })}
          {possession.defenders.map(d => {
            const [x, y] = defPos(d);
            return <Shadow key={`shd-${d.label}`} x={x} y={y} small />;
          })}

          {/* Offensive players (billboarded) */}
          {possession.players.map(pl => {
            const [x, y] = playerPos(pl);
            const isBestTarget = showReads && pl.label === possession.best.to;
            const isActualTarget = showActual && pl.label === possession.actual.to;
            return (
              <Token
                key={pl.label}
                x={x}
                y={y}
                tilt={tilt}
                label={pl.label}
                variant={pl.isBallHandler ? "you" : "offense"}
                glow={isBestTarget ? "#22c55e" : isActualTarget ? "#FF4444" : undefined}
              />
            );
          })}

          {/* Defenders (billboarded X's) */}
          {possession.defenders.map(d => {
            const [x, y] = defPos(d);
            return <Token key={d.label} x={x} y={y} tilt={tilt} label="✕" variant="defense" />;
          })}

          {/* Moving ball on the best read */}
          {showReads && (
            <Ball
              pos={lerp(findPlayer(ballHandler.label).end, findPlayer(possession.best.to).end, easeOut(passT))}
              tilt={tilt}
            />
          )}
        </div>

        {/* Narration overlay */}
        {phase === "decision" && (
          <div className="absolute bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-black/85 to-transparent">
            <p className="text-sm text-white/90 font-medium text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
              {possession.narration}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {phase === "ready" && (
          <button
            onClick={runPossession}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF7A1A] text-black font-semibold text-sm hover:bg-[#ff8c3a] transition-colors"
          >
            <Play className="h-4 w-4 fill-current" /> Run the possession
          </button>
        )}
        {phase === "running" && (
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-[#FF7A1A] animate-pulse" /> Reliving it…
          </div>
        )}
        {phase === "decision" && (
          <button
            onClick={reveal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-500 transition-colors animate-in fade-in duration-300"
          >
            <Lightbulb className="h-4 w-4" /> Reveal the open man
          </button>
        )}
        {(phase === "decision" || phase === "revealed") && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-muted-foreground border border-border text-sm hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Replay
          </button>
        )}

        {/* Run progress bar */}
        {(phase === "running" || phase === "decision" || phase === "revealed") && (
          <div className="flex-1 min-w-[120px] h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF7A1A] rounded-full"
              style={{ width: `${progress * 100}%`, transition: "width 75ms linear" }}
            />
          </div>
        )}
      </div>

      {/* Read comparison + lesson */}
      {(phase === "decision" || phase === "revealed") && (
        <div className="grid sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
          {/* What you did */}
          <div className="rounded-lg border border-[#FF4444]/40 bg-[#FF4444]/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF4444]" />
              <span className="text-xs font-semibold text-[#FF8888] uppercase tracking-wide">What you did</span>
            </div>
            <p className="text-sm font-semibold text-white">
              Pass to {possession.actual.to} → {possession.actual.outcome}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{possession.actual.detail}</p>
          </div>

          {/* The read */}
          <div
            className={`rounded-lg border p-3 transition-all duration-500 ${
              showReads
                ? "border-green-500/50 bg-green-500/10"
                : "border-border bg-secondary/40 blur-[2px] opacity-60 select-none"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">The read</span>
            </div>
            {showReads ? (
              <>
                <p className="text-sm font-semibold text-white">
                  Pass to {possession.best.to} → {possession.best.outcome}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{possession.best.detail}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Hit "Reveal the open man" to see it…</p>
            )}
          </div>
        </div>
      )}

      {phase === "revealed" && (
        <div className="rounded-lg border border-[#FF7A1A]/30 bg-[#FF7A1A]/5 p-4 animate-in fade-in slide-in-from-bottom-3 duration-700">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-[#FF7A1A]/15 p-2 shrink-0">
              <Lightbulb className="h-4 w-4 text-[#FF7A1A]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-white">Coaching takeaway</h4>
                <span className="text-[11px] font-mono text-green-400 bg-green-500/10 border border-green-500/30 rounded px-1.5 py-0.5">
                  left {possession.valueLeft}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{possession.lesson}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ Sub-components ============================ */

/** Static half-court floor lines (top-down, hoop at top). */
function CourtFloor() {
  return (
    <g>
      <defs>
        <linearGradient id="tm-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2210" />
          <stop offset="100%" stopColor="#24150a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="85" fill="url(#tm-wood)" />
      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(x => (
        <rect key={x} x={x} y="0" width="5" height="85" fill="#2c1a0c" opacity="0.5" />
      ))}
      <line x1="4" y1="4" x2="96" y2="4" stroke="#c8834a" strokeWidth="0.5" />
      <line x1="4" y1="4" x2="4" y2="80" stroke="#c8834a" strokeWidth="0.5" />
      <line x1="96" y1="4" x2="96" y2="80" stroke="#c8834a" strokeWidth="0.5" />
      <line x1="4" y1="80" x2="96" y2="80" stroke="#c8834a" strokeWidth="0.5" />
      <path d="M 38 80 A 12 12 0 0 1 62 80" fill="none" stroke="#c8834a" strokeWidth="0.5" />
      <rect x="42" y="4" width="16" height="26" fill="#3a2210" stroke="#c8834a" strokeWidth="0.5" />
      <path d="M 42 30 A 8 8 0 0 0 58 30" fill="none" stroke="#c8834a" strokeWidth="0.5" />
      <line x1="10" y1="4" x2="10" y2="18" stroke="#c8834a" strokeWidth="0.5" />
      <line x1="90" y1="4" x2="90" y2="18" stroke="#c8834a" strokeWidth="0.5" />
      <path d="M 10 18 Q 50 62 90 18" fill="none" stroke="#c8834a" strokeWidth="0.5" />
      <line x1="45" y1="7" x2="55" y2="7" stroke="#e5e5e5" strokeWidth="0.7" />
      <circle cx="50" cy="9" r="1.8" fill="none" stroke="#FF7A1A" strokeWidth="0.6" />
    </g>
  );
}

/** A pass trail drawn on the floor, optionally animated by t (0..1). */
function PassTrail({
  from,
  to,
  color,
  dashed,
  t,
}: {
  from: [number, number];
  to: [number, number];
  color: string;
  dashed?: boolean;
  t: number;
}) {
  const x2 = from[0] + (to[0] - from[0]) * t;
  const y2 = from[1] + (to[1] - from[1]) * t;
  const mid: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - 6]; // slight arc
  const cx = from[0] + (mid[0] - from[0]) * t;
  const cy = from[1] + (mid[1] - from[1]) * t;
  return (
    <path
      d={`M ${from[0]} ${from[1]} Q ${cx} ${cy} ${x2} ${y2}`}
      fill="none"
      stroke={color}
      strokeWidth="0.9"
      strokeLinecap="round"
      strokeDasharray={dashed ? "1.6,1.2" : undefined}
      opacity="0.9"
      style={{ filter: `drop-shadow(0 0 1.5px ${color})` }}
    />
  );
}

/** Pulsing glow ring at a read target. */
function ReadGlow({ pos, color, small }: { pos: [number, number]; color: string; small?: boolean }) {
  const r = small ? 3.4 : 4.4;
  return (
    <g style={{ transformOrigin: `${pos[0]}px ${pos[1]}px` }}>
      <circle cx={pos[0]} cy={pos[1]} r={r} fill="none" stroke={color} strokeWidth="0.6" opacity="0.9">
        <animate attributeName="r" values={`${r};${r + 2};${r}`} dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.25;0.9" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

/** Flat ground shadow beneath a token. */
function Shadow({ x, y, small }: { x: number; y: number; small?: boolean }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        left: `${toLeft(x)}%`,
        top: `${toTop(y)}%`,
        width: small ? 20 : 26,
        height: small ? 8 : 10,
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%)",
        pointerEvents: "none",
      }}
    />
  );
}

/** A billboarded player token that stands up toward the camera. */
function Token({
  x,
  y,
  tilt,
  label,
  variant,
  glow,
}: {
  x: number;
  y: number;
  tilt: number;
  label: string;
  variant: "offense" | "defense" | "you";
  glow?: string;
}) {
  // Blend anchor from center (flat/top-down) to bottom (standing) as tilt grows.
  const standing = tilt / EYE_TILT; // 0..1
  const anchorY = -50 - 50 * standing; // -50% (flat) -> -100% (standing)

  const base =
    variant === "you"
      ? "bg-gradient-to-b from-[#ffb066] to-[#FF7A1A] text-black border-white"
      : variant === "offense"
        ? "bg-gradient-to-b from-[#2a1a0c] to-[#1a0f06] text-[#FF7A1A] border-[#FF7A1A]"
        : "bg-gradient-to-b from-[#3a1414] to-[#240a0a] text-[#FF6666] border-[#FF4444]";

  return (
    <div
      className="absolute"
      style={{
        left: `${toLeft(x)}%`,
        top: `${toTop(y)}%`,
        transform: `translateX(-50%) translateY(${anchorY}%) rotateX(-${tilt}deg)`,
        transformOrigin: "bottom center",
        transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)",
        zIndex: Math.round(y),
        pointerEvents: "none",
      }}
    >
      <div
        className={`flex items-center justify-center rounded-full border-2 font-bold font-mono ${base}`}
        style={{
          width: variant === "you" ? 34 : 30,
          height: variant === "you" ? 34 : 30,
          fontSize: variant === "you" ? 11 : 12,
          boxShadow: glow
            ? `0 0 0 3px ${glow}, 0 0 14px ${glow}`
            : variant === "you"
              ? "0 0 12px rgba(255,122,26,0.6)"
              : "0 3px 6px rgba(0,0,0,0.5)",
        }}
      >
        {variant === "you" ? "YOU" : label}
      </div>
    </div>
  );
}

/** The ball, traveling along the best read. */
function Ball({ pos, tilt }: { pos: [number, number]; tilt: number }) {
  const standing = tilt / EYE_TILT;
  const anchorY = -50 - 20 * standing;
  return (
    <div
      className="absolute"
      style={{
        left: `${toLeft(pos[0])}%`,
        top: `${toTop(pos[1])}%`,
        transform: `translateX(-50%) translateY(${anchorY}%) rotateX(-${tilt}deg)`,
        transformOrigin: "bottom center",
        zIndex: 999,
        pointerEvents: "none",
      }}
    >
      <div
        className="rounded-full"
        style={{
          width: 12,
          height: 12,
          background: "radial-gradient(circle at 35% 30%, #ffb066, #e8630a)",
          boxShadow: "0 0 8px rgba(255,122,26,0.9)",
          border: "1px solid #7a3400",
        }}
      />
    </div>
  );
}
