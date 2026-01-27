// Content Extractor - Gemini를 이용해 기사에서 콘텐츠 언급 추출
// 1단계 Agent: 추출만 담당 (번역은 별도 Agent에서 처리)

import { callGemini } from './gemini'
import type { ContentType } from '@feelnnote/content-search/types'

// #region Types
export interface ExtractedContent {
  type: ContentType
  title: string
  titleKo?: string
  creator?: string
  creatorKo?: string
  review?: string
  sourceUrl?: string
  rating?: number
}

export interface ExtractionResult {
  success: boolean
  items?: ExtractedContent[]
  error?: string
}
// #endregion

// #region Prompt Builder
export function buildExtractionPrompt(text: string, celebName: string): string {
  return `텍스트에서 ${celebName}이(가) 언급한 콘텐츠를 추출한다.

## 추출 대상
- BOOK: 책, 소설, 에세이, 만화
- VIDEO: 영화, 드라마, 애니메이션
- GAME: 게임
- MUSIC: 앨범, 음악

## 출력 필드

### title (필수)
- 원본 제목 그대로 (영문이면 영문)

### titleKo (필수) ⚠️ 한국 정식 발매명
- 한국에서 정식 출판/개봉/발매된 제목
- 예: "The Great Gatsby" → "위대한 개츠비"
- 예: "Erta Ale" → "에르타 알레" (음반)
- 모르면 title과 동일하게 출력

### creator
- 저자/감독/아티스트 (원본 그대로)

### creatorKo
- 한국어 표기 (예: "Haruki Murakami" → "무라카미 하루키")
- 모르면 creator와 동일하게

### review (필수) ⚠️ 원문 보존 우선
- ${celebName}의 감상, 추천 이유, 독서/시청 경위
- ⭐ 이미 한국어로 정리된 글이면 문구를 바꾸지 말고 원문 그대로 사용
- 영문/외국어인 경우에만 한국어로 번역
- 번역 시: 간결하고 권위적인 말투(~이다, ~한다, ~했다) 사용
- 번역 시: "${celebName}이(가) ..." 형식으로 인물명 포함
- 요약 금지! 원문 내용을 빠짐없이 보존 (양을 줄이지 않는다)
- 없으면 빈 문자열 ""

### sourceUrl
- 텍스트에서 해당 콘텐츠 링크가 있으면 포함

## 규칙
1. 제목이 명확히 언급된 것만 추출
2. 중복 제거
3. titleKo를 모르면 title 그대로 (null 금지)

## JSON 출력
[{"type":"BOOK","title":"원본","titleKo":"한국어 제목","creator":"저자","creatorKo":"한국어 저자","review":"한국어 리뷰","sourceUrl":""}]

## 텍스트
${text}

JSON 배열만 출력.`
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
        titleKo: item.titleKo?.trim() || item.title.trim(), // 없으면 원본
        creator: item.creator?.trim() || undefined,
        creatorKo: item.creatorKo?.trim() || item.creator?.trim() || undefined,
        review: item.review?.trim() || '',
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
    maxOutputTokens: 65536,
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

// Re-export ContentType for convenience
export type { ContentType } from '@feelnnote/content-search/types'
