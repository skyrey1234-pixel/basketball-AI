import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  great_play:     { label: "Great Play",      color: "bg-green-500/20 text-green-300 border-green-500/30",   icon: "⭐" },
  mistake:        { label: "Teachable Moment", color: "bg-red-500/20 text-red-300 border-red-500/30",        icon: "📌" },
  defensive_stop: { label: "Defensive Stop",  color: "bg-blue-500/20 text-blue-300 border-blue-500/30",     icon: "🛡️" },
  clutch:         { label: "Clutch Moment",   color: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: "🔥" },
  teachable:      { label: "Coaching Point",  color: "bg-[#FDB927]/15 text-[#FDE68A] border-[#FDB927]/30", icon: "💡" },
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function HighlightReel() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [reelId, setReelId] = useState<number | null>(null);

  const { data: sessions } = trpc.sessions.list.useQuery();
  const generateMut = trpc.highlightReel.generate.useMutation({
    onSuccess: (data) => setReelId(data.id),
  });
  const { data: reel } = trpc.highlightReel.get.useQuery(
    { id: reelId! },
    { enabled: !!reelId, refetchInterval: (q) => q.state.data?.status === "generating" ? 3000 : false }
  );
  const { data: existingReel } = trpc.highlightReel.getBySession.useQuery(
    { sessionId: selectedSession! },
    { enabled: !!selectedSession }
  );

  const activeMoments = reel?.moments || existingReel?.moments || [];
  const isGenerating = reel?.status === "generating" || generateMut.isPending;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎬</span> Highlight Reel Generator
          </h1>
          <p className="text-gray-400 text-sm mt-1">Inspired by shotcut — AI identifies the 8 most impactful moments from your game film and builds a coaching highlight package.</p>
        </div>

        {/* Session Selector */}
        <div className="lakers-surface border border-[#76549a]/60 rounded-xl p-4 mb-6 shadow-[inset_0_1px_0_rgba(253,185,39,0.1)]">
          <h2 className="text-white font-semibold mb-3">Select a Scouting Session</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sessions?.map((s: any) => (
              <div
                key={s.id}
                onClick={() => { setSelectedSession(s.id); setReelId(null); }}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedSession === s.id ? "border-[#FDB927] bg-[#FDB927]/10 shadow-[0_0_20px_rgba(253,185,39,0.1)]" : "border-[#6b4a92]/55 bg-[#211037] hover:border-[#a17fc5]"}`}
              >
                <div className="text-white font-medium text-sm">vs {s.opponentName}</div>
                <div className="text-gray-400 text-xs">{new Date(s.createdAt).toLocaleDateString()}</div>
                <Badge className={`mt-1 text-xs ${s.status === "complete" ? "bg-green-500/20 text-green-300" : "bg-gray-700 text-gray-400"}`} variant="outline">{s.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        {selectedSession && (
          <div className="mb-6 flex gap-3">
            <Button
              onClick={() => generateMut.mutate({ sessionId: selectedSession })}
              disabled={isGenerating}
              className="bg-[#FDB927] hover:bg-[#ffe08a] text-[#2b1249] font-bold"
            >
              {isGenerating ? "Generating..." : existingReel ? "🔄 Regenerate Reel" : "🎬 Generate Highlight Reel"}
            </Button>
            {existingReel && !reelId && (
              <Badge className="self-center bg-green-500/20 text-green-300 border-green-500/30 px-3 py-1">
                Reel exists — {existingReel.moments?.length || 0} moments
              </Badge>
            )}
          </div>
        )}

        {/* Generating State */}
        {isGenerating && (
          <div className="flex flex-col items-center py-16">
            <div className="text-5xl mb-4 animate-pulse">🎬</div>
            <h2 className="text-white font-bold text-lg mb-2">Building Your Highlight Reel...</h2>
            <p className="text-gray-400 text-sm">AI is scanning the film for key moments, mistakes, and clutch plays</p>
          </div>
        )}

        {/* Moments List */}
        {!isGenerating && activeMoments.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold">Highlight Moments ({activeMoments.length})</h2>
              <Badge className="bg-[#FDB927]/15 text-[#FDE68A] border-[#FDB927]/30">Ready for Film Review</Badge>
            </div>
            {activeMoments.map((moment: any, i: number) => {
              const cfg = TYPE_CONFIG[moment.type] || TYPE_CONFIG.teachable;
              return (
                <div key={i} className="lakers-surface border border-[#76549a]/60 rounded-xl p-4 hover:border-[#FDB927]/45 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FDB927]/15 border border-[#FDB927]/40 flex items-center justify-center text-sm font-bold text-[#FDE68A]">
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{moment.label}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-gray-400 text-xs">⏱ {formatTime(moment.timestamp)} — {formatTime(moment.endTimestamp)}</span>
                          <span className="text-gray-500 text-xs">({moment.duration}s)</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${cfg.color} text-xs`} variant="outline">{cfg.icon} {cfg.label}</Badge>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{moment.why}</p>
                  <div className="bg-[#FDB927]/10 border border-[#FDB927]/20 rounded-lg p-3">
                    <span className="text-[#FDE68A] text-xs font-semibold">COACHING POINT: </span>
                    <span className="text-gray-300 text-sm">{moment.coachingPoint}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!selectedSession && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-white text-xl font-bold mb-2">Select a Session to Start</h2>
            <p className="text-gray-400">Choose a completed scouting session above to generate a highlight reel.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
