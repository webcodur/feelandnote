'use client'

/**
 * 사진 경고 배지 — 편 편집기 헤더(진단 버튼 옆). **문제가 있을 때만 뜬다.**
 *
 * 저장이 도감 반영까지 자동으로 하므로 평상시엔 아무것도 안 보인다. 이 배지는
 * 그래도 남은 문제(반영이 막혔거나 원본 파일이 없는 사진)만 알리는 경고등이다.
 *
 *   미반영 N>0 — 눈에 띄는 배지 「사진 미반영 N」. 누르면 진단 패널이 열린다.
 *   미반영 0 · 파일 없음 M>0 — 「사진 파일 없음 M」. 반영으로 해소되지 않는 별도 문제라 따로 보인다.
 *   전부 정상·판정 불가(FACTION_LOCAL 미설정)·집계 전 — 아무것도 띄우지 않는다.
 *
 * 집계는 화면을 막지 않는다 — 편집기 초기 로드와 별개로 뒤에서 불러와 늦게 떠도 된다.
 * reloadKey 가 오르면(대본 저장 등) 다시 센다.
 */

import { useEffect, useState } from 'react'
import { ImageIcon } from '@feelandnote/shared/bo/icons'
import { summarizeFactionImageSync } from '@/actions/admin/factions/publish'
import type { FactionImageSyncSummary } from '@/lib/faction-sync/types'

export function FactionImageSyncBadge({ folder, reloadKey, onOpenPublish }: {
  folder: string
  /** 오르면 다시 집계한다 — 대본 저장·출간 뒤 상태가 바뀌므로 */
  reloadKey: number
  /** 배지 클릭 — 출간 패널 열기(기존 패널 열기 동작 재사용) */
  onOpenPublish: () => void
}) {
  const [summary, setSummary] = useState<FactionImageSyncSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    summarizeFactionImageSync(folder)
      .then(s => { if (!cancelled) setSummary(s) })
      .catch(e => {
        // 집계 실패는 배지만 감춘다 — 편집을 막을 일이 아니다. 사유는 콘솔에 남긴다.
        console.warn('[FactionImageSyncBadge] 사진 집계 실패:', e)
        if (!cancelled) setSummary(null)
      })
    return () => { cancelled = true }
  }, [folder, reloadKey])

  // 판정 불가(FACTION_LOCAL 미설정)·집계 전·실패 — 띄우지 않는다
  if (!summary) return null

  const pendingTotal = summary.solo + summary.team + summary.logo
  const detail = `개인샷 ${summary.solo} · 그룹샷 ${summary.team} · 로고 ${summary.logo}`
    + (summary.fileMissing ? ` · 파일 없음 ${summary.fileMissing}` : '')

  if (pendingTotal > 0) {
    return (
      <button
        type="button"
        onClick={onOpenPublish}
        className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-amber-500 bg-amber-500/15 px-2.5 text-xs font-semibold text-amber-500 hover:bg-amber-500/30"
        title={`아직 도감에 안 올라간 사진 — ${detail}. 눌러서 진단 패널 열기`}
      >
        <ImageIcon size={15} /> 사진 미반영 {pendingTotal}
      </button>
    )
  }

  if (summary.fileMissing > 0) {
    return (
      <button
        type="button"
        onClick={onOpenPublish}
        className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-bg-card px-2.5 text-xs font-semibold text-amber-500 hover:bg-bg-hover"
        title={`데이터에 적힌 사진인데 로컬 파일이 없다 — ${detail}. 반영으로 해소되지 않으니 원본을 확인한다`}
      >
        <ImageIcon size={15} /> 사진 파일 없음 {summary.fileMissing}
      </button>
    )
  }

  // 전부 정상 — 아무것도 띄우지 않는다(저장이 자동 반영하므로 평상시는 조용한 것이 정상이다)
  return null
}
