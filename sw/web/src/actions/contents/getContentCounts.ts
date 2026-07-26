'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import type { ContentType } from '@/types/database'
import type { ContentTypeCounts } from '@/types/content'

const CONTENT_TYPES: ContentType[] = ['BOOK', 'VIDEO', 'GAME', 'MUSIC']

function zeroCounts(): ContentTypeCounts {
  return { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 }
}

// 타입별 head 카운트 집계 — row 페치 없이 count만 송출
async function countByType(
  supabase: SupabaseClient,
  userId: string,
  publicOnly: boolean,
): Promise<ContentTypeCounts> {
  const counts = zeroCounts()

  await Promise.all(
    CONTENT_TYPES.map(async (type) => {
      let query = supabase
        .from('user_contents')
        .select('content:contents!inner(type)', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'FINISHED')
        .eq('content.type', type)

      if (publicOnly) {
        query = query.eq('visibility', 'public')
      }

      const { count, error } = await query
      if (error) {
        console.error('콘텐츠 개수 조회 에러:', error)
        return
      }
      counts[type] = count ?? 0
    })
  )

  return counts
}

// 본인 콘텐츠 타입별 개수 (FINISHED)
export async function getContentCounts(): Promise<ContentTypeCounts> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return zeroCounts()
  }

  // egress-allow: 본인 서재 카운트 — 추가/삭제 즉시 반영 필요, 캐시 부적합 (head 카운트만 송출)
  return countByType(supabase, user.id, false)
}

// 특정 사용자의 공개 콘텐츠 타입별 개수 (FINISHED) — 공개 테이블, 캐시
const getCachedUserContentCounts = unstable_cache(
  async (userId: string) => countByType(createStaticClient(), userId, true),
  ['user-content-counts'],
  { revalidate: 3600, tags: [CACHE_TAGS.CONTENTS] }
)

export async function getUserContentCounts(userId: string): Promise<ContentTypeCounts> {
  return getCachedUserContentCounts(userId)
}
