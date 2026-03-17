'use client'

import { useState, useRef } from 'react'

export type R2FileInfo = {
  name: string
  sizeKB: number
  duration: number
  status: 'synced' | 'unsynced' | 'local-only'
  engine: 'gemini' | 'cloud' | 'elevenlabs' | 'common'
}

export type R2Summary = {
  total: number
  totalSizeKB: number
  synced: number
  unsynced: number
  localOnly: number
}

const BTN = 'px-3 py-1 rounded text-sm font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`

function StatusDot({ status }: { status: R2FileInfo['status'] }) {
  if (status === 'synced') return <span className="text-success-text text-xs" title="동기화됨">●</span>
  if (status === 'unsynced') return <span className="text-warning-text text-xs" title="변경됨">▲</span>
  return <span className="text-text-dim text-xs" title="로컬 전용">○</span>
}

export function R2Status({ files, summary, series, episode, onRefresh, playVoice }: {
  files: R2FileInfo[]
  summary: R2Summary
  series: string
  episode: string
  onRefresh: () => void
  playVoice: (fileName: string) => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const post = async (url: string, body: unknown, key: string) => {
    setLoading(key)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        alert('실패: ' + (err.error ?? res.statusText))
      }
    } finally {
      setLoading(null)
    }
  }

  const handlePlay = (name: string) => {
    if (audioRef.current) audioRef.current.pause()
    playVoice(name)
  }

  return (
    <section className="bg-bg-secondary border border-border rounded-lg p-4">
      <h3 className="text-xs font-bold text-accent tracking-widest mb-3">R2 STORAGE</h3>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3 mb-3">
        <span className="text-xs text-text-secondary">
          파일 <span className="font-semibold text-text-primary">{summary.total}</span>개
        </span>
        <span className="text-xs text-text-secondary">
          용량 <span className="font-semibold text-text-primary">{(summary.totalSizeKB / 1024).toFixed(1)}MB</span>
        </span>
        <span className="flex items-center gap-1 text-xs">
          <span className="text-success-text">●</span>
          <span className="text-text-secondary">{summary.synced}</span>
        </span>
        <span className="flex items-center gap-1 text-xs">
          <span className="text-warning-text">▲</span>
          <span className="text-text-secondary">{summary.unsynced}</span>
        </span>
        {summary.localOnly > 0 && (
          <span className="flex items-center gap-1 text-xs">
            <span className="text-text-dim">○</span>
            <span className="text-text-secondary">{summary.localOnly}</span>
          </span>
        )}
      </div>

      {/* File table */}
      {files.length > 0 && (
        <div className="max-h-60 overflow-y-auto mb-3 font-mono text-xs">
          {files.map(f => (
            <div key={f.name} className="flex items-center py-1 border-b border-bg-main gap-2">
              <button onClick={() => handlePlay(f.name)} className="text-accent hover:text-accent-hover shrink-0">▶</button>
              <StatusDot status={f.status} />
              <span className="flex-1 text-text-secondary truncate">{f.name}</span>
              <span className="text-success-text w-12 text-right">{f.duration}s</span>
              <span className="text-text-dim w-14 text-right">{f.sizeKB}KB</span>
            </div>
          ))}
        </div>
      )}
      {files.length === 0 && <div className="text-text-dim text-xs py-2 mb-3">음성 파일 없음</div>}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => post(`/api/${series}/voice/upload`, { episode }, 'upload')}
          disabled={loading === 'upload'} className={BTN_PRIMARY}>
          {loading === 'upload' ? '업로드 중...' : '전체 업로드'}
        </button>
        <button onClick={() => post(`/api/${series}/voice/pull`, { episode }, 'pull')}
          disabled={loading === 'pull'} className={BTN_SECONDARY}>
          {loading === 'pull' ? '다운로드 중...' : '전체 다운로드'}
        </button>
        <button onClick={onRefresh} className={BTN_SECONDARY}>
          동기화 체크
        </button>
      </div>
    </section>
  )
}
