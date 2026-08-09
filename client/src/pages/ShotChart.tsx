import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

const ZONES: Record<string, { label: string; x: number; y: number; w: number; h: number }> = {
  corner3L:  { label: "Corner 3 Left",  x: 0,   y: 55, w: 12, h: 30 },
  corner3R:  { label: "Corner 3 Right", x: 88,  y: 55, w: 12, h: 30 },
  wing3L:    { label: "Wing 3 Left",    x: 0,   y: 20, w: 20, h: 35 },
  wing3R:    { label: "Wing 3 Right",   x: 80,  y: 20, w: 20, h: 35 },
  top3:      { label: "Top of Key 3",   x: 30,  y: 0,  w: 40, h: 20 },
  midL:      { label: "Mid-Range Left", x: 10,  y: 30, w: 25, h: 30 },
  midR:      { label: "Mid-Range Right",x: 65,  y: 30, w: 25, h: 30 },
  paint:     { label: "Paint",          x: 30,  y: 50, w: 40, h: 40 },
  freeThrow: { label: "Free Throw",     x: 35,  y: 35, w: 30, h: 20 },
};

function getZoneFromXY(x: number, y: number): string {
  if (y > 55) {
    if (x < 12) return "corner3L";
    if (x > 88) return "corner3R";
  }
  if (x < 20 && y > 20) return "wing3L";
  if (x > 80 && y > 20) return "wing3R";
  if (y < 20) return "top3";
  if (x > 30 && x < 70 && y > 35 && y < 55) return "freeThrow";
  if (x > 30 && x < 70 && y > 50) return "paint";
  if (x < 45) return "midL";
  return "midR";
}

function getZoneColor(zone: string, shots: any[], opacity = 0.35): string {
  const zonShots = shots.filter(s => s.zone === zone);
  if (zonShots.length < 2) return `rgba(100,100,100,${opacity * 0.5})`;
  const pct = zonShots.filter(s => s.made).length / zonShots.length;
  if (pct >= 0.5) return `rgba(0,200,100,${opacity + 0.1})`;
  if (pct >= 0.35) return `rgba(255,200,0,${opacity})`;
  return `rgba(255,60,60,${opacity})`;
}

export default function ShotChart() {
  const [activeChart, setActiveChart] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [newTeam, setNewTeam] = useState("");
  const [newOpp, setNewOpp] = useState("");
  const [shotMode, setShotMode] = useState<"made" | "missed">("made");
  const [selectedPlayer, setSelectedPlayer] = useState("Team");
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const courtRef = useRef<HTMLDivElement>(null);

  const { data: charts, refetch } = trpc.shotChart.list.useQuery();
  const createMut = trpc.shotChart.create.useMutation({
    onSuccess: (chart) => { setActiveChart(chart); setCreating(false); refetch(); },
  });
  const logShotMut = trpc.shotChart.logShot.useMutation();
  const undoMut = trpc.shotChart.undoShot.useMutation();
  const { data: stats } = trpc.shotChart.getStats.useQuery(
    { chartId: activeChart?.id },
    { enabled: !!activeChart?.id, refetchInterval: 2000 }
  );
  const { data: chartData, refetch: refetchChart } = trpc.shotChart.get.useQuery(
    { id: activeChart?.id },
    { enabled: !!activeChart?.id, refetchInterval: 2000 }
  );

  const shots: any[] = chartData?.shotsJson ? JSON.parse(chartData.shotsJson) : [];

  const handleCourtClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeChart || !courtRef.current) return;
    const rect = courtRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const zone = getZoneFromXY(x, y);
    logShotMut.mutate({
      chartId: activeChart.id,
      shot: { x, y, zone, made: shotMode === "made", player: selectedPlayer, quarter: selectedQuarter },
    }, {
      onSuccess: () => { refetchChart(); },
    });
  }, [activeChart, shotMode, selectedPlayer, selectedQuarter]);

  const handleUndo = () => {
    if (!activeChart) return;
    undoMut.mutate({ chartId: activeChart.id }, { onSuccess: () => refetchChart() });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🏀</span> Shot Chart Tracker
            </h1>
            <p className="text-gray-400 text-sm mt-1">Click the court to log shots. Real-time heat map updates automatically.</p>
          </div>
          <Button onClick={() => setCreating(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
            + New Chart
          </Button>
        </div>

        {/* Create New Chart Modal */}
        {creating && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-96">
              <h2 className="text-white font-bold text-lg mb-4">New Shot Chart</h2>
              <Input placeholder="Your Team Name" value={newTeam} onChange={e => setNewTeam(e.target.value)} className="mb-3 bg-gray-800 border-gray-600 text-white" />
              <Input placeholder="Opponent Name (optional)" value={newOpp} onChange={e => setNewOpp(e.target.value)} className="mb-4 bg-gray-800 border-gray-600 text-white" />
              <div className="flex gap-2">
                <Button onClick={() => createMut.mutate({ teamName: newTeam, opponentName: newOpp })} disabled={!newTeam} className="flex-1 bg-orange-500 hover:bg-orange-600">Start Tracking</Button>
                <Button variant="outline" onClick={() => setCreating(false)} className="flex-1 border-gray-600 text-gray-300">Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* Past Charts List */}
        {!activeChart && charts && charts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-3">Recent Charts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {charts.slice(0, 6).map((c: any) => (
                <div key={c.id} onClick={() => setActiveChart(c)} className="bg-gray-900 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-orange-500 transition-colors">
                  <div className="font-semibold text-white">{c.teamName}</div>
                  {c.opponentName && <div className="text-gray-400 text-sm">vs {c.opponentName}</div>}
                  <div className="text-orange-400 text-xs mt-1">{new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeChart && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Court */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-white font-bold">{activeChart.teamName}</span>
                    {activeChart.opponentName && <span className="text-gray-400 text-sm ml-2">vs {activeChart.opponentName}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleUndo} className="border-gray-600 text-gray-300 text-xs">↩ Undo</Button>
                    <Button size="sm" variant="outline" onClick={() => setActiveChart(null)} className="border-gray-600 text-gray-300 text-xs">← Back</Button>
                  </div>
                </div>

                {/* Shot Mode Toggle */}
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setShotMode("made")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${shotMode === "made" ? "bg-green-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>✓ Made</button>
                  <button onClick={() => setShotMode("missed")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${shotMode === "missed" ? "bg-red-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>✗ Missed</button>
                  {[1,2,3,4].map(q => (
                    <button key={q} onClick={() => setSelectedQuarter(q)} className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${selectedQuarter === q ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>Q{q}</button>
                  ))}
                </div>

                {/* Basketball Court */}
                <div
                  ref={courtRef}
                  onClick={handleCourtClick}
                  className="relative cursor-crosshair rounded-lg overflow-hidden select-none"
                  style={{ background: "#C8A96E", aspectRatio: "1.87/1" }}
                >
                  {/* Court lines SVG */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 187 100" preserveAspectRatio="none">
                    {/* Court outline */}
                    <rect x="1" y="1" width="185" height="98" fill="none" stroke="white" strokeWidth="0.8" opacity="0.6"/>
                    {/* Paint */}
                    <rect x="74" y="60" width="39" height="39" fill="rgba(180,140,80,0.4)" stroke="white" strokeWidth="0.8" opacity="0.8"/>
                    {/* Free throw circle */}
                    <circle cx="93.5" cy="60" r="15" fill="none" stroke="white" strokeWidth="0.8" opacity="0.6"/>
                    {/* Basket */}
                    <circle cx="93.5" cy="94" r="2.5" fill="none" stroke="white" strokeWidth="1.2" opacity="0.9"/>
                    {/* 3pt arc */}
                    <path d="M 15 100 A 79 79 0 0 1 172 100" fill="none" stroke="white" strokeWidth="0.8" opacity="0.6"/>
                    {/* Corner 3 lines */}
                    <line x1="15" y1="60" x2="15" y2="100" stroke="white" strokeWidth="0.8" opacity="0.6"/>
                    <line x1="172" y1="60" x2="172" y2="100" stroke="white" strokeWidth="0.8" opacity="0.6"/>
                    {/* Center line */}
                    <line x1="1" y1="50" x2="186" y2="50" stroke="white" strokeWidth="0.5" opacity="0.3" strokeDasharray="3,3"/>
                  </svg>

                  {/* Zone heat overlays */}
                  {Object.entries(ZONES).map(([zone, z]) => (
                    <div key={zone} className="absolute pointer-events-none transition-colors duration-500"
                      style={{
                        left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%`,
                        background: getZoneColor(zone, shots),
                        borderRadius: zone === "paint" ? "4px 4px 0 0" : "4px",
                      }}
                    />
                  ))}

                  {/* Shot dots */}
                  {shots.map((shot: any) => (
                    <div key={shot.id} className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${shot.x}%`, top: `${shot.y}%` }}
                    >
                      <div className={`w-3 h-3 rounded-full border-2 border-white ${shot.made ? "bg-green-400" : "bg-red-400"}`} style={{ opacity: 0.9 }} />
                    </div>
                  ))}

                  {/* Click hint */}
                  {shots.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/60 text-white text-sm px-4 py-2 rounded-full">Click anywhere on the court to log a shot</div>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block"/>Made</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"/>Missed</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500/50 inline-block"/>Hot Zone</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500/50 inline-block"/>Cold Zone</span>
                </div>
              </div>
            </div>

            {/* Stats Panel */}
            <div className="space-y-4">
              {/* Overall Stats */}
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Live Stats</h3>
                {stats ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Field Goal %</span>
                      <span className="text-orange-400 font-bold text-xl">{stats.pct}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${stats.pct}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-800 rounded-lg p-2">
                        <div className="text-white font-bold">{stats.total}</div>
                        <div className="text-gray-500 text-xs">Total</div>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2">
                        <div className="text-green-400 font-bold">{stats.made}</div>
                        <div className="text-gray-500 text-xs">Made</div>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2">
                        <div className="text-red-400 font-bold">{stats.missed}</div>
                        <div className="text-gray-500 text-xs">Missed</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Log shots to see stats</p>
                )}
              </div>

              {/* Hot/Cold Zones */}
              {stats && (stats.hotZones.length > 0 || stats.coldZones.length > 0) && (
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                  <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Zone Analysis</h3>
                  {stats.hotZones.length > 0 && (
                    <div className="mb-2">
                      <div className="text-green-400 text-xs font-semibold mb-1">🔥 HOT ZONES</div>
                      {stats.hotZones.map((z: string) => (
                        <Badge key={z} className="mr-1 mb-1 bg-green-500/20 text-green-300 border-green-500/30 text-xs">{ZONES[z]?.label || z}</Badge>
                      ))}
                    </div>
                  )}
                  {stats.coldZones.length > 0 && (
                    <div>
                      <div className="text-red-400 text-xs font-semibold mb-1">❄️ COLD ZONES</div>
                      {stats.coldZones.map((z: string) => (
                        <Badge key={z} className="mr-1 mb-1 bg-red-500/20 text-red-300 border-red-500/30 text-xs">{ZONES[z]?.label || z}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Zone Breakdown */}
              {stats && Object.keys(stats.zones).length > 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                  <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">By Zone</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.zones).map(([zone, data]: [string, any]) => (
                      <div key={zone} className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{ZONES[zone]?.label || zone}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-800 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${(data.made / data.total) * 100}%` }} />
                          </div>
                          <span className="text-white text-xs font-mono w-16 text-right">{data.made}/{data.total} ({Math.round((data.made/data.total)*100)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quarter Breakdown */}
              {stats && Object.keys(stats.byQuarter).length > 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                  <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">By Quarter</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[1,2,3,4].map(q => {
                      const qd = (stats.byQuarter as any)[q];
                      return (
                        <div key={q} className="bg-gray-800 rounded-lg p-2 text-center">
                          <div className="text-gray-400 text-xs mb-1">Q{q}</div>
                          <div className="text-white font-bold text-sm">{qd ? `${qd.made}/${qd.total}` : "—"}</div>
                          <div className="text-orange-400 text-xs">{qd && qd.total > 0 ? `${Math.round((qd.made/qd.total)*100)}%` : ""}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!activeChart && (!charts || charts.length === 0) && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏀</div>
            <h2 className="text-white text-xl font-bold mb-2">No Shot Charts Yet</h2>
            <p className="text-gray-400 mb-6">Create your first shot chart to start tracking shots in real time.</p>
            <Button onClick={() => setCreating(true)} className="bg-orange-500 hover:bg-orange-600 text-white">Create Shot Chart</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
