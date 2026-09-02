import type { Metadata } from 'next'
import { createClient } from '@/lib/db/server'

export const metadata: Metadata = {
  title: '방명록',
}
import GuestbooksClient from './GuestbooksClient'

export default async function GuestbooksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const filter = params.filter || ''
  const perPage = 20

  const db = await createClient()

  let memberQuery = db
    .from('member_guestbook_entries')
    .select(
      `
      id, owner_member_id, author_member_id, content, is_private, is_read, created_at, updated_at,
      owner:user_accounts!member_guestbook_entries_owner_member_id_fkey(
        id,
        member:member_profiles!member_profiles_id_fkey(id, nickname, avatar_url)
      ),
      author_account:user_accounts!member_guestbook_entries_author_member_id_fkey(
        id,
        member:member_profiles!member_profiles_id_fkey(id, nickname, avatar_url)
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  let celebQuery = db
    .from('celeb_guestbook_entries')
    .select(
      `
      id, celeb_id, author_member_id, content, is_private, is_read, created_at, updated_at,
      subject:celebs!celeb_guestbook_entries_celeb_id_fkey(id, slug, nickname, avatar_url),
      author_account:user_accounts!celeb_guestbook_entries_author_member_id_fkey(
        id,
        member:member_profiles!member_profiles_id_fkey(id, nickname, avatar_url)
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (filter === 'private') {
    memberQuery = memberQuery.eq('is_private', true)
    celebQuery = celebQuery.eq('is_private', true)
  } else if (filter === 'unread') {
    memberQuery = memberQuery.eq('is_read', false)
    celebQuery = celebQuery.eq('is_read', false)
  }

  const fetchLimit = page * perPage
  const [memberResult, celebResult] = await Promise.all([
    memberQuery.limit(fetchLimit),
    celebQuery.limit(fetchLimit),
  ])

  if (memberResult.error || celebResult.error) {
    throw new Error(
      `Failed to load guestbooks: ${memberResult.error?.message ?? celebResult.error?.message}`
    )
  }

  const memberEntries = (memberResult.data ?? []).map((row) => {
    const ownerAccount = Array.isArray(row.owner) ? row.owner[0] : row.owner
    const profile = Array.isArray(ownerAccount?.member)
      ? ownerAccount.member[0]
      : ownerAccount?.member
    const authorAccount = Array.isArray(row.author_account)
      ? row.author_account[0]
      : row.author_account
    const author = Array.isArray(authorAccount?.member)
      ? authorAccount.member[0]
      : authorAccount?.member
    return {
      ...row,
      subject_id: row.owner_member_id,
      subject_kind: 'member' as const,
      profile: profile ? { ...profile, slug: null } : null,
      author: author ?? null,
    }
  })
  const celebEntries = (celebResult.data ?? []).map((row) => {
    const profile = Array.isArray(row.subject) ? row.subject[0] : row.subject
    const authorAccount = Array.isArray(row.author_account)
      ? row.author_account[0]
      : row.author_account
    const author = Array.isArray(authorAccount?.member)
      ? authorAccount.member[0]
      : authorAccount?.member
    return {
      ...row,
      subject_id: row.celeb_id,
      subject_kind: 'celeb' as const,
      profile: profile ?? null,
      author: author ?? null,
    }
  })

  const entries = [...memberEntries, ...celebEntries]
    .sort((a, b) => Date.parse(b.created_at ?? '') - Date.parse(a.created_at ?? ''))
    .slice((page - 1) * perPage, page * perPage)

  const total = (memberResult.count ?? 0) + (celebResult.count ?? 0)
  const totalPages = Math.ceil(total / perPage)

  // 통계
  const [memberPrivate, celebPrivate, memberUnread, celebUnread] = await Promise.all([
    db
      .from('member_guestbook_entries')
      .select('*', { count: 'exact', head: true })
      .eq('is_private', true),
    db
      .from('celeb_guestbook_entries')
      .select('*', { count: 'exact', head: true })
      .eq('is_private', true),
    db
      .from('member_guestbook_entries')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false),
    db
      .from('celeb_guestbook_entries')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false),
  ])

  const statsError = [memberPrivate.error, celebPrivate.error, memberUnread.error, celebUnread.error]
    .find(Boolean)
  if (statsError) throw new Error(`Failed to load guestbook statistics: ${statsError.message}`)

  const privateCount = (memberPrivate.count ?? 0) + (celebPrivate.count ?? 0)
  const unreadCount = (memberUnread.count ?? 0) + (celebUnread.count ?? 0)

  const filterOptions = [
    { value: '', label: '전체', count: total },
    { value: 'private', label: '비공개', count: privateCount || 0 },
    { value: 'unread', label: '미확인', count: unreadCount || 0 },
  ]

  return (
    <GuestbooksClient
      entries={entries}
      total={total}
      page={page}
      totalPages={totalPages}
      filter={filter}
      filterOptions={filterOptions}
    />
  )
}
