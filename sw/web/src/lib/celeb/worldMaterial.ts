import type { CSSProperties } from "react";

export type WorldMaterialId =
  | "hanji-wood"
  | "stone-bronze"
  | "plaster-iron"
  | "concrete-steel"
  | "glass-paper";

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
    panel: "#18140e",
    raised: "#211a11",
    edge: "#755a31",
    accent: "#c5a263",
    accentHover: "#ddc07d",
    accentRgb: "197, 162, 99",
    text: "#eee8da",
    muted: "#aaa08d",
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
    accent: "#b58b55",
    accentHover: "#caa06a",
    accentRgb: "181, 139, 85",
    text: "#ece9df",
    muted: "#aaa69a",
  },
  "plaster-iron": {
    id: "plaster-iron",
    labelKo: "회벽 · 짙은 참나무 · 흑철",
    labelEn: "Plaster · Dark Oak · Black Iron",
    backgroundMaterial: "그을린 회벽",
    panelMaterial: "짙은 참나무",
    edgeMaterial: "망치질한 흑철",
    canvas: "#100d0b",
    deep: "#080605",
    panel: "#21170f",
    raised: "#2a1d13",
    edge: "#67513d",
    accent: "#ae8a5a",
    accentHover: "#c6a371",
    accentRgb: "174, 138, 90",
    text: "#eee6d8",
    muted: "#a99d8e",
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
    accent: "#a77c50",
    accentHover: "#c19668",
    accentRgb: "167, 124, 80",
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
    accent: "#79a9bf",
    accentHover: "#99c6d8",
    accentRgb: "121, 169, 191",
    text: "#e8eef0",
    muted: "#95a5ad",
  },
};

/**
 * 39개 세계를 재질 계열 하나에 명시적으로 배정한다.
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
  africa: "plaster-iron",
  myth: "stone-bronze",
  neutral: "stone-bronze",
};

export function getWorldMaterial(worldId: string): WorldMaterialDefinition {
  const id = WORLD_MATERIAL_BY_WORLD[worldId] ?? "stone-bronze";
  return WORLD_MATERIAL_DEFINITIONS[id];
}

export function getWorldMaterialStyle(material: WorldMaterialDefinition): WorldMaterialStyle {
  return {
    "--material-canvas": material.canvas,
    "--material-deep": material.deep,
    "--material-panel": material.panel,
    "--material-raised": material.raised,
    "--material-edge": material.edge,
    "--material-accent": material.accent,
    "--material-accent-rgb": material.accentRgb,
    "--material-text": material.text,
    "--material-muted": material.muted,
    "--color-bg-main": material.canvas,
    "--color-bg-secondary": material.deep,
    "--color-bg-card": material.panel,
    "--color-border": material.edge,
    "--color-border-gold": material.edge,
    "--color-accent": material.accent,
    "--color-accent-hover": material.accentHover,
    "--color-accent-rgb": material.accentRgb,
    "--color-accent-dim": material.edge,
    "--color-text-primary": material.text,
    "--color-text-secondary": material.muted,
    "--color-text-gold": material.accent,
  };
}
