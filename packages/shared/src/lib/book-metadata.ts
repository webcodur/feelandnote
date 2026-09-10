export const BOOK_DESCRIPTION_KEYS = ['description', 'description_ko', 'description_en', 'overview', 'summary', 'storyline', 'bookIntroEn', 'contents'] as const

/** Introductions belong to the locale/edition field; new metadata never duplicates them. */
export function withoutBookDescription(metadata: Record<string, unknown>): Record<string, unknown> {
  const result = { ...metadata }
  for (const key of BOOK_DESCRIPTION_KEYS) {
    delete result[key]
  }
  return result
}

/** Routine refreshes preserve legacy text until the reviewed migration handles it. */
export function refreshBookMetadata(previous: Record<string, unknown> | null, incoming: Record<string, unknown>): Record<string, unknown> {
  const result = withoutBookDescription(incoming)
  for (const key of BOOK_DESCRIPTION_KEYS) {
    if (previous && Object.prototype.hasOwnProperty.call(previous, key)) result[key] = previous[key]
  }
  return result
}
