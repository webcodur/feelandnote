
import { CONTENT_TYPES, CONTENT_TYPE_CONFIG } from '@/constants/contentTypes'
import type { ContentType } from '@feelnnote/content-search/types'
import type { ExtractedContent } from '@feelnnote/ai-services/content-extractor'
import type { JsonInputItem, SearchResultItem } from './types'

// CONTENT_TYPE_OPTIONS는 로컬 상수에서 생성
export const CONTENT_TYPE_OPTIONS = CONTENT_TYPES.filter((type) => type !== 'CERTIFICATE').map((type) => ({
  value: type as ContentType,
  label: CONTENT_TYPE_CONFIG[type].label,
}))

// JSON 입력 파싱 함수: "작품명(저자)" 형식을 파싱
export function parseJsonInput(jsonText: string): ExtractedContent[] {
  const jsonStr = jsonText.trim()

  // JSON 배열 추출 (마크다운 코드 블록 처리)
  let cleanJson = jsonStr
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    cleanJson = codeBlockMatch[1].trim()
  }

  const arrayMatch = cleanJson.match(/\[[\s\S]*\]/)
  if (!arrayMatch) {
    throw new Error('유효한 JSON 배열이 아닙니다.')
  }

  const parsed = JSON.parse(arrayMatch[0]) as JsonInputItem[]
  if (!Array.isArray(parsed)) {
    throw new Error('JSON 배열 형식이어야 합니다.')
  }

  // type 필드 유효성 검사
  const validTypes: ContentType[] = CONTENT_TYPES.filter((t) => t !== 'CERTIFICATE')
  const invalidItems = parsed
    .map((item, idx) => ({ idx: idx + 1, type: item.type }))
    .filter((item) => !item.type || !validTypes.includes(item.type))

  if (invalidItems.length > 0) {
    const invalidIndices = invalidItems.map((i) => i.idx).join(', ')
    throw new Error(`${invalidIndices}번 항목에 유효한 type이 없습니다. (BOOK/VIDEO/GAME/MUSIC 중 하나 필수)`)
  }

  return parsed.map((item) => {
    // title에서 "(저자)" 부분 분리: "작품명(저자)" → title: "작품명", creator: "저자"
    const titleMatch = item.title.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
    const title = titleMatch ? titleMatch[1].trim() : item.title.trim()
    const creator = titleMatch ? titleMatch[2].trim() : undefined

    return {
      type: item.type,
      title,
      titleKo: title, // 한국어 제목으로 가정
      creator,
      creatorKo: creator,
      review: item.body?.replace(/\\n/g, '\n') || '',
      sourceUrl: item.source || undefined,
    }
  })
}

// AI 프롬프트 생성
export function generateAIPrompt(): string {
  return `# 콘텐츠 소비 기록 조사

## 목표
입력된 인물이 읽은 책, 본 영화/드라마, 플레이한 게임, 들은 음악 등을 웹에서 최대한 찾아 정리한다.

## 출력 형식 (엄수)
\`\`\`json
[
  {
    "type": "BOOK",
    "title": "작품명(저자/감독)",
    "body": "감상 경위 또는 리뷰 본문",
    "source": "https://출처URL"
  }
]
\`\`\`

### 필드 규칙
- **type**: \`BOOK\` | \`VIDEO\` | \`GAME\` | \`MUSIC\` 중 하나 (필수)
- **title**: "작품명(창작자)" 형식. 예: "데미안(헤르만 헤세)", "기생충(봉준호)"
- **body**: 감상 경위 또는 리뷰. 개행은 \\n 사용
- **source**: 해당 정보의 출처 URL (필수)

## 본문(body) 작성 가이드

### 감상 경위인 경우
- 단순히 "인터뷰에서 언급했다"로 끝내지 말 것
- 왜 읽었는지, 어떤 영향을 받았는지, 어떤 맥락에서 언급했는지 포함
- 본인 발언은 쌍따옴표로 정확히 인용: "이 책이 제 인생을 바꿨습니다"
- 독자가 해당 작품을 모른다고 가정하고 배경 설명 포함

### 리뷰인 경우
- 본인이 직접 남긴 평가/소감 위주로 작성

## 구조 규칙 (중요)
- **1작품 = 1항목 엄수**: 여러 작품을 하나의 body에 묶지 말 것
- **모호한 언급 금지**: "무라카미 하루키의 책을 좋아한다" 같은 포괄적 언급은 불가
  - 반드시 구체적 작품명 필요. 특정 작품 언급이 없으면 대표작으로 대체
  - 예: "하루키를 좋아한다" → "노르웨이의 숲(무라카미 하루키)"로 title 지정 + body에 "특정 작품 언급 없이 작가 전반을 좋아한다고 밝힘" 명시
- 같은 작품이 여러 출처에서 언급되면 가장 상세한 출처 하나만 선택
- 각 항목은 독립적으로 읽혀야 함 (앞 항목 참조 금지)

## 검색 범위
- 인터뷰, 기사, SNS, 유튜브, 팟캐스트, 저서 등 모든 공개 자료
- 추가 요청 없이도 되도록 한번에 최대치의 검색을 수행할 것.

---
JSON 배열을 먼저 출력하고, 부가 설명이 필요하면 배열 뒤에 작성할 것.`
}

// 검색결과 메타데이터 요약 추출
export function getMetadataSummary(result: SearchResultItem, contentType: ContentType): string {
  const meta = result.metadata
  const parts: string[] = []

  switch (contentType) {
    case 'BOOK':
      if (meta.publisher) parts.push(meta.publisher as string)
      if (meta.publishDate) parts.push(meta.publishDate as string)
      if (meta.isbn) parts.push(`ISBN: ${meta.isbn}`)
      break
    case 'VIDEO':
      if (meta.releaseDate) parts.push(meta.releaseDate as string)
      if (meta.voteAverage) parts.push(`평점 ${(meta.voteAverage as number).toFixed(1)}`)
      if (meta.genres) parts.push((meta.genres as string[]).slice(0, 2).join(', '))
      break
    case 'GAME':
      if (meta.developer) parts.push(meta.developer as string)
      if (meta.releaseDate) parts.push(meta.releaseDate as string)
      if (meta.platforms) parts.push((meta.platforms as string[]).slice(0, 2).join(', '))
      break
    case 'MUSIC':
      if (meta.releaseDate) parts.push(meta.releaseDate as string)
      if (meta.albumType) parts.push(meta.albumType as string)
      if (meta.totalTracks) parts.push(`${meta.totalTracks}곡`)
      break
    default:
      break
  }

  return parts.filter(Boolean).join(' · ')
}
