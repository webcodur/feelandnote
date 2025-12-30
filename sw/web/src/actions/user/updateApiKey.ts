'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateApiKeyParams {
  geminiApiKey: string | null
}

export async function updateApiKey({ geminiApiKey }: UpdateApiKeyParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 빈 문자열은 null로 처리
  const keyToSave = geminiApiKey?.trim() || null

  const { error } = await supabase
    .from('profiles')
    .update({ gemini_api_key: keyToSave })
    .eq('id', user.id)

  if (error) {
    throw new Error('API 키 저장에 실패했습니다')
  }

  revalidatePath('/profile')

  return { success: true }
}
