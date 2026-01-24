'use server'

import { createClient } from '@/lib/supabase/server'
import type { BoardCommentWithAuthor, BoardType } from '@/types/database'

interface GetCommentsParams {
  boardType: BoardType
  postId: string
}

export async function getComments({ boardType, postId }: GetCommentsParams): Promise<BoardCommentWithAuthor[]> {
  const supabase = await createClient()

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
