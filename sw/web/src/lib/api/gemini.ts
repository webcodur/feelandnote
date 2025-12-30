// Gemini API 서비스

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

interface GeminiRequest {
  apiKey: string
  prompt: string
}

interface GeminiResponse {
  text: string
  error?: string
}

// Gemini API 호출
export async function callGemini({ apiKey, prompt }: GeminiRequest): Promise<GeminiResponse> {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        text: '',
        error: errorData.error?.message || `API 호출 실패 (${response.status})`
      }
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return { text }
  } catch (err) {
    return {
      text: '',
      error: err instanceof Error ? err.message : 'API 호출 중 오류 발생'
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
