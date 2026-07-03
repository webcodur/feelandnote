import { getLocale } from 'next-intl/server';

const BASE_URL = 'https://feelandnote.com';

/**
 * 다국어 alternates 생성.
 * defaultLocale('ko')은 prefix 없이, 'en'은 /en prefix.
 * canonical은 현재 locale의 자기 자신 URL — ko 고정 시 영어판 색인이 손실된다.
 * @param path - locale prefix 없는 경로 (예: '/celeb/shakespeare', '/')
 */
export function getAlternates(path: string, locale: 'ko' | 'en' = 'ko') {
  const normalizedPath = path === '/' ? '' : path;
  return {
    canonical: locale === 'en' ? `${BASE_URL}/en${normalizedPath}` : `${BASE_URL}${normalizedPath}`,
    languages: {
      ko: `${BASE_URL}${normalizedPath}`,
      en: `${BASE_URL}/en${normalizedPath}`,
      'x-default': `${BASE_URL}${normalizedPath}`,
    },
  };
}

/** generateMetadata 전용 — 요청 locale을 읽어 self-canonical alternates 생성 */
export async function getLocalizedAlternates(path: string) {
  const locale = await getLocale();
  return getAlternates(path, locale === 'en' ? 'en' : 'ko');
}
