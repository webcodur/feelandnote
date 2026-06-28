'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FactionEpisodeListItem, FactionStatus } from '@/lib/faction-types'
import { Plus, Copy, Trash2 } from './shared/icons'
import { FACTION_STATUS_OPTIONS, FACTION_STATUS_DOT } from './shared/status'

export function FactionSeriesHome({ series }: { series: string }) {
  const router = useRouter()
  const [items, setItems] = useState<FactionEpisodeListItem[]>([])
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
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
        body: JSON.stringify({ name: folder, title: title.trim() || folder }),
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

  // 진행 상태 변경
  const changeStatus = async (id: string, status: FactionStatus) => {
    setItems(prev => prev.map(ep => (ep.id === id ? { ...ep, status } : ep)))
    await fetch(`/api/${series}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: id, status }),
    }).catch(() => load())
  }

  // 삭제
  const remove = async (id: string) => {
    if (!confirm(`"${id}" 세력도를 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/${series}/faction-episode?ep=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) { alert('삭제 실패'); return }
    load()
  }

  return (
    <div className="relative">
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
            placeholder="영상 명칭"
            value={title}
            onChange={e => setTitle(e.target.value)}
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

      {/* 에피소드 테이블 */}
      <div className="mb-8 overflow-x-auto border border-border rounded-lg bg-bg-secondary/20">
        <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-border text-text-secondary bg-bg-secondary/50">
              <th className="py-2 px-3 font-semibold w-24">상태</th>
              <th className="py-2 px-3 font-semibold">영상 명칭 / ID</th>
              <th className="py-2 px-3 font-semibold text-right">세력 / 인물</th>
              <th className="py-2 px-3 font-semibold text-center w-20">옵션</th>
              <th className="py-2 px-3 font-semibold text-right w-24">액션</th>
            </tr>
          </thead>
          <tbody>
            {items.map(ep => {
              const lines = (ep.title || ep.id).split('\n').map(s => s.trim()).filter(Boolean)
              const head = lines[0] || ep.id
              const rest = lines.slice(1).join(' ')
              return (
                <tr key={ep.id} className="group border-b border-border/50 hover:bg-bg-card cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest('button, a, select')) return
                      router.push(`/${series}/${ep.id}`)
                    }}>
                  <td className="py-2 px-3 align-middle">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${FACTION_STATUS_DOT[ep.status]}`} title={ep.status} />
                      <select
                        value={ep.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => changeStatus(ep.id, e.target.value as FactionStatus)}
                        className="rounded border border-border/40 bg-bg-card px-1 py-0.5 text-[11px] text-text-secondary"
                      >
                        {FACTION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="py-2 px-3 align-middle">
                    <Link href={`/${series}/${ep.id}`} className="font-semibold group-hover:text-accent transition-colors block">
                      {head}
                      {rest && <span className="ml-2 text-xs font-normal text-text-secondary truncate">{rest}</span>}
                    </Link>
                  </td>
                  <td className="py-2 px-3 align-middle text-right text-xs text-text-secondary">
                    세력 {ep.groupCount} · 인물 {ep.personCount}
                  </td>
                  <td className="py-2 px-3 align-middle text-center">
                    {ep.hasMusic ? <span className="rounded bg-info px-1.5 py-px text-[11px] text-info-text">음악</span> : <span className="text-text-dim">-</span>}
                  </td>
                  <td className="py-2 px-3 align-middle text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); duplicate(ep.id) }}
                        className="rounded-md border border-border bg-bg-card p-1.5 text-text-secondary hover:bg-bg-hover transition-colors"
                        title="복제"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); remove(ep.id) }}
                        className="rounded-md border border-border bg-bg-card p-1.5 text-danger-text hover:bg-danger hover:text-white transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-text-dim">아직 세력도가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
