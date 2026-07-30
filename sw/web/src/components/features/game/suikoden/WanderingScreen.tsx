'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
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
  const tS = useTranslations('rest.arena.suikoden')
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
    ? { guest: tS('wander.tagVisit'), bandit_win: tS('wander.tagRepel'), bandit_lose: tS('wander.tagRaid'), villager_aid: tS('wander.tagSupport'), scenery: tS('wander.tagScenery'), rumor: tS('wander.tagRumor') }[event.type]
    : null

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button onClick={() => setSelectedCharId(wandering.leader.id)} className="shrink-0">
            <CharacterPortrait character={wandering.leader} size={48} />
          </button>
          <div className="min-w-0 flex-1 basis-[calc(100%-3.75rem)] sm:basis-auto">
            <h2 className="break-words text-lg font-bold text-stone-100">
              {tS('wander.title', { name: wandering.leader.nickname })}
            </h2>
            <p className="break-words text-xs text-text-secondary">
              {isTraveling
                ? tS('wander.moveTo', { from: currentRegion ? tS(`region.${currentRegion.id}`) : '', to: travelTargetRegion ? tS(`region.${travelTargetRegion.id}`) : '' })
                : currentRegion ? tS(`region.${currentRegion.id}`) : ''
              } · {tS('wander.dayCount', { day: wandering.turnsWandered })} · {tS('wander.gold', { amount: wandering.gold })}
            </p>
          </div>
          <div className="ml-auto shrink-0 text-right sm:ml-0">
            <div className="text-xs text-text-secondary">{tS('wander.companions')}</div>
            <div className="text-sm font-bold text-amber-300">
              {wandering.companions.length}/{WANDERING_MAX_COMPANIONS}
            </div>
          </div>
          {inspectTerritoryId && (
            <button
              onClick={() => setInspectTerritoryId(null)}
              className="w-full break-words rounded bg-amber-700/50 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-700 sm:ml-2 sm:w-auto"
            >
              {tS('wander.backToMain')}
            </button>
          )}
        </div>

        {/* 이동 프로그레스바 — 항상 표시 */}
        <div className="mt-3">
          {isTraveling ? (
            <>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 text-[10px] text-text-secondary">
                <span>{tS('wander.moveTo', { from: currentRegion ? tS(`region.${currentRegion.id}`) : '', to: travelTargetRegion ? tS(`region.${travelTargetRegion.id}`) : '' })}</span>
                <span>{tS('wander.travelDays', { current: wandering.travelProgress, total: wandering.travelDuration })}</span>
              </div>
              <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-[width]"
                  style={{ width: `${(wandering.travelProgress / wandering.travelDuration) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden" />
              <p className="text-[10px] text-text-secondary opacity-40 mt-1">{tS('wander.movePrompt')}</p>
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
                        className={`flex flex-col items-center gap-0.5 min-w-[52px] rounded p-1 ${selectedCharId === char.id ? 'bg-amber-900/40 ring-1 ring-amber-500/50' : 'hover:bg-stone-700/50'}`}
                      >
                        <CharacterPortrait character={char} size={32} />
                        <span className="text-[10px] text-text-primary truncate max-w-[52px]">{char.nickname}</span>
                        <span className="text-[9px] font-bold" style={{ color: GRADE_COLORS[char.grade] }}>
                          {CLASS_INFO[char.unitClass].icon} {char.grade}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-text-secondary text-center py-1">{tS('wander.noCompanions')}</p>
                )}
              </div>

              {/* 이벤트 카드 */}
              <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-5 min-h-[180px] flex flex-col">
                {event ? (
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-3xl">{eventIcon}</span>
                    <div className="flex-1 space-y-3">
                      <p className="text-sm text-text-primary leading-relaxed">{event.description}</p>

                      {/* 객장 방문 — 인물 상세 + 수락/거절 */}
                      {event.type === 'guest' && event.character && (
                        <div className="bg-stone-900/60 rounded-lg border border-stone-700">
                          <CharacterInfoPanel
                            character={event.character}
                            footer={
                              <div className="px-3 pb-3">
                                {!event.resolved ? (
                                  <div className="flex flex-col gap-2 sm:flex-row">
                                    <button
                                      onClick={handleAttemptRecruit}
                                      disabled={wandering.companions.length >= WANDERING_MAX_COMPANIONS}
                                      className="min-w-0 flex-1 break-words whitespace-normal py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-text-secondary text-stone-100 text-sm font-bold rounded"
                                    >
                                      {tS('wander.tryRecruit')}
                                    </button>
                                    <button
                                      onClick={handleDismiss}
                                      className="min-w-0 flex-1 break-words whitespace-normal py-2 bg-stone-700 hover:bg-stone-600 text-text-primary text-sm rounded"
                                    >
                                      {tS('wander.passBy')}
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-text-secondary text-center">
                                    {wandering.companions.some(c => c.id === event.character?.id)
                                      ? tS('wander.recruitSuccess')
                                      : event.recruitAttempted
                                        ? tS('wander.recruitFail')
                                        : tS('wander.departed')}
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
                          {tS('wander.goldDelta', { delta: `${event.goldDelta > 0 ? '+' : ''}${event.goldDelta}` })}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
                    {tS('wander.continueJourney')}
                  </div>
                )}
              </div>

              {/* 행동 버튼 — 항상 표시 */}
              <div className="space-y-2">
                <button
                  onClick={handleNextDay}
                  disabled={hasPendingGuest}
                  className="w-full break-words whitespace-normal py-3 bg-stone-700 hover:bg-stone-600 disabled:opacity-40 disabled:cursor-not-allowed text-text-primary font-bold rounded-lg text-sm"
                >
                  {hasPendingGuest
                    ? tS('wander.handleVisitorFirst')
                    : isTraveling ? `${tS('wander.nextDay')} (${wandering.travelProgress}/${wandering.travelDuration})` : tS('wander.nextDay')}
                </button>

                {/* 거병 패널 — 항상 표시 */}
                {(() => {
                  const disabled = isTraveling || emptyTerritories.length === 0 || hasPendingGuest
                  const reason = isTraveling ? tS('wander.travelingTo', { region: '' }) : emptyTerritories.length === 0 ? '' : hasPendingGuest ? tS('wander.handleVisitorFirst') : null
                  return (
                    <div className={`border rounded-lg p-3 ${disabled ? 'border-stone-700 bg-stone-800/30 opacity-40' : 'border-red-900/50 bg-red-950/20'}`}>
                      {disabled ? (
                        <p className="text-xs text-text-secondary text-center">{reason ? `${tS('wander.raiseArmyDisabled')} — ${reason}` : tS('wander.raiseArmyDisabled')}</p>
                      ) : (
                        <>
                          <p className="text-xs text-text-secondary mb-2">{tS('wander.raiseArmyPrompt')}</p>
                          <div className="flex flex-wrap gap-2">
                            {emptyTerritories.map(t => (
                              <button
                                key={t.id}
                                onClick={() => handleRaiseArmy(t.id)}
                                className="max-w-full break-words whitespace-normal px-4 py-2 bg-red-900/40 border border-red-800/60 rounded hover:bg-red-800/60 hover:border-red-600 text-sm text-text-primary"
                              >
                                {tS('wander.raiseArmy', { territory: tS(`territory.${t.id}`) })}
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
                <h3 className="text-xs font-bold text-text-secondary mb-2">{tS('wander.journalTitle')}</h3>
                {wandering.eventLog.length > 0 ? (
                  <div className="space-y-0.5 max-h-28 overflow-y-auto text-[11px] text-text-secondary">
                    {wandering.eventLog.slice().reverse().map((msg, i) => (
                      <p key={i}>· {msg}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-stone-700 text-center">{tS('wander.journalEmpty')}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* 우측: 지역 맵 */}
        <div className="space-y-4">
          <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-2.5">
            {/* 탭 헤더 */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-text-primary mr-auto">
                {isTraveling ? tS('wander.travelingTo', { region: travelTargetRegion ? tS(`region.${travelTargetRegion.id}`) : '' }) : tS('wander.regionMove')}
              </span>
              <div className="flex bg-stone-900/80 rounded p-0.5 gap-0.5">
                <button
                  onClick={() => setMapMode('globe')}
                  className={`px-2 py-0.5 text-[10px] rounded ${
                    mapMode === 'globe'
                      ? 'bg-stone-700 text-text-primary font-bold'
                      : 'text-text-secondary hover:text-text-secondary'
                  }`}
                >
                  {tS('wander.globe3d')}
                </button>
                <button
                  onClick={() => setMapMode('text')}
                  className={`px-2 py-0.5 text-[10px] rounded ${
                    mapMode === 'text'
                      ? 'bg-stone-700 text-text-primary font-bold'
                      : 'text-text-secondary hover:text-text-secondary'
                  }`}
                >
                  {tS('wander.textMap')}
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
                <p className="text-xs text-text-primary">
                  {tS('wander.moveConfirm', { name: tS(`region.${confirmTargetRegion.id}`) })} ({wandering.travelDuration || 20})
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={handleConfirmMove}
                    className="min-w-0 flex-1 break-words whitespace-normal py-2 bg-amber-700 hover:bg-amber-600 text-stone-100 text-sm font-bold rounded"
                  >
                    {tS('wander.depart')}
                  </button>
                  <button
                    onClick={() => setConfirmMoveTarget(null)}
                    className="min-w-0 flex-1 break-words whitespace-normal py-2 bg-stone-700 hover:bg-stone-600 text-text-primary text-sm rounded"
                  >
                    {tS('wander.cancel')}
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
                  badge={isLeader ? tS('wander.lordBadge') : undefined}
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
  const tS = useTranslations('rest.arena.suikoden')
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
          className="w-full break-words whitespace-normal py-3 bg-red-900/50 border border-red-700 rounded-lg hover:bg-red-800/60 hover:border-red-500 text-sm text-stone-100 font-bold"
        >
          {tS('wander.raiseHere')}
        </button>
      )}
    </div>
  )
}
