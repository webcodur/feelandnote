import { AFFILIATE_PLATFORMS, type AffiliateLink } from '../../constants/affiliatePlatforms'

const AMAZON_HOST_RE = /(^|\.)amazon\.[a-z.]+$/
const AMAZON_COM_HOST_RE = /(^|\.)amazon\.com$/

function isValidEnglishLink(link: AffiliateLink): boolean {
  if (AFFILIATE_PLATFORMS[link.platform]?.locale !== 'en') return false
  try {
    const url = new URL(link.url)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return false
    if (link.platform === 'amazon') return AMAZON_HOST_RE.test(url.hostname) || url.hostname === 'amzn.to'
    return true
  } catch { return false }
}

/** 저장된 아마존 주소를 Special Link로 만든다 — 태그가 붙은 링크만 수익이 쌓인다. .com 외 마켓플레이스·amzn.to 단축은 그대로 둔다 */
function withAssociateTag(link: AffiliateLink): AffiliateLink {
  if (link.platform !== 'amazon') return link
  try {
    const url = new URL(link.url)
    if (AMAZON_COM_HOST_RE.test(url.hostname)) url.searchParams.set('tag', AFFILIATE_PLATFORMS.amazon.tag)
    return { ...link, url: url.toString() }
  } catch { return link }
}

/** 영어 책 한 권의 아마존 주소 — 제휴 상품 주소가 있으면 그것, 없으면 제목·저자 검색. 제목도 없으면 빈 문자열 */
export function getEnglishBookAmazonUrl({ title, creator, url }: {
  title?: string | null
  creator?: string | null
  url?: string | null
}): string {
  const links = getEnglishBookPurchaseLinks({
    locale: 'en', title, creator, links: url ? [{ platform: 'amazon', url }] : [],
  })
  return links.find((link) => link.platform === 'amazon')?.url ?? ''
}

export function getEnglishBookPurchaseLinks({ locale, title, creator, links = [] }: {
  locale: string
  title?: string | null
  creator?: string | null
  links?: readonly AffiliateLink[]
}): AffiliateLink[] {
  if (locale !== 'en') return []
  const englishLinks = links.filter(isValidEnglishLink).map(withAssociateTag)
  if (englishLinks.some((link) => link.platform === 'amazon' && link.linkKind !== 'search')) {
    return englishLinks.filter((link) => link.platform !== 'amazon' || link.linkKind !== 'search')
  }
  const bookTitle = title?.trim().replace(/\s+/g, ' ')
  if (!bookTitle) return englishLinks
  const query = [bookTitle, creator?.trim().replace(/\s+/g, ' ')].filter(Boolean).join(' ')
  const url = new URL('https://www.amazon.com/s')
  url.searchParams.set('i', 'stripbooks')
  url.searchParams.set('k', query)
  url.searchParams.set('tag', AFFILIATE_PLATFORMS.amazon.tag)
  return [
    ...englishLinks.filter((link) => link.platform !== 'amazon'),
    { platform: 'amazon', url: url.toString(), linkKind: 'search' },
  ]
}
