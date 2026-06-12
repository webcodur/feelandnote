'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import type { ContentType } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

export interface UserContentWithDetails {
  id: string
  user_id: string
  content_id: string
  status: string
  rating: number | null
  review: string | null
  is_spoiler: boolean | null
  created_at: string
  updated_at: string
  content: {
    id: string
    type: ContentType
    title: string
    creator: string | null
    thumbnail_url: string | null
    metadata: Record<string, unknown> | null
  }
}

// 콘텐츠 자체 정보 (인증 비의존, 공개 테이블) — 캐시 내부
async function fetchContentPublic(
  contentId: string,
  locale: string,
): Promise<UserContentWithDetails['content'] | null> {
  const supabase = createStaticClient()

  const { data } = await supabase
    .from('contents')
    .select(`id, type, metadata, content_locales(${CL_SELECT_LIST})`)
    .eq('id', contentId)
    .maybeSingle()

  if (!data) return null

  const flat = flattenLocales(data.content_locales as ContentLocaleRow[] | null, locale)
  return {
    id: data.id as string,
    type: data.type as ContentType,
    title: flat.title,
    creator: flat.creator,
    thumbnail_url: flat.thumbnail_url,
    metadata: data.metadata as Record<string, unknown> | null,
  }
}

const fetchContentPublicCached = unstable_cache(
  fetchContentPublic,
  ['content-public-brief'],
  { revalidate: 3600, tags: ['celebs'] }
)

// 본인 기록 + 콘텐츠 정보 조회 (독서 모드 페이지용)
export async function getContent(contentId: string): Promise<UserContentWithDetails> {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const locale = await getLocale()

  // egress-allow: 본인 기록 단건 — 수정 즉시 반영 필요, 캐시 부적합
  const recordQuery = supabase
    .from('user_contents')
    .select('id, user_id, content_id, status, rating, review, is_spoiler, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .single()

  const [{ data: record, error }, content] = await Promise.all([
    recordQuery,
    fetchContentPublicCached(contentId, locale),
  ])

  if (error || !record || !content) {
    throw new Error('콘텐츠를 찾을 수 없습니다')
  }

  return { ...record, content }
}
