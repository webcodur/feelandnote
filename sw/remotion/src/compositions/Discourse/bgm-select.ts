/**
 * bgm-select.ts (담화) — 배경음악 **선곡**만 떼어낸 것.
 *
 * 팩션과 같은 이유다(`Faction/bgm-select.ts` 머리말 참조): 렌더 창고가 그 편이 실제로 쓰는 곡만
 * 담아야 하는데, 판정을 창고 쪽에 다시 쓰면 언젠가 엔진과 어긋난다. 그래서 렌더와 창고가
 * **같은 함수**를 부른다. 페이드·덕킹은 그대로 컴포넌트에 남는다.
 */

import type { DiscourseScript, DiscourseTrack } from './types'

/** 재생 목록 — tracks 우선, 없으면 legacy music 한 곡 */
export function discourseBgmTracks(script: DiscourseScript): DiscourseTrack[] {
  return script.tracks?.length
    ? script.tracks
    : script.music
      ? [{ file: script.music }]
      : []
}

/**
 * 순차 배치가 가능한가 — 곡이 둘 이상이고 전부 길이를 알아야 한다.
 * 아니면 첫 곡 한 장만 전체에 깐다.
 */
export function canSequenceDiscourseTracks(tracks: DiscourseTrack[]): boolean {
  return tracks.length > 1 && tracks.every(t => t.durationSec && t.durationSec > 0)
}

/** 이 편에서 실제로 재생되는 곡 파일 이름(중복 제거, `music/` 아래 상대명) */
export function collectDiscourseBgmFiles(script: DiscourseScript): string[] {
  const tracks = discourseBgmTracks(script)
  if (!tracks.length) return []
  const files = canSequenceDiscourseTracks(tracks) ? tracks.map(t => t.file) : [tracks[0].file]
  return [...new Set(files.filter(Boolean))]
}
