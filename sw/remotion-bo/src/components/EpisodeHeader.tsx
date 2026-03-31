'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useEpisode } from '@/lib/episode-context'

const BTN = 'px-3 py-1 rounded text-sm font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`

export function EpisodeHeader() {
  const { series, name, isEn, episode, dirty, saving, save, reload } = useEpisode()

  const baseName = isEn ? name.slice(0, -3) : name
  const counterpart = isEn ? baseName : `${baseName}-en`
  const [hasCounterpart, setHasCounterpart] = useState(false)

  useEffect(() => {
    fetch(`/api/${series}/episodes/${counterpart}`)
      .then(r => { setHasCounterpart(r.ok) })
      .catch(() => setHasCounterpart(false))
  }, [series, counterpart])

  if (!episode) return null

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{episode.host?.nickname ?? name}</h1>
          <div className="flex rounded-md overflow-hidden border border-border text-xs">
            <Link href={`/${series}/${baseName}/editor`}
              className={`px-2 py-0.5 font-semibold transition-colors ${!isEn ? 'bg-blue-500/20 text-blue-400' : hasCounterpart ? 'text-text-dim hover:text-text-secondary' : 'text-text-dim/30 pointer-events-none'}`}>
              KO
            </Link>
            <Link href={`/${series}/${baseName}-en/editor`}
              className={`px-2 py-0.5 font-semibold transition-colors ${isEn ? 'bg-green-500/20 text-green-400' : hasCounterpart ? 'text-text-dim hover:text-text-secondary' : 'text-text-dim/30 pointer-events-none'}`}>
              EN
            </Link>
          </div>
        </div>
        <span className="text-sm text-text-secondary">{name} · {episode.books?.length ?? 0}권{episode.shorts ? ' · Shorts' : ''}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {dirty && <span className="text-xs text-warning-text">미저장</span>}
        <button onClick={() => save()} disabled={!dirty || saving}
          className={`${BTN_PRIMARY} ${!dirty ? 'opacity-40 cursor-default' : ''}`}>
          {saving ? '저장 중...' : '저장'}
        </button>
        <button onClick={reload} className={BTN_SECONDARY}>새로고침</button>
      </div>
    </div>
  )
}
