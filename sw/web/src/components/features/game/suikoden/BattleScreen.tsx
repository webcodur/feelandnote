'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GameState, TacticType } from '@/lib/game/suikoden/types'
import { TACTIC_INFO, BATTLE_MAX_ROUNDS } from '@/lib/game/suikoden/constants'
import { selectPlayerTactic, selectAITactic, resolveRound, checkBattleResult, applyBattleResult, collectDispositionTargets } from '@/lib/game/suikoden/engine'
import { getAvailableTactics } from '@/lib/game/suikoden/skills'
import BattleParticipantCard from './BattleParticipantCard'
import TacticSelectPanel from './TacticSelectPanel'

interface Props {
  state: GameState
  onUpdateState: (fn: (s: GameState) => GameState) => void
}

export default function BattleScreen({ state, onUpdateState }: Props) {
  const battle = state.battle!
  const factions = state.factions
  const playerFactionId = state.playerFactionId
  const isPlayerAttacker = battle.attackerFactionId === playerFactionId

  const [selectedTactic, setSelectedTactic] = useState<TacticType | null>(null)
  const [resolving, setResolving] = useState(false)

  const attackerFaction = factions.find(f => f.id === battle.attackerFactionId)
  const defenderFaction = factions.find(f => f.id === battle.defenderFactionId)

  // 플레이어 참가자
  const playerParticipants = isPlayerAttacker ? battle.attackers : battle.defenders
  const enemyParticipants = isPlayerAttacker ? battle.defenders : battle.attackers
  const playerAvailableTactics = getAvailableTactics(playerParticipants)

  // AI 성격
  const enemyFaction = factions.find(f => f.id === (isPlayerAttacker ? battle.defenderFactionId : battle.attackerFactionId))
  const aiPersonality = enemyFaction?.aiPersonality ?? 'economist'

  // 전술 선택 → 라운드 해결
  const handleConfirmTactic = useCallback(() => {
    if (!selectedTactic || resolving) return
    setResolving(true)

    // 1. 플레이어 전술 적용
    let b = selectPlayerTactic(battle, selectedTactic)

    // 2. AI 전술 선택
    const aiTactic = selectAITactic(b, aiPersonality)

    // 3. 공격/방어 전술 결정
    const atkTactic = isPlayerAttacker ? selectedTactic : aiTactic
    const defTactic = isPlayerAttacker ? aiTactic : selectedTactic

    // 4. 라운드 해결
    b = resolveRound(b, atkTactic, defTactic)

    // 5. 전투 결과 확인
    b = checkBattleResult(b)

    // 애니메이션 딜레이 후 state 반영
    setTimeout(() => {
      onUpdateState(s => ({ ...s, battle: b }))
      setSelectedTactic(null)
      setResolving(false)
    }, 1200)
  }, [battle, selectedTactic, resolving, isPlayerAttacker, aiPersonality, onUpdateState])

  // 전투 종료 처리
  const handleBattleComplete = useCallback(() => {
    onUpdateState(s => {
      const b = s.battle!
      let ns = applyBattleResult(s, b)

      // 패배 장수 수집 (플레이어 승리 시)
      const targets = collectDispositionTargets(b, s.playerFactionId)
      if (targets.length > 0) {
        // disposition 화면으로 전환
        return {
          ...ns,
          phase: 'disposition',
          disposition: { targets, currentIndex: 0, results: [] },
        }
      }

      // 처분 대상 없으면 기존 흐름
      ns = { ...ns, battle: null, phase: 'strategy' }
      const active = ns.factions.filter(f => f.territories.length > 0)
      if (active.length === 1) {
        ns = { ...ns, isGameOver: true, winner: active[0].id, phase: 'result' }
      }
      return ns
    })
  }, [onUpdateState])

  // 유닛 수
  const countAlive = (participants: typeof battle.attackers) =>
    participants.filter(p => !p.isDefeated).length

  // 전투 결과 텍스트
  const resultLabel = () => {
    if (battle.result === 'attacker_wins') {
      return isPlayerAttacker ? '승리!' : '패배...'
    }
    if (battle.result === 'defender_wins') {
      return !isPlayerAttacker ? '방어 성공!' : '패배...'
    }
    return '무승부'
  }

  // 최신 라운드
  const lastRound = battle.rounds.length > 0 ? battle.rounds[battle.rounds.length - 1] : null

  return (
    <div className="space-y-3">
      {/* 전투 HUD */}
      <div className="flex items-center justify-between p-2 bg-stone-800 border border-stone-700 rounded text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: attackerFaction?.color }} />
            <span className="text-stone-200">{attackerFaction?.name.replace('의 세력', '')}</span>
            <span className="text-stone-500 text-[10px]">({countAlive(battle.attackers)})</span>
          </div>
          <span className="text-stone-500">vs</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: defenderFaction?.color }} />
            <span className="text-stone-200">{defenderFaction?.name.replace('의 세력', '')}</span>
            <span className="text-stone-500 text-[10px]">({countAlive(battle.defenders)})</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-stone-400">
          {battle.defenderHasWalls && (
            <span className="text-amber-400 text-[10px]">[성벽]</span>
          )}
          <span>라운드 {battle.roundNumber}/{battle.maxRounds}</span>
        </div>
      </div>

      {/* 전투 결과 */}
      {battle.result !== 'pending' && (
        <div className="p-4 bg-stone-800 border border-amber-500/30 rounded text-center space-y-3">
          <p className="text-xl font-bold text-stone-200">{resultLabel()}</p>
          {lastRound && (
            <p className="text-xs text-stone-400">{lastRound.narrative}</p>
          )}
          <button
            onClick={handleBattleComplete}
            className="px-6 py-2 bg-amber-600 rounded text-sm text-stone-900 font-bold hover:bg-amber-500"
          >
            돌아가기
          </button>
        </div>
      )}

      {/* 참가자 카드 + 전술 선택 */}
      {battle.result === 'pending' && (
        <>
          {/* 양측 참가자 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 공격측 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-300">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: attackerFaction?.color }} />
                공격
              </div>
              <div className="space-y-1.5">
                {battle.attackers.map((p, i) => (
                  <BattleParticipantCard
                    key={i}
                    participant={p}
                    isPlayer={p.factionId === playerFactionId}
                  />
                ))}
              </div>
            </div>

            {/* 방어측 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-300">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: defenderFaction?.color }} />
                방어
                {battle.defenderHasWalls && <span className="text-[9px] text-amber-400">[성벽]</span>}
              </div>
              <div className="space-y-1.5">
                {battle.defenders.map((p, i) => (
                  <BattleParticipantCard
                    key={i}
                    participant={p}
                    isPlayer={p.factionId === playerFactionId}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 라운드 결과 서술 */}
          {lastRound && (
            <div className="p-3 bg-stone-800 border border-stone-700 rounded">
              <div className="flex items-center gap-2 text-xs mb-1.5">
                <span className="text-stone-500">라운드 {lastRound.roundNumber}</span>
                <span className="text-amber-300">{TACTIC_INFO[lastRound.attackerTactic].icon} {TACTIC_INFO[lastRound.attackerTactic].name}</span>
                <span className="text-stone-500">vs</span>
                <span className="text-red-300">{TACTIC_INFO[lastRound.defenderTactic].icon} {TACTIC_INFO[lastRound.defenderTactic].name}</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">{lastRound.narrative}</p>
              <div className="flex gap-4 mt-1.5 text-[10px] text-stone-500">
                <span>공격측 피해: {lastRound.attackerDamage} (병력 -{lastRound.attackerTroopLoss})</span>
                <span>방어측 피해: {lastRound.defenderDamage} (병력 -{lastRound.defenderTroopLoss})</span>
              </div>
            </div>
          )}

          {/* 전술 선택 패널 */}
          {battle.phase === 'tactic_select' && (
            <div className="space-y-2">
              <TacticSelectPanel
                availableTactics={playerAvailableTactics}
                selectedTactic={selectedTactic}
                onSelect={setSelectedTactic}
                disabled={resolving}
              />
              <button
                onClick={handleConfirmTactic}
                disabled={!selectedTactic || resolving}
                className="w-full py-2.5 bg-amber-600 rounded text-sm text-stone-900 font-bold hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {resolving ? '판정 중...' : selectedTactic ? `${TACTIC_INFO[selectedTactic].name} 실행` : '전술을 선택하세요'}
              </button>
            </div>
          )}

          {/* 해결 중 표시 */}
          {resolving && (
            <div className="text-center py-4">
              <span className="text-amber-400 text-sm animate-pulse">전술 판정 중...</span>
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
            entry.type === 'tactic' ? 'text-purple-400' :
            entry.type === 'morale' ? 'text-green-400' :
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
