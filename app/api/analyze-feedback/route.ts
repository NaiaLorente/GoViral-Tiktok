import { NextRequest, NextResponse } from "next/server";
import { generateAnalysisFeedback, IdeationError, type LLMProvider } from "@/lib/providers";
import { buildFeedbackSystemPrompt, buildFeedbackUserPrompt } from "@/lib/analyzeFeedback";
import type { TikTokVideoData } from "@/lib/tiktok";
import type { AnalysisResult } from "@/lib/analyze";

export const runtime = "nodejs";

// Ollama is deliberately excluded: it runs on the user's own machine, and
// our server can't reach their localhost — that path is called directly
// from the browser instead (see components/TailoredFeedback.tsx).
const VALID_PROVIDERS: LLMProvider[] = ["claude", "openai", "gemini", "groq"];

const ERROR_STATUS: Record<string, number> = {
  INVALID_KEY: 401,
  PROVIDER_ERROR: 502,
  INVALID_RESPONSE: 502,
  NETWORK_ERROR: 502,
};

interface AnalyzeFeedbackRequestBody {
  provider?: unknown;
  apiKey?: unknown;
  video?: TikTokVideoData;
  result?: AnalysisResult;
}

// Stateless passthrough: the API key arrives in the request body, is used
// once to call the provider, and is never logged or persisted anywhere.
export async function POST(request: NextRequest) {
  let body: AnalyzeFeedbackRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { provider, apiKey, video, result } = body;

  if (provider === "ollama") {
    return NextResponse.json(
      { error: "Ollama runs locally and must be called directly from your browser, not through this server." },
      { status: 400 }
    );
  }
  if (typeof provider !== "string" || !VALID_PROVIDERS.includes(provider as LLMProvider)) {
    return NextResponse.json({ error: "Missing or invalid 'provider'." }, { status: 400 });
  }
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "Missing API key." }, { status: 400 });
  }
  if (!video || typeof video !== "object" || !result || typeof result !== "object") {
    return NextResponse.json({ error: "Missing video/result data." }, { status: 400 });
  }

  const systemPrompt = buildFeedbackSystemPrompt();
  const userPrompt = buildFeedbackUserPrompt(video, result);

  try {
    const feedback = await generateAnalysisFeedback({ provider: provider as LLMProvider, apiKey }, systemPrompt, userPrompt);
    return NextResponse.json({ feedback });
  } catch (error) {
    if (error instanceof IdeationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: ERROR_STATUS[error.code] ?? 500 });
    }
    return NextResponse.json({ error: "Something went wrong generating feedback." }, { status: 500 });
  }
}
