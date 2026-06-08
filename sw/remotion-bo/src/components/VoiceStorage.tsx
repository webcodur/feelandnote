'use client'

import { useState, useEffect, useCallback } from 'react'
import { UiLabel } from '@/components/ui-label'

type VoiceEpisodeStorage = {
  name: string
  status: 'loaded' | 'unloaded' | 'partial' | 'none'
  fileCount: number
  sizeBytes: number
  sizeLabel: string
}

type StorageData = {
  episodes: VoiceEpisodeStorage[]
  totalLoaded: { count: number; sizeBytes: number; sizeLabel: string }
  totalArchived: { count: number; sizeBytes: number; sizeLabel: string }
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  loaded: { label: 'Loaded', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  unloaded: { label: 'Archived', cls: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  partial: { label: 'Partial', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  none: { label: 'None', cls: 'bg-zinc-800/40 text-zinc-600 border-zinc-700/30' },
}

export function VoiceStorage({ series }: { series: string }) {
  const [data, setData] = useState<StorageData | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'loaded' | 'unloaded'>('loaded')

  const fetchData = useCallback(() => {
    fetch(`/api/${series}/voice/storage`).then(r => r.json()).then(setData)
  }, [series])

  useEffect(fetchData, [fetchData])

  const toggle = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  const handleAction = async (action: 'load' | 'unload') => {
    if (selected.size === 0) return
    setLoading(true)
    try {
      const res = await fetch(`/api/${series}/voice/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, episodes: [...selected] }),
      })
      const result = await res.json()
      if (!res.ok) {
        alert(`Storage 오류: ${result.error ?? res.statusText}`)
        return
      }
      setData({ episodes: result.episodes, totalLoaded: result.totalLoaded, totalArchived: result.totalArchived })
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }

  if (!data) return <div className="text-text-secondary text-sm">Storage 로딩 중...</div>

  const filtered = data.episodes.filter(ep => {
    if (filter === 'loaded') return ep.status === 'loaded' || ep.status === 'partial'
    if (filter === 'unloaded') return ep.status === 'unloaded'
    return ep.status !== 'none'
  })

  const selectedLoaded = [...selected].filter(n => data.episodes.find(e => e.name === n)?.status === 'loaded')
  const selectedUnloaded = [...selected].filter(n => data.episodes.find(e => e.name === n)?.status === 'unloaded')

  const loadedPct = data.totalLoaded.sizeBytes / (data.totalLoaded.sizeBytes + data.totalArchived.sizeBytes) * 100 || 0

  return (
    <div className="relative">
      <UiLabel ko="음성 저장소" code="VoiceStorage" />
      {/* 총량 요약 */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div>
          <span className="text-green-400 font-semibold">{data.totalLoaded.sizeLabel}</span>
          <span className="text-text-secondary ml-1">loaded ({data.totalLoaded.count} files)</span>
        </div>
        <div>
          <span className="text-zinc-400 font-semibold">{data.totalArchived.sizeLabel}</span>
          <span className="text-text-secondary ml-1">archived ({data.totalArchived.count} files)</span>
        </div>
      </div>

      {/* 용량 바 */}
      <div className="h-2 bg-zinc-800 rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-green-500/60 rounded-full transition-all" style={{ width: `${loadedPct}%` }} />
      </div>

      {/* 필터 + 액션 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 rounded-md overflow-hidden border border-border text-sm font-semibold w-fit">
          {(['all', 'loaded', 'unloaded'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 font-semibold transition-colors ${filter === f ? 'bg-accent/80 text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              {f === 'all' ? 'All' : f === 'loaded' ? 'Loaded' : 'Archived'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          {selectedUnloaded.length > 0 && (
            <button onClick={() => handleAction('load')} disabled={loading}
              className="text-sm font-semibold px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white font-semibold disabled:opacity-50 transition-colors">
              Load {selectedUnloaded.length}
            </button>
          )}
          {selectedLoaded.length > 0 && (
            <button onClick={() => handleAction('unload')} disabled={loading}
              className="text-sm font-semibold px-3 py-1.5 rounded bg-zinc-600 hover:bg-zinc-500 text-white font-semibold disabled:opacity-50 transition-colors">
              Unload {selectedLoaded.length}
            </button>
          )}
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())}
              className="text-sm font-semibold px-2 py-1.5 text-text-secondary hover:text-text-secondary transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 에피소드 목록 */}
      <div className="space-y-1">
        {filtered.map(ep => {
          const badge = STATUS_BADGE[ep.status]
          return (
            <label key={ep.name}
              className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${selected.has(ep.name) ? 'bg-accent/10 border border-accent/30' : 'hover:bg-bg-secondary border border-transparent'}`}>
              <input type="checkbox" checked={selected.has(ep.name)} onChange={() => toggle(ep.name)}
                disabled={ep.status === 'none'}
                className="accent-accent w-3.5 h-3.5" />
              <span className="font-medium text-sm flex-1">{ep.name}</span>
              <span className={`text-sm font-semibold font-bold px-1.5 py-px rounded border ${badge.cls}`}>{badge.label}</span>
              <span className="text-sm font-semibold text-text-secondary w-16 text-right">{ep.fileCount} files</span>
              <span className="text-sm font-semibold text-text-secondary w-16 text-right">{ep.sizeLabel}</span>
            </label>
          )
        })}
        {filtered.length === 0 && <p className="text-sm text-text-secondary py-4">해당 조건의 에피소드가 없다.</p>}
      </div>
    </div>
  )
}
