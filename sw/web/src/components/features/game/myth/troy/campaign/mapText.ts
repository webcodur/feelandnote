/*
  파일명: components/features/game/myth/troy/campaign/mapText.ts
  기능: 글자 지도 → 싸움판
  책임: 장 자료가 글자 줄로 적은 지형·높이를 BattleMap으로 바꾼다. 글자 한 칸이 판 한 칸이다.
        모르는 글자·줄 길이 어긋남은 바로 오류를 던져 장 자료의 실수를 일찍 드러낸다.
*/ // ------------------------------
import type { BattleMap, Decor, Mood, TerrainKind } from "../engine/types";

// . 풀밭 · s 모래 · r 길 · f 숲 · h 언덕 · w 여울 · ~ 물 · # 성벽 · = 성벽 위 길 · G 성문 · c 진영 · S 배
// · t 도랑 · p 말뚝 벽 · b 집 · T 신전 · k 돌길 · u 폐허
export const MAP_GLYPHS: Record<string, TerrainKind> = {
  ".": "plain", s: "sand", r: "road", f: "forest", h: "hill", w: "shallow", "~": "water",
  "#": "wall", "=": "rampart", G: "gate", c: "camp", S: "ship", t: "trench", p: "palisade",
  b: "building", T: "temple", k: "stone", u: "ruins",
};

export interface MapText {
  rows: string[];
  // 같은 크기의 숫자 줄(0~4). 없으면 모두 0
  heights?: string[];
  decor?: Decor[];
  mood: Mood;
}

export function parseMap({ rows, heights, decor = [], mood }: MapText): BattleMap {
  const width = rows[0]?.length ?? 0;
  if (width === 0) throw new Error("빈 지도");
  if (heights && heights.length !== rows.length) throw new Error(`높이 줄 수 ${heights.length} ≠ 지형 줄 수 ${rows.length}`);
  const tiles = rows.flatMap((row, y) => {
    if (row.length !== width) throw new Error(`${y}번째 줄 길이 ${row.length} ≠ ${width}`);
    const heightRow = heights?.[y] ?? "0".repeat(width);
    if (heightRow.length !== width) throw new Error(`${y}번째 높이 줄 길이 ${heightRow.length} ≠ ${width}`);
    return [...row].map((glyph, x) => {
      const terrain = MAP_GLYPHS[glyph];
      if (!terrain) throw new Error(`모르는 지형 글자 「${glyph}」 (${x}, ${y})`);
      const height = Number(heightRow[x]);
      if (!Number.isInteger(height) || height < 0 || height > 4) throw new Error(`높이 글자 「${heightRow[x]}」 (${x}, ${y})`);
      return { terrain, height };
    });
  });
  return { width, height: rows.length, tiles, decor, mood };
}
