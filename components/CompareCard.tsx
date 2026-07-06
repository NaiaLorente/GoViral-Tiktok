"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/analyze";

function scoreColor(pct: number): string {
  if (pct >= 0.8) return "#00C853";
  if (pct >= 0.6) return "#FFB800";
  return "var(--accent)";
}

export default function CompareCard({ label, result }: { label: string; result: AnalysisResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border-2 border-[#111] p-5">
      <div className="text-center mb-4">
        <span className="font-mono text-xs uppercase tracking-wide text-[#999]">{label}</span>
        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#111] px-2.5 py-0.5 text-xs font-semibold text-white">
          <span>{result.reachTier.emoji}</span>
          <span>{result.reachTier.label}</span>
        </div>
        <div className="text-4xl font-display font-extrabold text-[#111] mt-1">
          {result.totalScore}
          <span className="text-base text-[#999] font-semibold"> /100</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {result.categories.map((category) => {
          const pct = category.score / category.max;
          return (
            <div key={category.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#555]">{category.label}</span>
                <span className="text-[#999] tabular-nums">
                  {category.score}/{category.max}
                </span>
              </div>
              <div className="h-2 rounded-md border border-[#111] overflow-hidden bg-white">
                <div
                  className="h-full"
                  style={{ width: `${Math.max(pct * 100, 4)}%`, background: scoreColor(pct) }}
                />
              </div>
              {expanded && (
                <ul className="mt-1.5 mb-2 space-y-1">
                  {category.tips.map((tip, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-[#666] leading-snug">
                      <span className="text-[#bbb] shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 w-full text-center text-xs font-medium text-[#999] hover:text-[#111] transition-colors"
      >
        {expanded ? "Hide details" : "Show details"}
      </button>
    </div>
  );
}
