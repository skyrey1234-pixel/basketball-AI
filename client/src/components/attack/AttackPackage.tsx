import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayCourt3D } from "@/components/gameplan/PlayCourt3D";
import { toast } from "sonner";
import { Loader2, Crosshair, Sparkles, RefreshCw, AlertTriangle, Lightbulb, Zap } from "lucide-react";

type AttackPlay = {
  name: string; set: string; playType: string; target: string;
  description: string; counters: string;
  weaknessExploited: string; expectedResult: string;
  urgency: string;
};
type AttackPkg = {
  summary: string;
  plays: AttackPlay[];
  keyInsight: string;
  warningSign: string;
};

const URGENCY_COLOR: Record<string, string> = {
  "use early": "border-green-500/40 text-green-400",
  "use in crunch time": "border-yellow-500/40 text-yellow-400",
  "use when up": "border-blue-500/40 text-blue-400",
  "use when down": "border-red-500/40 text-red-400",
  "use vs their star": "border-purple-500/40 text-purple-400",
};

export default function AttackPackage({ sessionId, opponentName }: { sessionId: number; opponentName: string }) {
  const utils = trpc.useUtils();
  const { data: pkgData, isLoading } = trpc.attackPackage.get.useQuery({ sessionId });

  const generateMutation = trpc.attackPackage.generate.useMutation({
    onSuccess: () => { utils.attackPackage.get.invalidate({ sessionId }); toast.success("Attack package ready!"); },
    onError: e => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-[420px] rounded-xl" />;

  const pkg = pkgData as AttackPkg | null | undefined;

  if (!pkg) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <Crosshair className="h-7 w-7 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Opponent Weakness Exploiter</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            AI builds 5 surgical plays specifically designed to torch {opponentName}'s documented weaknesses. Not generic — every play targets something real from the film.
          </p>
          <Button
            className="gap-2 font-semibold bg-red-500 hover:bg-red-600 text-white"
            onClick={() => generateMutation.mutate({ sessionId })}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            {generateMutation.isPending ? "Building attack package..." : "Generate Attack Package"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-red-400" />
          <h2 className="text-xl font-black">Attack Package vs {opponentName}</h2>
        </div>
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

      {/* Summary + Key Insight + Warning */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Strategy Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{pkg.summary}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
              <Lightbulb className="h-4 w-4" /> Key Insight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-200/80">{pkg.keyInsight}</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-4 w-4" /> Watch Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-200/80">{pkg.warningSign}</p>
          </CardContent>
        </Card>
      </div>

      {/* 5 Attack Plays */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {pkg.plays.map((play, i) => (
          <Card key={i} className="border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 text-xs font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                    <h4 className="font-bold text-sm">{play.name}</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px]">{play.set}</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">{play.playType.toUpperCase()}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${URGENCY_COLOR[play.urgency] ?? ""}`}>
                      <Zap className="h-2.5 w-2.5 mr-1" />{play.urgency}
                    </Badge>
                  </div>
                </div>
              </div>

              <PlayCourt3D
                set={play.set}
                playName={play.name}
                playType={play.playType}
                target={play.target}
                defenseScheme="man-to-man"
              />

              <p className="text-xs text-muted-foreground mt-3">{play.description}</p>

              {/* Weakness targeted */}
              <div className="mt-2 text-xs rounded-lg border border-red-500/20 bg-red-500/5 p-2">
                <span className="text-red-400 font-bold text-[10px] uppercase tracking-wider block mb-0.5">Weakness Targeted</span>
                {play.weaknessExploited}
              </div>

              {/* Expected result */}
              <div className="mt-2 text-xs rounded-lg border border-green-500/20 bg-green-500/5 p-2">
                <span className="text-green-400 font-bold text-[10px] uppercase tracking-wider block mb-0.5">Expected Result</span>
                {play.expectedResult}
              </div>

              {/* Counter */}
              <div className="mt-2 text-xs rounded-lg border border-blue-500/20 bg-blue-500/5 p-2">
                <span className="text-blue-400 font-bold text-[10px] uppercase tracking-wider block mb-0.5">Counter Option</span>
                {play.counters}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

