'use client'

import { useLocale } from 'next-intl'
import type { BattleState, BattleUnit } from '@/lib/game/suikoden/types'
import CharacterPortrait from './CharacterPortrait'
import { getSuikodenText } from './i18n'

interface Props {
  state: BattleState
  playerFactionId: string
}

export default function TurnOrderBar({ state, playerFactionId }: Props) {
  const locale = useLocale()
  const text = getSuikodenText(locale)
  const allUnits = [...state.allies, ...state.enemies]
  const currentUnitId = state.turnOrder[state.currentTurnIndex]

  return (
    <div className="flex items-center gap-1 p-2 bg-stone-800 border border-stone-700 rounded overflow-x-auto">
      <span className="text-[9px] text-stone-500 shrink-0 mr-1">{text.battle.turn(state.turnNumber)}</span>
      {state.turnOrder.map((unitId, i) => {
        const unit = allUnits.find(u => u.id === unitId)
        if (!unit || unit.isDefeated) return null
        const isAlly = unit.factionId === playerFactionId ||
          state.allies.some(u => u.id === unitId)
        const isCurrent = unitId === currentUnitId

        return (
          <div
            key={unitId}
            className={`relative shrink-0 transition-all ${
              isCurrent ? 'scale-110 z-10' : 'opacity-70'
            }`}
          >
            <div
              className="rounded-full overflow-hidden"
              style={{
                width: isCurrent ? 36 : 28,
                height: isCurrent ? 36 : 28,
                border: `2px solid ${isAlly ? '#22c55e' : '#ef4444'}`,
                boxShadow: isCurrent ? `0 0 8px ${isAlly ? '#22c55e80' : '#ef444480'}` : 'none',
              }}
            >
              <CharacterPortrait character={unit.character} size={isCurrent ? 36 : 28} />
            </div>
            {isCurrent && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full" />
            )}
          </div>
        )
      })}
    </div>
  )
}
