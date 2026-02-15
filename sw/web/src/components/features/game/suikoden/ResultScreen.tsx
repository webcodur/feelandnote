'use client'

import type { GameState } from '@/lib/game/suikoden/types'

interface Props {
  state: GameState
  onRestart: () => void
}

export default function ResultScreen({ state, onRestart }: Props) {
  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)
  const isVictory = state.winner === state.playerFactionId

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="text-6xl">
        {isVictory ? '🏆' : state.winner ? '💀' : '⏳'}
      </div>

      <div>
        <h2 className="text-3xl font-black text-stone-100 mb-2">
          {isVictory ? '통일 달성!' : state.winner ? '패배...' : '시간 초과'}
        </h2>
        <p className="text-stone-400">
          {isVictory
            ? `${playerFaction?.members.find(m => m.id === playerFaction.leaderId)?.nickname}이(가) 천하를 통일했다.`
            : state.winner
            ? '세력이 무너졌다.'
            : '제한 턴 내에 통일하지 못했다. 역사의 뒤안길로...'}
        </p>
      </div>

      {/* 결산 */}
      <div className="bg-stone-800 border border-stone-700 rounded p-4 text-sm text-left space-y-2 min-w-[280px]">
        <div className="flex justify-between text-stone-300">
          <span>경과</span><span className="text-amber-400">{state.gameTime.year - 1002}년 {state.gameTime.month}월</span>
        </div>
        <div className="flex justify-between text-stone-300">
          <span>인재 수</span><span>{playerFaction?.members.length ?? 0}명</span>
        </div>
        <div className="flex justify-between text-stone-300">
          <span>영토 수</span><span>{playerFaction?.territories.length ?? 0}개</span>
        </div>
        <div className="flex justify-between text-stone-300">
          <span>난이도</span>
          <span>{{ easy: '쉬움', normal: '보통', hard: '어려움' }[state.difficulty]}</span>
        </div>
      </div>

      <button
        onClick={onRestart}
        className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold rounded transition-colors"
      >
        다시 시작
      </button>
    </div>
  )
}
