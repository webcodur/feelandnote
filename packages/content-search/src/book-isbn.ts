// 공급처 상품 코드와 실제 ISBN을 구분하는 공통 검증. 클라이언트에서도 사용한다.
export const ISBN13_PATTERN = /^97[89]\d{10}$/
export const ISBN10_PATTERN = /^\d{9}[\dX]$/
export const ISBN_FORMATTING_PATTERN = /[\s-]/g
export const ISBN10_WEIGHTS = Object.freeze(Array.from({ length: 10 }, (_, index) => 10 - index))
export const ISBN13_WEIGHTS = Object.freeze(Array.from({ length: 13 }, (_, index) => index % 2 ? 3 : 1))

/** 체크 숫자를 검증하고, 같은 판본의 ISBN-10을 ISBN-13으로 정규화한다. */
export function toIsbn13(raw: string): string | null {
  const compact = raw.replace(ISBN_FORMATTING_PATTERN, '').toUpperCase()
  if (ISBN10_PATTERN.test(compact)) {
    const checksum = [...compact].reduce(
      (sum, digit, index) => sum + (digit === 'X' ? 10 : Number(digit)) * ISBN10_WEIGHTS[index],
      0,
    )
    if (checksum % 11 !== 0) return null
    const prefix = `978${compact.slice(0, 9)}`
    const sum = [...prefix].reduce((value, digit, index) => value + Number(digit) * ISBN13_WEIGHTS[index], 0)
    return `${prefix}${(10 - sum % 10) % 10}`
  }
  if (!ISBN13_PATTERN.test(compact)) return null
  const checksum = [...compact].reduce((sum, digit, index) => sum + Number(digit) * ISBN13_WEIGHTS[index], 0)
  return checksum % 10 === 0 ? compact : null
}

/** Same checked edition identifiers, before optional whitespace/hyphen formatting. */
export function equivalentIsbns(raw: string): string[] {
  const isbn = toIsbn13(raw)
  if (!isbn) return []
  if (!isbn.startsWith('978')) return [isbn]
  const body = isbn.slice(3, 12)
  const sum = [...body].reduce((total, digit, index) => total + Number(digit) * ISBN10_WEIGHTS[index], 0)
  const check = (11 - sum % 11) % 11
  return [isbn, body + (check === 10 ? 'X' : String(check))]
}
