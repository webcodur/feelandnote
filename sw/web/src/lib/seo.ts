import { getLocale } from 'next-intl/server';

const BASE_URL = 'https://feelandnote.com';

type SeoImageKind = 'celeb' | 'content';

function hashImageSource(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** 네이버 등 검색 로봇이 리다이렉트 없이 가져갈 수 있는 페이지별 정사각 대표 이미지 URL. */
export function getSeoImageUrl(
  kind: SeoImageKind,
  id: string,
  locale: 'ko' | 'en',
  sourceUrl?: string | null,
): string {
  const url = new URL(`/seo-image/${kind}/${encodeURIComponent(id)}`, BASE_URL);
  url.searchParams.set('locale', locale);
  if (sourceUrl) url.searchParams.set('v', hashImageSource(sourceUrl));
  return url.toString();
}

/** 검색 설명에 HTML 엔티티나 잘린 직선 인용부호가 노출되지 않도록 평문으로 정규화한다. */
export function toSeoDescription(value: string, maxLength = 160): string {
  const normalized = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:#39|#x27);/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/"([^"\n]+)"/g, '“$1”')
    .replace(/(?<!\w)'([^'\n]+)'(?!\w)/g, '‘$1’')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length <= maxLength) return normalized;

  const slice = normalized.slice(0, maxLength - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const end = lastSpace > maxLength * 0.65 ? lastSpace : slice.length;
  return `${slice.slice(0, end).trimEnd()}…`;
}

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
