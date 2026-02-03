// Title Translator - 한국어 제목/리뷰 번역
// 2단계 Agent: Gemini로 정식 한국어 제목 및 리뷰 번역

import { callGemini } from './gemini'
import type { ContentType } from '@feelandnote/content-search/types'

// #region Types
export interface TitleItem {
  index: number
  type: ContentType
  title: string
  creator?: string
  review?: string
}

export interface TranslatedTitle {
  index: number
  titleKo: string
  creatorKo?: string
  reviewKo?: string
}

export interface TranslationResult {
  success: boolean
  translations?: TranslatedTitle[]
  error?: string
}
// #endregion

// #region Single Title Resolver
function buildSingleResolvePrompt(item: TitleItem): string {
  const typeLabels: Record<string, string> = {
    BOOK: '책',
    VIDEO: '영화/드라마',
    GAME: '게임',
    MUSIC: '음악/앨범',
  }
  const typeLabel = typeLabels[item.type] || '콘텐츠'

  return `아래 리뷰/경위를 한국어로 번역하고, 제목 정보도 함께 출력한다.

## 🔴 최우선 작업: reviewKo 번역
원문: "${item.review}"

→ 간결하고 권위적인 말투(~이다, ~한다, ~했다)로 번역
→ 요약 금지! 원문 내용을 빠짐없이 번역 (양을 줄이지 않는다)
→ 인물명이 있으면 "ㅇㅇㅇ이(가) ..." 형식으로 유지 (생략 금지)
→ 예: "He said it was great" → "정말 좋았다고 했다"
→ 이미 한국어로 잘 정리된 글이면 본문 그대로 사용 가능

## 부가 정보
- 콘텐츠: ${typeLabel}
- 제목: "${item.title}"
- 저자: "${item.creator || '없음'}"

## 출력 규칙
- titleKo: 한국 정식 발매명 (없으면 "${item.title}" 그대로)
- creatorKo: 한국어 표기 (없으면 빈 문자열)
- reviewKo: ⚠️ 무조건 번역 필수

## JSON 출력
{"titleKo":"...","creatorKo":"...","reviewKo":"번역된 리뷰"}`
}

export async function translateSingleItem(apiKey: string, item: TitleItem): Promise<TranslatedTitle | null> {
  const prompt = buildSingleResolvePrompt(item)
  const response = await callGemini({
    apiKey,
    prompt,
    maxOutputTokens: 1000,
  })

  if (response.error) {
    console.warn(`[TitleTranslator] Error for "${item.title}":`, response.error)
    return null
  }

  if (!response.text) {
    return null
  }

  // JSON 파싱
  try {
    let jsonStr = response.text.trim()

    // 마크다운 코드 블록 제거
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }

    // JSON 객체 추출
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    // 결과 로깅 (디버그)
    const result = {
      index: item.index,
      titleKo: parsed.titleKo?.trim() || item.title,
      creatorKo: parsed.creatorKo?.trim() || undefined,
      reviewKo: parsed.reviewKo?.trim() || undefined,
    }

    // reviewKo 번역 실패 시 경고
    if (item.review && !result.reviewKo) {
      console.warn(`[TitleTranslator] ⚠️ reviewKo missing for "${item.title}"`)
      console.warn(`[TitleTranslator] Raw response:`, response.text.slice(0, 300))
    }

    return result
  } catch {
    console.warn(`[TitleTranslator] Parse error for "${item.title}":`, response.text.slice(0, 200))
    return null
  }
}
// #endregion

// #region Batch Translate (Legacy - 호환용)
export function buildTranslationPrompt(items: TitleItem[]): string {
  const itemList = items
    .map((item) => {
      let line = `${item.index}. [${item.type}] "${item.title}"`
      if (item.creator) line += ` by ${item.creator}`
      if (item.review) line += `\n   리뷰: "${item.review}"`
      return line
    })
    .join('\n')

  return `한국 출판/영화/게임/음악 전문가로서, 아래 콘텐츠들의 **한국 정식 발매 제목**을 찾는다.

## 핵심 규칙
1. **반드시 한국에서 정식 출판/개봉/발매된 제목 사용** (직역 금지!)
2. 저자/감독도 한국어 표기로 변환
3. 리뷰/독서경위는 간결하고 권위적인 말투(~이다, ~한다, ~했다)로 번역

## 콘텐츠 목록
${itemList}

## 출력 형식 (JSON 배열만)
[{"index":0,"titleKo":"한국 정식 제목","creatorKo":"한국어 저자명","reviewKo":"번역된 리뷰"}]

JSON 배열만 출력한다.`
}

export function parseTranslationResponse(response: string): TranslatedTitle[] {
  let jsonStr = response.trim()

  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
  if (!arrayMatch) {
    return []
  }

  try {
    const parsed = JSON.parse(arrayMatch[0])

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((item): item is TranslatedTitle => {
        if (!item || typeof item !== 'object') return false
        if (typeof item.index !== 'number') return false
        if (!item.titleKo || typeof item.titleKo !== 'string') return false
        return true
      })
      .map((item) => ({
        index: item.index,
        titleKo: item.titleKo.trim(),
        creatorKo: item.creatorKo?.trim() || undefined,
        reviewKo: item.reviewKo?.trim() || undefined,
      }))
  } catch {
    return []
  }
}
// #endregion

// #region Helpers
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
// #endregion

// #region Main Function
export async function translateTitles(
  apiKey: string,
  items: TitleItem[]
): Promise<TranslationResult> {
  if (items.length === 0) {
    return { success: true, translations: [] }
  }

  // 순차 처리 + 딜레이 (무료 티어 분당 20 요청 제한 대응)
  const translations: TranslatedTitle[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const result = await translateSingleItem(apiKey, item)
    if (result) {
      translations.push(result)
    }

    // 마지막 항목이 아니면 3초 대기 (분당 20 요청 = 3초 간격)
    if (i < items.length - 1) {
      await delay(3000)
    }
  }

  return { success: true, translations }
}
// #endregion

// Re-export ContentType for convenience
export type { ContentType } from '@feelandnote/content-search/types'
