const BASE_URL = 'https://feelandnote.com';

/**
 * 다국어 alternates 생성.
 * defaultLocale('ko')은 prefix 없이, 'en'은 /en prefix.
 * @param path - locale prefix 없는 경로 (예: '/celeb/shakespeare', '/')
 */
export function getAlternates(path: string) {
  const normalizedPath = path === '/' ? '' : path;
  return {
    canonical: `${BASE_URL}${normalizedPath}`,
    languages: {
      ko: `${BASE_URL}${normalizedPath}`,
      en: `${BASE_URL}/en${normalizedPath}`,
      'x-default': `${BASE_URL}${normalizedPath}`,
    },
  };
}
