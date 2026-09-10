'use client'

import { useEffect, useState } from 'react'
import { getBookIntroduction } from '@/actions/contents/fetchBookMetadata'
import type { BookIntroductionReference } from '@/lib/utils/book-description'
import { isBookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'

// 같은 화면의 중복 카드와 빠른 판본 전환은 요청 하나를 공유한다. 실패는 재시도할 수 있게 지운다.
const requests = new Map<string, Promise<string | null>>()

function requestIntroduction(reference: BookIntroductionReference, locale: string): Promise<string | null> {
  const { isbn, source, sourceUrl, legacyFallback = false } = reference
  const key = JSON.stringify([locale, isbn, source, sourceUrl, legacyFallback])
  const existing = requests.get(key)
  if (existing) return existing
  const request = getBookIntroduction(isbn, locale, source, sourceUrl, legacyFallback).catch((error: unknown) => {
    requests.delete(key)
    throw error
  })
  requests.set(key, request)
  if (requests.size > 100) requests.delete(requests.keys().next().value!)
  return request
}

export function useBookIntroduction(
  reference: BookIntroductionReference | null | undefined,
  locale: string,
  initialDescription?: string | null,
  deferUntilVisible = false,
) {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [visible, setVisible] = useState(!deferUntilVisible)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; description: string | null; failed: boolean } | null>(null)
  const isbn = reference?.isbn ?? null
  const source = reference?.source ?? null
  const sourceUrl = reference?.sourceUrl ?? null
  const legacyFallback = reference?.legacyFallback ?? false
  const key = JSON.stringify([locale, isbn, source, sourceUrl, legacyFallback])
  const initialText = isBookIntroductionSource(initialDescription) ? null : initialDescription

  useEffect(() => {
    if (!deferUntilVisible || !element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [deferUntilVisible, element])

  useEffect(() => {
    if (!visible || !source || initialText) return
    let active = true
    requestIntroduction({ isbn, source, sourceUrl, legacyFallback }, locale).then(
      (description) => { if (active) setResult({ key, description, failed: false }) },
      () => { if (active) setResult({ key, description: null, failed: true }) },
    )
    return () => { active = false }
  }, [isbn, source, sourceUrl, legacyFallback, locale, key, visible, initialText, attempt])

  const current = result?.key === key ? result : null
  return {
    ref: setElement,
    description: initialText || current?.description || null,
    loading: visible && Boolean(source) && !initialText && current === null,
    failed: current?.failed ?? false,
    retry: () => { setResult(null); setAttempt((value) => value + 1) },
  }
}
