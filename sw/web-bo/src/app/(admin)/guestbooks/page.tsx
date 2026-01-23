import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

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

  const supabase = await createClient()

  let query = supabase
    .from('guestbook_entries')
    .select(
      `
      *,
      profile:profile_id (id, nickname, avatar_url),
      author:author_id (id, nickname, avatar_url)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (filter === 'private') {
    query = query.eq('is_private', true)
  } else if (filter === 'unread') {
    query = query.eq('is_read', false)
  }

  const { data: entries, count } = await query.range(
    (page - 1) * perPage,
    page * perPage - 1
  )

  const total = count || 0
  const totalPages = Math.ceil(total / perPage)

  // 통계
  const [{ count: privateCount }, { count: unreadCount }] = await Promise.all([
    supabase
      .from('guestbook_entries')
      .select('*', { count: 'exact', head: true })
      .eq('is_private', true),
    supabase
      .from('guestbook_entries')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false),
  ])

  const filterOptions = [
    { value: '', label: '전체', count: total },
    { value: 'private', label: '비공개', count: privateCount || 0 },
    { value: 'unread', label: '미확인', count: unreadCount || 0 },
  ]

  return (
    <GuestbooksClient
      entries={entries || []}
      total={total}
      page={page}
      totalPages={totalPages}
      filter={filter}
      filterOptions={filterOptions}
    />
  )
}
