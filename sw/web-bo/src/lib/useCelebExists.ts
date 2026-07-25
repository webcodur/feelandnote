'use client'

import { useEffect, useState } from 'react'

/**
 * 셀럽 slug 실존 대조 공용 창구(POST /api/celebs/exists) — 담화·팩션 인물 행의
 * DB 등록 배지(✓DB/⚠없음/미연결/신화)가 함께 쓴다. slug 목록이 바뀌면 다시 조회한다.
 */
export function useCelebExists(slugs: (string | undefined | null)[]): { existing: Set<string>; loaded: boolean } {
  const [existing, setExisting] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const slugKey = slugs.filter((s): s is string => !!s).join(',')

  useEffect(() => {
    const list = [...new Set(slugKey.split(',').filter(Boolean))]
    if (!list.length) { setExisting(new Set()); setLoaded(true); return }
    let cancelled = false
    fetch('/api/celebs/exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: list }),
    })
      .then(r => r.json())
      .then((d: { existing?: string[] }) => {
        if (cancelled) return
        setExisting(new Set(d.existing ?? []))
        setLoaded(true)
      })
      // 대조 실패는 「미등록」이 아니다 — 배지를 그리지 않아 오판을 막는다(loaded 유지)
      .catch(() => { if (!cancelled) setLoaded(false) })
    return () => { cancelled = true }
  }, [slugKey])

  return { existing, loaded }
}
