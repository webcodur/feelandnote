// 천도 — 상수 정의

import type { BuildingDef, Grade, ItemGrade, UnitClass, Region, RegionId, Stats, TerritoryDef, TerritoryId, GameTime, TacticType } from './types'

// ── 실시간 엔진 상수 ──

export const RT = {
  BASE_TICK_MS: 200,           // 1x 기준 틱 간격 (ms)
  TICKS_PER_HOUR: 1,           // 1틱 = 1시간
  RESOURCE_INTERVAL: 24,       // 24틱(=1일)마다 자원 생산
  AI_EVAL_INTERVAL: 120,       // 120틱(=5일)마다 AI 평가
  CONSTRUCTION_TICKS_PER_TURN: 720, // 기존 buildTurns 1 = 30일 = 720틱
  FOOD_CONSUME_INTERVAL: 720,  // 30일마다 식량 소비
} as const

export const INITIAL_GAME_TIME: GameTime = { year: 1002, month: 3, day: 1, hour: 0 }

// ── profession → UnitClass 매핑 ──

export const PROFESSION_TO_CLASS: Record<string, UnitClass> = {
  commander: 'general',
  leader: 'general',
  athlete: 'general',
  humanities_scholar: 'strategist',
  social_scientist: 'strategist',
  scientist: 'artisan',
  entrepreneur: 'artisan',
  investor: 'artisan',
  politician: 'official',
  author: 'artist',
  musician: 'artist',
  visual_artist: 'artist',
  director: 'artist',
  actor: 'artist',
  influencer: 'ranger',
  other: 'ranger',
}

// ── UnitClass 표시 ──

export const CLASS_INFO: Record<UnitClass, { name: string; icon: string; color: string }> = {
  general:    { name: '장수', icon: '⚔️', color: '#dc2626' },
  strategist: { name: '책사', icon: '🪭', color: '#7c3aed' },
  artisan:    { name: '장인', icon: '🔨', color: '#d97706' },
  official:   { name: '관료', icon: '📜', color: '#2563eb' },
  artist:     { name: '예인', icon: '🎭', color: '#ec4899' },
  ranger:     { name: '유격', icon: '🗡️', color: '#059669' },
}

// ── 등급 ──

export const GRADE_THRESHOLDS: { min: number; grade: Grade }[] = [
  { min: 75, grade: 'SS' },
  { min: 65, grade: 'S' },
  { min: 55, grade: 'A' },
  { min: 45, grade: 'B' },
  { min: 35, grade: 'C' },
  { min: 25, grade: 'D' },
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

// ── 등급별 병사 수 ──

export const GRADE_TROOPS: Record<Grade, number> = {
  SS: 800,
  S: 600,
  A: 500,
  B: 400,
  C: 300,
  D: 200,
  E: 100,
}

// ── 아이템 등급 ──

export const ITEM_GRADE_THRESHOLDS: { min: number; grade: ItemGrade }[] = [
  { min: 65, grade: 'legendary' },
  { min: 50, grade: 'heroic' },
  { min: 35, grade: 'rare' },
  { min: 20, grade: 'common' },
  { min: 0,  grade: 'plain' },
]

export const ITEM_GRADE_COLORS: Record<ItemGrade, string> = {
  legendary: '#fbbf24',
  heroic: '#a78bfa',
  rare: '#60a5fa',
  common: '#34d399',
  plain: '#d1d5db',
}

// ── 건물 카테고리 ──

export type BuildingCategory = 'agriculture' | 'commerce' | 'military' | 'culture'

export const BUILDING_CATEGORY: Record<string, BuildingCategory> = {
  farm: 'agriculture', lumber: 'agriculture', mine: 'agriculture',
  market: 'commerce', trade: 'commerce',
  barracks: 'military', training: 'military', walls: 'military', armory: 'military',
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
  { id: 'trade',     name: '교역소', icon: '⚖️', costGold: 300, costMaterial: 0,   buildTurns: 3, requireStat: 'skill', requireStatMin: 6, effect: { goldPerTurn: 30 } },
  { id: 'lumber',    name: '벌목장', icon: '🪵', costGold: 80,  costMaterial: 0,   buildTurns: 2, effect: { materialPerTurn: 15 } },
  { id: 'mine',      name: '광산',   icon: '⛏️', costGold: 200, costMaterial: 0,   buildTurns: 3, requireStat: 'skill', requireStatMin: 5, effect: { materialPerTurn: 25 } },
  { id: 'barracks',  name: '병영',   icon: '🏕️', costGold: 200, costMaterial: 0,   buildTurns: 2, effect: { troopsPerTurn: 50 } },
  { id: 'training',  name: '연병장', icon: '🎯', costGold: 300, costMaterial: 0,   buildTurns: 3, requireStat: 'power', requireStatMin: 6, effect: { special: 'training' } },
  { id: 'walls',     name: '성벽',   icon: '🏰', costGold: 0,   costMaterial: 500, buildTurns: 4, requireStat: 'skill', requireStatMin: 5, effect: { defenseBonus: 40 } },
  { id: 'armory',    name: '무기고', icon: '⚒️', costGold: 250, costMaterial: 200, buildTurns: 3, effect: { special: 'weapons' } },
  { id: 'library',   name: '도서관', icon: '📚', costGold: 200, costMaterial: 0,   buildTurns: 2, effect: { knowledgePerTurn: 15 } },
  { id: 'academy',   name: '학당',   icon: '🎓', costGold: 350, costMaterial: 0,   buildTurns: 3, requireStat: 'intellect', requireStatMin: 7, effect: { knowledgePerTurn: 25, special: 'discover' } },
  { id: 'temple',    name: '사원',   icon: '⛩️', costGold: 400, costMaterial: 0,   buildTurns: 3, requireStat: 'virtue', requireStatMin: 7, effect: { moralePerTurn: 5, special: 'sorcery' } },
  { id: 'theater',   name: '극장',   icon: '🎭', costGold: 300, costMaterial: 0,   buildTurns: 3, effect: { moralePerTurn: 10, culturePerTurn: 5 } },
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

export const BATTLE_MAX_ROUNDS = 10
export const BATTLE_MAX_UNITS = 5

// ── 병과별 전술 위력 보정 ──

export const CLASS_TACTIC_BONUS: Record<UnitClass, Partial<Record<TacticType, number>>> = {
  general:    { charge: 0.30 },
  strategist: { stratagem: 0.40, fire: 0.30 },
  official:   { defend: 0.20 },
  artist:     { morale: 0.50 },
  ranger:     { feint: 0.40, fire: 0.10 },
  artisan:    { defend: 0.20 },
}

// ── 17개 영토 정의 ──

export const TERRITORIES: TerritoryDef[] = [
  // 동아시아
  { id: 'huabei',     name: '화북',         regionId: 'east_asia',     neighbors: ['jiangnan', 'liaodong', 'persia'],           position: { x: 80, y: 28 } },
  { id: 'jiangnan',   name: '강남',         regionId: 'east_asia',     neighbors: ['huabei', 'liaodong', 'india'],              position: { x: 84, y: 40 } },
  { id: 'liaodong',   name: '요동',         regionId: 'east_asia',     neighbors: ['huabei', 'jiangnan'],                       position: { x: 88, y: 22 } },
  // 남아시아
  { id: 'india',      name: '인도',         regionId: 'south_asia',    neighbors: ['ceylon', 'jiangnan', 'persia'],             position: { x: 68, y: 48 } },
  { id: 'ceylon',     name: '실론',         regionId: 'south_asia',    neighbors: ['india'],                                     position: { x: 72, y: 58 } },
  // 중동
  { id: 'mesopotamia', name: '메소포타미아', regionId: 'middle_east',  neighbors: ['persia', 'greece', 'rome'],                  position: { x: 56, y: 38 } },
  { id: 'persia',     name: '페르시아',     regionId: 'middle_east',   neighbors: ['mesopotamia', 'india', 'huabei', 'rus'],    position: { x: 62, y: 32 } },
  // 지중해
  { id: 'rome',       name: '로마',         regionId: 'mediterranean', neighbors: ['greece', 'iberia', 'france', 'mesopotamia'], position: { x: 44, y: 34 } },
  { id: 'greece',     name: '그리스',       regionId: 'mediterranean', neighbors: ['rome', 'mesopotamia', 'rus'],               position: { x: 50, y: 38 } },
  { id: 'iberia',     name: '이베리아',     regionId: 'mediterranean', neighbors: ['rome', 'france', 'north_america'],          position: { x: 34, y: 40 } },
  // 서유럽
  { id: 'france',     name: '프랑스',       regionId: 'west_europe',   neighbors: ['rome', 'iberia', 'britannia', 'germania'],  position: { x: 38, y: 28 } },
  { id: 'britannia',  name: '브리타니아',   regionId: 'west_europe',   neighbors: ['france', 'scandinavia', 'north_america'],   position: { x: 34, y: 18 } },
  { id: 'germania',   name: '게르마니아',   regionId: 'west_europe',   neighbors: ['france', 'scandinavia', 'rus'],             position: { x: 42, y: 22 } },
  // 북유럽
  { id: 'scandinavia', name: '스칸디나비아', regionId: 'north_europe', neighbors: ['britannia', 'germania', 'rus'],             position: { x: 44, y: 12 } },
  { id: 'rus',        name: '루시',         regionId: 'north_europe',  neighbors: ['scandinavia', 'germania', 'persia', 'greece'], position: { x: 54, y: 18 } },
  // 신대륙
  { id: 'north_america', name: '북아메리카', regionId: 'new_world',    neighbors: ['south_america', 'britannia', 'iberia'],     position: { x: 14, y: 28 } },
  { id: 'south_america', name: '남아메리카', regionId: 'new_world',    neighbors: ['north_america'],                            position: { x: 18, y: 50 } },
]

// ── 지역 ──

export const REGIONS: Region[] = [
  { id: 'east_asia',      name: '동아시아',     nameEn: 'East Asia',      neighbors: ['south_asia', 'middle_east'],            territoryIds: ['huabei', 'jiangnan', 'liaodong'],          color: '#ef4444', position: { x: 84, y: 30 } },
  { id: 'south_asia',     name: '남아시아',     nameEn: 'South Asia',     neighbors: ['east_asia', 'middle_east'],             territoryIds: ['india', 'ceylon'],                          color: '#f97316', position: { x: 70, y: 53 } },
  { id: 'middle_east',    name: '중동',         nameEn: 'Middle East',    neighbors: ['east_asia', 'south_asia', 'mediterranean'], territoryIds: ['mesopotamia', 'persia'],               color: '#eab308', position: { x: 59, y: 35 } },
  { id: 'mediterranean',  name: '지중해',       nameEn: 'Mediterranean',  neighbors: ['middle_east', 'west_europe', 'north_europe'], territoryIds: ['rome', 'greece', 'iberia'],          color: '#22c55e', position: { x: 43, y: 37 } },
  { id: 'west_europe',    name: '서유럽',       nameEn: 'West Europe',    neighbors: ['mediterranean', 'north_europe', 'new_world'], territoryIds: ['france', 'britannia', 'germania'],   color: '#3b82f6', position: { x: 38, y: 23 } },
  { id: 'north_europe',   name: '북유럽',       nameEn: 'North Europe',   neighbors: ['mediterranean', 'west_europe'],         territoryIds: ['scandinavia', 'rus'],                       color: '#8b5cf6', position: { x: 49, y: 15 } },
  { id: 'new_world',      name: '신대륙',       nameEn: 'New World',      neighbors: ['west_europe'],                          territoryIds: ['north_america', 'south_america'],           color: '#ec4899', position: { x: 16, y: 39 } },
]

// ── nationality → regionId 매핑 ──

export const NATIONALITY_TO_REGION: Record<string, RegionId> = {
  CN: 'east_asia', KR: 'east_asia', JP: 'east_asia', MN: 'east_asia',
  IN: 'south_asia',
  SA: 'middle_east', TR: 'middle_east', EG: 'middle_east', IL: 'middle_east', IQ: 'middle_east', IR: 'middle_east', KZ: 'middle_east', UZ: 'middle_east',
  IT: 'mediterranean', GR: 'mediterranean', ES: 'mediterranean', PT: 'mediterranean',
  FR: 'west_europe', GB: 'west_europe', DE: 'west_europe', NL: 'west_europe', BE: 'west_europe', CH: 'west_europe', IE: 'west_europe',
  SE: 'north_europe', RU: 'north_europe', PL: 'north_europe', AT: 'north_europe', HU: 'north_europe', CZ: 'north_europe', NO: 'north_europe', DK: 'north_europe',
  US: 'new_world',
}

// ── nationality → territoryId 매핑 (1차 배치용) ──

export const NATIONALITY_TO_TERRITORY: Record<string, TerritoryId> = {
  CN: 'huabei', KR: 'liaodong', JP: 'jiangnan', MN: 'liaodong',
  IN: 'india',
  SA: 'mesopotamia', TR: 'mesopotamia', EG: 'mesopotamia', IL: 'mesopotamia', IQ: 'mesopotamia', IR: 'persia', KZ: 'persia', UZ: 'persia',
  IT: 'rome', GR: 'greece', ES: 'iberia', PT: 'iberia',
  FR: 'france', GB: 'britannia', DE: 'germania', NL: 'germania', BE: 'france', CH: 'germania', IE: 'britannia',
  SE: 'scandinavia', RU: 'rus', PL: 'germania', AT: 'germania', HU: 'rus', CZ: 'germania', NO: 'scandinavia', DK: 'scandinavia',
  US: 'north_america',
}

// ── 피부톤 (초상화 팔레트 스왑용) ──

export const NATIONALITY_SKIN: Record<string, 'light' | 'medium' | 'dark'> = {
  GB: 'light', FR: 'light', DE: 'light', NL: 'light', SE: 'light', NO: 'light', AT: 'light', CH: 'light', PL: 'light', CZ: 'light', HU: 'light', IT: 'light', ES: 'light', PT: 'light', GR: 'light', RU: 'light', US: 'light', IE: 'light', DK: 'light', BE: 'light',
  CN: 'medium', KR: 'medium', JP: 'medium', MN: 'medium', TR: 'medium', KZ: 'medium', UZ: 'medium', IL: 'medium',
  IN: 'dark', SA: 'dark', EG: 'dark', IQ: 'dark', IR: 'medium',
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

export const STAT_LABELS: Record<keyof Stats, { name: string; icon: string }> = {
  power:     { name: '완력', icon: '⚔️' },
  skill:     { name: '기량', icon: '🔧' },
  intellect: { name: '지력', icon: '🧠' },
  stamina:   { name: '체력', icon: '❤️' },
  loyalty:   { name: '충의', icon: '🛡️' },
  virtue:    { name: '인애', icon: '💎' },
  courage:   { name: '용기', icon: '🔥' },
}
