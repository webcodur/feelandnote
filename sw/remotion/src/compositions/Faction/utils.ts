/**
 * 세력도(Faction) 컷 화면 공통 헬퍼 — 전환 해석·이미지 경로·인물 탐색·발화 시각 상대화.
 * 여러 컷 컴포넌트가 공유하는 순수 로직(JSX 없음).
 */
import { staticFile } from 'remotion'
import type { FactionScript, FactionGroup, FactionPerson, FactionCluster, FactionTransition, Orientation } from './types'
import type { TimedCue } from './timing'
import type { VoiceTimingSegment } from '../../lib/voice-timing'
import { CUT_TRANSITIONS } from './transitions'
import { TRANSITION_CYCLE } from './constants'

/** 전환 설정 해석 — auto면 인물 순번으로 순환, 미지정이면 zoomout */
export const resolveTransition = (t: FactionTransition | undefined, idx: number): Exclude<FactionTransition, 'auto'> =>
  t === 'auto' ? TRANSITION_CYCLE[idx % TRANSITION_CYCLE.length] : (t ?? 'zoomout')

/**
 * 인물·로고·화보 이미지 경로.
 * - 외부 URL(http) → 그대로
 * - 폴더 경로(슬래시 포함, 예: '1/앨런 튜링.webp') → 에피소드 폴더 하위에서 직접
 * - basename(예: 'logo.png') → 에피소드 폴더 하위 images/ 에서 찾는다 (BO 업로드 호환)
 */
export const imgSrc = (episodeName: string, image: string) =>
  /^https?:\/\//.test(image)
    ? image
    : image.includes('/')
      ? staticFile(`factions/${episodeName}/${image}`)
      : staticFile(`factions/${episodeName}/images/${image}`)

/** 이름 → 이니셜(이미지 없는 인물 플레이스홀더) */
export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')
}

/** 세력의 화보 묶음. clusters가 없으면 세력 전체를 단일 묶음으로 정규화한다(설명은 세력 슬로건). */
export const clustersOf = (g: FactionGroup): FactionCluster[] =>
  g.clusters?.length ? g.clusters : [{ image: g.image, people: g.people, note: g.tagline }]

/** 인물 컷의 컷 전환 종류 — 세로 쇼츠 인물 컷이고 전환이 컷 전환류면 그 kind, 아니면 null */
export const personCutKind = (script: FactionScript, cue: TimedCue['cue'], orientation: Orientation): string | null => {
  if (cue.kind !== 'person' || orientation !== 'portrait') return null
  const g = script.groups[cue.groupIndex]
  const person = cue.clusterIndex != null
    ? clustersOf(g)[cue.clusterIndex].people[cue.personIndex]
    : g.people[cue.personIndex]
  const k = resolveTransition(person.transition ?? g.transition ?? script.transition, cue.personIndex)
  return CUT_TRANSITIONS.has(k) ? k : null
}

/** slug로 전체 세력에서 인물 찾기 — 비활성화 세력은 건너뛴다(인트로에서도 빠지게) */
export const findPerson = (script: FactionScript, slug: string): FactionPerson | null => {
  for (const g of script.groups) {
    if (g.disabled) continue
    const list = g.clusters?.length ? g.clusters.flatMap(c => c.people) : g.people
    const p = list.find(x => x.slug === slug && !x.disabled)
    if (p) return p
  }
  return null
}

/** 페이지 범위 [start,end) 의 토막 시각을 페이지 시작(0초) 기준으로 상대화 — Typewriter 점등 입력 */
export const sliceLocalTimings = (expanded: VoiceTimingSegment[], start: number, end: number): VoiceTimingSegment[] => {
  const base = expanded[start].start ?? 0
  return expanded.slice(start, end).map(t => ({
    ...t,
    start: (t.start ?? 0) - base,
    end: (t.end ?? 0) - base,
  }))
}
