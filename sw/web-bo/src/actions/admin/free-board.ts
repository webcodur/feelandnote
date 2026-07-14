'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// 자유게시판은 RLS상 서버 전용이라 목록·변경 모두 service_role(admin)로 접근한다.

async function setPostDeleted(id: string, deleted: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('free_posts').update({ is_deleted: deleted }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/free-board')
}

async function setCommentDeleted(id: string, deleted: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('free_post_comments').update({ is_deleted: deleted }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/free-board')
}

export async function hideFreePost(id: string) {
  await setPostDeleted(id, true)
}

export async function restoreFreePost(id: string) {
  await setPostDeleted(id, false)
}

export async function hideFreeComment(id: string) {
  await setCommentDeleted(id, true)
}

export async function restoreFreeComment(id: string) {
  await setCommentDeleted(id, false)
}
