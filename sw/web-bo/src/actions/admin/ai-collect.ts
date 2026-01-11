'use server'

import {
  fetchUrlContent,
  extractContentsFromText,
  searchExternal,
  type ContentType,
  type ExternalSearchResult,
  type ExtractedContent,
} from '@feelnnote/api-clients'
import { createClient } from '@/lib/supabase/server'
import { createContentFromExternal } from './external-search'
import { addCelebContent } from './celebs'

// #region Types
interface AICollectUrlInput {
  url: string
  celebId: string
  celebName: string
}

interface AICollectTextInput {
  text: string
  celebId: string
  celebName: string
}

export interface ExtractedContentWithSearch {
  extracted: ExtractedContent
  searchResults: Array<{
    externalId: string
    externalSource: string
    title: string
    creator: string
    coverImageUrl: string | null
    metadata: Record<string, unknown>
  }>
  itemSourceUrl?: string
  itemReview?: string
}

interface AICollectResult {
  success: boolean
  sourceUrl?: string
  items?: ExtractedContentWithSearch[]
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
  }>
}

interface SaveResult {
  success: boolean
  savedCount?: number
  error?: string
}
// #endregion

// #region extractContentsFromUrl
export async function extractContentsFromUrl(input: AICollectUrlInput): Promise<AICollectResult> {
  const supabase = await createClient()

  // 관리자 세션 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '인증이 필요합니다.' }
  }

  // 관리자의 Gemini API 키 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('gemini_api_key')
    .eq('id', user.id)
    .single()

  if (!profile?.gemini_api_key) {
    return { success: false, error: 'Gemini API 키가 설정되지 않았습니다. 프로필 설정에서 API 키를 입력해주세요.' }
  }

  // URL에서 텍스트 추출
  const fetchResult = await fetchUrlContent(input.url)
  if (!fetchResult.success || !fetchResult.text) {
    return { success: false, error: fetchResult.error || '페이지 내용을 가져올 수 없습니다.' }
  }

  // AI로 콘텐츠 추출
  const extractResult = await extractContentsFromText(profile.gemini_api_key, fetchResult.text, input.celebName)
  if (!extractResult.success || !extractResult.items) {
    return { success: false, error: extractResult.error || '콘텐츠를 추출할 수 없습니다.' }
  }

  if (extractResult.items.length === 0) {
    return { success: true, sourceUrl: input.url, items: [] }
  }

  // 각 콘텐츠별 외부 API 검색 (병렬 실행)
  // 한국어 제목이 있으면 먼저 검색, 없거나 결과 없으면 원본 제목으로 검색
  console.log('[extractContentsFromUrl] Extracted items:', JSON.stringify(extractResult.items, null, 2))

  const items: ExtractedContentWithSearch[] = await Promise.all(
    extractResult.items.map(async (extracted) => {
      try {
        let searchResults: ExtractedContentWithSearch['searchResults'] = []
        let searchedWith = ''

        // 한국어 제목으로 먼저 검색 (원본과 다를 경우에만)
        if (extracted.titleKo && extracted.titleKo !== extracted.title) {
          console.log(`[Search] Trying Korean title: "${extracted.titleKo}"`)
          const koResponse = await searchExternal(extracted.type, extracted.titleKo, 1)
          if (koResponse.items.length > 0) {
            searchedWith = extracted.titleKo
            searchResults = koResponse.items.slice(0, 5).map((item: ExternalSearchResult) => ({
              externalId: item.externalId,
              externalSource: item.externalSource,
              title: item.title,
              creator: item.creator,
              coverImageUrl: item.coverImageUrl,
              metadata: item.metadata as Record<string, unknown>,
            }))
          }
        }

        // 한국어 검색 결과가 없으면 원본 제목으로 검색
        if (searchResults.length === 0) {
          console.log(`[Search] Trying original title: "${extracted.title}"`)
          const origResponse = await searchExternal(extracted.type, extracted.title, 1)
          searchedWith = extracted.title
          searchResults = origResponse.items.slice(0, 5).map((item: ExternalSearchResult) => ({
            externalId: item.externalId,
            externalSource: item.externalSource,
            title: item.title,
            creator: item.creator,
            coverImageUrl: item.coverImageUrl,
            metadata: item.metadata as Record<string, unknown>,
          }))
        }

        console.log(`[Search] "${extracted.title}" → searched with "${searchedWith}" → ${searchResults.length} results`)
        return { extracted, searchResults, itemSourceUrl: extracted.sourceUrl, itemReview: extracted.review }
      } catch (err) {
        console.error(`[Search] Error for "${extracted.title}":`, err)
        return { extracted, searchResults: [], itemSourceUrl: extracted.sourceUrl, itemReview: extracted.review }
      }
    })
  )

  return {
    success: true,
    sourceUrl: input.url,
    items,
  }
}
// #endregion

// #region extractContentsFromTextInput
export async function extractContentsFromTextInput(input: AICollectTextInput): Promise<AICollectResult> {
  const supabase = await createClient()

  // 관리자 세션 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '인증이 필요합니다.' }
  }

  // 관리자의 Gemini API 키 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('gemini_api_key')
    .eq('id', user.id)
    .single()

  if (!profile?.gemini_api_key) {
    return { success: false, error: 'Gemini API 키가 설정되지 않았습니다. 프로필 설정에서 API 키를 입력해주세요.' }
  }

  // AI로 콘텐츠 추출
  const { extractContentsFromText: extractFromText } = await import('@feelnnote/api-clients')
  const extractResult = await extractFromText(profile.gemini_api_key, input.text, input.celebName)
  if (!extractResult.success || !extractResult.items) {
    return { success: false, error: extractResult.error || '콘텐츠를 추출할 수 없습니다.' }
  }

  if (extractResult.items.length === 0) {
    return { success: true, items: [] }
  }

  // 각 콘텐츠별 외부 API 검색 (병렬 실행)
  // 한국어 제목이 있으면 먼저 검색, 없거나 결과 없으면 원본 제목으로 검색
  console.log('[extractContentsFromTextInput] Extracted items:', JSON.stringify(extractResult.items, null, 2))

  const items: ExtractedContentWithSearch[] = await Promise.all(
    extractResult.items.map(async (extracted) => {
      try {
        let searchResults: ExtractedContentWithSearch['searchResults'] = []
        let searchedWith = ''

        // 한국어 제목으로 먼저 검색 (원본과 다를 경우에만)
        if (extracted.titleKo && extracted.titleKo !== extracted.title) {
          console.log(`[Search] Trying Korean title: "${extracted.titleKo}"`)
          const koResponse = await searchExternal(extracted.type, extracted.titleKo, 1)
          if (koResponse.items.length > 0) {
            searchedWith = extracted.titleKo
            searchResults = koResponse.items.slice(0, 5).map((item: ExternalSearchResult) => ({
              externalId: item.externalId,
              externalSource: item.externalSource,
              title: item.title,
              creator: item.creator,
              coverImageUrl: item.coverImageUrl,
              metadata: item.metadata as Record<string, unknown>,
            }))
          }
        }

        // 한국어 검색 결과가 없으면 원본 제목으로 검색
        if (searchResults.length === 0) {
          console.log(`[Search] Trying original title: "${extracted.title}"`)
          const origResponse = await searchExternal(extracted.type, extracted.title, 1)
          searchedWith = extracted.title
          searchResults = origResponse.items.slice(0, 5).map((item: ExternalSearchResult) => ({
            externalId: item.externalId,
            externalSource: item.externalSource,
            title: item.title,
            creator: item.creator,
            coverImageUrl: item.coverImageUrl,
            metadata: item.metadata as Record<string, unknown>,
          }))
        }

        console.log(`[Search] "${extracted.title}" → searched with "${searchedWith}" → ${searchResults.length} results`)
        return { extracted, searchResults, itemSourceUrl: extracted.sourceUrl, itemReview: extracted.review }
      } catch (err) {
        console.error(`[Search] Error for "${extracted.title}":`, err)
        return { extracted, searchResults: [], itemSourceUrl: extracted.sourceUrl, itemReview: extracted.review }
      }
    })
  )

  return {
    success: true,
    items,
  }
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
      const contentResult = await createContentFromExternal(
        {
          externalId: item.searchResult.externalId,
          externalSource: item.searchResult.externalSource,
          title: item.searchResult.title,
          creator: item.searchResult.creator,
          coverImageUrl: item.searchResult.coverImageUrl,
          metadata: item.searchResult.metadata,
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
