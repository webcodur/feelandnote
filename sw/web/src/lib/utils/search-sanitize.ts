/**
 * PostgREST `.or()` 필터 문자열에 보간되는 검색어 안전화.
 * 구분자(콤마)·괄호는 필터 구문을 깨뜨리고, %·_·\는 ilike 와일드카드로 동작한다.
 * 전부 공백으로 치환해 사용자 입력이 필터 구조에 개입하지 못하게 한다.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,()%_\\]/g, ' ').replace(/\s+/g, ' ').trim()
}
