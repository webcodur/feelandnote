export type CinematicImage = {
  file: string
  text?: string
  /** summary = 책 장면, context = 인물 장면 (Main/Quote/After 세부 위치는 text 앵커가 결정) */
  field?: 'summary' | 'context'
  keyword?: string
  prompt?: string
  ko?: string
}

export type ImageField = 'summary' | 'context'

export type VoiceInfo = {
  sectionKey: string
  duration?: number
  exists: boolean
}

export type AnchorPick = {
  itemIdx: number
  imgIdx: number
  draft: string | null
  field?: ImageField
} | null

export const ROLE_COLORS: Record<string, string> = {
  narrator: 'text-[#888]',
  summary: 'text-[#8bb8a8]',
  celeb: 'text-[#c8a46e]',
}

export const ROLE_LABELS: Record<string, string> = {
  narrator: '나레이터',
  summary: '요약맨',
  celeb: '셀럽',
}

export const ENGINE_COLORS: Record<string, string> = {
  gemini: 'text-blue-400',
  elevenlabs: 'text-purple-400',
  common: 'text-teal-400',
}

export const ENGINE_LABELS: Record<string, string> = {
  gemini: 'GEM',
  elevenlabs: 'ELE',
  common: 'CMN',
}

/* ── 공통 이미지 핸들러 props ── */
export type ImageEditorProps = {
  anchorPick: AnchorPick; setAnchorPick: (p: AnchorPick) => void
  imageBaseUrl: string; unassigned: string[]; refreshFolderImages: () => void
  getImages: (idx: number) => CinematicImage[]
  removeImage: (idx: number, imgIdx: number) => void
  replaceImage: (idx: number, imgIdx: number, fileName: string) => void
  addAnchor: (idx: number, text: string, field?: ImageField) => void
  dropImage: (idx: number, fileName: string, field?: ImageField) => void
  handlePick: (selected: string, field?: ImageField) => void
  confirmAnchor: () => void
  /** 반대쪽 뷰에서의 사용 현황 (파일명 → 설명) */
  crossUsage?: Map<string, string>
}
