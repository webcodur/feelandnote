export const TREND_COUNTRIES = ['KR', 'US'] as const
export const TREND_PERIOD_HOURS = 24 as const

export type TrendCountry = (typeof TREND_COUNTRIES)[number]

export function parseTrendCountry(value: unknown): TrendCountry | undefined {
  if (typeof value !== 'string') return undefined
  const country = value.trim().toUpperCase()
  return TREND_COUNTRIES.find((supported) => supported === country)
}
