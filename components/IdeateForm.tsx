"use client";

import { FormEvent, useState } from "react";
import { MAX_VIDEO_URLS } from "@/lib/tiktokVideoBatch";

export interface IdeateFormValues {
  niche: string;
  goal: string;
  videoUrls: string[];
  profileUrl: string;
  mode: "similar" | "different";
}

interface IdeateFormProps {
  onSubmit: (values: IdeateFormValues) => void;
  isLoading: boolean;
}

function parseVideoUrls(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
  );
}

export default function IdeateForm({ onSubmit, isLoading }: IdeateFormProps) {
  const [niche, setNiche] = useState("");
  const [goal, setGoal] = useState("");
  const [videoUrlsRaw, setVideoUrlsRaw] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const videoUrls = parseVideoUrls(videoUrlsRaw);
  const hasVideos = videoUrls.length > 0;
  const tooManyVideos = videoUrls.length > MAX_VIDEO_URLS;
  const hasProfile = profileUrl.trim().length > 0;
  const nicheAndGoalFilled = niche.trim().length > 0 && goal.trim().length > 0;
  const canSubmit = (hasVideos && !tooManyVideos) || hasProfile || nicheAndGoalFilled;

  function submitWithMode(mode: "similar" | "different") {
    if (!canSubmit || tooManyVideos) {
      setShowValidation(true);
      return;
    }
    onSubmit({ niche: niche.trim(), goal: goal.trim(), videoUrls, profileUrl: profileUrl.trim(), mode });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submitWithMode("different");
  }

  const inputClass =
    "w-full rounded-[10px] border-2 border-[#111] px-4 py-2.5 text-[#111] placeholder:text-[#aaa] outline-none bg-white";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-2xl border-2 border-[#111] p-7 flex flex-col gap-4">
      <div>
        <label className="block font-display font-bold text-[13.5px] text-[#111] mb-1.5">
          Your videos <span className="text-[#999] font-medium">(1-{MAX_VIDEO_URLS} links, one per line)</span>
        </label>
        <textarea
          value={videoUrlsRaw}
          onChange={(e) => setVideoUrlsRaw(e.target.value)}
          placeholder={"https://www.tiktok.com/@you/video/123...\nhttps://www.tiktok.com/@you/video/456..."}
          rows={4}
          className={`${inputClass} resize-y font-mono text-sm`}
        />
        <p className="mt-1.5 text-xs text-[#888]">
          Paste a few of your real videos and we&apos;ll pull real captions, hashtags, and engagement from
          them — the same reliable fetch that powers &ldquo;Analyze a video.&rdquo; This is a much stronger
          signal than a profile link.
        </p>
        {tooManyVideos && (
          <p className="mt-1 text-sm" style={{ color: "var(--accent)" }}>
            That&apos;s {videoUrls.length} links — trim it to {MAX_VIDEO_URLS} or fewer.
          </p>
        )}
      </div>
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <label className="block font-display font-bold text-[13.5px] text-[#111] mb-1.5">
            What do you promote?{" "}
            {(hasVideos || hasProfile) && (
              <span className="text-[#999] font-medium">(optional)</span>
            )}
          </label>
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. a TikTok Shop skincare affiliate storefront"
            className={inputClass}
          />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="block font-display font-bold text-[13.5px] text-[#111] mb-1.5">
            Goal {(hasVideos || hasProfile) && <span className="text-[#999] font-medium">(optional)</span>}
          </label>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. drive affiliate link clicks"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="block font-display font-bold text-[13.5px] text-[#111] mb-1.5">
          Your TikTok profile{" "}
          <span className="text-[#999] font-medium">(optional — just for bio/follower count)</span>
        </label>
        <input
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          placeholder="@handle or https://www.tiktok.com/@handle"
          className={inputClass}
        />
      </div>
      {showValidation && (!canSubmit || tooManyVideos) && !tooManyVideos && (
        <p className="text-sm" style={{ color: "var(--accent)" }}>
          Add at least one video link, a profile link, or fill in what you promote and your goal.
        </p>
      )}
      <div className="mt-1 flex flex-col sm:flex-row gap-3">
        {hasVideos && (
          <button
            type="button"
            onClick={() => submitWithMode("similar")}
            disabled={isLoading}
            className="flex-1 rounded-xl border-2 border-[#111] bg-white px-6 py-3 font-display font-bold text-[14.5px] text-[#111] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f2f2f2] transition-colors"
          >
            {isLoading ? "Generating…" : "More like your videos"}
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-xl border-2 border-[#111] bg-[#111] text-white px-6 py-3 font-display font-bold text-[14.5px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-colors"
        >
          {isLoading ? "Generating…" : hasVideos ? "New ideas, same niche" : "Generate video ideas"}
        </button>
      </div>
      {hasVideos && (
        <p className="text-xs text-[#888] -mt-2">
          &ldquo;More like your videos&rdquo; builds on the specific videos above. &ldquo;New ideas, same niche&rdquo;
          stays true to your niche/voice but avoids repeating what you&apos;ve already posted.
        </p>
      )}
    </form>
  );
}
