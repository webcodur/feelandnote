'use server'

import { createClient } from '@/lib/supabase/server'

const CONTENT_TYPES = ['BOOK', 'VIDEO', 'GAME', 'MUSIC', 'CERTIFICATE'] as const

export type ContentTypeCounts = Record<string, number>

export async function getContentTypeCounts(): Promise<ContentTypeCounts> {
  const supabase = await createClient()

  // 셀럽 ID 목록 조회
  const { data: celebs } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

  if (!celebs || celebs.length === 0) {
    return { all: 0, BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0 }
  }

  const celebIds = celebs.map(c => c.id)

  // 전체 공개 리뷰 수
  const { count: totalCount } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .in('user_id', celebIds)
    .not('review', 'is', null)
    .eq('visibility', 'public')

  // 타입별 카운트를 병렬로 조회
  const typeCountPromises = CONTENT_TYPES.map(async (type) => {
    // 해당 타입의 콘텐츠 ID 조회
    const { data: contents } = await supabase
      .from('contents')
      .select('id')
      .eq('type', type)

    if (!contents || contents.length === 0) {
      return { type, count: 0 }
    }

    const contentIds = contents.map(c => c.id)

    const { count } = await supabase
      .from('user_contents')
      .select('*', { count: 'exact', head: true })
      .in('user_id', celebIds)
      .in('content_id', contentIds)
      .not('review', 'is', null)
      .eq('visibility', 'public')

    return { type, count: count ?? 0 }
  })

  const typeCounts = await Promise.all(typeCountPromises)

  const counts: ContentTypeCounts = {
    all: totalCount ?? 0,
  }

  for (const { type, count } of typeCounts) {
    counts[type] = count
  }

  return counts
}
