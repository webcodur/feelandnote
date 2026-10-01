/*
  파일명: components/features/game/myth/troy/scene/fallbackBuildings.ts
  기능: 건물·제단·목마 대신 그리기
  책임: GLB가 아직 없을 때 흉벽·탑·성문·집·기둥·신전·제단·화로·신상·트로이 목마를 간단한 도형으로 조립하고,
        자연물(fallbackNature.ts)과 합쳐 소품 키 하나로 대신 그리는 입구(fallbackProp)를 연다.
*/ // ------------------------------
import type { Group } from "three";
import type { PropKey } from "./types";
import { NATURE_PARTS } from "./fallbackNature";
import { assemble, HALF_PI, repeat, type Part } from "./shapes";

const crenel = (): Part[] => [
  ["box", "STONE", [0, 0.07, 0], [1.0, 0.14, 0.16]],
  ...repeat(3, (i): Part => ["box", "STONE", [-0.36 + i * 0.36, 0.22, 0], [0.2, 0.16, 0.16]]),
];

const TOWER_MERLONS: [number, number][] = [[-0.36, -0.36], [0, -0.36], [0.36, -0.36], [-0.36, 0], [0.36, 0], [-0.36, 0.36], [0, 0.36], [0.36, 0.36]];
const tower = (): Part[] => [
  ["box", "STONE", [0, 0.26, 0], [0.9, 0.52, 0.9]],
  ["box", "STONE_DARK", [0, 0.53, 0], [0.96, 0.06, 0.96]],
  ...TOWER_MERLONS.map(([x, z]): Part => ["box", "STONE", [x, 0.64, z], [0.18, 0.16, 0.18]]),
  ["box", "WOOD_DARK", [0, 0.32, 0.455], [0.1, 0.16, 0.02]],
];

const gateFrame = (): Part[] => [
  ["box", "STONE", [0.42, 0.7, 0], [0.2, 1.4, 0.36]], ["box", "STONE", [-0.42, 0.7, 0], [0.2, 1.4, 0.36]],
  ["box", "STONE", [0, 1.3, 0], [1.04, 0.2, 0.4]], ["box", "STONE_DARK", [0, 1.18, 0.12], [0.66, 0.05, 0.1]],
];
const doorStuds = (x: number, z: number, ry: number): Part[] =>
  repeat(3, (i): Part => ["box", "BRONZE", [x, 0.3 + i * 0.3, z], [0.28, 0.035, 0.02], [0, ry, 0]]);
const gateClosed = (): Part[] => [
  ...gateFrame(),
  ["box", "WOOD", [0.165, 0.6, 0], [0.32, 1.2, 0.08]], ["box", "WOOD", [-0.165, 0.6, 0], [0.32, 1.2, 0.08]],
  ...doorStuds(0.165, 0.045, 0), ...doorStuds(-0.165, 0.045, 0),
];
const gateOpen = (): Part[] => [
  ...gateFrame(),
  ["box", "WOOD", [0.3, 0.6, -0.17], [0.08, 1.2, 0.32]], ["box", "WOOD", [-0.3, 0.6, -0.17], [0.08, 1.2, 0.32]],
  ...doorStuds(0.25, -0.17, HALF_PI), ...doorStuds(-0.25, -0.17, HALF_PI),
];

const house = (): Part[] => [
  ["box", "STONE", [0, 0.24, 0], [0.72, 0.48, 0.72]],
  ["box", "WOOD", [0, 0.5, 0], [0.78, 0.05, 0.78]],
  ["box", "STONE", [0, 0.55, -0.33], [0.78, 0.06, 0.1]],
  ["box", "WOOD_DARK", [0, 0.14, 0.365], [0.16, 0.26, 0.02]],
  ["box", "WOOD_DARK", [0.2, 0.33, 0.365], [0.1, 0.08, 0.02]],
];

const houseB = (): Part[] => [
  ["box", "STONE", [0, 0.2, 0], [0.76, 0.4, 0.72]],
  ["box", "WOOD", [0, 0.42, 0], [0.8, 0.04, 0.76]],
  ["box", "STONE", [-0.1, 0.6, -0.08], [0.5, 0.34, 0.5]],
  ["box", "WOOD", [-0.1, 0.79, -0.08], [0.54, 0.04, 0.54]],
  ["box", "WOOD_DARK", [0.18, 0.13, 0.365], [0.15, 0.24, 0.02]],
  ["box", "WOOD_DARK", [-0.1, 0.62, 0.175], [0.1, 0.1, 0.02]],
];

const column = (): Part[] => [
  ["cyl", "STONE", [0, 0.03, 0], [0.32, 0.06, 0.32]],
  ["cyl", "STONE", [0, 0.5, 0], [0.21, 0.88, 0.21]],
  ["box", "STONE", [0, 0.97, 0], [0.32, 0.06, 0.32]],
];

const columnBroken = (): Part[] => [
  ["cyl", "STONE", [0, 0.03, 0], [0.32, 0.06, 0.32]],
  ["cyl", "STONE", [0, 0.25, 0], [0.21, 0.42, 0.21]],
  ["cyl", "STONE_DARK", [0.24, 0.1, 0.14], [0.2, 0.3, 0.2], [0, 0.5, HALF_PI]],
  ["dodeca", "STONE", [-0.2, 0.05, 0.18], [0.14, 0.1, 0.12]],
];

// 앞뒤로 기둥이 늘어선 신전(어느 쪽에서 돌려 봐도 신전으로 읽힌다). 앞(+Z) 신실 벽에만 문이 있다
const temple = (): Part[] => [
  ["box", "STONE", [0, 0.06, 0], [1.94, 0.12, 0.92]],
  ["box", "STONE", [0, 0.15, 0], [1.8, 0.06, 0.8]],
  ["box", "STONE_DARK", [0, 0.62, 0], [1.3, 0.88, 0.36]],
  ["box", "WOOD_DARK", [0, 0.44, 0.185], [0.26, 0.52, 0.02]],
  ...repeat(8, (i): Part => ["cyl", "STONE", [-0.72 + (i % 4) * 0.48, 0.62, i < 4 ? 0.3 : -0.3], [0.15, 0.88, 0.15]]),
  ["box", "STONE", [0, 1.12, 0], [1.9, 0.12, 0.84]],
  ["prism", "STONE", [0, 1.28, 0], [2.2, 0.84, 0.4], [-HALF_PI, 0, 0]],
];

const altar = (): Part[] => [
  ["box", "STONE", [0, 0.15, 0], [0.5, 0.3, 0.36]],
  ["box", "STONE_DARK", [0, 0.32, 0], [0.56, 0.05, 0.42]],
  ["sphere", "FLAME", [0, 0.39, 0], [0.2, 0.14, 0.2]],
  ["cone", "FLAME", [0, 0.48, 0], [0.16, 0.24, 0.16]],
];

const brazier = (): Part[] => [
  ...repeat(3, (i): Part => {
    const a = (i * Math.PI * 2) / 3;
    return ["cyl", "BRONZE", [Math.sin(a) * 0.1, 0.19, Math.cos(a) * 0.1], [0.025, 0.4, 0.025], [Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25]];
  }),
  ["hemi", "BRONZE", [0, 0.42, 0], [0.34, 0.16, 0.34], [Math.PI, 0, 0]],
  ["sphere", "FLAME", [0, 0.44, 0], [0.24, 0.1, 0.24]],
  ["cone", "FLAME", [0, 0.54, 0], [0.18, 0.22, 0.18]],
];

const statue = (): Part[] => [
  ["box", "STONE", [0, 0.18, 0], [0.36, 0.36, 0.36]],
  ["taper", "STONE", [0, 0.54, 0], [0.22, 0.36, 0.22]],
  ["sphere", "STONE", [0, 0.8, 0], 0.13],
  ["hemi", "GOLD", [0, 0.82, 0], [0.14, 0.11, 0.14]],
  ["cyl", "GOLD", [-0.13, 0.66, 0.04], [0.016, 0.64, 0.016]],
  ["disc", "GOLD", [0.12, 0.56, 0.08], [0.18, 0.02, 0.18], [HALF_PI, 0, 0]],
];

const WHEELS: [number, number][] = [[0.62, 0.62], [-0.62, 0.62], [0.62, -0.62], [-0.62, -0.62]];
const LEGS: [number, number][] = [[0.26, 0.5], [-0.26, 0.5], [0.26, -0.5], [-0.26, -0.5]];
const horse = (): Part[] => [
  ["box", "WOOD_DARK", [0, 0.13, 0], [1.2, 0.1, 1.72]],
  ...WHEELS.map(([x, z]): Part => ["cyl", "WOOD", [x, 0.12, z], [0.22, 0.08, 0.22], [0, 0, HALF_PI]]),
  ...LEGS.map(([x, z]): Part => ["box", "WOOD", [x, 0.58, z], [0.18, 0.84, 0.18]]),
  ["box", "WOOD", [0, 1.14, 0], [0.72, 0.62, 1.5]],
  ...repeat(4, (i): Part => ["box", "WOOD_DARK", [0, 1.14, -0.55 + i * 0.37], [0.74, 0.64, 0.03]]),
  ["box", "WOOD_DARK", [0.37, 1.1, 0.05], [0.02, 0.3, 0.38]],
  ["box", "WOOD", [0, 1.58, 0.68], [0.4, 0.8, 0.4], [0.5, 0, 0]],
  ["box", "WOOD", [0, 1.98, 0.92], [0.34, 0.32, 0.62], [0.2, 0, 0]],
  ["box", "WOOD_DARK", [0, 1.82, 0.56], [0.12, 0.52, 0.3], [0.5, 0, 0]],
  ["cone", "WOOD", [0.1, 2.18, 0.82], [0.08, 0.16, 0.08]], ["cone", "WOOD", [-0.1, 2.18, 0.82], [0.08, 0.16, 0.08]],
  ["box", "WOOD_DARK", [0, 1.0, -0.82], [0.1, 0.5, 0.1], [-0.4, 0, 0]],
];

const PROP_PARTS: Record<PropKey, () => Part[]> = {
  ...NATURE_PARTS,
  crenel, tower, gateClosed, gateOpen, house, houseB, column, columnBroken, temple, altar, brazier, statue, horse, horseClosed: horse,
};

export function fallbackProp(key: PropKey): Group {
  return assemble(PROP_PARTS[key]());
}
