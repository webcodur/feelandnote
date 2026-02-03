
import type { ExtractedContent } from '@feelandnote/ai-services/content-extractor'
import type { ContentType } from '@feelandnote/content-search/types'
import { ExtractedContentWithSearch } from '@/actions/admin/ai-collect'

export type InputMode = 'url' | 'text' | 'json'

// JSON 입력 파싱용 타입
export interface JsonInputItem {
  type: ContentType // 필수: BOOK, VIDEO, GAME, MUSIC
  title: string
  body: string
  source: string
}

export interface SearchResultItem {
  externalId: string
  externalSource: string
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: Record<string, unknown>
}

export interface ProcessedItem extends ExtractedContentWithSearch {
  selectedSearchResult: SearchResultItem | null
  searchSource: 'ko' | 'original' | 'manual'
  status: string
  lastSearchQuery?: string
}
