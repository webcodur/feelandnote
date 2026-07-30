'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { GameState, BattleUnit, BattleAction, BattleActionType, DialogEntry } from '@/lib/game/suikoden/types'
import { SKILL_DEFS } from '@/lib/game/suikoden/constants'
import {
  executeAction, getValidTargets, selectAIAction,
  confirmPlacement, syncLegacyParticipants,
} from '@/lib/game/suikoden/battleEngine'
import { applyBattleResult, collectDispositionTargets } from '@/lib/game/suikoden/engine'
import { resolveCampaignOutcome } from '@/lib/game/suikoden/campaign'
import { generateDialog } from '@/lib/game/suikoden/dialog'
import TurnOrderBar from './TurnOrderBar'
import BattleGridView from './BattleGridView'
import ActionPanel from './ActionPanel'
import PlacementScreen from './PlacementScreen'
import BattleSVGOverlay from './BattleSVGOverlay'
import { getSuikodenText, stripSuikodenFactionSuffix, translateSuikodenBattleLog } from './i18n'

/** characterId → celeb_dialogues.lines */
type DialoguesMap = Record<string, Record<string, string[]>>

interface Props {
  state: GameState
  onUpdateState: (fn: (s: GameState) => GameState) => void
  onDialog?: (entry: DialogEntry) => void
  dialogues?: DialoguesMap
}

export default function BattleScreen({ state, onUpdateState, onDialog, dialogues }: Props) {
  const locale = useLocale()
  const tS = useTranslations('rest.arena.suikoden')
  const text = getSuikodenText(locale)
  const battle = state.battle!
  const playerFactionId = state.playerFactionId
  const isPlayerAttacker = battle.attackerFactionId === playerFactionId

  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [animating, setAnimating] = useState(false)

  const attackerFaction = state.factions.find(f => f.id === battle.attackerFactionId)
  const defenderFaction = state.factions.find(f => f.id === battle.defenderFactionId)

  // 전투 결과 감지 → 대사 (한 번만)
  const prevResultRef = useRef(battle.result)
  useEffect(() => {
    if (prevResultRef.current !== 'pending' || battle.result === 'pending') return
    prevResultRef.current = battle.result
    if (!onDialog) return

    const playerWon = (battle.result === 'attacker_wins' && isPlayerAttacker)
      || (battle.result === 'defender_wins' && !isPlayerAttacker)
    const type = playerWon ? 'battle_win' : 'battle_lose'
    const pf = state.factions.find(f => f.id === playerFactionId)
    const leader = pf?.members.find(m => m.id === pf.leaderId)
    if (leader) onDialog(generateDialog(type, leader, dialogues?.[leader.id]))
  }, [battle.result, isPlayerAttacker, onDialog, state.factions, playerFactionId, dialogues])

  // 현재 행동자
  const currentUnitId = battle.turnOrder[battle.currentTurnIndex] ?? null
  const currentUnit = currentUnitId
    ? (battle.allies.find(u => u.id === currentUnitId) ?? battle.enemies.find(u => u.id === currentUnitId))
    : null
  const isPlayerTurn = currentUnit
    ? battle.allies.some(u => u.id === currentUnit.id)
    : false

  // 유효 타겟 계산
  const getTargets = useCallback((action: string): string[] => {
    if (!currentUnitId) return []
    if (action === 'attack') {
      return getValidTargets(battle, currentUnitId, 'attack')
    }
    if (action === 'defend' || action === 'retreat') {
      return [currentUnitId]
    }
    if (action.startsWith('skill:')) {
      const skillId = action.replace('skill:', '')
      return getValidTargets(battle, currentUnitId, 'skill', skillId)
    }
    return []
  }, [battle, currentUnitId])

  const validTargetIds = selectedAction ? getTargets(selectedAction) : []

  // 행동 선택
  const handleSelectAction = useCallback((action: string) => {
    setSelectedAction(action)
    setSelectedTargetId(null)

    // 별도 대상을 고르지 않는 행동은 즉시 실행한다.
    if (action === 'defend' || action === 'retreat') {
      executePlayerAction(action, currentUnitId!)
      return
    }
    if (action.startsWith('skill:')) {
      const skillId = action.replace('skill:', '')
      const targetType = SKILL_DEFS[skillId]?.targetType
      if (targetType === 'self' || targetType === 'all_ally' || targetType === 'all_enemy') {
        executePlayerAction(action, currentUnitId!)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUnitId])

  // 타겟 선택 → 실행
  const handleSelectTarget = useCallback((targetId: string) => {
    if (!selectedAction || !currentUnitId) return
    setSelectedTargetId(targetId)
    executePlayerAction(selectedAction, targetId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAction, currentUnitId])

  // 행동 실행
  const executePlayerAction = useCallback((actionStr: string, targetId: string) => {
    if (!currentUnitId || animating) return
    setAnimating(true)

    let action: BattleAction
    if (actionStr.startsWith('skill:')) {
      const skillId = actionStr.replace('skill:', '')
      const skillDef = SKILL_DEFS[skillId]
      action = {
        actorId: currentUnitId,
        type: 'skill',
        skillId,
        targetId: skillDef?.targetType === 'row_enemy' ? undefined : targetId,
        targetRow: skillDef?.targetType === 'row_enemy' ? Number(targetId) : undefined,
      }
    } else {
      action = {
        actorId: currentUnitId,
        type: actionStr as BattleActionType,
        targetId: actionStr === 'defend' || actionStr === 'retreat' ? currentUnitId : targetId,
      }
    }

    // 실행
    onUpdateState(s => {
      const b = s.battle!
      const newBattle = executeAction(b, action)
      return { ...s, battle: newBattle }
    })

    // 애니메이션 뒤 선택 상태를 정리한다. 다음 행동자가 AI면 아래 effect가 자동 진행한다.
    setTimeout(() => {
      setSelectedAction(null)
      setSelectedTargetId(null)
      setAnimating(false)
    }, 900)
  }, [currentUnitId, animating, onUpdateState])

  // AI 차례는 현재 전투 상태만 보고 한 행동씩 자동 실행한다.
  // 저장된 전투를 불러왔을 때 AI 차례여도 같은 effect가 즉시 이어받는다.
  useEffect(() => {
    if (animating
      || battle.result !== 'pending'
      || battle.phase !== 'action_select'
      || !currentUnitId
      || isPlayerTurn) return

    const expectedUnitId = currentUnitId
    const timer = setTimeout(() => {
      onUpdateState(s => {
        const currentBattle = s.battle
        if (!currentBattle
          || currentBattle.result !== 'pending'
          || currentBattle.phase !== 'action_select'
          || currentBattle.turnOrder[currentBattle.currentTurnIndex] !== expectedUnitId
          || currentBattle.allies.some(unit => unit.id === expectedUnitId && !unit.isDefeated)) {
          return s
        }

        const aiAction = selectAIAction(currentBattle, expectedUnitId)
        return { ...s, battle: executeAction(currentBattle, aiAction) }
      })
    }, 400)

    return () => clearTimeout(timer)
  }, [animating, battle.result, battle.phase, currentUnitId, isPlayerTurn, onUpdateState])

  // 배치 확정
  const handlePlacementConfirm = useCallback((allies: BattleUnit[]) => {
    // battle_start 대사
    if (onDialog) {
      const pf = state.factions.find(f => f.id === playerFactionId)
      const leader = pf?.members.find(m => m.id === pf.leaderId)
      if (leader) onDialog(generateDialog('battle_start', leader, dialogues?.[leader.id]))
    }

    onUpdateState(s => {
      const b = s.battle!
      return { ...s, battle: confirmPlacement({ ...b, allies }) }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUpdateState, onDialog, dialogues])

  // SVG 애니메이션 종료
  const handleAnimationEnd = useCallback(() => {
    onUpdateState(s => {
      if (!s.battle) return s
      return { ...s, battle: { ...s.battle, animation: null } }
    })
  }, [onUpdateState])

  // 전투 종료 처리
  const handleBattleComplete = useCallback(() => {
    onUpdateState(s => {
      const b = syncLegacyParticipants(s.battle!)
      let ns = applyBattleResult(s, b)

      const targets = collectDispositionTargets(b, s.playerFactionId)
      if (targets.length > 0) {
        return {
          ...ns,
          phase: 'disposition',
          disposition: { targets, currentIndex: 0, results: [] },
        }
      }

      ns = resolveCampaignOutcome({ ...ns, battle: null, phase: 'strategy' })
      return ns
    })
  }, [onUpdateState])

  // 아군/적군 생존 수
  const allyAlive = battle.allies.filter(u => !u.isDefeated).length
  const enemyAlive = battle.enemies.filter(u => !u.isDefeated).length

  // 결과 텍스트
  const resultLabel = () => {
    if (battle.result === 'attacker_wins') {
      return isPlayerAttacker ? tS('battle.victory') : tS('battle.defeat')
    }
    if (battle.result === 'defender_wins') {
      return !isPlayerAttacker ? tS('battle.defenseSuccess') : tS('battle.defeat')
    }
    return tS('battle.draw')
  }

  // ── 배치 화면 ──
  if (battle.phase === 'placement') {
    return <PlacementScreen state={battle} onConfirm={handlePlacementConfirm} />
  }

  // ── 전투 화면 ──
  return (
    <div className="space-y-2">
      {/* 전투 HUD */}
      <div className="flex flex-col gap-2 rounded border border-stone-700 bg-stone-800 p-2 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: attackerFaction?.color }} />
            <span className="min-w-0 break-words text-text-primary">{attackerFaction ? stripSuikodenFactionSuffix(attackerFaction.name) : ''}</span>
            <span className="shrink-0 text-[10px] text-text-secondary">({isPlayerAttacker ? allyAlive : enemyAlive})</span>
          </div>
          <span className="text-text-secondary">vs</span>
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: defenderFaction?.color }} />
            <span className="min-w-0 break-words text-text-primary">{defenderFaction ? stripSuikodenFactionSuffix(defenderFaction.name) : ''}</span>
            <span className="shrink-0 text-[10px] text-text-secondary">({isPlayerAttacker ? enemyAlive : allyAlive})</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-text-secondary">
          {battle.defenderHasWalls && <span className="text-[10px] text-amber-400">{tS('battle.walls')}</span>}
          <span>{tS('battle.turnCount', { current: battle.turnNumber, max: battle.maxTurns })}</span>
        </div>
      </div>

      {/* 사기 게이지 */}
      <div className="flex flex-col gap-2 text-[10px] sm:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap justify-between gap-x-2">
            <span className="break-words text-green-400">{tS('battle.allyMorale')}</span>
            <span className="text-text-secondary">{battle.allyMorale}</span>
          </div>
          <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-[width]"
              style={{ width: `${battle.allyMorale}%` }}
            />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap justify-between gap-x-2">
            <span className="break-words text-red-400">{tS('battle.enemyMorale')}</span>
            <span className="text-text-secondary">{battle.enemyMorale}</span>
          </div>
          <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-[width]"
              style={{ width: `${battle.enemyMorale}%` }}
            />
          </div>
        </div>
      </div>

      {/* 턴 오더 바 */}
      <TurnOrderBar state={battle} playerFactionId={playerFactionId} />

      {/* 전투 결과 */}
      {battle.result !== 'pending' && (
        <div className="p-4 bg-stone-800 border border-amber-500/30 rounded text-center space-y-3">
          <p className="text-xl font-bold text-text-primary">{resultLabel()}</p>
          <button
            onClick={handleBattleComplete}
            className="px-6 py-2 bg-amber-600 rounded text-sm text-stone-900 font-bold hover:bg-amber-500"
          >
            {tS('battle.goBack')}
          </button>
        </div>
      )}

      {/* 전투 진행 중 */}
      {battle.result === 'pending' && (
        <>
          {/* 그리드 영역 */}
          <div className="relative">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {/* 아군 그리드 */}
              <div className="min-w-0">
                <p className="text-[9px] text-green-400 mb-1 font-bold">{tS('battle.ally')}</p>
                <BattleGridView
                  units={battle.allies}
                  isAlly={true}
                  currentUnitId={currentUnitId}
                  selectedTargetId={selectedTargetId}
                  validTargetIds={isPlayerTurn ? validTargetIds : []}
                  animation={battle.animation}
                  onSelectTarget={handleSelectTarget}
                />
              </div>

              {/* 적군 그리드 */}
              <div className="min-w-0">
                <p className="text-[9px] text-red-400 mb-1 font-bold">{tS('battle.enemy')}</p>
                <BattleGridView
                  units={battle.enemies}
                  isAlly={false}
                  currentUnitId={currentUnitId}
                  selectedTargetId={selectedTargetId}
                  validTargetIds={isPlayerTurn ? validTargetIds : []}
                  animation={battle.animation}
                  onSelectTarget={handleSelectTarget}
                />
              </div>
            </div>

            {/* SVG 애니메이션 오버레이 */}
            <BattleSVGOverlay animation={battle.animation} onAnimationEnd={handleAnimationEnd} />
          </div>

          {/* 행 범위 기술 대상 선택 */}
          {isPlayerTurn
            && selectedAction?.startsWith('skill:')
            && SKILL_DEFS[selectedAction.replace('skill:', '')]?.targetType === 'row_enemy'
            && (
              <div className="grid grid-cols-3 gap-2 p-2 bg-stone-800 border border-stone-700 rounded">
                {validTargetIds.map(rowId => {
                  const row = Number(rowId)
                  const label = row === 0 ? text.battle.row.front : row === 1 ? text.battle.row.middle : text.battle.row.rear
                  return (
                    <button
                      key={rowId}
                      onClick={() => handleSelectTarget(rowId)}
                      className="py-2 rounded border border-red-700 bg-red-950/40 text-xs font-bold text-red-200 hover:border-red-400 hover:bg-red-900/50"
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}

          {/* 행동 패널 (플레이어 턴) */}
          {isPlayerTurn && currentUnit && !animating && (
            <div className="p-2 bg-stone-800 border border-stone-700 rounded">
              <ActionPanel
                unit={currentUnit}
                selectedAction={selectedAction}
                onSelectAction={handleSelectAction}
                disabled={animating}
              />
            </div>
          )}

          {/* AI 턴 표시 */}
          {!isPlayerTurn && currentUnit && (
            <div className="text-center py-2">
              <span className="text-red-400 text-sm animate-pulse">
                {tS('battle.actingUnit', { name: currentUnit.character.nickname })}
              </span>
            </div>
          )}
        </>
      )}

      {/* 전투 로그 */}
      <div className="max-h-24 overflow-y-auto p-2 bg-stone-800 border border-stone-700 rounded text-[10px] text-text-secondary space-y-0.5">
        {battle.log.slice(-12).reverse().map((entry, i) => (
          <p key={i} className={
            entry.type === 'death' ? 'text-red-400' :
            entry.type === 'attack' ? 'text-text-primary' :
            entry.type === 'skill' ? 'text-purple-400' :
            entry.type === 'morale' ? 'text-green-400' :
            entry.type === 'heal' ? 'text-emerald-400' :
            entry.type === 'system' ? 'text-amber-300 font-bold' :
            'text-text-secondary'
          }>
            [{entry.turn}] {translateSuikodenBattleLog(entry.message, locale)}
          </p>
        ))}
      </div>
    </div>
  )
}
