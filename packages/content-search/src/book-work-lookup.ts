/**
 * 도서 등록 전에 같은 작품을 찾는 공통 조회다.
 * ISBN과 원작 키의 대조 기준은 이 파일 하나가 쥐고, 등록 경로는 결과에 따른 처리만 맡는다.
 */

interface LookupResult {
  data: unknown[] | null
  error: unknown
}

/** 호출하는 앱마다 DB 클라이언트 타입이 달라 필요한 조회 형태만 요구한다. */
export interface BookWorkLookupDb {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any
}

const firstError = (results: LookupResult[]) => results.find(result => result.error)?.error ?? null

/** 대표 ID·언어 카드·판본 어디에 있든 이 ISBN을 가진 작품 ID를 모은다. 여러 개면 귀속 확인이 필요한 상태다. */
export async function findBookIsbnOwners(db: BookWorkLookupDb, isbn: string): Promise<{ ids: string[]; error: unknown }> {
  const [works, locales, editions]: LookupResult[] = await Promise.all([
    db.from('contents').select('id').eq('type', 'BOOK').eq('external_id', isbn),
    db.from('content_locales').select('content_id').eq('isbn', isbn),
    db.from('figure_book_editions').select('content_id').eq('isbn', isbn),
  ])
  const error = firstError([works, locales, editions])
  if (error) return { ids: [], error }
  const ids = [
    ...(works.data ?? []).map(row => (row as { id: string }).id),
    ...[...(locales.data ?? []), ...(editions.data ?? [])].map(row => (row as { content_id: string }).content_id),
  ]
  return { ids: [...new Set(ids)], error: null }
}

/** 같은 원작 키의 작품이나 판본이 이미 있는지 본다. */
export async function hasBookWorkKeyMatch(db: BookWorkLookupDb, workKey: string): Promise<{ found: boolean; error: unknown }> {
  const results: LookupResult[] = await Promise.all([
    db.from('contents').select('id').eq('type', 'BOOK').eq('metadata->>workKey', workKey).limit(1),
    db.from('contents').select('id').eq('type', 'BOOK').eq('metadata->figureBook->>openLibraryWork', workKey).limit(1),
    db.from('figure_book_editions').select('content_id').eq('sources->>workKey', workKey).limit(1),
    db.from('content_locales').select('content_id').eq('sources->>workKey', workKey).limit(1),
  ])
  const error = firstError(results)
  if (error) return { found: false, error }
  return { found: results.some(result => result.data?.length), error: null }
}
