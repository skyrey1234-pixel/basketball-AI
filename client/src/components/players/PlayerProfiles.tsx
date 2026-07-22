import { trpc } from "@/lib/trpc";
import PlayerRatingCard from "./PlayerRatingCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Sparkles, Users, RefreshCw } from "lucide-react";

export default function PlayerProfiles({ sessionId, opponentName }: { sessionId: number; opponentName: string }) {
  const utils = trpc.useUtils();
  const { data: players, isLoading } = trpc.players.listBySession.useQuery({ sessionId });

  const generateMutation = trpc.players.generate.useMutation({
    onSuccess: () => {
      utils.players.listBySession.invalidate({ sessionId });
      toast.success("Player profiles generated");
    },
    onError: e => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No player profiles yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            The AI will identify {opponentName}'s key players from the scouting report and build 2K-style tendency cards for each one.
          </p>
          <Button
            className="gap-2 font-semibold"
            onClick={() => generateMutation.mutate({ sessionId })}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Player Profiles
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {players.length} key player{players.length > 1 ? "s" : ""} identified for {opponentName}
        </p>
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
      <div className="grid md:grid-cols-2 gap-4">
        {players.map((player, i) => (
          <PlayerRatingCard key={player.id} player={player} index={i} />
        ))}
      </div>
    </div>
  );
}
