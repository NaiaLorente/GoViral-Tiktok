import hookPatterns from "@/data/hook-patterns.json";
import hashtagBenchmarks from "@/data/hashtag-benchmarks.json";
import nicheBenchmarks from "@/data/niche-benchmarks.json";
import type { TikTokVideoData } from "@/lib/tiktok";

export interface ScoreCategory {
  key: "reach" | "performance" | "hook" | "hashtags" | "structure";
  label: string;
  score: number;
  max: number;
  tips: string[];
}

export interface ReachTier {
  id: string;
  label: string;
  emoji: string;
}

export interface AnalysisResult {
  totalScore: number;
  categories: ScoreCategory[];
  headline: string;
  engagementRate: number;
  reachTier: ReachTier;
  /** Set when real performance data overrides what the text-only checks would otherwise suggest. */
  overrideNote: string | null;
}

const CATEGORY_MAX = { reach: 15, performance: 30, hook: 30, hashtags: 15, structure: 10 } as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type ScoreBand = "good" | "warning" | "critical";

/** Shared good/warning/critical banding for any score-as-percentage — one source of truth for every score pill/bar in the UI. */
export function scoreBand(pct: number): ScoreBand {
  if (pct >= 0.8) return "good";
  if (pct >= 0.6) return "warning";
  return "critical";
}

export function firstLine(caption: string): string {
  const withoutHashtags = caption.replace(/#\w+/g, "").trim();
  const line = withoutHashtags.split(/\n|(?<=[.!?])\s/)[0] ?? withoutHashtags;
  return line.trim();
}

/**
 * Reach is graded purely from real stats (likes/plays vs. tier thresholds),
 * not from caption or hashtag wording. This is the tool's ground-truth
 * signal — a video's actual audience already voted on whether it worked.
 * Other categories get a floor tied to this tier so proxy heuristics (caption
 * phrasing, hashtag choice) can no longer drag a proven-viral video's score
 * down to near zero just because it skipped a copywriting checklist.
 */
function resolveReachTier(stats: TikTokVideoData["stats"]): (typeof nicheBenchmarks.reachTiers)[number] {
  const tiers = nicheBenchmarks.reachTiers;
  let resolved = tiers[0];
  for (const tier of tiers) {
    if (stats.likes >= tier.minLikes || stats.plays >= tier.minPlays) {
      resolved = tier;
    }
  }
  return resolved;
}

function scoreReach(stats: TikTokVideoData["stats"]): {
  score: number;
  tips: string[];
  tier: (typeof nicheBenchmarks.reachTiers)[number];
} {
  const tier = resolveReachTier(stats);
  const likesLabel = stats.likes >= 1000 ? `${(stats.likes / 1000).toFixed(stats.likes >= 100000 ? 0 : 1)}K` : String(stats.likes);
  const tips = [
    `${tier.emoji} ${tier.label} reach tier — ${likesLabel} likes on ${stats.plays.toLocaleString()} plays.`,
  ];
  return { score: tier.points, tips, tier };
}

/**
 * The actual pattern-matching against curated hook data — shared between
 * scoring a real posted video's caption (its first line stands in for the
 * hook, since we can't read on-screen/spoken text) and pre-checking an
 * unposted idea's explicit hook field directly. `line` is what gets matched
 * against phrase lists/word-count; `fullText` is the wider text the CTA
 * search runs against (a call-to-action often lives in the caption, not the
 * hook line itself).
 */
function scoreHookPatterns(line: string, fullText: string): { score: number; tips: string[] } {
  const lower = line.toLowerCase();
  const fullLower = fullText.toLowerCase();
  const w = hookPatterns.weights;
  let score = 12; // baseline for having an assessable line at all
  const tips: string[] = [];

  const hasPhrase = (list: string[]) => list.some((phrase) => lower.includes(phrase));
  const hasPhraseAnywhere = (list: string[]) => list.some((phrase) => fullLower.includes(phrase));

  if (hasPhrase(hookPatterns.curiosityPhrases)) {
    score += w.curiosity;
  } else {
    tips.push('Try a curiosity gap ("the reason nobody tells you...", "here\'s what happened when...") — optional, not required.');
  }

  if (hasPhrase(hookPatterns.urgencyPhrases)) score += w.urgency;
  if (hasPhrase(hookPatterns.contrarianPhrases)) score += w.contrarian;
  if (hasPhrase(hookPatterns.calloutPhrases)) score += w.callout;

  if (lower.includes("?")) {
    score += w.questionMark;
  }

  if (/\d/.test(lower)) {
    score += w.hasNumber;
  } else {
    tips.push('A specific number can help ("I made $412 in 3 days" beats "I made money") — optional.');
  }

  if (hasPhrase(hookPatterns.fillerOpeners)) {
    score += w.fillerOpenerPenalty;
    tips.push('Cut the filler opener ("hey guys, so today...") — get straight to the hook.');
  }

  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  const [minWords, maxWords] = hookPatterns.idealFirstLineWordRange;
  if (wordCount > 0 && (wordCount < minWords || wordCount > maxWords)) {
    score += w.firstLineTooLongPenalty;
    tips.push(`Keep your first line tight (aim for ${minWords}-${maxWords} words) — you have ${wordCount}.`);
  }

  if (hasPhraseAnywhere(hookPatterns.ctaPhrases)) {
    score += w.ctaBonus;
  } else {
    tips.push('Add a clear call to action ("comment SIDE for the link", "follow for part 2").');
  }

  return { score, tips };
}

function scoreHook(
  data: Pick<TikTokVideoData, "caption" | "transcript">,
  reachTier: (typeof nicheBenchmarks.reachTiers)[number]
): { score: number; tips: string[] } {
  const { caption, transcript } = data;
  const captionWithoutTags = caption.replace(/#\w+/g, "").trim();
  const floor = Math.round(CATEGORY_MAX.hook * reachTier.floorFactor);

  // A real transcript (from the video's own subtitle track) is what was
  // actually said in the hook window — a stronger signal than the caption,
  // which is often written differently than how someone talks. Prefer it
  // when there's enough of it to assess; caption still feeds the CTA search
  // below, since a call-to-action often lives in writing, not speech.
  const hookSource = transcript && transcript.trim().length >= 8 ? transcript.trim() : null;

  if (!hookSource && captionWithoutTags.length < 8) {
    const score = Math.max(floor, Math.round(CATEGORY_MAX.hook * 0.5));
    return {
      score: clamp(score, 0, CATEGORY_MAX.hook),
      tips: [
        "Caption is minimal and no spoken-hook transcript was found — the hook here is almost certainly delivered on-screen or spoken in a way this tool couldn't read. This score reflects text only, not the video itself.",
      ],
    };
  }

  const line = hookSource ?? firstLine(caption);
  const ctaSearchText = [transcript, caption].filter(Boolean).join(" ");
  const { score: rawScore, tips } = scoreHookPatterns(line, ctaSearchText);
  const computed = clamp(rawScore, 0, CATEGORY_MAX.hook);
  const final = Math.max(computed, floor);

  if (hookSource) {
    tips.unshift("Scored from this video's actual spoken hook (its subtitle track), not just the written caption.");
  }

  if (final > computed) {
    tips.unshift(
      `This video's real reach (${reachTier.label.toLowerCase()} tier) is strong evidence the hook works, even though the ${hookSource ? "spoken hook" : "caption text"} alone doesn't follow the checklist below — the floor reflects that.`
    );
  } else if (tips.length === 0) {
    tips.push("Strong hook — this is close to best practice for the niche.");
  }

  return { score: final, tips };
}

function scoreHashtags(
  hashtags: string[],
  reachTier: (typeof nicheBenchmarks.reachTiers)[number]
): { score: number; tips: string[] } {
  const tips: string[] = [];
  let score = 0;
  const [minCount, maxCount] = hashtagBenchmarks.idealCountRange;
  const floor = Math.round(CATEGORY_MAX.hashtags * reachTier.floorFactor * 0.8);

  if (hashtags.length >= minCount && hashtags.length <= maxCount) {
    score += 7;
  } else if (hashtags.length === 0) {
    tips.push("No hashtags used — usually worth adding a few, though clearly this video didn't need them to find an audience.");
  } else if (hashtags.length < minCount) {
    score += 4;
    tips.push(`Try ${minCount}-${maxCount} hashtags — you're using ${hashtags.length}.`);
  } else if (hashtags.length > hashtagBenchmarks.maxCountBeforePenalty) {
    tips.push(`You're using ${hashtags.length} hashtags — that reads as spammy. Trim to ${minCount}-${maxCount}.`);
  } else {
    score += 4;
    tips.push(`Try ${minCount}-${maxCount} hashtags — you're using ${hashtags.length}.`);
  }

  const megaTagCount = hashtags.filter((tag) => hashtagBenchmarks.megaTags.includes(tag)).length;
  if (megaTagCount > 0 && megaTagCount <= hashtagBenchmarks.megaTagSoftLimit) {
    score += 3;
  } else if (megaTagCount > hashtagBenchmarks.megaTagSoftLimit) {
    tips.push('Too many oversaturated tags like #fyp or #viral — they get buried instantly. Swap most for niche-specific ones.');
  } else {
    score += 2;
  }

  const nicheTagCount = hashtags.filter((tag) =>
    hashtagBenchmarks.sideHustleNicheTags.includes(tag)
  ).length;
  if (nicheTagCount > 0) {
    score += 5;
  } else {
    tips.push('Add at least one niche-specific tag (e.g. #sidehustle, #tiktokshop, #affiliatemarketing) so the right audience finds you.');
  }

  const computed = clamp(score, 0, CATEGORY_MAX.hashtags);
  const final = Math.max(computed, floor);

  if (tips.length === 0) tips.push("Solid hashtag mix — good balance of reach and relevance.");

  return { score: final, tips };
}

/** Used only for pre-checking an unposted idea — no real reach exists yet, so no floor boost applies. */
const UNPROVEN_TIER: (typeof nicheBenchmarks.reachTiers)[number] = {
  id: "unproven",
  label: "Unproven",
  emoji: "",
  minLikes: 0,
  minPlays: 0,
  points: 0,
  floorFactor: 0,
};

export interface IdeaCheckResult {
  /** 0-100, combining hook and hashtag pattern-matching only — there's no real reach yet to ground a score against, so this is NOT a virality prediction. */
  score: number;
  hookScore: number;
  hookMax: number;
  hookTips: string[];
  hashtagScore: number;
  hashtagMax: number;
  hashtagTips: string[];
  megaTagsUsed: string[];
  nicheTagsUsed: string[];
}

/**
 * Pre-checks an unposted idea's hook/caption/hashtags against the same
 * curated pattern data that scores real posted videos — but since nothing
 * has been posted yet, there's no real engagement to floor the score
 * against (unlike analyzeVideo, which trusts proven reach over the
 * checklist). This is a "how well does this match proven patterns" check,
 * not a prediction of what will actually happen once it's posted.
 */
export function checkIdea(hook: string, caption: string, hashtags: string[]): IdeaCheckResult {
  const trimmedHook = hook.trim();
  let hookScore: number;
  let hookTips: string[];

  if (trimmedHook.length < 4) {
    hookScore = Math.round(CATEGORY_MAX.hook * 0.3);
    hookTips = ["Add an actual hook line — the first 1-2 seconds is what decides whether someone keeps watching."];
  } else {
    const { score, tips } = scoreHookPatterns(trimmedHook, `${trimmedHook} ${caption}`);
    hookScore = clamp(score, 0, CATEGORY_MAX.hook);
    hookTips = tips.length > 0 ? tips : ["Strong hook — this matches proven patterns well."];
  }

  const { score: hashtagScore, tips: hashtagTips } = scoreHashtags(hashtags, UNPROVEN_TIER);
  const megaTagsUsed = hashtags.filter((tag) => hashtagBenchmarks.megaTags.includes(tag));
  const nicheTagsUsed = hashtags.filter((tag) => hashtagBenchmarks.sideHustleNicheTags.includes(tag));

  const score = Math.round(((hookScore + hashtagScore) / (CATEGORY_MAX.hook + CATEGORY_MAX.hashtags)) * 100);

  return {
    score: clamp(score, 0, 100),
    hookScore,
    hookMax: CATEGORY_MAX.hook,
    hookTips,
    hashtagScore,
    hashtagMax: CATEGORY_MAX.hashtags,
    hashtagTips,
    megaTagsUsed,
    nicheTagsUsed,
  };
}

function scorePerformance(
  stats: TikTokVideoData["stats"],
  reachTier: (typeof nicheBenchmarks.reachTiers)[number]
): { score: number; tips: string[]; engagementRate: number } {
  const tips: string[] = [];
  const { plays, likes, comments, shares } = stats;
  const floor = Math.round(CATEGORY_MAX.performance * reachTier.floorFactor);

  if (plays < 50) {
    return {
      score: Math.max(floor, Math.round(CATEGORY_MAX.performance * 0.4)),
      tips: ["Not enough plays yet to judge engagement reliably — check back once this has more views."],
      engagementRate: 0,
    };
  }

  const engagementRate = (likes + comments + shares) / plays;
  const b = nicheBenchmarks.engagementRate;
  let score: number;

  if (engagementRate >= b.excellent) {
    score = CATEGORY_MAX.performance;
    tips.push(`Excellent engagement rate (${(engagementRate * 100).toFixed(1)}%) — whatever you're doing, keep doing it.`);
  } else if (engagementRate >= b.good) {
    score = Math.round(CATEGORY_MAX.performance * 0.85);
    tips.push(`Good engagement rate (${(engagementRate * 100).toFixed(1)}%) — you're above average for this niche.`);
  } else if (engagementRate >= b.average) {
    score = Math.round(CATEGORY_MAX.performance * 0.6);
    tips.push(`Average engagement rate (${(engagementRate * 100).toFixed(1)}%) — normal for large reach; the hook or hashtags could still push this higher.`);
  } else {
    score = Math.round(CATEGORY_MAX.performance * 0.35);
    tips.push(`Engagement rate (${(engagementRate * 100).toFixed(1)}%) is on the lower side for the size of this video's reach.`);
  }

  const commentRatio = likes > 0 ? comments / likes : 0;
  if (commentRatio < nicheBenchmarks.commentToLikeRatio.healthy) {
    tips.push("Comments are low relative to likes — end with a question or a controversial take to drive replies.");
  }

  const computed = clamp(score, 0, CATEGORY_MAX.performance);
  const final = Math.max(computed, floor);
  if (final > computed) {
    tips.unshift(`At ${reachTier.label.toLowerCase()} scale, a rate that looks average by percentage still represents a large number of real engaged viewers.`);
  }

  return { score: final, tips, engagementRate };
}

function scoreStructure(data: TikTokVideoData): { score: number; tips: string[] } {
  const tips: string[] = [];
  let score = 0;

  const captionWithoutTags = data.caption.replace(/#\w+/g, "").trim();
  const { minGood, maxGood } = nicheBenchmarks.captionLength;
  if (captionWithoutTags.length >= minGood && captionWithoutTags.length <= maxGood) {
    score += 4;
  } else if (captionWithoutTags.length < minGood) {
    score += 1;
    tips.push("Caption is quite short — a sentence or two of context can pull in curious readers, though plenty of viral videos skip this entirely.");
  } else {
    score += 2;
    tips.push("Caption runs long — most of it gets truncated. Front-load the important part.");
  }

  if (data.durationSeconds > 0 && data.durationSeconds <= 34) {
    score += 3;
  } else if (data.durationSeconds > 60) {
    tips.push("This is a long video for a hook-driven format — make sure the value keeps pace with the length.");
    score += 1;
  } else {
    score += 2;
  }

  const postHour = new Date(data.createTimeUnix * 1000).getUTCHours();
  if (nicheBenchmarks.bestPostingHoursUtc.includes(postHour)) {
    score += 3;
  } else {
    score += 1;
    tips.push(`Posted at ${postHour}:00 UTC, outside the typical 11-13h/17-21h UTC window for this audience — a minor factor once a video has momentum.`);
  }

  if (tips.length === 0) tips.push("Structure is well-tuned — length, caption, and timing are all working together.");

  return { score: clamp(score, 0, CATEGORY_MAX.structure), tips };
}

export function analyzeVideo(data: TikTokVideoData): AnalysisResult {
  const reach = scoreReach(data.stats);
  const performance = scorePerformance(data.stats, reach.tier);
  const hook = scoreHook(data, reach.tier);
  const hashtags = scoreHashtags(data.hashtags, reach.tier);
  const structure = scoreStructure(data);

  const categories: ScoreCategory[] = [
    { key: "reach", label: "Real Reach", score: reach.score, max: CATEGORY_MAX.reach, tips: reach.tips },
    { key: "performance", label: "Performance", score: performance.score, max: CATEGORY_MAX.performance, tips: performance.tips },
    { key: "hook", label: "Hook & Caption", score: hook.score, max: CATEGORY_MAX.hook, tips: hook.tips },
    { key: "hashtags", label: "Hashtags", score: hashtags.score, max: CATEGORY_MAX.hashtags, tips: hashtags.tips },
    { key: "structure", label: "Structure & Timing", score: structure.score, max: CATEGORY_MAX.structure, tips: structure.tips },
  ];

  const totalScore = Math.round(categories.reduce((sum, c) => sum + c.score, 0));

  const weakest = [...categories].sort((a, b) => a.score / a.max - b.score / b.max)[0];
  const strongest = [...categories].sort((a, b) => b.score / b.max - a.score / a.max)[0];
  const headline =
    totalScore >= 80
      ? `Strong overall — ${strongest.label.toLowerCase()} is carrying this video.`
      : `Biggest opportunity: ${weakest.label.toLowerCase()}.`;

  const overrideNote =
    reach.tier.floorFactor >= 0.55
      ? `${reach.tier.emoji} This video already proved itself with real viewers (${reach.tier.label} tier) — treat the tips below as optimization ideas for next time, not a verdict on this video.`
      : null;

  return {
    totalScore: clamp(totalScore, 0, 100),
    categories,
    headline,
    engagementRate: performance.engagementRate,
    reachTier: { id: reach.tier.id, label: reach.tier.label, emoji: reach.tier.emoji },
    overrideNote,
  };
}

export interface CategoryComparison {
  key: ScoreCategory["key"];
  label: string;
  aScore: number;
  bScore: number;
  max: number;
  winner: "a" | "b" | "tie";
}

export interface ComparisonResult {
  categories: CategoryComparison[];
  overallWinner: "a" | "b" | "tie";
  summary: string;
}

/**
 * Compares two already-analyzed videos category by category. Useful for
 * A/B testing two caption variants, or checking a new video against a past
 * hit — something that requires two real data fetches, not just an opinion.
 */
export function compareResults(a: AnalysisResult, b: AnalysisResult): ComparisonResult {
  const categories: CategoryComparison[] = a.categories.map((catA, i) => {
    const catB = b.categories[i];
    const winner = catA.score === catB.score ? "tie" : catA.score > catB.score ? "a" : "b";
    return { key: catA.key, label: catA.label, aScore: catA.score, bScore: catB.score, max: catA.max, winner };
  });

  const overallWinner = a.totalScore === b.totalScore ? "tie" : a.totalScore > b.totalScore ? "a" : "b";

  // Rank by raw point contribution to the overall gap (not % of category max) —
  // that's what "mainly driven by" should mean, since category points sum to totalScore.
  const standoutCategory = [...categories]
    .filter((c) => c.winner !== "tie" && c.winner === overallWinner)
    .sort((c1, c2) => Math.abs(c2.aScore - c2.bScore) - Math.abs(c1.aScore - c1.bScore))[0];

  let summary: string;
  if (overallWinner === "tie") {
    summary = "Both videos score the same overall — check individual categories for where each one leads.";
  } else {
    const winnerLabel = overallWinner === "a" ? "Video A" : "Video B";
    const gap = Math.abs(a.totalScore - b.totalScore);
    summary = standoutCategory
      ? `${winnerLabel} scores ${gap} points higher overall, mainly driven by ${standoutCategory.label.toLowerCase()}.`
      : `${winnerLabel} scores ${gap} points higher overall.`;
  }

  return { categories, overallWinner, summary };
}
