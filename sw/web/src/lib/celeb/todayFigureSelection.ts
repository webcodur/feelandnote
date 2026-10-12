import { dateKeyToSeed } from '../game/date-seed'
import { INFLUENCE_RANK_THRESHOLDS } from '@feelandnote/influence-constants'

export interface TodayFigureCandidate {
  id: string
  nationality: string | null
}

export const TODAY_FIGURE_FALLBACK_COUNTRY = 'US'
export const TODAY_FIGURE_RECENT_DAYS = 14
export const TODAY_FIGURE_MIN_INFLUENCE_SCORE = INFLUENCE_RANK_THRESHOLDS.C
const DAY_MS = 86400000
const ROTATION_EPOCH = Date.parse('2020-01-01T00:00:00Z')

export interface TodayFigurePick {
  id: string
}

// 날짜별 무작위 편성을 재현해 국가별 노출 이력을 저장하지 않고 최근 재등장을 막는다.
export function pickCountryTodayFigure(
  candidates: readonly TodayFigureCandidate[], today: string, country: string,
): TodayFigurePick | null {
  if (!candidates.length) return null
  const ordered = [...candidates].sort((a, b) => a.id.localeCompare(b.id))

  const end = Date.parse(`${today}T00:00:00Z`)
  if (!Number.isFinite(end)) return null
  const cycle = Math.max(ordered.length, TODAY_FIGURE_RECENT_DAYS + 1)
  const offset = (dateKeyToSeed(country) >>> 0) % cycle
  const lastShown = new Map<string, number>()
  let selected: TodayFigurePick | null = null
  const start = Math.min(ROTATION_EPOCH, end)
  for (let time = start, day = 0; time <= end; time += DAY_MS, day++) {
    const fresh = (id: string) => day - (lastShown.get(id) ?? -Infinity) > TODAY_FIGURE_RECENT_DAYS
    selected = null
    const slot = (day + offset) % cycle
    // Small national pools have empty slots; those days use the US pool.
    if (slot < ordered.length) {
      const available = ordered.filter(candidate => fresh(candidate.id))
      if (available.length) {
        const random = seededRandom(dateKeyToSeed(`${country}:${time}`))
        selected = { id: available[Math.floor(random * available.length)].id }
      }
    }
    if (selected) lastShown.set(selected.id, day)
  }
  return selected
}

// 시드를 충분히 섞어 인물 ID·날짜의 비슷한 문자열이 선정 순서에 쏠리지 않게 한다.
function seededRandom(seed: number): number {
  let value = seed + 0x6D2B79F5
  value = Math.imul(value ^ value >>> 15, value | 1)
  value ^= value + Math.imul(value ^ value >>> 7, value | 61)
  return ((value ^ value >>> 14) >>> 0) / 4294967296
}

/** Country preference is independent of display language; all visitors share the US fallback. */
export function selectTodayFigure(
  candidates: readonly TodayFigureCandidate[], today: string, country: string | null,
): TodayFigurePick | null {
  const preferred = country ?? TODAY_FIGURE_FALLBACK_COUNTRY
  const local = pickCountryTodayFigure(candidates.filter(row => row.nationality === preferred), today, preferred)
  if (local || preferred === TODAY_FIGURE_FALLBACK_COUNTRY) return local
  return pickCountryTodayFigure(
    candidates.filter(row => row.nationality === TODAY_FIGURE_FALLBACK_COUNTRY), today, TODAY_FIGURE_FALLBACK_COUNTRY,
  )
}
