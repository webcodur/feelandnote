'use client'

import type { GameState, Territory } from '@/lib/game/suikoden/types'
import { BUILDINGS } from '@/lib/game/suikoden/constants'

interface Props {
  state: GameState
  territory: Territory
}

const SEASON_LABELS: Record<string, string> = {
  spring: '봄', summer: '여름', autumn: '가을', winter: '겨울',
}

export default function GameHUD({ state, territory }: Props) {
  const { gameTime, season } = state
  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!

  // 전체 영토 턴당수입 합산
  const turnIncome = { gold: 0, food: 0, knowledge: 0, material: 0 }
  for (const t of playerFaction.territories) {
    // 기본 수입 (영토당)
    turnIncome.gold += 20
    turnIncome.food += 20
    for (const card of t.buildingCards) {
      if (card.isConstructing) continue
      const bDef = BUILDINGS.find(b => b.id === card.defId)
      if (!bDef) continue
      const e = bDef.effect
      const mul = card.assigneeId ? 1.5 : 1
      if (e.goldPerTurn) turnIncome.gold += Math.floor(e.goldPerTurn / 3 * mul)
      if (e.foodPerTurn) turnIncome.food += Math.floor(e.foodPerTurn / 3 * mul)
      if (e.knowledgePerTurn) turnIncome.knowledge += Math.floor(e.knowledgePerTurn / 3 * mul)
      if (e.materialPerTurn) turnIncome.material += Math.floor(e.materialPerTurn / 3 * mul)
    }
  }

  const res = playerFaction.resources

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 bg-stone-800 border border-stone-700 rounded text-xs">
      {/* 시간 */}
      <div className="flex items-center gap-2 text-stone-300">
        <span className="text-amber-400 font-bold text-sm">
          {gameTime.year}년 {gameTime.month}월 {gameTime.day}일
        </span>
        <span>{SEASON_LABELS[season] ?? season}</span>
        <span className="text-stone-500">턴 {state.turnCount}</span>
      </div>

      <div className="w-px h-4 bg-stone-600 hidden sm:block" />

      {/* 세력 */}
      <div className="flex items-center gap-3 text-stone-300">
        <span>인원 {playerFaction.members.length}</span>
        <span>영토 {playerFaction.territories.length}</span>
        <span>명성 {playerFaction.fame}/1000</span>
      </div>

      <div className="w-px h-4 bg-stone-600 hidden sm:block" />

      {/* 자원 (보유량 + 턴당수입) */}
      <div className="flex items-center gap-3">
        <span className="text-amber-400">금 {res.gold}<small className="text-amber-600">(+{turnIncome.gold})</small></span>
        <span className="text-green-400">식량 {res.food}<small className="text-green-600">(+{turnIncome.food})</small></span>
        <span className="text-blue-400">지식 {res.knowledge}<small className="text-blue-600">(+{turnIncome.knowledge})</small></span>
        <span className="text-orange-400">자재 {res.material}<small className="text-orange-600">(+{turnIncome.material})</small></span>
      </div>
    </div>
  )
}
