export const BOOK_DESCRIPTION_KEYS = ['description', 'description_ko', 'description_en', 'overview', 'summary', 'storyline', 'bookIntroEn', 'contents'] as const

/** 병합으로 흡수한 작품 ID를 담는 metadata 키다. 옛 작품 주소의 이동에 쓴다. */
export const MERGED_WORK_IDS_KEY = 'mergedFrom'

/** Introductions belong to the locale/edition field; new metadata never duplicates them. */
export function withoutBookDescription(metadata: Record<string, unknown>): Record<string, unknown> {
  const result = { ...metadata }
  for (const key of BOOK_DESCRIPTION_KEYS) {
    delete result[key]
  }
  return result
}

/** BOOK metadata refreshes never retain or introduce description copies. */
export function refreshBookMetadata(previous: Record<string, unknown> | null, incoming: Record<string, unknown>): Record<string, unknown> {
  void previous
  return withoutBookDescription(incoming)
}
