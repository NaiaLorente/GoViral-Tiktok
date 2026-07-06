"use client";

import { useEffect, useState } from "react";
import { scoreBand, type AnalysisResult, type ScoreBand, type ScoreCategory } from "@/lib/analyze";

const BAND_COLOR: Record<ScoreBand, string> = {
  good: "#00c853",
  warning: "#ffb800",
  critical: "var(--accent)",
};

const CATEGORY_EMOJI: Record<ScoreCategory["key"], string> = {
  reach: "📶",
  performance: "⚡",
  hook: "🪝",
  hashtags: "#️⃣",
  structure: "🕐",
};

export default function ScoreBreakdown({ result }: { result: AnalysisResult }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // A real rAF-driven count-up — an animation is a legitimate effect
    // (subscribing to a time-based external clock), not a derived value.
    const target = result.totalScore;
    const start = performance.now();
    const duration = 900;
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * target));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [result.totalScore]);

  return (
    <div className="w-full max-w-xl rounded-[22px] border-2 border-[#111] p-9">
      <div className="flex gap-9 items-center flex-wrap mb-6">
        <div className="shrink-0 text-center">
          <div className="inline-block bg-[#111] text-white font-display font-bold text-xs px-3 py-1.5 rounded-full mb-3">
            {result.reachTier.emoji} {result.reachTier.label.toUpperCase()} REACH
          </div>
          <div className="font-display text-7xl font-extrabold text-[#111] tabular-nums animate-pop-in">
            {displayScore}
          </div>
          <div className="font-mono text-[13px] text-[#999]">/ 100</div>
        </div>
        <p className="flex-1 min-w-[240px] text-[16px] text-[#333] leading-relaxed">{result.headline}</p>
      </div>

      {result.overrideNote && (
        <div className="mb-6 rounded-xl border-2 border-[#111] px-4 py-3 text-sm text-[#333]" style={{ background: "color-mix(in srgb, #00c853 10%, white)" }}>
          {result.overrideNote}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {result.categories.map((category, i) => {
          const pct = category.score / category.max;
          const color = BAND_COLOR[scoreBand(pct)];

          return (
            <div key={category.key} className="animate-fade-up" style={{ animationDelay: `${80 + i * 90}ms` }}>
              <div className="flex justify-between items-center mb-2 font-display font-bold text-[14.5px] text-[#111]">
                <span>
                  {CATEGORY_EMOJI[category.key]} {category.label}
                </span>
                <span className="font-mono font-normal tabular-nums">
                  {category.score}/{category.max}
                </span>
              </div>
              <div className="h-3 rounded-md border-2 border-[#111] overflow-hidden bg-white">
                <div
                  className="h-full rounded-[2px]"
                  style={{ width: `${Math.max(pct * 100, 4)}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
