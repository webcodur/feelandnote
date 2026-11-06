import { INFLUENCE_RANK_THRESHOLDS } from '@feelandnote/influence-constants'
import { getCelebYear, isCelebDeceased } from './celeb/lifespan'
import { dateKeyToSeed } from './game/date-seed'

export const HOME_PEOPLE_COUNT = 3
export const HOME_PEOPLE_MIN_CONTENT_COUNT = 5
export const HOME_PEOPLE_GRAPH_ATTEMPTS = 12
export const HOME_PEOPLE_CONTEMPORARY_BIRTH_YEAR = 1900
export const HOME_SHOWCASE_MIN_INFLUENCE = INFLUENCE_RANK_THRESHOLDS.C
export type HomePeoplePurpose = 'appreciations' | 'books' | 'discovery'

/** 기준 연도 이후 태어나 생존 중인 인물을 현대인으로 본다. 일일 추천 정렬과 같은 기준이다. */
export function isHomePersonContemporary(birthDate: string | null | undefined, deathDate: string | null | undefined) {
  const birthYear = getCelebYear(birthDate)
  return birthYear !== null && birthYear >= HOME_PEOPLE_CONTEMPORARY_BIRTH_YEAR && !isCelebDeceased(birthDate, deathDate)
}

/** 상단 구획은 국적과 기록 수를 보지 않고, 영향력 기준을 넘은 현대인을 먼저 쓴다. */
export function isHomeShowcasePerson(person: { contemporary: boolean; total_score: number }) {
  return person.contemporary && person.total_score >= HOME_SHOWCASE_MIN_INFLUENCE
}

/** 영향력이 높고 책·음악·영상·게임을 고르게 기록한 인물일수록 자주 나온다. */
export function homePersonWeight(person: { total_score: number; category_count: number }) {
  return Math.max(1, person.total_score) ** 2 * Math.max(1, person.category_count) ** 2
}

/** 가중치는 노출 확률만 높이고, 날짜·구획 시드는 상위 몇 명에 편성이 고정되는 것을 막는다. */
export function rotateHomePeople<T extends { id: string; total_score: number; category_count: number }>(people: readonly T[], day: string, purpose: HomePeoplePurpose): T[] {
  const rank = (person: T) => {
    let value = dateKeyToSeed(`${day}:${purpose}:${person.id}`)
    value = Math.imul(value ^ value >>> 16, 0x21f0aaad)
    value = Math.imul(value ^ value >>> 15, 0x735a2d97)
    const random = (((value ^ value >>> 15) >>> 0) + 0.5) / 4294967296
    return -Math.log(random) / homePersonWeight(person)
  }
  return people.map(person => ({ person, rank: rank(person) }))
    .sort((a, b) => a.rank - b.rank || a.person.id.localeCompare(b.person.id)).map(item => item.person)
}

/** 하단 탐색 입구용: 각 나라 안의 기존 순위를 지키면서 접속 국가·미국 인물을 번갈아 배치한다. */
export function orderHomePeople<T>(people: readonly T[], country: string | null, identity: (person: T) => string, nationality: (person: T) => string | null | undefined): T[] {
  const unique = [...new Map(people.map(person => [identity(person), person])).values()]
  const local = country ? unique.filter(person => nationality(person) === country) : []
  const american = country === 'US' ? [] : unique.filter(person => nationality(person) === 'US')
  const preferred = new Set([...local, ...american].map(identity))
  const result: T[] = []
  for (let index = 0; index < Math.max(local.length, american.length); index += 1) {
    if (local[index]) result.push(local[index])
    if (american[index]) result.push(american[index])
  }
  return [...result, ...unique.filter(person => !preferred.has(identity(person)))]
}
