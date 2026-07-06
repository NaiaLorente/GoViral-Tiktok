"use client";

import { useState } from "react";
import type { VideoIdea } from "@/lib/providers";
import { checkIdea, scoreBand } from "@/lib/analyze";

interface VideoIdeaCardProps {
  idea: VideoIdea;
  index: number;
  onCheck?: (idea: VideoIdea) => void;
}

const SCORE_PILL_COLOR: Record<ReturnType<typeof scoreBand>, string> = {
  good: "#00C853",
  warning: "#FFB800",
  critical: "var(--accent)",
};

export default function VideoIdeaCard({ idea, index, onCheck }: VideoIdeaCardProps) {
  const [copied, setCopied] = useState(false);
  // Cheap, pure, client-only — no API call, so this can run on every render
  // without debouncing. Same logic the analyzer and IdeaCheckPanel use.
  const preScore = checkIdea(idea.hook, idea.caption, idea.hashtags);

  function handleCopy() {
    const text = `${idea.hook}\n\n${idea.caption}\n\n${idea.hashtags.map((tag) => `#${tag}`).join(" ")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-2xl border-2 border-[#111] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs font-bold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            Idea {index + 1}
          </span>
          <span
            title="Pattern match score — how closely this matches proven hook/hashtag patterns, not a virality guarantee"
            className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums text-white"
            style={{ background: SCORE_PILL_COLOR[scoreBand(preScore.score / 100)] }}
          >
            {preScore.score}
          </span>
        </div>
        <button onClick={handleCopy} className="text-xs font-medium text-[#999] hover:text-[#111] transition-colors">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="text-[#111] font-semibold leading-snug mb-2">&ldquo;{idea.hook}&rdquo;</p>
      <p className="text-[#555] text-sm leading-relaxed mb-3">{idea.caption}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {idea.hashtags.map((tag, i) => (
          <span key={`${i}-${tag}`} className="text-xs border border-[#111] rounded-full px-2 py-0.5" style={{ background: "var(--accent2)" }}>
            #{tag}
          </span>
        ))}
      </div>
      <p className="text-xs text-[#999] italic mb-3">{idea.rationale}</p>
      {onCheck && (
        <button
          onClick={() => onCheck(idea)}
          className="font-display text-xs font-bold text-[#111] border-b-2 pb-0.5"
          style={{ borderColor: "var(--accent2)" }}
        >
          Check this idea →
        </button>
      )}
    </div>
  );
}
