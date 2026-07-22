import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clapperboard, CircleCheck, Users, Loader2 } from "lucide-react";

export default function SeasonDashboard() {
  const { data: stats, isLoading } = trpc.season.stats.useQuery();

  const statCards = [
    { label: "Total Sessions", value: stats?.totalSessions ?? 0, icon: Clapperboard, color: "text-primary" },
    { label: "Reports Complete", value: stats?.completeSessions ?? 0, icon: CircleCheck, color: "text-green-400" },
    { label: "Analyzing Now", value: stats?.analyzingSessions ?? 0, icon: Loader2, color: "text-yellow-400" },
    { label: "Unique Opponents", value: stats?.uniqueOpponents ?? 0, icon: Users, color: "text-blue-400" },
  ];

  return (
    <AppLayout>
      <div className="container max-w-5xl py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Season Intel</h1>
          <p className="text-sm text-muted-foreground mt-1">Your scouting workload and opponent history across the season.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map(stat => (
              <Card key={stat.label}>
                <CardContent className="p-5">
                  <stat.icon className={`h-5 w-5 mb-3 ${stat.color}`} />
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Opponent History</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats || stats.opponents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No opponents scouted yet. Create your first analysis to start building season intel.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {stats.opponents.map(opp => (
                  <div key={opp.name} className="py-3 flex items-center justify-between">
                    <div className="font-medium">{opp.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {opp.count} session{opp.count > 1 ? "s" : ""} · last {new Date(opp.lastDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

