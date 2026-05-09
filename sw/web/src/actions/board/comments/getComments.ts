'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import type { BoardCommentWithAuthor, BoardType } from '@/types/database'

interface GetCommentsParams {
  boardType: BoardType
  postId: string
}

async function fetchComments(boardType: BoardType, postId: string): Promise<BoardCommentWithAuthor[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('board_comments')
    .select(`*, author:profiles!author_id(id, nickname, avatar_url)`)
    .eq('board_type', boardType)
    .eq('post_id', postId)
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
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getComments({ boardType, postId }: GetCommentsParams): Promise<BoardCommentWithAuthor[]> {
  return getCommentsCached(boardType, postId)
}
