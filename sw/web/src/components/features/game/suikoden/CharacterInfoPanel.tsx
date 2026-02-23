'use client'

import { useState } from 'react'
import type { GameState } from '@/lib/game/suikoden/types'
import { BUILDINGS, GRADE_COLORS, STAT_LABELS, CLASS_INFO } from '@/lib/game/suikoden/constants'
import type { Stats } from '@/lib/game/suikoden/types'
import CharacterPortrait from './CharacterPortrait'
import StatBars from './StatBars'

interface Props {
  state: GameState
  selectedCharId: string | null
  onIdle: () => void
  onTrain: () => void
  onReward: () => void
  onPunish: () => void
}

export default function CharacterInfoPanel({
  state, selectedCharId,
  onIdle, onTrain, onReward, onPunish,
}: Props) {
  const [showStatGuide, setShowStatGuide] = useState(false)

  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!
  const territory = playerFaction.territories.find(t => t.id === state.viewingTerritoryId)
  const char = selectedCharId ? playerFaction.members.find(m => m.id === selectedCharId) : null
  const placement = selectedCharId ? state.placements.find(p => p.characterId === selectedCharId) : null
  const hasTrainingGround = territory?.buildingCards.some(c => c.defId === 'training' && !c.isConstructing) ?? false
  const isLeader = selectedCharId === playerFaction.leaderId

  if (!char || !placement) {
    return (
      <div className="p-4 opacity-40">
        <p className="text-[10px] text-stone-600 text-center py-6">인물을 선택하라</p>
      </div>
    )
  }

  const taskLabels: Record<string, string> = {
    idle: '대기', building: '건설 중', working: '근무 중', training: '훈련 중',
  }
  const taskText = taskLabels[placement.task] ?? placement.task
  const assignedBuilding = placement.assignedBuildingId
    ? territory?.buildingCards.find(c => c.instanceId === placement.assignedBuildingId)
    : null
  const bDef = assignedBuilding ? BUILDINGS.find(b => b.id === assignedBuilding.defId) : null

  return (
    <div>
      {/* 헤더: 초상화 + 이름/등급/병종/수식어 */}
      <div className="flex items-center gap-3 p-3 border-b border-stone-700">
        <CharacterPortrait character={char} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-stone-100 truncate">{char.nickname}</span>
            <span className="text-[10px] font-bold" style={{ color: GRADE_COLORS[char.grade] }}>{char.grade}</span>
          </div>
          <p className="text-[10px] text-stone-400">{char.title}</p>
          <p className="text-[10px] text-stone-500">
            {CLASS_INFO[char.unitClass].icon} {CLASS_INFO[char.unitClass].name}
          </p>
        </div>
      </div>

      {/* 작업 상태 */}
      <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] border-b border-stone-700">
        <span className="text-stone-500">작업: <b className="text-stone-300">{taskText}</b>{bDef ? ` — ${bDef.name}` : ''}</span>
        {placement.task !== 'idle' && (
          <button onClick={onIdle} className="px-1.5 py-0.5 bg-stone-700 rounded text-stone-400 hover:bg-stone-600 text-[9px]">
            중지
          </button>
        )}
      </div>

      {/* HP / 병사 / 충성 */}
      <div className="grid grid-cols-3 gap-1.5 px-3 py-2 border-b border-stone-700">
        <div className="bg-stone-900 rounded p-1.5 text-center">
          <div className="text-[9px] text-stone-500">HP</div>
          <div className="text-[10px] text-stone-200 font-bold">{char.hp}/{char.maxHp}</div>
        </div>
        <div className="bg-stone-900 rounded p-1.5 text-center">
          <div className="text-[9px] text-stone-500">병사</div>
          <div className="text-[10px] text-stone-200 font-bold">{char.troops}/{char.maxTroops}</div>
        </div>
        {!isLeader ? (
          <div className="bg-stone-900 rounded p-1.5 text-center">
            <div className="text-[9px] text-stone-500">충성</div>
            <div className={`text-[10px] font-bold ${char.loyaltyValue >= 80 ? 'text-green-400' : char.loyaltyValue >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {char.loyaltyValue}
            </div>
          </div>
        ) : (
          <div className="bg-stone-900 rounded p-1.5 text-center">
            <div className="text-[9px] text-stone-500">사기</div>
            <div className="text-[10px] text-stone-200 font-bold">{char.morale}</div>
          </div>
        )}
      </div>

      {/* 사기 (리더가 아닐 때만 별도 표시) */}
      {!isLeader && (
        <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] border-b border-stone-700">
          <span className="text-stone-500">사기 <b className="text-stone-300">{char.morale}</b></span>
        </div>
      )}

      {/* 스탯 바 7개 */}
      <div className="px-3 py-2 border-b border-stone-700">
        <StatBars stats={char.stats} />
        {/* 스탯 설명 토글 */}
        <button
          onClick={() => setShowStatGuide(!showStatGuide)}
          className="mt-1.5 text-[9px] text-stone-600 hover:text-amber-400 transition-colors"
        >
          {showStatGuide ? '설명 닫기' : '스탯 설명'}
        </button>
        {showStatGuide && (
          <div className="mt-1 space-y-0.5 text-[9px] bg-stone-900/60 rounded p-2 border border-stone-700">
            {(Object.keys(STAT_LABELS) as (keyof Stats)[]).map(key => (
              <div key={key} className="flex gap-1.5">
                <span className="text-stone-400 shrink-0 w-6 font-bold">{STAT_LABELS[key].name}</span>
                <span className="text-stone-500">{STAT_LABELS[key].desc}</span>
              </div>
            ))}
            <div className="border-t border-stone-700 mt-1 pt-1 text-stone-600">
              <p>훈련 가능: 완력, 기량, 체력</p>
            </div>
          </div>
        )}
      </div>

      {/* 소개 / 명언 */}
      {(char.bio || char.quotes) && (
        <div className="px-3 py-2 border-b border-stone-700 space-y-1">
          {char.bio && <p className="text-[10px] text-stone-400 leading-relaxed">{char.bio}</p>}
          {char.quotes && <p className="text-[10px] italic text-stone-500">&ldquo;{char.quotes}&rdquo;</p>}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="p-3 space-y-1.5">
        {placement.task === 'idle' && hasTrainingGround && (
          <button onClick={onTrain} className="w-full py-1.5 text-xs text-stone-300 bg-stone-700 rounded hover:bg-stone-600">
            훈련
          </button>
        )}
        {placement.task === 'idle' && !hasTrainingGround && (
          <p className="text-[9px] text-stone-600 text-center">※ 연병장 건설 시 훈련 가능</p>
        )}
        {!isLeader && (
          <div className="flex gap-1">
            <button
              onClick={onReward}
              disabled={playerFaction.resources.gold < 50}
              className="flex-1 py-1.5 text-xs bg-stone-700 rounded text-amber-300 hover:bg-stone-600 disabled:opacity-30"
            >
              포상 (금50)
            </button>
            <button
              onClick={onPunish}
              className="flex-1 py-1.5 text-xs bg-stone-700 rounded text-red-300 hover:bg-stone-600"
            >
              처벌
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
