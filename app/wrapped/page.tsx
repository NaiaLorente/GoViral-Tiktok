"use client";

import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import WrappedIllustration from "@/components/icons/WrappedIllustration";
import ProviderKeyInput from "@/components/ProviderKeyInput";
import CreatorWrapped from "@/components/CreatorWrapped";
import { hasEnoughVideosForWrapped, MIN_VIDEOS_FOR_WRAPPED } from "@/lib/creatorWrapped";
import { MAX_VIDEO_URLS } from "@/lib/tiktokVideoBatch";
import { DEFAULT_OLLAMA_BASE_URL, type LLMProvider } from "@/lib/providers";
import {
  OLLAMA_BASE_URL_STORAGE_KEY,
  OLLAMA_MODEL_STORAGE_KEY,
  PROVIDER_STORAGE_KEY,
  VALID_PROVIDERS,
  keyStorageKey,
} from "@/lib/providerStorage";
import type { TikTokVideoData } from "@/lib/tiktok";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "result"; videos: TikTokVideoData[] };

function parseVideoUrls(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
  );
}

export default function WrappedPage() {
  const [provider, setProvider] = useState<LLMProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(DEFAULT_OLLAMA_BASE_URL);
  const [ollamaModel, setOllamaModel] = useState("");
  const [videoUrlsRaw, setVideoUrlsRaw] = useState("");
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [wrappedOpen, setWrappedOpen] = useState(false);

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

  const hasCredentials = provider === "ollama" ? ollamaModel.trim().length > 0 : apiKey.trim().length > 0;

  async function handleSubmit() {
    const urls = parseVideoUrls(videoUrlsRaw);
    if (urls.length === 0) {
      setState({ status: "error", message: "Paste at least a few of your real video links first." });
      return;
    }
    if (urls.length > MAX_VIDEO_URLS) {
      setState({ status: "error", message: `That's ${urls.length} links — trim it to ${MAX_VIDEO_URLS} or fewer.` });
      return;
    }
    if (!hasCredentials) {
      setState({ status: "error", message: "Add your AI provider key above first." });
      return;
    }

    setState({ status: "loading" });
    try {
      const response = await fetch("/api/fetch-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Something went wrong.");

      const videos = Array.isArray(body.videos) ? (body.videos as TikTokVideoData[]) : [];
      if (!hasEnoughVideosForWrapped(videos.length)) {
        setState({
          status: "error",
          message: `Only ${videos.length} of those links could be read — paste at least ${MIN_VIDEOS_FOR_WRAPPED} real videos to get a meaningful Wrapped.`,
        });
        return;
      }
      setState({ status: "result", videos });
      setWrappedOpen(true);
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white text-[#111]">
      <AppNav />

      <div className="flex items-center gap-5 px-8 sm:px-12 pt-16 pb-11 max-w-[1280px] mx-auto w-full flex-wrap">
        <div className="flex-1 min-w-[320px]">
          <h1 className="font-display text-[44px] sm:text-[56px] font-extrabold leading-[1.03] tracking-tight mb-2.5">
            Your Creator
            <br />
            Wrapped.
          </h1>
          <svg width="190" height="14" viewBox="0 0 180 14" className="mb-5 block" aria-hidden>
            <path d="M2 10 Q45 -2 90 8 T178 6" stroke="var(--accent2)" strokeWidth="5" fill="none" strokeLinecap="round" />
          </svg>
          <p className="text-[17px] text-[#333] max-w-[440px] leading-relaxed">
            A Spotify-Wrapped-style recap of your real posting habits — your dominant hook
            pattern, your hashtag mix, your best real video, and a fun personality label,
            all computed from videos you&apos;ve actually posted.
          </p>
        </div>
        <div className="shrink-0">
          <WrappedIllustration />
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
          description="Your AI key writes the fun personality captions — every stat itself is computed locally from your real videos."
        />

        <div className="w-full max-w-xl rounded-2xl border-2 border-[#111] p-7 flex flex-col gap-4">
          <div>
            <label className="block font-display font-bold text-[13.5px] text-[#111] mb-1.5">
              Your videos <span className="text-[#999] font-medium">(at least {MIN_VIDEOS_FOR_WRAPPED}, up to {MAX_VIDEO_URLS} links, one per line)</span>
            </label>
            <textarea
              value={videoUrlsRaw}
              onChange={(e) => setVideoUrlsRaw(e.target.value)}
              placeholder={"https://www.tiktok.com/@you/video/123...\nhttps://www.tiktok.com/@you/video/456...\nhttps://www.tiktok.com/@you/video/789..."}
              rows={5}
              className="w-full rounded-[10px] border-2 border-[#111] px-4 py-2.5 text-[#111] placeholder:text-[#aaa] outline-none bg-white resize-y font-mono text-sm"
            />
            <p className="mt-1.5 text-xs text-[#888]">
              The more real videos you paste, the more real signal your Wrapped is grounded in.
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={state.status === "loading"}
            className="self-start rounded-xl border-2 border-[#111] bg-[#111] text-white px-6 py-3 font-display font-bold text-[14.5px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-colors"
          >
            {state.status === "loading" ? "Reading your videos…" : "🎬 See my Creator Wrapped"}
          </button>
        </div>

        {state.status === "error" && (
          <div className="w-full max-w-xl rounded-xl border-2 border-[#111] px-4 py-3 text-[#111] text-sm" style={{ background: "color-mix(in srgb, var(--accent) 8%, white)" }}>
            {state.message}
          </div>
        )}

        <footer className="mt-6 pt-6 border-t-2 border-[#111] text-center text-[12.5px] text-[#999] max-w-lg">
          Hosted providers: your API key is sent directly through our server, once per request,
          and is never logged or stored. Ollama: everything stays on your machine.
        </footer>
      </div>

      {wrappedOpen && state.status === "result" && (
        <CreatorWrapped
          videos={state.videos}
          provider={provider}
          apiKey={apiKey}
          ollamaBaseUrl={ollamaBaseUrl}
          ollamaModel={ollamaModel}
          onClose={() => setWrappedOpen(false)}
        />
      )}
    </div>
  );
}
