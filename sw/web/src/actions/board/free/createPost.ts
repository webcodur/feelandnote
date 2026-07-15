'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import { isValidAnonPassword, hashPassword, hashIp } from '@/lib/board/anonPassword'
import { FREE_POST_COLS, FREE_RATE_LIMIT_SECONDS, FREE_BOARD_PATH, getClientIp } from '@/lib/board/freeBoard'
import type { FreePost } from '@/types/database'

interface CreateFreePostParams {
  title: string
  content: string
  nickname?: string
  password?: string
  anonymous?: boolean // 로그인 사용자가 익명으로 쓰기 선택
}

export async function createFreePost(params: CreateFreePostParams): Promise<ActionResult<FreePost>> {
  const { title, content, nickname, password, anonymous } = params

  if (title.trim().length === 0) return failure('VALIDATION_ERROR', '제목을 입력해달라.')
  if (title.length > 100) return failure('LIMIT_EXCEEDED', '제목은 100자까지 작성할 수 있다.')
  if (content.trim().length === 0) return failure('VALIDATION_ERROR', '내용을 입력해달라.')
  if (content.length > 5000) return failure('LIMIT_EXCEEDED', '내용은 5000자까지 작성할 수 있다.')
  if ((nickname ?? '').length > 20) return failure('LIMIT_EXCEEDED', '닉네임은 20자까지 쓸 수 있다.')

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const supabase = createAdminClient()

  let authorId: string | null = null
  let passwordHash: string | null = null
  let isAnon = true
  let nicknameToSave: string | null = null

  if (user) {
    // 로그인: 계정으로. 비밀번호 불필요.
    authorId = user.id
    isAnon = anonymous === true
    // 익명으로 쓸 때만 필명을 남긴다(비우면 "익명"으로 표시).
    // 계정 글은 프로필 닉네임을 쓰므로 저장하지 않는다.
    if (isAnon) nicknameToSave = nickname?.trim() || null
  } else {
    // 비로그인: 익명 + 4자리 비밀번호 필수
    if (!password || !isValidAnonPassword(password)) {
      return failure('VALIDATION_ERROR', '비밀번호는 숫자 4자리로 입력해달라.')
    }
    passwordHash = hashPassword(password)
    isAnon = true
    nicknameToSave = nickname?.trim() || null

    // 도배 방지: 같은 접속자가 최근 N초 내 작성했으면 거부 (익명만)
    const ipHash = hashIp(await getClientIp())
    if (ipHash) {
      const since = new Date(Date.now() - FREE_RATE_LIMIT_SECONDS * 1000).toISOString()
      const { count } = await supabase
        .from('free_posts')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', since)
      if ((count ?? 0) > 0) {
        return failure('LIMIT_EXCEEDED', '조금 뒤에 다시 작성해달라.')
      }
    }
  }

  const ipHash = hashIp(await getClientIp())

  const { data, error } = await supabase
    .from('free_posts')
    .insert({
      title: title.trim(),
      content: content.trim(),
      nickname: nicknameToSave,
      author_id: authorId,
      is_anonymous: isAnon,
      password_hash: passwordHash,
      ip_hash: ipHash,
    })
    .select(FREE_POST_COLS)
    .single()

  if (error) return handleSupabaseError(error, { logPrefix: '[자유게시판 작성]' })

  revalidatePath(FREE_BOARD_PATH)
  return success(data as unknown as FreePost)
}
