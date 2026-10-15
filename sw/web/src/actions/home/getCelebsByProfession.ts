'use server'

import { getCelebs } from './getCelebs'
import { CELEB_LISTING_LIMITS } from '@/constants/celebListingPolicy'
import { cachedList } from '@/lib/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { getCelebProfessions } from '@/lib/celeb-professions'
import type { CelebProfile } from '@/types/home'

export interface ProfessionSection {
  profession: string
  label: string
  celebs: CelebProfile[]
  totalCount: number
}

async function fetchCelebsByProfession(): Promise<ProfessionSection[]> {
  const results: ProfessionSection[] = []
  const professions = await getCelebProfessions()
  // 전체 직군을 한꺼번에 시작해 서버의 목록 조회 상한을 소진하지 않는다.
  const batchSize = CELEB_LISTING_LIMITS.professionBatchSize
  for (let offset = 0; offset < professions.length; offset += batchSize) {
    results.push(...await Promise.all(professions.slice(offset, offset + batchSize).map(async (p) => {
      const { celebs, total, error } = await getCelebs({
        profession: p.value,
        limit: 12,
        sortBy: 'composite',
        minContentCount: 0,
        includeInactive: false,
      })
      if (error) throw new Error('직군별 인물 목록 조회 실패')
      return {
        profession: p.value,
        label: p.value,
        celebs,
        totalCount: total,
      }
    })))
  }

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
    { extraTags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES, CACHE_TAGS.FACTIONS] },
  )
}
