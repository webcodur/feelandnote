import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '플레이리스트',
}
import PlaylistsClient from './PlaylistsClient'

const CONTENT_TYPE_CONFIG = {
  BOOK: { label: '도서', color: 'info' },
  VIDEO: { label: '영상', color: 'danger' },
  GAME: { label: '게임', color: 'success' },
  MUSIC: { label: '음악', color: 'purple' },
  CERTIFICATE: { label: '자격증', color: 'warning' },
}

export default async function PlaylistsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; visibility?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const typeFilter = params.type || ''
  const visibilityFilter = params.visibility || ''
  const perPage = 24

  const supabase = await createClient()

  let query = supabase
    .from('playlists')
    .select(
      `
      *,
      user:user_id (id, nickname, avatar_url),
      items:playlist_items (id)
    `,
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })

  if (typeFilter) {
    query = query.eq('content_type', typeFilter)
  }

  if (visibilityFilter === 'public') {
    query = query.eq('is_public', true)
  } else if (visibilityFilter === 'private') {
    query = query.eq('is_public', false)
  }

  const { data: playlists, count } = await query.range(
    (page - 1) * perPage,
    page * perPage - 1
  )

  const total = count || 0
  const totalPages = Math.ceil(total / perPage)

  // 통계
  const { data: typeStats } = await supabase.from('playlists').select('content_type')
  const typeCountMap = (typeStats || []).reduce((acc, item) => {
    if (item.content_type) {
      acc[item.content_type] = (acc[item.content_type] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const { count: publicCount } = await supabase
    .from('playlists')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true)

  const typeFilterOptions = [
    { value: '', label: '전체', count: total },
    ...Object.entries(CONTENT_TYPE_CONFIG).map(([key, config]) => ({
      value: key,
      label: config.label,
      count: typeCountMap[key] || 0,
    })),
  ]

  const visibilityFilterOptions = [
    { value: '', label: '전체' },
    { value: 'public', label: '공개', count: publicCount || 0 },
    { value: 'private', label: '비공개', count: (total || 0) - (publicCount || 0) },
  ]

  return (
    <PlaylistsClient
      playlists={playlists || []}
      total={total}
      page={page}
      totalPages={totalPages}
      typeFilter={typeFilter}
      visibilityFilter={visibilityFilter}
      typeFilterOptions={typeFilterOptions}
      visibilityFilterOptions={visibilityFilterOptions}
      contentTypeConfig={CONTENT_TYPE_CONFIG}
    />
  )
}
