/**
 * 세력도(Faction) 타이밍 — 단일원천(SSoT)
 *
 * 무대사라 음성 길이에 매이지 않는다. 모든 컷이 고정 길이.
 * 영상 = 「컷(Cue)」의 시간순 나열. 빌더가 컷마다 시작 프레임·길이를 매긴다.
 */

import type { FactionScript, FactionPerson } from './types'

export const FPS = 60

/** 초 → 프레임 */
export const f = (sec: number) => Math.round(sec * FPS)

/* ── 컷 길이 (초) ── */
/** 오프닝 타이틀 */
export const INTRO_SEC = 2.5
/** 세력 카드 1장 */
export const GROUP_SEC = 1.8
/** 화보 묶음 카드 1장 */
export const CLUSTER_SEC = 2.3
/** 엔딩 로고 */
export const OUTRO_SEC = 3.0
/** 컷 전환 크로스페이드 */
export const CROSSFADE_SEC = 0.3

/* ── 인물 컷 등장·길이 (텍스트 양에 따라 가변, 최소 보장) ── */
/** 글자당 프레임 — 대사를 통째로 띄운 뒤 읽을 시간(≈ 초당 17자, 통째로 보여 빠르게 훑힘) 산정에 쓴다 */
export const READ_FRAMES_PER_CHAR = 3.0

/* ── 인물 컷 등장 시퀀스(초) — 렌더러(PersonCard)와 공유 ──
 * 순서: 줌아웃 정지 → 박스+이름+직함(큰 글씨) 함께 슬라이드 인 → 직함이 글자 수 비례 시간 보인 뒤 완전히 사라짐 → 같은 자리에 대사 등장.
 * 직함과 대사는 이름 아래 같은 슬롯을 공유하며 순차 교체된다(겹치지 않음). 이름은 계속 떠 있다.
 */
/** 박스+이름+직함 함께 슬라이드 인+페이드인 시작(초) — 줌아웃(0~0.15초)이 끝나는 즉시. 직함도 이름과 같은 시점에 함께 뜬다 */
export const ENTER_NAME_SEC = 0.2
/** 각 단계 페이드인/아웃 길이(초) */
export const ENTER_FADE_SEC = 0.35

/* ── 직함 읽기 시간(직함 글자 수 비례) — 렌더(PersonCard)와 컷 길이 계산이 공유 ── */
/** 직함 글자당 프레임 — 대사 읽기 속도(4.2)보다 살짝 빠르게(직함은 짧고 단순) */
export const CREDIT_READ_FRAMES_PER_CHAR = 3.6
/** 직함 최소 노출 시간(초) — 짧은 직함(예 'CEO')도 너무 휙 사라지지 않게 */
export const CREDIT_READ_MIN_SEC = 0.8
/** 직함 최대 노출 시간(초) — 아주 긴 직함도 과하게 머물지 않게 상한 */
export const CREDIT_READ_MAX_SEC = 2.4
/** 대사를 다 띄운 뒤 읽고 머무는 최소 여유(초) */
export const PERSON_HOLD_SEC = 1.2

/** PersonCard와 동일한 직함(credit) 텍스트 산출 — lines 합침(가운뎃점), 없으면 epithet. resolve된 lines 기준 */
export function creditTextOf(p: FactionPerson): string {
  const lines = p.lines ?? []
  return lines.length ? lines.join(' · ') : (p.epithet ?? '')
}

/** 직함 글자 수 → 읽기 시간(초). 최소·최대 사이로 클램프. 직함이 없으면 0 */
export function creditReadSec(credit: string): number {
  if (!credit) return 0
  const raw = (credit.length * CREDIT_READ_FRAMES_PER_CHAR) / FPS
  return Math.min(CREDIT_READ_MAX_SEC, Math.max(CREDIT_READ_MIN_SEC, raw))
}

/** 직함 페이드아웃 시작 시점(초) = 직함 등장(이름과 동시 = ENTER_NAME_SEC) + 페이드인 + 직함 읽기 시간(글자 수 비례) */
export function personCreditOutSec(p: FactionPerson): number {
  return ENTER_NAME_SEC + ENTER_FADE_SEC + creditReadSec(creditTextOf(p))
}

/** 대사 등장 시점(초) = 직함 페이드아웃 완료 직후(순차, 안 겹침). 직함 길이에 따라 동적으로 앞뒤로 움직인다 */
export function personQuoteEnterSec(p: FactionPerson): number {
  return personCreditOutSec(p) + ENTER_FADE_SEC
}

/** 직함만 있고 대사가 없는 인물 — 직함이 안 사라지고 보이는 최소 컷 길이(초) */
export const PERSON_MIN_SEC = ENTER_NAME_SEC + ENTER_FADE_SEC + CREDIT_READ_MIN_SEC + 0.8

/**
 * 인물 한 명 컷 길이(초).
 * 직함이 (글자 수 비례로) 보였다가 완전히 사라진 뒤(순차) 대사가 등장하고, 대사는 글자 수 비례 읽기 시간을 확보한다.
 * 길이 = 직함 길이 기반 대사 등장 시점 + 페이드 + 대사 읽기 시간 + 여유. 렌더(PersonCard)와 같은 공식.
 * 대사가 없으면 직함이 계속 보이므로 최소 길이만 보장한다.
 */
export function personDurationSec(p: FactionPerson): number {
  // 렌더(PersonCard)와 같은 대사 소스 — 덩어리가 있으면 그걸 잇고, 없으면 통째 quote
  const quote = p.quoteChunks?.length ? p.quoteChunks.join('\n') : (p.quote ?? '')
  if (!quote) return PERSON_MIN_SEC
  const readSec = (quote.length * READ_FRAMES_PER_CHAR) / FPS
  const total = personQuoteEnterSec(p) + ENTER_FADE_SEC + readSec + PERSON_HOLD_SEC
  return Math.max(PERSON_MIN_SEC, total)
}

/* ── 컷(Cue) 모델 ── */

export type Cue =
  | { kind: 'intro' }
  | { kind: 'group'; groupIndex: number }
  | { kind: 'cluster'; groupIndex: number; clusterIndex: number }
  | { kind: 'person'; groupIndex: number; personIndex: number; clusterIndex?: number }
  | { kind: 'outro' }

export interface TimedCue {
  cue: Cue
  /** 시작 프레임 */
  start: number
  /** 길이(프레임) */
  duration: number
}

/** 스크립트 → 시간순 컷 배열. 각 컷에 start·duration을 부여한다. */
export function buildCues(script: FactionScript, portrait = false): TimedCue[] {
  const cues: TimedCue[] = []
  let cursor = 0
  const push = (cue: Cue, sec: number) => {
    cues.push({ cue, start: cursor, duration: f(sec) })
    cursor += f(sec)
  }

  push({ kind: 'intro' }, INTRO_SEC)
  script.groups.forEach((group, gi) => {
    // 비활성화 세력은 컷을 아예 만들지 않는다 — 타이틀·화보·인물 전부 스킵. 데이터는 보존된다.
    if (group.disabled) return
    // 세로 쇼츠는 롱폼 전용 세력을 건너뛴다(쇼츠 3분 제한 대응). 가로 롱폼에는 그대로 노출.
    if (portrait && group.longformOnly) return
    // 타이틀 카드(로고) — titleArt가 있는 세력만 진입 컷을 둔다. 없으면 화보(그룹샷)부터 시작.
    if (group.titleArt) push({ kind: 'group', groupIndex: gi }, GROUP_SEC)
    // solo(무소속 개인군)는 화보 없이 인물 컷만
    if (group.solo) {
      group.people.forEach((person, pi) => {
        push({ kind: 'person', groupIndex: gi, personIndex: pi }, personDurationSec(person))
      })
      return
    }
    const clusterCount = group.clusters?.length ?? 1
    for (let ci = 0; ci < clusterCount; ci++) {
      const people = group.clusters?.length ? group.clusters[ci].people : group.people
      // 화보 카드 — 묶음마다 진입(브릿지) 컷. 1명 묶음도 단독 화보로 진입한다.
      push({ kind: 'cluster', groupIndex: gi, clusterIndex: ci }, CLUSTER_SEC)
      people.forEach((person, pi) => {
        push({ kind: 'person', groupIndex: gi, personIndex: pi, clusterIndex: ci }, personDurationSec(person))
      })
    }
  })
  push({ kind: 'outro' }, OUTRO_SEC)

  return cues
}

/** 영상 총 프레임 수 */
export function calcTotalFrames(script: FactionScript, portrait = false): number {
  const cues = buildCues(script, portrait)
  const last = cues[cues.length - 1]
  return last ? last.start + last.duration : f(INTRO_SEC + OUTRO_SEC)
}
