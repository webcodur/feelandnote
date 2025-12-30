'use server'

import { createClient } from '@/lib/supabase/server'
import { callGemini, buildSummaryPrompt } from '@/lib/api/gemini'

interface GenerateSummaryParams {
  contentTitle: string
  description: string
}

export async function generateSummary(params: GenerateSummaryParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // API 키 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('gemini_api_key')
    .eq('id', user.id)
    .single()

  if (!profile?.gemini_api_key) {
    throw new Error('Gemini API 키를 먼저 설정해주세요')
  }

  // 프롬프트 생성 및 API 호출
  const prompt = buildSummaryPrompt(params.contentTitle, params.description)
  const result = await callGemini({ apiKey: profile.gemini_api_key, prompt })

  if (result.error) {
    throw new Error(result.error)
  }

  return { text: result.text }
}
