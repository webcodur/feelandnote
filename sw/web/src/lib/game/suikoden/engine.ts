// 천도 — 게임 엔진 (전투 + 초기화)

import type {
  GameState, GameCharacter, Faction, Territory, BattleState, BattleParticipant,
  Resources, TerritoryId, BattleLogEntry, CharacterPlacement, TacticType, AIPersonality,
} from './types'
import {
  BATTLE_MAX_ROUNDS, DIFFICULTY_CONFIG, FACTION_COLORS, BUILDINGS,
  TERRITORIES, INITIAL_GAME_TIME, TACTIC_INFO, CLASS_TACTIC_BONUS,
} from './constants'
import {
  getRegionForNationality, getTerritoryForNationality, shuffle,
} from './utils'
import { getAvailableTactics, resolveTacticClash } from './skills'

// ── 게임 초기화 ──

export function initGame(
  allCharacters: GameCharacter[],
  playerLeaderId: string,
  difficulty: 'easy' | 'normal' | 'hard',
): GameState {
  const config = DIFFICULTY_CONFIG[difficulty]
  const player = allCharacters.find(c => c.id === playerLeaderId)!
  const playerTerritory = getTerritoryForNationality(player.nationality)

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

  // AI 세력 생성
  const aiFactions: Faction[] = []
  const availableTerritories = TERRITORIES
    .map(t => t.id)
    .filter(t => t !== playerTerritory)

  const shuffledTerritories = shuffle(availableTerritories)

  for (let i = 0; i < Math.min(config.aiFactions, shuffledTerritories.length); i++) {
    const territoryId = shuffledTerritories[i]
    const regionChars = (charsByTerritory.get(territoryId) ?? []).filter(c => !usedIds.has(c.id))

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

  // 캐릭터 배치 생성 (타일 제거 → 단순 배치)
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
        taskProgress: 0,
        assignedBuildingId: null,
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
  const def = TERRITORIES.find(t => t.id === id)
  return {
    id,
    name: def?.name ?? '미지',
    regionId: def?.regionId ?? 'mediterranean',
    buildingCards: [],
    maxBuildings: 8,
    population: 1000,
    morale: 70,
    resources: { gold: 0, food: 0, knowledge: 0, material: 0, troops: 0 },
    taxRate: 'normal',
  }
}

// ── 전투 초기화 (카드/전술 선택형) ──

export function initBattle(
  attackerFaction: Faction,
  defenderFaction: Faction,
  attackerCharIds: string[],
  defenderCharIds: string[],
  defenderTerritoryId: TerritoryId | null,
): BattleState {
  const defTerritory = defenderTerritoryId
    ? defenderFaction.territories.find(t => t.id === defenderTerritoryId)
    : defenderFaction.territories[0]

  const hasWalls = defTerritory?.buildingCards.some(
    c => c.defId === 'walls' && !c.isConstructing
  ) ?? false

  const makeParticipant = (charId: string, faction: Faction, isLeader: boolean): BattleParticipant | null => {
    const char = faction.members.find(m => m.id === charId)
    if (!char) return null
    return {
      character: { ...char }, // shallow copy for battle mutations
      factionId: faction.id,
      troops: char.troops,
      morale: char.morale,
      isLeader,
      isDefeated: false,
    }
  }

  const attackers = attackerCharIds
    .map(id => makeParticipant(id, attackerFaction, id === attackerFaction.leaderId))
    .filter((p): p is BattleParticipant => p !== null)

  const defenders = defenderCharIds
    .map(id => makeParticipant(id, defenderFaction, id === defenderFaction.leaderId))
    .filter((p): p is BattleParticipant => p !== null)

  // 리더가 없으면 첫 참가자를 리더로
  if (!attackers.some(p => p.isLeader) && attackers.length > 0) attackers[0].isLeader = true
  if (!defenders.some(p => p.isLeader) && defenders.length > 0) defenders[0].isLeader = true

  return {
    attackers,
    defenders,
    attackerFactionId: attackerFaction.id,
    defenderFactionId: defenderFaction.id,
    defenderTerritoryId: defenderTerritoryId ?? null,
    roundNumber: 1,
    maxRounds: BATTLE_MAX_ROUNDS,
    phase: 'tactic_select',
    playerTactic: null,
    rounds: [],
    log: [{ turn: 1, message: '전투 개시!', type: 'system' }],
    result: 'pending',
    defenderHasWalls: hasWalls,
  }
}

// ── 플레이어 전술 선택 ──

export function selectPlayerTactic(battle: BattleState, tactic: TacticType): BattleState {
  return { ...battle, playerTactic: tactic }
}

// ── AI 전술 선택 ──

export function selectAITactic(battle: BattleState, personality: AIPersonality | null): TacticType {
  const isAttacker = personality !== null // AI는 공격측이거나 방어측
  const aiParticipants = isAttacker ? battle.attackers : battle.defenders
  const opponentParticipants = isAttacker ? battle.defenders : battle.attackers

  const available = getAvailableTactics(aiParticipants.filter(p => !p.isDefeated))

  // 성격별 기본 가중치
  const weights: Record<TacticType, number> = {
    charge: 1, defend: 1, stratagem: 1, fire: 1, morale: 1, feint: 1,
  }

  switch (personality) {
    case 'conqueror':  weights.charge = 3; weights.feint = 2; break
    case 'schemer':    weights.stratagem = 3; weights.fire = 2; break
    case 'economist':  weights.defend = 3; weights.morale = 2; break
    case 'virtuous':   weights.morale = 3; weights.defend = 2; break
    case 'culturist':  weights.stratagem = 2; weights.morale = 2; break
  }

  // 상황 보정
  const myTotalTroops = aiParticipants.filter(p => !p.isDefeated).reduce((s, p) => s + p.troops, 0)
  const oppTotalTroops = opponentParticipants.filter(p => !p.isDefeated).reduce((s, p) => s + p.troops, 0)

  if (myTotalTroops < oppTotalTroops * 0.7) {
    // 열세: 방어/유인 강화
    weights.defend += 2
    weights.feint += 2
  } else if (myTotalTroops > oppTotalTroops * 1.5) {
    // 우세: 돌격/화공 강화
    weights.charge += 2
    weights.fire += 1
  }

  // 사기 낮으면 고무
  const avgMorale = aiParticipants.filter(p => !p.isDefeated).reduce((s, p) => s + p.morale, 0) / Math.max(1, aiParticipants.filter(p => !p.isDefeated).length)
  if (avgMorale < 40) weights.morale += 3

  // 가능한 전술만 필터링 후 가중치 선택
  const validTactics = available.filter(t => weights[t] > 0)
  if (validTactics.length === 0) return 'defend'

  const totalWeight = validTactics.reduce((s, t) => s + weights[t], 0)
  let roll = Math.random() * totalWeight
  for (const t of validTactics) {
    roll -= weights[t]
    if (roll <= 0) return t
  }
  return validTactics[validTactics.length - 1]
}

// ── 라운드 판정 ──

export function resolveRound(battle: BattleState, atkTactic: TacticType, defTactic: TacticType): BattleState {
  const round = resolveTacticClash(
    battle.attackers,
    battle.defenders,
    atkTactic,
    defTactic,
    battle.roundNumber,
    battle.defenderHasWalls,
  )

  const log: BattleLogEntry[] = [...battle.log]
  log.push({ turn: battle.roundNumber, message: round.narrative, type: 'attack' })

  // 패배자 로그
  for (const p of [...battle.attackers, ...battle.defenders]) {
    if (p.isDefeated && !battle.rounds.some(r => r.narrative.includes(`${p.character.nickname} 쓰러졌다`))) {
      // already in round narrative
    }
  }

  return {
    ...battle,
    rounds: [...battle.rounds, round],
    log,
    phase: 'round_result',
    playerTactic: null,
  }
}

// ── 전투 결과 판정 ──

export function checkBattleResult(battle: BattleState): BattleState {
  const atkAlive = battle.attackers.filter(p => !p.isDefeated)
  const defAlive = battle.defenders.filter(p => !p.isDefeated)

  let result = battle.result

  // 전멸
  if (defAlive.length === 0) result = 'attacker_wins'
  else if (atkAlive.length === 0) result = 'defender_wins'

  // 총대장 격파
  if (result === 'pending') {
    const atkLeaderAlive = battle.attackers.some(p => p.isLeader && !p.isDefeated)
    const defLeaderAlive = battle.defenders.some(p => p.isLeader && !p.isDefeated)
    if (!defLeaderAlive && defAlive.length > 0) result = 'attacker_wins'
    if (!atkLeaderAlive && atkAlive.length > 0) result = 'defender_wins'
  }

  // 최대 라운드 → 무승부
  if (result === 'pending' && battle.roundNumber >= battle.maxRounds) {
    result = 'draw'
  }

  // 사기 붕괴
  if (result === 'pending') {
    const atkAvgMorale = atkAlive.length > 0 ? atkAlive.reduce((s, p) => s + p.morale, 0) / atkAlive.length : 0
    const defAvgMorale = defAlive.length > 0 ? defAlive.reduce((s, p) => s + p.morale, 0) / defAlive.length : 0
    if (atkAvgMorale <= 10 && defAvgMorale > 10) result = 'defender_wins'
    if (defAvgMorale <= 10 && atkAvgMorale > 10) result = 'attacker_wins'
  }

  const log = [...battle.log]
  if (result !== 'pending' && result !== battle.result) {
    if (result === 'attacker_wins') log.push({ turn: battle.roundNumber, message: '공격측 승리!', type: 'system' })
    if (result === 'defender_wins') log.push({ turn: battle.roundNumber, message: '방어측 승리!', type: 'system' })
    if (result === 'draw') log.push({ turn: battle.roundNumber, message: '무승부. 공격측 퇴각.', type: 'system' })
  }

  return {
    ...battle,
    result,
    log,
    phase: result !== 'pending' ? 'result' : 'tactic_select',
    roundNumber: result === 'pending' ? battle.roundNumber + 1 : battle.roundNumber,
  }
}

// ── 전투 결과를 GameState에 반영 ──

export function applyBattleResult(state: GameState, battle: BattleState): GameState {
  let s = { ...state }
  const log = [...s.log]

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
            hp: Math.max(1, p.character.hp), // 전투에서 0이 되어도 캐릭터 사망은 아님
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

        // 방어측 캐릭터 배치 이동
        s = {
          ...s,
          placements: s.placements.map(p => {
            if (p.factionId === battle.defenderFactionId && p.territoryId === battle.defenderTerritoryId) {
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
    s = { ...s, factions: s.factions.filter(f => f.territories.length > 0 || f.id === s.playerFactionId) }
  }

  if (battle.result === 'defender_wins') {
    log.push('공격측 퇴각.')
  }

  if (battle.result === 'draw') {
    log.push('무승부. 공격측 퇴각, 영토 변화 없음.')
  }

  return { ...s, log, battle: null, phase: 'strategy', speed: s.prevSpeed || 1 }
}
