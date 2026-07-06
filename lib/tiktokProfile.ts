import { extractHashtags, toNumber } from "@/lib/tiktok";
import { fetchProfileViaBrowser } from "@/lib/tiktokProfileBrowser";

const TIKTOK_HOST_PATTERN = /(^|\.)tiktok\.com$/i;

export type TikTokProfileFetchErrorCode = "INVALID_URL" | "FETCH_FAILED" | "NOT_FOUND_OR_PRIVATE" | "PARSE_FAILED";

export class TikTokProfileFetchError extends Error {
  code: TikTokProfileFetchErrorCode;
  constructor(code: TikTokProfileFetchErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "TikTokProfileFetchError";
  }
}

export interface CreatorProfileSummary {
  handle: string;
  nickname: string;
  bio: string;
  followerCount: number;
  topHashtags: string[];
  avgEngagementRate: number;
  recentCaptionSamples: string[];
}

export function normalizeTikTokProfileInput(raw: string): URL {
  const trimmed = raw.trim();
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://www.tiktok.com/@${trimmed.replace(/^@/, "")}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new TikTokProfileFetchError("INVALID_URL", "That doesn't look like a valid TikTok profile.");
  }
  if (!TIKTOK_HOST_PATTERN.test(parsed.hostname)) {
    throw new TikTokProfileFetchError("INVALID_URL", "Only tiktok.com profile links are supported.");
  }
  return parsed;
}

/**
 * Profile pages embed a different shape than video pages: a user/stats node
 * plus (usually) a list of the creator's most recent items in the same
 * server-rendered JSON blob — TikTok typically only needs signed XHR calls
 * for *further* pagination (scrolling past the initial batch), not for the
 * first ~9-30 videos, which normally ship in the initial page load. This is
 * untested against the live site (see lib/tiktok.ts for why), so the exact
 * key path and shape may need tuning — but an empty item list should be the
 * exception, not the rule, and must still be handled gracefully by the
 * caller when it happens.
 */
function findUserInfo(node: unknown, depth = 0): { user: Record<string, unknown>; stats: Record<string, unknown> } | null {
  if (depth > 12 || node === null || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findUserInfo(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;
  const user = obj.user;
  const stats = obj.stats;
  if (
    typeof user === "object" &&
    user !== null &&
    typeof (user as Record<string, unknown>).uniqueId === "string" &&
    typeof stats === "object" &&
    stats !== null &&
    "followerCount" in (stats as Record<string, unknown>)
  ) {
    return { user: user as Record<string, unknown>, stats: stats as Record<string, unknown> };
  }

  for (const key of Object.keys(obj)) {
    const found = findUserInfo(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * A real TikTok video id is a long numeric string (occasionally a number in
 * some JSON shapes) — checking for that first is what lets this tolerate
 * item shapes that are missing desc/stats on some entries (pinned videos,
 * ads, or fields TikTok has renamed) without false-positiving on unrelated
 * arrays/objects elsewhere in the page's hydration data.
 */
function looksLikeVideoItem(entry: unknown): entry is Record<string, unknown> {
  if (typeof entry !== "object" || entry === null) return false;
  const obj = entry as Record<string, unknown>;
  const id = obj.id;
  const hasVideoLikeId =
    (typeof id === "string" && /^\d{5,}$/.test(id)) || (typeof id === "number" && id > 10000);
  if (!hasVideoLikeId) return false;
  return (
    typeof obj.desc === "string" ||
    (typeof obj.stats === "object" && obj.stats !== null) ||
    (typeof obj.video === "object" && obj.video !== null)
  );
}

/** True if most (not necessarily all) entries look like video items — tolerates a stray ad/pinned-marker entry. */
function extractItemList(candidates: unknown[]): Record<string, unknown>[] | null {
  if (candidates.length === 0) return null;
  const matches = candidates.filter(looksLikeVideoItem);
  if (matches.length > 0 && matches.length >= candidates.length * 0.6) {
    return matches;
  }
  return null;
}

const PRIORITY_LIST_KEYS = ["itemList", "items", "userPostList", "postList", "list"];

function findItemList(node: unknown, depth = 0): Record<string, unknown>[] | null {
  if (depth > 20 || node === null || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    const direct = extractItemList(node);
    if (direct) return direct;

    for (const child of node) {
      const found = findItemList(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;

  // Some hydration shapes normalize the list as an object keyed by video id
  // rather than an array — check that before recursing further.
  const asValues = extractItemList(Object.values(obj));
  if (asValues) return asValues;

  // Check TikTok's known list key names first (faster, and avoids matching
  // an unrelated array elsewhere in the tree before the real one).
  for (const key of PRIORITY_LIST_KEYS) {
    if (key in obj) {
      const found = findItemList(obj[key], depth + 1);
      if (found) return found;
    }
  }

  for (const key of Object.keys(obj)) {
    if (PRIORITY_LIST_KEYS.includes(key)) continue; // already checked above
    const found = findItemList(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

async function plainFetchHtml(url: URL): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
  } catch {
    throw new TikTokProfileFetchError("FETCH_FAILED", "Couldn't reach TikTok. Try again in a moment.");
  }

  if (response.status === 404) {
    throw new TikTokProfileFetchError("NOT_FOUND_OR_PRIVATE", "That profile wasn't found — it may be private or doesn't exist.");
  }
  if (!response.ok) {
    throw new TikTokProfileFetchError("FETCH_FAILED", `TikTok returned an unexpected status (${response.status}).`);
  }
  return response.text();
}

function extractHydrationJson(html: string): unknown | null {
  const scriptMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return null;
  try {
    return JSON.parse(scriptMatch[1]);
  } catch {
    return null;
  }
}

export async function fetchTikTokProfileSummary(rawInput: string): Promise<CreatorProfileSummary> {
  const url = normalizeTikTokProfileInput(rawInput);

  // A plain fetch reliably gets the page but is frequently served reduced
  // (bot-detected) content missing the real video list — a headless browser
  // is what actually gets treated as real traffic. Try that first, and only
  // fall back to the plain fetch if the browser path fails outright (e.g.
  // Chromium unavailable in this environment, or it blew its internal
  // deadline — see lib/tiktokProfileBrowser.ts for why that deadline exists).
  const candidates: unknown[] = [];
  let html = "";
  try {
    const result = await fetchProfileViaBrowser(url.toString());
    html = result.html;
    candidates.push(...result.apiResponses);
  } catch {
    // Fall through to the plain-fetch path below.
  }

  if (!html) {
    html = await plainFetchHtml(url);
  }

  const hydrationJson = extractHydrationJson(html);
  if (hydrationJson) candidates.push(hydrationJson);

  if (candidates.length === 0) {
    throw new TikTokProfileFetchError(
      "PARSE_FAILED",
      "Couldn't read this profile's data — TikTok may have changed their page format."
    );
  }

  let userInfo: ReturnType<typeof findUserInfo> = null;
  let items: Record<string, unknown>[] = [];
  for (const candidate of candidates) {
    userInfo ??= findUserInfo(candidate);
    if (items.length === 0) {
      const found = findItemList(candidate);
      if (found) items = found;
    }
  }

  if (!userInfo) {
    throw new TikTokProfileFetchError(
      "NOT_FOUND_OR_PRIVATE",
      "That profile's data wasn't in the page — it may be private or doesn't exist."
    );
  }

  // Cap to the first 10 videos found — plenty to establish a niche, and
  // keeps this fast regardless of how large the embedded list turns out to be.
  items = items.slice(0, 10);
  const hashtagCounts = new Map<string, number>();
  const engagementRates: number[] = [];
  const captions: string[] = [];

  for (const item of items) {
    const caption = typeof item.desc === "string" ? item.desc : "";
    if (caption) captions.push(caption);

    for (const tag of extractHashtags(item, caption)) {
      hashtagCounts.set(tag, (hashtagCounts.get(tag) ?? 0) + 1);
    }

    const stats = item.stats as Record<string, unknown> | undefined;
    if (stats) {
      const plays = toNumber(stats.playCount);
      if (plays > 0) {
        const rate = (toNumber(stats.diggCount) + toNumber(stats.commentCount) + toNumber(stats.shareCount)) / plays;
        engagementRates.push(rate);
      }
    }
  }

  const topHashtags = [...hashtagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  const avgEngagementRate =
    engagementRates.length > 0 ? engagementRates.reduce((sum, r) => sum + r, 0) / engagementRates.length : 0;

  return {
    handle: typeof userInfo.user.uniqueId === "string" ? userInfo.user.uniqueId : "",
    nickname: typeof userInfo.user.nickname === "string" ? userInfo.user.nickname : "",
    bio: typeof userInfo.user.signature === "string" ? userInfo.user.signature : "",
    followerCount: toNumber(userInfo.stats.followerCount),
    topHashtags,
    avgEngagementRate,
    recentCaptionSamples: captions.slice(0, 8),
  };
}
