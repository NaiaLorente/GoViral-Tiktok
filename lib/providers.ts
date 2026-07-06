export type LLMProvider = "claude" | "openai" | "gemini" | "groq" | "ollama";

export interface VideoIdea {
  hook: string;
  caption: string;
  hashtags: string[];
  rationale: string;
}

export interface VideoFeedbackPoint {
  title: string;
  detail: string;
}

export interface HashtagSuggestion {
  tag: string;
  reason: string;
}

export interface VideoFeedback {
  whatsWorking: VideoFeedbackPoint[];
  whatToImprove: VideoFeedbackPoint[];
  /** Hashtags inferred from what this specific video is actually about, not already in its hashtag list. */
  suggestedHashtags: HashtagSuggestion[];
  /** A rewritten/alternate caption to test — always populated, even if the current caption is already strong. */
  captionSuggestion: string;
}

export interface CreatorWrappedNarrative {
  personalityLabel: string;
  tagline: string;
  hookSlideCaption: string;
  formatSlideCaption: string;
  hashtagSlideCaption: string;
  collabSlideCaption: string;
  postingSlideCaption: string;
  reachSlideCaption: string;
  totalsSlideCaption: string;
  engagementSlideCaption: string;
}

export interface ProviderCredentials {
  provider: LLMProvider;
  /** claude / openai / gemini / groq */
  apiKey?: string;
  /** ollama only */
  baseUrl?: string;
  /** ollama only — the locally-installed model name, e.g. "llama3.2" */
  model?: string;
}

export type IdeationErrorCode = "INVALID_KEY" | "PROVIDER_ERROR" | "INVALID_RESPONSE" | "NETWORK_ERROR";

export class IdeationError extends Error {
  code: IdeationErrorCode;
  constructor(code: IdeationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "IdeationError";
  }
}

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

/** Model IDs for the hosted providers live here so lineup changes only require touching one spot. */
const MODELS: Record<Exclude<LLMProvider, "ollama">, string> = {
  claude: "claude-haiku-4-5-20251001",
  openai: "gpt-5-mini",
  gemini: "gemini-2.5-flash",
  // gpt-oss-20b and gpt-oss-120b both produced "Failed to validate JSON"
  // errors repeatedly — including in plain json_object mode, not just
  // strict json_schema — and Groq's own community forum has reports of
  // gpt-oss-120b specifically ignoring/mishandling structured outputs. Not
  // worth chasing further: llama-3.3-70b-versatile is Groq's long-standing,
  // broadly reliable general model and has no such reports.
  groq: "llama-3.3-70b-versatile",
};

/** Describes one structured-output request: the schema itself plus the bits each provider's API needs to reference it. */
interface StructuredRequest {
  schema: object;
  /** Claude tool name / OpenAI-compatible json_schema name — must be a valid identifier. */
  schemaName: string;
  /** Claude tool description. */
  toolDescription: string;
  /** Appended to the system prompt for providers using loose json_object mode instead of a strict schema. */
  shapeDescription: string;
}

const IDEA_ITEM_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string", description: "The exact words to say or show in the first 1-2 seconds." },
    caption: { type: "string", description: "The on-video caption text, including hashtags inline if natural." },
    hashtags: { type: "array", items: { type: "string" }, description: "3-6 hashtags, no # prefix, lowercase." },
    rationale: {
      type: "string",
      description:
        "One sentence naming the SPECIFIC mechanism this idea uses (which hook pattern, what makes this particular angle distinct from the reference material given) — never a generic compliance statement like 'matches the creator's tone/style', which says nothing concrete.",
    },
  },
  required: ["hook", "caption", "hashtags", "rationale"],
  additionalProperties: false,
};

const IDEAS_SCHEMA = {
  type: "object",
  properties: {
    ideas: { type: "array", items: IDEA_ITEM_SCHEMA },
  },
  required: ["ideas"],
  additionalProperties: false,
};

const IDEAS_SHAPE_DESCRIPTION =
  'Respond with a single JSON object of exactly this shape, nothing else: ' +
  '{"ideas": [{"hook": string, "caption": string, "hashtags": string[], "rationale": string}, ...]}. ' +
  "No markdown code fences, no prose outside the JSON.";

const IDEAS_REQUEST: StructuredRequest = {
  schema: IDEAS_SCHEMA,
  schemaName: "submit_video_ideas",
  toolDescription: "Submit the generated TikTok video ideas.",
  shapeDescription: IDEAS_SHAPE_DESCRIPTION,
};

const FEEDBACK_POINT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "A short (3-6 word) label for this specific observation." },
    detail: {
      type: "string",
      description:
        "1-2 sentences explaining it, referencing this video's actual numbers, hook/caption wording, or hashtags — never generic advice that could apply to any video.",
    },
  },
  required: ["title", "detail"],
  additionalProperties: false,
};

const HASHTAG_SUGGESTION_SCHEMA = {
  type: "object",
  properties: {
    tag: { type: "string", description: "A hashtag, no # prefix, lowercase, not already used on this video." },
    reason: { type: "string", description: "One short sentence on why this tag fits what this specific video is about." },
  },
  required: ["tag", "reason"],
  additionalProperties: false,
};

const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    whatsWorking: {
      type: "array",
      items: FEEDBACK_POINT_SCHEMA,
      description: "2-4 specific things this exact video is doing well, grounded in the real data given.",
    },
    whatToImprove: {
      type: "array",
      items: FEEDBACK_POINT_SCHEMA,
      description: "2-4 specific, actionable improvements for this exact video, grounded in the real data given.",
    },
    suggestedHashtags: {
      type: "array",
      items: HASHTAG_SUGGESTION_SCHEMA,
      description:
        "3-5 hashtags inferred from what THIS video is actually about (its real topic/content, from the caption and spoken hook) that it isn't already using — not generic filler, not tags already in its hashtag list.",
    },
    captionSuggestion: {
      type: "string",
      description:
        "One rewritten/alternate caption for this exact video to test, informed by the real hook/topic — always provide one, even if the current caption is already decent, as an A/B alternative.",
    },
  },
  required: ["whatsWorking", "whatToImprove", "suggestedHashtags", "captionSuggestion"],
  additionalProperties: false,
};

const FEEDBACK_SHAPE_DESCRIPTION =
  'Respond with a single JSON object of exactly this shape, nothing else: ' +
  '{"whatsWorking": [{"title": string, "detail": string}, ...], "whatToImprove": [{"title": string, "detail": string}, ...], ' +
  '"suggestedHashtags": [{"tag": string, "reason": string}, ...], "captionSuggestion": string}. ' +
  "No markdown code fences, no prose outside the JSON.";

const FEEDBACK_REQUEST: StructuredRequest = {
  schema: FEEDBACK_SCHEMA,
  schemaName: "submit_video_feedback",
  toolDescription: "Submit tailored feedback on this specific TikTok video.",
  shapeDescription: FEEDBACK_SHAPE_DESCRIPTION,
};

const WRAPPED_SCHEMA = {
  type: "object",
  properties: {
    personalityLabel: {
      type: "string",
      description:
        "A short (2-5 word), fun, Spotify-Wrapped-style personality label for this creator, based on their real dominant posting pattern given below (e.g. 'The Curiosity Loop', 'The Hot Take Machine').",
    },
    tagline: {
      type: "string",
      description: "One punchy sentence, like a Spotify Wrapped tagline, capturing their real posting personality.",
    },
    hookSlideCaption: {
      type: "string",
      description: "One fun, specific sentence reacting to their real hook-pattern usage stats given below.",
    },
    formatSlideCaption: {
      type: "string",
      description: "One fun, specific sentence reacting to their real average video length/format style given below.",
    },
    hashtagSlideCaption: {
      type: "string",
      description: "One fun, specific sentence reacting to their real hashtag mix stats given below.",
    },
    collabSlideCaption: {
      type: "string",
      description:
        "One fun, specific sentence reacting to their real collab/shoutout stats given below — if they have no real collabs, react to that honestly instead of inventing one.",
    },
    postingSlideCaption: {
      type: "string",
      description: "One fun, specific sentence reacting to their real posting rhythm (timing window and/or posting frequency) given below.",
    },
    reachSlideCaption: {
      type: "string",
      description: "One fun, specific sentence reacting to their real reach-tier spread and save rate given below.",
    },
    totalsSlideCaption: {
      type: "string",
      description: "One fun, specific sentence reacting to their real total likes/comments/saves given below.",
    },
    engagementSlideCaption: {
      type: "string",
      description: "One fun, specific sentence reacting to their real engagement rate and best video given below.",
    },
  },
  required: [
    "personalityLabel",
    "tagline",
    "hookSlideCaption",
    "formatSlideCaption",
    "hashtagSlideCaption",
    "collabSlideCaption",
    "postingSlideCaption",
    "reachSlideCaption",
    "totalsSlideCaption",
    "engagementSlideCaption",
  ],
  additionalProperties: false,
};

const WRAPPED_SHAPE_DESCRIPTION =
  'Respond with a single JSON object of exactly this shape, nothing else: ' +
  '{"personalityLabel": string, "tagline": string, "hookSlideCaption": string, "formatSlideCaption": string, ' +
  '"hashtagSlideCaption": string, "collabSlideCaption": string, "postingSlideCaption": string, "reachSlideCaption": string, ' +
  '"totalsSlideCaption": string, "engagementSlideCaption": string}. ' +
  "No markdown code fences, no prose outside the JSON.";

const WRAPPED_REQUEST: StructuredRequest = {
  schema: WRAPPED_SCHEMA,
  schemaName: "submit_creator_wrapped",
  toolDescription: "Submit the creator's Wrapped-style personality narrative.",
  shapeDescription: WRAPPED_SHAPE_DESCRIPTION,
};

/**
 * Gemini's responseSchema only supports a subset of OpenAPI/JSON Schema and
 * has historically rejected unrecognized keywords like `additionalProperties`
 * — strip it recursively rather than risk a 400 on an otherwise-valid schema.
 */
function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (schema !== null && typeof schema === "object") {
    const entries = Object.entries(schema as Record<string, unknown>).filter(
      ([key]) => key !== "additionalProperties"
    );
    return Object.fromEntries(entries.map(([key, value]) => [key, toGeminiSchema(value)]));
  }
  return schema;
}

// Models occasionally repeat a hashtag within the same idea (e.g. "#papa"
// twice) — dedupe here so it's fixed at the source rather than papered over
// wherever hashtags happen to get rendered.
function dedupeHashtags(hashtags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of hashtags) {
    const cleaned = raw.trim().replace(/^#/, "").toLowerCase();
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      result.push(cleaned);
    }
  }
  return result;
}

function validateIdeas(parsed: unknown): VideoIdea[] {
  const ideas = (parsed as { ideas?: unknown })?.ideas;
  if (!Array.isArray(ideas)) {
    throw new IdeationError("INVALID_RESPONSE", "The AI's response wasn't in the expected format. Try again.");
  }
  const valid = ideas
    .filter(
      (idea): idea is VideoIdea =>
        typeof idea === "object" &&
        idea !== null &&
        typeof (idea as VideoIdea).hook === "string" &&
        typeof (idea as VideoIdea).caption === "string" &&
        typeof (idea as VideoIdea).rationale === "string" &&
        Array.isArray((idea as VideoIdea).hashtags) &&
        (idea as VideoIdea).hashtags.every((tag) => typeof tag === "string")
    )
    .map((idea) => ({ ...idea, hashtags: dedupeHashtags(idea.hashtags) }));
  if (valid.length === 0) {
    throw new IdeationError("INVALID_RESPONSE", "The AI didn't return any usable ideas. Try again.");
  }
  return valid;
}

function validateFeedbackPoints(value: unknown): VideoFeedbackPoint[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (point): point is VideoFeedbackPoint =>
      typeof point === "object" &&
      point !== null &&
      typeof (point as VideoFeedbackPoint).title === "string" &&
      typeof (point as VideoFeedbackPoint).detail === "string"
  );
}

function validateHashtagSuggestions(value: unknown): HashtagSuggestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is HashtagSuggestion =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as HashtagSuggestion).tag === "string" &&
        typeof (item as HashtagSuggestion).reason === "string"
    )
    .map((item) => ({ ...item, tag: item.tag.trim().replace(/^#/, "").toLowerCase() }))
    .filter((item) => item.tag.length > 0);
}

function validateFeedback(parsed: unknown): VideoFeedback {
  const obj = parsed as
    | { whatsWorking?: unknown; whatToImprove?: unknown; suggestedHashtags?: unknown; captionSuggestion?: unknown }
    | undefined;
  const whatsWorking = validateFeedbackPoints(obj?.whatsWorking);
  const whatToImprove = validateFeedbackPoints(obj?.whatToImprove);
  const suggestedHashtags = validateHashtagSuggestions(obj?.suggestedHashtags);
  const captionSuggestion = typeof obj?.captionSuggestion === "string" ? obj.captionSuggestion.trim() : "";
  if (whatsWorking.length === 0 && whatToImprove.length === 0) {
    throw new IdeationError("INVALID_RESPONSE", "The AI didn't return any usable feedback. Try again.");
  }
  return { whatsWorking, whatToImprove, suggestedHashtags, captionSuggestion };
}

function validateWrappedNarrative(parsed: unknown): CreatorWrappedNarrative {
  const obj = parsed as Partial<CreatorWrappedNarrative> | undefined;
  const fields: (keyof CreatorWrappedNarrative)[] = [
    "personalityLabel",
    "tagline",
    "hookSlideCaption",
    "formatSlideCaption",
    "hashtagSlideCaption",
    "collabSlideCaption",
    "postingSlideCaption",
    "reachSlideCaption",
    "totalsSlideCaption",
    "engagementSlideCaption",
  ];
  const missing = fields.filter((field) => typeof obj?.[field] !== "string" || obj[field]!.trim().length === 0);
  if (missing.length > 0) {
    throw new IdeationError("INVALID_RESPONSE", "The AI's response wasn't in the expected format. Try again.");
  }
  return {
    personalityLabel: obj!.personalityLabel!.trim(),
    tagline: obj!.tagline!.trim(),
    hookSlideCaption: obj!.hookSlideCaption!.trim(),
    formatSlideCaption: obj!.formatSlideCaption!.trim(),
    hashtagSlideCaption: obj!.hashtagSlideCaption!.trim(),
    collabSlideCaption: obj!.collabSlideCaption!.trim(),
    postingSlideCaption: obj!.postingSlideCaption!.trim(),
    reachSlideCaption: obj!.reachSlideCaption!.trim(),
    totalsSlideCaption: obj!.totalsSlideCaption!.trim(),
    engagementSlideCaption: obj!.engagementSlideCaption!.trim(),
  };
}

// Always surface *something* useful — a bare "HTTP 400" with the real
// reason swallowed is nearly impossible to debug from the UI alone.
async function parseErrorBody(response: Response): Promise<string> {
  const status = `HTTP ${response.status}`;
  let text: string;
  try {
    text = await response.text();
  } catch {
    return status;
  }
  if (!text) return status;

  try {
    const body = JSON.parse(text);
    const message = body?.error?.message ?? body?.message;
    // Groq (and possibly others) point to a sibling `failed_generation` field
    // holding the actual malformed output the model produced on a schema
    // validation failure — the single most useful piece of information for
    // debugging one of these, and easy to silently miss otherwise.
    const failedGeneration = body?.error?.failed_generation ?? body?.failed_generation;
    const failedGenerationSuffix =
      typeof failedGeneration === "string" && failedGeneration
        ? ` | Model generated: ${failedGeneration.slice(0, 500)}`
        : "";
    if (typeof message === "string" && message) return `${status}: ${message}${failedGenerationSuffix}`;
  } catch {
    // Not JSON — fall through and surface the raw text instead.
  }
  return text.length > 300 ? `${status}: ${text.slice(0, 300)}…` : `${status}: ${text}`;
}

async function callClaudeRaw(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  request: StructuredRequest
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELS.claude,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: [
          {
            name: request.schemaName,
            description: request.toolDescription,
            input_schema: request.schema,
          },
        ],
        tool_choice: { type: "tool", name: request.schemaName },
      }),
    });
  } catch {
    throw new IdeationError("NETWORK_ERROR", "Couldn't reach Claude's API. Try again in a moment.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new IdeationError("INVALID_KEY", "That Claude API key was rejected — check it's correct and active.");
  }
  if (!response.ok) {
    throw new IdeationError("PROVIDER_ERROR", `Claude API error: ${await parseErrorBody(response)}`);
  }

  const body = await response.json();
  const toolUse = (body?.content as Array<Record<string, unknown>> | undefined)?.find(
    (block) => block.type === "tool_use"
  );
  return toolUse?.input;
}

async function postChatCompletion(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  label: string
): Promise<Response> {
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new IdeationError("NETWORK_ERROR", `Couldn't reach ${label}'s API. Try again in a moment.`);
  }
}

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return fenced ? fenced[1] : text;
}

async function requestJsonObjectMode(
  url: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  label: string,
  shapeDescription: string
): Promise<Response> {
  return postChatCompletion(
    url,
    apiKey,
    {
      model,
      messages: [
        { role: "system", content: `${systemPrompt}\n\n${shapeDescription}` },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    },
    label
  );
}

/**
 * Shared by OpenAI and Groq, both of which expose an OpenAI-compatible chat
 * completions endpoint. `useStrictSchema` controls whether to attempt
 * strict json_schema mode first — Groq's server-side schema validation
 * proved unreliable in practice (repeated "Failed to validate JSON" 400s
 * even after switching models and adding a retry, on a schema no more
 * complex than OpenAI's own docs use as an example), so Groq skips it
 * entirely rather than risk that failure path at all.
 */
async function callOpenAICompatibleRaw(params: {
  url: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  label: string;
  useStrictSchema: boolean;
  request: StructuredRequest;
}): Promise<unknown> {
  const { url, apiKey, model, systemPrompt, userPrompt, label, useStrictSchema, request } = params;

  let response: Response;
  if (useStrictSchema) {
    response = await postChatCompletion(
      url,
      apiKey,
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: request.schemaName, schema: request.schema, strict: true },
        },
      },
      label
    );
    // A 400 here usually means the model's generation failed strict schema
    // validation server-side (not that our request was malformed) — worth
    // one retry in looser json_object mode rather than failing the whole
    // request over a single bad generation.
    if (response.status === 400) {
      response = await requestJsonObjectMode(url, apiKey, model, systemPrompt, userPrompt, label, request.shapeDescription);
    }
  } else {
    response = await requestJsonObjectMode(url, apiKey, model, systemPrompt, userPrompt, label, request.shapeDescription);
  }

  if (response.status === 401 || response.status === 403) {
    throw new IdeationError("INVALID_KEY", `That ${label} API key was rejected — check it's correct and active.`);
  }
  if (!response.ok) {
    throw new IdeationError("PROVIDER_ERROR", `${label} API error: ${await parseErrorBody(response)}`);
  }

  const body = await response.json();
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new IdeationError("INVALID_RESPONSE", `${label} returned an unexpected response shape.`);
  }
  try {
    return JSON.parse(stripMarkdownFences(content));
  } catch {
    throw new IdeationError("INVALID_RESPONSE", `Couldn't parse ${label}'s response as JSON.`);
  }
}

async function callGeminiRaw(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  request: StructuredRequest
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: toGeminiSchema(request.schema),
          },
        }),
      }
    );
  } catch {
    throw new IdeationError("NETWORK_ERROR", "Couldn't reach Gemini's API. Try again in a moment.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new IdeationError("INVALID_KEY", "That Gemini API key was rejected — check it's correct and active.");
  }
  if (!response.ok) {
    throw new IdeationError("PROVIDER_ERROR", `Gemini API error: ${await parseErrorBody(response)}`);
  }

  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new IdeationError("INVALID_RESPONSE", "Gemini returned an unexpected response shape.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new IdeationError("INVALID_RESPONSE", "Couldn't parse Gemini's response as JSON.");
  }
}

/**
 * Ollama runs locally on the user's own machine — there's no key to protect,
 * and (critically) our server can't reach the user's localhost anyway, so
 * this must always be called directly from the browser, never proxied.
 * Uses Ollama's native /api/chat + `format` (a raw JSON schema) rather than
 * its OpenAI-compat shim, since that's the better-documented path.
 */
async function callOllamaRaw(
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  request: StructuredRequest
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        format: request.schema,
      }),
    });
  } catch {
    throw new IdeationError(
      "NETWORK_ERROR",
      `Couldn't reach Ollama at ${baseUrl}. Make sure Ollama is running, and if this fails from a hosted site, start it with OLLAMA_ORIGINS set to allow this site's origin.`
    );
  }

  if (response.status === 404) {
    throw new IdeationError("PROVIDER_ERROR", `Ollama couldn't find the model "${model}" — try \`ollama pull ${model}\` first.`);
  }
  if (!response.ok) {
    throw new IdeationError("PROVIDER_ERROR", `Ollama error: ${await parseErrorBody(response)}`);
  }

  const body = await response.json();
  const content = body?.message?.content;
  if (typeof content !== "string") {
    throw new IdeationError("INVALID_RESPONSE", "Ollama returned an unexpected response shape.");
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new IdeationError(
      "INVALID_RESPONSE",
      "Couldn't parse Ollama's response as JSON — smaller local models are less reliable at structured output than hosted ones. Try a larger model."
    );
  }
}

async function callProviderRaw(
  credentials: ProviderCredentials,
  systemPrompt: string,
  userPrompt: string,
  request: StructuredRequest
): Promise<unknown> {
  if (credentials.provider === "ollama") {
    const baseUrl = (credentials.baseUrl || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "");
    const model = credentials.model?.trim();
    if (!model) {
      throw new IdeationError("INVALID_KEY", "Enter the name of a model you've pulled in Ollama (e.g. llama3.2).");
    }
    return callOllamaRaw(baseUrl, model, systemPrompt, userPrompt, request);
  }

  const apiKey = credentials.apiKey?.trim();
  if (!apiKey) {
    throw new IdeationError("INVALID_KEY", "No API key provided.");
  }

  switch (credentials.provider) {
    case "claude":
      return callClaudeRaw(apiKey, systemPrompt, userPrompt, request);
    case "openai":
      return callOpenAICompatibleRaw({
        url: "https://api.openai.com/v1/chat/completions",
        apiKey,
        model: MODELS.openai,
        systemPrompt,
        userPrompt,
        label: "OpenAI",
        useStrictSchema: true,
        request,
      });
    case "groq":
      return callOpenAICompatibleRaw({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey,
        model: MODELS.groq,
        systemPrompt,
        userPrompt,
        label: "Groq",
        useStrictSchema: false,
        request,
      });
    case "gemini":
      return callGeminiRaw(apiKey, systemPrompt, userPrompt, request);
  }
}

export async function generateVideoIdeas(
  credentials: ProviderCredentials,
  systemPrompt: string,
  userPrompt: string
): Promise<VideoIdea[]> {
  const raw = await callProviderRaw(credentials, systemPrompt, userPrompt, IDEAS_REQUEST);
  return validateIdeas(raw);
}

/**
 * Same BYOK provider mechanics as generateVideoIdeas, but for tailored
 * "what's working / what to improve" feedback on one already-analyzed
 * video, grounded in its real caption/hook/hashtags/stats (see
 * lib/analyzeFeedback.ts for the prompts).
 */
export async function generateAnalysisFeedback(
  credentials: ProviderCredentials,
  systemPrompt: string,
  userPrompt: string
): Promise<VideoFeedback> {
  const raw = await callProviderRaw(credentials, systemPrompt, userPrompt, FEEDBACK_REQUEST);
  return validateFeedback(raw);
}

/**
 * Same BYOK provider mechanics again, this time for the Creator Wrapped
 * personality narrative — the model only writes the label/tagline/captions;
 * every number it reacts to was already computed locally and deterministically
 * (see lib/creatorWrapped.ts), never invented by the model itself.
 */
export async function generateCreatorWrappedNarrative(
  credentials: ProviderCredentials,
  systemPrompt: string,
  userPrompt: string
): Promise<CreatorWrappedNarrative> {
  const raw = await callProviderRaw(credentials, systemPrompt, userPrompt, WRAPPED_REQUEST);
  return validateWrappedNarrative(raw);
}
