import { trpc } from "@/lib/trpc";
import { PlayCourt3D } from "./PlayCourt3D";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Loader2, Sparkles, Swords, RefreshCw, Shield, ListChecks } from "lucide-react";

type Play = {
  name: string;
  set: string;
  playType: string;
  target: string;
  description: string;
  counters: string;
};

type GamePlan = {
  overview: string;
  opponentDefenseScheme: string;
  scriptedPlays: Play[];
  atoPackage: Play[];
  lateClockPlays: Play[];
  defensiveAdjustments: Array<{ situation: string; adjustment: string; scheme: string }>;
  keyMatchups: Array<{ theirPlayer: string; assignment: string; advantage: "us" | "them" | "even" }>;
  halftimeChecklist: string[];
};

function PlaySection({ title, plays, defenseScheme }: { title: string; plays: Play[]; defenseScheme: string }) {
  if (!plays || plays.length === 0) return null;
  return (
    <div>
      <h3 className="font-semibold text-lg mb-4">{title}</h3>
      <div className="grid lg:grid-cols-2 gap-4">
        {plays.map((play, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h4 className="font-bold">{i + 1}. {play.name}</h4>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Badge variant="outline" className="text-[10px]">{play.set}</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">{play.playType.toUpperCase()}</Badge>
                    <Badge variant="outline" className="text-[10px]">Option 1: {play.target}</Badge>
                  </div>
                </div>
              </div>
              <PlayCourt3D
                set={play.set}
                playName={play.name}
                playType={play.playType}
                target={play.target}
                defenseScheme={defenseScheme}
              />
              <p className="text-sm text-muted-foreground mt-3">{play.description}</p>
              <div className="mt-2 text-xs rounded-lg border border-blue-500/20 bg-blue-500/5 p-2">
                <span className="text-blue-400 font-bold text-[10px] uppercase tracking-wider block mb-0.5">Counter</span>
                {play.counters}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function GamePlanGenerator({ sessionId, opponentName }: { sessionId: number; opponentName: string }) {
  const utils = trpc.useUtils();
  const { data: planData, isLoading } = trpc.gamePlan.get.useQuery({ sessionId });

  const generateMutation = trpc.gamePlan.generate.useMutation({
    onSuccess: () => {
      utils.gamePlan.get.invalidate({ sessionId });
      toast.success("Game plan generated");
    },
    onError: e => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-[420px] rounded-xl" />;

  const plan = planData as GamePlan | null | undefined;

  if (!plan) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Swords className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No game plan yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            The AI will build a complete plan to beat {opponentName}: scripted possessions, ATO/BLOB/SLOB package, late-clock plays, and defensive adjustments — each with an animated diagram.
          </p>
          <Button
            className="gap-2 font-semibold"
            onClick={() => generateMutation.mutate({ sessionId })}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generateMutation.isPending ? "Drawing up the plan..." : "Generate Game Plan"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="border-primary/40 text-primary gap-1 py-1 px-3">
          <Shield className="h-3 w-3" />
          Their base defense: {plan.opponentDefenseScheme}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => generateMutation.mutate({ sessionId })}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Regenerate
        </Button>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Game Plan Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
            <Streamdown>{plan.overview}</Streamdown>
          </div>
        </CardContent>
      </Card>

      <PlaySection title="First 8 Scripted Possessions" plays={plan.scriptedPlays} defenseScheme={plan.opponentDefenseScheme} />
      <PlaySection title="ATO / BLOB / SLOB Package" plays={plan.atoPackage} defenseScheme={plan.opponentDefenseScheme} />
      <PlaySection title="Late-Clock & End-of-Quarter" plays={plan.lateClockPlays} defenseScheme={plan.opponentDefenseScheme} />

      {/* Defensive adjustments */}
      {plan.defensiveAdjustments?.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-4">Defensive Adjustments</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {plan.defensiveAdjustments.map((adj, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Badge variant="outline" className="text-[10px] mb-2 border-purple-500/40 text-purple-400">{adj.scheme}</Badge>
                  <p className="text-sm font-medium mb-1">{adj.situation}</p>
                  <p className="text-xs text-muted-foreground">{adj.adjustment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Halftime checklist */}
      {plan.halftimeChecklist?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" /> Halftime Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.halftimeChecklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
