'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import type { BoardCommentWithAuthor, BoardType } from '@/types/database'
import type { Locale } from '@/types/locale'

interface GetCommentsParams {
  boardType: BoardType
  postId: string
  locale: Locale
}

async function fetchComments(boardType: BoardType, postId: string, locale: Locale): Promise<BoardCommentWithAuthor[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('board_comments')
    .select(`*, author:profiles!author_id(id, nickname, avatar_url)`)
    .eq('board_type', boardType)
    .eq('post_id', postId)
    .eq('locale', locale)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[댓글 목록] Error:', error)
    return []
  }

  return data as BoardCommentWithAuthor[]
}

const getCommentsCached = unstable_cache(
  fetchComments,
  ['board-comments'],
  { revalidate: 3600, tags: ['board-comments'] }
)

export async function getComments({ boardType, postId, locale }: GetCommentsParams): Promise<BoardCommentWithAuthor[]> {
  return getCommentsCached(boardType, postId, locale)
}
