// Gemini API 서비스


interface GeminiRequest {
  apiKey: string
  prompt: string
  maxOutputTokens?: number
}

interface GeminiResponse {
  text: string
  error?: string
  finishReason?: string
}

interface GeminiGroundingRequest extends GeminiRequest {
  useGrounding?: boolean
}

interface GeminiOptions {
  json?: boolean
  temperature?: number
}

// Gemini API 호출
export async function callGemini({ apiKey, prompt, maxOutputTokens = 500, model = 'gemini-2.0-flash' }: GeminiRequest & { model?: string }, options?: GeminiOptions): Promise<GeminiResponse> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens,
          ...(options?.json && { responseMimeType: 'application/json' }),
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.error?.message || `API 호출 실패 (${response.status})`
      console.error('[callGemini] API error:', errorMsg, errorData)
      return { text: '', error: errorMsg }
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const finishReason = data.candidates?.[0]?.finishReason

    if (finishReason && finishReason !== 'STOP') {
      console.warn(`[callGemini] Response finished with reason: ${finishReason}`)
    }

    // 응답이 비어있거나 차단된 경우
    if (!text) {
      const safetyRatings = data.candidates?.[0]?.safetyRatings
      console.error('[callGemini] Empty/blocked response:', { finishReason, safetyRatings, promptFeedback: data.promptFeedback })
      if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
        return { text: '', error: `응답이 차단됨: ${finishReason}` }
      }
      return { text: '', error: 'AI가 빈 응답을 반환했습니다.' }
    }

    return { text, finishReason }
  } catch (err) {
    console.error('[callGemini] Exception:', err)
    return {
      text: '',
      error: err instanceof Error ? err.message : 'API 호출 중 오류 발생'
    }
  }
}

// Gemini API 호출 (Google Search Grounding 포함)
export async function callGeminiWithGrounding({
  apiKey,
  prompt,
  maxOutputTokens = 500,
}: GeminiGroundingRequest): Promise<GeminiResponse> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens,
        },
        tools: [{ googleSearch: {} }],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        text: '',
        error: errorData.error?.message || `API 호출 실패 (${response.status})`,
      }
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return { text, finishReason: data.candidates?.[0]?.finishReason }
  } catch (err) {
    return {
      text: '',
      error: err instanceof Error ? err.message : 'API 호출 중 오류 발생',
    }
  }
}

// 리뷰 예시 생성 프롬프트
export function buildReviewPrompt(contentTitle: string, contentType: string): string {
  const typeLabel = getTypeLabel(contentType)

  return `다음 ${typeLabel}에 대한 리뷰 예시를 한국어로 작성해줘.

제목: "${contentTitle}"

조건:
- 2-3문장으로 간결하게
- 개인적인 감상과 추천 여부 포함
- 스포일러 없이
- 자연스러운 구어체로

리뷰만 출력해줘.`
}

// 줄거리 요약 프롬프트
export function buildSummaryPrompt(contentTitle: string, description: string): string {
  return `다음 콘텐츠의 줄거리를 한국어로 간결하게 요약해줘.

제목: "${contentTitle}"
원본 설명: "${description}"

조건:
- 3-4문장으로 요약
- 핵심 줄거리만 포함
- 스포일러 최소화
- 자연스러운 문체

요약만 출력해줘.`
}

// 콘텐츠 타입 라벨
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BOOK: '책',
    VIDEO: '영상',
    GAME: '게임',
    MUSIC: '앨범',
    CERTIFICATE: '자격증',
  }
  return labels[type] || '콘텐츠'
}
