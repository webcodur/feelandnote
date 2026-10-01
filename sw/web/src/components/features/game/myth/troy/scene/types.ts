/*
  파일명: components/features/game/myth/troy/scene/types.ts
  기능: 3D 전장 층의 공개 자료형
  책임: 화면(ui)이 BoardView에 넘기는 말·강조 층·연출·선택 사항의 모양과, 모델 키 목록을 정한다.
        BoardView.ts가 그대로 다시 내보내므로 화면은 BoardView.ts만 가져다 쓰면 된다.
*/ // ------------------------------
import type { ModelKey, Point, Side } from "../engine/types";

// #region 말
export interface SceneUnit {
  id: string;
  x: number;
  y: number;
  model: ModelKey;
  side: Side;
  hp: number;
  maxHp: number;
  portraitUrl: string | null;
  // 아바타를 못 쓸 때 메달에 쓸 첫 글자
  initial: string;
  isHero: boolean;
  boss: boolean;
  acted: boolean;
  // 0=+y(아래)쪽을 봄, 1=+x, 2=-y, 3=-x (Decor.rot과 같다)
  facing: 0 | 1 | 2 | 3;
  hidden?: boolean;
}
// #endregion

// #region 강조·연출
export const HIGHLIGHT_LAYERS = ["move", "attack", "heal", "danger", "target", "deploy", "zone"] as const;
export type HighlightLayer = (typeof HIGHLIGHT_LAYERS)[number];

export type TextTone = "damage" | "heal" | "miss" | "crit" | "info";

export type SceneAnim =
  | { kind: "move"; unitId: string; path: Point[] }
  | { kind: "melee" | "ranged"; attackerId: string; targetId: string; hit: boolean; crit: boolean; damage: number; targetHp: number }
  | { kind: "heal"; unitId: string; amount: number; hp: number }
  // 넘어져 가라앉음
  | { kind: "fall"; unitId: string }
  // 뒤로 물러나며 사라짐
  | { kind: "retreat"; unitId: string }
  // 빛과 함께 나타남(setUnits로 hidden 말을 먼저 넣어 둔다)
  | { kind: "spawn"; unitIds: string[] }
  | { kind: "levelUp"; unitId: string }
  | { kind: "status"; unitId: string; tone: "good" | "bad" }
  | { kind: "text"; tile: Point; text: string; tone: TextTone }
  // 바뀐 칸이 번쩍임(setMap으로 새 판을 먼저 넘긴다)
  | { kind: "terrain"; tiles: Point[] }
  // 배가 탐 — 불꽃·연기
  | { kind: "burn"; tiles: Point[] }
  // 신이 내림 — 빛기둥
  | { kind: "divine"; tile: Point }
  | { kind: "shake"; strength: number };

// kind 하나에 맞는 연출 모양(melee·ranged처럼 한 모양을 나눠 쓰는 kind도 찾는다)
export type AnimOf<K extends SceneAnim["kind"]> = SceneAnim extends infer A
  ? A extends { kind: infer KK }
    ? K extends KK
      ? A
      : never
    : never
  : never;
// #endregion

// #region 선택 사항
export type SceneQuality = "high" | "low";

export interface BoardViewOptions {
  canvas: HTMLCanvasElement;
  reducedMotion: boolean;
  quality: SceneQuality;
  onTileTap: (p: Point) => void;
  onTileHover: (p: Point | null) => void;
}

// 검수·성능 관찰용 숫자
export interface BoardStats {
  fps: number;
  frameMs: number;
  calls: number;
  triangles: number;
  // 지금 그리는 픽셀 배율(느리면 스스로 낮아진다)
  pixelRatio: number;
  models: { file: number; fallback: number };
}
// #endregion

// #region 모델 키
export const UNIT_MODEL_KEYS: ModelKey[] = [
  "hoplite", "hero", "king", "archer", "skirmisher", "chariot", "rider", "seer", "healer",
  "godWarrior", "godArcher", "godRobed", "godTrident", "riverGod",
];

export const PROP_KEYS = [
  "treeOlive", "treeCypress", "rockA", "rockB", "bush", "reeds", "ship", "hut", "tent", "palisade",
  "trenchStakes", "crenel", "tower", "gateClosed", "gateOpen", "house", "houseB", "column", "columnBroken",
  "temple", "altar", "brazier", "statue", "horse", "horseClosed", "spring", "tumulus", "shieldPile", "spearRack",
] as const;
export type PropKey = (typeof PROP_KEYS)[number];

export type ModelName = ModelKey | PropKey;
// #endregion
