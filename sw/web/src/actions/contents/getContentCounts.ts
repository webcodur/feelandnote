'use server'

import { unstable_cache } from 'next/cache'
import { throwOnQueryError, withQueryFallback } from '@/lib/cache'
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
  ownerKind: 'member' | 'celeb' = 'member',
): Promise<ContentTypeCounts> {
  const counts = zeroCounts()
  const archiveTable = ownerKind === 'celeb' ? 'celeb_contents' : 'member_contents'
  const ownerColumn = ownerKind === 'celeb' ? 'celeb_id' : 'member_id'

  await Promise.all(
    CONTENT_TYPES.map(async (type) => {
      let query = supabase
        .from(archiveTable)
        .select('content:contents!inner(type)', { count: 'exact', head: true })
        .eq(ownerColumn, userId)
        .eq('status', 'FINISHED')
        .eq('content.type', type)

      if (publicOnly) {
        query = query.eq('visibility', 'public')
      }

      const { count, error } = await query
      // 한 종류만 실패해도 그 값이 0인 채로 전체가 캐시된다. 던져서 캐시에 남기지 않는다.
      throwOnQueryError(`콘텐츠 개수 조회(${type})`, error)
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
  return withQueryFallback('getContentCounts', () => countByType(supabase, user.id, false), zeroCounts())
}

// 특정 사용자의 공개 콘텐츠 타입별 개수 (FINISHED) — 공개 테이블, 캐시
const getCachedUserContentCounts = unstable_cache(
  async (userId: string) => countByType(createStaticClient(), userId, true),
  ['user-content-counts'],
  { revalidate: 3600, tags: [CACHE_TAGS.CONTENTS] }
)

export async function getUserContentCounts(userId: string): Promise<ContentTypeCounts> {
  return withQueryFallback('getUserContentCounts', () => getCachedUserContentCounts(userId), zeroCounts())
}

// 특정 셀럽의 공개 콘텐츠 타입별 개수 (FINISHED) — celeb_contents, 캐시.
// 셀럽 서가는 member_contents가 아니라 celeb_contents에 있어 카운트 조회 테이블을 갈라야 한다.
const getCachedCelebContentCounts = unstable_cache(
  async (userId: string) => countByType(createStaticClient(), userId, true, 'celeb'),
  ['celeb-content-counts'],
  { revalidate: 3600, tags: [CACHE_TAGS.CONTENTS] }
)

export async function getCelebContentCounts(userId: string): Promise<ContentTypeCounts> {
  return withQueryFallback('getCelebContentCounts', () => getCachedCelebContentCounts(userId), zeroCounts())
}
