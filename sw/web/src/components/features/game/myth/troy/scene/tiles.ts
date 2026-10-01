/*
  파일명: components/features/game/myth/troy/scene/tiles.ts
  기능: 칸 기둥 짓기
  책임: 판의 칸을 받침 바닥부터 윗면까지 살짝 둥근 상자 기둥으로 세운다. 기둥 높이가 같은 칸끼리 InstancedMesh 하나로 묶고,
        칸마다 흔든 지형색·옆면 재질·윗면 무늬를 셰이더에 넘긴다. 판 둘레 기둥의 옆면이 곧 디오라마 흙 단면이 된다.
*/ // ------------------------------
import { Color, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, SRGBColorSpace } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { BattleMap, TerrainKind } from "../engine/types";
import { FLOOR_Y, hash2, topY, worldX, worldZ } from "./grid";
import { TERRAIN_TOP, WATER_BED } from "./palette";
import type { TileMaterial } from "./tileShader";

const RADIUS = 0.05;
const JITTER = 0.06;
// 옆면: 0 흙 · 1 돌 쌓기 · 2 바위
const SIDE: Partial<Record<TerrainKind, number>> = {
  wall: 1, rampart: 1, gate: 1, temple: 1, stone: 1, building: 1, ruins: 1, hill: 2,
};
// 윗면 무늬: 0 없음 · 1 풀 · 2 모래 · 3 흙 · 4 돌 판
const PATTERN: Record<TerrainKind, number> = {
  plain: 1, forest: 1, hill: 1, sand: 2, ship: 2, shallow: 2, water: 0, road: 3, camp: 3, trench: 3,
  palisade: 3, gate: 3, building: 3, wall: 4, rampart: 4, temple: 4, stone: 4, ruins: 4,
};

export interface TileLayer {
  group: Group;
  dispose(): void;
}

// hex를 sRGB에서 k배 한 색(±6% 흔들기는 눈에 보이는 밝기 기준이어야 고르게 보인다)
function shade(hex: string, k: number): Color {
  const c = new Color(hex);
  const s = { r: 0, g: 0, b: 0 };
  c.getRGB(s, SRGBColorSpace);
  return c.setRGB(Math.min(1, s.r * k), Math.min(1, s.g * k), Math.min(1, s.b * k), SRGBColorSpace);
}

function tileColor(x: number, y: number, terrain: TerrainKind): Color {
  const hex = terrain === "water" ? WATER_BED.water : terrain === "shallow" ? WATER_BED.shallow : TERRAIN_TOP[terrain];
  // 돌 판은 칸끼리 조금 더 갈려 보여야 이음새가 산다
  const spread = terrain === "stone" || terrain === "temple" ? JITTER * 1.4 : JITTER;
  return shade(hex, 1 + (hash2(x, y, 7) * 2 - 1) * spread);
}

export function buildTiles(map: BattleMap, tileMaterial: TileMaterial): TileLayer {
  const group = new Group();
  const buckets = new Map<number, number[]>();
  map.tiles.forEach((tile, i) => {
    const key = Math.round((topY(tile) - FLOOR_Y) * 1000);
    buckets.set(key, [...(buckets.get(key) ?? []), i]);
  });
  tileMaterial.gridOffset.set(map.width / 2, map.height / 2);
  const m = new Matrix4();
  for (const [key, list] of buckets) {
    const colH = key / 1000;
    const geo = new RoundedBoxGeometry(1, colH, 1, 2, Math.min(RADIUS, colH / 2 - 0.002));
    geo.translate(0, FLOOR_Y + colH / 2, 0);
    const top = new Float32Array(list.length);
    const meta = new Float32Array(list.length * 2);
    const mesh = new InstancedMesh(geo, tileMaterial.material, list.length);
    list.forEach((i, k) => {
      const x = i % map.width;
      const y = Math.floor(i / map.width);
      const tile = map.tiles[i];
      mesh.setMatrixAt(k, m.makeTranslation(worldX(map, x), 0, worldZ(map, y)));
      mesh.setColorAt(k, tileColor(x, y, tile.terrain));
      top[k] = topY(tile);
      meta[k * 2] = SIDE[tile.terrain] ?? 0;
      meta[k * 2 + 1] = PATTERN[tile.terrain];
    });
    geo.setAttribute("aTop", new InstancedBufferAttribute(top, 1));
    geo.setAttribute("aMeta", new InstancedBufferAttribute(meta, 2));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  const dispose = () => {
    group.children.forEach((child) => {
      const mesh = child as InstancedMesh;
      mesh.geometry.dispose();
      mesh.dispose();
    });
    group.clear();
  };
  return { group, dispose };
}
