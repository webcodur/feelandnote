'use server'

import { createClient } from '@/lib/supabase/server'

export interface UserSearchResult {
  id: string
  nickname: string
  username: string
  avatarUrl?: string
  followerCount: number
  isFollowing: boolean
  selectedTitle: { id: string; name: string; grade: string } | null
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

export async function searchUsers({
  query,
  followingOnly = false,
  page = 1,
  limit = 20,
}: SearchUsersParams): Promise<SearchUsersResponse> {
  if (!query.trim()) {
    return { items: [], total: 0, hasMore: false }
  }

  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const offset = (page - 1) * limit

  // 사용자 검색 쿼리 (칭호 포함)
  let searchQuery = supabase
    .from('profiles')
    .select(`
      id, nickname, username, avatar_url,
      selected_title:titles!profiles_selected_title_id_fkey(id, name, grade)
    `, { count: 'exact' })
    .or(`nickname.ilike.%${query}%,username.ilike.%${query}%`)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  const { data: users, count, error } = await searchQuery

  if (error) {
    console.error('사용자 검색 에러:', error)
    return { items: [], total: 0, hasMore: false }
  }

  if (!users || users.length === 0) {
    return { items: [], total: 0, hasMore: false }
  }

  // 팔로우 관계 조회
  let followingIds: string[] = []
  if (currentUser) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUser.id)
      .in('following_id', users.map(u => u.id))

    followingIds = (follows || []).map(f => f.following_id)
  }

  // 팔로워 수 조회
  const { data: followerCounts } = await supabase
    .from('follows')
    .select('following_id')
    .in('following_id', users.map(u => u.id))

  const followerCountMap: Record<string, number> = {}
  ;(followerCounts || []).forEach(f => {
    followerCountMap[f.following_id] = (followerCountMap[f.following_id] || 0) + 1
  })

  type TitleData = { id: string; name: string; grade: string } | null

  let items: UserSearchResult[] = users.map((user) => ({
    id: user.id,
    nickname: user.nickname || '사용자',
    username: user.username ? `@${user.username}` : `@user_${user.id.slice(0, 8)}`,
    avatarUrl: user.avatar_url,
    followerCount: followerCountMap[user.id] || 0,
    isFollowing: followingIds.includes(user.id),
    selectedTitle: (user.selected_title as TitleData) || null,
  }))

  // 팔로잉만 필터
  if (followingOnly) {
    items = items.filter(u => u.isFollowing)
  }

  const total = count || 0

  return {
    items,
    total,
    hasMore: offset + items.length < total,
  }
}
