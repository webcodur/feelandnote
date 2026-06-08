// --- Types mirroring remotion BookRecommendScript ---
type BookStats = {
  publisher?: string
  originalTitle?: string
  publishYear?: string
  celebCount?: number
}

export type CinematicImage = {
  file: string
  text?: string
  field?: 'summary' | 'context'
  keyword?: string
  prompt?: string
  ko?: string
}

type QuotePair = {
  quote: string
  quoteSource?: string
  quoteDuration?: number
  after?: string
  afterDuration?: number
}

/** 한 구간에 얹는 효과음 한 개. 텍스트 앵커 기준 ± offset(초) 으로 발화 시점을 잡는다. */
export type SfxItem = {
  file: string
  text?: string
  offset?: number
  volume?: number
  duration?: number
  fadeIn?: number
  fadeOut?: number
}

export type BgmTrack = {
  file: string
  volume?: number
  from?: number
  to?: number
  fadeIn?: number
  fadeOut?: number
  startFrom?: number
  loop?: boolean
  trackDuration?: number
}

export type BookEntry = {
  title: string
  creator: string
  thumbnail_url: string
  summary: string
  summaryDuration: number
  contextMain: string
  contextDuration: number
  quotePairs?: QuotePair[]
  source?: string
  stats: BookStats
  titleDuration: number
  images?: CinematicImage[]
  imagePrompts?: Record<string, unknown>
  bgm?: {
    summary?: BgmTrack
    context?: BgmTrack
  }
}

type NarratorLines = {
  serviceGreeting?: string
  serviceGreetingDuration?: number
  serviceIntro?: string
  serviceIntroDuration?: number
  celebIntro?: string
  celebIntroDuration?: number
  returnIntro?: string
  returnIntroDuration?: number
  prevRecap?: string
  prevRecapDuration?: number
  bridge: string
  bridgeDuration: number
  labelSummaryDuration?: number
  labelContextDuration?: number
  interlude?: string
  interludeDuration?: number
  outro: string
  outroDuration: number
}

export type ImageChange = {
  t: number
  image: string
  text?: string
}

export const toImageChanges = (v: unknown): ImageChange[] =>
  Array.isArray(v) ? v : v ? [v as ImageChange] : []

type ShortSegment = {
  id: string
  role: 'narrator' | 'celeb' | 'summary'
  text: string
  visual: 'hook' | 'intro' | 'book'
  duration?: number
  image?: string
  imageChangeAt?: ImageChange[]
  sfx?: { file: string; text?: string; offset?: number; volume?: number; duration?: number; fadeIn?: number; fadeOut?: number }[]
  gapAfter?: number
}

export type ShortsConfig = {
  featuredBookIndex?: number
  revealBg?: string
  segments: ShortSegment[]
}

type CelebHost = {
  nickname: string
  nickname_en: string
  speech_tone: string
  avatar_url: string
  title: string
  featuredQuote?: string
  featuredQuoteDuration?: number
  philosophy?: string
  voiceDuration?: number
  elevenlabsVoiceId?: string
  geminiVoice?: string
}

export type EpisodeData = {
  host?: CelebHost
  narrator?: NarratorLines
  books?: BookEntry[]
  /** 옵션 2: shorts는 항상 배열. 외부 파일 shorts/{locale}-{N}.json에서 로드된다.
   *  1권 모드(SOLO)는 별도 데이터 없이 book 본문에서 자동 변환되므로 EpisodeData에 필드 없음. */
  shorts?: ShortsConfig[]
  /** 롱폼 구간별 Gemini 발화 스타일 prefix. 키는 구간 식별자(예: "B2-philosophy"). 쇼츠는 segment.style 사용. */
  voiceStyles?: Record<string, string>
  [key: string]: unknown
}

// EMPTY_HOST/EMPTY_NARRATOR가 CelebHost/NarratorLines 타입을 참조하므로 함께 export
export type { CelebHost, NarratorLines }
