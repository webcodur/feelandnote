import { findAffiliateLink } from '@/actions/home/affiliateLinks'
import type { ContentLocaleRow } from '@/lib/utils/content-locale'

interface FictionSourceLocaleFields {
  description: string | null
  publisher: string | null
  isbn: string | null
  coupangUrl: string | null
  amazonUrl: string | null
}

interface FictionSourceCharacterDescriptions {
  description: string | null
  description_en: string | null
}

export function getFictionSourceLocaleFields(
  locales: ContentLocaleRow[] | null,
  locale: string,
): FictionSourceLocaleFields {
  const exact = locales?.find((item) => item.locale === locale)
  return {
    description: exact?.description ?? null,
    publisher: exact?.publisher ?? null,
    isbn: exact?.isbn ?? null,
    coupangUrl: locale === 'ko'
      ? findAffiliateLink(exact?.affiliate_url, 'coupang')?.url ?? null
      : null,
    amazonUrl: locale === 'en'
      ? findAffiliateLink(exact?.affiliate_url, 'amazon')?.url ?? null
      : null,
  }
}

export function getFictionSourceCharacterDescription(
  assignment: FictionSourceCharacterDescriptions,
  locale: string,
): string | null {
  const exact = locale === 'en'
    ? assignment.description_en
    : assignment.description
  return exact?.trim() || null
}
