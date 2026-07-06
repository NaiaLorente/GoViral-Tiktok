import type { CreatorWrappedNarrative } from "@/lib/providers";
import { buildMonsterFlags, BALANCED_RAINBOW_STOPS, type PersonaTheme } from "@/lib/wrappedPersona";
import { drawMonsterOnCanvas } from "@/lib/wrappedMonsterCanvas";

const WIDTH = 1080;
const HEIGHT = 1350; // 4:5, native TikTok/Instagram share ratio

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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
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
  return lineY;
}

export function renderWrappedCard(narrative: CreatorWrappedNarrative, handle: string, theme: PersonaTheme): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  if (theme.isBalanced) {
    BALANCED_RAINBOW_STOPS.forEach((color, i) => gradient.addColorStop(i / (BALANCED_RAINBOW_STOPS.length - 1), color));
  } else {
    gradient.addColorStop(0, theme.color);
    gradient.addColorStop(1, theme.color2);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 10;
  roundRectPath(ctx, 24, 24, WIDTH - 48, HEIGHT - 48, 44);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#111111";
  ctx.font = "700 30px 'JetBrains Mono', monospace";
  ctx.fillText("VIRALSCORE · CREATOR WRAPPED", WIDTH / 2, 170);

  const monsterFlags = buildMonsterFlags(theme.monster);
  ctx.save();
  ctx.translate(WIDTH / 2 - 80 * 2.3, 210);
  ctx.scale(2.3, 2.3);
  drawMonsterOnCanvas(ctx, monsterFlags);
  ctx.restore();

  ctx.font = "700 34px Sora, sans-serif";
  ctx.fillText(monsterFlags.name, WIDTH / 2, 620);

  ctx.font = "800 70px Sora, system-ui, sans-serif";
  const labelEndY = wrapText(ctx, narrative.personalityLabel, WIDTH / 2, 700, WIDTH - 160, 80);

  ctx.font = "500 36px Inter, system-ui, sans-serif";
  wrapText(ctx, narrative.tagline, WIDTH / 2, labelEndY + 100, WIDTH - 220, 48);

  ctx.font = "500 28px Inter, system-ui, sans-serif";
  ctx.fillText(handle ? `@${handle}` : "", WIDTH / 2, HEIGHT - 130);
  ctx.font = "700 32px Sora, system-ui, sans-serif";
  ctx.fillText("viralscore.app", WIDTH / 2, HEIGHT - 80);

  return canvas;
}
