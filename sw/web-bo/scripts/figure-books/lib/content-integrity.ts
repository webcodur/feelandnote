import { ISBN_FORMATTING_PATTERN, toIsbn13 } from '@feelandnote/content-search/book-isbn'
import { CONTENT_ARRAY_REFERENCES } from './content-array-references.mjs'

type Row = Record<string, unknown>
const arrayColumns = (table: string, base: string) => [base, ...CONTENT_ARRAY_REFERENCES.filter(ref => ref.table === table).map(ref => ref.column)].join(',')
export const INTEGRITY_QUERIES = [
  { table: 'contents', columns: 'id,type,external_id,external_source,member_count,celeb_count,record_count', order: ['id'] },
  { table: 'content_locales', columns: 'content_id,locale,isbn,publisher,thumbnail_url,sources', order: ['content_id', 'locale'] },
  { table: 'figure_book_contents', columns: 'content_id', order: ['content_id'] },
  { table: 'figure_book_characters', columns: 'content_id,celeb_id', order: ['content_id', 'celeb_id'] },
  { table: 'figure_book_editions', columns: 'id,content_id,locale,isbn', order: ['id'] },
  { table: 'figure_book_products', columns: 'id,edition_id', order: ['id'] },
  { table: 'member_contents', columns: 'id,content_id,member_id', order: ['id'] },
  { table: 'celeb_contents', columns: 'id,content_id,celeb_id', order: ['id'] },
  { table: 'curated_list_items', columns: 'id,content_id', order: ['id'] },
  { table: 'flow_nodes', columns: arrayColumns('flow_nodes', 'id,content_id'), order: ['id'] },
  { table: 'records', columns: 'id,content_id', order: ['id'] },
  { table: 'notes', columns: 'id,content_id', order: ['id'] },
  { table: 'activity_logs', columns: 'id,content_id', order: ['id'] },
  { table: 'faction_lv2', columns: arrayColumns('faction_lv2', 'id'), order: ['id'] },
  { table: 'flows', columns: arrayColumns('flows', 'id'), order: ['id'] },
  { table: 'tier_lists', columns: arrayColumns('tier_lists', 'id'), order: ['id'] },
] as const
export type IntegrityTable = typeof INTEGRITY_QUERIES[number]['table']
export type IntegrityRows = Record<IntegrityTable, Row[]>
type PageResult = { data: Row[] | null; error: { message: string } | null }

/** 각 페이지 실패를 즉시 알린다. 결과를 DB transaction snapshot으로 간주하지 않는다. */
export async function readIntegrityRows(
  readPage: (query: typeof INTEGRITY_QUERIES[number], from: number, to: number) => Promise<PageResult>,
  pageSize = 1000,
): Promise<IntegrityRows> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('올바른 페이지 크기가 필요합니다.')
  const rows = {} as IntegrityRows
  for (const query of INTEGRITY_QUERIES) {
    rows[query.table] = []
    for (let from = 0; ; from += pageSize) {
      const result = await readPage(query, from, from + pageSize - 1)
      if (result.error) throw new Error(`${query.table} 조회 실패: ${result.error.message}`)
      if (!Array.isArray(result.data)) throw new Error(`${query.table} 조회 결과가 배열이 아닙니다.`)
      rows[query.table].push(...result.data)
      if (result.data.length < pageSize) break
    }
  }
  return rows
}

export interface IntegrityIssue {
  kind: string
  table: string
  rowId?: string
  contentId?: string
  field?: string
  referencedId?: string
  isbn?: string
  contentIds?: string[]
  actual?: unknown
  expected?: number
}
const text = (value: unknown) => typeof value === 'string' ? value : ''
const nonempty = (value: unknown) => value !== null && value !== undefined && text(value).trim() !== ''
const rowId = (row: Row) => row.id != null ? String(row.id) : [row.content_id, row.locale, row.celeb_id].filter(value => value != null).join(':')

/** 작품 정체성이나 원전 범위를 추측하지 않고 저장 구조의 불일치만 판정한다. */
export function inspectContentIntegrity(rows: IntegrityRows) {
  for (const query of INTEGRITY_QUERIES) if (!Array.isArray(rows[query.table])) throw new Error(`검사 입력 누락: ${query.table}`)
  const issues: IntegrityIssue[] = []
  const reviewCandidates: IntegrityIssue[] = []
  const contents = new Map(rows.contents.map(row => [text(row.id), row]))
  const catalog = new Set(rows.figure_book_contents.map(row => text(row.content_id)))
  const editions = new Set(rows.figure_book_editions.map(row => String(row.id)))
  const localeIds = new Set(rows.content_locales.map(row => text(row.content_id)))
  const add = (kind: string, table: string, row: Row, detail: Omit<IntegrityIssue, 'kind' | 'table'> = {}) => {
    issues.push({ kind, table, rowId: rowId(row), ...(row.content_id != null && { contentId: text(row.content_id) }), ...detail })
  }
  const isbnWorks = new Map<string, Set<string>>()
  const rememberIsbn = (isbn: string, contentId: string) => {
    if (contents.get(contentId)?.type !== 'BOOK') return
    const ids = isbnWorks.get(isbn) ?? new Set<string>(); ids.add(contentId); isbnWorks.set(isbn, ids)
  }
  for (const table of ['content_locales', 'figure_book_editions'] as const) for (const row of rows[table]) {
    if (row.isbn != null && text(row.isbn).replace(ISBN_FORMATTING_PATTERN, '') !== '') {
      const isbn = toIsbn13(text(row.isbn))
      if (!isbn) add('invalid-isbn', table, row, { field: 'isbn' })
      else rememberIsbn(isbn, text(row.content_id))
    }
    if (table === 'content_locales' && row.sources && typeof row.sources === 'object' && !Array.isArray(row.sources) && (row.sources as Row).primary === 'none') {
      // description은 작품 소개이며, 기존 판본 이력도 이 판정으로 지우거나 결함 취급하지 않는다.
      const fields = ['isbn', 'publisher', 'thumbnail_url'].filter(field => field === 'isbn' ? text(row[field]).replace(ISBN_FORMATTING_PATTERN, '') !== '' : nonempty(row[field]))
      if (fields.length) add('display-card-edition-metadata', table, row, { field: fields.join(',') })
    }
  }
  for (const row of rows.contents) if (row.type === 'BOOK') {
    const id = text(row.id), rawIsbn = text(row.external_id)
    // OL…·book-… 같은 공급자 ID는 ISBN 칸이 아니므로 ISBN으로 오인하지 않는다.
    const compact = rawIsbn.replace(ISBN_FORMATTING_PATTERN, '')
    // 카카오 상품 바코드(200/480 등)는 ISBN이 아니다. ISBN 형식만 검사한다.
    if (/^(?:[0-9]{9}[0-9Xx]|97[89][0-9]{10})$/.test(compact)) {
      const isbn = toIsbn13(rawIsbn)
      if (!isbn) add('invalid-book-external-isbn', 'contents', row, { field: 'external_id' })
      else rememberIsbn(isbn, id)
    }
    if (!localeIds.has(id)) add('book-without-locale', 'contents', row, { contentId: id })
  }
  // 현재 실제 FK: contents 직접 참조, catalog 자식, edition 상품. NULL 허용 참조는 정상이다.
  const directTables = ['content_locales', 'figure_book_contents', 'member_contents', 'celeb_contents', 'curated_list_items', 'flow_nodes', 'records', 'notes', 'activity_logs'] as const
  for (const table of directTables) for (const row of rows[table]) {
    if (row.content_id != null && !contents.has(text(row.content_id))) add('orphan-content-reference', table, row, { field: 'content_id', referencedId: text(row.content_id) })
  }
  for (const table of ['figure_book_characters', 'figure_book_editions'] as const) for (const row of rows[table]) {
    if (!catalog.has(text(row.content_id))) add('orphan-catalog-reference', table, row, { field: 'content_id', referencedId: text(row.content_id) })
  }
  for (const row of rows.figure_book_products) if (!editions.has(String(row.edition_id))) add('orphan-edition-reference', 'figure_book_products', row, { field: 'edition_id', referencedId: String(row.edition_id) })
  const checkArray = (table: string, row: Row, field: string, value: unknown) => {
    if (value == null) return
    if (!Array.isArray(value)) { add('invalid-content-id-array', table, row, { field }); return }
    for (const id of new Set(value)) if (typeof id !== 'string' || !contents.has(id)) add('dangling-content-id-array', table, row, { field, referencedId: typeof id === 'string' ? id : String(id) })
  }
  for (const ref of CONTENT_ARRAY_REFERENCES) for (const row of rows[ref.table]) {
    const value = row[ref.column]
    if (ref.shape !== 'tiers') checkArray(ref.table, row, ref.column, value)
    else if (value != null) {
      if (typeof value !== 'object' || Array.isArray(value)) add('invalid-content-id-array', ref.table, row, { field: ref.column })
      else for (const [tier, ids] of Object.entries(value)) checkArray(ref.table, row, `${ref.column}.${tier}`, ids)
    }
  }
  // 합본에 실린 독립 원전들이 같은 물리 판본 ISBN을 공유할 수 있다. 원전 동일성은 사람이 확인한다.
  for (const [isbn, ids] of isbnWorks) if (ids.size > 1) reviewCandidates.push({ kind: 'isbn-content-collision', table: 'contents', isbn, contentIds: [...ids].sort() })
  const count = (table: 'member_contents' | 'celeb_contents') => {
    const counts = new Map<string, number>()
    for (const row of rows[table]) { const id = text(row.content_id); counts.set(id, (counts.get(id) ?? 0) + 1) }
    return counts
  }
  const members = count('member_contents'), celebs = count('celeb_contents')
  for (const row of rows.contents) {
    const id = text(row.id), member = members.get(id) ?? 0, celeb = celebs.get(id) ?? 0
    for (const [field, expected] of [['member_count', member], ['celeb_count', celeb], ['record_count', member + celeb]] as const) {
      if (row[field] !== expected) add('content-count-mismatch', 'contents', row, { contentId: id, field, actual: row[field], expected })
    }
  }
  const countsByIssue: Record<string, number> = {}
  for (const issue of issues) countsByIssue[issue.kind] = (countsByIssue[issue.kind] ?? 0) + 1
  return { issueCount: issues.length, countsByIssue, issues, reviewCandidateCount: reviewCandidates.length, reviewCandidates }
}
