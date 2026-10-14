'use server'

import { getLocale } from 'next-intl/server'
import { coalesceCacheQuery } from '@/lib/cacheQuery'
import { CLASSICS_PAGE_SIZE, classicsQueryKey, validateClassicsQuery, type ClassicsQuery } from '@/lib/library/classicsQuery'
import { getChosenLibrary } from './chosen'
import { getEraContents } from './era'
import { getLibraryByProfession } from './profession'
import type { LibraryResult } from './types'

/** Initial render and filter changes share validation, paging and error handling. */
export async function getClassicsLibrary(input: ClassicsQuery): Promise<LibraryResult> {
  const query = validateClassicsQuery(input)
  const locale = await getLocale()
  const params = { category: query.category === 'ALL' ? undefined : query.category,
    page: query.page, limit: CLASSICS_PAGE_SIZE, throwOnError: true }
  return coalesceCacheQuery(JSON.stringify(['classics', locale, classicsQueryKey(query)]), () => {
    switch (query.basis) {
      case 'era': return getEraContents({ ...params, era: query.era })
      case 'profession': return getLibraryByProfession({ ...params, profession: query.profession })
      default: return getChosenLibrary(params)
    }
  })
}
