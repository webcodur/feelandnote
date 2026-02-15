// 천도 — 상수 정의

import type { BuildingDef, Grade, ItemGrade, UnitClass, Terrain, Region, RegionId, Stats, TerritoryDef, TerritoryId, ClassSkill, GameTime } from './types'

// ── 실시간 엔진 상수 ──

export const RT = {
  BASE_TICK_MS: 200,           // 1x 기준 틱 간격 (ms)
  TICKS_PER_HOUR: 1,           // 1틱 = 1시간
  RESOURCE_INTERVAL: 24,       // 24틱(=1일)마다 자원 생산
  AI_EVAL_INTERVAL: 120,       // 120틱(=5일)마다 AI 평가
  CONSTRUCTION_TICKS_PER_TURN: 720, // 기존 buildTurns 1 = 30일 = 720틱
  FOOD_CONSUME_INTERVAL: 720,  // 30일마다 식량 소비
} as const

export const TERRAIN_MOVE_TICKS: Record<Terrain, number> = {
  plain: 1, road: 1, town: 1, gate: 1, coast: 1,
  forest: 2, river: 2, desert: 2, snow: 2,
  mountain: 3,
  wall: 999, sea: 999,
}

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

// ── 지형 ──

export const TERRAIN_INFO: Record<Terrain, { name: string; moveCost: number; defBonus: number; color: string; icon: string }> = {
  plain:    { name: '평지', moveCost: 1, defBonus: 0,    color: '#86efac', icon: '' },
  forest:   { name: '숲',   moveCost: 2, defBonus: 0.2,  color: '#166534', icon: '🌲' },
  mountain: { name: '산',   moveCost: 3, defBonus: 0.4,  color: '#78716c', icon: '⛰️' },
  river:    { name: '강',   moveCost: 2, defBonus: -0.1, color: '#60a5fa', icon: '〜' },
  desert:   { name: '사막', moveCost: 2, defBonus: 0,    color: '#fde68a', icon: '' },
  snow:     { name: '설원', moveCost: 2, defBonus: 0,    color: '#e2e8f0', icon: '❄️' },
  coast:    { name: '해안', moveCost: 1, defBonus: 0,    color: '#bae6fd', icon: '' },
  sea:      { name: '바다', moveCost: 99,defBonus: 0,    color: '#1d4ed8', icon: '🌊' },
  wall:     { name: '성벽', moveCost: 99,defBonus: 0.6,  color: '#57534e', icon: '🧱' },
  gate:     { name: '성문', moveCost: 1, defBonus: 0.3,  color: '#a8a29e', icon: '🚪' },
  town:     { name: '마을', moveCost: 1, defBonus: 0.1,  color: '#fed7aa', icon: '🏠' },
  road:     { name: '도로', moveCost: 1, defBonus: 0,    color: '#d6d3d1', icon: '' },
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

// ── 권역별 지형 분포 (맵 생성용, 확률) ──

export const REGION_TERRAIN_DIST: Record<RegionId, Partial<Record<Terrain, number>>> = {
  east_asia:     { plain: 0.45, forest: 0.2, mountain: 0.15, river: 0.1, road: 0.1 },
  south_asia:    { plain: 0.35, forest: 0.25, mountain: 0.1, river: 0.15, desert: 0.05, road: 0.1 },
  middle_east:   { plain: 0.2, desert: 0.4, mountain: 0.15, road: 0.15, river: 0.1 },
  mediterranean: { plain: 0.35, forest: 0.1, mountain: 0.15, coast: 0.15, road: 0.15, river: 0.1 },
  west_europe:   { plain: 0.4, forest: 0.2, mountain: 0.1, river: 0.1, road: 0.15, coast: 0.05 },
  north_europe:  { plain: 0.25, forest: 0.25, snow: 0.2, mountain: 0.1, river: 0.1, road: 0.1 },
  new_world:     { plain: 0.35, forest: 0.3, mountain: 0.15, river: 0.1, coast: 0.1 },
}

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

// ── 전투 상수 ──

export const BATTLE_GRID = { width: 16, height: 12 }
export const BATTLE_MAX_UNITS = 5
export const BATTLE_MAX_TURNS = 30
export const TILE_SIZE = 40

export const MOVE_RANGE: Record<UnitClass, number> = {
  general: 3, strategist: 2, artisan: 2, official: 2, artist: 2, ranger: 4,
}
export const SHOOT_RANGE: Record<UnitClass, number> = {
  general: 0, strategist: 3, artisan: 2, official: 0, artist: 0, ranger: 2,
}

// ── 성벽/성문 HP ──

export const WALL_HP = 200
export const GATE_HP = 120

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

// ── 병과별 스킬 ──

export const CLASS_SKILLS: ClassSkill[] = [
  // 장수
  { id: 'charge',     name: '돌격',     icon: '🐎', unitClass: 'general',    costTroops: 50,  range: 1, aoe: 0, power: 2.0, description: '병사를 이끌고 강력한 돌격' },
  { id: 'rally',      name: '고무',     icon: '📯', unitClass: 'general',    costTroops: 0,   range: 0, aoe: 2, power: 0,   effect: 'buff_power', description: '주변 아군 공격력 상승' },
  // 책사
  { id: 'fire_arrow', name: '화시',     icon: '🏹', unitClass: 'strategist', costTroops: 30,  range: 3, aoe: 1, power: 1.5, effect: 'burn', description: '불 화살로 범위 공격' },
  { id: 'confuse',    name: '혼란',     icon: '🌀', unitClass: 'strategist', costTroops: 0,   range: 3, aoe: 0, power: 0,   effect: 'stun', description: '적 1턴 행동불능' },
  // 장인
  { id: 'siege_ram',  name: '파성추',   icon: '🪵', unitClass: 'artisan',    costTroops: 40,  range: 1, aoe: 0, power: 3.0, description: '성벽/성문에 3배 데미지' },
  { id: 'repair',     name: '수리',     icon: '🔧', unitClass: 'artisan',    costTroops: 0,   range: 0, aoe: 0, power: 0,   effect: 'heal', description: '인접 건물/성벽 수리' },
  // 관료
  { id: 'decree',     name: '포고',     icon: '📜', unitClass: 'official',   costTroops: 0,   range: 0, aoe: 3, power: 0,   effect: 'morale_down', description: '적 전체 사기 하락' },
  // 예인
  { id: 'inspire',    name: '고취',     icon: '🎵', unitClass: 'artist',     costTroops: 0,   range: 0, aoe: 3, power: 0,   effect: 'heal', description: '아군 전체 HP 회복' },
  // 유격
  { id: 'ambush',     name: '기습',     icon: '🗡️', unitClass: 'ranger',     costTroops: 20,  range: 1, aoe: 0, power: 2.5, description: '방어 무시 기습 공격' },
  { id: 'scout',      name: '정찰',     icon: '👁️', unitClass: 'ranger',     costTroops: 0,   range: 0, aoe: 0, power: 0,   effect: 'buff_power', description: '다음 공격 치명타 확정' },
]
