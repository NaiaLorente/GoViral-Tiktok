"use client";

import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import UrlInput from "@/components/UrlInput";
import ProviderKeyInput from "@/components/ProviderKeyInput";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import TailoredFeedback from "@/components/TailoredFeedback";
import ShareCard from "@/components/ShareCard";
import CompareSummary from "@/components/CompareSummary";
import CompareCard from "@/components/CompareCard";
import BoostPanel from "@/components/BoostPanel";
import PhoneIllustration from "@/components/icons/PhoneIllustration";
import { analyzeVideo, compareResults, type AnalysisResult } from "@/lib/analyze";
import { getBoostActions } from "@/lib/boost";
import type { TikTokVideoData } from "@/lib/tiktok";
import { DEFAULT_OLLAMA_BASE_URL, type LLMProvider } from "@/lib/providers";
import {
  OLLAMA_BASE_URL_STORAGE_KEY,
  OLLAMA_MODEL_STORAGE_KEY,
  PROVIDER_STORAGE_KEY,
  VALID_PROVIDERS,
  keyStorageKey,
} from "@/lib/providerStorage";

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "result"; result: AnalysisResult; video: TikTokVideoData };

async function fetchAndAnalyze(url: string): Promise<{ result: AnalysisResult; video: TikTokVideoData }> {
  const response = await fetch("/api/fetch-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Something went wrong.");
  }
  const video = body.data as TikTokVideoData;
  return { result: analyzeVideo(video), video };
}

export default function AnalyzePage() {
  const [state, setState] = useState<ViewState>({ status: "idle" });
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareState, setCompareState] = useState<ViewState>({ status: "idle" });

  // Shared with the Ideate page (same localStorage keys) so an API key
  // entered on one page is already there on the other.
  const [provider, setProvider] = useState<LLMProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(DEFAULT_OLLAMA_BASE_URL);
  const [ollamaModel, setOllamaModel] = useState("");

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

  async function handleSubmit(url: string) {
    setState({ status: "loading" });
    try {
      const { result, video } = await fetchAndAnalyze(url);
      setState({ status: "result", result, video });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  async function handleCompareSubmit(url: string) {
    setCompareState({ status: "loading" });
    try {
      const { result, video } = await fetchAndAnalyze(url);
      setCompareState({ status: "result", result, video });
    } catch (error) {
      setCompareState({
        status: "error",
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  const comparison =
    state.status === "result" && compareState.status === "result"
      ? compareResults(state.result, compareState.result)
      : null;

  return (
    <div className="flex-1 flex flex-col bg-white text-[#111]">
      <AppNav />

      <div className="flex items-center gap-5 px-8 sm:px-12 pt-16 pb-11 max-w-[1280px] mx-auto w-full flex-wrap">
        <div className="flex-1 min-w-[320px]">
          <h1 className="font-display text-[44px] sm:text-[56px] font-extrabold leading-[1.03] tracking-tight mb-2.5">
            Post smarter.
            <br />
            Not more.
          </h1>
          <svg width="190" height="14" viewBox="0 0 180 14" className="mb-5 block" aria-hidden>
            <path d="M2 10 Q45 -2 90 8 T178 6" stroke="var(--accent2)" strokeWidth="5" fill="none" strokeLinecap="round" />
          </svg>
          <p className="text-[17px] text-[#333] max-w-[440px] leading-relaxed mb-7">
            Paste any public TikTok video and get a real, data-driven breakdown of why the hook,
            hashtags and engagement are working — or not. Built for side-hustle and affiliate
            creators who live and die by the first 3 seconds.
          </p>
          <UrlInput onSubmit={handleSubmit} isLoading={state.status === "loading"} />
        </div>
        <div className="shrink-0">
          <PhoneIllustration />
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
          badgeLabel="OPTIONAL"
          description="Add your own AI key (Gemini's free) to unlock tailored written feedback the moment your score is ready."
        />

        {state.status === "error" && (
          <div className="w-full max-w-xl rounded-xl border-2 border-[#111] px-4 py-3 text-[#111] text-sm" style={{ background: "color-mix(in srgb, var(--accent) 8%, white)" }}>
            {state.message}
          </div>
        )}

        {state.status === "result" && (
          <div className="w-full flex flex-col items-center gap-6">
            {!compareOpen && (
              <div className="w-full flex flex-col items-center gap-8">
                <ScoreBreakdown result={state.result} />
                <TailoredFeedback
                  key={state.video.url}
                  video={state.video}
                  result={state.result}
                  provider={provider}
                  apiKey={apiKey}
                  ollamaBaseUrl={ollamaBaseUrl}
                  ollamaModel={ollamaModel}
                />
                <BoostPanel actions={getBoostActions(state.video, state.result)} />
                <ShareCard result={state.result} handle={state.video.author.handle} />
              </div>
            )}

            {!compareOpen && (
              <button
                onClick={() => setCompareOpen(true)}
                className="font-display font-bold text-[13.5px] text-[#333] border-b-2 border-[#111] pb-0.5"
              >
                Compare with another video →
              </button>
            )}

            {compareOpen && (
              <div className="w-full flex flex-col items-center gap-8">
                <p className="text-[#666] text-sm">
                  Paste a second video — a competitor&apos;s, or a different caption on a
                  similar video — to see which setup is actually winning.
                </p>
                <UrlInput onSubmit={handleCompareSubmit} isLoading={compareState.status === "loading"} />

                {compareState.status === "error" && (
                  <div className="w-full max-w-xl rounded-xl border-2 border-[#111] px-4 py-3 text-[#111] text-sm" style={{ background: "color-mix(in srgb, var(--accent) 8%, white)" }}>
                    {compareState.message}
                  </div>
                )}

                {comparison && state.status === "result" && compareState.status === "result" && (
                  <>
                    <CompareSummary comparison={comparison} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-3xl">
                      <CompareCard label="Video A" result={state.result} />
                      <CompareCard label="Video B" result={compareState.result} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <footer className="mt-6 pt-6 border-t-2 border-[#111] text-center text-[12.5px] text-[#999] max-w-lg">
          TikTok Viral Score reads only the public data available on the video URL you submit.
          It isn&apos;t affiliated with or endorsed by TikTok. Nothing you submit is
          stored on a server — analysis happens per-request and results live only in
          your browser.
        </footer>
      </div>
    </div>
  );
}
