"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeWrappedStats,
  PATTERN_LABELS,
  type HookPatternKey,
} from "@/lib/creatorWrapped";
import { buildWrappedSystemPrompt, buildWrappedUserPrompt } from "@/lib/creatorWrappedPrompt";
import { generateCreatorWrappedNarrative, type CreatorWrappedNarrative, type LLMProvider } from "@/lib/providers";
import { renderWrappedCard } from "@/lib/wrappedCard";
import { canvasToBlob } from "@/lib/shareCard";
import type { TikTokVideoData } from "@/lib/tiktok";
import { DAYPARTS } from "@/lib/timing";
import {
  getPersonaTheme,
  buildMonsterFlags,
  BALANCED_RAINBOW,
  type PersonaTheme,
} from "@/lib/wrappedPersona";
import WrappedMonster from "@/components/WrappedMonster";

interface CreatorWrappedProps {
  videos: TikTokVideoData[];
  provider: LLMProvider;
  apiKey: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  onClose: () => void;
}

type NarrativeState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "result"; narrative: CreatorWrappedNarrative };

const SLIDE_COUNT = 10;
const SWIPE_THRESHOLD = 55;

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Real dominant pattern → fallback label shown before the AI caption loads (or if it errors) — never blocks the deck on the AI call. */
function fallbackPersonalityLabel(stats: ReturnType<typeof computeWrappedStats>): string {
  return stats.dominantPattern === "balanced" ? "You've got range" : PATTERN_LABELS[stats.dominantPattern];
}

export default function CreatorWrapped({ videos, provider, apiKey, ollamaBaseUrl, ollamaModel, onClose }: CreatorWrappedProps) {
  const stats = useMemo(() => computeWrappedStats(videos), [videos]);
  const theme = useMemo(() => getPersonaTheme(stats.dominantPattern), [stats.dominantPattern]);
  const [slide, setSlide] = useState(0);
  const [narrativeState, setNarrativeState] = useState<NarrativeState>({ status: "loading" });
  const [dragging, setDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragX, setDragX] = useState(0);

  async function generate() {
    setNarrativeState({ status: "loading" });
    try {
      const systemPrompt = buildWrappedSystemPrompt();
      const userPrompt = buildWrappedUserPrompt(stats);

      let narrative: CreatorWrappedNarrative;
      if (provider === "ollama") {
        narrative = await generateCreatorWrappedNarrative(
          { provider: "ollama", baseUrl: ollamaBaseUrl, model: ollamaModel },
          systemPrompt,
          userPrompt
        );
      } else {
        const response = await fetch("/api/creator-wrapped", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey, stats }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
        narrative = body.narrative as CreatorWrappedNarrative;
      }
      setNarrativeState({ status: "result", narrative });
    } catch (error) {
      setNarrativeState({ status: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    }
  }

  useEffect(() => {
    // One-time generate on mount — the button that opens this modal only
    // enables once a provider key is already set, so credentials are here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goPrev() {
    setSlide((s) => Math.max(0, s - 1));
  }
  function goNext() {
    setSlide((s) => Math.min(SLIDE_COUNT - 1, s + 1));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onDragStart(e: React.PointerEvent) {
    setDragging(true);
    setDragStartX(e.clientX);
    setDragX(0);
  }
  function onDragMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - dragStartX);
  }
  function onDragEnd() {
    if (!dragging) return;
    if (dragX < -SWIPE_THRESHOLD) goNext();
    else if (dragX > SWIPE_THRESHOLD) goPrev();
    setDragging(false);
    setDragX(0);
  }

  const displayLabel = narrativeState.status === "result" ? narrativeState.narrative.personalityLabel : fallbackPersonalityLabel(stats);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 overflow-hidden"
      style={{ background: "#fbfbfa" }}
    >
      <div
        className="absolute -top-16 -left-16 w-56 h-56 rounded-full animate-float-y"
        style={{ background: theme.color, opacity: 0.16, transition: "background 0.5s ease" }}
      />
      <div
        className="absolute bottom-10 -right-10 w-64 h-64 rounded-full animate-float-y2"
        style={{ background: theme.color2, opacity: 0.14, transition: "background 0.5s ease" }}
      />
      <div
        className="absolute top-1/3 left-[44%] w-28 h-28 rounded-full animate-bob"
        style={{ background: theme.color, opacity: 0.1, transition: "background 0.5s ease" }}
      />

      <div
        className="relative w-full max-w-[480px] bg-white overflow-hidden flex flex-col"
        style={{
          borderRadius: "30px",
          border: "2.5px solid #111",
          boxShadow: "8px 8px 0 #111",
          height: "min(92vh, 820px)",
        }}
      >
        <div
          className="flex items-center justify-between px-[18px] py-[14px] border-b-2 border-[#111] shrink-0"
          style={{ background: theme.color, transition: "background 0.4s ease" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[19px]">{theme.emoji}</span>
            <span className="font-display font-bold text-[13.5px] text-[#111]">{displayLabel}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-full bg-white border-2 border-[#111] flex items-center justify-center font-extrabold text-[#111] text-sm"
          >
            ×
          </button>
        </div>

        <div
          className="flex-1 overflow-hidden relative"
          style={{ touchAction: "pan-y" }}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerLeave={onDragEnd}
        >
          <div
            className="h-full overflow-y-auto"
            style={{
              transform: `translateX(${dragging ? dragX * 0.3 : 0}px)`,
              transition: dragging ? "none" : "transform 0.2s ease",
            }}
          >
            {slide === 0 && <IntroSlide stats={stats} theme={theme} />}
            {slide === 1 && <HookSlide stats={stats} theme={theme} narrativeState={narrativeState} onRetry={generate} />}
            {slide === 2 && <FormatSlide stats={stats} theme={theme} narrativeState={narrativeState} onRetry={generate} />}
            {slide === 3 && <HashtagSlide stats={stats} theme={theme} narrativeState={narrativeState} onRetry={generate} />}
            {slide === 4 && <CollabsSlide stats={stats} theme={theme} narrativeState={narrativeState} onRetry={generate} />}
            {slide === 5 && <RhythmSlide stats={stats} theme={theme} narrativeState={narrativeState} onRetry={generate} />}
            {slide === 6 && <ReachSlide stats={stats} theme={theme} narrativeState={narrativeState} onRetry={generate} />}
            {slide === 7 && <TotalsSlide stats={stats} theme={theme} narrativeState={narrativeState} onRetry={generate} />}
            {slide === 8 && <EngagementSlide stats={stats} theme={theme} narrativeState={narrativeState} onRetry={generate} />}
            {slide === 9 && (
              <RevealSlide
                stats={stats}
                theme={theme}
                narrativeState={narrativeState}
                onRetry={generate}
                onReplay={() => setSlide(0)}
              />
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between gap-3 px-[18px] py-[14px] border-t-2 border-[#111]">
          <button
            onClick={goPrev}
            disabled={slide === 0}
            className="font-display font-bold text-[13px] text-[#111] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: SLIDE_COUNT }, (_, i) => (
              <span
                key={i}
                onClick={() => setSlide(i)}
                className="w-[7px] h-[7px] rounded-full cursor-pointer transition-all duration-200"
                style={{
                  background: i === slide ? "#111" : "#ddd",
                  transform: i === slide ? "scale(1.3)" : "scale(1)",
                }}
              />
            ))}
          </div>
          {slide < SLIDE_COUNT - 1 ? (
            <button
              onClick={goNext}
              className="rounded-lg border-2 border-[#111] bg-[#111] text-white px-4 py-1.5 font-display font-bold text-[13px]"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-lg border-2 border-[#111] bg-[#111] text-white px-4 py-1.5 font-display font-bold text-[13px]"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SlideShell({
  background,
  color,
  children,
}: {
  background: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-full flex flex-col items-center justify-center text-center px-[26px] py-9 animate-pop-in"
      style={{ background, color }}
    >
      {children}
    </div>
  );
}

function NarrativeCaption({ narrativeState, onRetry, pick }: {
  narrativeState: NarrativeState;
  onRetry: () => void;
  pick: (n: CreatorWrappedNarrative) => string;
}) {
  if (narrativeState.status === "loading") {
    return <p className="text-sm opacity-60 animate-pulse mt-5">Writing your recap…</p>;
  }
  if (narrativeState.status === "error") {
    return (
      <div className="mt-5 flex flex-col items-center gap-2">
        <p className="text-sm opacity-70">{narrativeState.message}</p>
        <button onClick={onRetry} className="text-sm font-bold underline">
          Try again
        </button>
      </div>
    );
  }
  return <p className="text-sm leading-[1.55] mt-5 max-w-[270px] opacity-[0.85]">{pick(narrativeState.narrative)}</p>;
}

function IntroSlide({ stats, theme }: { stats: ReturnType<typeof computeWrappedStats>; theme: PersonaTheme }) {
  return (
    <SlideShell background="#111111" color="#ffffff">
      <span className="text-5xl animate-float-y inline-block">{theme.emoji}</span>
      <p className="font-mono text-[11px] tracking-widest opacity-55 mt-4 mb-1.5">YOUR CREATOR WRAPPED</p>
      <h2 className="font-display text-2xl font-extrabold mb-3 max-w-[270px] leading-tight">
        {fallbackPersonalityLabel(stats)}
      </h2>
      <p className="text-[14.5px] opacity-70 max-w-[260px] leading-relaxed">
        Based on {stats.videoCount} real posted videos{stats.handle ? ` from @${stats.handle}` : ""}. Here&apos;s what your habits say about you.
      </p>
      <div className="mt-6 text-[13px] font-bold opacity-80 animate-bob">swipe or tap next →</div>
    </SlideShell>
  );
}

const PATTERN_EMOJI: Record<HookPatternKey, string> = {
  curiosity: "🤔",
  urgency: "⏰",
  contrarian: "🔥",
  pov: "👀",
  number: "🔢",
  cta: "👉",
};

function PatternBadge({ patternKey, pct, index }: { patternKey: HookPatternKey; pct: number; index: number }) {
  const hoverRotate = index % 2 === 0 ? "hover:-rotate-3" : "hover:rotate-3";
  return (
    <div
      className={`rounded-[18px] border-2 border-[#111] bg-white px-4 py-3.5 flex flex-col items-center gap-1 min-w-[92px] transition-transform duration-150 hover:-translate-y-0.5 hover:-translate-x-0.5 ${hoverRotate}`}
      style={{
        boxShadow: "4px 4px 0 #111",
        animation: `badgePop 0.5s ease ${index * 0.1}s both`,
      }}
    >
      <span className="text-2xl">{PATTERN_EMOJI[patternKey]}</span>
      <span className="font-display font-extrabold text-xl">{Math.round(pct * 100)}%</span>
      <span className="text-[11px] font-semibold text-center leading-tight">{PATTERN_LABELS[patternKey]}</span>
    </div>
  );
}

function HookSlide({
  stats,
  theme,
  narrativeState,
  onRetry,
}: {
  stats: ReturnType<typeof computeWrappedStats>;
  theme: PersonaTheme;
  narrativeState: NarrativeState;
  onRetry: () => void;
}) {
  const top = (Object.entries(stats.patternPct) as [HookPatternKey, number][])
    .filter(([, pct]) => pct > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <SlideShell background={theme.color} color="#111111">
      <p className="font-mono text-[11px] tracking-widest opacity-55 mb-2">YOUR HOOKS</p>
      <h2 className="font-display text-[23px] font-extrabold mb-5">
        {stats.dominantPattern === "balanced" ? "You've got range" : `${theme.emoji} ${PATTERN_LABELS[stats.dominantPattern]}`}
      </h2>
      {top.length > 0 ? (
        <div className="flex flex-wrap gap-3 justify-center max-w-[300px]">
          {top.map(([key, pct], i) => (
            <PatternBadge key={key} patternKey={key} pct={pct} index={i} />
          ))}
        </div>
      ) : (
        <p className="text-sm opacity-70">Not enough signal yet to spot a real pattern.</p>
      )}
      <NarrativeCaption narrativeState={narrativeState} onRetry={onRetry} pick={(n) => n.hookSlideCaption} />
    </SlideShell>
  );
}

const DURATION_STYLE: Record<ReturnType<typeof computeWrappedStats>["durationStyleLabel"], { title: string; emoji: string }> = {
  short: { title: "Quick-Hit Creator", emoji: "⚡" },
  "sweet-spot": { title: "Sweet-Spot Creator", emoji: "🎯" },
  long: { title: "Long-Form Creator", emoji: "🎬" },
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 40;
// TikTok's real hard cap is 10 minutes (600s), not 60s — using 60s as the
// ring's reference made almost every real video (even a 59s one) look like
// it maxed out the whole ring, which misrepresented how long it actually
// is relative to what's actually possible on the platform. A straight
// linear scale against 600s would make typical short-form videos (most of
// them under a minute) look like an almost-empty sliver, so this uses a
// square-root scale instead — still strictly capped at the real 600s max,
// but short/mid-length videos remain visually legible.
const RING_MAX_SECONDS = 600;

function FormatSlide({
  stats,
  theme,
  narrativeState,
  onRetry,
}: {
  stats: ReturnType<typeof computeWrappedStats>;
  theme: PersonaTheme;
  narrativeState: NarrativeState;
  onRetry: () => void;
}) {
  const style = DURATION_STYLE[stats.durationStyleLabel];
  const fraction = Math.min(1, Math.sqrt(stats.avgDurationSeconds / RING_MAX_SECONDS));
  const dashoffset = RING_CIRCUMFERENCE * (1 - fraction);

  return (
    <SlideShell background="#ffffff" color="#111111">
      <p className="font-mono text-[11px] tracking-widest opacity-55 mb-2">YOUR FORMAT</p>
      <h2 className="font-display text-[23px] font-extrabold mb-5">
        {style.emoji} {style.title}
      </h2>
      <div className="relative w-[132px] h-[132px] flex items-center justify-center mb-2">
        <svg width="132" height="132" viewBox="0 0 100 100" className="absolute top-0 left-0" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#eee" strokeWidth="9" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={theme.color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="flex flex-col items-center">
          <span className="font-display font-extrabold text-[28px]">{Math.round(stats.avgDurationSeconds)}s</span>
          <span className="text-[10px] font-semibold opacity-60">avg length</span>
        </div>
      </div>
      <NarrativeCaption narrativeState={narrativeState} onRetry={onRetry} pick={(n) => n.formatSlideCaption} />
    </SlideShell>
  );
}

function RhythmSlide({
  stats,
  theme,
  narrativeState,
  onRetry,
}: {
  stats: ReturnType<typeof computeWrappedStats>;
  theme: PersonaTheme;
  narrativeState: NarrativeState;
  onRetry: () => void;
}) {
  return (
    <SlideShell background={theme.color} color="#111111">
      <p className="font-mono text-[11px] tracking-widest opacity-55 mb-2">YOUR RHYTHM</p>
      {stats.postingWindows.length > 0 ? (
        <>
          <h2 className="font-display text-2xl font-extrabold mb-1.5">{stats.postingWindows[0]}</h2>
          <p className="text-xs opacity-70 mb-4 max-w-[250px]">
            {stats.postingSource === "creator-history"
              ? "Your best real posting window, based on your own history."
              : "General benchmark window — not enough of your own posting history yet."}
          </p>
        </>
      ) : (
        <h2 className="font-display text-xl font-extrabold mb-4">Still finding your rhythm</h2>
      )}
      <div className="flex flex-wrap gap-1.5 justify-center max-w-[290px] mb-4">
        {DAYPARTS.map((d) => {
          const active = stats.postingWindowIds.includes(d.id);
          return (
            <span
              key={d.id}
              className="text-[11px] font-semibold rounded-full border-[1.5px] border-[#111] px-2.5 py-1"
              style={{
                background: active ? "#111" : "transparent",
                color: active ? "#fff" : "#111",
                opacity: active ? 1 : 0.5,
                animation: active ? "pulseDot 1.8s ease-in-out infinite" : "none",
              }}
            >
              {d.label.replace(/\s*\([^)]*\)/, "")}
            </span>
          );
        })}
      </div>
      {stats.avgDaysBetweenPosts !== null && (
        <div
          className="rounded-2xl border-2 border-[#111] bg-white px-5 py-3 flex flex-col items-center"
          style={{ boxShadow: "3px 3px 0 #111" }}
        >
          <span className="font-display font-extrabold text-2xl">{stats.avgDaysBetweenPosts.toFixed(1)}</span>
          <span className="text-[10.5px] font-semibold mt-1 opacity-60">days between posts</span>
        </div>
      )}
      <NarrativeCaption narrativeState={narrativeState} onRetry={onRetry} pick={(n) => n.postingSlideCaption} />
    </SlideShell>
  );
}

function ReachSlide({
  stats,
  theme,
  narrativeState,
  onRetry,
}: {
  stats: ReturnType<typeof computeWrappedStats>;
  theme: PersonaTheme;
  narrativeState: NarrativeState;
  onRetry: () => void;
}) {
  return (
    <SlideShell background="#ffffff" color="#111111">
      <p className="font-mono text-[11px] tracking-widest opacity-55 mb-2">YOUR REACH</p>
      <h2 className="font-display text-[23px] font-extrabold mb-4">Where your videos land</h2>
      {stats.reachTierBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-2.5 justify-center max-w-[290px] mb-4">
          {stats.reachTierBreakdown.map((tier, i) => (
            <div
              key={tier.id}
              className={`rounded-2xl border-2 border-[#111] px-3.5 py-3 flex flex-col items-center gap-0.5 min-w-[76px] transition-transform duration-150 hover:-translate-y-0.5 hover:-translate-x-0.5 ${
                i % 2 === 0 ? "hover:-rotate-3" : "hover:rotate-3"
              }`}
              style={{ background: theme.color2, boxShadow: "3px 3px 0 #111", animation: `badgePop 0.45s ease ${i * 0.08}s both` }}
            >
              <span className="text-[22px]">{tier.emoji}</span>
              <span className="font-display font-extrabold text-base">{Math.round(tier.pct * 100)}%</span>
              <span className="text-[10.5px] font-semibold text-center">{tier.label}</span>
            </div>
          ))}
        </div>
      )}
      <div
        className="rounded-2xl border-2 border-[#111] px-5 py-3 flex flex-col items-center"
        style={{
          background: stats.isHighlySaveable ? theme.color : "transparent",
          boxShadow: stats.isHighlySaveable ? "3px 3px 0 #111" : "none",
        }}
      >
        <span className="font-display font-extrabold text-[22px]">{(stats.saveRatePct * 100).toFixed(1)}%</span>
        <span className="text-[10.5px] font-semibold">save rate{stats.isHighlySaveable ? " — highly saveable!" : ""}</span>
      </div>
      <NarrativeCaption narrativeState={narrativeState} onRetry={onRetry} pick={(n) => n.reachSlideCaption} />
    </SlideShell>
  );
}

function HashtagSlide({
  stats,
  theme,
  narrativeState,
  onRetry,
}: {
  stats: ReturnType<typeof computeWrappedStats>;
  theme: PersonaTheme;
  narrativeState: NarrativeState;
  onRetry: () => void;
}) {
  if (!stats.hasHashtags) {
    return (
      <SlideShell background="#ffffff" color="#111111">
        <p className="font-mono text-[11px] tracking-widest opacity-55 mb-2">YOUR TOPICS</p>
        <h2 className="font-display text-2xl font-extrabold mb-2">You don&apos;t really hashtag</h2>
        <p className="text-[13px] opacity-60 mb-[18px] max-w-[250px]">
          So here&apos;s what your captions and spoken hooks are actually about instead.
        </p>
        {stats.topTopics.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center max-w-[270px]">
            {stats.topTopics.map((topic) => (
              <span key={topic} className="text-[13px] font-semibold border-[1.5px] border-[#111] rounded-full px-3.5 py-1" style={{ background: theme.color2 }}>
                {topic}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm opacity-60">Not enough real caption/transcript text yet to tell what your videos are about.</p>
        )}
        <NarrativeCaption narrativeState={narrativeState} onRetry={onRetry} pick={(n) => n.hashtagSlideCaption} />
      </SlideShell>
    );
  }

  return (
    <SlideShell background="#ffffff" color="#111111">
      <p className="font-mono text-[11px] tracking-widest opacity-55 mb-2">YOUR HASHTAGS</p>
      <h2 className="font-display text-[23px] font-extrabold mb-5">
        {Math.round(stats.specificTagPct * 100)}% specific, {Math.round(stats.megaTagPct * 100)}% oversaturated
      </h2>
      <div className="w-[260px] h-4 rounded-lg border-2 border-[#111] overflow-hidden flex bg-white">
        <div style={{ width: `${stats.specificTagPct * 100}%`, background: theme.color }} />
        <div style={{ width: `${stats.megaTagPct * 100}%`, background: "#111" }} />
      </div>
      {stats.topHashtagUsage.length > 0 && (
        <div className="w-full max-w-[270px] flex flex-col gap-1.5 mt-4">
          {stats.topHashtagUsage.slice(0, 5).map((item, i) => (
            <div
              key={item.tag}
              className="flex items-center justify-between rounded-lg border-[1.5px] border-[#111] px-3 py-1.5"
              style={{ background: i === 0 ? theme.color2 : "#fff" }}
            >
              <span className="text-[13px] font-semibold">#{item.tag}</span>
              <span className="text-[12px] font-mono font-bold opacity-70">×{item.count}</span>
            </div>
          ))}
        </div>
      )}
      <NarrativeCaption narrativeState={narrativeState} onRetry={onRetry} pick={(n) => n.hashtagSlideCaption} />
    </SlideShell>
  );
}

function CollabsSlide({
  stats,
  theme,
  narrativeState,
  onRetry,
}: {
  stats: ReturnType<typeof computeWrappedStats>;
  theme: PersonaTheme;
  narrativeState: NarrativeState;
  onRetry: () => void;
}) {
  return (
    <SlideShell background="#ffffff" color="#111111">
      <p className="font-mono text-[11px] tracking-widest opacity-55 mb-2">YOUR COLLABS</p>
      {stats.hasCollabs ? (
        <>
          <h2 className="font-display text-[23px] font-extrabold mb-1">🤝 @{stats.collabs[0].handle}</h2>
          <p className="text-xs opacity-70 mb-4 max-w-[250px]">
            Your most-repeated collaborator — tagged in {stats.collabs[0].count} of your videos.
          </p>
          <div className="w-full max-w-[280px] flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
            {stats.collabs.map((c, i) => (
              <div
                key={c.handle}
                className="flex items-center justify-between rounded-lg border-[1.5px] border-[#111] px-3 py-1.5"
                style={{ background: i === 0 ? theme.color : "#fff" }}
              >
                <span className="text-[13px] font-semibold">@{c.handle}</span>
                <span className="text-[12px] font-mono font-bold opacity-70">×{c.count}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="font-display text-xl font-extrabold mb-2">No collabs tagged yet</h2>
          <p className="text-sm opacity-60 max-w-[260px]">
            None of your captions @mention another creator — tag your collaborators next time to see them here.
          </p>
        </>
      )}
      <NarrativeCaption narrativeState={narrativeState} onRetry={onRetry} pick={(n) => n.collabSlideCaption} />
    </SlideShell>
  );
}

function StatTile({ emoji, value, label, theme }: { emoji: string; value: string; label: string; theme: PersonaTheme }) {
  return (
    <div
      className="rounded-2xl border-2 border-[#111] px-4 py-3.5 flex flex-col items-center gap-1 min-w-[90px] transition-transform duration-150 hover:-translate-y-0.5 hover:-translate-x-0.5"
      style={{ background: theme.color2, boxShadow: "4px 4px 0 #111" }}
    >
      <span className="text-[22px]">{emoji}</span>
      <span className="font-display font-extrabold text-lg tabular-nums">{value}</span>
      <span className="text-[10.5px] font-semibold text-center leading-tight">{label}</span>
    </div>
  );
}

/** Counts up from 0 to 1 over ~900ms whenever the slide it belongs to mounts — since the parent only mounts one slide at a time, this fires fresh every time this slide becomes visible. */
function useCountUp(active: boolean): number {
  const [t, setT] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const duration = 900;
    function step(now: number) {
      const elapsed = Math.min(1, (now - start) / duration);
      setT(easeOutCubic(elapsed));
      if (elapsed < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return t;
}

function TotalsSlide({
  stats,
  theme,
  narrativeState,
  onRetry,
}: {
  stats: ReturnType<typeof computeWrappedStats>;
  theme: PersonaTheme;
  narrativeState: NarrativeState;
  onRetry: () => void;
}) {
  const t = useCountUp(true);
  return (
    <SlideShell background="#ffffff" color="#111111">
      <p className="font-mono text-[11px] tracking-widest opacity-55 mb-2">YOUR TOTALS</p>
      <h2 className="font-display text-[23px] font-extrabold mb-6">Across all {stats.videoCount} videos</h2>
      <div className="flex flex-wrap gap-3 justify-center max-w-[300px]">
        <StatTile theme={theme} emoji="❤️" value={formatCount(stats.totalLikes * t)} label="likes" />
        <StatTile theme={theme} emoji="💬" value={formatCount(stats.totalComments * t)} label="comments" />
        <StatTile theme={theme} emoji="🔖" value={formatCount(stats.totalSaves * t)} label="saves" />
      </div>
      <NarrativeCaption narrativeState={narrativeState} onRetry={onRetry} pick={(n) => n.totalsSlideCaption} />
    </SlideShell>
  );
}

function EngagementSlide({
  stats,
  narrativeState,
  onRetry,
}: {
  stats: ReturnType<typeof computeWrappedStats>;
  theme: PersonaTheme;
  narrativeState: NarrativeState;
  onRetry: () => void;
}) {
  const t = useCountUp(true);
  return (
    <SlideShell background="#111111" color="#ffffff">
      <p className="font-mono text-[11px] tracking-widest opacity-55 mb-2">YOUR ENGAGEMENT</p>
      <div className="font-display text-[58px] font-extrabold mb-1 tabular-nums">{(stats.avgEngagementRate * 100 * t).toFixed(1)}%</div>
      <p className="text-[12.5px] opacity-60 mb-[18px]">average engagement rate</p>
      {stats.bestVideo && (
        <div className="w-full max-w-[270px] border-2 border-white/35 rounded-[18px] p-4 text-left">
          <p className="font-mono text-[10.5px] opacity-55 mb-1.5">YOUR BEST POST</p>
          <p className="font-display font-bold text-sm mb-2">
            {stats.bestVideo.totalScore}/100 · {stats.bestVideo.reachTierEmoji} {stats.bestVideo.reachTierLabel}
          </p>
          <p className="text-[12.5px] opacity-80 leading-relaxed mb-2">
            &ldquo;{stats.bestVideo.caption || stats.bestVideo.captionSnippet}&rdquo;
          </p>
          {stats.bestVideo.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {stats.bestVideo.hashtags.map((tag) => (
                <span key={tag} className="text-[10.5px] border border-white/40 rounded-full px-2 py-0.5 opacity-80">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <NarrativeCaption narrativeState={narrativeState} onRetry={onRetry} pick={(n) => n.engagementSlideCaption} />
    </SlideShell>
  );
}

interface ConfettiPiece {
  id: string;
  style: React.CSSProperties;
}

function spawnConfetti(theme: PersonaTheme): ConfettiPiece[] {
  const colors = [theme.color, theme.color2, "#111111"];
  return Array.from({ length: 26 }, (_, i) => {
    const size = 6 + Math.round(Math.random() * 6);
    return {
      id: `${i}-${Math.random()}`,
      style: {
        position: "absolute",
        top: "-10px",
        left: `${Math.round(Math.random() * 92)}%`,
        width: size,
        height: size,
        background: colors[i % colors.length],
        borderRadius: size > 9 ? "3px" : "50%",
        animation: `confettiFall ${(1.8 + Math.random() * 0.8).toFixed(2)}s ease-in ${(Math.random() * 0.5).toFixed(2)}s infinite`,
        zIndex: 1,
      },
    };
  });
}

function RevealSlide({
  stats,
  theme,
  narrativeState,
  onRetry,
  onReplay,
}: {
  stats: ReturnType<typeof computeWrappedStats>;
  theme: PersonaTheme;
  narrativeState: NarrativeState;
  onRetry: () => void;
  onReplay: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [confetti] = useState(() => spawnConfetti(theme));
  const monsterFlags = useMemo(() => buildMonsterFlags(theme.monster), [theme]);

  useEffect(() => {
    if (narrativeState.status !== "result") return;
    const canvas = renderWrappedCard(narrativeState.narrative, stats.handle, theme);
    canvasToBlob(canvas).then(setBlob);
    const preview = canvasRef.current;
    if (preview) {
      const ctx = preview.getContext("2d");
      preview.width = canvas.width;
      preview.height = canvas.height;
      ctx?.drawImage(canvas, 0, 0);
    }
  }, [narrativeState, stats.handle, theme]);

  function handleDownload() {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "creator-wrapped.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (!blob) return;
    const file = new File([blob], "creator-wrapped.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "My Creator Wrapped" });
      } catch {
        // user cancelled share sheet — no action needed
      }
    } else {
      handleDownload();
    }
  }

  const shellBackground = theme.isBalanced ? BALANCED_RAINBOW : theme.color;

  if (narrativeState.status !== "result") {
    return (
      <SlideShell background={shellBackground} color="#111111">
        <NarrativeCaption narrativeState={narrativeState} onRetry={onRetry} pick={() => ""} />
      </SlideShell>
    );
  }

  return (
    <div
      className="min-h-full flex flex-col items-center justify-center text-center px-[26px] py-6 animate-pop-in relative overflow-hidden"
      style={{ background: shellBackground, color: "#111111" }}
    >
      {confetti.map((c) => (
        <span key={c.id} style={c.style} />
      ))}
      <p className="font-mono text-[11.5px] tracking-widest opacity-70 mb-2.5 relative z-[2]">YOU ARE...</p>

      <div
        className="w-[104px] h-[104px] mx-auto mb-1.5 relative z-[2]"
        style={{ animation: "monsterPop 0.6s ease both, monsterBounce 3.4s ease-in-out 0.6s infinite" }}
      >
        <WrappedMonster flags={monsterFlags} size={104} />
      </div>
      <p className="font-display font-bold text-[12px] opacity-75 mb-1 relative z-[2]">Say hi to {monsterFlags.name} 👋</p>
      <h2
        className="font-display font-extrabold text-xl leading-[1.3] mb-3 max-w-[250px] relative z-[2]"
        style={{ color: "#111", textShadow: "2px 2px 0 rgba(255,255,255,0.55)" }}
      >
        {narrativeState.narrative.personalityLabel}
      </h2>
      <p className="text-[13.5px] leading-snug max-w-[270px] mb-3 relative z-[2]">{narrativeState.narrative.tagline}</p>

      <canvas
        ref={canvasRef}
        className="rounded-xl border-2 border-[#111] mb-3 relative z-[2]"
        style={{ width: 120, height: 152, boxShadow: "5px 5px 0 #111" }}
      />

      <div className="flex gap-2 flex-wrap justify-center relative z-[2]">
        <button onClick={handleShare} className="rounded-lg border-2 border-[#111] bg-[#111] text-white px-4 py-2 font-display font-bold text-[13px]">
          Share
        </button>
        <button onClick={handleDownload} className="rounded-lg border-2 border-[#111] bg-transparent text-[#111] px-4 py-2 font-display font-bold text-[13px]">
          Download
        </button>
        <button onClick={onReplay} className="rounded-lg border-2 border-[#111] bg-transparent text-[#111] px-4 py-2 font-display font-bold text-[13px]">
          Replay
        </button>
      </div>
    </div>
  );
}
