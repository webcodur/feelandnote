// 천도 — 턴제 게임 엔진

import type {
  GameState, GameTime, Season, TerritoryId, TaxRate, BuildingCard, ThreatCard, ThreatType, TroopEquipment,
} from './types'
import { TURN, BUILDINGS, TERRITORIES, DIFFICULTY_CONFIG, THREAT_DEFS, GRADE_SALARY, GRADE_FAME_REQ, EQUIPMENT_MAX } from './constants'
import { getTerritoryDef, getTotalTroops } from './utils'
import { evaluateAIDecisions, assignIdleCharactersForFaction } from './aiTurn'
import { checkSeasonEvents } from './events'

// ── 메인 턴 처리 ──

export function advanceTurn(state: GameState): GameState {
  // 방랑 페이즈에서는 턴 처리 안 함
  if (state.phase === 'wandering') return state
  // 전투 중이면 턴 처리 안 함
  if (state.phase === 'battle') return state

  let s = { ...state, turnCount: state.turnCount + 1 }

  // 1. 시간 진행 (+10일)
  s = advanceTime(s)

  // 2. 건설 진행
  s = updateConstructions(s)

  // 3. 자원 생산 (매 턴)
  s = generateResources(s)

  // 3.5. 급여 지불 (매 턴)
  s = paySalaries(s)

  // 4. 식량 소비 (3턴마다)
  if (s.turnCount % TURN.FOOD_CONSUME_INTERVAL === 0) {
    s = consumeFood(s)
  }

  // 5. 훈련 진행 (3턴마다)
  if (s.turnCount % TURN.TRAINING_INTERVAL === 0) {
    s = processTraining(s)
  }

  // 5.5. 체력 소모/회복
  s = updateStamina(s)

  // 6. AI 평가 + 선술집 방문자 (매 턴)
  s = evaluateAIDecisions(s)

  // AI 침공으로 전투가 시작되면 즉시 return
  if (s.phase === 'battle') return s

  s = updateTavernVisitors(s)
  s = updateThreats(s)

  // 플레이어 자동 내정
  if (s.autoAssign) {
    const playerFaction = s.factions.find(f => f.id === s.playerFactionId)
    if (playerFaction) {
      s = assignIdleCharactersForFaction(s, playerFaction)
    }
  }

  // 7. 민심 변동 (매 턴)
  s = updateMorale(s)

  // 8. 인구 변동 (3턴마다)
  if (s.turnCount % TURN.FOOD_CONSUME_INTERVAL === 0) {
    s = updatePopulation(s)
  }

  // 9. maxBuildings 갱신 (매 턴)
  s = updateMaxBuildings(s)

  // 10. 이벤트 체크
  s = checkEvents(s)

  return s
}

// ── 시간 진행 (+10일) ──

function advanceTime(state: GameState): GameState {
  const t = { ...state.gameTime }
  t.day += TURN.DAYS_PER_TURN
  if (t.day > 30) {
    t.day = t.day - 30
    t.month++
    if (t.month > 12) {
      t.month = 1
      t.year++
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

// ── 건설 진행 ──

function updateConstructions(state: GameState): GameState {
  let changed = false
  const log = [...state.log]

  const factions = state.factions.map(f => ({
    ...f,
    territories: f.territories.map(t => {
      const cards = t.buildingCards.map(card => {
        if (!card.isConstructing || !card.constructionWorkerId) return card

        // 빌더가 building 상태인지 확인
        const builder = state.placements.find(
          p => p.characterId === card.constructionWorkerId && p.task === 'building'
        )
        if (!builder) return card

        const bDef = BUILDINGS.find(b => b.id === card.defId)
        if (!bDef) return card

        const newTurnsLeft = card.constructionTurnsLeft - 1

        if (newTurnsLeft <= 0) {
          changed = true
          log.push(`${bDef.name} 건설 완료! (명성 +2)`)
          // 건설 완료 → 건설자가 자동으로 근무자가 됨
          return {
            ...card,
            isConstructing: false,
            constructionTurnsLeft: 0,
            assigneeId: card.constructionWorkerId, // 자동 근무 전환
            constructionWorkerId: null,
          }
        }
        return { ...card, constructionTurnsLeft: newTurnsLeft }
      })
      return { ...t, buildingCards: cards }
    }),
  }))

  if (!changed) {
    // turnsLeft만 갱신
    return { ...state, factions }
  }

  // 건설 완료된 건물의 빌더를 working으로 전환
  let placements = state.placements
  for (const f of factions) {
    for (const t of f.territories) {
      for (const card of t.buildingCards) {
        if (!card.isConstructing && card.assigneeId) {
          // 이전에 building이었던 캐릭터를 working으로 전환
          const oldCard = state.factions
            .flatMap(ff => ff.territories)
            .find(tt => tt.id === t.id)
            ?.buildingCards.find(c => c.instanceId === card.instanceId)

          if (oldCard?.isConstructing && !card.isConstructing) {
            placements = placements.map(p =>
              p.characterId === card.assigneeId && p.task === 'building'
                ? { ...p, task: 'working' as const, assignedBuildingId: card.instanceId }
                : p
            )
          }
        }
      }
    }
  }

  let s = { ...state, factions, placements, log }
  return s
}

// ── 자원 생산 (10일분) ──

const TAX_MULTIPLIER: Record<TaxRate, number> = { low: 0.5, normal: 1, high: 1.5 }

function generateResources(state: GameState): GameState {
  const factions = state.factions.map(f => {
    const resources = { ...f.resources }
    for (const territory of f.territories) {
      // 기본 수입 (10일분)
      const taxMul = TAX_MULTIPLIER[territory.taxRate ?? 'normal']
      resources.gold += Math.floor(20 * taxMul)
      resources.food += 20

      // 건물 생산 (10일분 = 턴 생산량의 10/30)
      for (const card of territory.buildingCards) {
        if (card.isConstructing) continue
        const bDef = BUILDINGS.find(b => b.id === card.defId)
        if (!bDef) continue
        const e = bDef.effect
        // 배치 인물이 실제 근무(working) 중일 때만 1.5배
        const isWorking = card.assigneeId
          ? state.placements.some(p => p.characterId === card.assigneeId && p.task === 'working')
          : false
        const mul = isWorking ? 1.5 : 1

        if (e.goldPerTurn) resources.gold += Math.floor(e.goldPerTurn / 3 * mul)
        if (e.foodPerTurn) resources.food += Math.floor(e.foodPerTurn / 3 * mul)
        if (e.knowledgePerTurn) resources.knowledge += Math.floor(e.knowledgePerTurn / 3 * mul)
        if (e.materialPerTurn) resources.material += Math.floor(e.materialPerTurn / 3 * mul)
        if (e.troopsPerTurn) resources.troops += Math.floor(e.troopsPerTurn / 3 * mul)
        // 무기고: 무기 생산 (턴당 100, 배치 시 150)
        if (e.special === 'weapons') resources.weapons += Math.floor(100 / 3 * mul)
      }
    }
    return { ...f, resources }
  })
  return { ...state, factions }
}

// ── 급여 지불 ──

function paySalaries(state: GameState): GameState {
  const log = [...state.log]
  const factions = state.factions.map(f => {
    const totalSalary = f.members.reduce((sum, m) => sum + (GRADE_SALARY[m.grade] ?? 2), 0)
    if (totalSalary === 0) return f

    const resources = { ...f.resources, gold: f.resources.gold - totalSalary }

    if (resources.gold < 0) {
      resources.gold = 0
      log.push(`${f.name} 급여 미지급! (충성도 -3)`)
      const members = f.members.map(m => ({
        ...m,
        loyaltyValue: Math.max(0, m.loyaltyValue - 3),
      }))
      return { ...f, resources, members }
    }

    return { ...f, resources }
  })
  return { ...state, factions, log }
}

// ── 식량 소비 ──

function consumeFood(state: GameState): GameState {
  const factions = state.factions.map(f => {
    const totalTroops = getTotalTroops(f)
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
  const activeFactions = state.factions.filter(f => f.territories.length > 0)
  if (activeFactions.length === 1) {
    return {
      ...state,
      isGameOver: true,
      winner: activeFactions[0].id,
      phase: 'result',
    }
  }
  return checkSeasonEvents(state)
}

// ── 명령 함수 ──

/** 캐릭터에게 건설 명령 */
export function commandBuild(
  state: GameState,
  charId: string,
  buildingDefId: string,
  territoryId: TerritoryId,
): GameState {
  let placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  // 건물에 배치 중이면 먼저 해제
  if (placement.assignedBuildingId) {
    state = commandUnassign(state, charId)
    placement = state.placements.find(p => p.characterId === charId)!
  }

  const bDef = BUILDINGS.find(b => b.id === buildingDefId)
  if (!bDef) return state

  const faction = state.factions.find(f => f.id === placement.factionId)
  if (!faction) return state
  if (faction.resources.gold < bDef.costGold || faction.resources.material < bDef.costMaterial) return state

  // 슬롯 체크
  const territory = faction.territories.find(t => t.id === territoryId)
  if (!territory) return state
  if (territory.buildingCards.length >= territory.maxBuildings) return state

  // 자원 차감
  const factions = state.factions.map(f =>
    f.id === placement.factionId
      ? { ...f, resources: { ...f.resources, gold: f.resources.gold - bDef.costGold, material: f.resources.material - bDef.costMaterial } }
      : f
  )

  // BuildingCard 생성
  const newCard: BuildingCard = {
    instanceId: `bc_${Date.now()}_${charId}`,
    defId: buildingDefId,
    assigneeId: null,
    isConstructing: true,
    constructionTurnsLeft: bDef.buildTurns,
    constructionWorkerId: charId,
  }

  // 영토에 카드 추가
  const updatedFactions = factions.map(f => ({
    ...f,
    territories: f.territories.map(t =>
      t.id === territoryId
        ? { ...t, buildingCards: [...t.buildingCards, newCard] }
        : t
    ),
  }))

  return {
    ...state,
    factions: updatedFactions,
    placements: state.placements.map(p =>
      p.characterId === charId
        ? { ...p, task: 'building' as const, assignedBuildingId: newCard.instanceId }
        : p
    ),
    log: [...state.log, `${bDef.name} 건설 명령`],
  }
}

/** 캐릭터를 건물에 배치 (완성 건물 → 근무, 건설 중 건물 → 건설 이어받기) */
export function commandAssign(state: GameState, charId: string, buildingInstanceId: string): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  // 해당 건물 찾기
  let found = false
  let isConstruction = false
  const factions = state.factions.map(f => ({
    ...f,
    territories: f.territories.map(t => ({
      ...t,
      buildingCards: t.buildingCards.map(card => {
        if (card.instanceId !== buildingInstanceId) return card
        // 완성 건물: 빈 자리에 배치
        if (!card.isConstructing && !card.assigneeId) {
          found = true
          return { ...card, assigneeId: charId }
        }
        // 건설 중 건물: 일꾼 없으면 이어받기
        if (card.isConstructing && !card.constructionWorkerId) {
          found = true
          isConstruction = true
          return { ...card, constructionWorkerId: charId }
        }
        return card
      }),
    })),
  }))

  if (!found) return state

  return {
    ...state,
    factions,
    placements: state.placements.map(p =>
      p.characterId === charId
        ? { ...p, task: (isConstruction ? 'building' : 'working') as 'building' | 'working', assignedBuildingId: buildingInstanceId }
        : p
    ),
  }
}

/** 캐릭터를 건물에 배치 (다른 건물/작업에서 자동 해제 + 점유자 있으면 교대) */
export function commandReassign(state: GameState, charId: string, buildingInstanceId: string): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  let s = state

  // 대상 건물의 현재 점유자 확인
  const targetCard = s.factions
    .flatMap(f => f.territories)
    .flatMap(t => t.buildingCards)
    .find(c => c.instanceId === buildingInstanceId)
  if (!targetCard) return state

  const occupantId = targetCard.isConstructing ? targetCard.constructionWorkerId : targetCard.assigneeId
  const srcBuildingId = placement.assignedBuildingId

  // 1) 이동하려는 인물의 기존 작업 해제 (hunting 포함)
  if (placement.task === 'hunting') {
    s = commandRecall(s, charId)
  } else if (srcBuildingId) {
    s = commandUnassign(s, charId)
  } else if (placement.task === 'training') {
    s = commandUnassign(s, charId)
  }

  // 2) 대상 건물에 점유자가 있으면 교대 (스왑)
  if (occupantId) {
    // 점유자를 원래 내 자리(srcBuilding)에 넣거나, 없으면 idle
    s = commandUnassign(s, occupantId)
    if (srcBuildingId) {
      s = commandAssign(s, occupantId, srcBuildingId)
    }
  }

  // 3) 새 건물에 배치
  return commandAssign(s, charId, buildingInstanceId)
}

/** 캐릭터를 건물에서 해제 (건설 중이면 일꾼만 제거, 건물은 유지) */
export function commandUnassign(state: GameState, charId: string): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  const factions = state.factions.map(f => ({
    ...f,
    territories: f.territories.map(t => ({
      ...t,
      buildingCards: t.buildingCards.map(card => {
        if (card.assigneeId === charId) return { ...card, assigneeId: null }
        if (card.constructionWorkerId === charId) return { ...card, constructionWorkerId: null }
        return card
      }),
    })),
  }))

  return {
    ...state,
    factions,
    placements: state.placements.map(p =>
      p.characterId === charId
        ? { ...p, task: 'idle' as const, assignedBuildingId: null }
        : p
    ),
  }
}

/** 캐릭터를 idle로 전환 */
export function commandIdle(state: GameState, charId: string): GameState {
  return commandUnassign(state, charId)
}

/** 캐릭터 훈련 명령 (연병장 필요) */
export function commandTrain(state: GameState, charId: string): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  // 해당 영토에 연병장 건물 카드가 있는지 확인
  const territory = state.factions
    .flatMap(f => f.territories)
    .find(t => t.id === placement.territoryId)
  if (!territory) return state

  const trainingCard = territory.buildingCards.find(c => c.defId === 'training' && !c.isConstructing)
  if (!trainingCard) return state

  return {
    ...state,
    placements: state.placements.map(p =>
      p.characterId === charId
        ? { ...p, task: 'training' as const, assignedBuildingId: trainingCard.instanceId }
        : p
    ),
    log: [...state.log, '훈련 명령'],
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

/** 처벌 */
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
    log: [...state.log, '처벌'],
  }
}

// ── 체력 소모/회복 ──

const STAMINA_DELTA = 10
const EXHAUSTION_THRESHOLD = 0.5
const RECOVERY_THRESHOLD = 0.8

function updateStamina(state: GameState): GameState {
  const log = [...state.log]
  let placements = [...state.placements]

  const factions = state.factions.map(f => {
    const members = f.members.map(m => {
      const placement = placements.find(p => p.characterId === m.id)
      if (!placement) return m

      let delta = 0
      if (placement.task === 'working' || placement.task === 'building' || placement.task === 'training' || placement.task === 'hunting') {
        delta = -STAMINA_DELTA
      } else if (placement.task === 'idle') {
        delta = STAMINA_DELTA
      }
      if (delta === 0) return m

      const newHp = Math.max(0, Math.min(m.maxHp, m.hp + delta))

      // 50% 미만 → 제자리 휴식 (건물 배치 유지, task만 idle)
      if (newHp < m.maxHp * EXHAUSTION_THRESHOLD && placement.task !== 'idle') {
        log.push(`${m.nickname} 체력 부족으로 휴식`)
        placements = placements.map(p =>
          p.characterId === m.id
            ? { ...p, task: 'idle' as const }
            : p
        )
        return { ...m, hp: newHp }
      }

      // 80% 이상 회복 + 건물에 배치된 idle → 자동 복귀
      if (newHp >= m.maxHp * RECOVERY_THRESHOLD && placement.task === 'idle' && placement.assignedBuildingId) {
        // 건설 중 건물인지 완성 건물인지 판별
        const card = f.territories
          .flatMap(t => t.buildingCards)
          .find(c => c.instanceId === placement.assignedBuildingId)
        if (card) {
          const resumeTask = card.isConstructing ? 'building' : 'working'
          placements = placements.map(p =>
            p.characterId === m.id
              ? { ...p, task: resumeTask as 'building' | 'working' }
              : p
          )
          log.push(`${m.nickname} 체력 회복, 업무 복귀`)
        }
      }

      return { ...m, hp: newHp }
    })
    return { ...f, members }
  })

  return { ...state, factions, placements, log }
}

// ── 훈련 진행 ──

export function processTraining(state: GameState): GameState {
  let changed = false
  const factions = state.factions.map(f => {
    const members = f.members.map(m => {
      const placement = state.placements.find(p => p.characterId === m.id && p.task === 'training')
      if (!placement) return m

      changed = true
      const stats = { ...m.stats }
      const trainable: ('command' | 'martial' | 'intellect')[] = ['command', 'martial', 'intellect']
      const target = trainable[Math.floor(Math.random() * trainable.length)]
      if (stats[target] < 100) stats[target] = stats[target] + 1

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

      // 사원/극장 효과 (10일분)
      for (const card of t.buildingCards) {
        if (card.isConstructing) continue
        const bDef = BUILDINGS.find(b => b.id === card.defId)
        if (bDef?.effect.moralePerTurn) delta += bDef.effect.moralePerTurn / 3
      }

      // 캐릭터 benevolence+charm 기반 민심 보정 (0~100 스케일)
      const territoryPlacements = state.placements.filter(p => p.territoryId === t.id && p.factionId === f.id)
      if (territoryPlacements.length > 0) {
        const chars = territoryPlacements
          .map(p => f.members.find(m => m.id === p.characterId))
          .filter(Boolean)
        if (chars.length > 0) {
          const avgVirtue = chars.reduce((s, c) => s + ((c!.stats.benevolence + c!.stats.charm) / 2), 0) / chars.length
          delta += avgVirtue * 0.05 // 100이면 +5/턴
        }
      }

      // 식량 부족
      if (f.resources.food <= 0) delta -= 5

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
      let growth = 0
      if (t.morale >= 80) growth = Math.floor(t.population * 0.02)
      else if (t.morale >= 50) growth = Math.floor(t.population * 0.005)
      else if (t.morale >= 20) growth = -Math.floor(t.population * 0.01)
      else growth = -Math.floor(t.population * 0.03)

      const population = Math.max(100, t.population + growth)
      return { ...t, population }
    })
    return { ...f, territories }
  })
  return { ...state, factions }
}

// ── maxBuildings 갱신 ──

function updateMaxBuildings(state: GameState): GameState {
  const factions = state.factions.map(f => ({
    ...f,
    territories: f.territories.map(t => ({
      ...t,
      maxBuildings: Math.min(12, Math.floor(8 + t.population / 5000)),
    })),
  }))
  return { ...state, factions }
}

// ── 경영 명령 ──

/** 건물 철거 */
export function commandDemolish(state: GameState, territoryId: TerritoryId, buildingInstanceId: string): GameState {
  let demolishedDefId: string | null = null
  let demolishedAssigneeId: string | null = null

  const factions = state.factions.map(f => ({
    ...f,
    territories: f.territories.map(t => {
      if (t.id !== territoryId) return t
      const card = t.buildingCards.find(c => c.instanceId === buildingInstanceId)
      if (!card) return t

      demolishedDefId = card.defId
      demolishedAssigneeId = card.assigneeId ?? card.constructionWorkerId

      return {
        ...t,
        buildingCards: t.buildingCards.filter(c => c.instanceId !== buildingInstanceId),
      }
    }),
  }))

  const bDef = demolishedDefId ? BUILDINGS.find(b => b.id === demolishedDefId) : null
  const materialReturn = bDef ? Math.floor(bDef.costMaterial * 0.5) : 0
  const goldReturn = bDef ? Math.floor(bDef.costGold * 0.3) : 0

  // 자원 반환
  const factionsWithReturn = factions.map(f =>
    f.territories.some(t => t.id === territoryId)
      ? { ...f, resources: { ...f.resources, material: f.resources.material + materialReturn, gold: f.resources.gold + goldReturn } }
      : f
  )

  // 배치된 캐릭터 해제
  const placements = demolishedAssigneeId
    ? state.placements.map(p =>
        p.characterId === demolishedAssigneeId
          ? { ...p, task: 'idle' as const, assignedBuildingId: null }
          : p
      )
    : state.placements

  return {
    ...state,
    factions: factionsWithReturn,
    placements,
    log: [...state.log, `${bDef?.name ?? '건물'} 철거 (금+${goldReturn} 자재+${materialReturn})`],
  }
}

// ── 명성 ──

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

// ── 선술집 방문자 시스템 ──

const TAVERN_VISIT_CHANCE = 0.10

function updateTavernVisitors(state: GameState): GameState {
  let visitors = [...state.tavernVisitors]
  let wanderers = [...state.wanderers]
  let factions = state.factions.map(f => ({ ...f, members: [...f.members], resources: { ...f.resources } }))
  let placements = [...state.placements]
  const log = [...state.log]

  // 1. 등용 판정: recruiterId가 있고 할당 후 1턴 이상 경과
  const toJudge = visitors.filter(
    v => v.recruiterId && v.recruiterAssignedTurn != null && state.turnCount > v.recruiterAssignedTurn
  )
  const judgedIds = new Set<string>()

  for (const visitor of toJudge) {
    const recruiterId = visitor.recruiterId!
    const faction = factions.find(f => f.members.some(m => m.id === recruiterId))
    if (!faction) continue

    const recruiter = faction.members.find(m => m.id === recruiterId)
    const leader = faction.members.find(m => m.id === faction.leaderId)
    const fameBonus = Math.min(0.20, faction.fame * 0.0002)
    const leaderBonus = leader
      ? (leader.stats.charm * 0.3 + leader.stats.benevolence * 0.1 + leader.stats.fairness * 0.1) / 100 * 0.15
      : 0
    const charBonus = recruiter ? recruiter.stats.charm * 0.003 : 0
    const rate = Math.min(0.95, 0.30 + fameBonus + leaderBonus + charBonus)

    const char = visitor.character
    judgedIds.add(char.id)

    if (Math.random() < rate) {
      // 성공 → 세력 합류
      factions = factions.map(f => {
        if (f.id !== faction.id) return f
        return { ...f, members: [...f.members, char] }
      })
      placements.push({
        characterId: char.id,
        factionId: faction.id,
        territoryId: visitor.territoryId,
        task: 'idle' as const,
        assignedBuildingId: null,
      })
      log.push(`${char.nickname}이(가) 합류했다!`)
    } else {
      // 실패 → recruiterId 초기화 (재시도 가능, departureTurn 내)
      log.push(`${char.nickname}이(가) 등용을 거절했다.`)
    }
  }

  // 판정 결과 반영: 성공한 방문자 제거, 실패한 방문자 recruiterId 초기화
  visitors = visitors.filter(v => {
    if (!judgedIds.has(v.character.id)) return true
    // 성공한 캐릭터는 이미 faction에 합류 → 방문자에서 제거
    const joined = factions.some(f => f.members.some(m => m.id === v.character.id))
    // 원래 faction에 있지 않던 캐릭터가 합류했으면 = 성공
    const wasInFaction = state.factions.some(f => f.members.some(m => m.id === v.character.id))
    if (joined && !wasInFaction) return false // 제거
    return true // 유지 (실패)
  }).map(v =>
    judgedIds.has(v.character.id)
      ? { ...v, recruiterId: null, recruiterAssignedTurn: null }
      : v
  )

  // 2. 퇴장: 기한 만료된 방문자 → wanderers로 복귀
  const expired = visitors.filter(v => state.turnCount >= v.departureTurn)
  const staying = visitors.filter(v => state.turnCount < v.departureTurn)
  for (const v of expired) {
    wanderers.push(v.character)
  }
  visitors = staying

  // 3. 신규 방문: 선술집 수량/근무자에 비례한 확률
  for (const faction of factions) {
    for (const territory of faction.territories) {
      const taverns = territory.buildingCards.filter(c => c.defId === 'tavern' && !c.isConstructing)
      if (taverns.length === 0 || wanderers.length === 0) continue

      // 선술집 수량 비례 확률 + 근무자 보너스
      const staffedCount = taverns.filter(t => t.assigneeId).length
      const chance = TAVERN_VISIT_CHANCE * taverns.length + staffedCount * 0.05
      if (Math.random() > chance) continue

      // 랜덤 wanderer 선택
      const idx = Math.floor(Math.random() * wanderers.length)
      const char = wanderers[idx]
      wanderers.splice(idx, 1)
      visitors.push({
        character: char,
        territoryId: territory.id,
        arrivalTurn: state.turnCount,
        departureTurn: state.turnCount + TURN.TAVERN_VISIT_DURATION,
        recruiterId: null,
        recruiterAssignedTurn: null,
      })
      log.push(`${char.nickname}이(가) ${territory.name} 선술집에 나타났다.`)
    }
  }

  return { ...state, tavernVisitors: visitors, wanderers, factions, placements, log }
}

// ── 선술집 등용 할당 (전략 페이즈) ──

/** 방문자에 등용 담당 인물 할당 (판정은 다음 턴) */
export function commandAssignRecruiter(
  state: GameState, visitorCharId: string, recruiterCharId: string
): GameState {
  const visitor = state.tavernVisitors.find(v => v.character.id === visitorCharId)
  if (!visitor) return state
  if (visitor.recruiterId) return state // 이미 할당됨

  // 명성 체크
  const faction = state.factions.find(f => f.members.some(m => m.id === recruiterCharId))
  if (!faction) return state
  const fameReq = GRADE_FAME_REQ[visitor.character.grade] ?? 0
  if (faction.fame < fameReq) return state

  return {
    ...state,
    tavernVisitors: state.tavernVisitors.map(v =>
      v.character.id === visitorCharId
        ? { ...v, recruiterId: recruiterCharId, recruiterAssignedTurn: state.turnCount }
        : v
    ),
    log: [...state.log, `${visitor.character.nickname}에게 등용 인물을 할당했다.`],
  }
}

/** 방문자 등용 할당 해제 */
export function commandCancelRecruiter(state: GameState, visitorCharId: string): GameState {
  return {
    ...state,
    tavernVisitors: state.tavernVisitors.map(v =>
      v.character.id === visitorCharId
        ? { ...v, recruiterId: null, recruiterAssignedTurn: null }
        : v
    ),
    log: [...state.log, '등용 할당 해제'],
  }
}

// ── 출몰 위협 시스템 ──

function updateThreats(state: GameState): GameState {
  let threats = [...state.threats]
  const log = [...state.log]
  let factions = state.factions.map(f => ({ ...f, territories: f.territories.map(t => ({ ...t })), resources: { ...f.resources }, members: f.members.map(m => ({ ...m })) }))
  let placements = [...state.placements]

  // 0. 순찰소 자동 토벌 — 근무자가 미배정 위협을 자동 처리
  const patrolResolved: string[] = []
  for (const faction of factions) {
    for (const territory of faction.territories) {
      const patrolCards = territory.buildingCards.filter(
        c => c.defId === 'patrol' && !c.isConstructing && c.assigneeId
      )
      if (patrolCards.length === 0) continue

      const unassignedThreats = threats.filter(
        t => t.territoryId === territory.id && !t.assignedCharId && !patrolResolved.includes(t.id)
      )
      for (const threat of unassignedThreats) {
        // 순찰원 중 아직 이번 턴에 토벌 안 한 첫 번째 인물
        const patrolChar = patrolCards
          .map(c => faction.members.find(m => m.id === c.assigneeId))
          .find(m => m != null)
        if (!patrolChar) break

        // 성공률 = 기존 토벌과 동일
        const rate = Math.max(10, Math.min(95,
          40 + patrolChar.stats.martial * 0.4 + patrolChar.stats.courage * 0.2 - threat.power * 5
        ))
        if (Math.random() * 100 < rate) {
          const goldReward = 10 + threat.power * 5
          log.push(`순찰원 ${patrolChar.nickname}이(가) ${THREAT_DEFS[threat.type].name}을(를) 퇴치! (금+${goldReward})`)
          factions = factions.map(f => {
            if (f.id !== faction.id) return f
            return {
              ...f,
              fame: Math.min(1000, f.fame + 3),
              resources: { ...f.resources, gold: f.resources.gold + goldReward },
            }
          })
          patrolResolved.push(threat.id)
        }
        // 실패 시 무시 — 순찰은 자동이므로 HP 손실 없이 넘어감, 수동 토벌 가능
      }
    }
  }
  threats = threats.filter(t => !patrolResolved.includes(t.id))

  // 1. 만료 처리 — 미배정 위협이 만료되면 피해
  const expired = threats.filter(t => state.turnCount >= t.expiryTurn && !t.assignedCharId)
  for (const threat of expired) {
    const threatDef = THREAT_DEFS[threat.type]
    log.push(`${threatDef.name} 위협이 방치되어 피해 발생! (민심 -10)`)
    factions = factions.map(f => ({
      ...f,
      territories: f.territories.map(t => {
        if (t.id !== threat.territoryId) return t
        return { ...t, morale: Math.max(0, t.morale - 10) }
      }),
      resources: threat.type === 'bandit'
        ? { ...f.resources, gold: Math.max(0, f.resources.gold - 30) }
        : threat.type === 'beast'
          ? { ...f.resources, food: Math.max(0, f.resources.food - 30) }
          : f.resources,
    }))
  }
  // 배정 중인데 만료된 위협도 제거 (실패 간주)
  const allExpired = threats.filter(t => state.turnCount >= t.expiryTurn)
  for (const threat of allExpired) {
    if (threat.assignedCharId) {
      placements = placements.map(p =>
        p.characterId === threat.assignedCharId && p.task === 'hunting'
          ? { ...p, task: 'idle' as const, assignedBuildingId: null }
          : p
      )
    }
  }
  threats = threats.filter(t => state.turnCount < t.expiryTurn)

  // 2. 토벌 판정 — 배정된 인물이 있는 위협
  const toResolve = threats.filter(t => t.assignedCharId)
  const resolved: string[] = []

  for (const threat of toResolve) {
    const charId = threat.assignedCharId!
    const faction = factions.find(f => f.members.some(m => m.id === charId))
    if (!faction) continue
    const char = faction.members.find(m => m.id === charId)
    if (!char) continue

    // 성공률 = 40 + martial*0.4 + courage*0.2 - 위협power*5, 클램프 10~95
    const rate = Math.max(10, Math.min(95, 40 + char.stats.martial * 0.4 + char.stats.courage * 0.2 - threat.power * 5))
    const roll = Math.random() * 100

    if (roll < rate) {
      // 성공
      const goldReward = 10 + threat.power * 5
      const materialReward = 5 + threat.power * 2
      log.push(`${char.nickname}이(가) ${THREAT_DEFS[threat.type].name}을(를) 토벌했다! (명성+5, 금+${goldReward})`)
      factions = factions.map(f => {
        if (f.id !== faction.id) return f
        return {
          ...f,
          fame: Math.min(1000, f.fame + 5),
          resources: { ...f.resources, gold: f.resources.gold + goldReward, material: f.resources.material + materialReward },
        }
      })
      resolved.push(threat.id)
      // 인물 idle 복귀
      placements = placements.map(p =>
        p.characterId === charId && p.task === 'hunting'
          ? { ...p, task: 'idle' as const, assignedBuildingId: null }
          : p
      )
    } else {
      // 실패 — HP 손실, 위협 유지, 인물 idle 복귀 (재시도 가능)
      const hpLoss = 15 + threat.power * 3
      log.push(`${char.nickname}이(가) ${THREAT_DEFS[threat.type].name} 토벌에 실패했다. (HP -${hpLoss})`)
      factions = factions.map(f => ({
        ...f,
        members: f.members.map(m =>
          m.id === charId ? { ...m, hp: Math.max(1, m.hp - hpLoss) } : m
        ),
      }))
      // 배정 해제 (재시도 가능)
      threats = threats.map(t =>
        t.id === threat.id ? { ...t, assignedCharId: null } : t
      )
      placements = placements.map(p =>
        p.characterId === charId && p.task === 'hunting'
          ? { ...p, task: 'idle' as const, assignedBuildingId: null }
          : p
      )
    }
  }
  threats = threats.filter(t => !resolved.includes(t.id))

  // 3. 신규 출몰
  const threatTypes: ThreatType[] = ['bandit', 'beast', 'plague', 'spy']
  for (const faction of factions) {
    for (const territory of faction.territories) {
      const existing = threats.filter(t => t.territoryId === territory.id)
      if (existing.length >= TURN.MAX_THREATS_PER_TERRITORY) continue
      if (Math.random() > TURN.THREAT_CHANCE) continue

      const type = threatTypes[Math.floor(Math.random() * threatTypes.length)]
      const def = THREAT_DEFS[type]
      const power = def.powerMin + Math.floor(Math.random() * (def.powerMax - def.powerMin + 1))

      const newThreat: ThreatCard = {
        id: `threat_${state.turnCount}_${territory.id}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        name: def.name,
        icon: def.icon,
        power,
        territoryId: territory.id,
        arrivalTurn: state.turnCount,
        expiryTurn: state.turnCount + TURN.THREAT_DURATION,
        assignedCharId: null,
        turnsToResolve: 1,
      }
      threats.push(newThreat)
      log.push(`${territory.name}에 ${def.name}이(가) 출몰했다!`)
    }
  }

  return { ...state, threats, factions, placements, log }
}

/** 인물을 위협에 배정 (토벌 명령) — 기존 작업에서 자동 해제 */
export function commandDispatch(state: GameState, charId: string, threatId: string): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  const threat = state.threats.find(t => t.id === threatId)
  if (!threat || threat.assignedCharId) return state

  // 같은 영토인지 확인
  if (placement.territoryId !== threat.territoryId) return state

  // 기존 작업 해제
  let s = state
  if (placement.task === 'hunting') {
    s = commandRecall(s, charId)
  } else if (placement.assignedBuildingId || placement.task === 'training') {
    s = commandUnassign(s, charId)
  }

  return {
    ...s,
    threats: s.threats.map(t =>
      t.id === threatId ? { ...t, assignedCharId: charId } : t
    ),
    placements: s.placements.map(p =>
      p.characterId === charId
        ? { ...p, task: 'hunting' as const, assignedBuildingId: null }
        : p
    ),
    log: [...s.log, `토벌 명령`],
  }
}

/** 토벌 취소 */
export function commandRecall(state: GameState, charId: string): GameState {
  return {
    ...state,
    threats: state.threats.map(t =>
      t.assignedCharId === charId ? { ...t, assignedCharId: null } : t
    ),
    placements: state.placements.map(p =>
      p.characterId === charId && p.task === 'hunting'
        ? { ...p, task: 'idle' as const, assignedBuildingId: null }
        : p
    ),
    log: [...state.log, '토벌 취소'],
  }
}

/** 세율 조정 */
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

/** 장비 배분: 세력 재고 → 캐릭터 장비 이전 */
export function commandEquip(
  state: GameState,
  factionId: string,
  charId: string,
  type: keyof TroopEquipment,
  amount: number,
): GameState {
  const faction = state.factions.find(f => f.id === factionId)
  if (!faction) return state
  const char = faction.members.find(m => m.id === charId)
  if (!char) return state

  const available = faction.resources[type]
  const max = EQUIPMENT_MAX[type]
  const current = char.equipment[type]
  const actual = Math.min(amount, available, max - current)
  if (actual <= 0) return state

  return {
    ...state,
    factions: state.factions.map(f =>
      f.id !== factionId ? f : {
        ...f,
        resources: { ...f.resources, [type]: f.resources[type] - actual },
        members: f.members.map(m =>
          m.id !== charId ? m : {
            ...m,
            equipment: { ...m.equipment, [type]: m.equipment[type] + actual },
          },
        ),
      },
    ),
  }
}
