import type { HookPatternKey } from "@/lib/creatorWrapped";

export type PersonaKey = HookPatternKey | "balanced";

export type EyeMode = "one" | "two" | "wink";
export type MouthMode = "smile" | "zigzag" | "flat" | "open";
export type BrowMode = "none" | "angry" | "raised";
export type TopDeco = "none" | "antenna" | "horns" | "mohawk" | "partyHat";
export type ArmsStyle = "default" | "crossed" | "pointing" | "cupped";
export type BeltDeco = "none" | "bolt" | "dots" | "target" | "patches";

export interface MonsterPatch {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill: string;
}

/** Raw per-persona monster config — purely cosmetic theming, not derived from any real data. */
export interface MonsterConfig {
  name: string;
  bodyColor: string;
  bellyColor: string;
  eyeMode: EyeMode;
  mouth: MouthMode;
  brow: BrowMode;
  topDeco: TopDeco;
  armsStyle: ArmsStyle;
  beltDeco: BeltDeco;
  soundWaves?: boolean;
  glasses?: boolean;
  bowtie?: boolean;
  patches?: MonsterPatch[];
}

/** Boolean flags derived from MonsterConfig — this is the shape both the SVG renderer and the canvas share-card drawer consume, so the two never drift from each other. */
export interface MonsterFlags {
  name: string;
  bodyColor: string;
  bellyColor: string;
  isOneEye: boolean;
  isTwoEye: boolean;
  isWink: boolean;
  isSmile: boolean;
  isZigzag: boolean;
  isFlat: boolean;
  isOpen: boolean;
  hasSoundWaves: boolean;
  hasGlasses: boolean;
  hasBowtie: boolean;
  browAngry: boolean;
  browRaised: boolean;
  topAntenna: boolean;
  topHorns: boolean;
  topMohawk: boolean;
  topPartyHat: boolean;
  armsDefault: boolean;
  armsCrossed: boolean;
  armsPointing: boolean;
  armsCupped: boolean;
  beltBolt: boolean;
  beltDots: boolean;
  beltPatches: boolean;
  beltTarget: boolean;
  patches: MonsterPatch[];
}

export function buildMonsterFlags(m: MonsterConfig): MonsterFlags {
  return {
    name: m.name,
    bodyColor: m.bodyColor,
    bellyColor: m.bellyColor,
    isOneEye: m.eyeMode === "one",
    isTwoEye: m.eyeMode === "two",
    isWink: m.eyeMode === "wink",
    isSmile: m.mouth === "smile",
    isZigzag: m.mouth === "zigzag",
    isFlat: m.mouth === "flat",
    isOpen: m.mouth === "open",
    hasSoundWaves: !!m.soundWaves,
    hasGlasses: !!m.glasses,
    hasBowtie: !!m.bowtie,
    browAngry: m.brow === "angry",
    browRaised: m.brow === "raised",
    topAntenna: m.topDeco === "antenna",
    topHorns: m.topDeco === "horns",
    topMohawk: m.topDeco === "mohawk",
    topPartyHat: m.topDeco === "partyHat",
    armsDefault: m.armsStyle === "default",
    armsCrossed: m.armsStyle === "crossed",
    armsPointing: m.armsStyle === "pointing",
    armsCupped: m.armsStyle === "cupped",
    beltBolt: m.beltDeco === "bolt",
    beltDots: m.beltDeco === "dots",
    beltPatches: m.beltDeco === "patches",
    beltTarget: m.beltDeco === "target",
    patches: m.patches ?? [],
  };
}

export interface PersonaTheme {
  color: string;
  color2: string;
  emoji: string;
  isBalanced: boolean;
  monster: MonsterConfig;
}

export const BALANCED_RAINBOW_STOPS = ["#00E5FF", "#7C5CFF", "#FF3B5C", "#FFB020", "#1FD693"];
export const BALANCED_RAINBOW =
  "linear-gradient(135deg, #00E5FF 0%, #7C5CFF 24%, #FF3B5C 48%, #FFB020 72%, #1FD693 100%)";

/**
 * One visual "type" per real dominant hook pattern (plus a balanced/no-single-pattern
 * theme) — purely cosmetic skinning driven by data this app already computes
 * (WrappedStats.dominantPattern), never a user-facing picker. Colors/monster
 * traits themselves carry no data — only the label, numbers, and AI captions do.
 */
export const PERSONA_THEMES: Record<PersonaKey, PersonaTheme> = {
  curiosity: {
    color: "#00E5FF",
    color2: "#B8F7FF",
    emoji: "🤔",
    isBalanced: false,
    monster: {
      name: "Blinky",
      bodyColor: "#00E5FF",
      bellyColor: "#B8F7FF",
      eyeMode: "two",
      mouth: "smile",
      brow: "none",
      topDeco: "antenna",
      armsStyle: "default",
      beltDeco: "none",
    },
  },
  contrarian: {
    color: "#FF3B5C",
    color2: "#FFD2DC",
    emoji: "🔥",
    isBalanced: false,
    monster: {
      name: "Snarl",
      bodyColor: "#FF3B5C",
      bellyColor: "#FFD2DC",
      eyeMode: "two",
      mouth: "zigzag",
      brow: "angry",
      topDeco: "horns",
      armsStyle: "crossed",
      beltDeco: "none",
    },
  },
  urgency: {
    color: "#FFB020",
    color2: "#FFE7BE",
    emoji: "⏰",
    isBalanced: false,
    monster: {
      name: "Zap",
      bodyColor: "#FFB020",
      bellyColor: "#FFE7BE",
      eyeMode: "two",
      mouth: "open",
      brow: "raised",
      topDeco: "mohawk",
      armsStyle: "default",
      beltDeco: "bolt",
    },
  },
  cta: {
    color: "#7C5CFF",
    color2: "#E1D8FF",
    emoji: "👉",
    isBalanced: false,
    monster: {
      name: "Pointy",
      bodyColor: "#7C5CFF",
      bellyColor: "#E1D8FF",
      eyeMode: "wink",
      mouth: "smile",
      brow: "none",
      topDeco: "none",
      armsStyle: "pointing",
      beltDeco: "none",
    },
  },
  pov: {
    color: "#3D8BFF",
    color2: "#CFE3FF",
    emoji: "👀",
    isBalanced: false,
    monster: {
      name: "Cyclops",
      bodyColor: "#3D8BFF",
      bellyColor: "#CFE3FF",
      eyeMode: "one",
      mouth: "flat",
      brow: "none",
      topDeco: "none",
      armsStyle: "default",
      beltDeco: "none",
    },
  },
  number: {
    color: "#E754FF",
    color2: "#FBD6FF",
    emoji: "🔢",
    isBalanced: false,
    monster: {
      name: "Digit",
      bodyColor: "#E754FF",
      bellyColor: "#FBD6FF",
      eyeMode: "two",
      mouth: "smile",
      brow: "none",
      topDeco: "none",
      armsStyle: "default",
      beltDeco: "none",
      glasses: true,
      bowtie: true,
    },
  },
  balanced: {
    color: "#FFD166",
    color2: "#06D6A0",
    emoji: "🌈",
    isBalanced: true,
    monster: {
      name: "Patchwork",
      bodyColor: "#FFF3D6",
      bellyColor: "#FFD166",
      eyeMode: "two",
      mouth: "smile",
      brow: "none",
      topDeco: "partyHat",
      armsStyle: "default",
      beltDeco: "patches",
      patches: [
        { cx: 46, cy: 82, rx: 12, ry: 11, fill: "#00E5FF" },
        { cx: 114, cy: 82, rx: 12, ry: 11, fill: "#FF3B5C" },
        { cx: 80, cy: 122, rx: 11, ry: 9, fill: "#7C5CFF" },
      ],
    },
  },
};

export function getPersonaTheme(key: PersonaKey): PersonaTheme {
  return PERSONA_THEMES[key];
}
