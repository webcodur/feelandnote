import { excludedBookEditionReason, bookEditionTranslationKey } from '@feelandnote/content-search/book-edition-policy'
import type { BookIntroductionReference, BookIntroductionAttribution } from '@/lib/utils/book-description'
import { normalizePurchaseIsbn } from '@/lib/books/yes24Purchase'
import { AFFILIATE_PLATFORMS, toAffiliateLinks, type AffiliateLink } from '@/constants/affiliatePlatforms'
import { toIsbn13 } from '@feelandnote/content-search/book-isbn'
import { decodeHtmlEntities } from '@feelandnote/content-search/html-entities'
import { selectSeriesRepresentatives } from '@feelandnote/content-search/book-series'

export type FigureBookProductPlatform = 'coupang' | 'amazon'

export interface FigureBookPurchaseOptionRow {
  edition_id: number
  content_id: string
  locale: string
  title: string
  creator: string | null
  description: string | null
  isbn: string | null
  publisher: string | null
  thumbnail_url: string | null
  release_date: string | null
  edition_kind: string | null
  text_scope: string | null
  sort_order: number
  platform: string
  affiliate_url: string
}

export interface FigureBookEdition {
  id: number
  locale?: 'ko' | 'en'
  /** 원래 locale의 실제 ISBN과 출처가 이 판본에 맞는 기존 링크만 보존한다. */
  affiliateLinks?: AffiliateLink[]
  title: string
  creator: string | null
  description: string | null
  bookIntroduction?: BookIntroductionReference | null
  introductionAttribution?: BookIntroductionAttribution
  isbn: string | null
  publisher: string | null
  /** 번역서의 역자 — 같은 번역 재출간과 다른 번역본을 가르는 같은 책 판정 재료다 */
  translator?: string | null
  /** 같은 원어 본문임을 판본별 독립 근거로 확인한 작품 식별자. */
  originalWorkIdentity?: string | null
  thumbnailUrl: string | null
  releaseDate: string | null
  editionKind: string | null
  textScope: string | null
  sortOrder: number
  platform: FigureBookProductPlatform | null
  // 구매처가 없는 판본도 책장에 세운다. 링크가 없으면 카드만 보이고 구매 버튼은 나오지 않는다.
  purchaseUrl: string | null
}

export interface FigureBookEditionRow {
  id: number
  content_id: string
  locale: string
  title: string
  creator: string | null
  description: string | null
  sources?: unknown
  isbn: string | null
  publisher: string | null
  thumbnail_url: string | null
  release_date: string | null
  edition_kind: string | null
  text_scope: string | null
  sort_order: number
}

export function getFigureBookPurchasePlatform(
  locale: string,
): FigureBookProductPlatform | null {
  if (locale === 'ko') return 'coupang'
  if (locale === 'en') return 'amazon'
  return null
}

/**
 * 공개 원전 책장은 요청 언어에 맞는 활성 구매 상품만 판본으로 인정한다.
 * 작품 locale이나 다른 언어의 상품으로 조용히 대체하지 않는다.
 */
export function mapFigureBookPurchaseOptions(
  rows: FigureBookPurchaseOptionRow[],
  locale: string,
): FigureBookEdition[] {
  const platform = getFigureBookPurchasePlatform(locale)
  if (!platform) return []

  return rows
    .filter((row) => (
      row.locale === locale
      && row.platform === platform
      && row.title.trim() !== ''
      && row.affiliate_url.startsWith('https://')
    ))
    .map((row) => ({
      id: row.edition_id,
      locale: locale as 'ko' | 'en',
      title: decodeHtmlEntities(row.title),
      creator: row.creator,
      description: row.description,
      isbn: row.isbn,
      publisher: row.publisher,
      thumbnailUrl: row.thumbnail_url,
      releaseDate: row.release_date,
      editionKind: row.edition_kind,
      textScope: row.text_scope,
      sortOrder: row.sort_order,
      platform,
      purchaseUrl: row.affiliate_url,
    }))
    .sort((a, b) => (
      a.sortOrder - b.sortOrder
      || a.id - b.id
    ))
}

/**
 * 구매 상품이 없는 판본을 책장에 세운다. 작품에 제휴 상품이 하나도 없을 때만 쓰며,
 * 상품이 있는 작품은 `mapFigureBookPurchaseOptions`가 고른 판본만 연다.
 */
export function mapFigureBookEditions(
  rows: FigureBookEditionRow[],
  locale: string,
): FigureBookEdition[] {
  return rows
    .filter((row) => row.locale === locale && row.title.trim() !== '')
    .map((row) => {
      const sources = row.sources && typeof row.sources === 'object' && !Array.isArray(row.sources)
        ? row.sources as Record<string, unknown> : {}
      const translators = Array.isArray(sources.translators)
        ? sources.translators.filter((value): value is string => typeof value === 'string' && !!value.trim()) : []
      const evidence = Array.isArray(sources.edition_work_evidence) ? sources.edition_work_evidence : []
      const original = evidence.find((value) => {
        const proof = value && typeof value === 'object' ? value as Record<string, unknown> : {}
        try {
          return proof.method === 'independent_work_review' && proof.content_id === row.content_id
            && proof.locale === row.locale && proof.original_language === row.locale
            && proof.isbn === row.isbn && proof.edition_title === row.title && proof.edition_creator === row.creator
            && proof.edition_kind === row.edition_kind && proof.text_scope === row.text_scope
            && typeof proof.work_identity === 'string' && new URL(String(proof.source_url)).protocol === 'https:'
        } catch { return false }
      }) as Record<string, unknown> | undefined
      return {
        id: row.id,
        locale: locale as 'ko' | 'en',
        title: decodeHtmlEntities(row.title),
        creator: row.creator,
        description: row.description,
        isbn: row.isbn,
        publisher: row.publisher,
        translator: translators.length ? translators.join(', ') : null,
        originalWorkIdentity: original ? original.work_identity as string : null,
        thumbnailUrl: row.thumbnail_url,
        releaseDate: row.release_date,
        editionKind: row.edition_kind,
        textScope: row.text_scope,
        sortOrder: row.sort_order,
        platform: null,
        purchaseUrl: null,
      }
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
}

/** 다른 언어 카드의 존재 여부는 원어 판정 근거가 아니다. 저장된 원어와 독립 출처를 확인한다. */
export function isFigureBookOriginalLocale(figure: unknown, locale: string): boolean {
  if (!figure || typeof figure !== 'object' || Array.isArray(figure)) return false
  const work = figure as Record<string, unknown>
  try { return work.originalLanguage === locale && new URL(String(work.identityEvidence)).protocol === 'https:' }
  catch { return false }
}

export function attachFigureBookLocaleLinks<T extends FigureBookEdition>(edition: T, exactLocale: unknown): T {
  const row = exactLocale && typeof exactLocale === 'object' && !Array.isArray(exactLocale)
    ? exactLocale as Record<string, unknown> : {}
  const sources = row.sources && typeof row.sources === 'object' && !Array.isArray(row.sources)
    ? row.sources as Record<string, unknown> : {}
  const isbn = typeof edition.isbn === 'string' ? toIsbn13(edition.isbn) : null
  const provider = edition.locale === 'ko' ? 'kakao_book' : edition.locale === 'en' ? 'openlibrary' : null
  const links = provider && row.locale === edition.locale && isbn && typeof row.isbn === 'string' && toIsbn13(row.isbn) === isbn && sources.primary === provider
    ? toAffiliateLinks(row.affiliate_url).filter(link => {
      if (AFFILIATE_PLATFORMS[link.platform].locale !== edition.locale) return false
      try { const url = new URL(link.url); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password }
      catch { return false }
    }) : []
  return { ...edition, affiliateLinks: links }
}

/** 추가 판본 선택지는 확인된 원문·번역 키가 있어야 한다. */
function sameBookEditionKey(edition: FigureBookEdition, crossPublisher: boolean): string | null {
  const translation = bookEditionTranslationKey(edition, crossPublisher || !!edition.originalWorkIdentity)
  return translation
}

/** 확인된 판본은 역자별 하나를, 확인 정보가 없는 작품은 대표 도서 하나를 보여 준다. */
function collapseSameBookEditions(editions: FigureBookEdition[], crossPublisher: boolean): FigureBookEdition[] {
  const reps = new Map<string, FigureBookEdition>()
  let fallback: FigureBookEdition | null = null
  const prefer = (candidate: FigureBookEdition, current: FigureBookEdition) => {
    if ((candidate.purchaseUrl != null) !== (current.purchaseUrl != null)) return candidate.purchaseUrl != null
    if ((candidate.releaseDate ?? '') !== (current.releaseDate ?? '')) return (candidate.releaseDate ?? '') > (current.releaseDate ?? '')
    return candidate.sortOrder < current.sortOrder || (candidate.sortOrder === current.sortOrder && candidate.id < current.id)
  }
  for (const edition of editions) {
    const key = sameBookEditionKey(edition, crossPublisher)
    if (!key) { if (!fallback || prefer(edition, fallback)) fallback = edition; continue }
    const previous = reps.get(key)
    if (!previous || prefer(edition, previous)) reps.set(key, edition)
  }
  return reps.size ? [...reps.values()] : fallback ? [fallback] : []
}

/**
 * 한국어 판본은 쿠팡 상품 유무와 관계없이 선택하고, 저장된 구매 링크만 같은 판본에 붙인다.
 * 같은 책의 재판·개정판·전자책은 대표 판본 하나만 노출한다.
 * `crossPublisherSameBook`(독립 근거로 원어를 확인한 작품)이면 출판사가 바뀐 재출간도 같은 책으로 접는다 —
 * 번역 작품은 확인된 역자로 구분한다.
 */
export function mergeFigureBookEditions(
  rows: FigureBookEditionRow[],
  options: FigureBookPurchaseOptionRow[],
  locale: string,
  _includeAll = false,
  crossPublisherSameBook = false,
  series?: unknown,
  workTitles: readonly string[] = [],
): FigureBookEdition[] {
  const allowed = (row: FigureBookEditionRow | FigureBookPurchaseOptionRow) => !excludedBookEditionReason({...row,workTitles,reviewedSeries:!!(series && typeof series==='object' && 'sourceUrl' in series && /^https:\/\//u.test(String(series.sourceUrl))),editionKind:row.edition_kind,textScope:row.text_scope})
  const blockedIds = new Set(rows.filter(row => !allowed(row)).map(row => row.id))
  rows = rows.filter(allowed)
  options = options.filter(row => allowed(row) && !blockedIds.has(row.edition_id))
  const purchasable = mapFigureBookPurchaseOptions(options, locale)
  const editions = mapFigureBookEditions(rows, locale)
  const byId = new Map(purchasable.map((edition) => [edition.id, edition]))
  const merged = editions.map((edition) => {
    const purchase = byId.get(edition.id)
    return purchase?.isbn === edition.isbn
      ? { ...edition, platform: purchase.platform, purchaseUrl: purchase.purchaseUrl }
      : edition
  })
  return collapseSameBookEditions(selectSeriesRepresentatives(merged.length ? merged : purchasable, series), crossPublisherSameBook)
}

/**
 * 작품 하나를 대표할 판본. 한국어는 YES24가 상품을 찾을 수 있는 ISBN 판본이 먼저고(쿠팡 상품은 그 판본에 붙는 보조 링크),
 * 영어는 아마존 상품이 걸린 판본이 먼저다. 없으면 판본 차례의 첫 권이다.
 */
export function pickPurchaseEdition(
  editions: FigureBookEdition[],
  locale: string,
): FigureBookEdition | undefined {
  if (locale === 'ko') return editions.find((edition) => normalizePurchaseIsbn(edition.isbn)) ?? editions[0]
  return editions.find((edition) => edition.purchaseUrl) ?? editions[0]
}
