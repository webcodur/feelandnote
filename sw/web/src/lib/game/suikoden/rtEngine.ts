// 천도 — 실시간 게임 엔진

import type {
  GameState, GameTime, Season, TerritoryId, TaxRate, BuildingCard,
} from './types'
import { RT, BUILDINGS, TERRITORIES, DIFFICULTY_CONFIG } from './constants'
import { evaluateAIDecisions, assignIdleCharactersForFaction } from './aiRealtime'
import { checkSeasonEvents } from './events'

// ── 메인 틱 처리 ──

export function processTick(state: GameState): GameState {
  let s = { ...state, tickCount: state.tickCount + 1 }

  // 1. 시간 진행
  s = advanceTime(s)

  // 2. 건설 진행
  s = updateConstructions(s)

  // 3. 자원 생산 (매 24틱 = 1일)
  if (s.tickCount % RT.RESOURCE_INTERVAL === 0) {
    s = generateResources(s)
  }

  // 4. 식량 소비 (매 720틱 = 30일)
  if (s.tickCount % RT.FOOD_CONSUME_INTERVAL === 0) {
    s = consumeFood(s)
  }

  // 5. 훈련 진행
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

  // 9. maxBuildings 갱신 (매일)
  if (s.tickCount % RT.RESOURCE_INTERVAL === 0) {
    s = updateMaxBuildings(s)
  }

  // 10. 이벤트 체크
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

        const totalTicks = bDef.buildTurns * RT.CONSTRUCTION_TICKS_PER_TURN
        const newProgress = card.constructionProgress + 1 / totalTicks

        if (newProgress >= 1) {
          changed = true
          log.push(`${bDef.name} 건설 완료! (명성 +2)`)
          // 건설 완료 → 건설자가 자동으로 근무자가 됨
          return {
            ...card,
            isConstructing: false,
            constructionProgress: 1,
            assigneeId: card.constructionWorkerId, // 자동 근무 전환
            constructionWorkerId: null,
          }
        }
        return { ...card, constructionProgress: newProgress }
      })
      return { ...t, buildingCards: cards }
    }),
  }))

  if (!changed) {
    // progress만 갱신
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
                ? { ...p, task: 'working' as const, taskProgress: 0, assignedBuildingId: card.instanceId }
                : p
            )
          }
        }
      }
    }
  }

  // 명성 추가
  let s = { ...state, factions, placements, log }
  // TODO: addFame 로직 간소화
  return s
}

// ── 자원 생산 ──

const TAX_MULTIPLIER: Record<TaxRate, number> = { low: 0.5, normal: 1, high: 1.5 }

function generateResources(state: GameState): GameState {
  const factions = state.factions.map(f => {
    const resources = { ...f.resources }
    for (const territory of f.territories) {
      // 기본 수입
      const taxMul = TAX_MULTIPLIER[territory.taxRate ?? 'normal']
      resources.gold += Math.floor(2 * taxMul)
      resources.food += 2

      // 건물 생산
      for (const card of territory.buildingCards) {
        if (card.isConstructing) continue
        const bDef = BUILDINGS.find(b => b.id === card.defId)
        if (!bDef) continue
        const e = bDef.effect
        const mul = card.assigneeId ? 1.5 : 1

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
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

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
    constructionProgress: 0,
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
        ? { ...p, task: 'building' as const, taskProgress: 0, assignedBuildingId: newCard.instanceId }
        : p
    ),
    log: [...state.log, `${bDef.name} 건설 명령`],
  }
}

/** 캐릭터를 건물에 배치 */
export function commandAssign(state: GameState, charId: string, buildingInstanceId: string): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  // 해당 건물 찾기
  let found = false
  const factions = state.factions.map(f => ({
    ...f,
    territories: f.territories.map(t => ({
      ...t,
      buildingCards: t.buildingCards.map(card => {
        if (card.instanceId === buildingInstanceId && !card.isConstructing && !card.assigneeId) {
          found = true
          return { ...card, assigneeId: charId }
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
        ? { ...p, task: 'working' as const, taskProgress: 0, assignedBuildingId: buildingInstanceId }
        : p
    ),
  }
}

/** 캐릭터를 건물에서 해제 */
export function commandUnassign(state: GameState, charId: string): GameState {
  const placement = state.placements.find(p => p.characterId === charId)
  if (!placement) return state

  const factions = state.factions.map(f => ({
    ...f,
    territories: f.territories.map(t => ({
      ...t,
      buildingCards: t.buildingCards.map(card =>
        card.assigneeId === charId ? { ...card, assigneeId: null } : card
      ),
    })),
  }))

  return {
    ...state,
    factions,
    placements: state.placements.map(p =>
      p.characterId === charId
        ? { ...p, task: 'idle' as const, taskProgress: 0, assignedBuildingId: null }
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
        ? { ...p, task: 'training' as const, taskProgress: 0, assignedBuildingId: trainingCard.instanceId }
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

// ── 훈련 진행 ──

export function processTraining(state: GameState): GameState {
  const TRAINING_TICK_INTERVAL = 720
  if (state.tickCount % TRAINING_TICK_INTERVAL !== 0) return state

  let changed = false
  const factions = state.factions.map(f => {
    const members = f.members.map(m => {
      const placement = state.placements.find(p => p.characterId === m.id && p.task === 'training')
      if (!placement) return m

      changed = true
      const stats = { ...m.stats }
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
      for (const card of t.buildingCards) {
        if (card.isConstructing) continue
        const bDef = BUILDINGS.find(b => b.id === card.defId)
        if (bDef?.effect.moralePerTurn) delta += bDef.effect.moralePerTurn / 24
      }

      // 캐릭터 virtue 기반 민심 보정 (순찰 대체)
      const territoryPlacements = state.placements.filter(p => p.territoryId === t.id && p.factionId === f.id)
      if (territoryPlacements.length > 0) {
        const chars = territoryPlacements
          .map(p => f.members.find(m => m.id === p.characterId))
          .filter(Boolean)
        if (chars.length > 0) {
          const avgVirtue = chars.reduce((s, c) => s + (c!.stats.virtue ?? 0), 0) / chars.length
          delta += avgVirtue * 0.05 // virtue 10이면 +0.5/일
        }
      }

      // 식량 부족
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
          ? { ...p, task: 'idle' as const, taskProgress: 0, assignedBuildingId: null }
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
