/*
  파일명: components/features/game/myth/troy/scene/materials.ts
  기능: 모델 재질 이름과 편 색 칠하기
  책임: GLB 재질 이름표(TEAM·BRONZE…)와 같은 이름·색으로 대신 그리는 도형의 재질을 만들고,
        말마다 재질을 복제해 TEAM·TEAM_DARK를 편 색으로 바꿔 칠한다. 다른 재질은 색을 그대로 둔다.
*/ // ------------------------------
import { Color, MeshStandardMaterial, type Material } from "three";
import type { Side } from "../engine/types";
import { MODEL_COLORS, SIDE_COLOR, SIDE_DARK } from "./palette";

export type MaterialName = keyof typeof MODEL_COLORS;

interface Finish {
  rough: number;
  metal: number;
  glow?: number;
}

const FINISH: Record<MaterialName, Finish> = {
  TEAM: { rough: 0.6, metal: 0 }, TEAM_DARK: { rough: 0.7, metal: 0 }, BRONZE: { rough: 0.35, metal: 0.85 },
  SKIN: { rough: 0.7, metal: 0 }, CLOTH: { rough: 0.8, metal: 0 }, LEATHER: { rough: 0.8, metal: 0 },
  WOOD: { rough: 0.8, metal: 0 }, WOOD_DARK: { rough: 0.7, metal: 0 }, STONE: { rough: 0.9, metal: 0 },
  STONE_DARK: { rough: 0.9, metal: 0 }, LEAF: { rough: 0.8, metal: 0 }, LEAF_DARK: { rough: 0.8, metal: 0 },
  HORSE: { rough: 0.7, metal: 0 }, GOLD: { rough: 0.3, metal: 0.9 }, FLAME: { rough: 1, metal: 0, glow: 3 },
  GLOW: { rough: 1, metal: 0, glow: 2 }, WATER: { rough: 0.2, metal: 0 }, RED_OCHRE: { rough: 0.7, metal: 0 },
  STRAW: { rough: 0.9, metal: 0 },
};

const shared = new Map<MaterialName, MeshStandardMaterial>();

// 대신 그리는 도형이 나눠 쓰는 재질(이름이 GLB와 같아야 편 색 칠하기가 똑같이 먹는다)
export function namedMaterial(name: MaterialName): MeshStandardMaterial {
  const hit = shared.get(name);
  if (hit) return hit;
  const finish = FINISH[name];
  const color = new Color(MODEL_COLORS[name]);
  const mat = new MeshStandardMaterial({
    name, color, roughness: finish.rough, metalness: finish.metal,
    emissive: finish.glow ? color : new Color(0, 0, 0), emissiveIntensity: finish.glow ?? 1,
    flatShading: name === "STONE" || name === "STONE_DARK" || name === "WOOD_DARK",
  });
  shared.set(name, mat);
  return mat;
}

// "TEAM.001"처럼 Blender가 붙인 꼬리를 뗀 이름
export const baseName = (m: Material) => m.name.split(".")[0];

export const isGlowing = (m: Material) => {
  const name = baseName(m);
  return name === "FLAME" || name === "GLOW";
};

// 말 하나가 쓸 재질: 모두 복제하고(행동 끝 어둡게·맞은 번쩍임을 말마다 따로 건다) 편 색을 칠한다
export function pieceMaterial(src: Material, side: Side): MeshStandardMaterial {
  const base = src instanceof MeshStandardMaterial ? src : new MeshStandardMaterial({ name: src.name });
  const mat = base.clone();
  const name = baseName(mat);
  if (name === "TEAM") mat.color.set(SIDE_COLOR[side]);
  if (name === "TEAM_DARK") mat.color.set(SIDE_DARK[side]);
  return mat;
}

// 행동을 마친 말: 채도를 빼고 조금 어둡게
export function actedColor(src: Color, out: Color): Color {
  const luma = src.r * 0.299 + src.g * 0.587 + src.b * 0.114;
  return out.setRGB(luma, luma, luma).lerp(src, 0.3).multiplyScalar(0.62);
}
