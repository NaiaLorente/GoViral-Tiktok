import { NextRequest, NextResponse } from "next/server";
import { aggregateTikTokVideos, MAX_VIDEO_URLS } from "@/lib/tiktokVideoBatch";
import { TikTokFetchError } from "@/lib/tiktok";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const urls = (body as { urls?: unknown })?.urls;
  if (!Array.isArray(urls) || urls.length === 0 || !urls.every((u) => typeof u === "string")) {
    return NextResponse.json({ error: "Provide at least one video URL." }, { status: 400 });
  }
  if (urls.length > MAX_VIDEO_URLS) {
    return NextResponse.json({ error: `Provide at most ${MAX_VIDEO_URLS} video URLs.` }, { status: 400 });
  }

  try {
    const result = await aggregateTikTokVideos(urls as string[]);
    return NextResponse.json({
      data: result.summary,
      succeededCount: result.succeededCount,
      failedUrls: result.failedUrls,
      videoTranscripts: result.videoTranscripts,
      postingTimeSamples: result.postingTimeSamples,
      videos: result.videos,
    });
  } catch (error) {
    if (error instanceof TikTokFetchError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
    }
    return NextResponse.json({ error: "Something went wrong reading those videos." }, { status: 500 });
  }
}
