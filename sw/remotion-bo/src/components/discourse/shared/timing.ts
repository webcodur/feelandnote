/**
 * 담화 편집기의 길이·컷 계산 — **렌더 산식을 그대로 가져다 쓴다(복제 금지).**
 *
 * 팩션 BO는 렌더 타이밍을 근사치로 베껴 뒀고(shared/timing.ts), 그래서 두 값이 갈릴 여지가 있다.
 * 담화 렌더의 timing.ts 는 순수 계산 모듈이라(remotion 런타임·require.context 없음) BO가 직접 import 할 수 있다.
 * buildCues 가 영상 구성의 단일원천이므로 미리보기는 반드시 이 함수를 통과한다.
 */

import {
  buildCues as rmBuildCues,
  turnSec as rmTurnSec,
  longformPartNumbers as rmLongformPartNumbers,
  shortsPartNumbers as rmShortsPartNumbers,
  FPS,
} from '@feelandnote/remotion/src/compositions/Discourse/timing'
import type { DiscourseScript as RmDiscourseScript } from '@feelandnote/remotion/src/compositions/Discourse/types'
import type { DiscourseScript, Turn } from '@/lib/discourse-types'

export type { TimedCue, DiscourseCue } from '@feelandnote/remotion/src/compositions/Discourse/timing'
export { FPS }

/**
 * BO 미러 타입 → 렌더 타입 경계.
 * 두 타입은 같은 규격의 복제본이지만 발화 시각 맵(voiceTimings)만 표현이 다르다
 * (BO는 통째로 실어 나르기만 하므로 Record<string, unknown>). 계산에 쓰이지 않는 필드라 여기서 한 번만 건넌다.
 */
const toRm = (s: DiscourseScript): RmDiscourseScript => s as unknown as RmDiscourseScript

/** 컷 목록 — 렌더와 완전히 같은 산식 */
export const buildCues = (script: DiscourseScript, isShorts: boolean, part?: number, lvPart?: number) =>
  rmBuildCues(toRm(script), isShorts, part, lvPart)

/** 발언 한 개의 길이(초) — 음원이 있으면 그 길이, 없으면 글자 수 추정 */
export const turnSec = (t: Turn) => rmTurnSec(t as unknown as Parameters<typeof rmTurnSec>[0])

/** 롱폼 편 번호 목록 — 편 경계(cut)가 없으면 빈 배열(통짜 한 편) */
export const longformPartNumbers = (script: DiscourseScript) =>
  rmLongformPartNumbers(toRm(script).longformLayout)

/** 쇼츠 편 번호 목록 — 발언에 실제로 배정된 편만 */
export const shortsPartNumbers = (script: DiscourseScript) => rmShortsPartNumbers(toRm(script))

/** 이 편의 총 길이(초) */
export function totalSec(script: DiscourseScript, isShorts: boolean, part?: number, lvPart?: number): number {
  const cues = buildCues(script, isShorts, part, lvPart)
  const last = cues[cues.length - 1]
  return last ? (last.start + last.duration) / FPS : 0
}

/** 초 → mm:ss */
export function formatMmss(sec: number): string {
  const total = Math.max(0, Math.round(sec))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * 이미지 표시 경로 — 렌더(Discourse/utils.ts imgSrc)와 같은 규칙을 BO 자산 통로로 옮긴 것.
 * 외부 URL은 그대로, 슬래시가 있으면 에피소드 폴더 하위, 파일명만 있으면 images/ 하위.
 */
export function imageSrc(episodeName: string, image?: string): string | undefined {
  if (!image) return undefined
  if (/^https?:\/\//.test(image)) return image
  const rel = image.includes('/') ? image : `images/${image}`
  return `/api/rm-asset/discourses/${episodeName}/${rel}`
}

/** 통합 명칭(앞부분\n뒷부분) 분해 — 첫 줄이 앞부분, 나머지가 뒷부분 */
export function splitName(v?: string): { head: string; rest: string } {
  const lines = (v ?? '').split('\n')
  return { head: (lines[0] ?? '').trim(), rest: lines.slice(1).join(' ').trim() }
}

/** 발언 자막 덩어리 — chunks 가 있으면 그 배열, 없으면 대사 통째 한 덩어리 */
export const turnChunks = (t: Turn): string[] => (t.chunks?.length ? t.chunks : t.text ? [t.text] : [])

/** 한 발언 안에서 화면에 걸리는 사진 한 장 */
export type TurnShot = {
  /** 사진 경로. 시작 사진이 인물 기본 사진이면 그것 */
  image?: string
  /** 이 사진이 걸리는 덩어리 번호 (0-based) */
  fromChunk: number
  /** 이 사진이 떠 있는 동안 나오는 대사 */
  caption: string
  /** 인물 기본 사진을 물려받은 시작 사진인가 */
  inherited: boolean
}

/**
 * 발언의 사진 흐름 — 렌더(Discourse/sections/TurnCard.tsx)의 사진 교체 규칙을 그대로 따른다.
 *
 * 시작 사진은 `turn.image ?? speaker.image`로 깔리고, `imageChanges`가 지정한 덩어리에서 넘어간다.
 * 같은 덩어리에 두 장이 겹치면 나중 것이 이긴다 — 0번 덩어리에 교체를 걸면 시작 사진을 대신한다
 * (덩어리 편집 화면의 「비우면 발언 시작 사진」 안내와 같은 뜻).
 */
export function turnShots(turn: Turn, speakerImage?: string): TurnShot[] {
  const chunks = turnChunks(turn)
  const base = turn.image ?? speakerImage
  const changes = [...(turn.imageChanges ?? [])].sort((a, b) => a.chunk - b.chunk)

  const byChunk = new Map<number, { image?: string; inherited: boolean }>()
  byChunk.set(0, { image: base, inherited: !turn.image && !!speakerImage })
  for (const c of changes) byChunk.set(c.chunk, { image: c.image, inherited: false })

  const starts = [...byChunk.keys()].sort((a, b) => a - b)
  return starts.map((start, i) => {
    const end = starts[i + 1] ?? chunks.length
    const hit = byChunk.get(start)
    return {
      image: hit?.image,
      fromChunk: start,
      inherited: hit?.inherited ?? false,
      caption: chunks.slice(start, Math.max(end, start + 1)).join(' ').trim(),
    }
  })
}
