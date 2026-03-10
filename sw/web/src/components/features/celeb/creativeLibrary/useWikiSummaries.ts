import { useState, useEffect, useMemo } from 'react'

/** description이 없는 작품의 title_en → Wikipedia summary를 일괄 fetch */
export function useWikiSummaries(
  items: { id: string; title_en?: string | null; description?: string | null }[],
  locale: string = 'en',
) {
  const [summaries, setSummaries] = useState<Record<string, string>>({})

  // items 배열의 id 목록을 안정화하여 무한 리렌더 방지
  const stableKey = useMemo(
    () => items.map(i => i.id).join(','),
    [items]
  )

  useEffect(() => {
    const needsFetch = items.filter(i => !i.description && i.title_en)
    if (!needsFetch.length) return

    // 중복 title_en 제거
    const uniqueTitles = [...new Set(needsFetch.map(i => i.title_en!))]
    let cancelled = false

    async function fetchAll() {
      const results: Record<string, string> = {}

      await Promise.all(
        uniqueTitles.map(async (title) => {
          try {
            const res = await fetch(`/api/wiki-summary?title=${encodeURIComponent(title)}&locale=${locale}`)
            if (!res.ok) return
            const data = await res.json()
            if (data.summary) {
              results[title] = data.summary
            }
          } catch { /* 실패 무시 */ }
        })
      )

      if (!cancelled) {
        // title_en → work id 매핑
        const mapped: Record<string, string> = {}
        for (const item of needsFetch) {
          const summary = results[item.title_en!]
          if (summary) mapped[item.id] = summary
        }
        setSummaries(mapped)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey, locale])

  return summaries
}
