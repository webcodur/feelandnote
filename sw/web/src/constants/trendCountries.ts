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
// Keep recent topics visible without carrying a week of old search surges.
export const TREND_PERIOD_HOURS = 48 as const

export type TrendCountry = (typeof TREND_COUNTRIES)[number]

export const TREND_COUNTRY_COOKIE = 'fn-trend-country'
export const TREND_COUNTRY_COOKIE_MAX_AGE = 365 * 24 * 60 * 60

export function parseTrendCountry(value: unknown): TrendCountry | undefined {
  if (typeof value !== 'string') return undefined
  const country = value.trim().toUpperCase()
  return TREND_COUNTRIES.find((supported) => supported === country)
}

/** Shared links override the remembered preference without changing it. */
export function resolveTrendCountry(shared: unknown, remembered: unknown, visitor: unknown): TrendCountry {
  return parseTrendCountry(shared) ?? parseTrendCountry(remembered) ?? parseTrendCountry(visitor) ?? 'KR'
}
