import type {
  EpisodeMeta, YouTubeMeta, YouTubeLink, EpisodeForChapters, BookForDesc,
} from '@feelandnote/shared/lib/youtube-meta'

export type VariantInfo = {
  lang: 'ko' | 'en'
  type: 'longform' | 'shorts'
  /** 1-based 일관. longform은 무관(0 사용), shorts는 1, 2, 3 … */
  shortsIndex: number
  /** 매칭 키. e.g. 'ko-longform', 'ko-shorts-1', 'ko-shorts-2' */
  key: string
  video: { exists: boolean; size: number; name: string } | null
  srt: { exists: boolean; name: string } | null
  thumb: { exists: boolean; name: string } | null
}

export type ChannelAuth = { authenticated: boolean; expiryDate?: string }

export type YouTubeStatus = {
  auth: { ko: ChannelAuth; en: ChannelAuth }
  lineup: EpisodeMeta | null
  variants: VariantInfo[]
  meta: YouTubeMeta | null
}

export type EpisodeData = EpisodeForChapters & {
  host: { nickname: string; nickname_en?: string }
  books: BookForDesc[]
  shorts?: Array<{ featuredBookIndex?: number }>
  series?: { part: number; totalParts: number; totalBooks: number; prevEpisode?: string }
}

/**
 * 옵션 2 variant 키 규칙 (1-based 일관):
 * - `${lang}-longform`
 * - `${lang}-shorts-${n}`    (n ≥ 1)
 *
 * 레거시 `${lang}-shorts` (접미사 없음)은 폐기된다.
 */
export type VariantKey = string
export type MetaEntry = { title: string; description: string; links: YouTubeLink[] }

export type Props = {
  series: string
  name: string
  post: (url: string, body: unknown) => Promise<void>
}
