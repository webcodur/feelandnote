// 세력도 미리보기용 길이·컷 계산. 실제 렌더 타이밍과 별개의 추정치.

import type { FactionScript, FactionPerson } from '@/lib/faction-types'

export const INTRO_SEC = 2.5
export const GROUP_SEC = 1.8
export const CLUSTER_SEC = 1.8
export const OUTRO_SEC = 3.0

// 인물 컷 길이 — 렌더러(Faction/timing.ts)와 동일 규칙: 타이핑 시간 + 읽기 시간, 최소 보장
const FPS = 60
const TYPE_FRAMES_PER_CHAR = 3
const PERSON_HOLD_SEC = 1.2
const PERSON_MIN_SEC = 2.0

/** 인물 한 명 컷 길이(초) */
function personDurationSec(p: FactionPerson): number {
  const desc = p.lines?.length ? p.lines.join('') : (p.epithet ?? '')
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
  return INTRO_SEC + groupsSec + OUTRO_SEC
}

/** 컷 수 추정 (인트로 + 타이틀 + 화보 + 인물 + 엔딩). 타이틀은 모든 묶음에, 화보는 2명 이상 묶음만 */
export function cueCount(script: FactionScript): number {
  const groups = (script.groups ?? []).filter(g => !g.disabled)
  const groupCards = groups.filter(g => g.titleArt).length
  const clusterCards = groups.reduce((s, g) => s + groupClusterCards(g), 0)
  return 1 + groupCards + clusterCards + totalPeople(script) + 1
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

/** 이름에서 이니셜 한 글자 추출 */
export function initial(name: string): string {
  const trimmed = (name ?? '').trim()
  return trimmed ? trimmed[0] : '?'
}
