# TikTok Viral Score

## Visual design

The app follows a bold, flat "editorial" direction: white background, thick
2px black borders on every card/input, Sora for headings, JetBrains Mono for
small numeric/mono labels, Inter for body text, and a two-color accent system
(`--accent` #FF3B5C, `--accent2` #00E5FF, set in `app/globals.css`) instead
of the earlier dark purple/cyan gradient theme. Category icons in the score
breakdown are emoji (📶⚡🪝#️⃣🕐), not custom SVGs — a deliberate choice from
the reference design, not an oversight; the bold border/typography system
carries the visual weight instead of icon detail. The reference design's
share-card mockup showed several reach-tier variants side by side purely to
demonstrate the range of styling — `lib/shareCard.ts` renders the one real
tier that applies to the video actually analyzed, not a fabricated gallery
of other tiers' fake scores.

Three tools for side-hustle, affiliate, and faceless-content creators — no
landing page, no onboarding wizard, no separate progress page:

- **Analyze a video** (`/`) — paste a public TikTok video and get a
  real, data-driven breakdown of why the hook, hashtags, and engagement are
  working, or not.
- **Before you post** (`/ideate`) — talk to an AI virality expert (your own
  API key) for concrete video ideas, grounded in the same curated pattern
  data and, optionally, your real public profile.
- **Creator Wrapped** (`/wrapped`) — a Spotify-Wrapped-style recap of your
  own real posting habits (see "Creator Wrapped" below).

`components/AppNav.tsx` is the only navigation in the app: a logo and a
tab switcher, identical on every page, with no state that changes its
shape (no login-gated tabs, no CTA that appears/disappears) — an earlier
version conditionally showed/hid tabs behind an onboarding flag, which made
the header feel inconsistent between pages; removed in favor of always
showing the same tabs.

Neither mode is a "give ChatGPT a prompt" tool. The analyzer fetches real
video data a chat window can't reach on its own; the ideation mode grounds
its suggestions in that same real, fetched data plus this project's curated
hook/hashtag library, instead of generic model knowledge.

## How it works

1. You paste a `tiktok.com` video link.
2. `app/api/fetch-video/route.ts` fetches that video's public page server-side
   and pulls out its caption, hashtags, stats, and timing (`lib/tiktok.ts`).
3. A deterministic, rule-based scoring engine (`lib/analyze.ts`) grades five
   categories — **Real Reach**, **Performance**, **Hook & Caption**,
   **Hashtags**, and **Structure & Timing** — against a curated pattern
   library in `data/*.json`. This score is instant and needs no API key.
4. Optionally, add your own AI provider key to get **tailored feedback**
   written specifically about this video — see below.
5. Results render in the browser and can be exported as a shareable score
   card (`lib/shareCard.ts`) — download or share it straight back to
   TikTok/Instagram.
6. Optionally, paste a second video to **compare** two videos (or two caption
   variants) side by side and see which one is actually winning and why.

### Why real reach overrides the checklist

Caption wording and hashtag choice are just proxies for "will this work" —
they stop mattering once a video has *actually* worked. `lib/analyze.ts`
resolves a video's real **reach tier** (Nano → Micro → Rising → Viral →
Mega, based on real likes/plays) first, and every other category gets a
floor tied to that tier. A video with hundreds of thousands of real likes
can no longer be scored near-zero just because its caption skips a
copywriting checklist — the tool treats proven performance as evidence the
hook already worked, and reframes the checklist as "how to do even better
next time" rather than a verdict on a video that's already succeeding.

## Tailored feedback on an analyzed video

The score breakdown's five category bars used to each carry their own bullet
tips, pulled from a fixed pool of template strings with real numbers plugged
in. Read from the perspective of a creator with 0 views, that read as
generic and skimmable-past — a "list of hardcoded letters," in the words of
the feedback that prompted this change — rather than something that
actually looked at their specific video. Those per-category tips are gone
from the UI now; the score bars are just the numbers.

In their place, `components/TailoredFeedback.tsx` (below the score) calls
an LLM (same BYOK provider system as ideation, see below — Claude, OpenAI,
Gemini, Groq, or local Ollama, one API key shared across both pages via
`lib/providerStorage.ts`) to write a genuinely tailored **"What's working" /
"What to improve"** list for that one specific video, plus two more concrete
outputs:

- **Grounded in real data, not asked to invent criteria itself**:
  `lib/analyzeFeedback.ts` feeds the model the video's actual caption,
  hashtags, real spoken hook (from its subtitle track, when available),
  real stats/engagement rate, and this project's own already-computed
  rule-based category scores/tips — the same curated hook-pattern and
  hashtag-benchmark data used everywhere else — and asks it to synthesize
  a natural narrative from those real facts, not to just restate them or
  invent its own evaluation.
- **Explicitly told not to penalize low view counts**: the system prompt
  states outright that a creator with few or no views yet shouldn't be
  treated as having failed — reach depends on factors a creator doesn't
  control, so feedback focuses on what's actually controllable (the hook,
  caption, hashtags, structure).
- **Hashtags to try**: not just a verdict on the hashtags already used —
  the model is told to work out what this specific video is actually
  about from its real caption/hook and suggest 3-5 hashtags tied to that
  actual topic that it isn't already using, not a generic niche-tag list.
- **Try this caption**: one alternate, rewritten caption for this exact
  video (front-loaded, specific, with a clear call to action) the creator
  can copy and test directly — always provided, even when the current
  caption already tests well, as an A/B alternative.
- **The API key lives at the top of the Analyze page now, not tucked
  inside the feedback section** — the same `ProviderKeyInput` used on
  `/ideate` renders right below the header, above the URL field, so a
  returning (or first-time) user adds it before analyzing. By the time
  their score renders, `TailoredFeedback` already has what it needs and
  auto-generates immediately with no extra click; adding a key was
  previously buried below the score itself, one scroll too late.
- **Free score stays free**: the rule-based score/reach-tier/progress-bars
  render instantly with no API key needed, same as always — the key is
  optional and only unlocks the tailored section.
- **`app/api/analyze-feedback/route.ts`** is a stateless passthrough
  identical in shape to `app/api/ideate/route.ts` — the key arrives in the
  request body, is used once, and is never logged or stored. `lib/providers.ts`
  was refactored so both features (ideation and this) share the same
  per-provider request/schema/error-handling mechanics instead of
  duplicating five providers' worth of HTTP code — `generateVideoIdeas` and
  `generateAnalysisFeedback` are now both thin wrappers around one generic
  structured-output core, each with their own JSON schema and validator.

## Before you post: AI ideation

`/ideate` (`app/ideate/page.tsx`) generates 5 concrete video concepts (hook +
caption + hashtags + rationale) from a short form, with a free-text refine
box to iterate on them.

- **Five providers, bring your own credentials** — Claude, OpenAI, Gemini,
  Groq, or Ollama. Gemini and Groq both have genuinely free ongoing tiers;
  Claude/OpenAI are paid; **Ollama runs entirely on your own machine, so
  it's free and needs no API key at all** — just
  [install Ollama](https://ollama.com/download), pull a model
  (`ollama pull llama3.2`), and point the app at it. Keys/config live in
  `localStorage` only. Note: **Groq** (api.groq.com, a fast open-model
  host) is easy to confuse with **Grok** (xAI's chatbot) — this project
  uses Groq.
- **`app/api/ideate/route.ts` is a stateless passthrough** for the four
  hosted providers: your key arrives in the request body, is used once to
  call the provider you picked (`lib/providers.ts`), and is never logged or
  stored. Inference cost is billed to your own key, not to this project.
  **Ollama is the one exception**: since it runs on your machine, our
  server can't reach it — that call happens directly from your browser to
  your local Ollama server instead, bypassing our backend entirely (see
  `requestIdeas()` in `app/ideate/page.tsx`). If a hosted page can't reach
  your local Ollama, it's usually a CORS issue — start Ollama with
  `OLLAMA_ORIGINS` set to allow that page's origin.
- **Structured output, not prompted-and-hoped-for JSON**: each provider is
  asked for its response via its own native structured-output mechanism
  (Claude tool-use, OpenAI/Groq `json_schema`, Gemini `responseSchema`,
  Ollama's `format` schema field), which `lib/providers.ts` validates before
  rendering. Local models are less reliable at this than hosted frontier
  models — a malformed response surfaces a clear retry-friendly error
  instead of silently rendering garbage.
- **Grounded in this project's own data**: the system prompt injects the
  same curated hook-pattern and hashtag benchmark data that powers the
  analyzer (`data/hook-patterns.json`, `data/hashtag-benchmarks.json`), so
  suggestions are tied to a specific curated dataset, not generic advice.
- **Grounded in your real videos, not a profile scrape**: paste 1-25 of your
  own video links and `lib/tiktokVideoBatch.ts` fetches each one with the
  same single-video fetcher that powers "Analyze a video" (`lib/tiktok.ts`)
  — proven reliable all session, unlike profile-page scraping — then
  aggregates real captions, hashtags, and engagement across them (up to 6
  fetched concurrently, each with its own timeout, so one slow/dead link
  can't stall the batch). A TikTok profile link is also still accepted, but
  now purely as supplementary bio/follower-count context layered on top,
  never as the primary mechanism. If nothing can be read and no niche/goal
  was typed, the form blocks with a clear message rather than generating
  from nothing; partial failures (some links unreadable) still proceed with
  whatever succeeded (see Known limitations for why profile-only grounding
  was demoted).
- **Grounded in what you actually say, not just your caption**: captions are
  often written differently than how a creator talks on camera, so
  `lib/tiktok.ts` also looks for each video's own auto-generated
  caption/subtitle track (TikTok's item data can include a WebVTT/SRT track
  alongside the mp4) and, when present, fetches and parses just the cues
  from the first ~15 seconds — the hook — stripping timestamps and markup
  down to plain spoken-word text. This is entirely server-side (no client ML
  model, no audio decoding, no extra download for the user) and best-effort:
  a video without a caption track, or one whose track can't be fetched or
  parsed, simply contributes no transcript, never breaks the batch fetch.
  `lib/ideate.ts` treats these transcripts as a stronger real-voice signal
  than the written caption alone, while still telling the model never to
  closely rephrase them — the same anti-near-duplication instruction that
  already applied to captions. (An earlier version of this feature ran an
  in-browser Whisper model against proxied audio instead — dropped in favor
  of this simpler, dependency-free approach; see git history if that's ever
  worth revisiting for videos with no caption track at all.)
- **Check an idea before you post it**: type a hook/caption/hashtags (or hit
  "Check this idea" on a generated one) and `lib/analyze.ts`'s
  `checkIdea()` scores it against the same curated Hook & Caption and
  Hashtags logic that already grades real posted videos in "Analyze a
  video" — the identical pattern-matching, just run on an idea's text
  instead of a fetched video, with no real-reach floor to lean on (there's
  no proof yet that it worked). This is explicitly **not** a virality
  prediction; the UI labels it "pattern match score" and says so directly,
  since no tool can know in advance how a video will actually perform.
  Two more honest, narrower checks ride alongside it, both scoped down from
  what would be genuinely unbuildable with this project's constraints (no
  Google Trends/Reddit/Etsy scraping, no TikTok search/trend API):
  - **Hashtag saturation** — flags which of the idea's tags are the
    oversaturated "mega tags" (`data/hashtag-benchmarks.json`) vs. niche
    ones, not a claim about how many similar *videos* exist (that data
    doesn't exist anywhere this project can legally/reliably reach).
  - **Best time to post** (`lib/timing.ts`) — buckets the creator's own
    real video timestamps + engagement (already extracted per-video in
    `lib/tiktok.ts`) into six broad dayparts and recommends whichever
    performed best, falling back to the general curated benchmark window
    when there are fewer than 5 real samples to work with (any fewer and
    per-daypart averages are mostly single data points — too noisy to
    call a real pattern). This is "when do *your* videos do best," not a
    per-content-type calendar — TikTok exposes no real dataset for "when
    do videos like this specifically go viral."

**Real bug found this way**: a creator pasted 5 real skit videos
(multi-character comedic dialogue — a resort scene, a pawnshop scene, a
national-ID-exam joke, a news reaction, a finance take) and got back 5
generated ideas that were all generic single-narrator "travel tips"
explainer videos in a niche this creator doesn't actually have. Two
compounding failures in `lib/ideate.ts`'s prompt: (1) the existing "keep
every idea on the same niche" instruction assumed every creator has one
subject-matter niche, so the model latched onto one incidental detail (a
resort setting in one skit) and invented a fake "travel blogger" niche,
then forced the other 4 ideas into that invented topic; (2) despite an
instruction to preserve format, dialogue-based skit transcripts still got
flattened into generic explainer copy. Fixed by teaching the prompt that
some creators' real niche *is* a format/persona (sketch comedy, reactive
commentary) rather than a subject — for those, genuinely varied real
subjects across ideas is the correct pattern, not a bug to normalize away
— and by explicitly naming multi-character dialogue as a skit format that
must come back as a new skit, never a narrator explaining a topic. Also
had to fix the prompt's own closing instruction, which still said "not 5
different subjects" and was quietly undoing the fix above. **Not yet
verified against a real LLM** (this environment has no internet access to
any AI provider) — smoke-test this fix with a format-driven creator's real
video links before trusting it in production.

## Creator Wrapped

`/wrapped` is a third top-level tab — a Spotify-Wrapped-style slide deck
(`components/CreatorWrapped.tsx`) built from a batch of your own real
videos. It first lived as a button tucked inside `/ideate`'s video-paste
flow, gated behind already having pasted 3+ videos there — real feedback
was that this made it effectively invisible, since nobody finds a feature
that only appears after they've already done an unrelated task. It's now
its own page with its own hero, key bar, and a minimal video-paste form
(`app/wrapped/page.tsx`), reachable directly from the nav like Analyze and
Ideate are.

This was a direct request for a "Spotify Wrapped for TikTok," and the
literal version of that (reading who you follow, what you like, what you
comment) isn't something this project can build honestly: TikTok's official
developer API has no scope exposing a user's liked videos, follow list, or
comments to third-party apps, and the only way to get that data would be
asking for your TikTok login/session — a real account-suspension risk and
a line this project has stayed on the right side of everywhere else (see
"Constraints this project honors" below). What ships instead uses only data
this app can already legitimately read: the real videos *you* posted.

- **Every number is computed locally and deterministically**
  (`lib/creatorWrapped.ts`), the same way the rest of the app scores things
  — no AI involved in the stats themselves. Per real video, it checks the
  same curated hook-pattern phrase lists the analyzer and ideation already
  use (`data/hook-patterns.json`) against that video's actual spoken hook
  or caption, tallies real hashtag mega-tag-vs-specific ratios
  (`data/hashtag-benchmarks.json`), and finds your real best-scoring video
  via the same `analyzeVideo()` used everywhere else.
- **Creators who don't use hashtags still get a real slide, not an empty
  one.** The hashtag mix was originally the one stat with no fallback — a
  creator with zero hashtags just saw an empty 0%/0% bar. `extractTopTopics()`
  now pulls real recurring words out of captions and spoken-hook transcripts
  instead (excluding both generic stopwords and, notably, words that are
  themselves part of the curated hook-pattern phrases — e.g. "nobody tells
  you" — so a creator who leans on those proven patterns a lot doesn't get
  "nobody" and "tells" surfaced as fake topics). When `hasHashtags` is false,
  the slide and the AI prompt both switch to these real topics instead of
  ever mentioning hashtags.
- **The AI only writes flavor text around those real numbers** — a
  personality label (e.g. "The Curiosity Loop"), a tagline, and one caption
  per slide — using the same BYOK provider system as Tailored Feedback
  (`lib/providers.ts`'s `generateCreatorWrappedNarrative`,
  `app/api/creator-wrapped/route.ts` as a stateless passthrough). The
  system prompt explicitly forbids inventing stats; it's told to react to
  the real numbers given, not analyze on its own.
- **A "Your Totals" slide** sums real likes, comments, and saves across
  every video in the batch (`totalLikes`/`totalComments`/`totalSaves` on
  `WrappedStats`) — genuinely additive across the videos you pasted, not a
  per-video average. The best-video card on the engagement slide now shows
  that video's real full caption/description and its real hashtags too,
  not just its score.
- **Three more slides check more of what's already fetched, going further
  than the original 6-slide deck**, all still computed locally with the AI
  only reacting in flavor text — no new scraping, since every input here
  was already sitting in `TikTokVideoData` from `lib/tiktok.ts`:
  - **"Your Format"** — average real video length across the batch, styled
    as Quick-Hit / Sweet-Spot / Long-Form using the same 15s/35s cutoffs
    `scoreStructure()` already treats as short/long for a hook-driven
    format, so the wrap agrees with the analyzer instead of inventing its
    own thresholds.
  - **"Your Rhythm"** — reuses `lib/timing.ts`'s `recommendPostingTime()`
    (the same function that powers the idea-check "best time to post"
    panel) against this batch's own real post timestamps + engagement, so
    the recommended window is either grounded in the creator's own history
    or transparently labeled as the general benchmark when there isn't
    enough of it yet. Alongside it, a real average days-between-posts
    figure from the batch's own timestamp spread (only shown when there
    are at least 2 usable timestamps spanning real time — a single day's
    batch has no real cadence to report).
  - **"Your Reach"** — tallies each real video's reach tier
    (nano/micro/rising/viral/mega, the same tiers `analyzeVideo()` already
    assigns) into a distribution instead of only surfacing the single best
    video, plus a real saves-per-like ratio. Save rate is flagged as
    notably high past a heuristic threshold (saves are a stronger "worth
    coming back to" signal than likes, since someone saved it to revisit)
    — this threshold is a heuristic, not a curated benchmark, since no
    public dataset exists for "typical" save rate by niche.
- **Needs at least 3 real videos** (`hasEnoughVideosForWrapped`,
  `MIN_VIDEOS_FOR_WRAPPED`) to say anything meaningful about a pattern —
  same reasoning as the analyzer's "not enough plays yet" floor, just
  applied to a batch instead of one video.
- **The submit button requires a provider key already set** on the same
  page's key bar — no second key-entry form inside the deck itself.
- The final slide is downloadable/shareable as a real PNG
  (`lib/wrappedCard.ts`, the same canvas-export pattern as
  `lib/shareCard.ts`).
- **A per-persona visual theme, automatically picked — never a manual
  picker.** Each of the 7 real hook patterns plus "balanced" gets its own
  color pair and a small mascot (`lib/wrappedPersona.ts`'s
  `PERSONA_THEMES`, keyed by `WrappedStats.dominantPattern`) — the deck's
  card header, slide backgrounds, badges, and the reveal-slide mascot all
  key off whichever pattern the batch's *real* stats actually produced.
  This is purely cosmetic skinning layered on top of real data, not a new
  data source — no user ever picks their "type," the app decides it the
  same way it decides the personality label copy prompt.
- **The reveal slide has a mascot, not just text.** `components/
  WrappedMonster.tsx` renders an SVG creature whose eyes/mouth/eyebrows/
  arms/head decoration are all driven by the persona theme (e.g. the
  Contrarian's mascot has angry brows and horns; the POV Specialist's has
  one eye). `lib/wrappedMonsterCanvas.ts` mirrors the exact same
  coordinate-space drawing onto the downloadable share card's canvas, so
  the deck and the PNG you actually download never drift apart into two
  different mascots.
- **Swipeable, jumpable, keyboard-navigable.** Slides respond to
  left/right arrow keys, a pointer-drag swipe gesture (release past a
  small threshold to advance/go back, otherwise it snaps back), and
  clicking any pagination dot jumps straight to that slide — not just
  sequential Back/Next.
- **Count-up numbers and a real donut chart**, not static text: the
  totals and engagement slides animate their numbers up from zero on
  entry, and the format slide's average-length figure is drawn as a
  progress ring against TikTok's real 10-minute (600s) length cap, on a
  square-root scale so typical short-form videos still read as a visible
  slice instead of a flat line (see "Real feedback" below for why it's
  600s and not 60s).

**Real feedback from using the redesigned deck**:
- **"Direct callouts" was confusing** — the label named a copywriting
  technique (phrases like "are you," "if you") that isn't obvious from
  the outside. First replaced with a "Collabs & shoutouts" hook-pattern
  badge detecting real `@mentions`, but a collab isn't really a *hook*
  pattern — it's a separate relationship signal, and squeezing it into a
  percentage badge next to genuine hook patterns buried the actual list
  of who got tagged. So it was pulled out of the Hooks slide entirely
  and given its own **"Your Collabs"** slide: every real `@mentioned`
  handle found in captions (excluding the creator's own), ranked by how
  many videos tagged them, with the most-repeated collaborator called
  out up top. `lib/analyze.ts`'s real per-video hook scoring is
  unaffected either way — it still uses the original curated
  `calloutPhrases` list from `data/hook-patterns.json`, a separate valid
  use of that data. The Hooks slide personality quiz is back to the
  6 genuine hook patterns (curiosity/urgency/contrarian/POV/numbers/CTA)
  plus balanced.
- **Hashtags only showed a single "most-used tag" badge** — now the
  Hashtags slide shows a real ranked list of the batch's hashtags with
  how many videos used each (`WrappedStats.topHashtagUsage`), not just
  the single top one.
- **A 59s video filled the whole format ring** — the ring's reference
  length was hardcoded to 60s, when TikTok actually allows videos up to
  10 minutes. Fixed by rescaling against the real 600s cap (see above).
- **The active daypart chip's pulse animation was too large** — `scale(1.4)`
  read as a jarring wobble for a small pill-shaped chip. Toned down to
  `scale(1.06)`.
- **The card felt small on screen** — grown from 400×700px to 480×820px.

## Why there's no landing page, onboarding, progress page, or gamification

Earlier iterations of this project added a marketing landing page at `/`, a
3-step onboarding wizard, a personal progress page with badges and a
score-history sparkline, and (before that) a daily-streak mechanic and a
cross-user leaderboard/referral concept. All of it was real (no fake data,
no mocked leaderboard), but it added structure and visual surface area the
app didn't need: more routes to navigate, more places for the header to
change shape, more UI competing with the two things this project actually
does. It was removed so the app is just the analyzer and the ideation tool,
reachable immediately with no wizard in between.

The leaderboard/referral concept specifically was dropped rather than
shipped as decorative mock data for a separate reason: both fundamentally
require knowing about *other* real people, which is a real backend and
account system — conflicting with this project's founding constraint of no
database, nothing kept server-side (see "Constraints this project honors"
below). If a real leaderboard is ever worth doing, it would need an
explicit, opt-in, lightweight backend (e.g. a free-tier KV store just for a
"submit my score" leaderboard) — a deliberate scope change from this
project's current zero-backend design, not something to bolt on quietly.

## Boosting an already-posted video

`lib/boost.ts` + `components/BoostPanel.tsx` (shown under the score
breakdown on `/`) answer a different question than the rest of the
analyzer: not "why did this score what it scored," but "what can I still
*do* to this exact post." TikTok allows editing a caption/hashtags after
posting and pinning a comment, so a video that's already live isn't
frozen — this surfaces only actions that are actually still possible
(never a suggestion to change something that can't change post-publish,
like the original post time or the footage itself):

- Swap oversaturated hashtags / add a missing niche tag, reusing the same
  curated benchmark data the rest of the app already grounds itself in.
- Pin a comment with a call-to-action when neither the caption nor a
  transcript has one.
- Nudge to reply to comments when the comment-to-like ratio is unhealthy.
- Nudge to cross-post to Instagram Reels / YouTube Shorts when the video
  has already reached a viral/mega reach tier — real, immediate leverage
  on proven traction, not a generic "post more" tip.

If a real leaderboard is ever worth doing, it would need an explicit,
opt-in, lightweight backend (e.g. a free-tier KV store just for a
"submit my score" leaderboard) — a deliberate scope change from this
project's current zero-backend design, not something to bolt on quietly.

## Constraints this project honors

- **No database.** The pattern library lives in versioned JSON files
  (`data/`). There is no per-user state kept anywhere server-side — API keys
  live in the browser, not on our servers.
- **Free to run.** Deploys on Vercel's free Hobby tier. No paid APIs are in
  this project's own critical path — ideation cost is billed to the user's
  own key.
- **No scraping of Google Trends / Reddit / Etsy.** The only external
  fetches are TikTok's own public pages for the exact video or profile URL a
  user submits, plus the LLM provider a user explicitly chooses.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploying

Push this repo to Vercel (free Hobby tier, no credit card needed) — it
auto-detects Next.js, no configuration required.

## Known limitations

- **TikTok's page markup changes over time.** All of that fragility is
  isolated to `lib/tiktok.ts`, which walks the embedded page data looking
  for an item-shaped object rather than hardcoding an exact JSON path, to
  reduce (not eliminate) how often this needs fixing. If video fetches start
  failing, this is the first file to check.
- **This reads only publicly available page data for URLs users explicitly
  submit.** It isn't affiliated with or endorsed by TikTok, and sits in the
  same legal posture as the many existing free "TikTok analytics" tools —
  not officially sanctioned, but not scraping anything a browser visiting
  that URL wouldn't already see.
- **Live TikTok fetching was not exercised against the real site during
  development** (this was built in a sandboxed environment with no network
  access to tiktok.com or any LLM provider). The video scraper, profile
  scraper, provider integrations, and UI were all verified end-to-end with
  mocked response data. Test against a handful of real video/profile URLs
  and a real API key after the first deploy.
- **A plain fetch to a TikTok profile page reliably gets bio/follower count
  but usually not the video list — confirmed against real accounts up to
  129M followers (MrBeast), not just a theoretical risk.**
- **To work around that, `lib/tiktokProfileBrowser.ts` renders the profile
  page in a real headless browser** (`puppeteer-core` + `@sparticuz/chromium`
  in production, full `puppeteer` for local dev — see the file for why two
  packages) instead of a plain fetch, so the request looks like genuine
  traffic and executes TikTok's own JS. It intercepts TikTok's internal
  `api/post/item_list` / `api/user/detail` responses directly (real,
  properly-signed data, sidestepping the need to replicate TikTok's signing
  scheme ourselves) and also falls back to parsing the rendered page's
  hydration JSON via the same `findUserInfo`/`findItemList` walkers
  `lib/tiktokProfile.ts` already used. A plain fetch remains the fallback if
  the browser path fails outright (Chromium unavailable, internal deadline
  exceeded).
- **Even that returned bio-only data for a 129M-follower account tested
  from a residential IP**, which ruled out datacenter-IP reputation as the
  (sole) cause — pointing instead at TikTok detecting Puppeteer-controlled
  Chromium itself (`navigator.webdriver` and similar automation
  fingerprints). Both browser-launch paths are now wrapped with
  `puppeteer-extra` + `puppeteer-extra-plugin-stealth`, which patches the
  fingerprints bot detection commonly checks for. This is a genuinely
  different lever than the previous two attempts, not a repeat — but still
  unconfirmed against the live site from this sandbox, and not guaranteed
  to work; TikTok's anti-bot measures evolve continuously.
- **This has a real, unresolved tension with the free-tier constraint.**
  Vercel's Hobby (free) plan has a **hard 10-second function timeout that
  cannot be raised** — launching Chromium, navigating, and waiting for a
  heavy page to hydrate is a tight fit inside that window, especially on a
  cold start (no recent invocation, so Chromium has to be decompressed and
  launched from scratch). `lib/tiktokProfileBrowser.ts` is tuned for speed
  (blocks images/fonts/media, short navigation timeout, an internal ~7.5s
  deadline that covers *launch and render together* so it can fail
  gracefully back to a plain fetch instead of getting hard-killed) but
  **will still time out some fraction of the time on Hobby, especially cold
  starts.** `app/api/fetch-profile/route.ts` sets `maxDuration = 10` to
  match Hobby's ceiling; raising it only helps on a paid Vercel plan, and
  the internal deadline constant would need raising too.
- **components/ProfileSummary.tsx** shows exactly what was read (bio,
  hashtags, captions, engagement) right after every profile fetch, with an
  explicit warning distinguishing "nothing at all" from "bio only, no video
  data even after trying the headless-browser path" — the latter is now a
  much stronger signal of TikTok genuinely not serving that data to this
  request, not a parsing bug. `lib/ideate.ts` treats bio-only context as
  much weaker signal than real captions/hashtags, and is told to read the
  bio literally rather than defaulting to the assistant's own side-hustle
  specialty when that's all that's available.
- **Stealth didn't resolve it either** — the same 129M-follower account
  still returned bio-only data even with the stealth plugin active. After
  three attempts (parser improvements, plain headless browser, headless +
  stealth) all hitting the same wall, profile-page video-list scraping is
  now treated as a hard, likely-permanent ceiling rather than something to
  keep escalating against. This is *why* the ideation form's primary
  grounding mechanism changed from "paste your profile" to "paste 1-25 of
  your own video links" (`lib/tiktokVideoBatch.ts`): single-video pages
  have never failed to return real data all session, so aggregating across
  a creator's own hand-picked videos sidesteps profile-page detection
  entirely instead of continuing to fight it. The profile-scraping code
  (`lib/tiktokProfile.ts`, `lib/tiktokProfileBrowser.ts`) is kept only for
  its still-reliable bio/follower-count lookup, now explicitly supplementary.

## Real transcript grounding: ideation and the analyzer

The first attempt at this fed a proxied copy of each video's own mp4 bytes
into an in-browser Whisper model (`@huggingface/transformers`) — that hit a
real ONNX quantization bug in the decoder ("Missing required scale ...
embed_tokens ... DequantizeLinear") on top of needing a CDN hostname
allowlist tuned against real traffic, both learned by testing against real
TikTok links after deploy. Given this project's bias toward simplicity and
few dependencies (see the profile-scraping saga above), that whole pipeline
was replaced with something much simpler: `lib/tiktok.ts` now looks for each
video's own auto-generated caption/subtitle track (TikTok's item data can
include a WebVTT/SRT track alongside the mp4) and, when present, fetches and
parses just the cues from the first ~15 seconds — no audio decoding, no ML
model, no client-side download at all.

This transcript now grounds both modes:
- **Ideation** (`lib/ideate.ts`) injects it into the prompt as a stronger
  real-voice signal than caption text alone.
- **The analyzer** (`lib/analyze.ts`'s `scoreHook()`) scores the real
  transcript instead of the caption when one is available — captions are
  often written differently than what's actually said, so a video with a
  readable subtitle track now gets graded on what it actually opens with,
  not a proxy for it. The caption still feeds the call-to-action check,
  since a CTA often lives in writing rather than speech. Falls back to the
  caption exactly as before when no transcript is available.

**Not exercised against the live site from this sandbox** (no network access
to tiktok.com here) — `npx tsc --noEmit`, `npm run lint`, and `npm run build`
all pass, but the exact key/shape of TikTok's subtitle-track data in
`findSubtitleTrack` (`lib/tiktok.ts`) is a guess based on the field names
used elsewhere in TikTok's ecosystem, not confirmed against a real page —
and many videos won't have a caption track at all, in which case ideation
silently falls back to captions/hashtags only, same as today. Smoke-test
against a handful of real video URLs (ideally including at least one with
captions/subtitles turned on) after deploy.

**Real bug found this way**: a user reported Creator Wrapped showing 100%
"Questions" across videos that plainly didn't ask any. Root cause:
auto-generated captions mark inaudible/low-confidence words and non-speech
events with bracketed placeholders (`[?]`, `[inaudible]`, `[Music]`,
`(laughs)`) — `extractHookTranscript` (`lib/tiktok.ts`) only stripped
`<...>` tags, so a `[?]` placeholder for a word the model couldn't make out
left a literal `?` sitting in the transcript, which every question-detection
check downstream (the real hook scorer, Creator Wrapped) read as "this video
asks a question." Fixed by also stripping `[...]` and `(...)` content before
joining cue text. This is exactly the class of bug the "not confirmed
against a real page" caveat above is warning about — worth specifically
re-checking transcripts from real videos with auto-captions on after deploy.

Even after that fix, the underlying design was still fragile: detecting
"Questions" from a single `?` character is inherently one stray character
away from being wrong again (a different caption format, a URL in a
caption, anything). Wrapped's "Questions" pattern was replaced outright
with **POV setups** (`lib/creatorWrapped.ts`'s `POV_PATTERN`, `/\bpov\b/i`)
— matched on an actual word with a word boundary (not a bare substring, so
it doesn't false-positive on "poverty"), and one of the most recognizable
TikTok hook conventions there is. The lesson generalized: prefer matching
real words/phrases over punctuation for anything derived from
auto-generated transcript text.
