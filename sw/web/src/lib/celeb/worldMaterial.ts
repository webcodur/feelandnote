import type { CSSProperties } from "react";

export type WorldMaterialId =
  | "hanji-wood"
  | "stone-bronze"
  | "plaster-iron"
  | "concrete-steel"
  | "glass-paper"
  | "concrete-cobalt"
  | "ebony-malachite";

export interface WorldMaterialDefinition {
  id: WorldMaterialId;
  labelKo: string;
  labelEn: string;
  backgroundMaterial: string;
  panelMaterial: string;
  edgeMaterial: string;
  canvas: string;
  deep: string;
  panel: string;
  raised: string;
  edge: string;
  accent: string;
  accentHover: string;
  accentRgb: string;
  text: string;
  muted: string;
}

export interface WorldMaterialStyle extends CSSProperties {
  "--material-canvas": string;
  "--material-deep": string;
  "--material-panel": string;
  "--material-raised": string;
  "--material-edge": string;
  "--material-accent": string;
  "--material-accent-rgb": string;
  "--material-text": string;
  "--material-muted": string;
  "--color-bg-main": string;
  "--color-bg-secondary": string;
  "--color-bg-card": string;
  "--color-border": string;
  "--color-border-gold": string;
  "--color-accent": string;
  "--color-accent-hover": string;
  "--color-accent-rgb": string;
  "--color-accent-dim": string;
  "--color-text-primary": string;
  "--color-text-secondary": string;
  "--color-text-gold": string;
}

export const WORLD_MATERIAL_DEFINITIONS: Readonly<Record<WorldMaterialId, WorldMaterialDefinition>> = {
  "hanji-wood": {
    id: "hanji-wood",
    labelKo: "먹빛 한지 · 옻칠목 · 황동",
    labelEn: "Ink Hanji · Lacquered Wood · Brass",
    backgroundMaterial: "먹빛 한지",
    panelMaterial: "옻칠 목재",
    edgeMaterial: "무광 황동",
    canvas: "#0d0e0b",
    deep: "#070806",
    panel: "#151411",
    raised: "#1c1a16",
    edge: "#655a41",
    accent: "#b0a178",
    accentHover: "#c1b595",
    accentRgb: "176, 161, 120",
    text: "#e8e6e0",
    muted: "#a39e94",
  },
  "stone-bronze": {
    id: "stone-bronze",
    labelKo: "응회암 · 석회암 · 산화 청동",
    labelEn: "Tuff · Limestone · Patinated Bronze",
    backgroundMaterial: "거친 응회암",
    panelMaterial: "다듬은 석회암",
    edgeMaterial: "산화 청동",
    canvas: "#11110f",
    deep: "#090908",
    panel: "#22221e",
    raised: "#2b2a24",
    edge: "#696356",
    accent: "#90a573",
    accentHover: "#a7b78f",
    accentRgb: "144, 165, 115",
    text: "#e9e7e2",
    muted: "#aaa69a",
  },
  "plaster-iron": {
    id: "plaster-iron",
    labelKo: "그을린 회벽 · 무쇠 · 붉은 녹",
    labelEn: "Sooted Plaster · Wrought Iron · Red Rust",
    backgroundMaterial: "그을린 회벽",
    panelMaterial: "두드린 무쇠판",
    edgeMaterial: "붉게 슨 무쇠",
    canvas: "#0d0d0c",
    deep: "#060605",
    panel: "#1a1a18",
    raised: "#222220",
    edge: "#55534e",
    accent: "#9d786c",
    accentHover: "#af9288",
    accentRgb: "157, 120, 108",
    text: "#e7e4df",
    muted: "#a09c95",
  },
  "concrete-steel": {
    id: "concrete-steel",
    labelKo: "콘크리트 · 강철 · 산화 구리",
    labelEn: "Concrete · Steel · Oxidized Copper",
    backgroundMaterial: "분진 콘크리트",
    panelMaterial: "무광 강철",
    edgeMaterial: "산화 구리",
    canvas: "#0d1011",
    deep: "#070809",
    panel: "#1a1e1f",
    raised: "#232829",
    edge: "#515b5e",
    accent: "#65a4a2",
    accentHover: "#82b5b4",
    accentRgb: "101, 164, 162",
    text: "#e7e9e7",
    muted: "#99a2a1",
  },
  "glass-paper": {
    id: "glass-paper",
    labelKo: "훈연 유리 · 코팅지 · 알루미늄",
    labelEn: "Smoked Glass · Coated Paper · Aluminum",
    backgroundMaterial: "훈연 유리",
    panelMaterial: "무광 코팅지",
    edgeMaterial: "냉간 알루미늄",
    canvas: "#080d11",
    deep: "#04070a",
    panel: "#111a20",
    raised: "#17232a",
    edge: "#34515f",
    accent: "#79a8be",
    accentHover: "#98bccd",
    accentRgb: "121, 168, 190",
    text: "#e8eef0",
    muted: "#95a5ad",
  },
  "concrete-cobalt": {
    id: "concrete-cobalt",
    labelKo: "그늘진 콘크리트 · 코발트 회벽 · 청람",
    labelEn: "Shaded Concrete · Cobalt Stucco · Ultramarine",
    backgroundMaterial: "그늘진 콘크리트",
    panelMaterial: "코발트로 칠한 회벽",
    edgeMaterial: "청람 안료",
    canvas: "#0b0c0f",
    deep: "#050608",
    panel: "#11141f",
    raised: "#171b27",
    edge: "#3f4a5f",
    accent: "#6d7bb0",
    accentHover: "#8b96c1",
    accentRgb: "109, 123, 176",
    text: "#e6e8ef",
    muted: "#9297a6",
  },
  "ebony-malachite": {
    id: "ebony-malachite",
    labelKo: "흑단 · 말라카이트 · 녹청",
    labelEn: "Ebony · Malachite · Verdigris",
    backgroundMaterial: "흑단",
    panelMaterial: "말라카이트",
    edgeMaterial: "말라카이트 녹청",
    canvas: "#0c0d0c",
    deep: "#060706",
    panel: "#151715",
    raised: "#1e211f",
    edge: "#484d49",
    accent: "#a3afa6",
    accentHover: "#bec7c0",
    accentRgb: "163, 175, 166",
    text: "#e7e9e7",
    muted: "#9ca29d",
  },
};

/**
 * 41개 세계를 재질 계열 하나에 명시적으로 배정한다.
 * 새 세계를 추가할 때 이 표와 lab 비교 화면을 함께 갱신한다.
 */
export const WORLD_MATERIAL_BY_WORLD: Readonly<Record<string, WorldMaterialId>> = {
  "three-kingdoms-korea": "hanji-wood",
  goryeo: "hanji-wood",
  joseon: "hanji-wood",
  "modern-korea": "glass-paper",
  "warring-states-china": "hanji-wood",
  "han-china": "hanji-wood",
  "tang-song": "hanji-wood",
  "ming-qing": "hanji-wood",
  "modern-china": "glass-paper",
  "ancient-japan": "hanji-wood",
  "samurai-japan": "hanji-wood",
  edo: "hanji-wood",
  "modern-japan": "glass-paper",
  steppe: "plaster-iron",
  "ancient-greece": "stone-bronze",
  rome: "stone-bronze",
  "ancient-india": "stone-bronze",
  mughal: "plaster-iron",
  "modern-india": "glass-paper",
  "ancient-near-east": "stone-bronze",
  "islamic-golden-age": "plaster-iron",
  "ottoman-persia": "plaster-iron",
  "modern-middle-east": "glass-paper",
  "medieval-rus": "plaster-iron",
  "imperial-russia": "plaster-iron",
  "soviet-east-europe": "concrete-steel",
  "colonial-america": "plaster-iron",
  "frontier-america": "plaster-iron",
  "modern-america": "glass-paper",
  "medieval-europe": "plaster-iron",
  renaissance: "plaster-iron",
  "age-of-sail": "plaster-iron",
  "industrial-europe": "concrete-steel",
  "world-wars": "concrete-steel",
  "modern-west": "glass-paper",
  "latin-america": "plaster-iron",
  "modern-latin-america": "concrete-cobalt",
  africa: "ebony-malachite",
  "modern-africa": "ebony-malachite",
  myth: "stone-bronze",
  neutral: "stone-bronze",
};

export function getWorldMaterial(worldId: string): WorldMaterialDefinition {
  const id = WORLD_MATERIAL_BY_WORLD[worldId] ?? "stone-bronze";
  return WORLD_MATERIAL_DEFINITIONS[id];
}

type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const toHex = (rgb: Rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
/** a를 ratio만큼 b 쪽으로 섞는다(sRGB) */
const mix = (a: string, b: string, ratio: number) => {
  const [x, y] = [toRgb(a), toRgb(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * ratio) as Rgb);
};
const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** 밝은 바탕에서 글자로 읽힐 때(4.5:1)까지 재질 금속색을 검정 쪽으로 내린다 */
const darkenUntilReadable = (color: string, background: string) => {
  let ratio = 0;
  while (ratio < 0.9 && contrast(mix(color, "#000000", ratio), background) < 4.5) ratio += 0.02;
  return mix(color, "#000000", ratio);
};

/**
 * 라이트 테마의 재질 색. 다크 재질을 손으로 한 벌 더 적지 않고, 기본 라이트 표면(globals.css)에
 * 재질 금속색을 옅게 섞어 같은 계열로 만든다. 금속색은 바탕에서 읽히는 데까지 짙게 내린다.
 */
function lightMaterial(material: WorldMaterialDefinition) {
  const canvas = mix("#f7f3ea", material.accent, 0.07);
  const accent = darkenUntilReadable(material.accent, mix("#f7f3ea", material.accent, 0.07));
  return {
    canvas,
    deep: mix("#ece6d8", material.accent, 0.1),
    panel: mix("#fffefb", material.accent, 0.03),
    raised: mix("#eee8da", material.accent, 0.08),
    edge: mix("#d5ccb8", material.accent, 0.3),
    accent,
    accentHover: mix(accent, "#000000", 0.2),
    text: mix("#120d07", material.accent, 0.06),
    muted: mix("#2a2218", material.accent, 0.12),
  };
}

export function getWorldMaterialStyle(material: WorldMaterialDefinition): WorldMaterialStyle {
  const light = lightMaterial(material);
  // 다크의 보조 글자는 재질 정의값이 흐려(대비 약 7:1) 본문색 쪽으로 절반 끌어올린다
  const dark = { ...material, text: mix(material.text, "#ffffff", 0.35), muted: mix(material.muted, material.text, 0.5) };
  const pick = (key: keyof typeof light) => `light-dark(${light[key]}, ${dark[key]})`;
  return {
    "--material-canvas": pick("canvas"),
    "--material-deep": pick("deep"),
    "--material-panel": pick("panel"),
    "--material-raised": pick("raised"),
    "--material-edge": pick("edge"),
    "--material-accent": pick("accent"),
    "--material-accent-rgb": material.accentRgb,
    "--material-text": pick("text"),
    "--material-muted": pick("muted"),
    "--color-bg-main": pick("canvas"),
    "--color-bg-secondary": pick("deep"),
    "--color-bg-card": pick("panel"),
    "--color-border": pick("edge"),
    "--color-border-gold": pick("edge"),
    "--color-accent": pick("accent"),
    "--color-accent-hover": pick("accentHover"),
    "--color-accent-rgb": material.accentRgb,
    "--color-accent-dim": pick("edge"),
    "--color-text-primary": pick("text"),
    "--color-text-secondary": pick("muted"),
    "--color-text-gold": pick("accent"),
  };
}
