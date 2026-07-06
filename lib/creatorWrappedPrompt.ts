import { PATTERN_LABELS, type WrappedStats } from "@/lib/creatorWrapped";

export function buildWrappedSystemPrompt(): string {
  return [
    "You are writing the copy for a fun, Spotify-Wrapped-style personality recap of a TikTok creator, based ONLY on real stats computed from their own real posted videos (given below).",
    "Never invent numbers, patterns, or claims not given below — you are writing FLAVOR TEXT around real data, not analyzing or fact-checking it yourself.",
    "Tone: upbeat, a little playful and cheeky, like Spotify Wrapped or YouTube Recap copy — short, punchy, never corny or generic ('you're doing great!').",
    "The personality label must be genuinely tied to their real dominant pattern (or their real balance across patterns, if none dominates) — never a generic label unconnected to the actual stats.",
    "For hashtagSlideCaption: if hasHashtags is true below, react to their real hashtag mix and top tag(s) with real usage counts. If hasHashtags is false, do NOT mention hashtags at all (they don't use them) — instead react to their real recurring topics/words given below, so the slide still says something true and specific about their content.",
    "For collabSlideCaption: if this creator has real collab/shoutout @mentions given below, react to their most-repeated collaborator by real handle and real count. If they have none, say so honestly and lightly (e.g. that they're flying solo so far) — never invent a collaborator or a count.",
    "For formatSlideCaption: react to their real average video length/style given below (short-and-punchy, sweet-spot, or long-form) — just react to the real number and style, don't invent a reason for it.",
    "For postingSlideCaption: react to their real posting rhythm given below — the recommended timing window (whether it's from their own history or a general benchmark, phrased naturally either way) and, if given, their real average days-between-posts. If no cadence number is given, react to the timing window alone.",
    "For reachSlideCaption: react to their real reach-tier spread (what share of their videos landed in which tier) and their real save rate given below — a high save rate is a genuine positive signal worth calling out specifically, not generic praise.",
    "For totalsSlideCaption: react to their real combined likes/comments/saves totals — make big real numbers feel like an achievement, without inventing a cause for them.",
    "Always call the submit_creator_wrapped tool/function with your response — never respond in plain text.",
  ].join("\n");
}

export function buildWrappedUserPrompt(stats: WrappedStats): string {
  const parts: string[] = [];

  parts.push(`Creator: @${stats.handle || "unknown"}, based on ${stats.videoCount} of their real posted videos.`);
  parts.push("");
  parts.push("Real hook-pattern usage across these videos (percent of videos using each):");
  for (const [key, pct] of Object.entries(stats.patternPct) as [keyof typeof PATTERN_LABELS, number][]) {
    parts.push(`- ${PATTERN_LABELS[key]}: ${Math.round(pct * 100)}%`);
  }
  parts.push(
    stats.dominantPattern === "balanced"
      ? "No single pattern dominates — this creator's real style is a genuine mix, not one repeated trick."
      : `Dominant real pattern: ${PATTERN_LABELS[stats.dominantPattern]} (${Math.round(stats.dominantPatternPct * 100)}% of videos).`
  );

  parts.push("");
  if (stats.hasHashtags) {
    parts.push(
      `Hashtag mix: ${Math.round(stats.megaTagPct * 100)}% of hashtag uses are oversaturated mega-tags (#fyp, #viral, etc.), ${Math.round(stats.specificTagPct * 100)}% are more specific tags.`
    );
    if (stats.topHashtagUsage.length > 0) {
      parts.push(
        `Their real hashtag usage counts, most-used first: ${stats.topHashtagUsage
          .map((item) => `#${item.tag} (${item.count}x)`)
          .join(", ")}.`
      );
    }
  } else {
    parts.push("This creator doesn't use hashtags on these videos at all — do not reference hashtags for them.");
    if (stats.topTopics.length > 0) {
      parts.push(`Instead, real recurring words/topics pulled from their actual captions and spoken hooks: ${stats.topTopics.join(", ")}.`);
    }
  }

  parts.push("");
  if (stats.hasCollabs) {
    parts.push(
      `Real collab/shoutout @mentions found in captions, most-mentioned first: ${stats.collabs
        .map((c) => `@${c.handle} (${c.count} video${c.count === 1 ? "" : "s"})`)
        .join(", ")}.`
    );
  } else {
    parts.push("This creator doesn't @mention any other creators in these captions — no real collabs to reference.");
  }

  parts.push("");
  const durationStyleText =
    stats.durationStyleLabel === "short"
      ? "short and punchy"
      : stats.durationStyleLabel === "long"
      ? "long-form"
      : "in the sweet spot for a hook-driven format";
  parts.push(`Real average video length: ${Math.round(stats.avgDurationSeconds)}s — ${durationStyleText}.`);

  parts.push("");
  const postingWindowText =
    stats.postingWindows.length > 0
      ? `Recommended posting window, ${
          stats.postingSource === "creator-history" ? "based on this creator's own real posting history" : "from the general curated benchmark (not enough of this creator's own history yet)"
        }: ${stats.postingWindows.join(" or ")}.`
      : "Not enough real timing data to recommend a posting window.";
  parts.push(postingWindowText);
  if (stats.avgDaysBetweenPosts !== null) {
    parts.push(`Real average gap between posts in this batch: ${stats.avgDaysBetweenPosts.toFixed(1)} days.`);
  }

  parts.push("");
  if (stats.reachTierBreakdown.length > 0) {
    parts.push(
      `Real reach-tier spread across these videos: ${stats.reachTierBreakdown
        .map((tier) => `${Math.round(tier.pct * 100)}% ${tier.label}`)
        .join(", ")}.`
    );
  }
  parts.push(
    `Real save rate (saves per like): ${(stats.saveRatePct * 100).toFixed(1)}%${stats.isHighlySaveable ? " — notably high, a strong 'worth coming back to' signal" : ""}.`
  );

  parts.push("");
  parts.push(
    `Real totals across all these videos combined: ${stats.totalLikes.toLocaleString()} likes, ${stats.totalComments.toLocaleString()} comments, ${stats.totalSaves.toLocaleString()} saves.`
  );

  parts.push("");
  parts.push(`Real average engagement rate across these videos: ${(stats.avgEngagementRate * 100).toFixed(1)}%.`);
  if (stats.bestVideo) {
    parts.push(
      `Their real best-scoring video: ${stats.bestVideo.totalScore}/100 (${stats.bestVideo.reachTierEmoji} ${stats.bestVideo.reachTierLabel} reach). ` +
        `Full real caption: "${stats.bestVideo.caption || "(no caption)"}". ` +
        `Its real hashtags: ${stats.bestVideo.hashtags.length > 0 ? stats.bestVideo.hashtags.map((tag) => `#${tag}`).join(", ") : "(none)"}.`
    );
  }

  return parts.join("\n");
}
