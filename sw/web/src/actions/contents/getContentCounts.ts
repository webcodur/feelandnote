'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType } from '@/types/database'
import type { ContentTypeCounts } from '@/types/content'

// 각 콘텐츠 타입별 개수를 반환
export async function getContentCounts(): Promise<ContentTypeCounts> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0 }
  }

  const { data, error } = await supabase
    .from('user_contents')
    .select('content:contents!inner(type)')
    .eq('user_id', user.id)

  if (error) {
    console.error('콘텐츠 개수 조회 에러:', error)
    return { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0 }
  }

  const counts: ContentTypeCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0 }

  data?.forEach((item) => {
    const content = item.content as { type: ContentType } | { type: ContentType }[] | null
    const type = Array.isArray(content) ? content[0]?.type : content?.type
    if (type && type in counts) {
      counts[type]++
    }
  })

  return counts
}

// WANT 상태 콘텐츠 타입별 개수 반환 (관심 탭용)
export async function getWantContentCounts(): Promise<ContentTypeCounts> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0 }
  }

  const { data, error } = await supabase
    .from('user_contents')
    .select('content:contents!inner(type)')
    .eq('user_id', user.id)
    .eq('status', 'WANT')

  if (error) {
    console.error('관심 콘텐츠 개수 조회 에러:', error)
    return { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0 }
  }

  const counts: ContentTypeCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0 }

  data?.forEach((item) => {
    const content = item.content as { type: ContentType } | { type: ContentType }[] | null
    const type = Array.isArray(content) ? content[0]?.type : content?.type
    if (type && type in counts) {
      counts[type]++
    }
  })

  return counts
}

// 특정 사용자의 공개 콘텐츠 타입별 개수 반환
export async function getUserContentCounts(userId: string): Promise<ContentTypeCounts> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_contents')
    .select('content:contents!inner(type)')
    .eq('user_id', userId)
    .eq('visibility', 'public')

  if (error) {
    console.error('사용자 콘텐츠 개수 조회 에러:', error)
    return { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0 }
  }

  const counts: ContentTypeCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0 }

  data?.forEach((item) => {
    const content = item.content as { type: ContentType } | { type: ContentType }[] | null
    const type = Array.isArray(content) ? content[0]?.type : content?.type
    if (type && type in counts) {
      counts[type]++
    }
  })

  return counts
}
