import { fetchBookIntroduction } from '@feelandnote/content-search/book-introduction'
import { isBookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'

/** A catalog editor may keep a verified source or save a translated introduction. */
export async function resolveBookIntroductionEdit(input: {
  description: string
  isbn: string | null
  locale: 'ko' | 'en'
  current?: { description: string | null; isbn: string | null; sources: unknown } | null
}) {
  const description = input.description.trim() || null
  const sameIsbn = input.current?.isbn === input.isbn
  const currentSources = input.current?.sources
  const sources: Record<string, unknown> = sameIsbn && currentSources && typeof currentSources === 'object' && !Array.isArray(currentSources)
    ? { ...currentSources }
    : {}
  if (sameIsbn && input.current?.description === description) return { description, sources: currentSources }

  if (isBookIntroductionSource(description)) {
    const result = await fetchBookIntroduction({ isbn: input.isbn, locale: input.locale, source: description })
    if (!result?.description || !result.sourceUrl || result.source !== description) throw new Error('이 판본에서 선택한 출처의 소개를 확인하지 못했습니다')
    sources.description = result.sourceUrl
    delete sources.translation
  } else if (description) {
    if (input.locale === 'en' && /[가-힣]/u.test(description)) throw new Error('영어 소개에는 영어 번역문을 입력하세요')
    if (input.locale === 'ko' && !/[가-힣]/u.test(description)) throw new Error('한국어 소개에는 한국어 번역문을 입력하세요')
    if (input.current && !sameIsbn && input.current.description === description) {
      throw new Error('ISBN이 바뀌었습니다. 새 판본에 맞는 소개인지 확인한 뒤 수정하세요')
    }
    sources.translation = 'manual'
  } else {
    delete sources.description
    delete sources.translation
  }
  return { description, sources }
}
