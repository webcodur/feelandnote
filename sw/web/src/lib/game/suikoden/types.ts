// 천도 — 셀럽 전략 시뮬레이션 타입 정의

// ── 기본 열거 ──

export type UnitClass = 'general' | 'strategist' | 'artisan' | 'official' | 'artist' | 'ranger'
export type Grade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E'
export type ItemCategory = 'scroll' | 'painting' | 'manual' | 'score'
export type ItemGrade = 'legendary' | 'heroic' | 'rare' | 'common' | 'plain'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type GamePhase = 'title' | 'setup' | 'strategy' | 'battle' | 'manage' | 'result'
export type AIPersonality = 'conqueror' | 'schemer' | 'economist' | 'virtuous' | 'culturist'
export type RegionId = 'east_asia' | 'south_asia' | 'middle_east' | 'mediterranean' | 'west_europe' | 'north_europe' | 'new_world'
export type ContentType = 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC'

// ── 전술 시스템 ──

export type TacticType = 'charge' | 'defend' | 'stratagem' | 'fire' | 'morale' | 'feint'

// ── 실시간 시스템 ──

export type GameSpeed = 0 | 1 | 2 | 3  // 0=pause
export type CharacterTask = 'idle' | 'building' | 'working' | 'training'

export interface GameTime {
  year: number       // 시작: 1002
  month: number      // 1-12
  day: number        // 1-30
  hour: number       // 0-23
}

export interface CharacterPlacement {
  characterId: string
  factionId: string
  territoryId: TerritoryId
  task: CharacterTask
  taskProgress: number   // 0-1
  assignedBuildingId: string | null  // BuildingCard.instanceId
}

// ── 영토 ID (17개) ──

export type TerritoryId =
  | 'huabei' | 'jiangnan' | 'liaodong'          // 동아시아
  | 'india' | 'ceylon'                           // 남아시아
  | 'mesopotamia' | 'persia'                     // 중동
  | 'rome' | 'greece' | 'iberia'                 // 지중해
  | 'france' | 'britannia' | 'germania'          // 서유럽
  | 'scandinavia' | 'rus'                        // 북유럽
  | 'north_america' | 'south_america'            // 신대륙

// ── 7스탯 시스템 ──

export interface Stats {
  power: number      // 완력 (전투 공격력)
  skill: number      // 기량 (원거리/제작)
  intellect: number  // 지력 (계략/외교)
  stamina: number    // 체력 (HP 기반)
  loyalty: number    // 충의 (충성도 기본값)
  virtue: number     // 인애 (민심/매력)
  courage: number    // 용기 (사기)
}

// ── 캐릭터 ──

export interface GameCharacter {
  id: string
  nickname: string
  title: string
  profession: string
  nationality: string
  gender: boolean | null
  birthDate: string
  deathDate: string
  bio: string
  quotes: string
  avatarUrl: string | null
  stats: Stats
  hp: number
  maxHp: number
  grade: Grade
  unitClass: UnitClass
  totalScore: number
  // 병사 시스템
  troops: number
  maxTroops: number
  loyaltyValue: number   // 현재 충성도 0-100
  // 전투 중 상태
  morale: number
  equippedScroll: GameItem | null
  equippedTreasure: GameItem | null
}

// ── 아이템 ──

export interface GameItem {
  id: string
  contentType: ContentType
  title: string
  creator: string
  thumbnailUrl: string | null
  category: ItemCategory
  grade: ItemGrade
  bonuses: Partial<Stats>
  moralBonus: number
  originCelebId: string
  review: string | null
}

// ── 건물 ──

export interface BuildingDef {
  id: string
  name: string
  icon: string
  costGold: number
  costMaterial: number
  buildTurns: number
  requireStat?: keyof Stats
  requireStatMin?: number
  effect: BuildingEffect
}

export interface BuildingEffect {
  goldPerTurn?: number
  foodPerTurn?: number
  knowledgePerTurn?: number
  materialPerTurn?: number
  troopsPerTurn?: number
  moralePerTurn?: number
  culturePerTurn?: number
  defenseBonus?: number
  special?: string
}

// 영토 내 건물 카드 (타일 제거 후 카드 기반)
export interface BuildingCard {
  instanceId: string
  defId: string
  assigneeId: string | null        // 근무 캐릭터 (건설 완료 후 건설자가 자동 배치)
  isConstructing: boolean
  constructionProgress: number     // 0~1
  constructionWorkerId: string | null
}

// ── 자원 ──

export interface Resources {
  gold: number
  food: number
  knowledge: number
  material: number
  troops: number
}

// ── 거점/지역 ──

export type TaxRate = 'low' | 'normal' | 'high'

export interface Territory {
  id: TerritoryId
  name: string
  regionId: RegionId
  buildingCards: BuildingCard[]
  maxBuildings: number  // 인구 비례 슬롯 상한 (8~12)
  population: number
  morale: number // 민심 0-100
  resources: Resources
  taxRate: TaxRate // 세율
}

export interface Region {
  id: RegionId
  name: string
  nameEn: string
  neighbors: RegionId[]
  territoryIds: TerritoryId[]
  color: string
  position: { x: number; y: number }
}

// ── 영토 정의 (상수용) ──

export interface TerritoryDef {
  id: TerritoryId
  name: string
  regionId: RegionId
  neighbors: TerritoryId[]
  position: { x: number; y: number }  // 세계맵 좌표 (% 기반)
}

// ── 세력 ──

export interface Faction {
  id: string
  name: string
  leaderId: string
  color: string
  members: GameCharacter[]
  territories: Territory[]
  resources: Resources
  items: GameItem[]
  fame: number
  relations: Record<string, number> // factionId → -100~100
  aiPersonality: AIPersonality | null // null = 플레이어
}

// ── 전투 (카드/전술 선택형) ──

export interface BattleParticipant {
  character: GameCharacter
  factionId: string
  troops: number
  morale: number
  isLeader: boolean
  isDefeated: boolean
}

export interface BattleRound {
  roundNumber: number
  attackerTactic: TacticType
  defenderTactic: TacticType
  attackerDamage: number
  defenderDamage: number
  attackerTroopLoss: number
  defenderTroopLoss: number
  narrative: string
}

export interface BattleLogEntry {
  turn: number
  message: string
  type: 'attack' | 'tactic' | 'morale' | 'death' | 'system' | 'wall'
}

export interface BattleState {
  attackers: BattleParticipant[]
  defenders: BattleParticipant[]
  attackerFactionId: string
  defenderFactionId: string
  defenderTerritoryId: TerritoryId | null
  roundNumber: number
  maxRounds: number            // 10
  phase: 'tactic_select' | 'resolving' | 'round_result' | 'result'
  playerTactic: TacticType | null
  rounds: BattleRound[]
  log: BattleLogEntry[]
  result: 'pending' | 'attacker_wins' | 'defender_wins' | 'draw'
  defenderHasWalls: boolean
}

// ── 게임 전체 상태 ──

export interface GameState {
  phase: GamePhase
  season: Season
  gameTime: GameTime
  speed: GameSpeed
  factions: Faction[]
  placements: CharacterPlacement[]
  wanderers: GameCharacter[]
  allItems: GameItem[]
  playerFactionId: string
  difficulty: 'easy' | 'normal' | 'hard'
  battle: BattleState | null
  viewingTerritoryId: TerritoryId  // 현재 보고 있는 영토
  selectedTerritoryId: TerritoryId | null  // 세계맵에서 선택된 영토
  log: string[]
  isGameOver: boolean
  winner: string | null
  tickCount: number  // 총 틱 수
  prevSpeed: GameSpeed  // 일시정지 전 속도 복원용
  autoAssign: boolean  // 자동 내정 모드
}

// ── 에셋 ──

export interface AssetManifest {
  portraits: Record<string, string>
  bgm: Record<string, string | null>
  se: Record<string, string | null>
}
