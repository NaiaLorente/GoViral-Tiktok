"use client";

import { useEffect, useState } from "react";
import { generateAnalysisFeedback, type LLMProvider, type VideoFeedback, type VideoFeedbackPoint } from "@/lib/providers";
import { buildFeedbackSystemPrompt, buildFeedbackUserPrompt } from "@/lib/analyzeFeedback";
import type { TikTokVideoData } from "@/lib/tiktok";
import type { AnalysisResult } from "@/lib/analyze";

interface TailoredFeedbackProps {
  video: TikTokVideoData;
  result: AnalysisResult;
  provider: LLMProvider;
  apiKey: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
}

type FeedbackState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "result"; feedback: VideoFeedback };

/** Mount this component with `key={video.url}` from the parent so state resets cleanly per video. */
export default function TailoredFeedback({ video, result, provider, apiKey, ollamaBaseUrl, ollamaModel }: TailoredFeedbackProps) {
  const [state, setState] = useState<FeedbackState>({ status: "idle" });
  const hasCredentials = provider === "ollama" ? ollamaModel.trim().length > 0 : apiKey.trim().length > 0;

  async function generate() {
    setState({ status: "loading" });
    try {
      const systemPrompt = buildFeedbackSystemPrompt();
      const userPrompt = buildFeedbackUserPrompt(video, result);

      let feedback: VideoFeedback;
      if (provider === "ollama") {
        feedback = await generateAnalysisFeedback({ provider: "ollama", baseUrl: ollamaBaseUrl, model: ollamaModel }, systemPrompt, userPrompt);
      } else {
        const response = await fetch("/api/analyze-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey, video, result }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
        feedback = body.feedback as VideoFeedback;
      }
      setState({ status: "result", feedback });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    }
  }

  useEffect(() => {
    // One-time, mount-only auto-generate for a user who already added a key
    // at the top of the page before analyzing — this component is remounted
    // per video via a `key` prop, so this only ever fires once per video.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasCredentials) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-xl rounded-[22px] border-2 border-[#111] p-8">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="font-display font-extrabold text-[20px] text-[#111]">Tailored feedback</span>
        <span className="font-mono text-[11px] text-[#999] border border-[#ddd] rounded-full px-2.5 py-0.5">written for this video</span>
      </div>

      {state.status === "idle" && !hasCredentials && (
        <p className="text-sm text-[#666]">Add your AI provider key at the top of the page to get tailored feedback for this video.</p>
      )}

      {state.status === "idle" && hasCredentials && (
        <button
          onClick={generate}
          className="rounded-xl border-2 border-[#111] bg-[#111] text-white px-5 py-2.5 font-display font-bold text-[14px] hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-colors"
        >
          Generate feedback
        </button>
      )}

      {state.status === "loading" && (
        <p className="text-[#666] text-sm animate-pulse">Reading this video&apos;s real data and writing your feedback…</p>
      )}

      {state.status === "error" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border-2 border-[#111] px-4 py-3 text-sm text-[#111]" style={{ background: "color-mix(in srgb, var(--accent) 8%, white)" }}>
            {state.message}
          </div>
          <button
            onClick={generate}
            disabled={!hasCredentials}
            className="self-start rounded-xl border-2 border-[#111] px-5 py-2.5 font-display font-bold text-[13.5px] text-[#111] hover:bg-[#f2f2f2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Try again
          </button>
          {!hasCredentials && <p className="text-xs text-[#999]">Add your AI provider key at the top of the page first.</p>}
        </div>
      )}

      {state.status === "result" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FeedbackList title="✓ What's working" points={state.feedback.whatsWorking} color="#00895a" />
            <FeedbackList title="△ What to improve" points={state.feedback.whatToImprove} color="var(--accent)" />
          </div>
          <div className="pt-6 border-t border-dashed border-[#ccc] flex flex-col sm:flex-row gap-6 flex-wrap">
            <HashtagSuggestions hashtags={state.feedback.suggestedHashtags} />
            <CaptionSuggestion caption={state.feedback.captionSuggestion} />
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackList({ title, points, color }: { title: string; points: VideoFeedbackPoint[]; color: string }) {
  if (points.length === 0) return null;

  return (
    <div>
      <p className="font-display font-bold text-[14px] mb-2.5" style={{ color }}>
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {points.map((point, i) => (
          <li key={i} className="text-[14px] text-[#333] leading-relaxed">
            <span className="font-semibold text-[#111]">{point.title}.</span> {point.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HashtagSuggestions({ hashtags }: { hashtags: VideoFeedback["suggestedHashtags"] }) {
  const [copied, setCopied] = useState(false);
  if (hashtags.length === 0) return null;

  function handleCopy() {
    navigator.clipboard.writeText(hashtags.map((h) => `#${h.tag}`).join(" ")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex-1 min-w-[240px]">
      <div className="flex items-center justify-between mb-2">
        <p className="font-display font-bold text-[13px] text-[#111]">Hashtags to try</p>
        <button onClick={handleCopy} className="text-xs font-medium text-[#999] hover:text-[#111] transition-colors">
          {copied ? "Copied ✓" : "Copy all"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-1">
        {hashtags.map((h, i) => (
          <span
            key={i}
            title={h.reason}
            className="text-[12.5px] border border-[#111] rounded-full px-2.5 py-1"
            style={{ background: "var(--accent2)" }}
          >
            #{h.tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function CaptionSuggestion({ caption }: { caption: string }) {
  const [copied, setCopied] = useState(false);
  if (!caption) return null;

  function handleCopy() {
    navigator.clipboard.writeText(caption).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex-[1.4] min-w-[260px]">
      <div className="flex items-center justify-between mb-2">
        <p className="font-display font-bold text-[13px] text-[#111]">Try this caption</p>
        <button onClick={handleCopy} className="text-xs font-medium text-[#999] hover:text-[#111] transition-colors">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="border-2 border-[#111] rounded-[10px] px-3.5 py-2.5 text-[13px] text-[#333] bg-[#fafafa]">&ldquo;{caption}&rdquo;</p>
    </div>
  );
}
