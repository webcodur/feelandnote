import { createHash } from 'node:crypto'

/*
  오늘의 추천(daily_recommend)에 섞이는 트렌드 인물의 일일 추첨.

  점수 자체는 SQL(get_celebs_sorted)이 매긴다 — 여기서는 필터를 통과한 급상승 인물이
  추첨 한 번을 더 받아 첫 페이지 칸에 오를지를 정한다. 주사위는 점수의 날짜 해시와 같은
  md5(id || 날짜)를 쓴다 — 앞 8자리가 점수의 해시 항이므로 「오늘 점수 운이 없던(roll이 낮은)
  트렌드 인물」만 구제 대상이 되고, 이미 점수로 오를 인물은 추첨을 소모하지 않는다.
*/

/** 매칭 인물 한 명이 오늘 슬롯을 얻을 확률. 매칭이 적은 날도 대부분 1명 이상은 오른다 */
export const TREND_DAILY_PROMOTE_PROB = 0.3
/** 첫 페이지가 트렌드로 잠식되지 않게 두는 상한 */
export const TREND_DAILY_PROMOTE_MAX = 3

/** 인물·날짜로 고정되는 주사위 두 개 — 당첨 여부(roll)와 꽂힐 칸(slot) */
export function trendDailyDice(id: string, day: string): { roll: number; slot: number } {
  const hex = createHash('md5').update(`${id}${day}`).digest('hex')
  return {
    roll: parseInt(hex.slice(0, 8), 16) / 0x1_0000_0000,
    slot: parseInt(hex.slice(8, 16), 16) / 0x1_0000_0000,
  }
}

/** 트렌드 순위 순으로 들어온 매칭 행에서 오늘의 당첨자를 고른다. 상한까지만 남긴다 */
export function selectTrendPromotions<T extends { id: string }>(matchRankedRows: T[], day: string): T[] {
  return matchRankedRows
    .filter((row) => trendDailyDice(row.id, day).roll < TREND_DAILY_PROMOTE_PROB)
    .slice(0, TREND_DAILY_PROMOTE_MAX)
}

/**
 * 당첨자를 페이지의 시드 칸에 꽂는다. 칸은 인물·날짜·페이지 크기로 고정되어 같은 날에는
 * 같은 자리에 뜬다. 당첨자가 없으면 남은 행을 그대로 돌려준다.
 */
export function mergePromotedIntoPage<T extends { id: string }>(
  promoted: T[],
  remaining: T[],
  limit: number,
  day: string,
): T[] {
  if (promoted.length === 0) return remaining
  const rows = remaining.slice()
  const taken = new Set<number>()
  for (const row of promoted) {
    const span = Math.max(1, limit)
    let slot = Math.min(Math.floor(trendDailyDice(row.id, day).slot * span), span - 1)
    while (taken.has(slot)) slot = (slot + 1) % span
    taken.add(slot)
    rows.splice(Math.min(slot, rows.length), 0, row)
  }
  return rows
}
