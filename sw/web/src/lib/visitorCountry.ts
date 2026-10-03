import { getCountryNameByLocale } from '@/lib/countries'

/** Cloudflare's unknown/Tor markers are not countries. Language never supplies a country. */
export function parseVisitorCountry(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const country = value.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(country) && country !== 'XX'
    && getCountryNameByLocale(country, 'en') !== country ? country : null
}

/** Stable partition: a local preference must preserve the existing order within both groups. */
export function countryFirst<T>(items: readonly T[], country: string | null, countryOf: (item: T) => string | null | undefined): T[] {
  if (!country) return [...items]
  return [...items.filter(item => countryOf(item) === country), ...items.filter(item => countryOf(item) !== country)]
}

// Existing faction_lv1 region slugs. Countries without a corresponding region keep the catalog order.
const MYTH_COUNTRIES_BY_REGION: Record<string, readonly string[]> = {
  korea: ['KR', 'KP'], japan: ['JP'], china: ['CN', 'TW', 'HK', 'MO'],
  'greek-roman': ['GR', 'IT'], india: ['IN', 'NP', 'LK', 'BD', 'PK', 'BT'],
  'west-asia': ['TR', 'IR', 'IQ', 'SY', 'LB', 'IL', 'PS', 'JO', 'SA', 'YE', 'OM', 'AE', 'QA', 'BH', 'KW'],
  'southeast-asia': ['VN', 'TH', 'KH', 'LA', 'MM', 'MY', 'SG', 'ID', 'PH', 'BN', 'TL'],
  steppe: ['MN', 'KZ', 'KG', 'UZ', 'TM', 'TJ'], celtic: ['GB', 'IE'],
  'northern-europe': ['NO', 'SE', 'DK', 'IS', 'FI', 'DE', 'AT', 'CH'],
  slavic: ['RU', 'UA', 'BY', 'PL', 'CZ', 'SK', 'SI', 'HR', 'RS', 'BG', 'BA', 'ME', 'MK'],
  oceania: ['AU', 'NZ', 'PG', 'FJ', 'WS', 'TO', 'VU', 'SB', 'FM', 'KI', 'MH', 'PW', 'TV', 'NR'],
  americas: ['US', 'CA', 'MX', 'GT', 'BZ', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'HT', 'DO', 'JM', 'CO', 'VE', 'EC', 'PE', 'BO', 'BR', 'PY', 'UY', 'AR', 'CL', 'GY', 'SR'],
  africa: ['EG', 'DZ', 'MA', 'TN', 'LY', 'SD', 'SS', 'ET', 'ER', 'SO', 'DJ', 'KE', 'UG', 'TZ', 'RW', 'BI', 'CD', 'CG', 'GA', 'CM', 'NG', 'NE', 'TD', 'CF', 'GQ', 'ST', 'GH', 'CI', 'BF', 'ML', 'SN', 'GM', 'GN', 'GW', 'SL', 'LR', 'TG', 'BJ', 'MR', 'CV', 'AO', 'ZM', 'ZW', 'MW', 'MZ', 'ZA', 'NA', 'BW', 'LS', 'SZ', 'MG', 'MU', 'SC', 'KM'],
}

export function preferredMythRegion(country: string | null): string | null {
  return country ? Object.keys(MYTH_COUNTRIES_BY_REGION).find(region => MYTH_COUNTRIES_BY_REGION[region].includes(country)) ?? null : null
}

export function orderMythRegions<T extends { slug: string }>(regions: readonly T[], country: string | null): T[] {
  return countryFirst(regions, preferredMythRegion(country), region => region.slug)
}
