// Content Extractor - Gemini를 이용해 기사에서 콘텐츠 언급 추출

import { callGemini } from './gemini'
import type { ContentType } from './search'

// #region Types
export interface ExtractedContent {
  type: ContentType
  title: string
  titleKo?: string
  creator?: string
  review?: string
  sourceUrl?: string
}

export interface ExtractionResult {
  success: boolean
  items?: ExtractedContent[]
  error?: string
}
// #endregion

// #region Prompt Builder
export function buildExtractionPrompt(text: string, celebName: string): string {
  return `다음 텍스트에서 ${celebName}이 언급하거나 추천한 콘텐츠(책, 영화, 게임, 음악)를 추출해.

중요 규칙:
1. 영문 제목은 반드시 한국어 번역 제목(titleKo)을 함께 제공
2. 리뷰/감상/독서경위/추천이유가 있으면 review에 포함 (없으면 빈 문자열)

JSON 배열로만 출력:
[{"type":"BOOK","title":"Zero to One","titleKo":"제로 투 원","creator":"Peter Thiel","review":"창업에 대한 새로운 시각을 열어준 책이다","sourceUrl":""}]

필드 설명:
- type: BOOK, VIDEO, GAME, MUSIC 중 하나
- title: 원본 제목
- titleKo: 한국어 번역 제목 (필수! 모르면 원본 그대로)
- creator: 저자/감독/아티스트
- review: 리뷰, 감상, 독서경위, 추천이유 등 (텍스트에 있으면)
- sourceUrl: 출처 링크 (텍스트에 있으면)

콘텐츠가 없으면: []

텍스트:
${text}`
}
// #endregion

// #region Response Parser
const VALID_TYPES: ContentType[] = ['BOOK', 'VIDEO', 'GAME', 'MUSIC']

export function parseExtractionResponse(response: string): ExtractedContent[] {
  // JSON 배열 추출 (마크다운 코드 블록 처리)
  let jsonStr = response.trim()

  // ```json ... ``` 형식 처리
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  // [ ... ] 배열만 추출
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
  if (!arrayMatch) {
    return []
  }

  try {
    const parsed = JSON.parse(arrayMatch[0])

    if (!Array.isArray(parsed)) {
      return []
    }

    // 타입 검증 및 정규화
    return parsed
      .filter((item): item is ExtractedContent => {
        if (!item || typeof item !== 'object') return false
        if (!item.title || typeof item.title !== 'string') return false
        if (!item.type || !VALID_TYPES.includes(item.type)) return false
        return true
      })
      .map((item) => ({
        type: item.type as ContentType,
        title: item.title.trim(),
        titleKo: item.titleKo?.trim() || undefined,
        creator: item.creator?.trim() || undefined,
        review: item.review?.trim() || undefined,
        sourceUrl: item.sourceUrl?.trim() || undefined,
      }))
  } catch {
    return []
  }
}
// #endregion

// #region Main Function
export async function extractContentsFromText(
  apiKey: string,
  text: string,
  celebName: string
): Promise<ExtractionResult> {
  const prompt = buildExtractionPrompt(text, celebName)

  const response = await callGemini({
    apiKey,
    prompt,
    maxOutputTokens: 4000,
  })

  if (response.error) {
    return { success: false, error: response.error }
  }

  if (!response.text) {
    return { success: false, error: 'AI 응답이 비어있습니다.' }
  }

  const items = parseExtractionResponse(response.text)

  return { success: true, items }
}
// #endregion
