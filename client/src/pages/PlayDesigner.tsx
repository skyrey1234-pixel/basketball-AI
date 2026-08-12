import { useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { POSITION_COLORS } from "@shared/twok";
import {
  PenTool,
  Save,
  Sparkles,
  Loader2,
  Trash2,
  MousePointer2,
  Eraser,
  Undo2,
  Trophy,
} from "lucide-react";

type RouteKind = "cut" | "screen" | "pass" | "dribble";
type Spot = { position: string; x: number; y: number };
type Route = { from: string; points: { x: number; y: number }[]; kind: RouteKind };

const DEFAULT_SPOTS: Spot[] = [
  { position: "PG", x: 50, y: 78 },
  { position: "SG", x: 14, y: 58 },
  { position: "SF", x: 86, y: 58 },
  { position: "PF", x: 26, y: 22 },
  { position: "C", x: 62, y: 18 },
];

const ROUTE_STYLES: Record<RouteKind, { color: string; dash: string; label: string }> = {
  cut: { color: "#22C55E", dash: "none", label: "Cut" },
  screen: { color: "#FFC53D", dash: "none", label: "Screen" },
  pass: { color: "#3B82F6", dash: "6 4", label: "Pass" },
  dribble: { color: "#FDB927", dash: "2 3", label: "Dribble" },
};

const SETS = ["Horns", "Spain PnR", "Motion", "Zipper", "Floppy", "Iso", "Custom"];
const PLAY_TYPES = ["Half Court", "ATO", "BLOB", "SLOB", "Late Clock", "Transition"];

/** Convert an SVG-space click into 0-100 court coordinates (y flipped: 0 = baseline). */
function toCourt(evt: React.MouseEvent, svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect();
  const x = ((evt.clientX - rect.left) / rect.width) * 100;
  const yTop = ((evt.clientY - rect.top) / rect.height) * 100;
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, 100 - yTop)) };
}

export default function PlayDesigner() {
  const svgRef = useRef<SVGSVGElement>(null);
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [set, setSet] = useState("Horns");
  const [playType, setPlayType] = useState("Half Court");
  const [notes, setNotes] = useState("");
  const [spots, setSpots] = useState<Spot[]>(DEFAULT_SPOTS);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [tool, setTool] = useState<"move" | RouteKind>("move");
  const [dragging, setDragging] = useState<string | null>(null);
  const [drawingFrom, setDrawingFrom] = useState<string | null>(null);
  const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[]>([]);
  const [grade, setGrade] = useState<{
    grade: string;
    score: number;
    verdict: string;
    strengths: string[];
    fixes: string[];
    bestAgainst: string;
    worstAgainst: string;
  } | null>(null);

  const { data: savedPlays } = trpc.playbook.list.useQuery();

  const savePlay = trpc.playbook.save.useMutation({
    onSuccess: () => {
      utils.playbook.list.invalidate();
      utils.progress.me.invalidate();
      toast.success("Play saved to your playbook", { description: "+250 XP" });
    },
    onError: e => toast.error(e.message),
  });

  const removePlay = trpc.playbook.remove.useMutation({
    onSuccess: () => {
      utils.playbook.list.invalidate();
      toast.success("Play removed");
    },
    onError: e => toast.error(e.message),
  });

  const gradePlay = trpc.playbook.grade.useMutation({
    onSuccess: g => {
      setGrade(g);
      toast.success(`Coach grade: ${g.grade}`, { description: g.verdict });
    },
    onError: e => toast.error(e.message),
  });

  const handleSvgClick = useCallback(
    (evt: React.MouseEvent) => {
      if (tool === "move" || !drawingFrom || !svgRef.current) return;
      const pt = toCourt(evt, svgRef.current);
      setDraftPoints(p => [...p, pt]);
    },
    [tool, drawingFrom]
  );

  const startRoute = (position: string) => {
    if (tool === "move") return;
    setDrawingFrom(position);
    setDraftPoints([]);
    toast.info(`Drawing ${ROUTE_STYLES[tool].label} for ${position}`, {
      description: "Click the court to add points, then hit Finish Route.",
    });
  };

  const finishRoute = () => {
    if (!drawingFrom || draftPoints.length === 0 || tool === "move") {
      setDrawingFrom(null);
      setDraftPoints([]);
      return;
    }
    setRoutes(r => [...r, { from: drawingFrom, points: draftPoints, kind: tool }]);
    setDrawingFrom(null);
    setDraftPoints([]);
  };

  const onPointerDownPlayer = (position: string) => {
    if (tool === "move") setDragging(position);
    else startRoute(position);
  };

  const onPointerMove = (evt: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const pt = toCourt(evt, svgRef.current);
    setSpots(s => s.map(sp => (sp.position === dragging ? { ...sp, x: pt.x, y: pt.y } : sp)));
  };

  const reset = () => {
    setSpots(DEFAULT_SPOTS);
    setRoutes([]);
    setGrade(null);
    setDrawingFrom(null);
    setDraftPoints([]);
  };

  const payload = { name: name.trim() || "Untitled Play", set, playType, positions: spots, routes, notes };

  // SVG uses top-down y, court coords are bottom-up: flip on render.
  const sy = (y: number) => 100 - y;

  return (
    <AppLayout>
      <div className="container max-w-6xl py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <PenTool className="h-6 w-6 text-[#FDB927]" /> Play Designer
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Draw your own play on the half court, then have the AI grade it like a real offensive
            coordinator — spacing, screen angles, weak-side action, and what defense it beats.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* ---------- court canvas ---------- */}
          <div className="rounded-xl border border-[#76549a]/55 bg-[#211037]/85 p-4 shadow-[inset_0_1px_0_rgba(253,185,39,0.1)]">
            {/* toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                onClick={() => setTool("move")}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide border transition-all active:scale-[0.97]"
                style={{
                  borderColor: tool === "move" ? "#FDB927" : "rgba(253,185,39,0.12)",
                  background: tool === "move" ? "rgba(253,185,39,0.14)" : "transparent",
                  color: tool === "move" ? "#FDE68A" : undefined,
                  transitionDuration: "160ms",
                }}
              >
                <MousePointer2 className="h-3 w-3" /> Move
              </button>
              {(Object.keys(ROUTE_STYLES) as RouteKind[]).map(k => (
                <button
                  key={k}
                  onClick={() => setTool(k)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide border transition-all active:scale-[0.97]"
                  style={{
                    borderColor: tool === k ? ROUTE_STYLES[k].color : "rgba(255,255,255,0.08)",
                    background: tool === k ? `${ROUTE_STYLES[k].color}22` : "transparent",
                    color: tool === k ? ROUTE_STYLES[k].color : undefined,
                    transitionDuration: "160ms",
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: ROUTE_STYLES[k].color }}
                  />
                  {ROUTE_STYLES[k].label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                {drawingFrom && (
                  <Button size="sm" onClick={finishRoute} className="h-7 text-[11px] font-bold">
                    Finish Route ({draftPoints.length})
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => setRoutes(r => r.slice(0, -1))}
                  disabled={routes.length === 0}
                >
                  <Undo2 className="h-3 w-3" /> Undo
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={reset}>
                  <Eraser className="h-3 w-3" /> Reset
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground mb-2">
              {tool === "move"
                ? "Drag players to reposition them."
                : `Click a player to start a ${ROUTE_STYLES[tool].label.toLowerCase()}, then click the court to trace it.`}
            </p>

            <svg
              ref={svgRef}
              viewBox="0 0 100 100"
              className="w-full rounded-lg select-none"
              style={{
                background: "linear-gradient(170deg,#2b1249,#13081f)",
                border: "1px solid rgba(253,185,39,0.18)",
                cursor: tool === "move" ? "grab" : "crosshair",
                aspectRatio: "1 / 1",
              }}
              onClick={handleSvgClick}
              onMouseMove={onPointerMove}
              onMouseUp={() => setDragging(null)}
              onMouseLeave={() => setDragging(null)}
            >
              {/* court markings */}
              <rect x="1" y="1" width="98" height="98" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
              {/* baseline is at bottom in court coords -> top of svg is half court */}
              <line x1="1" y1="1" x2="99" y2="1" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
              {/* paint */}
              <rect x="38" y={sy(19)} width="24" height="18" fill="rgba(253,185,39,0.09)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />
              {/* free throw circle */}
              <circle cx="50" cy={sy(19)} r="8" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.4" />
              {/* restricted arc */}
              <circle cx="50" cy={sy(6)} r="4" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.35" />
              {/* 3pt arc */}
              <path
                d={`M 6 ${sy(0)} L 6 ${sy(14)} A 44 44 0 0 0 94 ${sy(14)} L 94 ${sy(0)}`}
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="0.5"
              />
              {/* rim + backboard */}
              <rect x="44" y={sy(3)} width="12" height="0.8" fill="rgba(255,255,255,0.4)" />
              <circle cx="50" cy={sy(6)} r="1.6" fill="none" stroke="#FDB927" strokeWidth="0.7" />

              {/* saved routes */}
              {routes.map((r, i) => {
                const origin = spots.find(s => s.position === r.from);
                if (!origin) return null;
                const pts = [{ x: origin.x, y: origin.y }, ...r.points];
                const d = pts.map((p, j) => `${j === 0 ? "M" : "L"} ${p.x} ${sy(p.y)}`).join(" ");
                const st = ROUTE_STYLES[r.kind];
                const last = pts[pts.length - 1];
                const prev = pts[pts.length - 2] ?? pts[0];
                return (
                  <g key={i}>
                    <path
                      d={d}
                      fill="none"
                      stroke={st.color}
                      strokeWidth="1.1"
                      strokeDasharray={st.dash === "none" ? undefined : st.dash}
                      strokeLinecap="round"
                      style={{ filter: `drop-shadow(0 0 3px ${st.color}88)` }}
                    />
                    {r.kind === "screen" ? (
                      // screens end in a wall, not an arrow
                      <line
                        x1={last.x - 2.6}
                        y1={sy(last.y)}
                        x2={last.x + 2.6}
                        y2={sy(last.y)}
                        stroke={st.color}
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    ) : (
                      (() => {
                        const ang = Math.atan2(sy(last.y) - sy(prev.y), last.x - prev.x);
                        const a1 = ang + Math.PI * 0.82;
                        const a2 = ang - Math.PI * 0.82;
                        return (
                          <polygon
                            points={`${last.x},${sy(last.y)} ${last.x + Math.cos(a1) * 3},${sy(last.y) + Math.sin(a1) * 3} ${last.x + Math.cos(a2) * 3},${sy(last.y) + Math.sin(a2) * 3}`}
                            fill={st.color}
                          />
                        );
                      })()
                    )}
                  </g>
                );
              })}

              {/* draft route in progress */}
              {drawingFrom && draftPoints.length > 0 && tool !== "move" && (() => {
                const origin = spots.find(s => s.position === drawingFrom);
                if (!origin) return null;
                const pts = [{ x: origin.x, y: origin.y }, ...draftPoints];
                const d = pts.map((p, j) => `${j === 0 ? "M" : "L"} ${p.x} ${sy(p.y)}`).join(" ");
                return (
                  <path
                    d={d}
                    fill="none"
                    stroke={ROUTE_STYLES[tool].color}
                    strokeWidth="1"
                    strokeDasharray="3 2"
                    opacity="0.75"
                  />
                );
              })()}

              {/* players */}
              {spots.map(s => {
                const c = POSITION_COLORS[s.position] ?? "#FDB927";
                const isDrawing = drawingFrom === s.position;
                return (
                  <g
                    key={s.position}
                    transform={`translate(${s.x},${sy(s.y)})`}
                    onMouseDown={() => onPointerDownPlayer(s.position)}
                    style={{ cursor: tool === "move" ? "grab" : "pointer" }}
                  >
                    <circle
                      r="4.4"
                      fill={c}
                      opacity={isDrawing ? 1 : 0.92}
                      stroke={isDrawing ? "#fff" : "rgba(0,0,0,0.4)"}
                      strokeWidth={isDrawing ? "0.8" : "0.4"}
                      style={{ filter: `drop-shadow(0 0 5px ${c}99)` }}
                    />
                    <text
                      textAnchor="middle"
                      dy="1.4"
                      fontSize="3.4"
                      fontWeight="900"
                      fill="#0b0b0d"
                      style={{ pointerEvents: "none" }}
                    >
                      {s.position}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ---------- form + grade ---------- */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[#76549a]/55 bg-[#211037]/85 p-4 space-y-3 shadow-[inset_0_1px_0_rgba(253,185,39,0.1)]">
              <div>
                <Label htmlFor="playName" className="text-[11px] font-bold uppercase tracking-wide">
                  Play Name
                </Label>
                <Input
                  id="playName"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Horns Flare Twist"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-wide">Set</Label>
                  <Select value={set} onValueChange={setSet}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SETS.map(s => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-wide">Situation</Label>
                  <Select value={playType} onValueChange={setPlayType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAY_TYPES.map(s => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="playNotes" className="text-[11px] font-bold uppercase tracking-wide">
                  Coaching Notes
                </Label>
                <Textarea
                  id="playNotes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What's the read? Who's the primary? What's the counter if they switch?"
                  rows={3}
                  className="mt-1 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 font-bold"
                  onClick={() => gradePlay.mutate(payload)}
                  disabled={gradePlay.isPending}
                >
                  {gradePlay.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Grading...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Grade Play
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => savePlay.mutate(payload)}
                  disabled={savePlay.isPending || !name.trim()}
                >
                  {savePlay.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>

            {/* AI grade card */}
            {grade && (
              <div
                className="rounded-xl border-2 p-4"
                style={{
                  borderColor:
                    grade.score >= 85
                      ? "rgba(34,197,94,0.45)"
                      : grade.score >= 70
                        ? "rgba(255,197,61,0.45)"
                        : "rgba(239,68,68,0.45)",
                  background: "linear-gradient(160deg,#2b1249,#13081f)",
                  animation: "gradeIn 480ms cubic-bezier(0.23,1,0.32,1) both",
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-1">
                      Coach Grade
                    </p>
                    <p className="text-sm text-foreground/90 leading-snug">{grade.verdict}</p>
                  </div>
                  <div
                    className="shrink-0 flex flex-col items-center justify-center rounded-lg px-3 py-1.5"
                    style={{
                      border: `1.5px solid ${grade.score >= 85 ? "#22C55E" : grade.score >= 70 ? "#FFC53D" : "#EF4444"}`,
                      background:
                        grade.score >= 85
                          ? "rgba(34,197,94,0.14)"
                          : grade.score >= 70
                            ? "rgba(255,197,61,0.14)"
                            : "rgba(239,68,68,0.14)",
                    }}
                  >
                    <span
                      className="text-2xl font-black leading-none"
                      style={{
                        color:
                          grade.score >= 85 ? "#4ADE80" : grade.score >= 70 ? "#FFD666" : "#F87171",
                      }}
                    >
                      {grade.grade}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground tabular-nums">
                      {grade.score}/100
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-green-400 mb-1">
                      What Works
                    </p>
                    <ul className="space-y-1">
                      {grade.strengths.map((s, i) => (
                        <li key={i} className="text-[12px] text-foreground/85 flex gap-1.5">
                          <span className="text-green-400 shrink-0">+</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#FDE68A] mb-1">
                      Fix This
                    </p>
                    <ul className="space-y-1">
                      {grade.fixes.map((s, i) => (
                        <li key={i} className="text-[12px] text-foreground/85 flex gap-1.5">
                          <span className="text-[#FDB927] shrink-0">→</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-md border border-green-500/25 bg-green-500/[0.06] px-2.5 py-2">
                      <p className="text-[8px] font-black uppercase tracking-wide text-green-400 mb-0.5">
                        Best Against
                      </p>
                      <p className="text-[11px] text-foreground/85">{grade.bestAgainst}</p>
                    </div>
                    <div className="rounded-md border border-red-500/25 bg-red-500/[0.06] px-2.5 py-2">
                      <p className="text-[8px] font-black uppercase tracking-wide text-red-400 mb-0.5">
                        Struggles Against
                      </p>
                      <p className="text-[11px] text-foreground/85">{grade.worstAgainst}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* saved playbook */}
            <div className="rounded-xl border border-[#76549a]/55 bg-[#211037]/85 p-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-2.5 flex items-center gap-1.5">
                <Trophy className="h-3 w-3" /> My Playbook ({savedPlays?.length ?? 0})
              </h3>
              {!savedPlays || savedPlays.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">
                  Nothing saved yet. Draw a play, name it, and hit Save.
                </p>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {savedPlays.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2"
                    >
                      <button
                        className="min-w-0 text-left flex-1"
                        onClick={() => {
                          const pos = Array.isArray(p.positions) ? (p.positions as Spot[]) : DEFAULT_SPOTS;
                          const rts = Array.isArray(p.routes) ? (p.routes as Route[]) : [];
                          setName(p.name);
                          setSet(p.set ?? "Horns");
                          setPlayType(p.playType ?? "Half Court");
                          setNotes(p.notes ?? "");
                          setSpots(pos);
                          setRoutes(rts);
                          setGrade(
                            p.aiGrade && typeof p.aiGrade === "object"
                              ? (p.aiGrade as typeof grade)
                              : null
                          );
                          toast.success(`Loaded "${p.name}"`);
                        }}
                      >
                        <p className="text-[12px] font-bold truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {p.set} · {p.playType}
                        </p>
                      </button>
                      <button
                        onClick={() => removePlay.mutate({ id: p.id })}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
                        style={{ transitionDuration: "160ms" }}
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </AppLayout>
  );
}
