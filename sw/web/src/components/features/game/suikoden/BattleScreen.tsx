'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { GameState, BattleUnit, BattleAction, BattleActionType, DialogEntry } from '@/lib/game/suikoden/types'
import { SKILL_DEFS } from '@/lib/game/suikoden/constants'
import {
  executeAction, getValidTargets, selectAIAction,
  confirmPlacement, checkBattleEnd, syncLegacyParticipants,
} from '@/lib/game/suikoden/battleEngine'
import { applyBattleResult, collectDispositionTargets } from '@/lib/game/suikoden/engine'
import { generateDialog } from '@/lib/game/suikoden/dialog'
import TurnOrderBar from './TurnOrderBar'
import BattleGridView from './BattleGridView'
import ActionPanel from './ActionPanel'
import PlacementScreen from './PlacementScreen'
import BattleSVGOverlay from './BattleSVGOverlay'

/** characterId → celeb_dialogues.lines */
type DialoguesMap = Record<string, Record<string, string[]>>

interface Props {
  state: GameState
  onUpdateState: (fn: (s: GameState) => GameState) => void
  onDialog?: (entry: DialogEntry) => void
  dialogues?: DialoguesMap
}

export default function BattleScreen({ state, onUpdateState, onDialog, dialogues }: Props) {
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
    const leader = pf?.members.find((m: any) => m.id === pf.leaderId)
    if (leader) onDialog(generateDialog(type as any, leader as any, dialogues?.[leader.id]))
  }, [battle.result])

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

    // 자기 타겟 행동은 즉시 실행
    if (action === 'defend' || action === 'retreat') {
      executePlayerAction(action, currentUnitId!)
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

    // 애니메이션 후 AI 턴 체인
    setTimeout(() => {
      setSelectedAction(null)
      setSelectedTargetId(null)
      setAnimating(false)
      runAITurns()
    }, 900)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUnitId, animating, onUpdateState])

  // AI 턴 자동 실행
  const runAITurns = useCallback(() => {
    const runNext = () => {
      onUpdateState(s => {
        const b = s.battle
        if (!b || b.result !== 'pending' || b.phase === 'result') return s

        const unitId = b.turnOrder[b.currentTurnIndex]
        if (!unitId) return s

        const isAlly = b.allies.some(u => u.id === unitId && !u.isDefeated)
        if (isAlly) return s // 플레이어 턴 → 중단

        // AI 행동
        const aiAction = selectAIAction(b, unitId)
        const newBattle = executeAction(b, aiAction)

        // 결과 체크
        if (newBattle.result !== 'pending') {
          return { ...s, battle: newBattle }
        }

        // 다음이 플레이어면 중단, AI면 계속
        const nextUnitId = newBattle.turnOrder[newBattle.currentTurnIndex]
        const nextIsAlly = newBattle.allies.some(u => u.id === nextUnitId && !u.isDefeated)

        if (!nextIsAlly && newBattle.result === 'pending') {
          // 연속 AI 턴 — 약간의 딜레이
          setTimeout(runNext, 400)
        }

        return { ...s, battle: newBattle }
      })
    }

    // 첫 AI 체크
    setTimeout(runNext, 300)
  }, [onUpdateState])

  // 배치 확정
  const handlePlacementConfirm = useCallback((allies: BattleUnit[]) => {
    // battle_start 대사
    if (onDialog) {
      const pf = state.factions.find(f => f.id === playerFactionId)
      const leader = pf?.members.find((m: any) => m.id === pf.leaderId)
      if (leader) onDialog(generateDialog('battle_start' as any, leader as any, dialogues?.[leader.id]))
    }

    onUpdateState(s => {
      const b = s.battle!
      const newBattle = confirmPlacement({ ...b, allies })

      // 첫 행동자가 AI면 AI 턴 시작
      const firstId = newBattle.turnOrder[0]
      const firstIsAlly = newBattle.allies.some(u => u.id === firstId)
      if (!firstIsAlly) {
        setTimeout(() => runAITurns(), 300)
      }

      return { ...s, battle: newBattle }
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

      ns = { ...ns, battle: null, phase: 'strategy' }
      const active = ns.factions.filter(f => f.territories.length > 0)
      if (active.length === 1) {
        ns = { ...ns, isGameOver: true, winner: active[0].id, phase: 'result' }
      }
      return ns
    })
  }, [onUpdateState])

  // 아군/적군 생존 수
  const allyAlive = battle.allies.filter(u => !u.isDefeated).length
  const enemyAlive = battle.enemies.filter(u => !u.isDefeated).length

  // 결과 텍스트
  const resultLabel = () => {
    if (battle.result === 'attacker_wins') {
      return isPlayerAttacker ? '승리!' : '패배...'
    }
    if (battle.result === 'defender_wins') {
      return !isPlayerAttacker ? '방어 성공!' : '패배...'
    }
    return '무승부'
  }

  // ── 배치 화면 ──
  if (battle.phase === 'placement') {
    return <PlacementScreen state={battle} onConfirm={handlePlacementConfirm} />
  }

  // ── 전투 화면 ──
  return (
    <div className="space-y-2">
      {/* 전투 HUD */}
      <div className="flex items-center justify-between p-2 bg-stone-800 border border-stone-700 rounded text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: attackerFaction?.color }} />
            <span className="text-stone-200">{attackerFaction?.name.replace('의 세력', '')}</span>
            <span className="text-stone-500 text-[10px]">({isPlayerAttacker ? allyAlive : enemyAlive})</span>
          </div>
          <span className="text-stone-500">vs</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: defenderFaction?.color }} />
            <span className="text-stone-200">{defenderFaction?.name.replace('의 세력', '')}</span>
            <span className="text-stone-500 text-[10px]">({isPlayerAttacker ? enemyAlive : allyAlive})</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-stone-400">
          {battle.defenderHasWalls && <span className="text-amber-400 text-[10px]">[성벽]</span>}
          <span>턴 {battle.turnNumber}/{battle.maxTurns}</span>
        </div>
      </div>

      {/* 사기 게이지 */}
      <div className="flex gap-2 text-[10px]">
        <div className="flex-1">
          <div className="flex justify-between mb-0.5">
            <span className="text-green-400">아군 사기</span>
            <span className="text-stone-400">{battle.allyMorale}</span>
          </div>
          <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${battle.allyMorale}%` }}
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between mb-0.5">
            <span className="text-red-400">적군 사기</span>
            <span className="text-stone-400">{battle.enemyMorale}</span>
          </div>
          <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all"
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
          <p className="text-xl font-bold text-stone-200">{resultLabel()}</p>
          <button
            onClick={handleBattleComplete}
            className="px-6 py-2 bg-amber-600 rounded text-sm text-stone-900 font-bold hover:bg-amber-500"
          >
            돌아가기
          </button>
        </div>
      )}

      {/* 전투 진행 중 */}
      {battle.result === 'pending' && (
        <>
          {/* 그리드 영역 */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-2">
              {/* 아군 그리드 */}
              <div>
                <p className="text-[9px] text-green-400 mb-1 font-bold">아군</p>
                <BattleGridView
                  units={battle.allies}
                  isAlly={true}
                  currentUnitId={currentUnitId}
                  selectedTargetId={selectedTargetId}
                  validTargetIds={isPlayerTurn ? [] : validTargetIds}
                  animation={battle.animation}
                  onSelectTarget={handleSelectTarget}
                />
              </div>

              {/* 적군 그리드 */}
              <div>
                <p className="text-[9px] text-red-400 mb-1 font-bold">적군</p>
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
                {currentUnit.character.nickname} 행동 중...
              </span>
            </div>
          )}
        </>
      )}

      {/* 전투 로그 */}
      <div className="max-h-24 overflow-y-auto p-2 bg-stone-800 border border-stone-700 rounded text-[10px] text-stone-400 space-y-0.5">
        {battle.log.slice(-12).reverse().map((entry, i) => (
          <p key={i} className={
            entry.type === 'death' ? 'text-red-400' :
            entry.type === 'attack' ? 'text-stone-300' :
            entry.type === 'skill' ? 'text-purple-400' :
            entry.type === 'morale' ? 'text-green-400' :
            entry.type === 'heal' ? 'text-emerald-400' :
            entry.type === 'system' ? 'text-amber-300 font-bold' :
            'text-stone-500'
          }>
            [{entry.turn}] {entry.message}
          </p>
        ))}
      </div>
    </div>
  )
}
