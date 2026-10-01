/*
  파일명: components/features/game/myth/troy/scene/palette.ts
  기능: 3D 전장의 모든 색
  책임: 지형·편·빛·물·받침·강조·연출·대신 그리는 도형의 색 hex를 이 파일 한 곳에 둔다.
        다른 파일은 hex를 직접 적지 않고 여기서 이름으로 가져다 쓴다.
*/ // ------------------------------
import type { Mood, Side, TerrainKind } from "../engine/types";
import type { HighlightLayer, TextTone } from "./types";

// #region 지형
export const TERRAIN_TOP: Record<TerrainKind, string> = {
  plain: "#8f9d52", sand: "#dcc38f", road: "#b59a6b", forest: "#6f8043", hill: "#9b8a64",
  shallow: "#62b0c0", water: "#2f7f9a", wall: "#cdbf9f", rampart: "#bfb190", gate: "#b59a6b",
  camp: "#c9b27e", ship: "#d2b884", trench: "#7d6545", palisade: "#a88b5c", building: "#c7b08a",
  temple: "#d9d0bb", stone: "#bdb49f", ruins: "#b8ab8c",
};
// 물 칸은 물 면 아래로 비치는 바닥색을 기둥에 칠한다(물 면 색은 WATER)
export const WATER_BED = { shallow: "#a39a6c", water: "#2c5b5c" } as const;
// 옆면 흙 층: 윗흙 → 진흙·양토 줄무늬 → 바닥으로 갈수록 짙은 흙
export const SOIL = {
  top: "#5b3e28", clay: "#94704a", loam: "#6d4c31", deep: "#33251a", pebble: "#b09c7e", mortar: "#7c6f59",
} as const;
// #endregion

// #region 편
export const SIDE_COLOR: Record<Side, string> = { player: "#3f6fb0", ally: "#3f9b8a", enemy: "#b3392f" };
export const SIDE_DARK: Record<Side, string> = { player: "#25406a", ally: "#235a50", enemy: "#6b211b" };
export const PIECE = {
  rim: "#dcb65a", bossRim: "#c4532e", bossRim2: "#eab04a", ring: "#f6d06c",
  hpBack: "#17110e", hpLag: "#ffe3a6", medalGold: "#e9c566", medalEdge: "#140f0c", initial: "#fff8e8",
} as const;
// #endregion

// #region 물
export const WATER = { shallow: "#62b0c0", deep: "#2f7f9a", foam: "#f2fbff" } as const;
// #endregion

// #region 받침·배경·빛
export const PLINTH = { stone: "#2c2824", gold: "#caa24c", shadow: "#000000" } as const;
// 배경 가장자리를 살짝 누르는 그늘(가운데는 비우고 끝만 어둡게)
export const SKY_VIGNETTE = { center: "rgba(0,0,0,0)", edge: "rgba(0,0,0,0.22)" } as const;
// 얼굴 메달 위쪽의 옅은 광택
export const MEDAL_GLOSS = { top: "rgba(255,255,255,0.22)", bottom: "rgba(255,255,255,0)" } as const;

export interface MoodColors {
  skyTop: string; skyMid: string; skyBottom: string; fog: string;
  sun: string; fill: string; hemiSky: string; hemiGround: string; waterSky: string;
  // 물 면 전체에 곱하는 빛(밤·해 질 녘에 물이 혼자 밝게 뜨지 않게)
  waterTint: string;
}
export const MOOD_COLORS: Record<Mood, MoodColors> = {
  day: {
    skyTop: "#86add0", skyMid: "#cddcdf", skyBottom: "#f0e2c2", fog: "#d9d3bf",
    sun: "#fff0d4", fill: "#bcd2ff", hemiSky: "#d2e4f2", hemiGround: "#8c7652", waterSky: "#c4e4ef", waterTint: "#ffffff",
  },
  dusk: {
    skyTop: "#2a2753", skyMid: "#8b4c76", skyBottom: "#f19a5a", fog: "#a8727a",
    sun: "#ffa25c", fill: "#8f7cdc", hemiSky: "#907ec4", hemiGround: "#5c3b34", waterSky: "#f2a684", waterTint: "#b98b86",
  },
  dawn: {
    skyTop: "#6c84c2", skyMid: "#e4a8b7", skyBottom: "#ffdca8", fog: "#e3c1ba",
    sun: "#ffc9a2", fill: "#aab9ff", hemiSky: "#f2c7d4", hemiGround: "#705c55", waterSky: "#ffd3c2", waterTint: "#e6cfd2",
  },
  night: {
    skyTop: "#04070f", skyMid: "#0d162d", skyBottom: "#1e2a4b", fog: "#111a31",
    sun: "#a3bcff", fill: "#566cb0", hemiSky: "#2f4172", hemiGround: "#12151f", waterSky: "#2a4574", waterTint: "#39507e",
  },
};
// #endregion

// #region 강조·길·커서
export const HIGHLIGHT_COLOR: Record<HighlightLayer | "cursor" | "flash", string> = {
  move: "#3f9dff", attack: "#ff4a3d", heal: "#46d877", danger: "#ff9426", target: "#ffffff",
  deploy: "#f0b429", zone: "#9d5cff", cursor: "#ffffff", flash: "#fff3cf",
};
export const PATH_GOLD = "#f6c95a";
// #endregion

// #region 연출
export const FX = {
  spark: "#ffcf86", crit: "#fff1a6", heal: "#79ffa6", healGold: "#eaffb4", good: "#8fd5ff", goodGold: "#ffe9a2",
  bad: "#a05cff", badDark: "#3a1b5a", smoke: "#3a332e", smokeLight: "#8a8078", fire: "#ff7426", fireCore: "#ffd66a",
  ember: "#ffb04a", divine: "#fff0c0", dust: "#cdb58c", spawn: "#fff2cc", level: "#ffd24a",
  hitFlash: "#ffffff", hurtFlash: "#ff5638", critFlash: "#ffe07a", char: "#3b302a", arrow: "#6b4a2a",
  torch: "#ff9d4a", torchLight: "#ff9446", splash: "#e8f7ff",
} as const;
export const TEXT_TONE: Record<TextTone, { fill: string; stroke: string }> = {
  damage: { fill: "#ffffff", stroke: "#6e1410" },
  crit: { fill: "#ffd83f", stroke: "#6a2600" },
  heal: { fill: "#a4ffbb", stroke: "#0c4420" },
  miss: { fill: "#dce6ff", stroke: "#26304a" },
  info: { fill: "#ffe8ad", stroke: "#3a2a10" },
};
// #endregion

// #region 모델 재질(GLB가 없을 때 대신 그리는 도형도 같은 이름·색을 쓴다)
export const MODEL_COLORS = {
  TEAM: "#3f6fb0", TEAM_DARK: "#25406a", BRONZE: "#b8863b", SKIN: "#d8a577", CLOTH: "#e9e1cc",
  LEATHER: "#7a4a28", WOOD: "#8b5a2b", WOOD_DARK: "#2c2724", STONE: "#cdbf9f", STONE_DARK: "#9c8b6f",
  LEAF: "#6f7f48", LEAF_DARK: "#3e5a36", HORSE: "#8a5a36", GOLD: "#e0b94c", FLAME: "#ffb347",
  GLOW: "#fff1c1", WATER: "#5fb3c9", RED_OCHRE: "#a24a2c", STRAW: "#c9ad6a",
} as const;
// #endregion
