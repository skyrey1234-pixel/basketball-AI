type Theme = { primary: string; accent: string; text: string; label: string };

export type OverlayClip = {
  clipNumber: number;
  label: string;
  timecode: string;
  durationSeconds: number;
  coachingPoint: string;
  overlay: {
    topLeft: string;
    topRight: string;
    headline: string;
    subhead: string;
    footer: string;
    theme: Theme;
  };
};

/**
 * Renders the exact broadcast-style overlay that gets burned into the exported clip card:
 * gold rails, team lockup, clip number, headline, and coaching point strap.
 */
export default function LakersOverlayPreview({ clip }: { clip: OverlayClip }) {
  const t = clip.overlay.theme;
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg"
      style={{
        aspectRatio: "16 / 9",
        background: `linear-gradient(140deg, ${t.primary} 0%, #150822 62%, #0e0517 100%)`,
        border: `1px solid ${t.accent}55`,
      }}
    >
      {/* court arc motif */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 90" preserveAspectRatio="none" aria-hidden="true">
        <path d="M20 90 A 60 60 0 0 1 140 90" fill="none" stroke={t.accent} strokeOpacity="0.22" strokeWidth="0.7" />
        <circle cx="80" cy="90" r="10" fill="none" stroke={t.accent} strokeOpacity="0.18" strokeWidth="0.6" />
        <line x1="0" y1="72" x2="160" y2="72" stroke={t.accent} strokeOpacity="0.12" strokeWidth="0.5" />
      </svg>

      {/* top rail */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ background: `${t.accent}1f`, border: `1px solid ${t.accent}66`, color: t.accent }}
        >
          {clip.overlay.topLeft}
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: t.accent }}>
          {clip.overlay.topRight}
        </span>
      </div>

      {/* headline block */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
        <div className="h-[2px] w-full rounded-full" style={{ background: `linear-gradient(90deg,${t.primary},${t.accent})` }} />
        <p className="mt-2 text-[13px] font-black leading-tight" style={{ color: t.text }}>
          {clip.overlay.headline}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: `${t.accent}dd` }}>
          <span>{clip.overlay.subhead}</span>
          <span style={{ color: `${t.text}66` }}>•</span>
          <span>{clip.timecode}</span>
          <span style={{ color: `${t.text}66` }}>•</span>
          <span>{clip.durationSeconds}s</span>
        </div>
        {clip.overlay.footer && (
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug" style={{ color: `${t.text}b8` }}>
            {clip.overlay.footer}
          </p>
        )}
      </div>
    </div>
  );
}
