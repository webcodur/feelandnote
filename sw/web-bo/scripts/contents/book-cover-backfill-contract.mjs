import { toIsbn13 } from '../../../../packages/content-search/src/book-isbn.ts'
import { bookEditionTitleKey } from '../../../../packages/content-search/src/book-series.ts'
import { sqlLiteral } from '../figure-books/lib/merge-work-sql.mjs'

const TABLES = ['content_locales', 'figure_book_editions']
const text = value => String(value ?? '').trim()
const nameKey = value => text(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const authorKey = value => text(value).split(/[,，;^]/u).map(nameKey).filter(Boolean).sort().join('|')
export const missingProviderReason = row => row.sources?.primary === 'none'
  ? ['translated', 'romanized', 'original'].includes(row.sources?.title) ? 'display_title' : 'no_provider' : null
export const preserveHash = alias => `md5(((to_jsonb(${alias})-'thumbnail_url'-'updated_at'-'sources') || jsonb_build_object('sources',coalesce(${alias}.sources,'{}'::jsonb)-'thumbnail'))::text)`

export function matchCoverEdition(row, official) {
  if (missingProviderReason(row)) return missingProviderReason(row)
  if (!official || official.error) return official?.error ?? 'provider_not_found'
  if (toIsbn13(row.isbn ?? '') !== official.isbn) return 'isbn_mismatch'
  const title = bookEditionTitleKey(row.title)
  if (!title || ![official.title, official.mainTitle].some(candidate => bookEditionTitleKey(candidate) === title)) return 'title_mismatch'
  if (!authorKey(row.creator) || authorKey(row.creator) !== authorKey(official.creator)) return 'creator_mismatch'
  return null
}

const target = (row, alias) => row.table === 'content_locales'
  ? `${alias}.content_id=${sqlLiteral(row.content_id)} AND ${alias}.locale=${sqlLiteral(row.locale)}`
  : `${alias}.id=${sqlLiteral(String(row.id))}::bigint AND ${alias}.content_id=${sqlLiteral(row.content_id)}`
const validRow = row => {
  if (!TABLES.includes(row.table)) throw new Error('Unsupported cover table')
  if (!/^[a-f0-9]{32}$/u.test(row.row_hash)) throw new Error('Missing concurrency hash')
}
export function buildCoverApplySql(changes) {
  const updates = changes.map(({ row, cover, source, donor }) => {
    validRow(row)
    if (!/^https:\/\//u.test(cover) || !/^https:\/\//u.test(source)) throw new Error('Invalid cover source')
    if (donor) validRow(donor)
    const evidenceGuard = donor ? ` AND EXISTS (SELECT 1 FROM ${donor.table} d WHERE ${target(donor, 'd')} AND md5(to_jsonb(d)::text)=${sqlLiteral(donor.row_hash)})` : ''
    return `WITH changed AS (UPDATE ${row.table} t SET thumbnail_url=${sqlLiteral(cover)}, sources=jsonb_set(coalesce(t.sources,'{}'::jsonb),'{thumbnail}',${sqlLiteral(JSON.stringify(source))}::jsonb),updated_at=now() WHERE ${target(row, 't')} AND nullif(btrim(t.thumbnail_url),'') IS NULL AND md5(to_jsonb(t)::text)=${sqlLiteral(row.row_hash)}${evidenceGuard} RETURNING t.*) SELECT jsonb_build_object('table',${sqlLiteral(row.table)},'id',${row.table === 'content_locales' ? 'NULL' : 't.id'},'content_id',t.content_id,'locale',t.locale,'thumbnail_url',t.thumbnail_url,'source',t.sources->>'thumbnail','preserved_hash',${preserveHash('t')}) FROM changed t;`
  })
  return `BEGIN;\n${updates.join('\n')}\nCOMMIT;`
}

/** 같은 작품·ISBN·언어·제목·저자·출판사의 검증된 형제 행만 재사용한다. */
export function storedCoverCandidates(sql, rows) {
  const ids = [...new Set(rows.filter(row => toIsbn13(row.isbn ?? '') && !missingProviderReason(row)).map(row => row.content_id))]
  if (!ids.length) return []
  const selected = ids.map(sqlLiteral).join(',')
  const sources = alias => `jsonb_build_object('primary',${alias}.sources->>'primary','thumbnail',${alias}.sources->>'thumbnail','isbn',${alias}.sources->>'isbn','title',${alias}.sources->>'title')`
  const donors = sql(`SELECT jsonb_build_object('table','content_locales','id',NULL,'content_id',l.content_id,'locale',l.locale,'title',l.title,'creator',l.creator,'publisher',l.publisher,'isbn',l.isbn,'cover',l.thumbnail_url,'sources',${sources('l')},'row_hash',md5(to_jsonb(l)::text)) FROM content_locales l WHERE l.content_id IN (${selected}) AND l.verified AND nullif(btrim(l.thumbnail_url),'') IS NOT NULL UNION ALL SELECT jsonb_build_object('table','figure_book_editions','id',e.id,'content_id',e.content_id,'locale',e.locale,'title',e.title,'creator',e.creator,'publisher',e.publisher,'isbn',e.isbn,'cover',e.thumbnail_url,'sources',${sources('e')},'row_hash',md5(to_jsonb(e)::text)) FROM figure_book_editions e WHERE e.content_id IN (${selected}) AND e.verified AND nullif(btrim(e.thumbnail_url),'') IS NOT NULL;`)
  const identity = row => JSON.stringify([row.content_id, row.locale, toIsbn13(row.isbn ?? ''), row.title, row.creator, row.publisher])
  const byKey = new Map(donors.filter(row => toIsbn13(row.isbn ?? '')).map(row => [identity(row), row]))
  return rows.flatMap(row => {
    if (!toIsbn13(row.isbn ?? '') || missingProviderReason(row)) return []
    const donor = byKey.get(identity(row))
    if (!donor) return []
    const provider = donor.sources?.primary, source = [donor.sources?.thumbnail, donor.sources?.isbn, donor.sources?.title].find(url => typeof url === 'string' && (provider === 'openlibrary' ? /^https:\/\/openlibrary\.org\/(?:books\/OL\d+M|isbn\/\d+)/u.test(url) : provider === 'kakao_book' && /^https:\/\/[^/]*daum\.net\//u.test(url)))
    let cover = donor.cover
    try {
      let url = new URL(cover)
      if (provider === 'kakao_book' && /^search\d*\.kakaocdn\.net$/u.test(url.hostname)) url = new URL(url.searchParams.get('fname'))
      url.protocol = 'https:'
      const allowed = provider === 'openlibrary' ? url.hostname === 'covers.openlibrary.org' && /^\/b\/id\/\d+-[LMS]\.jpg$/u.test(url.pathname) : provider === 'kakao_book' && url.hostname === 't1.daumcdn.net' && url.pathname.startsWith('/lbook/image/')
      if (!allowed || !source) return []
      cover = url.href
    } catch { return [] }
    return [{ row, donor, cover, source }]
  })
}
