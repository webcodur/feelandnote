import type { SpectrumStats } from '@/lib/spectrum/types'
import type { TerritoryId } from './map'

export type Grade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E'
export type HeroClass = 'general' | 'saint' | 'strategist' | 'official' | 'artist' | 'artisan' | 'ranger'
export type AbilityKey = 'command' | 'martial' | 'intellect' | 'charm'
export type HeroStats = SpectrumStats
export type ProfessionCode = string
export type Reality = 'real' | 'fiction' | 'both'
export type Difficulty = 'easy' | 'normal' | 'hard'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type RosterRow = [id: string, name: string, title: string, profession: string, nationality: string, gender: number | null, birth: number | null, death: number | null, avatar: string | number | null, stats: number[] | null, influence: number, reality: 'R' | 'F' | 'B', voiceVersion: number, views: number]
export interface Hero {
  id: string
  name: string
  title: string
  prof: ProfessionCode
  nat: string
  female: boolean | null
  birth: number | null
  death: number | null
  avatar: string | null
  stats: HeroStats
  derived: boolean
  score: number
  grade: Grade
  cls: HeroClass
  home: TerritoryId
  reality: Reality
  voiceV: number
  renown: number
}
export interface Roster {
  heroes: Hero[]
  byId: Map<string, Hero>
  byHome: Map<TerritoryId, Hero[]>
}
export type OfficerTask = 'farm' | 'commerce' | 'walls' | 'relief' | 'conscript' | 'train' | 'subdue' | 'search' | 'recruit' | 'move' | 'build' | 'battle' | 'diplomacy'
export interface HeroState {
  id: string
  status: 'free' | 'lord' | 'officer' | 'companion' | 'prisoner'
  faction: string | null
  loc: TerritoryId
  troops: number
  training: number
  loyalty: number
  wound: number
  xp: number
  level: number
  acted: boolean
  task: OfficerTask | null
  star: number | null
  joinedTurn: number
  recruitAfter?: number
  formerFaction?: string | null
}
export type BuildingType = 'farmland' | 'market' | 'barracks' | 'academy' | 'temple' | 'theater' | 'fortress' | 'tavern' | 'shipyard'
export type ThreatType = 'bandits' | 'plague' | 'flood'
export interface TerritoryState {
  id: TerritoryId
  owner: string | null
  governor: string | null
  population: number
  farm: number
  commerce: number
  walls: number
  order: number
  buildings: { type: BuildingType; progress: number }[]
  slots: number
  delegate: boolean
  militia: number
  threat: { type: ThreatType; power: number; since: number } | null
}
export type AIPersonality = 'conqueror' | 'schemer' | 'benevolent' | 'cautious' | 'builder'
export interface FactionState {
  id: string
  lordId: string
  color: string
  capital: TerritoryId
  gold: number
  food: number
  fame: number
  isPlayer: boolean
  personality: AIPersonality
  relations: Record<string, number>
  treaties: Record<string, { kind: 'alliance' | 'ceasefire'; until: number }>
  discovered: Record<string, number>
  alive: boolean
  stars: string[]
  fallenTurn: number | null
  foundedTurn: number
  lastSortie: number
}
export type EncounterKind = 'hero' | 'bandits' | 'merchant' | 'rumor' | 'shrine' | 'village' | 'quiet'
export interface Encounter {
  kind: EncounterKind
  resolved: boolean
  heroId?: string
  power?: number
  gold?: number
  rumorHeroId?: string
  rumorAt?: TerritoryId
  result?: 'refused' | 'joined' | 'talked' | 'ignored' | 'paid' | 'fled' | 'won' | 'lost' | 'helped' | 'defended' | 'robbed' | 'foretold' | 'rested'
  loss?: number
}
export interface WanderState {
  loc: TerritoryId
  party: string[]
  gold: number
  fame: number
  encounter: Encounter | null
  met: string[]
  turns: number
  lead?: { heroId: string; at: TerritoryId } | null
}
export interface LogEntry {
  turn: number
  code: string
  params: Record<string, string | number>
  mine: boolean
}
export interface GameEvent {
  id: number
  turn: number
  resolved: boolean
  kind: 'invaded' | 'prisoners' | 'visitor' | 'discontent' | 'proposal' | 'faction_fell' | 'defected' | 'stars108'
  territory?: TerritoryId
  from?: TerritoryId
  factionId?: string
  attackers?: string[]
  prisoners?: string[]
  heroId?: string
  heroes?: string[]
  code?: string
  amount?: number
}
export type Outcome = { kind: 'unified' | 'fallen' | 'timeout'; turn: number }
export interface GameState {
  version: 2
  seed: number
  rngState: number
  turn: number
  difficulty: Difficulty
  phase: 'wander' | 'strategy' | 'battle' | 'result'
  lordId: string
  playerFaction: string | null
  wander: WanderState | null
  territories: Record<TerritoryId, TerritoryState>
  factions: Record<string, FactionState>
  heroes: Record<string, HeroState>
  battle: BattleState | null
  battleSeq: number
  events: GameEvent[]
  eventSeq: number
  log: LogEntry[]
  report: { turn: number; income: { gold: number; food: number }; expense: { gold: number; food: number }; entries: LogEntry[] } | null
  outcome: Outcome | null
  stats: { battlesWon: number; battlesLost: number; recruited: number; conquered: number; maxTerritories: number; stars108: number | null; fameRank: number }
  settings: { battleSpeed: 1 | 2 | 3; autoBattle: boolean }
  rosterSize: number
}
export type BattleSide = 'attacker' | 'defender'
export type SkillId = 'charge' | 'fire' | 'confuse' | 'heal' | 'fortify' | 'inspire' | 'volley' | 'siege' | 'snipe'
export type UnitStats = Pick<HeroStats, AbilityKey | 'courage' | 'benevolence' | 'cautious_bold'>
export interface BattleUnit {
  heroId: string
  militia: boolean
  side: BattleSide
  cls: HeroClass
  grade: Grade
  level: number
  stats: UnitStats
  skill: SkillId
  row: 0 | 1
  col: number
  troops: number
  maxTroops: number
  startTroops: number
  training: number
  wound: number
  next: number
  speed: number
  cooldown: number
  statuses: Partial<Record<'guard' | 'fortify' | 'confused' | 'inspired' | 'weakened', number>>
  routed: boolean
  dealt: number
  isLord: boolean
}
export type BattleAction = { kind: 'attack' | 'skill' | 'guard' | 'duel' | 'retreat' | 'wait'; actor: string; target?: string }
export type DuelMove = 'attack' | 'guard' | 'desperate'
export interface DuelState {
  a: string
  b: string
  hpA: number
  hpB: number
  maxA: number
  maxB: number
  rounds: { a: DuelMove; b: DuelMove; dmgA: number; dmgB: number }[]
  intent: DuelMove
  hint: DuelMove
  done: boolean
  winner: string | null
  player: 'a' | 'b' | null
}
export interface BattleState {
  id: number
  territory: TerritoryId
  from: TerritoryId | null
  attacker: string | null
  defender: string | null
  playerSide: BattleSide | null
  units: BattleUnit[]
  round: number
  maxRounds: number
  morale: Record<BattleSide, number>
  walls: number
  log: { code: string; params: Record<string, string | number>; round: number }[]
  fx: { id: number; kind: 'crit' | 'hit' | 'miss' | 'skill' | 'heal' | 'buff' | 'debuff' | 'guard' | 'duel'; actor: string; targets: string[]; amount?: number; skill?: SkillId } | null
  fxSeq: number
  duel: DuelState | null
  result: BattleSide | 'draw' | null
  captured: string[]
  kind: 'invasion' | 'bandits'
}
