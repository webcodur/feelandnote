'use client'

import { useState } from 'react'
import type { GameState, TerritoryId, TaxRate } from '@/lib/game/suikoden/types'
import { BUILDINGS, TERRITORIES } from '@/lib/game/suikoden/constants'
import { getRelation, isAllied } from '@/lib/game/suikoden/diplomacy'
import CharacterPortrait from './CharacterPortrait'

interface Props {
  state: GameState
  selectedCharId: string | null
  viewingTerritoryId: TerritoryId
  onPatrol: () => void
  onIdle: () => void
  onRecruit: () => void
  onTrain: () => void
  onReward: () => void
  onPunish: () => void
  onAttack: (targetTerritoryId: TerritoryId) => void
  onClaim: (territoryId: TerritoryId) => void
  onDiplomacy: (action: string, targetFactionId: string) => void
  onDemolish: (buildingDefId: string) => void
  onSetTaxRate: (rate: TaxRate) => void
  autoAssign: boolean
  onToggleAutoAssign: () => void
}

type Tab = 'develop' | 'personnel' | 'military' | 'diplomacy'

export default function CommandMenu({ state, selectedCharId, viewingTerritoryId, onPatrol, onIdle, onRecruit, onTrain, onReward, onPunish, onAttack, onClaim, onDiplomacy, onDemolish, onSetTaxRate, autoAssign, onToggleAutoAssign }: Props) {
  const [tab, setTab] = useState<Tab>('develop')

  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!
  const territory = playerFaction.territories.find(t => t.id === viewingTerritoryId)
  const selectedChar = selectedCharId ? playerFaction.members.find(m => m.id === selectedCharId) : null
  const selectedPlacement = selectedCharId ? state.placements.find(p => p.characterId === selectedCharId) : null
  const hasTrainingGround = territory?.buildings.some(b => b.def.id === 'training' && b.turnsLeft === 0) ?? false

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'develop', label: '개발', icon: '🏗️' },
    { id: 'personnel', label: '인사', icon: '👥' },
    { id: 'military', label: '군사', icon: '⚔️' },
    { id: 'diplomacy', label: '외교', icon: '🤝' },
  ]

  // 인접 영토 목록
  const neighbors = territory ? getNeighborInfo(state, territory.id) : []

  return (
    <div className="bg-stone-800 border border-stone-700 rounded">
      {/* 탭 바 */}
      <div className="flex border-b border-stone-700">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs text-center transition-colors ${
              tab === t.id ? 'text-amber-300 bg-stone-700 font-bold' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-3">
        {/* 선택 캐릭터 상태 */}
        {selectedChar && selectedPlacement && (
          <div className="mb-3 p-2 bg-stone-900 rounded flex items-center gap-2">
            <CharacterPortrait character={selectedChar} size={28} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-stone-200 truncate">{selectedChar.nickname}</div>
              <div className="text-[10px] text-stone-500">
                {taskLabel(selectedPlacement.task)}
                {selectedPlacement.task === 'building' && ` · ${BUILDINGS.find(b => b.id === selectedPlacement.taskTargetBuildingDefId)?.name ?? ''}`}
              </div>
            </div>
            {selectedPlacement.task !== 'idle' && (
              <button onClick={onIdle} className="px-2 py-1 text-[10px] bg-stone-700 rounded text-stone-400 hover:bg-stone-600">
                중지
              </button>
            )}
          </div>
        )}

        {/* 개발 탭 */}
        {tab === 'develop' && (
          <div className="space-y-2">
            {/* 세율 조정 */}
            {territory && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-stone-500 shrink-0">세율:</span>
                {(['low', 'normal', 'high'] as const).map(rate => (
                  <button
                    key={rate}
                    onClick={() => onSetTaxRate(rate)}
                    className={`flex-1 py-1 text-[10px] rounded transition-colors ${
                      territory.taxRate === rate
                        ? rate === 'high' ? 'bg-red-900/50 text-red-300 font-bold'
                          : rate === 'low' ? 'bg-green-900/50 text-green-300 font-bold'
                          : 'bg-amber-900/50 text-amber-300 font-bold'
                        : 'bg-stone-700 text-stone-500 hover:bg-stone-600'
                    }`}
                  >
                    {rate === 'low' ? '낮음' : rate === 'high' ? '높음' : '보통'}
                  </button>
                ))}
              </div>
            )}

            <p className="text-[10px] text-stone-500">
              {!selectedChar
                ? '캐릭터를 선택한 뒤 맵에서 우클릭으로 건설한다.'
                : '빈 타일을 우클릭 → 건설 메뉴에서 건물을 선택한다.'}
            </p>
            {/* 건물 목록 */}
            {territory && (
              <div className="space-y-0.5">
                {BUILDINGS.map(b => {
                  const exists = territory.buildings.some(tb => tb.def.id === b.id)
                  const affordable = playerFaction.resources.gold >= b.costGold && playerFaction.resources.material >= b.costMaterial
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between px-2 py-1 text-[10px] rounded ${exists ? '' : !affordable ? 'opacity-50' : 'text-stone-300'}`}
                    >
                      <span className={exists ? 'text-stone-500' : ''}>{b.icon} {b.name}</span>
                      {exists ? (
                        <button
                          onClick={() => onDemolish(b.id)}
                          className="text-red-400 hover:text-red-300 text-[9px]"
                          title="철거"
                        >
                          🗑️ 철거
                        </button>
                      ) : (
                        <span className="text-stone-500">
                          {b.costGold > 0 && `🪙${b.costGold}`}
                          {b.costMaterial > 0 && ` 🪵${b.costMaterial}`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 인사 탭 */}
        {tab === 'personnel' && (
          <div className="space-y-2">
            <button
              onClick={onToggleAutoAssign}
              className={`w-full py-2 rounded text-xs font-bold transition-colors ${
                autoAssign
                  ? 'bg-amber-700/50 text-amber-200 hover:bg-amber-700/70'
                  : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
              }`}
            >
              {autoAssign ? '⚡ 자동 내정 ON' : '💤 자동 내정 OFF'}
            </button>
            <button
              onClick={onRecruit}
              className="w-full py-2 bg-stone-700 rounded text-xs text-stone-300 hover:bg-stone-600"
            >
              🔍 인재 탐색
            </button>
            {selectedChar && selectedPlacement?.task === 'idle' && (
              <div className="space-y-1">
                <button onClick={onPatrol} className="w-full py-1.5 text-xs text-stone-400 bg-stone-700 rounded hover:bg-stone-600">
                  👁️ 순찰
                </button>
                {hasTrainingGround && (
                  <button onClick={onTrain} className="w-full py-1.5 text-xs text-stone-400 bg-stone-700 rounded hover:bg-stone-600">
                    🎯 훈련
                  </button>
                )}
                <p className="text-[10px] text-stone-600">건물 타일을 우클릭하면 근무 배치 가능</p>
              </div>
            )}
            {selectedChar && (
              <div className="space-y-1 border-t border-stone-700 pt-2">
                <div className="flex items-center gap-1 text-[10px] text-stone-500 mb-1">
                  <span>충성: {selectedChar.loyaltyValue}</span>
                  <span>·</span>
                  <span>사기: {selectedChar.morale}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={onReward}
                    disabled={playerFaction.resources.gold < 50}
                    className="flex-1 py-1.5 text-xs bg-stone-700 rounded text-amber-300 hover:bg-stone-600 disabled:opacity-30"
                  >
                    🪙 포상 (50)
                  </button>
                  <button
                    onClick={onPunish}
                    className="flex-1 py-1.5 text-xs bg-stone-700 rounded text-red-300 hover:bg-stone-600"
                  >
                    ⚡ 처벌
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 군사 탭 */}
        {tab === 'military' && (
          <div className="space-y-1">
            {neighbors.map(n => (
              <div key={n.id} className="flex items-center justify-between py-1 text-xs">
                <span className="text-stone-300">{n.name}</span>
                {n.owner ? (
                  n.owner.id !== state.playerFactionId ? (
                    <button
                      onClick={() => onAttack(n.id)}
                      className="px-2 py-1 bg-red-900/80 rounded text-red-200 hover:bg-red-800 font-bold text-[10px]"
                    >
                      ⚔️ 침공
                    </button>
                  ) : (
                    <span className="text-stone-600 text-[10px]">아군</span>
                  )
                ) : (
                  <button
                    onClick={() => onClaim(n.id)}
                    className="px-2 py-1 bg-green-900/80 rounded text-green-200 hover:bg-green-800 text-[10px]"
                  >
                    🏴 점령
                  </button>
                )}
              </div>
            ))}
            {neighbors.length === 0 && (
              <p className="text-[10px] text-stone-500">인접 영토 없음</p>
            )}
          </div>
        )}

        {/* 외교 탭 */}
        {tab === 'diplomacy' && (
          <div className="space-y-2">
            {state.factions.filter(f => f.id !== state.playerFactionId && f.territories.length > 0).map(f => {
              const relation = getRelation(state, f.id)
              const allied = isAllied(state, f.id)
              const ourPower = playerFaction.members.reduce((s, m) => s + m.totalScore, 0)
              const theirPower = f.members.reduce((s, m) => s + m.totalScore, 0)
              const canSurrender = theirPower <= ourPower * 0.3

              return (
                <div key={f.id} className="p-2 bg-stone-900 rounded space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                    <span className="flex-1 text-xs text-stone-200 truncate font-bold">{f.name.replace('의 세력', '')}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      allied ? 'bg-green-900/50 text-green-300' :
                      relation > 0 ? 'text-blue-400' :
                      relation < -30 ? 'text-red-400' : 'text-stone-500'
                    }`}>
                      {allied ? '동맹' : relation > 0 ? `우호 ${relation}` : relation < 0 ? `적대 ${relation}` : '중립'}
                    </span>
                  </div>
                  <div className="text-[9px] text-stone-500 flex gap-2">
                    <span>{f.members.length}명</span>
                    <span>{f.territories.length}영토</span>
                  </div>
                  <div className="flex gap-1">
                    {!allied && (
                      <button
                        onClick={() => onDiplomacy('alliance', f.id)}
                        disabled={playerFaction.resources.gold < 200}
                        className="flex-1 py-1 text-[10px] bg-stone-700 rounded text-blue-300 hover:bg-stone-600 disabled:opacity-30"
                      >
                        🤝 동맹 (200)
                      </button>
                    )}
                    <button
                      onClick={() => onDiplomacy('ceasefire', f.id)}
                      disabled={playerFaction.resources.gold < 100}
                      className="flex-1 py-1 text-[10px] bg-stone-700 rounded text-stone-300 hover:bg-stone-600 disabled:opacity-30"
                    >
                      🕊️ 정전 (100)
                    </button>
                    <button
                      onClick={() => onDiplomacy('tribute', f.id)}
                      disabled={playerFaction.resources.gold < 100}
                      className="flex-1 py-1 text-[10px] bg-stone-700 rounded text-amber-300 hover:bg-stone-600 disabled:opacity-30"
                    >
                      💰 조공
                    </button>
                    {canSurrender && (
                      <button
                        onClick={() => onDiplomacy('surrender', f.id)}
                        className="flex-1 py-1 text-[10px] bg-red-900/50 rounded text-red-300 hover:bg-red-800/50"
                      >
                        🏳️ 항복
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {state.factions.filter(f => f.id !== state.playerFactionId && f.territories.length > 0).length === 0 && (
              <p className="text-[10px] text-stone-500">다른 세력 없음</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function taskLabel(task: string): string {
  const labels: Record<string, string> = {
    idle: '대기', moving: '이동 중', building: '건설 중', working: '근무 중', training: '훈련 중', patrolling: '순찰 중',
  }
  return labels[task] ?? task
}

function getNeighborInfo(state: GameState, territoryId: TerritoryId) {
  const def = TERRITORIES.find(t => t.id === territoryId)
  if (!def) return []
  return def.neighbors.map(nId => {
    const owner = state.factions.find(f => f.territories.some(t => t.id === nId))
    return { id: nId as TerritoryId, name: TERRITORIES.find(t => t.id === nId)?.name ?? nId, owner }
  })
}

