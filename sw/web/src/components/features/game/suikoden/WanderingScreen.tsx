'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import type { GameState, RegionId, TerritoryId, Territory, TaxRate, DialogEntry } from '@/lib/game/suikoden/types'
import { REGIONS, TERRITORIES, GRADE_COLORS, CLASS_INFO, WANDERING_MAX_COMPANIONS } from '@/lib/game/suikoden/constants'
import { getTerritoryDef } from '@/lib/game/suikoden/utils'
import { generateWanderingEvent, attemptRecruitGuest, dismissGuest, raiseArmy, moveToRegion } from '@/lib/game/suikoden/engine'
import { generateDialog } from '@/lib/game/suikoden/dialog'
import CharacterPortrait from './CharacterPortrait'
import CharacterInfoPanel from './CharacterInfoPanel'
import BuildingCardGrid from './BuildingCardGrid'
import WorldMapView from './WorldMapView'
import TextMapView from './TextMapView'

/** characterId → celeb_dialogues.lines */
type DialoguesMap = Record<string, Record<string, string[]>>

interface Props {
  state: GameState
  onUpdateState: (fn: (s: GameState) => GameState) => void
  onDialog?: (entry: DialogEntry) => void
  onClearDialogs?: () => void
  dialogues?: DialoguesMap
}

export default function WanderingScreen({ state, onUpdateState, onDialog, onClearDialogs, dialogues }: Props) {
  const wandering = state.wandering

  // ── hooks (early return 전에 모두 선언) ──
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [confirmMoveTarget, setConfirmMoveTarget] = useState<RegionId | null>(null)
  const [inspectTerritoryId, setInspectTerritoryId] = useState<TerritoryId | null>(null)
  const [focusKey, setFocusKey] = useState(0)
  const [mapMode, setMapMode] = useState<'globe' | 'text'>('globe')
  const lastGuestKeyRef = useRef<string | null>(null)

  const emptyTerritories = useMemo(() => {
    if (!wandering) return []
    const occupiedIds = new Set(state.factions.flatMap(f => f.territories.map(t => t.id)))
    const activeSet = state.activeTerritoryIds.length > 0 ? new Set(state.activeTerritoryIds) : null
    return TERRITORIES.filter(t =>
      t.regionId === wandering.currentRegionId && !occupiedIds.has(t.id)
      && (!activeSet || activeSet.has(t.id))
    )
  }, [state.factions, wandering?.currentRegionId, wandering, state.activeTerritoryIds])

  const event = wandering?.currentEvent ?? null

  // 등용 시도/지나침 대화: 리더 → 상대 순서로 큐잉
  useEffect(() => {
    if (!wandering || !onDialog) return
    if (!event || event.type !== 'guest' || !event.character || !event.resolved) return
    const char = event.character
    const key = `${char.id}_${wandering.turnsWandered}_${event.recruitAttempted ? 'recruit' : 'dismiss'}`
    if (lastGuestKeyRef.current === key) return
    lastGuestKeyRef.current = key

    if (event.recruitAttempted) {
      // 리더: "함께하지 않겠는가"
      onDialog(generateDialog('recruit_ask', wandering.leader, dialogues?.[wandering.leader.id]))
      const joined = wandering.companions.some(c => c.id === char.id)
      if (joined) {
        // 상대: 수락 대사
        onDialog(generateDialog('join_accept', char, dialogues?.[char.id]))
      } else {
        // 상대: 거절 대사
        onDialog(generateDialog('join_refuse', char, dialogues?.[char.id]))
      }
    } else {
      // 지나침: 인물 서운한 반응 → 작별 대사
      onDialog(generateDialog('join_rejected', char, dialogues?.[char.id]))
      onDialog(generateDialog('farewell', char, dialogues?.[char.id]))
    }
  }, [event, wandering?.turnsWandered, wandering, onDialog])

  if (!wandering) return null

  // ── derived state ──
  const currentRegion = REGIONS.find(r => r.id === wandering.currentRegionId)
  const hasPendingGuest = event?.type === 'guest' && !event.resolved
  const isTraveling = wandering.travelTarget != null
  const travelTargetRegion = isTraveling ? REGIONS.find(r => r.id === wandering.travelTarget) : null
  const confirmTargetRegion = confirmMoveTarget ? REGIONS.find(r => r.id === confirmMoveTarget) : null

  const handleNextDay = () => {
    onClearDialogs?.()
    onUpdateState(s => generateWanderingEvent(s))
  }
  const handleAttemptRecruit = () => {
    onClearDialogs?.()
    onUpdateState(s => attemptRecruitGuest(s))
    // 대화는 useEffect에서 resolved 감지 후 생성
  }
  const handleDismiss = () => {
    onClearDialogs?.()
    onUpdateState(s => dismissGuest(s))
    // 대화는 useEffect에서 resolved 감지 후 생성
  }
  const handleConfirmMove = () => {
    if (!confirmMoveTarget) return
    onUpdateState(s => moveToRegion(s, confirmMoveTarget))
    setConfirmMoveTarget(null)
  }
  const handleRaiseArmy = (tid: TerritoryId) => onUpdateState(s => raiseArmy(s, tid))

  // 이벤트 아이콘
  const eventIcon = event
    ? { guest: '[방문]', bandit_win: '[격퇴]', bandit_lose: '[습격]', villager_aid: '[지원]', scenery: '[풍경]', rumor: '[소문]' }[event.type]
    : null

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedCharId(wandering.leader.id)} className="shrink-0">
            <CharacterPortrait character={wandering.leader} size={48} />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-stone-100">
              {wandering.leader.nickname}의 방랑
            </h2>
            <p className="text-xs text-stone-400">
              {isTraveling
                ? `${currentRegion?.name} → ${travelTargetRegion?.name} 이동 중`
                : currentRegion?.name ?? '미지'
              } · {wandering.turnsWandered}일차 · 금 {wandering.gold}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500">동료</div>
            <div className="text-sm font-bold text-amber-300">
              {wandering.companions.length}/{WANDERING_MAX_COMPANIONS}
            </div>
          </div>
          {inspectTerritoryId && (
            <button
              onClick={() => setInspectTerritoryId(null)}
              className="ml-2 px-3 py-1.5 bg-amber-700/50 hover:bg-amber-700 text-amber-200 text-xs font-bold rounded transition-colors"
            >
              본화면으로
            </button>
          )}
        </div>

        {/* 이동 프로그레스바 — 항상 표시 */}
        <div className="mt-3">
          {isTraveling ? (
            <>
              <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
                <span>이동: {currentRegion?.name} → {travelTargetRegion?.name}</span>
                <span>{wandering.travelProgress}/{wandering.travelDuration}일</span>
              </div>
              <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${(wandering.travelProgress / wandering.travelDuration) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden" />
              <p className="text-[10px] text-stone-600 opacity-40 mt-1">이동하려면 지역을 선택하라</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 좌측: 이벤트 + 행동 OR 천리안 뷰 */}
        <div className="lg:col-span-2 space-y-4">
          {inspectTerritoryId ? (
            <TerritoryInspectView
              state={state}
              territoryId={inspectTerritoryId}
              wanderingRegionId={wandering.currentRegionId}
              canRaiseArmy={!isTraveling && !hasPendingGuest}
              onRaiseArmy={handleRaiseArmy}
            />
          ) : (
            <>
              {/* 동료 목록 (가로) — 항상 표시 */}
              <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-3">
                {wandering.companions.length > 0 ? (
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {wandering.companions.map(char => (
                      <button
                        key={char.id}
                        onClick={() => setSelectedCharId(char.id)}
                        className={`flex flex-col items-center gap-0.5 min-w-[52px] rounded p-1 transition-colors ${selectedCharId === char.id ? 'bg-amber-900/40 ring-1 ring-amber-500/50' : 'hover:bg-stone-700/50'}`}
                      >
                        <CharacterPortrait character={char} size={32} />
                        <span className="text-[10px] text-stone-300 truncate max-w-[52px]">{char.nickname}</span>
                        <span className="text-[9px] font-bold" style={{ color: GRADE_COLORS[char.grade] }}>
                          {CLASS_INFO[char.unitClass].icon} {char.grade}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-stone-600 text-center py-1">아직 동료가 없다</p>
                )}
              </div>

              {/* 이벤트 카드 */}
              <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-5 min-h-[180px] flex flex-col">
                {event ? (
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-3xl">{eventIcon}</span>
                    <div className="flex-1 space-y-3">
                      <p className="text-sm text-stone-200 leading-relaxed">{event.description}</p>

                      {/* 객장 방문 — 인물 상세 + 수락/거절 */}
                      {event.type === 'guest' && event.character && (
                        <div className="bg-stone-900/60 rounded-lg border border-stone-700">
                          <CharacterInfoPanel
                            character={event.character}
                            footer={
                              <div className="px-3 pb-3">
                                {!event.resolved ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleAttemptRecruit}
                                      disabled={wandering.companions.length >= WANDERING_MAX_COMPANIONS}
                                      className="flex-1 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-500 text-stone-100 text-sm font-bold rounded transition-colors"
                                    >
                                      등용 시도
                                    </button>
                                    <button
                                      onClick={handleDismiss}
                                      className="flex-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm rounded transition-colors"
                                    >
                                      지나친다
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-stone-500 text-center">
                                    {wandering.companions.some(c => c.id === event.character?.id)
                                      ? '동료가 되었다.'
                                      : event.recruitAttempted
                                        ? '등용에 실패했다.'
                                        : '헤어졌다.'}
                                  </p>
                                )}
                              </div>
                            }
                          />
                        </div>
                      )}

                      {/* 금화 변동 표시 */}
                      {event.goldDelta != null && event.goldDelta !== 0 && (
                        <p className={`text-xs font-bold ${event.goldDelta > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                          금 {event.goldDelta > 0 ? '+' : ''}{event.goldDelta}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-stone-600 text-sm">
                    다음 날로 진행하여 여정을 이어가라.
                  </div>
                )}
              </div>

              {/* 행동 버튼 — 항상 표시 */}
              <div className="space-y-2">
                <button
                  onClick={handleNextDay}
                  disabled={hasPendingGuest}
                  className="w-full py-3 bg-stone-700 hover:bg-stone-600 disabled:opacity-40 disabled:cursor-not-allowed text-stone-200 font-bold rounded-lg transition-colors text-sm"
                >
                  {hasPendingGuest
                    ? '객장 응답을 먼저 처리하라'
                    : isTraveling ? `다음 날 → (이동 ${wandering.travelProgress}/${wandering.travelDuration})` : '다음 날 →'}
                </button>

                {/* 거병 패널 — 항상 표시 */}
                {(() => {
                  const disabled = isTraveling || emptyTerritories.length === 0 || hasPendingGuest
                  const reason = isTraveling ? '이동 중' : emptyTerritories.length === 0 ? '빈 영토 없음' : hasPendingGuest ? '객장 응답 대기' : null
                  return (
                    <div className={`border rounded-lg p-3 ${disabled ? 'border-stone-700 bg-stone-800/30 opacity-40' : 'border-red-900/50 bg-red-950/20'}`}>
                      {disabled ? (
                        <p className="text-xs text-stone-600 text-center">{reason ? `거병 불가 — ${reason}` : '거병 불가'}</p>
                      ) : (
                        <>
                          <p className="text-xs text-stone-400 mb-2">이 지역의 빈 영토에 거병할 수 있다.</p>
                          <div className="flex flex-wrap gap-2">
                            {emptyTerritories.map(t => (
                              <button
                                key={t.id}
                                onClick={() => handleRaiseArmy(t.id)}
                                className="px-4 py-2 bg-red-900/40 border border-red-800/60 rounded hover:bg-red-800/60 hover:border-red-600 transition-colors text-sm text-stone-200"
                              >
                                거병: {t.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* 이벤트 로그 — 항상 표시 */}
              <div className="bg-stone-900/50 border border-stone-800 rounded-lg p-3">
                <h3 className="text-xs font-bold text-stone-500 mb-2">여정 기록</h3>
                {wandering.eventLog.length > 0 ? (
                  <div className="space-y-0.5 max-h-28 overflow-y-auto text-[11px] text-stone-600">
                    {wandering.eventLog.slice().reverse().map((msg, i) => (
                      <p key={i}>· {msg}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-stone-700 text-center">여정이 시작되지 않았다</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* 우측: 지역 맵 */}
        <div className="space-y-4">
          <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-2.5">
            {/* 탭 헤더 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-stone-300 mr-auto">
                {isTraveling ? `이동 중 — ${travelTargetRegion?.name}` : '지역 이동'}
              </span>
              <div className="flex bg-stone-900/80 rounded p-0.5 gap-0.5">
                <button
                  onClick={() => setMapMode('globe')}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                    mapMode === 'globe'
                      ? 'bg-stone-700 text-stone-200 font-bold'
                      : 'text-stone-500 hover:text-stone-400'
                  }`}
                >
                  3D 지구
                </button>
                <button
                  onClick={() => setMapMode('text')}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                    mapMode === 'text'
                      ? 'bg-stone-700 text-stone-200 font-bold'
                      : 'text-stone-500 hover:text-stone-400'
                  }`}
                >
                  텍스트
                </button>
              </div>
            </div>

            {mapMode === 'globe' ? (
              <WorldMapView
                state={state}
                selectedTerritoryId={inspectTerritoryId}
                focusTerritoryId={inspectTerritoryId}
                focusKey={focusKey}
                onSelectTerritory={(tid) => {
                  setInspectTerritoryId(tid)
                  setFocusKey(k => k + 1)
                }}
                onSelectRegion={(regionId) => {
                  const isNeighbor = currentRegion?.neighbors.includes(regionId)
                  const canMove = isNeighbor && !hasPendingGuest && !isTraveling
                  if (canMove) setConfirmMoveTarget(regionId)
                }}
                phase="wandering"
              />
            ) : (
              <TextMapView
                state={state}
                selectedTerritoryId={inspectTerritoryId}
                currentRegionId={wandering.currentRegionId}
                onSelectTerritory={(tid) => {
                  setInspectTerritoryId(tid)
                  setFocusKey(k => k + 1)
                }}
                onSelectRegion={(regionId) => {
                  const isNeighbor = currentRegion?.neighbors.includes(regionId)
                  const canMove = isNeighbor && !hasPendingGuest && !isTraveling
                  if (canMove) setConfirmMoveTarget(regionId)
                }}
                phase="wandering"
              />
            )}

            {/* 이동 확인 */}
            {confirmTargetRegion && (
              <div className="mt-3 p-3 border border-amber-500/30 rounded-lg bg-amber-900/10 space-y-2">
                <p className="text-xs text-stone-300">
                  <span className="text-amber-300 font-bold">{confirmTargetRegion.name}</span>(으)로 이동한다. ({wandering.travelDuration || 20}일 소요)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmMove}
                    className="flex-1 py-2 bg-amber-700 hover:bg-amber-600 text-stone-100 text-sm font-bold rounded transition-colors"
                  >
                    출발
                  </button>
                  <button
                    onClick={() => setConfirmMoveTarget(null)}
                    className="flex-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm rounded transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 인물 정보 패널 — 지도 아래 */}
          {(() => {
            const allChars = [wandering.leader, ...wandering.companions]
            const char = selectedCharId ? allChars.find(c => c.id === selectedCharId) : null
            if (!char) return null
            const isLeader = char.id === wandering.leader.id
            return (
              <div className="bg-stone-800 border border-stone-700 rounded-lg">
                <CharacterInfoPanel
                  character={char}
                  badge={isLeader ? '군주' : undefined}
                  onClose={() => setSelectedCharId(null)}
                />
              </div>
            )
          })()}
        </div>
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════
// 천리안 인라인 뷰 — BuildingCardGrid(readOnly) 재활용
// ═══════════════════════════════════════════════

function TerritoryInspectView({ state, territoryId, wanderingRegionId, canRaiseArmy, onRaiseArmy }: {
  state: GameState
  territoryId: TerritoryId
  wanderingRegionId: RegionId
  canRaiseArmy: boolean
  onRaiseArmy: (tid: TerritoryId) => void
}) {
  const tDef = getTerritoryDef(territoryId)!
  const owner = state.factions.find(f => f.territories.some(t => t.id === territoryId)) ?? null
  const territoryData = owner?.territories.find(t => t.id === territoryId) ?? null
  const isInCurrentRegion = tDef.regionId === wanderingRegionId

  // 무주지면 기본값 Territory 생성 (createTerritory 동일 스펙)
  const territory: Territory = territoryData ?? {
    id: territoryId,
    name: tDef.name,
    regionId: tDef.regionId,
    buildingCards: [],
    maxBuildings: 8,
    population: 1000,
    morale: 70,
    resources: { gold: 0, food: 0, knowledge: 0, material: 0, troops: 0, weapons: 0, horses: 0, ships: 0, charms: 0 },
    taxRate: 'normal' as TaxRate,
  }

  return (
    <div className="space-y-3">
      <BuildingCardGrid
        state={state}
        territory={territory}
        selectedCharId={null}
        onSelectChar={() => {}}
        onBuild={() => {}}
        onReassign={() => {}}
        onUnassign={() => {}}
        onDemolish={() => {}}
        onAssignRecruiter={() => {}}
        onCancelRecruiter={() => {}}
        onDispatch={() => {}}
        onRecall={() => {}}
        onToast={() => {}}
        readOnly
        factionOverrideId={owner?.id}
      />
      {/* 무주지 거병 버튼 */}
      {!owner && isInCurrentRegion && canRaiseArmy && (
        <button
          onClick={() => onRaiseArmy(territoryId)}
          className="w-full py-3 bg-red-900/50 border border-red-700 rounded-lg hover:bg-red-800/60 hover:border-red-500 transition-colors text-sm text-stone-100 font-bold"
        >
          이곳에서 거병
        </button>
      )}
    </div>
  )
}
