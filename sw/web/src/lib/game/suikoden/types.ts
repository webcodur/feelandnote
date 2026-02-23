// 천도 — 셀럽 전략 시뮬레이션 타입 정의

// ── 기본 열거 ──

export type UnitClass = 'general' | 'strategist' | 'artisan' | 'official' | 'artist' | 'ranger'
export type Grade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E'
export type ItemCategory = 'scroll' | 'painting' | 'manual' | 'score'
export type ItemGrade = 'legendary' | 'heroic' | 'rare' | 'common' | 'plain'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type GamePhase = 'title' | 'setup' | 'wandering' | 'strategy' | 'battle' | 'disposition' | 'manage' | 'result'
export type Era = 'ancient' | 'medieval' | 'modern'
export type AIPersonality = 'conqueror' | 'schemer' | 'economist' | 'virtuous' | 'culturist'
export type RegionId = 'east_asia' | 'southeast_asia' | 'south_asia' | 'central_asia' | 'middle_east' | 'east_europe' | 'west_europe' | 'africa' | 'americas' | 'oceania'
export type ContentType = 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC'

// ── 전술 시스템 ──

export type TacticType = 'charge' | 'defend' | 'stratagem' | 'fire' | 'morale' | 'feint'

// ── 턴제 시스템 ──

export type CharacterTask = 'idle' | 'building' | 'working' | 'training' | 'hunting'

export interface GameTime {
  year: number       // 시작: 1002
  month: number      // 1-12
  day: number        // 1-30
}

export interface CharacterPlacement {
  characterId: string
  factionId: string
  territoryId: TerritoryId
  task: CharacterTask
  assignedBuildingId: string | null  // BuildingCard.instanceId
}

// ── 영토 ID (22개) ──

export type TerritoryId =
  | 'beijing' | 'nanjing' | 'pyongyang'          // 동아시아
  | 'hanoi' | 'angkor'                           // 동남아시아
  | 'delhi' | 'kolkata'                          // 남아시아
  | 'samarkand' | 'moscow'                       // 중앙아시아
  | 'baghdad' | 'cairo'                          // 중동
  | 'constantinople' | 'berlin'                  // 동유럽
  | 'rome' | 'paris' | 'london'                  // 서유럽
  | 'carthage' | 'timbuktu' | 'nairobi'          // 아프리카
  | 'new_york' | 'tenochtitlan'                  // 아메리카
  | 'sydney'                                     // 오세아니아

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
  constructionTurnsLeft: number    // 남은 건설 턴 수 (0이면 완료)
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
  latlng: [number, number]  // [위도, 경도] — 대륙 중심점
}

// ── 영토 정의 (상수용) ──

export interface TerritoryDef {
  id: TerritoryId
  name: string
  regionId: RegionId
  neighbors: TerritoryId[]
  position: { x: number; y: number }  // 세계맵 좌표 (% 기반)
  latlng: [number, number]             // [위도, 경도] — D3 지구본용
}

// ── 포로 처분 시스템 ──

export type DispositionAction = 'recruit' | 'imprison' | 'execute' | 'release'

export interface DispositionTarget {
  character: GameCharacter
  factionId: string  // 원 소속 세력
}

export interface DispositionResult {
  characterId: string
  characterName: string
  action: DispositionAction
  success: boolean  // recruit 성공/실패
}

export interface DispositionState {
  targets: DispositionTarget[]
  currentIndex: number
  results: DispositionResult[]
}

// ── 세력 ──

export interface Faction {
  id: string
  name: string
  leaderId: string
  color: string
  members: GameCharacter[]
  prisoners: GameCharacter[]
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

// ── 방랑 이벤트 ──

export type WanderingEventType =
  | 'guest'           // 객장 방문 — 수락/거절
  | 'bandit_win'      // 도적 격퇴 — 금 획득
  | 'bandit_lose'     // 도적 습격 — 금 손실
  | 'villager_aid'    // 주민 지원 — 금 획득
  | 'scenery'         // 풍경/이동 묘사
  | 'rumor'           // 소문

export interface WanderingEvent {
  type: WanderingEventType
  description: string
  character?: GameCharacter   // guest 이벤트용
  goldDelta?: number          // 금화 변동
  resolved: boolean           // 처리 완료 여부
  recruitAttempted?: boolean  // 등용 시도 여부 (방랑 guest용)
}

// ── 방랑 상태 ──

export interface WanderingState {
  leaderId: string
  leader: GameCharacter
  currentRegionId: RegionId
  companions: GameCharacter[]
  gold: number
  turnsWandered: number
  currentEvent: WanderingEvent | null
  eventLog: string[]
  // 이동 중 상태
  travelTarget: RegionId | null   // 이동 목표 지역 (null = 체류 중)
  travelProgress: number          // 0~travelDuration
  travelDuration: number           // 이동 소요 턴
}

// ── 출몰 위협 ──

export type ThreatType = 'bandit' | 'beast' | 'plague' | 'spy'

export interface ThreatCard {
  id: string
  type: ThreatType
  name: string
  icon: string
  power: number           // 난이도 1-10
  territoryId: TerritoryId
  arrivalTurn: number
  expiryTurn: number
  assignedCharId: string | null
  turnsToResolve: number  // 배정 후 다음 턴에 판정 (1)
}

// ── 선술집 방문자 ──

export interface TavernVisitor {
  character: GameCharacter
  territoryId: TerritoryId
  arrivalTurn: number
  departureTurn: number
  recruiterId: string | null       // 등용 할당된 인물 ID (null = 미할당)
  recruiterAssignedTurn: number | null  // 할당된 턴 (판정 타이밍 계산용)
}

// ── 게임 전체 상태 ──

export interface GameState {
  phase: GamePhase
  season: Season
  gameTime: GameTime
  factions: Faction[]
  placements: CharacterPlacement[]
  wanderers: GameCharacter[]
  allItems: GameItem[]
  playerFactionId: string
  difficulty: 'easy' | 'normal' | 'hard'
  battle: BattleState | null
  disposition: DispositionState | null
  viewingTerritoryId: TerritoryId  // 현재 보고 있는 영토
  selectedTerritoryId: TerritoryId | null  // 세계맵에서 선택된 영토
  log: string[]
  isGameOver: boolean
  winner: string | null
  turnCount: number  // 총 턴 수
  autoAssign: boolean  // 자동 내정 모드
  era: Era
  wandering: WanderingState | null  // 거병 후 null
  tavernVisitors: TavernVisitor[]
  threats: ThreatCard[]
  settings: GameSettings
}

// ── 대화 시스템 ──

export type SpeechTone = 'commander' | 'scholar' | 'artisan' | 'noble' | 'gentle' | 'free'

export type DialogType =
  | 'recruit_success' | 'recruit_fail' | 'recruit_reject'
  | 'recruit_ask' | 'dismiss_farewell'
  | 'turn_start'
  | 'battle_start' | 'battle_win' | 'battle_lose'
  | 'building_complete' | 'visitor_arrive'

export interface DialogEntry {
  id: string
  characterId: string
  characterName: string
  avatarUrl: string | null
  message: string
  type: DialogType
}

export interface GameSettings {
  dialogMode: 'auto' | 'manual'
}

// ── 에셋 ──

export interface AssetManifest {
  portraits: Record<string, string>
  bgm: Record<string, string | null>
  se: Record<string, string | null>
}
