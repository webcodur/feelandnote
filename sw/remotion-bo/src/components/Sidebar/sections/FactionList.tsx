import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { FactionEpisodeListItem } from '@/lib/faction-types'
import { EpisodeStatusDot } from '@feelandnote/shared/bo/editor'

type FactionListProps = {
  activeSeries: string
  pathname: string
}

/** 세력도 사이드바 목록 — 에피소드(세력도) 빠른 이동. 인물 묶음 없이 단순 링크 리스트. */
export function FactionList({ activeSeries, pathname }: FactionListProps) {
  const [items, setItems] = useState<FactionEpisodeListItem[]>([])

  const load = useCallback(() => {
    fetch(`/api/${activeSeries}/episodes`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
  }, [activeSeries])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-0.5">
      {items.map(ep => {
        const active = pathname.startsWith(`/${activeSeries}/${ep.id}`)
        return (
          <Link key={ep.id} href={`/${activeSeries}/${ep.id}`}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs ${active ? 'bg-bg-card border border-border-active !text-accent' : 'hover:bg-bg-card hover:shadow-sm text-text-secondary'}`}>
            <EpisodeStatusDot status={ep.status} />
            <span className="font-semibold truncate">{ep.title || ep.id}</span>
            <span className="ml-auto text-[10px] text-text-dim shrink-0">{ep.personCount}명</span>
          </Link>
        )
      })}
      {items.length === 0 && (
        <div className="text-xs text-text-dim py-4 text-center">세력도 없음</div>
      )}
    </div>
  )
}
