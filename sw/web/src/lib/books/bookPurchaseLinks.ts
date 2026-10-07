import { AFFILIATE_PLATFORMS, type AffiliateLink } from '@/constants/affiliatePlatforms'
import { getEnglishBookPurchaseLinks } from './amazonBookSearch'
import { getBookPurchaseHref } from './bookPurchaseHref'
import { aladinBookLink, coupangBookLink, kyoboBookLink } from './bookPurchaseRedirect'
import { isYes24PurchaseRequest } from './yes24Purchase'

export interface BookPurchaseOptions {
  locale: string
  contentId?: string
  editionId?: number
  isbn?: string
  title?: string | null
  creator?: string | null
  links?: readonly AffiliateLink[]
  yes24Href?: string
}

function isPurchaseUrl(value: string): boolean {
  try {
    const base = 'https://feelandnote.com'
    const url = new URL(value, base)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      && (value.startsWith('https://') || value.startsWith('http://')
        || (value.startsWith('/') && !value.startsWith('//') && url.origin === base))
  } catch { return false }
}

// 작품·판본·외부 차트의 서점 선택은 이 함수 하나로 결정한다. 먼저 유효 링크를 고른 뒤 중복을 없앤다.
export function getBookPurchaseLinks({ locale, contentId, editionId, isbn, title, creator, links = [], yes24Href }: BookPurchaseOptions): AffiliateLink[] {
  const valid = links.filter(link => AFFILIATE_PLATFORMS[link.platform]?.locale === locale && isPurchaseUrl(link.url))
  const unique = (items: readonly AffiliateLink[]) => {
    const seen = new Set<string>()
    return items.filter(link => {
      if (seen.has(link.platform)) return false
      seen.add(link.platform)
      return true
    })
  }
  if (locale !== 'ko') return unique(getEnglishBookPurchaseLinks({ locale, title, creator, isbn, links: valid })
    .filter(link => link.platform === 'amazon'))
  const usable = unique(valid)

  const ownId = contentId && isYes24PurchaseRequest(contentId, 'ko', editionId) ? contentId : undefined
  const route = (platform: 'yes24' | 'kyobo' | 'coupang' | 'aladin'): AffiliateLink | null => ownId
    ? { platform, url: getBookPurchaseHref(ownId, editionId, platform), ...(platform === 'coupang' ? { linkKind: 'search' as const } : {}) }
    : null
  const saved = (platform: AffiliateLink['platform']) => usable.find(link => link.platform === platform)
  const yes24 = yes24Href && isPurchaseUrl(yes24Href)
    ? { platform: 'yes24' as const, url: yes24Href } : route('yes24') ?? saved('yes24')
  const kyobo = saved('kyobo') ?? route('kyobo') ?? kyoboBookLink({ isbn, title, creator })
  const coupang = saved('coupang') ?? route('coupang') ?? coupangBookLink({ isbn, title, creator })
  const aladin = saved('aladin') ?? route('aladin') ?? aladinBookLink({ isbn, title, creator })
  const standard = new Set(['yes24', 'kyobo', 'coupang', 'aladin'])
  return [yes24, kyobo, coupang, aladin].filter((link): link is AffiliateLink => !!link)
    .concat(usable.filter(link => !standard.has(link.platform)))
}
