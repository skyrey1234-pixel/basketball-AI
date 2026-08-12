export type OverlayTheme = { primary: string; accent: string; text: string; label: string };

export type OverlayClipInput = {
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
    theme: OverlayTheme;
  };
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) return lines;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

/**
 * Draws a 1920x1080 Lakers-themed overlay card for one clip and returns a PNG blob.
 * This is the actual exported media asset (title card / lower-third plate) coaches drop into an editor.
 */
export function renderOverlayCardBlob(clip: OverlayClipInput): Promise<Blob> {
  const W = 1920;
  const H = 1080;
  const t = clip.overlay.theme;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2D context unavailable"));

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, t.primary);
  bg.addColorStop(0.62, "#150822");
  bg.addColorStop(1, "#0e0517");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // court arc motif
  ctx.strokeStyle = t.accent;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(W / 2, H + 60, 620, Math.PI, 2 * Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 0.14;
  ctx.beginPath();
  ctx.arc(W / 2, H + 40, 150, Math.PI, 2 * Math.PI);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // outer gold frame
  ctx.strokeStyle = `${t.accent}88`;
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // top rail: team lockup chip
  ctx.font = "800 34px Inter, sans-serif";
  const chipText = clip.overlay.topLeft;
  const chipW = ctx.measureText(chipText).width + 56;
  ctx.fillStyle = `${t.accent}26`;
  ctx.fillRect(90, 96, chipW, 68);
  ctx.strokeStyle = `${t.accent}aa`;
  ctx.lineWidth = 3;
  ctx.strokeRect(90, 96, chipW, 68);
  ctx.fillStyle = t.accent;
  ctx.textBaseline = "middle";
  ctx.fillText(chipText, 118, 132);

  // clip number, right aligned
  ctx.textAlign = "right";
  ctx.font = "900 38px Inter, sans-serif";
  ctx.fillText(clip.overlay.topRight, W - 90, 132);
  ctx.textAlign = "left";

  // gold divider above headline block
  const blockTop = H - 430;
  const grad = ctx.createLinearGradient(90, 0, W - 90, 0);
  grad.addColorStop(0, t.primary);
  grad.addColorStop(1, t.accent);
  ctx.fillStyle = grad;
  ctx.fillRect(90, blockTop, W - 180, 8);

  // headline
  ctx.fillStyle = t.text;
  ctx.font = "900 92px 'Space Grotesk', Inter, sans-serif";
  const headlineLines = wrapText(ctx, clip.overlay.headline, W - 200, 2);
  headlineLines.forEach((line, i) => ctx.fillText(line, 90, blockTop + 90 + i * 104));

  // meta strip
  const metaY = blockTop + 90 + headlineLines.length * 104 + 24;
  ctx.fillStyle = `${t.accent}ee`;
  ctx.font = "800 40px Inter, sans-serif";
  ctx.fillText(`${clip.overlay.subhead}   •   ${clip.timecode}   •   ${clip.durationSeconds}s`, 90, metaY);

  // coaching point
  if (clip.overlay.footer) {
    ctx.fillStyle = `${t.text}c4`;
    ctx.font = "500 38px Inter, sans-serif";
    const footerLines = wrapText(ctx, clip.overlay.footer, W - 200, 3);
    footerLines.forEach((line, i) => ctx.fillText(line, 90, metaY + 68 + i * 50));
  }

  // brand mark
  ctx.fillStyle = `${t.accent}99`;
  ctx.font = "800 28px Inter, sans-serif";
  ctx.fillText("COURTVISION AI", 90, H - 96);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("Failed to encode PNG"))), "image/png");
  });
}
