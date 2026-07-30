'use server'

// 차단 관리 화면용 조회.
// 로그인 사용자 본인 데이터라 캐시하지 않는다(사용자별 캐시 키는 egress 폭탄이 된다).

import { createClient } from '@/lib/supabase/server'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import {
  MODERATION_LIST_DEFAULT_LIMIT,
  MODERATION_LIST_MAX_LIMIT,
} from '@/constants/moderation'

interface GetBlockedUsersParams {
  limit?: number
  offset?: number
}

export interface BlockedUser {
  blockId: string
  userId: string
  nickname: string
  avatarUrl: string | null
  blockedAt: string | null
}

interface GetBlockedUsersData {
  users: BlockedUser[]
  total: number
  hasMore: boolean
}

type RawProfile = { id: string; nickname: string | null; avatar_url: string | null }

interface RawBlockRow {
  id: string
  created_at: string | null
  blocked: RawProfile | RawProfile[] | null
}

export async function getBlockedUsers(
  params: GetBlockedUsersParams = {}
): Promise<ActionResult<GetBlockedUsersData>> {
  const limit = Math.min(params.limit ?? MODERATION_LIST_DEFAULT_LIMIT, MODERATION_LIST_MAX_LIMIT)
  const offset = Math.max(params.offset ?? 0, 0)

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return failure('UNAUTHORIZED')

  const { data, error, count } = await supabase
    .from('blocks')
    .select(
      `
      id,
      created_at,
      blocked:profiles!blocks_blocked_id_fkey(id, nickname, avatar_url)
    `,
      { count: 'exact' }
    )
    .eq('blocker_id', user.id)
    // 동점 정렬키 함정 회피 — created_at 은 중복될 수 있어 id 를 2차 키로 고정한다
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[차단 목록 조회]' })
  }

  const rows = (data ?? []) as unknown as RawBlockRow[]

  const users: BlockedUser[] = rows.flatMap((row) => {
    const profile = Array.isArray(row.blocked) ? row.blocked[0] : row.blocked
    if (!profile) return []
    return [
      {
        blockId: row.id,
        userId: profile.id,
        nickname: profile.nickname ?? '',
        avatarUrl: profile.avatar_url,
        blockedAt: row.created_at,
      },
    ]
  })

  const total = count ?? 0

  return success({ users, total, hasMore: total > offset + limit })
}
