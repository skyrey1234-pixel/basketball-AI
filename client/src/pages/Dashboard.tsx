import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Youtube, Upload, Trash2, Loader2, CircleCheck, CircleX, Clapperboard } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  if (status === "analyzing")
    return (
      <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10 gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Analyzing
      </Badge>
    );
  if (status === "complete")
    return (
      <Badge variant="outline" className="border-green-500/50 text-green-400 bg-green-500/10 gap-1">
        <CircleCheck className="h-3 w-3" /> Complete
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10 gap-1">
      <CircleX className="h-3 w-3" /> Failed
    </Badge>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: sessions, isLoading } = trpc.sessions.list.useQuery(undefined, {
    refetchInterval: query => (query.state.data?.some(s => s.status === "analyzing") ? 5000 : false),
  });

  const deleteMutation = trpc.sessions.delete.useMutation({
    onSuccess: () => {
      utils.sessions.list.invalidate();
      toast.success("Session deleted");
    },
    onError: e => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="container max-w-5xl py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Scouting Sessions</h1>
            <p className="text-sm text-muted-foreground mt-1">Every opponent you've broken down, in one film room.</p>
          </div>
          <Link href="/new">
            <Button className="gap-2 font-semibold">
              <Plus className="h-4 w-4" /> New Analysis
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Clapperboard className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No scouting sessions yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Drop in a YouTube link or upload opponent game film and let the AI build your first scouting report.
              </p>
              <Link href="/new">
                <Button className="gap-2 font-semibold">
                  <Plus className="h-4 w-4" /> Analyze Your First Opponent
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <Card
                key={session.id}
                className="group hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => setLocation(`/session/${session.id}`)}
              >
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      {session.sourceType === "youtube" ? (
                        <Youtube className="h-5 w-5 text-red-400" />
                      ) : (
                        <Upload className="h-5 w-5 text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">vs {session.opponentName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {session.gameDate ? `Game: ${session.gameDate} · ` : ""}
                        Added {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={session.status} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Delete the ${session.opponentName} session?`)) {
                          deleteMutation.mutate({ id: session.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
