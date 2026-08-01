import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Streamdown } from "streamdown";
import { PlayCourt3D } from "@/components/gameplan/PlayCourt3D";
import { toast } from "sonner";
import { Loader2, Sparkles, ChevronRight, Mic, Shield, ListChecks } from "lucide-react";

type Play = {
  name: string; set: string; playType: string; target: string;
  description: string; counters: string; whyItWorks: string;
};
type CoachPlan = {
  coachId: string; overview: string; scriptedPlays: Play[];
  defensiveApproach: string; coachingCues: string[]; halftimeAdjustments: string[];
};

export default function CoachStyleMode() {
  const { data: coaches, isLoading: loadingCoaches } = trpc.coachStyle.listCoaches.useQuery();
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [plan, setPlan] = useState<CoachPlan | null>(null);

  const { data: sessions, isLoading: loadingSessions } = trpc.sessions.list.useQuery();

  const generateMutation = trpc.coachStyle.generate.useMutation({
    onSuccess: data => { setPlan(data as CoachPlan); toast.success("Game plan generated in their style!"); },
    onError: e => toast.error(e.message),
  });

  const coach = coaches?.find(c => c.id === selectedCoach);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black mb-1">Coach Style Mode</h1>
          <p className="text-muted-foreground">Pick a legendary coach. AI generates a game plan in their exact system and philosophy.</p>
        </div>

        {/* Coach picker */}
        {loadingCoaches ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {coaches?.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCoach(c.id)}
                className={`rounded-xl border p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  selectedCoach === c.id
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                  <span className="font-bold text-sm">{c.name}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{c.team}</p>
                <Badge variant="outline" className="mt-2 text-[10px]">{c.style}</Badge>
              </button>
            ))}
          </div>
        )}

        {/* Session picker */}
        {selectedCoach && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select a scouted opponent</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <Skeleton className="h-10 w-full" />
              ) : sessions && sessions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sessions.filter(s => s.status === "complete").map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSessionId(s.id)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                        sessionId === s.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {s.opponentName}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No completed sessions yet. Analyze a game first.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generate button */}
        {selectedCoach && sessionId && !plan && (
          <div className="flex justify-center">
            <Button
              size="lg"
              className="gap-2 font-bold text-base px-8"
              onClick={() => generateMutation.mutate({ sessionId, coachId: selectedCoach })}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {generateMutation.isPending
                ? `Drawing up ${coach?.name}'s playbook...`
                : `Generate ${coach?.name}'s Game Plan`}
            </Button>
          </div>
        )}

        {/* Plan output */}
        {plan && coach && (
          <div className="space-y-6">
            {/* Coach header */}
            <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: coach.color + "40", background: coach.color + "10" }}>
              <span className="w-4 h-4 rounded-full" style={{ background: coach.color }} />
              <div>
                <p className="font-bold">{coach.name} — {coach.team}</p>
                <p className="text-xs text-muted-foreground">{coach.style} · {coach.era}</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto gap-1" onClick={() => { setPlan(null); setSessionId(null); }}>
                <ChevronRight className="h-3 w-3 rotate-180" /> Change Coach
              </Button>
            </div>

            {/* Overview */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Game Plan Philosophy</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
                  <Streamdown>{plan.overview}</Streamdown>
                </div>
              </CardContent>
            </Card>

            {/* Coaching cues */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mic className="h-4 w-4 text-primary" /> What {coach.name} Would Say
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.coachingCues.map((cue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm italic text-muted-foreground">
                      <span className="text-primary font-bold not-italic shrink-0">"{i + 1}"</span>
                      "{cue}"
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Plays with 3D diagrams */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Scripted Possessions</h3>
              <div className="grid lg:grid-cols-2 gap-4">
                {plan.scriptedPlays.map((play, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="font-bold">{i + 1}. {play.name}</h4>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-[10px]">{play.set}</Badge>
                            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">{play.playType.toUpperCase()}</Badge>
                          </div>
                        </div>
                      </div>
                      <PlayCourt3D set={play.set} playName={play.name} playType={play.playType} target={play.target} defenseScheme="man-to-man" />
                      <p className="text-sm text-muted-foreground mt-3">{play.description}</p>
                      <div className="mt-2 text-xs rounded-lg border border-green-500/20 bg-green-500/5 p-2">
                        <span className="text-green-400 font-bold text-[10px] uppercase tracking-wider block mb-0.5">Why It Works</span>
                        {play.whyItWorks}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Defensive approach */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Defensive Approach
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
                  <Streamdown>{plan.defensiveApproach}</Streamdown>
                </div>
              </CardContent>
            </Card>

            {/* Halftime adjustments */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" /> Halftime Adjustments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.halftimeAdjustments.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button variant="outline" onClick={() => { setPlan(null); setSessionId(null); setSelectedCoach(null); }}>
                Try Another Coach
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

