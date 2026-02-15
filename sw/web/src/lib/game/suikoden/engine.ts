// 천도 — 게임 엔진 (전투 + 초기화)

import type {
  GameState, GameCharacter, Faction, Territory, BattleState, BattleUnit, BattleTile,
  Position, Resources, Season, Terrain, RegionId, TerritoryId, BattleLogEntry,
  CharacterPlacement,
} from './types'
import {
  BATTLE_GRID, BATTLE_MAX_TURNS, REGIONS, DIFFICULTY_CONFIG, FACTION_COLORS, BUILDINGS,
  TERRITORIES, WALL_HP, GATE_HP, INITIAL_GAME_TIME,
} from './constants'
import {
  getRegionForNationality, getTerritoryForNationality, shuffle, getMovablePositions, getAttackablePositions,
  calcDamage, calcTacticSuccess, calcWallDamage, calcDamagePreview,
} from './utils'
import { getSkillsForUnit, canUseSkill, executeSkill } from './skills'
import { generateTerritoryMap, addWallsToMap, territoryMapToBattleGrid } from './mapGenerator'

// ── 게임 초기화 ──

export function initGame(
  allCharacters: GameCharacter[],
  playerLeaderId: string,
  difficulty: 'easy' | 'normal' | 'hard',
): GameState {
  const config = DIFFICULTY_CONFIG[difficulty]
  const player = allCharacters.find(c => c.id === playerLeaderId)!
  const playerTerritory = getTerritoryForNationality(player.nationality)
  const playerRegion = getRegionForNationality(player.nationality)

  // 영토별로 캐릭터 분류
  const charsByTerritory = new Map<TerritoryId, GameCharacter[]>()
  for (const c of allCharacters) {
    const t = getTerritoryForNationality(c.nationality)
    if (!charsByTerritory.has(t)) charsByTerritory.set(t, [])
    charsByTerritory.get(t)!.push(c)
  }

  // 플레이어 세력
  const playerTerritoryChars = charsByTerritory.get(playerTerritory) ?? []
  const playerMembers = [player]
  const availableInTerritory = playerTerritoryChars.filter(c => c.id !== playerLeaderId)
  const startMembers = shuffle(availableInTerritory)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, config.startMembers)
  playerMembers.push(...startMembers)

  const usedIds = new Set(playerMembers.map(c => c.id))

  const playerFaction: Faction = {
    id: 'player',
    name: `${player.nickname}의 세력`,
    leaderId: player.id,
    color: FACTION_COLORS[0],
    members: playerMembers,
    territories: [createTerritory(playerTerritory)],
    resources: { gold: 500, food: 300, knowledge: 100, material: 200, troops: 200 },
    items: [],
    fame: 0,
    relations: {},
    aiPersonality: null,
  }

  // AI 세력 생성 — 플레이어 영토를 제외한 영토에서 분배
  const aiFactions: Faction[] = []
  const availableTerritories = TERRITORIES
    .map(t => t.id)
    .filter(t => t !== playerTerritory)

  // 지역별 균등 분배를 위해 셔플
  const shuffledTerritories = shuffle(availableTerritories)

  for (let i = 0; i < Math.min(config.aiFactions, shuffledTerritories.length); i++) {
    const territoryId = shuffledTerritories[i]
    const regionChars = (charsByTerritory.get(territoryId) ?? []).filter(c => !usedIds.has(c.id))

    // 해당 영토에 캐릭터 없으면 같은 권역에서 가져옴
    const tDef = TERRITORIES.find(t => t.id === territoryId)!
    if (regionChars.length === 0) {
      const regionTerritories = TERRITORIES.filter(t => t.regionId === tDef.regionId).map(t => t.id)
      for (const rt of regionTerritories) {
        const chars = (charsByTerritory.get(rt) ?? []).filter(c => !usedIds.has(c.id))
        regionChars.push(...chars)
      }
    }

    if (regionChars.length === 0) continue

    const sorted = regionChars.sort((a, b) => b.totalScore - a.totalScore)
    const leader = sorted[0]
    const members = [leader, ...sorted.slice(1, config.startMembers + 1)]
    members.forEach(m => usedIds.add(m.id))

    const personality = getAIPersonality(leader)

    aiFactions.push({
      id: `ai_${i}`,
      name: `${leader.nickname}의 세력`,
      leaderId: leader.id,
      color: FACTION_COLORS[(i + 1) % FACTION_COLORS.length],
      members,
      territories: [createTerritory(territoryId)],
      resources: { gold: 500, food: 300, knowledge: 100, material: 200, troops: 200 },
      items: [],
      fame: 0,
      relations: {},
      aiPersonality: personality,
    })
  }

  const wanderers = allCharacters.filter(c => !usedIds.has(c.id))
  const factions = [playerFaction, ...aiFactions]

  // 관계 초기화
  for (const f of factions) {
    for (const other of factions) {
      if (f.id !== other.id) f.relations[other.id] = 0
    }
  }

  // 캐릭터 배치 생성 — 각 세력 영토의 town 타일에 배치
  const placements: CharacterPlacement[] = []
  for (const faction of factions) {
    for (const member of faction.members) {
      const territory = faction.territories[0]
      if (!territory) continue
      const townPos = findTownPosition(territory, placements)
      placements.push({
        characterId: member.id,
        factionId: faction.id,
        territoryId: territory.id,
        x: townPos.x,
        y: townPos.y,
        task: 'idle',
        taskProgress: 0,
        path: [],
      })
    }
  }

  return {
    phase: 'strategy',
    season: 'spring',
    gameTime: { ...INITIAL_GAME_TIME },
    speed: 1,
    factions,
    placements,
    constructions: [],
    wanderers,
    allItems: [],
    playerFactionId: 'player',
    difficulty,
    battle: null,
    viewingTerritoryId: playerTerritory,
    selectedTerritoryId: null,
    log: [`${player.nickname}의 여정이 시작되었다.`],
    isGameOver: false,
    winner: null,
    tickCount: 0,
    prevSpeed: 1,
    autoAssign: false,
  }
}

/** 영토 내 town 타일에서 빈 위치 찾기 */
function findTownPosition(territory: Territory, existingPlacements: CharacterPlacement[]): Position {
  const occupied = new Set(
    existingPlacements
      .filter(p => p.territoryId === territory.id)
      .map(p => `${p.x},${p.y}`)
  )

  // town 타일 우선
  for (const row of territory.map.grid) {
    for (const tile of row) {
      if (tile.terrain === 'town' && !occupied.has(`${tile.x},${tile.y}`)) {
        return { x: tile.x, y: tile.y }
      }
    }
  }
  // town 인접 road/plain
  for (const row of territory.map.grid) {
    for (const tile of row) {
      if ((tile.terrain === 'road' || tile.terrain === 'plain') && !occupied.has(`${tile.x},${tile.y}`)) {
        return { x: tile.x, y: tile.y }
      }
    }
  }
  return { x: 8, y: 6 } // fallback 중앙
}

function getAIPersonality(leader: GameCharacter) {
  const { power, intellect, skill, virtue } = leader.stats
  const max = Math.max(power, intellect, skill, virtue)
  if (max === power) return 'conqueror' as const
  if (max === intellect) return 'schemer' as const
  if (max === skill) return 'economist' as const
  if (max === virtue) return 'virtuous' as const
  return 'culturist' as const
}

function createTerritory(id: TerritoryId): Territory {
  const def = TERRITORIES.find(t => t.id === id)
  return {
    id,
    name: def?.name ?? '미지',
    regionId: def?.regionId ?? 'mediterranean',
    buildings: [],
    map: generateTerritoryMap(id),
    population: 1000,
    morale: 70,
    resources: { gold: 0, food: 0, knowledge: 0, material: 0, troops: 0 },
    taxRate: 'normal',
  }
}

// ── advanceTurn 삭제 — rtEngine.processTick으로 대체 ──

// ── 전투 초기화 ──

export function initBattle(
  attackerFaction: Faction,
  defenderFaction: Faction,
  attackers: GameCharacter[],
  defenders: GameCharacter[],
  defenderTerritoryId: TerritoryId | null,
): BattleState {
  const { width, height } = BATTLE_GRID

  // 방어측 영토 맵이 있으면 그것을 전투맵으로 사용
  let grid: BattleTile[][]
  const defTerritory = defenderTerritoryId
    ? defenderFaction.territories.find(t => t.id === defenderTerritoryId)
    : defenderFaction.territories[0]

  const hasWalls = defTerritory?.buildings.some(b => b.def.id === 'walls' && b.turnsLeft === 0) ?? false

  if (defTerritory?.map) {
    grid = territoryMapToBattleGrid(defTerritory.map, hasWalls)
  } else {
    grid = generateFallbackBattleMap(width, height)
  }

  // 공격 측 좌측 배치 (맵 왼쪽 가장자리)
  attackers.forEach((c, i) => {
    const y = Math.floor(height / 2) - Math.floor(attackers.length / 2) + i
    const safeY = Math.max(0, Math.min(height - 1, y))
    // 좌측에서 빈 도로/평지 찾기
    let placeX = 0
    for (let x = 0; x < 3; x++) {
      if (!grid[safeY][x].unit && grid[safeY][x].terrain !== 'wall' && grid[safeY][x].terrain !== 'sea') {
        placeX = x
        break
      }
    }
    const unit: BattleUnit = {
      character: c, factionId: attackerFaction.id,
      x: placeX, y: safeY, currentHp: c.hp, troops: c.troops, morale: c.morale, acted: false,
      isLeader: c.id === attackerFaction.leaderId, chargeDistance: 0,
    }
    grid[safeY][placeX].unit = unit
  })

  // 방어 측 town 근처 배치
  const townTiles = findTownTiles(grid)
  defenders.forEach((c, i) => {
    let placeX = width - 2
    let placeY = Math.floor(height / 2) - Math.floor(defenders.length / 2) + i
    placeY = Math.max(0, Math.min(height - 1, placeY))

    // town 근처 빈 타일 찾기
    if (townTiles.length > 0) {
      const town = townTiles[i % townTiles.length]
      // town 인접 빈 타일
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = town.x + dx
        const ny = town.y + dy
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !grid[ny][nx].unit) {
          placeX = nx
          placeY = ny
          break
        }
      }
    }

    const unit: BattleUnit = {
      character: c, factionId: defenderFaction.id,
      x: placeX, y: placeY, currentHp: c.hp, troops: c.troops, morale: c.morale, acted: false,
      isLeader: c.id === defenderFaction.leaderId, chargeDistance: 0,
    }
    grid[placeY][placeX].unit = unit
  })

  return {
    grid,
    width,
    height,
    turnNumber: 1,
    maxTurns: BATTLE_MAX_TURNS,
    currentFaction: attackerFaction.id,
    attackerFactionId: attackerFaction.id,
    defenderFactionId: defenderFaction.id,
    defenderTerritoryId: defenderTerritoryId ?? null,
    selectedUnit: null,
    movablePositions: [],
    attackablePositions: [],
    log: [{ turn: 1, message: '전투 개시!', type: 'system' }],
    phase: 'select',
    result: 'pending',
    townOccupyTurns: 0,
  }
}

function findTownTiles(grid: BattleTile[][]): Position[] {
  const towns: Position[] = []
  for (const row of grid) {
    for (const t of row) {
      if (t.terrain === 'town') towns.push({ x: t.x, y: t.y })
    }
  }
  return towns
}

function generateFallbackBattleMap(w: number, h: number): BattleTile[][] {
  const grid: BattleTile[][] = []
  for (let y = 0; y < h; y++) {
    const row: BattleTile[] = []
    for (let x = 0; x < w; x++) {
      let terrain: Terrain = 'plain'
      const rand = Math.random()
      if (rand < 0.1) terrain = 'forest'
      else if (rand < 0.13) terrain = 'mountain'
      else if (rand < 0.15 && y > 1 && y < h - 2) terrain = 'river'
      row.push({ terrain, building: null, x, y, unit: null })
    }
    grid.push(row)
  }
  return grid
}

// ── 전투 행동 ──

export function selectUnit(battle: BattleState, x: number, y: number): BattleState {
  const tile = battle.grid[y]?.[x]
  if (!tile?.unit || tile.unit.factionId !== battle.currentFaction || tile.unit.acted) {
    return { ...battle, selectedUnit: null, movablePositions: [], attackablePositions: [], phase: 'select' }
  }
  const unit = tile.unit
  const movable = getMovablePositions(unit, battle.grid)
  const attackable = getAttackablePositions(unit, battle.grid, battle.currentFaction)

  return {
    ...battle,
    selectedUnit: unit,
    movablePositions: movable,
    attackablePositions: attackable,
    phase: 'move',
  }
}

export function moveUnit(battle: BattleState, to: Position): BattleState {
  if (!battle.selectedUnit) return battle
  const unit = battle.selectedUnit
  const grid = battle.grid.map(row => row.map(t => ({ ...t, unit: t.unit ? { ...t.unit } : null })))

  grid[unit.y][unit.x].unit = null
  const dist = Math.abs(to.x - unit.x) + Math.abs(to.y - unit.y)
  const movedUnit = { ...unit, x: to.x, y: to.y, chargeDistance: dist }
  grid[to.y][to.x].unit = movedUnit

  const attackable = getAttackablePositions(movedUnit, grid, battle.currentFaction)

  // 공격 대상 없으면 행동 완료 처리
  if (attackable.length === 0) {
    movedUnit.acted = true
    movedUnit.chargeDistance = 0
    return {
      ...battle,
      grid,
      selectedUnit: null,
      movablePositions: [],
      attackablePositions: [],
      phase: 'select',
    }
  }

  return {
    ...battle,
    grid,
    selectedUnit: movedUnit,
    movablePositions: [],
    attackablePositions: attackable,
    phase: 'action',
  }
}

export function attackUnit(battle: BattleState, targetPos: Position): BattleState {
  if (!battle.selectedUnit) return battle
  const attacker = battle.selectedUnit
  const grid = battle.grid.map(row => row.map(t => ({ ...t, unit: t.unit ? { ...t.unit } : null })))
  const targetTile = grid[targetPos.y][targetPos.x]

  const log: BattleLogEntry[] = [...battle.log]

  // 성벽/성문 공격
  if ((targetTile.terrain === 'wall' || targetTile.terrain === 'gate') && targetTile.wallHp && targetTile.wallHp > 0 && !targetTile.unit) {
    const dmg = calcWallDamage(attacker.character)
    targetTile.wallHp = Math.max(0, targetTile.wallHp - dmg)
    log.push({ turn: battle.turnNumber, message: `${attacker.character.nickname}이(가) ${targetTile.terrain === 'wall' ? '성벽' : '성문'}에 ${dmg} 피해! (잔여: ${targetTile.wallHp})`, type: 'wall' })

    if (targetTile.wallHp <= 0) {
      targetTile.terrain = 'plain'
      targetTile.wallHp = undefined
      targetTile.wallMaxHp = undefined
      log.push({ turn: battle.turnNumber, message: '성벽 파괴!', type: 'wall' })
    }

    const attackerOnGrid = grid[attacker.y]?.[attacker.x]?.unit
    if (attackerOnGrid) attackerOnGrid.acted = true

    return {
      ...battle, grid, log,
      selectedUnit: null, movablePositions: [], attackablePositions: [],
      phase: 'select',
    }
  }

  // 유닛 공격
  if (!targetTile.unit) return battle
  const defender = targetTile.unit
  const distance = Math.abs(attacker.x - targetPos.x) + Math.abs(attacker.y - targetPos.y)
  const isRanged = distance > 1

  // 돌격 보너스
  const chargeDistance = attacker.chargeDistance ?? 0
  const chargeRate = chargeDistance > 0
    ? chargeDistance * (attacker.character.unitClass === 'general' ? 0.15 : 0.1)
    : 0
  const chargeBonus = 1 + chargeRate

  // 협공 보너스 — 대상 4방향에 공격자 아군 수
  let adjacentAllies = 0
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const nx = targetPos.x + dx
    const ny = targetPos.y + dy
    if (nx < 0 || nx >= battle.width || ny < 0 || ny >= battle.height) continue
    const adj = grid[ny][nx].unit
    if (adj && adj.factionId === attacker.factionId && !(adj.x === attacker.x && adj.y === attacker.y)) {
      adjacentAllies++
    }
  }
  const flankBonus = 1 + Math.min(0.6, adjacentAllies * 0.2)

  const baseDamage = calcDamage(attacker.character, defender.character, targetTile.terrain, isRanged)
  const damage = Math.max(1, Math.round(baseDamage * chargeBonus * flankBonus))
  defender.currentHp -= damage

  // 병사 손실
  const troopLoss = Math.floor(damage * 1.5)
  defender.troops = Math.max(0, defender.troops - troopLoss)

  // 로그 메시지 조립
  const bonusParts: string[] = []
  if (chargeRate > 0) bonusParts.push(`돌격 +${Math.round(chargeRate * 100)}%`)
  if (adjacentAllies > 0) bonusParts.push(`협공 +${adjacentAllies * 20}%`)
  const bonusStr = bonusParts.length > 0 ? ` (${bonusParts.join(', ')})` : ''

  log.push({
    turn: battle.turnNumber,
    message: `${attacker.character.nickname}이(가) ${defender.character.nickname}에게 ${damage} 피해!${bonusStr} (병사 -${troopLoss})`,
    type: 'attack',
  })

  // 사기 변동
  defender.morale = Math.max(0, defender.morale - 5)
  const attackerOnGrid = grid[attacker.y]?.[attacker.x]?.unit
  if (attackerOnGrid) attackerOnGrid.morale = Math.min(100, attackerOnGrid.morale + 3)

  // 사망 처리
  if (defender.currentHp <= 0) {
    log.push({ turn: battle.turnNumber, message: `${defender.character.nickname} 쓰러졌다!`, type: 'death' })
    targetTile.unit = null
    getAllUnitsOfFaction(grid, defender.factionId).forEach(u => {
      u.morale = Math.max(0, u.morale - (defender.isLeader ? 20 : 10))
    })
  }

  // 반격 — 근접 공격 시 방어자 생존 && distance===1
  if (!isRanged && defender.currentHp > 0 && attackerOnGrid) {
    const counterDmg = Math.max(1, Math.round(calcDamage(defender.character, attacker.character, grid[attacker.y][attacker.x].terrain, false) * 0.5))
    attackerOnGrid.currentHp -= counterDmg
    const counterTroopLoss = Math.floor(counterDmg * 1.5)
    attackerOnGrid.troops = Math.max(0, attackerOnGrid.troops - counterTroopLoss)
    log.push({ turn: battle.turnNumber, message: `반격! ${defender.character.nickname}이(가) ${attacker.character.nickname}에게 ${counterDmg} 피해!`, type: 'attack' })

    if (attackerOnGrid.currentHp <= 0) {
      log.push({ turn: battle.turnNumber, message: `${attacker.character.nickname} 쓰러졌다!`, type: 'death' })
      grid[attacker.y][attacker.x].unit = null
      getAllUnitsOfFaction(grid, attacker.factionId).forEach(u => {
        u.morale = Math.max(0, u.morale - (attacker.isLeader ? 20 : 10))
      })
    }
  }

  if (attackerOnGrid) {
    attackerOnGrid.acted = true
    attackerOnGrid.chargeDistance = 0
  }

  // 결과 판정
  const result = checkBattleResult(grid, battle)

  return {
    ...battle,
    grid,
    selectedUnit: null,
    movablePositions: [],
    attackablePositions: [],
    log,
    phase: result !== 'pending' ? 'result' : 'select',
    result,
  }
}

export function endUnitAction(battle: BattleState): BattleState {
  if (!battle.selectedUnit) return battle
  const grid = battle.grid.map(row => row.map(t => ({ ...t, unit: t.unit ? { ...t.unit } : null })))
  const unit = grid[battle.selectedUnit.y]?.[battle.selectedUnit.x]?.unit
  if (unit) {
    unit.acted = true
    unit.chargeDistance = 0
  }

  return { ...battle, grid, selectedUnit: null, movablePositions: [], attackablePositions: [], phase: 'select' }
}

export function endFactionTurn(battle: BattleState): BattleState {
  const nextFaction = battle.currentFaction === battle.attackerFactionId
    ? battle.defenderFactionId
    : battle.attackerFactionId

  const grid = battle.grid.map(row => row.map(t => {
    const unit = t.unit ? { ...t.unit } : null
    if (unit && unit.factionId === nextFaction) unit.acted = false
    return { ...t, unit }
  }))

  const isNewRound = nextFaction === battle.attackerFactionId
  const turnNumber = isNewRound ? battle.turnNumber + 1 : battle.turnNumber

  // 본진 점령 체크 (공격측이 town 3턴 점유)
  let townOccupyTurns = battle.townOccupyTurns
  if (isNewRound) {
    const townTiles = findTownTiles(grid)
    const attackerOnTown = townTiles.some(t => {
      const tile = grid[t.y][t.x]
      return tile.unit?.factionId === battle.attackerFactionId
    })
    townOccupyTurns = attackerOnTown ? townOccupyTurns + 1 : 0
  }

  let result = turnNumber > battle.maxTurns ? 'draw' as const : checkBattleResult(grid, battle)

  // 본진 점령 승리
  if (townOccupyTurns >= 3 && result === 'pending') {
    result = 'attacker_wins'
  }

  // 사기 붕괴 체크
  if (result === 'pending') {
    const attackerMorale = getAverageMorale(grid, battle.attackerFactionId)
    const defenderMorale = getAverageMorale(grid, battle.defenderFactionId)
    if (attackerMorale <= 10 && defenderMorale > 10) result = 'defender_wins'
    if (defenderMorale <= 10 && attackerMorale > 10) result = 'attacker_wins'
  }

  const log = [...battle.log]
  if (townOccupyTurns > 0 && townOccupyTurns < 3) {
    log.push({ turn: turnNumber, message: `본진 점령 ${townOccupyTurns}/3턴`, type: 'system' })
  }

  return {
    ...battle,
    grid,
    currentFaction: nextFaction,
    turnNumber,
    townOccupyTurns,
    selectedUnit: null,
    movablePositions: [],
    attackablePositions: [],
    log,
    phase: result !== 'pending' ? 'result' : (nextFaction === battle.attackerFactionId ? 'select' : 'enemy'),
    result,
  }
}

function getAllUnitsOfFaction(grid: BattleTile[][], factionId: string): BattleUnit[] {
  const units: BattleUnit[] = []
  for (const row of grid) for (const t of row) if (t.unit?.factionId === factionId) units.push(t.unit)
  return units
}

function getAverageMorale(grid: BattleTile[][], factionId: string): number {
  const units = getAllUnitsOfFaction(grid, factionId)
  if (units.length === 0) return 0
  return units.reduce((s, u) => s + u.morale, 0) / units.length
}

function checkBattleResult(grid: BattleTile[][], battle: BattleState) {
  const attackerAlive = getAllUnitsOfFaction(grid, battle.attackerFactionId).length
  const defenderAlive = getAllUnitsOfFaction(grid, battle.defenderFactionId).length
  if (defenderAlive === 0) return 'attacker_wins' as const
  if (attackerAlive === 0) return 'defender_wins' as const

  // 총대장 격파 체크
  const attackerLeader = getAllUnitsOfFaction(grid, battle.attackerFactionId).find(u => u.isLeader)
  const defenderLeader = getAllUnitsOfFaction(grid, battle.defenderFactionId).find(u => u.isLeader)
  if (!defenderLeader && defenderAlive > 0) return 'attacker_wins' as const
  if (!attackerLeader && attackerAlive > 0) return 'defender_wins' as const

  return 'pending' as const
}

// ── AI 전투 행동 (1유닛씩) ──

/** 미행동 AI 유닛이 남아있는지 */
export function hasUnactedAIUnits(battle: BattleState): boolean {
  return getAllUnitsOfFaction(battle.grid, battle.currentFaction).some(u => !u.acted)
}

/** AI 유닛 1명 행동 실행. 컴포넌트에서 딜레이 걸어 순차 호출한다. */
export function executeAISingleUnit(battle: BattleState): BattleState {
  let b = { ...battle }
  const units = getAllUnitsOfFaction(b.grid, b.currentFaction).filter(u => !u.acted)
  if (units.length === 0) return b

  const unit = units[0]
  const enemyFaction = b.currentFaction === b.attackerFactionId ? b.defenderFactionId : b.attackerFactionId
  const enemies = getAllUnitsOfFaction(b.grid, enemyFaction)
  if (enemies.length === 0) return b

  const weakestEnemy = [...enemies].sort((a, c) => (a.currentHp / a.character.maxHp) - (c.currentHp / c.character.maxHp))[0]

  b = selectUnit(b, unit.x, unit.y)
  if (!b.selectedUnit) {
    // select 실패 — acted 처리
    const grid = b.grid.map(row => row.map(t => ({ ...t, unit: t.unit ? { ...t.unit } : null })))
    const u = grid[unit.y]?.[unit.x]?.unit
    if (u) u.acted = true
    return { ...b, grid }
  }

  // AI 스킬 사용 시도
  const skillUsed = tryAISkill(b, b.selectedUnit, enemies)
  if (skillUsed) return skillUsed

  // 공격 가능하면 HP 낮은 적 우선
  if (b.attackablePositions.length > 0) {
    return attackUnit(b, pickBestTarget(b.attackablePositions, b.grid))
  }

  // 이동 → 공격 or 대기
  if (b.movablePositions.length > 0) {
    const sorted = [...b.movablePositions].sort((a, c) => {
      const da = Math.abs(a.x - weakestEnemy.x) + Math.abs(a.y - weakestEnemy.y)
      const dc = Math.abs(c.x - weakestEnemy.x) + Math.abs(c.y - weakestEnemy.y)
      return da - dc
    })
    b = moveUnit(b, sorted[0])

    if (b.attackablePositions.length > 0) {
      return attackUnit(b, pickBestTarget(b.attackablePositions, b.grid))
    }
    return endUnitAction(b)
  }

  return endUnitAction(b)
}

/** 레거시 호환 — 전체 AI 턴 일괄 실행 */
export function executeAIBattleTurn(battle: BattleState): BattleState {
  let b = battle
  while (hasUnactedAIUnits(b) && b.result === 'pending') {
    b = executeAISingleUnit(b)
  }
  return b
}

/** AI 스킬 사용 판단 */
function tryAISkill(battle: BattleState, unit: BattleUnit, enemies: BattleUnit[]): BattleState | null {
  const skills = getSkillsForUnit(unit)
  if (skills.length === 0) return null

  const cls = unit.character.unitClass
  const allies = getAllUnitsOfFaction(battle.grid, unit.factionId)
  const enemyFaction = unit.factionId === battle.attackerFactionId ? battle.defenderFactionId : battle.attackerFactionId

  for (const skill of skills) {
    if (!canUseSkill(unit, skill)) continue

    switch (cls) {
      case 'artist': {
        // 아군 HP 50% 이하 존재 → inspire
        if (skill.id === 'inspire' && allies.some(a => a.currentHp / a.character.maxHp < 0.5)) {
          return executeSkill(battle, unit, skill, null)
        }
        break
      }
      case 'official': {
        // 적 평균 사기 60+ → decree
        if (skill.id === 'decree') {
          const avgMorale = enemies.reduce((s, e) => s + e.morale, 0) / (enemies.length || 1)
          if (avgMorale >= 60) return executeSkill(battle, unit, skill, null)
        }
        break
      }
      case 'strategist': {
        // 적 2명 이상 밀집 → fire_arrow
        if (skill.id === 'fire_arrow') {
          for (const e of enemies) {
            const nearby = enemies.filter(o => o !== e && Math.abs(o.x - e.x) + Math.abs(o.y - e.y) <= 1)
            if (nearby.length >= 1) {
              const dist = Math.abs(unit.x - e.x) + Math.abs(unit.y - e.y)
              if (dist <= skill.range) return executeSkill(battle, unit, skill, { x: e.x, y: e.y })
            }
          }
        }
        // 단독 적 → confuse
        if (skill.id === 'confuse' && enemies.length > 0) {
          const target = enemies.find(e => {
            const dist = Math.abs(unit.x - e.x) + Math.abs(unit.y - e.y)
            return dist <= skill.range && !e.acted
          })
          if (target) return executeSkill(battle, unit, skill, { x: target.x, y: target.y })
        }
        break
      }
      case 'artisan': {
        // 성벽/성문 인접 → siege_ram
        if (skill.id === 'siege_ram') {
          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nx = unit.x + dx
            const ny = unit.y + dy
            if (nx < 0 || nx >= battle.width || ny < 0 || ny >= battle.height) continue
            const tile = battle.grid[ny][nx]
            if ((tile.terrain === 'wall' || tile.terrain === 'gate') && tile.wallHp && tile.wallHp > 0) {
              return executeSkill(battle, unit, skill, { x: nx, y: ny })
            }
          }
        }
        break
      }
      case 'general': {
        // 근접 적에게 charge
        if (skill.id === 'charge') {
          const target = enemies.find(e => Math.abs(unit.x - e.x) + Math.abs(unit.y - e.y) <= 1)
          if (target) return executeSkill(battle, unit, skill, { x: target.x, y: target.y })
        }
        break
      }
      case 'ranger': {
        // 약한 적(HP 30% 이하) → ambush
        if (skill.id === 'ambush') {
          const weakTarget = enemies.find(e => {
            const dist = Math.abs(unit.x - e.x) + Math.abs(unit.y - e.y)
            return dist <= skill.range && e.currentHp / e.character.maxHp <= 0.3
          })
          if (weakTarget) return executeSkill(battle, unit, skill, { x: weakTarget.x, y: weakTarget.y })
        }
        // 그 외 → scout
        if (skill.id === 'scout') {
          return executeSkill(battle, unit, skill, null)
        }
        break
      }
    }
  }

  return null
}

/** 공격 가능 타일 중 HP 가장 낮은 적 선택 */
function pickBestTarget(positions: Position[], grid: BattleTile[][]): Position {
  let best = positions[0]
  let bestHpRatio = Infinity
  for (const pos of positions) {
    const unit = grid[pos.y]?.[pos.x]?.unit
    if (unit) {
      const ratio = unit.currentHp / unit.character.maxHp
      if (ratio < bestHpRatio) {
        bestHpRatio = ratio
        best = pos
      }
    }
  }
  return best
}
