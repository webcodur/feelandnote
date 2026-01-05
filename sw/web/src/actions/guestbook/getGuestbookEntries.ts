'use server'

import { createClient } from '@/lib/supabase/server'
import type { GuestbookEntryWithAuthor } from '@/types/database'

interface GetGuestbookEntriesParams {
  profileId: string
  limit?: number
  offset?: number
}

export async function getGuestbookEntries(params: GetGuestbookEntriesParams) {
  const { profileId, limit = 20, offset = 0 } = params
  const supabase = await createClient()

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
