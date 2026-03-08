'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { GameState, TerritoryId, DialogEntry } from '@/lib/game/suikoden/types'
import { getTerritoryDef } from '@/lib/game/suikoden/utils'
import { initBattle, abandonFortress } from '@/lib/game/suikoden/engine'
import type { TaxRate } from '@/lib/game/suikoden/types'
import { advanceTurn, commandBuild, commandAssign, commandReassign, commandUnassign, commandIdle, commandTrain, commandReward, commandPunish, commandDemolish, commandSetTaxRate, commandAssignRecruiter, commandCancelRecruiter, commandDispatch, commandRecall } from '@/lib/game/suikoden/turnEngine'
import { commandAlliance, commandCeasefire, commandTribute, commandSurrender } from '@/lib/game/suikoden/diplomacy'
import { generateDialog } from '@/lib/game/suikoden/dialog'
import GameHUD from './GameHUD'
import GameToolbar from './GameToolbar'
import BuildingCardGrid from './BuildingCardGrid'
import WorldMapView from './WorldMapView'
import TextMapView from './TextMapView'
import CharacterInfoPanel from './CharacterInfoPanel'
import { getSuikodenText, stripSuikodenFactionSuffix, translateSuikodenMessage } from './i18n'

/** characterId → celeb_dialogues.lines */
type DialoguesMap = Record<string, Record<string, string[]>>

interface Props {
  state: GameState
  onUpdateState: (fn: (s: GameState) => GameState) => void
  onDialog?: (entry: DialogEntry) => void
  dialogues?: DialoguesMap
}

export default function StrategyScreen({ state, onUpdateState, onDialog, dialogues }: Props) {
  const locale = useLocale()
  const tS = useTranslations('rest.arena.suikoden')
  const text = getSuikodenText(locale)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [mapMode, setMapMode] = useState<'globe' | 'text'>('globe')
  const [toast, setToast] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(state.turnCount === 0)
  const [focusTarget, setFocusTarget] = useState<{ id: TerritoryId; key: number } | null>(null)
  const [mapOpen, setMapOpen] = useState(true)
  const [charPanelOpen, setCharPanelOpen] = useState(true)
  const [splash, setSplash] = useState<{ name: string; id: string } | null>(null)
  const [splashVisible, setSplashVisible] = useState(false)
  const focusKeyRef = useRef(0)

  const showToast = useCallback((msg: string) => {
    setToast(translateSuikodenMessage(msg, locale, {
      translateTerritory: (id) => tS(`territory.${id}`),
      translateRegion: (id) => tS(`region.${id}`),
    }))
    setTimeout(() => setToast(null), 2500)
  }, [locale, tS])

  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!
  // 모든 세력의 영토에서 조회 (적/무주지 포함)
  const allTerritories = state.factions.flatMap(f => f.territories)
  const viewingTerritory = allTerritories.find(t => t.id === state.viewingTerritoryId)
    ?? (() => {
      // 무주지: 기본 Territory 생성
      const tDef = state.viewingTerritoryId ? getTerritoryDef(state.viewingTerritoryId) : null
      if (tDef) return {
        id: tDef.id as TerritoryId,
        name: tDef.name,
        regionId: tDef.regionId,
        buildingCards: [],
        maxBuildings: 8,
        population: 0,
        morale: 0,
        resources: { gold: 0, food: 0, knowledge: 0, material: 0, troops: 0, weapons: 0, horses: 0, ships: 0, charms: 0 },
        taxRate: 'normal' as TaxRate,
      }
      return playerFaction.territories[0]
    })()
  const isViewingOwn = playerFaction.territories.some(t => t.id === viewingTerritory.id)

  // ── 다음 턴 ──
  const handleNextTurn = useCallback(() => {
    const prevSeason = state.season
    const prevVisitorIds = new Set(state.tavernVisitors.map(v => v.character.id))
    const next = advanceTurn(state)
    onUpdateState(() => next)
    // 계절 변경 시 대화 (updater 밖에서 호출)
    if (onDialog && next.season !== prevSeason) {
      const leader = playerFaction.members.find(m => m.id === playerFaction.leaderId)
      if (leader) onDialog(generateDialog('turn_start', leader, dialogues?.[leader.id]))
    }
    // 선술집 신규 방문자 대사
    if (onDialog) {
      for (const v of next.tavernVisitors) {
        if (!prevVisitorIds.has(v.character.id)) {
          onDialog(generateDialog('visitor_arrive', v.character, dialogues?.[v.character.id]))
        }
      }
    }
    // 건설 완료 감지
    if (onDialog) {
      for (const faction of next.factions) {
        if (faction.id !== next.playerFactionId) continue
        for (const territory of faction.territories) {
          for (const card of territory.buildingCards) {
            if (!card.isConstructing && card.constructionWorkerId) {
              const prevTerritory = state.factions
                .find(f => f.id === state.playerFactionId)?.territories
                .find(t => t.id === territory.id)
              const prevCard = prevTerritory?.buildingCards.find(c => c.instanceId === card.instanceId)
              if (prevCard?.isConstructing) {
                const worker = faction.members.find(m => m.id === card.constructionWorkerId)
                if (worker) onDialog(generateDialog('building_done', worker, dialogues?.[worker.id]))
              }
            }
          }
        }
      }
    }
  }, [state, onUpdateState, onDialog, playerFaction, dialogues])

  // ── 영토 전환 (적/무주지 포함) ──
  const handleSelectTerritory = useCallback((tId: TerritoryId) => {
    if (tId !== state.viewingTerritoryId) {
      const tDef = getTerritoryDef(tId)
      if (tDef) {
        setSplash({ name: tS(`territory.${tId}`), id: tId })
        // 다음 프레임에서 opacity를 1로 전환 → fade-in
        requestAnimationFrame(() => setSplashVisible(true))
        setTimeout(() => {
          setSplashVisible(false)
          // fade-out 완료 후 DOM 제거
          setTimeout(() => setSplash(null), 500)
        }, 1500)
      }
    }
    onUpdateState(s => ({ ...s, viewingTerritoryId: tId, selectedTerritoryId: tId }))
  }, [onUpdateState, state.viewingTerritoryId])

  // ── 건설 명령 ──
  const handleBuild = useCallback((buildingDefId: string) => {
    if (!selectedCharId || !viewingTerritory) return
    onUpdateState(s => commandBuild(s, selectedCharId, buildingDefId, viewingTerritory.id))
  }, [selectedCharId, viewingTerritory, onUpdateState])

  // ── 배치 명령 ──
  const handleAssign = useCallback((charId: string, buildingInstanceId: string) => {
    onUpdateState(s => commandAssign(s, charId, buildingInstanceId))
  }, [onUpdateState])

  // ── 재배치 명령 (기존 건물에서 해제 → 새 건물 배치를 원자적으로) ──
  const handleReassign = useCallback((charId: string, buildingInstanceId: string) => {
    onUpdateState(s => commandReassign(s, charId, buildingInstanceId))
  }, [onUpdateState])

  // ── 해제 명령 ──
  const handleUnassign = useCallback((charId: string) => {
    onUpdateState(s => commandUnassign(s, charId))
  }, [onUpdateState])

  // ── 자동 내정 토글 ──
  const handleToggleAutoAssign = useCallback(() => {
    onUpdateState(s => ({ ...s, autoAssign: !s.autoAssign }))
  }, [onUpdateState])

  // ── 대화 모드 토글 ──
  const handleToggleDialogMode = useCallback(() => {
    onUpdateState(s => ({
      ...s,
      settings: {
        ...s.settings,
        dialogMode: s.settings.dialogMode === 'auto' ? 'manual' : 'auto',
      },
    }))
  }, [onUpdateState])

  // ── 대기 명령 ──
  const handleIdle = useCallback(() => {
    if (!selectedCharId) return
    onUpdateState(s => commandIdle(s, selectedCharId))
  }, [selectedCharId, onUpdateState])

  // ── 훈련 명령 ──
  const handleTrain = useCallback(() => {
    if (!selectedCharId) return
    onUpdateState(s => commandTrain(s, selectedCharId))
  }, [selectedCharId, onUpdateState])

  // ── 포상 명령 ──
  const handleReward = useCallback(() => {
    if (!selectedCharId) return
    onUpdateState(s => commandReward(s, selectedCharId))
  }, [selectedCharId, onUpdateState])

  // ── 처벌 명령 ──
  const handlePunish = useCallback(() => {
    if (!selectedCharId) return
    onUpdateState(s => commandPunish(s, selectedCharId))
  }, [selectedCharId, onUpdateState])

  // ── 철거 명령 ──
  const handleDemolish = useCallback((buildingInstanceId: string) => {
    if (!viewingTerritory) return
    onUpdateState(s => commandDemolish(s, viewingTerritory.id, buildingInstanceId))
  }, [viewingTerritory, onUpdateState])

  // ── 세율 조정 ──
  const handleSetTaxRate = useCallback((rate: TaxRate) => {
    if (!viewingTerritory) return
    onUpdateState(s => commandSetTaxRate(s, viewingTerritory.id, rate))
  }, [viewingTerritory, onUpdateState])

  // ── 외교 명령 ──
  const handleDiplomacy = useCallback((action: string, targetFactionId: string) => {
    let result: { state: GameState; result: { success: boolean; message: string } }
    switch (action) {
      case 'alliance':
        result = commandAlliance(state, targetFactionId)
        break
      case 'ceasefire':
        result = commandCeasefire(state, targetFactionId)
        break
      case 'tribute':
        result = commandTribute(state, targetFactionId, 100)
        break
      case 'surrender':
        result = commandSurrender(state, targetFactionId)
        break
      default:
        return
    }
    onUpdateState(() => result.state)
    showToast(result.result.message)
  }, [state, onUpdateState, showToast])

  // ── 선술집 등용 할당 ──
  const handleAssignRecruiter = useCallback((visitorCharId: string, recruiterCharId: string) => {
    onUpdateState(s => commandAssignRecruiter(s, visitorCharId, recruiterCharId))
    showToast(text.strategy.assignRecruiter)
  }, [onUpdateState, showToast, text.strategy.assignRecruiter])

  // ── 선술집 등용 할당 해제 ──
  const handleCancelRecruiter = useCallback((visitorCharId: string) => {
    onUpdateState(s => commandCancelRecruiter(s, visitorCharId))
  }, [onUpdateState])

  // ── 토벌 배정 ──
  const handleDispatch = useCallback((charId: string, threatId: string) => {
    onUpdateState(s => commandDispatch(s, charId, threatId))
  }, [onUpdateState])

  // ── 토벌 해제 ──
  const handleRecall = useCallback((charId: string) => {
    onUpdateState(s => commandRecall(s, charId))
  }, [onUpdateState])

  // ── 침공 ──
  const handleAttack = useCallback((targetTerritoryId: TerritoryId) => {
    const defenderFaction = state.factions.find(f =>
      f.id !== state.playerFactionId && f.territories.some(t => t.id === targetTerritoryId)
    )
    if (!defenderFaction) return

    const pf = state.factions.find(f => f.id === state.playerFactionId)!
    const attackerIds = pf.members.slice(0, 5).map(m => m.id)
    const defenderIds = defenderFaction.members.slice(0, 5).map(m => m.id)
    if (attackerIds.length === 0 || defenderIds.length === 0) return

    const battle = initBattle(pf, defenderFaction, attackerIds, defenderIds, targetTerritoryId)

    onUpdateState(s => ({
      ...s,
      battle,
      phase: 'battle' as const,
      log: [...s.log, `${defenderFaction.name}의 ${getTerritoryDef(targetTerritoryId)?.name}에 침공!`],
    }))
  }, [state, onUpdateState])

  // ── 무주지 점령 ──
  const handleClaim = useCallback((territoryId: TerritoryId) => {
    const def = getTerritoryDef(territoryId)!
    onUpdateState(s => ({
      ...s,
      factions: s.factions.map(f =>
        f.id === s.playerFactionId
          ? { ...f, fame: f.fame + 5, territories: [...f.territories, {
              id: territoryId,
              name: def.name,
              regionId: def.regionId,
              buildingCards: [],
              maxBuildings: 8,
              population: 500,
              morale: 60,
              resources: { gold: 0, food: 0, knowledge: 0, material: 0, troops: 0, weapons: 0, horses: 0, ships: 0, charms: 0 },
              taxRate: 'normal' as const,
            }] }
          : f
      ),
      log: [...s.log, `${def.name}을(를) 점령했다! (명성 +5)`],
    }))
  }, [onUpdateState])

  // ── 본진 복귀 ──
  const handleGoHome = useCallback(() => {
    const homeId = playerFaction.territories[0]?.id
    if (homeId) {
      onUpdateState(s => ({ ...s, viewingTerritoryId: homeId }))
      focusKeyRef.current += 1
      setFocusTarget({ id: homeId, key: focusKeyRef.current })
    }
  }, [playerFaction, onUpdateState])

  // ── 거병 포기 (방랑 복귀) ──
  const handleAbandon = useCallback(() => {
    onUpdateState(s => abandonFortress(s))
  }, [onUpdateState])

  return (
    <div className="relative space-y-3">

      {/* 영토 전환 스플래시 */}
      {splash && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-500"
              style={{ opacity: splashVisible ? 1 : 0 }}
            >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(/images/game/suikoden/territories/${splash.id}.png)` }}
          />
            <div className="absolute inset-0 bg-black/50" />
            <span className="relative text-2xl font-serif text-white/90 tracking-widest drop-shadow-lg">
              【{splash.name}】
          </span>
        </div>
      )}

      {/* 토스트 알림 — absolute, 레이아웃 무영향 */}
      {toast && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30">
          <div className="p-2 px-4 bg-stone-900 border border-amber-500/30 rounded text-xs text-amber-300 text-center shadow-lg whitespace-nowrap">
            {toast}
          </div>
        </div>
      )}

      {/* 가이드 모달 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-stone-800 border border-amber-500/30 rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-5 space-y-3 animate-modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300">{text.strategy.helpTitle}</h3>
              <button onClick={() => setShowHelp(false)} className="text-stone-500 hover:text-stone-300 text-xs">✕</button>
            </div>
            <div className="text-xs text-stone-300 space-y-2 leading-relaxed">
              <p><b className="text-amber-400">{text.strategy.helpTurnLabel}</b>: {text.strategy.helpTurnDesc}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2 bg-stone-900 rounded">
                  <p className="font-bold text-stone-200 mb-1">{text.strategy.helpBuildTitle}</p>
                  <p>{text.strategy.helpBuildDesc}</p>
                </div>
                <div className="p-2 bg-stone-900 rounded">
                  <p className="font-bold text-stone-200 mb-1">{text.strategy.helpAssignTitle}</p>
                  <p>{text.strategy.helpAssignDesc}</p>
                </div>
                <div className="p-2 bg-stone-900 rounded">
                  <p className="font-bold text-stone-200 mb-1">{text.strategy.helpBattleTitle}</p>
                  <p>{text.strategy.helpBattleDesc}</p>
                </div>
                <div className="p-2 bg-stone-900 rounded">
                  <p className="font-bold text-stone-200 mb-1">{text.strategy.helpDiplomacyTitle}</p>
                  <p>{text.strategy.helpDiplomacyDesc}</p>
                </div>
              </div>

              {/* 스탯 가이드 */}
              <div className="border-t border-stone-700 pt-2 mt-1">
                <p className="font-bold text-amber-400 mb-1.5">{text.strategy.helpStatsTitle}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                  <p>{text.strategy.helpStat1}</p>
                  <p>{text.strategy.helpStat2}</p>
                  <p>{text.strategy.helpStat3}</p>
                  <p>{text.strategy.helpStat4}</p>
                  <p>{text.strategy.helpStat5}</p>
                  <p>{text.strategy.helpStat6}</p>
                  <p>{text.strategy.helpStat7}</p>
                </div>
                <p className="text-[10px] text-stone-500 mt-1.5">{text.strategy.helpFooter}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUD — 상태 표시줄 (읽기 전용) */}
      <PanelLabel name={text.strategy.panelResources} />
      <GameHUD state={state} territory={viewingTerritory} />

      {/* 도구바 — 내 영토: 풀 도구바, 적 영토: 복귀 버튼 */}
      <PanelLabel name={text.strategy.panelToolbar} />
      {viewingTerritory && isViewingOwn ? (
        <GameToolbar
          state={state}
          territory={viewingTerritory}
          onNextTurn={handleNextTurn}
          onToggleAutoAssign={handleToggleAutoAssign}
          onAttack={handleAttack}
          onClaim={handleClaim}
          onDiplomacy={handleDiplomacy}
          onSetTaxRate={handleSetTaxRate}
          onAbandon={handleAbandon}
          onGoHome={handleGoHome}
          onToggleDialogMode={handleToggleDialogMode}
        />
      ) : viewingTerritory && !isViewingOwn ? (
        <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-2 flex items-center gap-3">
          <button
            onClick={handleGoHome}
            className="px-3 py-1.5 bg-amber-700/50 hover:bg-amber-700 text-amber-200 text-xs font-bold rounded transition-colors"
          >
            {text.strategy.goMain}
          </button>
          <span className="text-[11px] text-stone-500">
            {state.factions.some(f => f.territories.some(t => t.id === viewingTerritory.id))
              ? text.toolbar.viewingForeignTerritory
              : text.toolbar.unclaimedTerritory(tS(`territory.${viewingTerritory.id}`))}
          </span>
        </div>
      ) : null}

      {/* 메인 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* 좌측: 건물 칩 리스트 (2/3) */}
        <div className="lg:col-span-2 space-y-3">
          <PanelLabel name={text.strategy.panelBuildings} />
          {viewingTerritory && isViewingOwn && (
            <BuildingCardGrid
              state={state}
              territory={viewingTerritory}
              selectedCharId={selectedCharId}
              onSelectChar={setSelectedCharId}
              onBuild={handleBuild}
              onReassign={handleReassign}
              onUnassign={handleUnassign}
              onDemolish={handleDemolish}
              onAssignRecruiter={handleAssignRecruiter}
              onCancelRecruiter={handleCancelRecruiter}
              onDispatch={handleDispatch}
              onRecall={handleRecall}
              onToast={showToast}
            />
          )}

          {/* 적/무주지 — 플레이어 화면과 동일한 BuildingCardGrid (readOnly) */}
          {viewingTerritory && !isViewingOwn && (() => {
            const owner = state.factions.find(f => f.territories.some(t => t.id === viewingTerritory.id))

            if (!owner) {
              return (
                <div className="border border-stone-700 rounded-lg p-6 bg-stone-800/60 text-center space-y-3">
                  <p className="text-stone-400">{text.strategy.noOneOccupies}</p>
                  <button
                    onClick={() => handleClaim(viewingTerritory.id)}
                    className="px-6 py-3 bg-green-900/50 border border-green-700 rounded-lg hover:bg-green-800/60 hover:border-green-500 transition-colors text-sm text-stone-100 font-bold"
                  >
                    {text.strategy.claim}
                  </button>
                </div>
              )
            }

            return (
              <BuildingCardGrid
                state={state}
                territory={viewingTerritory}
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
                factionOverrideId={owner.id}
              />
            )
          })()}

          {/* 이벤트 로그 */}
          <PanelLabel name={text.strategy.panelLogs} />
          <div className="border border-stone-700 rounded-lg p-2 bg-stone-800/50 max-h-24 overflow-y-auto">
            {state.log.slice(-8).reverse().map((l, i) => (
              <p key={i} className="text-[9px] text-stone-500 leading-relaxed">{translateSuikodenMessage(l, locale, {
                translateTerritory: (id) => tS(`territory.${id}`),
                translateRegion: (id) => tS(`region.${id}`),
              })}</p>
            ))}
          </div>
        </div>

        {/* 우측 패널 (1/3) */}
        <div className="space-y-3">
          {/* 세계 지도 — 아코디언 */}
          <div className="bg-stone-800/80 border border-stone-700 rounded-lg">
            <div
              className="flex items-center gap-2 p-2.5 cursor-pointer select-none"
              onClick={(e) => {
                // 탭 버튼 클릭은 무시 (헤더 빈 영역만 토글)
                if ((e.target as HTMLElement).closest('button')) return
                setMapOpen(v => !v)
              }}
            >
              <span className="text-[8px] text-stone-600">{mapOpen ? '\u25BC' : '\u25B6'}</span>
              <span className="text-xs font-bold text-stone-400 mr-auto">{text.strategy.mapWorld}</span>
              {mapOpen && (
                <div className="flex bg-stone-900/80 rounded p-0.5 gap-0.5">
                  <button
                    onClick={() => setMapMode('globe')}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      mapMode === 'globe'
                        ? 'bg-stone-700 text-stone-200 font-bold'
                        : 'text-stone-500 hover:text-stone-400'
                    }`}
                  >
                    {text.strategy.mapGlobe}
                  </button>
                  <button
                    onClick={() => setMapMode('text')}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      mapMode === 'text'
                        ? 'bg-stone-700 text-stone-200 font-bold'
                        : 'text-stone-500 hover:text-stone-400'
                    }`}
                  >
                    {text.strategy.mapText}
                  </button>
                </div>
              )}
            </div>

            {mapOpen && (
              <div className="px-2.5 pb-2.5">
                {mapMode === 'globe' ? (
                  <WorldMapView
                    state={state}
                    viewingTerritoryId={state.viewingTerritoryId}
                    selectedTerritoryId={state.selectedTerritoryId}
                    onSelectTerritory={handleSelectTerritory}
                    phase="strategy"
                    focusTerritoryId={focusTarget?.id ?? null}
                    focusKey={focusTarget?.key ?? 0}
                  />
                ) : (
                  <TextMapView
                    state={state}
                    viewingTerritoryId={state.viewingTerritoryId}
                    selectedTerritoryId={state.selectedTerritoryId}
                    onSelectTerritory={handleSelectTerritory}
                    phase="strategy"
                  />
                )}
              </div>
            )}
          </div>

          {/* 선택 인물 상세 — 아코디언 */}
          <div className="bg-stone-800 border border-stone-700 rounded">
            <div
              className="flex items-center gap-2 p-2 cursor-pointer select-none"
              onClick={() => setCharPanelOpen(v => !v)}
            >
              <span className="text-[8px] text-stone-600">{charPanelOpen ? '\u25BC' : '\u25B6'}</span>
              <span className="text-xs font-bold text-stone-400">{text.strategy.characterInfo}</span>
              {selectedCharId && !charPanelOpen && (() => {
                const c = playerFaction.members.find(m => m.id === selectedCharId)
                return c ? <span className="ml-auto text-[10px] text-stone-500 truncate">{c.nickname}</span> : null
              })()}
            </div>
            {charPanelOpen && (
              <CharacterInfoPanel
                state={state}
                selectedCharId={selectedCharId}
                onIdle={handleIdle}
                onTrain={handleTrain}
                onReward={handleReward}
                onPunish={handlePunish}
              />
            )}
          </div>

          {/* 세력 현황 */}
          <details className="border border-stone-700 rounded bg-stone-800/50" open>
            <summary className="p-2 text-xs font-bold text-stone-300 cursor-pointer hover:text-stone-100">{text.strategy.factionStatus}</summary>
            <div className="px-2 pb-2 space-y-1">
              {state.factions.map(f => (
                <div key={f.id} className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                  <span className={`flex-1 truncate ${f.id === state.playerFactionId ? 'text-amber-300 font-bold' : 'text-stone-400'}`}>
                    {stripSuikodenFactionSuffix(f.name)}
                  </span>
                  <span className="text-stone-500">{text.strategy.memberCount(f.members.length)}</span>
                  <span className="text-stone-500">{text.strategy.territoryCount(f.territories.length)}</span>
                </div>
              ))}
            </div>
          </details>

          {/* 도움말 토글 */}
          <button onClick={() => setShowHelp(!showHelp)} className="w-full text-[10px] text-stone-600 hover:text-amber-400">{text.strategy.help}</button>
        </div>
      </div>
    </div>
  )
}

function PanelLabel({ name }: { name: string }) {
  return (
    <div className="text-[9px] text-stone-600 uppercase tracking-wider mb-0.5">{name}</div>
  )
}
