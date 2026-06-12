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
  dropImage: (i: number, fn: string, field?: ImageField) => void
  addAnchor: (i: number, t: string, field?: ImageField) => void
  handlePick: (selected: string, field?: ImageField) => void
  updateQuotePair: (bookIdx: number, pairIdx: number, field: string, value: any, prev?: string) => void
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
