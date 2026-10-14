import type { AIPersonality, BuildingType, Difficulty, Grade, HeroClass, HeroStats, ProfessionCode, Season, SkillId, ThreatType } from './types'

export const STAT_KEYS = ['command', 'martial', 'intellect', 'charm', 'temperance', 'diligence', 'reflection', 'courage', 'loyalty', 'benevolence', 'fairness', 'humility', 'pessimism_optimism', 'conservative_progressive', 'individual_social', 'cautious_bold'] as const satisfies readonly (keyof HeroStats)[]
export const GRADE_THRESHOLDS: { grade: Grade; min: number }[] = [{ grade: 'SS', min: 85 }, { grade: 'S', min: 75 }, { grade: 'A', min: 65 }, { grade: 'B', min: 55 }, { grade: 'C', min: 45 }, { grade: 'D', min: 35 }, { grade: 'E', min: 0 }]
export const GRADE_INFO: Record<Grade, { color: string; troopMult: number; salary: number; fameReq: number; recruitResist: number; wanderResist: number }> = {
  SS: { color: '#fbbf24', troopMult: 1.4, salary: 10, fameReq: 900, recruitResist: 0.35, wanderResist: 0.35 }, S: { color: '#a78bfa', troopMult: 1.25, salary: 8, fameReq: 700, recruitResist: 0.25, wanderResist: 0.25 },
  A: { color: '#60a5fa', troopMult: 1.15, salary: 7, fameReq: 500, recruitResist: 0.15, wanderResist: 0.15 }, B: { color: '#34d399', troopMult: 1, salary: 5, fameReq: 300, recruitResist: 0.08, wanderResist: 0.08 },
  C: { color: '#d1d5db', troopMult: 0.9, salary: 4, fameReq: 150, recruitResist: 0, wanderResist: 0 }, D: { color: '#9ca3af', troopMult: 0.8, salary: 3, fameReq: 50, recruitResist: -0.05, wanderResist: -0.05 }, E: { color: '#78716c', troopMult: 0.7, salary: 2, fameReq: 0, recruitResist: -0.1, wanderResist: -0.1 },
}
export const PROFESSION_ARCHETYPE: Record<ProfessionCode, readonly [number, number, number, number]> = {
  commander: [78, 78, 55, 58], athlete: [50, 82, 40, 65], leader: [76, 50, 65, 75],
  humanities_scholar: [45, 25, 83, 60], social_scientist: [50, 25, 80, 60], politician: [68, 35, 70, 75],
  investor: [55, 30, 78, 58], author: [40, 25, 75, 70], musician: [35, 30, 62, 83],
  visual_artist: [35, 30, 63, 82], director: [65, 35, 70, 72], actor: [40, 45, 55, 85],
  scientist: [40, 25, 85, 45], entrepreneur: [65, 35, 70, 65], influencer: [45, 40, 50, 80], other: [50, 45, 50, 50],
}
export const PROFESSION_CLASS: Record<ProfessionCode, HeroClass> = {
  commander: 'general', athlete: 'general', leader: 'saint', humanities_scholar: 'strategist', social_scientist: 'strategist',
  politician: 'official', investor: 'official', author: 'artist', musician: 'artist', visual_artist: 'artist', director: 'artist', actor: 'artist',
  scientist: 'artisan', entrepreneur: 'artisan', influencer: 'ranger', other: 'ranger',
}
export const GRADES: Grade[] = GRADE_THRESHOLDS.map(item => item.grade)
export const VIRTUE_KEYS = ['temperance', 'diligence', 'reflection', 'courage', 'loyalty', 'benevolence', 'fairness', 'humility'] as const
export const DISPOSITION_KEYS = ['pessimism_optimism', 'conservative_progressive', 'individual_social', 'cautious_bold'] as const
export const DERIVED_NOISE = { ability: 12, virtue: 25, disposition: 45 }
export const TROOPS = { base: 300, command: 14, martial: 5, conscriptBase: 100, conscriptCommand: 4 }
export const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1850, 2350, 3000]
export const LEVEL_BONUS = 0.03
export const DEV_MAX = 1000
export const FAME_MAX = 1000
export const FAME_RANKS = [0, 50, 150, 300, 500, 700, 900]
export const FAME_GAIN = { raise: 10, recruitTop: 3, battleWin: 5, battleLose: -3, conquer: 10, conquerNeutral: 5, territoryLost: -10, wanderBandits: 5, wanderTalk: 2, wanderVillage: 3 }
export const START_ORDER = 65
export const CAPITAL_EXTRA_SLOTS = 2
export const PLAYER_COLOR = '#d4af37'
export const FACTION_COLORS = ['#cb665c', '#5b9b89', '#6e84be', '#ac7fb7', '#c1985c', '#5e9da9', '#ae7561', '#829b61', '#b98596', '#7e85a0']
export const DIFFICULTY: Record<Difficulty, { aiFactions: number; aiStartMembers: number; aiBonus: number; wanderGold: number; limitYears: number; aiCaution: number; playerGrace: number; playerEarly: number; playerEarlyMult: number }> = {
  easy: { aiFactions: 8, aiStartMembers: 3, aiBonus: 0.85, wanderGold: 700, limitYears: 50, aiCaution: 1.2, playerGrace: 12, playerEarly: 24, playerEarlyMult: 1.5 },
  normal: { aiFactions: 12, aiStartMembers: 4, aiBonus: 1, wanderGold: 500, limitYears: 40, aiCaution: 1, playerGrace: 6, playerEarly: 12, playerEarlyMult: 1.3 },
  hard: { aiFactions: 16, aiStartMembers: 5, aiBonus: 1.15, wanderGold: 300, limitYears: 30, aiCaution: 0.9, playerGrace: 3, playerEarly: 6, playerEarlyMult: 1.15 },
}
export const START = { aiGold: 1800, aiFood: 12000, aiTroopRate: 0.7, fameByGrade: { SS: 500, S: 350, A: 250, B: 150, C: 80, D: 30, E: 0 } satisfies Record<Grade, number>, wanderFameRate: 0.4, playerRaiseGold: 1000, playerRaiseFood: 8000, raiseMilitiaRate: 0.6, raiseTroopRate: 0.5 }
export const TERRITORY_PRESET = {
  l: { population: 120000, maxPopulation: 300000, farm: 350, commerce: 400, walls: 300, slots: 5, militia: 3000 },
  m: { population: 70000, maxPopulation: 200000, farm: 250, commerce: 250, walls: 200, slots: 4, militia: 2200 },
  s: { population: 40000, maxPopulation: 120000, farm: 180, commerce: 160, walls: 120, slots: 3, militia: 1500 },
}
export const TAG_BONUS = { fertile: 1.25, trade: 1.25, fortress: 1.3 }
export const BUILDINGS: Record<BuildingType, { gold: number; months: number; coastal?: boolean }> = {
  farmland: { gold: 350, months: 2 }, market: { gold: 400, months: 2 }, barracks: { gold: 450, months: 2 },
  academy: { gold: 500, months: 3 }, temple: { gold: 350, months: 2 }, theater: { gold: 450, months: 3 },
  fortress: { gold: 700, months: 4 }, tavern: { gold: 300, months: 2 }, shipyard: { gold: 600, months: 3, coastal: true },
}
export const BUILDING_EFFECT = { farmland: 0.25, market: 0.25, barracksCap: 1.2, barracksConscript: 1.3, barracksRecover: 0.03, academyTraining: 2, academyXp: 8, templeHeal: 3, templeOrder: 1, theaterFame: 1, theaterOrder: 1, fortressWalls: 200 }
export const COMMANDS = {
  farm: { gold: 50, food: 0, xp: 15 }, commerce: { gold: 50, food: 0, xp: 15 }, walls: { gold: 60, food: 0, xp: 15 },
  relief: { gold: 0, food: 300, xp: 15 }, conscript: { gold: 60, food: 0, xp: 15 }, train: { gold: 0, food: 0, xp: 15 },
  subdue: { gold: 0, food: 150, xp: 25 }, search: { gold: 30, food: 0, xp: 15 }, recruit: { gold: 40, food: 0, xp: 20 },
  move: { gold: 0, food: 0, xp: 5 }, build: { gold: 0, food: 0, xp: 20 },
}
export const CLASS_DEV_BONUS: Record<HeroClass, Partial<Record<'farm' | 'commerce' | 'walls' | 'relief' | 'conscript' | 'train' | 'subdue' | 'search' | 'recruit', number>>> = {
  general: { conscript: 1.2, train: 1.2 }, saint: { relief: 1.3 }, strategist: { search: 1.2 }, official: { farm: 1.2, commerce: 1.2 }, artist: { recruit: 1.2 }, artisan: { walls: 1.3 }, ranger: { subdue: 1.2 },
}
export const ECONOMY = { goldPerCommerce: 0.2, goldPerThousandPop: 0.4, foodPerFarm: 4, foodPerThousandPop: 2, foodPer100Troops: 15, orderBase: 0.5, orderSpan: 0.5, orderDrift: 65, popGrowth: 0.004, starvationDesert: 0.08, foodBuyPrice: 0.2, foodBuyPriceMarket: 0.15, seasonFood: { spring: 0.8, summer: 0.8, autumn: 1.8, winter: 0.6 } satisfies Record<Season, number> }
export const LOYALTY = { unpaid: 8, drift: 1, defectBelow: 25, defectChance: 0.08, joinBase: 55, heroLoyalty: 0.2, lordCharm: 0.2, companionBonus: 15, rewardGold: 80, rewardGain: 12 }
export const RECRUIT = { base: 0.2, charm: 0.004, fame: 0.3, sameEra: 0.1, sameNation: 0.1, sameProfession: 0.05, min: 0.05, max: 0.9, cooldown: 3, prisonerBase: 0.2 }
export const SEARCH = { base: 0.25, intellect: 0.004, charm: 0.001, tavern: 0.15, max: 0.9, extraFind: 0.15, goldFind: 0.2 }
export const WANDER = { partyMax: 5, seaFare: 50, banditGold: [60, 180] as [number, number], merchantGold: [80, 200] as [number, number], villageGold: 40, shrineGold: 30, shrineFame: 3, banditLossMult: 0.25, escortLossMult: 0.2, escortAmbush: 0.45, flee: 0.75, recruitBase: 0.25, recruitCharm: 0.004, recruitFame: 0.4, recruitMin: 0.05, recruitMax: 0.9, encounter: { hero: 35, village: 15, bandits: 12, merchant: 12, rumor: 10, shrine: 8, quiet: 8 } }
export const THREATS: Record<ThreatType, { chance: number; order: number }> = { bandits: { chance: 0.025, order: 2 }, plague: { chance: 0.012, order: 3 }, flood: { chance: 0.015, order: 2 } }
export const WOUND_HEAL = 5
export const CLASSES: Record<HeroClass, { color: string; row: 0 | 1; attack: number; defense: number; speed: number; ranged: boolean; skills: SkillId[] }> = {
  general: { color: '#dc2626', row: 0, attack: 1.3, defense: 1.1, speed: 0, ranged: false, skills: ['charge'] },
  saint: { color: '#f59e0b', row: 1, attack: 0.6, defense: 0.9, speed: 0, ranged: false, skills: ['heal'] },
  strategist: { color: '#7c3aed', row: 1, attack: 0.6, defense: 0.8, speed: 2, ranged: true, skills: ['fire', 'confuse'] },
  official: { color: '#2563eb', row: 0, attack: 0.8, defense: 1.2, speed: -1, ranged: false, skills: ['fortify'] },
  artist: { color: '#ec4899', row: 1, attack: 0.5, defense: 0.7, speed: -2, ranged: false, skills: ['inspire'] },
  artisan: { color: '#d97706', row: 1, attack: 0.9, defense: 1, speed: -3, ranged: true, skills: ['siege'] },
  ranger: { color: '#059669', row: 1, attack: 1.1, defense: 0.9, speed: 4, ranged: true, skills: ['snipe'] },
}
export const BATTLE = { maxUnits: 6, maxRounds: 30, effectiveRounds: 15, roundLength: 100, baseDamage: 100, backRowMelee: 0.65, wallsMaxReduction: 0.4, guardTaken: 0.5, fortifyTaken: 0.75, counter: 0.2, startMorale: 70, routMoraleGain: 3, routMoraleLoss: 8, duelMorale: 12, duelTroopLoss: 0.25, skillCooldown: 3, minTroopsToFight: 50, supplyPerTroop: 0.15, captureBase: 0.25, siegeTakeRatio: 1.2 }
export const SKILL_TARGET: Record<SkillId, 'enemy' | 'enemy_row' | 'ally' | 'allies' | 'self'> = { charge: 'enemy', fire: 'enemy', confuse: 'enemy', heal: 'ally', fortify: 'allies', inspire: 'allies', volley: 'enemy_row', siege: 'enemy', snipe: 'enemy' }
export const SKILL_POWER = { siege: 1.5, snipe: 1.3, charge: 1.5, fire: 1.3, confuse: 0.6, heal: 0.25, inspire: 10 }
export const DUEL = { minMartial: 60, hpBase: 100, hpMartial: 1, hpCourage: 0.5, hpLevel: 10, dmgBase: 15, dmgMartial: 0.3, counter: 1.2, breakGuard: 1.5, clash: 1.3, hintTruth: 0.7, maxRounds: 10 }
export const NATIVE_DEFENDER = { count: { l: 3, m: 2, s: 1 }, militiaPerUnit: 1000, minPower: 40, troopRate: 0.65 }
export const AI_AGGRESSION: Record<AIPersonality, number> = { conqueror: 1.05, schemer: 1.3, benevolent: 1.5, cautious: 1.7, builder: 1.4 }
export const AI_WAR = { sortieRest: 2, stationCap: 8, membersPerLand: 3 }
export const DIPLOMACY = { allianceMin: 20, allianceMonths: 12, ceasefireMonths: 6, relationDecay: 1, giftGold: 150, giftRelation: 15, surrenderMonths: 6 }
export const STARS_BONUS = { income: 1.2, morale: 10 }
export const LOG_LIMIT = 300
export const SAVE_KEY = 'feelandnote-cheondo-v2'
export const CODEX_KEY = 'feelandnote-cheondo-codex-v2'
export const WORLD_LOG_CODES = new Set(['conquered', 'faction_fell', 'alliance', 'ceasefire', 'uprising'])
export function calendarOf(turn: number): { year: number; month: number; season: Season } {
  const month = ((turn % 12) + 12) % 12 + 1
  return { year: 1002 + Math.floor(turn / 12), month, season: month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter' }
}
