// 세력도 미리보기용 길이·컷 계산. 실제 렌더 타이밍과 별개의 추정치.

import type { CSSProperties } from 'react'
import type { FactionScript, FactionPerson, FactionImageCrop } from '@/lib/faction-types'

export const INTRO_SEC = 2.5
export const GROUP_SEC = 1.8
export const CLUSTER_SEC = 1.8
/** 마지막 인물 컷 뒤 페이드아웃 여운(초) — 렌더러(Faction/timing.ts)와 동일. 별도 엔딩 카드 없음 */
export const ENDING_FADE_SEC = 1.6
/** 대사 후 대기 기본값(초) — 마지막 인물 대사 끝 ~ 전환까지 정지 유지. 렌더러(DEFAULT_END_HOLD_SEC)와 동일 */
export const DEFAULT_END_HOLD_SEC = 4
/** 마지막 화면(종료 화면) 대기 기본값(초) — 렌더러(DEFAULT_OUTRO_HOLD_SEC)와 동일. 시작 화면과 같은 길이 */
export const DEFAULT_OUTRO_HOLD_SEC = INTRO_SEC

/** 대사 처리 스텝(신모델) — 렌더 PersonSteps 미러. 직함·수식어·음성 3개 독립 토글 */
export interface FactionSteps { credit: boolean; epithet: boolean; voice: boolean }

/**
 * 인물의 대사 처리 스텝 판정 — 렌더(Faction/timing.ts personSteps)와 동일.
 * step* 불린이 하나라도 정의돼 있으면 그대로, 아니면 레거시 quoteMode에서 환산.
 */
export function factionStepsOf(p: FactionPerson, isLeader = false): FactionSteps {
  if (p.stepVoice !== undefined || p.stepCredit !== undefined || p.stepEpithet !== undefined) {
    return { credit: !!p.stepCredit, epithet: !!p.stepEpithet, voice: !!p.stepVoice }
  }
  const hasQuote = !!(p.quoteChunks?.length || p.quote)
  const mode = p.quoteMode ?? (hasQuote ? (isLeader ? 'voice' : 'text') : 'credit')
  switch (mode) {
    case 'credit': return { credit: true, epithet: false, voice: false }
    case 'full': return { credit: true, epithet: false, voice: true }
    default: return { credit: false, epithet: !!p.epithet, voice: hasQuote }
  }
}

/** 신모델 스텝 저장 — 셋 다 명시하고 레거시 quoteMode는 제거한다(이후 신모델로 인식). */
export function applyFactionSteps(p: FactionPerson, steps: FactionSteps): FactionPerson {
  const next: FactionPerson = { ...p, stepCredit: steps.credit, stepEpithet: steps.epithet, stepVoice: steps.voice }
  delete next.quoteMode
  return next
}

// 인물 컷 길이 — 렌더러(Faction/timing.ts)와 동일 규칙: 타이핑 시간 + 읽기 시간, 최소 보장
const FPS = 60
const TYPE_FRAMES_PER_CHAR = 3
const PERSON_HOLD_SEC = 1.2
const PERSON_MIN_SEC = 2.0

/** 인물 한 명 컷 길이(초) */
function personDurationSec(p: FactionPerson): number {
  const desc = (p.lines?.join('') ?? '') + (p.epithet ?? '')
  const quote = p.quote ?? ''
  const chars = (p.name?.length ?? 0) + desc.length + quote.length
  const typeSec = (chars * TYPE_FRAMES_PER_CHAR) / FPS
  return Math.max(PERSON_MIN_SEC, typeSec + PERSON_HOLD_SEC)
}

/** 한 세력의 인물 목록 (clusters가 있으면 묶음별 합산) */
function groupPeople(g: FactionScript['groups'][number]): FactionPerson[] {
  const list = g.clusters?.length ? g.clusters.flatMap(c => c.people ?? []) : (g.people ?? [])
  // 영상에서 제외된 인물은 길이·카운트 계산에서 뺀다 (렌더와 일치)
  return list.filter(p => !p.disabled)
}

/** 한 세력의 인물 수 */
function groupPeopleCount(g: FactionScript['groups'][number]): number {
  return groupPeople(g).length
}

/** 등장 인물 총수 (비활성화 세력 제외) */
export function totalPeople(script: FactionScript): number {
  return (script.groups ?? [])
    .filter(g => !g.disabled)
    .reduce((sum, g) => sum + groupPeopleCount(g), 0)
}

/** 한 세력의 화보 카드 수 (solo는 0, 그 외는 묶음마다 1장 — 1명 묶음도 단독 화보) */
function groupClusterCards(g: FactionScript['groups'][number]): number {
  if (g.solo) return 0
  return g.clusters?.length ?? 1
}

/** 영상 총 길이(초) 추정 */
export function totalSec(script: FactionScript): number {
  const groups = (script.groups ?? []).filter(g => !g.disabled)
  const groupsSec = groups.reduce((sum, g) => {
    // 타이틀 카드(로고)는 titleArt가 있는 세력만
    const head = g.titleArt ? GROUP_SEC : 0
    // 화보 카드(2명 이상 묶음만)
    const clusterCardsSec = groupClusterCards(g) * CLUSTER_SEC
    // 인물 컷은 텍스트 양에 따라 길이가 다르다 — 사람마다 합산
    const peopleSec = groupPeople(g).reduce((s, p) => s + personDurationSec(p), 0)
    return sum + head + clusterCardsSec + peopleSec
  }, 0)
  // 엔딩 카드 없음. 마지막 인물 컷은 대사 끝부터 대사 후 대기(endHold)만큼 유지된다.
  // 추정: 인물 합산에는 PERSON_HOLD가 이미 포함되므로, 마지막 인물 hold를 대사 후 대기로 치환한다(렌더와 근사).
  // 브랜드 엔딩(FEEL & NOTE)이 모든 에피소드 마지막에 붙는다 — 마지막 화면 대기(outroHold)만큼 한 컷 추가.
  const endHold = Math.max(0, script.endHoldSec ?? DEFAULT_END_HOLD_SEC)
  const outroHold = Math.max(0, script.outroHoldSec ?? DEFAULT_OUTRO_HOLD_SEC)
  return Math.max(INTRO_SEC, INTRO_SEC + groupsSec - PERSON_HOLD_SEC + endHold + outroHold)
}

/** 컷 수 추정 (인트로 + 타이틀 + 화보 + 인물). 타이틀은 모든 묶음에, 화보는 2명 이상 묶음만. 엔딩 카드는 없다 */
export function cueCount(script: FactionScript): number {
  const groups = (script.groups ?? []).filter(g => !g.disabled)
  const groupCards = groups.filter(g => g.titleArt).length
  const clusterCards = groups.reduce((s, g) => s + groupClusterCards(g), 0)
  return 1 + groupCards + clusterCards + totalPeople(script)
}

/** 초 → mm:ss */
export function formatMmss(sec: number): string {
  const total = Math.max(0, Math.round(sec))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * 이미지 표시 src 계산.
 * http로 시작하면 그대로, 아니면 에피소드 이미지 서빙 경로로 변환.
 */
export function imageSrc(series: string, episodeName: string, image?: string): string | undefined {
  if (!image) return undefined
  if (image.startsWith('http')) return image
  return `/api/${series}/faction-image/${episodeName}/${image}`
}

/**
 * 사진 맞춤(crop)을 썸네일·미리보기 CSS 로 변환 — 렌더(PersonCard styleFor)와 같은 규칙.
 * cover 위에서 보일 위치(objectPosition)와 확대(scale, 그 지점 중심)를 만든다. 미지정이면 빈 객체(가운데 채움).
 */
export function cropToStyle(crop?: FactionImageCrop): CSSProperties {
  if (!crop) return {}
  const x = crop.x ?? 50
  const y = crop.y ?? 50
  const sc = crop.scale ?? 1
  const style: CSSProperties = { objectPosition: `${x}% ${y}%` }
  if (sc !== 1) {
    style.transform = `scale(${sc})`
    style.transformOrigin = `${x}% ${y}%`
  }
  return style
}

/** crop 값 정규화 — 기본값(가운데·1배)뿐이면 undefined 로 비워 데이터 오염을 막는다 */
export function normalizeCrop(crop: FactionImageCrop): FactionImageCrop | undefined {
  const x = Math.round(crop.x ?? 50)
  const y = Math.round(crop.y ?? 50)
  const scale = Math.round((crop.scale ?? 1) * 100) / 100
  if (x === 50 && y === 50 && scale === 1) return undefined
  const out: FactionImageCrop = {}
  if (x !== 50) out.x = x
  if (y !== 50) out.y = y
  if (scale !== 1) out.scale = scale
  return out
}

/** 이름에서 이니셜 한 글자 추출 */
export function initial(name: string): string {
  const trimmed = (name ?? '').trim()
  return trimmed ? trimmed[0] : '?'
}

/** 영상 파일 여부 — 확장자 기준(쿼리스트링·해시 무시). 이미지/영상 썸네일 분기에 쓴다 */
export function isVideoSrc(src?: string): boolean {
  return !!src && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)
}
