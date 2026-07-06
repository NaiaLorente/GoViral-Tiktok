"use client";

import { useEffect, useState } from "react";
import { checkIdea, scoreBand, type IdeaCheckResult } from "@/lib/analyze";
import { recommendPostingTime, type PostingTimeSample } from "@/lib/timing";

export interface IdeaCheckPrefill {
  hook: string;
  caption: string;
  hashtags: string[];
}

interface IdeaCheckPanelProps {
  postingTimeSamples: PostingTimeSample[];
  prefill: IdeaCheckPrefill | null;
}

function parseHashtags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean)
    )
  );
}

const BAND_COLOR: Record<ReturnType<typeof scoreBand>, string> = {
  good: "#00895a",
  warning: "#a67c00",
  critical: "var(--accent)",
};

export default function IdeaCheckPanel({ postingTimeSamples, prefill }: IdeaCheckPanelProps) {
  const [hook, setHook] = useState(prefill?.hook ?? "");
  const [caption, setCaption] = useState(prefill?.caption ?? "");
  const [hashtagsRaw, setHashtagsRaw] = useState(prefill?.hashtags.join(" ") ?? "");
  const [result, setResult] = useState<IdeaCheckResult | null>(
    prefill ? checkIdea(prefill.hook, prefill.caption, prefill.hashtags) : null
  );
  // Tracks which prefill object we've last synced from, so a new "Check this
  // idea" click (a new object, even for the same idea re-clicked) resets the
  // form — adjusting state from a prop during render, not inside an effect.
  const [syncedPrefill, setSyncedPrefill] = useState(prefill);
  if (prefill !== syncedPrefill) {
    setSyncedPrefill(prefill);
    if (prefill) {
      setHook(prefill.hook);
      setCaption(prefill.caption);
      setHashtagsRaw(prefill.hashtags.join(" "));
      setResult(checkIdea(prefill.hook, prefill.caption, prefill.hashtags));
    }
  }

  useEffect(() => {
    if (prefill) document.getElementById("idea-check-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [prefill]);

  function handleCheck() {
    setResult(checkIdea(hook, caption, parseHashtags(hashtagsRaw)));
  }

  const timing = recommendPostingTime(postingTimeSamples);
  const inputClass =
    "w-full rounded-[10px] border-2 border-[#111] px-4 py-2.5 text-[#111] placeholder:text-[#aaa] outline-none bg-white";

  return (
    <div id="idea-check-panel" className="w-full max-w-xl rounded-2xl border-2 border-[#111] p-7">
      <h2 className="font-display text-lg font-extrabold text-[#111] mb-1">Check an idea</h2>
      <p className="text-sm text-[#666] mb-4">
        Type your own idea, or hit &ldquo;Check this idea&rdquo; on one above. This checks your hook and
        hashtags against the same curated patterns that power the analyzer — it can&apos;t predict real-world
        virality, which depends on delivery, timing, and things no tool can see in advance.
      </p>

      <div className="flex flex-col gap-3 mb-4">
        <input
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          placeholder="Your hook — the first 1-2 seconds"
          className={inputClass}
        />
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Your caption"
          rows={2}
          className={`${inputClass} resize-y`}
        />
        <input
          value={hashtagsRaw}
          onChange={(e) => setHashtagsRaw(e.target.value)}
          placeholder="Hashtags (space or comma separated, # optional)"
          className={inputClass}
        />
        <button
          onClick={handleCheck}
          disabled={!hook.trim()}
          className="rounded-xl border-2 border-[#111] bg-[#111] text-white px-5 py-2.5 font-display font-bold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-colors"
        >
          Check this idea
        </button>
      </div>

      {result && (
        <div className="flex flex-col gap-4 pt-4 border-t-2 border-[#111]">
          <div className="flex items-center gap-3 rounded-xl border-2 border-[#111] px-4 py-3">
            <span className="text-3xl font-display font-extrabold" style={{ color: BAND_COLOR[scoreBand(result.score / 100)] }}>
              {result.score}
            </span>
            <div className="text-sm text-[#666]">
              <p className="font-semibold text-[#111]">Pattern match score</p>
              <p>How closely this matches proven hook/hashtag patterns — not a virality guarantee.</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#111] mb-1.5">
              Hook <span className="text-[#999] font-normal tabular-nums">({result.hookScore}/{result.hookMax})</span>
            </p>
            <ul className="space-y-1.5">
              {result.hookTips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#333] leading-relaxed">
                  <span className="text-[#bbb] shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#111] mb-1.5">
              Hashtags{" "}
              <span className="text-[#999] font-normal tabular-nums">({result.hashtagScore}/{result.hashtagMax})</span>
            </p>
            <ul className="space-y-1.5 mb-2">
              {result.hashtagTips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#333] leading-relaxed">
                  <span className="text-[#bbb] shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            {result.megaTagsUsed.length > 0 && (
              <p className="text-xs" style={{ color: "#a67c00" }}>
                Oversaturated: {result.megaTagsUsed.map((t) => `#${t}`).join(" ")}
              </p>
            )}
            {result.nicheTagsUsed.length > 0 && (
              <p className="text-xs" style={{ color: "#00895a" }}>
                Niche tags: {result.nicheTagsUsed.map((t) => `#${t}`).join(" ")}
              </p>
            )}
          </div>

          <div className="rounded-xl border-2 border-[#111] p-4">
            <p className="text-sm font-semibold text-[#111] mb-1.5">Best time to post</p>
            <div className="flex flex-wrap gap-2 mb-1.5">
              {timing.windows.map((w) => (
                <span key={w} className="text-xs font-medium border border-[#111] rounded-full px-2.5 py-1" style={{ background: "var(--accent2)" }}>
                  {w}
                </span>
              ))}
            </div>
            <p className="text-xs text-[#999]">
              {timing.source === "creator-history"
                ? `Based on ${timing.sampleCount} of your own videos with real engagement data.`
                : "General curated benchmark — paste more of your own videos above for a recommendation based on your actual posting history."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
