'use server'

import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { getBlockedUserIds, filterBlocked } from '@/lib/moderation/blockFilter'
import type { GuestbookEntryWithAuthor } from '@/types/database'

interface GetGuestbookEntriesParams {
  profileId: string
  subjectKind: GuestbookSubjectKind
  limit?: number
  offset?: number
}

type GuestbookSubjectKind = 'member' | 'celeb'
type AnySupabase = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createStaticClient>

async function fetchGuestbookEntries(
  supabase: AnySupabase,
  profileId: string,
  limit: number,
  offset: number,
  subjectKind: GuestbookSubjectKind,
) {
  const table = subjectKind === 'member' ? 'member_guestbook_entries' : 'celeb_guestbook_entries'
  const ownerColumn = subjectKind === 'member' ? 'owner_member_id' : 'celeb_id'

  const { data, error, count } = await supabase
    .from(table)
    .select(`
      id,
      profile_id:${ownerColumn},
      author_id:author_member_id,
      content,
      is_private,
      is_read,
      created_at,
      updated_at
    `, { count: 'exact' })
    .eq(ownerColumn, profileId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Get guestbook entries error:', error)
    throw new Error('방명록을 불러오는데 실패했습니다')
  }

  const rows = (data || []) as unknown as Array<{
    id: string
    profile_id: string
    author_id: string
    content: string
    is_private: boolean
    created_at: string
    updated_at: string
  }>
  const authorIds = [...new Set(rows.map(row => row.author_id))]
  const authorResult = authorIds.length
    ? await supabase
        .from('member_profiles')
        .select('id, nickname, avatar_url')
        .in('id', authorIds)
    : { data: [], error: null }

  if (authorResult.error) throw authorResult.error
  const authorMap = new Map((authorResult.data || []).map(author => [author.id, author]))
  const entries = rows
    .filter(row => authorMap.has(row.author_id))
    .map(row => ({ ...row, author: authorMap.get(row.author_id) })) as unknown as GuestbookEntryWithAuthor[]

  return {
    entries,
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit,
  }
}

// 셀럽 공개 문서의 ISR 첫 화면용. viewer의 차단 목록은 공유 캐시에 넣지 않는다.
export async function getPublicGuestbookEntries(
  params: Omit<GetGuestbookEntriesParams, 'subjectKind'>,
) {
  const { profileId, limit = 20, offset = 0 } = params
  return fetchGuestbookEntries(createStaticClient(), profileId, limit, offset, 'celeb')
}

export async function getGuestbookEntries(params: GetGuestbookEntriesParams) {
  const { profileId, subjectKind, limit = 20, offset = 0 } = params

  // 회원 방명록은 소유자·작성자에게만 보이는 비밀글이 있어 viewer 세션으로 읽어야 한다.
  const supabase = await createClient()
  const visible = await fetchGuestbookEntries(supabase, profileId, limit, offset, subjectKind)

  // 차단 필터는 viewer별 값이므로 공유 캐시 밖에서 적용한다.
  const blockedIds = await getBlockedUserIds()
  if (blockedIds.length === 0) return visible

  const entries = filterBlocked(visible.entries, entry => entry.author_id, blockedIds)
  const removed = visible.entries.length - entries.length

  return {
    entries,
    total: Math.max(visible.total - removed, entries.length),
    hasMore: visible.hasMore,
  }
}
