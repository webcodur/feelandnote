'use client'

import type { Stats } from '@/lib/game/suikoden/types'
import { STAT_LABELS, ABILITY_STAT_KEYS, VIRTUE_STAT_KEYS } from '@/lib/game/suikoden/constants'

interface Props {
  stats: Stats
}

const BAR_COLOR = '#60a5fa'

/** 능력 — 큰 수치 + 미니 바 */
function AbilityCell({ statKey, stats }: { statKey: string; stats: Stats }) {
  const label = STAT_LABELS[statKey]
  if (!label) return null
  const val = stats[statKey as keyof Stats] as number
  return (
    <div className="flex-1 min-w-0" title={label.desc}>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] text-text-secondary">{label.name}</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: BAR_COLOR }}>{val}</span>
        </div>
        <div className="h-1 bg-stone-700 rounded-full overflow-hidden mt-0.5">
          <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: BAR_COLOR }} />
        </div>
    </div>
  )
}

/** 덕목 — 인라인 미니 바 */
function VirtueCell({ statKey, stats }: { statKey: string; stats: Stats }) {
  const label = STAT_LABELS[statKey]
  if (!label) return null
  const val = stats[statKey as keyof Stats] as number
  return (
    <div className="flex items-center gap-1" title={label.desc}>
      <span className="text-[10px] text-text-secondary w-5 shrink-0">{label.name}</span>
      <div className="flex-1 h-1 bg-stone-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: BAR_COLOR }} />
      </div>
      <span className="text-[10px] text-text-secondary w-4 text-right tabular-nums">{val}</span>
    </div>
  )
}

export default function StatBars({ stats }: Props) {
  return (
    <div className="space-y-2">
      {/* 능력 2×2 */}
      <div>
        <div className="text-[9px] text-text-secondary font-medium mb-1">능력</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {ABILITY_STAT_KEYS.map(key => (
            <AbilityCell key={key} statKey={key} stats={stats} />
          ))}
        </div>
      </div>
      {/* 덕목 4×2 */}
      <div>
        <div className="text-[9px] text-text-secondary font-medium mb-1">덕목</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {VIRTUE_STAT_KEYS.map(key => (
            <VirtueCell key={key} statKey={key} stats={stats} />
          ))}
        </div>
      </div>
    </div>
  )
}
