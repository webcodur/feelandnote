import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '노트',
}
import NotesClient from './NotesClient'

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; visibility?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const visibilityFilter = params.visibility || ''
  const perPage = 24

  const supabase = await createClient()

  let query = supabase
    .from('notes')
    .select(
      `
      *,
      user:user_id (id, nickname, avatar_url),
      content:content_id (id, title, type, thumbnail_url),
      sections:note_sections (id, title, is_completed)
    `,
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })

  if (visibilityFilter) {
    query = query.eq('visibility', visibilityFilter)
  }

  const { data: notes, count } = await query.range(
    (page - 1) * perPage,
    page * perPage - 1
  )

  const total = count || 0
  const totalPages = Math.ceil(total / perPage)

  // 공개 설정별 통계
  const { data: visibilityStats } = await supabase.from('notes').select('visibility')
  const visibilityCountMap = (visibilityStats || []).reduce((acc, item) => {
    acc[item.visibility] = (acc[item.visibility] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const filterOptions = [
    { value: '', label: '전체', count: total },
    { value: 'public', label: '공개', count: visibilityCountMap.public || 0 },
    { value: 'followers', label: '팔로워', count: visibilityCountMap.followers || 0 },
    { value: 'private', label: '비공개', count: visibilityCountMap.private || 0 },
  ]

  return (
    <NotesClient
      notes={notes || []}
      total={total}
      page={page}
      totalPages={totalPages}
      visibilityFilter={visibilityFilter}
      filterOptions={filterOptions}
    />
  )
}
