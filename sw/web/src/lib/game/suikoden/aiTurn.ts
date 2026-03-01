// 천도 — AI 턴제 행동

import type { GameState, Faction, TerritoryId } from './types'
import { BUILDINGS, BUILDING_CATEGORY } from './constants'
import { shuffle, getTerritoryDef, getTotalTroops, isActiveTerritory } from './utils'
import { commandBuild, commandAssign, commandTrain, commandDispatch, commandAssignRecruiter, commandEquip } from './turnEngine'
import { initBattle } from './engine'

/** 매 턴마다 호출. AI 세력들의 의사결정 실행. */
export function evaluateAIDecisions(state: GameState): GameState {
  let s = { ...state }

  for (const faction of s.factions) {
    if (faction.id === s.playerFactionId) continue
    if (faction.territories.length === 0) continue

    s = executeAIFaction(s, faction)

    // AI 침공으로 전투가 시작되면 즉시 중단
    if (s.phase === 'battle') return s
  }

  return s
}

function executeAIFaction(state: GameState, faction: Faction): GameState {
  let s = state
  const personality = faction.aiPersonality ?? 'conqueror'

  // 1. idle 캐릭터에게 일 부여
  s = assignIdleCharacters(s, faction)

  // 2. 건설 결정
  if (faction.resources.gold >= 150) {
    s = aiBuild(s, faction, personality)
  }

  // 3. 병사 모집
  const hasBarracks = faction.territories.some(t =>
    t.buildingCards.some(c => c.defId === 'barracks' && !c.isConstructing)
  )
  if (hasBarracks && faction.resources.food > 100) {
    s = aiRecruit(s, faction)
  }

  // 4. 무주지 확장
  s = aiExpand(s, faction)

  // 5. 장비 자동 분배
  s = aiDistributeEquipment(s, faction)

  // 6. 침공 판단 (이미 전투 중이면 스킵)
  if (!s.battle && shouldInvade(s, faction, personality)) {
    s = aiInvade(s, faction)
  }

  return s
}

/** AI 장비 자동 분배: 세력 재고를 등급순 멤버에게 균등 분배 */
function aiDistributeEquipment(state: GameState, faction: Faction): GameState {
  let s = state
  const f = s.factions.find(ff => ff.id === faction.id)
  if (!f) return s

  const types = ['weapons', 'horses', 'ships', 'charms'] as const
  for (const type of types) {
    if (f.resources[type] <= 0) continue
    // 등급순 정렬 (높은 등급 우선)
    const sorted = [...f.members].sort((a, b) => b.totalScore - a.totalScore)
    const perMember = Math.floor(f.resources[type] / sorted.length)
    if (perMember <= 0) continue
    for (const member of sorted) {
      s = commandEquip(s, faction.id, member.id, type, perMember)
    }
  }
  return s
}

// ── idle 캐릭터에게 건물 배치 ──

/** 외부에서도 호출 가능한 범용 함수 (플레이어 자동 내정용) */
export function assignIdleCharactersForFaction(state: GameState, faction: Faction): GameState {
  return assignIdleCharacters(state, faction)
}

function assignIdleCharacters(state: GameState, faction: Faction): GameState {
  let s = state

  // 건물에 배치된 채 휴식 중인 인물은 제외 (HP 회복 후 자동 복귀)
  const getIdlePlacements = () => s.placements.filter(
    p => p.factionId === faction.id && p.task === 'idle' && !p.assignedBuildingId
  )

  // 체력 50% 이상인 idle만 일 시킨다
  const canWork = (charId: string) => {
    const f = s.factions.find(ff => ff.id === faction.id)
    const m = f?.members.find(mm => mm.id === charId)
    return m ? m.hp >= m.maxHp * 0.5 : false
  }

  // 0단계: 미배정 위협에 전투력 높은 idle 인물 배정
  for (const territory of faction.territories) {
    const unassignedThreats = s.threats.filter(t => t.territoryId === territory.id && !t.assignedCharId)
    for (const threat of unassignedThreats) {
      const idleInTerritory = getIdlePlacements().filter(p => p.territoryId === territory.id && canWork(p.characterId))
      if (idleInTerritory.length === 0) break
      // 가장 전투력 높은 인물 (martial + courage)
      const best = idleInTerritory
        .map(p => {
          const f = s.factions.find(ff => ff.id === faction.id)
          const m = f?.members.find(mm => mm.id === p.characterId)
          return { placement: p, score: m ? m.stats.martial + m.stats.courage : 0 }
        })
        .sort((a, b) => b.score - a.score)[0]
      if (best) {
        s = commandDispatch(s, best.placement.characterId, threat.id)
      }
    }
  }

  // 0.5단계: 미할당 방문자에 idle 인물 할당 (등용)
  for (const territory of faction.territories) {
    const unassignedVisitors = s.tavernVisitors.filter(
      v => v.territoryId === territory.id && !v.recruiterId
    )
    for (const visitor of unassignedVisitors) {
      const idleInTerritory = getIdlePlacements().filter(p => p.territoryId === territory.id && canWork(p.characterId))
      if (idleInTerritory.length === 0) break
      // 매력(charisma) 높은 인물 우선
      const best = idleInTerritory
        .map(p => {
          const f = s.factions.find(ff => ff.id === faction.id)
          const m = f?.members.find(mm => mm.id === p.characterId)
          return { placement: p, score: m ? m.stats.charisma : 0 }
        })
        .sort((a, b) => b.score - a.score)[0]
      if (best) {
        s = commandAssignRecruiter(s, visitor.character.id, best.placement.characterId)
      }
    }
  }

  // 1단계: 빈 완성 건물에 배치
  for (const placement of getIdlePlacements()) {
    if (!canWork(placement.characterId)) continue
    const territory = s.factions.find(f => f.id === faction.id)?.territories.find(t => t.id === placement.territoryId)
    if (!territory) continue

    const unassignedCards = territory.buildingCards.filter(
      c => !c.isConstructing && !c.assigneeId
    )
    if (unassignedCards.length > 0) {
      s = commandAssign(s, placement.characterId, unassignedCards[0].instanceId)
    }
  }

  // 2단계: 건설 가능하면 건설 (슬롯 여유 + 자원 충분)
  for (const placement of getIdlePlacements()) {
    if (!canWork(placement.characterId)) continue
    const curFaction = s.factions.find(f => f.id === faction.id)
    if (!curFaction) break
    const territory = curFaction.territories.find(t => t.id === placement.territoryId)
    if (!territory || territory.buildingCards.length >= territory.maxBuildings) continue

    const existingIds = new Set(territory.buildingCards.map(c => c.defId))
    // 우선순위: 경제 → 군사 → 문화
    const buildOrder = ['farm', 'lumber', 'market', 'barracks', 'patrol', 'tavern', 'library', 'trade', 'mine', 'training', 'temple', 'theater', 'academy', 'armory', 'walls']
    for (const bId of buildOrder) {
      if (existingIds.has(bId)) continue
      const bDef = BUILDINGS.find(b => b.id === bId)
      if (!bDef) continue
      if (curFaction.resources.gold < bDef.costGold || curFaction.resources.material < bDef.costMaterial) continue
      // 스탯 조건 체크
      if (bDef.requireStat && bDef.requireStatMin) {
        const char = curFaction.members.find(m => m.id === placement.characterId)
        if (!char || char.stats[bDef.requireStat as keyof typeof char.stats] < bDef.requireStatMin) continue
      }
      s = commandBuild(s, placement.characterId, bId, territory.id)
      break
    }
  }

  // 3단계: 남은 idle → 훈련 (연병장 있으면)
  for (const placement of getIdlePlacements()) {
    if (!canWork(placement.characterId)) continue
    const territory = s.factions.find(f => f.id === faction.id)?.territories.find(t => t.id === placement.territoryId)
    if (!territory) continue
    const hasTraining = territory.buildingCards.some(c => c.defId === 'training' && !c.isConstructing)
    if (hasTraining) {
      s = commandTrain(s, placement.characterId)
    }
  }

  return s
}

// ── 건설 ──

function aiBuild(state: GameState, faction: Faction, personality: string): GameState {
  const territory = faction.territories[0]
  if (!territory) return state
  if (territory.buildingCards.length >= territory.maxBuildings) return state

  const existingIds = new Set(territory.buildingCards.map(c => c.defId))

  const priorities: Record<string, string[]> = {
    conqueror: ['barracks', 'training', 'armory', 'farm'],
    schemer: ['academy', 'library', 'temple', 'farm'],
    economist: ['market', 'trade', 'farm', 'lumber'],
    virtuous: ['temple', 'theater', 'farm', 'library'],
    culturist: ['theater', 'library', 'farm', 'market'],
  }

  const pList = priorities[personality] ?? priorities.economist
  for (const bId of pList) {
    if (existingIds.has(bId)) continue
    const bDef = BUILDINGS.find(b => b.id === bId)
    if (!bDef) continue
    if (faction.resources.gold < bDef.costGold) continue
    if (faction.resources.material < bDef.costMaterial) continue

    // 건설할 빈 캐릭터 찾기
    const builder = state.placements.find(
      p => p.factionId === faction.id && p.task === 'idle' && p.territoryId === territory.id
    )
    if (!builder) break

    return commandBuild(state, builder.characterId, bId, territory.id)
  }

  return state
}

// ── 병사 모집 ──

function aiRecruit(state: GameState, faction: Faction): GameState {
  const totalRecruit = Math.min(100, faction.resources.food)
  return {
    ...state,
    factions: state.factions.map(f =>
      f.id === faction.id
        ? {
            ...f,
            resources: { ...f.resources, food: f.resources.food - totalRecruit },
            members: f.members.map(m => ({
              ...m,
              troops: Math.min(m.maxTroops, m.troops + Math.floor(totalRecruit / f.members.length)),
            })),
          }
        : f
    ),
  }
}

// ── 무주지 확장 ──

function aiExpand(state: GameState, faction: Faction): GameState {
  const allOccupied = new Set<TerritoryId>()
  for (const f of state.factions) for (const t of f.territories) allOccupied.add(t.id)

  for (const territory of faction.territories) {
    const def = getTerritoryDef(territory.id)
    if (!def) continue
    for (const nId of def.neighbors) {
      if (allOccupied.has(nId)) continue
      if (!isActiveTerritory(state, nId as TerritoryId)) continue
      if (Math.random() < 0.1) {
        const nDef = getTerritoryDef(nId)
        const newTerritory = {
          id: nId as TerritoryId,
          name: nDef?.name ?? '미지',
          regionId: nDef?.regionId ?? 'west_europe' as const,
          buildingCards: [],
          maxBuildings: 8,
          population: 500,
          morale: 60,
          resources: { gold: 0, food: 0, knowledge: 0, material: 0, troops: 0, weapons: 0, horses: 0, ships: 0, charms: 0 },
          taxRate: 'normal' as const,
        }
        return {
          ...state,
          factions: state.factions.map(f =>
            f.id === faction.id
              ? { ...f, territories: [...f.territories, newTerritory] }
              : f
          ),
          log: [...state.log, `${faction.name}이(가) ${newTerritory.name}을(를) 점령!`],
        }
      }
    }
  }
  return state
}

// ── 침공 판단 ──

/** AI가 플레이어 영토에 침공할지 판단 */
function shouldInvade(state: GameState, faction: Faction, personality: string): boolean {
  // 이미 전투 중이면 침공 불가
  if (state.battle) return false

  const aiTroops = getTotalTroops(faction)
  if (aiTroops < 200) return false  // 최소 병력

  // 인접한 플레이어 영토가 있는지 확인
  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)
  if (!playerFaction || playerFaction.territories.length === 0) return false

  const playerTerritoryIds = new Set(playerFaction.territories.map(t => t.id))
  const myTerritoryIds = new Set(faction.territories.map(t => t.id))
  let hasAdjacentPlayer = false

  for (const territory of faction.territories) {
    const tDef = getTerritoryDef(territory.id)
    if (!tDef) continue
    for (const nId of tDef.neighbors) {
      if (!myTerritoryIds.has(nId) && playerTerritoryIds.has(nId)) {
        hasAdjacentPlayer = true
        break
      }
    }
    if (hasAdjacentPlayer) break
  }
  if (!hasAdjacentPlayer) return false

  // 전력 비교: AI 병력이 플레이어보다 우세해야 침공
  const playerTroops = getTotalTroops(playerFaction)
  const ratio = playerTroops > 0 ? aiTroops / playerTroops : 10

  // 성격별 침공 성향: 비율 임계값 + 확률
  const config: Record<string, { ratioThreshold: number; chance: number }> = {
    conqueror: { ratioThreshold: 1.2, chance: 0.25 },
    schemer:   { ratioThreshold: 1.5, chance: 0.15 },
    economist: { ratioThreshold: 2.0, chance: 0.08 },
    virtuous:  { ratioThreshold: 2.5, chance: 0.05 },
    culturist: { ratioThreshold: 2.5, chance: 0.05 },
  }
  const { ratioThreshold, chance } = config[personality] ?? config.economist

  return ratio >= ratioThreshold && Math.random() < chance
}

/** AI가 플레이어 영토를 침공 — 실제 전투 개시 */
function aiInvade(state: GameState, faction: Faction): GameState {
  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)
  if (!playerFaction) return state

  const myTerritoryIds = new Set(faction.territories.map(t => t.id))
  const playerTerritoryIds = new Set(playerFaction.territories.map(t => t.id))
  const targetCandidates: TerritoryId[] = []

  for (const territory of faction.territories) {
    const tDef = getTerritoryDef(territory.id)
    if (!tDef) continue
    for (const nId of tDef.neighbors) {
      if (!myTerritoryIds.has(nId) && playerTerritoryIds.has(nId)) {
        targetCandidates.push(nId)
      }
    }
  }

  if (targetCandidates.length === 0) return state

  const targetId = targetCandidates[Math.floor(Math.random() * targetCandidates.length)]
  const targetName = getTerritoryDef(targetId)?.name ?? '미지'

  // AI 공격대: 최대 5명 (병력 많은 순)
  const attackerIds = [...faction.members]
    .sort((a, b) => b.troops - a.troops)
    .slice(0, 5)
    .map(m => m.id)

  // 플레이어 방어대: 최대 5명 (병력 많은 순)
  const defenderIds = [...playerFaction.members]
    .sort((a, b) => b.troops - a.troops)
    .slice(0, 5)
    .map(m => m.id)

  if (attackerIds.length === 0 || defenderIds.length === 0) return state

  const battle = initBattle(faction, playerFaction, attackerIds, defenderIds, targetId)

  return {
    ...state,
    battle,
    phase: 'battle',
    log: [...state.log, `${faction.name}이(가) ${targetName}에 침공해왔다!`],
  }
}
