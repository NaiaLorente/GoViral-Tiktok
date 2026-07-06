import { NextRequest, NextResponse } from "next/server";
import { fetchTikTokProfileSummary, TikTokProfileFetchError } from "@/lib/tiktokProfile";

export const runtime = "nodejs";
// Matches Vercel Hobby's hard 10s cap (can't be raised there regardless of
// this value). If you're on Pro+, raising this gives the headless-browser
// path in lib/tiktokProfileBrowser.ts more breathing room — but its own
// internal deadline (HARD_DEADLINE_MS) needs raising too for that to help.
export const maxDuration = 10;

const ERROR_STATUS: Record<string, number> = {
  INVALID_URL: 400,
  NOT_FOUND_OR_PRIVATE: 404,
  FETCH_FAILED: 502,
  PARSE_FAILED: 422,
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = (body as { url?: unknown })?.url;
  if (typeof url !== "string" || url.trim().length === 0) {
    return NextResponse.json({ error: "Missing 'url' field." }, { status: 400 });
  }

  try {
    const data = await fetchTikTokProfileSummary(url);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof TikTokProfileFetchError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: ERROR_STATUS[error.code] ?? 500 });
    }
    return NextResponse.json({ error: "Something went wrong reading that profile." }, { status: 500 });
  }
}
