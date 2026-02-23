'use client'

import type { Stats } from '@/lib/game/suikoden/types'
import { STAT_LABELS } from '@/lib/game/suikoden/constants'

interface Props {
  stats: Stats
  /** true면 설명 토글 버튼 표시 (기본 false) */
  showGuide?: boolean
}

export default function StatBars({ stats, showGuide }: Props) {
  return (
    <div className="space-y-1">
      {(Object.keys(STAT_LABELS) as (keyof Stats)[]).map(key => (
        <div key={key} className="flex items-center gap-2 text-[10px]" title={STAT_LABELS[key].desc}>
          <span className="w-10 text-stone-400 shrink-0">{STAT_LABELS[key].icon} {STAT_LABELS[key].name}</span>
          <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${stats[key] * 10}%`,
                backgroundColor: stats[key] >= 8 ? '#fbbf24' : stats[key] >= 5 ? '#60a5fa' : '#6b7280',
              }}
            />
          </div>
          <span className="w-4 text-right text-stone-300 font-bold text-[10px]">{stats[key]}</span>
        </div>
      ))}
    </div>
  )
}
