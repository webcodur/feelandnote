import type { Metadata } from 'next'
import { createClient } from '@/lib/db/server'

export const metadata: Metadata = {
  title: '플레이리스트',
}
import PlaylistsClient from './PlaylistsClient'

export default async function PlaylistsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; visibility?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const visibilityFilter = params.visibility || ''
  const perPage = 24

  const db = await createClient()

  let query = db
    .from('flows')
    .select(
      `
      *,
      account:user_accounts!flows_accounts_fkey(
        id,
        member:member_profiles!member_profiles_id_fkey(id, nickname, avatar_url)
      ),
      items:flow_nodes!playlist_items_playlist_id_fkey(id)
    `,
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })

  if (visibilityFilter === 'public') {
    query = query.eq('is_public', true)
  } else if (visibilityFilter === 'private') {
    query = query.eq('is_public', false)
  }

  const { data: flowRows, count, error: flowsError } = await query.range(
    (page - 1) * perPage,
    page * perPage - 1
  )

  if (flowsError) throw new Error(`Failed to load collections: ${flowsError.message}`)

  const playlists = (flowRows ?? []).map((row) => {
    const account = Array.isArray(row.account) ? row.account[0] : row.account
    const member = Array.isArray(account?.member) ? account.member[0] : account?.member
    return { ...row, user: member ?? null }
  })

  const total = count || 0
  const totalPages = Math.ceil(total / perPage)

  const { count: publicCount, error: publicCountError } = await db
    .from('flows')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true)

  if (publicCountError) {
    throw new Error(`Failed to load public collection count: ${publicCountError.message}`)
  }

  const visibilityFilterOptions = [
    { value: '', label: '전체' },
    { value: 'public', label: '공개', count: publicCount || 0 },
    { value: 'private', label: '비공개', count: (total || 0) - (publicCount || 0) },
  ]

  return (
    <PlaylistsClient
      playlists={playlists}
      total={total}
      page={page}
      totalPages={totalPages}
      visibilityFilter={visibilityFilter}
      visibilityFilterOptions={visibilityFilterOptions}
    />
  )
}
