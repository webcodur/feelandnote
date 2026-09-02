import type { SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import { verifyPassword } from './anonPassword'
import { isAdmin } from '@/lib/auth/checkAdmin'

/**
 * 자유게시판 글·댓글 수정/삭제 권한 판정.
 * - 계정 글(author_id 있음): 본인 또는 관리자만
 * - 익명 글(author_id 없음): 4자리 비밀번호 대조
 */
export async function canMutateFree(
  row: { author_id: string | null; password_hash: string | null },
  user: { id: string } | null,
  password: string | undefined,
  authClient: DatabaseClient,
): Promise<boolean> {
  if (row.author_id) {
    if (!user) return false
    if (user.id === row.author_id) return true
    return await isAdmin(authClient)
  }
  if (!row.password_hash || !password) return false
  return verifyPassword(password, row.password_hash)
}
