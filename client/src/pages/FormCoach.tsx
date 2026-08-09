import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444";
  const r = 28; const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#374151" strokeWidth="5"/>
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
          transform="rotate(-90 36 36)" style={{ transition: "stroke-dasharray 0.8s ease" }}/>
        <text x="36" y="41" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{score}</text>
      </svg>
      <span className="text-gray-400 text-xs text-center">{label}</span>
    </div>
  );
}

function CategoryCard({ title, data }: { title: string; data: { score: number; feedback: string; fix: string } }) {
  const color = data.score >= 80 ? "border-green-500/40 bg-green-500/5" : data.score >= 65 ? "border-yellow-500/40 bg-yellow-500/5" : "border-red-500/40 bg-red-500/5";
  const badge = data.score >= 80 ? "bg-green-500/20 text-green-300" : data.score >= 65 ? "bg-yellow-500/20 text-yellow-300" : "bg-red-500/20 text-red-300";
  return (
    <div className={`border rounded-xl p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-semibold text-sm">{title}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{data.score}/100</span>
      </div>
      <p className="text-gray-300 text-sm mb-2">{data.feedback}</p>
      <div className="bg-black/30 rounded-lg p-2">
        <span className="text-orange-400 text-xs font-semibold">FIX: </span>
        <span className="text-gray-300 text-xs">{data.fix}</span>
      </div>
    </div>
  );
}

export default function FormCoach() {
  const [playerName, setPlayerName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [analysisId, setAnalysisId] = useState<number | null>(null);

  const analyzeMut = trpc.formCoach.analyze.useMutation({
    onSuccess: (data) => setAnalysisId(data.id),
  });
  const { data: analysis, isLoading } = trpc.formCoach.get.useQuery(
    { id: analysisId! },
  { enabled: !!analysisId, refetchInterval: (query) => query.state.data?.status === "analyzing" ? 3000 : false }
  );
  const { data: history } = trpc.formCoach.list.useQuery();

  const result = analysis?.analysisData;
  const isAnalyzing = analysis?.status === "analyzing" || analyzeMut.isPending;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎯</span> AI Form Coach
          </h1>
          <p className="text-gray-400 text-sm mt-1">Inspired by Flick AI — paste a player's shooting video and get a full biomechanical breakdown with personalized drills.</p>
        </div>

        {!analysisId ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
                <h2 className="text-white font-bold mb-4">Analyze Shooting Form</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Player Name</label>
                    <Input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="e.g. Marcus Johnson #23" className="bg-gray-800 border-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Video URL (YouTube, Hudl, etc.)</label>
                    <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="bg-gray-800 border-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Coach's Observations (optional)</label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What have you noticed? Any specific concerns about their form?" className="bg-gray-800 border-gray-600 text-white h-24" />
                  </div>
                  <Button
                    onClick={() => analyzeMut.mutate({ playerName, videoUrl, notes })}
                    disabled={!playerName || !videoUrl || analyzeMut.isPending}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3"
                  >
                    {analyzeMut.isPending ? "Submitting..." : "🎯 Analyze Form"}
                  </Button>
                </div>
              </div>
            </div>

            {/* History */}
            <div>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Recent Analyses</h3>
                {history && history.length > 0 ? (
                  <div className="space-y-2">
                    {history.slice(0, 8).map((h: any) => (
                      <div key={h.id} onClick={() => setAnalysisId(h.id)} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                        <div>
                          <div className="text-white text-sm font-medium">{h.playerName}</div>
                          <div className="text-gray-500 text-xs">{new Date(h.createdAt).toLocaleDateString()}</div>
                        </div>
                        <Badge className={h.status === "complete" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"} variant="outline">
                          {h.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No analyses yet</p>
                )}
              </div>
            </div>
          </div>
        ) : isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="text-6xl mb-6 animate-bounce">🎯</div>
            <h2 className="text-white text-xl font-bold mb-2">Analyzing Shooting Form...</h2>
            <p className="text-gray-400 text-sm mb-6">AI is reviewing biomechanics, release point, balance, and follow-through</p>
            <div className="flex gap-2">
              {["Stance", "Release", "Follow-Through", "Balance"].map((step, i) => (
                <div key={step} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500 flex items-center justify-center animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                    <span className="text-orange-400 text-xs">✓</span>
                  </div>
                  <span className="text-gray-500 text-xs">{step}</span>
                </div>
              ))}
            </div>
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-white text-xl font-bold">{analysis?.playerName}</h2>
                  <p className="text-gray-400 text-sm">{result.summary}</p>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-black text-orange-400">{result.grade}</div>
                  <div className="text-gray-400 text-xs">Overall Grade</div>
                </div>
              </div>

              {/* Score Rings */}
              <div className="flex flex-wrap gap-4 justify-center">
                <ScoreRing score={result.stance?.score || 0} label="Stance" />
                <ScoreRing score={result.release?.score || 0} label="Release" />
                <ScoreRing score={result.followThrough?.score || 0} label="Follow-Through" />
                <ScoreRing score={result.balance?.score || 0} label="Balance" />
                <ScoreRing score={result.shotPocket?.score || 0} label="Shot Pocket" />
              </div>

              {/* NBA Comparison */}
              {result.comparedTo && (
                <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-center">
                  <span className="text-orange-400 text-sm">Shooting style similar to: </span>
                  <span className="text-white font-bold">{result.comparedTo}</span>
                </div>
              )}
            </div>

            {/* Category Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.stance && <CategoryCard title="Stance & Footwork" data={result.stance} />}
              {result.release && <CategoryCard title="Release Point" data={result.release} />}
              {result.followThrough && <CategoryCard title="Follow-Through" data={result.followThrough} />}
              {result.balance && <CategoryCard title="Balance & Core" data={result.balance} />}
              {result.shotPocket && <CategoryCard title="Shot Pocket" data={result.shotPocket} />}
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-green-500/30 rounded-xl p-4">
                <h3 className="text-green-400 font-bold mb-3 text-sm uppercase tracking-wider">💪 Strengths</h3>
                <ul className="space-y-2">
                  {(result.strengths || []).map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                      <span className="text-green-400 mt-0.5">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-900 border border-red-500/30 rounded-xl p-4">
                <h3 className="text-red-400 font-bold mb-3 text-sm uppercase tracking-wider">⚠️ Areas to Improve</h3>
                <ul className="space-y-2">
                  {(result.weaknesses || []).map((w: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                      <span className="text-red-400 mt-0.5">→</span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Drills */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">🏋️ Prescribed Drills</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(result.drills || []).map((drill: any, i: number) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-orange-400 font-bold text-sm">{drill.name}</span>
                      <Badge className="bg-orange-500/20 text-orange-300 text-xs">{drill.reps}</Badge>
                    </div>
                    <p className="text-gray-300 text-xs mb-2">{drill.description}</p>
                    <p className="text-gray-500 text-xs">Targets: {drill.targets}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Coach Quote */}
            {result.coachQuote && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                <blockquote className="text-orange-300 italic text-center">"{result.coachQuote}"</blockquote>
              </div>
            )}

            <Button onClick={() => setAnalysisId(null)} variant="outline" className="border-gray-600 text-gray-300">← Analyze Another Player</Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-red-400">Analysis failed. Please try again.</p>
            <Button onClick={() => setAnalysisId(null)} className="mt-4 bg-orange-500">Try Again</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
