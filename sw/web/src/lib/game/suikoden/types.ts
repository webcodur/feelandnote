// 천도 — 셀럽 전략 시뮬레이션 타입 정의

// ── 기본 열거 ──

export type UnitClass = 'general' | 'strategist' | 'artisan' | 'official' | 'artist' | 'ranger'
export type Grade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E'
export type ItemCategory = 'scroll' | 'painting' | 'manual' | 'score'
export type ItemGrade = 'legendary' | 'heroic' | 'rare' | 'common' | 'plain'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type GamePhase = 'title' | 'setup' | 'strategy' | 'battle' | 'manage' | 'result'
export type BattleAction = 'move' | 'attack' | 'shoot' | 'tactic' | 'sorcery' | 'inspire' | 'defend' | 'retreat'
export type Terrain = 'plain' | 'forest' | 'mountain' | 'river' | 'desert' | 'snow' | 'coast' | 'sea' | 'wall' | 'gate' | 'town' | 'road'
export type AIPersonality = 'conqueror' | 'schemer' | 'economist' | 'virtuous' | 'culturist'
export type DuelChoice = 'attack' | 'defend' | 'fatal'
export type RegionId = 'east_asia' | 'south_asia' | 'middle_east' | 'mediterranean' | 'west_europe' | 'north_europe' | 'new_world'
export type ContentType = 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC'

// ── 실시간 시스템 ──

export type GameSpeed = 0 | 1 | 2 | 3  // 0=pause
export type CharacterTask = 'idle' | 'moving' | 'building' | 'working' | 'training' | 'patrolling'

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
  x: number
  y: number
  task: CharacterTask
  taskProgress: number   // 0-1 (이동 중: 현재 타일 내 진행도)
  taskTargetBuildingDefId?: string  // building 태스크용
  taskTargetPos?: Position         // 도착 후 작업 위치
  path: Position[]       // 남은 이동 경로
}

export interface ConstructionSite {
  id: string             // 고유 ID
  buildingDefId: string
  workerId: string       // 건설 중인 캐릭터 ID
  territoryId: TerritoryId
  x: number
  y: number
  progress: number       // 0-1
  totalTicks: number
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

// 맵에 배치된 건물 인스턴스
export interface BuildingInstance {
  defId: string
  level: number
  hp: number
  maxHp: number
  assigneeId: string | null
  turnsLeft: number  // 0이면 완성
}

// 레거시 호환
export interface Building {
  def: BuildingDef
  assigneeId: string | null
  turnsLeft: number
}

// ── 자원 ──

export interface Resources {
  gold: number
  food: number
  knowledge: number
  material: number
  troops: number
}

// ── 영토 맵 ──

export interface TerritoryTile {
  terrain: Terrain
  building: BuildingInstance | null
  x: number
  y: number
}

export interface TerritoryMap {
  grid: TerritoryTile[][]
  width: number   // 16
  height: number  // 12
}

// ── 거점/지역 ──

export type TaxRate = 'low' | 'normal' | 'high'

export interface Territory {
  id: TerritoryId
  name: string
  regionId: RegionId
  buildings: Building[]
  map: TerritoryMap
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

// ── 전투 ──

export interface BattleUnit {
  character: GameCharacter
  factionId: string
  x: number
  y: number
  currentHp: number
  troops: number      // 현재 병사 수
  morale: number
  acted: boolean
  isLeader: boolean
  chargeDistance: number  // 이동 후 공격 시 돌격 보너스용
}

export interface BattleTile {
  terrain: Terrain
  building: BuildingInstance | null
  x: number
  y: number
  unit: BattleUnit | null
  wallHp?: number     // wall/gate 전용
  wallMaxHp?: number
}

export interface BattleState {
  grid: BattleTile[][]
  width: number
  height: number
  turnNumber: number
  maxTurns: number
  currentFaction: string
  attackerFactionId: string
  defenderFactionId: string
  defenderTerritoryId: TerritoryId | null
  selectedUnit: BattleUnit | null
  movablePositions: Position[]
  attackablePositions: Position[]
  log: BattleLogEntry[]
  phase: 'select' | 'move' | 'action' | 'enemy' | 'result'
  result: 'pending' | 'attacker_wins' | 'defender_wins' | 'draw'
  townOccupyTurns: number  // 본진 점령 카운트
}

export interface Position {
  x: number
  y: number
}

export interface BattleLogEntry {
  turn: number
  message: string
  type: 'attack' | 'tactic' | 'morale' | 'death' | 'system' | 'wall'
}

// ── 전투 스킬 ──

export interface ClassSkill {
  id: string
  name: string
  icon: string
  unitClass: UnitClass
  costTroops: number     // 사용 시 소모 병사 수
  range: number          // 사거리
  aoe: number            // 범위 (0=단일, 1=십자 등)
  power: number          // 위력 배율
  effect?: 'stun' | 'burn' | 'morale_down' | 'heal' | 'buff_power'
  description: string
}

// ── 게임 전체 상태 ──

export interface GameState {
  phase: GamePhase
  season: Season
  gameTime: GameTime
  speed: GameSpeed
  factions: Faction[]
  placements: CharacterPlacement[]
  constructions: ConstructionSite[]
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
  tiles: Record<Terrain, string | null>
  buildings: Record<string, string | null>
  bgm: Record<string, string | null>
  se: Record<string, string | null>
}
