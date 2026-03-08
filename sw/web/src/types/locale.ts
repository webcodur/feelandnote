/** 앱 전역 로케일 타입 (SSoT) */
export type Locale = 'ko' | 'en'

/** string → Locale 정규화 (게임 i18n 등에서 사용) */
export function resolveLocale(locale: string): Locale {
  return locale.startsWith('en') ? 'en' : 'ko'
}
