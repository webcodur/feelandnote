'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// #region Types
interface ApiKeysResponse {
  geminiApiKey: string | null
}

interface SaveApiKeyInput {
  geminiApiKey: string
}

interface ActionResult {
  success: boolean
  error?: string
}
// #endregion

// #region getApiKeys
export async function getApiKeys(): Promise<ApiKeysResponse> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { geminiApiKey: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('gemini_api_key')
    .eq('id', user.id)
    .single()

  return {
    geminiApiKey: profile?.gemini_api_key || null,
  }
}
// #endregion

// #region saveGeminiApiKey
export async function saveGeminiApiKey(input: SaveApiKeyInput): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증이 필요합니다.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ gemini_api_key: input.geminiApiKey })
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')

  return { success: true }
}
// #endregion
