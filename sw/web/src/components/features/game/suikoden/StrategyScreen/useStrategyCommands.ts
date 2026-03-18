import { useCallback, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { GameState, TerritoryId, TaxRate } from '@/lib/game/suikoden/types'
import { getTerritoryDef } from '@/lib/game/suikoden/utils'
import { initBattle, abandonFortress } from '@/lib/game/suikoden/engine'
import { advanceTurn, commandBuild, commandAssign, commandReassign, commandUnassign, commandIdle, commandTrain, commandReward, commandPunish, commandDemolish, commandSetTaxRate, commandAssignRecruiter, commandCancelRecruiter, commandDispatch, commandRecall } from '@/lib/game/suikoden/turnEngine'
import { commandAlliance, commandCeasefire, commandTribute, commandSurrender } from '@/lib/game/suikoden/diplomacy'
import { generateDialog } from '@/lib/game/suikoden/dialog'
import { getSuikodenText, translateSuikodenMessage } from '../i18n'
import type { StrategyScreenProps, StrategyCommands } from './types'

interface UseStrategyCommandsArgs {
  state: StrategyScreenProps['state']
  onUpdateState: StrategyScreenProps['onUpdateState']
  onDialog: StrategyScreenProps['onDialog']
  dialogues: StrategyScreenProps['dialogues']
  selectedCharId: string | null
  viewingTerritory: { id: TerritoryId } | null
  playerFaction: GameState['factions'][number]
  setToast: (msg: string | null) => void
  setSplash: (v: { name: string; id: string } | null) => void
  setSplashVisible: (v: boolean) => void
  setFocusTarget: (v: { id: TerritoryId; key: number } | null) => void
  focusKeyRef: React.MutableRefObject<number>
}

export function useStrategyCommands({
  state, onUpdateState, onDialog, dialogues,
  selectedCharId, viewingTerritory, playerFaction,
  setToast, setSplash, setSplashVisible, setFocusTarget, focusKeyRef,
}: UseStrategyCommandsArgs): StrategyCommands {
  const locale = useLocale()
  const tS = useTranslations('rest.arena.suikoden')
  const text = getSuikodenText(locale)

  const showToast = useCallback((msg: string) => {
    setToast(translateSuikodenMessage(msg, locale, {
      translateTerritory: (id) => tS(`territory.${id}`),
      translateRegion: (id) => tS(`region.${id}`),
    }))
    setTimeout(() => setToast(null), 2500)
  }, [locale, tS, setToast])

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
  }, [onUpdateState, state.viewingTerritoryId, tS, setSplash, setSplashVisible])

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
  }, [playerFaction, onUpdateState, focusKeyRef, setFocusTarget])

  // ── 거병 포기 (방랑 복귀) ──
  const handleAbandon = useCallback(() => {
    onUpdateState(s => abandonFortress(s))
  }, [onUpdateState])

  return {
    handleNextTurn,
    handleSelectTerritory,
    handleBuild,
    handleAssign,
    handleReassign,
    handleUnassign,
    handleToggleAutoAssign,
    handleToggleDialogMode,
    handleIdle,
    handleTrain,
    handleReward,
    handlePunish,
    handleDemolish,
    handleSetTaxRate,
    handleDiplomacy,
    handleAssignRecruiter,
    handleCancelRecruiter,
    handleDispatch,
    handleRecall,
    handleAttack,
    handleClaim,
    handleGoHome,
    handleAbandon,
    showToast,
  }
}
