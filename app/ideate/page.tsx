"use client";

import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import IdeateIllustration from "@/components/icons/IdeateIllustration";
import ProviderKeyInput from "@/components/ProviderKeyInput";
import IdeateForm, { type IdeateFormValues } from "@/components/IdeateForm";
import VideoIdeaCard from "@/components/VideoIdeaCard";
import ProfileSummary from "@/components/ProfileSummary";
import IdeaCheckPanel, { type IdeaCheckPrefill } from "@/components/IdeaCheckPanel";
import { generateVideoIdeas, DEFAULT_OLLAMA_BASE_URL, type LLMProvider, type VideoIdea } from "@/lib/providers";
import { buildSystemPrompt, buildUserPrompt, type IdeationMode } from "@/lib/ideate";
import type { CreatorProfileSummary } from "@/lib/tiktokProfile";
import type { PostingTimeSample } from "@/lib/timing";
import {
  OLLAMA_BASE_URL_STORAGE_KEY,
  OLLAMA_MODEL_STORAGE_KEY,
  PROVIDER_STORAGE_KEY,
  VALID_PROVIDERS,
  keyStorageKey,
} from "@/lib/providerStorage";

type IdeateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "result"; ideas: VideoIdea[] };

interface RequestIdeasParams {
  provider: LLMProvider;
  apiKey: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  niche: string;
  goal: string;
  mode: IdeationMode;
  creatorContext: CreatorProfileSummary | null;
  videoTranscripts?: string[];
  previousIdeas?: VideoIdea[];
  refinement?: string;
}

async function requestIdeas(params: RequestIdeasParams): Promise<VideoIdea[]> {
  const systemPrompt = buildSystemPrompt(params.mode);
  const userPrompt = buildUserPrompt({
    niche: params.niche,
    goal: params.goal,
    mode: params.mode,
    creatorContext: params.creatorContext,
    videoTranscripts: params.videoTranscripts,
    previousIdeas: params.previousIdeas,
    refinement: params.refinement,
  });

  // Ollama runs on the user's own machine — our server can't reach their
  // localhost, so this is called directly from the browser instead of
  // going through /api/ideate like every other provider.
  if (params.provider === "ollama") {
    return generateVideoIdeas(
      { provider: "ollama", baseUrl: params.ollamaBaseUrl, model: params.ollamaModel },
      systemPrompt,
      userPrompt
    );
  }

  const response = await fetch("/api/ideate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: params.provider,
      apiKey: params.apiKey,
      niche: params.niche,
      goal: params.goal,
      mode: params.mode,
      creatorContext: params.creatorContext,
      videoTranscripts: params.videoTranscripts,
      previousIdeas: params.previousIdeas,
      refinement: params.refinement,
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
  return body.ideas as VideoIdea[];
}

export default function IdeatePage() {
  const [provider, setProvider] = useState<LLMProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(DEFAULT_OLLAMA_BASE_URL);
  const [ollamaModel, setOllamaModel] = useState("");
  const [ideateState, setIdeateState] = useState<IdeateState>({ status: "idle" });
  const [profileWarning, setProfileWarning] = useState<string | null>(null);
  const [profileSummary, setProfileSummary] = useState<CreatorProfileSummary | null>(null);
  // undefined = no video links submitted this run; an array (possibly empty) once the batch fetch has run.
  const [foundTranscripts, setFoundTranscripts] = useState<string[] | undefined>(undefined);
  const [postingTimeSamples, setPostingTimeSamples] = useState<PostingTimeSample[]>([]);
  const [ideaCheckPrefill, setIdeaCheckPrefill] = useState<IdeaCheckPrefill | null>(null);
  const [refinement, setRefinement] = useState("");
  const [refining, setRefining] = useState(false);
  const [lastInput, setLastInput] = useState<{
    niche: string;
    goal: string;
    mode: IdeationMode;
    creatorContext: CreatorProfileSummary | null;
    videoTranscripts: string[];
  } | null>(null);

  useEffect(() => {
    // One-time sync from localStorage on mount — not derived from props/state.
    const storedProvider = localStorage.getItem(PROVIDER_STORAGE_KEY) as LLMProvider | null;
    const resolvedProvider = storedProvider && VALID_PROVIDERS.includes(storedProvider) ? storedProvider : "gemini";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProvider(resolvedProvider);
    setApiKey(localStorage.getItem(keyStorageKey(resolvedProvider)) ?? "");
    setOllamaBaseUrl(localStorage.getItem(OLLAMA_BASE_URL_STORAGE_KEY) ?? DEFAULT_OLLAMA_BASE_URL);
    setOllamaModel(localStorage.getItem(OLLAMA_MODEL_STORAGE_KEY) ?? "");
  }, []);

  function handleProviderChange(nextProvider: LLMProvider) {
    setProvider(nextProvider);
    localStorage.setItem(PROVIDER_STORAGE_KEY, nextProvider);
    setApiKey(localStorage.getItem(keyStorageKey(nextProvider)) ?? "");
  }

  function handleApiKeyChange(key: string) {
    setApiKey(key);
    localStorage.setItem(keyStorageKey(provider), key);
  }

  function handleOllamaBaseUrlChange(url: string) {
    setOllamaBaseUrl(url);
    localStorage.setItem(OLLAMA_BASE_URL_STORAGE_KEY, url);
  }

  function handleOllamaModelChange(model: string) {
    setOllamaModel(model);
    localStorage.setItem(OLLAMA_MODEL_STORAGE_KEY, model);
  }

  async function handleGenerate(values: IdeateFormValues) {
    if (provider === "ollama") {
      if (!ollamaModel.trim()) {
        setIdeateState({ status: "error", message: "Enter the Ollama model you've pulled locally (e.g. llama3.2) first." });
        return;
      }
    } else if (!apiKey.trim()) {
      setIdeateState({ status: "error", message: "Add your API key above first." });
      return;
    }

    setIdeateState({ status: "loading" });
    setProfileWarning(null);
    setProfileSummary(null);
    setFoundTranscripts(undefined);
    setPostingTimeSamples([]);

    let creatorContext: CreatorProfileSummary | null = null;
    let videoTranscripts: string[] = [];
    const warnings: string[] = [];

    // Video links are the primary, reliable signal — same fetch path that
    // powers "Analyze a video," which has never failed to get real data
    // this whole session, unlike profile-page scraping below.
    if (values.videoUrls.length > 0) {
      try {
        const response = await fetch("/api/fetch-videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: values.videoUrls }),
        });
        const body = await response.json();
        if (response.ok) {
          creatorContext = body.data as CreatorProfileSummary;
          if (body.failedUrls?.length > 0) {
            warnings.push(
              `${body.failedUrls.length} of ${values.videoUrls.length} video link(s) couldn't be read — continuing with the rest.`
            );
          }

          videoTranscripts = Array.isArray(body.videoTranscripts) ? (body.videoTranscripts as string[]) : [];
          setFoundTranscripts(videoTranscripts);
          setPostingTimeSamples(Array.isArray(body.postingTimeSamples) ? (body.postingTimeSamples as PostingTimeSample[]) : []);
        } else {
          warnings.push(`Couldn't read those videos (${body.error ?? "unknown error"}).`);
        }
      } catch {
        warnings.push("Couldn't read those videos.");
      }
    }

    // Profile lookup is now purely supplementary — bio/follower count only,
    // merged on top of (never overriding) real video-derived data.
    if (values.profileUrl) {
      try {
        const response = await fetch("/api/fetch-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: values.profileUrl }),
        });
        const body = await response.json();
        if (response.ok) {
          const profileData = body.data as CreatorProfileSummary;
          creatorContext = creatorContext
            ? {
                ...creatorContext,
                bio: creatorContext.bio || profileData.bio,
                followerCount: creatorContext.followerCount || profileData.followerCount,
                nickname: creatorContext.nickname || profileData.nickname,
              }
            : profileData;
        } else {
          warnings.push(`Couldn't read that profile (${body.error ?? "unknown error"}).`);
        }
      } catch {
        warnings.push("Couldn't read that profile.");
      }
    }

    if (warnings.length > 0) setProfileWarning(warnings.join(" "));
    if (creatorContext) setProfileSummary(creatorContext);

    if (!creatorContext && (!values.niche.trim() || !values.goal.trim())) {
      setIdeateState({
        status: "error",
        message:
          "Couldn't read any of what you gave us, and no niche/goal was typed — fill those in, or try different links.",
      });
      return;
    }

    try {
      const ideas = await requestIdeas({
        provider,
        apiKey,
        ollamaBaseUrl,
        ollamaModel,
        niche: values.niche,
        goal: values.goal,
        mode: values.mode,
        creatorContext,
        videoTranscripts,
      });
      setLastInput({ niche: values.niche, goal: values.goal, mode: values.mode, creatorContext, videoTranscripts });
      setIdeateState({ status: "result", ideas });
    } catch (error) {
      setIdeateState({
        status: "error",
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  function handleCheckIdea(idea: VideoIdea) {
    setIdeaCheckPrefill({ hook: idea.hook, caption: idea.caption, hashtags: idea.hashtags });
  }

  async function handleRefine() {
    if (!lastInput || ideateState.status !== "result" || !refinement.trim()) return;
    setRefining(true);
    try {
      const ideas = await requestIdeas({
        provider,
        apiKey,
        ollamaBaseUrl,
        ollamaModel,
        niche: lastInput.niche,
        goal: lastInput.goal,
        mode: lastInput.mode,
        creatorContext: lastInput.creatorContext,
        videoTranscripts: lastInput.videoTranscripts,
        previousIdeas: ideateState.ideas,
        refinement: refinement.trim(),
      });
      setIdeateState({ status: "result", ideas });
      setRefinement("");
    } catch (error) {
      setIdeateState({
        status: "error",
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setRefining(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white text-[#111]">
      <AppNav />

      <div className="flex items-center gap-5 px-8 sm:px-12 pt-16 pb-11 max-w-[1280px] mx-auto w-full flex-wrap">
        <div className="flex-1 min-w-[320px]">
          <h1 className="font-display text-[44px] sm:text-[56px] font-extrabold leading-[1.03] tracking-tight mb-2.5">
            Before you
            <br />
            post, ask.
          </h1>
          <svg width="190" height="14" viewBox="0 0 180 14" className="mb-5 block" aria-hidden>
            <path d="M2 10 Q45 -2 90 8 T178 6" stroke="var(--accent)" strokeWidth="5" fill="none" strokeLinecap="round" />
          </svg>
          <p className="text-[17px] text-[#333] max-w-[460px] leading-relaxed">
            Talk to an AI virality expert (your own API key) grounded in the same curated hook
            and hashtag data that powers the analyzer — paste a few of your real videos so ideas
            are grounded in your actual content.
          </p>
        </div>
        <div className="shrink-0">
          <IdeateIllustration />
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto w-full px-8 sm:px-12 pb-20 flex flex-col items-center gap-6">
        <ProviderKeyInput
          provider={provider}
          apiKey={apiKey}
          onProviderChange={handleProviderChange}
          onApiKeyChange={handleApiKeyChange}
          ollamaBaseUrl={ollamaBaseUrl}
          ollamaModel={ollamaModel}
          onOllamaBaseUrlChange={handleOllamaBaseUrlChange}
          onOllamaModelChange={handleOllamaModelChange}
          badgeLabel="BYOK"
          description="Five providers — Gemini & Groq have free tiers, Ollama runs locally for free."
        />

        <IdeateForm onSubmit={handleGenerate} isLoading={ideateState.status === "loading"} />

        {profileWarning && (
          <div className="w-full max-w-xl rounded-xl border-2 border-[#111] px-4 py-3 text-[#111] text-sm" style={{ background: "color-mix(in srgb, #ffb800 12%, white)" }}>
            {profileWarning}
          </div>
        )}

        {profileSummary && <ProfileSummary summary={profileSummary} videoTranscripts={foundTranscripts} />}

        {ideateState.status === "error" && (
          <div className="w-full max-w-xl rounded-xl border-2 border-[#111] px-4 py-3 text-[#111] text-sm" style={{ background: "color-mix(in srgb, var(--accent) 8%, white)" }}>
            {ideateState.message}
          </div>
        )}

        {ideateState.status === "result" && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {ideateState.ideas.map((idea, i) => (
                <VideoIdeaCard key={i} idea={idea} index={i} onCheck={handleCheckIdea} />
              ))}
            </div>

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <input
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                placeholder='Refine: "make these more contrarian", "focus on TikTok Shop"...'
                className="flex-1 rounded-xl border-2 border-[#111] px-4 py-2.5 text-[#111] placeholder:text-[#aaa] outline-none bg-white"
              />
              <button
                onClick={handleRefine}
                disabled={!refinement.trim() || refining}
                className="rounded-xl border-2 border-[#111] px-5 py-2.5 font-display font-bold text-[14px] text-[#111] hover:bg-[#f2f2f2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {refining ? "Refining…" : "Refine"}
              </button>
            </div>
          </div>
        )}

        <IdeaCheckPanel postingTimeSamples={postingTimeSamples} prefill={ideaCheckPrefill} />

        <footer className="mt-6 pt-6 border-t-2 border-[#111] text-center text-[12.5px] text-[#999] max-w-lg">
          Hosted providers: your API key is sent directly through our server, once per request,
          and is never logged or stored. Ollama: everything stays on your machine. Inference cost
          is billed to your own key (or free, for Ollama), not to us.
        </footer>
      </div>
    </div>
  );
}
