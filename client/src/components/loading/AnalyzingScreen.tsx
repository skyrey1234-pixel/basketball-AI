import { useEffect, useState } from "react";
import { Radar, Loader2 } from "lucide-react";

const STAGES = [
  { label: "Ingesting film", detail: "Pulling frames and possession boundaries" },
  { label: "Reading their offense", detail: "Tagging sets, screens, and primary actions" },
  { label: "Charting their defense", detail: "Identifying coverages and rotation habits" },
  { label: "Flagging special situations", detail: "ATO, BLOB, SLOB, and late-clock reps" },
  { label: "Finding exploitable mistakes", detail: "Cross-checking repeated breakdowns" },
  { label: "Writing the report", detail: "Building your coach-ready breakdown" },
];

const TIPS = [
  "A team that never switches on ball screens will give up the same slip cut all night.",
  "Count their transition attempts. Tempo tells you more than their record does.",
  "If their center never steps outside the paint, your 5 can shoot them out of the gym.",
  "Watch the weak side, not the ball. That's where their rotation habits leak.",
  "Every zone has a soft spot. Usually it's the short corner.",
  "Their best player's second option is more scoutable than his first.",
  "Late-clock possessions expose who they actually trust with the ball.",
  "A guard who only drives one direction can be walled off with one help defender.",
];

interface AnalyzingScreenProps {
  opponentName: string;
  /** Optional: rough seconds the analysis usually takes, used to pace the stage ticker. */
  estimatedSeconds?: number;
}

export default function AnalyzingScreen({
  opponentName,
  estimatedSeconds = 90,
}: AnalyzingScreenProps) {
  const [stage, setStage] = useState(0);
  const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [elapsed, setElapsed] = useState(0);

  // Advance the stage ticker. Holds on the last stage until the real data arrives.
  useEffect(() => {
    const perStage = Math.max(4000, (estimatedSeconds * 1000) / STAGES.length);
    const id = setInterval(() => {
      setStage(s => Math.min(STAGES.length - 1, s + 1));
    }, perStage);
    return () => clearInterval(id);
  }, [estimatedSeconds]);

  useEffect(() => {
    const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 7000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const pct = Math.min(96, Math.round(((stage + 0.5) / STAGES.length) * 100));

  return (
    <div
      className="relative rounded-xl border-2 overflow-hidden"
      style={{
        borderColor: "rgba(255,122,26,0.35)",
        background: "linear-gradient(165deg,#14100a 0%,#0b0a08 55%,#08080a 100%)",
        minHeight: 460,
      }}
    >
      {/* sweeping radar glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 22%, rgba(255,122,26,0.18), transparent 58%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[22%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(255,122,26,0.28) 0deg, transparent 55deg, transparent 360deg)",
          borderRadius: "50%",
          animation: "radarSweep 3.2s linear infinite",
        }}
      />
      {/* scanline texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          background:
            "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
        }}
      />

      <div className="relative px-6 py-10 sm:px-10">
        {/* cutscene title */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(140deg,rgba(255,122,26,0.34),rgba(255,122,26,0.06))",
              border: "1.5px solid rgba(255,122,26,0.55)",
              animation: "iconFloat 2.6s ease-in-out infinite",
            }}
          >
            <Radar className="h-7 w-7 text-orange-400" />
          </div>

          <p
            className="text-[10px] font-black uppercase tracking-[0.32em] text-orange-400/80 mb-2"
            style={{ animation: "glitchIn 620ms cubic-bezier(0.23,1,0.32,1) both" }}
          >
            Scouting Report Initiated
          </p>
          <h2
            className="text-3xl sm:text-4xl font-black tracking-tight text-foreground"
            style={{
              animation: "titleIn 720ms cubic-bezier(0.23,1,0.32,1) 120ms both",
              textShadow: "0 0 28px rgba(255,122,26,0.28)",
            }}
          >
            {opponentName}
          </h2>
          <p
            className="text-sm text-muted-foreground mt-2"
            style={{ animation: "titleIn 720ms cubic-bezier(0.23,1,0.32,1) 240ms both" }}
          >
            Breaking down the film. This usually takes a minute or two.
          </p>
        </div>

        {/* progress rail */}
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] mb-2">
            <span className="text-orange-400">{STAGES[stage].label}</span>
            <span className="text-muted-foreground tabular-nums">
              {pct}% · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full relative"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg,#FF7A1A,#FFB27A)",
                boxShadow: "0 0 14px rgba(255,122,26,0.6)",
                transition: "width 620ms cubic-bezier(0.23,1,0.32,1)",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
                  animation: "sheen 1.6s ease-in-out infinite",
                }}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">{STAGES[stage].detail}</p>

          {/* stage checklist */}
          <div className="mt-6 space-y-2">
            {STAGES.map((s, i) => {
              const done = i < stage;
              const current = i === stage;
              return (
                <div
                  key={s.label}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 border"
                  style={{
                    borderColor: current
                      ? "rgba(255,122,26,0.4)"
                      : done
                        ? "rgba(34,197,94,0.25)"
                        : "rgba(255,255,255,0.06)",
                    background: current
                      ? "rgba(255,122,26,0.09)"
                      : done
                        ? "rgba(34,197,94,0.05)"
                        : "rgba(255,255,255,0.015)",
                    opacity: done || current ? 1 : 0.45,
                    transition: "all 320ms cubic-bezier(0.23,1,0.32,1)",
                  }}
                >
                  {current ? (
                    <Loader2 className="h-3.5 w-3.5 text-orange-400 animate-spin shrink-0" />
                  ) : done ? (
                    <span className="h-3.5 w-3.5 rounded-full bg-green-500/25 border border-green-500/60 shrink-0 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    </span>
                  ) : (
                    <span className="h-3.5 w-3.5 rounded-full border border-white/15 shrink-0" />
                  )}
                  <span
                    className="text-[12px] font-semibold"
                    style={{
                      color: current ? "#FFB27A" : done ? "#4ADE80" : undefined,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* rotating scouting tip */}
          <div
            className="mt-6 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3"
            key={tipIdx}
            style={{ animation: "tipIn 420ms cubic-bezier(0.23,1,0.32,1) both" }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-1">
              Film Room Tip
            </p>
            <p className="text-[13px] text-foreground/85 leading-relaxed italic">
              &ldquo;{TIPS[tipIdx]}&rdquo;
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes radarSweep { to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes iconFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes glitchIn {
          0% { opacity: 0; transform: translateX(-6px); letter-spacing: 0.5em; }
          60% { opacity: 1; transform: translateX(2px); }
          100% { opacity: 1; transform: translateX(0); letter-spacing: 0.32em; }
        }
        @keyframes titleIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sheen {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes tipIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="radarSweep"], [style*="iconFloat"], [style*="sheen"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
