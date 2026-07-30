// 천도 — 개별 유닛 턴제 전투 엔진

import type {
  BattleState, BattleUnit, BattleAction, BattleActionType, BattleLogEntry,
  GameCharacter, GridPosition, Faction, TerritoryId, StatusEffect, BattleParticipant,
} from './types'
import {
  BATTLE_MAX_TURNS, BATTLE_GRID_ROWS, BATTLE_GRID_COLS,
  CLASS_SPEED_BONUS, CLASS_ATTACK_MULT, CLASS_DEFAULT_ROW,
  SKILL_DEFS,
} from './constants'
import { getAvailableSkills } from './skills'

// ── HP 공식 ──

function calcUnitHp(character: GameCharacter): number {
  const { command, martial } = character.stats
  const baseHp = 300 + command * 2.0 + martial * 1.0
  const troopRatio = character.maxTroops > 0
    ? Math.max(0, Math.min(1, character.troops / character.maxTroops))
    : 0
  const healthRatio = character.maxHp > 0
    ? Math.max(0, Math.min(1, character.hp / character.maxHp))
    : 0
  // 기존 부상과 병력 손실이 다음 전투의 실제 전력에도 이어진다.
  return Math.max(10, Math.round(baseHp * (0.25 + troopRatio * 0.75) * healthRatio))
}

// ── 속도 공식 ──

function calcSpeed(character: GameCharacter): number {
  return 10 + (CLASS_SPEED_BONUS[character.unitClass] ?? 0) + Math.floor(character.stats.martial / 25)
}

// ── 유닛 생성 ──

function createBattleUnit(
  character: GameCharacter,
  factionId: string,
  position: GridPosition,
  isLeader: boolean,
): BattleUnit {
  const maxHp = calcUnitHp(character)
  return {
    id: character.id,
    character: { ...character },
    factionId,
    position,
    hp: maxHp,
    maxHp,
    morale: character.morale,
    isDefeated: false,
    isLeader,
    statusEffects: [],
  }
}

// ── 자동 배치 ──

function autoPlaceUnits(
  characters: GameCharacter[],
  factionId: string,
  leaderId: string,
): BattleUnit[] {
  const units: BattleUnit[] = []
  // 행별 인원 추적
  const rowCounts = [0, 0, 0]

  // 등급순 정렬 (높은 순)
  const sorted = [...characters].sort((a, b) => b.totalScore - a.totalScore)

  for (const char of sorted) {
    const defaultRow = CLASS_DEFAULT_ROW[char.unitClass] ?? 1
    // 행이 꽉 찼으면 다음 행
    let row = defaultRow
    if (rowCounts[row] >= BATTLE_GRID_COLS) {
      row = [0, 1, 2].find(r => rowCounts[r] < BATTLE_GRID_COLS) ?? 0
    }
    const col = rowCounts[row]
    rowCounts[row]++

    units.push(createBattleUnit(char, factionId, { row, col }, char.id === leaderId))
  }

  return units
}

// ── 턴 오더 계산 ──

function calcTurnOrder(allies: BattleUnit[], enemies: BattleUnit[]): string[] {
  const allUnits = [...allies, ...enemies].filter(u => !u.isDefeated)
  // 속도 내림차순 → 같으면 이름순(결정론적)
  allUnits.sort((a, b) => {
    const sa = calcSpeed(a.character)
    const sb = calcSpeed(b.character)
    if (sb !== sa) return sb - sa
    return a.character.nickname.localeCompare(b.character.nickname)
  })
  return allUnits.map(u => u.id)
}

// ── 전투 초기화 ──

export function initBattleState(
  attackerFaction: Faction,
  defenderFaction: Faction,
  attackerCharIds: string[],
  defenderCharIds: string[],
  defenderTerritoryId: TerritoryId | null,
  playerFactionId: string,
): BattleState {
  const defTerritory = defenderTerritoryId
    ? defenderFaction.territories.find(t => t.id === defenderTerritoryId)
    : defenderFaction.territories[0]

  const hasWalls = defTerritory?.buildingCards.some(
    c => c.defId === 'walls' && !c.isConstructing
  ) ?? false

  const atkChars = attackerCharIds
    .map(id => attackerFaction.members.find(m => m.id === id))
    .filter((c): c is GameCharacter => c !== null && c !== undefined)

  const defChars = defenderCharIds
    .map(id => defenderFaction.members.find(m => m.id === id))
    .filter((c): c is GameCharacter => c !== null && c !== undefined)

  // 플레이어 시점에서 allies/enemies 결정
  const isPlayerAttacker = attackerFaction.id === playerFactionId
  const allyChars = isPlayerAttacker ? atkChars : defChars
  const enemyChars = isPlayerAttacker ? defChars : atkChars
  const allyFactionId = isPlayerAttacker ? attackerFaction.id : defenderFaction.id
  const enemyFactionId = isPlayerAttacker ? defenderFaction.id : attackerFaction.id
  const allyLeaderId = isPlayerAttacker ? attackerFaction.leaderId : defenderFaction.leaderId
  const enemyLeaderId = isPlayerAttacker ? defenderFaction.leaderId : attackerFaction.leaderId

  const allies = autoPlaceUnits(allyChars, allyFactionId, allyLeaderId)
  const enemies = autoPlaceUnits(enemyChars, enemyFactionId, enemyLeaderId)

  const turnOrder = calcTurnOrder(allies, enemies)

  // 레거시 호환용 BattleParticipant 생성
  const toLegacy = (chars: GameCharacter[], faction: Faction): BattleParticipant[] =>
    chars.map(c => ({
      character: { ...c },
      factionId: faction.id,
      troops: c.troops,
      morale: c.morale,
      isLeader: c.id === faction.leaderId,
      isDefeated: false,
    }))

  return {
    allies,
    enemies,
    attackerFactionId: attackerFaction.id,
    defenderFactionId: defenderFaction.id,
    defenderTerritoryId: defenderTerritoryId ?? null,
    turnOrder,
    currentTurnIndex: 0,
    turnNumber: 1,
    maxTurns: BATTLE_MAX_TURNS,
    phase: 'placement',
    log: [{ turn: 1, message: '전투 개시!', type: 'system' }],
    result: 'pending',
    defenderHasWalls: hasWalls,
    allyMorale: 100,
    enemyMorale: 100,
    animation: null,
    // 레거시
    attackers: toLegacy(atkChars, attackerFaction),
    defenders: toLegacy(defChars, defenderFaction),
  }
}

// ── 유효 타겟 ──

export function getValidTargets(
  state: BattleState,
  actorId: string,
  actionType: BattleActionType,
  skillId?: string,
): string[] {
  const actor = findUnit(state, actorId)
  if (!actor) return []

  const isAlly = state.allies.some(u => u.id === actorId)
  const friendlies = isAlly ? state.allies : state.enemies
  const hostiles = isAlly ? state.enemies : state.allies

  const aliveHostiles = hostiles.filter(u => !u.isDefeated)
  const aliveFriendlies = friendlies.filter(u => !u.isDefeated)

  if (actionType === 'attack') {
    // 근접: 전열 우선
    return getTargetsByRow(aliveHostiles)
  }

  if (actionType === 'ranged' || actionType === 'skill') {
    const skill = skillId ? SKILL_DEFS[skillId] : null
    if (skill) {
      switch (skill.targetType) {
        case 'single_enemy':
          return skill.isRanged
            ? aliveHostiles.map(u => u.id)
            : getTargetsByRow(aliveHostiles)
        case 'single_ally':
          return aliveFriendlies.filter(u => u.id !== actorId).map(u => u.id)
        case 'row_enemy':
          // 행 번호 반환 (0,1,2 중 적이 있는 행)
          return [...new Set(aliveHostiles.map(u => u.position.row))].map(String)
        case 'all_ally':
        case 'all_enemy':
        case 'self':
          return [actorId]  // 확인용 셀프 타겟
      }
    }
    // 원거리 기본
    return aliveHostiles.map(u => u.id)
  }

  if (actionType === 'defend' || actionType === 'retreat') {
    return [actorId]
  }

  return []
}

/** 전열 우선 타겟 목록 */
function getTargetsByRow(hostiles: BattleUnit[]): string[] {
  for (let row = 0; row < BATTLE_GRID_ROWS; row++) {
    const rowUnits = hostiles.filter(u => u.position.row === row)
    if (rowUnits.length > 0) return rowUnits.map(u => u.id)
  }
  return []
}

// ── 대미지 계산 ──

function calcMeleeDamage(attacker: BattleUnit, target: BattleUnit, moraleMod: number): number {
  const martial = attacker.character.stats.martial
  const classMult = CLASS_ATTACK_MULT[attacker.character.unitClass] ?? 1.0
  const defRate = Math.min(0.5, target.character.stats.command * 0.004 + target.character.stats.courage * 0.002)
  const defending = target.statusEffects.some(e => e.type === 'defending') ? 0.5 : 0
  const weaponMod = 1 + attacker.character.equipment.weapons / 10000 * 0.3  // 무기: 최대 +30%
  const random = 0.85 + Math.random() * 0.3

  return Math.max(1, Math.round(
    martial * 0.8 * classMult * weaponMod * (1 - defRate - defending) * moraleMod * random
  ))
}

function calcStratagemDamage(attacker: BattleUnit, target: BattleUnit): number {
  const intellect = attacker.character.stats.intellect
  const resist = target.character.stats.intellect * 0.004
  const charmResist = 1 - target.character.equipment.charms / 1000 * 0.3  // 부적: 최대 -30% 피해
  const random = 0.9 + Math.random() * 0.2
  return Math.max(1, Math.round(intellect * 0.7 * (1 - resist) * charmResist * random))
}

function getMoraleMod(morale: number): number {
  if (morale >= 90) return 1.15
  if (morale >= 70) return 1.05
  if (morale >= 50) return 1.0
  if (morale >= 30) return 0.85
  if (morale >= 10) return 0.7
  return 0.5
}

// ── 행동 실행 ──

export function executeAction(state: BattleState, action: BattleAction): BattleState {
  let actor = findUnit(state, action.actorId)
  if (!actor || actor.isDefeated) return advanceTurn(state)

  // 혼란은 해당 인물의 다음 행동 한 번을 막고 해제된다.
  if (actor.statusEffects.some(e => e.type === 'confused')) {
    const log: BattleLogEntry = {
      turn: state.turnNumber,
      message: `${actor.character.nickname}은(는) 혼란 상태로 행동 불가!`,
      type: 'system',
    }
    const recovered = removeStatusEffect(state, actor.id, 'confused')
    return advanceTurn({ ...recovered, log: [...recovered.log, log], animation: null })
  }

  // 함정은 걸린 인물의 다음 행동 직전에 발동한다. 살아남으면 예정한 행동을 계속한다.
  let preparedState = state
  if (actor.statusEffects.some(e => e.type === 'trapped')) {
    const trapDamage = Math.max(1, Math.round(actor.maxHp * 0.2))
    preparedState = applyDamageToUnit(preparedState, actor.id, trapDamage)
    preparedState = removeStatusEffect(preparedState, actor.id, 'trapped')
    preparedState = checkDefeated(preparedState)
    preparedState = {
      ...preparedState,
      log: [...preparedState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}이(가) 함정에 걸려 ${trapDamage} 피해!`,
        type: 'skill',
      }],
      animation: { type: 'debuff', actorId: actor.id, targetId: actor.id, damage: trapDamage },
    }
    actor = findUnit(preparedState, action.actorId)
    if (!actor || actor.isDefeated) {
      return advanceTurn(updateMorale(state, preparedState))
    }
  }

  let newState: BattleState = { ...preparedState, animation: null }
  const isActorAlly = preparedState.allies.some(u => u.id === action.actorId)

  switch (action.type) {
    case 'attack': {
      const target = findUnit(preparedState, action.targetId!)
      if (!target) break
      const moraleMod = getMoraleMod(isActorAlly ? preparedState.allyMorale : preparedState.enemyMorale)
      const damage = calcMeleeDamage(actor, target, moraleMod)
      newState = applyDamageToUnit(newState, target.id, damage)
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}이(가) ${target.character.nickname}에게 ${damage} 피해!`,
        type: 'attack',
      }]
      newState.animation = { type: 'melee', actorId: actor.id, targetId: target.id, damage }
      break
    }

    case 'skill': {
      newState = executeSkill(newState, actor, action)
      break
    }

    case 'defend': {
      newState = applyStatusEffect(newState, actor.id, { type: 'defending', turnsLeft: 1 })
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}이(가) 방어 태세!`,
        type: 'system',
      }]
      newState.animation = { type: 'defend', actorId: actor.id }
      break
    }

    case 'retreat': {
      newState = defeatUnit(newState, actor.id)
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}이(가) 후퇴했다.`,
        type: 'system',
      }]
      break
    }
  }

  newState = checkDefeated(newState)
  newState = updateMorale(state, newState)

  return advanceTurn(newState)
}

// ── 스킬 실행 ──

function executeSkill(state: BattleState, actor: BattleUnit, action: BattleAction): BattleState {
  const skillDef = action.skillId ? SKILL_DEFS[action.skillId] : null
  if (!skillDef) return state

  let newState = { ...state }
  const isActorAlly = state.allies.some(u => u.id === actor.id)

  switch (action.skillId) {
    case 'charge': {
      const target = findUnit(state, action.targetId!)
      if (!target) break
      const moraleMod = getMoraleMod(isActorAlly ? state.allyMorale : state.enemyMorale)
      const horseMod = 1 + actor.character.equipment.horses / 1000 * 0.2  // 군마: 최대 +20%
      const damage = Math.round(calcMeleeDamage(actor, target, moraleMod) * 1.5 * horseMod)
      const selfDamage = Math.floor(damage * 0.15)
      newState = applyDamageToUnit(newState, target.id, damage)
      newState = applyDamageToUnit(newState, actor.id, selfDamage)
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}의 돌격! ${target.character.nickname}에게 ${damage} 피해! (자상 ${selfDamage})`,
        type: 'attack',
      }]
      newState.animation = { type: 'melee', actorId: actor.id, targetId: target.id, damage }
      break
    }

    case 'confuse': {
      const target = findUnit(state, action.targetId!)
      if (!target) break
      const success = actor.character.stats.intellect > target.character.stats.intellect
        ? Math.random() < 0.8 : Math.random() < 0.4
      if (success) {
        newState = applyStatusEffect(newState, target.id, { type: 'confused', turnsLeft: 1 })
        newState.log = [...newState.log, {
          turn: state.turnNumber,
          message: `${actor.character.nickname}의 혼란! ${target.character.nickname} 행동 불가!`,
          type: 'skill',
        }]
      } else {
        newState.log = [...newState.log, {
          turn: state.turnNumber,
          message: `${actor.character.nickname}의 혼란이 ${target.character.nickname}에게 통하지 않았다!`,
          type: 'skill',
        }]
      }
      newState.animation = { type: 'debuff', actorId: actor.id, targetId: target.id }
      break
    }

    case 'fire_attack': {
      const targetRow = action.targetRow ?? 0
      const hostiles = isActorAlly ? newState.enemies : newState.allies
      const rowUnits = hostiles.filter(u => !u.isDefeated && u.position.row === targetRow)
      let totalDamage = 0
      for (const target of rowUnits) {
        const damage = calcStratagemDamage(actor, target)
        totalDamage += damage
        newState = applyDamageToUnit(newState, target.id, damage)
      }
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}의 화공! ${targetRow === 0 ? '전열' : targetRow === 1 ? '중열' : '후열'}에 ${totalDamage} 피해!`,
        type: 'skill',
      }]
      newState.animation = { type: 'fire', actorId: actor.id, targetRow }
      break
    }

    case 'heal': {
      const target = findUnit(state, action.targetId!)
      if (!target) break
      const healAmount = Math.floor(target.maxHp * 0.3)
      newState = healUnit(newState, target.id, healAmount)
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}의 치유! ${target.character.nickname} HP +${healAmount}!`,
        type: 'heal',
      }]
      newState.animation = { type: 'heal', actorId: actor.id, targetId: target.id, heal: healAmount }
      break
    }

    case 'barrier': {
      const target = findUnit(state, action.targetId!)
      if (!target) break
      newState = applyStatusEffect(newState, target.id, { type: 'shielded', turnsLeft: 1 })
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}의 결계! ${target.character.nickname} 1턴 무적!`,
        type: 'skill',
      }]
      newState.animation = { type: 'buff', actorId: actor.id, targetId: target.id }
      break
    }

    case 'iron_wall': {
      const target = findUnit(state, action.targetId!)
      if (!target) break
      newState = applyStatusEffect(newState, target.id, { type: 'defending', turnsLeft: 1 })
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}의 철벽! ${target.character.nickname} 방어력 상승!`,
        type: 'skill',
      }]
      newState.animation = { type: 'buff', actorId: actor.id, targetId: target.id }
      break
    }

    case 'diplomacy_threat': {
      const mod = isActorAlly ? 'enemyMorale' : 'allyMorale'
      newState = { ...newState, [mod]: Math.max(0, newState[mod] - 15) }
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}의 외교 위협! 적 사기 -15!`,
        type: 'morale',
      }]
      newState.animation = { type: 'debuff', actorId: actor.id }
      break
    }

    case 'inspire': {
      const mod = isActorAlly ? 'allyMorale' : 'enemyMorale'
      newState = { ...newState, [mod]: Math.min(100, newState[mod] + 10) }
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}의 고무! 아군 사기 +10!`,
        type: 'morale',
      }]
      newState.animation = { type: 'buff', actorId: actor.id }
      break
    }

    case 'culture_sway': {
      const mod = isActorAlly ? 'enemyMorale' : 'allyMorale'
      newState = { ...newState, [mod]: Math.max(0, newState[mod] - 15) }
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}의 문화 감화! 적 사기 -15!`,
        type: 'morale',
      }]
      newState.animation = { type: 'debuff', actorId: actor.id }
      break
    }

    case 'ambush': {
      const target = findUnit(state, action.targetId!)
      if (!target) break
      const damage = calcMeleeDamage(actor, target, 1.2) // 기습 보너스
      newState = applyDamageToUnit(newState, target.id, damage)
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}의 기습! ${target.character.nickname}에게 ${damage} 피해!`,
        type: 'attack',
      }]
      newState.animation = { type: 'melee', actorId: actor.id, targetId: target.id, damage }
      break
    }

    case 'trap': {
      const hostiles = (isActorAlly ? newState.enemies : newState.allies)
        .filter(unit => !unit.isDefeated)
      const targetIds = getTargetsByRow(hostiles)
      for (const targetId of targetIds) {
        newState = applyStatusEffect(newState, targetId, { type: 'trapped', turnsLeft: 1 })
      }
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}이(가) 적 전열에 함정을 설치했다!`,
        type: 'skill',
      }]
      newState.animation = { type: 'debuff', actorId: actor.id }
      break
    }

    case 'siege_strike': {
      const target = findUnit(state, action.targetId!)
      if (!target) break
      const baseDamage = calcMeleeDamage(actor, target, 1.0)
      const damage = state.defenderHasWalls ? baseDamage * 3 : baseDamage
      newState = applyDamageToUnit(newState, target.id, damage)
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}의 공성 강타! ${target.character.nickname}에게 ${damage} 피해!`,
        type: 'attack',
      }]
      newState.animation = { type: 'melee', actorId: actor.id, targetId: target.id, damage }
      break
    }

    case 'detect_trap': {
      const friendlies = isActorAlly ? newState.allies : newState.enemies
      const trappedIds = friendlies
        .filter(unit => !unit.isDefeated && unit.statusEffects.some(effect => effect.type === 'trapped'))
        .map(unit => unit.id)
      for (const unitId of trappedIds) {
        newState = removeStatusEffect(newState, unitId, 'trapped')
      }
      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: trappedIds.length > 0
          ? `${actor.character.nickname}이(가) 매복을 탐지해 함정 ${trappedIds.length}개를 해제했다!`
          : `${actor.character.nickname}이(가) 매복을 탐지했지만 함정이 없었다.`,
        type: 'skill',
      }]
      newState.animation = { type: 'buff', actorId: actor.id }
      break
    }

    case 'duel_provoke': {
      const target = findUnit(state, action.targetId!)
      if (!target) break
      const actorMorale = getMoraleMod(isActorAlly ? state.allyMorale : state.enemyMorale)
      const targetMorale = getMoraleMod(isActorAlly ? state.enemyMorale : state.allyMorale)
      const damage = Math.round(calcMeleeDamage(actor, target, actorMorale) * 1.3)
      newState = applyDamageToUnit(newState, target.id, damage)

      const targetAfterStrike = findUnit(newState, target.id)
      let counterDamage = 0
      if (targetAfterStrike && targetAfterStrike.hp > 0 && !targetAfterStrike.isDefeated) {
        counterDamage = Math.round(calcMeleeDamage(targetAfterStrike, actor, targetMorale) * 1.1)
        newState = applyDamageToUnit(newState, actor.id, counterDamage)
      }

      newState.log = [...newState.log, {
        turn: state.turnNumber,
        message: `${actor.character.nickname}의 일기토! ${target.character.nickname}에게 ${damage} 피해, 반격 ${counterDamage} 피해!`,
        type: 'attack',
      }]
      newState.animation = { type: 'melee', actorId: actor.id, targetId: target.id, damage }
      break
    }
  }

  return newState
}

// ── 유틸리티 ──

function findUnit(state: BattleState, unitId: string): BattleUnit | undefined {
  return state.allies.find(u => u.id === unitId) ?? state.enemies.find(u => u.id === unitId)
}

function applyDamageToUnit(state: BattleState, unitId: string, damage: number): BattleState {
  const mapUnit = (u: BattleUnit): BattleUnit => {
    if (u.id !== unitId || u.isDefeated) return u
    // 결계는 다음 피해를 완전히 흡수하고, 방어 태세는 다음 피격 뒤 해제된다.
    if (u.statusEffects.some(e => e.type === 'shielded')) {
      return { ...u, statusEffects: u.statusEffects.filter(e => e.type !== 'shielded') }
    }
    return {
      ...u,
      hp: Math.max(0, u.hp - damage),
      statusEffects: u.statusEffects.filter(e => e.type !== 'defending'),
    }
  }
  return {
    ...state,
    allies: state.allies.map(mapUnit),
    enemies: state.enemies.map(mapUnit),
  }
}

function healUnit(state: BattleState, unitId: string, amount: number): BattleState {
  const mapUnit = (u: BattleUnit): BattleUnit => {
    if (u.id !== unitId || u.isDefeated) return u
    return { ...u, hp: Math.min(u.maxHp, u.hp + amount) }
  }
  return {
    ...state,
    allies: state.allies.map(mapUnit),
    enemies: state.enemies.map(mapUnit),
  }
}

function applyStatusEffect(state: BattleState, unitId: string, effect: StatusEffect): BattleState {
  const mapUnit = (u: BattleUnit): BattleUnit => {
    if (u.id !== unitId || u.isDefeated) return u
    return { ...u, statusEffects: [...u.statusEffects.filter(e => e.type !== effect.type), effect] }
  }
  return {
    ...state,
    allies: state.allies.map(mapUnit),
    enemies: state.enemies.map(mapUnit),
  }
}

function removeStatusEffect(
  state: BattleState,
  unitId: string,
  effectType: StatusEffect['type'],
): BattleState {
  const mapUnit = (u: BattleUnit): BattleUnit => u.id === unitId
    ? { ...u, statusEffects: u.statusEffects.filter(effect => effect.type !== effectType) }
    : u
  return {
    ...state,
    allies: state.allies.map(mapUnit),
    enemies: state.enemies.map(mapUnit),
  }
}

function defeatUnit(state: BattleState, unitId: string): BattleState {
  const mapUnit = (u: BattleUnit): BattleUnit =>
    u.id === unitId ? { ...u, isDefeated: true, hp: 0 } : u
  return {
    ...state,
    allies: state.allies.map(mapUnit),
    enemies: state.enemies.map(mapUnit),
  }
}

function checkDefeated(state: BattleState): BattleState {
  const log = [...state.log]
  const mapUnit = (u: BattleUnit): BattleUnit => {
    if (u.isDefeated || u.hp > 0) return u
    log.push({
      turn: state.turnNumber,
      message: `${u.character.nickname} 쓰러졌다!`,
      type: 'death',
    })
    return { ...u, isDefeated: true }
  }
  return {
    ...state,
    allies: state.allies.map(mapUnit),
    enemies: state.enemies.map(mapUnit),
    log,
  }
}

function updateMorale(previousState: BattleState, state: BattleState): BattleState {
  let { allyMorale, enemyMorale } = state

  // 주군 격파 충격은 살아 있던 주군이 이번 행동으로 쓰러졌을 때 한 번만 적용한다.
  const previousAllyLeader = previousState.allies.find(u => u.isLeader)
  const previousEnemyLeader = previousState.enemies.find(u => u.isLeader)
  const allyLeader = state.allies.find(u => u.isLeader)
  const enemyLeader = state.enemies.find(u => u.isLeader)

  if (previousAllyLeader && !previousAllyLeader.isDefeated && allyLeader?.isDefeated) {
    allyMorale = Math.max(0, allyMorale - 30)
  }
  if (previousEnemyLeader && !previousEnemyLeader.isDefeated && enemyLeader?.isDefeated) {
    enemyMorale = Math.max(0, enemyMorale - 30)
  }

  return { ...state, allyMorale, enemyMorale }
}

// ── 턴 진행 ──

function advanceTurn(state: BattleState): BattleState {
  // 전투 종료 체크
  const result = checkBattleEnd(state)
  if (result !== 'pending') {
    return {
      ...state,
      result,
      phase: 'result',
      log: [...state.log, {
        turn: state.turnNumber,
        message: result === 'attacker_wins' ? '공격측 승리!'
          : result === 'defender_wins' ? '방어측 승리!'
          : '무승부. 양측 퇴각.',
        type: 'system',
      }],
    }
  }

  // 다음 행동자
  const nextIndex = state.currentTurnIndex + 1

  // 턴 오더 끝나면 다음 턴
  if (nextIndex >= state.turnOrder.length) {
    const turnOrder = calcTurnOrder(state.allies, state.enemies)
    return {
      ...state,
      turnOrder,
      currentTurnIndex: 0,
      turnNumber: state.turnNumber + 1,
      phase: 'action_select',
    }
  }

  // 다음 행동자가 죽었으면 스킵
  const nextId = state.turnOrder[nextIndex]
  const nextUnit = findUnit(state, nextId)
  if (nextUnit?.isDefeated) {
    return advanceTurn({ ...state, currentTurnIndex: nextIndex })
  }

  return {
    ...state,
    currentTurnIndex: nextIndex,
    phase: 'action_select',
  }
}

// ── 전투 종료 체크 ──

export function checkBattleEnd(state: BattleState): 'pending' | 'attacker_wins' | 'defender_wins' | 'draw' {
  const allyAlive = state.allies.filter(u => !u.isDefeated)
  const enemyAlive = state.enemies.filter(u => !u.isDefeated)

  // 전멸
  const isAllyAttacker = state.allies.length > 0 && state.allies[0].factionId === state.attackerFactionId
  if (enemyAlive.length === 0) return isAllyAttacker ? 'attacker_wins' : 'defender_wins'
  if (allyAlive.length === 0) return isAllyAttacker ? 'defender_wins' : 'attacker_wins'

  // 사기 붕괴
  if (state.allyMorale <= 0) return isAllyAttacker ? 'defender_wins' : 'attacker_wins'
  if (state.enemyMorale <= 0) return isAllyAttacker ? 'attacker_wins' : 'defender_wins'

  // 턴 제한
  if (state.turnNumber >= state.maxTurns) return 'draw'

  return 'pending'
}

// ── AI 행동 선택 ──

export function selectAIAction(state: BattleState, unitId: string): BattleAction {
  const unit = findUnit(state, unitId)
  if (!unit) return { actorId: unitId, type: 'defend' }

  const isAlly = state.allies.some(u => u.id === unitId)
  const hostiles = (isAlly ? state.enemies : state.allies).filter(u => !u.isDefeated)
  const friendlies = (isAlly ? state.allies : state.enemies).filter(u => !u.isDefeated)

  // 사용 가능한 스킬
  const skills = getAvailableSkills(unit)

  // 치유 우선: 아군 HP 30% 이하 있으면
  if (skills.some(s => s.id === 'heal')) {
    const wounded = friendlies.find(u => u.hp < u.maxHp * 0.3 && u.id !== unitId)
    if (wounded) {
      return { actorId: unitId, type: 'skill', skillId: 'heal', targetId: wounded.id }
    }
  }

  // 고무: 사기 낮으면
  const teamMorale = isAlly ? state.allyMorale : state.enemyMorale
  if (teamMorale < 50 && skills.some(s => s.id === 'inspire')) {
    return { actorId: unitId, type: 'skill', skillId: 'inspire' }
  }

  // 계략: 혼란
  if (skills.some(s => s.id === 'confuse') && Math.random() < 0.4) {
    const target = hostiles[Math.floor(Math.random() * hostiles.length)]
    if (target && !target.statusEffects.some(e => e.type === 'confused')) {
      return { actorId: unitId, type: 'skill', skillId: 'confuse', targetId: target.id }
    }
  }

  // 화공: 적이 2명 이상 같은 행
  if (skills.some(s => s.id === 'fire_attack')) {
    for (let row = 0; row < BATTLE_GRID_ROWS; row++) {
      const rowCount = hostiles.filter(u => u.position.row === row).length
      if (rowCount >= 2) {
        return { actorId: unitId, type: 'skill', skillId: 'fire_attack', targetRow: row }
      }
    }
  }

  // 돌격: 장수이고 HP 충분
  if (skills.some(s => s.id === 'charge') && unit.hp > unit.maxHp * 0.5) {
    const targets = getTargetsByRow(hostiles)
    if (targets.length > 0) {
      // HP 가장 낮은 적 선택
      const target = hostiles
        .filter(u => targets.includes(u.id))
        .sort((a, b) => a.hp - b.hp)[0]
      if (target) {
        return { actorId: unitId, type: 'skill', skillId: 'charge', targetId: target.id }
      }
    }
  }

  // 기본 공격
  const meleeTargets = getTargetsByRow(hostiles)
  if (meleeTargets.length > 0) {
    // HP 가장 낮은 적
    const target = hostiles
      .filter(u => meleeTargets.includes(u.id))
      .sort((a, b) => a.hp - b.hp)[0]
    return { actorId: unitId, type: 'attack', targetId: target?.id ?? meleeTargets[0] }
  }

  return { actorId: unitId, type: 'defend' }
}

// ── 배치 확정 → 전투 개시 ──

export function confirmPlacement(state: BattleState): BattleState {
  const turnOrder = calcTurnOrder(state.allies, state.enemies)
  return {
    ...state,
    phase: 'action_select',
    turnOrder,
    currentTurnIndex: 0,
  }
}

// ── 레거시 변환: BattleUnit[] → BattleParticipant[] ──

function unitsToParticipants(units: BattleUnit[]): BattleParticipant[] {
  return units.map(u => {
    const remainingRatio = u.isDefeated || u.maxHp <= 0
      ? 0
      : Math.max(0, Math.min(1, u.hp / u.maxHp))
    const troops = Math.max(0, Math.floor(u.character.troops * remainingRatio))
    const campaignHp = Math.max(1, Math.round(u.character.hp * remainingRatio))

    return {
      character: { ...u.character, hp: campaignHp, troops },
      factionId: u.factionId,
      troops,
      morale: u.morale,
      isLeader: u.isLeader,
      isDefeated: u.isDefeated,
    }
  })
}

/** 전투 완료 시 레거시 participants를 갱신 */
export function syncLegacyParticipants(state: BattleState): BattleState {
  const isAllyAttacker = state.allies.length > 0 && state.allies[0].factionId === state.attackerFactionId
  return {
    ...state,
    attackers: unitsToParticipants(isAllyAttacker ? state.allies : state.enemies),
    defenders: unitsToParticipants(isAllyAttacker ? state.enemies : state.allies),
  }
}
