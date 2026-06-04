/**
 * 세력도(Faction) 타이밍 — 단일원천(SSoT)
 *
 * 무대사라 음성 길이에 매이지 않는다. 모든 컷이 고정 길이.
 * 영상 = 「컷(Cue)」의 시간순 나열. 빌더가 컷마다 시작 프레임·길이를 매긴다.
 */

import type { FactionScript } from './types'

export const FPS = 60

/** 초 → 프레임 */
export const f = (sec: number) => Math.round(sec * FPS)

/* ── 컷 길이 (초) ── */
/** 오프닝 타이틀 */
export const INTRO_SEC = 2.5
/** 세력 카드 1장 */
export const GROUP_SEC = 1.8
/** 인물 컷 1장 */
export const PERSON_SEC = 1.1
/** 엔딩 로고 */
export const OUTRO_SEC = 3.0
/** 컷 전환 크로스페이드 */
export const CROSSFADE_SEC = 0.3

/* ── 컷(Cue) 모델 ── */

export type Cue =
  | { kind: 'intro' }
  | { kind: 'group'; groupIndex: number }
  | { kind: 'person'; groupIndex: number; personIndex: number }
  | { kind: 'outro' }

export interface TimedCue {
  cue: Cue
  /** 시작 프레임 */
  start: number
  /** 길이(프레임) */
  duration: number
}

/** 스크립트 → 시간순 컷 배열. 각 컷에 start·duration을 부여한다. */
export function buildCues(script: FactionScript): TimedCue[] {
  const cues: TimedCue[] = []
  let cursor = 0
  const push = (cue: Cue, sec: number) => {
    cues.push({ cue, start: cursor, duration: f(sec) })
    cursor += f(sec)
  }

  push({ kind: 'intro' }, INTRO_SEC)
  script.groups.forEach((group, gi) => {
    push({ kind: 'group', groupIndex: gi }, GROUP_SEC)
    group.people.forEach((_, pi) => {
      push({ kind: 'person', groupIndex: gi, personIndex: pi }, PERSON_SEC)
    })
  })
  push({ kind: 'outro' }, OUTRO_SEC)

  return cues
}

/** 영상 총 프레임 수 */
export function calcTotalFrames(script: FactionScript): number {
  const cues = buildCues(script)
  const last = cues[cues.length - 1]
  return last ? last.start + last.duration : f(INTRO_SEC + OUTRO_SEC)
}
