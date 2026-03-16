'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SERIES } from '@/lib/series-registry'

type EpisodeSummary = {
  name: string
  nickname: string
  booksCount: number
  hasShorts: boolean
  voiceCount: number
  synced: boolean
}

/** 에피소드 상태 아이콘: ● 렌더 완료, ◐ 음성 완료, ○ JSON만 */
function StatusIcon({ ep }: { ep: EpisodeSummary }) {
  if (ep.synced && ep.voiceCount > 0) return <span className="text-success-text text-[10px]">●</span>
  if (ep.voiceCount > 0) return <span className="text-warning-text text-[10px]">◐</span>
  return <span className="text-text-dim text-[10px]">○</span>
}

export function Sidebar() {
  const pathname = usePathname()
  const [activeSeries, setActiveSeries] = useState<string | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([])
  const [search, setSearch] = useState('')

  // URL에서 현재 시리즈 감지
  useEffect(() => {
    const match = pathname.match(/^\/([^/]+)/)
    if (match) {
      const id = match[1]
      if (SERIES.some(s => s.id === id)) {
        setActiveSeries(id)
      }
    }
  }, [pathname])

  // 시리즈 선택 시 에피소드 목록 로드
  useEffect(() => {
    if (!activeSeries) { setEpisodes([]); return }
    fetch(`/api/${activeSeries}/episodes`).then(r => r.json()).then(setEpisodes)
  }, [activeSeries])

  const filtered = episodes.filter(ep =>
    ep.name.includes(search.toLowerCase()) || ep.nickname.includes(search)
  )

  return (
    <div className="flex h-full shrink-0">
      {/* 1단: 시리즈 + 인프라 */}
      <aside className="w-14 border-r border-border flex flex-col items-center py-4 gap-1">
        {SERIES.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSeries(activeSeries === s.id ? null : s.id)}
            title={s.label}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors ${
              activeSeries === s.id
                ? 'bg-bg-card border border-border-active'
                : 'hover:bg-bg-hover'
            }`}
          >
            {s.icon}
          </button>
        ))}

        <div className="flex-1" />
        <div className="border-t border-border w-8 mb-2" />

        <Link href="/infra/r2" title="R2 현황"
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm transition-colors ${
            pathname.startsWith('/infra') ? 'bg-bg-card border border-border-active' : 'hover:bg-bg-hover'
          }`}>
          💾
        </Link>
      </aside>

      {/* 2단: 에피소드 목록 (시리즈 선택 시 펼침) */}
      {activeSeries && (
        <aside className="w-52 border-r border-border overflow-y-auto p-3">
          <Link href={`/${activeSeries}`}>
            <h2 className="text-xs font-bold text-accent tracking-widest mb-2">
              {SERIES.find(s => s.id === activeSeries)?.label}
            </h2>
          </Link>

          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-accent"
          />

          <div className="space-y-0.5">
            {filtered.map(ep => {
              const active = pathname === `/${activeSeries}/${ep.name}`
              return (
                <Link
                  key={ep.name}
                  href={`/${activeSeries}/${ep.name}`}
                  className={`block px-2.5 py-2 rounded-md text-sm transition-colors ${
                    active ? 'bg-bg-card border border-border-active' : 'hover:bg-bg-hover'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <StatusIcon ep={ep} />
                    <span className="font-semibold truncate">{ep.nickname}</span>
                  </div>
                  <div className="text-[10px] text-text-secondary mt-0.5 pl-3.5">
                    {ep.booksCount}권{ep.hasShorts ? ' · Shorts' : ''} · {ep.voiceCount} wav
                  </div>
                </Link>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-xs text-text-dim py-4 text-center">
                {episodes.length === 0 ? '에피소드 없음' : '검색 결과 없음'}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}
