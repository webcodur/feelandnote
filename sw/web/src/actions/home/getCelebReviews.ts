'use server'

import { createClient } from '@/lib/supabase/server'
import type { CelebReview } from '@/types/home'
import type { ContentType } from '@/types/database'

export async function getCelebReviews(celebId: string): Promise<CelebReview[]> {
  const supabase = await createClient()

  // 해당 셀럽의 리뷰 조회
  const { data, error } = await supabase
    .from('user_contents')
    .select(`
      id,
      rating,
      review,
      is_spoiler,
      source_url,
      updated_at,
      content_id,
      content:contents!user_contents_content_id_fkey(
        id,
        title,
        creator,
        thumbnail_url,
        type,
        user_count
      ),
      celeb:profiles!user_contents_user_id_fkey(
        id,
        nickname,
        avatar_url,
        profession,
        is_verified,
        claimed_by
      )
    `)
    .eq('user_id', celebId)
    .not('review', 'is', null)
    .eq('visibility', 'public')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('셀럽 리뷰 조회 에러:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // 인원 구성 배치 조회 (셀럽 + 일반인)
  const contentIds = [...new Set(data.map(row => row.content_id))]
  const contentCounts = await getContentCountsForContents(supabase, contentIds)

  const reviews: CelebReview[] = data
    .filter(row => row.content && row.celeb && row.review)
    .map(row => {
      const content = Array.isArray(row.content) ? row.content[0] : row.content
      const celeb = Array.isArray(row.celeb) ? row.celeb[0] : row.celeb

      return {
        id: row.id,
        rating: row.rating,
        review: row.review as string,
        is_spoiler: row.is_spoiler ?? false,
        source_url: row.source_url ?? null,
        updated_at: row.updated_at,
        content: {
          id: content.id,
          title: content.title,
          creator: content.creator,
          thumbnail_url: content.thumbnail_url,
          type: content.type as ContentType,
          celeb_count: contentCounts[content.id]?.celebCount ?? 0,
          user_count: contentCounts[content.id]?.userCount ?? 0,
        },
        celeb: {
          id: celeb.id,
          nickname: celeb.nickname || '',
          avatar_url: celeb.avatar_url,
          profession: celeb.profession ?? null,
          is_verified: celeb.is_verified ?? false,
          is_platform_managed: celeb.claimed_by === null,
        },
      }
    })

  return reviews
}

interface ContentCounts {
  celebCount: number
  userCount: number
}

// 콘텐츠별 인원 구성 조회 (내부 함수)
async function getContentCountsForContents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contentIds: string[]
): Promise<Record<string, ContentCounts>> {
  if (!contentIds.length) return {}

  // FINISHED 상태인 user_contents 조회
  const { data: ucData } = await supabase
    .from('user_contents')
    .select('content_id, user_id')
    .in('content_id', contentIds)
    .eq('status', 'FINISHED')

  if (!ucData?.length) return {}

  // CELEB 프로필 식별
  const uniqueUserIds = [...new Set(ucData.map(r => r.user_id))]
  const celebIdSet = new Set<string>()

  for (let i = 0; i < uniqueUserIds.length; i += 50) {
    const batch = uniqueUserIds.slice(i, i + 50)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .in('id', batch)
      .eq('profile_type', 'CELEB')
      .eq('status', 'active')

    if (profiles) profiles.forEach(p => celebIdSet.add(p.id))
  }

  // content_id별 셀럽/일반인 수 집계
  const counts: Record<string, ContentCounts> = {}
  for (const item of ucData) {
    if (!counts[item.content_id]) {
      counts[item.content_id] = { celebCount: 0, userCount: 0 }
    }
    if (celebIdSet.has(item.user_id)) {
      counts[item.content_id].celebCount++
    } else {
      counts[item.content_id].userCount++
    }
  }

  return counts
}
