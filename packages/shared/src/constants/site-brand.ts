/** 서비스가 사용자와 검색엔진에 내보내는 브랜드 표기의 단일 원천. */
export const SITE_NAME = 'feelandnote';
export const SITE_NAME_KO = '필앤노트';
export const ADMIN_NAME = `${SITE_NAME} Admin`;
export const SITE_URL = 'https://feelandnote.com';
export const SITE_ALTERNATE_NAMES = [SITE_NAME_KO, new URL(SITE_URL).hostname] as const;

export const SITE_BLOG_URLS = {
  books: 'https://blog.naver.com/dmx777',
  cinema: 'https://feelandnote-cinema.tistory.com/',
} as const;
