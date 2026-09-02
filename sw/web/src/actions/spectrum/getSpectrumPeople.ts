'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

export interface SpectrumPersonSummary {
  id: string
  nickname: string
  profession: string | null
  avatar_url: string | null
  title: string | null
}

interface SpectrumJoinedProfileRow {
  nickname: string | null
  profession: string | null
  avatar_url: string | null
  title: string | null
}

interface SpectrumPeopleRow {
  celeb_id: string
  celeb: SpectrumJoinedProfileRow | SpectrumJoinedProfileRow[] | null
}

const parseProfile = (row: SpectrumPeopleRow): SpectrumJoinedProfileRow | null =>
  (Array.isArray(row.celeb) ? row.celeb[0] : row.celeb) ?? null

async function fetchSpectrumPeople(limit: number): Promise<SpectrumPersonSummary[]> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('celeb_persona')
    .select(`
      celeb_id,
      celeb:celebs!celeb_persona_celebs_fkey!inner (
        nickname,
        profession,
        avatar_url,
        title
      )
    `)
    .eq('celeb.publication_status', 'active')
    .limit(limit)

  throwOnQueryError('[getSpectrumPeople]', error)

  if (!data) {
    return []
  }

  return (data as SpectrumPeopleRow[])
    .map((row) => {
      const profile = parseProfile(row)
      return {
        id: row.celeb_id,
        nickname: profile?.nickname ?? '',
        profession: profile?.profession ?? null,
        avatar_url: profile?.avatar_url ?? null,
        title: profile?.title ?? null,
      }
    })
    .filter((person) => person.nickname.length > 0)
    .sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'))
}

const getSpectrumPeopleCached = unstable_cache(
  fetchSpectrumPeople,
  ['spectrum-people'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.SPECTRUM] }
)

export async function getSpectrumPeople(limit: number = 200): Promise<SpectrumPersonSummary[]> {
  return withQueryFallback('getSpectrumPeople', () => getSpectrumPeopleCached(limit), [])
}
