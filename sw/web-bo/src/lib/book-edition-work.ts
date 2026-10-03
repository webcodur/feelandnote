import type { DatabaseClient } from '@feelandnote/db'
import { normalizeBookIdentity } from '@feelandnote/content-search/external-book-input'
import { equivalentIsbns, toIsbn13 } from '@feelandnote/content-search/book-isbn'

export interface OfficialEditionWork {
  contentId: string
  locale: 'ko' | 'en'
  isbn: string
  title: string
  creator: string | null
  sourceUrl: string
  workKey?: string | null
  workTitle?: string | null
  editionKind?: string | null
  textScope?: string | null
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function string(value: unknown): string { return typeof value === 'string' ? value.trim() : '' }
function same(left: string, right: string): boolean {
  return !!left && !!right && normalizeBookIdentity(left) === normalizeBookIdentity(right)
}
function workKey(value: unknown): string | null {
  const match = string(value).match(/(?:^|\/)(OL\d+W)(?:$|[/?#])/i)
  return match ? '/works/' + match[1].toUpperCase() : null
}
function independentSource(value: unknown): boolean {
  try {
    const url = new URL(string(value))
    return url.protocol === 'https:' && !/(^|\.)openlibrary\.org$/i.test(url.hostname)
  } catch { return false }
}
function sameIds(value: unknown, ids: string[]): boolean {
  return Array.isArray(value) && value.length === ids.length && new Set(value).size === value.length
    && value.every(id => typeof id === 'string' && ids.includes(id))
}
type IsbnOwnerRow = { id?: unknown; content_id?: unknown; isbn?: unknown; external_id?: unknown; text_scope?: unknown }

/** Fetch only digit-order candidates; normalize after lookup to reject unrelated subsequences. */
async function sameIsbnOwners(db: DatabaseClient, table: 'contents' | 'content_locales' | 'figure_book_editions', isbn: string,
  options: { excludeId?: string; ownerIds?: string[] } = {}): Promise<{ data: IsbnOwnerRow[] }> {
  const field = table === 'contents' ? 'external_id' : 'isbn', owner = table === 'contents' ? 'id' : 'content_id'
  const columns = table === 'contents' ? 'id,external_id' : table === 'content_locales' ? 'content_id,locale,isbn' : 'id,content_id,isbn,text_scope'
  const filter = equivalentIsbns(isbn).map(value => `${field}.ilike.%${[...value].join('%')}%`).join(',')
  const rows: IsbnOwnerRow[] = [], pageSize = 100
  for (let from = 0; ; from += pageSize) {
    let query = db.from(table).select(columns).or(filter)
    if (table === 'contents') query = query.eq('type', 'BOOK')
    if (options.excludeId) query = query.neq(owner, options.excludeId)
    if (options.ownerIds) query = query.in(owner, options.ownerIds)
    query = table === 'content_locales' ? query.order('content_id').order('locale') : query.order('id')
    const result = await query.range(from, from + pageSize - 1)
    if (result.error) throw new Error(`원전 ISBN 소유 조회 실패: ${result.error.message}`)
    if (!Array.isArray(result.data)) throw new Error('원전 ISBN 소유 조회 결과를 확인할 수 없습니다')
    for (const row of result.data) if (toIsbn13(string(object(row)[field])) === isbn) rows.push(row as IsbnOwnerRow)
    if (result.data.length < pageSize) return { data: rows }
  }
}

/** Official edition facts must agree with the current server work, not a caller's chosen contentId. */
export async function verifyEditionWork(db: DatabaseClient, input: OfficialEditionWork): Promise<Record<string, unknown>> {
  const isbn = toIsbn13(input.isbn)
  if (!isbn || !input.title.trim() || !input.creator?.trim()) throw new Error('판본의 ISBN·제목·전체 원저자를 확인할 수 없습니다')
  const results = await Promise.all([
    db.from('contents').select('id,type,metadata').eq('id', input.contentId).maybeSingle(),
    db.from('figure_book_contents').select('content_id').eq('content_id', input.contentId).maybeSingle(),
    db.from('content_locales').select('locale,title,creator,isbn,sources').eq('content_id', input.contentId),
    db.from('figure_book_editions').select('isbn,title,creator,sources').eq('content_id', input.contentId),
    sameIsbnOwners(db, 'contents', isbn, { excludeId: input.contentId }),
    sameIsbnOwners(db, 'content_locales', isbn, { excludeId: input.contentId }),
    sameIsbnOwners(db, 'figure_book_editions', isbn, { excludeId: input.contentId }),
  ])
  for (const result of results) if ('error' in result && result.error) throw new Error(`원전 귀속 조회 실패: ${result.error.message}`)
  const [contentResult, catalogResult, localeResult, editionResult, ...collisions] = results
  if (!contentResult.data || contentResult.data.type !== 'BOOK' || !catalogResult.data) throw new Error('판본을 연결할 기존 원전 작품을 확인할 수 없습니다')
  if (!Array.isArray(localeResult.data)) throw new Error('원전 언어 카드 조회 결과를 확인할 수 없습니다')
  if (!Array.isArray(editionResult.data)) throw new Error('기존 판본의 원전 확인 근거를 조회할 수 없습니다')
  if (collisions.some(result => !Array.isArray(result.data))) throw new Error('ISBN 귀속 조회 결과를 확인할 수 없습니다')
  const collisionIds = [...new Set(collisions.flatMap((result, index) => result.data!.map(row => string(index === 0 ? object(row).id : object(row).content_id))))]
  if (collisionIds.includes('')) throw new Error('ISBN 소유 작품 ID를 확인할 수 없습니다')
  const metadata = object(contentResult.data.metadata), figure = object(metadata.figureBook)
  const origin = { title: string(figure.workTitle ?? metadata.workTitle), creator: string(figure.workCreator ?? metadata.workCreator) }
  const anchors = localeResult.data.flatMap(row => {
    const title = string(row.title), creator = string(row.creator)
    return title && creator ? [{ title, creator, locale: string(row.locale) }] : []
  })
  if (origin.title && origin.creator) anchors.push({ ...origin, locale: 'original' })
  if (!anchors.length) throw new Error('서버 원전의 제목·전체 원저자가 누락되어 판본 귀속을 확인할 수 없습니다')
  const knownKeys = [...new Set([metadata.workKey, figure.workKey, figure.openlibraryWorkKey, figure.openLibraryWorkKey, figure.openLibraryWork, figure.workIdentity].map(workKey).filter(Boolean))]
  const suppliedKey = workKey(input.workKey)
  if (input.workKey && (!suppliedKey || !input.workTitle?.trim())) throw new Error('공식 ISBN에 연결된 원전 ID·제목 조회를 확인할 수 없습니다')
  const proofs = [...localeResult.data, ...editionResult.data].flatMap(row => {
    const sources = object(row.sources)
    return [sources.work_attribution, ...(Array.isArray(sources.edition_work_evidence) ? sources.edition_work_evidence : [])]
  }).map(object)
  const matchesReview = (candidate: Record<string, unknown>): boolean => {
    return candidate.content_id === input.contentId
      && toIsbn13(string(candidate.isbn)) === isbn
      && candidate.locale === input.locale
      && same(string(candidate.edition_title), input.title) && same(string(candidate.edition_creator), input.creator!)
      && anchors.some(anchor => same(anchor.title, string(candidate.original_title)) && same(anchor.creator, string(candidate.original_creator)))
      && (!origin.title || !origin.creator || (same(origin.title, string(candidate.original_title)) && same(origin.creator, string(candidate.original_creator))))
      && (!figure.workIdentity || candidate.work_identity === figure.workIdentity)
      && !!input.editionKind && candidate.edition_kind === input.editionKind
      && !!input.textScope && candidate.text_scope === input.textScope
      && Number.isFinite(Date.parse(string(candidate.reviewed_at))) && independentSource(candidate.source_url)
  }
  const ownerIds = [input.contentId, ...collisionIds]
  // Real omnibus editions can share one ISBN across distinct originals. The stored TOC
  // review must name every current owner; an added owner invalidates the exception.
  const omnibusProof = proofs.find(candidate => candidate.method === 'independent_omnibus_review' && matchesReview(candidate)
    && !!string(figure.workIdentity) && candidate.work_identity === figure.workIdentity
    && (suppliedKey ? workKey(candidate.official_work_key) === suppliedKey : !string(candidate.official_work_key))
    && (input.workTitle ? same(string(candidate.official_work_title), input.workTitle) : !string(candidate.official_work_title))
    && independentSource(candidate.toc_source_url) && sameIds(candidate.owner_content_ids, ownerIds)
    && Array.isArray(candidate.contained_originals)
    && sameIds(candidate.contained_originals.map(item => object(item).content_id), ownerIds))
  if (omnibusProof) {
    const [works, cards, editions] = await Promise.all([
      db.from('contents').select('id,type,metadata').in('id', ownerIds),
      db.from('content_locales').select('content_id,title,creator').in('content_id', ownerIds),
      sameIsbnOwners(db, 'figure_book_editions', isbn, { ownerIds }),
    ])
    for (const result of [works, cards, editions]) if ('error' in result && result.error) throw new Error(`합본 수록 원전 조회 실패: ${result.error.message}`)
    if (!Array.isArray(works.data) || !Array.isArray(cards.data) || !Array.isArray(editions.data)
      || !sameIds(works.data.map(row => row.id), ownerIds)) throw new Error('합본의 모든 ISBN 소유 원전을 확인할 수 없습니다')
    const ownerWorks = works.data, ownerCards = cards.data, ownerEditions = editions.data
    const contained = (omnibusProof.contained_originals as unknown[]).map(object)
    const verified = contained.every(item => {
      const work = ownerWorks.find(row => row.id === item.content_id)
      if (!work || work.type !== 'BOOK') return false
      const meta = object(work.metadata), original = object(meta.figureBook)
      const title = string(original.workTitle ?? meta.workTitle), creator = string(original.workCreator ?? meta.workCreator)
      const identity = string(original.workIdentity)
      const matchesOriginal = title && creator ? same(title, string(item.title)) && same(creator, string(item.creator))
        : ownerCards.some(card => card.content_id === item.content_id && same(string(card.title), string(item.title)) && same(string(card.creator), string(item.creator)))
      return !!identity && item.work_identity === identity && matchesOriginal && !!string(item.text_scope)
        && (item.content_id !== input.contentId || (same(string(item.title), string(omnibusProof.original_title))
          && same(string(item.creator), string(omnibusProof.original_creator)) && item.text_scope === input.textScope))
        && ownerEditions.every(edition => edition.content_id !== item.content_id || !string(edition.text_scope) || edition.text_scope === item.text_scope)
    })
    if (!verified) throw new Error('합본 목차의 수록 원전·전체 원저자·범위가 현재 서버 작품과 다릅니다')
    return { ...omnibusProof, official_source_url: input.sourceUrl, work_key: suppliedKey, checked_at: new Date().toISOString() }
  }
  if (collisionIds.length) throw new Error(`${isbn}: 같은 ISBN이 다른 작품에 연결되어 있습니다. 먼저 원전 귀속을 확인하세요`)
  // A reviewed series may use its first volume as the BOOK representative. Only a
  // server-stored review binding that representative and this exact volume can bridge OL works.
  const seriesProof = proofs.find(candidate => candidate.method === 'independent_series_review' && matchesReview(candidate)
    && !!string(candidate.series_title) && !!string(candidate.series_scope)
    && same(string(candidate.series_creator), input.creator!) && same(string(candidate.original_creator), input.creator!)
    && knownKeys.length > 0 && knownKeys.includes(workKey(candidate.representative_work_key))
    && !!suppliedKey && workKey(candidate.volume_work_key) === suppliedKey
    && same(string(candidate.volume_work_title), string(input.workTitle)))
  if (seriesProof) return { ...seriesProof, official_source_url: input.sourceUrl, work_key: suppliedKey, checked_at: new Date().toISOString() }
  if (suppliedKey && knownKeys.length && !knownKeys.includes(suppliedKey)) throw new Error('공식 ISBN의 원전 ID가 서버 원전과 다릅니다')
  const editionMatch = anchors.find(anchor => same(anchor.title, input.title) && same(anchor.creator, input.creator!))
  const originalMatch = input.workTitle ? anchors.find(anchor => same(anchor.title, input.workTitle!) && same(anchor.creator, input.creator!)) : undefined
  // A matching edition label cannot conceal a different original in the official response.
  if (input.workTitle && !originalMatch) throw new Error('공식 판본이 가리키는 원전 제목·전체 원저자가 서버 작품과 다릅니다')
  if (input.locale === 'en' && origin.title && origin.creator && input.workTitle
    && (!same(origin.title, input.workTitle) || !same(origin.creator, input.creator))) {
    throw new Error('공식 ISBN의 원전이 서버에 지정된 원전과 다릅니다')
  }
  if (!editionMatch) {
    // OL can attach an independent journal/workbook to the original's work ID. A differing
    // edition title needs a prior independent review stored on the server, never CLI input.
    const proof = proofs.find(candidate => candidate.method === 'independent_work_review' && matchesReview(candidate))
    if (!proof) throw new Error('ISBN 판본을 이 원전에 귀속할 근거가 없습니다. 제목이 다른 번역·분권은 해당 ISBN·전체 저자·범위의 독립 확인 근거를 서버에 먼저 보존하세요')
    return { ...proof, official_source_url: input.sourceUrl, work_key: suppliedKey, checked_at: new Date().toISOString() }
  }
  const matched = originalMatch ?? editionMatch!
  return { method: originalMatch ? 'official_work_identity' : 'official_exact_title_and_full_author', content_id: input.contentId,
    isbn, source_url: input.sourceUrl, work_key: suppliedKey, original_title: matched.title, original_creator: matched.creator,
    edition_title: input.title, checked_at: new Date().toISOString() }
}
