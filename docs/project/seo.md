# SEO 설정 현황

> **최종 실측 체크: 26.07.16** — `sitemap.ts`·`robots.ts`·`feed.xml/route.ts`·`middleware.ts`·`[locale]/layout.tsx`·`manifest.ts`·IndexNow 유틸·MCP 설정을 라이브 코드와 대조. 검색엔진 콘솔 쪽 등록 상태(GSC·네이버·Bing·Daum 제출 이력)는 외부 서비스라 미확인.

## 검색엔진 등록 현황

| 서비스 | 상태 | 인증 방식 | 제출 항목 | 비고 |
|--------|------|----------|----------|------|
| Google Search Console | ✅ 완료 | 메타태그 (`google` verification) | 사이트맵 | MCP 연결됨 (`mcp__google-search-console__*`) |
| Google Analytics (GA4) | ✅ 수집 중 | — | — | Property ID: `526353156`. **MCP는 현재 미연결** — `.mcp.json`에 서버 정의 없음(`settings.local.json`의 허용 목록에 이름만 잔존) |
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
- **캐시**: `revalidate = 86400` (ISR 하루. 재생성 1회가 Supabase에서 약 1MB를 끌어오므로 1시간 → 하루로 완화, 2026-07-15)
- **URL 구성**(2026-07-15 확장): 정적 20경로 + 셀럽(`celeb_tier=eq.full`) + 감상문 보유 콘텐츠 `/content/{id}` — 각 경로가 ko·en 2 URL로 나가 총 **약 15,884개** (정적 40 + 셀럽 2,514 + 콘텐츠 13,330)
- **등재 기준**: 셀럽은 full 티어만, 콘텐츠는 감상문(`review`) 1건 이상·`visibility=public`인 것만. 페이지 noindex 기준과 일치시킨다(등재↔색인거부 모순 방지)
- **리다이렉트 스텁 제외**: `/explore/celebs`·`people`·`figure`·`celeb-feed`·`top-by-type`, `/agora` 미등재
- **페이지네이션**: Supabase REST 기본 제한 1,000행 → 1,000행씩 반복 fetch
- **hreflang**: ko, en, x-default
- **lastModified**: 셀럽만 `profiles.created_at` 사용 (`updated_at` 컬럼 없음). 정적 경로·콘텐츠는 **기록하지 않는다** — `new Date()` 폴백은 매 재생성마다 "방금 수정됨"으로 찍혀 구글이 lastmod 신호를 무시하게 만든다

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
- **유틸**: `sw/web-bo/src/lib/indexnow.ts` → `notifyIndexNow(['/celeb/slug'])` (호출 주체가 BO이므로 web이 아니라 web-bo에 있다)
- **대상 엔진**: 네이버, Bing, Yandex 등 IndexNow 지원 엔진
- production 환경에서만 동작 (dev 환경 skip)
- 셀럽 등록/수정 등 콘텐츠 변경 시 호출하면 즉시 색인 요청됨
- **연동 완료** (2026-03-13): `web-bo` celebs.ts의 `toggleCelebStatus`(active 전환 시) + `updateCeleb`(active 셀럽 정보 변경 시) 호출

## Robots

- **파일**: `sw/web/src/app/robots.ts`
- **URL**: `https://feelandnote.com/robots.txt`
- **일반 크롤러(`*`)**: `allow: /` + `crawlDelay: 1`. Disallow는 아래.
  - 시스템: `/private/`, `/admin/`, `/api/`
  - 인증: `/login`, `/signup`, `/reset-password` (각각 `/en` 접두 변형 포함)
  - 개인: `/reading`, `/*/reading`, `/*/chamber`, `/*/merits`
  - 기타: `/notifications`, `/search`, `/lab` (`/en` 접두 변형 포함)
  - 쿼리: `/*?*search=`, `/*?*sortBy=`, `/*?*sort=`, `/*?*page=` — **무한 조합을 만드는 파라미터만** 차단한다. `/*?` 전면 차단은 `?category=`가 붙은 콘텐츠 상세 내부 링크까지 크롤 불가로 만들어 색인 붕괴를 일으켰다(2026-07-15 해제)
- **AI 학습·수집 크롤러 20종**(`GPTBot`·`ClaudeBot`·`CCBot`·`Bytespider` 등): `Disallow: /` 전 경로 차단. egress 방어의 주력이므로 손대지 않는다

## 미들웨어 SEO 경로 제외

`sw/web/src/middleware.ts`에서 SEO 경로를 코드 가드로 제외한다:

```ts
const SEO_PATHS = ['/sitemap.xml', '/robots.txt', '/feed.xml', '/opengraph-image']

if (SEO_PATHS.includes(request.nextUrl.pathname)) {
  return NextResponse.next()
}
```

matcher 패턴의 dot 이스케이프가 불안정하므로, 코드 가드가 SSoT이다. 새 SEO 경로 추가 시 `SEO_PATHS` 배열에 추가한다.

아이콘은 이제 규약 파일이 아니라 `public/icon.png`·`public/apple-icon.png` 정적 파일로 서빙되므로 `SEO_PATHS`에 넣지 않는다. `[locale]/layout.tsx`의 `icons`와 `manifest.ts`가 이 경로를 가리킨다.

## MCP 도구

| MCP | 용도 | 주요 도구 |
|-----|------|----------|
| `google-search-console` | 검색 성과 분석, 색인 상태 확인, 사이트맵 제출 | `search_analytics`, `index_inspect`, `submit_sitemap`, `detect_quick_wins` |
| ~~`google-analytics`~~ | 트래픽·사용자 행동 분석 | **현재 `.mcp.json`에 미등록.** 쓰려면 서버 정의부터 되살려야 한다 |

## 로컬 검증 방법

배포 전 Supabase REST curl로 검증한다:

```bash
cd sw/web && source .env.local

# 사이트맵 쿼리 테스트
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=slug,created_at&profile_type=eq.CELEB&status=eq.active&celeb_tier=eq.full&slug=not.is.null&order=created_at.asc&limit=3" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

# 배포 후 검증
curl -s "https://feelandnote.com/sitemap.xml" | grep -c "<url>"   # 예상: ~15884
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
- **이후 현행화(26.07.16 실측)**: 아이콘 두 종은 규약 파일에서 정적 파일로 옮겨졌다 — `app/icon.tsx`·`app/apple-icon.tsx`는 없고 `public/icon.png`(192×192)·`public/apple-icon.png`가 그 자리를 대신한다. 따라서 `SEO_PATHS`에 남은 규약 파일 경로는 `/opengraph-image` 하나뿐이다
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
  7. URL 경로 `/scriptures` → `/library` 변경 + 영구 리다이렉트 (next.config.ts `permanent: true` → 308)
- **교훈**: `loading.tsx`뿐 아니라 컴포넌트 레벨 `<Suspense>`도 동일한 SEO 문제를 유발한다. SEO 대상 페이지에서는 Suspense를 사용하지 않는다

### 색인률 2% — AdSense 반복 거절 (2026-07-15)

**전수 감사 보고서: `docs/project/adsense-audit-2026-07-15.md` (원인·조치·검증·재신청 절차의 SSoT)**

- **증상**: 사이트맵 2,196 URL 제출 대비 3개월간 검색 노출된 고유 페이지 45개, 클릭 11회. AdSense 반복 거절.
- **원인 1**: `robots.ts`의 `Disallow: /*?` 가 쿼리 URL을 전면 차단하는데 콘텐츠 상세 내부 링크 16곳이 전부 `?category=` 부착 + 사이트맵에 `/content/` 미등재 → contents 7,568건 전체가 크롤 불가
- **원인 2**: 셀럽 페이지(표면적 96%)의 책 목록·리뷰·감상 여정이 클라이언트 fetch → 서버 HTML에 책 0권 (스켈레톤 사고 3번째 재발, 이번엔 컴포넌트 레벨)
- **원인 3**: `[locale]/layout.tsx`가 canonical=홈을 레이아웃 레벨 선언 → 자체 alternates 없는 허브 20 URL이 "정본=홈" 신고
- **해결**: robots 쿼리 차단 해제 / 셀럽 서가·리뷰·감상 여정 SSR 전환 / canonical 상속 제거 + 개별 페이지 자기참조 부여 / 사이트맵에 리뷰 보유 콘텐츠 6,665건 등재(2,196 → 15,884 URL) / 얇은 티어·리뷰 0건·아고라 noindex / 스텁 6종 사이트맵 제거 + 308 승격
- **검증**: 셀럽 페이지 가시 텍스트 3,309자 → 10,415자, 책 제목·감상 배경·출처가 서버 HTML에 노출
- **교훈 1**: 표면 SEO(메타·canonical·JSON-LD·ads.txt) 전부 정상이어도, 크롤러가 따라갈 링크가 없고 본문이 JS 뒤에 있으면 색인은 0이다. **`loading.tsx` 제거만으로 스켈레톤 문제가 끝나지 않는다 — 컴포넌트의 `useEffect` 클라이언트 fetch도 동일 결과다.**
- **교훈 2**: 사이트맵 등재 기준과 noindex 기준은 반드시 일치시킨다(등재 후 색인 거부 = 모순 신호). 현재 둘 다 `celeb_tier=full`.
- **⚠️ 정적 렌더 전환 시 재파손 주의**: `ContentLibrary`가 `useSearchParams()`를 쓴다. 현재는 `getCelebBySlug`의 쿠키 접근으로 셀럽 라우트가 동적 렌더(ƒ)라 SSR이 유지되지만, egress 감사의 `[locale]` 정적 렌더 전환 과제를 수행하면 Suspense 경계에서 이 서브트리가 CSR로 빠져 **책 목록이 HTML에서 다시 사라진다.** 정적화 시 `q` 검색어를 서버 prop으로 내리는 조치를 함께 해야 한다.
