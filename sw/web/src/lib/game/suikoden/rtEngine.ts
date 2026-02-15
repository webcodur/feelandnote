// 천도 — 실시간 게임 엔진

import type {
  GameState, GameTime, CharacterPlacement, ConstructionSite,
  Position, Season, TerritoryId, Terrain, TaxRate,
} from './types'
import { RT, TERRAIN_MOVE_TICKS, BUILDINGS, TERRITORIES, DIFFICULTY_CONFIG } from './constants'
import { findPath } from './pathfinding'
import { generateTerritoryMap, addWallsToMap } from './mapGenerator'
import { evaluateAIDecisions, assignIdleCharactersForFaction } from './aiRealtime'
import { checkSeasonEvents } from './events'

// ── 메인 틱 처리 ──

export function processTick(state: GameState): GameState {
  let s = { ...state, tickCount: state.tickCount + 1 }

  // 1. 시간 진행
  s = advanceTime(s)

  // 2. 캐릭터 이동
  s = moveCharacters(s)

  // 3. 건설 진행
  s = updateConstructions(s)

  // 4. 자원 생산 (매 24틱 = 1일)
  if (s.tickCount % RT.RESOURCE_INTERVAL === 0) {
    s = generateResources(s)
  }

  // 5. 식량 소비 (매 720틱 = 30일)
  if (s.tickCount % RT.FOOD_CONSUME_INTERVAL === 0) {
    s = consumeFood(s)
  }

  // 5.5. 훈련 진행
  s = processTraining(s)

  // 6. AI 평가 (매 120틱 = 5일)
  if (s.tickCount % RT.AI_EVAL_INTERVAL === 0) {
    s = evaluateAIDecisions(s)

    // 플레이어 자동 내정
    if (s.autoAssign) {
      const playerFaction = s.factions.find(f => f.id === s.playerFactionId)
      if (playerFaction) {
        s = assignIdleCharactersForFaction(s, playerFaction)
      }
    }
  }

  // 7. 민심 변동 (매일)
  if (s.tickCount % RT.RESOURCE_INTERVAL === 0) {
    s = updateMorale(s)
  }

  // 8. 인구 변동 (매 30일)
  if (s.tickCount % RT.FOOD_CONSUME_INTERVAL === 0) {
    s = updatePopulation(s)
  }

  // 9. 이벤트 체크
  s = checkEvents(s)

  return s
}

// ── 시간 진행 ──

function advanceTime(state: GameState): GameState {
  const t = { ...state.gameTime }
  t.hour += RT.TICKS_PER_HOUR
  if (t.hour >= 24) {
    t.hour = 0
    t.day++
    if (t.day > 30) {
      t.day = 1
      t.month++
      if (t.month > 12) {
        t.month = 1
        t.year++
      }
    }
  }
  const season = getSeasonForMonth(t.month)
  return { ...state, gameTime: t, season }
}

function getSeasonForMonth(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

// ── 캐릭터 이동 ──

function moveCharacters(state: GameState): GameState {
  const placements = state.placements.map(p => {
    if (p.task !== 'moving' || p.path.length === 0) return p

    const next = p.path[0]
    const territory = findTerritoryForPlacement(state, p)
    if (!territory) return p

    const terrain = territory.map.grid[next.y]?.[next.x]?.terrain ?? 'plain'
    const cost = TERRAIN_MOVE_TICKS[terrain]

    const newProgress = p.taskProgress + 1 / cost
    if (newProgress >= 1) {
      const newPath = p.path.slice(1)
      if (newPath.length === 0) {
        // 도착: 예약된 태스크 전환
        if (p.taskTargetBuildingDefId) {
          return { ...p, x: next.x, y: next.y, path: [], taskProgress: 0, task: 'building' as const }
        }
        if (p.task === 'moving' && p.taskTargetPos) {
          // 연병장 근처 도착이면 training
          const nearTraining = territory!.map.grid.flatMap(r => r).some(t =>
            t.building?.defId === 'training' &&
            Math.abs(t.x - next.x) + Math.abs(t.y - next.y) <= 1
          )
          if (nearTraining && !p.taskTargetBuildingDefId) {
            return { ...p, x: next.x, y: next.y, path: [], taskProgress: 0, task: 'training' as const }
          }
          return { ...p, x: next.x, y: next.y, path: [], taskProgress: 0, task: 'working' as const }
        }
        return { ...p, x: next.x, y: next.y, path: [], taskProgress: 0, task: 'idle' as const }
      }
      return { ...p, x: next.x, y: next.y, path: newPath, taskProgress: 0 }
    }
    return { ...p, taskProgress: newProgress }
  })
  return { ...state, placements }
}

function findTerritoryForPlacement(state: GameState, p: CharacterPlacement) {
  for (const f of state.factions) {
    const t = f.territories.find(t => t.id === p.territoryId)
    if (t) return t
  }
  return null
}

// ── 건설 진행 ──

function updateConstructions(state: GameState): GameState {
  const completed: string[] = []
  const constructions = state.constructions.map(c => {
    // 빌더가 건설 위치에 있는지 확인
    const builder = state.placements.find(p => p.characterId === c.workerId && p.task === 'building')
    if (!builder) return c

    const newProgress = c.progress + 1 / c.totalTicks
    if (newProgress >= 1) {
      completed.push(c.id)
      return { ...c, progress: 1 }
    }
    return { ...c, progress: newProgress }
  })

  if (completed.length === 0) return { ...state, constructions }

  // 완성된 건설 처리
  let s = { ...state, constructions: constructions.filter(c => !completed.includes(c.id)) }
  const log = [...s.log]

  for (const cId of completed) {
    const site = constructions.find(c => c.id === cId)!
    const bDef = BUILDINGS.find(b => b.id === site.buildingDefId)
    if (!bDef) continue

    // 건물 인스턴스 배치
    s = {
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        territories: f.territories.map(t => {
          if (t.id !== site.territoryId) return t
          const newBuilding = { def: bDef, assigneeId: null, turnsLeft: 0 }
          let map = t.map
          // 성벽이면 맵에 반영
          if (bDef.id === 'walls') {
            map = addWallsToMap(map)
          }
          // 건물 아이콘을 맵 타일에 배치
          const grid = map.grid.map(row => row.map(tile => {
            if (tile.x === site.x && tile.y === site.y) {
              return { ...tile, building: { defId: bDef.id, level: 1, hp: 100, maxHp: 100, assigneeId: null, turnsLeft: 0 } }
            }
            return tile
          }))
          return { ...t, buildings: [...t.buildings, newBuilding], map: { ...map, grid } }
        }),
      })),
    }

    // 빌더를 idle로 전환
    s = {
      ...s,
      placements: s.placements.map(p =>
        p.characterId === site.workerId && p.task === 'building'
          ? { ...p, task: 'idle' as const, taskProgress: 0, taskTargetBuildingDefId: undefined }
          : p
      ),
    }

    log.push(`${bDef.name} 건설 완료! (명성 +2)`)

    // 명성 +2 (건설 완료)
    s = addFame(s, site.workerId, 2)
  }

  return { ...s, log }
}

// ── 자원 생산 ──

const TAX_MULTIPLIER: Record<TaxRate, number> = { low: 0.5, normal: 1, high: 1.5 }

function generateResources(state: GameState): GameState {
  const factions = state.factions.map(f => {
    const resources = { ...f.resources }
    for (const territory of f.territories) {
      // 기본 수입 (영토당, 세율 보정)
      const taxMul = TAX_MULTIPLIER[territory.taxRate ?? 'normal']
      resources.gold += Math.floor(2 * taxMul)
      resources.food += 2

      for (const bld of territory.buildings) {
        if (bld.turnsLeft > 0) continue
        const e = bld.def.effect

        // 근무자 보너스: 해당 건물에 근무 중인 캐릭터가 있으면 1.5배
        const hasWorker = state.placements.some(p =>
          p.task === 'working' && p.territoryId === territory.id &&
          isNearBuilding(p, territory, bld.def.id)
        )
        const mul = hasWorker ? 1.5 : 1

        if (e.goldPerTurn) resources.gold += Math.floor(e.goldPerTurn / 24 * mul)
        if (e.foodPerTurn) resources.food += Math.floor(e.foodPerTurn / 24 * mul)
        if (e.knowledgePerTurn) resources.knowledge += Math.floor(e.knowledgePerTurn / 24 * mul)
        if (e.materialPerTurn) resources.material += Math.floor(e.materialPerTurn / 24 * mul)
        if (e.troopsPerTurn) resources.troops += Math.floor(e.troopsPerTurn / 24 * mul)
      }
    }
    return { ...f, resources }
  })
  return { ...state, factions }
}

function isNearBuilding(
  p: CharacterPlacement,
  territory: { map: { grid: { x: number; y: number; building: { defId: string } | null }[][] } },
  buildingDefId: string,
): boolean {
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = p.x + dx
    const ny = p.y + dy
    const tile = territory.map.grid[ny]?.[nx]
    if (tile?.building?.defId === buildingDefId) return true
  }
  return false
}

// ── 식량 소비 ──

function consumeFood(state: GameState): GameState {
  const factions = state.factions.map(f => {
    const totalTroops = f.members.reduce((s, m) => s + m.troops, 0)
    const consumption = Math.floor(totalTroops / 50)
    const resources = { ...f.resources, food: f.resources.food - consumption }

    if (resources.food < 0) {
      resources.food = 0
      const members = f.members.map(m => ({
        ...m,
        morale: Math.max(0, m.morale - 5),
        loyaltyValue: Math.max(0, m.loyaltyValue - 3),
      }))
      return { ...f, resources, members }
    }
    return { ...f, resources }
  })
  return { ...state, factions }
}

// ── 이벤트 체크 ──

function checkEvents(state: GameState): GameState {
  // 승리 체크
  const activeFactions = state.factions.filter(f => f.territories.length > 0)
  if (activeFactions.length === 1) {
    return {
      ...state,
      isGameOver: true,
      winner: activeFactions[0].id,
      phase: 'result',
      speed: 0,
    }
  }

  // 계절/랜덤 이벤트
  return checkSeasonEvents(state)
}

// ── 명령 함수 ──

/** 캐릭터에게 이동 명령 */
export function commandMove(state: GameState, charId: string, targetPos: Position): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  const territory = findTerritoryForPlacement(state, placement)
  if (!territory) return state

  const path = findPath({ x: placement.x, y: placement.y }, targetPos, territory.map)
  if (path.length === 0) return state

  return {
    ...state,
    placements: state.placements.map(p =>
      p.characterId === charId
        ? { ...p, task: 'moving' as const, path, taskProgress: 0, taskTargetBuildingDefId: undefined, taskTargetPos: undefined }
        : p
    ),
  }
}

/** 캐릭터에게 건설 명령 */
export function commandBuild(
  state: GameState,
  charId: string,
  buildingDefId: string,
  targetPos: Position,
): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  const bDef = BUILDINGS.find(b => b.id === buildingDefId)
  if (!bDef) return state

  // 자원 차감
  const faction = state.factions.find(f => f.id === placement.factionId)
  if (!faction) return state
  if (faction.resources.gold < bDef.costGold || faction.resources.material < bDef.costMaterial) return state

  const territory = findTerritoryForPlacement(state, placement)
  if (!territory) return state

  const path = findPath({ x: placement.x, y: placement.y }, targetPos, territory.map)

  // 자원 차감
  const factions = state.factions.map(f =>
    f.id === placement.factionId
      ? { ...f, resources: { ...f.resources, gold: f.resources.gold - bDef.costGold, material: f.resources.material - bDef.costMaterial } }
      : f
  )

  // ConstructionSite 생성
  const construction: ConstructionSite = {
    id: `cs_${Date.now()}_${charId}`,
    buildingDefId,
    workerId: charId,
    territoryId: placement.territoryId,
    x: targetPos.x,
    y: targetPos.y,
    progress: 0,
    totalTicks: bDef.buildTurns * RT.CONSTRUCTION_TICKS_PER_TURN,
  }

  // 이미 위치에 있으면 바로 건설 시작
  const isAtTarget = placement.x === targetPos.x && placement.y === targetPos.y
  const isAdjacent = Math.abs(placement.x - targetPos.x) + Math.abs(placement.y - targetPos.y) <= 1

  return {
    ...state,
    factions,
    constructions: [...state.constructions, construction],
    placements: state.placements.map(p =>
      p.characterId === charId
        ? {
            ...p,
            task: (isAtTarget || isAdjacent) ? 'building' as const : 'moving' as const,
            path: (isAtTarget || isAdjacent) ? [] : path,
            taskProgress: 0,
            taskTargetBuildingDefId: buildingDefId,
            taskTargetPos: targetPos,
          }
        : p
    ),
    log: [...state.log, `${bDef.name} 건설 명령`],
  }
}

/** 캐릭터에게 근무 명령 */
export function commandWork(state: GameState, charId: string, buildingPos: Position): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  const territory = findTerritoryForPlacement(state, placement)
  if (!territory) return state

  // 인접 타일 중 빈 곳으로 이동
  const path = findPath({ x: placement.x, y: placement.y }, buildingPos, territory.map)
  const isNear = Math.abs(placement.x - buildingPos.x) + Math.abs(placement.y - buildingPos.y) <= 1

  return {
    ...state,
    placements: state.placements.map(p =>
      p.characterId === charId
        ? {
            ...p,
            task: isNear ? 'working' as const : 'moving' as const,
            path: isNear ? [] : path,
            taskProgress: 0,
            taskTargetBuildingDefId: undefined,
            taskTargetPos: buildingPos,
          }
        : p
    ),
  }
}

/** 캐릭터 순찰 명령 */
export function commandPatrol(state: GameState, charId: string): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  const territory = findTerritoryForPlacement(state, placement)
  if (!territory) return state

  // town 타일 주변을 순찰 경로로 생성
  const townTiles: Position[] = []
  for (const row of territory.map.grid) {
    for (const tile of row) {
      if (tile.terrain === 'town') townTiles.push({ x: tile.x, y: tile.y })
    }
  }

  if (townTiles.length === 0) return state

  // 순찰 경로: 현재 위치 → town 순회
  const patrolTarget = townTiles[Math.floor(Math.random() * townTiles.length)]
  const path = findPath({ x: placement.x, y: placement.y }, patrolTarget, territory.map)
  if (path.length === 0) return state

  return {
    ...state,
    placements: state.placements.map(p =>
      p.characterId === charId
        ? { ...p, task: 'patrolling' as const, path, taskProgress: 0 }
        : p
    ),
  }
}

/** 캐릭터를 idle로 전환 */
export function commandIdle(state: GameState, charId: string): GameState {
  return {
    ...state,
    placements: state.placements.map(p =>
      p.characterId === charId
        ? { ...p, task: 'idle' as const, path: [], taskProgress: 0, taskTargetBuildingDefId: undefined, taskTargetPos: undefined }
        : p
    ),
  }
}

/** 캐릭터 훈련 명령 (연병장 필요) */
export function commandTrain(state: GameState, charId: string): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  // 해당 영토에 연병장이 있는지 확인
  const territory = findTerritoryForPlacement(state, placement)
  if (!territory) return state
  const hasTrainingGround = territory.buildings.some(b => b.def.id === 'training' && b.turnsLeft === 0)
  if (!hasTrainingGround) return state

  // 연병장 타일 찾기
  const trainingTile = territory.map.grid.flatMap(row => row).find(t => t.building?.defId === 'training')
  if (!trainingTile) return state

  const path = findPath({ x: placement.x, y: placement.y }, { x: trainingTile.x, y: trainingTile.y }, territory.map)
  const isNear = Math.abs(placement.x - trainingTile.x) + Math.abs(placement.y - trainingTile.y) <= 1

  return {
    ...state,
    placements: state.placements.map(p =>
      p.characterId === charId
        ? {
            ...p,
            task: isNear ? 'training' as const : 'moving' as const,
            path: isNear ? [] : path,
            taskProgress: 0,
            taskTargetBuildingDefId: undefined,
            taskTargetPos: { x: trainingTile.x, y: trainingTile.y },
          }
        : p
    ),
    log: [...state.log, `훈련 명령`],
  }
}

/** 포상 (금화 → 충성도 상승) */
export function commandReward(state: GameState, charId: string): GameState {
  const REWARD_COST = 50
  const LOYALTY_GAIN = 10

  const faction = state.factions.find(f => f.members.some(m => m.id === charId))
  if (!faction || faction.resources.gold < REWARD_COST) return state

  return {
    ...state,
    factions: state.factions.map(f => {
      if (f.id !== faction.id) return f
      return {
        ...f,
        resources: { ...f.resources, gold: f.resources.gold - REWARD_COST },
        members: f.members.map(m =>
          m.id === charId
            ? { ...m, loyaltyValue: Math.min(100, m.loyaltyValue + LOYALTY_GAIN) }
            : m
        ),
      }
    }),
    log: [...state.log, `포상 (금 ${REWARD_COST})`],
  }
}

/** 처벌 (충성도 하락 + 사기 하락, 반란 억제) */
export function commandPunish(state: GameState, charId: string): GameState {
  const faction = state.factions.find(f => f.members.some(m => m.id === charId))
  if (!faction) return state

  return {
    ...state,
    factions: state.factions.map(f => {
      if (f.id !== faction.id) return f
      return {
        ...f,
        members: f.members.map(m =>
          m.id === charId
            ? { ...m, loyaltyValue: Math.max(0, m.loyaltyValue - 15), morale: Math.max(0, m.morale - 10) }
            : m
        ),
      }
    }),
    log: [...state.log, `처벌`],
  }
}

// ── 훈련 진행 (processTick에서 호출) ──

export function processTraining(state: GameState): GameState {
  const TRAINING_TICK_INTERVAL = 720 // 30일마다 스탯 성장
  if (state.tickCount % TRAINING_TICK_INTERVAL !== 0) return state

  let changed = false
  const factions = state.factions.map(f => {
    const members = f.members.map(m => {
      const placement = state.placements.find(p => p.characterId === m.id && p.task === 'training')
      if (!placement) return m

      changed = true
      const stats = { ...m.stats }
      // 훈련 시 power, skill, stamina 중 랜덤 1개 +1 (최대 99)
      const trainable: (keyof typeof stats)[] = ['power', 'skill', 'stamina']
      const target = trainable[Math.floor(Math.random() * trainable.length)]
      if (stats[target] < 99) stats[target] = stats[target] + 1

      return { ...m, stats }
    })
    return { ...f, members }
  })

  if (!changed) return state
  return { ...state, factions, log: [...state.log, '훈련 성과'] }
}

// ── 민심 변동 ──

function updateMorale(state: GameState): GameState {
  const TAX_MORALE: Record<TaxRate, number> = { low: 1, normal: 0, high: -1 }

  const factions = state.factions.map(f => {
    const territories = f.territories.map(t => {
      let delta = TAX_MORALE[t.taxRate ?? 'normal']

      // 사원/극장 효과
      for (const b of t.buildings) {
        if (b.turnsLeft > 0) continue
        if (b.def.effect.moralePerTurn) delta += b.def.effect.moralePerTurn / 24
      }

      // 순찰 효과: 순찰 중인 캐릭터가 있으면 민심 +0.5/일
      const hasPatrol = state.placements.some(p => p.territoryId === t.id && p.task === 'patrolling')
      if (hasPatrol) delta += 0.5

      // 식량 부족 시 민심 하락
      if (f.resources.food <= 0) delta -= 2

      const morale = Math.max(0, Math.min(100, t.morale + delta))
      return { ...t, morale: Math.round(morale * 10) / 10 }
    })
    return { ...f, territories }
  })
  return { ...state, factions }
}

// ── 인구 변동 ──

function updatePopulation(state: GameState): GameState {
  const factions = state.factions.map(f => {
    const territories = f.territories.map(t => {
      // 민심에 따른 인구 증감
      let growth = 0
      if (t.morale >= 80) growth = Math.floor(t.population * 0.02)      // 2% 증가
      else if (t.morale >= 50) growth = Math.floor(t.population * 0.005) // 0.5% 증가
      else if (t.morale >= 20) growth = -Math.floor(t.population * 0.01) // 1% 감소
      else growth = -Math.floor(t.population * 0.03)                     // 3% 감소 (폭동)

      const population = Math.max(100, t.population + growth)
      return { ...t, population }
    })
    return { ...f, territories }
  })
  return { ...state, factions }
}

// ── 경영 명령 ──

/** 건물 철거 (자재 50% 회수) */
export function commandDemolish(state: GameState, territoryId: TerritoryId, buildingDefId: string): GameState {
  const bDef = BUILDINGS.find(b => b.id === buildingDefId)
  if (!bDef) return state

  const materialReturn = Math.floor(bDef.costMaterial * 0.5)
  const goldReturn = Math.floor(bDef.costGold * 0.3)

  // 해당 건물에서 근무 중인 캐릭터 해제
  const buildingTile = state.factions.flatMap(f => f.territories)
    .find(t => t.id === territoryId)
    ?.map.grid.flatMap(r => r).find(t => t.building?.defId === buildingDefId)

  return {
    ...state,
    factions: state.factions.map(f => ({
      ...f,
      resources: f.territories.some(t => t.id === territoryId)
        ? { ...f.resources, material: f.resources.material + materialReturn, gold: f.resources.gold + goldReturn }
        : f.resources,
      territories: f.territories.map(t => {
        if (t.id !== territoryId) return t
        return {
          ...t,
          buildings: t.buildings.filter(b => b.def.id !== buildingDefId),
          map: {
            ...t.map,
            grid: t.map.grid.map(row => row.map(tile =>
              tile.building?.defId === buildingDefId
                ? { ...tile, building: null }
                : tile
            )),
          },
        }
      }),
    })),
    placements: buildingTile
      ? state.placements.map(p =>
          p.task === 'working' && p.territoryId === territoryId &&
          Math.abs(p.x - buildingTile.x) + Math.abs(p.y - buildingTile.y) <= 1
            ? { ...p, task: 'idle' as const, path: [], taskProgress: 0 }
            : p
        )
      : state.placements,
    log: [...state.log, `${bDef.name} 철거 (금+${goldReturn} 자재+${materialReturn})`],
  }
}

/** 세율 조정 */
// ── 명성 ──

/** 캐릭터가 속한 세력의 명성을 증감. amount가 음수이면 감소. */
export function addFame(state: GameState, charOrFactionId: string, amount: number): GameState {
  return {
    ...state,
    factions: state.factions.map(f => {
      const isFaction = f.id === charOrFactionId
      const hasMember = f.members.some(m => m.id === charOrFactionId)
      if (!isFaction && !hasMember) return f
      return { ...f, fame: Math.max(0, Math.min(1000, f.fame + amount)) }
    }),
  }
}

export function commandSetTaxRate(state: GameState, territoryId: TerritoryId, taxRate: TaxRate): GameState {
  return {
    ...state,
    factions: state.factions.map(f => ({
      ...f,
      territories: f.territories.map(t =>
        t.id === territoryId ? { ...t, taxRate } : t
      ),
    })),
    log: [...state.log, `세율 변경: ${taxRate === 'low' ? '낮음' : taxRate === 'high' ? '높음' : '보통'}`],
  }
}
