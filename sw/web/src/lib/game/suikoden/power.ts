// 천도 v2 — 싸움 값. 합전의 피해 공식과 같은 뿌리에서 부대 하나의 힘을 어림한다.
// AI 출진 판단, 출진 창의 전력 비교, 외교의 세력 비교가 모두 이 값을 쓴다(전투 공식과 따로 놀면 어림이 빗나간다).

import { BATTLE, CLASSES } from './constants'
import { levelMultiplier } from './roster'
import type { HeroClass } from './types'

/** 병력이 늘수록 피해가 늘지만 제곱근으로 무뎌진다 */
export function troopFactor(troops: number): number {
  return Math.max(0.35, Math.min(2.5, Math.sqrt(troops / 1000)))
}

interface CombatStats {
  martial: number
  command: number
  intellect: number
  courage: number
}

/** 물리 공격력 — 합전 physical()과 같은 식 */
export function attackRating(stats: CombatStats, cls: HeroClass): number {
  return ((stats.martial * 0.7 + stats.command * 0.3 + 30) / 80) * CLASSES[cls].attack
}

/** 방어력 — 합전 physical()과 같은 식 */
export function defenseRating(stats: CombatStats, cls: HeroClass): number {
  return ((stats.command * 0.6 + stats.martial * 0.2 + stats.courage * 0.2 + 30) / 80) * CLASSES[cls].defense
}

/**
 * 부대 하나의 싸움 값 ≈ 병력(버티는 힘) × √(공격 × 방어 × 병력 배율).
 * 뒷줄 근접 병과는 공격이 깎이고, 책사는 계략(지력)으로 친다.
 */
export function combatValue(stats: CombatStats, cls: HeroClass, troops: number, training: number, wound: number, level: number): number {
  if (troops <= 0) return 0
  const def = CLASSES[cls]
  let atk = attackRating(stats, cls)
  if (def.row === 1 && !def.ranged) atk *= BATTLE.backRowMelee
  if (cls === 'strategist') atk = Math.max(atk, ((stats.intellect + 30) / 80) * 0.8)
  const dfn = defenseRating(stats, cls)
  return troops * Math.sqrt(atk * dfn * troopFactor(troops)) * (0.8 + training / 500) * (1 - wound / 250) * levelMultiplier(level)
}

/** 성벽이 수비군이 받는 피해를 줄인 만큼 수비 값이 오른다 */
export function wallsFactor(walls: number): number {
  const cut = Math.min(BATTLE.wallsMaxReduction, (walls / 1000) * BATTLE.wallsMaxReduction)
  return Math.sqrt(1 / (1 - cut))
}

export interface PowerUnit {
  stats: CombatStats
  cls: HeroClass
  troops: number
  training: number
  wound: number
  level: number
}

/** 한 진영의 버티는 힘(병력 × 방어)과 한 차례에 치는 힘(부대마다 공격 × 병력 배율의 합) */
export interface SideStrength {
  hold: number
  hit: number
}

/**
 * 부대마다 한 차례에 한 번씩 치므로, 같은 병력이라도 여러 부대로 나눠 싸우는 쪽이 치는 힘이 크다
 * (한 부대 단독 출진이 약한 까닭). 성벽은 수비군이 받는 피해를 줄이므로 버티는 힘에 얹는다.
 */
export function sideStrength(units: PowerUnit[], walls = 0): SideStrength {
  let hold = 0
  let hit = 0
  for (const u of units) {
    if (u.troops <= 0) continue
    const def = CLASSES[u.cls]
    let atk = attackRating(u.stats, u.cls)
    if (def.row === 1 && !def.ranged) atk *= BATTLE.backRowMelee
    if (u.cls === 'strategist') atk = Math.max(atk, ((u.stats.intellect + 30) / 80) * 0.8)
    const quality = (0.8 + u.training / 500) * (1 - u.wound / 250) * levelMultiplier(u.level)
    hold += u.troops * defenseRating(u.stats, u.cls)
    hit += atk * troopFactor(u.troops) * quality
  }
  return { hold: hold * wallsFactor(walls) ** 2, hit }
}

/** 화면에 보이는 전력 한 숫자 — 두 힘의 기하 평균. 병력 1000·능력 보통인 부대 하나가 대략 1000이다 */
export function strengthValue(s: SideStrength): number {
  return Math.sqrt(s.hold * s.hit * 1000)
}

/** 공격이 수비를 무너뜨리는 데 걸릴 합 수 — 제한 합 안에 못 끝내면 공격은 실패로 끝난다 */
export function roundsToBreak(att: SideStrength, def: SideStrength): number {
  return def.hold / Math.max(1e-6, BATTLE.baseDamage * att.hit)
}

/**
 * 공격 쪽 승산 비 — 1을 넘으면 대개 이긴다.
 * 소모전(버티는 힘 × 치는 힘)의 비에, 제한 합 안에 수비를 무너뜨릴 수 있는지를 곱한다.
 * 버티기만 좋은 군(치는 힘이 약한 군)은 소모전에서 밀리지 않아도 성을 떨어뜨리지 못한다.
 */
export function attackRatio(att: SideStrength, def: SideStrength): number {
  const attrition = Math.sqrt((att.hold * att.hit) / Math.max(1e-6, def.hold * def.hit))
  const time = Math.min(1, BATTLE.effectiveRounds / roundsToBreak(att, def))
  // 제한 합 안에 다 못 무너뜨려도 병력이 넉넉히 앞서면 성을 얻는다(siegeTakeRatio) — 시간 벌점은 약하게 준다
  return attrition * Math.pow(time, TIME_WEIGHT)
}

/** 헤드리스 대조(.artifacts calib2: 여섯 대 여섯·성벽)로 맞춘 값 — 비 1.0 언저리가 승률 절반쯤 */
const TIME_WEIGHT = 0.25
