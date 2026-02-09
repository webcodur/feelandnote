'use server'

import { createClient } from '@/lib/supabase/server'
import { getContentById, type ContentDetail } from './getContentById'
import { fetchContentMetadata } from './fetchContentMetadata'
import { getReviewFeed, type ReviewFeedItem } from './getReviewFeed'
import { getProfile } from '@/actions/user'
import type { CategoryId } from '@/constants/categories'
import type { ContentType, ContentStatus } from '@/types/database'

// #region 타입 정의
export interface ContentDetailData {
  // 콘텐츠 정보
  content: {
    id: string
    title: string
    creator?: string
    thumbnail?: string
    description?: string
    releaseDate?: string
    type: ContentType
    category: CategoryId
    metadata?: Record<string, unknown> | null
  }
  // 사용자 기록 (없으면 null)
  userRecord: {
    id: string
    status: ContentStatus
    rating: number | null
    review: string | null
    isSpoiler: boolean
    createdAt: string
    updatedAt: string
  } | null
  // 메타 정보
  isLoggedIn: boolean
  // 초기 리뷰 데이터 (서버에서 프리페치)
  initialReviews: ReviewFeedItem[]
}
// #endregion

// 타입 매핑
const TYPE_TO_CATEGORY: Record<ContentType, CategoryId> = {
  BOOK: 'book',
  VIDEO: 'video',
  GAME: 'game',
  MUSIC: 'music',
  CERTIFICATE: 'certificate',
}

export async function getContentDetail(
  contentId: string,
  category?: CategoryId
): Promise<ContentDetailData> {
  const supabase = await createClient()
  const profile = await getProfile()

  // 1. 로그인 사용자의 기록 확인
  let userRecord: ContentDetailData['userRecord'] = null
  let savedContent: { id: string; type: ContentType; title: string; creator?: string; thumbnail_url?: string; description?: string; release_date?: string } | null = null

  if (profile) {
    const { data } = await supabase
      .from('user_contents')
      .select(`
        id, status, rating, review, is_spoiler, created_at, updated_at,
        content:contents(id, type, title, creator, thumbnail_url, description, release_date)
      `)
      .eq('user_id', profile.id)
      .eq('content_id', contentId)
      .single()

    if (data) {
      const content = Array.isArray(data.content) ? data.content[0] : data.content
      savedContent = content
      userRecord = {
        id: data.id,
        status: data.status as ContentStatus,
        rating: data.rating,
        review: data.review,
        isSpoiler: data.is_spoiler ?? false,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    }
  }

  // 2. 콘텐츠 정보 구성
  let contentData: ContentDetailData['content']

  if (savedContent) {
    // DB에 저장된 콘텐츠 정보 사용
    const categoryId = TYPE_TO_CATEGORY[savedContent.type]
    const metadataResult = await fetchContentMetadata(savedContent.id, savedContent.type)

    contentData = {
      id: savedContent.id,
      title: savedContent.title,
      creator: savedContent.creator || undefined,
      thumbnail: savedContent.thumbnail_url || undefined,
      description: savedContent.description || (metadataResult.metadata?.description as string) || undefined,
      releaseDate: savedContent.release_date || undefined,
      type: savedContent.type,
      category: categoryId,
      metadata: metadataResult.metadata,
    }
  } else {
    // contents 테이블에서 직접 조회 (셀럽 콘텐츠 등 본인 기록이 아닌 경우)
    const { data: dbContent } = await supabase
      .from('contents')
      .select('id, type, title, creator, thumbnail_url, description, release_date')
      .eq('id', contentId)
      .single()

    if (dbContent) {
      const categoryId = TYPE_TO_CATEGORY[dbContent.type as ContentType]
      const metadataResult = await fetchContentMetadata(dbContent.id, dbContent.type as ContentType)

      contentData = {
        id: dbContent.id,
        title: dbContent.title,
        creator: dbContent.creator || undefined,
        thumbnail: dbContent.thumbnail_url || undefined,
        description: dbContent.description || undefined,
        releaseDate: dbContent.release_date || undefined,
        type: dbContent.type as ContentType,
        category: categoryId,
        metadata: metadataResult.metadata,
      }
    } else {
      // 외부 API에서 조회 (category 필수)
      if (!category) {
        throw new Error('카테고리가 필요합니다')
      }

      const apiContent = await getContentById(contentId, category)
      if (!apiContent) {
        throw new Error('콘텐츠를 찾을 수 없습니다')
      }

      const typeMap: Record<CategoryId, ContentType> = {
        book: 'BOOK',
        video: 'VIDEO',
        game: 'GAME',
        music: 'MUSIC',
        certificate: 'CERTIFICATE',
        all: 'BOOK',
      }

      contentData = {
        id: apiContent.id,
        title: apiContent.title,
        creator: apiContent.creator || undefined,
        thumbnail: apiContent.thumbnail || undefined,
        description: apiContent.description || undefined,
        releaseDate: apiContent.releaseDate || undefined,
        type: typeMap[category],
        category,
        metadata: apiContent.metadata || null,
      }
    }
  }

  // 3. 리뷰 데이터 프리페치
  const initialReviews = await getReviewFeed({ contentId, limit: 10 })

  return {
    content: contentData,
    userRecord,
    isLoggedIn: !!profile,
    initialReviews,
  }
}
