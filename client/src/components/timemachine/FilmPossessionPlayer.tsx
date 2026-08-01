import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Snowflake, Film } from "lucide-react";

/**
 * Plays the ACTUAL game film for one possession.
 *
 * The clip is bounded to [filmStart, filmEnd] and auto-freezes at filmDecision —
 * the exact frame where the ball-handler had to choose. That freeze is the whole
 * point: the coach sees the real read on real film, then flips to the diagram to
 * see what was open.
 *
 * Two sources are supported:
 *  - YouTube  → iframe + YouTube IFrame API for real playback control
 *  - Uploaded → native <video>, which gives frame-accurate control via timeupdate
 */

type Props = {
  sourceType: "youtube" | "upload";
  youtubeVideoId?: string | null;
  videoUrl?: string | null;
  filmStart: number;
  filmDecision: number;
  filmEnd: number;
  /** Fired once when playback reaches the decision point. */
  onDecisionReached?: () => void;
  /** Key that changes when the possession changes, forcing a reset. */
  resetKey: string;
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ------------------------------ YouTube API ------------------------------ */

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  // Already loaded.
  if ((window as any).YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>(resolve => {
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

export default function FilmPossessionPlayer({
  sourceType,
  youtubeVideoId,
  videoUrl,
  filmStart,
  filmDecision,
  filmEnd,
  onDecisionReached,
  resetKey,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(filmStart);
  const [frozen, setFrozen] = useState(false);
  const [ready, setReady] = useState(false);

  const firedDecision = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytRef = useRef<any>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<number | null>(null);

  const span = Math.max(1, filmEnd - filmStart);
  const decisionPct = useMemo(
    () => Math.min(100, Math.max(0, ((filmDecision - filmStart) / span) * 100)),
    [filmDecision, filmStart, span]
  );
  const playedPct = Math.min(100, Math.max(0, ((current - filmStart) / span) * 100));

  /* ----------------------------- shared control ---------------------------- */

  const seekTo = useCallback((t: number) => {
    if (sourceType === "youtube") ytRef.current?.seekTo?.(t, true);
    else if (videoRef.current) videoRef.current.currentTime = t;
    setCurrent(t);
  }, [sourceType]);

  const pause = useCallback(() => {
    if (sourceType === "youtube") ytRef.current?.pauseVideo?.();
    else videoRef.current?.pause();
    setPlaying(false);
  }, [sourceType]);

  const play = useCallback(() => {
    if (sourceType === "youtube") ytRef.current?.playVideo?.();
    else void videoRef.current?.play();
    setPlaying(true);
  }, [sourceType]);

  /** Freeze exactly at the decision point and tell the parent. */
  const freezeAtDecision = useCallback(() => {
    if (firedDecision.current) return;
    firedDecision.current = true;
    pause();
    seekTo(filmDecision);
    setFrozen(true);
    onDecisionReached?.();
  }, [filmDecision, onDecisionReached, pause, seekTo]);

  const restart = useCallback(() => {
    firedDecision.current = false;
    setFrozen(false);
    seekTo(filmStart);
    play();
  }, [filmStart, play, seekTo]);

  /** Skip the wind-up and jump straight to the frozen decision frame. */
  const jumpToDecision = useCallback(() => {
    firedDecision.current = false;
    freezeAtDecision();
  }, [freezeAtDecision]);

  /* ------------------------- possession change reset ----------------------- */

  useEffect(() => {
    firedDecision.current = false;
    setFrozen(false);
    setPlaying(false);
    setCurrent(filmStart);
    seekTo(filmStart);
    pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  /* ------------------------------ upload path ----------------------------- */

  useEffect(() => {
    if (sourceType !== "upload") return;
    const el = videoRef.current;
    if (!el) return;

    const onLoaded = () => {
      el.currentTime = filmStart;
      setReady(true);
    };
    const onTime = () => {
      setCurrent(el.currentTime);
      if (el.currentTime >= filmDecision && !firedDecision.current) freezeAtDecision();
      else if (el.currentTime >= filmEnd) pause();
    };
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
    };
  }, [sourceType, filmStart, filmDecision, filmEnd, freezeAtDecision, pause]);

  /* ------------------------------ youtube path ---------------------------- */

  useEffect(() => {
    if (sourceType !== "youtube" || !youtubeVideoId) return;
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !ytHostRef.current) return;
      const YT = (window as any).YT;
      if (!YT?.Player) return;

      ytRef.current = new YT.Player(ytHostRef.current, {
        videoId: youtubeVideoId,
        playerVars: {
          start: filmStart,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          disablekb: 1,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            ytRef.current?.seekTo?.(filmStart, true);
          },
          onStateChange: (e: any) => {
            // 1 = playing, 2 = paused
            setPlaying(e.data === 1);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        ytRef.current?.destroy?.();
      } catch {
        /* iframe already gone */
      }
      ytRef.current = null;
    };
    // Rebuild the player only when the video itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType, youtubeVideoId]);

  /** YouTube has no timeupdate event — poll while playing. */
  useEffect(() => {
    if (sourceType !== "youtube") return;
    if (pollRef.current) window.clearInterval(pollRef.current);

    pollRef.current = window.setInterval(() => {
      const p = ytRef.current;
      if (!p?.getCurrentTime) return;
      const t = p.getCurrentTime();
      setCurrent(t);
      if (t >= filmDecision && !firedDecision.current) freezeAtDecision();
      else if (t >= filmEnd) pause();
    }, 200);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [sourceType, filmDecision, filmEnd, freezeAtDecision, pause]);

  const noSource = sourceType === "youtube" ? !youtubeVideoId : !videoUrl;

  if (noSource) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 p-6 text-center">
        <Film className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Film not available</p>
        <p className="text-xs text-muted-foreground">
          This session has no playable video attached, so only the tactical diagram is shown.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="relative w-full overflow-hidden rounded-xl border border-border bg-black"
        style={{ aspectRatio: "16 / 9" }}
      >
        {sourceType === "youtube" ? (
          <div ref={ytHostRef} className="absolute inset-0 h-full w-full" />
        ) : (
          <video
            ref={videoRef}
            src={videoUrl ?? undefined}
            className="absolute inset-0 h-full w-full object-contain"
            playsInline
            preload="metadata"
          />
        )}

        {/* Live film badge */}
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-[#FF7A1A] backdrop-blur">
          <span className={`h-1.5 w-1.5 rounded-full bg-[#FF7A1A] ${playing ? "animate-pulse" : ""}`} />
          ACTUAL FILM
        </div>

        {/* Clock */}
        <div className="pointer-events-none absolute right-3 top-3 z-20 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-white/80 backdrop-blur">
          {fmt(current)} / {fmt(filmEnd)}
        </div>

        {/* Frozen overlay at the decision point */}
        {frozen && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/10 to-transparent">
            <div className="mb-4 flex items-center gap-2 rounded-full border border-[#FF7A1A]/50 bg-black/70 px-3 py-1.5 backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Snowflake className="h-3.5 w-3.5 text-[#FF7A1A]" />
              <span className="text-xs font-semibold text-white">Frozen at the decision</span>
            </div>
          </div>
        )}

        {/* Big center play button before first run */}
        {!playing && !frozen && ready && (
          <button
            onClick={restart}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 transition-colors hover:bg-black/25"
            aria-label="Play the possession"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF7A1A] shadow-lg transition-transform active:scale-95">
              <Play className="h-6 w-6 fill-black text-black" />
            </span>
          </button>
        )}

        {!ready && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF7A1A]" /> Loading film…
            </div>
          </div>
        )}
      </div>

      {/* Scrub bar with the decision marker */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-[#FF7A1A]"
          style={{ width: `${playedPct}%`, transition: "width 200ms linear" }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-green-400"
          style={{ left: `${decisionPct}%` }}
          title="Decision point"
        />
      </div>

      {/* Film controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={playing ? pause : restart}
          className="flex items-center gap-1.5 rounded-lg bg-[#FF7A1A] px-3 py-1.5 text-xs font-semibold text-black transition-transform active:scale-95"
        >
          {playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          {playing ? "Pause" : frozen ? "Replay clip" : "Play clip"}
        </button>
        <button
          onClick={jumpToDecision}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Snowflake className="h-3.5 w-3.5" /> Jump to decision
        </button>
        <button
          onClick={restart}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restart
        </button>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          clip {fmt(filmStart)}–{fmt(filmEnd)} · decision {fmt(filmDecision)}
        </span>
      </div>
    </div>
  );
}
