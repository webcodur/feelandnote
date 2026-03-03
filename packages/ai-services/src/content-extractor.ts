// Content Extractor - 타입 정의만 보존 (Gemini 의존성 제거)

import type { ContentType } from '@feelandnote/content-search/types'

// #region Types
export interface ExtractedContent {
  type: ContentType
  title: string
  titleKo?: string
  creator?: string
  creatorKo?: string
  review?: string
  sourceUrl?: string
  rating?: number
}

export interface ExtractionResult {
  success: boolean
  items?: ExtractedContent[]
  error?: string
}
// #endregion

// Re-export ContentType for convenience
export type { ContentType } from '@feelandnote/content-search/types'
