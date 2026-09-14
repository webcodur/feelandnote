export interface AffiliateLink {
  platform: AffiliatePlatformKey
  url: string
}

export type AffiliatePlatformKey = keyof typeof AFFILIATE_PLATFORMS

export const AFFILIATE_PLATFORMS = {
  // ko
  coupang: {
    label: '쿠팡',
    color: '#E44232',
    locale: 'ko',
    notice:
      '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
  },
  aladin: { label: '알라딘', color: '#5085C5', locale: 'ko', notice: null },
  yes24: { label: 'YES24', color: '#2563EB', locale: 'ko', notice: null },
  kyobo: { label: '교보문고', color: '#5055B1', locale: 'ko', notice: null },
  // en
  amazon: { label: 'Amazon', color: '#FF9900', locale: 'en', notice: null },
  google_books: { label: 'Google Books', color: '#4285F4', locale: 'en', notice: null },
} as const

export const BOOK_PURCHASE_BUTTON_STYLES = {
  yes24: 'border-blue-400/40 bg-blue-500/10 text-blue-100 hover:border-blue-300 hover:bg-blue-500/25 active:bg-blue-500/30 focus-visible:ring-blue-400',
  coupang: 'border-red-400/40 bg-red-500/10 text-red-100 hover:border-red-300 hover:bg-red-500/25 active:bg-red-500/30 focus-visible:ring-red-400',
} as const
