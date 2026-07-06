import hookPatterns from "@/data/hook-patterns.json";
import hashtagBenchmarks from "@/data/hashtag-benchmarks.json";
import nicheBenchmarks from "@/data/niche-benchmarks.json";
import { analyzeVideo, firstLine } from "@/lib/analyze";
import { recommendPostingTime, type PostingTimeSample } from "@/lib/timing";
import type { TikTokVideoData } from "@/lib/tiktok";

export type HookPatternKey = "curiosity" | "urgency" | "contrarian" | "pov" | "number" | "cta";

export const PATTERN_LABELS: Record<HookPatternKey, string> = {
  curiosity: "Curiosity gaps",
  urgency: "Urgency",
  contrarian: "Contrarian takes",
  pov: "POV setups",
  number: "Specific numbers",
  cta: "Calls to action",
};

// Below this frequency, no single pattern dominates enough to call it "your" pattern.
const DOMINANCE_THRESHOLD = 0.34;
export const MIN_VIDEOS_FOR_WRAPPED = 3;
const MAX_TOPICS = 5;

// Same cutoff scoreStructure() already uses to call a video's length
// "good" for a hook-driven format — reused here so the wrap's duration
// style label agrees with what the analyzer itself considers short/long.
const SHORT_FORM_MAX_SECONDS = 15;
const LONG_FORM_MIN_SECONDS = 35;

// Saves-per-like is a stronger "this is genuinely useful" signal than likes
// alone (someone saved it to come back to, not just tapped once) — this
// threshold is a heuristic, not a curated benchmark, since no public dataset
// exists for "typical" save rate by niche.
const HIGH_SAVE_RATE_THRESHOLD = 0.08;

export interface ReachTierSlice {
  id: string;
  label: string;
  emoji: string;
  count: number;
  pct: number;
}

export interface CollabMention {
  handle: string;
  /** Number of distinct videos in the batch that @mention this handle — not raw text occurrences, so mentioning the same person twice in one caption still counts once. */
  count: number;
}

export interface HashtagUsage {
  tag: string;
  count: number;
}

export interface WrappedBestVideo {
  url: string;
  /** Full real caption/description, untruncated. */
  caption: string;
  captionSnippet: string;
  hashtags: string[];
  totalScore: number;
  reachTierLabel: string;
  reachTierEmoji: string;
}

export interface WrappedStats {
  videoCount: number;
  handle: string;
  patternCounts: Record<HookPatternKey, number>;
  patternPct: Record<HookPatternKey, number>;
  dominantPattern: HookPatternKey | "balanced";
  dominantPatternPct: number;
  /** False when none of the batch's videos used any hashtags — topTopics is the fallback signal for what the content is about. */
  hasHashtags: boolean;
  megaTagPct: number;
  specificTagPct: number;
  topHashtag: string | null;
  /** Up to 8 of the batch's real hashtags with how many videos used each, most-used first. */
  topHashtagUsage: HashtagUsage[];
  /** Real @mentions of other creators found in captions (excluding the creator's own handle), most-mentioned first. */
  collabs: CollabMention[];
  hasCollabs: boolean;
  /** Real recurring words pulled from captions + spoken hooks (transcripts) — grounds the deck in what the videos are actually about even when there are no hashtags to lean on. */
  topTopics: string[];
  avgEngagementRate: number;
  /** Real sums across every video in the batch — likes/comments/saves, not per-video averages. */
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  bestVideo: WrappedBestVideo | null;
  /** Real saves-per-like ratio across the batch — a stronger "worth coming back to" signal than likes alone. */
  saveRatePct: number;
  isHighlySaveable: boolean;
  /** Real average video length across the batch, in seconds. */
  avgDurationSeconds: number;
  durationStyleLabel: "short" | "sweet-spot" | "long";
  /** "creator-history" when there's enough of the creator's own real posts to trust; "general-benchmark" otherwise — same distinction lib/timing.ts uses everywhere else. */
  postingSource: "creator-history" | "general-benchmark";
  postingWindows: string[];
  /** Daypart ids matching postingWindows, in order — lets the UI highlight the right daypart chip. */
  postingWindowIds: string[];
  /** Real average gap between posts in days, from the batch's own timestamps — null when there aren't at least 2 videos with usable timestamps spanning real time. */
  avgDaysBetweenPosts: number | null;
  /** Real distribution of this batch's videos across reach tiers (nano/micro/rising/viral/mega), canonical-order, zero-count tiers omitted. */
  reachTierBreakdown: ReachTierSlice[];
}

function hasAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase();
  return phrases.some((phrase) => lower.includes(phrase));
}

// Whole-word match ("POV:", "pov,", "a pov where...") — deliberately not a
// plain .includes("pov") substring check, which would false-positive on
// unrelated words like "poverty". One of the most iconic, reliably-phrased
// TikTok hook conventions, and — unlike a bare "?" character — not something
// caption-transcription artifacts can accidentally inject.
const POV_PATTERN = /\bpov\b/i;

// An @mention in the caption naming someone other than the creator
// themselves — a real, unambiguous signal of a collab/shoutout, unlike
// phrase-matching which is fragile across languages and caption styles.
const MENTION_PATTERN = /@(\w+)/g;

/** Distinct handles (lowercased) @mentioned in a caption, excluding the creator's own handle — deduped so mentioning the same person twice in one caption still counts as one collab for that video. */
function extractCollabMentions(caption: string, ownHandle: string): string[] {
  const matches = caption.match(MENTION_PATTERN) ?? [];
  const lowerHandle = ownHandle.toLowerCase();
  const handles = new Set<string>();
  for (const match of matches) {
    const handle = match.slice(1).toLowerCase();
    if (handle !== lowerHandle) handles.add(handle);
  }
  return [...handles];
}

// Generic English filler words, not curated/domain data — kept inline rather
// than as a data/*.json file since it's a stopword list, not proprietary content.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "so", "to", "of", "in", "on", "for", "with", "at", "by",
  "from", "up", "about", "into", "over", "after", "this", "that", "these", "those", "is", "are", "was", "were",
  "be", "been", "being", "i", "you", "he", "she", "it", "we", "they", "my", "your", "his", "her", "its", "our",
  "their", "me", "him", "us", "them", "not", "no", "yes", "do", "does", "did", "don", "didn", "isn", "wasn",
  "aren", "won", "can", "could", "will", "would", "should", "just", "really", "very", "like", "get", "got",
  "how", "what", "when", "why", "who", "which", "here", "there", "all", "some", "more", "most", "out", "as",
  "gonna", "gotta", "wanna", "okay", "yeah", "hey", "guys", "today", "video", "one", "know", "think", "going",
]);

// Words from the curated hook-pattern phrases themselves ("nobody tells
// you", "here's why", "the real reason"...) are structural/rhetorical, not
// subject matter — a creator who genuinely uses these proven patterns a lot
// would otherwise get "reason" and "nobody" surfaced as fake "topics".
const HOOK_PATTERN_WORDS = new Set(
  [
    ...hookPatterns.curiosityPhrases,
    ...hookPatterns.urgencyPhrases,
    ...hookPatterns.contrarianPhrases,
    ...hookPatterns.calloutPhrases,
    ...hookPatterns.fillerOpeners,
    ...hookPatterns.ctaPhrases,
  ].flatMap((phrase) => phrase.toLowerCase().match(/[a-z]+/g) ?? [])
);

/** Real recurring words across captions + spoken hooks, most-videos-first — a lightweight, deterministic stand-in for "what is this content about" when there's no hashtag signal to lean on. */
function extractTopTopics(videos: TikTokVideoData[]): string[] {
  const counts = new Map<string, number>();
  for (const video of videos) {
    const text = `${video.caption.replace(/#\w+/g, "")} ${video.transcript ?? ""}`.toLowerCase();
    const words = new Set(
      (text.match(/[a-z]+/g) ?? []).filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !HOOK_PATTERN_WORDS.has(w))
    );
    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOPICS)
    .map(([word]) => word);
}

/** Not enough real videos to compute a meaningful personality — same spirit as the analyzer's "not enough plays yet" floor. */
export function hasEnoughVideosForWrapped(videoCount: number): boolean {
  return videoCount >= MIN_VIDEOS_FOR_WRAPPED;
}

export function computeWrappedStats(videos: TikTokVideoData[]): WrappedStats {
  const patternCounts: Record<HookPatternKey, number> = {
    curiosity: 0,
    urgency: 0,
    contrarian: 0,
    pov: 0,
    number: 0,
    cta: 0,
  };

  let megaTagUses = 0;
  let totalTagUses = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalSaves = 0;
  let totalDurationSeconds = 0;
  const hashtagCounts = new Map<string, number>();
  const collabCounts = new Map<string, number>();
  const engagementRates: number[] = [];
  const reachTierCounts = new Map<string, number>();
  const postingSamples: PostingTimeSample[] = [];
  const postTimestamps: number[] = [];
  let best: { video: TikTokVideoData; totalScore: number; reachTierLabel: string; reachTierEmoji: string } | null = null;

  for (const video of videos) {
    const hookSource = video.transcript && video.transcript.trim().length >= 8 ? video.transcript.trim() : firstLine(video.caption);
    const ctaSearchText = [video.transcript, video.caption].filter(Boolean).join(" ");

    if (hasAny(hookSource, hookPatterns.curiosityPhrases)) patternCounts.curiosity++;
    if (hasAny(hookSource, hookPatterns.urgencyPhrases)) patternCounts.urgency++;
    if (hasAny(hookSource, hookPatterns.contrarianPhrases)) patternCounts.contrarian++;
    for (const handle of extractCollabMentions(video.caption, video.author.handle)) {
      collabCounts.set(handle, (collabCounts.get(handle) ?? 0) + 1);
    }
    if (POV_PATTERN.test(hookSource)) patternCounts.pov++;
    if (/\d/.test(hookSource)) patternCounts.number++;
    if (hasAny(ctaSearchText, hookPatterns.ctaPhrases)) patternCounts.cta++;

    for (const tag of video.hashtags) {
      totalTagUses++;
      hashtagCounts.set(tag, (hashtagCounts.get(tag) ?? 0) + 1);
      if (hashtagBenchmarks.megaTags.includes(tag)) megaTagUses++;
    }

    totalLikes += video.stats.likes;
    totalComments += video.stats.comments;
    totalSaves += video.stats.saves;
    totalDurationSeconds += video.durationSeconds;

    if (video.createTimeUnix > 0) postTimestamps.push(video.createTimeUnix);

    if (video.stats.plays > 0) {
      const rate = (video.stats.likes + video.stats.comments + video.stats.shares) / video.stats.plays;
      engagementRates.push(rate);
      if (video.createTimeUnix > 0) {
        postingSamples.push({ hourUtc: new Date(video.createTimeUnix * 1000).getUTCHours(), engagementRate: rate });
      }
    }

    const result = analyzeVideo(video);
    reachTierCounts.set(result.reachTier.id, (reachTierCounts.get(result.reachTier.id) ?? 0) + 1);
    if (!best || result.totalScore > best.totalScore) {
      best = {
        video,
        totalScore: result.totalScore,
        reachTierLabel: result.reachTier.label,
        reachTierEmoji: result.reachTier.emoji,
      };
    }
  }

  const n = videos.length || 1;
  const patternPct = Object.fromEntries(
    (Object.keys(patternCounts) as HookPatternKey[]).map((key) => [key, patternCounts[key] / n])
  ) as Record<HookPatternKey, number>;

  const [topPattern, topPatternPct] = (Object.entries(patternPct) as [HookPatternKey, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const sortedHashtags = [...hashtagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);

  const avgDurationSeconds = totalDurationSeconds / n;
  const durationStyleLabel: WrappedStats["durationStyleLabel"] =
    avgDurationSeconds < SHORT_FORM_MAX_SECONDS ? "short" : avgDurationSeconds > LONG_FORM_MIN_SECONDS ? "long" : "sweet-spot";

  const sortedTimestamps = [...postTimestamps].sort((a, b) => a - b);
  let avgDaysBetweenPosts: number | null = null;
  if (sortedTimestamps.length >= 2) {
    const spanDays = (sortedTimestamps[sortedTimestamps.length - 1] - sortedTimestamps[0]) / 86400;
    if (spanDays > 0) avgDaysBetweenPosts = spanDays / (sortedTimestamps.length - 1);
  }

  const posting = recommendPostingTime(postingSamples);

  const reachTierBreakdown: ReachTierSlice[] = nicheBenchmarks.reachTiers
    .map((tier) => ({
      id: tier.id,
      label: tier.label,
      emoji: tier.emoji,
      count: reachTierCounts.get(tier.id) ?? 0,
      pct: (reachTierCounts.get(tier.id) ?? 0) / n,
    }))
    .filter((tier) => tier.count > 0);

  const saveRatePct = totalLikes > 0 ? totalSaves / totalLikes : 0;

  const topHashtagUsage: HashtagUsage[] = [...hashtagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  const collabs: CollabMention[] = [...collabCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([handle, count]) => ({ handle, count }));

  return {
    videoCount: videos.length,
    handle: videos[0]?.author.handle ?? "",
    patternCounts,
    patternPct,
    dominantPattern: topPatternPct >= DOMINANCE_THRESHOLD ? topPattern : "balanced",
    dominantPatternPct: topPatternPct,
    hasHashtags: totalTagUses > 0,
    megaTagPct: totalTagUses > 0 ? megaTagUses / totalTagUses : 0,
    specificTagPct: totalTagUses > 0 ? 1 - megaTagUses / totalTagUses : 0,
    topHashtag: sortedHashtags[0] ?? null,
    topHashtagUsage,
    collabs,
    hasCollabs: collabs.length > 0,
    topTopics: extractTopTopics(videos),
    avgEngagementRate:
      engagementRates.length > 0 ? engagementRates.reduce((sum, r) => sum + r, 0) / engagementRates.length : 0,
    totalLikes,
    totalComments,
    totalSaves,
    bestVideo: best
      ? {
          url: best.video.url,
          caption: best.video.caption,
          captionSnippet: firstLine(best.video.caption).slice(0, 120),
          hashtags: best.video.hashtags,
          totalScore: best.totalScore,
          reachTierLabel: best.reachTierLabel,
          reachTierEmoji: best.reachTierEmoji,
        }
      : null,
    saveRatePct,
    isHighlySaveable: saveRatePct >= HIGH_SAVE_RATE_THRESHOLD,
    avgDurationSeconds,
    durationStyleLabel,
    postingSource: posting.source,
    postingWindows: posting.windows,
    postingWindowIds: posting.windowIds,
    avgDaysBetweenPosts,
    reachTierBreakdown,
  };
}
