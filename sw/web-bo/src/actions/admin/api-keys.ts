'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// #region Types
export interface ApiKey {
  id: string
  title: string
  api_key: string
  google_id: string | null
  memo: string | null
  created_at: string
  updated_at: string
}

export interface ApiKeyWithStats extends ApiKey {
  today_success: number
  today_429_count: number
  last_429_at: string | null
}

export interface ApiKeyUsage {
  id: string
  api_key_id: string
  action_type: string
  success: boolean
  error_code: string | null
  created_at: string
}

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}
// #endregion

// #region CRUD
export async function getApiKeys(): Promise<ActionResult<ApiKeyWithStats[]>> {
  const supabase = await createClient()

  // 오늘 날짜 기준 통계와 함께 조회
  const today = new Date().toISOString().split('T')[0]

  const { data: keys, error: keysError } = await supabase
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: true })

  if (keysError) {
    return { success: false, error: keysError.message }
  }

  // 각 키별 오늘 사용 통계 조회
  const keysWithStats: ApiKeyWithStats[] = await Promise.all(
    (keys || []).map(async (key) => {
      const { data: usage } = await supabase
        .from('api_key_usage')
        .select('success, error_code, created_at')
        .eq('api_key_id', key.id)
        .gte('created_at', today)

      const todayUsage = usage || []
      const today_success = todayUsage.filter(u => u.success).length
      const today_429 = todayUsage.filter(u => u.error_code === '429')
      const today_429_count = today_429.length
      const last_429_at = today_429.length > 0
        ? today_429.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null

      return {
        ...key,
        today_success,
        today_429_count,
        last_429_at,
      }
    })
  )

  return { success: true, data: keysWithStats }
}

export async function createApiKey(input: {
  title: string
  api_key: string
  google_id?: string
  memo?: string
}): Promise<ActionResult<ApiKey>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      title: input.title,
      api_key: input.api_key,
      google_id: input.google_id || null,
      memo: input.memo || null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/celebs')
  return { success: true, data }
}

export async function updateApiKey(
  id: string,
  input: {
    title?: string
    api_key?: string
    google_id?: string
    memo?: string
  }
): Promise<ActionResult<ApiKey>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('api_keys')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/celebs')
  return { success: true, data }
}

export async function deleteApiKey(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/celebs')
  return { success: true }
}
// #endregion

// #region 키 선택 로직
// 가장 여유 있는 키 자동 선택 (429 없고, 사용량 적은 순)
export async function getBestAvailableKey(): Promise<ActionResult<ApiKey>> {
  const result = await getApiKeys()

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'API 키를 조회할 수 없습니다.' }
  }

  const keys = result.data

  if (keys.length === 0) {
    return { success: false, error: '등록된 API 키가 없습니다.' }
  }

  // 정렬: 429 없는 키 우선, 사용량 적은 키 우선
  const sorted = [...keys].sort((a, b) => {
    // 429 에러 카운트 오름차순
    if (a.today_429_count !== b.today_429_count) {
      return a.today_429_count - b.today_429_count
    }
    // 성공 카운트 오름차순 (사용량 적은 순)
    return a.today_success - b.today_success
  })

  const best = sorted[0]

  // 모든 키가 429 에러가 있는 경우 경고
  if (best.today_429_count > 0) {
    // 가장 최근 429가 1시간 이내면 경고
    if (best.last_429_at) {
      const lastError = new Date(best.last_429_at)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      if (lastError > hourAgo) {
        console.warn(`[API Key] All keys have recent 429 errors. Using "${best.title}" anyway.`)
      }
    }
  }

  return { success: true, data: best }
}

// 특정 키 조회 (수동 선택 시)
export async function getApiKeyById(id: string): Promise<ActionResult<ApiKey>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
// #endregion

// #region 사용 기록
export async function recordApiKeyUsage(input: {
  api_key_id: string
  action_type: string
  success: boolean
  error_code?: string
}): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('api_key_usage')
    .insert({
      api_key_id: input.api_key_id,
      action_type: input.action_type,
      success: input.success,
      error_code: input.error_code || null,
    })

  if (error) {
    console.error('[recordApiKeyUsage] Error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getApiKeyUsage(
  apiKeyId: string,
  limit: number = 50
): Promise<ActionResult<ApiKeyUsage[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('api_key_usage')
    .select('*')
    .eq('api_key_id', apiKeyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}
// #endregion
