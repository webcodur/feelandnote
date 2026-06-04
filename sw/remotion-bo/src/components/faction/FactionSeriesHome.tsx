'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FactionEpisodeListItem } from '@/lib/faction-types'
import { Plus, Copy, Trash2 } from './icons'

export function FactionSeriesHome({ series }: { series: string }) {
  const router = useRouter()
  const [items, setItems] = useState<FactionEpisodeListItem[]>([])
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { document.title = '세력도 — Remotion BO' }, [])

  const load = useCallback(() => {
    fetch(`/api/${series}/episodes`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
  }, [series])

  useEffect(() => { load() }, [load])

  // 새 세력도 생성
  const create = async () => {
    const folder = slug.trim().toLowerCase()
    if (!folder) { alert('폴더명을 입력하세요.'); return }
    if (!/^[a-z0-9-]+$/.test(folder)) { alert('폴더명은 영문 소문자, 숫자, 하이픈만 가능합니다.'); return }
    setCreating(true)
    try {
      const res = await fetch(`/api/${series}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folder, title: title.trim() || folder, subtitle: subtitle.trim() || undefined }),
      })
      const data = await res.json()
      if (res.status === 409) { alert('이미 존재하는 이름입니다.'); return }
      if (!res.ok) { alert('생성 실패: ' + (data.error ?? '')); return }
      router.push(`/${series}/${data.name ?? folder}`)
    } finally {
      setCreating(false)
    }
  }

  // 복제
  const duplicate = async (src: string) => {
    const dst = prompt(`"${src}" 복제본의 새 이름(영문 소문자-하이픈):`)
    if (!dst) return
    const folder = dst.trim().toLowerCase()
    if (!/^[a-z0-9-]+$/.test(folder)) { alert('폴더명 형식이 올바르지 않습니다.'); return }
    const res = await fetch(`/api/${series}/faction-episode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate', src, dst: folder }),
    })
    const data = await res.json()
    if (!res.ok) { alert('복제 실패: ' + (data.error ?? '')); return }
    load()
  }

  // 삭제
  const remove = async (id: string) => {
    if (!confirm(`"${id}" 세력도를 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/${series}/faction-episode?ep=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) { alert('삭제 실패'); return }
    load()
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">🏛️ 세력도</h1>

      {/* 새 세력도 폼 */}
      <div className="mb-6 rounded-lg border border-border bg-bg-secondary p-4">
        <p className="mb-3 text-sm font-semibold text-text-secondary">새 세력도</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="폴더명 (예: llm)"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            className="w-40 rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-48 rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            placeholder="부제"
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            className="w-48 rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            onClick={create}
            disabled={creating}
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg-main hover:bg-accent-hover disabled:opacity-50"
          >
            <Plus size={15} /> {creating ? '생성 중...' : '만들기'}
          </button>
        </div>
      </div>

      {/* 에피소드 그리드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map(ep => (
          <div key={ep.id} className="relative rounded-lg border border-border bg-bg-card hover:border-accent">
            <Link href={`/${series}/${ep.id}`} className="block p-4">
              <p className="mb-1 truncate font-semibold text-text-primary">{ep.title || ep.id}</p>
              {ep.subtitle && <p className="mb-2 truncate text-xs text-text-secondary">{ep.subtitle}</p>}
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span>세력 {ep.groupCount} · 인물 {ep.personCount}</span>
                {ep.hasMusic && <span className="rounded bg-info px-1.5 py-px text-info-text">음악</span>}
              </div>
            </Link>
            <div className="absolute end-2 top-2 flex gap-1">
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); duplicate(ep.id) }}
                className="rounded-md border border-border bg-bg-card p-1.5 text-text-secondary hover:bg-bg-hover"
                title="복제"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); remove(ep.id) }}
                className="rounded-md border border-border bg-bg-card p-1.5 text-danger-text hover:bg-danger"
                title="삭제"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="col-span-full text-sm text-text-dim">아직 세력도가 없습니다.</p>}
      </div>
    </div>
  )
}
