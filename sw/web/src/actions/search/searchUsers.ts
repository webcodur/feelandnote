'use server'

import { unstable_cache } from 'next/cache'
import { throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { getTitleInfo } from '@/constants/titles'

export interface UserSearchResult {
  id: string
  nickname: string
  username: string
  avatarUrl?: string
  followerCount: number
  isFollowing: boolean
  selectedTitle: { name: string; grade: string } | null
}

interface SearchUsersParams {
  query: string
  followingOnly?: boolean
  page?: number
  limit?: number
}

interface SearchUsersResponse {
  items: UserSearchResult[]
  total: number
  hasMore: boolean
}

interface PublicUserSearchData {
  users: Array<{ id: string; nickname: string; avatar_url: string | null; selected_title: string | null }>
  total: number
  followerCountMap: Record<string, number>
}

async function fetchSearchUsersPublic(
  query: string,
  page: number,
  limit: number,
): Promise<PublicUserSearchData> {
  const supabase = createStaticClient()
  const offset = (page - 1) * limit

  const { data: users, count, error } = await supabase
    .from('member_profiles')
    .select('id, nickname, avatar_url, selected_title', { count: 'exact' })
    .ilike('nickname', `%${query}%`)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  throwOnQueryError('사용자 검색', error)

  if (!users || users.length === 0) {
    return { users: [], total: count ?? 0, followerCountMap: {} }
  }

  const { data: followerCounts } = await supabase
    .from('member_social_stats')
    .select('member_id, follower_count')
    .in('member_id', users.map(u => u.id))

  const followerCountMap: Record<string, number> = {}
  ;(followerCounts || []).forEach(stat => {
    followerCountMap[stat.member_id] = stat.follower_count || 0
  })

  return {
    users: users as PublicUserSearchData['users'],
    total: count ?? 0,
    followerCountMap,
  }
}

const getSearchUsersPublicCached = unstable_cache(
  fetchSearchUsersPublic,
  ['search-users'],
  { revalidate: 3600 }
)

export async function searchUsers({
  query,
  followingOnly = false,
  page = 1,
  limit = 20,
}: SearchUsersParams): Promise<SearchUsersResponse> {
  if (!query.trim()) {
    return { items: [], total: 0, hasMore: false }
  }

  const pub = await withQueryFallback('searchUsers', () => getSearchUsersPublicCached(query.trim(), page, limit), { users: [], total: 0, followerCountMap: {} })
  if (pub.users.length === 0) {
    return { items: [], total: pub.total, hasMore: false }
  }

  // 동적: 현재 사용자의 팔로우 여부 (캐시 불가)
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  let followingIds: string[] = []
  if (currentUser) {
    const { data: follows } = await supabase
      .from('member_member_follows')
      .select('followed_member_id')
      .eq('follower_member_id', currentUser.id)
      .in('followed_member_id', pub.users.map(u => u.id))

    followingIds = (follows || []).map(f => f.followed_member_id)
  }

  let items: UserSearchResult[] = pub.users.map((user) => ({
    id: user.id,
    nickname: user.nickname || '사용자',
    username: `@user_${user.id.slice(0, 8)}`,
    avatarUrl: user.avatar_url ?? undefined,
    followerCount: pub.followerCountMap[user.id] || 0,
    isFollowing: followingIds.includes(user.id),
    selectedTitle: getTitleInfo(user.selected_title),
  }))

  if (followingOnly) {
    items = items.filter(u => u.isFollowing)
  }

  const offset = (page - 1) * limit

  return {
    items,
    total: pub.total,
    hasMore: offset + items.length < pub.total,
  }
}
