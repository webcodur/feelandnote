/** Only a language-button choice overrides geolocation; old NEXT_LOCALE=ko was automatic. */
export const LOCALE_PREFERENCE_COOKIE = 'fn_locale_preference'
export const LOCALE_PREFERENCE_MAX_AGE = 365 * 24 * 60 * 60

export function entryLocale(country: string | null, preference?: string, previousLocale?: string): 'ko' | 'en' {
  if (preference === 'ko' || preference === 'en') return preference
  if (previousLocale === 'en') return 'en'
  const code = country?.trim().toUpperCase()
  if (code && /^[A-Z]{2}$/.test(code) && code !== 'XX') return code === 'KR' ? 'ko' : 'en'
  return 'ko'
}

/** Search engines must be able to index both canonical language URLs. */
export function isLocaleCrawler(userAgent: string | null): boolean {
  return /bot\b|crawler|spider|slurp|yeti|facebookexternalhit|twitterbot|linkedinbot/i.test(userAgent ?? '')
}

export function saveLocalePreference(locale: string) {
  if (locale !== 'ko' && locale !== 'en') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${LOCALE_PREFERENCE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_PREFERENCE_MAX_AGE}; SameSite=Lax${secure}`
}
