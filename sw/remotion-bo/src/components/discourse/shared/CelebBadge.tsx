'use client'

/**
 * 셀럽 DB 연결 배지 — 팩션 인물 행(FactionPersonRow)의 배지와 **같은 규격**이다.
 * 대조 창구(/api/celebs/exists)와 판정 규칙(✓DB / ⚠없음 / 미연결 / 신화)을 팩션에서 그대로 가져왔다.
 *
 * 담화는 인물이 본서비스 가상 독백(profiles.virtual_monologue)의 원천과 이어져야 하므로
 * slug 연결이 팩션보다 더 중요하다 — 유령 연결(slug 는 적혀 있는데 DB에 없음)을 화면에서 잡는다.
 */

import { useEffect, useState } from 'react'
import type { Speaker } from '@/lib/discourse-types'

/** 셀럽 slug 실존 대조 — 인물 목록이 바뀌면 다시 조회한다 */
export function useCelebExists(cast: Speaker[]): { existing: Set<string>; loaded: boolean } {
  const [existing, setExisting] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const slugKey = cast.map(s => s.slug ?? '').join(',')

  useEffect(() => {
    const slugs = slugKey.split(',').filter(Boolean)
    if (!slugs.length) { setExisting(new Set()); setLoaded(true); return }
    let cancelled = false
    fetch('/api/celebs/exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs }),
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

type Props = {
  speaker: Speaker
  existing: Set<string>
  loaded: boolean
}

export function CelebBadge({ speaker, existing, loaded }: Props) {
  // 신화·전설 속 존재(fiction 티어) — 실존 인물과 구분. DB에 연결되면 ✓ 신화, 아직이면 회색 신화
  if (speaker.mythical) {
    return speaker.slug && loaded && existing.has(speaker.slug) ? (
      <span title={`신화·전설 존재 — fiction 티어 등록됨 (${speaker.slug})`} className="shrink-0 rounded bg-success px-1 text-[10px] font-bold text-success-text">✓ 신화</span>
    ) : (
      <span title="신화·전설 속 존재 — fiction 티어 등록 대상(아직 미등록)" className="shrink-0 rounded bg-bg-secondary px-1 text-[10px] text-text-dim">신화</span>
    )
  }
  if (!loaded) return null
  if (speaker.slug && existing.has(speaker.slug)) {
    return <span title={`셀럽 DB 등록됨 (${speaker.slug})`} className="shrink-0 rounded bg-success px-1 text-[10px] font-bold text-success-text">✓ DB</span>
  }
  if (speaker.slug) {
    return <span title={`연결 키(${speaker.slug})가 DB에 없음 — 미등록이거나 slug 오기`} className="shrink-0 rounded bg-warning px-1 text-[10px] font-bold text-warning-text">⚠ 없음</span>
  }
  return <span title="셀럽 DB 미연결 — slug 없음" className="shrink-0 rounded bg-bg-secondary px-1 text-[10px] text-text-dim">미연결</span>
}
