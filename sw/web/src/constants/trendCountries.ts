// Every geo Google Trends "Trending now" accepts: its RSS (trending/rss?geo=XX) answers 200 for these and 400 otherwise (probed 2026-09-15).
export const TREND_COUNTRIES = [
  'AE', 'AL', 'AM', 'AO', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BD', 'BE', 'BF', 'BG', 'BH', 'BJ', 'BO', 'BR', 'BY', 'CA', 'CD',
  'CH', 'CI', 'CL', 'CM', 'CO', 'CR', 'CU', 'CY', 'CZ', 'DE', 'DK', 'DO', 'DZ', 'EC', 'EE', 'EG', 'ES', 'ET', 'FI', 'FR',
  'GB', 'GE', 'GH', 'GR', 'GT', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IN', 'IQ', 'IR', 'IT', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KR', 'KW', 'KZ', 'LB', 'LK', 'LT', 'LV', 'LY', 'MA', 'MD', 'MK', 'ML', 'MM', 'MX', 'MY', 'MZ', 'NG',
  'NI', 'NL', 'NO', 'NP', 'NZ', 'OM', 'PA', 'PE', 'PH', 'PK', 'PL', 'PR', 'PS', 'PT', 'PY', 'QA', 'RO', 'RS', 'RU', 'SA',
  'SE', 'SG', 'SI', 'SK', 'SN', 'SV', 'SY', 'TH', 'TM', 'TN', 'TR', 'TT', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VE',
  'VN', 'YE', 'ZA', 'ZM', 'ZW',
] as const
// Google's longest Trending now window. 24h matched too few registered people (KR 8 vs 54 on 2026-09-16).
export const TREND_PERIOD_HOURS = 168 as const

export type TrendCountry = (typeof TREND_COUNTRIES)[number]

/** Always offered, whatever the visitor's country. */
export const PINNED_TREND_COUNTRIES: readonly TrendCountry[] = ['KR', 'US']

export function parseTrendCountry(value: unknown): TrendCountry | undefined {
  if (typeof value !== 'string') return undefined
  const country = value.trim().toUpperCase()
  return TREND_COUNTRIES.find((supported) => supported === country)
}

/** Visitor first, then pinned, then a country arriving by shared URL. Fixed per page load so buttons never reorder on click. */
export function getTrendCountryOptions(visitor: TrendCountry | undefined, selected: TrendCountry): TrendCountry[] {
  return [...new Set([...(visitor ? [visitor] : []), ...PINNED_TREND_COUNTRIES, selected])]
}
