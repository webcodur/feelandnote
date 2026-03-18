/**
 * 인물 열전 타이밍 — 단일원천(SSoT)
 *
 * BookRecommend/timing.ts에서 공용 상수(FPS, f, toFrames 등)를 가져오고,
 * 인물 열전 전용 상수만 여기에 정의한다.
 */

export { FPS, f, toFrames, toAudioFrames, BRAND_FRAMES, LOGO_FRAMES } from '../BookRecommend/timing'
import { f, toFrames } from '../BookRecommend/timing'
import type { CelebProfileScript } from './types'

// --- 인물 열전 전용 상수 ---

/** 인트로(리빌) 폴백 */
export const INTRO_FALLBACK = f(8)
/** Bio→Persona 전환 폴백 */
export const TRANSITION_FALLBACK = f(4)
/** 능력/덕목 항목 1개 표시 시간 (reason 나레이션 없을 때) */
export const STAT_ITEM_FALLBACK = f(4)
/** 성향 항목 1개 표시 시간 */
export const DISPOSITION_ITEM_FALLBACK = f(4)
/** Rationale 폴백 */
export const RATIONALE_FALLBACK = f(8)
/** 영향력 축 1개 폴백 */
export const INFLUENCE_AXIS_FALLBACK = f(3)
/** 통시성 폴백 */
export const TRANSHISTORICITY_FALLBACK = f(5)
/** 브릿지 폴백 */
export const BRIDGE_FALLBACK = f(5)
/** 섹션 간 갭 */
export const SECTION_GAP = f(1)
/** 시리즈 인트로 폴백 */
export const SERIES_INTRO_FALLBACK = f(2)
/** 공통 라벨 오디오 프레임 (라벨 재생 + 짧은 갭) */
export const LABEL_FRAMES = f(1.2)

// --- 프레임 계산 ---

const dur = (d: number | undefined, fallback: number) =>
  d ? toFrames(d) : fallback

/** 전체 프레임 계산 */
export const calcTotalFrames = (s: CelebProfileScript): number => {
  const n = s.narrator
  const p = s.persona
  const inf = s.influence

  let total = 0

  // Brand
  total += f(4)

  // Series intro + Intro (bio)
  total += dur(n.seriesIntroDuration, SERIES_INTRO_FALLBACK)
  total += dur(n.introDuration, INTRO_FALLBACK)

  // Bio → Persona 전환
  total += dur(n.bioToPersonaDuration, TRANSITION_FALLBACK)

  // Abilities (4개) — 라벨 + reason
  for (const entry of Object.values(p.abilities)) {
    total += LABEL_FRAMES + dur(entry.duration, STAT_ITEM_FALLBACK)
  }

  // Abilities → Virtues 전환
  total += dur(n.abilitiesToVirtuesDuration, f(2))

  // Inner Virtues (4개)
  for (const entry of Object.values(p.innerVirtues)) {
    total += LABEL_FRAMES + dur(entry.duration, STAT_ITEM_FALLBACK)
  }

  // Outer Virtues (4개)
  for (const entry of Object.values(p.outerVirtues)) {
    total += LABEL_FRAMES + dur(entry.duration, STAT_ITEM_FALLBACK)
  }

  // Virtues → Dispositions 전환
  total += dur(n.virtuesToDispositionsDuration, f(2))

  // Dispositions (4개)
  for (const entry of Object.values(p.dispositions)) {
    total += LABEL_FRAMES + dur(entry.duration, DISPOSITION_ITEM_FALLBACK)
  }

  // Rationale
  total += dur(p.rationaleDuration, RATIONALE_FALLBACK)

  // Persona → Influence 전환
  total += dur(n.personaToInfluenceDuration, f(2))

  // Influence axes (6개)
  for (const axis of Object.values(inf.axes)) {
    total += LABEL_FRAMES + dur(axis.duration, INFLUENCE_AXIS_FALLBACK)
  }

  // Transhistoricity + total score
  total += LABEL_FRAMES + dur(inf.transhistoricity.duration, TRANSHISTORICITY_FALLBACK)
  total += dur(n.totalScoreLineDuration, f(2))

  // Bridge
  total += dur(n.bridgeDuration, BRIDGE_FALLBACK)

  // Logo
  total += f(3)

  return total
}
