/**
 * 세력도(Faction) 타이밍 — 단일원천(SSoT)
 *
 * 영상 = 「컷(Cue)」의 시간순 나열. 빌더가 컷마다 시작 프레임·길이를 매긴다.
 * 음원은 쓰지 않는다 — 인물 컷 길이는 직함 읽기 시간 + 대사 글자 수 읽기 시간으로 잡는다.
 */

import type { FactionScript, FactionPerson } from './types'
import { clampRate, vnPersonQuote } from './voice-names'

export const FPS = 60

/** 초 → 프레임 */
export const f = (sec: number) => Math.round(sec * FPS)

/* ── 컷 길이 (초) ── */
/** 오프닝 타이틀 */
export const INTRO_SEC = 2.5
/** 세력 카드 1장 — 페이드인(0.8s) 동안 또렷한 시간을 까먹지 않게 넉넉히 잡는다 */
export const GROUP_SEC = 2.8
/** 화보 묶음 카드 1장 — 4명 이상 기준 길이 (묶음 화면 +1s) */
export const CLUSTER_SEC = 3.3

/**
 * 그룹샷(화보 묶음) 카드 길이(초) — 등장 인물 수(disabled 제외)에 따라 가변.
 * 인원이 많으면 훑을 게 많아 길게, 적으면 짧게 넘긴다.
 * - 4명 이상: CLUSTER_SEC(3.3)
 * - 3명: -0.3 (3.0)
 * - 2명: -1.1 (2.2, 적은 인원은 빨리 넘김)
 * - 1명: -1.3 (2.0)
 */
export function clusterDurationSec(personCount: number): number {
  const base =
    personCount >= 4 ? CLUSTER_SEC
    : personCount === 3 ? CLUSTER_SEC - 0.3
    : personCount === 2 ? CLUSTER_SEC - 1.1
    : CLUSTER_SEC - 1.3
  // 그룹샷(화보) 카드 시간 20% 축소
  return base * 0.8
}
/** 마지막 인물 컷 뒤 페이드아웃 여운(초) — 별도 엔딩 카드 없이 마지막 인물 위로 검정이 서서히 덮인다. 비-인물 컷으로 끝날 때의 폴백 */
export const ENDING_FADE_SEC = 1.6
/** 대사 후 대기 기본값 — 마지막 인물 대사 끝 ~ 다음 전환까지 그 인물 화면을 정지한 채 유지하는 시간(초). script.endHoldSec 미지정 시 */
export const DEFAULT_END_HOLD_SEC = 4
/** 마지막 화면(종료 화면) 대기 기본값(초). script.outroHoldSec 미지정 시. 시작 화면과 같은 길이로 둔다 */
export const DEFAULT_OUTRO_HOLD_SEC = INTRO_SEC
/** 종료 페이드아웃 기본 길이(초). script.endFadeSec 미지정 시 */
export const DEFAULT_END_FADE_SEC = 3
/** 컷 전환 크로스페이드 */
export const CROSSFADE_SEC = 0.3
/** 마지막 인물 컷 → 최종화면 전환 크로스페이드 — 마무리는 더 완만하게 떠오른다 */
export const OUTRO_CROSSFADE_SEC = 0.8

/* ── 인물 컷 등장·길이 (텍스트 양에 따라 가변, 최소 보장) ── */
/** 글자당 프레임 — 대사를 통째로 띄운 뒤 읽을 시간(≈ 초당 17자, 통째로 보여 빠르게 훑힘) 산정에 쓴다 */
export const READ_FRAMES_PER_CHAR = 3.0

/* ── 인물 컷 등장 시퀀스(초) — 렌더러(PersonCard)와 공유 ──
 * 순서: 줌아웃 정지 → 박스+이름+직함(2행) 함께 슬라이드 인 → 직함이 글자 수 비례 시간 보인 뒤 완전히 사라짐 → 같은 자리에 대사 등장.
 * 직함과 대사는 이름 아래 같은 슬롯을 공유하며 순차 교체된다(겹치지 않음). 이름은 계속 떠 있다.
 */
/** 박스+이름+직함 함께 슬라이드 인+페이드인 시작(초) — 줌아웃(0~0.15초)이 끝나는 즉시. 직함도 이름과 같은 시점에 함께 뜬다 */
export const ENTER_NAME_SEC = 0.2
/** 각 단계 페이드인/아웃 길이(초) */
export const ENTER_FADE_SEC = 0.35

/* ── 직함 읽기 시간(직함 글자 수 비례) — 렌더(PersonCard)와 컷 길이 계산이 공유 ── */
/** 직함 글자당 프레임 — 리스트는 통으로 훑는 라벨이라 빠르게 넘긴다 */
export const CREDIT_READ_FRAMES_PER_CHAR = 2.5
/** 직함 최소 노출 시간(초) — 짧은 직함(예 'CEO')도 너무 휙 사라지지 않게 */
export const CREDIT_READ_MIN_SEC = 1.1
/** 직함 최대 노출 시간(초) — 리스트가 길어도 과하게 머물지 않게 상한 */
export const CREDIT_READ_MAX_SEC = 1.9
/** 대사를 다 띄운 뒤 읽고 머무는 최소 여유(초) */
export const PERSON_HOLD_SEC = 1.2
/** 직함 줄 최대 개수 — 너무 많으면 화면·시간 과다 */
export const CREDIT_MAX_LINES = 3
/** 직함 줄 하나가 밑에서 떠오르는 순차 등장 간격(초) — 다음 줄이 이만큼 늦게 뜬다 */
export const CREDIT_LINE_STAGGER_SEC = 0.42

/* ── 수식어 낭독 시간 — 나레이터가 수식어 한 문장을 읽는 시간. 음원(epithetDuration)이 있으면 그 길이, 없으면 글자 수 추정 ── */
/** 수식어 낭독 추정 글자당 프레임(음원 없을 때 = 타이핑). 4.0 → 4.8 로 타이핑 20% 느리게 */
export const EPITHET_READ_FRAMES_PER_CHAR = 4.8
/** 수식어 낭독 추정 최소 시간(초) — 타이핑 20% 반영 */
export const EPITHET_READ_MIN_SEC = 1.44
/** 수식어 낭독 추정 최대 시간(초) — 타이핑 20% 반영 */
export const EPITHET_READ_MAX_SEC = 5.4
/** 수식어 낭독 후 대사로 넘어가기 전 정지 시간(초) */
export const EPITHET_HOLD_SEC = 0.6

/** PersonCard와 동일한 직함 줄 목록(최대 CREDIT_MAX_LINES). lines 기준 */
export function creditLinesOf(p: FactionPerson): string[] {
  const lines = (p.lines ?? []).filter(Boolean)
  return lines.slice(0, CREDIT_MAX_LINES)
}

/**
 * 수식어 표시 방식 — 낭독(나레이터 음성)인가, 타이핑(소리+글자만, 무음)인가.
 * - epithetNarrate 가 명시되면 그대로(true=낭독·false=타이핑).
 * - 미지정이면 기존 동작: 낭독 음원(epithetDuration)이 있으면 낭독, 없으면 타이핑.
 */
export function epithetIsNarrated(p: FactionPerson): boolean {
  if (p.epithetNarrate !== undefined) return p.epithetNarrate
  return !!(p.epithetDuration && p.epithetDuration > 0)
}

/**
 * 수식어 노출 시간(초). 낭독이고 음원이 있으면 그 길이(배속 반영), 그 외(타이핑·음원 없음)는 글자 수 추정.
 * 수식어가 없으면 0.
 */
export function epithetSpeakSec(p: FactionPerson): number {
  if (!p.epithet) return 0
  if (epithetIsNarrated(p) && p.epithetDuration && p.epithetDuration > 0) return p.epithetDuration / clampRate(p.epithetPlaybackRate)
  const raw = (p.epithet.length * EPITHET_READ_FRAMES_PER_CHAR) / FPS
  return Math.min(EPITHET_READ_MAX_SEC, Math.max(EPITHET_READ_MIN_SEC, raw))
}

/** PersonCard와 동일한 직함(credit) 텍스트 산출 — 읽기 시간 계산용(줄 합침) */
export function creditTextOf(p: FactionPerson): string {
  return creditLinesOf(p).join(' · ')
}

/** 직함 글자 수 → 읽기 시간(초). 최소·최대 사이로 클램프. 직함이 없으면 0 */
export function creditReadSec(credit: string): number {
  if (!credit) return 0
  const raw = (credit.length * CREDIT_READ_FRAMES_PER_CHAR) / FPS
  return Math.min(CREDIT_READ_MAX_SEC, Math.max(CREDIT_READ_MIN_SEC, raw))
}

/** 직함이 한 줄씩 다 떠오르는 데 걸리는 시간(초) — ENTER_NAME_SEC 기준 0. 줄 수 비례 */
export function creditAppearSec(p: FactionPerson): number {
  const n = creditLinesOf(p).length
  return n > 0 ? (n - 1) * CREDIT_LINE_STAGGER_SEC + ENTER_FADE_SEC : 0
}

/** 직함만 있고 대사가 없는 인물 — 직함이 안 사라지고 보이는 최소 컷 길이(초) */
export const PERSON_MIN_SEC = ENTER_NAME_SEC + ENTER_FADE_SEC + CREDIT_READ_MIN_SEC + 0.8

export type QuoteMode = 'voice' | 'text' | 'credit' | 'full'

/** 대사 처리 스텝(신모델) — 직함·수식어·음성 3개 독립 토글 */
export interface PersonSteps {
  /** 직함 2·3번 줄 리드 */
  credit: boolean
  /** 수식어 타이핑 리드(세로 롱폼 전용) */
  epithet: boolean
  /** 대사 표시 + 음원 재생 */
  voice: boolean
}

/**
 * 인물의 대사 처리 스텝 판정.
 * - 신모델: step* 불린이 하나라도 정의돼 있으면 그대로 사용.
 * - 레거시: quoteMode(미지정이면 수장=voice·나머지=text·무대사=credit)에서 환산.
 */
export function personSteps(p: FactionPerson, isLeader: boolean): PersonSteps {
  if (p.stepVoice !== undefined || p.stepCredit !== undefined || p.stepEpithet !== undefined) {
    return { credit: !!p.stepCredit, epithet: !!p.stepEpithet, voice: !!p.stepVoice }
  }
  const hasQuote = !!(p.quoteChunks?.length || p.quote)
  const mode: QuoteMode = p.quoteMode ?? (hasQuote ? (isLeader ? 'voice' : 'text') : 'credit')
  switch (mode) {
    case 'credit': return { credit: true, epithet: false, voice: false }
    case 'full': return { credit: true, epithet: false, voice: true }
    // voice·text — 대사 표시(음원 있으면 재생). 수식어는 텍스트가 있으면 보여준다(기존 자동 동작 보존).
    default: return { credit: false, epithet: !!p.epithet, voice: hasQuote }
  }
}

/** 인물 컷 시퀀스 시각(초, 컷 로컬) — 직함 리드 → 수식어 리드 → 대사. 렌더(PersonCard)와 길이 계산이 공유하는 SSoT */
export interface LeadTiming {
  /** 직함 2·3줄 리드가 켜졌는가 */
  creditOn: boolean
  /** 수식어 리드가 켜졌는가 */
  epiOn: boolean
  /** 직함 리드 종료 시점(다음으로 교차 시작) */
  creditEndSec: number
  /** 수식어 타이핑 시작 시점 */
  epithetStartSec: number
  /** 수식어 리드 종료 시점 */
  epithetEndSec: number
  /** 대사 등장 시점 */
  quoteEnterSec: number
}

export function personLeadTiming(p: FactionPerson, steps: PersonSteps, shorts = false): LeadTiming {
  const creditRestN = Math.max(0, creditLinesOf(p).length - 1) // 직함 2·3번 줄
  const creditOn = steps.credit && creditRestN > 0
  // 수식어 리드는 세로 롱폼(LV) 전용 — 쇼츠(S)에서는 띄우지 않는다.
  const epiOn = !shorts && steps.epithet && !!p.epithet

  // 직함 리드 — 이름 등장(ENTER_NAME) 직후 2·3줄 순차 노출 + 읽기
  const creditEndSec = creditOn
    ? ENTER_NAME_SEC + creditAppearSec(p) + creditReadSec(creditTextOf(p))
    : ENTER_NAME_SEC
  // 수식어 리드 — 직함 리드(있으면) 뒤를 이어 등장. 나레이터 낭독 시간 + 낭독 후 정지(HOLD)
  const epithetStartSec = (creditOn ? creditEndSec : ENTER_NAME_SEC) + CREDIT_LINE_STAGGER_SEC
  const epithetEndSec = epiOn
    ? epithetStartSec + epithetSpeakSec(p) + EPITHET_HOLD_SEC
    : epithetStartSec
  // 대사 등장 — 마지막 리드(수식어→직함→없음) 종료 시점. 리드가 없으면 등장 페이드 직후.
  const quoteEnterSec = epiOn ? epithetEndSec : (creditOn ? creditEndSec : ENTER_NAME_SEC + ENTER_FADE_SEC)
  return { creditOn, epiOn, creditEndSec, epithetStartSec, epithetEndSec, quoteEnterSec }
}

/** 대사 등장 시점(초) — 켜진 리드 스텝을 다 보여준 뒤. */
export function personQuoteEnterSec(p: FactionPerson, steps: PersonSteps, shorts = false): number {
  return personLeadTiming(p, steps, shorts).quoteEnterSec
}

/**
 * voice 인물의 음성 실제 재생 시간(초) — quoteDuration을 배속(clampRate)으로 나눈 값.
 * Audio 시퀀스 길이·컷 길이·검증이 모두 이 한 함수를 공유한다(SSoT). 음성이 없으면 0.
 */
export function personAudioPlaySec(p: FactionPerson): number {
  if (!p.quoteDuration || p.quoteDuration <= 0) return 0
  return p.quoteDuration / clampRate(p.quotePlaybackRate)
}

/**
 * 인물 한 명 컷 길이(초). 처리 단계(mode)에 따라:
 * - voice: 음성 길이(quoteDuration)에 맞춤(있으면), 없으면 글자 수 읽기.
 * - text: 글자 수 읽기 시간.
 * - credit: 직함만 보고 짧게 넘어감.
 * - full(통합): 직함 다 보여준 뒤 대사 — 직함 노출 시간(personQuoteEnterSec)에 음성/읽기 시간을 더한다.
 */
export function personDurationSec(p: FactionPerson, steps: PersonSteps, shorts = false): number {
  const quoteText = p.quoteChunks?.length ? p.quoteChunks.join('\n') : (p.quote ?? '')
  const lead = personLeadTiming(p, steps, shorts)
  const showQuote = steps.voice && !!quoteText
  if (!showQuote) {
    // 대사 없음 — 켜진 리드 스텝(수식어→직함→없으면 직함 최소) 종료까지 + 여유
    const endSec = lead.epiOn ? lead.epithetEndSec
      : lead.creditOn ? lead.creditEndSec
      : ENTER_NAME_SEC + creditAppearSec(p) + creditReadSec(creditTextOf(p))
    return Math.max(PERSON_MIN_SEC, endSec + 0.6)
  }
  const enter = lead.quoteEnterSec
  if (p.quoteDuration && p.quoteDuration > 0) {
    return Math.max(PERSON_MIN_SEC, enter + ENTER_FADE_SEC + personAudioPlaySec(p) + PERSON_HOLD_SEC)
  }
  const readSec = (quoteText.length * READ_FRAMES_PER_CHAR) / FPS
  return Math.max(PERSON_MIN_SEC, enter + ENTER_FADE_SEC + readSec + PERSON_HOLD_SEC)
}

/**
 * 인물 컷에서 대사(또는 직함)가 화면에서 다 끝나는 시점(초, 컷 로컬). PERSON_HOLD_SEC 여유 직전.
 * 마지막 컷의 종료 꼬리(endHold)·줌인 정지 시점 계산에 쓴다.
 */
export function personQuoteEndSec(p: FactionPerson, steps: PersonSteps, shorts = false): number {
  const quoteText = p.quoteChunks?.length ? p.quoteChunks.join('\n') : (p.quote ?? '')
  const lead = personLeadTiming(p, steps, shorts)
  const showQuote = steps.voice && !!quoteText
  if (!showQuote) {
    return lead.epiOn ? lead.epithetEndSec
      : lead.creditOn ? lead.creditEndSec
      : ENTER_NAME_SEC + creditAppearSec(p) + creditReadSec(creditTextOf(p))
  }
  const enter = lead.quoteEnterSec
  if (p.quoteDuration && p.quoteDuration > 0) {
    return enter + ENTER_FADE_SEC + personAudioPlaySec(p)
  }
  const readSec = (quoteText.length * READ_FRAMES_PER_CHAR) / FPS
  return enter + ENTER_FADE_SEC + readSec
}

/** 대사 후 대기(마지막 인물 대사 끝 ~ 전환) 길이(초) — script.endHoldSec, 미지정 시 기본값. 음수 방지 */
export function endHoldSecOf(script: FactionScript): number {
  return Math.max(0, script.endHoldSec ?? DEFAULT_END_HOLD_SEC)
}

/** 마지막 화면(종료 화면) 대기 길이(초) — script.outroHoldSec, 미지정 시 기본값. 음수 방지 */
export function outroHoldSecOf(script: FactionScript): number {
  return Math.max(0, script.outroHoldSec ?? DEFAULT_OUTRO_HOLD_SEC)
}

/**
 * 종료 페이드아웃 길이(초) — script.endFadeSec, 미지정 시 기본값.
 * 페이드는 마지막에 보이는 화면 안에서 끝나야 한다 — 종료 화면을 쓰면 그 대기(outroHold), 아니면 마지막 인물 대기(endHold)를 넘지 못한다.
 */
export function endFadeSecOf(script: FactionScript): number {
  const fade = Math.max(0, script.endFadeSec ?? DEFAULT_END_FADE_SEC)
  // 마지막에 보이는 화면은 항상 브랜드 엔딩 — 그 대기(outroHold) 안에서 페이드가 끝나야 한다.
  const lastHold = outroHoldSecOf(script)
  return Math.min(fade, lastHold)
}

/* ── 컷(Cue) 모델 ── */

export type Cue =
  | { kind: 'intro' }
  | { kind: 'group'; groupIndex: number }
  | { kind: 'cluster'; groupIndex: number; clusterIndex: number }
  | { kind: 'person'; groupIndex: number; personIndex: number; clusterIndex?: number; steps: PersonSteps }
  | { kind: 'outro' }

export interface TimedCue {
  cue: Cue
  /** 시작 프레임 */
  start: number
  /** 길이(프레임) */
  duration: number
}

/**
 * 스크립트 → 시간순 컷 배열. 각 컷에 start·duration을 부여한다.
 * part가 지정되면(쇼츠 편 분할) 그 part 세력만 포함한다. 미지정이면 전체.
 */
export function buildCues(script: FactionScript, portrait = false, part?: number): TimedCue[] {
  const cues: TimedCue[] = []
  let cursor = 0
  const push = (cue: Cue, sec: number) => {
    cues.push({ cue, start: cursor, duration: f(sec) })
    cursor += f(sec)
  }

  push({ kind: 'intro' }, script.introSec ?? INTRO_SEC)
  script.groups.forEach((group, gi) => {
    // 비활성화 세력은 컷을 아예 만들지 않는다 — 타이틀·화보·인물 전부 스킵. 데이터는 보존된다.
    if (group.disabled) return
    // 세로 쇼츠는 롱폼 전용 세력을 건너뛴다(쇼츠 3분 제한 대응). 가로 롱폼에는 그대로 노출.
    if (portrait && group.longformOnly) return
    // 쇼츠 편 분할 — part 지정 시 다른 편 세력은 제외(세력 part 미지정이면 모든 편에 노출)
    if (part != null && group.part != null && group.part !== part) return
    // 타이틀 카드(로고) — titleArt가 있는 세력만 진입 컷을 둔다. 없으면 화보(그룹샷)부터 시작.
    if (group.titleArt) push({ kind: 'group', groupIndex: gi }, GROUP_SEC)
    // 세력별 수장(첫 등장 인물) 자동 voice 판정용. 그룹 단위로 추적.
    let leaderAssigned = false
    // solo(무소속 개인군)는 화보 없이 인물 컷만
    if (group.solo) {
      ;(group.people ?? []).forEach((person, pi) => {
        if (person.disabled) return
        const isLeader = !leaderAssigned; leaderAssigned = true
        const steps = personSteps(person, isLeader)
        push({ kind: 'person', groupIndex: gi, personIndex: pi, steps }, personDurationSec(person, steps, portrait))
      })
      return
    }
    const clusterCount = group.clusters?.length ?? 1
    for (let ci = 0; ci < clusterCount; ci++) {
      const cluster = group.clusters?.length ? group.clusters[ci] : undefined
      // 세로 쇼츠는 롱폼 전용 묶음을 건너뛴다(쇼츠 길이 대응). 가로 롱폼에는 그대로 노출.
      if (portrait && cluster?.longformOnly) continue
      const people = cluster ? cluster.people : group.people
      // 화보 카드 — 묶음마다 진입(브릿지) 컷. 1명 묶음도 단독 화보로 진입한다.
      // 등장 인물 수(disabled 제외)에 따라 길이를 줄인다 — 인원이 적으면 짧게.
      const shotCount = (people ?? []).filter((p) => !p.disabled).length
      // 노출 인물 1명 + 단체 화보(cluster.image) 없음 → 화보(브릿지) 카드를 생략한다.
      // 로고(titleArt)로 진입해 바로 인물 컷으로 넘어간다. 소제목(label)은 로고 카드가 흡수(GroupCard).
      if (!(shotCount === 1 && !cluster?.image)) {
        push({ kind: 'cluster', groupIndex: gi, clusterIndex: ci }, clusterDurationSec(shotCount))
      }
      ;(people ?? []).forEach((person, pi) => {
        if (person.disabled) return
        const isLeader = !leaderAssigned; leaderAssigned = true
        const steps = personSteps(person, isLeader)
        push({ kind: 'person', groupIndex: gi, personIndex: pi, clusterIndex: ci, steps }, personDurationSec(person, steps, portrait))
      })
    }
  })
  // 엔딩 카드는 두지 않는다. 마지막 인물 컷은 대사 끝부터 종료 꼬리(endHold)만큼 화면을 정지한 채 유지하고,
  // 그 인물이 남은 채 검정으로 서서히 잠기며(꼬리 마지막 endFade) 영상이 끝난다.
  const lastCue = cues[cues.length - 1]
  if (lastCue) {
    const holdF = f(endHoldSecOf(script))
    if (lastCue.cue.kind === 'person') {
      const c = lastCue.cue
      const g = script.groups[c.groupIndex]
      const clusterPeople = c.clusterIndex != null ? g.clusters?.[c.clusterIndex]?.people ?? [] : []
      const groupPeople = g.people ?? []
      const person = c.clusterIndex != null
        ? clusterPeople[c.personIndex] ?? groupPeople[c.personIndex]
        : groupPeople[c.personIndex]
      // 대사 끝 시점 + 종료 꼬리. (person 못 찾는 예외 시엔 기존 길이에 꼬리만 덧댄다)
      lastCue.duration = person ? f(personQuoteEndSec(person, c.steps, portrait)) + holdF : lastCue.duration + holdF
    } else {
      // 인물 아닌 컷으로 끝나면(드묾) 기존처럼 꼬리만 덧댄다
      lastCue.duration += holdF
    }
  }

  // 브랜드 엔딩 — 모든 에피소드 마지막에 FEEL & NOTE 화면을 둔다(시리즈 통일).
  // 마지막 인물 컷(대사 후 대기 포함) 뒤에 붙여 마지막 화면 대기(outroHold)만큼 유지한다.
  {
    const tail = cues[cues.length - 1]
    const startF = tail ? tail.start + tail.duration : cursor
    cues.push({ cue: { kind: 'outro' }, start: startF, duration: f(outroHoldSecOf(script)) })
  }

  return cues
}

/** 영상 총 프레임 수 */
export function calcTotalFrames(script: FactionScript, portrait = false, part?: number): number {
  const cues = buildCues(script, portrait, part)
  const last = cues[cues.length - 1]
  return last ? last.start + last.duration : f(INTRO_SEC + ENDING_FADE_SEC)
}

/* ── 타이밍 검증(디버깅) ── */

/** voice 인물 컷 1건의 음성·컷 정합성 진단 결과 */
export interface PersonAudioCheck {
  name: string
  file: string
  /** 컷 길이(초) */
  cutSec: number
  /** data 의 quoteDuration(초). 없으면 null */
  quoteDuration: number | null
  /** 배속(1=등속) */
  rate: number
  /** 음성 재생 시간(초) = quoteDuration / 배속 */
  audioPlaySec: number
  /** 컷 안에서 음성이 시작하는 시점(초) */
  audioStartSec: number
  /** 컷 안에서 음성이 끝나는 시점(초) */
  audioEndSec: number
  /** 음성 끝 ~ 컷 끝 여유(초). 음수면 컷이 음성을 못 담아 끝이 잘린다 */
  tailRoomSec: number
}

/** 영상 1개(롱폼/쇼츠 part)의 타이밍 산식 요약 — 검증·디버깅용 SSoT */
export interface TimingReport {
  /** 총 길이(초) */
  totalSec: number
  /** 총 길이(프레임) */
  totalFrames: number
  /** 컷 개수 */
  cueCount: number
  /** voice 인물 컷별 음성·컷 정합성 */
  voiceChecks: PersonAudioCheck[]
}

/**
 * buildCues 와 동일 산식으로 영상 타이밍을 분석한다.
 * 각 voice 인물 컷에 대해 음성이 컷 안에 온전히 들어가는지(tailRoom)를 계산한다.
 * wav 실측과의 대조는 호출 측(CLI)에서 quoteDuration 과 비교해 수행한다.
 */
export function analyzeTiming(script: FactionScript, portrait = false, part?: number): TimingReport {
  const cues = buildCues(script, portrait, part)
  const voiceChecks: PersonAudioCheck[] = []
  for (const tc of cues) {
    // 음성 스텝이 켜진 컷만 정합성 검사 대상.
    if (tc.cue.kind !== 'person' || !tc.cue.steps.voice) continue
    const c = tc.cue
    const g = script.groups[c.groupIndex]
    const clusterPeople = c.clusterIndex != null ? g.clusters?.[c.clusterIndex]?.people ?? [] : []
    const groupPeople = g.people ?? []
    const person: FactionPerson | undefined = c.clusterIndex != null
      ? clusterPeople[c.personIndex] ?? groupPeople[c.personIndex]
      : groupPeople[c.personIndex]
    if (!person) continue
    const cutSec = tc.duration / FPS
    const audioPlaySec = personAudioPlaySec(person)
    const audioStartSec = personQuoteEnterSec(person, c.steps, portrait)
    const audioEndSec = audioStartSec + audioPlaySec
    voiceChecks.push({
      name: person.name ?? '?',
      file: vnPersonQuote(c.groupIndex, c.personIndex, c.clusterIndex),
      cutSec,
      quoteDuration: person.quoteDuration ?? null,
      rate: clampRate(person.quotePlaybackRate),
      audioPlaySec,
      audioStartSec,
      audioEndSec,
      tailRoomSec: cutSec - audioEndSec,
    })
  }
  const last = cues[cues.length - 1]
  const totalFrames = last ? last.start + last.duration : f(INTRO_SEC + ENDING_FADE_SEC)
  return { totalSec: totalFrames / FPS, totalFrames, cueCount: cues.length, voiceChecks }
}
