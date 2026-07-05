import type { Speaker } from '../../../SpeakerPanel'
import type { VoiceSection } from '../../../../voice-utils'
import type { CinematicImage, AnchorPick, ImageField } from '../../../types'
import type { MusicFile } from '../useLongformState'

/** BookSection orchestrator props — 단일 책 섹션 렌더에 필요한 전부. */
export type BookSectionProps = {
  book: any
  displayI: number
  realIdx: number
  totalBooks: number
  isFocused: boolean
  sectionMap: Map<string, VoiceSection>
  series: string
  name: string
  allImgs: CinematicImage[]
  anchorPick: AnchorPick
  setAnchorPick: (v: AnchorPick) => void
  confirmAnchor: () => void
  imageBaseUrl: string
  replaceImage: any
  removeImage: any
  removeImageOnly: any
  crossUsage: Map<string, string[]> | undefined
  uB: (i: number, field: string, value: unknown, prev?: string) => void
  /** 토막 분할 갱신 — 토막 목록과 본문(join)을 한 번에 바꾼다. 1개로 줄면 분할 해제. */
  uBSplit: (i: number, field: 'summary' | 'contextMain', parts: string[]) => void
  dropImage: (i: number, fn: string, field?: ImageField) => void
  addAnchor: (i: number, t: string, field?: ImageField) => void
  handlePick: (selected: string, field?: ImageField) => void
  updateQuotePair: (bookIdx: number, pairIdx: number, field: string, value: any, prev?: string) => void
  /** 후속 맥락 토막 분할 갱신 — 토막 목록과 본문(join)을 한 번에 바꾼다. 빈 목록이면 후속 맥락 제거. */
  updateAfterSplit: (bookIdx: number, pairIdx: number, parts: string[]) => void
  /** 요약/감상 배경 토막별 설정 저장. partCount===1이면 단일 필드, 2개↑면 대응 배열 필드 인덱스에 저장. */
  updateBookPartSetting: (
    bookIdx: number,
    section: 'summary' | 'contextMain',
    partIdx: number,
    which: 'Speaker' | 'GainDb' | 'PlaybackRate' | 'Sfx',
    value: unknown,
    partCount: number,
  ) => void
  /** 후속 맥락 토막별 설정 저장. partCount===1이면 단일 필드, 2개↑면 afterPart* 배열 인덱스에 저장. */
  updateAfterPartSetting: (
    bookIdx: number,
    pairIdx: number,
    partIdx: number,
    which: 'Speaker' | 'GainDb' | 'PlaybackRate' | 'Sfx',
    value: unknown,
    partCount: number,
  ) => void
  addQuotePair: (bookIdx: number) => void
  removeQuotePair: (bookIdx: number, pairIdx: number) => void
  saveField: (path: Array<string | number>, value: unknown) => Promise<void>
  activeEngine: (key: string) => string
  playingKey: string | null
  onTogglePlay: (key: string, gainDb?: number | null, mediaRate?: number | null) => void
  onToggleExpand: (key: string) => void
  musicFiles: MusicFile[]
  setBookBgm: (bookIdx: number, section: 'summary' | 'context', fileName: string | null) => void
  sfxFiles: { name: string; duration: number | null }[]
  sfxBase: string
  speakers: Speaker[]
}
