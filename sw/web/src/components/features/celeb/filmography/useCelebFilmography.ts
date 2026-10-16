'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Filmography } from '@/lib/celeb/filmography'

export function useCelebFilmography(qid: string | null | undefined, locale: string, enabled: boolean) {
  const [attempt, setAttempt] = useState(0)
  const key = enabled && qid && /^Q\d{1,12}$/.test(qid) ? `${qid}:${locale}:${attempt}` : null
  const [result, setResult] = useState<{ key: string; data?: Filmography; error?: true } | null>(null)
  useEffect(() => {
    if (!key || !qid) return
    const controller = new AbortController()
    const params = new URLSearchParams({ qid, locale: locale === 'en' ? 'en' : 'ko' })
    fetch(`/api/celeb-filmography?${params}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]),
    }).then(async response => {
      if (!response.ok) throw new Error('Filmography unavailable')
      return response.json() as Promise<Filmography>
    }).then(data => {
      if (!controller.signal.aborted) setResult({ key, data })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key, error: true })
    })
    return () => controller.abort()
  }, [key, qid, locale])
  const current = result?.key === key ? result : null
  return {
    data: current?.data ?? null,
    loading: Boolean(key && !current),
    error: Boolean(current?.error),
    retry: useCallback(() => setAttempt(value => value + 1), []),
  }
}
