import type { AnalysisResult } from "@/lib/analyze";

const WIDTH = 1080;
const HEIGHT = 1350; // 4:5, native TikTok/Instagram share ratio
const ACCENT = "#FF3B5C";

function scoreColor(score: number): string {
  if (score >= 80) return "#00C853";
  if (score >= 60) return "#FFB800";
  return ACCENT;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, height / 2, width / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function renderShareCard(result: AnalysisResult, handle: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 10;
  roundRectPath(ctx, 24, 24, WIDTH - 48, HEIGHT - 48, 44);
  ctx.stroke();

  ctx.textAlign = "center";

  // Reach tier pill
  const pillLabel = `${result.reachTier.emoji} ${result.reachTier.label.toUpperCase()} REACH`;
  ctx.font = "700 34px Sora, system-ui, sans-serif";
  const pillWidth = ctx.measureText(pillLabel).width + 90;
  ctx.fillStyle = "#111111";
  roundRectPath(ctx, WIDTH / 2 - pillWidth / 2, 110, pillWidth, 76, 38);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(pillLabel, WIDTH / 2, 160);

  // Score, in a dashed circle badge
  ctx.save();
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 6;
  ctx.setLineDash([14, 12]);
  ctx.beginPath();
  ctx.arc(WIDTH / 2, 460, 240, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#111111";
  ctx.font = "800 260px Sora, system-ui, sans-serif";
  ctx.fillText(String(result.totalScore), WIDTH / 2, 545);

  ctx.fillStyle = "#999999";
  ctx.font = "500 40px 'JetBrains Mono', monospace";
  ctx.fillText("/ 100", WIDTH / 2, 605);

  ctx.fillStyle = "#333333";
  ctx.font = "500 32px Inter, system-ui, sans-serif";
  wrapText(ctx, result.headline, WIDTH / 2, 780, WIDTH - 200, 42);

  let y = 900;
  ctx.textAlign = "left";
  for (const category of result.categories) {
    const barX = 100;
    const barWidth = WIDTH - 200;
    const barHeight = 26;
    const pct = category.score / category.max;

    ctx.fillStyle = "#111111";
    ctx.font = "700 28px Sora, system-ui, sans-serif";
    ctx.fillText(category.label, barX, y - 12);
    ctx.textAlign = "right";
    ctx.font = "500 26px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#666666";
    ctx.fillText(`${category.score}/${category.max}`, barX + barWidth, y - 12);
    ctx.textAlign = "left";

    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.fillStyle = "#ffffff";
    roundRectPath(ctx, barX, y, barWidth, barHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = scoreColor(pct * 100);
    roundRectPath(ctx, barX + 2, y + 2, Math.max((barWidth - 4) * pct, barHeight - 4), barHeight - 4, 5);
    ctx.fill();

    y += 78;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#999999";
  ctx.font = "500 26px Inter, system-ui, sans-serif";
  ctx.fillText(handle ? `@${handle}` : "", WIDTH / 2, HEIGHT - 130);

  ctx.fillStyle = ACCENT;
  ctx.font = "700 30px Sora, system-ui, sans-serif";
  ctx.fillText("viralscore.app", WIDTH / 2, HEIGHT - 80);

  return canvas;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
}

export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export image."));
    }, "image/png");
  });
}
