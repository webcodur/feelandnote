/*
  파일명: components/features/game/myth/troy/scene/water.ts
  기능: 물 면 짓기
  책임: 물·여울 칸 위 물 면을 한 덩이 BufferGeometry로 합친다(그리기 한 번). 꼭짓점마다 뭍까지 거리(거품)와 깊이를 넘기고,
        판 가장자리에 걸친 물 칸에는 물 단면 벽을 세운다. 거리·깊이는 위치만으로 셈해 칸 경계가 이어진다.
*/ // ------------------------------
import { BufferGeometry, Float32BufferAttribute, Mesh, type ShaderMaterial } from "three";
import type { BattleMap } from "../engine/types";
import { DIRS, isWet, tileAt, topY, waterY } from "./grid";

const SEG = 6;

// 연속 칸 좌표 (u, v)에서 가장 가까운 뭍 칸까지 거리(1에서 자른다). 판 밖은 물로 본다(단면에는 거품이 없다)
function shoreDist(map: BattleMap, u: number, v: number): number {
  let d = 1;
  const cx = Math.floor(u);
  const cy = Math.floor(v);
  for (let ty = cy - 2; ty <= cy + 1; ty += 1) {
    for (let tx = cx - 2; tx <= cx + 1; tx += 1) {
      const tile = tileAt(map, tx, ty);
      if (!tile || isWet(tile.terrain)) continue;
      const dx = Math.max(tx - u, 0, u - (tx + 1));
      const dy = Math.max(ty - v, 0, v - (ty + 1));
      d = Math.min(d, Math.hypot(dx, dy));
    }
  }
  return d;
}

// 칸 가운데 깊이 값(물 1 · 그 밖 0)을 양선형으로 이은 값
function deepAt(map: BattleMap, u: number, v: number): number {
  const sx = u - 0.5;
  const sy = v - 0.5;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const fx = sx - x0;
  const fy = sy - y0;
  const d = (x: number, y: number) => {
    const tile = tileAt(map, Math.min(map.width - 1, Math.max(0, x)), Math.min(map.height - 1, Math.max(0, y)));
    return tile?.terrain === "water" ? 1 : 0;
  };
  const top = d(x0, y0) * (1 - fx) + d(x0 + 1, y0) * fx;
  const bottom = d(x0, y0 + 1) * (1 - fx) + d(x0 + 1, y0 + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

interface Buffers {
  pos: number[];
  shore: number[];
  deep: number[];
  wall: number[];
  index: number[];
}

function addSurface(map: BattleMap, x: number, y: number, surface: number, b: Buffers) {
  const base = b.pos.length / 3;
  for (let j = 0; j <= SEG; j += 1) {
    for (let i = 0; i <= SEG; i += 1) {
      const u = x + i / SEG;
      const v = y + j / SEG;
      b.pos.push(u - map.width / 2, surface, v - map.height / 2);
      b.shore.push(shoreDist(map, u, v));
      b.deep.push(deepAt(map, u, v));
      b.wall.push(0);
    }
  }
  for (let j = 0; j < SEG; j += 1) {
    for (let i = 0; i < SEG; i += 1) {
      const a = base + j * (SEG + 1) + i;
      const c = a + SEG + 1;
      b.index.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
}

// 판 밖으로 난 모서리에 바닥부터 물 면까지 물 단면을 세운다
function addWalls(map: BattleMap, x: number, y: number, surface: number, bed: number, b: Buffers) {
  DIRS.forEach((d) => {
    if (tileAt(map, x + d.x, y + d.y)) return;
    const cx = x + 0.5 + d.x * 0.5 - map.width / 2;
    const cz = y + 0.5 + d.y * 0.5 - map.height / 2;
    const ax = d.y === 0 ? 0 : 0.5;
    const az = d.x === 0 ? 0 : 0.5;
    const base = b.pos.length / 3;
    const deep = deepAt(map, x + 0.5, y + 0.5);
    [[-1, bed], [1, bed], [-1, surface], [1, surface]].forEach(([s, h]) => {
      b.pos.push(cx + ax * s, h, cz + az * s);
      b.shore.push(1);
      b.deep.push(deep);
      b.wall.push(1);
    });
    b.index.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  });
}

export function buildWater(map: BattleMap, material: ShaderMaterial): Mesh | null {
  const b: Buffers = { pos: [], shore: [], deep: [], wall: [], index: [] };
  map.tiles.forEach((tile, i) => {
    if (!isWet(tile.terrain)) return;
    const x = i % map.width;
    const y = Math.floor(i / map.width);
    addSurface(map, x, y, waterY(tile), b);
    addWalls(map, x, y, waterY(tile), topY(tile) - 0.002, b);
  });
  if (b.index.length === 0) return null;
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(b.pos, 3));
  geo.setAttribute("aShore", new Float32BufferAttribute(b.shore, 1));
  geo.setAttribute("aDeep", new Float32BufferAttribute(b.deep, 1));
  geo.setAttribute("aWall", new Float32BufferAttribute(b.wall, 1));
  geo.setIndex(b.index);
  geo.computeBoundingSphere();
  const mesh = new Mesh(geo, material);
  mesh.renderOrder = 2;
  return mesh;
}
