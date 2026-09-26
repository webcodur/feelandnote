import { createHash } from 'node:crypto'

export interface RecommendationCandidate {
  id: string
  total_score: number | null
  content_count: number
}

// Every eligible person keeps one ticket. Influence, recorded works, and an actual
// country-trend match add tickets without turning discovery into a fixed ranking.
const INFLUENCE_BONUS = 3
const CONTENT_BONUS = 2
const TREND_BONUS = 2

function percentileByValue(values: number[]): Map<number, number> {
  const sorted = [...values].sort((a, b) => a - b)
  const result = new Map<number, number>()
  for (let index = 0; index < sorted.length; index++) {
    if (!result.has(sorted[index])) result.set(sorted[index], sorted.length === 1 ? 0 : index / (sorted.length - 1))
  }
  return result
}

function seededDraw(id: string, seed: string): number {
  const hex = createHash('sha256').update(`${seed}:${id}`).digest('hex').slice(0, 8)
  return (parseInt(hex, 16) + 0.5) / 0x1_0000_0000
}

/** Stable weighted sampling without replacement for a visit and trend snapshot. */
export function orderRecommendedCelebs<T extends RecommendationCandidate>(
  candidates: T[], seed: string, trendingIds: ReadonlySet<string>,
): T[] {
  if (candidates.length < 2) return candidates
  const influenceRanks = percentileByValue(candidates.map(row => Math.max(0, row.total_score ?? 0)))
  const contentRanks = percentileByValue(candidates.map(row => Math.max(0, row.content_count)))
  return candidates
    .map(row => {
      const influence = influenceRanks.get(Math.max(0, row.total_score ?? 0)) ?? 0
      const content = contentRanks.get(Math.max(0, row.content_count)) ?? 0
      const weight = 1 + INFLUENCE_BONUS * influence + CONTENT_BONUS * content
        + (trendingIds.has(row.id) ? TREND_BONUS : 0)
      return { row, priority: -Math.log(seededDraw(row.id, seed)) / weight }
    })
    .sort((a, b) => a.priority - b.priority || a.row.id.localeCompare(b.row.id))
    .map(item => item.row)
}
