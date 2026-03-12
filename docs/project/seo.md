# SEO 설정 현황

## 사이트맵

- **파일**: `sw/web/src/app/sitemap.ts`
- **방식**: Supabase REST API 직접 fetch (`@supabase/supabase-js`는 메타데이터 라우트에서 동작 안 함)
- **캐시**: `revalidate = 3600` (ISR 1시간)
- **URL 구성**: 정적 경로 27개 + 셀럽 동적 경로 ~1,070개
- **페이지네이션**: Supabase REST 기본 제한 1,000행 → 1,000행씩 반복 fetch
- **hreflang**: ko, en, x-default
- **lastModified**: `profiles.created_at` 사용 (`updated_at` 컬럼 없음)

## RSS 피드

- **파일**: `sw/web/src/app/feed.xml/route.ts`
- **URL**: `https://feelandnote.com/feed.xml`
- **내용**: 최근 등록 셀럽 100명 (created_at DESC)
- **캐시**: `revalidate = 3600` (ISR 1시간)
- **디스커버리**: `[locale]/layout.tsx` metadata에 `alternates.types` 설정
- **네이버 서치어드바이저**: RSS 제출란에 이 URL 등록

## IndexNow

- **키 파일**: `sw/web/public/4f3c45379c68dc5a57ad8927e92dda93.txt`
- **유틸**: `sw/web/src/lib/indexnow.ts` → `notifyIndexNow(['/celeb/slug'])`
- **대상 엔진**: 네이버, Bing, Yandex 등 IndexNow 지원 엔진
- production 환경에서만 동작 (dev 환경 skip)
- 셀럽 등록/수정 등 콘텐츠 변경 시 호출하면 즉시 색인 요청됨

## Robots

- **파일**: `sw/web/src/app/robots.ts`
- **Disallow**:
  - 시스템: `/private/`, `/admin/`, `/api/`
  - 인증: `/login`, `/signup`, `/reset-password`
  - 개인: `/reading`, `/*/reading`, `/*/chamber`, `/*/merits`
  - 기타: `/notifications`, `/search`, `/lab`

## 미들웨어 주의사항

`sw/web/src/middleware.ts` matcher에서 `sitemap`, `robots.txt`, `feed.xml` 경로를 제외해야 한다. 미제외 시 `next-intl`이 가로채서 XML 대신 HTML로 응답한다.

## 검색엔진 등록 현황

| 서비스 | 상태 | 비고 |
|--------|------|------|
| Google Search Console | 등록 완료 | MCP 연결됨 (`mcp__google-search-console__*`) |
| Google Analytics (GA4) | 수집 중 | MCP 연결됨 (`mcp__google-analytics__*`). Property ID: `526353156` |
| 네이버 서치어드바이저 | 사이트맵 + RSS 제출 | 2026-03-12 |

## MCP 도구

| MCP | 용도 | 주요 도구 |
|-----|------|----------|
| `google-search-console` | 검색 성과 분석, 색인 상태 확인, 사이트맵 제출 | `search_analytics`, `index_inspect`, `submit_sitemap`, `detect_quick_wins` |
| `google-analytics` | 트래픽·사용자 행동 분석 | `get_ga4_data`, `search_schema` |

## 로컬 검증 방법

배포 전 Supabase REST curl로 검증한다:

```bash
cd sw/web && source .env.local
# 사이트맵 쿼리
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=slug,created_at&profile_type=eq.CELEB&status=eq.active&slug=not.is.null&order=created_at.asc&limit=3" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
```
