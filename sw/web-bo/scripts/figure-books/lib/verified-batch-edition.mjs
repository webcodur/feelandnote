// Native batch entrypoints reuse the TS provider/work guards through the existing BO loader.
await import('tsx')
const inputModule = await import('@feelandnote/content-search/external-book-input')
const workModule = await import('../../../src/lib/book-edition-work.ts')
const contractModule = await import('../source-book-batch-contract.ts')
const { resolveExternalBookInput } = inputModule.default ?? inputModule
export const { sameBookIdentity, normalizeBookIdentity } = inputModule.default ?? inputModule
const { verifyEditionWork } = workModule.default ?? workModule
const { FICTION_SOURCE_BOOK_EDITION_KINDS } = contractModule.default ?? contractModule
const isbnModule = await import('@feelandnote/content-search/book-isbn')
const { toIsbn13 } = isbnModule.default ?? isbnModule

/** An independently reviewed edition declaration applies only to its explicitly bound ISBN. */
export function reviewedBatchScope(edition, actualIsbn) {
  const unknown = { edition_kind: null, text_scope: null, scope_evidence: null }
  const isbn = toIsbn13(String(actualIsbn ?? ''))
  if (!isbn || !edition || toIsbn13(String(edition.isbn ?? '')) !== isbn) return unknown
  const scope = typeof edition.scope === 'string' ? edition.scope.trim() : ''
  let independentUrl = false
  try {
    const url = new URL(edition.evidenceUrl)
    independentUrl = url.protocol === 'https:' && !/(^|\.)openlibrary\.org$/i.test(url.hostname)
  } catch { /* A title/catalog label is not independent scope evidence. */ }
  if (!FICTION_SOURCE_BOOK_EDITION_KINDS.includes(edition.kind) || !scope || !independentUrl) return unknown
  if (edition.kind === 'full' && scope !== 'complete') return unknown
  return { edition_kind: edition.kind, text_scope: scope, scope_evidence: edition.evidenceUrl }
}

/** Cached candidates are never official metadata; refetch their same ISBN and full identity. */
export async function resolveBatchBook(candidate, locale) {
  const creator = candidate.creator ?? (Array.isArray(candidate.authors) ? candidate.authors.join(', ') : '')
  const book = await resolveExternalBookInput({ externalId: candidate.isbn, externalSource: locale === 'ko' ? 'kakao_book' : 'openlibrary',
    title: candidate.title, creator, coverImageUrl: null, metadata: { isbn: candidate.isbn } })
  if (book.locale !== locale) throw new Error('공식 판본의 언어가 등록할 언어와 다릅니다')
  return book
}

/** Existing BOOK attribution, including a reviewed series, is checked against current server data. */
export async function verifyBatchWork(db, contentId, book, scope) {
  return verifyEditionWork(db, { contentId, locale: book.locale, isbn: book.externalId, title: book.title, creator: book.creator,
    sourceUrl: String(book.metadata.link ?? ''), workKey: book.metadata.workKey, workTitle: book.metadata.workTitle,
    editionKind: scope.edition_kind, textScope: scope.text_scope })
}
