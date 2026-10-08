import { bookEditionTitleKey } from './book-series'

/** 서로 다른 판의 인물이 연결 원전의 저자 목록에 섞이면 자동 선택하지 않는다. */
export function getBookOriginalAuthorKeys(editionAuthors: readonly string[], workAuthors: readonly string[]): string[] | null {
  if (workAuthors.length && editionAuthors.length && workAuthors.some(key => !editionAuthors.includes(key))) return null
  return [...new Set(workAuthors.length ? workAuthors : editionAuthors)]
}

/** 원작에 소개가 있어도 다른 본문의 판본에 복사하지 않는다. ISBN 연결만으로는 충분하지 않다. */
export function canUseBookWorkIntroduction(
  editionTitle: string | null | undefined, editionAuthors: readonly string[],
  workTitle: string | null | undefined, workAuthors: readonly string[],
): boolean {
  return Boolean(editionTitle && workTitle && editionAuthors.length && workAuthors.length
    && bookEditionTitleKey(editionTitle) === bookEditionTitleKey(workTitle)
    && getBookOriginalAuthorKeys(editionAuthors, workAuthors)?.length)
}
