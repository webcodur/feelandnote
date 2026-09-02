import { createStaticClient } from '@/lib/db/static'
import type { MemberProfileSummary } from '@/types/database'

type BoardDatabaseClient = ReturnType<typeof createStaticClient>

interface AuthoredRow {
  author_id: string | null
}

interface ResolvedRow {
  resolved_by: string | null
}

async function getMemberProfileMap(
  db: BoardDatabaseClient,
  memberIds: Array<string | null | undefined>,
): Promise<Map<string, MemberProfileSummary>> {
  const ids = [...new Set(memberIds.filter((id): id is string => Boolean(id)))]
  if (ids.length === 0) return new Map()

  const { data, error } = await db
    .from('member_profiles')
    .select('id, nickname, avatar_url')
    .in('id', ids)

  if (error) {
    console.error('[board member profiles]', error)
    return new Map()
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile]))
}

function fallbackMemberProfile(memberId: string): MemberProfileSummary {
  return { id: memberId, nickname: null, avatar_url: null }
}

export async function attachMemberAuthors<T extends AuthoredRow>(
  db: BoardDatabaseClient,
  rows: T[],
): Promise<Array<T & { author: MemberProfileSummary | null }>> {
  const profileMap = await getMemberProfileMap(db, rows.map((row) => row.author_id))

  return rows.map((row) => ({
    ...row,
    author: row.author_id
      ? profileMap.get(row.author_id) ?? fallbackMemberProfile(row.author_id)
      : null,
  }))
}

export async function attachMemberAuthor<T extends AuthoredRow>(
  db: BoardDatabaseClient,
  row: T,
): Promise<T & { author: MemberProfileSummary | null }> {
  return (await attachMemberAuthors(db, [row]))[0]
}

export async function attachMemberAuthorAndResolver<T extends AuthoredRow & ResolvedRow>(
  db: BoardDatabaseClient,
  row: T,
): Promise<T & { author: MemberProfileSummary | null; resolver: MemberProfileSummary | null }> {
  const profileMap = await getMemberProfileMap(db, [row.author_id, row.resolved_by])

  return {
    ...row,
    author: row.author_id
      ? profileMap.get(row.author_id) ?? fallbackMemberProfile(row.author_id)
      : null,
    resolver: row.resolved_by
      ? profileMap.get(row.resolved_by) ?? fallbackMemberProfile(row.resolved_by)
      : null,
  }
}
