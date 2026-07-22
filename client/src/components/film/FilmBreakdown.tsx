import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AnnotationCanvas from "./AnnotationCanvas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, ChevronDown, ChevronUp, Clock } from "lucide-react";

type Highlight = {
  timestamp: string;
  seconds: number;
  title: string;
  note: string;
  category: string;
  verdict: string;
};

type Annotation = {
  shapes: Array<{
    type: "circle" | "arrow" | "zone" | "label";
    x: number; y: number; x2: number; y2: number; radius: number;
    color: "red" | "green" | "yellow" | "blue" | "white";
    text: string;
  }>;
  coaching_callout: string;
  alternative_play: string;
  verdict: string;
};

type FilmBreakdownProps = {
  session: {
    id: number;
    opponentName: string;
    sourceType: string;
    youtubeVideoId?: string | null;
    videoUrl?: string | null;
  };
  report: { highlights: unknown };
};

const FILTERS = [
  { key: "all", label: "All Moments" },
  { key: "offense", label: "Offense" },
  { key: "defense", label: "Defense" },
  { key: "special", label: "Special" },
  { key: "mistake", label: "Mistakes" },
];

export default function FilmBreakdown({ session, report }: FilmBreakdownProps) {
  const highlights = (report.highlights as Highlight[]) || [];
  const [filter, setFilter] = useState("all");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [annotations, setAnnotations] = useState<Record<number, Annotation>>({});
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const annotateMutation = trpc.ai.annotateHighlight.useMutation();

  const filtered = highlights
    .map((h, i) => ({ ...h, originalIndex: i }))
    .filter(h => filter === "all" || h.category === filter);

  const stats = {
    total: highlights.length,
    good: highlights.filter(h => h.verdict === "good").length,
    bad: highlights.filter(h => h.verdict !== "good").length,
  };

  const handleExpand = async (originalIndex: number) => {
    if (expandedIndex === originalIndex) {
      setExpandedIndex(null);
      return;
    }
    setExpandedIndex(originalIndex);
    if (!annotations[originalIndex]) {
      setLoadingIndex(originalIndex);
      try {
        const result = (await annotateMutation.mutateAsync({
          sessionId: session.id,
          highlightIndex: originalIndex,
        })) as Annotation;
        setAnnotations(prev => ({ ...prev, [originalIndex]: result }));
      } catch {
        toast.error("Failed to generate annotations for this moment");
      } finally {
        setLoadingIndex(null);
      }
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "offense": return "border-blue-500/50 text-blue-400 bg-blue-500/10";
      case "defense": return "border-purple-500/50 text-purple-400 bg-purple-500/10";
      case "special": return "border-yellow-500/50 text-yellow-400 bg-yellow-500/10";
      case "mistake": return "border-red-500/50 text-red-400 bg-red-500/10";
      default: return "border-muted-foreground/50 text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Key Moments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.good}</div>
            <div className="text-xs text-muted-foreground">Good Possessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.bad}</div>
            <div className="text-xs text-muted-foreground">Mistakes to Exploit</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Mistake</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Good execution</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Key player</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Suggested action</span>
      </div>

      {/* Highlight list */}
      <div className="space-y-3">
        {filtered.map(highlight => {
          const isExpanded = expandedIndex === highlight.originalIndex;
          const annotation = annotations[highlight.originalIndex];
          const isLoadingThis = loadingIndex === highlight.originalIndex;
          return (
            <Card key={highlight.originalIndex} className={isExpanded ? "border-primary/40" : ""}>
              <CardContent className="p-4">
                <button className="w-full flex items-center justify-between gap-3 text-left" onClick={() => handleExpand(highlight.originalIndex)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="outline" className={getCategoryColor(highlight.category)}>
                      {highlight.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" /> {highlight.timestamp}
                    </span>
                    <span className="font-medium text-sm truncate">{highlight.title}</span>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="mt-4 space-y-4">
                    {/* Video at timestamp with annotation overlay */}
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                      {session.sourceType === "youtube" && session.youtubeVideoId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${session.youtubeVideoId}?start=${highlight.seconds}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : session.videoUrl ? (
                        <video src={`${session.videoUrl}#t=${highlight.seconds}`} controls className="w-full h-full object-cover" />
                      ) : null}
                      {annotation && <AnnotationCanvas shapes={annotation.shapes} />}
                    </div>

                    <p className="text-sm text-muted-foreground">{highlight.note}</p>

                    {isLoadingThis ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        AI is drawing up the annotations...
                      </div>
                    ) : annotation ? (
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                          <div className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Coaching Callout
                          </div>
                          <p className="text-sm">{annotation.coaching_callout}</p>
                        </div>
                        <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                          <div className="text-[10px] uppercase tracking-wider text-blue-400 font-bold mb-1">
                            How to Exploit / Counter
                          </div>
                          <p className="text-sm">{annotation.alternative_play}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No moments in this category.</p>
        )}
      </div>
    </div>
  );
}

