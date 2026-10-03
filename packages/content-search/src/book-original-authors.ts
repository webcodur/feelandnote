/** 서로 다른 판의 인물이 연결 원전의 저자 목록에 섞이면 자동 선택하지 않는다. */
export function getBookOriginalAuthorKeys(editionAuthors: readonly string[], workAuthors: readonly string[]): string[] | null {
  if (workAuthors.length && editionAuthors.length && workAuthors.some(key => !editionAuthors.includes(key))) return null
  return [...new Set(workAuthors.length ? workAuthors : editionAuthors)]
}
