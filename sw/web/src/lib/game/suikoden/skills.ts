// 천도 — 전투 스킬 실행

import type { BattleState, BattleUnit, BattleTile, BattleLogEntry, Position, ClassSkill } from './types'
import { CLASS_SKILLS, WALL_HP, GATE_HP } from './constants'

// ── 스킬 목록 조회 ──

export function getSkillsForUnit(unit: BattleUnit): ClassSkill[] {
  return CLASS_SKILLS.filter(s => s.unitClass === unit.character.unitClass)
}

// ── 스킬 사용 가능 여부 ──

export function canUseSkill(unit: BattleUnit, skill: ClassSkill): boolean {
  return unit.troops >= skill.costTroops
}

// ── 스킬 실행 ──

export function executeSkill(
  battle: BattleState,
  caster: BattleUnit,
  skill: ClassSkill,
  targetPos: Position | null,
): BattleState {
  const grid = battle.grid.map(row => row.map(t => ({
    ...t,
    unit: t.unit ? { ...t.unit } : null,
  })))
  const log: BattleLogEntry[] = [...battle.log]

  // 병사 소모
  const casterOnGrid = grid[caster.y][caster.x]?.unit
  if (casterOnGrid && skill.costTroops > 0) {
    casterOnGrid.troops = Math.max(0, casterOnGrid.troops - skill.costTroops)
  }

  switch (skill.id) {
    case 'charge': {
      // 강력한 근접 공격 (power 배율)
      if (!targetPos) break
      const target = grid[targetPos.y]?.[targetPos.x]?.unit
      if (!target) break
      const dmg = Math.round(caster.character.stats.power * skill.power * (1 + caster.troops / 500) * (0.8 + Math.random() * 0.4))
      target.currentHp -= dmg
      target.troops = Math.max(0, target.troops - Math.floor(dmg * 2))
      log.push({ turn: battle.turnNumber, message: `${caster.character.nickname}의 돌격! ${target.character.nickname}에게 ${dmg} 피해!`, type: 'attack' })
      if (target.currentHp <= 0) {
        log.push({ turn: battle.turnNumber, message: `${target.character.nickname} 쓰러졌다!`, type: 'death' })
        grid[targetPos.y][targetPos.x].unit = null
      }
      break
    }

    case 'rally': {
      // 주변 아군 버프
      const allies = getUnitsInRange(grid, caster, skill.aoe, caster.factionId, true)
      for (const ally of allies) {
        ally.morale = Math.min(100, ally.morale + 15)
      }
      log.push({ turn: battle.turnNumber, message: `${caster.character.nickname}의 고무! 아군 사기 상승!`, type: 'morale' })
      break
    }

    case 'fire_arrow': {
      // 범위 원거리 공격
      if (!targetPos) break
      const targets = getUnitsInRange(grid, { x: targetPos.x, y: targetPos.y } as any, skill.aoe, caster.factionId, false)
      for (const target of targets) {
        const dmg = Math.round(caster.character.stats.intellect * skill.power * (0.8 + Math.random() * 0.4))
        target.currentHp -= dmg
        log.push({ turn: battle.turnNumber, message: `화시! ${target.character.nickname}에게 ${dmg} 피해!`, type: 'attack' })
        if (target.currentHp <= 0) {
          log.push({ turn: battle.turnNumber, message: `${target.character.nickname} 쓰러졌다!`, type: 'death' })
          const pos = findUnitPos(grid, target)
          if (pos) grid[pos.y][pos.x].unit = null
        }
      }
      break
    }

    case 'confuse': {
      // 적 행동불능
      if (!targetPos) break
      const target = grid[targetPos.y]?.[targetPos.x]?.unit
      if (!target) break
      target.acted = true
      target.morale = Math.max(0, target.morale - 20)
      log.push({ turn: battle.turnNumber, message: `${caster.character.nickname}의 혼란! ${target.character.nickname} 행동불능!`, type: 'tactic' })
      break
    }

    case 'siege_ram': {
      // 성벽/성문 특화 공격
      if (!targetPos) break
      const tile = grid[targetPos.y]?.[targetPos.x]
      if (!tile) break
      if (tile.terrain === 'wall' || tile.terrain === 'gate') {
        const dmg = Math.round(caster.character.stats.skill * skill.power * 3)
        tile.wallHp = Math.max(0, (tile.wallHp ?? 0) - dmg)
        log.push({ turn: battle.turnNumber, message: `파성추! ${tile.terrain === 'wall' ? '성벽' : '성문'}에 ${dmg} 피해! (잔여: ${tile.wallHp})`, type: 'wall' })
        if (tile.wallHp <= 0) {
          const wallName = tile.terrain === 'wall' ? '성벽' : '성문'
          tile.terrain = 'plain'
          tile.wallHp = undefined
          tile.wallMaxHp = undefined
          log.push({ turn: battle.turnNumber, message: `${wallName} 파괴!`, type: 'wall' })
        }
      } else if (tile.unit && tile.unit.factionId !== caster.factionId) {
        const dmg = Math.round(caster.character.stats.power * skill.power * (0.8 + Math.random() * 0.4))
        tile.unit.currentHp -= dmg
        log.push({ turn: battle.turnNumber, message: `파성추! ${tile.unit.character.nickname}에게 ${dmg} 피해!`, type: 'attack' })
        if (tile.unit.currentHp <= 0) {
          log.push({ turn: battle.turnNumber, message: `${tile.unit.character.nickname} 쓰러졌다!`, type: 'death' })
          tile.unit = null
        }
      }
      break
    }

    case 'repair': {
      // 인접 성벽 수리
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = caster.x + dx
        const ny = caster.y + dy
        if (nx < 0 || nx >= battle.width || ny < 0 || ny >= battle.height) continue
        const tile = grid[ny][nx]
        if ((tile.terrain === 'wall' || tile.terrain === 'gate') && tile.wallHp !== undefined && tile.wallMaxHp !== undefined) {
          const heal = Math.round(caster.character.stats.skill * 5)
          tile.wallHp = Math.min(tile.wallMaxHp, tile.wallHp + heal)
          log.push({ turn: battle.turnNumber, message: `수리! 성벽 HP +${heal}`, type: 'wall' })
        }
      }
      break
    }

    case 'decree': {
      // 적 전체 사기 하락
      const enemies = getAllUnitsOfFaction(grid, caster.factionId === battle.attackerFactionId ? battle.defenderFactionId : battle.attackerFactionId)
      const drop = 10 + Math.floor(caster.character.stats.intellect)
      for (const enemy of enemies) {
        enemy.morale = Math.max(0, enemy.morale - drop)
      }
      log.push({ turn: battle.turnNumber, message: `${caster.character.nickname}의 포고! 적 전체 사기 -${drop}!`, type: 'morale' })
      break
    }

    case 'inspire': {
      // 아군 전체 HP 회복
      const allies = getAllUnitsOfFaction(grid, caster.factionId)
      const heal = 5 + Math.floor(caster.character.stats.virtue * 1.5)
      for (const ally of allies) {
        ally.currentHp = Math.min(ally.character.maxHp, ally.currentHp + heal)
      }
      log.push({ turn: battle.turnNumber, message: `${caster.character.nickname}의 고취! 아군 전체 HP +${heal}!`, type: 'morale' })
      break
    }

    case 'ambush': {
      // 방어 무시 공격
      if (!targetPos) break
      const target = grid[targetPos.y]?.[targetPos.x]?.unit
      if (!target) break
      const dmg = Math.round(caster.character.stats.power * skill.power * (0.9 + Math.random() * 0.2))
      target.currentHp -= dmg
      target.troops = Math.max(0, target.troops - Math.floor(dmg * 1.5))
      log.push({ turn: battle.turnNumber, message: `${caster.character.nickname}의 기습! ${target.character.nickname}에게 ${dmg} 피해!`, type: 'attack' })
      if (target.currentHp <= 0) {
        log.push({ turn: battle.turnNumber, message: `${target.character.nickname} 쓰러졌다!`, type: 'death' })
        grid[targetPos.y][targetPos.x].unit = null
      }
      break
    }

    case 'scout': {
      // 다음 공격 치명타 (사기로 표현)
      if (casterOnGrid) {
        casterOnGrid.morale = Math.min(100, casterOnGrid.morale + 30)
      }
      log.push({ turn: battle.turnNumber, message: `${caster.character.nickname}의 정찰! 다음 공격 강화!`, type: 'tactic' })
      break
    }
  }

  // 행동 완료
  if (casterOnGrid) casterOnGrid.acted = true

  return {
    ...battle,
    grid,
    log,
    selectedUnit: null,
    movablePositions: [],
    attackablePositions: [],
    phase: 'select',
  }
}

// ── 헬퍼 ──

function getUnitsInRange(
  grid: BattleTile[][],
  center: { x: number; y: number },
  range: number,
  factionId: string,
  allies: boolean,
): BattleUnit[] {
  const units: BattleUnit[] = []
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > range) continue
      const nx = center.x + dx
      const ny = center.y + dy
      if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) continue
      const unit = grid[ny][nx].unit
      if (!unit) continue
      if (allies && unit.factionId === factionId) units.push(unit)
      if (!allies && unit.factionId !== factionId) units.push(unit)
    }
  }
  return units
}

function getAllUnitsOfFaction(grid: BattleTile[][], factionId: string): BattleUnit[] {
  const units: BattleUnit[] = []
  for (const row of grid) for (const t of row) if (t.unit?.factionId === factionId) units.push(t.unit)
  return units
}

function findUnitPos(grid: BattleTile[][], unit: BattleUnit): Position | null {
  for (const row of grid) {
    for (const t of row) {
      if (t.unit === unit) return { x: t.x, y: t.y }
    }
  }
  return null
}
