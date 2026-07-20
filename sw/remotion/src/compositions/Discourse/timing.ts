/**
 * 가상 담화(Discourse) 타이밍 — 컷 구성·길이 산식의 단일원천(SSoT).
 *
 * 렌더(Discourse.tsx)·자막(subs.ts)·BO 미리보기가 모두 buildCues 를 공유한다.
 * 팩션은 인물 컷이 1.1초 고정이지만, 담화는 발언 길이가 곧 컷 길이다(음성 있으면 그 길이, 없으면 추정).
 */

import type { DiscourseScript, Turn } from './types'

/** 초당 프레임 — 팩션·북리커맨드와 동일 */
export const FPS = 60
/** 초 → 프레임 */
export const f = (sec: number) => Math.round(sec * FPS)

/* ── 컷 길이 (초) ── */
/** 인트로(논제 + 고지) — 고지를 읽을 시간이 필요해 팩션(2.5)보다 길다 */
export const INTRO_SEC = 4.5
/** 인트로 끝 페이드아웃 */
export const INTRO_FADE_OUT_SEC = 0.6
/** 인물 소개 컷 1명 — 수식어 음원이 있으면 그 길이를 쓴다 */
export const CAST_SEC = 2.8
/** 장 표지(논제 매듭) 카드 */
export const ERA_SEC = 2.2
/** 아웃트로 */
export const OUTRO_SEC = 3.0
/** 컷 크로스페이드 */
export const CROSSFADE_SEC = 0.3
/** 아웃트로 진입 크로스페이드 */
export const OUTRO_CROSSFADE_SEC = 0.8
/** 마지막 발언이 끝난 뒤 화면을 유지하는 시간 — 여운 */
export const END_HOLD_SEC = 2.5
/** 종료 화면 유지 */
export const OUTRO_HOLD_SEC = 2.5
/** 종료 검정 페이드아웃 */
export const END_FADE_SEC = 3

/**
 * 음성이 없을 때 발언 길이를 추정하는 발화 속도 (자/초).
 * 프로젝트 표준 6.5 를 따른다(북리커맨드 발화속도 통일 목표값과 동일).
 */
export const CPS = 6.5
/** 발언 앞뒤 여백 — 자막이 뜨고 읽히기 시작하는 틈, 끝나고 넘어가기 전 숨 */
export const TURN_PAD_SEC = 0.55
/** 발언 최소 길이 — 아주 짧은 반박도 읽을 시간은 준다 */
export const TURN_MIN_SEC = 1.6

/** 발언 컷 종류 */
export type DiscourseCue =
  | { kind: 'intro' }
  | { kind: 'cast'; castIndex: number }
  | { kind: 'turn'; turnIndex: number }
  | { kind: 'era'; label: string }
  | { kind: 'outro' }

export interface TimedCue {
  cue: DiscourseCue
  /** 시작 프레임 */
  start: number
  /** 길이(프레임) */
  duration: number
}

/** 발언 본문 — chunks 가 있으면 이어붙인 것, 없으면 text */
export function turnText(t: Turn): string {
  return t.chunks?.length ? t.chunks.join(' ') : t.text
}

/**
 * 발언 한 개의 길이(초).
 * 음성이 있으면 그 길이(배속 반영)에 앞뒤 여백을 더한다. 없으면 글자 수로 추정한다.
 * 추정값은 음성 생성 전 편집·미리보기용이며, 음원이 생기면 duration 이 기록돼 그쪽이 쓰인다.
 */
export function turnSec(t: Turn): number {
  if (t.duration != null && t.duration > 0) {
    const rate = Math.min(2, Math.max(0.5, t.playbackRate ?? 1))
    return t.duration / rate + TURN_PAD_SEC
  }
  const chars = turnText(t).replace(/\s/g, '').length
  return Math.max(TURN_MIN_SEC, chars / CPS + TURN_PAD_SEC)
}

/** 인물 소개 컷 길이(초) — 수식어 음원이 있으면 그 길이, 없으면 기본값 */
export function castSec(epithetDuration?: number): number {
  if (epithetDuration != null && epithetDuration > 0) return epithetDuration + TURN_PAD_SEC
  return CAST_SEC
}

/**
 * 이 발언이 이 쇼츠 편에 나오는가.
 *
 * **팩션과 반대다.** 팩션은 세력 단위라 part 미지정 = 모든 편 공통이지만,
 * 담화 쇼츠는 긴 담화에서 **한 합만 발췌**하는 것이라 part 를 명시한 발언만 실어야 한다.
 * 미지정 발언까지 끌려오면 롱폼이 통째로 쇼츠가 돼 버린다.
 *
 * 단, 편 배정이 아예 없는 에피소드(짧은 담화 한 편)는 전체가 그대로 쇼츠다.
 *
 * @param hasParts 이 에피소드에 part 를 배정한 발언이 하나라도 있는가
 */
export function turnInPart(t: Turn, part?: number, hasParts?: boolean): boolean {
  if (t.disabled) return false
  if (part == null) return true // 롱폼 — 편 구분 없음
  if (!hasParts) return true // 편 배정이 없는 에피소드 = 전체가 쇼츠
  return t.part === part
}

/** 편 경계(cut)로 가른 롱폼 편 번호 목록. 경계가 없으면 [] (통짜 한 편) */
export function longformPartNumbers(layout?: DiscourseScript['longformLayout']): number[] {
  const cuts = (layout ?? []).filter(it => 'cut' in it).length
  if (cuts === 0) return []
  return Array.from({ length: cuts + 1 }, (_, i) => i + 1)
}

/** 쇼츠 편 번호 목록 — 발언에 실제로 배정된 part 만. 없으면 [1] (단일편) */
export function shortsPartNumbers(script: DiscourseScript): number[] {
  const set = new Set<number>()
  for (const t of script.turns) if (!t.disabled && t.part != null) set.add(t.part)
  return set.size ? [...set].sort((a, b) => a - b) : [1]
}

/** 종료 페이드 길이(프레임) — 마지막 화면 안에서 끝나도록 클램프 */
export function endFadeSecOf(script: DiscourseScript): number {
  const fade = script.endFadeSec ?? END_FADE_SEC
  const lastHold = script.outroImage || !script.turns.length
    ? (script.outroHoldSec ?? OUTRO_HOLD_SEC)
    : (script.endHoldSec ?? END_HOLD_SEC)
  return Math.min(fade, Math.max(0.5, lastHold))
}

/**
 * 이 편에 나오는 발언 인덱스 목록.
 * 쇼츠는 part 필터, 롱폼은 편 경계(cut)로 구간을 자른다.
 * longformLayout 의 { turn: n } 은 "앞선 발언 n개까지"를 뜻하는 경계 기준점이다.
 */
export function turnIndexesOf(script: DiscourseScript, isShorts: boolean, part?: number, lvPart?: number): number[] {
  const all = script.turns.map((t, i) => ({ t, i })).filter(({ t }) => !t.disabled && !script.cast[t.cast]?.disabled)
  if (isShorts) {
    const hasParts = script.turns.some(t => !t.disabled && t.part != null)
    return all.filter(({ t }) => turnInPart(t, part, hasParts)).map(({ i }) => i)
  }
  // 롱폼: 편 경계가 없으면 전체
  const layout = script.longformLayout
  if (!layout?.length || lvPart == null) return all.map(({ i }) => i)
  // 경계로 구간을 나눈다 — { turn: n } 이 각 구간의 끝 지점
  const bounds: number[] = []
  let cursor = 0
  for (const it of layout) {
    if ('turn' in it) cursor = it.turn
    else if ('cut' in it) bounds.push(cursor)
  }
  const from = lvPart === 1 ? 0 : bounds[lvPart - 2] ?? 0
  const to = bounds[lvPart - 1] ?? script.turns.length
  return all.filter(({ i }) => i >= from && i < to).map(({ i }) => i)
}

/**
 * 컷 목록 — 이 함수가 영상 구성의 단일원천이다.
 * 흐름: 인트로 → (인물 소개 컷들) → 발언 턴들 → 아웃트로
 */
export function buildCues(script: DiscourseScript, isShorts: boolean, part?: number, lvPart?: number): TimedCue[] {
  const out: TimedCue[] = []
  let cursor = 0
  const push = (cue: DiscourseCue, sec: number) => {
    const duration = f(sec)
    out.push({ cue, start: cursor, duration })
    // 컷은 크로스페이드만큼 겹친다 — 다음 컷이 이전 컷 끝보다 조금 일찍 시작
    cursor += duration - f(CROSSFADE_SEC)
  }

  push({ kind: 'intro' }, script.introSec ?? INTRO_SEC)

  const turnIdxs = turnIndexesOf(script, isShorts, part, lvPart)

  // 인물 소개 — 이 편에 실제로 말하는 인물만. 발언 순서대로 처음 등장하는 차례
  if (script.showCastIntro !== false) {
    const seen = new Set<number>()
    for (const i of turnIdxs) {
      const ci = script.turns[i].cast
      if (seen.has(ci)) continue
      seen.add(ci)
      const sp = script.cast[ci]
      if (!sp || sp.disabled) continue
      push({ kind: 'cast', castIndex: ci }, castSec(sp.epithetDuration))
    }
  }

  // 발언 — 장 표지(era)는 롱폼 배치에 꽂힌 자리에서 끼운다
  const eraAt = new Map<number, string>()
  // 마지막 발언 뒤에 오는 장 표지 = 논제 매듭. 발언 범위를 벗어난 자리에 꽂힌 것이 여기 해당한다.
  const tailEras: string[] = []
  if (!isShorts && script.longformLayout?.length) {
    let cursorTurn = 0
    for (const it of script.longformLayout) {
      if ('turn' in it) cursorTurn = it.turn
      else if ('era' in it) {
        if (cursorTurn >= script.turns.length) tailEras.push(it.era.label)
        else eraAt.set(cursorTurn, it.era.label)
      }
    }
  }
  for (const i of turnIdxs) {
    const era = eraAt.get(i)
    if (era) push({ kind: 'era', label: era }, ERA_SEC)
    push({ kind: 'turn', turnIndex: i }, turnSec(script.turns[i]))
  }

  // 마지막 발언 뒤 여운 — 마지막 컷 길이를 늘려 화면을 붙든다
  const last = out[out.length - 1]
  if (last && last.cue.kind === 'turn') {
    const hold = f(script.endHoldSec ?? END_HOLD_SEC)
    last.duration += hold
    cursor += hold
  }

  // 매듭 카드 — 여운이 끝난 뒤, 아웃트로 앞. 담화가 무엇으로 끝났는지 말이 아니라 사실로 남긴다.
  for (const label of tailEras) push({ kind: 'era', label }, ERA_SEC)

  push({ kind: 'outro' }, script.outroHoldSec ?? OUTRO_HOLD_SEC)

  return out
}

/** 이 편의 총 길이(프레임) — Root.tsx 등록 시점에 동기 호출한다(팩션과 동일 관례) */
export function calcTotalFrames(script: DiscourseScript, isShorts: boolean, part?: number, lvPart?: number): number {
  const cues = buildCues(script, isShorts, part, lvPart)
  const last = cues[cues.length - 1]
  return last ? last.start + last.duration : f(INTRO_SEC)
}
