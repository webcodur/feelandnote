'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GameState, BattleState, Position, ClassSkill } from '@/lib/game/suikoden/types'
import { TERRAIN_INFO, CLASS_INFO, TILE_SIZE } from '@/lib/game/suikoden/constants'
import { selectUnit, moveUnit, attackUnit, endUnitAction, endFactionTurn, executeAISingleUnit, hasUnactedAIUnits } from '@/lib/game/suikoden/engine'
import { executeSkill } from '@/lib/game/suikoden/skills'
import { getSkillsForUnit, canUseSkill } from '@/lib/game/suikoden/skills'
import { calcDamagePreview } from '@/lib/game/suikoden/utils'
import { SHOOT_RANGE } from '@/lib/game/suikoden/constants'
import SkillMenu from './SkillMenu'

interface Props {
  state: GameState
  onUpdateState: (fn: (s: GameState) => GameState) => void
}

export default function BattleScreen({ state, onUpdateState }: Props) {
  const battle = state.battle!
  const factions = state.factions
  const playerFactionId = state.playerFactionId

  const [localBattle, setLocalBattle] = useState(battle)
  const [aiThinking, setAiThinking] = useState(false)
  const [showSkillMenu, setShowSkillMenu] = useState(false)
  const [skillTargetMode, setSkillTargetMode] = useState<ClassSkill | null>(null)
  const [hoverPos, setHoverPos] = useState<Position | null>(null)

  const isPlayerTurn = localBattle.currentFaction === playerFactionId
  const attackerFaction = factions.find(f => f.id === localBattle.attackerFactionId)
  const defenderFaction = factions.find(f => f.id === localBattle.defenderFactionId)

  // AI 턴 — 유닛 1명씩 순차 실행 (딜레이로 액션 시각화)
  useEffect(() => {
    if (localBattle.phase !== 'enemy' || isPlayerTurn || localBattle.result !== 'pending') return

    setAiThinking(true)

    const timer = setTimeout(() => {
      if (hasUnactedAIUnits(localBattle)) {
        // 1명 행동 → state 업데이트 → 다음 useEffect 트리거
        const b = executeAISingleUnit(localBattle)
        setLocalBattle(b)
      } else {
        // 전원 행동 완료 → 턴 종료
        const b = endFactionTurn(localBattle)
        setLocalBattle(b)
        setAiThinking(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [localBattle, isPlayerTurn])

  // action phase 진입 시 스킬바 자동 표시
  useEffect(() => {
    if (localBattle.phase === 'action' && isPlayerTurn && localBattle.selectedUnit) {
      setShowSkillMenu(true)
    }
  }, [localBattle.phase, isPlayerTurn, localBattle.selectedUnit])

  // 데미지 프리뷰 계산
  const getDamagePreview = useCallback((x: number, y: number): number | null => {
    if (!localBattle.selectedUnit) return null
    if (!isAttackable(x, y)) return null
    const tile = localBattle.grid[y]?.[x]
    if (!tile?.unit) return null
    const attacker = localBattle.selectedUnit
    const defender = tile.unit
    const distance = Math.abs(attacker.x - x) + Math.abs(attacker.y - y)
    const isRanged = distance > 1
    // 협공 아군 수 계산
    let adjacentAllies = 0
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = x + dx
      const ny2 = y + dy
      if (nx < 0 || nx >= localBattle.width || ny2 < 0 || ny2 >= localBattle.height) continue
      const adj = localBattle.grid[ny2][nx].unit
      if (adj && adj.factionId === attacker.factionId && !(adj.x === attacker.x && adj.y === attacker.y)) {
        adjacentAllies++
      }
    }
    return calcDamagePreview(attacker.character, defender.character, tile.terrain, isRanged, attacker.chargeDistance ?? 0, adjacentAllies)
  }, [localBattle])

  const handleTileClick = useCallback((x: number, y: number) => {
    if (!isPlayerTurn || aiThinking) return

    // 스킬 타겟 선택 모드
    if (skillTargetMode && localBattle.selectedUnit) {
      const result = executeSkill(localBattle, localBattle.selectedUnit, skillTargetMode, { x, y })
      setLocalBattle(result)
      setSkillTargetMode(null)
      setShowSkillMenu(false)
      return
    }

    const { phase: bPhase } = localBattle

    if (bPhase === 'select') {
      setLocalBattle(selectUnit(localBattle, x, y))
      return
    }

    if (bPhase === 'move') {
      if (localBattle.movablePositions.some(p => p.x === x && p.y === y)) {
        setLocalBattle(moveUnit(localBattle, { x, y }))
        return
      }
      if (localBattle.attackablePositions.some(p => p.x === x && p.y === y)) {
        setLocalBattle(attackUnit(localBattle, { x, y }))
        return
      }
      setLocalBattle({ ...localBattle, selectedUnit: null, movablePositions: [], attackablePositions: [], phase: 'select' })
      return
    }

    if (bPhase === 'action') {
      if (localBattle.attackablePositions.some(p => p.x === x && p.y === y)) {
        setLocalBattle(attackUnit(localBattle, { x, y }))
        return
      }
      setLocalBattle(endUnitAction(localBattle))
    }
  }, [localBattle, isPlayerTurn, aiThinking, skillTargetMode])

  const handleUseSkill = useCallback((skill: ClassSkill) => {
    if (skill.range === 0) {
      // 자기 대상 스킬 (rally, scout, inspire 등)
      if (localBattle.selectedUnit) {
        const result = executeSkill(localBattle, localBattle.selectedUnit, skill, null)
        setLocalBattle(result)
        setShowSkillMenu(false)
        setSkillTargetMode(null)
      }
    } else {
      // 타겟 지정 필요
      setSkillTargetMode(skill)
      setShowSkillMenu(false)
    }
  }, [localBattle])

  const handleEndTurn = useCallback(() => {
    setShowSkillMenu(false)
    setSkillTargetMode(null)
    const b = endFactionTurn(localBattle)
    setLocalBattle(b)
  }, [localBattle])

  const handleBattleComplete = useCallback(() => {
    onUpdateState(s => {
      const ns = { ...s }

      if (localBattle.result === 'attacker_wins') {
        const defFaction = ns.factions.find(f => f.id === localBattle.defenderFactionId)
        const atkFaction = ns.factions.find(f => f.id === localBattle.attackerFactionId)
        if (defFaction && atkFaction && defFaction.territories.length > 0) {
          const taken = defFaction.territories.pop()!
          atkFaction.territories.push(taken)
          ns.log = [...ns.log, `${atkFaction.name}이(가) ${taken.name}을(를) 점령!`]
        }
        ns.factions = ns.factions.filter(f => f.territories.length > 0 || f.id === ns.playerFactionId)
      }

      if (localBattle.result === 'defender_wins' && localBattle.attackerFactionId === ns.playerFactionId) {
        ns.log = [...ns.log, '전투에서 패배했다...']
      }

      ns.battle = null
      ns.phase = 'strategy'
      ns.speed = ns.prevSpeed || 1

      const active = ns.factions.filter(f => f.territories.length > 0)
      if (active.length === 1) {
        ns.isGameOver = true
        ns.winner = active[0].id
        ns.phase = 'result'
      }

      return ns
    })
  }, [localBattle, onUpdateState])

  const isMovable = (x: number, y: number) => localBattle.movablePositions.some(p => p.x === x && p.y === y)
  const isAttackable = (x: number, y: number) => localBattle.attackablePositions.some(p => p.x === x && p.y === y)
  const isSelected = (x: number, y: number) =>
    localBattle.selectedUnit?.x === x && localBattle.selectedUnit?.y === y

  // 승리 조건 텍스트
  const resultLabel = (r: string) => {
    if (r === 'attacker_wins') {
      if (localBattle.attackerFactionId === playerFactionId) return '승리!'
      return '패배...'
    }
    if (r === 'defender_wins') {
      if (localBattle.defenderFactionId === playerFactionId) return '방어 성공!'
      return '패배...'
    }
    return '무승부'
  }

  // 유닛 개수
  const countUnits = (factionId: string) => {
    let count = 0
    for (const row of localBattle.grid) for (const t of row) if (t.unit?.factionId === factionId) count++
    return count
  }

  return (
    <div className="space-y-3">
      {/* 전투 HUD */}
      <div className="flex items-center justify-between p-2 bg-stone-800 border border-stone-700 rounded text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: attackerFaction?.color }} />
            <span className="text-stone-200">{attackerFaction?.name.replace('의 세력', '')}</span>
            <span className="text-stone-500 text-[10px]">({countUnits(localBattle.attackerFactionId)})</span>
          </div>
          <span className="text-stone-500">vs</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: defenderFaction?.color }} />
            <span className="text-stone-200">{defenderFaction?.name.replace('의 세력', '')}</span>
            <span className="text-stone-500 text-[10px]">({countUnits(localBattle.defenderFactionId)})</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-stone-400">
          {localBattle.townOccupyTurns > 0 && (
            <span className="text-amber-400 text-[10px]">본진 점령 {localBattle.townOccupyTurns}/3</span>
          )}
          <span>{localBattle.turnNumber}/{localBattle.maxTurns}턴</span>
          <span className={isPlayerTurn ? 'text-amber-400' : 'text-red-400'}>
            {isPlayerTurn ? '▶ 내 턴' : aiThinking ? '⏳ 적 행동 중...' : '적 턴'}
          </span>
        </div>
      </div>

      {/* 전투 결과 */}
      {localBattle.result !== 'pending' && (
        <div className="p-4 bg-stone-800 border border-amber-500/30 rounded text-center space-y-3">
          <p className="text-xl font-bold text-stone-200">{resultLabel(localBattle.result)}</p>
          {/* 승리 조건 표시 */}
          <p className="text-xs text-stone-400">
            {localBattle.log.length > 0 && localBattle.log[localBattle.log.length - 1].type === 'system'
              ? localBattle.log[localBattle.log.length - 1].message
              : ''}
          </p>
          <button
            onClick={handleBattleComplete}
            className="px-6 py-2 bg-amber-600 rounded text-sm text-stone-900 font-bold hover:bg-amber-500"
          >
            돌아가기
          </button>
        </div>
      )}

      {/* 전장 그리드 */}
      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-0 border border-stone-600 rounded"
          style={{
            gridTemplateColumns: `repeat(${localBattle.width}, ${TILE_SIZE}px)`,
          }}
        >
          {localBattle.grid.flatMap((row, y) =>
            row.map((tile, x) => {
              const terrain = TERRAIN_INFO[tile.terrain]
              const unit = tile.unit
              const movable = isMovable(x, y)
              const attackable = isAttackable(x, y)
              const selected = isSelected(x, y)
              const isWallOrGate = tile.terrain === 'wall' || tile.terrain === 'gate'

              const dmgPreview = attackable ? getDamagePreview(x, y) : null
              const isUnactedPlayerUnit = unit && unit.factionId === playerFactionId && !unit.acted && isPlayerTurn && localBattle.phase === 'select'

              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => handleTileClick(x, y)}
                  onMouseEnter={() => attackable ? setHoverPos({ x, y }) : setHoverPos(null)}
                  onMouseLeave={() => setHoverPos(null)}
                  className={`relative flex items-center justify-center cursor-pointer border border-stone-800/30 transition-all ${
                    selected ? 'ring-2 ring-amber-400 z-10' : ''
                  } ${isUnactedPlayerUnit ? 'ring-1 ring-amber-400 animate-pulse' : ''} ${skillTargetMode ? 'hover:ring-1 hover:ring-purple-400' : ''}`}
                  style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    backgroundColor: attackable ? '#dc262644' : movable ? '#60a5fa33' : terrain.color,
                  }}
                >
                  {/* 성벽/성문 HP 바 */}
                  {isWallOrGate && tile.wallHp !== undefined && tile.wallMaxHp !== undefined && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-stone-900/60">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${(tile.wallHp / tile.wallMaxHp) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* 지형 아이콘 */}
                  {!unit && terrain.icon && (
                    <span className="text-[9px] opacity-60">{terrain.icon}</span>
                  )}

                  {/* 건물 아이콘 */}
                  {!unit && tile.building && (
                    <span className="text-[8px] opacity-40">🏗️</span>
                  )}

                  {/* 유닛 */}
                  {unit && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div
                        className="rounded-sm border-2 flex items-center justify-center"
                        style={{
                          width: TILE_SIZE - 6,
                          height: TILE_SIZE - 10,
                          borderColor: factions.find(f => f.id === unit.factionId)?.color ?? '#666',
                          backgroundColor: unit.factionId === playerFactionId ? '#1c1917' : '#292524',
                          opacity: unit.acted ? 0.5 : 1,
                        }}
                      >
                        <div className="text-center leading-none">
                          <div className="text-[8px]">{CLASS_INFO[unit.character.unitClass].icon}</div>
                          <div className="text-[7px] text-stone-200 font-bold truncate max-w-[30px]">
                            {unit.character.nickname.slice(0, 3)}
                          </div>
                        </div>
                      </div>

                      {/* HP 바 */}
                      <div className="absolute bottom-0 left-0.5 right-0.5 h-1 bg-stone-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(unit.currentHp / unit.character.maxHp) * 100}%`,
                            backgroundColor: unit.currentHp / unit.character.maxHp > 0.5 ? '#22c55e' : unit.currentHp / unit.character.maxHp > 0.2 ? '#eab308' : '#ef4444',
                          }}
                        />
                      </div>

                      {/* 병사 수 오버레이 */}
                      <div className="absolute -bottom-0.5 left-0 right-0 text-center">
                        <span className="text-[7px] text-stone-400 bg-stone-900/80 px-0.5 rounded">
                          {unit.troops}
                        </span>
                      </div>

                      {/* 주군 마크 */}
                      {unit.isLeader && (
                        <div className="absolute -top-1 -right-1 text-[7px]">👑</div>
                      )}
                    </div>
                  )}

                  {/* 이동/공격 표시 */}
                  {movable && !unit && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400/40 border border-blue-400/60" />
                  )}
                  {attackable && (
                    <div className="absolute inset-0 border-2 border-red-500/60 rounded pointer-events-none" />
                  )}
                  {/* 데미지 프리뷰 */}
                  {dmgPreview !== null && (
                    <div className="absolute top-0 right-0 px-0.5 bg-red-900/80 rounded-bl text-[8px] text-red-300 font-bold pointer-events-none">
                      -{dmgPreview}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 하단 컨트롤 + 스킬 메뉴 */}
      <div className="flex items-start gap-3">
        {/* 선택 유닛 정보 + 액션 버튼 */}
        <div className="flex-1 space-y-2">
          {/* 유닛 상세 */}
          {localBattle.selectedUnit && (
            <div className="flex items-center gap-3 p-2 bg-stone-800 border border-stone-700 rounded text-xs">
              <div className="flex items-center gap-1">
                <span>{CLASS_INFO[localBattle.selectedUnit.character.unitClass].icon}</span>
                <span className="text-stone-200 font-bold">{localBattle.selectedUnit.character.nickname}</span>
              </div>
              <span className="text-stone-400">
                HP {localBattle.selectedUnit.currentHp}/{localBattle.selectedUnit.character.maxHp}
              </span>
              <span className="text-stone-400">
                兵 {localBattle.selectedUnit.troops}
              </span>
              <span className="text-stone-400">
                士 {localBattle.selectedUnit.morale}
              </span>
              <span className="text-stone-500">
                攻{localBattle.selectedUnit.character.stats.power} 防{localBattle.selectedUnit.character.stats.stamina} 射{SHOOT_RANGE[localBattle.selectedUnit.character.unitClass] || 1}
              </span>
              {skillTargetMode && (
                <span className="text-purple-400 text-[10px]">
                  [{skillTargetMode.name}] 대상 선택
                </span>
              )}
            </div>
          )}

          {!localBattle.selectedUnit && isPlayerTurn && (
            <div className="text-xs text-stone-500 p-2">유닛을 선택하세요</div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            {localBattle.phase === 'action' && isPlayerTurn && localBattle.selectedUnit && (
              <>
                <button
                  onClick={() => setShowSkillMenu(prev => !prev)}
                  className="px-3 py-1 bg-purple-800 rounded text-xs text-purple-200 hover:bg-purple-700"
                >
                  스킬
                </button>
                <button
                  onClick={() => {
                    setShowSkillMenu(false)
                    setSkillTargetMode(null)
                    setLocalBattle(endUnitAction(localBattle))
                  }}
                  className="px-3 py-1 bg-stone-700 rounded text-xs text-stone-300 hover:bg-stone-600"
                >
                  대기
                </button>
              </>
            )}
            {skillTargetMode && (
              <button
                onClick={() => { setSkillTargetMode(null); setShowSkillMenu(false) }}
                className="px-3 py-1 bg-stone-700 rounded text-xs text-red-300 hover:bg-stone-600"
              >
                취소
              </button>
            )}
            {isPlayerTurn && localBattle.result === 'pending' && (
              <button
                onClick={handleEndTurn}
                className="px-3 py-1 bg-amber-700 rounded text-xs text-stone-100 hover:bg-amber-600"
              >
                턴 종료
              </button>
            )}
          </div>
        </div>

        {/* 스킬 메뉴 패널 */}
        {showSkillMenu && localBattle.selectedUnit && isPlayerTurn && (
          <div className="w-48">
            <SkillMenu
              unit={localBattle.selectedUnit}
              onUseSkill={handleUseSkill}
              onCancel={() => { setShowSkillMenu(false); setSkillTargetMode(null) }}
            />
          </div>
        )}
      </div>

      {/* 전투 로그 */}
      <div className="max-h-24 overflow-y-auto p-2 bg-stone-800 border border-stone-700 rounded text-[10px] text-stone-400 space-y-0.5">
        {localBattle.log.slice(-12).reverse().map((entry, i) => (
          <p key={i} className={
            entry.type === 'death' ? 'text-red-400' :
            entry.type === 'attack' ? 'text-stone-300' :
            entry.type === 'wall' ? 'text-amber-400' :
            entry.type === 'morale' ? 'text-green-400' :
            entry.type === 'tactic' ? 'text-purple-400' :
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
