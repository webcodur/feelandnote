/*
  파일명: components/features/game/myth/troy/scene/decorPlan.ts
  기능: 소품 자리 정하기
  책임: 지형이 스스로 입는 장식(숲의 나무, 언덕 바위, 성벽 흉벽, 성문, 도랑 말뚝, 울타리, 집, 폐허, 신전, 물가 갈대)을
        칸마다 시드로 골라 자리·방향·크기를 정하고, map.decor(배·막사·화로…)를 더한다. 자리 표만 만들고 그리지는 않는다.
*/ // ------------------------------
import { Vector3 } from "three";
import type { BattleMap, TerrainKind } from "../engine/types";
import { DIRS, facingAngle, hash2, isWet, surfaceY, tileAt, tileKey, topY, worldX, worldZ } from "./grid";
import type { PropKey } from "./types";

export interface Placement {
  key: PropKey;
  pos: Vector3;
  rot: number;
  scale: number;
  // 덮는 칸("x,y") — 배 불탐·지형 번쩍임이 찾는다
  tiles: string[];
  // 모델 밖에 따로 켜는 횃불 자리(성문·탑)
  torches: Vector3[];
}

const WALLISH: TerrainKind[] = ["wall", "rampart", "gate", "palisade"];
const CITY: TerrainKind[] = ["building", "temple", "stone", "ruins"];
const CAMP: TerrainKind[] = ["camp", "ship"];
const TAU = Math.PI * 2;

function centroid(map: BattleMap, kinds: TerrainKind[]): { x: number; y: number } | null {
  const hits = map.tiles.flatMap((t, i) => (kinds.includes(t.terrain) ? [{ x: i % map.width, y: Math.floor(i / map.width) }] : []));
  if (hits.length === 0) return null;
  return { x: hits.reduce((s, p) => s + p.x, 0) / hits.length, y: hits.reduce((s, p) => s + p.y, 0) / hits.length };
}

// 모델의 앞(+Z)을 기준으로 잰 한 점을 rot만큼 돌려 월드에 놓는다
const local = (base: Vector3, rot: number, lx: number, ly: number, lz: number) =>
  new Vector3(base.x + lx * Math.cos(rot) + lz * Math.sin(rot), base.y + ly, base.z - lx * Math.sin(rot) + lz * Math.cos(rot));

export function planDecor(map: BattleMap, flags: string[]): Placement[] {
  const out: Placement[] = [];
  const city = centroid(map, CITY);
  const camp = centroid(map, CAMP);
  const put = (key: PropKey, x: number, y: number, dx: number, dz: number, rot: number, scale: number, torches: Vector3[] = []) => {
    const tile = tileAt(map, x, y);
    const pos = new Vector3(worldX(map, x) + dx, tile ? topY(tile) : 0, worldZ(map, y) + dz);
    out.push({ key, pos, rot, scale, tiles: [tileKey(x, y)], torches });
  };
  const isWallish = (x: number, y: number) => {
    const t = tileAt(map, x, y);
    return !!t && WALLISH.includes(t.terrain);
  };
  // 중심(도시·진영) 반대쪽이 바깥. 중심이 없으면 모든 쪽이 바깥
  const outward = (x: number, y: number, dir: number, center: { x: number; y: number } | null) =>
    !center || (center.x - x) * DIRS[dir].x + (center.y - y) * DIRS[dir].y <= 0.5;
  const ring = (x: number, y: number, count: number, salt: number, place: (i: number, a: number, r: number) => void) => {
    const a0 = hash2(x, y, salt) * TAU;
    for (let i = 0; i < count; i += 1) place(i, a0 + (i * TAU) / count + (hash2(x, y, salt + i + 1) - 0.5) * 0.7, 0.28 + hash2(x, y, salt + 9 + i) * 0.08);
  };

  const RULES: Partial<Record<TerrainKind, (x: number, y: number) => void>> = {
    forest: (x, y) => ring(x, y, 2 + (hash2(x, y, 1) < 0.55 ? 1 : 0), 2, (i, a, r) => {
      const cypress = hash2(x, y, 20 + i) < 0.28;
      const scale = cypress ? 0.66 + hash2(x, y, 30 + i) * 0.18 : 0.7 + hash2(x, y, 30 + i) * 0.24;
      put(cypress ? "treeCypress" : "treeOlive", x, y, Math.sin(a) * r, Math.cos(a) * r, hash2(x, y, 40 + i) * TAU, scale);
    }),
    hill: (x, y) => ring(x, y, 1 + (hash2(x, y, 3) < 0.5 ? 1 : 0), 4, (i, a, r) => {
      const key: PropKey = hash2(x, y, 50 + i) < 0.5 ? "rockA" : "rockB";
      put(key, x, y, Math.sin(a) * (r + 0.04), Math.cos(a) * (r + 0.04), hash2(x, y, 60 + i) * TAU, 0.8 + hash2(x, y, 70 + i) * 0.35);
    }),
    wall: (x, y) => DIRS.forEach((d, dir) => {
      if (isWallish(x + d.x, y + d.y) || !outward(x, y, dir, city)) return;
      put("crenel", x, y, d.x * 0.42, d.y * 0.42, facingAngle(dir), 1);
    }),
    rampart: (x, y) => DIRS.forEach((d, dir) => {
      if (isWallish(x + d.x, y + d.y) || !outward(x, y, dir, camp)) return;
      put("crenel", x, y, d.x * 0.42, d.y * 0.42, facingAngle(dir), 1);
    }),
    gate: (x, y) => {
      const alongX = isWallish(x - 1, y) || isWallish(x + 1, y);
      const center = city ?? camp;
      const dir = alongX ? ((center?.y ?? -1) > y ? 2 : 0) : (center?.x ?? -1) > x ? 3 : 1;
      const rot = facingAngle(dir);
      const base = new Vector3(worldX(map, x), topY(tileAt(map, x, y) ?? { terrain: "gate", height: 0 }), worldZ(map, y));
      const torches = [local(base, rot, 0.42, 1.08, 0.24), local(base, rot, -0.42, 1.08, 0.24)];
      put(flags.includes("gate-open") ? "gateOpen" : "gateClosed", x, y, 0, 0, rot, 1, torches);
    },
    trench: (x, y) => put("trenchStakes", x, y, 0, 0, Math.floor(hash2(x, y, 5) * 4) * (TAU / 4) + (hash2(x, y, 6) - 0.5) * 0.4, 0.9 + hash2(x, y, 7) * 0.2),
    palisade: (x, y) => {
      const alongX = isWallish(x - 1, y) || isWallish(x + 1, y) || !(isWallish(x, y - 1) || isWallish(x, y + 1));
      const dir = alongX ? ((camp?.y ?? -1) > y ? 2 : 0) : (camp?.x ?? -1) > x ? 3 : 1;
      put("palisade", x, y, 0, 0, facingAngle(dir), 1);
    },
    building: (x, y) => put(hash2(x, y, 8) < 0.5 ? "house" : "houseB", x, y, (hash2(x, y, 9) - 0.5) * 0.08, (hash2(x, y, 10) - 0.5) * 0.08, Math.floor(hash2(x, y, 11) * 4) * (TAU / 4), 0.92 + hash2(x, y, 12) * 0.08),
    ruins: (x, y) => {
      put("columnBroken", x, y, (hash2(x, y, 13) - 0.5) * 0.3, (hash2(x, y, 14) - 0.5) * 0.3, hash2(x, y, 15) * TAU, 0.9 + hash2(x, y, 16) * 0.2);
      if (hash2(x, y, 17) < 0.4) put("rockB", x, y, 0.3, -0.26, hash2(x, y, 18) * TAU, 0.55);
    },
    shallow: (x, y) => {
      const land = DIRS.findIndex((d) => {
        const t = tileAt(map, x + d.x, y + d.y);
        return !!t && !isWet(t.terrain);
      });
      if (land < 0 || hash2(x, y, 19) > 0.42) return;
      put("reeds", x, y, DIRS[land].x * 0.3, DIRS[land].y * 0.3, hash2(x, y, 21) * TAU, 0.8 + hash2(x, y, 22) * 0.3);
    },
    plain: (x, y) => {
      if (hash2(x, y, 23) > 0.1) return;
      const a = hash2(x, y, 24) * TAU;
      put("bush", x, y, Math.sin(a) * 0.33, Math.cos(a) * 0.33, a, 0.6 + hash2(x, y, 25) * 0.3);
    },
  };
  map.tiles.forEach((tile, i) => RULES[tile.terrain]?.(i % map.width, Math.floor(i / map.width)));
  out.push(...templeFacades(map), ...mapDecor(map, flags));
  return out;
}

// 신전 칸 무리마다 맨 뒷줄(가장 작은 y)에 앞면을 하나 세운다(앞은 +y, 무리 안쪽을 본다)
function templeFacades(map: BattleMap): Placement[] {
  const seen = new Set<number>();
  const out: Placement[] = [];
  map.tiles.forEach((tile, start) => {
    if (tile.terrain !== "temple" || seen.has(start)) return;
    const region: number[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      region.push(i);
      DIRS.forEach((d) => {
        const x = (i % map.width) + d.x;
        const y = Math.floor(i / map.width) + d.y;
        const j = y * map.width + x;
        if (tileAt(map, x, y)?.terrain !== "temple" || seen.has(j)) return;
        seen.add(j);
        stack.push(j);
      });
    }
    const top = Math.min(...region.map((i) => Math.floor(i / map.width)));
    const row = region.filter((i) => Math.floor(i / map.width) === top).map((i) => i % map.width).sort((a, b) => a - b);
    const x0 = row[Math.max(0, Math.floor((row.length - 2) / 2))];
    const x1 = row.includes(x0 + 1) ? x0 + 1 : x0;
    const y = tileAt(map, x0, top);
    const pos = new Vector3((worldX(map, x0) + worldX(map, x1)) / 2, y ? topY(y) : 0, worldZ(map, top) - 0.05);
    out.push({ key: "temple", pos, rot: 0, scale: x1 > x0 ? 1 : 0.6, tiles: [tileKey(x0, top), tileKey(x1, top)], torches: [] });
  });
  return out;
}

// 목마는 싸움판에서 문이 열린 모양, 「horse-closed」 표지가 있으면(10장 이야기 배경) 닫힌 모양이다
function mapDecor(map: BattleMap, flags: string[]): Placement[] {
  return map.decor.map((d) => {
    const cover = d.kind === "ship"
      ? [{ x: d.x, y: d.y }, { x: d.x + DIRS[d.rot].x, y: d.y + DIRS[d.rot].y }]
      : d.kind === "horse"
        ? [{ x: d.x, y: d.y }, { x: d.x + 1, y: d.y }, { x: d.x, y: d.y + 1 }, { x: d.x + 1, y: d.y + 1 }]
        : [{ x: d.x, y: d.y }];
    const tiles = cover.map((p) => tileAt(map, p.x, p.y)).filter((t) => t !== null);
    const height = tiles.reduce((m, t) => Math.max(m, surfaceY(t)), -1);
    const cx = cover.reduce((s, p) => s + worldX(map, p.x), 0) / cover.length;
    const cz = cover.reduce((s, p) => s + worldZ(map, p.y), 0) / cover.length;
    const pos = new Vector3(cx, Math.max(height, 0) - (d.kind === "ship" ? 0.04 : 0), cz);
    const torches = d.kind === "tower" ? [new Vector3(cx, pos.y + 0.86, cz)] : [];
    const key: PropKey = d.kind === "horse" && flags.includes("horse-closed") ? "horseClosed" : d.kind;
    return { key, pos, rot: facingAngle(d.rot), scale: 1, tiles: cover.map((p) => tileKey(p.x, p.y)), torches };
  });
}
