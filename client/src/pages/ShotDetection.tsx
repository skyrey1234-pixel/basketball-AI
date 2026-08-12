import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";

const ZONE_LABELS: Record<string, string> = {
  corner3L: "Corner 3 Left", corner3R: "Corner 3 Right",
  wing3L: "Wing 3 Left", wing3R: "Wing 3 Right",
  top3: "Top of Key 3", midL: "Mid-Range Left",
  midR: "Mid-Range Right", paint: "Paint", freeThrow: "Free Throw",
};

function ZoneBar({ zone, data }: { zone: string; data: { attempts: number; made: number; pct: number } }) {
  const color = data.pct >= 50 ? "bg-green-500" : data.pct >= 35 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-xs w-28 shrink-0">{ZONE_LABELS[zone] || zone}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${data.pct}%` }} />
      </div>
      <span className="text-white text-xs font-mono w-20 text-right">{data.made}/{data.attempts} ({data.pct}%)</span>
    </div>
  );
}

export default function ShotDetection() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  const { data: sessions } = trpc.sessions.list.useQuery();
  const analyzeMut = trpc.shotDetection.analyze.useMutation();
  const { data: report } = trpc.shotDetection.get.useQuery(
    { sessionId: selectedSession! },
    { enabled: !!selectedSession, refetchInterval: (q) => q.state.data?.status === "analyzing" ? 3000 : false }
  );

  const analytics = report?.analytics;
  const isAnalyzing = report?.status === "analyzing" || analyzeMut.isPending;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📡</span> Shot Detection Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">Inspired by Basketball-Shot-Detector-Tracker (YOLOv8) — AI analyzes your game film for shot zones, make/miss breakdown, scoring patterns, and defensive recommendations.</p>
        </div>

        {/* Session Selector */}
        <div className="lakers-surface border border-[#76549a]/60 rounded-xl p-4 mb-6 shadow-[inset_0_1px_0_rgba(253,185,39,0.1)]">
          <h2 className="text-white font-semibold mb-3">Select a Session to Analyze</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sessions?.map((s: any) => (
              <div
                key={s.id}
                onClick={() => setSelectedSession(s.id)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedSession === s.id ? "border-[#FDB927] bg-[#FDB927]/10 shadow-[0_0_20px_rgba(253,185,39,0.1)]" : "border-[#6b4a92]/55 bg-[#211037] hover:border-[#a17fc5]"}`}
              >
                <div className="text-white font-medium text-sm">vs {s.opponentName}</div>
                <div className="text-gray-400 text-xs">{new Date(s.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>

        {selectedSession && (
          <div className="mb-6">
            <Button
              onClick={() => analyzeMut.mutate({ sessionId: selectedSession })}
              disabled={isAnalyzing}
              className="bg-[#FDB927] hover:bg-[#ffe08a] text-[#2b1249] font-bold"
            >
              {isAnalyzing ? "Analyzing..." : report ? "🔄 Re-Analyze" : "📡 Run Shot Detection"}
            </Button>
          </div>
        )}

        {/* Analyzing State */}
        {isAnalyzing && (
          <div className="flex flex-col items-center py-16">
            <div className="text-5xl mb-4">📡</div>
            <h2 className="text-white font-bold text-lg mb-2">Running Shot Detection...</h2>
            <p className="text-gray-400 text-sm mb-6">AI is tracking ball trajectory, detecting made/missed shots, and mapping shot zones</p>
            <div className="flex gap-3">
              {["Ball Tracking", "Zone Mapping", "Pattern Analysis", "Defense Report"].map((step, i) => (
                <div key={step} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-[#FDB927]/15 border border-[#FDB927] flex items-center justify-center animate-pulse" style={{ animationDelay: `${i * 0.4}s` }}>
                    <span className="text-[#FDE68A] text-xs">●</span>
                  </div>
                  <span className="text-gray-500 text-xs text-center">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Dashboard */}
        {!isAnalyzing && analytics && (
          <div className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Shots", value: analytics.totalShots, color: "text-white" },
                { label: "FG%", value: `${analytics.fieldGoalPct}%`, color: "text-[#FDB927]" },
                { label: "3PT%", value: `${analytics.threePtPct}%`, color: "text-blue-400" },
                { label: "2PT%", value: `${analytics.twoPointPct}%`, color: "text-green-400" },
              ].map(stat => (
                <div key={stat.label} className="lakers-surface border border-[#76549a]/60 rounded-xl p-4 text-center">
                  <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-gray-400 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Made vs Missed */}
              <div className="lakers-surface border border-[#76549a]/60 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Shot Breakdown</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-400">Made: {analytics.madeShots}</span>
                      <span className="text-red-400">Missed: {analytics.missedShots}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div className="h-3 bg-green-500 rounded-l-full" style={{ width: `${analytics.fieldGoalPct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">3-Pointers</span>
                    <span className="text-white">{analytics.threePtMade}/{analytics.threePtAttempts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">2-Pointers</span>
                    <span className="text-white">{analytics.twoPointMade}/{analytics.twoPointAttempts}</span>
                  </div>
                </div>
              </div>

              {/* Hot/Cold Zones */}
              <div className="lakers-surface border border-[#76549a]/60 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Zone Ratings</h3>
                {analytics.hotZones?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-green-400 text-xs font-semibold mb-1">🔥 HOT ZONES</div>
                    {analytics.hotZones.map((z: string) => (
                      <Badge key={z} className="mr-1 mb-1 bg-green-500/20 text-green-300 border-green-500/30 text-xs">{ZONE_LABELS[z] || z}</Badge>
                    ))}
                  </div>
                )}
                {analytics.coldZones?.length > 0 && (
                  <div>
                    <div className="text-blue-400 text-xs font-semibold mb-1">❄️ COLD ZONES</div>
                    {analytics.coldZones.map((z: string) => (
                      <Badge key={z} className="mr-1 mb-1 bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">{ZONE_LABELS[z] || z}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Quarter Timeline */}
              <div className="lakers-surface border border-[#76549a]/60 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">By Quarter</h3>
                <div className="space-y-2">
                  {analytics.shotTimeline?.map((q: any) => (
                    <div key={q.quarter} className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs w-6">Q{q.quarter}</span>
                      <div className="flex-1 bg-[#190c2b] rounded-full h-2">
                        <div className="h-2 bg-[#FDB927] rounded-full" style={{ width: `${(q.made / (q.made + q.missed)) * 100}%` }} />
                      </div>
                      <span className="text-white text-xs font-mono w-16 text-right">{q.made}/{q.made + q.missed}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Zone Breakdown */}
            {analytics.shotsByZone && (
              <div className="lakers-surface border border-[#76549a]/60 rounded-xl p-4">
                <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Shot Zone Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.shotsByZone).map(([zone, data]: [string, any]) => (
                    <ZoneBar key={zone} zone={zone} data={data} />
                  ))}
                </div>
              </div>
            )}

            {/* Key Patterns */}
            {analytics.keyPatterns?.length > 0 && (
              <div className="lakers-surface border border-[#76549a]/60 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">🔍 Key Patterns Detected</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {analytics.keyPatterns.map((pattern: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 bg-[#211037] rounded-lg p-3">
                      <span className="text-[#FDB927] mt-0.5 shrink-0">→</span>
                      <span className="text-gray-300 text-sm">{pattern}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Defense Recommendation */}
            {analytics.defenseRecommendation && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h3 className="text-blue-400 font-bold mb-2 text-sm uppercase tracking-wider">🛡️ Defensive Strategy</h3>
                <p className="text-gray-300">{analytics.defenseRecommendation}</p>
              </div>
            )}
          </div>
        )}

        {!selectedSession && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📡</div>
            <h2 className="text-white text-xl font-bold mb-2">Select a Session Above</h2>
            <p className="text-gray-400">Choose a scouting session to run AI shot detection analytics.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
