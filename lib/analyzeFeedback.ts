import hookPatterns from "@/data/hook-patterns.json";
import hashtagBenchmarks from "@/data/hashtag-benchmarks.json";
import type { AnalysisResult } from "@/lib/analyze";
import type { TikTokVideoData } from "@/lib/tiktok";

export function buildFeedbackSystemPrompt(): string {
  return [
    "You are a TikTok virality expert giving a creator specific, tailored feedback on one real video they've already posted.",
    "Ground every point in the REAL data given below — this video's actual caption, hashtags, spoken hook, and stats. Never give generic advice that could apply to any video ('post consistently', 'know your audience', 'use trending sounds').",
    "Reference the video's actual words (its hook line, caption, or hashtags) by name in at least some points, so it's obvious this is about THIS video, not a template.",
    "If this video has few or no views yet, do not treat that as a personal failing or something to apologize for — reach depends on factors a creator doesn't control. Focus on what's controllable: the hook, the caption, the hashtags, the structure — not the reach itself.",
    "Use these curated pattern references to recognize when the video is or isn't using proven techniques — do not just list them back verbatim:",
    `- Curiosity gaps: ${hookPatterns.curiosityPhrases.slice(0, 8).join(", ")}`,
    `- Urgency: ${hookPatterns.urgencyPhrases.slice(0, 5).join(", ")}`,
    `- Contrarian angles: ${hookPatterns.contrarianPhrases.slice(0, 5).join(", ")}`,
    `- Niche hashtags: ${hashtagBenchmarks.sideHustleNicheTags.slice(0, 10).join(", ")}`,
    `- Oversaturated hashtags worth using sparingly: ${hashtagBenchmarks.megaTags.join(", ")}`,
    "Return 2-4 points in whatsWorking and 2-4 points in whatToImprove. Each point needs a short title (3-6 words) and a 1-2 sentence detail that references something specific and real about this video — never a generic compliment or generic tip.",
    "",
    "For suggestedHashtags: figure out what this SPECIFIC video is actually about from its caption and spoken hook (its real topic — a product, a niche, a format, a specific claim), then suggest 3-5 hashtags a viewer interested in that exact topic would search or follow, that this video isn't already using. Do not just repeat the niche-hashtag reference list above verbatim — those are style examples, not a menu to copy from. If the video's real topic differs from side-hustle/affiliate content, suggest tags that match ITS topic instead.",
    "For captionSuggestion: write one alternate caption for this exact video, grounded in its real hook/topic — front-loaded, specific, with a clear call to action — as something the creator could actually paste in to test against their current one. Always provide this, even if the current caption already tests well.",
    "",
    "Match the creator's own language (if their caption/hook is in Spanish, respond in Spanish).",
    "Always call the submit_video_feedback tool/function with your response — never respond in plain text.",
  ].join("\n");
}

export function buildFeedbackUserPrompt(video: TikTokVideoData, result: AnalysisResult): string {
  const parts: string[] = [];

  parts.push(`Caption: "${video.caption || "(none)"}"`);
  parts.push(`Hashtags used: ${video.hashtags.length > 0 ? video.hashtags.map((tag) => `#${tag}`).join(", ") : "(none)"}`);
  parts.push(
    video.transcript
      ? `Actual spoken hook (first ~15s, from the video's own subtitle track): "${video.transcript}"`
      : "No spoken-hook transcript was available for this video (no subtitle track, or the hook is delivered visually rather than in speech)."
  );

  parts.push("");
  parts.push(
    `Real stats: ${video.stats.plays.toLocaleString()} plays, ${video.stats.likes.toLocaleString()} likes, ${video.stats.comments.toLocaleString()} comments, ${video.stats.shares.toLocaleString()} shares.`
  );
  parts.push(`Engagement rate: ${(result.engagementRate * 100).toFixed(1)}%.`);
  parts.push(`Reach tier: ${result.reachTier.label} (this project's own real-likes/plays-based bucket, not a claim about virality potential).`);
  parts.push(`Video length: ${video.durationSeconds}s, posted at ${new Date(video.createTimeUnix * 1000).toISOString()}.`);

  parts.push("");
  parts.push(
    "This project's own rule-based analysis of this same video, for grounding — synthesize a natural, specific narrative from these facts, never just restate them verbatim:"
  );
  for (const category of result.categories) {
    parts.push(`- ${category.label}: ${category.score}/${category.max}. ${category.tips.join(" ")}`);
  }

  return parts.join("\n");
}
