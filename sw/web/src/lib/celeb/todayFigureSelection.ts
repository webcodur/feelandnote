import { dateKeyToSeed } from '../game/date-seed'

export interface TodayFigureCandidate {
  id: string
  nationality: string | null
  birth_date: string | null
  content_count: number
}

export const TODAY_FIGURE_FALLBACK_COUNTRY = 'US'
export const TODAY_FIGURE_RECENT_DAYS = 14
const DAY_MS = 86400000
const ROTATION_EPOCH = Date.parse('2020-01-01T00:00:00Z')

export interface TodayFigurePick {
  id: string
  birthday: boolean
}

/** Replay a small deterministic schedule instead of storing per-country exposure history. */
export function pickCountryTodayFigure(
  candidates: readonly TodayFigureCandidate[], today: string, country: string,
): TodayFigurePick | null {
  if (!candidates.length) return null
  const ordered = candidates.map(candidate => ({
    candidate, rank: dateKeyToSeed(`${country}:${candidate.id}`) >>> 0,
  })).sort((a, b) => a.rank - b.rank || a.candidate.id.localeCompare(b.candidate.id))
    .map(row => row.candidate)
  const birthdays = new Map<string, TodayFigureCandidate[]>()
  const birthdayParts = new Map<string, [number, number]>()
  for (const candidate of candidates) {
    const monthDay = candidate.birth_date?.match(/-(\d{2}-\d{2})$/)?.[1]
    if (!monthDay) continue
    birthdayParts.set(candidate.id, monthDay.split('-').map(Number) as [number, number])
    const group = birthdays.get(monthDay) ?? []
    group.push(candidate)
    birthdays.set(monthDay, group)
  }
  for (const group of birthdays.values()) {
    group.sort((a, b) => b.content_count - a.content_count || a.id.localeCompare(b.id))
  }

  const end = Date.parse(`${today}T00:00:00Z`)
  if (!Number.isFinite(end)) return null
  const cycle = Math.max(ordered.length, TODAY_FIGURE_RECENT_DAYS + 1)
  const offset = (dateKeyToSeed(country) >>> 0) % cycle
  const lastShown = new Map<string, number>()
  let selected: TodayFigurePick | null = null
  const start = Math.min(ROTATION_EPOCH, end)
  for (let time = start, day = 0; time <= end; time += DAY_MS, day++) {
    const fresh = (id: string) => day - (lastShown.get(id) ?? -Infinity) > TODAY_FIGURE_RECENT_DAYS
    const current = new Date(time)
    const birthday = birthdays.get(current.toISOString().slice(5, 10))?.find(row => fresh(row.id))
    selected = birthday ? { id: birthday.id, birthday: true } : null
    const slot = (day + offset) % cycle
    // Small national pools have empty slots; those days use the US pool.
    if (!selected && slot < ordered.length) {
      // At most the recent window is unavailable, even in a large national pool.
      for (let step = 0; step < Math.min(ordered.length, TODAY_FIGURE_RECENT_DAYS + 1); step++) {
        const candidate = ordered[(slot + step) % ordered.length]
        const parts = birthdayParts.get(candidate.id)
        let nextBirthday = parts ? Date.UTC(current.getUTCFullYear(), parts[0] - 1, parts[1]) : Infinity
        if (nextBirthday < time && parts) nextBirthday = Date.UTC(current.getUTCFullYear() + 1, parts[0] - 1, parts[1])
        // Keep the birthday available instead of introducing it just before that day.
        const reservedForBirthday = nextBirthday > time && nextBirthday - time <= TODAY_FIGURE_RECENT_DAYS * DAY_MS
        if (fresh(candidate.id) && !reservedForBirthday) {
          selected = { id: candidate.id, birthday: false }
          break
        }
      }
    }
    if (selected) lastShown.set(selected.id, day)
  }
  return selected
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
