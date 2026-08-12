import { useParams, Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import ReportView from "@/components/report/ReportView";
import FilmBreakdown from "@/components/film/FilmBreakdown";
import PlayerProfiles from "@/components/players/PlayerProfiles";
import GamePlanGenerator from "@/components/gameplan/GamePlanGenerator";
import MatchupScreen from "@/components/matchup/MatchupScreen";
import TimeMachine from "@/components/timemachine/TimeMachine";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RefreshCw, FileText, Clapperboard, Users, Swords, Shield, Rewind, Crosshair, Dna, Flame, Target } from "lucide-react";
import AttackPackage from "@/components/attack/AttackPackage";
import DnaLab from "@/components/dna/DnaLab";
import BattleScreen from "@/components/matchup/BattleScreen";
import AnalyzingScreen from "@/components/loading/AnalyzingScreen";
import PostGame from "@/components/results/PostGame";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);
  const utils = trpc.useUtils();
  const search = useSearch();
  const initialTab = new URLSearchParams(search).get("tab") ?? "report";

  const { data: session, isLoading: sessionLoading } = trpc.sessions.get.useQuery(
    { id: sessionId },
    {
      enabled: !Number.isNaN(sessionId),
      refetchInterval: query => (query.state.data?.status === "analyzing" ? 4000 : false),
    }
  );

  const { data: report, isLoading: reportLoading } = trpc.reports.getBySession.useQuery(
    { sessionId },
    { enabled: !Number.isNaN(sessionId) && session?.status === "complete" }
  );

  const reanalyzeMutation = trpc.sessions.reanalyze.useMutation({
    onSuccess: () => {
      utils.sessions.get.invalidate({ id: sessionId });
      toast.success("Re-analysis started");
    },
    onError: e => toast.error(e.message),
  });

  if (sessionLoading) {
    return (
      <AppLayout>
        <div className="container max-w-6xl py-8 space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout>
        <div className="container max-w-6xl py-16 text-center">
          <h2 className="text-xl font-semibold mb-2">Session not found</h2>
          <Link href="/">
            <Button variant="outline" className="gap-2 mt-4">
              <ArrowLeft className="h-4 w-4" /> Back to Sessions
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-6xl py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">vs {session.opponentName}</h1>
              <p className="text-xs text-muted-foreground">
                {session.gameDate ? `Game: ${session.gameDate} · ` : ""}
                {session.sourceType === "youtube" ? "YouTube film" : "Uploaded film"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session.status === "analyzing" && (
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10 gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> AI Analyzing Film
              </Badge>
            )}
            {session.status === "failed" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => reanalyzeMutation.mutate({ id: sessionId })}
                disabled={reanalyzeMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 ${reanalyzeMutation.isPending ? "animate-spin" : ""}`} />
                Retry Analysis
              </Button>
            )}
          </div>
        </div>

        {session.status === "analyzing" ? (
          <AnalyzingScreen opponentName={session.opponentName} />
        ) : session.status === "failed" ? (
          <div className="border border-dashed border-destructive/40 rounded-xl py-24 flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold mb-1 text-destructive">Analysis failed</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Something went wrong while generating the report. Hit retry to run it again.
            </p>
          </div>
        ) : reportLoading || !report ? (
          <Skeleton className="h-[420px] w-full rounded-xl" />
        ) : (
          <Tabs defaultValue={initialTab} key={initialTab}>
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="report" className="gap-2">
                <FileText className="h-4 w-4" /> Scouting Report
              </TabsTrigger>
              <TabsTrigger value="film" className="gap-2">
                <Clapperboard className="h-4 w-4" /> AI Film Breakdown
              </TabsTrigger>
              <TabsTrigger value="players" className="gap-2">
                <Users className="h-4 w-4" /> Player Profiles
              </TabsTrigger>
              <TabsTrigger value="dna" className="gap-2">
                <Dna className="h-4 w-4" /> DNA Lab
              </TabsTrigger>
              <TabsTrigger value="gameplan" className="gap-2">
                <Swords className="h-4 w-4" /> Game Plan
              </TabsTrigger>
              <TabsTrigger value="matchup" className="gap-2">
                <Shield className="h-4 w-4" /> Matchup
              </TabsTrigger>
              <TabsTrigger value="battle" className="gap-2">
                <Flame className="h-4 w-4" /> Battle Screen
              </TabsTrigger>
              <TabsTrigger value="attack" className="gap-2">
                <Crosshair className="h-4 w-4" /> Attack Package
              </TabsTrigger>
              <TabsTrigger value="timemachine" className="gap-2">
                <Rewind className="h-4 w-4" /> Time Machine
              </TabsTrigger>
              <TabsTrigger value="postgame" className="gap-2">
                <Target className="h-4 w-4" /> Post Game
              </TabsTrigger>
            </TabsList>

            <TabsContent value="report">
              <ReportView session={session} report={report} />
            </TabsContent>
            <TabsContent value="film">
              <FilmBreakdown session={session} report={report} />
            </TabsContent>
            <TabsContent value="players">
              <PlayerProfiles sessionId={sessionId} opponentName={session.opponentName} />
            </TabsContent>
            <TabsContent value="dna">
              <div className="mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Dna className="h-5 w-5 text-[#FDB927]" /> DNA Lab
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Every scouted player converted into a 2K-style card — 0-99 tendency ratings, hot and
                  cold shooting zones, earned badges, and clutch numbers. Tap a card to flip it.
                </p>
              </div>
              <DnaLab sessionId={sessionId} opponentName={session.opponentName} />
            </TabsContent>
            <TabsContent value="gameplan">
              <GamePlanGenerator sessionId={sessionId} opponentName={session.opponentName} />
            </TabsContent>
            <TabsContent value="matchup">
              <MatchupScreen sessionId={sessionId} opponentName={session.opponentName} />
            </TabsContent>
            <TabsContent value="battle">
              <div className="mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Flame className="h-5 w-5 text-[#FDB927]" /> Battle Screen
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Head-to-head, MyTeam style. Their attribute ratings on the right, the defensive load
                  that matchup demands on the left. Green means we can live with it; red means send help.
                </p>
              </div>
              <BattleScreen sessionId={sessionId} opponentName={session.opponentName} />
            </TabsContent>
            <TabsContent value="attack">
              <AttackPackage sessionId={sessionId} opponentName={session.opponentName} />
            </TabsContent>
            <TabsContent value="timemachine">
              <div className="mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Rewind className="h-5 w-5 text-[#FDB927]" /> Time Machine
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Watch the real possession on the actual film, frozen on the exact frame where the
                  decision had to be made — then flip to the diagram to see the open teammate that was
                  missed. The pass that was made is red, the better read is green.
                </p>
              </div>
              <TimeMachine
                sessionId={sessionId}
                sourceType={session.sourceType}
                youtubeVideoId={session.youtubeVideoId}
                videoUrl={session.videoUrl}
                reportReady={session.status === "complete" && Boolean(report)}
              />
            </TabsContent>
            <TabsContent value="postgame">
              <div className="mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#FDB927]" /> Post Game: Prediction vs Reality
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Close the loop. Log the final score and the AI grades its own report — what it called
                  correctly, what it missed, and how to scout {session.opponentName} better next time.
                  Your scouting accuracy feeds your Coach Card.
                </p>
              </div>
              <PostGame sessionId={sessionId} opponentName={session.opponentName} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
