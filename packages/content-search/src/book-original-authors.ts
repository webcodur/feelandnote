import { bookEditionTitleKey } from './book-series'

type OriginalAuthorContext = { workKey: string | null; editionKey: string | null; isbn: string | null }

// 실사한 이 종이판은 Melissa Hill의 단독 저작이다. OL의 세 항목은 중복 이름/도치 표기다.
// https://www.sourcebooks.com/9781728267517-something-from-tiffanys-movie-tie-in-edition-tp.html
// https://openlibrary.org/authors/OL1420114A.json
// https://openlibrary.org/authors/OL7100156A.json
// https://openlibrary.org/authors/OL11582732A.json
const TIFFANYS_AUTHOR_KEYS = ['/authors/OL1420114A', '/authors/OL7100156A', '/authors/OL11582732A'] as const

// My Story의 검수한 영어판은 Ingrid Bergman과 Alan Burgess의 공저다.
// https://openlibrary.org/books/OL33459068M.json
// https://openlibrary.org/works/OL25145419W.json
// 원전의 Burgess 항목은 생몰(1915–1998)과 Bergman 회고록 공저 이력을 명시한다.
// https://openlibrary.org/authors/OL12242479A.json
// https://openlibrary.org/authors/OL596986A.json
const MY_STORY_EDITION_AUTHORS = ['/authors/OL1235607A', '/authors/OL596986A'] as const
const MY_STORY_WORK_AUTHORS = ['/authors/OL1235607A', '/authors/OL12242479A'] as const

/** 서로 다른 판의 인물이 연결 원전의 저자 목록에 섞이면 자동 선택하지 않는다. */
export function getBookOriginalAuthorKeys(
  editionAuthors: readonly string[], workAuthors: readonly string[], context?: OriginalAuthorContext,
): string[] | null {
  if (context?.workKey === '/works/OL25145419W' && context.editionKey === '/books/OL33459068M'
    && context.isbn === '9780751597134' && editionAuthors.length === MY_STORY_EDITION_AUTHORS.length
    && MY_STORY_EDITION_AUTHORS.every(key => editionAuthors.includes(key))
    && workAuthors.length === MY_STORY_WORK_AUTHORS.length
    && MY_STORY_WORK_AUTHORS.every(key => workAuthors.includes(key))) return [...MY_STORY_EDITION_AUTHORS]
  if (context?.workKey === '/works/OL16565784W' && context.editionKey === '/books/OL38063276M'
    && context.isbn === '9781728267517' && editionAuthors.length === 1
    && editionAuthors[0] === TIFFANYS_AUTHOR_KEYS[0] && workAuthors.length === TIFFANYS_AUTHOR_KEYS.length
    && TIFFANYS_AUTHOR_KEYS.every(key => workAuthors.includes(key))) return [TIFFANYS_AUTHOR_KEYS[0]]
  if (workAuthors.length && editionAuthors.length && workAuthors.some(key => !editionAuthors.includes(key))) return null
  return [...new Set(workAuthors.length ? workAuthors : editionAuthors)]
}

/** 원작에 소개가 있어도 다른 본문의 판본에 복사하지 않는다. ISBN 연결만으로는 충분하지 않다. */
export function canUseBookWorkIntroduction(
  editionTitle: string | null | undefined, editionAuthors: readonly string[],
  workTitle: string | null | undefined, workAuthors: readonly string[],
  context?: OriginalAuthorContext,
): boolean {
  return Boolean(editionTitle && workTitle && editionAuthors.length && workAuthors.length
    && bookEditionTitleKey(editionTitle) === bookEditionTitleKey(workTitle)
    && getBookOriginalAuthorKeys(editionAuthors, workAuthors, context)?.length)
}
