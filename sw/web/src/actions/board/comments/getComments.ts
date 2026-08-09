'use server'

import { unstable_cache } from 'next/cache'
import { throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import type { BoardCommentWithAuthor, BoardType } from '@/types/database'
import type { Locale } from '@/types/locale'
import { attachMemberAuthors } from '@/lib/board/memberProfiles'

interface GetCommentsParams {
  boardType: BoardType
  postId: string
  locale: Locale
}

async function fetchComments(boardType: BoardType, postId: string, locale: Locale): Promise<BoardCommentWithAuthor[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('board_comments')
    .select('*')
    .eq('board_type', boardType)
    .eq('post_id', postId)
    .eq('locale', locale)
    .order('created_at', { ascending: true })

  throwOnQueryError('[댓글 목록]', error)

  const comments = await attachMemberAuthors(supabase, data ?? [])
  return comments as BoardCommentWithAuthor[]
}

const getCommentsCached = unstable_cache(
  fetchComments,
  ['board-comments'],
  { revalidate: 3600, tags: ['board-comments'] }
)

export async function getComments({ boardType, postId, locale }: GetCommentsParams): Promise<BoardCommentWithAuthor[]> {
  return withQueryFallback('getComments', () => getCommentsCached(boardType, postId, locale), [])
}
