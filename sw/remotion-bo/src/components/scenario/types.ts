export type CinematicImage = {
  file: string
  text?: string
  field?: 'summary' | 'context' | 'contextAfter'
  keyword?: string
  prompt?: string
  ko?: string
}

export type ImageField = 'summary' | 'context' | 'contextAfter'

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
