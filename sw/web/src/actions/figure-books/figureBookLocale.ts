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
  platform: FigureBookProductPlatform
  purchaseUrl: string
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

export function getFigureBookCharacterDescription(
  assignment: FigureBookCharacterDescriptions,
  locale: string,
): string | null {
  const exact = locale === 'en'
    ? assignment.description_en
    : assignment.description
  return exact?.trim() || null
}
