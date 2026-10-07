/** 출처를 확인해 저장한 시리즈의 후속권이 새 작품으로 갈라지는 것을 막는다. */
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown) => typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase() : ''
const creatorKey = (value: unknown) => text(value).split(/[,，]/u).map(name=>name.replace(/\s/gu, '')).filter(Boolean).sort().join('|')

export function registeredSeriesMatches(
  works: readonly { id: string; metadata?: unknown }[],
  editions: readonly { title: string; creator: string | null; locale: string }[],
): {contentId: string; title: string; sourceUrl: string}[] {
  return works.flatMap(work => {
    const series = object(object(object(work.metadata).figureBook).series)
    if (!text(series.title) || !creatorKey(series.creator)) return []
    if (typeof series.sourceUrl !== 'string') return []
    try { if (new URL(series.sourceUrl).protocol !== 'https:') return [] } catch { return [] }
    const prefixes = [text(series.title), ...(Array.isArray(series.aliases) ? series.aliases.map(text).filter(Boolean) : [])]
    const matches = editions.some(edition => {
      if (edition.locale !== series.locale || creatorKey(edition.creator) !== creatorKey(series.creator)) return false
      const title = text(edition.title)
      return prefixes.some(prefix => title === prefix || (title.startsWith(prefix) && /^[\s:：\-–—([\d]/u.test(title.slice(prefix.length))))
    })
    return matches ? [{ contentId: work.id, title: String(series.title), sourceUrl: series.sourceUrl }] : []
  })
}
