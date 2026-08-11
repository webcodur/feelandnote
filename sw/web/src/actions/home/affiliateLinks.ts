import type { AffiliateLink, AffiliatePlatformKey } from '@/constants/affiliatePlatforms'

export function findAffiliateLink(
  value: unknown,
  platform: AffiliatePlatformKey,
): AffiliateLink | undefined {
  if (!Array.isArray(value)) return undefined

  return value.find(
    (link): link is AffiliateLink =>
      typeof link === 'object' &&
      link !== null &&
      'platform' in link &&
      link.platform === platform &&
      'url' in link &&
      typeof link.url === 'string' &&
      link.url.length > 0,
  )
}
