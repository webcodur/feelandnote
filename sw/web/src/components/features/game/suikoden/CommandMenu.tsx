'use client'

import { useState } from 'react'
import type { GameState, TerritoryId, TaxRate } from '@/lib/game/suikoden/types'
import { BUILDINGS, BUILDING_CATEGORY, BUILDING_CATEGORY_INFO, WANDERING_MAX_COMPANIONS } from '@/lib/game/suikoden/constants'
import { getRelation, isAllied } from '@/lib/game/suikoden/diplomacy'
import { getActiveNeighborInfo, getTotalPower } from '@/lib/game/suikoden/utils'
import CharacterPortrait from './CharacterPortrait'

interface Props {
  state: GameState
  selectedCharId: string | null
  viewingTerritoryId: TerritoryId
  onIdle: () => void
  onRecruit: () => void
  onTrain: () => void
  onReward: () => void
  onPunish: () => void
  onAttack: (targetTerritoryId: TerritoryId) => void
  onClaim: (territoryId: TerritoryId) => void
  onDiplomacy: (action: string, targetFactionId: string) => void
  onSetTaxRate: (rate: TaxRate) => void
  autoAssign: boolean
  onToggleAutoAssign: () => void
  onAbandon: () => void
}

type Tab = 'develop' | 'personnel' | 'military' | 'diplomacy' | 'etc'

export default function CommandMenu({
  state, selectedCharId, viewingTerritoryId,
  onIdle, onRecruit, onTrain, onReward, onPunish,
  onAttack, onClaim, onDiplomacy, onSetTaxRate,
  autoAssign, onToggleAutoAssign, onAbandon,
}: Props) {
  const [tab, setTab] = useState<Tab>('develop')

  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!
  const territory = playerFaction.territories.find(t => t.id === viewingTerritoryId)
  const selectedChar = selectedCharId ? playerFaction.members.find(m => m.id === selectedCharId) : null
  const selectedPlacement = selectedCharId ? state.placements.find(p => p.characterId === selectedCharId) : null
  const hasTrainingGround = territory?.buildingCards.some(c => c.defId === 'training' && !c.isConstructing) ?? false

  const [confirmAbandon, setConfirmAbandon] = useState(false)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'develop', label: '개발' },
    { id: 'personnel', label: '인사' },
    { id: 'military', label: '군사' },
    { id: 'diplomacy', label: '외교' },
    { id: 'etc', label: '기타' },
  ]

  const neighbors = territory ? getActiveNeighborInfo(state, territory.id) : []

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
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-3">
        {/* 선택 캐릭터 상태 — 항상 표시 */}
        <div className="mb-3 p-2 bg-stone-900 rounded flex items-center gap-2 min-h-[44px]">
          {selectedChar && selectedPlacement ? (
            <>
              <CharacterPortrait character={selectedChar} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-stone-200 truncate">{selectedChar.nickname}</div>
                <div className="text-[10px] text-stone-500">
                  {taskLabel(selectedPlacement.task)}
                </div>
              </div>
              {selectedPlacement.task !== 'idle' && (
                <button onClick={onIdle} className="px-2 py-1 text-[10px] bg-stone-700 rounded text-stone-400 hover:bg-stone-600">
                  중지
                </button>
              )}
            </>
          ) : (
            <p className="text-[10px] text-stone-600 w-full text-center">인물을 선택하라</p>
          )}
        </div>

        {/* 개발 탭 */}
        {tab === 'develop' && (
          <div className="space-y-2 min-h-[240px]">
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
              건물 그리드에서 + 버튼으로 건설한다. 인물을 선택한 뒤 건물 카드에서 배치/해제한다.
            </p>

            {/* 건물 현황 요약 */}
            {territory && (
              <div className="space-y-0.5">
                {Object.entries(BUILDING_CATEGORY_INFO).map(([catId, catInfo]) => {
                  const catCards = territory.buildingCards.filter(c => BUILDING_CATEGORY[c.defId] === catId)
                  if (catCards.length === 0) return null
                  return (
                    <div key={catId} className="flex items-center gap-2 text-[10px]">
                      <span style={{ color: catInfo.color }}>{catInfo.icon} {catInfo.name}</span>
                      <span className="text-stone-500">{catCards.length}동</span>
                      <span className="text-stone-600">
                        ({catCards.filter(c => c.isConstructing).length} 건설 중)
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 인사 탭 */}
        {tab === 'personnel' && (
          <div className="space-y-2 min-h-[240px]">
            <button
              onClick={onToggleAutoAssign}
              className={`w-full py-2 rounded text-xs font-bold transition-colors ${
                autoAssign
                  ? 'bg-amber-700/50 text-amber-200 hover:bg-amber-700/70'
                  : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
              }`}
            >
              {autoAssign ? '자동 내정 ON' : '자동 내정 OFF'}
            </button>
            <button
              onClick={onRecruit}
              className="w-full py-2 bg-stone-700 rounded text-xs text-stone-300 hover:bg-stone-600"
            >
              인재 탐색
            </button>
            {selectedChar && selectedPlacement?.task === 'idle' && (
              <div className="space-y-1">
                {hasTrainingGround && (
                  <button onClick={onTrain} className="w-full py-1.5 text-xs text-stone-400 bg-stone-700 rounded hover:bg-stone-600">
                    훈련
                  </button>
                )}
                <p className="text-[10px] text-stone-600">건물 그리드에서 직접 배치 가능</p>
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
                    포상 (금50)
                  </button>
                  <button
                    onClick={onPunish}
                    className="flex-1 py-1.5 text-xs bg-stone-700 rounded text-red-300 hover:bg-stone-600"
                  >
                    처벌
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 군사 탭 */}
        {tab === 'military' && (
          <div className="space-y-1 min-h-[240px]">
            {neighbors.map(n => (
              <div key={n.id} className="flex items-center justify-between py-1 text-xs">
                <span className="text-stone-300">{n.name}</span>
                {n.owner ? (
                  n.owner.id !== state.playerFactionId ? (
                    <button
                      onClick={() => onAttack(n.id)}
                      className="px-2 py-1 bg-red-900/80 rounded text-red-200 hover:bg-red-800 font-bold text-[10px]"
                    >
                      침공
                    </button>
                  ) : (
                    <span className="text-stone-600 text-[10px]">아군</span>
                  )
                ) : (
                  <button
                    onClick={() => onClaim(n.id)}
                    className="px-2 py-1 bg-green-900/80 rounded text-green-200 hover:bg-green-800 text-[10px]"
                  >
                    점령
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
          <div className="space-y-2 min-h-[240px]">
            {state.factions.filter(f => f.id !== state.playerFactionId && f.territories.length > 0).map(f => {
              const relation = getRelation(state, f.id)
              const allied = isAllied(state, f.id)
              const ourPower = getTotalPower(playerFaction)
              const theirPower = getTotalPower(f)
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
                        동맹 (금200)
                      </button>
                    )}
                    <button
                      onClick={() => onDiplomacy('ceasefire', f.id)}
                      disabled={playerFaction.resources.gold < 100}
                      className="flex-1 py-1 text-[10px] bg-stone-700 rounded text-stone-300 hover:bg-stone-600 disabled:opacity-30"
                    >
                      정전 (금100)
                    </button>
                    <button
                      onClick={() => onDiplomacy('tribute', f.id)}
                      disabled={playerFaction.resources.gold < 100}
                      className="flex-1 py-1 text-[10px] bg-stone-700 rounded text-amber-300 hover:bg-stone-600 disabled:opacity-30"
                    >
                      조공
                    </button>
                    {canSurrender && (
                      <button
                        onClick={() => onDiplomacy('surrender', f.id)}
                        className="flex-1 py-1 text-[10px] bg-red-900/50 rounded text-red-300 hover:bg-red-800/50"
                      >
                        항복
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

        {/* 기타 탭 */}
        {tab === 'etc' && (
          <div className="space-y-3 min-h-[240px]">
            <div className="border border-red-900/40 rounded p-3 bg-red-950/10">
              <p className="text-[10px] text-stone-400 mb-2">
                세력을 해산하고 다시 방랑길에 오른다. 동료 최대 {WANDERING_MAX_COMPANIONS}명, 금 최대 200만 가져갈 수 있다.
              </p>
              {!confirmAbandon ? (
                <button
                  onClick={() => setConfirmAbandon(true)}
                  className="w-full py-2 bg-stone-700 rounded text-xs text-red-300 hover:bg-stone-600 transition-colors"
                >
                  거병 포기 — 방랑 복귀
                </button>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] text-red-400 font-bold text-center">정말 세력을 해산하겠는가?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onAbandon(); setConfirmAbandon(false) }}
                      className="flex-1 py-2 bg-red-900/60 rounded text-xs text-red-200 hover:bg-red-800 font-bold transition-colors"
                    >
                      해산한다
                    </button>
                    <button
                      onClick={() => setConfirmAbandon(false)}
                      className="flex-1 py-2 bg-stone-700 rounded text-xs text-stone-400 hover:bg-stone-600 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function taskLabel(task: string): string {
  const labels: Record<string, string> = {
    idle: '대기', building: '건설 중', working: '근무 중', training: '훈련 중',
  }
  return labels[task] ?? task
}

