import { isBotUserAgent } from '../lib/render-user-agent'

/** Only a language-button choice overrides geolocation; old NEXT_LOCALE=ko was automatic. */
export const LOCALE_PREFERENCE_COOKIE = 'fn_locale_preference'
export const LOCALE_PREFERENCE_MAX_AGE = 365 * 24 * 60 * 60

function browserLocale(acceptLanguage?: string | null): 'ko' | 'en' {
  let preferred = 'en'
  let highestQuality = 0
  for (const entry of (acceptLanguage ?? '').split(',')) {
    const [language, ...parameters] = entry.trim().toLowerCase().split(';')
    if (!/^(?:[a-z]{1,8}(?:-[a-z0-9]{1,8})*|\*)$/.test(language)) continue
    const qualityParameter = parameters.find(parameter => /^\s*q\s*=/.test(parameter))
    const quality = qualityParameter === undefined ? 1 : Number(qualityParameter.split('=')[1].trim())
    if (!Number.isFinite(quality) || quality <= highestQuality || quality > 1) continue
    preferred = language
    highestQuality = quality
  }
  return preferred === 'ko' || preferred.startsWith('ko-') ? 'ko' : 'en'
}

export function entryLocale(country: string | null, preference?: string, previousLocale?: string,
  acceptLanguage?: string | null): 'ko' | 'en' {
  if (preference === 'ko' || preference === 'en') return preference
  if (previousLocale === 'en') return 'en'
  const code = country?.trim().toUpperCase()
  if (code && /^[A-Z]{2}$/.test(code) && code !== 'XX') return code === 'KR' ? 'ko' : 'en'
  return browserLocale(acceptLanguage)
}

/** Search engines must be able to index both canonical language URLs. */
export function isLocaleCrawler(userAgent: string | null): boolean {
  return isBotUserAgent(userAgent)
}

export function saveLocalePreference(locale: string) {
  if (locale !== 'ko' && locale !== 'en') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${LOCALE_PREFERENCE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_PREFERENCE_MAX_AGE}; SameSite=Lax${secure}`
}
