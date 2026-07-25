'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { EpisodeCreateForm, EpisodeStatusDot } from '@/components/editor'
import type { DiscourseEpisodeListItem } from '@/lib/discourse-types'

/**
 * 가상 담화 시리즈 홈 — 에피소드 목록 + 새 에피소드 만들기.
 * 만들기 폼과 상태 점은 세력도와 같은 공용 부품을 쓴다(어휘 todo/live/done 공유, discourse.md §8).
 * 상태 바꾸기·복제·삭제는 아직 이 화면에 없다 — 세력도에만 있다.
 */
export function DiscourseSeriesHome({ series }: { series: string }) {
  const [items, setItems] = useState<DiscourseEpisodeListItem[]>([])

  useEffect(() => { document.title = '가상 담화 — Remotion BO' }, [])

  const load = useCallback(() => {
    fetch(`/api/${series}/episodes`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
  }, [series])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold text-accent">가상 담화</h1>

      {/* 폴더명이 그대로 영상 조각 이름이 된다 — 영문 소문자·숫자·하이픈만 (discourse.md §9) */}
      <EpisodeCreateForm series={series} heading="새 담화" slugPlaceholder="폴더명 (예: musk-altman)" submitLabel="새 담화" />

      <div className="space-y-1">
        {items.map(ep => (
          <Link key={ep.id} href={`/${series}/${ep.id}`}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm hover:border-border-active hover:text-accent">
            <EpisodeStatusDot status={ep.status} />
            <span className="font-semibold truncate">{ep.title || ep.id}</span>
            <span className="ml-auto text-xs text-text-dim shrink-0">인물 {ep.castCount} · 발언 {ep.turnCount}</span>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="text-xs text-text-dim py-8 text-center">담화 없음</div>
        )}
      </div>
    </div>
  )
}
