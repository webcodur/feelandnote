// 천도 — 스킬 시스템 (개별 유닛 턴제)

import type { BattleUnit, BattleParticipant, TacticType, UnitClass } from './types'
import { SKILL_DEFS, TACTIC_MATCHUP, CLASS_TACTIC_BONUS, TACTIC_INFO, type SkillDef } from './constants'
import { calcTacticDamage } from './utils'

// ── 유닛의 사용 가능 스킬 목록 ──

export function getAvailableSkills(unit: BattleUnit): SkillDef[] {
  const result: SkillDef[] = []
  const unitClass = unit.character.unitClass
  const stats = unit.character.stats
  const profession = unit.character.profession

  for (const [, skillDef] of Object.entries(SKILL_DEFS)) {
    // 병과 체크 (leader → general 매핑이므로 추가 체크)
    if (!skillDef.classes.includes(unitClass)) continue

    // 성인 스킬 (heal, barrier)은 leader profession만
    if ((skillDef.id === 'heal' || skillDef.id === 'barrier') && profession !== 'leader') continue

    // 스탯 요구사항 체크
    if (skillDef.statReq) {
      const statVal = stats[skillDef.statReq.stat] ?? 0
      if (statVal < skillDef.statReq.min) continue
    }

    result.push(skillDef)
  }

  return result
}

/** 유닛의 가능한 행동 목록 */
export function getAvailableActions(unit: BattleUnit): string[] {
  const actions = ['attack', 'defend', 'retreat']
  const skills = getAvailableSkills(unit)
  for (const s of skills) {
    actions.push(`skill:${s.id}`)
  }
  return actions
}

// ── 레거시 호환: 전술 상성 시스템 ──

const CLASS_AVAILABLE_TACTICS: Record<UnitClass, TacticType[]> = {
  general:    ['charge', 'defend', 'morale', 'feint'],
  strategist: ['stratagem', 'fire', 'defend', 'feint'],
  artisan:    ['defend', 'fire', 'feint', 'charge'],
  official:   ['defend', 'stratagem', 'morale', 'feint'],
  artist:     ['morale', 'defend', 'stratagem', 'feint'],
  ranger:     ['feint', 'fire', 'charge', 'defend'],
}

/** 참가자들의 병과를 종합하여 사용 가능한 전술 목록 반환 (레거시) */
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

/** 전술 대결 판정 결과 (레거시) */
export interface TacticClashResult {
  round: { roundNumber: number; attackerTactic: TacticType; defenderTactic: TacticType; attackerDamage: number; defenderDamage: number; attackerTroopLoss: number; defenderTroopLoss: number; narrative: string }
  attackers: BattleParticipant[]
  defenders: BattleParticipant[]
}

/** 전술 대결 판정 (레거시) */
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
      round: { roundNumber, attackerTactic: atkTactic, defenderTactic: defTactic, attackerDamage: 0, defenderDamage: 0, attackerTroopLoss: 0, defenderTroopLoss: 0, narrative: '전투 속행 불가.' },
      attackers, defenders,
    }
  }

  const atkResult = calcTacticDamage(atkLeader, defLeader, atkTactic, defTactic, defenderHasWalls)
  const defResult = calcTacticDamage(defLeader, atkLeader, defTactic, atkTactic, false)

  let newDefenders = _applyDamage(defenders, atkResult.damage, atkResult.troopLoss)
  let newAttackers = _applyDamage(attackers, defResult.damage, defResult.troopLoss)

  if (atkTactic === 'morale') newAttackers = newAttackers.map(p => p.isDefeated ? p : { ...p, morale: Math.min(100, p.morale + atkResult.moraleDelta) })
  if (defTactic === 'morale') newDefenders = newDefenders.map(p => p.isDefeated ? p : { ...p, morale: Math.min(100, p.morale + defResult.moraleDelta) })
  if (atkResult.damage > 0) newDefenders = newDefenders.map(p => p.isDefeated ? p : { ...p, morale: Math.max(0, p.morale - 3) })
  if (defResult.damage > 0) newAttackers = newAttackers.map(p => p.isDefeated ? p : { ...p, morale: Math.max(0, p.morale - 3) })

  newAttackers = newAttackers.map(p => !p.isDefeated && (p.character.hp <= 0 || p.troops <= 0) ? { ...p, isDefeated: true } : p)
  newDefenders = newDefenders.map(p => !p.isDefeated && (p.character.hp <= 0 || p.troops <= 0) ? { ...p, isDefeated: true } : p)

  const matchup = TACTIC_MATCHUP[atkTactic][defTactic]
  const atkInfo = TACTIC_INFO[atkTactic]
  const defInfo = TACTIC_INFO[defTactic]
  let narrative = `${atkLeader.character.nickname}의 ${atkInfo.name} vs ${defLeader.character.nickname}의 ${defInfo.name}. `
  if (matchup > 1.2) narrative += `${atkInfo.name}이(가) ${defInfo.name}을(를) 압도했다!`
  else if (matchup < 0.8) narrative += `${defInfo.name}이(가) ${atkInfo.name}을(를) 막아냈다!`
  else narrative += '호각의 접전이 벌어졌다.'

  const newDefDefeated = newDefenders.filter(p => p.isDefeated && !defenders.find(d => d.character.id === p.character.id)?.isDefeated)
  const newAtkDefeated = newAttackers.filter(p => p.isDefeated && !attackers.find(a => a.character.id === p.character.id)?.isDefeated)
  for (const p of newDefDefeated) narrative += ` ${p.character.nickname} 쓰러졌다!`
  for (const p of newAtkDefeated) narrative += ` ${p.character.nickname} 쓰러졌다!`

  return {
    round: { roundNumber, attackerTactic: atkTactic, defenderTactic: defTactic, attackerDamage: atkResult.damage, defenderDamage: defResult.damage, attackerTroopLoss: atkResult.troopLoss, defenderTroopLoss: defResult.troopLoss, narrative },
    attackers: newAttackers,
    defenders: newDefenders,
  }
}

function _applyDamage(targets: BattleParticipant[], totalDamage: number, totalTroopLoss: number): BattleParticipant[] {
  const alive = targets.filter(p => !p.isDefeated)
  if (alive.length === 0) return targets
  const perUnit = Math.ceil(totalDamage / alive.length)
  const perTroop = Math.ceil(totalTroopLoss / alive.length)
  return targets.map(t => {
    if (t.isDefeated) return t
    return { ...t, character: { ...t.character, hp: Math.max(0, t.character.hp - perUnit) }, troops: Math.max(0, t.troops - perTroop) }
  })
}

/** 병과별 전술 위력 보정 조회 (레거시) */
export function getTacticClassBonus(unitClass: UnitClass, tactic: TacticType): number {
  return CLASS_TACTIC_BONUS[unitClass]?.[tactic] ?? 0
}
