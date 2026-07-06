import nicheBenchmarks from "@/data/niche-benchmarks.json";

/** One real posted video's post hour + engagement rate — the raw material for a creator-specific timing recommendation. */
export interface PostingTimeSample {
  hourUtc: number;
  engagementRate: number;
}

interface Daypart {
  id: string;
  label: string;
  hours: number[];
}

// Broader buckets than exact hour-of-day — with at most 25 real videos to
// work with, bucketing by exact hour leaves most hours with 0-1 samples,
// too sparse to compare. A daypart still reads as a useful "when" answer.
// Exported so the UI can render the full set of buckets (e.g. a chip row)
// and highlight whichever one(s) a recommendation actually points at.
export const DAYPARTS: Daypart[] = [
  { id: "lateNight", label: "Late night (0h-6h UTC)", hours: [0, 1, 2, 3, 4, 5] },
  { id: "morning", label: "Morning (6h-11h UTC)", hours: [6, 7, 8, 9, 10] },
  { id: "midday", label: "Midday (11h-14h UTC)", hours: [11, 12, 13] },
  { id: "afternoon", label: "Afternoon (14h-17h UTC)", hours: [14, 15, 16] },
  { id: "evening", label: "Evening (17h-21h UTC)", hours: [17, 18, 19, 20] },
  { id: "lateEvening", label: "Late evening (21h-24h UTC)", hours: [21, 22, 23] },
];

function daypartForHour(hourUtc: number): Daypart {
  return DAYPARTS.find((d) => d.hours.includes(hourUtc)) ?? DAYPARTS[0];
}

export interface TimingRecommendation {
  /** "creator-history" when there's enough of the creator's own real data; "general-benchmark" otherwise. */
  source: "creator-history" | "general-benchmark";
  windows: string[];
  /** Daypart ids matching `windows`, in the same order — lets the UI highlight the right daypart chip without re-parsing the label text. */
  windowIds: string[];
  sampleCount: number;
}

// Below this many real samples, per-daypart averages are too noisy (often
// 0-1 videos per bucket) to say anything meaningful about THIS creator —
// fall back to the general curated benchmark instead of a confident-looking
// but statistically thin claim.
const MIN_SAMPLES_FOR_OWN_HISTORY = 5;

const GENERAL_BENCHMARK_DAYPARTS = Array.from(
  new Set(nicheBenchmarks.bestPostingHoursUtc.map((hour) => daypartForHour(hour).id))
).map((id) => DAYPARTS.find((d) => d.id === id)!);

/**
 * Recommends posting windows grounded in the creator's own real video
 * timestamps + engagement when there's enough of it, falling back to the
 * general curated benchmark otherwise. This is NOT a per-content-type
 * calendar — TikTok doesn't expose any real data source for "when do videos
 * like this go viral," so this only ever answers "when do YOUR videos (or
 * videos in general, per the curated benchmark) tend to perform best."
 */
export function recommendPostingTime(samples: PostingTimeSample[]): TimingRecommendation {
  if (samples.length < MIN_SAMPLES_FOR_OWN_HISTORY) {
    return {
      source: "general-benchmark",
      windows: GENERAL_BENCHMARK_DAYPARTS.map((d) => d.label),
      windowIds: GENERAL_BENCHMARK_DAYPARTS.map((d) => d.id),
      sampleCount: samples.length,
    };
  }

  const buckets = new Map<string, { id: string; label: string; total: number; count: number }>();
  for (const sample of samples) {
    const daypart = daypartForHour(sample.hourUtc);
    const bucket = buckets.get(daypart.id) ?? { id: daypart.id, label: daypart.label, total: 0, count: 0 };
    bucket.total += sample.engagementRate;
    bucket.count += 1;
    buckets.set(daypart.id, bucket);
  }

  const ranked = [...buckets.values()]
    .map((b) => ({ id: b.id, label: b.label, avg: b.total / b.count }))
    .sort((a, b) => b.avg - a.avg);

  const top = ranked.slice(0, 2);
  return {
    source: "creator-history",
    windows: top.map((r) => r.label),
    windowIds: top.map((r) => r.id),
    sampleCount: samples.length,
  };
}
