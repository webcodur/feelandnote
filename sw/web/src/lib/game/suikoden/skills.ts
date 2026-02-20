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
  if (alive.length === 0) return ['defend'] // 최소 방어는 가능

  const tacticSet = new Set<TacticType>()
  for (const p of alive) {
    const available = CLASS_AVAILABLE_TACTICS[p.character.unitClass] ?? ['defend']
    for (const t of available) tacticSet.add(t)
  }
  return Array.from(tacticSet)
}

/** 전술 대결 판정 → BattleRound 반환 */
export function resolveTacticClash(
  attackers: BattleParticipant[],
  defenders: BattleParticipant[],
  atkTactic: TacticType,
  defTactic: TacticType,
  roundNumber: number,
  defenderHasWalls: boolean,
): BattleRound {
  // 공격측 대표 (리더 우선, 없으면 첫 생존자)
  const atkAlive = attackers.filter(p => !p.isDefeated)
  const defAlive = defenders.filter(p => !p.isDefeated)
  const atkLeader = atkAlive.find(p => p.isLeader) ?? atkAlive[0]
  const defLeader = defAlive.find(p => p.isLeader) ?? defAlive[0]

  if (!atkLeader || !defLeader) {
    return {
      roundNumber,
      attackerTactic: atkTactic,
      defenderTactic: defTactic,
      attackerDamage: 0,
      defenderDamage: 0,
      attackerTroopLoss: 0,
      defenderTroopLoss: 0,
      narrative: '전투 속행 불가.',
    }
  }

  // 공격측 → 방어측 피해
  const atkResult = calcTacticDamage(atkLeader, defLeader, atkTactic, defTactic, defenderHasWalls)
  // 방어측 → 공격측 피해
  const defResult = calcTacticDamage(defLeader, atkLeader, defTactic, atkTactic, false)

  // 피해 분배 (전체 참가자에게 분산)
  distributeParticipantDamage(defAlive, atkResult.damage, atkResult.troopLoss)
  distributeParticipantDamage(atkAlive, defResult.damage, defResult.troopLoss)

  // 사기 변동 적용
  if (atkTactic === 'morale') {
    for (const p of atkAlive) p.morale = Math.min(100, p.morale + atkResult.moraleDelta)
  }
  if (defTactic === 'morale') {
    for (const p of defAlive) p.morale = Math.min(100, p.morale + defResult.moraleDelta)
  }

  // 피해로 인한 사기 하락
  if (atkResult.damage > 0) {
    for (const p of defAlive) p.morale = Math.max(0, p.morale - 3)
  }
  if (defResult.damage > 0) {
    for (const p of atkAlive) p.morale = Math.max(0, p.morale - 3)
  }

  // 패배 판정 (HP 0 이하 또는 병사 0)
  for (const p of [...atkAlive, ...defAlive]) {
    if (p.character.hp <= 0 || p.troops <= 0) {
      p.isDefeated = true
    }
  }

  // 전투 서술 생성
  const matchup = TACTIC_MATCHUP[atkTactic][defTactic]
  const atkInfo = TACTIC_INFO[atkTactic]
  const defInfo = TACTIC_INFO[defTactic]
  let narrative = `${atkLeader.character.nickname}의 ${atkInfo.name} vs ${defLeader.character.nickname}의 ${defInfo.name}. `
  if (matchup > 1.2) narrative += `${atkInfo.name}이(가) ${defInfo.name}을(를) 압도했다!`
  else if (matchup < 0.8) narrative += `${defInfo.name}이(가) ${atkInfo.name}을(를) 막아냈다!`
  else narrative += '호각의 접전이 벌어졌다.'

  // 패자 서술
  const newDefDefeated = defAlive.filter(p => p.isDefeated)
  const newAtkDefeated = atkAlive.filter(p => p.isDefeated)
  for (const p of newDefDefeated) narrative += ` ${p.character.nickname} 쓰러졌다!`
  for (const p of newAtkDefeated) narrative += ` ${p.character.nickname} 쓰러졌다!`

  return {
    roundNumber,
    attackerTactic: atkTactic,
    defenderTactic: defTactic,
    attackerDamage: atkResult.damage,
    defenderDamage: defResult.damage,
    attackerTroopLoss: atkResult.troopLoss,
    defenderTroopLoss: defResult.troopLoss,
    narrative,
  }
}

/** 피해를 참가자들에게 균등 분배 */
function distributeParticipantDamage(targets: BattleParticipant[], totalDamage: number, totalTroopLoss: number) {
  if (targets.length === 0) return

  const perUnit = Math.ceil(totalDamage / targets.length)
  const perTroop = Math.ceil(totalTroopLoss / targets.length)

  for (const t of targets) {
    if (t.isDefeated) continue
    t.character.hp = Math.max(0, t.character.hp - perUnit)
    t.troops = Math.max(0, t.troops - perTroop)
  }
}

/** 병과별 전술 위력 보정 조회 */
export function getTacticClassBonus(unitClass: UnitClass, tactic: TacticType): number {
  return CLASS_TACTIC_BONUS[unitClass]?.[tactic] ?? 0
}
