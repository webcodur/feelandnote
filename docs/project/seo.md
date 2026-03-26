# SEO 설정 현황

## 검색엔진 등록 현황

| 서비스 | 상태 | 인증 방식 | 제출 항목 | 비고 |
|--------|------|----------|----------|------|
| Google Search Console | ✅ 완료 | 메타태그 (`google` verification) | 사이트맵 | MCP 연결됨 (`mcp__google-search-console__*`) |
| Google Analytics (GA4) | ✅ 수집 중 | — | — | MCP 연결됨. Property ID: `526353156` |
| 네이버 서치어드바이저 | ✅ 완료 | 메타태그 (`naver-site-verification`) | 사이트맵 + RSS + 주요 URL 수동 제출 | 2026-03-12 |
| Bing Webmaster Tools | ✅ 완료 | Google SC 연동 | 사이트맵 | IndexNow 자동 연동. 2026-03-12 |
| Daum 검색등록 | ✅ 제출 | 신규등록 폼 | URL + 사이트 설명 | 2026-03-12 |

### 인증 메타태그 위치

`sw/web/src/app/[locale]/layout.tsx` → `generateMetadata()` → `verification`:
```ts
verification: {
  google: "Rstp-6NcSTn3BTPnDH06HS5PN2goDih-CVNg",
  other: {
    "naver-site-verification": "693d325afc4dad4701aa2c7c4a29c78f2ee7e445",
  },
},
```

## 사이트맵

- **파일**: `sw/web/src/app/sitemap.ts`
- **URL**: `https://feelandnote.com/sitemap.xml`
- **방식**: Supabase REST API 직접 fetch (`@supabase/supabase-js`는 메타데이터 라우트에서 동작 안 함)
- **캐시**: `revalidate = 3600` (ISR 1시간)
- **URL 구성**: 정적 경로 27개 + 셀럽 동적 경로 ~1,070개 = 약 1,098개
- **페이지네이션**: Supabase REST 기본 제한 1,000행 → 1,000행씩 반복 fetch
- **hreflang**: ko, en, x-default
- **lastModified**: `profiles.created_at` 사용 (`updated_at` 컬럼 없음)

## RSS 피드

- **파일**: `sw/web/src/app/feed.xml/route.ts`
- **URL**: `https://feelandnote.com/feed.xml`
- **내용**: 최근 등록 셀럽 100명 (created_at DESC)
- **캐시**: `revalidate = 3600` (ISR 1시간)
- **디스커버리**: `[locale]/layout.tsx` metadata → `alternates.types` → `application/rss+xml`
- **등록처**: 네이버 서치어드바이저 RSS 제출란

## IndexNow

- **키**: `4f3c45379c68dc5a57ad8927e92dda93`
- **키 파일**: `sw/web/public/4f3c45379c68dc5a57ad8927e92dda93.txt`
- **유틸**: `sw/web/src/lib/indexnow.ts` → `notifyIndexNow(['/celeb/slug'])`
- **대상 엔진**: 네이버, Bing, Yandex 등 IndexNow 지원 엔진
- production 환경에서만 동작 (dev 환경 skip)
- 셀럽 등록/수정 등 콘텐츠 변경 시 호출하면 즉시 색인 요청됨
- **연동 완료** (2026-03-13): `web-bo` celebs.ts의 `toggleCelebStatus`(active 전환 시) + `updateCeleb`(active 셀럽 정보 변경 시) 호출

## Robots

- **파일**: `sw/web/src/app/robots.ts`
- **URL**: `https://feelandnote.com/robots.txt`
- **Disallow**:
  - 시스템: `/private/`, `/admin/`, `/api/`
  - 인증: `/login`, `/signup`, `/reset-password`
  - 개인: `/reading`, `/*/reading`, `/*/chamber`, `/*/merits`
  - 기타: `/notifications`, `/search`, `/lab`

## 미들웨어 SEO 경로 제외

`sw/web/src/middleware.ts`에서 SEO 경로를 코드 가드로 제외한다:

```ts
const SEO_PATHS = ['/sitemap.xml', '/robots.txt', '/feed.xml']

if (SEO_PATHS.includes(request.nextUrl.pathname)) {
  return NextResponse.next()
}
```

matcher 패턴의 dot 이스케이프가 불안정하므로, 코드 가드가 SSoT이다. 새 SEO 경로 추가 시 `SEO_PATHS` 배열에 추가한다.

## MCP 도구

| MCP | 용도 | 주요 도구 |
|-----|------|----------|
| `google-search-console` | 검색 성과 분석, 색인 상태 확인, 사이트맵 제출 | `search_analytics`, `index_inspect`, `submit_sitemap`, `detect_quick_wins` |
| `google-analytics` | 트래픽·사용자 행동 분석 | `get_ga4_data`, `search_schema` |

## 로컬 검증 방법

배포 전 Supabase REST curl로 검증한다:

```bash
cd sw/web && source .env.local

# 사이트맵 쿼리 테스트
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=slug,created_at&profile_type=eq.CELEB&status=eq.active&slug=not.is.null&order=created_at.asc&limit=3" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

# 배포 후 검증
curl -s "https://feelandnote.com/sitemap.xml" | grep -c "<url>"   # 예상: ~1098
curl -s -I "https://feelandnote.com/feed.xml" | grep Content-Type  # 예상: application/rss+xml
curl -s -I "https://feelandnote.com/robots.txt" | grep Content-Type # 예상: text/plain
```

## 트러블슈팅 이력

### sitemap.xml이 HTML로 응답 (2026-03-12)
- **원인**: `next-intl` 미들웨어가 `/sitemap.xml`을 locale 라우트로 가로챔
- **해결**: 미들웨어 함수 초반에 `SEO_PATHS` 코드 가드 추가

### sitemap.xml에 셀럽 URL 0개 (2026-03-12)
- **원인 1**: `profiles.updated_at` 컬럼이 존재하지 않아 Supabase 쿼리 에러 (42703). `?? []` 폴백으로 에러가 무시됨
- **원인 2**: `@supabase/supabase-js` 클라이언트가 Next.js 메타데이터 라우트에서 동작하지 않음
- **해결**: Supabase REST API 직접 fetch로 전환 + `created_at`으로 변경
- **교훈**: 배포 전 로컬 curl로 REST 쿼리 검증 필수

### Google 검색 썸네일이 Vercel 기본 아이콘 (2026-03-18)
- **원인 1**: `favicon.ico`가 256×256이지만, Google은 48px 배수(48, 96, 144, 192 등)만 인정 → 파비콘 거부
- **원인 2**: `opengraph-image.tsx`, `apple-icon.tsx`가 `app/` 루트에서 `/opengraph-image`, `/apple-icon` 경로로 서빙되어야 하지만, `next-intl` 미들웨어가 가로채서 404 → Google이 OG 이미지·아이콘 수집 불가
- **해결**:
  1. `app/icon.tsx` 생성 — 192×192 PNG (48의 배수), 금색 "F" 로고
  2. `middleware.ts`의 `SEO_PATHS`에 `/opengraph-image`, `/apple-icon`, `/icon` 추가
  3. `[locale]/layout.tsx` metadata `icons`에서 PNG icon(192×192)을 primary로 설정, favicon.ico를 fallback으로 변경
  4. `manifest.ts` icons에 PNG 192×192 추가, 크기 선언 수정
  5. JSON-LD Organization `logo`를 `/icon`(PNG)으로 변경
- **교훈**: Next.js 메타데이터 규약 파일(`opengraph-image`, `apple-icon`, `icon` 등)이 `app/` 루트에 있으면 확장자 없는 경로로 서빙되므로, 미들웨어 matcher의 확장자 제외 패턴에 걸리지 않는다. 새 메타데이터 규약 파일 추가 시 반드시 `SEO_PATHS`에도 추가할 것
- **참고**: [Google 파비콘 요구사항](https://developers.google.com/search/docs/appearance/favicon-in-search) — 48px 배수 필수, SVG/PNG 선호

### 네이버 색인 1건 (2026-03-13)
- **원인**: `loading.tsx`가 Suspense boundary를 생성하여, 초기 HTML에 스켈레톤만 포함. 실제 콘텐츠는 `<div hidden>` 블록으로 스트리밍됨. 네이버 Yeti 봇은 JS 미실행 → 빈 콘텐츠로 판단
- **해결**: SEO 대상 페이지의 `loading.tsx` 삭제 → 서버가 모든 데이터를 resolve한 후 완성된 HTML을 전송
- **삭제 대상**: `(main)/loading.tsx`, `celeb/[slug]/loading.tsx`, `content/[contentId]/loading.tsx`, `agora/board/notice/loading.tsx`, `agora/board/feedback/loading.tsx`, `agora/social/loading.tsx`
- **유지**: 비공개 페이지(`[userId]/*`, `rest/*`) — robots.txt에서 이미 Disallow
- **트레이드오프**: SEO 페이지에서 스켈레톤 대신 브라우저 기본 로딩 표시. TTFB가 약간 느려질 수 있으나, 서버 컴포넌트 `await`로 데이터를 가져오므로 체감 차이 미미

### Google 색인 거부 "크롤링됨 - 현재 색인이 생성되지 않음" (2026-03-26)
- **증상**: 사이트맵 1,098 URL 제출, 색인 0. 영문 페이지는 "Unknown to Google"
- **원인 1**: `celeb/[slug]/loading.tsx`가 재추가되어 셀럽 페이지가 스켈레톤 HTML만 전송
- **원인 2**: `<Suspense fallback={<Skeleton/>}>` 패턴이 explore, scriptures, 홈 등 14개 공개 페이지에서 동일 문제 유발
- **원인 3**: 영문 페이지 타이틀에 한국어 직업명 노출 (`getCelebProfessionLabel(profession)` locale 누락)
- **원인 4**: 영문 사이트맵에 `/en/` URL이 별도 엔트리로 없어 Google이 영문 페이지를 발견하지 못함
- **해결**:
  1. `celeb/[slug]/loading.tsx` 삭제
  2. 14개 공개 페이지에서 `<Suspense>` 래퍼 제거 — async 서버 컴포넌트가 resolve 후 완성 HTML 전송
  3. `getCelebProfessionLabel`에 locale 전달 (page.tsx 3곳 + opengraph-image.tsx)
  4. `sitemap.ts` — `entry()`가 ko/en 2개 URL을 각각 생성하도록 변경 (~2,196개)
  5. `content_locales` en 행의 한국어 creator 70건 → 영문으로 일괄 수정
  6. 영문 메뉴명 "Scriptures" → "Library" 변경
  7. URL 경로 `/scriptures` → `/library` 변경 + 301 리다이렉트 (next.config.ts)
- **교훈**: `loading.tsx`뿐 아니라 컴포넌트 레벨 `<Suspense>`도 동일한 SEO 문제를 유발한다. SEO 대상 페이지에서는 Suspense를 사용하지 않는다
