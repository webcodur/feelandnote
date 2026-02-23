export interface AffiliateLink {
  platform: AffiliatePlatformKey
  url: string
}

export type AffiliatePlatformKey = keyof typeof AFFILIATE_PLATFORMS

export const AFFILIATE_PLATFORMS = {
  coupang: {
    label: '쿠팡',
    color: '#E44232',
    notice:
      '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
  },
  aladin: { label: '알라딘', color: '#5085C5', notice: null },
  yes24: { label: 'YES24', color: '#00A651', notice: null },
  kyobo: { label: '교보문고', color: '#5055B1', notice: null },
} as const
