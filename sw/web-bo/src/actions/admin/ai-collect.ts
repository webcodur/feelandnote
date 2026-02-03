'use server'

import { fetchUrlContent } from '@feelandnote/ai-services/url-fetcher'
import { extractContentsFromText, type ExtractedContent } from '@feelandnote/ai-services/content-extractor'
import { searchExternal, type ExternalSearchResult, type SearchOptions } from '@feelandnote/content-search/unified-search'
import type { ContentType } from '@feelandnote/content-search/types'
import { createClient } from '@/lib/supabase/server'
import { createContentFromExternal } from './external-search'
import { addCelebContent } from './celebs'
import { getBestAvailableKey, getApiKeyById, recordApiKeyUsage, type ApiKey } from './api-keys'

// #region Types
// API 키 가져오기 헬퍼
async function getApiKey(selectedKeyId?: string): Promise<{ key: ApiKey | null; error?: string }> {
  if (selectedKeyId) {
    const result = await getApiKeyById(selectedKeyId)
    if (result.success && result.data) {
      return { key: result.data }
    }
    // 선택된 키가 없으면 자동 선택으로 fallback
  }

  const result = await getBestAvailableKey()
  if (result.success && result.data) {
    return { key: result.data }
  }

  return { key: null, error: result.error || '사용 가능한 API 키가 없습니다.' }
}

interface SearchResultItem {
  externalId: string
  externalSource: string
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: Record<string, unknown>
}

export interface ExtractedContentWithSearch {
  extracted: ExtractedContent
  searchResultsKo: SearchResultItem[]      // 한국어 제목 검색 결과
  searchResultsOriginal: SearchResultItem[] // 원본 제목 검색 결과
  itemSourceUrl?: string
  itemReview?: string
}

// 추출만 (1단계) 결과
export interface ExtractOnlyResult {
  success: boolean
  sourceUrl?: string
  extractedItems?: ExtractedContent[]
  error?: string
}

// 처리 (번역+검색) 입력
interface ProcessItemsInput {
  extractedItems: ExtractedContent[]
  startIndex: number
  batchSize: number
  selectedKeyId?: string
}

// 처리 결과
interface ProcessItemsResult {
  success: boolean
  items: ExtractedContentWithSearch[]
  processedCount: number
  error?: string
}

interface SaveCollectedInput {
  celebId: string
  sourceUrl: string
  items: Array<{
    searchResult: {
      externalId: string
      externalSource: string
      title: string
      creator: string
      coverImageUrl: string | null
      metadata: Record<string, unknown>
    }
    contentType: ContentType
    status: string
    itemSourceUrl?: string
    itemReview?: string
    titleOriginal?: string
  }>
}

interface SaveResult {
  success: boolean
  savedCount?: number
  error?: string
}

// 검색 결과 변환 헬퍼
function mapSearchResults(items: ExternalSearchResult[]): SearchResultItem[] {
  return items.slice(0, 5).map((item) => ({
    externalId: item.externalId,
    externalSource: item.externalSource,
    title: item.title,
    creator: item.creator,
    coverImageUrl: item.coverImageUrl,
    metadata: item.metadata as Record<string, unknown>,
  }))
}

// 딜레이 헬퍼
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// #endregion

// #region extractOnlyFromUrl - 추출만 (1단계)
export async function extractOnlyFromUrl(input: { url: string; celebName: string; selectedKeyId?: string }): Promise<ExtractOnlyResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '인증이 필요합니다.' }
  }

  const { key: apiKeyRecord, error: keyError } = await getApiKey(input.selectedKeyId)
  if (!apiKeyRecord) {
    return { success: false, error: keyError || 'API 키를 가져올 수 없습니다.' }
  }

  // URL에서 텍스트 추출
  const fetchResult = await fetchUrlContent(input.url)
  if (!fetchResult.success || !fetchResult.text) {
    return { success: false, error: fetchResult.error || '페이지 내용을 가져올 수 없습니다.' }
  }

  // AI로 콘텐츠 추출
  const extractResult = await extractContentsFromText(apiKeyRecord.api_key, fetchResult.text, input.celebName)

  // 사용 기록
  const is429 = extractResult.error?.includes('429') || extractResult.error?.includes('quota')
  await recordApiKeyUsage({
    api_key_id: apiKeyRecord.id,
    action_type: 'extract',
    success: extractResult.success,
    error_code: is429 ? '429' : extractResult.error ? 'ERROR' : undefined,
  })

  if (!extractResult.success || !extractResult.items) {
    return { success: false, error: extractResult.error || '콘텐츠를 추출할 수 없습니다.' }
  }

  return { success: true, sourceUrl: input.url, extractedItems: extractResult.items }
}

export async function extractOnlyFromText(input: { text: string; celebName: string; selectedKeyId?: string }): Promise<ExtractOnlyResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '인증이 필요합니다.' }
  }

  const { key: apiKeyRecord, error: keyError } = await getApiKey(input.selectedKeyId)
  if (!apiKeyRecord) {
    return { success: false, error: keyError || 'API 키를 가져올 수 없습니다.' }
  }

  // AI로 콘텐츠 추출
  const extractResult = await extractContentsFromText(apiKeyRecord.api_key, input.text, input.celebName)

  // 사용 기록
  const is429 = extractResult.error?.includes('429') || extractResult.error?.includes('quota')
  await recordApiKeyUsage({
    api_key_id: apiKeyRecord.id,
    action_type: 'extract',
    success: extractResult.success,
    error_code: is429 ? '429' : extractResult.error ? 'ERROR' : undefined,
  })

  if (!extractResult.success || !extractResult.items) {
    return { success: false, error: extractResult.error || '콘텐츠를 추출할 수 없습니다.' }
  }

  return { success: true, extractedItems: extractResult.items }
}
// #endregion

// #region processExtractedItems - 검색 (titleKo 우선, 실패 시 원본)
export async function processExtractedItems(input: ProcessItemsInput): Promise<ProcessItemsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, items: [], processedCount: 0, error: '인증이 필요합니다.' }
  }

  // 시작 인덱스부터 batchSize만큼 슬라이스
  const itemsToProcess = input.extractedItems.slice(input.startIndex, input.startIndex + input.batchSize)
  if (itemsToProcess.length === 0) {
    return { success: true, items: [], processedCount: 0 }
  }


  const results: ExtractedContentWithSearch[] = []

  for (let i = 0; i < itemsToProcess.length; i++) {
    const extracted = itemsToProcess[i]
    const globalIndex = input.startIndex + i
    const title = extracted.titleKo || extracted.title
    // BOOK만 "제목 - 저자" 형식으로 검색 (구글 API가 더 정확하게 매칭)
    const isBook = extracted.type === 'BOOK'
    const searchQuery = isBook && extracted.creator ? `${title} - ${extracted.creator}` : title

    let searchResultsKo: SearchResultItem[] = []
    let searchResultsOriginal: SearchResultItem[] = []

    try {
      // 한국어 제목으로 먼저 검색 (BOOK만 구글 우선)
      const koResponse = await searchExternal(extracted.type, searchQuery, 1, { preferGoogle: isBook })
      searchResultsKo = mapSearchResults(koResponse.items)
      console.log(`  → 검색(Ko): ${searchResultsKo.length}건`)

      // 한국어로 못 찾으면 원본으로 재검색
      if (searchResultsKo.length === 0 && title !== extracted.title) {
        const origQuery = isBook && extracted.creator ? `${extracted.title} - ${extracted.creator}` : extracted.title
        const origResponse = await searchExternal(extracted.type, origQuery, 1, { preferGoogle: isBook })
        searchResultsOriginal = mapSearchResults(origResponse.items)
        console.log(`  → 검색(Orig): ${searchResultsOriginal.length}건`)
      }
    } catch (err) {
      console.warn(`  → 검색 실패:`, err)
    }

    results.push({
      extracted,
      searchResultsKo,
      searchResultsOriginal,
      itemSourceUrl: extracted.sourceUrl,
      itemReview: extracted.review, // 이미 한국어로 추출됨
    })

    // 마지막 아이템이 아니면 0.5초 대기
    if (i < itemsToProcess.length - 1) {
      await delay(500)
    }
  }

  return { success: true, items: results, processedCount: results.length }
}
// #endregion

// #region saveCollectedContents
export async function saveCollectedContents(input: SaveCollectedInput): Promise<SaveResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증이 필요합니다.' }
  }

  let savedCount = 0

  for (const item of input.items) {
    try {
      // 1. 콘텐츠 DB 등록 (외부 검색 결과 → contents 테이블)
      // 한국어 제목을 title로, 영문 원제를 metadata.titleOriginal에 저장
      const metadata = {
        ...item.searchResult.metadata,
        titleOriginal: item.titleOriginal || undefined,
      }
      const contentResult = await createContentFromExternal(
        {
          externalId: item.searchResult.externalId,
          externalSource: item.searchResult.externalSource,
          title: item.searchResult.title,
          creator: item.searchResult.creator,
          coverImageUrl: item.searchResult.coverImageUrl,
          metadata,
        },
        item.contentType
      )

      if (!contentResult.success || !contentResult.contentId) {
        console.error('[saveCollectedContents] Failed to create content:', contentResult.error)
        continue
      }

      // 2. 셀럽-콘텐츠 연결 (user_contents 테이블)
      // 개별 출처 URL이 있으면 사용, 없으면 전체 페이지 URL 사용
      await addCelebContent({
        celeb_id: input.celebId,
        content_id: contentResult.contentId,
        status: item.status,
        review: item.itemReview,
        source_url: item.itemSourceUrl || input.sourceUrl,
      })

      savedCount++
    } catch (err) {
      console.error('[saveCollectedContents] Error saving item:', err)
    }
  }

  return { success: true, savedCount }
}
// #endregion
