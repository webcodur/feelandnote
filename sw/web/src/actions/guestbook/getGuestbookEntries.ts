'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { getBlockedUserIds, filterBlocked } from '@/lib/moderation/blockFilter'
import type { GuestbookEntryWithAuthor } from '@/types/database'

interface GetGuestbookEntriesParams {
  profileId: string
  limit?: number
  offset?: number
}

async function fetchGuestbookEntries(
  profileId: string,
  limit: number,
  offset: number,
) {
  const supabase = createStaticClient()

  const { data, error, count } = await supabase
    .from('guestbook_entries')
    .select(`
      *,
      author:profiles!author_id(id, nickname, avatar_url)
    `, { count: 'exact' })
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Get guestbook entries error:', error)
    throw new Error('방명록을 불러오는데 실패했습니다')
  }

  return {
    entries: data as GuestbookEntryWithAuthor[],
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit
  }
}

const getGuestbookEntriesCached = unstable_cache(
  fetchGuestbookEntries,
  ['guestbook-entries'],
  // 사용자 활동(guestbook_entries)이다. BO 방명록 화면은 신고 삭제만 하며 셀럽·콘텐츠 저장과 무관하다.
  { revalidate: 3600 }
)

// 셀럽 공개 문서의 ISR 첫 화면용. viewer의 차단 목록은 공유 캐시에 넣지 않고,
// 로그인 사용자만 클라이언트에서 getGuestbookEntries로 다시 필터링한다.
export async function getPublicGuestbookEntries(params: GetGuestbookEntriesParams) {
  const { profileId, limit = 20, offset = 0 } = params
  // 바깥의 셀럽 ISR 문서가 이 결과를 보관한다. 여기서 1시간 Data Cache를
  // 중첩하면 페이지 전체의 7일 재검증 주기를 1시간으로 낮출 수 있어 직접 읽는다.
  return fetchGuestbookEntries(profileId, limit, offset)
}

export async function getGuestbookEntries(params: GetGuestbookEntriesParams) {
  const { profileId, limit = 20, offset = 0 } = params
  const cached = await getGuestbookEntriesCached(profileId, limit, offset)

  // 🔴 차단 필터는 반드시 캐시 밖에서 적용한다.
  // 위 캐시는 profileId·limit·offset 만 키로 쓰며 보는 사람과 무관하게 공유된다.
  // 차단 목록을 캐시 안에서 읽으면 한 사람의 차단 결과가 전체 사용자에게 캐시된다.
  const blockedIds = await getBlockedUserIds()
  if (blockedIds.length === 0) return cached

  const entries = filterBlocked(cached.entries, (entry) => entry.author_id, blockedIds)
  const removed = cached.entries.length - entries.length

  return {
    entries,
    // 걸러낸 만큼만 줄인다. 뒷 페이지의 차단 글은 알 수 없어 정확한 값이 아니다.
    total: Math.max(cached.total - removed, entries.length),
    hasMore: cached.hasMore,
  }
}
