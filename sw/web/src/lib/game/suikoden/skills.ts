// 천도 — 전술 판정 헬퍼

import type { BattleParticipant, BattleRound, TacticType, UnitClass } from './types'
import { TACTIC_MATCHUP, CLASS_TACTIC_BONUS, TACTIC_INFO } from './constants'
import { calcTacticDamage } from './utils'

// ── 병과별 사용 가능 전술 ──

const CLASS_AVAILABLE_TACTICS: Record<UnitClass, TacticType[]> = {
  general:    ['charge', 'defend', 'morale', 'feint'],
  strategist: ['stratagem', 'fire', 'defend', 'feint'],
  artisan:    ['defend', 'fire', 'feint', 'charge'],
  official:   ['defend', 'stratagem', 'morale', 'feint'],
  artist:     ['morale', 'defend', 'stratagem', 'feint'],
  ranger:     ['feint', 'fire', 'charge', 'defend'],
}

/** 참가자들의 병과를 종합하여 사용 가능한 전술 목록 반환 */
export function getAvailableTactics(participants: BattleParticipant[]): TacticType[] {
  const alive = participants.filter(p => !p.isDefeated)
  if (alive.length === 0) return ['defend']

  const tacticSet = new Set<TacticType>()
  for (const p of alive) {
    const available = CLASS_AVAILABLE_TACTICS[p.character.unitClass] ?? ['defend']
    for (const t of available) tacticSet.add(t)
  }
  return Array.from(tacticSet)
}

/** 전술 대결 판정 결과 */
export interface TacticClashResult {
  round: BattleRound
  attackers: BattleParticipant[]
  defenders: BattleParticipant[]
}

/** 전술 대결 판정 — 불변: 새 배열 반환 */
export function resolveTacticClash(
  attackers: BattleParticipant[],
  defenders: BattleParticipant[],
  atkTactic: TacticType,
  defTactic: TacticType,
  roundNumber: number,
  defenderHasWalls: boolean,
): TacticClashResult {
  const atkAlive = attackers.filter(p => !p.isDefeated)
  const defAlive = defenders.filter(p => !p.isDefeated)
  const atkLeader = atkAlive.find(p => p.isLeader) ?? atkAlive[0]
  const defLeader = defAlive.find(p => p.isLeader) ?? defAlive[0]

  if (!atkLeader || !defLeader) {
    return {
      round: {
        roundNumber,
        attackerTactic: atkTactic,
        defenderTactic: defTactic,
        attackerDamage: 0,
        defenderDamage: 0,
        attackerTroopLoss: 0,
        defenderTroopLoss: 0,
        narrative: '전투 속행 불가.',
      },
      attackers,
      defenders,
    }
  }

  // 공격측 → 방어측 피해
  const atkResult = calcTacticDamage(atkLeader, defLeader, atkTactic, defTactic, defenderHasWalls)
  // 방어측 → 공격측 피해
  const defResult = calcTacticDamage(defLeader, atkLeader, defTactic, atkTactic, false)

  // 피해 분배 (새 배열 반환)
  let newDefenders = applyDamage(defenders, atkResult.damage, atkResult.troopLoss)
  let newAttackers = applyDamage(attackers, defResult.damage, defResult.troopLoss)

  // 사기 변동 적용
  if (atkTactic === 'morale') {
    newAttackers = newAttackers.map(p =>
      p.isDefeated ? p : { ...p, morale: Math.min(100, p.morale + atkResult.moraleDelta) }
    )
  }
  if (defTactic === 'morale') {
    newDefenders = newDefenders.map(p =>
      p.isDefeated ? p : { ...p, morale: Math.min(100, p.morale + defResult.moraleDelta) }
    )
  }

  // 피해로 인한 사기 하락
  if (atkResult.damage > 0) {
    newDefenders = newDefenders.map(p =>
      p.isDefeated ? p : { ...p, morale: Math.max(0, p.morale - 3) }
    )
  }
  if (defResult.damage > 0) {
    newAttackers = newAttackers.map(p =>
      p.isDefeated ? p : { ...p, morale: Math.max(0, p.morale - 3) }
    )
  }

  // 패배 판정 (HP 0 이하 또는 병사 0)
  newAttackers = newAttackers.map(p =>
    !p.isDefeated && (p.character.hp <= 0 || p.troops <= 0) ? { ...p, isDefeated: true } : p
  )
  newDefenders = newDefenders.map(p =>
    !p.isDefeated && (p.character.hp <= 0 || p.troops <= 0) ? { ...p, isDefeated: true } : p
  )

  // 전투 서술 생성
  const matchup = TACTIC_MATCHUP[atkTactic][defTactic]
  const atkInfo = TACTIC_INFO[atkTactic]
  const defInfo = TACTIC_INFO[defTactic]
  let narrative = `${atkLeader.character.nickname}의 ${atkInfo.name} vs ${defLeader.character.nickname}의 ${defInfo.name}. `
  if (matchup > 1.2) narrative += `${atkInfo.name}이(가) ${defInfo.name}을(를) 압도했다!`
  else if (matchup < 0.8) narrative += `${defInfo.name}이(가) ${atkInfo.name}을(를) 막아냈다!`
  else narrative += '호각의 접전이 벌어졌다.'

  // 패자 서술
  const newDefDefeated = newDefenders.filter(p => p.isDefeated && !defenders.find(d => d.character.id === p.character.id)?.isDefeated)
  const newAtkDefeated = newAttackers.filter(p => p.isDefeated && !attackers.find(a => a.character.id === p.character.id)?.isDefeated)
  for (const p of newDefDefeated) narrative += ` ${p.character.nickname} 쓰러졌다!`
  for (const p of newAtkDefeated) narrative += ` ${p.character.nickname} 쓰러졌다!`

  return {
    round: {
      roundNumber,
      attackerTactic: atkTactic,
      defenderTactic: defTactic,
      attackerDamage: atkResult.damage,
      defenderDamage: defResult.damage,
      attackerTroopLoss: atkResult.troopLoss,
      defenderTroopLoss: defResult.troopLoss,
      narrative,
    },
    attackers: newAttackers,
    defenders: newDefenders,
  }
}

/** 피해를 참가자들에게 균등 분배 (불변) */
function applyDamage(targets: BattleParticipant[], totalDamage: number, totalTroopLoss: number): BattleParticipant[] {
  const alive = targets.filter(p => !p.isDefeated)
  if (alive.length === 0) return targets

  const perUnit = Math.ceil(totalDamage / alive.length)
  const perTroop = Math.ceil(totalTroopLoss / alive.length)

  return targets.map(t => {
    if (t.isDefeated) return t
    return {
      ...t,
      character: { ...t.character, hp: Math.max(0, t.character.hp - perUnit) },
      troops: Math.max(0, t.troops - perTroop),
    }
  })
}

/** 병과별 전술 위력 보정 조회 */
export function getTacticClassBonus(unitClass: UnitClass, tactic: TacticType): number {
  return CLASS_TACTIC_BONUS[unitClass]?.[tactic] ?? 0
}
