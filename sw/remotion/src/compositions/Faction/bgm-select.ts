/**
 * bgm-select.ts — 배경음악 **선곡**(어느 곡이 언제부터 흐르는가)
 *
 * `FactionBgm` 에서 골라내기만 떼어낸 것이다. 페이드·덕킹 같은 소리 만들기는 그대로 컴포넌트에
 * 남기고, **"이 편의 이 변형에서 어떤 곡이 재생되는가"** 만 여기 둔다.
 *
 * 이유: 렌더 창고(`scripts/render/stage.ts`)가 그 편이 실제로 쓰는 곡만 담아야 하는데,
 * 판정을 창고 쪽에 다시 쓰면 **언젠가 엔진과 어긋난다** — 어긋난 그날 곡이 빠진 채로 영상이
 * 나가거나 렌더가 죽는다. 그래서 렌더와 창고가 **같은 함수**를 부른다.
 * (검증기 `scripts/faction/verify.ts` 가 렌더 함수를 직접 불러 쓰는 것과 같은 방식이다.)
 */

import type { FactionScript, FactionTrack } from './types'
import { buildCues, isEmptyChapter, type TimedCue } from './timing'

/** 챕터 경계 하나 — 검정 브릿지 시작 / 챕터 표지 시작 / 그 챕터의 곡 */
export interface ChapterMusicBound {
  blackStart: number | null
  coverStart: number
  music?: string
  vol?: number
}

/** 곡 한 구간 — 어느 파일이 몇 프레임부터, 어디서 빠지는가 */
export interface BgmSegment {
  file: string
  from: number
  fadeOutAt: number
  vol: number
}

/** 음량 배율 정규화 — 미지정이면 1(원음). 0~1.5 로 제한(과증폭 방지) */
export const vol01 = (v?: number) => (v == null ? 1 : Math.min(1.5, Math.max(0, v)))

/**
 * 챕터 표지(chapter) 컷과 그 앞 검정 브릿지(chapterBlack)를 찾아 곡 경계를 만든다.
 * 표지 없는 빈 챕터는 검정 브릿지가 곧 경계다.
 */
export function chapterMusicBounds(cues: TimedCue[]): ChapterMusicBound[] {
  const bounds: ChapterMusicBound[] = []
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i].cue
    if (c.kind === 'chapter') {
      const prev = cues[i - 1]
      const blackStart = prev && prev.cue.kind === 'chapterBlack' ? prev.start : null
      bounds.push({ blackStart, coverStart: cues[i].start, music: c.chapter.music, vol: c.chapter.musicVolume })
    } else if (c.kind === 'chapterBlack' && isEmptyChapter(c.chapter)) {
      bounds.push({ blackStart: cues[i].start, coverStart: cues[i].start, music: c.chapter.music, vol: c.chapter.musicVolume })
    }
  }
  return bounds
}

/**
 * 챕터 단위 모드의 시작곡 — 시작 화면부터 첫 챕터 표지 이전까지 채운다.
 * 전역 music > tracks 첫 곡 > (둘 다 없으면) 첫 챕터 곡 순으로 고른다.
 */
export function chapterStartTrack(
  script: FactionScript, firstBound: ChapterMusicBound | undefined,
): { file?: string; vol: number } {
  if (script.music) {
    return { file: script.music, vol: vol01(script.tracks?.find(t => t.file === script.music)?.volume) }
  }
  if (script.tracks?.length) {
    return { file: script.tracks[0].file, vol: vol01(script.tracks[0].volume) }
  }
  // 전역 곡이 전혀 없는 챕터 전용 편성 — 첫 챕터 곡을 시작 화면부터 흐르게 한다.
  return { file: firstBound?.music, vol: vol01(firstBound?.vol) }
}

/**
 * 챕터 단위 모드의 곡 구간 — 챕터 표지에서 곡을 바꾸되, 챕터 곡 미지정이면 직전 곡을 이어간다.
 * `total` 은 마지막 구간이 어디서 끝나는지에만 쓰인다(선곡 자체에는 영향이 없다).
 */
export function chapterBgmSegments(
  script: FactionScript, bounds: ChapterMusicBound[], total: number,
): BgmSegment[] {
  if (!bounds.length) return []
  const start = chapterStartTrack(script, bounds[0])
  const segs: BgmSegment[] = []
  let curFile = start.file
  let curVol = start.vol
  let curFrom = 0
  for (const a of bounds) {
    if (a.music && a.music !== curFile) {
      // 이전 곡 마감 지점 = 검정 브릿지 시작(없으면 챕터 표지 시작). 거기서 페이드아웃한다.
      const cutAt = a.blackStart ?? a.coverStart
      if (curFile) segs.push({ file: curFile, from: curFrom, fadeOutAt: cutAt, vol: curVol })
      curFile = a.music
      curVol = vol01(a.vol)
      curFrom = a.coverStart // 새 곡은 챕터 표지 등장부터
    }
  }
  if (curFile) segs.push({ file: curFile, from: curFrom, fadeOutAt: total, vol: curVol })
  return segs
}

/** 챕터 단위 모드로 도는가 — 가로/세로가 아니라 롱폼(비-portrait)이면서 챕터 경계가 있을 때다 */
export function usesChapterBgm(portrait: boolean, bounds: ChapterMusicBound[]): boolean {
  return !portrait && bounds.length > 0
}

/** 전역 모드 재생 목록 — 편별 곡 > tracks > legacy music 한 곡 */
export function globalBgmTracks(script: FactionScript, part?: number): FactionTrack[] {
  const partMusic = part != null ? script.musicByPart?.[part] : undefined
  const partVol = part != null ? script.musicVolumeByPart?.[part] : undefined
  return partMusic
    ? [{ file: partMusic, volume: partVol }]
    : script.tracks?.length
      ? script.tracks
      : script.music
        ? [{ file: script.music }]
        : []
}

/**
 * 순차 배치가 가능한가 — 곡이 둘 이상이고 전부 길이를 알아야 한다.
 * 아니면 첫 곡 한 장만 전체에 깐다.
 */
export function canSequenceTracks(tracks: FactionTrack[]): boolean {
  return tracks.length > 1 && tracks.every(t => t.durationSec && t.durationSec > 0)
}

/**
 * **이 편의 이 변형에서 실제로 재생되는 곡 파일 이름**(중복 제거, `music/` 아래 상대명).
 *
 * 렌더 창고가 담을 곡을 정할 때 쓴다. 위 함수들만 조립하므로 `FactionBgm` 과 판정이 갈라질 수 없다.
 * 순차 배치일 때는 목록의 곡을 돌려가며 깔기 때문에 목록 전부를 쓰는 것으로 본다 — 영상이 짧아
 * 뒤쪽 곡까지 못 가는 경우가 있어도 넉넉히 담는 쪽이 안전하다(빠지면 렌더가 죽는다).
 */
export function collectBgmFiles(
  script: FactionScript,
  opts: { portrait?: boolean; part?: number; lvPart?: number } = {},
): string[] {
  const portrait = opts.portrait ?? false
  const cues = buildCues(script, portrait, opts.part, opts.lvPart)
  const bounds = chapterMusicBounds(cues)

  const files: string[] = []
  if (usesChapterBgm(portrait, bounds)) {
    // total 은 마지막 구간의 끝일 뿐이라 선곡에 영향이 없다 — 아무 양수나 넣는다.
    for (const s of chapterBgmSegments(script, bounds, Number.MAX_SAFE_INTEGER)) files.push(s.file)
  } else {
    const tracks = globalBgmTracks(script, opts.part)
    if (tracks.length) {
      if (canSequenceTracks(tracks)) for (const t of tracks) files.push(t.file)
      else files.push(tracks[0].file)
    }
  }
  return [...new Set(files.filter(Boolean))]
}
