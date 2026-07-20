'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { DiscourseEpisodeListItem } from '@/lib/discourse-types'
import { FACTION_STATUS_DOT } from '@/components/faction/shared/status'

/**
 * 가상 담화 시리즈 홈 — 에피소드 목록 + 새 에피소드 만들기.
 * 상태 어휘(todo/live/done)와 점 색은 팩션 규격을 준용한다(discourse.md §8).
 */
export function DiscourseSeriesHome({ series }: { series: string }) {
  const router = useRouter()
  const [items, setItems] = useState<DiscourseEpisodeListItem[]>([])
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { document.title = '가상 담화 — Remotion BO' }, [])

  const load = useCallback(() => {
    fetch(`/api/${series}/episodes`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
  }, [series])

  useEffect(() => { load() }, [load])

  const create = async () => {
    const folder = slug.trim().toLowerCase()
    if (!folder) { alert('폴더명을 입력하세요.'); return }
    // 폴더명이 그대로 컴포지션 ID가 된다 — 영문 소문자·숫자·하이픈만 (discourse.md §9)
    if (!/^[a-z0-9-]+$/.test(folder)) { alert('폴더명은 영문 소문자, 숫자, 하이픈만 가능합니다.'); return }
    setCreating(true)
    try {
      const res = await fetch(`/api/${series}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folder, title: title.trim() || folder }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? '생성 실패'); return }
      router.push(`/${series}/${folder}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-bold text-accent">가상 담화</h1>

      <div className="flex gap-2 text-xs">
        <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="폴더명 (예: musk-altman)"
          className="w-56 bg-bg-card border border-border rounded px-2 py-1.5 focus:outline-none focus:border-accent" />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="영상 명칭"
          className="flex-1 bg-bg-card border border-border rounded px-2 py-1.5 focus:outline-none focus:border-accent" />
        <button onClick={create} disabled={creating}
          className="px-3 py-1.5 rounded border border-border font-semibold hover:border-border-active hover:text-accent disabled:opacity-50">
          새 담화
        </button>
      </div>

      <div className="space-y-1">
        {items.map(ep => (
          <Link key={ep.id} href={`/${series}/${ep.id}`}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm hover:border-border-active hover:text-accent">
            <span className={`h-2 w-2 shrink-0 rounded-full ${FACTION_STATUS_DOT[ep.status]}`} title={ep.status} />
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
