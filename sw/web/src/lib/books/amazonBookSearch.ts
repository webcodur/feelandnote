import { AFFILIATE_PLATFORMS, type AffiliateLink } from '../../constants/affiliatePlatforms'

function isValidEnglishLink(link: AffiliateLink): boolean {
  if (AFFILIATE_PLATFORMS[link.platform]?.locale !== 'en') return false
  try {
    const url = new URL(link.url)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}

export function getEnglishBookPurchaseLinks({ locale, title, creator, links = [] }: {
  locale: string
  title?: string | null
  creator?: string | null
  links?: readonly AffiliateLink[]
}): AffiliateLink[] {
  if (locale !== 'en') return []
  const englishLinks = links.filter(isValidEnglishLink)
  if (englishLinks.some((link) => link.platform === 'amazon' && link.linkKind !== 'search')) {
    return englishLinks.filter((link) => link.platform !== 'amazon' || link.linkKind !== 'search')
  }
  const bookTitle = title?.trim().replace(/\s+/g, ' ')
  if (!bookTitle) return englishLinks
  const query = [bookTitle, creator?.trim().replace(/\s+/g, ' ')].filter(Boolean).join(' ')
  const url = new URL('https://www.amazon.com/s')
  url.searchParams.set('i', 'stripbooks')
  url.searchParams.set('k', query)
  return [
    ...englishLinks.filter((link) => link.platform !== 'amazon'),
    { platform: 'amazon', url: url.toString(), linkKind: 'search' },
  ]
}
