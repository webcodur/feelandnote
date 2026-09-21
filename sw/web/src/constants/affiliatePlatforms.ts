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
    // 링크프라이스 제휴(kbbook) — 대가성 표시 의무 문구
    notice: '이 포스팅은 제휴마케팅이 포함된 광고로 커미션을 지급 받습니다.',
  },
  coupang: {
    label: '쿠팡',
    color: '#E44232',
    locale: 'ko',
    notice:
      '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
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

export const BOOK_PURCHASE_BUTTON_STYLES = {
  yes24: 'border-blue-400/40 bg-blue-500/10 text-blue-100 hover:border-blue-300 hover:bg-blue-500/25 active:bg-blue-500/30 focus-visible:ring-blue-400',
  kyobo: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300 hover:bg-emerald-500/25 active:bg-emerald-500/30 focus-visible:ring-emerald-400',
  coupang: 'border-red-400/40 bg-red-500/10 text-red-100 hover:border-red-300 hover:bg-red-500/25 active:bg-red-500/30 focus-visible:ring-red-400',
  aladin: 'border-violet-400/40 bg-violet-500/10 text-violet-100 hover:border-violet-300 hover:bg-violet-500/25 active:bg-violet-500/30 focus-visible:ring-violet-400',
  amazon: 'border-[#FF9900]/40 bg-[#FF9900]/10 text-[#FFBF66] hover:border-[#FF9900] hover:bg-[#FF9900]/25 active:bg-[#FF9900]/30 focus-visible:ring-[#FF9900]',
  google_books: 'border-sky-400/40 bg-sky-500/10 text-sky-100 hover:border-sky-300 hover:bg-sky-500/25 active:bg-sky-500/30 focus-visible:ring-sky-400',
} as const

const BOOK_PURCHASE_BUTTON_FALLBACK =
  'border-border bg-bg-secondary text-text-primary hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:ring-accent'

/** 서점 단추의 고정 색 — 마커·구매 창·직결 단추가 모두 이 한 곳의 색을 쓴다 */
export function purchaseButtonStyle(platform: AffiliatePlatformKey): string {
  const styles: Partial<Record<AffiliatePlatformKey, string>> = BOOK_PURCHASE_BUTTON_STYLES
  return styles[platform] ?? BOOK_PURCHASE_BUTTON_FALLBACK
}
