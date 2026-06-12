'use server'

// egress-allow: notes는 본인 전용 RLS — anon 전환 시 빈 결과라 캐시 분리 불가
import { createClient } from '@/lib/supabase/server'
import type { Note } from './types'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

export async function getNoteByContentId(contentId: string): Promise<ActionResult<Note | null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      sections:note_sections(
        id,
        note_id,
        title,
        memo,
        is_completed,
        sort_order,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return success(null)
    return handleSupabaseError(error, { context: 'note', logPrefix: '[노트 조회]' })
  }

  // sections 정렬
  if (data.sections) {
    data.sections.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
  }

  return success(data as Note)
}
