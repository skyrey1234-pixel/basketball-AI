import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Youtube, Upload, Loader2, Sparkles } from "lucide-react";

export default function NewSession() {
  const [, setLocation] = useLocation();
  const [opponentName, setOpponentName] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [sourceType, setSourceType] = useState<"youtube" | "upload">("youtube");
  const [uploading, setUploading] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState<{ fileKey: string; url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = trpc.sessions.create.useMutation({
    onSuccess: data => {
      toast.success("Analysis started — the AI is watching the film");
      setLocation(`/session/${data.id}`);
    },
    onError: e => toast.error(e.message),
  });

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { fileKey: string; url: string };
      setUploadedVideo({ ...data, name: file.name });
      toast.success("Video uploaded");
    } catch {
      toast.error("Upload failed — try a smaller file or a YouTube link");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!opponentName.trim()) {
      toast.error("Enter the opponent's name");
      return;
    }
    if (sourceType === "youtube" && !youtubeUrl.trim()) {
      toast.error("Paste a YouTube link to the game film");
      return;
    }
    if (sourceType === "upload" && !uploadedVideo) {
      toast.error("Upload a video file first");
      return;
    }
    createMutation.mutate({
      opponentName: opponentName.trim(),
      gameDate: gameDate || undefined,
      sourceType,
      youtubeUrl: sourceType === "youtube" ? youtubeUrl.trim() : undefined,
      videoUrl: sourceType === "upload" ? uploadedVideo?.url : undefined,
      videoFileKey: sourceType === "upload" ? uploadedVideo?.fileKey : undefined,
    });
  };

  return (
    <AppLayout>
      <div className="container max-w-2xl py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">New Opponent Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Feed the AI game film and get a full scouting report in about a minute.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Opponent Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opponent">Opponent Name *</Label>
                <Input
                  id="opponent"
                  placeholder="e.g. Riverside Hawks"
                  value={opponentName}
                  onChange={e => setOpponentName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Game Date</Label>
                <Input id="date" type="date" value={gameDate} onChange={e => setGameDate(e.target.value)} />
              </div>
            </div>

            <Tabs value={sourceType} onValueChange={v => setSourceType(v as "youtube" | "upload")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="youtube" className="gap-2">
                  <Youtube className="h-4 w-4" /> YouTube Link
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" /> Upload Video
                </TabsTrigger>
              </TabsList>
              <TabsContent value="youtube" className="pt-4">
                <div className="space-y-2">
                  <Label htmlFor="yturl">Game Film URL</Label>
                  <Input
                    id="yturl"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={e => setYoutubeUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Full games, highlight tapes, and broadcast replays all work.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="upload" className="pt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <button
                  className="w-full border-2 border-dashed border-border rounded-xl py-10 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    </>
                  ) : uploadedVideo ? (
                    <>
                      <Upload className="h-6 w-6 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">{uploadedVideo.name}</span>
                      <span className="text-xs text-muted-foreground">Click to replace</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to select a video (up to 500MB)</span>
                    </>
                  )}
                </button>
              </TabsContent>
            </Tabs>

            <Button
              className="w-full gap-2 font-semibold"
              size="lg"
              onClick={handleSubmit}
              disabled={createMutation.isPending || uploading}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Start AI Analysis
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
