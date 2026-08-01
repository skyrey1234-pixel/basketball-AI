import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Dna, Loader2, Sparkles, LayoutGrid, Flame } from "lucide-react";
import PlayerDnaCard, { type DnaRow, type ProfileRow } from "./PlayerDnaCard";
import HotZoneCourt from "./HotZoneCourt";
import { RARITY_STYLES, rarityFromOverall } from "@shared/twok";

interface DnaLabProps {
  sessionId: number;
  opponentName: string;
}

export default function DnaLab({ sessionId, opponentName }: DnaLabProps) {
  const utils = trpc.useUtils();
  const [view, setView] = useState<"cards" | "charts">("cards");

  const { data: profiles, isLoading: profilesLoading } =
    trpc.players.listBySession.useQuery({ sessionId });
  const { data: dnaRows, isLoading: dnaLoading } = trpc.dna.listBySession.useQuery({
    sessionId,
  });

  const generate = trpc.dna.generate.useMutation({
    onSuccess: () => {
      utils.dna.listBySession.invalidate({ sessionId });
      toast.success("Player DNA generated", {
        description: "Tendencies, hot zones, and badges are locked in.",
      });
    },
    onError: e => toast.error(e.message),
  });

  /** Pair each DNA row with its source profile. */
  const pairs = useMemo(() => {
    if (!profiles || !dnaRows) return [];
    return dnaRows
      .map(d => {
        const profile = profiles.find(p => p.id === d.playerProfileId);
        return profile ? { dna: d as DnaRow, profile: profile as ProfileRow } : null;
      })
      .filter((x): x is { dna: DnaRow; profile: ProfileRow } => x !== null)
      .sort((a, b) => b.dna.overall - a.dna.overall);
  }, [profiles, dnaRows]);

  const teamAvg =
    pairs.length > 0
      ? Math.round(pairs.reduce((s, p) => s + p.dna.overall, 0) / pairs.length)
      : 0;
  const bestPlayer = pairs[0];

  if (profilesLoading || dnaLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-[468px] rounded-xl" />
        ))}
      </div>
    );
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-10 text-center">
        <Dna className="h-9 w-9 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-base font-bold mb-1">Player profiles required first</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The DNA Lab converts scouted players into 2K-style numeric ratings. Head to the{" "}
          <span className="text-orange-400 font-semibold">Players</span> tab and generate
          profiles for {opponentName}, then come back here.
        </p>
      </div>
    );
  }

  if (pairs.length === 0) {
    return (
      <div className="relative rounded-xl border border-orange-500/25 overflow-hidden p-10 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(255,122,26,0.14), transparent 65%)",
          }}
        />
        <div className="relative">
          <div
            className="inline-flex items-center justify-center h-14 w-14 rounded-xl mb-4"
            style={{
              background: "linear-gradient(140deg, rgba(255,122,26,0.28), rgba(255,122,26,0.08))",
              border: "1px solid rgba(255,122,26,0.4)",
            }}
          >
            <Dna className="h-7 w-7 text-orange-400" />
          </div>
          <h3 className="text-lg font-black mb-1.5">Build Player DNA</h3>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-5 leading-relaxed">
            Turn all {profiles.length} scouted {opponentName} players into full 2K-style cards —
            0-99 tendency ratings, attribute bars, hot and cold shooting zones, earned badges,
            and clutch ratings.
          </p>
          <Button
            size="lg"
            onClick={() => generate.mutate({ sessionId })}
            disabled={generate.isPending}
            className="font-bold"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Building DNA...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate DNA Cards
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* team DNA summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex flex-col items-center justify-center rounded-lg px-3 py-1.5"
            style={{
              background: `linear-gradient(160deg, ${RARITY_STYLES[rarityFromOverall(teamAvg)].ring}30, transparent)`,
              border: `1.5px solid ${RARITY_STYLES[rarityFromOverall(teamAvg)].ring}`,
            }}
          >
            <span className="text-[8px] font-black tracking-[0.16em] text-muted-foreground">
              TEAM OVR
            </span>
            <span
              className="text-2xl font-black leading-none tabular-nums"
              style={{ color: RARITY_STYLES[rarityFromOverall(teamAvg)].text }}
            >
              {teamAvg}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{opponentName} DNA</p>
            <p className="text-xs text-muted-foreground">
              {pairs.length} players rated · Best:{" "}
              <span className="text-orange-400 font-semibold">
                #{bestPlayer?.profile.playerNumber} {bestPlayer?.profile.playerName} (
                {bestPlayer?.dna.overall})
              </span>
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => setView("cards")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors"
              style={{
                background: view === "cards" ? "rgba(255,122,26,0.18)" : "transparent",
                color: view === "cards" ? "#FFB27A" : undefined,
                transitionDuration: "160ms",
              }}
            >
              <LayoutGrid className="h-3 w-3" /> Cards
            </button>
            <button
              onClick={() => setView("charts")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors"
              style={{
                background: view === "charts" ? "rgba(255,122,26,0.18)" : "transparent",
                color: view === "charts" ? "#FFB27A" : undefined,
                transitionDuration: "160ms",
              }}
            >
              <Flame className="h-3 w-3" /> Shot Charts
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generate.mutate({ sessionId })}
            disabled={generate.isPending}
          >
            {generate.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Rebuild
          </Button>
        </div>
      </div>

      {view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pairs.map((p, i) => (
            <PlayerDnaCard key={p.dna.id} dna={p.dna} profile={p.profile} index={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pairs.map((p, i) => (
            <div
              key={p.dna.id}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
              style={{ animation: `cardDeal 480ms cubic-bezier(0.23,1,0.32,1) ${i * 80}ms both` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-black">
                    #{p.profile.playerNumber} {p.profile.playerName}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    {p.profile.position} · OVR {p.dna.overall}
                  </p>
                </div>
                <span
                  className="text-[9px] font-black uppercase tracking-[0.14em] px-2 py-1 rounded"
                  style={{
                    background: `${RARITY_STYLES[(p.dna.rarity as keyof typeof RARITY_STYLES) ?? "bronze"].ring}22`,
                    color: RARITY_STYLES[(p.dna.rarity as keyof typeof RARITY_STYLES) ?? "bronze"].text,
                    border: `1px solid ${RARITY_STYLES[(p.dna.rarity as keyof typeof RARITY_STYLES) ?? "bronze"].ring}55`,
                  }}
                >
                  {RARITY_STYLES[(p.dna.rarity as keyof typeof RARITY_STYLES) ?? "bronze"].label}
                </span>
              </div>
              <HotZoneCourt zones={(p.dna.hotZones ?? {}) as Record<string, number>} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
