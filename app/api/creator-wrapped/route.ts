import { NextRequest, NextResponse } from "next/server";
import { generateCreatorWrappedNarrative, IdeationError, type LLMProvider } from "@/lib/providers";
import { buildWrappedSystemPrompt, buildWrappedUserPrompt } from "@/lib/creatorWrappedPrompt";
import type { WrappedStats } from "@/lib/creatorWrapped";

export const runtime = "nodejs";

// Ollama is deliberately excluded: it runs on the user's own machine, and
// our server can't reach their localhost — that path is called directly
// from the browser instead (see components/CreatorWrapped.tsx).
const VALID_PROVIDERS: LLMProvider[] = ["claude", "openai", "gemini", "groq"];

const ERROR_STATUS: Record<string, number> = {
  INVALID_KEY: 401,
  PROVIDER_ERROR: 502,
  INVALID_RESPONSE: 502,
  NETWORK_ERROR: 502,
};

interface CreatorWrappedRequestBody {
  provider?: unknown;
  apiKey?: unknown;
  stats?: WrappedStats;
}

// Stateless passthrough: the API key arrives in the request body, is used
// once to call the provider, and is never logged or persisted anywhere.
export async function POST(request: NextRequest) {
  let body: CreatorWrappedRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { provider, apiKey, stats } = body;

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
  if (!stats || typeof stats !== "object") {
    return NextResponse.json({ error: "Missing stats data." }, { status: 400 });
  }

  const systemPrompt = buildWrappedSystemPrompt();
  const userPrompt = buildWrappedUserPrompt(stats);

  try {
    const narrative = await generateCreatorWrappedNarrative({ provider: provider as LLMProvider, apiKey }, systemPrompt, userPrompt);
    return NextResponse.json({ narrative });
  } catch (error) {
    if (error instanceof IdeationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: ERROR_STATUS[error.code] ?? 500 });
    }
    return NextResponse.json({ error: "Something went wrong generating your Wrapped." }, { status: 500 });
  }
}
