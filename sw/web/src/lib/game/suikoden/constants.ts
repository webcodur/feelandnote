// 천도 — 상수 정의

import type { BuildingDef, Grade, UnitClass, Region, RegionId, Stats, TerritoryDef, TerritoryId, GameTime, TacticType, Era, ThreatType } from './types'

// ── 턴제 엔진 상수 ──

export const TURN = {
  DAYS_PER_TURN: 10,           // 1턴 = 10일
  TAVERN_VISIT_DURATION: 3,    // 선술집 방문 지속 턴
  FOOD_CONSUME_INTERVAL: 3,    // 3턴마다 식량 소비
  TRAINING_INTERVAL: 3,        // 3턴마다 훈련 효과
  THREAT_DURATION: 5,          // 위협 유효 턴
  THREAT_CHANCE: 0.10,         // 영토별 출몰 확률
  MAX_THREATS_PER_TERRITORY: 2,// 영토당 최대 동시 위협
} as const

export const INITIAL_GAME_TIME: GameTime = { year: 1002, month: 3, day: 1 }

// ── 시대 설정 ──

export const ERA_CONFIG: Record<Era, { name: string; icon: string; maxBirthYear: number; description: string }> = {
  ancient:  { name: '고대', icon: '🏛️', maxBirthYear: 500, description: '~500 CE. 알렉산더, 카이사르, 조조의 시대' },
  medieval: { name: '중세', icon: '🏰', maxBirthYear: 1500, description: '500~1500 CE. 징기스칸, 살라딘, 리처드의 시대' },
  modern:   { name: '근대', icon: '🏭', maxBirthYear: 9999, description: '1500~ CE. 나폴레옹, 워싱턴, 비스마르크의 시대' },
}

// ── 방랑 제한 ──

export const WANDERING_MAX_COMPANIONS = 5  // 리더 포함 최대 6명
export const WANDERING_TRAVEL_TURNS = 20   // 지역 이동 소요 턴

// ── profession → UnitClass 매핑 ──

export const PROFESSION_TO_CLASS: Record<string, UnitClass> = {
  commander: 'general',
  athlete: 'general',
  leader: 'saint',
  humanities_scholar: 'strategist',
  social_scientist: 'strategist',
  politician: 'official',
  investor: 'official',
  author: 'artist',
  musician: 'artist',
  visual_artist: 'artist',
  director: 'artist',
  actor: 'artist',
  scientist: 'artisan',
  entrepreneur: 'artisan',
  influencer: 'ranger',
  other: 'ranger',
}

// ── UnitClass 표시 ──

export const CLASS_INFO: Record<UnitClass, { name: string; icon: string; color: string }> = {
  general:    { name: '장수', icon: '⚔️', color: '#dc2626' },
  saint:      { name: '성인', icon: '✨', color: '#f59e0b' },
  strategist: { name: '책사', icon: '🪭', color: '#7c3aed' },
  official:   { name: '관료', icon: '📜', color: '#2563eb' },
  artist:     { name: '예인', icon: '🎭', color: '#ec4899' },
  artisan:    { name: '장인', icon: '🔨', color: '#d97706' },
  ranger:     { name: '유격', icon: '🗡️', color: '#059669' },
}

// ── 플레이어 선택 기준 (Grade 점수) ──

export const PLAYER_GRADE_THRESHOLD = 55  // 이 점수 미만만 플레이어 선택 가능

// ── 등급 ──

export const GRADE_THRESHOLDS: { min: number; grade: Grade }[] = [
  { min: 85, grade: 'SS' },
  { min: 75, grade: 'S' },
  { min: 65, grade: 'A' },
  { min: 55, grade: 'B' },
  { min: 45, grade: 'C' },
  { min: 35, grade: 'D' },
  { min: 0,  grade: 'E' },
]

/** 등급별 영입에 필요한 최소 명성 (0-1000) */
export const GRADE_FAME_REQ: Record<Grade, number> = {
  SS: 900, S: 700, A: 500, B: 300, C: 150, D: 50, E: 0,
}

export const GRADE_COLORS: Record<Grade, string> = {
  SS: '#fbbf24',
  S: '#a78bfa',
  A: '#60a5fa',
  B: '#34d399',
  C: '#d1d5db',
  D: '#9ca3af',
  E: '#78716c',
}

// ── 등급별 급여 (매 턴) ──

export const GRADE_SALARY: Record<Grade, number> = {
  SS: 10, S: 8, A: 7, B: 5, C: 4, D: 3, E: 2,
}

// ── 등급별 병사 수 ──

export const GRADE_TROOPS: Record<Grade, number> = {
  SS: 1000,
  S: 800,
  A: 700,
  B: 500,
  C: 400,
  D: 300,
  E: 200,
}

// ── 장비 상수 ──

export const EQUIPMENT_MAX = { weapons: 10000, horses: 1000, ships: 1000, charms: 1000 } as const

export const EQUIPMENT_LABELS: Record<string, { name: string; icon: string; desc: string }> = {
  weapons: { name: '무기', icon: '⚔️', desc: '공격력 보정 (최대 +30%)' },
  horses:  { name: '군마', icon: '🐎', desc: '돌격 보정 (최대 +20%)' },
  ships:   { name: '조선', icon: '⛵', desc: '수상전 보정' },
  charms:  { name: '부적', icon: '📿', desc: '계략 방어 보정 (최대 -30% 피해)' },
}

/** 장비 구매 단가 { gold, material } */
export const EQUIPMENT_COST: Record<string, { gold: number; material: number }> = {
  weapons: { gold: 2, material: 1 },
  horses:  { gold: 5, material: 0 },
  ships:   { gold: 8, material: 3 },
  charms:  { gold: 3, material: 0 },
}

// ── 건물 카테고리 ──

export type BuildingCategory = 'agriculture' | 'commerce' | 'military' | 'culture'

export const BUILDING_CATEGORY: Record<string, BuildingCategory> = {
  farm: 'agriculture', lumber: 'agriculture', mine: 'agriculture',
  market: 'commerce', trade: 'commerce',
  barracks: 'military', training: 'military', walls: 'military', armory: 'military', patrol: 'military', tavern: 'commerce',
  library: 'culture', academy: 'culture', temple: 'culture', theater: 'culture',
}

export const BUILDING_CATEGORY_INFO: Record<BuildingCategory, { name: string; icon: string; color: string }> = {
  agriculture: { name: '농업', icon: '🌾', color: '#22c55e' },
  commerce:    { name: '상업', icon: '🪙', color: '#eab308' },
  military:    { name: '군사', icon: '⚔️', color: '#ef4444' },
  culture:     { name: '문화', icon: '📚', color: '#8b5cf6' },
}

// ── 건물 정의 ──

export const BUILDINGS: BuildingDef[] = [
  { id: 'farm',      name: '농장',   icon: '🌾', costGold: 100, costMaterial: 0,   buildTurns: 2, effect: { foodPerTurn: 20 } },
  { id: 'market',    name: '시장',   icon: '🪙', costGold: 150, costMaterial: 0,   buildTurns: 2, effect: { goldPerTurn: 15 } },
  { id: 'trade',     name: '교역소', icon: '⚖️', costGold: 300, costMaterial: 0,   buildTurns: 3, requireStat: 'charisma', requireStatMin: 50, effect: { goldPerTurn: 30 } },
  { id: 'lumber',    name: '벌목장', icon: '🪵', costGold: 80,  costMaterial: 0,   buildTurns: 2, effect: { materialPerTurn: 15 } },
  { id: 'mine',      name: '광산',   icon: '⛏️', costGold: 200, costMaterial: 0,   buildTurns: 3, requireStat: 'command', requireStatMin: 40, effect: { materialPerTurn: 25 } },
  { id: 'barracks',  name: '병영',   icon: '🏕️', costGold: 200, costMaterial: 0,   buildTurns: 2, effect: { troopsPerTurn: 50 } },
  { id: 'training',  name: '연병장', icon: '🎯', costGold: 300, costMaterial: 0,   buildTurns: 3, requireStat: 'martial', requireStatMin: 30, effect: { special: 'training' } },
  { id: 'walls',     name: '성벽',   icon: '🏰', costGold: 0,   costMaterial: 500, buildTurns: 4, requireStat: 'command', requireStatMin: 40, effect: { defenseBonus: 40 } },
  { id: 'armory',    name: '무기고', icon: '⚒️', costGold: 250, costMaterial: 200, buildTurns: 3, effect: { special: 'weapons' } },
  { id: 'library',   name: '도서관', icon: '📚', costGold: 200, costMaterial: 0,   buildTurns: 2, effect: { knowledgePerTurn: 15 } },
  { id: 'academy',   name: '학당',   icon: '🎓', costGold: 350, costMaterial: 0,   buildTurns: 3, requireStat: 'intellect', requireStatMin: 70, effect: { knowledgePerTurn: 25, special: 'discover' } },
  { id: 'temple',    name: '사원',   icon: '⛩️', costGold: 400, costMaterial: 0,   buildTurns: 3, requireStat: 'benevolence', requireStatMin: 70, effect: { moralePerTurn: 5, special: 'sorcery' } },
  { id: 'theater',   name: '극장',   icon: '🎭', costGold: 300, costMaterial: 0,   buildTurns: 3, effect: { moralePerTurn: 10, culturePerTurn: 5 } },
  { id: 'tavern',    name: '선술집', icon: '🍺', costGold: 150, costMaterial: 0,   buildTurns: 2, effect: { goldPerTurn: 10, special: 'recruit' } },
  { id: 'patrol',    name: '순찰소', icon: '🛡️', costGold: 120, costMaterial: 0,   buildTurns: 2, effect: { moralePerTurn: 2, special: 'patrol' } },
]

// ── 전술 상성 매트릭스 ──

export const TACTIC_MATCHUP: Record<TacticType, Record<TacticType, number>> = {
  charge:    { charge: 1.0, defend: 0.65, stratagem: 1.4,  fire: 1.0,  morale: 1.0,  feint: 0.65 },
  defend:    { charge: 1.0, defend: 1.0,  stratagem: 1.0,  fire: 1.4,  morale: 1.0,  feint: 1.0  },
  stratagem: { charge: 0.65,defend: 1.0,  stratagem: 1.0,  fire: 1.0,  morale: 1.4,  feint: 1.4  },
  fire:      { charge: 1.0, defend: 0.65, stratagem: 1.0,  fire: 1.0,  morale: 0.65, feint: 1.0  },
  morale:    { charge: 1.0, defend: 1.0,  stratagem: 0.65, fire: 1.0,  morale: 1.0,  feint: 1.0  },
  feint:     { charge: 1.4, defend: 1.0,  stratagem: 0.65, fire: 1.0,  morale: 1.0,  feint: 1.0  },
}

// ── 전술 정보 ──

export const TACTIC_INFO: Record<TacticType, { name: string; icon: string; description: string; troopCostRate: number }> = {
  charge:    { name: '돌격', icon: '🐎', description: '강력한 돌격. 피해↑ 손실↑', troopCostRate: 0.15 },
  defend:    { name: '방어', icon: '🛡️', description: '피해 경감. 화공에 강함', troopCostRate: 0 },
  stratagem: { name: '계략', icon: '🪭', description: '지력 대결. 사기전에 강함', troopCostRate: 0.05 },
  fire:      { name: '화공', icon: '🔥', description: '광역 피해. 방어에 약함', troopCostRate: 0.10 },
  morale:    { name: '고무', icon: '📯', description: '사기 회복. 계략에 약함', troopCostRate: 0 },
  feint:     { name: '유인', icon: '🗡️', description: '반격. 돌격에 강함', troopCostRate: 0.05 },
}

// ── 전투 상수 ──

export const BATTLE_MAX_ROUNDS = 10   // 레거시 (전술 상성 시스템용)
export const BATTLE_MAX_UNITS = 5

// ── 개별 유닛 턴제 전투 상수 ──

export const BATTLE_MAX_TURNS = 30
export const BATTLE_GRID_ROWS = 3
export const BATTLE_GRID_COLS = 5

/** 병과별 속도 보정 */
export const CLASS_SPEED_BONUS: Record<UnitClass, number> = {
  ranger: 4,
  strategist: 2,
  general: 0,
  saint: 0,
  official: -1,
  artist: -2,
  artisan: -3,
}

/** 병과별 근접 공격 배율 */
export const CLASS_ATTACK_MULT: Record<UnitClass, number> = {
  general: 1.3,
  ranger: 1.0,
  artisan: 0.85,
  official: 0.6,
  saint: 0.4,
  strategist: 0.4,
  artist: 0.2,
}

/** 병과별 기본 배치 행 (0=전열, 1=중열, 2=후열) */
export const CLASS_DEFAULT_ROW: Record<UnitClass, number> = {
  general: 0,
  official: 0,
  ranger: 1,
  artisan: 1,
  saint: 2,
  strategist: 2,
  artist: 2,
}

/** 병과별 성인 추가 */
export const UNIT_CLASS_WITH_SAINT = ['general', 'strategist', 'artisan', 'official', 'artist', 'ranger'] as const

/** 스킬 정의 타입 */
export interface SkillDef {
  id: string
  name: string
  icon: string
  description: string
  targetType: 'single_enemy' | 'single_ally' | 'row_enemy' | 'all_ally' | 'all_enemy' | 'self'
  classes: UnitClass[]   // 사용 가능 병과
  statReq?: { stat: keyof Stats; min: number }
  isRanged?: boolean     // 원거리 (전열 무시)
}

export const SKILL_DEFS: Record<string, SkillDef> = {
  // 장수
  charge: {
    id: 'charge', name: '돌격', icon: '🐎',
    description: '대미지 ×1.5, 자신도 피해',
    targetType: 'single_enemy', classes: ['general'],
    statReq: { stat: 'martial', min: 50 },
  },
  duel_provoke: {
    id: 'duel_provoke', name: '일기토 도발', icon: '⚔️',
    description: '인접 적 1:1 대결',
    targetType: 'single_enemy', classes: ['general'],
    statReq: { stat: 'martial', min: 50 },
  },
  // 성인
  heal: {
    id: 'heal', name: '치유', icon: '💚',
    description: '아군 1명 HP 30% 회복',
    targetType: 'single_ally', classes: ['saint'],
    statReq: { stat: 'benevolence', min: 70 },
  },
  barrier: {
    id: 'barrier', name: '결계', icon: '✨',
    description: '아군 1명 1턴 무적',
    targetType: 'single_ally', classes: ['saint'],
    statReq: { stat: 'benevolence', min: 70 },
  },
  // 책사
  confuse: {
    id: 'confuse', name: '혼란', icon: '🌀',
    description: '적 1턴 행동불가 (지력 판정)',
    targetType: 'single_enemy', classes: ['strategist'],
    statReq: { stat: 'intellect', min: 60 }, isRanged: true,
  },
  fire_attack: {
    id: 'fire_attack', name: '화공', icon: '🔥',
    description: '적 행 범위 대미지',
    targetType: 'row_enemy', classes: ['strategist'],
    statReq: { stat: 'intellect', min: 60 }, isRanged: true,
  },
  // 관료
  iron_wall: {
    id: 'iron_wall', name: '철벽', icon: '🛡️',
    description: '인접 아군 방어력 ×2',
    targetType: 'single_ally', classes: ['official'],
    statReq: { stat: 'command', min: 50 },
  },
  diplomacy_threat: {
    id: 'diplomacy_threat', name: '외교 위협', icon: '📜',
    description: '적 사기 -15',
    targetType: 'all_enemy', classes: ['official'],
    statReq: { stat: 'command', min: 50 }, isRanged: true,
  },
  // 예인
  inspire: {
    id: 'inspire', name: '고무', icon: '📯',
    description: '아군 전원 사기 +10',
    targetType: 'all_ally', classes: ['artist'],
    statReq: { stat: 'charisma', min: 40 },
  },
  culture_sway: {
    id: 'culture_sway', name: '문화 감화', icon: '🎭',
    description: '적 사기 -15',
    targetType: 'all_enemy', classes: ['artist'],
    statReq: { stat: 'charisma', min: 50 }, isRanged: true,
  },
  // 장인
  trap: {
    id: 'trap', name: '함정 설치', icon: '⚙️',
    description: '전열에 함정 설치',
    targetType: 'self', classes: ['artisan'],
    statReq: { stat: 'intellect', min: 50 },
  },
  siege_strike: {
    id: 'siege_strike', name: '공성 강타', icon: '🔨',
    description: '성벽 대미지 ×3',
    targetType: 'single_enemy', classes: ['artisan'],
    statReq: { stat: 'intellect', min: 50 },
  },
  // 유격
  ambush: {
    id: 'ambush', name: '기습', icon: '🗡️',
    description: '선제 대미지, 회피 불가',
    targetType: 'single_enemy', classes: ['ranger'],
    statReq: { stat: 'courage', min: 50 },
  },
  detect_trap: {
    id: 'detect_trap', name: '매복 탐지', icon: '👁️',
    description: '적 함정 무효화',
    targetType: 'self', classes: ['ranger'],
    statReq: { stat: 'courage', min: 50 },
  },
}

// ── 병과별 전술 위력 보정 ──

export const CLASS_TACTIC_BONUS: Record<UnitClass, Partial<Record<TacticType, number>>> = {
  general:    { charge: 0.30 },
  saint:      { morale: 0.30, defend: 0.10 },
  strategist: { stratagem: 0.40, fire: 0.30 },
  official:   { defend: 0.20 },
  artist:     { morale: 0.50 },
  artisan:    { defend: 0.20 },
  ranger:     { feint: 0.40, fire: 0.10 },
}

// ── 22개 영토 정의 ──

export const TERRITORIES: TerritoryDef[] = [
  // 동아시아
  { id: 'beijing',    name: '베이징',       regionId: 'east_asia',      neighbors: ['nanjing', 'pyongyang', 'samarkand'],                          position: { x: 80, y: 28 }, latlng: [39.9, 116.4], imageUrl: '/images/game/suikoden/territories/beijing.png' },
  { id: 'nanjing',    name: '난징',         regionId: 'east_asia',      neighbors: ['beijing', 'pyongyang', 'hanoi', 'delhi'],                     position: { x: 84, y: 38 }, latlng: [32.1, 118.8], imageUrl: '/images/game/suikoden/territories/nanjing.png' },
  { id: 'pyongyang',  name: '평양',         regionId: 'east_asia',      neighbors: ['beijing', 'nanjing'],                                         position: { x: 88, y: 24 }, latlng: [39.0, 125.8], imageUrl: '/images/game/suikoden/territories/pyongyang.png' },
  // 동남아시아
  { id: 'hanoi',      name: '하노이',       regionId: 'southeast_asia', neighbors: ['nanjing', 'angkor'],                                          position: { x: 80, y: 48 }, latlng: [21.0, 105.8], imageUrl: '/images/game/suikoden/territories/hanoi.png' },
  { id: 'angkor',     name: '앙코르',       regionId: 'southeast_asia', neighbors: ['hanoi', 'kolkata', 'sydney'],                                 position: { x: 82, y: 54 }, latlng: [13.4, 103.9], imageUrl: '/images/game/suikoden/territories/angkor.png' },
  // 남아시아
  { id: 'delhi',      name: '델리',         regionId: 'south_asia',     neighbors: ['nanjing', 'kolkata', 'samarkand', 'baghdad'],                 position: { x: 68, y: 42 }, latlng: [28.6, 77.2], imageUrl: '/images/game/suikoden/territories/delhi.png' },
  { id: 'kolkata',    name: '콜카타',       regionId: 'south_asia',     neighbors: ['delhi', 'angkor'],                                            position: { x: 72, y: 50 }, latlng: [22.6, 88.4], imageUrl: '/images/game/suikoden/territories/kolkata.png' },
  // 중앙아시아
  { id: 'samarkand',  name: '사마르칸트',   regionId: 'central_asia',   neighbors: ['beijing', 'delhi', 'baghdad', 'moscow'],                      position: { x: 64, y: 28 }, latlng: [39.7, 66.9], imageUrl: '/images/game/suikoden/territories/samarkand.png' },
  { id: 'moscow',     name: '모스크바',     regionId: 'central_asia',   neighbors: ['samarkand', 'baghdad', 'constantinople', 'berlin'],           position: { x: 54, y: 18 }, latlng: [55.8, 37.6], imageUrl: '/images/game/suikoden/territories/moscow.png' },
  // 중동
  { id: 'baghdad',    name: '바그다드',     regionId: 'middle_east',    neighbors: ['samarkand', 'delhi', 'moscow', 'cairo', 'constantinople'],    position: { x: 56, y: 38 }, latlng: [33.3, 44.4], imageUrl: '/images/game/suikoden/territories/baghdad.png' },
  { id: 'cairo',      name: '카이로',       regionId: 'middle_east',    neighbors: ['baghdad', 'constantinople', 'carthage', 'nairobi'],           position: { x: 50, y: 44 }, latlng: [30.1, 31.2], imageUrl: '/images/game/suikoden/territories/cairo.png' },
  // 동유럽
  { id: 'constantinople', name: '콘스탄티노플', regionId: 'east_europe', neighbors: ['moscow', 'baghdad', 'cairo', 'rome', 'berlin'],             position: { x: 48, y: 34 }, latlng: [41.0, 28.9], imageUrl: '/images/game/suikoden/territories/constantinople.png' },
  { id: 'berlin',     name: '베를린',       regionId: 'east_europe',    neighbors: ['moscow', 'constantinople', 'paris', 'london'],                position: { x: 42, y: 22 }, latlng: [52.5, 13.4], imageUrl: '/images/game/suikoden/territories/berlin.png' },
  // 서유럽
  { id: 'rome',       name: '로마',         regionId: 'west_europe',    neighbors: ['constantinople', 'paris', 'carthage'],                        position: { x: 44, y: 34 }, latlng: [41.9, 12.5], imageUrl: '/images/game/suikoden/territories/rome.png' },
  { id: 'paris',      name: '파리',         regionId: 'west_europe',    neighbors: ['berlin', 'rome', 'london', 'carthage'],                      position: { x: 38, y: 28 }, latlng: [48.9, 2.4], imageUrl: '/images/game/suikoden/territories/paris.png' },
  { id: 'london',     name: '런던',         regionId: 'west_europe',    neighbors: ['berlin', 'paris', 'new_york'],                                position: { x: 34, y: 18 }, latlng: [51.5, -0.1], imageUrl: '/images/game/suikoden/territories/london.png' },
  // 아프리카
  { id: 'carthage',   name: '카르타고',     regionId: 'africa',         neighbors: ['cairo', 'rome', 'paris', 'timbuktu', 'nairobi'],              position: { x: 40, y: 44 }, latlng: [36.8, 10.2], imageUrl: '/images/game/suikoden/territories/carthage.png' },
  { id: 'timbuktu',   name: '팀북투',       regionId: 'africa',         neighbors: ['carthage', 'nairobi', 'new_york'],                            position: { x: 34, y: 54 }, latlng: [16.8, -3.0], imageUrl: '/images/game/suikoden/territories/timbuktu.png' },
  { id: 'nairobi',    name: '나이로비',     regionId: 'africa',         neighbors: ['cairo', 'carthage', 'timbuktu'],                              position: { x: 48, y: 60 }, latlng: [-1.3, 36.8], imageUrl: '/images/game/suikoden/territories/nairobi.png' },
  // 아메리카
  { id: 'new_york',   name: '뉴욕',         regionId: 'americas',       neighbors: ['london', 'timbuktu', 'tenochtitlan'],                         position: { x: 16, y: 28 }, latlng: [40.7, -74.0] },
  { id: 'tenochtitlan', name: '테노치티틀란', regionId: 'americas',     neighbors: ['new_york', 'sydney'],                                         position: { x: 14, y: 46 }, latlng: [19.4, -99.1] },
  // 오세아니아
  { id: 'sydney',     name: '시드니',       regionId: 'oceania',        neighbors: ['angkor', 'tenochtitlan'],                                     position: { x: 90, y: 68 }, latlng: [-33.9, 151.2] },
]

// ── 지역 ──

export const REGIONS: Region[] = [
  { id: 'east_asia',      name: '동아시아',     nameEn: 'East Asia',       neighbors: ['southeast_asia', 'south_asia', 'central_asia'],       territoryIds: ['beijing', 'nanjing', 'pyongyang'],       color: '#ef4444', position: { x: 84, y: 30 }, latlng: [35, 115], imageUrl: '/images/game/suikoden/regions/east_asia.png' },
  { id: 'southeast_asia', name: '동남아시아',   nameEn: 'Southeast Asia',  neighbors: ['east_asia', 'south_asia', 'oceania'],                 territoryIds: ['hanoi', 'angkor'],                        color: '#f97316', position: { x: 82, y: 52 }, latlng: [15, 105], imageUrl: '/images/game/suikoden/regions/southeast_asia.png' },
  { id: 'south_asia',     name: '남아시아',     nameEn: 'South Asia',      neighbors: ['east_asia', 'southeast_asia', 'central_asia', 'middle_east'], territoryIds: ['delhi', 'kolkata'],              color: '#eab308', position: { x: 70, y: 46 }, latlng: [25, 82], imageUrl: '/images/game/suikoden/regions/south_asia.png' },
  { id: 'central_asia',   name: '중앙아시아',   nameEn: 'Central Asia',    neighbors: ['east_asia', 'south_asia', 'middle_east', 'east_europe'],      territoryIds: ['samarkand', 'moscow'],          color: '#84cc16', position: { x: 60, y: 24 }, latlng: [48, 52], imageUrl: '/images/game/suikoden/regions/central_asia.png' },
  { id: 'middle_east',    name: '중동',         nameEn: 'Middle East',     neighbors: ['south_asia', 'central_asia', 'east_europe', 'africa'],        territoryIds: ['baghdad', 'cairo'],              color: '#22c55e', position: { x: 52, y: 40 }, latlng: [32, 38], imageUrl: '/images/game/suikoden/regions/middle_east.png' },
  { id: 'east_europe',    name: '동유럽',       nameEn: 'East Europe',     neighbors: ['central_asia', 'middle_east', 'west_europe'],                 territoryIds: ['constantinople', 'berlin'],      color: '#06b6d4', position: { x: 46, y: 28 }, latlng: [47, 21], imageUrl: '/images/game/suikoden/regions/east_europe.png' },
  { id: 'west_europe',    name: '서유럽',       nameEn: 'West Europe',     neighbors: ['east_europe', 'africa', 'americas'],                          territoryIds: ['rome', 'paris', 'london'],       color: '#3b82f6', position: { x: 38, y: 26 }, latlng: [47, 5], imageUrl: '/images/game/suikoden/regions/west_europe.png' },
  { id: 'africa',         name: '아프리카',     nameEn: 'Africa',          neighbors: ['middle_east', 'west_europe', 'americas'],                     territoryIds: ['carthage', 'timbuktu', 'nairobi'], color: '#8b5cf6', position: { x: 42, y: 54 }, latlng: [10, 20], imageUrl: '/images/game/suikoden/regions/africa.png' },
  { id: 'americas',       name: '아메리카',     nameEn: 'Americas',        neighbors: ['west_europe', 'africa', 'oceania'],                           territoryIds: ['new_york', 'tenochtitlan'],      color: '#ec4899', position: { x: 16, y: 38 }, latlng: [25, -85] },
  { id: 'oceania',        name: '오세아니아',   nameEn: 'Oceania',         neighbors: ['southeast_asia', 'americas'],                                 territoryIds: ['sydney'],                         color: '#f59e0b', position: { x: 90, y: 68 }, latlng: [-25, 135] },
]

// ── nationality → regionId 매핑 ──

export const NATIONALITY_TO_REGION: Record<string, RegionId> = {
  // 동아시아
  CN: 'east_asia', KR: 'east_asia', JP: 'east_asia', MN: 'east_asia',
  // 동남아시아
  VN: 'southeast_asia', TH: 'southeast_asia', KH: 'southeast_asia', MM: 'southeast_asia', PH: 'southeast_asia', ID: 'southeast_asia', MY: 'southeast_asia', SG: 'southeast_asia',
  // 남아시아
  IN: 'south_asia', BD: 'south_asia', LK: 'south_asia', NP: 'south_asia', PK: 'south_asia',
  // 중앙아시아
  KZ: 'central_asia', UZ: 'central_asia', TM: 'central_asia', KG: 'central_asia', TJ: 'central_asia', AF: 'central_asia',
  RU: 'central_asia', UA: 'central_asia', PL: 'central_asia', BY: 'central_asia', RO: 'central_asia', HU: 'central_asia',
  // 중동
  IR: 'middle_east', IQ: 'middle_east', SA: 'middle_east', TR: 'middle_east', EG: 'middle_east', IL: 'middle_east', SY: 'middle_east', LB: 'middle_east', AE: 'middle_east',
  // 동유럽
  GR: 'east_europe', BG: 'east_europe', RS: 'east_europe', HR: 'east_europe', CZ: 'east_europe', SK: 'east_europe', AT: 'east_europe', SI: 'east_europe',
  // 서유럽
  IT: 'west_europe', FR: 'west_europe', GB: 'west_europe', DE: 'west_europe', ES: 'west_europe', PT: 'west_europe', NL: 'west_europe', BE: 'west_europe', CH: 'west_europe', IE: 'west_europe', SE: 'west_europe', NO: 'west_europe', DK: 'west_europe', FI: 'west_europe',
  // 아프리카
  DZ: 'africa', TN: 'africa', MA: 'africa', NG: 'africa', KE: 'africa', ET: 'africa', ZA: 'africa', GH: 'africa',
  // 아메리카
  US: 'americas', CA: 'americas', MX: 'americas', BR: 'americas', AR: 'americas', CL: 'americas', CO: 'americas', PE: 'americas', VE: 'americas',
  // 오세아니아
  AU: 'oceania', NZ: 'oceania', PG: 'oceania',
}

// ── nationality → territoryId 매핑 (1차 배치용) ──

export const NATIONALITY_TO_TERRITORY: Record<string, TerritoryId> = {
  // 동아시아
  CN: 'beijing', KR: 'pyongyang', JP: 'pyongyang', MN: 'beijing',
  // 동남아시아
  VN: 'hanoi', TH: 'angkor', KH: 'angkor', MM: 'hanoi', PH: 'angkor', ID: 'angkor', MY: 'angkor', SG: 'angkor',
  // 남아시아
  IN: 'delhi', BD: 'kolkata', LK: 'kolkata', NP: 'delhi', PK: 'delhi',
  // 중앙아시아
  KZ: 'samarkand', UZ: 'samarkand', TM: 'samarkand', KG: 'samarkand', TJ: 'samarkand', AF: 'samarkand',
  RU: 'moscow', UA: 'moscow', PL: 'berlin', BY: 'moscow', RO: 'constantinople', HU: 'berlin',
  // 중동
  IR: 'baghdad', IQ: 'baghdad', SA: 'baghdad', TR: 'constantinople', EG: 'cairo', IL: 'baghdad', SY: 'baghdad', LB: 'baghdad', AE: 'baghdad',
  // 동유럽
  GR: 'constantinople', BG: 'constantinople', RS: 'constantinople', HR: 'constantinople', CZ: 'berlin', SK: 'berlin', AT: 'berlin', SI: 'constantinople',
  // 서유럽
  IT: 'rome', FR: 'paris', GB: 'london', DE: 'berlin', ES: 'paris', PT: 'paris', NL: 'paris', BE: 'paris', CH: 'paris', IE: 'london', SE: 'london', NO: 'london', DK: 'berlin', FI: 'berlin',
  // 아프리카
  DZ: 'carthage', TN: 'carthage', MA: 'carthage', NG: 'timbuktu', KE: 'nairobi', ET: 'nairobi', ZA: 'nairobi', GH: 'timbuktu',
  // 아메리카
  US: 'new_york', CA: 'new_york', MX: 'tenochtitlan', BR: 'tenochtitlan', AR: 'tenochtitlan', CL: 'tenochtitlan', CO: 'tenochtitlan', PE: 'tenochtitlan', VE: 'tenochtitlan',
  // 오세아니아
  AU: 'sydney', NZ: 'sydney', PG: 'sydney',
}

// ── 피부톤 (초상화 팔레트 스왑용) ──

export const NATIONALITY_SKIN: Record<string, 'light' | 'medium' | 'dark'> = {
  // 유럽·아메리카·오세아니아
  GB: 'light', FR: 'light', DE: 'light', NL: 'light', SE: 'light', NO: 'light', AT: 'light', CH: 'light', PL: 'light', CZ: 'light', SK: 'light', HU: 'light', IT: 'light', ES: 'light', PT: 'light', GR: 'light', RU: 'light', US: 'light', CA: 'light', IE: 'light', DK: 'light', FI: 'light', BE: 'light', HR: 'light', RS: 'light', BG: 'light', SI: 'light', UA: 'light', BY: 'light', RO: 'light', AU: 'light', NZ: 'light',
  // 동아시아·중앙아시아
  CN: 'medium', KR: 'medium', JP: 'medium', MN: 'medium', VN: 'medium', TH: 'medium', KH: 'medium', MM: 'medium', PH: 'medium', ID: 'medium', MY: 'medium', SG: 'medium',
  TR: 'medium', KZ: 'medium', UZ: 'medium', TM: 'medium', KG: 'medium', TJ: 'medium', IL: 'medium', IR: 'medium', SY: 'medium', LB: 'medium', AE: 'medium', AF: 'medium',
  MX: 'medium', BR: 'medium', AR: 'light', CL: 'light', CO: 'medium', PE: 'medium', VE: 'medium',
  // 남아시아·중동·아프리카
  IN: 'dark', BD: 'dark', LK: 'dark', NP: 'dark', PK: 'dark',
  SA: 'dark', EG: 'dark', IQ: 'dark',
  DZ: 'dark', TN: 'medium', MA: 'medium', NG: 'dark', KE: 'dark', ET: 'dark', ZA: 'dark', GH: 'dark', PG: 'dark',
}

// ── 거점별 초기 건물·인구·민심·슬롯 ──

export const TERRITORY_PRESETS: Record<TerritoryId, {
  buildings: string[]       // 초기 건물 defId 목록
  population: number        // 초기 인구
  morale: number            // 초기 민심
  maxBuildings: number      // 건물 슬롯 상한
}> = {
  // 동아시아
  beijing:         { buildings: ['market', 'walls'],          population: 2000, morale: 70, maxBuildings: 10 },
  nanjing:         { buildings: ['library', 'farm'],          population: 1500, morale: 75, maxBuildings: 10 },
  pyongyang:       { buildings: ['barracks', 'walls'],        population: 1000, morale: 65, maxBuildings: 8 },
  // 동남아시아
  hanoi:           { buildings: ['farm', 'farm'],             population: 1200, morale: 70, maxBuildings: 8 },
  angkor:          { buildings: ['temple', 'lumber'],         population: 800,  morale: 75, maxBuildings: 8 },
  // 남아시아
  delhi:           { buildings: ['market', 'temple'],         population: 1800, morale: 70, maxBuildings: 10 },
  kolkata:         { buildings: ['farm', 'market'],           population: 1200, morale: 70, maxBuildings: 8 },
  // 중앙아시아
  samarkand:       { buildings: ['trade', 'market'],          population: 1000, morale: 70, maxBuildings: 9 },
  moscow:          { buildings: ['lumber', 'barracks'],       population: 1200, morale: 65, maxBuildings: 9 },
  // 중동
  baghdad:         { buildings: ['academy', 'market'],        population: 1500, morale: 70, maxBuildings: 10 },
  cairo:           { buildings: ['temple', 'mine'],           population: 1500, morale: 70, maxBuildings: 10 },
  // 동유럽
  constantinople:  { buildings: ['walls', 'trade'],           population: 2000, morale: 70, maxBuildings: 11 },
  berlin:          { buildings: ['barracks', 'mine'],         population: 1200, morale: 65, maxBuildings: 9 },
  // 서유럽
  rome:            { buildings: ['theater', 'walls'],         population: 1800, morale: 75, maxBuildings: 10 },
  paris:           { buildings: ['library', 'theater'],       population: 1500, morale: 75, maxBuildings: 10 },
  london:          { buildings: ['market', 'trade'],          population: 1500, morale: 70, maxBuildings: 10 },
  // 아프리카
  carthage:        { buildings: ['trade', 'market'],          population: 1000, morale: 70, maxBuildings: 9 },
  timbuktu:        { buildings: ['library', 'temple'],        population: 600,  morale: 65, maxBuildings: 7 },
  nairobi:         { buildings: ['farm', 'lumber'],           population: 600,  morale: 65, maxBuildings: 7 },
  // 아메리카
  new_york:        { buildings: ['market', 'trade'],          population: 1200, morale: 70, maxBuildings: 9 },
  tenochtitlan:    { buildings: ['temple', 'farm'],           population: 1000, morale: 75, maxBuildings: 8 },
  // 오세아니아
  sydney:          { buildings: ['lumber', 'market'],         population: 600,  morale: 70, maxBuildings: 7 },
}

// ── 세력 색상 ──

export const FACTION_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4']

// ── 난이도 설정 ──

export const DIFFICULTY_CONFIG = {
  easy:   { aiFactions: 3, startMembers: 5, maxTurns: 150, startAP: 5 },
  normal: { aiFactions: 5, startMembers: 3, maxTurns: 100, startAP: 4 },
  hard:   { aiFactions: 7, startMembers: 1, maxTurns: 80,  startAP: 3 },
} as const

// ── 스탯 라벨 ──

// 능력 4종 + 덕목 8종 라벨 (성향은 별도)
export const STAT_LABELS: Record<string, { name: string; icon: string; desc: string }> = {
  // 능력
  command:     { name: '통솔', icon: '👑', desc: '조직·군대·국가를 이끄는 능력' },
  martial:     { name: '무력', icon: '⚔️', desc: '전투 공격력. 돌격·일기토 주력' },
  intellect:   { name: '지력', icon: '🧠', desc: '계략·화공·외교. 학당 건설 조건' },
  charisma:    { name: '매력', icon: '💎', desc: '등용·외교·민심 보정' },
  // 덕목
  temperance:  { name: '절제', icon: '⚖️', desc: '욕망/감정/권력을 자제' },
  diligence:   { name: '근면', icon: '🔨', desc: '건축 효율·생산량 보정' },
  reflection:  { name: '성찰', icon: '📖', desc: '계략 보조·연구 효율' },
  courage:     { name: '용기', icon: '🔥', desc: '순찰 성공률·돌격 보조' },
  loyalty:     { name: '충의', icon: '🛡️', desc: '신념·관계에 대한 헌신' },
  benevolence: { name: '인자', icon: '💚', desc: '사원 건설·등용·치유' },
  fairness:    { name: '공정', icon: '⚖️', desc: '외교·동맹 보정' },
  humility:    { name: '겸양', icon: '🙏', desc: '방어·수비 보정' },
}

// 능력 4종 키 (UI 표시 순서용)
export const ABILITY_STAT_KEYS = ['command', 'martial', 'intellect', 'charisma'] as const

// 덕목 8종 키
export const VIRTUE_STAT_KEYS = ['temperance', 'diligence', 'reflection', 'courage', 'loyalty', 'benevolence', 'fairness', 'humility'] as const

// 성향 4축 라벨
export const DISPOSITION_LABELS: Record<string, { neg: string; pos: string; icon: string }> = {
  pessimism_optimism:        { neg: '비관', pos: '낙관', icon: '☀️' },
  conservative_progressive:  { neg: '보수', pos: '진보', icon: '🔄' },
  individual_social:         { neg: '개인', pos: '공동체', icon: '🤝' },
  cautious_bold:             { neg: '신중', pos: '대담', icon: '⚡' },
}

export const DISPOSITION_KEYS = ['pessimism_optimism', 'conservative_progressive', 'individual_social', 'cautious_bold'] as const

// ── 방랑 이벤트 텍스트 ──

export const SCENERY_TEXTS = [
  '험준한 산길을 넘었다. 저 멀리 마을의 연기가 보인다.',
  '넓은 평원을 가로질렀다. 바람이 거세다.',
  '강을 건너 새로운 땅에 발을 디뎠다.',
  '폐허가 된 옛 성터를 지나갔다. 전란의 흔적이 곳곳에 남아 있다.',
  '숲길을 지나며 하룻밤을 야영했다.',
  '작은 마을의 주막에서 하룻밤을 묵었다.',
  '오래된 사원 앞을 지나갔다. 승려가 차를 내주었다.',
  '언덕 위에서 사방을 둘러보았다. 세상이 넓다.',
] as const

export const RUMOR_TEXTS = [
  '주막에서 들은 소문: 근처에 무장한 도적떼가 출몰한다고 한다.',
  '지나가던 상인에게서 이 지역 정세에 대해 전해 들었다.',
  '떠돌이 악사가 먼 나라의 이야기를 들려주었다.',
  '어느 노인이 옛 전쟁 이야기를 늘어놓았다.',
  '장터에서 세력 다툼에 대한 소문을 들었다.',
] as const

// ── 초기 리소스 ──

export const INITIAL_RESOURCES = {
  AI_FACTION: { gold: 500, food: 300, knowledge: 100, material: 200, troops: 200, weapons: 0, horses: 0, ships: 0, charms: 0 },
  PLAYER_RAISE: { gold: 300, food: 300, knowledge: 100, material: 200, troops: 200, weapons: 0, horses: 0, ships: 0, charms: 0 },
  WANDERING_START_GOLD: 100,
} as const

// ── 출몰 위협 정의 ──

export const THREAT_DEFS: Record<ThreatType, { name: string; icon: string; powerMin: number; powerMax: number }> = {
  bandit:  { name: '도적단', icon: '🏴', powerMin: 2, powerMax: 6 },
  beast:   { name: '야수',   icon: '🐺', powerMin: 3, powerMax: 7 },
  plague:  { name: '역병',   icon: '☠️', powerMin: 1, powerMax: 5 },
  spy:     { name: '첩자',   icon: '🕵️', powerMin: 4, powerMax: 8 },
}
