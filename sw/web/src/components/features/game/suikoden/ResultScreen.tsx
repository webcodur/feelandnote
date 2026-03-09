'use client'

import { useLocale } from 'next-intl'
import type { GameState } from '@/lib/game/suikoden/types'
import { formatSuikodenElapsed, getSuikodenText } from './i18n'

interface Props {
  state: GameState
  onRestart: () => void
}

export default function ResultScreen({ state, onRestart }: Props) {
  const locale = useLocale()
  const text = getSuikodenText(locale)
  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)
  const isVictory = state.winner === state.playerFactionId
  const leaderName = playerFaction?.members.find(m => m.id === playerFaction.leaderId)?.nickname ?? ''

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 p-8">
      <div className="text-4xl font-black text-text-primary">
        {isVictory ? text.result.badgeVictory : state.winner ? text.result.badgeDefeat : text.result.badgeTimeout}
      </div>

      <div>
        <h2 className="text-3xl font-black text-stone-100 mb-2">
          {isVictory ? text.result.titleVictory : state.winner ? text.result.titleDefeat : text.result.titleTimeout}
        </h2>
        <p className="text-text-secondary">
          {isVictory
            ? text.result.descriptionVictory(leaderName)
            : state.winner
            ? text.result.descriptionDefeat
            : text.result.descriptionTimeout}
        </p>
      </div>

      {/* 결산 */}
      <div className="bg-stone-800 border border-stone-700 rounded p-4 text-sm text-left space-y-2 min-w-[280px]">
        <div className="flex justify-between text-text-primary">
          <span>{text.result.elapsed}</span><span className="text-amber-400">{formatSuikodenElapsed(state.gameTime.year, state.gameTime.month, locale)}</span>
        </div>
        <div className="flex justify-between text-text-primary">
          <span>{text.result.people}</span><span>{playerFaction?.members.length ?? 0}</span>
        </div>
        <div className="flex justify-between text-text-primary">
          <span>{text.result.territories}</span><span>{playerFaction?.territories.length ?? 0}</span>
        </div>
        <div className="flex justify-between text-text-primary">
          <span>{text.result.difficulty}</span>
          <span>{text.result.difficultyLabel[state.difficulty]}</span>
        </div>
      </div>

      <button
        onClick={onRestart}
        className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold rounded transition-colors"
      >
        {text.result.restart}
      </button>
    </div>
  )
}
