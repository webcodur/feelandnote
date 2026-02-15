'use client'

import type { GameState, GameSpeed } from '@/lib/game/suikoden/types'

interface Props {
  state: GameState
  onSetSpeed: (speed: GameSpeed) => void
}

const SEASON_LABELS: Record<string, string> = {
  spring: '🌸 봄', summer: '☀️ 여름', autumn: '🍂 가을', winter: '❄️ 겨울',
}

export default function GameHUD({ state, onSetSpeed }: Props) {
  const { gameTime, speed, season } = state
  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-800 border border-stone-700 rounded">
      {/* 날짜 & 계절 */}
      <div className="flex items-center gap-3 text-xs text-stone-300">
        <span className="text-amber-400 font-bold text-sm">
          {gameTime.year}년 {gameTime.month}월 {gameTime.day}일
        </span>
        <span>{SEASON_LABELS[season] ?? season}</span>
        <span>👥 {playerFaction.members.length}</span>
        <span>🏴 {playerFaction.territories.length}</span>
        <span title="명성 (영입 조건)">⭐ {playerFaction.fame}/1000</span>
      </div>

      {/* 자원 */}
      <div className="flex items-center gap-3 text-xs">
        <span title="금화">🪙 {playerFaction.resources.gold}</span>
        <span title="식량">🌾 {playerFaction.resources.food}</span>
        <span title="지식">📜 {playerFaction.resources.knowledge}</span>
        <span title="자재">🪵 {playerFaction.resources.material}</span>
      </div>

      {/* 배속 컨트롤 */}
      <div className="flex items-center gap-1">
        {([1, 2, 3] as GameSpeed[]).map(s => (
          <button
            key={s}
            onClick={() => onSetSpeed(s)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              speed === s ? 'bg-amber-600 text-white font-bold' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
            }`}
          >
            {s}x
          </button>
        ))}
        <button
          onClick={() => onSetSpeed(speed === 0 ? (state.prevSpeed || 1) : 0)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            speed === 0 ? 'bg-red-600 text-white font-bold' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
          }`}
        >
          {speed === 0 ? '▶' : '⏸'}
        </button>
      </div>
    </div>
  )
}
