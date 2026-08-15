'use server'

import { getCelebs } from './getCelebs'
import { cachedList } from '@/lib/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { CELEB_PROFESSIONS } from '@feelandnote/shared/constants/celeb-professions'
import type { CelebProfile } from '@/types/home'

export interface ProfessionSection {
  profession: string
  label: string
  celebs: CelebProfile[]
  totalCount: number
}

async function fetchCelebsByProfession(): Promise<ProfessionSection[]> {
  const results = await Promise.all(
    CELEB_PROFESSIONS.map(async (p) => {
      const { celebs, total } = await getCelebs({
        profession: p.value,
        limit: 12,
        sortBy: 'composite',
        minContentCount: 0,
        includeInactive: false,
      })
      return {
        profession: p.value,
        label: p.value,
        celebs,
        totalCount: total,
      }
    })
  )

  return results.filter((s) => s.totalCount > 0)
}

/**
 * 직군별 캐러셀 목록. getCelebs를 직군 수만큼 병렬로 부르는 값비싼 조회라 목록 캐시로 감싼다.
 * getCelebs와 같은 도메인(celebs·contents·dialogues·tags)을 읽으므로 같은 태그 조합을 쓴다.
 */
export async function getCelebsByProfession(): Promise<ProfessionSection[]> {
  return cachedList(
    CACHE_TAGS.CELEBS,
    ['celebs-by-profession'],
    fetchCelebsByProfession,
    { extraTags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES, CACHE_TAGS.TAGS] },
  )
}
