import type { ExtractedContent } from '@feelandnote/ai-services/content-extractor'

export interface ExternalSearchPlan {
  primaryQuery: string
  fallbackQuery?: string
}

/**
 * 입력용 ISBN을 카카오 도서 검색이 인식하는 단일 ISBN 문자열로 정규화한다.
 * 형식이 잘못된 값은 제목 검색으로 안전하게 폴백하도록 버린다.
 */
export function normalizeBookIsbn(value?: string): string | undefined {
  if (!value?.trim()) return undefined

  const compact = value
    .trim()
    .replace(/^ISBN(?:-1[03])?\s*:?\s*/i, '')
    .replace(/[\s-]/g, '')
    .toUpperCase()

  if (/^\d{9}[\dX]$/.test(compact) || /^97[89]\d{10}$/.test(compact)) {
    return compact
  }

  return undefined
}

function titleQuery(title: string, creator?: string): string {
  return creator ? `${title} - ${creator}` : title
}

/**
 * BOOK은 판본 식별자인 ISBN을 최우선으로 사용한다.
 * ISBN이 제공된 경우 제목 폴백을 만들지 않아 다른 판본의 자동 선택을 막는다.
 */
export function buildExternalSearchPlan(extracted: ExtractedContent): ExternalSearchPlan {
  if (extracted.type === 'BOOK') {
    const isbn = normalizeBookIsbn(extracted.isbn)
    if (isbn) return { primaryQuery: isbn }
  }

  const preferredTitle = extracted.titleKo || extracted.title
  const primaryQuery = titleQuery(preferredTitle, extracted.type === 'BOOK' ? extracted.creator : undefined)
  const fallbackQuery = preferredTitle !== extracted.title
    ? titleQuery(extracted.title, extracted.type === 'BOOK' ? extracted.creator : undefined)
    : undefined

  return { primaryQuery, fallbackQuery }
}
