import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'as-needed',
  localeDetection: false,
  // hreflang은 각 페이지 메타데이터(alternates)와 사이트맵이 https 정본 주소로 선언한다.
  // 미들웨어의 Link 응답 헤더는 프록시 뒤 요청 주소로 만들어져 http://로 나가 두 신호가 어긋났다(26.09.28 운영 실측).
  alternateLinks: false,
});
