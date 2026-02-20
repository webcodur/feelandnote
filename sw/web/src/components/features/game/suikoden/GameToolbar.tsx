'use client'

import { useState, useRef, useEffect } from 'react'
import type { GameState, Territory } from '@/lib/game/suikoden/types'
import { BUILDINGS, CLASS_INFO } from '@/lib/game/suikoden/constants'
import CharacterPortrait from './CharacterPortrait'

interface Props {
  state: GameState
  territory: Territory
  selectedCharId: string | null
  onSelectChar: (id: string | null) => void
  onIdle: () => void
  onRecruit: () => void
  onToggleAutoAssign: () => void
  onDetailChar: (id: string) => void
}

export default function GameToolbar({
  state, territory, selectedCharId,
  onSelectChar, onIdle, onRecruit,
  onToggleAutoAssign, onDetailChar,
}: Props) {
  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!
  const selectedChar = selectedCharId ? playerFaction.members.find(m => m.id === selectedCharId) : null
  const selectedPlacement = selectedCharId ? state.placements.find(p => p.characterId === selectedCharId) : null

  const [charDropdown, setCharDropdown] = useState(false)
  const [facilityDropdown, setFacilityDropdown] = useState(false)
  const charRef = useRef<HTMLDivElement>(null)
  const facilityRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (charRef.current && !charRef.current.contains(e.target as Node)) setCharDropdown(false)
      if (facilityRef.current && !facilityRef.current.contains(e.target as Node)) setFacilityDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 건물 카드 기반 시설 목록
  const builtFacilities = territory.buildingCards
    .filter(c => !c.isConstructing)
    .map(c => ({
      card: c,
      def: BUILDINGS.find(b => b.id === c.defId),
      worker: c.assigneeId ? playerFaction.members.find(m => m.id === c.assigneeId) : null,
    }))
    .filter(f => f.def)

  // 영토 자원 수입 요약
  const dailyIncome = { gold: 2, food: 2, knowledge: 0, material: 0 }
  for (const card of territory.buildingCards) {
    if (card.isConstructing) continue
    const bDef = BUILDINGS.find(b => b.id === card.defId)
    if (!bDef) continue
    const e = bDef.effect
    const mul = card.assigneeId ? 1.5 : 1
    if (e.goldPerTurn) dailyIncome.gold += Math.floor(e.goldPerTurn / 24 * mul)
    if (e.foodPerTurn) dailyIncome.food += Math.floor(e.foodPerTurn / 24 * mul)
    if (e.knowledgePerTurn) dailyIncome.knowledge += Math.floor(e.knowledgePerTurn / 24 * mul)
    if (e.materialPerTurn) dailyIncome.material += Math.floor(e.materialPerTurn / 24 * mul)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-stone-800/80 border border-stone-700 rounded text-[11px]">
      {/* 캐릭터 선택 드롭다운 */}
      <div className="relative" ref={charRef}>
        <button
          onClick={() => { setCharDropdown(!charDropdown); setFacilityDropdown(false) }}
          className="flex items-center gap-1.5 px-2 py-1 bg-stone-700 rounded hover:bg-stone-600 min-w-[120px]"
        >
          {selectedChar ? (
            <>
              <CharacterPortrait character={selectedChar} size={16} />
              <span className="text-stone-200 truncate max-w-[80px]">{selectedChar.nickname}</span>
              <span className="text-stone-500 text-[9px]">{taskLabel(selectedPlacement?.task)}</span>
            </>
          ) : (
            <span className="text-stone-500">인물 선택</span>
          )}
          <span className="text-stone-500 ml-auto">▾</span>
        </button>
        {charDropdown && (
          <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-stone-900 border border-stone-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {playerFaction.members.map(m => {
              const p = state.placements.find(pl => pl.characterId === m.id)
              const cls = CLASS_INFO[m.unitClass]
              return (
                <button
                  key={m.id}
                  onClick={() => { onSelectChar(m.id); setCharDropdown(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-stone-700 transition-colors ${
                    selectedCharId === m.id ? 'bg-amber-900/30' : ''
                  }`}
                >
                  <CharacterPortrait character={m} size={20} />
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-stone-200 truncate">{m.nickname}</div>
                    <div className="text-[9px] text-stone-500">{cls.icon} {cls.name}</div>
                  </div>
                  <span className="text-[9px] text-stone-500 shrink-0">
                    {p?.task === 'idle' ? '대기' : taskLabel(p?.task)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 시설 선택 드롭다운 */}
      <div className="relative" ref={facilityRef}>
        <button
          onClick={() => { setFacilityDropdown(!facilityDropdown); setCharDropdown(false) }}
          className="flex items-center gap-1.5 px-2 py-1 bg-stone-700 rounded hover:bg-stone-600 min-w-[100px]"
        >
          <span className="text-stone-400">시설</span>
          <span className="text-amber-400 font-bold">{builtFacilities.length}</span>
          <span className="text-stone-500 ml-auto">▾</span>
        </button>
        {facilityDropdown && (
          <div className="absolute z-50 top-full left-0 mt-1 w-52 bg-stone-900 border border-stone-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {builtFacilities.length === 0 ? (
              <div className="px-3 py-2 text-stone-500">건설된 시설 없음</div>
            ) : (
              builtFacilities.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-stone-700 transition-colors"
                >
                  <span>{f.def!.icon}</span>
                  <span className="flex-1 text-left text-stone-200">{f.def!.name}</span>
                  {f.worker ? (
                    <span className="text-[9px] text-green-400">{f.worker.nickname}</span>
                  ) : (
                    <span className="text-[9px] text-stone-600">무인</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div className="w-px h-5 bg-stone-600" />

      {/* 빠른 명령 버튼 */}
      <div className="flex items-center gap-1">
        <ToolButton
          icon="💤" label="대기"
          disabled={!selectedChar || selectedPlacement?.task === 'idle'}
          onClick={onIdle}
        />
        <ToolButton
          icon="📋" label="상세"
          disabled={!selectedChar}
          onClick={() => selectedCharId && onDetailChar(selectedCharId)}
        />
        <ToolButton
          icon="🔍" label="탐색"
          onClick={onRecruit}
        />
        <ToolButton
          icon={state.autoAssign ? '⚡' : '💤'}
          label={state.autoAssign ? '자동ON' : '자동OFF'}
          active={state.autoAssign}
          onClick={onToggleAutoAssign}
        />
      </div>

      {/* 구분선 */}
      <div className="w-px h-5 bg-stone-600" />

      {/* 영토 정보 */}
      <div className="flex items-center gap-3 text-[10px] text-stone-400">
        <span title="인구">🏘️ {territory.population.toLocaleString()}</span>
        <span title="민심" className={territory.morale >= 50 ? 'text-green-400' : 'text-red-400'}>
          {territory.morale >= 80 ? '😊' : territory.morale >= 50 ? '😐' : territory.morale >= 20 ? '😠' : '🔥'} {Math.round(territory.morale)}
        </span>
        <span title="일일 금 수입" className="text-amber-400">+🪙{dailyIncome.gold}</span>
        <span title="일일 식량 수입" className="text-green-400">+🌾{dailyIncome.food}</span>
        {dailyIncome.knowledge > 0 && <span title="일일 지식 수입" className="text-blue-400">+📜{dailyIncome.knowledge}</span>}
        {dailyIncome.material > 0 && <span title="일일 자재 수입" className="text-orange-400">+🪵{dailyIncome.material}</span>}
      </div>
    </div>
  )
}

function ToolButton({ icon, label, disabled, active, onClick }: {
  icon: string; label: string; disabled?: boolean; active?: boolean; onClick: () => void
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={`px-1.5 py-1 rounded transition-colors text-[11px] ${
        active
          ? 'bg-amber-700/50 text-amber-200'
          : disabled
            ? 'text-stone-600 cursor-not-allowed'
            : 'text-stone-400 hover:bg-stone-700 hover:text-stone-200'
      }`}
    >
      {icon}
    </button>
  )
}

function taskLabel(task?: string): string {
  if (!task) return ''
  const labels: Record<string, string> = {
    idle: '대기', building: '건설 중', working: '근무 중', training: '훈련 중',
  }
  return labels[task] ?? task
}
