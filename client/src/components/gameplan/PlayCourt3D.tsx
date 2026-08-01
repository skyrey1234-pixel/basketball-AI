import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Camera } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Position = "PG" | "SG" | "SF" | "PF" | "C";
type RoutePoint = [number, number, number];

interface Player3D {
  id: string;
  pos: Position;
  start: [number, number, number];
  route: RoutePoint[];
  isDefense: boolean;
  isTarget: boolean;
}

// ─── Court dimensions (world units, half-court) ───────────────────────────────
// Court floor: X [-7.5, 7.5], Z [-2, 13], Y = 0
const COURT_W = 15;
const COURT_D = 15;
const HOOP_Z = 1.3;   // near baseline
const THREE_PT_R = 6.7;
const PAINT_W = 4.8;
const PAINT_D = 5.8;

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  floor: "#1a2332",
  line: "#2a3f5f",
  paint: "#1e3a5f",
  hoop: "#FF7A1A",
  offense: "#FF7A1A",
  defense: "#ef4444",
  target: "#FFD700",
  route: "#FF7A1A",
  screen: "#a78bfa",
  ball: "#FF7A1A",
};

// ─── Position starting spots ──────────────────────────────────────────────────
function getStartPos(pos: Position, set: string): [number, number, number] {
  const sets: Record<string, Partial<Record<Position, [number, number, number]>>> = {
    horns: { PG: [0, 0, 8], SG: [-4.5, 0, 6], SF: [4.5, 0, 6], PF: [-2.5, 0, 4], C: [2.5, 0, 4] },
    "5-out": { PG: [0, 0, 9], SG: [-5, 0, 6], SF: [5, 0, 6], PF: [-4, 0, 3], C: [4, 0, 3] },
    "4-out-1-in": { PG: [0, 0, 9], SG: [-5, 0, 6], SF: [5, 0, 6], PF: [-4, 0, 3], C: [0, 0, 2.5] },
    box: { PG: [0, 0, 9], SG: [-3, 0, 4], SF: [3, 0, 4], PF: [-3, 0, 2], C: [3, 0, 2] },
    stack: { PG: [0, 0, 9], SG: [-1, 0, 5], SF: [1, 0, 5], PF: [-1, 0, 3.5], C: [1, 0, 3.5] },
    "1-4 high": { PG: [0, 0, 9], SG: [-5, 0, 5], SF: [5, 0, 5], PF: [-3, 0, 5], C: [3, 0, 5] },
    motion: { PG: [0, 0, 9], SG: [-5, 0, 6], SF: [5, 0, 6], PF: [-3.5, 0, 4], C: [3.5, 0, 4] },
  };
  const key = Object.keys(sets).find(k => set.toLowerCase().includes(k)) || "motion";
  return sets[key]?.[pos] ?? [0, 0, 7];
}

function getDefensePos(pos: Position, scheme: string): [number, number, number] {
  const isZone = scheme.includes("zone") || scheme.includes("2-3") || scheme.includes("1-3-1");
  if (isZone) {
    const zone23: Record<Position, [number, number, number]> = {
      PG: [-2.5, 0, 7], SG: [2.5, 0, 7], SF: [-4.5, 0, 4], PF: [4.5, 0, 4], C: [0, 0, 2.5],
    };
    return zone23[pos];
  }
  // Man — shade toward basket from offense
  const off = getStartPos(pos, "motion");
  return [off[0] * 0.85, 0, off[2] - 1.2];
}

// ─── Route builder ────────────────────────────────────────────────────────────
function buildRoute(pos: Position, playType: string, start: [number, number, number], isTarget: boolean): RoutePoint[] {
  const [x, , z] = start;
  const pt = playType.toLowerCase();

  if (pt.includes("pnr")) {
    if (pos === "PG") return [[x, 0, z], [x - 1.5, 0, z - 2], [x - 1.5, 0, z - 4], [x + 1, 0, z - 4]];
    if (pos === "C") return [[x, 0, z], [x - 0.5, 0, z + 0.5], [x - 2, 0, z - 1.5], [x - 2, 0, z - 3]];
    if (isTarget) return [[x, 0, z], [x > 0 ? x - 1 : x + 1, 0, z - 2]];
    return [[x, 0, z], [x, 0, z - 1]];
  }
  if (pt.includes("iso")) {
    if (isTarget) return [[x, 0, z], [x, 0, z - 1.5], [x - 1, 0, z - 3], [x - 1, 0, z - 4.5]];
    return [[x, 0, z], [x > 0 ? x + 1 : x - 1, 0, z]];
  }
  if (pt.includes("post")) {
    if (pos === "C" || pos === "PF") return [[x, 0, z], [x > 0 ? 2 : -2, 0, z - 1], [x > 0 ? 2.5 : -2.5, 0, 2]];
    if (isTarget) return [[x, 0, z], [x, 0, z - 2]];
    return [[x, 0, z], [x, 0, z - 1]];
  }
  if (pt.includes("offball") || pt.includes("catchshoot")) {
    if (isTarget) return [[x, 0, z], [x > 0 ? x - 2 : x + 2, 0, z - 1.5], [x > 0 ? x - 3 : x + 3, 0, z - 0.5]];
    return [[x, 0, z], [x, 0, z - 0.5]];
  }
  if (pt.includes("transition")) {
    return [[x, 0, z], [x * 0.7, 0, z - 3], [x * 0.4, 0, z - 5]];
  }
  // default
  return [[x, 0, z], [x, 0, z - 1.5]];
}

// ─── Court floor ──────────────────────────────────────────────────────────────
function CourtFloor() {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, COURT_D / 2 - 2]}>
        <planeGeometry args={[COURT_W, COURT_D]} />
        <meshStandardMaterial color={C.floor} roughness={0.8} />
      </mesh>
      {/* Paint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, PAINT_D / 2 + HOOP_Z - 0.5]}>
        <planeGeometry args={[PAINT_W, PAINT_D]} />
        <meshStandardMaterial color={C.paint} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Court lines ──────────────────────────────────────────────────────────────
function CourtLines() {
  // 3-point arc points
  const arcPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let a = -Math.PI * 0.72; a <= Math.PI * 0.72; a += 0.05) {
      pts.push([Math.sin(a) * THREE_PT_R, 0.01, Math.cos(a) * THREE_PT_R + HOOP_Z]);
    }
    return pts;
  }, []);

  // Free throw circle
  const ftCircle = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let a = 0; a <= Math.PI * 2; a += 0.1) {
      pts.push([Math.sin(a) * 1.8, 0.01, Math.cos(a) * 1.8 + HOOP_Z + PAINT_D - 1.8]);
    }
    return pts;
  }, []);

  const lc = C.line;
  return (
    <group>
      {/* Baseline */}
      <Line points={[[-COURT_W / 2, 0.01, 0], [COURT_W / 2, 0.01, 0]]} color={lc} lineWidth={1.5} />
      {/* Sidelines */}
      <Line points={[[-COURT_W / 2, 0.01, 0], [-COURT_W / 2, 0.01, COURT_D - 2]]} color={lc} lineWidth={1.5} />
      <Line points={[[COURT_W / 2, 0.01, 0], [COURT_W / 2, 0.01, COURT_D - 2]]} color={lc} lineWidth={1.5} />
      {/* Paint box */}
      <Line points={[[-PAINT_W / 2, 0.01, 0], [-PAINT_W / 2, 0.01, PAINT_D]]} color={lc} lineWidth={1.5} />
      <Line points={[[PAINT_W / 2, 0.01, 0], [PAINT_W / 2, 0.01, PAINT_D]]} color={lc} lineWidth={1.5} />
      <Line points={[[-PAINT_W / 2, 0.01, PAINT_D], [PAINT_W / 2, 0.01, PAINT_D]]} color={lc} lineWidth={1.5} />
      {/* 3-point arc */}
      <Line points={arcPoints} color={lc} lineWidth={1.5} />
      {/* Corner 3 lines */}
      <Line points={[[-COURT_W / 2, 0.01, 0], [-COURT_W / 2, 0.01, 2.15]]} color={lc} lineWidth={1.5} />
      <Line points={[[COURT_W / 2, 0.01, 0], [COURT_W / 2, 0.01, 2.15]]} color={lc} lineWidth={1.5} />
      {/* FT circle */}
      <Line points={ftCircle} color={lc} lineWidth={1} />
      {/* Half-court line */}
      <Line points={[[-COURT_W / 2, 0.01, COURT_D - 2], [COURT_W / 2, 0.01, COURT_D - 2]]} color={lc} lineWidth={1.5} />
    </group>
  );
}

// ─── Hoop ─────────────────────────────────────────────────────────────────────
function Hoop() {
  return (
    <group position={[0, 0, HOOP_Z]}>
      {/* Backboard */}
      <mesh position={[0, 2.2, -0.6]}>
        <boxGeometry args={[1.8, 1.05, 0.05]} />
        <meshStandardMaterial color="#1e2d3d" transparent opacity={0.9} />
      </mesh>
      {/* Backboard outline */}
      <lineSegments position={[0, 2.2, -0.58]}>
        <edgesGeometry args={[new THREE.BoxGeometry(1.8, 1.05, 0.01)]} />
        <lineBasicMaterial color={C.line} />
      </lineSegments>
      {/* Rim */}
      <mesh position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.23, 0.025, 8, 32]} />
        <meshStandardMaterial color={C.hoop} emissive={C.hoop} emissiveIntensity={0.6} />
      </mesh>
      {/* Support pole */}
      <mesh position={[0, 0.8, -0.55]}>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* Net lines */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <Line
            key={i}
            points={[
              [Math.cos(a) * 0.23, 1.55, Math.sin(a) * 0.23],
              [Math.cos(a) * 0.12, 1.1, Math.sin(a) * 0.12],
            ]}
            color="#9CA3AF"
            lineWidth={0.8}
          />
        );
      })}
    </group>
  );
}

// ─── Animated player ──────────────────────────────────────────────────────────
function PlayerMesh({
  player,
  playing,
  progress,
}: {
  player: Player3D;
  playing: boolean;
  progress: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<any>(null);

  const color = player.isDefense ? C.defense : player.isTarget ? C.target : C.offense;

  // Interpolate position along route
  const getPos = (t: number): [number, number, number] => {
    const route = player.route;
    if (route.length < 2) return route[0] ?? player.start;
    const seg = (route.length - 1) * t;
    const i = Math.min(Math.floor(seg), route.length - 2);
    const f = seg - i;
    const a = route[i]!;
    const b = route[i + 1]!;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };

  useFrame(() => {
    if (!meshRef.current) return;
    const [px, py, pz] = getPos(progress);
    meshRef.current.position.set(px, py + 0.35, pz);
    if (labelRef.current) labelRef.current.position.set(px, py + 0.9, pz);
  });

  const startPos = player.start;

  return (
    <group>
      {/* Player cylinder */}
      <mesh ref={meshRef} position={[startPos[0], 0.35, startPos[2]]}>
        <cylinderGeometry args={[0.28, 0.28, 0.7, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={player.isTarget ? 0.5 : 0.25}
          roughness={0.4}
        />
      </mesh>
      {/* Position label */}
      <Text
        ref={labelRef}
        position={[startPos[0], 0.9, startPos[2]]}
        fontSize={0.35}
        color="white"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {player.pos}
      </Text>
      {/* Defense X */}
      {player.isDefense && (
        <group position={[startPos[0], 0.02, startPos[2]]}>
          <Line points={[[-0.2, 0, -0.2], [0.2, 0, 0.2]]} color={C.defense} lineWidth={2} />
          <Line points={[[0.2, 0, -0.2], [-0.2, 0, 0.2]]} color={C.defense} lineWidth={2} />
        </group>
      )}
    </group>
  );
}

// ─── Animated route trail ─────────────────────────────────────────────────────
function RouteLine({ route, progress, isScreen }: { route: RoutePoint[]; progress: number; isScreen: boolean }) {
  const drawn = useMemo(() => {
    if (route.length < 2) return route;
    const total = route.length - 1;
    const seg = total * progress;
    const i = Math.min(Math.floor(seg), total - 1);
    const f = seg - i;
    const partial = route.slice(0, i + 1);
    const next = route[i + 1];
    if (next && f > 0) {
      const last = route[i]!;
      partial.push([last[0] + (next[0] - last[0]) * f, last[1] + (next[1] - last[1]) * f, last[2] + (next[2] - last[2]) * f]);
    }
    return partial.length >= 2 ? partial : route.slice(0, 2);
  }, [route, progress]);

  if (drawn.length < 2) return null;
  return (
    <Line
      points={drawn as [number, number, number][]}
      color={isScreen ? C.screen : C.route}
      lineWidth={isScreen ? 2.5 : 2}
      dashed={isScreen}
      dashSize={0.3}
      gapSize={0.15}
    />
  );
}

// ─── Ball ─────────────────────────────────────────────────────────────────────
function Ball({ pgRoute, progress }: { pgRoute: RoutePoint[]; progress: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || pgRoute.length < 2) return;
    const total = pgRoute.length - 1;
    const seg = total * progress;
    const i = Math.min(Math.floor(seg), total - 1);
    const f = seg - i;
    const a = pgRoute[i]!;
    const b = pgRoute[i + 1]!;
    meshRef.current.position.set(
      a[0] + (b[0] - a[0]) * f,
      0.25 + Math.sin(progress * Math.PI * 3) * 0.08,
      a[2] + (b[2] - a[2]) * f
    );
  });

  return (
    <mesh ref={meshRef} position={[pgRoute[0]?.[0] ?? 0, 0.25, pgRoute[0]?.[2] ?? 8]}>
      <sphereGeometry args={[0.18, 16, 16]} />
      <meshStandardMaterial color={C.ball} emissive={C.ball} emissiveIntensity={0.8} roughness={0.6} />
    </mesh>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function Scene({
  players,
  playing,
  progress,
}: {
  players: Player3D[];
  playing: boolean;
  progress: number;
}) {
  const pgPlayer = players.find(p => p.pos === "PG" && !p.isDefense);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 8, 6]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-5, 5, 10]} intensity={0.4} color="#3b82f6" />
      <pointLight position={[5, 5, 10]} intensity={0.4} color="#FF7A1A" />

      <CourtFloor />
      <CourtLines />
      <Hoop />

      {/* Route trails for offense */}
      {players
        .filter(p => !p.isDefense && p.route.length >= 2)
        .map(p => (
          <RouteLine
            key={p.id + "-route"}
            route={p.route}
            progress={progress}
            isScreen={p.pos === "C" || p.pos === "PF"}
          />
        ))}

      {/* Players */}
      {players.map(p => (
        <PlayerMesh key={p.id} player={p} playing={playing} progress={progress} />
      ))}

      {/* Ball follows PG */}
      {pgPlayer && <Ball pgRoute={pgPlayer.route} progress={progress} />}

      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={22}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 5]}
      />
    </>
  );
}

// ─── Camera reset helper ──────────────────────────────────────────────────────
function CameraReset({ trigger }: { trigger: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 10, 18);
    camera.lookAt(0, 0, 5);
  }, [trigger, camera]);
  return null;
}

// ─── Main exported component ──────────────────────────────────────────────────
export interface PlayCourt3DProps {
  set: string;
  playName: string;
  playType: string;
  target: string;
  defenseScheme: string;
}

export function PlayCourt3D({ set, playName, playType, target, defenseScheme }: PlayCourt3DProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cameraReset, setCameraReset] = useState(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const DURATION = 3500; // ms

  // Build players
  const players = useMemo<Player3D[]>(() => {
    const positions: Position[] = ["PG", "SG", "SF", "PF", "C"];
    const offense: Player3D[] = positions.map(pos => {
      const start = getStartPos(pos, set);
      const route = buildRoute(pos, playType, start, pos === (target as Position));
      return { id: `o-${pos}`, pos, start, route, isDefense: false, isTarget: pos === (target as Position) };
    });
    const defense: Player3D[] = positions.map(pos => {
      const start = getDefensePos(pos, defenseScheme);
      return { id: `d-${pos}`, pos, start, route: [start], isDefense: true, isTarget: false };
    });
    return [...offense, ...defense];
  }, [set, playType, target, defenseScheme]);

  const handlePlay = () => {
    if (playing) return;
    setProgress(0);
    setPlaying(true);
    startTimeRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const p = Math.min(elapsed / DURATION, 1);
      setProgress(p);
      if (p < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setPlaying(false);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  const handleReset = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setPlaying(false);
    setProgress(0);
    setCameraReset(n => n + 1);
  };

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-mono text-primary font-bold tracking-wider uppercase">{playName}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Drag to rotate · Scroll to zoom</span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setCameraReset(n => n + 1)} title="Reset camera">
            <Camera className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="h-56 w-full">
        <Canvas
          camera={{ position: [0, 10, 18], fov: 45 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: "#0d1117" }}
        >
          <CameraReset trigger={cameraReset} />
          <Scene players={players} playing={playing} progress={progress} />
        </Canvas>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        <Button
          size="sm"
          className="gap-1.5 h-7 text-xs font-semibold"
          onClick={handlePlay}
          disabled={playing}
        >
          <Play className="h-3 w-3" />
          {playing ? "Running..." : "Run Play"}
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={handleReset}>
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
        {/* Legend */}
        <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.offense }} />Offense</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.defense }} />Defense</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.target }} />Primary</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.screen }} />Screen</span>
        </div>
      </div>
    </div>
  );
}
