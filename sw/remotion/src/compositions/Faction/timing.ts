/**
 * 세력도감(Faction) 타이밍 — 단일원천(SSoT)
 *
 * 영상 = 「컷(Cue)」의 시간순 나열. 빌더가 컷마다 시작 프레임·길이를 매긴다.
 * 음원은 쓰지 않는다 — 인물 컷 길이는 직함 읽기 시간 + 대사 글자 수 읽기 시간으로 잡는다.
 */

import { factionSequenceOf, type FactionScript, type FactionPerson, type FactionEra, type FactionChapter, type FactionIndividualScene, type FactionNarratorVoice } from './types'
import {
  factionLongformPartCount,
  factionLongformSegments,
  factionLongformSliceItems,
} from '@feelandnote/shared/lib/faction-longform'
import {
  factionShortsSegments,
  factionShortsSliceItems,
  hasFactionShortsCuts,
} from '@feelandnote/shared/lib/faction-shorts'
import {
  FACTION_ENTER_FADE_SEC,
  FACTION_ENTER_NAME_SEC,
  FACTION_SCENE_DEFAULT_SEC,
  FACTION_SCENE_CAPTION_ID_HOLD_SEC,
  factionSceneTiming,
} from '@feelandnote/shared/lib/faction-scene-timing'
import { clampRate, vnPersonQuote } from './voice-names'

export const FPS = 60

/** 초 → 프레임 */
export const f = (sec: number) => Math.round(sec * FPS)

/* ── 컷 길이 (초) ── */
/** 오프닝 타이틀 */
export const INTRO_SEC = 2.5
/**
 * 시작 화면(배경·문구) 페이드아웃 길이(초).
 * 컷 끝(introSec)에 맞춰 꺼져 첫 로고 크로스페이드(CROSSFADE_SEC)와 겹친다.
 * 예전(끝 1.4초 전부터 완전 소멸)은 검정만 남는 텀이 길었다.
 */
export const INTRO_FADE_OUT_SEC = 0.7
/** 세력 로고 타이틀 카드 1장 (logoVid / logoImg 풀스크린). 기본 4초 */
export const GROUP_SEC = 4
/** 화보 묶음 카드 1장 — 4명 이상 기준 길이 (묶음 화면 +1s) */
export const CLUSTER_SEC = 3.3
/** 시대 구분 카드 1장 (연도순 롱폼) — 시대 명칭을 읽고 넘어갈 시간 */
export const ERA_SEC = 2.6
/** 챕터 전환 검정 브릿지 1장(초) — 이전 챕터 곡을 닫고 숨 고르는 검정 화면. 효과음이 여기서 1회 울린다 */
export const CHAPTER_BLACK_SEC = 0.25
/** 챕터 표지 카드 1장(초) — 배경 미디어 + 챕터 제목이 뜨는 시간. 새 챕터 곡이 여기서 열린다 */
export const CHAPTER_COVER_SEC = 3.5
/** 챕터 표지 등장 뒤 챕터명 낭독 시작까지 */
export const CHAPTER_VOICE_DELAY_SEC = 0.45
/** 챕터명 낭독 종료 뒤 다음 컷까지 여유 */
export const CHAPTER_VOICE_TAIL_SEC = 0.8
/** 챕터 전환 직전 인물 여운(초) — 챕터 마지막 인물의 대사가 끝난 뒤, 검정 브릿지로 넘어가기 전 그 인물 화면을 더 유지하는 시간(뒷부분은 검정 페이드로 덮인다) */
export const CHAPTER_HOLD_SEC = 2.0
/** 챕터 전환 직전 인물이 검정으로 서서히 덮이는 시간(초) — 검정 브릿지가 이 길이로 페이드인해 마지막 인물이 검정으로 페이드아웃된다 */
export const CHAPTER_FADE_SEC = 0.4
/** 인물·대사 없이 사건만 지나가는 개별 장면 기본 길이(초) */
export const SCENE_SEC = FACTION_SCENE_DEFAULT_SEC
/** 개별 장면 길이 — 해설 글자 수로 자동 계산하고 durationSec는 최소 노출 시간으로만 쓴다. */
export function sceneSecOf(scene: FactionIndividualScene, captionIdHoldSec?: number): number {
  return factionSceneTiming({ ...scene, captionIdHoldSec }).durationSec
}

/**
 * 그룹샷(화보 묶음) 카드 길이(초) — 등장 인원 수(disabled 제외)에 따라 가변.
 * 최소 2.6초 고정, 인원이 많으면 추가 시간 할당.
 * - 4명 이상: 3.2초
 * - 3명: 3.0초
 * - 2명: 2.8초
 * - 1명: 2.6초 (최소)
 */
export function clusterDurationSec(personCount: number): number {
  return personCount >= 4 ? 3.2
    : personCount === 3 ? 3.0
    : personCount === 2 ? 2.8
    : 2.6
}
/** 마지막 인물 컷 뒤 페이드아웃 여운(초) — 별도 엔딩 카드 없이 마지막 인물 위로 검정이 서서히 덮인다. 비-인물 컷으로 끝날 때의 폴백 */
export const ENDING_FADE_SEC = 1.6
/** 대사 후 대기 기본값 — 마지막 인물 대사 끝 ~ 다음 전환까지 그 인물 화면을 정지한 채 유지하는 시간(초). script.endHoldSec 미지정 시 */
export const DEFAULT_END_HOLD_SEC = 4
/** 마지막 화면(종료 화면) 대기 기본값(초). script.outroHoldSec 미지정 시. 시작 화면과 같은 길이로 둔다 */
export const DEFAULT_OUTRO_HOLD_SEC = INTRO_SEC
/** 종료 페이드아웃 기본 길이(초). script.endFadeSec 미지정 시 */
export const DEFAULT_END_FADE_SEC = 3

/** 로고 타이틀 카드(그룹 카드) 길이(초) — script.groupSec 우선, 없으면 GROUP_SEC */
export function groupSecOf(script: FactionScript): number {
  return script.groupSec ?? GROUP_SEC
}
/**
 * 빈 챕터 판정 — 챕터 제목(title)·배경 미디어(media)가 둘 다 비었으면 true.
 * 빈 챕터는 표지 카드를 그리지 않고 검정 브릿지만 둬 화면 전환 없이 음악(BGM)만 바꾼다.
 */
export function isEmptyChapter(chapter: FactionChapter): boolean {
  return !chapter.title?.trim() && !chapter.media?.trim()
}
/** 그룹샷(화보 묶음) 카드 길이(초) — script.clusterSec 우선(인원 수 무관 고정), 없으면 인원 수별 자동 */
export function clusterSecOf(script: FactionScript, personCount: number): number {
  return script.clusterSec ?? clusterDurationSec(personCount)
}
/** 컷 전환 크로스페이드 */
export const CROSSFADE_SEC = 0.6
/** 마지막 인물 컷 → 최종화면 전환 크로스페이드 — 마무리는 더 완만하게 떠오른다 */
export const OUTRO_CROSSFADE_SEC = 0.8

/* ── 인물 컷 등장·길이 (텍스트 양에 따라 가변, 최소 보장) ── */
/** 글자당 프레임 — 대사를 통째로 띄운 뒤 읽을 시간(≈ 초당 17자, 통째로 보여 빠르게 훑힘) 산정에 쓴다 */
export const READ_FRAMES_PER_CHAR = 3.0

/* ── 인물 컷 등장 시퀀스(초) — 렌더러(PersonCard)와 공유 ──
 * 순서: 줌아웃 정지 → 박스+이름+1번직함 슬라이드 인 → (직함 스텝 시) 박스 도착 후 2·3번 직함 순차 등장(타이핑 등) →
 * 직함 리드 종료 → 수식어/대사로 교차. 직함과 대사는 같은 슬롯 공유, 이름은 계속.
 * (직함 스텝 아닐 때는 직함 1번만 이름 옆에 함께 등장)
 */
/** 박스+이름+1번 직함 슬라이드 인 시작(초). 직함 스텝일 때 2·3번 직함은 박스 슬라이드 종료 후 별도 등장. */
export const ENTER_NAME_SEC = FACTION_ENTER_NAME_SEC
/** 각 단계 페이드인/아웃 길이(초) */
export const ENTER_FADE_SEC = FACTION_ENTER_FADE_SEC

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
export function epithetIsNarrated(p: FactionPerson, shorts = false): boolean {
  const spec = shorts ? p.epithetNarrateShorts : p.epithetNarrateLongform
  if (spec !== undefined) return spec
  if (p.epithetNarrate !== undefined) return p.epithetNarrate
  return !!(p.epithetDuration && p.epithetDuration > 0)
}

/**
 * 직함 타이핑 표시 방식 — orientation 맞춤 우선. 없으면 공통
 */
export function linesTypingOf(p: FactionPerson, shorts = false): boolean {
  const spec = shorts ? p.linesTypingShorts : p.linesTypingLongform
  if (spec !== undefined) return spec
  return !!p.linesTyping
}

/**
 * 수식어 노출 시간(초). 낭독이고 음원이 있으면 그 길이(배속 반영), 그 외(타이핑·음원 없음)는 글자 수 추정.
 * 수식어가 없으면 0.
 */
export function epithetSpeakSec(p: FactionPerson, shorts = false): number {
  if (!p.epithet) return 0
  if (epithetIsNarrated(p, shorts) && p.epithetDuration && p.epithetDuration > 0) return p.epithetDuration / clampRate(p.epithetPlaybackRate)
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

/** 직함이 한 줄씩 다 떠오르는 데 걸리는 시간(초) — ENTER_NAME_SEC 기준 0. 줄 수 비례 (레거시/폴백용) */
export function creditAppearSec(p: FactionPerson): number {
  const n = creditLinesOf(p).length
  return n > 0 ? (n - 1) * CREDIT_LINE_STAGGER_SEC + ENTER_FADE_SEC : 0
}

/* ── 직함 줄별 가변 체류 — 긴 줄일수록 다음 줄이 뜨기까지 더 오래 머문다(읽을 시간) ── */
/** 직함 줄 최소 체류(초) — 짧은 줄도 이만큼은 머문다. 읽을 여유를 늘려 순차 등장을 천천히. */
export const CREDIT_LINE_DWELL_MIN_SEC = 0.68
/** 직함 줄 최대 체류(초) — 아주 긴 줄이라도 이 이상은 안 머문다 */
export const CREDIT_LINE_DWELL_MAX_SEC = 1.8
/** 직함 줄 글자당 추가 체류(초) */
export const CREDIT_LINE_DWELL_PER_CHAR = 0.045

/** 직함 한 줄의 체류 시간(초) — 다음 줄이 뜨기까지의 간격. 글자 수에 비례(최소·최대 클램프). */
export function creditLineDwellSec(text: string): number {
  const len = text?.trim().length ?? 0
  const raw = CREDIT_LINE_DWELL_MIN_SEC + len * CREDIT_LINE_DWELL_PER_CHAR
  return Math.min(CREDIT_LINE_DWELL_MAX_SEC, Math.max(CREDIT_LINE_DWELL_MIN_SEC, raw))
}

/** 직함 리스트에 실제로 뜨는 줄들. 세로 쇼츠는 1번째 줄이 이름 옆에 붙으므로 2·3줄만, 가로 롱폼은 전체. */
export function creditListLinesOf(p: FactionPerson, shorts: boolean): string[] {
  const all = creditLinesOf(p)
  return shorts ? all.slice(1) : all
}

/** 리스트 각 줄의 등장 시각(초, 리스트 시작 기준) — 앞 줄들의 체류 합. */
export function creditLineOffsetsSec(p: FactionPerson, shorts: boolean): number[] {
  const lines = creditListLinesOf(p, shorts)
  const offs: number[] = []
  let cur = 0
  for (let i = 0; i < lines.length; i++) {
    offs.push(cur)
    cur += creditLineDwellSec(lines[i])
  }
  return offs
}

/** 직함 리스트 전체 시간(초) — 리스트 시작부터 마지막 줄 읽기까지. = 모든 줄 체류 합 + 초기 페이드. */
export function creditListSpanSec(p: FactionPerson, shorts: boolean): number {
  const lines = creditListLinesOf(p, shorts)
  if (!lines.length) return 0
  const sum = lines.reduce((s: number, t) => s + creditLineDwellSec(t), 0)
  return sum + ENTER_FADE_SEC
}

/** 직함 줄이 다 뜬 뒤 다음(수식어·대사)으로 넘어가기 전 정지 시간(초) — 마지막 줄을 읽을 여유 */
export const CREDIT_HOLD_SEC = 0.7

/** 직함만 있고 대사가 없는 인물 — 직함이 안 사라지고 보이는 최소 컷 길이(초) */
export const PERSON_MIN_SEC = ENTER_NAME_SEC + ENTER_FADE_SEC + CREDIT_READ_MIN_SEC + 0.8

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
export function personSteps(p: FactionPerson, portrait = false, isLeader = false): PersonSteps {
  const hasNew = p.stepCreditShorts !== undefined || p.stepEpithetShorts !== undefined || p.stepVoiceShorts !== undefined || p.stepCreditLongform !== undefined || p.stepEpithetLongform !== undefined || p.stepVoiceLongform !== undefined
  if (hasNew) {
    if (portrait) {
      return {
        credit: !!p.stepCreditShorts,
        epithet: !!p.stepEpithetShorts,
        voice: !!p.stepVoiceShorts
      }
    } else {
      return {
        credit: !!p.stepCreditLongform,
        epithet: !!p.stepEpithetLongform,
        voice: !!p.stepVoiceLongform
      }
    }
  }

  // legacy fallback
  const hasQuote = !!(p.quoteChunks?.some(c => c.trim()) || p.quote?.trim())
  const mode = p.quoteMode ?? (isLeader ? 'voice' : (hasQuote ? 'text' : 'credit'))
  return {
    credit: mode === 'credit' || mode === 'text' || mode === 'voice',
    epithet: mode === 'text' || mode === 'voice',
    voice: mode === 'voice'
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

/**
 * 작은 자막 모드 — 이름·직함(1행)을 대사 전에 최소 이 시간(초) 노출한다.
 * 리드 스텝이 없어도 무조건 이 구간을 확보한다(0초 신원 스킵 방지).
 * 편별 조정은 script.captionIdHoldSec(BO 「전역 타이밍」의 이름 출력).
 */
export const CAPTION_ID_HOLD_SEC = FACTION_SCENE_CAPTION_ID_HOLD_SEC

/** 자막형 인물 화면에서 대사 전 이름·직함 노출 시간(초) — 편 설정이 있으면 그 값, 없으면 기본값 */
export function captionIdHoldSecOf(script?: FactionScript, override?: number): number {
  const v = override ?? script?.captionIdHoldSec
  return v != null && Number.isFinite(v) && v >= 0 ? v : CAPTION_ID_HOLD_SEC
}

/** 인물·에피소드 설정에서 대사 표시 방식 해석 — 인물 우선, 없으면 에피소드, 기본 box */
export function resolveQuoteDisplay(p: FactionPerson, script?: FactionScript): 'box' | 'caption' {
  return p.quoteDisplay ?? script?.quoteDisplay ?? 'box'
}

/** personLeadTiming 부가 옵션 */
export type LeadTimingOpts = {
  /** 에피소드 스크립트 — quoteDisplay 에피소드 기본 해석용 */
  script?: FactionScript
  /** true면 작은 자막 모드로 간주(인물/에피소드 필드 무시하고 신원 최소 홀드 강제) */
  captionMode?: boolean
  /**
   * 대사 전 이름·직함 노출 시간(초) 직접 지정 — script 를 넘기지 못하는 호출처(PersonCard)가 쓴다.
   * 컷 길이(buildCues)와 화면(PersonCard)이 같은 값을 봐야 하므로, 위쪽에서 편 설정을 풀어 그대로 전달한다.
   */
  captionIdHoldSec?: number
}

export function personLeadTiming(p: FactionPerson, steps: PersonSteps, shorts = false, opts?: LeadTimingOpts): LeadTiming {
  const creditRestN = Math.max(0, creditLinesOf(p).length - 1) // 직함 2·3번 줄
  const creditOn = steps.credit && creditRestN > 0
  // 수식어 리드는 이제 명시적 스텝 설정(steps.epithet)을 따른다.
  const epiOn = steps.epithet && !!p.epithet

  // 직함 리드 — 이름 등장(ENTER_NAME) 뒤 한 박자(stagger) 늦게 리스트 시작, 줄마다 가변 체류(긴 줄=길게).
  // 마지막 줄까지 다 뜬 뒤 CREDIT_HOLD_SEC 만큼 멈췄다 다음(수식어·대사)으로 넘어간다.
  const creditEndSec = creditOn
    ? ENTER_NAME_SEC + CREDIT_LINE_STAGGER_SEC + creditListSpanSec(p, shorts) + CREDIT_HOLD_SEC
    : ENTER_NAME_SEC
  // 수식어 리드 — 직함 리드(있으면) 뒤를 이어 등장. 나레이터 낭독 시간 + 낭독 후 정지(HOLD)
  const epithetStartSec = (creditOn ? creditEndSec : ENTER_NAME_SEC) + CREDIT_LINE_STAGGER_SEC
  const epithetEndSec = epiOn
    ? epithetStartSec + epithetSpeakSec(p, shorts) + EPITHET_HOLD_SEC
    : epithetStartSec
  // 대사 등장 — 마지막 리드(수식어→직함→없음) 종료 시점. 리드가 없으면 등장 페이드 직후.
  let quoteEnterSec = epiOn ? epithetEndSec : (creditOn ? creditEndSec : ENTER_NAME_SEC + ENTER_FADE_SEC)
  // 작은 자막 모드: 이름·직함1행이 페이드인 끝난 뒤 CAPTION_ID_HOLD_SEC 동안 완전 표시 → 그다음 대사.
  // (이름 등장 직후 페이드인·대사 직전 페이드아웃을 홀드에 넣지 않는다 — 넣으면 체감 0.3~0.4초로 줄어든다)
  // 음성 스텝이 꺼져 대사가 없으면 적용 불필요.
  const captionMode = opts?.captionMode ?? resolveQuoteDisplay(p, opts?.script) === 'caption'
  if (captionMode && steps.voice) {
    const minEnter = ENTER_NAME_SEC + ENTER_FADE_SEC + captionIdHoldSecOf(opts?.script, opts?.captionIdHoldSec)
    quoteEnterSec = Math.max(quoteEnterSec, minEnter)
  }
  return { creditOn, epiOn, creditEndSec, epithetStartSec, epithetEndSec, quoteEnterSec }
}

/** 대사 등장 시점(초) — 켜진 리드 스텝을 다 보여준 뒤. */
export function personQuoteEnterSec(p: FactionPerson, steps: PersonSteps, shorts = false, opts?: LeadTimingOpts): number {
  return personLeadTiming(p, steps, shorts, opts).quoteEnterSec
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
export function personDurationSec(p: FactionPerson, steps: PersonSteps, shorts = false, opts?: LeadTimingOpts): number {
  const quoteText = p.quoteChunks?.length ? p.quoteChunks.join('\n') : (p.quote ?? '')
  const lead = personLeadTiming(p, steps, shorts, opts)
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
export function personQuoteEndSec(p: FactionPerson, steps: PersonSteps, shorts = false, opts?: LeadTimingOpts): number {
  const quoteText = p.quoteChunks?.length ? p.quoteChunks.join('\n') : (p.quote ?? '')
  const lead = personLeadTiming(p, steps, shorts, opts)
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
  // 페이드는 마지막에 보이는 화면 대기 안에서 끝나야 한다 —
  // 종료 화면을 쓰면 그 대기(마무리 낭독 연장 포함), noOutro면 마지막 인물 대기(endHold)를 넘지 못한다.
  const lastHold = script.noOutro ? endHoldSecOf(script) : outroSecOf(script)
  return Math.min(fade, lastHold)
}

/* ── 나레이터 낭독 — 시작문구(logline)·마무리(outro)·소개 컷(intro) 세 자리. 음원 없으면 전부 기존 동작 ── */
/** 소개 컷 최소 길이(초) */
export const NARRATOR_MIN_SEC = 2.4
/** 소개 컷 신원(이름·소개) 등장 후 대사 시작까지(초) */
export const NARRATOR_ENTER_SEC = 0.5
/** 소개 컷 대사가 끝난 뒤 머무는 여유(초) */
export const NARRATOR_HOLD_SEC = 1.0
/** 시작 화면에서 시작문구 낭독이 시작되기까지(초) — 문구 등장 페이드와 맞춘다 */
export const NARRATOR_LOGLINE_DELAY_SEC = 0.4
/** 시작문구 낭독 끝 ~ 시작 화면 페이드아웃까지 여유(초) */
export const NARRATOR_LOGLINE_TAIL_SEC = 1.0
/** 마무리 화면에서 낭독이 시작되기까지(초) */
export const NARRATOR_OUTRO_DELAY_SEC = 0.5

/** 낭독 텍스트 — 덩어리(quoteChunks)가 있으면 개행으로 잇고, 없으면 quote 통째 */
export function narratorVoiceText(v?: FactionNarratorVoice): string {
  if (!v) return ''
  return v.quoteChunks?.length ? v.quoteChunks.join('\n') : (v.quote ?? '')
}

/** 낭독 음성 실제 재생 시간(초) — quoteDuration을 배속으로 나눈 값. 음원이 없으면 0 */
export function narratorVoicePlaySec(v?: FactionNarratorVoice): number {
  if (!v?.quoteDuration || v.quoteDuration <= 0) return 0
  return v.quoteDuration / clampRate(v.quotePlaybackRate)
}

/**
 * 공용 낭독자가 시작 화면에서 읽을 문장.
 * 기존 데이터(read* 미지정)는 종전처럼 시작문구만 읽는다.
 */
export function narratorOpeningText(
  script: FactionScript,
  title = script.title,
  logline = script.logline,
): string {
  const n = script.narrator
  if (!n) return ''
  const readTitle = n.readTitle ?? false
  const readLogline = n.readLogline ?? true
  return [
    readTitle ? title : undefined,
    readLogline ? logline : undefined,
  ].filter((v): v is string => !!v?.trim()).join('\n')
}

/** 시작 낭독이 켜져 있을 때만 공용 음성 설정을 반환한다. */
export function narratorOpeningVoice(script: FactionScript): FactionNarratorVoice | undefined {
  return narratorOpeningText(script).trim() ? script.narrator?.logline : undefined
}

/** 마무리 낭독은 공용 목소리를 기본으로 쓰고 outro에 적힌 값만 예외로 덮는다. */
export function narratorOutroVoice(script: FactionScript): FactionNarratorVoice | undefined {
  const n = script.narrator
  if (!n?.outro) return undefined
  return { ...(n.logline ?? {}), ...n.outro }
}

/** 챕터명 낭독 활성 여부 — 챕터별 값이 공용 설정보다 우선한다. */
export function chapterNarrationOn(script: FactionScript, chapter: FactionChapter): boolean {
  return !!chapter.title?.trim() && (chapter.narrate ?? script.narrator?.readChapterTitle ?? false)
}

/** 챕터별 길이·예외값에 공용 목소리 설정만 상속한다(시작 음원의 텍스트·길이는 상속 금지). */
export function chapterNarrationVoice(script: FactionScript, chapter: FactionChapter): FactionNarratorVoice | undefined {
  if (!chapterNarrationOn(script, chapter)) return undefined
  const {
    quote: _quote,
    quoteEn: _quoteEn,
    quoteChunks: _quoteChunks,
    quoteEnChunks: _quoteEnChunks,
    quoteDuration: _quoteDuration,
    ...common
  } = script.narrator?.logline ?? {}
  return {
    ...common,
    ...(chapter.voice ?? {}),
    quote: chapter.title,
    quoteChunks: undefined,
  }
}

/** 챕터명 음성이 있으면 끝까지 들리도록 표지 컷을 자동 연장한다. */
export function chapterCoverSecOf(script: FactionScript, chapter: FactionChapter): number {
  const play = narratorVoicePlaySec(chapterNarrationVoice(script, chapter))
  return play > 0
    ? Math.max(CHAPTER_COVER_SEC, CHAPTER_VOICE_DELAY_SEC + play + CHAPTER_VOICE_TAIL_SEC)
    : CHAPTER_COVER_SEC
}

/** 소개 컷 존재 판정 — narrator 지정 + 방향별 노출(쇼츠 기본 꺼짐·롱폼 기본 켜짐) + 소개 대사 있음 */
export function narratorOn(script: FactionScript, portrait = false): boolean {
  const n = script.narrator
  if (!n) return false
  const show = portrait ? (n.showShorts ?? false) : (n.showLongform ?? true)
  return show && !!narratorVoiceText(n.intro).trim()
}

/** 소개 컷 발화 시간(초) — 음원이 있으면 그 길이(배속 반영), 없으면 글자 수 읽기 추정 */
export function narratorSpeakSec(v?: FactionNarratorVoice): number {
  const audio = narratorVoicePlaySec(v)
  if (audio > 0) return audio
  return (narratorVoiceText(v).length * READ_FRAMES_PER_CHAR) / FPS
}

/** 소개 컷 길이(초) — 신원 등장 + 발화 + 여유. 최소 보장 */
export function narratorDurationSec(v?: FactionNarratorVoice): number {
  return Math.max(NARRATOR_MIN_SEC, NARRATOR_ENTER_SEC + ENTER_FADE_SEC + narratorSpeakSec(v) + NARRATOR_HOLD_SEC)
}

/**
 * 시작 화면 길이(초) — script.introSec(없으면 기본값)에, 시작문구 낭독 음원이 있으면
 * 낭독이 다 들리도록 자동 연장한다(수동 값보다 짧아지지는 않음). 컷 길이(buildCues)와
 * 시작 화면 페이드아웃(IntroCard)이 이 함수를 공유해야 화면·소리가 안 어긋난다.
 */
export function introSecOf(script: FactionScript): number {
  const base = script.introSec ?? INTRO_SEC
  const play = narratorVoicePlaySec(narratorOpeningVoice(script))
  return play > 0 ? Math.max(base, NARRATOR_LOGLINE_DELAY_SEC + play + NARRATOR_LOGLINE_TAIL_SEC) : base
}

/**
 * 마무리 화면 길이(초) — outroHoldSec(없으면 기본값)에, 마무리 낭독 음원이 있으면
 * 낭독이 다 들리도록 자동 연장한다.
 */
export function outroSecOf(script: FactionScript): number {
  const base = outroHoldSecOf(script)
  const play = narratorVoicePlaySec(narratorOutroVoice(script))
  return play > 0 ? Math.max(base, NARRATOR_OUTRO_DELAY_SEC + play + 0.8) : base
}

/* ── 컷(Cue) 모델 ── */

export type Cue =
  | { kind: 'intro' }
  | { kind: 'narrator' }
  | { kind: 'group'; groupIndex: number }
  | { kind: 'cluster'; groupIndex: number; clusterIndex: number }
  | { kind: 'person'; groupIndex: number; personIndex: number; clusterIndex: number; steps: PersonSteps }
  | { kind: 'scene'; scene: FactionIndividualScene }
  | { kind: 'era'; label: string }
  | { kind: 'chapterBlack'; chapter: FactionChapter }
  | { kind: 'chapter'; chapter: FactionChapter }
  | { kind: 'outro' }

export interface TimedCue {
  cue: Cue
  /** 시작 프레임 */
  start: number
  /** 길이(프레임) */
  duration: number
}

/** 롱폼 편 개수 — longformLayout의 바깥 편 경계만 센다. */
export function longformPartCount(script: Pick<FactionScript, 'groups' | 'longformLayout'>): number {
  return factionLongformPartCount(
    script.groups as unknown as Array<Record<string, unknown>>,
    script.longformLayout,
  )
}

/**
 * 롱폼 배치를 편 경계(cut)로 가른 편 구간들.
 * 편성에 빠진 활성 세력은 누락 방지로 마지막 구간 맨 뒤에 자동으로 붙는다.
 * 인물 없는 개별 장면은 group.sequence에서 그룹과 같은 층위의 순서 항목으로 재생된다.
 */
export type FactionLongformStep =
  | { era: FactionEra }
  | { gi: number; sequenceStart: number; sequenceEnd: number }
  | { chapter: FactionChapter }

export function longformSegments(script: FactionScript): FactionLongformStep[][] {
  return factionLongformSegments<FactionEra, FactionChapter>(
    script.groups as unknown as Array<Record<string, unknown>>,
    script.longformLayout,
  )
}

/**
 * 스크립트 → 시간순 컷 배열. 각 컷에 start·duration을 부여한다.
 * part가 지정되면(쇼츠 편 분할) 그 part 세력만 포함한다. 미지정이면 전체.
 * lvPart가 지정되면(롱폼 편 분할, 1-based) longformLayout의 편 경계(cut)로 가른 그 편 구간만 포함한다.
 * 경계가 없으면 lvPart는 무시된다(전체). 각 편은 자체 인트로·아웃트로를 갖는다.
 */
export function buildCues(script: FactionScript, portrait = false, part?: number, lvPart?: number): TimedCue[] {
  const cues: TimedCue[] = []
  let cursor = 0
  const push = (cue: Cue, sec: number) => {
    cues.push({ cue, start: cursor, duration: f(sec) })
    cursor += f(sec)
  }

  push({ kind: 'intro' }, introSecOf(script))

  // 나레이터 소개 컷(옵션) — 지정된 에피소드만. 각 편(쇼츠 part·롱폼 lvPart)이 자체 인트로를 갖듯 나레이터도 편마다 붙는다.
  if (narratorOn(script, portrait)) push({ kind: 'narrator' }, narratorDurationSec(script.narrator!.intro))

  // ── 롱폼 편성 — 세력과 전환 카드를 지정 순서대로 따른다.
  //    쇼츠·미설정 롱폼은 세력 배열 순서.
  //    세력은 원래 인덱스를 보존하므로 세력도감 구도·음원·자막 키가 그대로 유효하다. ──
  let steps: FactionLongformStep[]
  if (!portrait) {
    const segments = longformSegments(script)
    // 롱폼 편 지정 + 경계가 실제로 있을 때만 그 편 구간으로 좁힌다. 그 외엔 전체(경계 무시하고 이어붙임).
    steps = segments.length > 1 && lvPart != null
      ? segments[lvPart - 1] ?? []
      : segments.flat()
  } else {
    const usesInternalShortsCuts = hasFactionShortsCuts(script.groups as unknown as Array<Record<string, unknown>>)
    if (usesInternalShortsCuts) {
      const segments = factionShortsSegments(script.groups as unknown as Array<Record<string, unknown>>)
      steps = part != null ? segments[part - 1] ?? [] : segments.flat()
    } else {
      steps = script.groups.map((group, gi): FactionLongformStep => ({
        gi,
        sequenceStart: 0,
        sequenceEnd: factionSequenceOf(group).length,
      }))
    }
  }

  // 세력 로고와 레거시 수장 판정은 세력의 첫 등장에 한 번만 적용한다.
  const groupIntroShown = new Set<number>()
  const groupLeaderAssigned = new Set<number>()
  const groupVisible = (gi: number) => {
    const group = script.groups[gi]
    if (!group || group.disabled) return false
    if (portrait && group.longformOnly) return false
    if (portrait
      && !hasFactionShortsCuts(script.groups as unknown as Array<Record<string, unknown>>)
      && part != null
      && group.part != null
      && group.part !== part) return false
    return true
  }
  const pushCluster = (gi: number, ci: number) => {
    if (!groupVisible(gi)) return
    const group = script.groups[gi]
    const cluster = group.clusters?.[ci]
    if (!cluster || cluster.disabled || (portrait && cluster.longformOnly)) return
    if (!groupIntroShown.has(gi)) {
      if (group.logoVid || group.logoImg) push({ kind: 'group', groupIndex: gi }, groupSecOf(script))
      groupIntroShown.add(gi)
    }
    const people = cluster.people ?? []
    const shotCount = people.filter(p => !p.disabled && !(portrait && p.longformOnly)).length
    if (!group.solo && cluster.image) {
      push({ kind: 'cluster', groupIndex: gi, clusterIndex: ci }, clusterSecOf(script, shotCount))
    }
    people.forEach((person, pi) => {
      if (person.disabled || (portrait && person.longformOnly)) return
      const isLeader = !groupLeaderAssigned.has(gi)
      groupLeaderAssigned.add(gi)
      const personStep = personSteps(person, portrait, isLeader)
      push({ kind: 'person', groupIndex: gi, personIndex: pi, clusterIndex: ci, steps: personStep }, personDurationSec(person, personStep, portrait, { script }))
    })
  }

  steps.forEach((step) => {
    // 시대 문구 카드 — 세력 블록 사이에 끼우는 장(章) 표지.
    if ('era' in step) { push({ kind: 'era', label: step.era.label }, ERA_SEC); return }
    // 챕터 전환 — 검정 브릿지(옵션) + 챕터 표지. 롱폼 전용(쇼츠는 longformLayout을 타지 않음).
    if ('chapter' in step) {
      // 챕터 전환 직전 인물 컷에 여운 — 마지막 대사가 끝난 뒤 그 인물을 잠시 더 유지했다가 넘어간다(급한 전환 방지).
      const prevCue = cues[cues.length - 1]
      if (prevCue?.cue.kind === 'person') {
        const pc = prevCue.cue
        const person = script.groups[pc.groupIndex]?.clusters?.[pc.clusterIndex]?.people[pc.personIndex]
        if (person) {
          const held = f(personQuoteEndSec(person, pc.steps, portrait, { script })) + f(CHAPTER_HOLD_SEC)
          if (held > prevCue.duration) { cursor += held - prevCue.duration; prevCue.duration = held }
        }
      }
      const chapter = step.chapter
      // 제목·배경 미디어가 둘 다 없는 챕터 — 표지 카드를 생략하고 검정 브릿지만 둔다.
      // 화면에는 짧은 검정만 스치고, 여기서 음악(BGM)만 다음 곡으로 전환된다.
      // 검정 브릿지는 음악 전환 경계이자 효과음 앵커라 blackBefore 설정과 무관하게 강제로 둔다.
      if (isEmptyChapter(chapter)) { push({ kind: 'chapterBlack', chapter }, CHAPTER_BLACK_SEC); return }
      if (chapter.blackBefore !== false) push({ kind: 'chapterBlack', chapter }, CHAPTER_BLACK_SEC)
      push({ kind: 'chapter', chapter }, chapterCoverSecOf(script, chapter))
      if (chapter.blackAfter) push({ kind: 'chapterBlack', chapter }, CHAPTER_BLACK_SEC)
      return
    }
    const gi = step.gi
    if (!groupVisible(gi)) return
    const group = script.groups[gi]
    const items = portrait
      ? factionShortsSliceItems<FactionIndividualScene>(group as unknown as Record<string, unknown>, step)
      : factionLongformSliceItems<FactionIndividualScene>(group as unknown as Record<string, unknown>, step)
    for (const item of items) {
      if (item.kind === 'scene') push({ kind: 'scene', scene: item.scene }, sceneSecOf(item.scene, script.captionIdHoldSec))
      else if (item.kind === 'cluster') pushCluster(gi, item.clusterIndex)
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
      const person = g.clusters?.[c.clusterIndex]?.people[c.personIndex]
      // 대사 끝 시점 + 종료 꼬리. (person 못 찾는 예외 시엔 기존 길이에 꼬리만 덧댄다)
      lastCue.duration = person ? f(personQuoteEndSec(person, c.steps, portrait, { script })) + holdF : lastCue.duration + holdF
    } else {
      // 인물 아닌 컷으로 끝나면(드묾) 기존처럼 꼬리만 덧댄다
      lastCue.duration += holdF
    }
  }

  // 브랜드 엔딩 — 기본은 모든 에피소드 마지막에 FEEL & NOTE 화면을 둔다(시리즈 통일).
  // 마지막 인물 컷(대사 후 대기 포함) 뒤에 붙여 마지막 화면 대기(outroHold)만큼 유지한다.
  // noOutro면 종료 화면을 두지 않고 마지막 인물 컷에서 검정 페이드아웃으로 끝낸다.
  if (!script.noOutro) {
    const tail = cues[cues.length - 1]
    const startF = tail ? tail.start + tail.duration : cursor
    // 마무리 낭독 음원이 있으면 낭독이 다 들리도록 자동 연장(outroSecOf)
    cues.push({ cue: { kind: 'outro' }, start: startF, duration: f(outroSecOf(script)) })
  }

  return cues
}

/** 영상 총 프레임 수 */
export function calcTotalFrames(script: FactionScript, portrait = false, part?: number, lvPart?: number): number {
  const cues = buildCues(script, portrait, part, lvPart)
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
export function analyzeTiming(script: FactionScript, portrait = false, part?: number, lvPart?: number): TimingReport {
  const cues = buildCues(script, portrait, part, lvPart)
  const voiceChecks: PersonAudioCheck[] = []
  for (const tc of cues) {
    // 음성 스텝이 켜진 컷만 정합성 검사 대상.
    if (tc.cue.kind !== 'person' || !tc.cue.steps.voice) continue
    const c = tc.cue
    const g = script.groups[c.groupIndex]
    const person: FactionPerson | undefined = g.clusters?.[c.clusterIndex]?.people[c.personIndex]
    if (!person) continue
    const cutSec = tc.duration / FPS
    const audioPlaySec = personAudioPlaySec(person)
    const audioStartSec = personQuoteEnterSec(person, c.steps, portrait, { script })
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
