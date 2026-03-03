'use server'

import { getCelebs } from './getCelebs'
import { CELEB_PROFESSIONS } from '@feelandnote/shared/constants/celeb-professions'
import type { CelebProfile } from '@/types/home'

export interface ProfessionSection {
  profession: string
  label: string
  celebs: CelebProfile[]
  totalCount: number
}

export async function getCelebsByProfession(): Promise<ProfessionSection[]> {
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
