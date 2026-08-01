import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Target, Loader2, Trophy, TrendingDown, ClipboardCheck } from "lucide-react";

interface PostGameProps {
  sessionId: number;
  opponentName: string;
}

export default function PostGame({ sessionId, opponentName }: PostGameProps) {
  const utils = trpc.useUtils();
  const [ourScore, setOurScore] = useState("");
  const [theirScore, setTheirScore] = useState("");
  const [notes, setNotes] = useState("");

  const { data: result, isLoading } = trpc.results.getBySession.useQuery({ sessionId });

  const log = trpc.results.log.useMutation({
    onSuccess: r => {
      utils.results.getBySession.invalidate({ sessionId });
      utils.progress.me.invalidate();
      toast.success(r.won ? "Win logged" : "Loss logged", {
        description:
          r.accuracyPct !== null
            ? `Scouting accuracy: ${r.accuracyPct}% · +150 XP`
            : "+150 XP",
      });
    },
    onError: e => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-[320px] rounded-xl" />;

  // Already logged — show the scorecard + AI review.
  if (result) {
    const acc = result.accuracyPct;
    return (
      <div className="space-y-4">
        <div
          className="relative rounded-xl border-2 overflow-hidden p-5"
          style={{
            borderColor: result.won === 1 ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)",
            background: "linear-gradient(160deg,#14161c,#0a0b0f)",
          }}
        >
          <div
            className="pointer-events-none absolute -top-16 -right-12 h-52 w-52 rounded-full blur-3xl"
            style={{
              background: result.won === 1 ? "#22C55E" : "#EF4444",
              opacity: 0.13,
            }}
          />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.2em] mb-1"
                  style={{ color: result.won === 1 ? "#4ADE80" : "#F87171" }}
                >
                  {result.won === 1 ? "Win" : "Loss"} vs {opponentName}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tabular-nums">{result.ourScore}</span>
                  <span className="text-lg text-muted-foreground font-bold">—</span>
                  <span className="text-4xl font-black tabular-nums text-muted-foreground">
                    {result.theirScore}
                  </span>
                </div>
              </div>

              {acc !== null && (
                <div
                  className="rounded-lg px-4 py-2.5 text-center"
                  style={{
                    border: `1.5px solid ${acc >= 85 ? "#22C55E" : acc >= 65 ? "#FFC53D" : "#EF4444"}`,
                    background:
                      acc >= 85
                        ? "rgba(34,197,94,0.12)"
                        : acc >= 65
                          ? "rgba(255,197,61,0.12)"
                          : "rgba(239,68,68,0.12)",
                  }}
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
                    Scouting Accuracy
                  </p>
                  <p
                    className="text-3xl font-black tabular-nums leading-none"
                    style={{ color: acc >= 85 ? "#4ADE80" : acc >= 65 ? "#FFD666" : "#F87171" }}
                  >
                    {acc}%
                  </p>
                  {result.predictedTheirScore !== null && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Predicted {result.predictedTheirScore} · Actual {result.theirScore}
                    </p>
                  )}
                </div>
              )}
            </div>

            {result.notes && (
              <div className="mt-4 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1">
                  Your Notes
                </p>
                <p className="text-[12px] text-foreground/85 leading-relaxed">{result.notes}</p>
              </div>
            )}
          </div>
        </div>

        {result.aiReview && (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-orange-400 mb-3 flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4" /> AI Report Review
            </h3>
            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed">
              <Streamdown>{result.aiReview}</Streamdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not logged yet — entry form.
  const canSubmit =
    ourScore.trim() !== "" && theirScore.trim() !== "" && !Number.isNaN(Number(ourScore)) && !Number.isNaN(Number(theirScore));

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 max-w-xl">
      <div className="flex items-start gap-3 mb-5">
        <div
          className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(140deg,rgba(255,122,26,0.26),rgba(255,122,26,0.06))",
            border: "1px solid rgba(255,122,26,0.4)",
          }}
        >
          <Target className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-base font-black">Log the final score</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            After you play {opponentName}, drop the score here. The AI compares what the report
            predicted against what actually happened and grades your scouting accuracy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <Label htmlFor="ourScore" className="text-[11px] font-bold uppercase tracking-wide">
            Our Score
          </Label>
          <Input
            id="ourScore"
            inputMode="numeric"
            value={ourScore}
            onChange={e => setOurScore(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="72"
            className="mt-1 text-lg font-black tabular-nums"
          />
        </div>
        <div>
          <Label htmlFor="theirScore" className="text-[11px] font-bold uppercase tracking-wide">
            Their Score
          </Label>
          <Input
            id="theirScore"
            inputMode="numeric"
            value={theirScore}
            onChange={e => setTheirScore(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="68"
            className="mt-1 text-lg font-black tabular-nums"
          />
        </div>
      </div>

      <div className="mb-4">
        <Label htmlFor="gameNotes" className="text-[11px] font-bold uppercase tracking-wide">
          What actually happened? (optional)
        </Label>
        <Textarea
          id="gameNotes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="They switched to a 1-3-1 in the third and we had no answer. Their 12 went off for 24."
          rows={3}
          className="mt-1 resize-none"
        />
      </div>

      <Button
        className="w-full font-bold"
        disabled={!canSubmit || log.isPending}
        onClick={() =>
          log.mutate({
            sessionId,
            ourScore: Number(ourScore),
            theirScore: Number(theirScore),
            notes: notes.trim() || undefined,
          })
        }
      >
        {log.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Grading the report...
          </>
        ) : Number(ourScore) > Number(theirScore) && canSubmit ? (
          <>
            <Trophy className="h-4 w-4" /> Log the W
          </>
        ) : canSubmit ? (
          <>
            <TrendingDown className="h-4 w-4" /> Log the Result
          </>
        ) : (
          <>
            <Target className="h-4 w-4" /> Log Result
          </>
        )}
      </Button>
    </div>
  );
}
