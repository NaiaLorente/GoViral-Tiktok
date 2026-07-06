const TIKTOK_HOST_PATTERN = /(^|\.)tiktok\.com$/i;

// Subtitle files are served from a different host than the page itself
// (a CDN variant, not always under tiktok.com) — this is the SSRF guard for
// that follow-up fetch, since the URL comes from data TikTok's own page
// returned rather than from user input.
const ASSET_HOST_SUFFIXES = [
  ".tiktokcdn.com",
  ".tiktokcdn-us.com",
  ".tiktokcdn-eu.com",
  ".tiktokv.com",
  ".ibytedtos.com",
  ".ibyteimg.com",
  ".muscdn.com",
];

function isTrustedTikTokAssetUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  const trusted = TIKTOK_HOST_PATTERN.test(host) || ASSET_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  return trusted ? parsed : null;
}

export type TikTokFetchErrorCode =
  | "INVALID_URL"
  | "FETCH_FAILED"
  | "NOT_FOUND_OR_PRIVATE"
  | "PARSE_FAILED";

export class TikTokFetchError extends Error {
  code: TikTokFetchErrorCode;
  constructor(code: TikTokFetchErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "TikTokFetchError";
  }
}

export interface TikTokVideoData {
  id: string;
  url: string;
  caption: string;
  hashtags: string[];
  author: { handle: string; nickname: string };
  stats: {
    plays: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  durationSeconds: number;
  createTimeUnix: number;
  coverUrl: string | null;
  /** Spoken/caption content from the first ~15s, sourced from TikTok's own auto-generated subtitle track — null if the video has none. */
  transcript: string | null;
}

export function normalizeTikTokUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new TikTokFetchError("INVALID_URL", "That doesn't look like a valid URL.");
  }
  if (!TIKTOK_HOST_PATTERN.test(parsed.hostname)) {
    throw new TikTokFetchError(
      "INVALID_URL",
      "Only tiktok.com video links are supported."
    );
  }
  return parsed;
}

/**
 * TikTok ships a JSON data blob in every video page (currently under a
 * script tag with id __UNIVERSAL_DATA_FOR_REHYDRATION__). The exact key
 * path inside that blob has moved before and will likely move again, so
 * instead of hardcoding a path we walk the parsed object looking for the
 * first node that looks like an item struct (has desc/stats/video/author).
 * This is the one file that should need updates if TikTok changes markup.
 */
function findItemStruct(node: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 12 || node === null || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findItemStruct(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;
  const looksLikeItemStruct =
    typeof obj.desc === "string" &&
    typeof obj.stats === "object" &&
    obj.stats !== null &&
    typeof obj.video === "object" &&
    obj.video !== null &&
    typeof obj.author === "object" &&
    obj.author !== null;

  if (looksLikeItemStruct) return obj;

  for (const key of Object.keys(obj)) {
    const found = findItemStruct(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

export function extractHashtags(itemStruct: Record<string, unknown>, caption: string): string[] {
  const fromTextExtra: string[] = [];
  const textExtra = itemStruct.textExtra;
  if (Array.isArray(textExtra)) {
    for (const entry of textExtra) {
      if (entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).hashtagName === "string") {
        const name = (entry as Record<string, unknown>).hashtagName as string;
        if (name) fromTextExtra.push(name.toLowerCase());
      }
    }
  }
  if (fromTextExtra.length > 0) return Array.from(new Set(fromTextExtra));

  const matches = caption.match(/#(\w+)/g) ?? [];
  return Array.from(new Set(matches.map((tag) => tag.slice(1).toLowerCase())));
}

const HOOK_WINDOW_SECONDS = 15;

function looksLikeSubtitleEntry(entry: unknown): entry is Record<string, unknown> {
  if (!entry || typeof entry !== "object") return false;
  const obj = entry as Record<string, unknown>;
  const url = obj.Url ?? obj.url;
  if (typeof url !== "string" || url.length === 0) return false;
  // Require a language/format/source field too, not just any Url — plenty of
  // unrelated arrays elsewhere in the item tree (covers, avatars, music) also
  // have a bare Url field, and this walk is exhaustive over the whole struct.
  return (
    typeof (obj.LanguageCodeName ?? obj.languageCodeName ?? obj.LanguageID ?? obj.languageId) === "string" ||
    typeof (obj.Format ?? obj.format) === "string" ||
    typeof (obj.Source ?? obj.source) === "string"
  );
}

/**
 * TikTok's item struct exposes auto-generated/creator-uploaded captions as an
 * array of subtitle track descriptors (WebVTT or SRT) — commonly nested a few
 * levels deep (e.g. video.claInfo.captionInfos in newer API shapes, or
 * video.subtitleInfos in older ones) rather than at a fixed, shallow path.
 * This walks the *entire* item struct exhaustively (matching findItemStruct's
 * approach elsewhere in this file) and identifies a subtitle-track array
 * structurally, by what its entries look like — never gating traversal by a
 * parent key's name, since an unbroken chain of subtitle/caption-named keys
 * isn't guaranteed. Still untested against the live site — see file-level
 * caveat above. Prefers an English track if multiple languages are present,
 * otherwise takes the first.
 */
function findSubtitleTrack(node: unknown, depth = 0): { url: string; lang: string } | null {
  if (depth > 15 || node === null || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    const candidates = node.filter(looksLikeSubtitleEntry).map((entry) => ({
      url: (entry.Url ?? entry.url) as string,
      lang:
        typeof (entry.LanguageCodeName ?? entry.languageCodeName ?? entry.LanguageID ?? entry.languageId) === "string"
          ? ((entry.LanguageCodeName ?? entry.languageCodeName ?? entry.LanguageID ?? entry.languageId) as string)
          : "",
    }));
    if (candidates.length > 0 && candidates.length === node.length) {
      return candidates.find((c) => c.lang.toLowerCase().startsWith("eng")) ?? candidates[0];
    }
    for (const child of node) {
      const found = findSubtitleTrack(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const found = findSubtitleTrack(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function parseTimeToSeconds(raw: string): number | null {
  const parts = raw.trim().replace(",", ".").split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

/** Extracts just the cue text within the hook window from a WebVTT or SRT file, stripping timestamps, indices, and inline tags. */
export function extractHookTranscript(subtitleText: string, windowSeconds = HOOK_WINDOW_SECONDS): string {
  const lines = subtitleText.split(/\r?\n/);
  const cueLines: string[] = [];
  let withinWindow = false;

  for (const line of lines) {
    const cueMatch = line.match(/^([\d:.,]+)\s*-->\s*([\d:.,]+)/);
    if (cueMatch) {
      const start = parseTimeToSeconds(cueMatch[1]);
      withinWindow = start !== null && start <= windowSeconds;
      continue;
    }
    if (!withinWindow) continue;
    const trimmed = line.trim();
    if (!trimmed || /^WEBVTT/i.test(trimmed) || /^\d+$/.test(trimmed)) continue;
    // Auto-generated captions mark inaudible/low-confidence words and
    // non-speech events with bracketed placeholders — "[?]", "[inaudible]",
    // "[Music]", "(?)" — which aren't real spoken words. Left unstripped, a
    // "[?]" placeholder for a word the model couldn't make out leaves a
    // literal "?" in the transcript, which every question-detection check
    // downstream (the real hook scorer, Creator Wrapped) would misread as
    // this video actually asking a question.
    const cleaned = trimmed
      .replace(/<[^>]+>/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\([^)]*\)/g, "")
      .trim();
    if (cleaned) cueLines.push(cleaned);
  }

  return cueLines.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Best-effort: a video with no subtitle track, or one we can't fetch/parse,
 * should never fail the whole video fetch — this always resolves, never
 * rejects.
 */
async function fetchTranscript(itemStruct: Record<string, unknown>): Promise<string | null> {
  try {
    const track = findSubtitleTrack(itemStruct);
    if (!track) return null;
    const url = isTrustedTikTokAssetUrl(track.url);
    if (!url) return null;

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const text = extractHookTranscript(await response.text());
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export function toNumber(value: unknown): number {
  const num = typeof value === "string" ? Number(value) : value;
  return typeof num === "number" && Number.isFinite(num) ? num : 0;
}

export async function fetchTikTokVideoData(rawUrl: string): Promise<TikTokVideoData> {
  const url = normalizeTikTokUrl(rawUrl);

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
    throw new TikTokFetchError("FETCH_FAILED", "Couldn't reach TikTok. Try again in a moment.");
  }

  if (response.status === 404) {
    throw new TikTokFetchError(
      "NOT_FOUND_OR_PRIVATE",
      "That video wasn't found — it may be private, deleted, or region-locked."
    );
  }
  if (!response.ok) {
    throw new TikTokFetchError("FETCH_FAILED", `TikTok returned an unexpected status (${response.status}).`);
  }

  const html = await response.text();

  const scriptMatch = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!scriptMatch) {
    throw new TikTokFetchError(
      "PARSE_FAILED",
      "Couldn't read this video's data — TikTok may have changed their page format."
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(scriptMatch[1]);
  } catch {
    throw new TikTokFetchError("PARSE_FAILED", "TikTok's video data was malformed.");
  }

  const itemStruct = findItemStruct(data);
  if (!itemStruct) {
    throw new TikTokFetchError(
      "NOT_FOUND_OR_PRIVATE",
      "That video's data wasn't in the page — it may be private, deleted, or age-restricted."
    );
  }

  const stats = itemStruct.stats as Record<string, unknown>;
  const video = itemStruct.video as Record<string, unknown>;
  const author = itemStruct.author as Record<string, unknown>;
  const caption = typeof itemStruct.desc === "string" ? itemStruct.desc : "";
  const transcript = await fetchTranscript(itemStruct);

  return {
    id: typeof itemStruct.id === "string" ? itemStruct.id : "",
    url: url.toString(),
    caption,
    hashtags: extractHashtags(itemStruct, caption),
    author: {
      handle: typeof author.uniqueId === "string" ? author.uniqueId : "unknown",
      nickname: typeof author.nickname === "string" ? author.nickname : "",
    },
    stats: {
      plays: toNumber(stats.playCount),
      likes: toNumber(stats.diggCount),
      comments: toNumber(stats.commentCount),
      shares: toNumber(stats.shareCount),
      saves: toNumber(stats.collectCount),
    },
    durationSeconds: toNumber(video.duration),
    createTimeUnix: toNumber(itemStruct.createTime),
    coverUrl:
      typeof video.cover === "string"
        ? video.cover
        : typeof video.originCover === "string"
        ? video.originCover
        : null,
    transcript,
  };
}
