'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType, ContentStatus } from '@/types/database'

interface ExportParams {
  type?: ContentType
  status?: ContentStatus
}

export interface ExportContentRow {
  title: string
  creator: string
  type: string
  status: string
  category: string | null
  rating: number | null
  review: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

const STATUS_LABELS: Record<string, string> = {
  WANT: '보고싶어요',
  WATCHING: '보는 중',
  FINISHED: '완료',
}

const TYPE_LABELS: Record<string, string> = {
  BOOK: '도서',
  VIDEO: '영상',
  GAME: '게임',
  MUSIC: '음악',
  CERTIFICATE: '자격증',
}

export async function getContentsForExport(params: ExportParams = {}): Promise<ExportContentRow[]> {
  const supabase = await createClient()
  const { type, status } = params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const contentJoin = type ? 'content:contents!inner(*)' : 'content:contents(*)'

  let query = supabase
    .from('user_contents')
    .select(`
      *,
      ${contentJoin}
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (type) {
    query = query.eq('content.type', type)
  }


  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('내보내기 데이터 조회 에러:', error)
    throw new Error('데이터를 불러오는데 실패했습니다')
  }

  // 내보내기용 형식으로 변환
  const rows: ExportContentRow[] = (data || [])
    .filter(item => item.content !== null)
    .map(item => ({
      title: item.content.title,
      creator: item.content.creator || '',
      type: TYPE_LABELS[item.content.type] || item.content.type,
      status: STATUS_LABELS[item.status] || item.status,
      category: item.content.subtype || null,
      rating: item.rating,
      review: item.review,
      created_at: new Date(item.created_at).toLocaleDateString('ko-KR'),
      updated_at: new Date(item.updated_at).toLocaleDateString('ko-KR'),
      completed_at: item.completed_at ? new Date(item.completed_at).toLocaleDateString('ko-KR') : null,
    }))

  return rows
}
