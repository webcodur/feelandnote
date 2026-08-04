/** 앱 전역 로케일 타입 (SSoT) */
export type Locale = 'ko' | 'en'

/** 외부 입력이 지원 locale인지 검증 */
export function isLocale(locale: string): locale is Locale {
  return locale === 'ko' || locale === 'en'
}

/** string → Locale 정규화 (게임 i18n 등에서 사용) */
export function resolveLocale(locale: string): Locale {
  return locale.startsWith('en') ? 'en' : 'ko'
}
