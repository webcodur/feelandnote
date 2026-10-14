export const CLASSICS_PAGE_SIZE = 12
export const CLASSICS_ERAS = ['ancient', 'medieval', 'modern', 'contemporary'] as const
export const CLASSICS_MEDIA = ['ALL', 'BOOK', 'VIDEO', 'GAME', 'MUSIC'] as const
const BASES = ['all', 'era', 'profession'] as const

export type ClassicsBasis = typeof BASES[number]
export type ClassicsMedia = typeof CLASSICS_MEDIA[number]
export interface ClassicsQuery {
  basis: ClassicsBasis
  era: typeof CLASSICS_ERAS[number]
  profession: string
  category: ClassicsMedia
  page: number
}

export function initialClassicsQuery(profession = ''): ClassicsQuery {
  return { basis: 'all', era: CLASSICS_ERAS[0], profession, category: 'ALL', page: 1 }
}

export function validateClassicsQuery(query: ClassicsQuery): ClassicsQuery {
  if (!query || !BASES.includes(query.basis) || !CLASSICS_ERAS.includes(query.era)
    || !CLASSICS_MEDIA.includes(query.category) || typeof query.profession !== 'string'
    || !Number.isSafeInteger(query.page) || query.page < 1) throw new Error('Invalid classics filter')
  return { basis: query.basis, era: query.era, profession: query.profession, category: query.category, page: query.page }
}

/** Only the active era/profession changes the result. */
export function classicsQueryKey(query: ClassicsQuery) {
  return JSON.stringify([query.basis, query.category, query.page,
    query.basis === 'era' ? query.era : query.basis === 'profession' ? query.profession : null])
}

export function updateClassicsQuery(current: ClassicsQuery, next: Partial<ClassicsQuery>): ClassicsQuery {
  const merged = { ...current, ...next }
  const filterChanged = classicsQueryKey({ ...merged, page: 1 }) !== classicsQueryKey({ ...current, page: 1 })
  return validateClassicsQuery({ ...merged, page: next.page ?? (filterChanged ? 1 : current.page) })
}
