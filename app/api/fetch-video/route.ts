import { NextRequest, NextResponse } from "next/server";
import { fetchTikTokVideoData, TikTokFetchError } from "@/lib/tiktok";

export const runtime = "nodejs";

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
    const data = await fetchTikTokVideoData(url);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof TikTokFetchError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: ERROR_STATUS[error.code] ?? 500 }
      );
    }
    return NextResponse.json({ error: "Something went wrong analyzing that video." }, { status: 500 });
  }
}
