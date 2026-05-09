'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
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
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getGuestbookEntries(params: GetGuestbookEntriesParams) {
  const { profileId, limit = 20, offset = 0 } = params
  return getGuestbookEntriesCached(profileId, limit, offset)
}
