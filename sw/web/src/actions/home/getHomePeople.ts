'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { HOME_GRAPH_MEDIA } from '@/components/features/home/introduction/config'
import { cachedList, LIST_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { HOME_PEOPLE_MIN_CONTENT_COUNT, isHomePersonContemporary, isHomeShowcasePerson, orderHomePeople, rotateHomePeople } from '@/lib/homePeople'
import { countryFirst, parseVisitorCountry } from '@/lib/visitorCountry'
import { getKSTDateKey } from '@/lib/game/date-seed'
import type { HomeGraphMode } from '@/components/features/home/introduction/types'

export interface HomePersonCandidate {
  id: string
  slug: string
  nickname: string
  nickname_en: string | null
  avatar_url: string
  nationality: string | null
  total_score: number
  category_count: number
  contemporary: boolean
}

type HomePersonRow = Omit<HomePersonCandidate, 'category_count' | 'contemporary'> & { birth_date: string | null; death_date: string | null }

async function candidateDirectory(): Promise<HomePersonCandidate[]> {
  return cachedList(CACHE_TAGS.CELEBS, ['home-people-v6-influence-categories'], async () => {
    const db = createStaticClient()
    const listing = { p_sort_by: 'influence', p_limit: null, p_offset: 0, p_include_inactive: false, p_celeb_realities: [...LISTING_DEFAULT_REALITIES] }
    const [rows, categories] = await Promise.all([
      selectAllPages<HomePersonRow>((from, to) => db.rpc('get_celebs_sorted', { ...listing, p_min_content_count: HOME_PEOPLE_MIN_CONTENT_COUNT })
        .select('id,slug,nickname,nickname_en,avatar_url,nationality,total_score,birth_date,death_date').order('id').range(from, to)),
      Promise.all(HOME_GRAPH_MEDIA.map(type => selectAllPages<{ id: string }>((from, to) => db.rpc('get_celebs_sorted', { ...listing, p_content_type: type, p_min_content_count: 1 })
        .select('id').order('id').range(from, to)))),
    ])
    const categoryCount = new Map<string, number>()
    for (const row of categories.flat()) categoryCount.set(row.id, (categoryCount.get(row.id) ?? 0) + 1)
    return rows.filter(person => person.slug && person.avatar_url && Number.isFinite(person.total_score) && person.total_score > 0)
      .map(({ birth_date, death_date, ...person }) => ({ ...person,
        category_count: categoryCount.get(person.id) ?? 0,
        contemporary: isHomePersonContemporary(birth_date, death_date) }))
  }, { revalidate: LIST_REVALIDATE, extraTags: [CACHE_TAGS.CONTENTS] })
}

/** 상단 구획 편성. 접속 국가를 보지 않으며, 기준을 넘은 현대인으로 못 채울 때만 나머지 후보를 쓴다. */
export async function getHomeShowcasePeople(mode: HomeGraphMode, day: string = getKSTDateKey()): Promise<HomePersonCandidate[]> {
  const people = rotateHomePeople(await candidateDirectory(), day, mode)
  return [...people.filter(isHomeShowcasePerson), ...people.filter(person => !isHomeShowcasePerson(person))]
}

/** 하단 탐색 입구 편성. 접속 국가 인물을 먼저 채우고 역사 인물은 뒤에 남긴다. */
export async function getHomeDiscoveryPeople(visitorCountry: string | null, day: string = getKSTDateKey()): Promise<HomePersonCandidate[]> {
  const country = parseVisitorCountry(visitorCountry)
  const ordered = orderHomePeople(rotateHomePeople(await candidateDirectory(), day, 'discovery'), country, person => person.id, person => person.nationality)
  const placed = countryFirst(ordered, country, person => person.nationality)
  return [...placed.filter(person => person.contemporary), ...placed.filter(person => !person.contemporary)]
}
