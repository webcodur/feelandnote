'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { SceneEditorData, SceneEntrySummary } from '@/actions/admin/faction-scenes'
import SceneEditor from './SceneEditor'
import { SCENE_INPUT } from './styles'

export default function SceneLibrary({ entries, detail }: { entries: SceneEntrySummary[]; detail: SceneEditorData | null }) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('all')
  const [status, setStatus] = useState('all')
  const ready = entries.filter(entry => entry.sceneCount > 0)
  const visible = entries.filter(entry => {
    const name = `${entry.name} ${entry.nameEn ?? ''} ${entry.slug ?? ''}`.toLowerCase()
    return name.includes(query.toLowerCase().trim())
      && (scope === 'all' || (scope === 'myth' ? entry.isMyth : !entry.isMyth))
      && (status === 'all' || (status === 'ready' ? entry.sceneCount > 0 : entry.sceneCount === 0))
  }).sort((a, b) => Number(b.sceneCount > 0) - Number(a.sceneCount > 0) || a.name.localeCompare(b.name, 'ko'))

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-border bg-bg-card xl:sticky xl:top-4">
        <div className="space-y-3 border-b border-border p-3">
          <div className="flex items-baseline justify-between"><h2 className="font-semibold text-text-primary">신화 · 팩션</h2><span className="text-xs text-text-tertiary">장면 있음 {ready.length}</span></div>
          <label className="relative block"><Search size={15} className="absolute left-3 top-3 text-text-tertiary" /><input aria-label="신화·팩션 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="이름 검색" className={`${SCENE_INPUT} pl-9`} /></label>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="신화·팩션 구분" value={scope} onChange={e => setScope(e.target.value)} className={SCENE_INPUT}><option value="all">전체</option><option value="myth">신화</option><option value="faction">팩션</option></select>
            <select aria-label="장면 유무" value={status} onChange={e => setStatus(e.target.value)} className={SCENE_INPUT}><option value="all">모든 항목</option><option value="ready">장면 있음</option><option value="empty">장면 없음</option></select>
          </div>
        </div>
        <nav aria-label="주요 장면 관리 대상" className="max-h-72 overflow-y-auto p-2 xl:max-h-[calc(100vh-270px)]">
          {visible.map(entry => (
            <Link key={entry.id} href={`/faction-scenes?entry=${entry.slug || entry.id}`} aria-current={entry.id === detail?.id ? 'page' : undefined}
              className={`mb-1 block rounded-lg border px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-accent ${entry.id === detail?.id ? 'border-accent/50 bg-accent/10 text-accent' : 'border-transparent text-text-secondary hover:border-border hover:bg-bg-secondary hover:text-text-primary'}`}>
              <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.name}</span><span className="text-xs tabular-nums">{entry.sceneCount}장</span></div>
              <div className="mt-1 flex gap-2 text-[11px] text-text-tertiary"><span>{entry.isMyth ? '신화' : '팩션'}</span><span>KO {entry.koCount} · EN {entry.enCount}</span>{entry.sceneCount > entry.enCount && <span className="text-amber-500">영문 보완</span>}</div>
            </Link>
          ))}
          {!visible.length && <p className="p-3 text-sm text-text-tertiary">검색 결과가 없습니다.</p>}
        </nav>
      </aside>
      {detail ? <SceneEditor key={detail.id} data={detail} /> : <p className="p-6 text-text-secondary">관리할 신화·팩션이 없습니다.</p>}
    </div>
  )
}
