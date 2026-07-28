'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import { isValidAnonPassword, hashPassword, hashIp } from '@/lib/board/anonPassword'
import { canMutateFree } from '@/lib/board/freeAuth'
import { FREE_COMMENT_COLS, FREE_AUTHOR_JOIN, FREE_BOARD_PATH, getClientIp } from '@/lib/board/freeBoard'
import type { FreePostComment } from '@/types/database'

export async function getFreeComments(postId: string): Promise<FreePostComment[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('free_post_comments')
    .select(`${FREE_COMMENT_COLS}, ${FREE_AUTHOR_JOIN}`)
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[자유게시판 댓글] Error:', error)
    return []
  }
  return (data ?? []) as unknown as FreePostComment[]
}

interface CreateFreeCommentParams {
  postId: string
  content: string
  nickname?: string
  password?: string
  anonymous?: boolean
}

export async function createFreeComment(params: CreateFreeCommentParams): Promise<ActionResult<FreePostComment>> {
  const { postId, content, nickname, password, anonymous } = params

  if (content.trim().length === 0) return failure('VALIDATION_ERROR', '내용을 입력해달라.')
  if (content.length > 1000) return failure('LIMIT_EXCEEDED', '댓글은 1000자까지 쓸 수 있다.')
  if ((nickname ?? '').length > 20) return failure('LIMIT_EXCEEDED', '닉네임은 20자까지 쓸 수 있다.')

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const supabase = createAdminClient()

  // 게시글 존재 확인
  const { data: post } = await supabase
    .from('free_posts')
    .select('id, is_deleted')
    .eq('id', postId)
    .single()
  if (!post || (post as { is_deleted: boolean }).is_deleted) return failure('NOT_FOUND')

  let authorId: string | null = null
  let passwordHash: string | null = null
  let isAnon = true
  let nicknameToSave: string | null = null

  if (user) {
    authorId = user.id
    isAnon = anonymous === true
    // 익명으로 쓸 때만 필명을 남긴다(비우면 "익명"으로 표시).
    // 계정 댓글은 프로필 닉네임을 쓰므로 저장하지 않는다.
    if (isAnon) nicknameToSave = nickname?.trim() || null
  } else {
    if (!password || !isValidAnonPassword(password)) {
      return failure('VALIDATION_ERROR', '비밀번호는 숫자 4자리로 입력해달라.')
    }
    passwordHash = hashPassword(password)
    isAnon = true
    nicknameToSave = nickname?.trim() || null
  }

  const ipHash = hashIp(await getClientIp())

  const { data, error } = await supabase
    .from('free_post_comments')
    .insert({
      post_id: postId,
      content: content.trim(),
      nickname: nicknameToSave,
      author_id: authorId,
      is_anonymous: isAnon,
      password_hash: passwordHash,
      ip_hash: ipHash,
    })
    .select(`${FREE_COMMENT_COLS}, ${FREE_AUTHOR_JOIN}`)
    .single()

  if (error) return handleSupabaseError(error, { logPrefix: '[자유게시판 댓글 작성]' })

  revalidatePath(`${FREE_BOARD_PATH}/${postId}`)
  return success(data as unknown as FreePostComment)
}

interface DeleteFreeCommentParams {
  id: string
  postId: string
  password?: string
}

interface UpdateFreeCommentParams {
  id: string
  postId: string
  content: string
  password?: string
}

export async function updateFreeComment(params: UpdateFreeCommentParams): Promise<ActionResult<FreePostComment>> {
  const { id, postId, content, password } = params
  const trimmedContent = content.trim()

  if (trimmedContent.length === 0) return failure('VALIDATION_ERROR', '내용을 입력해달라.')
  if (content.length > 1000) return failure('LIMIT_EXCEEDED', '댓글은 1000자까지 쓸 수 있다.')

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const supabase = createAdminClient()

  const { data: row, error: fetchError } = await supabase
    .from('free_post_comments')
    .select('author_id, password_hash, post_id, is_deleted')
    .eq('id', id)
    .eq('post_id', postId)
    .single()

  if (fetchError || !row) return failure('NOT_FOUND')
  const target = row as {
    author_id: string | null
    password_hash: string | null
    post_id: string
    is_deleted: boolean
  }
  if (target.is_deleted) return failure('NOT_FOUND')

  const allowed = await canMutateFree(target, user, password, authClient)
  if (!allowed) {
    return target.author_id ? failure('FORBIDDEN') : failure('FORBIDDEN', '비밀번호가 일치하지 않는다.')
  }

  const { data, error } = await supabase
    .from('free_post_comments')
    .update({ content: trimmedContent, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('post_id', postId)
    .select(`${FREE_COMMENT_COLS}, ${FREE_AUTHOR_JOIN}`)
    .single()

  if (error) return handleSupabaseError(error, { logPrefix: '[자유게시판 댓글 수정]' })

  revalidatePath(`${FREE_BOARD_PATH}/${postId}`)
  return success(data as unknown as FreePostComment)
}

export async function deleteFreeComment(params: DeleteFreeCommentParams): Promise<ActionResult<null>> {
  const { id, postId, password } = params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const supabase = createAdminClient()

  const { data: row, error: fetchError } = await supabase
    .from('free_post_comments')
    .select('author_id, password_hash')
    .eq('id', id)
    .single()

  if (fetchError || !row) return failure('NOT_FOUND')
  const target = row as { author_id: string | null; password_hash: string | null }

  const allowed = await canMutateFree(target, user, password, authClient)
  if (!allowed) {
    return target.author_id ? failure('FORBIDDEN') : failure('FORBIDDEN', '비밀번호가 일치하지 않는다.')
  }

  const { error } = await supabase.from('free_post_comments').delete().eq('id', id)
  if (error) return handleSupabaseError(error, { logPrefix: '[자유게시판 댓글 삭제]' })

  revalidatePath(`${FREE_BOARD_PATH}/${postId}`)
  return success(null)
}
