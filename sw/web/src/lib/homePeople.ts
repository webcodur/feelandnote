import { dateKeyToSeed } from './game/date-seed'
import { INFLUENCE_RANK_THRESHOLDS } from '@feelandnote/influence-constants'

export const HOME_PEOPLE_COUNT = 3
export const HOME_PEOPLE_MIN_CONTENT_COUNT = 5
export const HOME_PEOPLE_GRAPH_ATTEMPTS = 12
export const HOME_PEOPLE_LEAD_INFLUENCE = INFLUENCE_RANK_THRESHOLDS.C
export type HomePeoplePurpose = 'appreciations' | 'books' | 'discovery'

/** 영향력은 노출 확률을 높이고, 날짜·구획 시드는 상위 몇 명에 편성이 고정되는 것을 막는다. */
export function rotateHomePeople<T extends { id: string; total_score: number }>(people: readonly T[], day: string, purpose: HomePeoplePurpose): T[] {
  const rank = (person: T) => {
    let value = dateKeyToSeed(`${day}:${purpose}:${person.id}`)
    value = Math.imul(value ^ value >>> 16, 0x21f0aaad)
    value = Math.imul(value ^ value >>> 15, 0x735a2d97)
    const random = (((value ^ value >>> 15) >>> 0) + 0.5) / 4294967296
    return -Math.log(random) / Math.max(1, person.total_score) ** 2
  }
  return people.map(person => ({ person, rank: rank(person) }))
    .sort((a, b) => a.rank - b.rank || a.person.id.localeCompare(b.person.id)).map(item => item.person)
}

/** 각 나라 안의 기존 순위를 지키면서 접속 국가·미국 인물을 번갈아 배치한다. */
export function orderHomePeople<T>(people: readonly T[], country: string | null, identity: (person: T) => string, nationality: (person: T) => string | null | undefined, influence?: (person: T) => number): T[] {
  const unique = [...new Map(people.map(person => [identity(person), person])).values()]
  const lead = (group: T[]) => {
    const index = influence ? group.findIndex(person => influence(person) >= HOME_PEOPLE_LEAD_INFLUENCE) : -1
    return index > 0 ? [group[index], ...group.slice(0, index), ...group.slice(index + 1)] : group
  }
  const local = lead(country ? unique.filter(person => nationality(person) === country) : [])
  const american = lead(country === 'US' ? [] : unique.filter(person => nationality(person) === 'US'))
  const preferred = new Set([...local, ...american].map(identity))
  const result: T[] = []
  for (let index = 0; index < Math.max(local.length, american.length); index += 1) {
    if (local[index]) result.push(local[index])
    if (american[index]) result.push(american[index])
  }
  return [...result, ...unique.filter(person => !preferred.has(identity(person)))]
}
