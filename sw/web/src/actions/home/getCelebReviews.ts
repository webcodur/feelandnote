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
      content:contents!user_contents_content_id_fkey(
        id,
        title,
        creator,
        thumbnail_url,
        type
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
    .limit(50) // 적절한 limit 설정

  if (error) {
    console.error('셀럽 리뷰 조회 에러:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

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
