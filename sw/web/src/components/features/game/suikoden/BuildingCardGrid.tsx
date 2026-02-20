'use client'

import { useState } from 'react'
import type { GameState, Territory, BuildingCard as BuildingCardType } from '@/lib/game/suikoden/types'
import { BUILDINGS, BUILDING_CATEGORY, BUILDING_CATEGORY_INFO, type BuildingCategory } from '@/lib/game/suikoden/constants'
import BuildingCard from './BuildingCard'
import CharacterPortrait from './CharacterPortrait'

interface Props {
  state: GameState
  territory: Territory
  selectedCharId: string | null
  onBuild: (buildingDefId: string) => void
  onAssign: (charId: string, buildingInstanceId: string) => void
  onUnassign: (charId: string) => void
  onDemolish: (buildingInstanceId: string) => void
}

type FilterTab = 'all' | BuildingCategory

export default function BuildingCardGrid({
  state, territory, selectedCharId,
  onBuild, onAssign, onUnassign, onDemolish,
}: Props) {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [showBuildMenu, setShowBuildMenu] = useState(false)

  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!

  const tabs: { id: FilterTab; label: string; icon: string; color?: string }[] = [
    { id: 'all', label: '전체', icon: '🏘️' },
    ...Object.entries(BUILDING_CATEGORY_INFO).map(([id, info]) => ({
      id: id as BuildingCategory,
      label: info.name,
      icon: info.icon,
      color: info.color,
    })),
  ]

  const filteredCards = filter === 'all'
    ? territory.buildingCards
    : territory.buildingCards.filter(c => BUILDING_CATEGORY[c.defId] === filter)

  const slotUsed = territory.buildingCards.length
  const slotMax = territory.maxBuildings
  const hasRoom = slotUsed < slotMax

  // 건설 가능한 건물 목록
  const existingDefIds = new Set(territory.buildingCards.map(c => c.defId))
  const buildableBuildings = BUILDINGS.filter(b => {
    if (existingDefIds.has(b.id)) return false
    return playerFaction.resources.gold >= b.costGold && playerFaction.resources.material >= b.costMaterial
  })

  // 선택된 캐릭터가 idle인지 확인
  const selectedPlacement = selectedCharId
    ? state.placements.find(p => p.characterId === selectedCharId)
    : null
  const canBuild = selectedPlacement?.task === 'idle' && hasRoom

  return (
    <div className="bg-stone-800 border border-stone-700 rounded">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-200">🏘️ {territory.name}</span>
          <span className="text-[10px] text-stone-500">
            슬롯 {slotUsed}/{slotMax}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-stone-400">
          <span>🏘️ {territory.population.toLocaleString()}</span>
          <span className={territory.morale >= 50 ? 'text-green-400' : 'text-red-400'}>
            {territory.morale >= 80 ? '😊' : territory.morale >= 50 ? '😐' : '😠'} {Math.round(territory.morale)}
          </span>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex border-b border-stone-700">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`flex-1 py-1.5 text-[10px] text-center transition-colors ${
              filter === t.id
                ? 'text-amber-300 bg-stone-700 font-bold'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 건물 카드 그리드 */}
      <div className="p-2">
        {filteredCards.length === 0 && !hasRoom && (
          <p className="text-[10px] text-stone-500 text-center py-4">건물 없음</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filteredCards.map(card => {
            const character = card.assigneeId
              ? playerFaction.members.find(m => m.id === card.assigneeId)
              : null

            return (
              <BuildingCard
                key={card.instanceId}
                card={card}
                character={character}
                onAssign={selectedCharId && selectedPlacement?.task === 'idle'
                  ? () => onAssign(selectedCharId, card.instanceId)
                  : undefined
                }
                onUnassign={card.assigneeId
                  ? () => onUnassign(card.assigneeId!)
                  : undefined
                }
                onDemolish={() => onDemolish(card.instanceId)}
              />
            )
          })}

          {/* 건설 슬롯 */}
          {hasRoom && filter === 'all' && (
            <div className="relative">
              <button
                onClick={() => setShowBuildMenu(!showBuildMenu)}
                disabled={!canBuild}
                className={`w-full h-full min-h-[72px] border border-dashed rounded flex flex-col items-center justify-center gap-1 transition-colors ${
                  canBuild
                    ? 'border-amber-600/50 text-amber-400 hover:bg-stone-700 hover:border-amber-500'
                    : 'border-stone-600 text-stone-600 cursor-not-allowed'
                }`}
              >
                <span className="text-lg">+</span>
                <span className="text-[9px]">
                  {canBuild ? '건설' : !selectedCharId ? '인물 선택' : '대기 중인 인물 필요'}
                </span>
              </button>

              {/* 건설 메뉴 */}
              {showBuildMenu && canBuild && (
                <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-stone-900 border border-stone-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {buildableBuildings.length === 0 ? (
                    <p className="px-3 py-2 text-[10px] text-stone-500">건설 가능한 건물 없음</p>
                  ) : (
                    buildableBuildings.map(b => {
                      const cat = BUILDING_CATEGORY[b.id]
                      const catInfo = cat ? BUILDING_CATEGORY_INFO[cat] : null
                      return (
                        <button
                          key={b.id}
                          onClick={() => { onBuild(b.id); setShowBuildMenu(false) }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-700 transition-colors text-left"
                        >
                          <span>{b.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-stone-200">{b.name}</div>
                            <div className="text-[9px] text-stone-500">
                              {b.costGold > 0 && `🪙${b.costGold} `}
                              {b.costMaterial > 0 && `🪵${b.costMaterial} `}
                              <span className="text-stone-600">건설 {b.buildTurns}턴</span>
                            </div>
                          </div>
                          {catInfo && (
                            <span className="text-[8px] px-1 py-0.5 rounded" style={{ color: catInfo.color, backgroundColor: catInfo.color + '20' }}>
                              {catInfo.name}
                            </span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
