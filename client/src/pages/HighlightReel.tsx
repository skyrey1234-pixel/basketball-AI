import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import LakersOverlayPreview from "@/components/highlight/LakersOverlayPreview";
import { renderOverlayCardBlob } from "@/lib/renderOverlayCard";

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

const ACCENT_STYLES = [
  { id: "showtime", label: "Showtime" },
  { id: "midnight", label: "Midnight" },
  { id: "hardwood", label: "Hardwood" },
] as const;

type AccentStyle = (typeof ACCENT_STYLES)[number]["id"];

function downloadFile(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toSrtTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s},000`;
}

export default function HighlightReel() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [reelId, setReelId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [accentStyle, setAccentStyle] = useState<AccentStyle>("showtime");
  const [showExport, setShowExport] = useState(false);
  const [renderingCards, setRenderingCards] = useState(false);

  const { data: sessions } = trpc.sessions.list.useQuery();
  const generateMut = trpc.highlightReel.generate.useMutation({
    onSuccess: (data) => setReelId(data.id),
    onError: (e) => toast.error(e.message || "Could not start highlight reel generation"),
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
  const activeReelId = reel?.id ?? existingReel?.id ?? null;
  const reelFailed = (reel?.status ?? existingReel?.status) === "error";
  const reelError = reel?.errorMessage ?? existingReel?.errorMessage ?? null;

  const { data: exportPkg, isFetching: exportLoading } = trpc.highlightReel.exportPackage.useQuery(
    { id: activeReelId!, teamName: teamName.trim() || undefined, accentStyle },
    { enabled: showExport && !!activeReelId }
  );

  const exportFiles = useMemo(() => {
    if (!exportPkg) return null;
    const slug = (exportPkg.teamName || "courtvision").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const srt = exportPkg.clips
      .map((c, i) => `${i + 1}\n${toSrtTimestamp(c.startSeconds)} --> ${toSrtTimestamp(c.endSeconds)}\n${c.overlay.topLeft} | ${c.label}\n${c.coachingPoint}\n`)
      .join("\n");

    const csv = [
      "clip,label,type,start_seconds,end_seconds,duration_seconds,timecode,coaching_point",
      ...exportPkg.clips.map(c =>
        [c.clipNumber, c.label, c.type, c.startSeconds, c.endSeconds, c.durationSeconds, c.timecode, c.coachingPoint]
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    return { slug, srt, csv, json: JSON.stringify(exportPkg, null, 2) };
  }, [exportPkg]);

  async function handleDownloadCards() {
    if (!exportPkg) return;
    setRenderingCards(true);
    try {
      let saved = 0;
      for (const clip of exportPkg.clips) {
        const blob = await renderOverlayCardBlob(clip);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(exportPkg.teamName || "courtvision").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-clip-${String(clip.clipNumber).padStart(2, "0")}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        saved += 1;
        await new Promise(r => setTimeout(r, 120));
      }
      toast.success(`${saved} branded overlay card${saved === 1 ? "" : "s"} downloaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not render overlay cards");
    } finally {
      setRenderingCards(false);
    }
  }

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

        {/* Failure state */}
        {!isGenerating && reelFailed && (
          <div className="lakers-surface border border-red-500/40 rounded-xl p-5 mb-6">
            <h2 className="text-red-300 font-bold mb-1">Highlight reel generation failed</h2>
            <p className="text-sm text-purple-100/80">
              {reelError || "The reel job did not finish. Try generating it again."}
            </p>
            <Button
              size="sm"
              onClick={() => selectedSession && generateMut.mutate({ sessionId: selectedSession })}
              className="gold-glow mt-3 bg-[#FDB927] hover:bg-[#ffe08a] text-[#2b1249] font-bold"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Moments List */}
        {!isGenerating && activeMoments.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold">Highlight Moments ({activeMoments.length})</h2>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#FDB927]/15 text-[#FDE68A] border-[#FDB927]/30">Ready for Film Review</Badge>
                <Button
                  size="sm"
                  onClick={() => setShowExport(v => !v)}
                  disabled={!activeReelId}
                  className="gold-glow bg-[#FDB927] hover:bg-[#ffe08a] text-[#2b1249] font-bold"
                >
                  {showExport ? "Hide Export" : "🎨 Export with Lakers Overlay"}
                </Button>
              </div>
            </div>

            {/* Lakers-themed export panel */}
            {showExport && (
              <div className="lakers-surface border border-[#FDB927]/35 rounded-xl p-4 shadow-[inset_0_1px_0_rgba(253,185,39,0.14)]">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[200px] flex-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-[#FDE68A]">Team Lockup</label>
                    <Input
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      placeholder="e.g. Ribault Trojans"
                      className="mt-1 bg-[#190c2b] border-[#76549a]/70 text-white"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#FDE68A]">Overlay Style</span>
                    <div className="mt-1 flex gap-2">
                      {ACCENT_STYLES.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setAccentStyle(s.id)}
                          className={`gold-glow rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                            accentStyle === s.id
                              ? "border-[#FDB927] bg-[#FDB927]/15 text-[#FDE68A]"
                              : "border-[#6b4a92]/60 bg-[#211037] text-purple-100/70"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {exportLoading && <p className="mt-4 text-sm text-purple-100/70">Building export package…</p>}

                {exportPkg && exportFiles && (
                  <>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {exportPkg.clips.slice(0, 6).map(c => (
                        <LakersOverlayPreview key={c.clipNumber} clip={c} />
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-purple-100/70">
                        {exportPkg.totalClips} clips · {exportPkg.totalRuntimeSeconds}s runtime · {exportPkg.theme.label}
                      </span>
                      <div className="ml-auto flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={renderingCards}
                          onClick={handleDownloadCards}
                          className="gold-glow bg-[#FDB927] hover:bg-[#ffe08a] text-[#2b1249] font-bold"
                        >
                          {renderingCards ? "Rendering cards…" : "⬇ Overlay Cards (PNG)"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gold-glow bg-[#FDB927] hover:bg-[#ffe08a] text-[#2b1249] font-bold"
                          onClick={() => {
                            downloadFile(`${exportFiles.slug}-overlay-package.json`, exportFiles.json, "application/json");
                            toast.success("Overlay package downloaded");
                          }}
                        >
                          ⬇ Overlay Package (JSON)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gold-glow border-[#76549a]/70 text-purple-100"
                          onClick={() => {
                            downloadFile(`${exportFiles.slug}-clip-titles.srt`, exportFiles.srt, "application/x-subrip");
                            toast.success("Burn-in titles downloaded");
                          }}
                        >
                          ⬇ Burn-in Titles (SRT)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gold-glow border-[#76549a]/70 text-purple-100"
                          onClick={() => {
                            downloadFile(`${exportFiles.slug}-cut-list.csv`, exportFiles.csv, "text/csv");
                            toast.success("Cut list downloaded");
                          }}
                        >
                          ⬇ Cut List (CSV)
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-purple-100/55">
                      Drop the SRT and cut list into your editor to burn these exact purple-and-gold titles onto each clip.
                      The JSON package carries every overlay field, timecode, and theme color.
                    </p>
                  </>
                )}
              </div>
            )}

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
