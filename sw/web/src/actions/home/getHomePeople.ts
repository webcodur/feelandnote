'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { cachedList, LIST_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { HOME_PEOPLE_MIN_CONTENT_COUNT, orderHomePeople, rotateHomePeople, type HomePeoplePurpose } from '@/lib/homePeople'
import { countryFirst, parseVisitorCountry } from '@/lib/visitorCountry'
import { getKSTDateKey } from '@/lib/game/date-seed'

export interface HomePersonCandidate {
  id: string
  slug: string
  nickname: string
  nickname_en: string | null
  avatar_url: string
  nationality: string | null
  total_score: number
}

async function candidateDirectory(): Promise<HomePersonCandidate[]> {
  return cachedList(CACHE_TAGS.CELEBS, ['home-people-v4-influence-directory'], async () => {
    const db = createStaticClient()
    const rows = await selectAllPages<HomePersonCandidate>((from, to) => db.rpc('get_celebs_sorted', {
      p_sort_by: 'influence', p_limit: null,
      p_offset: 0, p_min_content_count: HOME_PEOPLE_MIN_CONTENT_COUNT, p_include_inactive: false,
      p_celeb_realities: [...LISTING_DEFAULT_REALITIES],
    }).select('id,slug,nickname,nickname_en,avatar_url,nationality,total_score').order('id').range(from, to))
    return rows.filter(person => person.slug && person.avatar_url && Number.isFinite(person.total_score) && person.total_score > 0)
  }, { revalidate: LIST_REVALIDATE, extraTags: [CACHE_TAGS.CONTENTS] })
}

/** 전체 공개 후보는 공유하고, 요청 국가·날짜·구획에 맞는 편성은 캐시 밖에서 계산한다. */
export async function getHomePeople(visitorCountry: string | null, purpose: HomePeoplePurpose = 'discovery', day: string = getKSTDateKey()): Promise<HomePersonCandidate[]> {
  const country = parseVisitorCountry(visitorCountry)
  const people = rotateHomePeople(await candidateDirectory(), day, purpose)
  const ordered = orderHomePeople(people, country, person => person.id, person => person.nationality, person => person.total_score)
  return purpose === 'discovery' ? countryFirst(ordered, country, person => person.nationality) : ordered
}
