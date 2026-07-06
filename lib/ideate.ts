import hookPatterns from "@/data/hook-patterns.json";
import hashtagBenchmarks from "@/data/hashtag-benchmarks.json";
import type { VideoIdea } from "@/lib/providers";
import type { CreatorProfileSummary } from "@/lib/tiktokProfile";

/** "similar" = close follow-ups/extensions of the pasted videos. "different" = same niche/voice, but new premises not already covered. */
export type IdeationMode = "similar" | "different";

export interface IdeateInput {
  niche: string;
  goal: string;
  mode: IdeationMode;
  creatorContext?: CreatorProfileSummary | null;
  videoTranscripts?: string[];
  previousIdeas?: VideoIdea[];
  refinement?: string;
}

export function buildSystemPrompt(mode: IdeationMode): string {
  const [minTags, maxTags] = hashtagBenchmarks.idealCountRange;

  const relationToReferenceBullet =
    mode === "similar"
      ? "CRITICAL: this batch should be CLOSELY RELATED to the specific real captions/videos/transcripts given below — direct follow-ups, sequels, or new instances of the same specific formats/scenarios/running jokes already shown, not unrelated new premises. Reuse the same specific scenarios or formats where natural (e.g. another video in the same challenge format, another reaction in the same style) — the goal is more of what's already resonating with this creator's real audience, not novelty for its own sake. The 5 ideas must still be distinct from EACH OTHER (different specific angles/moments), not identical repeats of the same single video."
      : "CRITICAL: any real captions/videos/spoken transcripts given below are reference material for tone, niche, and voice ONLY — never templates to riff on. Each of the 5 ideas must be a genuinely new premise, scenario, or angle that does not closely resemble any single reference. If a reference caption or transcript is about a specific joke, event, or moment (a baptism, a pet fact, a specific product shot), do not generate variations of that same specific scenario — invent different concrete scenarios that a person with that same niche/voice would plausibly make, not remixes of what they already posted. 'Same niche' means the same general subject and audience, not the same joke or moment repeated with small edits. 'A new angle on the same real occurrence' is NOT a new premise — it is this exact failure, just disguised as analysis: if a reference transcript is a reaction to a specific real event (a specific earthquake, a specific match, a specific controversy, a specific charity drive), an idea that discusses, analyzes, reflects on, or calls for help/action about THAT SAME event is still a remix, even if it sounds more general or adds commentary. A genuinely different idea reacts to a DIFFERENT hypothetical occurrence of the same kind (a different match, a different news story, a different cause) that this creator would plausibly cover next, in the same reactive/opinionated style — never a follow-up, analysis, or call-to-action about the specific occurrence already given.";

  const coverageBullet =
    mode === "similar"
      ? "CRITICAL: read ALL the reference captions/transcripts given, not just the one with the clearest hook. Before writing any ideas, mentally number the distinct reference items (captions + transcripts together). Assign each of the 5 ideas to a DIFFERENT reference item as its primary basis wherever there are enough distinct items to do so — no single reference item should be the basis for more than 2 of the 5 ideas. The goal is follow-ups that cover this creator's real range (multiple formats/topics they've actually posted), not 5 sequels to just one of the videos given."
      : "CRITICAL: read ALL the reference captions/transcripts given, not just the one with the clearest hook or the one that's easiest to riff on. Before writing any ideas, mentally number the distinct reference items (captions + transcripts together). Assign each of the 5 ideas to a DIFFERENT reference item as its primary inspiration wherever there are enough distinct items to do so — no single reference item should be the primary basis for more than 2 of the 5 ideas. Fixating the entire batch on whichever one reference item seemed most novel is exactly the near-duplication problem the previous rule warns against, just spread across 5 ideas instead of concentrated in one — it is just as much a failure.";

  return [
    "You are a TikTok virality expert. Your default specialty is side-hustle, affiliate-marketing, dropshipping, and faceless-content creators — but that is only a FALLBACK for when no real niche signal exists. It must never override real signal: if the user states a niche/goal, or gives real creator profile data (even just a bio), that always wins, even if their actual content has nothing to do with side-hustles or making money.",
    "Generate concrete, specific, immediately-postable video concepts — never generic advice like 'post consistently' or 'know your audience'.",
    "",
    "CRITICAL: all 5 ideas in one response must be about the SAME niche/topic — they should differ in hook angle, not subject matter. Never mix unrelated topics across the batch (e.g. do not generate one idea about relationships, another about breakfast, another about shoes). Every idea must plausibly belong to the same creator's account.",
    "",
    "CRITICAL: 'same niche/topic' does not mean 'same literal subject' for every creator — read ALL the reference material as a whole before deciding which kind of creator this is. Some creators do have one genuine subject-matter niche (skincare, side hustles, fitness) — for those, keep every idea on that same subject. But other creators' real 'niche' IS a format or persona rather than a subject: multi-character comedic skits, reactive commentary on whatever random news/sports/finance is happening, absurdist scenes — where the subject is DELIBERATELY different every video (a customer-service skit today, a pawnshop skit tomorrow, a reaction to unrelated news the day after). If the real reference captions/transcripts given span clearly unrelated subjects with no single common topic tying them together (e.g. one video is a resort skit, another is a national-ID-exam joke, another is a reaction to sports/finance news, another is a pawnshop scene), that variety IS the real pattern — this is a sketch-comedy/reactive creator, not a travel/finance/ID-document niche account. Inventing a single subject-matter niche from whichever one reference item had the clearest theme (e.g. deciding this must be a 'travel blogger' because one skit happened to be set at a resort) and forcing the other 4 ideas into that same invented subject is exactly the failure this rule exists to prevent — it just moves the fixation from one VIDEO to one invented TOPIC. For this kind of creator, 'same niche' means the same FORMAT and persona (new comedic scenes with new characters, new reactive takes on new random subjects), with genuinely varied subjects across the 5 ideas — matching the real variety already shown, never collapsing it into one topic none of the other reference videos actually support.",
    "",
    "CRITICAL: match the creator's authentic voice and personality — their humor style, catchphrases, self-deprecating jokes, playfulness or seriousness — using ALL of their real captions, not just the one that happens to mention the product/niche. Real creators are rarely 100% on-niche; a caption about a joke, a family event, or a pet says just as much about their real voice as a branded one does. If their non-branded content is playful, comedic, sarcastic, or irreverent, every idea — including ones about a sponsored product — must sound like that same person talking, never like generic ad copy or a disconnected 'brand voice'. A creator who jokes about their own haters or makes silly pet jokes should still sound exactly like themselves when promoting something.",
    "",
    "CRITICAL: match the creator's real content FORMAT, not just their tone. Look at what the reference captions/transcripts actually ARE — a staged skit or narrated scene (e.g. play-acting a conversation, a POV reveal, a prank), a direct-to-camera opinion/rant, a listicle, a demo — and generate more of THAT format. Do not default every idea to a generic 'sharing my opinion on X / here's the truth about X' talking-head structure unless that's genuinely what the reference material shows. A creator whose real video is a playful staged scene (e.g. pretending to reveal news to someone, a role-played conversation) should get ideas that are new staged scenes/premises in that same theatrical style, not a switch to sincere direct-address commentary — the format shift alone makes an idea feel disconnected from the creator even if the topic is right.",
    "",
    "CRITICAL: a transcript containing back-and-forth dialogue between implied different characters/voices (e.g. a customer and a worker, an inspector and someone hiding something, two people bartering) is a staged multi-character skit, not a monologue. The correct output for that is a NEW skit premise with its own characters and scenario — the hook/caption should read as a scene or a line of in-character dialogue, never as a single narrator explaining, analyzing, or giving tips about a topic straight to the viewer. If most or all of the reference transcripts given are dialogue-based skits like this, all 5 ideas must also be dialogue-based skits — turning them into 'here's what you should know about X' explainer videos is a format failure even if the hashtags and general subject area happen to line up.",
    "",
    relationToReferenceBullet,
    "",
    coverageBullet,
    "",
    "CRITICAL: never force-combine two unrelated reference items into one contrived idea (e.g. taking a phrase about courage from a sports reaction and awkwardly applying it as a 'lesson' for an unrelated topic like game design ethics) — if a bridge between two real moments wouldn't make sense as something this person would actually say, don't build it. Likewise, never lift a creator's exact catchphrase or caption wording and transplant it onto an unrelated topic just to sound familiar (e.g. reusing the exact words of a personal-challenge caption as the hook for a completely different subject) — a real catchphrase only belongs in a new instance of the SAME kind of content it originally described. This same failure also happens at the niche level, not just the scenario level: reinterpreting an unrelated reference video (a pawnshop skit, a sports reaction) as if it were secretly about the one invented subject-matter niche you picked (e.g. turning a skit about a grandmother's jewelry into 'how hotels make guests feel special' because you'd already decided this is a travel account) is the same contrivance, just dressed up as a rationale.",
    "",
    "Ground every hook in these proven patterns where relevant (mix them, don't force all of them into every idea) — these are structural templates for phrasing, not topic ideas, and they must be adapted to the creator's real format (e.g. a curiosity gap can be a line of dialogue inside a staged scene, not necessarily spoken straight to camera as meta-commentary):",
    `- Curiosity gaps: ${hookPatterns.curiosityPhrases.slice(0, 8).join(", ")}`,
    `- Urgency: ${hookPatterns.urgencyPhrases.slice(0, 5).join(", ")}`,
    `- Contrarian angles: ${hookPatterns.contrarianPhrases.slice(0, 5).join(", ")}`,
    `- Direct callouts: ${hookPatterns.calloutPhrases.slice(0, 5).join(", ")}`,
    "- Avoid filler openers like 'hey guys, so today...' — start on the hook immediately.",
    "- Include a specific number where plausible (a dollar amount, a day count, a percentage) — specificity outperforms vague claims.",
    "",
    `For hashtags: suggest ${minTags}-${maxTags} per idea. Prefer niche-specific tags (examples: ${hashtagBenchmarks.sideHustleNicheTags.slice(0, 10).join(", ")}) over oversaturated ones (${hashtagBenchmarks.megaTags.join(", ")}) — but only if the niche is actually side-hustle/affiliate related. Otherwise use hashtags that fit the creator's real niche instead.`,
    "",
    "Match the creator's language (e.g. if their real bio/captions are in Spanish, respond in Spanish).",
    "",
    "Always call the submit_video_ideas tool/function with your response — never respond in plain text.",
  ].join("\n");
}

function formatCreatorContext(context: CreatorProfileSummary, mode: IdeationMode): string {
  const lines = [
    `Creator: @${context.handle}${context.nickname ? ` (${context.nickname})` : ""}`,
  ];
  if (context.bio) lines.push(`Bio: ${context.bio}`);
  if (context.followerCount > 0) lines.push(`Followers: ${context.followerCount.toLocaleString()}`);
  if (context.topHashtags.length > 0) lines.push(`Hashtags they already use: ${context.topHashtags.join(", ")}`);
  if (context.avgEngagementRate > 0) {
    lines.push(`Average engagement rate on recent videos: ${(context.avgEngagementRate * 100).toFixed(1)}%`);
  }
  if (context.recentCaptionSamples.length > 0) {
    lines.push(
      mode === "similar"
        ? "Recent captions — read ALL of them, not just whichever one mentions a product. Use these as direct source material for follow-up/extension ideas:"
        : "Recent captions — reference for real voice/personality/humor style ONLY, read ALL of them, not just whichever one mentions a product. Do not rephrase, remix, or generate variations of these specific captions/scenarios — invent new ones:"
    );
    for (const sample of context.recentCaptionSamples.slice(0, 5)) lines.push(`  - "${sample}"`);
  }
  return lines.join("\n");
}

type ContextRichness = "rich" | "thin" | "none";

/**
 * TikTok often only exposes bio/follower count to a plain page fetch —
 * the actual video list is frequently lazy-loaded behind signed API calls
 * we can't replicate (see lib/tiktokProfile.ts). "Thin" context (bio only,
 * no captions/hashtags) is real signal but much weaker, and needs an
 * explicitly different instruction than "rich" context — otherwise the
 * model tends to fall back to the assistant's own side-hustle specialty
 * instead of actually reading the bio.
 */
function contextRichness(context: CreatorProfileSummary | null | undefined): ContextRichness {
  if (!context) return "none";
  if (context.topHashtags.length > 0 || context.recentCaptionSamples.length > 0) return "rich";
  if (context.bio.length > 0 || context.followerCount > 0) return "thin";
  return "none";
}

export function buildUserPrompt(input: IdeateInput): string {
  const parts: string[] = [];
  const niche = input.niche.trim();
  const goal = input.goal.trim();
  const context = input.creatorContext;
  const richness = contextRichness(context);
  const mode = input.mode;

  if (niche) parts.push(`Niche / what they promote: ${niche}`);
  if (goal) parts.push(`Goal: ${goal}`);

  if (context && richness !== "none") {
    parts.push("");
    if (richness === "rich") {
      parts.push(
        "Real creator profile data — this is the authoritative source for their actual niche and topic. Base every idea on this, not on a generic side-hustle/affiliate default:"
      );
    } else {
      parts.push(
        "Only limited profile data was readable — a bio and/or follower count, no recent captions or hashtags. This is still real signal, just thin: read the bio literally and infer the closest plausible real-world niche from it. Do NOT default to side-hustle/affiliate/make-money content unless the bio actually indicates that — a bio about being a parent, a hobby, a place, a relationship, etc. means THAT is the niche:"
      );
    }
    parts.push(formatCreatorContext(context, mode));
  }

  if (input.videoTranscripts && input.videoTranscripts.length > 0) {
    parts.push("");
    parts.push(
      mode === "similar"
        ? "Spoken-word transcripts from the first ~15 seconds of some of these real videos (from each video's own caption/subtitle track) — this is what the creator actually SAYS on camera in the hook. Use these as direct source material for follow-up/extension ideas, building on these same specific scenarios/deliveries where natural:"
        : "Spoken-word transcripts from the first ~15 seconds of some of these real videos (from each video's own caption/subtitle track) — this is what the creator actually SAYS on camera in the hook, a stronger real-voice signal than the written caption text alone (captions are often written differently than how someone talks). Use it to match their real speaking style and delivery, but do not quote or closely rephrase these specific lines — invent new premises delivered in that same style:"
    );
    input.videoTranscripts.forEach((transcript, i) => parts.push(`  ${i + 1}. "${transcript}"`));
  }

  if (!niche && richness === "none") {
    parts.push("");
    parts.push(
      "No specific niche was given and no usable profile data was found — default to general TikTok side-hustle / affiliate-marketing / gig-promotion content, and keep all 5 ideas within that single niche."
    );
  }

  if (input.previousIdeas && input.previousIdeas.length > 0 && input.refinement) {
    parts.push("");
    parts.push("Previously generated ideas:");
    input.previousIdeas.forEach((idea, i) => {
      parts.push(`${i + 1}. Hook: "${idea.hook}" | Caption: "${idea.caption}" | Tags: ${idea.hashtags.join(", ")}`);
    });
    parts.push("");
    parts.push(`The creator's feedback on those ideas: "${input.refinement}"`);
    parts.push("Generate a new set of 5 ideas that incorporates this feedback, staying within the same niche as before.");
  } else {
    parts.push("");
    parts.push(
      mode === "similar"
        ? "Generate 5 video ideas that are close follow-ups/extensions of the specific videos/captions given above — same formats, same kinds of scenarios, capitalizing on what's already resonating, not unrelated new premises. Distinct hooks and angles from each other, but all on the SAME niche — remember, for a sketch/reactive creator that means the same format and persona, not the same literal subject."
        : "Generate 5 video ideas that are clearly DIFFERENT from the specific videos/captions given above — same niche/voice, but new scenarios/premises this creator hasn't already posted, not close variations of what's shown. Distinct hooks and angles from each other, but all on the SAME niche as this creator actually has — if the reference material above shows varied, unrelated real subjects tied together only by format/persona (sketch comedy, reactive commentary), the 5 ideas should be similarly varied in subject, not forced onto one invented topic none of the reference material actually supports."
    );
  }

  return parts.join("\n");
}
