import { isDeepStrictEqual } from 'node:util'
import { dbClient, allRows } from '../figure-books/lib/figure-work.mjs'

const unwrap = module => module.default ?? module
const { loadFigureBookEditions } = unwrap(await import('../../../web/src/actions/figure-books/figureBookEditions.ts'))
const { resolveBookShelfBook } = unwrap(await import('../../../web/src/lib/books/bookShelf.ts'))
const { selectBookIntroduction } = unwrap(await import('../../../web/src/lib/utils/book-description.ts'))
const { forLocale } = unwrap(await import('../../../../packages/content-search/src/book-introduction.ts'))
const { researchIntroductionText } = unwrap(await import('./book-research-introduction-contract.ts'))

export const VISIBLE_BOOK_INTRODUCTION_MISSING = {
  ko: '출력되는 결손: 소개 없음', en: 'Missing introductions on visible books',
}
const IDENTITY = ['contentId', 'editionId', 'locale', 'title', 'creator', 'isbn']
export const targetKey = target => JSON.stringify(IDENTITY.map(key => target[key] ?? null))
const hasIntroduction = value => Boolean(value.description || value.bookIntroduction)

/** 지정 작품·언어만 실행할 때 다른 작업 대상의 미완료 원문을 지우지 않는다. */
export function refreshCollectionRows(saved, targets, { contentIds = [], locale } = {}) {
  const fresh = new Map(targets.map(target => [targetKey(target), target])), scope = new Set(contentIds)
  const latest = new Map(saved.map(row => [`${row.provider}|${targetKey(row.target)}`, row]))
  return [...latest.values()].filter(row => {
    const inScope = (!scope.size || scope.has(row.target.contentId)) && (!locale || row.target.locale === locale)
    return !inScope || fresh.has(targetKey(row.target))
  }).map(row => ({ ...row, target: fresh.get(targetKey(row.target)) ?? row.target }))
}

/** 매 실행 현재 DB를 읽는다. 수집용 ISBN 목록과 DB 행 전체 사본은 구분한다. */
export async function loadBookIntroductionCatalog(db = dbClient(), contentIds = []) {
  const works = await allRows('BOOK', (from, to) => {
    let query = db.from('contents').select('id,type,metadata').eq('type', 'BOOK').order('id')
    if (contentIds.length) query = query.in('id', contentIds)
    return query.range(from, to)
  })
  const wanted = new Set(works.map(work => work.id))
  // 전체 실행에서는 큰 IN 조건을 피하고, 지정 작품 실행에서는 해당 작품만 읽는다.
  const read = (table, order) => allRows(table, (from, to) => {
    let query = db.from(table).select('*').order(order)
    if (table === 'content_locales') query = query.order('locale')
    if (contentIds.length) query = query.in('content_id', contentIds)
    return query.range(from, to)
  }).then(rows => rows.filter(row => wanted.has(row.content_id)))
  if (!works.length) return { contents: [], content_locales: [], figure_book_editions: [], options: [] }
  const [cards, editions, options] = await Promise.all([
    read('content_locales', 'content_id'), read('figure_book_editions', 'id'),
    read('figure_book_purchase_options', 'edition_id'),
  ])
  return { contents: works, content_locales: cards, figure_book_editions: editions, options }
}

/** 서비스가 선택한 기본판과 선택 가능한 다른 판본의 소개 누락을 각각 센다. */
export async function visibleBookIntroductionCensus(catalog, db = null, locales = ['ko', 'en']) {
  const { contents: works, content_locales: cards, figure_book_editions: editions, options = [] } = catalog
  const cardsByWork = new Map(), editionsById = new Map(editions.map(row => [String(row.id), row]))
  for (const card of cards) {
    const list = cardsByWork.get(card.content_id) ?? []
    list.push(card); cardsByWork.set(card.content_id, list)
  }
  const counts = {}, targets = [], seen = new Set()
  for (const locale of locales) {
    const count = counts[locale] = { visibleWorks: 0, defaultMissing: 0, visibleEditionMissing: 0, localeFallbackMissing: 0 }
    const map = await loadFigureBookEditions(db, works.map(work => work.id), locale, false,
      { cards, works, editions, options, includeIntroductions: true })
    for (const work of works) {
      const workCards = cardsByWork.get(work.id) ?? [], card = workCards.find(row => row.locale === locale)
      const list = map.get(work.id) ?? []
      const book = resolveBookShelfBook({ ...work, content_locales: workCards }, list, locale, undefined, !map.has(work.id))
      if (!book) continue
      count.visibleWorks++
      const chosen = editionsById.get(String(book.editionId))
      if (!hasIntroduction(selectBookIntroduction(locale, chosen, card))) count.defaultMissing++
      const rows = list.length ? list.map(row => editionsById.get(String(row.id))).filter(Boolean) : card ? [card] : []
      for (const row of rows) {
        if (hasIntroduction(selectBookIntroduction(locale, row === card ? null : row, row === card ? card : null))) continue
        const editionId = row === card ? null : row.id, key = `${work.id}|${locale}|${editionId}`
        if (seen.has(key)) continue
        seen.add(key)
        if (editionId === null) count.localeFallbackMissing++; else count.visibleEditionMissing++
        targets.push({ contentId: work.id, editionId, locale, title: row.title, creator: row.creator ?? null,
          isbn: row.isbn ?? null, isDefault: String(book.editionId ?? null) === String(editionId), hasText: Boolean(row.description?.trim()) })
      }
    }
  }
  return { label: VISIBLE_BOOK_INTRODUCTION_MISSING.ko, counts, targetRows: targets.length,
    uniqueWorks: new Set(targets.map(target => target.contentId)).size, targets }
}

/** 검수한 행의 정체성이 현재 서비스 노출 대상과 다르거나 이미 채워졌으면 거부한다. */
export function buildReviewedIntroductionChanges(snapshot, reviews, visibleTargets) {
  if (!Array.isArray(reviews) || !reviews.length) throw Error('검수한 소개 배열이 필요합니다.')
  const current = new Set(visibleTargets.map(targetKey)), changes = [], seen = new Set()
  for (const review of reviews) {
    const { target, description, sourceUrl, method, sourceLocale, evidence } = review
    if (review.llmReviewed !== true || !target || !current.has(targetKey(target))) throw Error('현재 서비스 노출 대상에 대한 LLM 검수가 필요합니다.')
    let url
    try { url = new URL(sourceUrl) } catch { throw Error('소개 출처 URL이 필요합니다.') }
    if (url.protocol !== 'https:' || url.username || url.password || url.port
      || !Array.isArray(evidence) || !evidence.some(item => item.url === sourceUrl)
      || evidence.some(item => !item?.note?.trim() || !/^https:\/\//.test(item.url ?? ''))) {
      throw Error('직접 읽은 출처 본문의 검수 근거가 필요합니다.')
    }
    if (!['provider', 'research', 'translation'].includes(method) || !['ko', 'en', 'ja'].includes(sourceLocale)
      || (method === 'translation' ? sourceLocale === target.locale : sourceLocale !== target.locale)
      || (method === 'translation' && target.locale === 'ko' && review.translationBackend !== 'agy')) throw Error('소개 작성·번역 경로를 확인하세요.')
    if (typeof description !== 'string' || !forLocale(description, target.locale) || /<\/?[a-z][^>]*>/i.test(description)) throw Error('노출 가능한 소개 본문이 필요합니다.')
    if (method === 'research') researchIntroductionText({ ...target, description, sourceUrl, evidence })
    const selectedTable = target.editionId == null ? 'content_locales' : 'figure_book_editions'
    const selected = snapshot[selectedTable].find(row => target.editionId == null
      ? row.content_id === target.contentId && row.locale === target.locale : String(row.id) === String(target.editionId))
    if (!selected || selected.content_id !== target.contentId || selected.locale !== target.locale
      || selected.title !== target.title || (selected.creator ?? null) !== target.creator
      || (selected.isbn ?? null) !== target.isbn || selected.description?.trim()) throw Error('검수 후 판본 또는 소개가 변경됐습니다.')
    for (const table of ['content_locales', 'figure_book_editions']) {
      for (const before of snapshot[table].filter(row => row.content_id === target.contentId && row.locale === target.locale
        && (row.isbn ?? null) === target.isbn && row.title === target.title && (row.creator ?? null) === target.creator && !row.description?.trim())) {
        // ISBN 없는 표시 행의 문구를 독립된 다른 판본으로 복제하지 않는다.
        if (!target.isbn && before !== selected) continue
        const key = `${table}|${before.content_id}|${before.locale}|${before.id ?? ''}`
        const sources = { ...before.sources, description: sourceUrl, description_method: method, description_source_locale: sourceLocale }
        delete sources.introMissing
        const patch = { description: description.trim(), sources }
        if (seen.has(key)) {
          if (!isDeepStrictEqual(changes.find(change => change.key === key)?.patch, patch)) throw Error('같은 행에 서로 다른 소개를 지정했습니다.')
          continue
        }
        seen.add(key); changes.push({ key, table, before, patch })
      }
    }
  }
  return changes.map(change => ({ table: change.table, before: change.before, patch: change.patch }))
}
