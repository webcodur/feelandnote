'use client'

/**
 * 셀럽 DB 연결 배지 — 대조 창구(/api/celebs/exists)와 판정 규칙(✓DB / ⚠없음 / 미연결 / 신화).
 *
 * 담화는 인물이 본서비스 가상 독백(celebs.virtual_monologue)의 원천과 이어져야 하므로
 * slug 연결이 특히 중요하다 — 유령 연결(slug 는 적혀 있는데 DB에 없음)을 화면에서 잡는다.
 */

import type { Speaker } from '@/lib/discourse-types'
import { useCelebExists as useSlugExistence } from '@/lib/useCelebExists'

/** 셀럽 slug 실존 대조 — 인물 목록이 바뀌면 다시 조회한다 (공용 창구는 `@/lib/useCelebExists`) */
export function useCelebExists(cast: Speaker[]): { existing: Set<string>; loaded: boolean } {
  return useSlugExistence(cast.map(s => s.slug))
}

type Props = {
  /** 배지 판정에 필요한 최소 필드만 */
  speaker: { slug?: string; mythical?: boolean }
  existing: Set<string>
  loaded: boolean
}

export function CelebBadge({ speaker, existing, loaded }: Props) {
  // 신화·전설 속 존재(fiction 티어) — 실존 인물과 구분. DB에 연결되면 ✓ 신화, 아직이면 회색 신화
  if (speaker.mythical) {
    return speaker.slug && loaded && existing.has(speaker.slug) ? (
      <span title={`신화·전설 존재 — fiction 티어 등록됨 (${speaker.slug})`} className="shrink-0 rounded bg-success/15 px-1 text-[10px] font-bold text-success-text">✓ 신화</span>
    ) : (
      <span title="신화·전설 속 존재 — fiction 티어 등록 대상(아직 미등록)" className="shrink-0 rounded bg-bg-secondary px-1 text-[10px] text-text-dim">신화</span>
    )
  }
  if (!loaded) return null
  if (speaker.slug && existing.has(speaker.slug)) {
    return <span title={`셀럽 DB 등록됨 (${speaker.slug})`} className="shrink-0 rounded bg-success/15 px-1 text-[10px] font-bold text-success-text">✓ DB</span>
  }
  if (speaker.slug) {
    return <span title={`연결 키(${speaker.slug})가 DB에 없음 — 미등록이거나 slug 오기`} className="shrink-0 rounded bg-warning/15 px-1 text-[10px] font-bold text-warning-text">⚠ 없음</span>
  }
  return <span title="셀럽 DB 미연결 — slug 없음" className="shrink-0 rounded bg-bg-secondary px-1 text-[10px] text-text-dim">미연결</span>
}
