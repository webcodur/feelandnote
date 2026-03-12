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
- **미연동 상태**: 유틸만 구현됨. 셀럽 등록 플로우에 호출 코드 추가 필요.

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
