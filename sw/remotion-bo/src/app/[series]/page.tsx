'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { getSeriesById } from '@/lib/series-registry'
import { TaskPanel } from '@/components/TaskPanel'

type EpisodeSummary = {
  name: string; nickname: string; booksCount: number; hasShorts: boolean
  voiceCount: number; voiceSizeMB: number; r2Count: number; synced: boolean
}

export default function SeriesHomePage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = use(params)
  const seriesDef = getSeriesById(series)
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`/api/${series}/episodes`).then(r => r.json()).then(setEpisodes)
  }, [series])

  if (!seriesDef) return <div className="text-text-dim">시리즈를 찾을 수 없다.</div>

  const filtered = episodes.filter(ep =>
    ep.name.includes(search.toLowerCase()) || ep.nickname.includes(search)
  )

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{seriesDef.icon} {seriesDef.label}</h1>
      <p className="text-sm text-text-secondary mb-6">{episodes.length}개 에피소드</p>

      <input
        type="text"
        placeholder="인물 검색..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm bg-bg-card border border-border rounded-md px-3 py-2 text-sm mb-6 focus:outline-none focus:border-accent"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {filtered.map(ep => (
          <Link key={ep.name} href={`/${series}/${ep.name}`}
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent/30 transition-colors">
            <div className="font-semibold mb-1">{ep.nickname}</div>
            <div className="text-xs text-text-secondary space-y-1">
              <div>{ep.booksCount}권{ep.hasShorts ? ' · Shorts' : ''}</div>
              <div>{ep.voiceCount} wav · {ep.voiceSizeMB}MB</div>
              <div className="flex items-center gap-2">
                <span>R2: {ep.r2Count}개</span>
                <span className={`text-[10px] px-1.5 py-px rounded ${
                  ep.synced ? 'bg-success text-success-text' : 'bg-warning text-warning-text'
                }`}>{ep.synced ? 'synced' : 'unsynced'}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <TaskPanel />
    </div>
  )
}
