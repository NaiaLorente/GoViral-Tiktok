import hookPatterns from "@/data/hook-patterns.json";
import hashtagBenchmarks from "@/data/hashtag-benchmarks.json";
import nicheBenchmarks from "@/data/niche-benchmarks.json";
import type { TikTokVideoData } from "@/lib/tiktok";
import type { AnalysisResult } from "@/lib/analyze";

export interface BoostAction {
  id: string;
  icon: string;
  action: string;
}

/**
 * Unlike the score breakdown's tips (which explain why a video scored what
 * it did, mostly framed as "next time..."), these are things a creator can
 * literally still do to THIS already-posted video: TikTok allows editing a
 * caption/hashtags after posting, pinning a comment, and cross-posting —
 * none of that requires reshooting anything. Deliberately excludes anything
 * that can't actually be changed post-publish (the post time, the video
 * content itself).
 */
export function getBoostActions(video: TikTokVideoData, result: AnalysisResult): BoostAction[] {
  const actions: BoostAction[] = [];
  const captionAndTranscript = [video.caption, video.transcript].filter(Boolean).join(" ").toLowerCase();

  const megaTagCount = video.hashtags.filter((tag) => hashtagBenchmarks.megaTags.includes(tag)).length;
  const hasNicheTag = video.hashtags.some((tag) => hashtagBenchmarks.sideHustleNicheTags.includes(tag));
  if (megaTagCount > hashtagBenchmarks.megaTagSoftLimit || !hasNicheTag) {
    actions.push({
      id: "edit-hashtags",
      icon: "✏️",
      action:
        megaTagCount > hashtagBenchmarks.megaTagSoftLimit
          ? `Edit your caption now: swap a couple of oversaturated tags (${hashtagBenchmarks.megaTags.filter((t) => video.hashtags.includes(t)).map((t) => `#${t}`).join(", ")}) for a niche one like #${hashtagBenchmarks.sideHustleNicheTags[0]}.`
          : `Edit your caption now: add one niche-specific tag (e.g. #${hashtagBenchmarks.sideHustleNicheTags[0]}) — TikTok lets you edit hashtags after posting.`,
    });
  }

  const hasCta = hookPatterns.ctaPhrases.some((phrase) => captionAndTranscript.includes(phrase));
  if (!hasCta) {
    const suggestion = hookPatterns.ctaPhrases[0];
    actions.push({
      id: "pin-cta-comment",
      icon: "📌",
      action: `Pin a comment with a clear call to action — something like "${suggestion}" — since the caption doesn't have one.`,
    });
  }

  const { likes, comments, plays } = video.stats;
  const commentRatio = likes > 0 ? comments / likes : 0;
  if (plays > 0 && commentRatio < nicheBenchmarks.commentToLikeRatio.healthy) {
    actions.push({
      id: "drive-replies",
      icon: "💬",
      action: "Reply to a few real comments (or pin a question) — comments are low relative to likes, and replies drive more comments in return.",
    });
  }

  if (result.reachTier.id === "viral" || result.reachTier.id === "mega") {
    actions.push({
      id: "cross-post",
      icon: "🔁",
      action: "This is picking up real traction — repost it to Instagram Reels / YouTube Shorts now while it's hot to capture spillover reach.",
    });
  }

  return actions;
}
