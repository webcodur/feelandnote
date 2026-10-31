'use server'

import { cachedDetail, LIST_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import type { DatabaseClient } from '@feelandnote/db'
import { createClient } from '@/lib/db/server'
import { createStaticClient } from '@/lib/db/static'
import { memberContentCacheId } from '@/lib/memberContentCache'
import type { ContentType, ContentStatus } from '@/types/database'
import type { ContentTypeCounts } from '@/types/content'

const CONTENT_TYPES: ContentType[] = ['BOOK', 'VIDEO', 'GAME', 'MUSIC']

function zeroCounts(): ContentTypeCounts {
  return { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 }
}

// 타입별 head 카운트 집계 — row 페치 없이 count만 송출
async function countByType(
  db: DatabaseClient,
  userId: string,
  publicOnly: boolean,
  ownerKind: 'member' | 'celeb' = 'member',
  status?: ContentStatus,
): Promise<ContentTypeCounts> {
  const counts = zeroCounts()
  const archiveTable = ownerKind === 'celeb' ? 'celeb_contents' : 'member_contents'
  const ownerColumn = ownerKind === 'celeb' ? 'celeb_id' : 'member_id'

  await Promise.all(
    CONTENT_TYPES.map(async (type) => {
      let query = db
        .from(archiveTable)
        .select('content:contents!inner(type)', { count: 'exact', head: true })
        .eq(ownerColumn, userId)
        .eq('content.type', type)
      if (status) query = query.eq('status', status)

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

// 회원 목록과 동일한 감상 상태로 집계한다. 생략하면 보관한 기록 전체다.
export async function getContentCounts(status?: ContentStatus): Promise<ContentTypeCounts> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) {
    return zeroCounts()
  }

  // egress-allow: 본인 서재 카운트 — 추가/삭제 즉시 반영 필요, 캐시 부적합 (head 카운트만 송출)
  return countByType(db, user.id, false, 'member', status)
}

// 특정 사용자의 공개 콘텐츠 타입별 개수 (FINISHED) — 공개 테이블, 캐시
export async function getUserContentCounts(userId: string, status?: ContentStatus): Promise<ContentTypeCounts> {
  return cachedDetail(CACHE_TAGS.CONTENTS, memberContentCacheId(userId),
    ['user-content-counts-v3-consumption', userId, status ?? 'all'],
    () => countByType(createStaticClient(), userId, true, 'member', status),
    { revalidate: LIST_REVALIDATE })
}

// 특정 셀럽의 공개 콘텐츠 타입별 개수 (FINISHED) — celeb_contents, 캐시.
// 셀럽 서가는 member_contents가 아니라 celeb_contents에 있어 카운트 조회 테이블을 갈라야 한다.
export async function getCelebContentCounts(userId: string): Promise<ContentTypeCounts> {
  // 목록과 같은 인물 태그로 만료해야 책을 추가한 뒤 이전 권수만 남지 않는다.
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    userId,
    ['celeb-content-counts-v2-consumption', userId],
    () => countByType(createStaticClient(), userId, true, 'celeb', 'FINISHED'),
    { revalidate: LIST_REVALIDATE, extraTags: [CACHE_TAGS.CONTENTS] },
  )
}
