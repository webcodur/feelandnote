import type { CSSProperties } from "react";

export type CelebThemeId = "regalia" | "archive" | "orbit" | "stage" | "resonance" | "venture" | "arena" | "mythic";
export type CelebThemeEra = "ancient" | "heritage" | "modern";

interface AccentVariant { hex: string; rgb: string }
export interface CelebThemeDefinition {
  id: CelebThemeId;
  labelKo: string;
  labelEn: string;
  description: string;
  accents: readonly AccentVariant[];
  background: string;
  backgroundSecondary: string;
  card: string;
  border: string;
}
export interface CelebThemeInput {
  slug: string;
  profession?: string | null;
  birthDate?: string | null;
  tier?: string | null;
}
export interface ResolvedCelebTheme extends CelebThemeDefinition {
  accent: AccentVariant;
  accentHover: string;
  accentDim: string;
  era: CelebThemeEra;
  variation: number;
  focusX: number;
  angle: number;
}
export interface CelebThemeStyle extends CSSProperties {
  "--color-accent": string;
  "--color-accent-rgb": string;
  "--color-accent-hover": string;
  "--color-accent-dim": string;
  "--color-text-gold": string;
  "--color-bg-main": string;
  "--color-bg-secondary": string;
  "--color-bg-card": string;
  "--color-border": string;
  "--color-border-gold": string;
  "--celeb-theme-focus-x": string;
  "--celeb-theme-angle": string;
}

export const CELEB_THEME_DEFINITIONS: readonly CelebThemeDefinition[] = [
  {
    id: "regalia", labelKo: "왕관의 전당", labelEn: "Regalia Hall",
    description: "지도자와 지휘관의 결단을 담는 황금빛 석조 전당",
    accents: [{ hex: "#d8b45a", rgb: "216, 180, 90" }, { hex: "#e2c06b", rgb: "226, 192, 107" }, { hex: "#cfaa6a", rgb: "207, 170, 106" }],
    background: "#11100e", backgroundSecondary: "#090908", card: "#1c1914", border: "#4a4030",
  },
  {
    id: "archive", labelKo: "잉크의 서고", labelEn: "Ink Archive",
    description: "작가와 인문학자의 문장을 품는 세피아 서고",
    accents: [{ hex: "#d7a86e", rgb: "215, 168, 110" }, { hex: "#dfb982", rgb: "223, 185, 130" }, { hex: "#cfa276", rgb: "207, 162, 118" }],
    background: "#100f0d", backgroundSecondary: "#090806", card: "#1b1813", border: "#493a2b",
  },
  {
    id: "orbit", labelKo: "탐구의 궤도", labelEn: "Orbit of Inquiry",
    description: "과학과 사회를 해석하는 차가운 청색의 관측실",
    accents: [{ hex: "#72b7e7", rgb: "114, 183, 231" }, { hex: "#83c5ee", rgb: "131, 197, 238" }, { hex: "#73aed7", rgb: "115, 174, 215" }],
    background: "#0b1118", backgroundSecondary: "#060a10", card: "#111d28", border: "#29475c",
  },
  {
    id: "stage", labelKo: "장면의 극장", labelEn: "Theatre of Scenes",
    description: "배우와 감독의 시선을 모으는 장밋빛 암전 무대",
    accents: [{ hex: "#e58a9f", rgb: "229, 138, 159" }, { hex: "#ed9caf", rgb: "237, 156, 175" }, { hex: "#dc849a", rgb: "220, 132, 154" }],
    background: "#130d11", backgroundSecondary: "#0a0608", card: "#21131a", border: "#5c3040",
  },
  {
    id: "resonance", labelKo: "공명의 방", labelEn: "Chamber of Resonance",
    description: "음악과 조형의 리듬이 번지는 보랏빛 공명실",
    accents: [{ hex: "#b59bed", rgb: "181, 155, 237" }, { hex: "#c2abf3", rgb: "194, 171, 243" }, { hex: "#aa94dc", rgb: "170, 148, 220" }],
    background: "#100d17", backgroundSecondary: "#08060d", card: "#1a1526", border: "#40345f",
  },
  {
    id: "venture", labelKo: "개척의 공방", labelEn: "Venture Forge",
    description: "기업가와 투자자의 구축 감각을 담는 녹색 공방",
    accents: [{ hex: "#71c9a5", rgb: "113, 201, 165" }, { hex: "#85d6b5", rgb: "133, 214, 181" }, { hex: "#69bb9c", rgb: "105, 187, 156" }],
    background: "#09130f", backgroundSecondary: "#050a08", card: "#102019", border: "#285342",
  },
  {
    id: "arena", labelKo: "승부의 경기장", labelEn: "Arena of Resolve",
    description: "스포츠인의 속도와 긴장을 새긴 적동빛 경기장",
    accents: [{ hex: "#e18a62", rgb: "225, 138, 98" }, { hex: "#ed9c78", rgb: "237, 156, 120" }, { hex: "#d78360", rgb: "215, 131, 96" }],
    background: "#140e0b", backgroundSecondary: "#0a0705", card: "#241711", border: "#603a29",
  },
  {
    id: "mythic", labelKo: "신화의 밤", labelEn: "Mythic Night",
    description: "원전 속 인물과 서사의 여백을 위한 은빛 밤",
    accents: [{ hex: "#a9b7d8", rgb: "169, 183, 216" }, { hex: "#bac6e2", rgb: "186, 198, 226" }, { hex: "#9daed2", rgb: "157, 174, 210" }],
    background: "#090a10", backgroundSecondary: "#04050a", card: "#121522", border: "#343b55",
  },
] as const;

const PROFESSION_THEMES: { readonly [profession: string]: CelebThemeId } = {
  leader: "regalia", politician: "regalia", commander: "regalia",
  humanities_scholar: "archive", author: "archive",
  scientist: "orbit", social_scientist: "orbit",
  director: "stage", actor: "stage", influencer: "stage",
  musician: "resonance", visual_artist: "resonance",
  entrepreneur: "venture", investor: "venture", athlete: "arena",
};
const THEME_BY_ID = new Map(CELEB_THEME_DEFINITIONS.map((theme) => [theme.id, theme]));
const FALLBACK_THEMES = CELEB_THEME_DEFINITIONS.filter((theme) => theme.id !== "mythic");

function hashText(value: string): number {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}
function resolveEra(birthDate?: string | null): CelebThemeEra {
  const year = Number.parseInt(birthDate ?? "", 10);
  if (!Number.isFinite(year) || year >= 1800) return "modern";
  return year < 600 ? "ancient" : "heritage";
}
export function resolveCelebTheme(input: CelebThemeInput): ResolvedCelebTheme {
  const hash = hashText(input.slug);
  const professionTheme = input.profession ? PROFESSION_THEMES[input.profession] : undefined;
  const fallback = FALLBACK_THEMES[hash % FALLBACK_THEMES.length];
  const id = input.tier === "fiction" ? "mythic" : professionTheme;
  const definition = (id && THEME_BY_ID.get(id)) ?? fallback;
  const variation = hash % definition.accents.length;
  return {
    ...definition, accent: definition.accents[variation],
    accentHover: definition.accents[(variation + 1) % definition.accents.length].hex,
    accentDim: definition.border, era: resolveEra(input.birthDate), variation,
    focusX: 25 + (hash % 51), angle: 105 + (hash % 46),
  };
}
export function getCelebThemeStyle(theme: ResolvedCelebTheme): CelebThemeStyle {
  return {
    "--color-accent": theme.accent.hex, "--color-accent-rgb": theme.accent.rgb,
    "--color-accent-hover": theme.accentHover, "--color-accent-dim": theme.accentDim,
    "--color-text-gold": theme.accent.hex, "--color-bg-main": theme.background,
    "--color-bg-secondary": theme.backgroundSecondary, "--color-bg-card": theme.card,
    "--color-border": theme.border, "--color-border-gold": theme.accentDim,
    "--celeb-theme-focus-x": `${theme.focusX}%`, "--celeb-theme-angle": `${theme.angle}deg`,
  };
}
export function getContrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
    const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const [bright, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (bright + 0.05) / (dark + 0.05);
}
