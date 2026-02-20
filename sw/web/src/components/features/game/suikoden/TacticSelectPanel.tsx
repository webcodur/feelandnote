'use client'

import type { TacticType } from '@/lib/game/suikoden/types'
import { TACTIC_INFO, TACTIC_MATCHUP } from '@/lib/game/suikoden/constants'

interface Props {
  availableTactics: TacticType[]
  selectedTactic: TacticType | null
  onSelect: (tactic: TacticType) => void
  disabled?: boolean
}

const ALL_TACTICS: TacticType[] = ['charge', 'defend', 'stratagem', 'fire', 'morale', 'feint']

export default function TacticSelectPanel({ availableTactics, selectedTactic, onSelect, disabled }: Props) {
  const availableSet = new Set(availableTactics)

  return (
    <div className="space-y-2">
      <div className="text-xs font-bold text-stone-300">전술 선택</div>
      <div className="grid grid-cols-3 gap-2">
        {ALL_TACTICS.map(tactic => {
          const info = TACTIC_INFO[tactic]
          const isAvailable = availableSet.has(tactic)
          const isSelected = selectedTactic === tactic

          // 유리/불리 요약
          const advantages = ALL_TACTICS.filter(t => TACTIC_MATCHUP[tactic][t] >= 1.4)
          const disadvantages = ALL_TACTICS.filter(t => TACTIC_MATCHUP[tactic][t] <= 0.65)

          return (
            <button
              key={tactic}
              onClick={() => isAvailable && !disabled && onSelect(tactic)}
              disabled={!isAvailable || disabled}
              className={`relative p-2 rounded border text-left transition-all ${
                isSelected
                  ? 'border-amber-400 bg-amber-900/30 ring-1 ring-amber-400'
                  : isAvailable
                    ? 'border-stone-600 bg-stone-800 hover:border-stone-500 hover:bg-stone-750'
                    : 'border-stone-700 bg-stone-900 opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base">{info.icon}</span>
                <span className="text-[11px] font-bold text-stone-200">{info.name}</span>
              </div>
              <p className="text-[9px] text-stone-400 mt-1 leading-relaxed">{info.description}</p>

              {/* 상성 표시 */}
              {isAvailable && (
                <div className="mt-1.5 space-y-0.5">
                  {advantages.length > 0 && (
                    <div className="text-[8px] text-green-400">
                      ▲ {advantages.map(t => TACTIC_INFO[t].name).join(', ')}
                    </div>
                  )}
                  {disadvantages.length > 0 && (
                    <div className="text-[8px] text-red-400">
                      ▼ {disadvantages.map(t => TACTIC_INFO[t].name).join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* 병력 소모율 */}
              {isAvailable && info.troopCostRate > 0 && (
                <div className="text-[8px] text-stone-500 mt-0.5">
                  소모 {Math.round(info.troopCostRate * 100)}%
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
