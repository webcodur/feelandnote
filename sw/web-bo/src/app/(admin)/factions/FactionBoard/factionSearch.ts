const SEARCH_SEPARATORS = /[\s\-_/·:|()[\]{}]+/g

export function getFactionSearchTokens(query: string): string[] {
  return query
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replace(SEARCH_SEPARATORS, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

export function matchesFactionSearch(
  tokens: string[],
  values: Array<string | null | undefined>,
): boolean {
  if (tokens.length === 0) return true

  const haystack = values
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replace(SEARCH_SEPARATORS, ' ')

  return tokens.every(token => haystack.includes(token))
}
