import { NextRequest, NextResponse } from "next/server";
import { generateVideoIdeas, IdeationError, type LLMProvider, type VideoIdea } from "@/lib/providers";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ideate";
import type { CreatorProfileSummary } from "@/lib/tiktokProfile";

export const runtime = "nodejs";

// Ollama is deliberately excluded: it runs on the user's own machine, and
// our server can't reach their localhost — that path is called directly
// from the browser instead (see app/ideate/page.tsx).
const VALID_PROVIDERS: LLMProvider[] = ["claude", "openai", "gemini", "groq"];

const ERROR_STATUS: Record<string, number> = {
  INVALID_KEY: 401,
  PROVIDER_ERROR: 502,
  INVALID_RESPONSE: 502,
  NETWORK_ERROR: 502,
};

interface IdeateRequestBody {
  provider?: unknown;
  apiKey?: unknown;
  niche?: unknown;
  goal?: unknown;
  mode?: unknown;
  creatorContext?: CreatorProfileSummary | null;
  videoTranscripts?: unknown;
  previousIdeas?: VideoIdea[];
  refinement?: unknown;
}

// Stateless passthrough: the API key arrives in the request body, is used
// once to call the provider, and is never logged or persisted anywhere.
export async function POST(request: NextRequest) {
  let body: IdeateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { provider, apiKey, niche, goal, mode, creatorContext, videoTranscripts, previousIdeas, refinement } = body;

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

  const nicheStr = typeof niche === "string" ? niche : "";
  const goalStr = typeof goal === "string" ? goal : "";
  const hasCreatorContext = creatorContext !== null && creatorContext !== undefined;

  // Niche/goal are only required when there's no profile data to fall back on.
  if (!hasCreatorContext && (nicheStr.trim().length === 0 || goalStr.trim().length === 0)) {
    return NextResponse.json(
      { error: "Tell us what you promote and your goal, or add a profile link." },
      { status: 400 }
    );
  }

  const ideationMode = mode === "similar" ? "similar" : "different";
  const systemPrompt = buildSystemPrompt(ideationMode);
  const userPrompt = buildUserPrompt({
    niche: nicheStr,
    goal: goalStr,
    mode: ideationMode,
    creatorContext: creatorContext ?? null,
    videoTranscripts:
      Array.isArray(videoTranscripts) && videoTranscripts.every((t) => typeof t === "string")
        ? (videoTranscripts as string[])
        : undefined,
    previousIdeas: Array.isArray(previousIdeas) ? previousIdeas : undefined,
    refinement: typeof refinement === "string" ? refinement : undefined,
  });

  try {
    const ideas = await generateVideoIdeas(
      { provider: provider as LLMProvider, apiKey },
      systemPrompt,
      userPrompt
    );
    return NextResponse.json({ ideas });
  } catch (error) {
    if (error instanceof IdeationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: ERROR_STATUS[error.code] ?? 500 });
    }
    return NextResponse.json({ error: "Something went wrong generating ideas." }, { status: 500 });
  }
}
