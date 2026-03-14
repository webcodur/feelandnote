/** BookRecommend 에피소드 타입 (remotion types.ts 슬림 복사) */

export interface CelebHost {
  nickname: string
  nickname_en: string
  speech_tone: string
  avatar_url: string
  bio: string
  title: string
  featuredQuote?: string
  featuredQuoteDuration?: number
  philosophy: string
  voiceDuration: number
  elevenlabsVoiceId?: string
}

export interface BookStats {
  celebCount: number
  celebNames: string[]
  publisher?: string
  originalTitle?: string
  publishYear?: string
}

export interface BookEntry {
  title: string
  creator: string
  thumbnail_url: string
  summary: string
  summaryDuration: number
  context: string
  contextDuration: number
  directQuote?: string
  directQuoteSource?: string
  quoteDuration?: number
  contextAfter?: string
  contextAfterDuration?: number
  source?: string
  oneLiner: string
  stats: BookStats
  titleDuration: number
}

export interface NarratorLines {
  serviceIntro: string
  serviceIntroDuration: number
  celebIntro: string
  celebIntroDuration: number
  bridge: string
  bridgeDuration: number
  interlude?: string
  interludeDuration?: number
  outro: string
  outroDuration: number
}

export interface TtsOverrides {
  narrator?: {
    serviceIntro?: string
    celebIntro?: string
    outro?: string
  }
  host?: {
    philosophy?: string
  }
  books?: Array<{
    title?: string
    summary?: string
    context?: string
    contextAfter?: string
    directQuote?: string
  }>
}

export interface EpisodeScript {
  host: CelebHost
  books: BookEntry[]
  narrator: NarratorLines
  tts?: TtsOverrides
}

/** 에피소드 목록 아이템 */
export interface EpisodeListItem {
  name: string
  nickname: string
  avatar_url: string
  bookCount: number
}
