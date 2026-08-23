/**
 * 랭킹 시리즈 — 한 축을 세고 나레이터가 읽는다.
 * 인물마다 화보 위에 설명이 한 컷. 인물 대사는 없다.
 */

export interface RankingEntry {
  rank: number
  name: string
  /** 설명. 없으면 순위와 이름만 읽는다 */
  line?: string
  /** 등급·별점 같은 짧은 꼬리 */
  note?: string
  /** 에피소드 폴더 기준 상대경로 또는 URL — 개인화보 */
  image?: string
  /** 설명 컷에 깔 아바타. 개인화보가 있을 때만 채운다 */
  avatar?: string
}

export interface RankingCategory {
  name: string
  entries: RankingEntry[]
}

export interface RankingScript {
  title: string
  logline?: string
  music?: string
  musicVolume?: number
  /** 세력도감 테마 slug. 렌더는 안 읽고, 편집기가 인물·사진을 여기서 가져온다 */
  themeSlug?: string
  categories: RankingCategory[]
}

export type RankingCue =
  | { kind: 'intro' }
  | { kind: 'category'; categoryIndex: number }
  | { kind: 'explain'; categoryIndex: number; entryIndex: number }
  | { kind: 'outro' }

export interface TimedCue {
  cue: RankingCue
  start: number
  duration: number
  text: string
}

/** Remotion 컴포지션 ID는 a-zA-Z0-9- 만 받는다. 폴더명에서 나머지는 버린다 */
export function rankingCompBase(folder: string): string {
  const safe = folder.replace(/[^A-Za-z0-9-]/g, '')
  if (!safe) {
    throw new Error(`rankingCompBase: 폴더명 '${folder}' 에 영문·숫자·하이픈이 하나도 없다`)
  }
  return `Ranking-${safe}`
}

export function rankingCompId(folder: string): string {
  return `${rankingCompBase(folder)}-KO-LV`
}

export function rankingThumbId(folder: string): string {
  return `${rankingCompBase(folder)}-KO-LV-TH`
}
