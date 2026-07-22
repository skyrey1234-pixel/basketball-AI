import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Swords } from "lucide-react";

type GamePlan = {
  keyMatchups: Array<{ theirPlayer: string; assignment: string; advantage: "us" | "them" | "even" }>;
};

const ADVANTAGE_STYLE: Record<string, { label: string; className: string }> = {
  us: { label: "ADVANTAGE: US", className: "border-green-500/50 text-green-400 bg-green-500/10" },
  them: { label: "ADVANTAGE: THEM", className: "border-red-500/50 text-red-400 bg-red-500/10" },
  even: { label: "EVEN MATCHUP", className: "border-yellow-500/50 text-yellow-400 bg-yellow-500/10" },
};

export default function MatchupScreen({ sessionId, opponentName }: { sessionId: number; opponentName: string }) {
  const { data: planData, isLoading } = trpc.gamePlan.get.useQuery({ sessionId });

  if (isLoading) return <Skeleton className="h-[420px] rounded-xl" />;

  const plan = planData as GamePlan | null | undefined;

  if (!plan || !plan.keyMatchups || plan.keyMatchups.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Swords className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Matchup board not ready</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Generate the game plan first — the key matchups against {opponentName} live inside it.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Key individual battles that decide the game vs {opponentName}.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {plan.keyMatchups.map((matchup, i) => {
          const style = ADVANTAGE_STYLE[matchup.advantage] || ADVANTAGE_STYLE.even;
          return (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-bold">{matchup.theirPlayer}</h4>
                  </div>
                  <Badge variant="outline" className={style.className}>{style.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{matchup.assignment}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
