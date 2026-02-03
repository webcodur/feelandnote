'use server'

import { createClient } from '@/lib/supabase/server'
import { callGemini, buildReviewPrompt } from '@feelandnote/ai-services/gemini'

const MODEL_NAME = 'gemini-2.0-flash'

interface GenerateAiReviewParams {
  contentId: string
  contentTitle: string
  contentType: string
}

interface AiReview {
  id: string
  content_id: string
  user_id: string
  review: string
  model: string
  created_at: string
}

export async function generateAiReview(params: GenerateAiReviewParams): Promise<{ success: boolean; data?: AiReview; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // API 키 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('gemini_api_key')
    .eq('id', user.id)
    .single()

  if (!profile?.gemini_api_key) {
    return { success: false, error: 'Gemini API 키를 먼저 설정해주세요' }
  }

  // 프롬프트 생성 및 API 호출
  const prompt = buildReviewPrompt(params.contentTitle, params.contentType)
  const result = await callGemini({ apiKey: profile.gemini_api_key, prompt })

  if (result.error) {
    return { success: false, error: result.error }
  }

  // DB에 저장
  const { data, error } = await supabase
    .from('ai_reviews')
    .insert({
      content_id: params.contentId,
      user_id: user.id,
      review: result.text,
      model: MODEL_NAME,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: '리뷰 저장에 실패했습니다' }
  }

  return { success: true, data }
}
