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
  title: string
  creator: string | null
  description: string | null
  isbn: string | null
  publisher: string | null
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
  isbn: string | null
  publisher: string | null
  thumbnail_url: string | null
  release_date: string | null
  edition_kind: string | null
  text_scope: string | null
  sort_order: number
}

interface FigureBookCharacterDescriptions {
  description: string | null
  description_en: string | null
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
      title: row.title,
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
    .map((row) => ({
      id: row.id,
      title: row.title,
      creator: row.creator,
      description: row.description,
      isbn: row.isbn,
      publisher: row.publisher,
      thumbnailUrl: row.thumbnail_url,
      releaseDate: row.release_date,
      editionKind: row.edition_kind,
      textScope: row.text_scope,
      sortOrder: row.sort_order,
      platform: null,
      purchaseUrl: null,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
}

export function getFigureBookCharacterDescription(
  assignment: FigureBookCharacterDescriptions,
  locale: string,
): string | null {
  const exact = locale === 'en'
    ? assignment.description_en
    : assignment.description
  return exact?.trim() || null
}
