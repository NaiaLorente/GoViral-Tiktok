import type { MonsterFlags } from "@/lib/wrappedPersona";

/** Mirrors components/WrappedMonster.tsx (same 0-160 local coordinate space) onto a canvas 2D context, so the downloadable share card carries the same mascot the deck shows. */
export function drawMonsterOnCanvas(ctx: CanvasRenderingContext2D, m: MonsterFlags): void {
  function ell(cx: number, cy: number, rx: number, ry: number, fill?: string | null, stroke?: string | null, lw?: number, opacity?: number) {
    ctx.save();
    if (opacity !== undefined) ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw ?? 3;
      ctx.stroke();
    }
    ctx.restore();
  }
  function ln(x1: number, y1: number, x2: number, y2: number, stroke: string, lw: number) {
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }
  function tri(pts: [number, number][], fill: string) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }
  function pathD(d: string, fill: string | null, stroke: string, lw: number) {
    const p = new Path2D(d);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill(p);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.stroke(p);
  }
  function roundRectStroke(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.stroke();
  }

  const { bodyColor, bellyColor } = m;

  ell(80, 140, 40, 8, "#000000", null, 0, 0.12);

  ell(55, 132, 12, 7, bodyColor, "#111111", 3);
  ell(105, 132, 12, 7, bodyColor, "#111111", 3);

  if (m.armsDefault) {
    ell(18, 96, 11, 11, bodyColor, "#111111", 3);
    ell(142, 96, 11, 11, bodyColor, "#111111", 3);
  }
  if (m.armsCrossed) {
    pathD("M38 96 Q70 116 102 96", null, "#111111", 14);
    pathD("M38 96 Q70 116 102 96", null, bodyColor, 9);
    pathD("M122 96 Q90 116 58 96", null, "#111111", 14);
    pathD("M122 96 Q90 116 58 96", null, bodyColor, 9);
  }
  if (m.armsPointing) {
    ell(18, 96, 11, 11, bodyColor, "#111111", 3);
    pathD("M128 96 Q148 84 146 54", null, "#111111", 13);
    pathD("M128 96 Q148 84 146 54", null, bodyColor, 9);
    ell(146, 48, 9, 9, bodyColor, "#111111", 3);
  }
  if (m.armsCupped) {
    ell(48, 100, 9, 7, bodyColor, "#111111", 3);
    ell(112, 100, 9, 7, bodyColor, "#111111", 3);
  }

  ell(80, 88, 58, 50, bodyColor, "#111111", 4);
  ell(80, 100, 32, 27, bellyColor, null, 0, 0.9);

  if (m.topAntenna) {
    ln(80, 40, 80, 16, "#111111", 4);
    ell(80, 12, 7, 7, bellyColor, "#111111", 3);
  }
  if (m.topHorns) {
    tri([[55, 42], [46, 16], [68, 32]], "#111111");
    tri([[105, 42], [114, 16], [92, 32]], "#111111");
  }
  if (m.topMohawk) {
    tri([[64, 38], [68, 14], [74, 38]], bodyColor);
    tri([[74, 34], [80, 8], [86, 34]], bodyColor);
    tri([[86, 38], [92, 14], [96, 38]], bodyColor);
  }
  if (m.topPartyHat) {
    pathD("M62 40 L80 6 L98 40 Z", "#7C5CFF", "#111111", 3);
    ell(70, 30, 3.5, 3.5, "#ffffff");
    ell(84, 20, 3.5, 3.5, "#ffffff");
    ell(78, 34, 3, 3, "#ffffff");
    ell(80, 6, 6, 6, "#FFB020", "#111111", 2.5);
  }

  if (m.beltBolt) {
    pathD("M86 66 L68 98 L80 98 L72 124 L102 88 L86 88 Z", bellyColor, "#111111", 3);
  }
  if (m.beltDots) {
    ell(64, 112, 5, 5, "#111111");
    ell(80, 112, 5, 5, "#111111");
    ell(96, 112, 5, 5, "#111111");
  }
  if (m.beltTarget) {
    ell(80, 108, 16, 16, "#ffffff", "#111111", 2.5);
    ell(80, 108, 10, 10, bodyColor, "#111111", 2);
    ell(80, 108, 4, 4, "#111111");
  }
  if (m.beltPatches) {
    for (const p of m.patches) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ell(p.cx, p.cy, p.rx, p.ry, p.fill, "#111111", 1.5, 0.9);
      ctx.restore();
    }
  }

  if (m.browAngry) {
    ln(46, 56, 66, 64, "#111111", 4);
    ln(114, 56, 94, 64, "#111111", 4);
  }
  if (m.browRaised) {
    pathD("M46 54 Q60 44 74 54", null, "#111111", 3);
    pathD("M86 54 Q100 44 114 54", null, "#111111", 3);
  }

  if (m.isTwoEye) {
    ell(60, 74, 15, 15, "#ffffff", "#111111", 3);
    ell(60, 77, 6, 6, "#111111");
    ell(58, 75, 2, 2, "#ffffff");
    ell(100, 74, 15, 15, "#ffffff", "#111111", 3);
    ell(100, 77, 6, 6, "#111111");
    ell(98, 75, 2, 2, "#ffffff");
    if (m.hasGlasses) {
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 4;
      roundRectStroke(42, 60, 36, 28, 9);
      roundRectStroke(82, 60, 36, 28, 9);
      ln(78, 74, 82, 74, "#111111", 4);
      ln(42, 70, 30, 66, "#111111", 4);
      ln(118, 70, 130, 66, "#111111", 4);
    }
  }
  if (m.isOneEye) {
    ell(80, 76, 24, 24, "#ffffff", "#111111", 3);
    ell(80, 80, 10, 10, "#111111");
    ell(76, 77, 3, 3, "#ffffff");
  }
  if (m.isWink) {
    pathD("M48 76 Q60 84 72 76", null, "#111111", 4);
    ell(100, 74, 15, 15, "#ffffff", "#111111", 3);
    ell(100, 77, 6, 6, "#111111");
    ell(98, 75, 2, 2, "#ffffff");
  }

  if (m.isSmile) {
    pathD("M62 102 Q80 118 98 102", null, "#111111", 4);
  }
  if (m.isZigzag) {
    pathD("M58 104 L68 114 L78 104 L88 114 L98 104", null, "#111111", 4);
  }
  if (m.isFlat) {
    ln(65, 108, 95, 108, "#111111", 4);
  }
  if (m.isOpen) {
    ell(80, 108, 13, 10, "#111111");
    ell(80, 112, 7, 5, "#ff6b81");
  }
  if (m.hasSoundWaves) {
    pathD("M108 92 Q120 100 108 108", null, "#111111", 2.5);
    pathD("M115 86 Q131 100 115 114", null, "#111111", 2.5);
  }
  if (m.hasBowtie) {
    tri([[80, 122], [64, 114], [64, 130]], "#111111");
    tri([[80, 122], [96, 114], [96, 130]], "#111111");
    ell(80, 122, 5, 5, "#FFB020", "#111111", 2);
  }
}
