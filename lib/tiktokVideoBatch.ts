import { fetchTikTokVideoData, TikTokFetchError, type TikTokVideoData } from "@/lib/tiktok";
import type { CreatorProfileSummary } from "@/lib/tiktokProfile";
import type { PostingTimeSample } from "@/lib/timing";

export const MAX_VIDEO_URLS = 25;

const PER_VIDEO_TIMEOUT_MS = 8000;
// A modest concurrency cap rather than firing all 25 at once — still much
// faster than sequential, but less of a suspicious traffic burst from one
// source in a tight window.
const CONCURRENCY = 6;

export interface VideoBatchFailure {
  url: string;
  reason: string;
}

export const MAX_TRANSCRIPTS = 5;

export interface VideoBatchResult {
  summary: CreatorProfileSummary;
  succeededCount: number;
  failedUrls: VideoBatchFailure[];
  videoTranscripts: string[];
  postingTimeSamples: PostingTimeSample[];
  /** The raw per-video data behind `summary` — lets callers (e.g. Creator Wrapped) compute per-video stats without a second fetch. */
  videos: TikTokVideoData[];
}

function withTimeout(promise: Promise<TikTokVideoData>, ms: number): Promise<TikTokVideoData> {
  return Promise.race([
    promise,
    new Promise<TikTokVideoData>((_, reject) =>
      setTimeout(() => reject(new Error("Timed out fetching this video.")), ms)
    ),
  ]);
}

async function runInBatches<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      try {
        const value = await fn(items[current]);
        results[current] = { status: "fulfilled", value };
      } catch (error) {
        results[current] = { status: "rejected", reason: error };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/**
 * Reuses the single-video fetcher (lib/tiktok.ts) that already powers the
 * "Analyze a video" mode — that path has proven reliable all session,
 * unlike profile-page scraping (see lib/tiktokProfile.ts). Aggregating
 * across a creator's own hand-picked videos gives real hashtag/caption/
 * engagement signal without ever touching a TikTok profile page.
 */
export async function aggregateTikTokVideos(urls: string[]): Promise<VideoBatchResult> {
  const results = await runInBatches(urls, CONCURRENCY, (url) =>
    withTimeout(fetchTikTokVideoData(url), PER_VIDEO_TIMEOUT_MS)
  );

  const succeeded: TikTokVideoData[] = [];
  const failedUrls: VideoBatchFailure[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      succeeded.push(result.value);
    } else {
      const reason =
        result.reason instanceof Error ? result.reason.message : "Couldn't read this video.";
      failedUrls.push({ url: urls[i], reason });
    }
  });

  if (succeeded.length === 0) {
    throw new TikTokFetchError("FETCH_FAILED", "None of those video links could be read.");
  }

  const hashtagCounts = new Map<string, number>();
  const engagementRates: number[] = [];
  const captions: string[] = [];
  const postingTimeSamples: PostingTimeSample[] = [];

  for (const video of succeeded) {
    if (video.caption) captions.push(video.caption);
    for (const tag of video.hashtags) {
      hashtagCounts.set(tag, (hashtagCounts.get(tag) ?? 0) + 1);
    }
    if (video.stats.plays > 0) {
      const rate = (video.stats.likes + video.stats.comments + video.stats.shares) / video.stats.plays;
      engagementRates.push(rate);
      if (video.createTimeUnix > 0) {
        postingTimeSamples.push({ hourUtc: new Date(video.createTimeUnix * 1000).getUTCHours(), engagementRate: rate });
      }
    }
  }

  const topHashtags = [...hashtagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  const avgEngagementRate =
    engagementRates.length > 0 ? engagementRates.reduce((sum, r) => sum + r, 0) / engagementRates.length : 0;

  const summary: CreatorProfileSummary = {
    handle: succeeded[0].author.handle,
    nickname: succeeded[0].author.nickname,
    // Bio/follower count aren't available from individual video pages —
    // app/ideate/page.tsx merges these in from an optional profile lookup.
    bio: "",
    followerCount: 0,
    topHashtags,
    avgEngagementRate,
    recentCaptionSamples: captions.slice(0, 10),
  };

  const videoTranscripts = succeeded
    .map((video) => video.transcript)
    .filter((transcript): transcript is string => Boolean(transcript))
    .slice(0, MAX_TRANSCRIPTS);

  return { summary, succeededCount: succeeded.length, failedUrls, videoTranscripts, postingTimeSamples, videos: succeeded };
}
