// 천도 — 게임 엔진 (전투 + 초기화)

import type {
  GameState, GameCharacter, GameItem, Faction, Territory, BuildingCard, BattleState, BattleParticipant,
  Resources, TerritoryId, BattleLogEntry, CharacterPlacement, AIPersonality,
  Era, RegionId, WanderingEvent, DispositionState, DispositionTarget, DispositionResult, DispositionAction,
  WorldPreview,
} from './types'
import {
  DIFFICULTY_CONFIG, FACTION_COLORS,
  TERRITORIES, INITIAL_GAME_TIME, REGIONS, NATIONALITY_TO_REGION,
  WANDERING_MAX_COMPANIONS, WANDERING_TRAVEL_TURNS,
  SCENERY_TEXTS, RUMOR_TEXTS, INITIAL_RESOURCES, TERRITORY_PRESETS,
  PLAYER_GRADE_THRESHOLD,
} from './constants'
import {
  getRegionForNationality, getTerritoryForNationality, shuffle, getBirthYear,
  getTerritoryDef, getEffectiveGradeScore,
} from './utils'
import { initBattleState, syncLegacyParticipants } from './battleEngine'

// ── 게임 초기화 ──

// ── 시대 기반 캐릭터 분류 ──

function classifyByEra(characters: GameCharacter[], era: Era): { eraChars: GameCharacter[]; crossEraChars: GameCharacter[] } {
  const eraChars: GameCharacter[] = []
  const crossEraChars: GameCharacter[] = []

  for (const c of characters) {
    const year = getBirthYear(c.birthDate)
    const isInEra = era === 'ancient'
      ? year <= 500
      : era === 'medieval'
        ? year > 500 && year <= 1500
        : year > 1500

    if (isInEra) eraChars.push(c)
    else crossEraChars.push(c)
  }

  return { eraChars, crossEraChars }
}

// ── 세력 미리보기 (2단계 셋업) ──

export function previewWorld(
  allCharacters: GameCharacter[],
  difficulty: 'easy' | 'normal' | 'hard',
  era: Era,
): WorldPreview {
  const config = DIFFICULTY_CONFIG[difficulty]
  const { eraChars, crossEraChars } = classifyByEra(allCharacters, era)

  // Grade ≥ PLAYER_GRADE_THRESHOLD → AI 세력 후보
  const aiCandidates = eraChars.filter(c => getEffectiveGradeScore(c) >= PLAYER_GRADE_THRESHOLD)
  const wandererCandidates = eraChars.filter(c => getEffectiveGradeScore(c) < PLAYER_GRADE_THRESHOLD)

  // 영토별로 AI 후보 분류
  const charsByTerritory = new Map<TerritoryId, GameCharacter[]>()
  for (const c of aiCandidates) {
    const t = getTerritoryForNationality(c.nationality)
    if (!charsByTerritory.has(t)) charsByTerritory.set(t, [])
    charsByTerritory.get(t)!.push(c)
  }

  const usedIds = new Set<string>()
  const aiFactions: Faction[] = []
  const placements: CharacterPlacement[] = []
  const availableTerritories = shuffle(TERRITORIES.map(t => t.id))

  for (let i = 0; i < Math.min(config.aiFactions, availableTerritories.length); i++) {
    const territoryId = availableTerritories[i]
    const regionChars = (charsByTerritory.get(territoryId) ?? []).filter(c => !usedIds.has(c.id))

    const tDef = getTerritoryDef(territoryId)!
    if (regionChars.length === 0) {
      const regionTerritories = TERRITORIES.filter(t => t.regionId === tDef.regionId).map(t => t.id)
      for (const rt of regionTerritories) {
        const chars = (charsByTerritory.get(rt) ?? []).filter(c => !usedIds.has(c.id))
        regionChars.push(...chars)
      }
    }

    if (regionChars.length === 0) continue

    const sorted = regionChars.sort((a, b) => getEffectiveGradeScore(b) - getEffectiveGradeScore(a))
    const leader = sorted[0]
    const members = [leader, ...sorted.slice(1, config.startMembers + 1)]
    members.forEach(m => usedIds.add(m.id))

    const personality = getAIPersonality(leader)

    const faction: Faction = {
      id: `ai_${i}`,
      name: `${leader.nickname}의 세력`,
      leaderId: leader.id,
      color: FACTION_COLORS[(i + 1) % FACTION_COLORS.length],
      members,
      prisoners: [],
      territories: [createTerritory(territoryId)],
      resources: { ...INITIAL_RESOURCES.AI_FACTION },
      items: [],
      fame: 0,
      relations: {},
      aiPersonality: personality,
    }

    aiFactions.push(faction)

    for (const member of members) {
      placements.push({
        characterId: member.id,
        factionId: faction.id,
        territoryId,
        task: 'idle',
        assignedBuildingId: null,
      })
    }
  }

  // AI 세력 간 관계 초기화
  for (const f of aiFactions) {
    for (const other of aiFactions) {
      if (f.id !== other.id) f.relations[other.id] = 0
    }
  }

  // 방랑자 = Grade < 55 시대 인물 + 시공초월 인물 + AI 미배정 인물
  const wanderers = [
    ...wandererCandidates,
    ...crossEraChars,
    ...aiCandidates.filter(c => !usedIds.has(c.id)),
  ]

  return { aiFactions, wanderers, era, difficulty, placements }
}

// ── 미리보기 → 게임 확정 ──

export function finalizeGame(
  preview: WorldPreview,
  playerLeaderId: string,
  allItems: GameItem[],
): GameState {
  const player = preview.wanderers.find(c => c.id === playerLeaderId)!
  const playerRegion = getRegionForNationality(player.nationality)

  // wanderers에서 리더 제거
  const wanderers = preview.wanderers.filter(c => c.id !== playerLeaderId)

  return {
    phase: 'wandering',
    season: 'spring',
    gameTime: { ...INITIAL_GAME_TIME },
    factions: [...preview.aiFactions],
    placements: [...preview.placements],
    wanderers,
    allItems,
    playerFactionId: 'player',
    difficulty: preview.difficulty,
    battle: null,
    disposition: null,
    viewingTerritoryId: getTerritoryForNationality(player.nationality),
    selectedTerritoryId: null,
    log: [`${player.nickname}이(가) 방랑을 시작했다.`],
    isGameOver: false,
    winner: null,
    turnCount: 0,
    autoAssign: false,
    era: preview.era,
    wandering: {
      leaderId: player.id,
      leader: player,
      currentRegionId: playerRegion,
      companions: [],
      gold: INITIAL_RESOURCES.WANDERING_START_GOLD,
      turnsWandered: 0,
      currentEvent: null,
      eventLog: [],
      travelTarget: null,
      travelProgress: 0,
      travelDuration: 0,
    },
    tavernVisitors: [],
    threats: [],
    settings: { dialogMode: 'auto' },
  }
}

export function initGame(
  allCharacters: GameCharacter[],
  playerLeaderId: string,
  difficulty: 'easy' | 'normal' | 'hard',
  era: Era,
): GameState {
  const config = DIFFICULTY_CONFIG[difficulty]
  const player = allCharacters.find(c => c.id === playerLeaderId)!

  // 시대 기반 분류
  const { eraChars, crossEraChars } = classifyByEra(allCharacters, era)

  // 영토별로 시대 캐릭터 분류 (AI 세력용)
  const charsByTerritory = new Map<TerritoryId, GameCharacter[]>()
  for (const c of eraChars) {
    if (c.id === playerLeaderId) continue // 플레이어 리더 제외
    const t = getTerritoryForNationality(c.nationality)
    if (!charsByTerritory.has(t)) charsByTerritory.set(t, [])
    charsByTerritory.get(t)!.push(c)
  }

  const usedIds = new Set<string>([playerLeaderId])

  // AI 세력 생성 (시대 인물만)
  const aiFactions: Faction[] = []
  const availableTerritories = shuffle(TERRITORIES.map(t => t.id))

  for (let i = 0; i < Math.min(config.aiFactions, availableTerritories.length); i++) {
    const territoryId = availableTerritories[i]
    const regionChars = (charsByTerritory.get(territoryId) ?? []).filter(c => !usedIds.has(c.id))

    const tDef = getTerritoryDef(territoryId)!
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
      prisoners: [],
      territories: [createTerritory(territoryId)],
      resources: { ...INITIAL_RESOURCES.AI_FACTION },
      items: [],
      fame: 0,
      relations: {},
      aiPersonality: personality,
    })
  }

  // 방랑자 = 시대 인물 중 미사용 + 시공초월 인물 전부
  const wanderers = allCharacters.filter(c => !usedIds.has(c.id))
  const factions = [...aiFactions] // 플레이어 faction은 거병 시 생성

  // 관계 초기화
  for (const f of factions) {
    for (const other of factions) {
      if (f.id !== other.id) f.relations[other.id] = 0
    }
  }

  // AI 캐릭터 배치 생성
  const placements: CharacterPlacement[] = []
  for (const faction of factions) {
    for (const member of faction.members) {
      const territory = faction.territories[0]
      if (!territory) continue
      placements.push({
        characterId: member.id,
        factionId: faction.id,
        territoryId: territory.id,
        task: 'idle',
    
        assignedBuildingId: null,
      })
    }
  }

  // 플레이어 시작 지역
  const playerRegion = getRegionForNationality(player.nationality)

  return {
    phase: 'wandering',
    season: 'spring',
    gameTime: { ...INITIAL_GAME_TIME },
    factions,
    placements,
    wanderers,
    allItems: [],
    playerFactionId: 'player',
    difficulty,
    battle: null,
    disposition: null,
    viewingTerritoryId: getTerritoryForNationality(player.nationality),
    selectedTerritoryId: null,
    log: [`${player.nickname}이(가) 방랑을 시작했다.`],
    isGameOver: false,
    winner: null,
    turnCount: 0,
    autoAssign: false,
    era,
    wandering: {
      leaderId: player.id,
      leader: player,
      currentRegionId: playerRegion,
      companions: [],
      gold: INITIAL_RESOURCES.WANDERING_START_GOLD,
      turnsWandered: 0,
      currentEvent: null,
      eventLog: [],
      travelTarget: null,
      travelProgress: 0,
      travelDuration: 0,
    },
    tavernVisitors: [],
    threats: [],
    settings: { dialogMode: 'auto' },
  }
}

// ── 거병: 빈 영토에 세력 수립 ──

export function raiseArmy(state: GameState, territoryId: TerritoryId): GameState {
  if (!state.wandering) return state

  // 빈 영토인지 확인
  const isOccupied = state.factions.some(f => f.territories.some(t => t.id === territoryId))
  if (isOccupied) return state

  // 현재 지역의 영토인지 확인
  const tDef = getTerritoryDef(territoryId)
  if (!tDef || tDef.regionId !== state.wandering.currentRegionId) return state

  const { leader, companions } = state.wandering
  const members = [leader, ...companions]

  // 플레이어 faction 생성
  const startGold = INITIAL_RESOURCES.PLAYER_RAISE.gold + (state.wandering.gold ?? 0)

  const playerFaction: Faction = {
    id: 'player',
    name: `${leader.nickname}의 세력`,
    leaderId: leader.id,
    color: FACTION_COLORS[0],
    members,
    prisoners: [],
    territories: [createTerritory(territoryId)],
    resources: { ...INITIAL_RESOURCES.PLAYER_RAISE, gold: startGold },
    items: [],
    fame: 0,
    relations: {},
    aiPersonality: null,
  }

  // 관계 초기화
  const factions = [playerFaction, ...state.factions]
  for (const f of factions) {
    for (const other of factions) {
      if (f.id !== other.id && !(f.id in f.relations)) {
        f.relations[other.id] = 0
      }
    }
  }

  // 배치 생성
  const newPlacements: CharacterPlacement[] = members.map(m => ({
    characterId: m.id,
    factionId: 'player',
    territoryId,
    task: 'idle' as const,

    assignedBuildingId: null,
  }))

  // wanderers에서 리더+동료 제거
  const memberIds = new Set(members.map(m => m.id))
  const wanderers = state.wanderers.filter(c => !memberIds.has(c.id))

  return {
    ...state,
    phase: 'strategy',
    factions,
    placements: [...state.placements, ...newPlacements],
    wanderers,
    wandering: null,
    viewingTerritoryId: territoryId,
    log: [...state.log, `${leader.nickname}이(가) ${tDef.name}에서 거병했다!`],
  }
}

// ── 거병 포기 → 방랑 복귀 ──

export function abandonFortress(state: GameState): GameState {
  const pf = state.factions.find(f => f.id === state.playerFactionId)
  if (!pf) return state

  const leader = pf.members.find(m => m.id === pf.leaderId)
  if (!leader) return state

  const companions = pf.members.filter(m => m.id !== pf.leaderId).slice(0, WANDERING_MAX_COMPANIONS)
  const excess = pf.members.filter(m => m.id !== pf.leaderId && !companions.includes(m))

  // 현재 영토의 region 기반으로 방랑 시작 지역 결정
  const firstTerritory = pf.territories[0]
  const tDef = firstTerritory ? getTerritoryDef(firstTerritory.id) : null
  const startRegion = tDef?.regionId ?? 'west_europe'

  // 소지금: 세력 자원의 일부만 가져감
  const gold = Math.min(pf.resources.gold, 200)

  return {
    ...state,
    phase: 'wandering',
    factions: state.factions.filter(f => f.id !== state.playerFactionId),
    placements: state.placements.filter(p => p.factionId !== state.playerFactionId),
    wanderers: [...state.wanderers, ...excess],
    wandering: {
      leaderId: leader.id,
      leader,
      currentRegionId: startRegion,
      companions,
      gold,
      turnsWandered: 0,
      currentEvent: null,
      eventLog: ['세력을 해산하고 다시 방랑길에 올랐다.'],
      travelTarget: null,
      travelProgress: 0,
      travelDuration: 0,
    },
    log: [...state.log, `${leader.nickname}이(가) 세력을 해산하고 방랑에 나섰다.`],
  }
}

// ── 방랑: 이벤트 생성 ──


export function generateWanderingEvent(state: GameState): GameState {
  if (!state.wandering) return state

  const w = state.wandering
  const turn = w.turnsWandered + 1

  // ── 이동 중이면 이동 진행만 처리 ──
  if (w.travelTarget) {
    const newProgress = w.travelProgress + 1
    if (newProgress >= w.travelDuration) {
      // 도착
      const targetRegion = REGIONS.find(r => r.id === w.travelTarget)
      return {
        ...state,
        wandering: {
          ...w,
          turnsWandered: turn,
          currentRegionId: w.travelTarget,
          travelTarget: null,
          travelProgress: 0,
          travelDuration: 0,
          currentEvent: { type: 'scenery', description: `${targetRegion?.name ?? '새로운 땅'}에 도착했다.`, resolved: true },
          eventLog: [...w.eventLog, `${turn}일차 — ${targetRegion?.name ?? '새로운 땅'}에 도착했다.`],
        },
      }
    }
    // 이동 중 — 여행 이벤트 (도적/풍경만 발생, 객장 방문 없음)
    const travelRoll = Math.random()
    let travelEvent: WanderingEvent
    if (travelRoll < 0.10) {
      const gold = 10 + Math.floor(Math.random() * 30)
      travelEvent = { type: 'bandit_win', description: `이동 중 도적을 만나 격퇴했다. 금 ${gold}을 노획했다.`, goldDelta: gold, resolved: true }
    } else if (travelRoll < 0.18) {
      const loss = Math.min(w.gold, 5 + Math.floor(Math.random() * 20))
      travelEvent = { type: 'bandit_lose', description: loss > 0 ? `이동 중 도적에게 금 ${loss}을 빼앗겼다.` : '도적이 나타났으나 빼앗을 것이 없어 지나갔다.', goldDelta: -loss, resolved: true }
    } else {
      const targetRegion = REGIONS.find(r => r.id === w.travelTarget)
      const remaining = w.travelDuration - newProgress
      travelEvent = { type: 'scenery', description: `${targetRegion?.name ?? '목적지'}까지 ${remaining}일 남았다. 여정은 계속된다.`, resolved: true }
    }
    const newGold = Math.max(0, w.gold + (travelEvent.goldDelta ?? 0))
    return {
      ...state,
      wandering: {
        ...w,
        turnsWandered: turn,
        travelProgress: newProgress,
        gold: newGold,
        currentEvent: travelEvent,
        eventLog: [...w.eventLog, `${turn}일차 — ${travelEvent.description}`],
      },
    }
  }

  // ── 체류 중 일반 이벤트 ──
  const roll = Math.random()
  const currentRegion = REGIONS.find(r => r.id === w.currentRegionId)

  let event: WanderingEvent

  // 이벤트 확률 분배
  const canRecruit = w.companions.length < WANDERING_MAX_COMPANIONS
  const guestChance = canRecruit ? 0.15 : 0

  if (roll < guestChance) {
    // 인물 조우 이벤트 — "만났다" (등용은 유저 선택)
    const regionCandidates = state.wanderers.filter(c => {
      const charRegion = NATIONALITY_TO_REGION[c.nationality] ?? 'west_europe'
      return charRegion === w.currentRegionId
    })
    const candidates = regionCandidates.length > 0 ? regionCandidates : state.wanderers
    if (candidates.length > 0) {
      const char = candidates[Math.floor(Math.random() * candidates.length)]
      event = {
        type: 'guest',
        description: `${char.nickname}(${char.title})을(를) 만났다.`,
        character: char,
        resolved: false,
        recruitAttempted: false,
      }
      return {
        ...state,
        wandering: { ...w, turnsWandered: turn, currentEvent: event },
      }
    }
  }

  if (roll < guestChance + 0.15) {
    // 도적 격퇴
    const gold = 10 + Math.floor(Math.random() * 30)
    const leaderName = w.leader.nickname
    event = {
      type: 'bandit_win',
      description: `도적떼가 습격해왔으나 ${leaderName} 일행이 격퇴했다. 노획물에서 금 ${gold}을 얻었다.`,
      goldDelta: gold,
      resolved: true,
    }
  } else if (roll < guestChance + 0.25) {
    // 도적에게 당함
    const loss = Math.min(w.gold, 5 + Math.floor(Math.random() * 20))
    event = {
      type: 'bandit_lose',
      description: loss > 0
        ? `야영 중 도적에게 습격당했다. 금 ${loss}을 빼앗겼다.`
        : '도적이 나타났으나 빼앗을 것이 없어 그냥 지나갔다.',
      goldDelta: -loss,
      resolved: true,
    }
  } else if (roll < guestChance + 0.40) {
    // 주민 지원
    const gold = 5 + Math.floor(Math.random() * 20)
    event = {
      type: 'villager_aid',
      description: `지나던 마을에서 주민들이 여비를 보태주었다. 금 ${gold}을 받았다.`,
      goldDelta: gold,
      resolved: true,
    }
  } else if (roll < guestChance + 0.55) {
    // 소문
    const text = RUMOR_TEXTS[Math.floor(Math.random() * RUMOR_TEXTS.length)]
    event = { type: 'rumor', description: text, resolved: true }
  } else {
    // 풍경
    const text = SCENERY_TEXTS[Math.floor(Math.random() * SCENERY_TEXTS.length)]
    event = { type: 'scenery', description: text, resolved: true }
  }

  // 금화 반영
  const newGold = Math.max(0, w.gold + (event.goldDelta ?? 0))

  return {
    ...state,
    wandering: {
      ...w,
      turnsWandered: turn,
      gold: newGold,
      currentEvent: event,
      eventLog: [...w.eventLog, event.description],
    },
  }
}

// ── 방랑: 등용 시도 (판정) ──

export function attemptRecruitGuest(state: GameState): GameState {
  const w = state.wandering
  if (!w) return state
  const evt = w.currentEvent
  if (!evt || !evt.character || evt.recruitAttempted) return state
  const char = evt.character

  if (w.companions.length >= WANDERING_MAX_COMPANIONS) return state

  // 판정: 기본 20% + 리더 인애×2% + 리더 보정 - 등급 패널티
  const leader = w.leader
  const virtueBonus = leader.stats.virtue * 0.02
  const charismaBonus = (leader.stats.loyalty + leader.stats.courage) / 30 * 0.08
  const gradePenalty: Record<string, number> = { SS: 0.25, S: 0.15, A: 0.10, B: 0.05, C: 0, D: 0, E: 0 }
  const penalty = gradePenalty[char.grade] ?? 0
  const rate = Math.max(0.05, Math.min(0.80, 0.20 + virtueBonus + charismaBonus - penalty))

  if (Math.random() < rate) {
    // 성공
    const desc = `${char.nickname}이(가) 뜻에 공감하여 동료가 되었다!`
    const resolved: WanderingEvent = { ...evt, resolved: true, recruitAttempted: true }
    return {
      ...state,
      wandering: {
        ...w,
        companions: [...w.companions, char],
        currentEvent: resolved,
        eventLog: [...w.eventLog, desc],
      },
      wanderers: state.wanderers.filter(c => c.id !== char.id),
    }
  } else {
    // 실패 — 이벤트 종료
    const desc = `${char.nickname}이(가) 정중히 거절했다.`
    const resolved: WanderingEvent = { ...evt, resolved: true, recruitAttempted: true }
    return {
      ...state,
      wandering: {
        ...w,
        currentEvent: resolved,
        eventLog: [...w.eventLog, desc],
      },
    }
  }
}

// ── 방랑: 지나친다 ──

export function dismissGuest(state: GameState): GameState {
  const w = state.wandering
  if (!w) return state
  const evt = w.currentEvent
  if (!evt || !evt.character) return state
  const char = evt.character

  const desc = `${char.nickname}과(와) 인사를 나누고 헤어졌다.`
  const resolved: WanderingEvent = { ...evt, resolved: true }
  return {
    ...state,
    wandering: {
      ...w,
      currentEvent: resolved,
      eventLog: [...w.eventLog, desc],
    },
  }
}

// ── 방랑: 지역 이동 ──

export function moveToRegion(state: GameState, regionId: RegionId): GameState {
  const w = state.wandering
  if (!w) return state
  if (w.travelTarget) return state // 이미 이동 중

  const currentRegion = REGIONS.find(r => r.id === w.currentRegionId)
  if (!currentRegion?.neighbors.includes(regionId)) return state

  const targetRegion = REGIONS.find(r => r.id === regionId)

  return {
    ...state,
    wandering: {
      ...w,
      travelTarget: regionId,
      travelProgress: 0,
      travelDuration: WANDERING_TRAVEL_TURNS,
      currentEvent: null,
      eventLog: [...w.eventLog, `${targetRegion?.name ?? '새로운 땅'}(으)로 출발했다.`],
    },
  }
}

function getAIPersonality(leader: GameCharacter): AIPersonality {
  const { power, intellect, skill, virtue } = leader.stats
  const max = Math.max(power, intellect, skill, virtue)
  if (max === power) return 'conqueror'
  if (max === intellect) return 'schemer'
  if (max === skill) return 'economist'
  if (max === virtue) return 'virtuous'
  return 'culturist'
}

function createTerritory(id: TerritoryId): Territory {
  const def = getTerritoryDef(id)
  const preset = TERRITORY_PRESETS[id]

  const buildingCards: BuildingCard[] = (preset?.buildings ?? []).map((defId, i) => ({
    instanceId: `${id}-init-${i}`,
    defId,
    assigneeId: null,
    isConstructing: false,
    constructionTurnsLeft: 0,
    constructionWorkerId: null,
  }))

  return {
    id,
    name: def?.name ?? '미지',
    regionId: def?.regionId ?? 'west_europe',
    buildingCards,
    maxBuildings: preset?.maxBuildings ?? 8,
    population: preset?.population ?? 1000,
    morale: preset?.morale ?? 70,
    resources: { gold: 0, food: 0, knowledge: 0, material: 0, troops: 0 },
    taxRate: 'normal',
  }
}

// ── 전투 초기화 (개별 유닛 턴제) ──

export function initBattle(
  attackerFaction: Faction,
  defenderFaction: Faction,
  attackerCharIds: string[],
  defenderCharIds: string[],
  defenderTerritoryId: TerritoryId | null,
  playerFactionId?: string,
): BattleState {
  return initBattleState(
    attackerFaction,
    defenderFaction,
    attackerCharIds,
    defenderCharIds,
    defenderTerritoryId,
    playerFactionId ?? 'player',
  )
}

// 레거시 전술 카드 전투 함수는 삭제됨 — 새 턴제 전투는 battleEngine.ts에서 처리

// ── 전투 결과를 GameState에 반영 ──

export function applyBattleResult(state: GameState, rawBattle: BattleState): GameState {
  // 새 시스템: BattleUnit → BattleParticipant 변환
  const battle = syncLegacyParticipants(rawBattle)
  let s = { ...state }
  const log = [...s.log]

  // 패배측 isDefeated 캐릭터 ID 수집 (disposition에서 처리할 대상)
  const defeatedIds = new Set<string>()
  const loserParticipants = battle.result === 'attacker_wins' ? battle.defenders
    : battle.result === 'defender_wins' ? battle.attackers : []
  for (const p of loserParticipants) {
    if (p.isDefeated) defeatedIds.add(p.character.id)
  }

  // 병력 손실을 원본 캐릭터에 반영
  const applyParticipantLosses = (participants: BattleParticipant[]) => {
    s = {
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        members: f.members.map(m => {
          const p = participants.find(pp => pp.character.id === m.id)
          if (!p) return m
          return {
            ...m,
            troops: Math.max(0, p.troops),
            morale: Math.max(0, p.morale),
            hp: Math.max(1, p.character.hp),
          }
        }),
      })),
    }
  }

  applyParticipantLosses(battle.attackers)
  applyParticipantLosses(battle.defenders)

  if (battle.result === 'attacker_wins' && battle.defenderTerritoryId) {
    const defFaction = s.factions.find(f => f.id === battle.defenderFactionId)
    const atkFaction = s.factions.find(f => f.id === battle.attackerFactionId)
    if (defFaction && atkFaction) {
      const taken = defFaction.territories.find(t => t.id === battle.defenderTerritoryId)
      if (taken) {
        defFaction.territories = defFaction.territories.filter(t => t.id !== battle.defenderTerritoryId)
        atkFaction.territories = [...atkFaction.territories, taken]

        // 방어측 캐릭터 배치 이동 (defeated 캐릭터는 제외 — disposition에서 처리)
        s = {
          ...s,
          placements: s.placements.map(p => {
            if (p.factionId === battle.defenderFactionId && p.territoryId === battle.defenderTerritoryId) {
              if (defeatedIds.has(p.characterId)) return p // disposition에서 처리
              const remainingTerritory = defFaction.territories[0]
              if (remainingTerritory) {
                return { ...p, territoryId: remainingTerritory.id, task: 'idle' as const, assignedBuildingId: null }
              }
            }
            return p
          }),
        }
        log.push(`${atkFaction.name}이(가) ${taken.name}을(를) 점령!`)
      }
    }
    // 세력 제거는 disposition 이후로 연기 (defeatedIds가 있으면)
    if (defeatedIds.size === 0) {
      s = { ...s, factions: s.factions.filter(f => f.territories.length > 0 || f.id === s.playerFactionId) }
    }
  }

  if (battle.result === 'defender_wins') {
    log.push('공격측 퇴각.')
  }

  if (battle.result === 'draw') {
    log.push('무승부. 공격측 퇴각, 영토 변화 없음.')
  }

  return { ...s, log }
}

// ── 포로 처분 시스템 ──

/** 패배측에서 처분 대상 수집 (플레이어 승리 시만) */
export function collectDispositionTargets(
  battle: BattleState,
  playerFactionId: string,
): DispositionTarget[] {
  const isPlayerWinner =
    (battle.result === 'attacker_wins' && battle.attackerFactionId === playerFactionId) ||
    (battle.result === 'defender_wins' && battle.defenderFactionId === playerFactionId)
  if (!isPlayerWinner) return []

  const loserFactionId = battle.attackerFactionId === playerFactionId
    ? battle.defenderFactionId : battle.attackerFactionId
  const loserParticipants = battle.attackerFactionId === playerFactionId
    ? battle.defenders : battle.attackers

  return loserParticipants
    .filter(p => p.isDefeated)
    .map(p => ({ character: p.character, factionId: loserFactionId }))
}

/** 등용 성공률 계산 */
export function calcRecruitRate(playerFaction: Faction, target: DispositionTarget): number {
  const leader = playerFaction.members.find(m => m.id === playerFaction.leaderId)
  const fame = playerFaction.fame
  const virtue = leader?.stats.virtue ?? 50

  let rate = 30
  rate += Math.min(20, fame * 0.0002 * 100)     // fame 보너스 (최대 +20%)
  rate += Math.min(15, virtue * 0.15)             // 인애 보너스 (최대 +15%)
  rate -= Math.min(25, target.character.loyaltyValue * 0.25) // 충성도 패널티 (최대 -25%)
  rate -= Math.min(20, target.character.stats.loyalty * 0.2) // 충의 패널티 (최대 -20%)

  return Math.max(5, Math.min(90, Math.round(rate)))
}

/** 개별 처분 적용 */
export function applyDisposition(
  state: GameState,
  targetCharId: string,
  action: DispositionAction,
): { state: GameState; result: DispositionResult } {
  const disp = state.disposition!
  const target = disp.targets[disp.currentIndex]
  const char = target.character
  const log = [...state.log]
  let factions = state.factions.map(f => ({ ...f, members: [...f.members], prisoners: [...f.prisoners] }))
  let placements = [...state.placements]
  let wanderers = [...state.wanderers]

  const playerFaction = factions.find(f => f.id === state.playerFactionId)!
  const originFaction = factions.find(f => f.id === target.factionId)

  let success = true

  switch (action) {
    case 'recruit': {
      const rate = calcRecruitRate(playerFaction, target)
      success = Math.random() * 100 < rate
      if (success) {
        // 원 세력에서 제거
        if (originFaction) {
          originFaction.members = originFaction.members.filter(m => m.id !== char.id)
        }
        // 플레이어 세력에 합류
        const recruited = { ...char, loyaltyValue: 50, morale: 60, troops: Math.max(50, Math.floor(char.maxTroops * 0.3)) }
        playerFaction.members.push(recruited)
        // placement 생성
        const territoryId = playerFaction.territories[0]?.id
        if (territoryId) {
          placements = placements.filter(p => p.characterId !== char.id)
          placements.push({ characterId: char.id, factionId: playerFaction.id, territoryId, task: 'idle', assignedBuildingId: null })
        }
        playerFaction.fame += 15
        log.push(`${char.nickname}이(가) 세력에 합류했다!`)
      } else {
        // 실패 → 인덱스를 올리지 않고 선택지를 다시 표시
        log.push(`${char.nickname}이(가) 등용을 거절했다.`)
        const retryDisp: DispositionState = {
          ...disp,
          // currentIndex 유지 (다음으로 넘기지 않음)
          results: [...disp.results, { characterId: char.id, characterName: char.nickname, action, success: false }],
        }
        return {
          state: { ...state, factions, placements, wanderers, log, disposition: retryDisp },
          result: { characterId: char.id, characterName: char.nickname, action, success: false },
        }
      }
      break
    }
    case 'imprison': {
      if (originFaction) {
        originFaction.members = originFaction.members.filter(m => m.id !== char.id)
      }
      placements = placements.filter(p => p.characterId !== char.id)
      playerFaction.prisoners.push(char)
      log.push(`${char.nickname}을(를) 포로로 잡았다.`)
      break
    }
    case 'execute': {
      if (originFaction) {
        originFaction.members = originFaction.members.filter(m => m.id !== char.id)
      }
      placements = placements.filter(p => p.characterId !== char.id)
      playerFaction.fame -= 30
      log.push(`${char.nickname}을(를) 처형했다.`)
      break
    }
    case 'release': {
      if (originFaction) {
        originFaction.members = originFaction.members.filter(m => m.id !== char.id)
      }
      placements = placements.filter(p => p.characterId !== char.id)
      if (originFaction && originFaction.territories.length > 0) {
        const t = originFaction.territories[0]
        originFaction.members.push(char)
        placements.push({ characterId: char.id, factionId: originFaction.id, territoryId: t.id, task: 'idle', assignedBuildingId: null })
      } else {
        wanderers.push(char)
      }
      playerFaction.fame += 10
      log.push(`${char.nickname}을(를) 풀어주었다.`)
      break
    }
  }

  const result: DispositionResult = {
    characterId: char.id,
    characterName: char.nickname,
    action,
    success,
  }

  const newDisp: DispositionState = {
    ...disp,
    currentIndex: disp.currentIndex + 1,
    results: [...disp.results, result],
  }

  return {
    state: { ...state, factions, placements, wanderers, log, disposition: newDisp },
    result,
  }
}

/** 전체 처분 완료 → strategy로 복귀 */
export function finalizeDisposition(state: GameState): GameState {
  let s: GameState = { ...state, disposition: null, battle: null, phase: 'strategy' }

  // 영토 없는 세력 제거
  s = { ...s, factions: s.factions.filter(f => f.territories.length > 0 || f.id === s.playerFactionId) }

  // 승리 조건 확인
  const active = s.factions.filter(f => f.territories.length > 0)
  if (active.length === 1) {
    s = { ...s, isGameOver: true, winner: active[0].id, phase: 'result' }
  }

  return s
}
