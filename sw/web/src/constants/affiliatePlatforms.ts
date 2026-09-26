export interface AffiliateLink {
  platform: AffiliatePlatformKey
  url: string
  linkKind?: 'search'
}

export type AffiliatePlatformKey = keyof typeof AFFILIATE_PLATFORMS

/** contents.affiliate_url(JSONB)을 화면이 쓰는 링크 배열로 거른다 — 모르는 서점·깨진 주소는 버린다 */
export function toAffiliateLinks(value: unknown): AffiliateLink[] {
  if (!Array.isArray(value)) return []
  return value.filter((link): link is AffiliateLink =>
    typeof link === 'object' && link !== null &&
    'platform' in link && link.platform in AFFILIATE_PLATFORMS &&
    'url' in link && typeof link.url === 'string' && link.url.length > 0)
}

export const AFFILIATE_PLATFORMS = {
  // ko
  yes24: { label: 'YES24', color: '#2563EB', locale: 'ko', notice: null },
  kyobo: {
    label: '교보문고',
    color: '#22A355',
    locale: 'ko',
    // 링크프라이스 제휴(kbbook) — 수수료 고지는 공통 번역(content.purchaseInfo.notice)을 쓴다.
    notice: null,
  },
  coupang: {
    label: '쿠팡',
    color: '#E44232',
    locale: 'ko',
    // 링크프라이스 제휴에 공통 수수료 고지를 쓴다. 승인대기 중인 일반 링크에는 고지를 붙이지 않는다.
    notice: null,
  },
  aladin: { label: '알라딘', color: '#8B5CF6', locale: 'ko', notice: null },
  // en
  amazon: {
    label: 'Amazon',
    color: '#FF9900',
    locale: 'en',
    // 어소시에이트 추적 ID(2026-09-21 계정 생성) — 상품·검색 링크에 tag로 얹는다
    tag: 'feelandnote-20',
    // 운영계약 §5 필수 고지 원문 — 바꾸거나 번역하지 않는다
    notice: 'As an Amazon Associate I earn from qualifying purchases.',
  },
  google_books: { label: 'Google Books', color: '#4285F4', locale: 'en', notice: null },
} as const

/**
 * 책 상품 목록이 기준으로 삼는 서점 — 한국어는 YES24(쿠팡은 같은 판본에 붙는 보조 단추), 영어는 아마존.
 * 영어는 제휴 상품 주소가 없으면 아마존 검색으로 잇는다(`lib/books/amazonBookSearch.ts`).
 */
export type BookStorePlatform = 'yes24' | 'amazon'

export function getBookStorePlatform(locale: string): BookStorePlatform {
  return locale === 'en' ? 'amazon' : 'yes24'
}

const BOOK_PURCHASE_LINK_STYLE = [
  'border-purchase-ink/25',
  'bg-[linear-gradient(110deg,var(--purchase-from,color-mix(in_srgb,var(--purchase-color)_68%,var(--color-bg-stone-light)))_0%,var(--purchase-to,color-mix(in_srgb,var(--purchase-color)_38%,var(--color-bg-stone-light)))_100%)]',
  'shadow-sm shadow-bg-secondary/35',
  'hover:border-purchase-ink/75 hover:shadow-[0_3px_14px] hover:shadow-[color:color-mix(in_srgb,var(--purchase-color)_24%,transparent)] active:brightness-95',
].join(' ')

// 테두리는 즉각 반응하고, 이름만 짧게 확대한다. 작은 서가 단추는 확대 폭을 줄인다.
export const BOOK_PURCHASE_LABEL_STYLE = [
  'inline-flex origin-center items-center justify-center transition-transform duration-150 ease-out',
  'motion-safe:group-hover/purchase:scale-[var(--purchase-label-scale,1.07)] motion-safe:group-focus-visible/purchase:scale-[var(--purchase-label-scale,1.07)] group-active/purchase:scale-100',
  'motion-reduce:transition-none',
].join(' ')

export const BOOK_PURCHASE_BUTTON_STYLES = {
  yes24: `${BOOK_PURCHASE_LINK_STYLE} [--purchase-color:var(--color-store-yes24)] [--purchase-from:var(--color-store-yes24-from)] [--purchase-to:var(--color-store-yes24-to)] text-purchase-ink focus-visible:ring-store-yes24`,
  kyobo: `${BOOK_PURCHASE_LINK_STYLE} [--purchase-color:var(--color-store-kyobo)] [--purchase-from:var(--color-store-kyobo-from)] [--purchase-to:var(--color-store-kyobo-to)] text-purchase-ink focus-visible:ring-store-kyobo`,
  coupang: `${BOOK_PURCHASE_LINK_STYLE} [--purchase-color:var(--color-store-coupang)] [--purchase-from:var(--color-store-coupang-from)] [--purchase-to:var(--color-store-coupang-to)] text-purchase-ink focus-visible:ring-store-coupang`,
  aladin: `${BOOK_PURCHASE_LINK_STYLE} [--purchase-color:var(--color-store-aladin)] [--purchase-from:var(--color-store-aladin-from)] [--purchase-to:var(--color-store-aladin-to)] text-purchase-ink focus-visible:ring-store-aladin`,
  amazon: `${BOOK_PURCHASE_LINK_STYLE} [--purchase-color:color-mix(in_srgb,var(--color-store-amazon)_84%,var(--color-bg-main))] text-purchase-ink focus-visible:ring-store-amazon`,
  google_books: `${BOOK_PURCHASE_LINK_STYLE} [--purchase-color:var(--color-store-google-books)] text-purchase-ink focus-visible:ring-store-google-books`,
} as const

export const BOOK_PURCHASE_OPENER_STYLE = [
  '[--purchase-spectrum:linear-gradient(110deg,var(--color-store-coupang)_0%,var(--color-store-coupang)_18%,var(--color-store-yes24)_32%,var(--color-store-yes24)_43%,var(--color-store-kyobo)_57%,var(--color-store-kyobo)_68%,var(--color-store-aladin)_82%,var(--color-store-aladin)_100%)]',
  'border-accent/45 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-bg-main)_35%,transparent),color-mix(in_srgb,var(--color-bg-main)_42%,transparent)),var(--purchase-spectrum)] text-purchase-ink shadow-sm shadow-bg-secondary/35',
  'hover:border-accent hover:shadow-[0_3px_14px] hover:shadow-accent/18 active:brightness-95 focus-visible:ring-accent',
].join(' ')

const BOOK_PURCHASE_BUTTON_FALLBACK =
  'border-border bg-bg-secondary text-text-primary hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:ring-accent'

/** 서점 단추의 고정 색 — 마커·구매 창·직결 단추가 모두 이 한 곳의 색을 쓴다 */
export function purchaseButtonStyle(platform: AffiliatePlatformKey): string {
  const styles: Partial<Record<AffiliatePlatformKey, string>> = BOOK_PURCHASE_BUTTON_STYLES
  return styles[platform] ?? BOOK_PURCHASE_BUTTON_FALLBACK
}
