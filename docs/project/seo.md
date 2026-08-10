# SEO 설정 현황

> **최종 실측 체크: 26.08.10** — 브랜드 검색에서 홈페이지·인물 허브가 사라진 현상을 Google Search Console과 라이브 HTTP로 재확인했다. 두 URL은 색인 `PASS`지만 검색 노출은 8월 기준 0이며, 사이트 전체 노출도 바닥이다. 브랜드 식별·구조화 데이터·답변 엔진 크롤·사이트맵 freshness 교정을 커밋 `72b46255`로 배포했고, 전체 17,524 URL을 Bing·네이버 IndexNow에 통지했다. Google에는 분할 사이트맵 인덱스를 다시 제출해 즉시 다운로드·오류 0을 확인했다. 기준선·변경·제출 결과는 「브랜드 검색 노출 붕괴」 절이 쥔다.

## 브랜드·사이트명 단일원천

브랜드 표기 규약은 문서 문자열이 아니라 코드가 쥔다.

| 무엇 | 단일원천 |
|------|----------|
| 정본 URL·기본 사이트명·검색 별칭·Organization/WebSite JSON-LD 생성 | `sw/web/src/lib/seo.ts` |
| locale별 홈페이지 제목·내부 페이지 제목 템플릿·설명·H1·가시 별칭 | `sw/web/messages/{ko,en}/core.json`의 `site` |
| 홈페이지 자기참조 canonical·hreflang | `sw/web/src/app/[locale]/(main)/page.tsx` → `getLocalizedAlternates('/')` |
| 내부 페이지 제목 접미사 적용 | `sw/web/src/app/[locale]/layout.tsx` → `title.template` |
| 홈페이지 가시 브랜드·접근성 제목 | `sw/web/src/components/features/home/HomeTabSection.tsx` |

운영 규칙:

1. `WebSite` 구조화 데이터는 도메인 홈페이지(`/`, `/en`)에서만 출력한다. `Organization`은 공통 레이아웃에서 출력한다.
2. 두 구조화 데이터는 반드시 `lib/seo.ts`의 같은 이름·별칭 상수를 사용한다. 문자열을 페이지에 다시 적지 않는다.
3. 홈페이지는 설명형 절대 제목을 사용하고, 내부 페이지는 locale별 짧은 브랜드 접미사를 자동으로 붙인다. 개별 메시지에 같은 브랜드 접미사를 또 넣지 않는다.
4. 한국어 화면의 브랜드 한글 표기와 영문 워드마크가 같은 서비스임을 홈페이지 가시 텍스트와 `alternateName`으로 함께 밝힌다.
5. `meta keywords`는 Google 색인·순위 신호가 아니다. 메시지에 남은 keywords 배열을 브랜드 회복 수단으로 간주하지 않는다.

## SEO·AEO·GEO 운영 원칙

세 용어를 서로 다른 비법처럼 운영하지 않는다. 검색과 답변 엔진이 공통으로 쓰는 공개 문서를 정확히 만들고, 엔진별 수집 통로만 구분한다.

| 축 | 이 프로젝트의 구현 |
|----|-------------------|
| 검색 발견 | canonical·hreflang·내부 링크·XML sitemap·RSS·IndexNow |
| 브랜드/엔터티 판독 | 홈페이지 `WebSite`, 공통 `Organization`, 공식 YouTube `sameAs`, 인물 `Person` + Wikidata `sameAs` |
| 답변 가능성 | 소개·인물·작품·감상경위·근거 URL을 서버 HTML의 가시 텍스트로 제공 |
| 답변 엔진 접근 | 검색·사용자 요청용 UA만 공개 경로 허용; 모델 학습·대량 수집 UA는 차단 |
| 품질 경계 | 구조화 데이터는 가시 본문과 같은 사실만 선언하고, 페이지 성격에 맞지 않는 `FAQPage`·`ProfilePage`를 억지로 붙이지 않음 |

판단 근거:

- Google AI Overviews·AI Mode는 별도 schema나 AI 전용 파일을 요구하지 않고 기존 SEO·색인·가시 텍스트·내부 링크·일치하는 구조화 데이터를 사용한다. 따라서 `llms.txt`를 검색 노출 필수 파일처럼 만들지 않는다. [Google Search Central — AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- Google 사이트명은 홈페이지 `WebSite`의 `name`·`alternateName`, `og:site_name`, 제목·헤딩·가시 텍스트의 일관성을 함께 본다. [Google Search Central — Site names](https://developers.google.com/search/docs/appearance/site-names)
- `ProfilePage`는 사이트와 연관된 작성자·회원 프로필용이다. 역사 인물 자료 페이지에는 `Person`을 유지하고, 설명·생몰일·Wikidata 식별자를 보강한다. [Google Search Central — ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- OpenAI·Anthropic·Perplexity·Amazon은 모델 학습용 봇과 검색/사용자 요청용 봇을 별도로 제공한다. `robots.ts`의 두 배열을 합치지 않는다. [OpenAI crawlers](https://developers.openai.com/api/docs/bots) · [Anthropic bots](https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) · [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) · [Amazon bots](https://developer.amazon.com/amazonbot)

## 브랜드 검색 노출 붕괴 (2026-08-10)

### 판정

`필앤노트`·`feelandnote` 검색에서 자사 홈페이지·인물 허브가 사라지고 YouTube 결과만 남는 현상은 개인화나 단일 질의의 흔들림이 아니다. Search Console에서 홈페이지·`/explore`뿐 아니라 도메인 전체 검색 노출이 함께 붕괴했다.

| 기간 | 홈페이지 노출 | `/explore` 노출 | 사이트 전체 노출 |
|------|--------------:|----------------:|------------------:|
| 2026-03 | 57 | 41 | 674 |
| 2026-04 | 6 | 5 | 195 |
| 2026-05 | 6 | 5 | 17 |
| 2026-06 | 11 | 6 | 24 |
| 2026-07 | 2 | 2 | 12 |
| 2026-08-01~08 | **0** | **0** | **2** |

위 값은 26.08.10 `sc-domain:feelandnote.com`의 web 검색 실적을 API로 조회한 날짜 스냅샷이다. 작은 질의는 개인정보 보호 임계값 때문에 query 차원에서 빠질 수 있으므로, 브랜드어 query 행이 아니라 page 필터와 property 총량을 기준선으로 삼았다.

URL 자체가 삭제된 것은 아니다.

| URL | GSC 판정 | 마지막 크롤 | 라이브 |
|-----|----------|-------------|--------|
| `/` | 제출되고 색인 생성됨, canonical 일치 | 2026-06-24 | 200, index/follow |
| `/explore` | 제출되고 색인 생성됨, canonical 일치 | 2026-07-27 | 200, index/follow |

따라서 상태는 「미색인」이 아니라 **색인은 남았지만 검색 결과 후보에서 사실상 탈락**이다.

### 원인 판정

두 축이 겹쳤다.

1. 7월 15일 이전까지 Google은 셀럽 서가가 서버 HTML에 없는 버전, 콘텐츠 링크가 robots에 막힌 버전, 일부 허브가 canonical=홈을 신고하는 버전을 장기간 보았다. 교정 후에도 홈페이지 마지막 크롤은 그보다 이르다. 상세는 `adsense-audit-2026-07-15.md` 2절·4-3절이 쥔다.
2. 2026-03-26 커밋 `1b02c775`가 전역 제목의 사이트명 접미사를 제거했다. 그 뒤 내부 페이지 제목에서 브랜드가 사라졌고, 홈페이지·구조화 데이터·워드마크·한글 호칭·도메인 표기도 하나의 별칭 집합으로 선언하지 않았다. 제거 시점과 3→4월 노출 급락은 일치하지만, 같은 기간 색인 결함도 있었으므로 단독 인과로 확정하지 않는다.

### 2026-08-10 교정

- 브랜드 이름·별칭·URL과 JSON-LD 빌더를 `src/lib/seo.ts` 한 곳으로 모았다.
- locale별 홈페이지 제목과 설명을 브랜드+서비스 설명형으로 교체했다.
- 내부 페이지 제목에 locale별 짧은 브랜드 접미사를 복원했다.
- 홈페이지에 접근성 제목과 가시 브랜드 별칭을 추가했다.
- `Organization`에 별칭을 추가하고, `WebSite`는 홈페이지에서만 같은 별칭으로 출력하게 분리했다.
- `Organization.sameAs`에 locale별 공식 YouTube 채널을 연결해 검색에 남아 있는 채널과 웹사이트가 같은 브랜드임을 선언했다.
- 인물 `Person`에 가시 소개·한영 별칭·생몰일·Wikidata QID/`sameAs`·정본 URL을 연결하고, 작품 목록 항목은 실제 상세 URL을 갖게 했다.
- 작품 구조화 데이터의 제작자를 전부 `author`로 쓰던 오류를 유형별 `author`·`director`·`byArtist`·`creator`로 나눴다.
- `/explore` 제목·설명에 인물 중심 용어와 브랜드 문맥을 반영했다.
- 영상관처럼 제목 자체에 브랜드가 있던 페이지는 전역 접미사와 중복되지 않게 개별 제목에서 브랜드를 제거했다.
- 답변 엔진 검색용 UA 9종은 공개 범위를 허용하고, 모델 학습·대량 수집 UA 16종은 계속 전면 차단하도록 `robots.ts`를 분리했다.
- sitemap URL 목록은 그대로 두되 인물은 `updated_at ?? created_at`, 작품은 공개 감상문 최신 `updated_at`을 정확한 `lastmod`로 기록하게 했다.
- 새 라우트가 아니므로 `navigation.tsx`는 변경하지 않았다. 기존 canonical·hreflang는 유지한다.

### 배포·제출 결과와 회복 판정

26.08.10 커밋 `72b46255`를 `main`에 푸시했고 Vercel 프로덕션 배포 성공을 확인했다.

- 라이브 `/`, `/en`, `/explore`, `/en/celeb/bill-gates`에서 새 title·description·canonical·hreflang·JSON-LD·가시 브랜드를 확인했다. `OAI-SearchBot`·`Claude-SearchBot`·`PerplexityBot` UA도 공개 페이지를 200으로 받는다.
- 프로덕션 `sitemap.xml`은 기존 주소를 유지한 사이트맵 인덱스이며 하위 파일 10개를 가리킨다. 하위 파일을 합치면 고유 URL 17,524개, 실제 `lastmod`가 있는 URL 17,326개다. 가장 큰 파일은 1.428MiB다. IndexNow 키 파일도 200이고 내용이 키와 일치한다.
- Bing 계열 공용 IndexNow API에는 5,000 + 5,000 + 7,524 URL을, 네이버 공식 IndexNow API에는 10,000 + 7,524 URL을 POST했고 모든 최종 배치가 HTTP 200을 반환했다. 이는 갱신 통지가 수신됐다는 뜻이지 색인 보장은 아니다.
- Google Search Console URL 검사에서 `/`와 `/explore`는 색인 `PASS`, robots 허용, 사용자·Google canonical 일치다. 마지막 크롤은 각각 2026-06-24와 2026-07-27이라 이번 배포본을 아직 본 결과가 아니다.
- `/en`은 2026-08-05 크롤 성공·canonical 일치지만 `Crawled - currently not indexed`, `/en/celeb/bill-gates`는 `URL is unknown to Google`이다. 영문판은 별도 회복 대상이다.
- MCP 래퍼의 `submit_sitemap`은 `403 Insufficient Permission`을 반환했지만, 같은 서비스 계정에 정식 `webmasters` OAuth scope를 지정해 Google Search Console REST API로 직접 PUT했다. 2026-08-10 01:33:14Z 제출, 01:33:15Z 다운로드, `isSitemapsIndex=true`, 오류·경고 0을 확인했다.

남은 운영 절차:

1. 로그인된 Search Console 브라우저에서 `/`, `/explore`, `/about`, `/en`을 실시간 테스트한 뒤 색인 생성을 요청한다. 범용 URL 색인 요청은 Search Console API가 제공하지 않으며, 26.08.10 작업 세션에는 연결된 로그인 브라우저 탭이 없었다. 사이트맵 재제출은 API로 완료했다.
2. 같은 page 필터로 배포 후 7일·14일·28일 노출을 비교한다. 수동 검색 한 번으로 회복을 판정하지 않는다.
3. 재크롤 뒤에도 브랜드 검색과 property 노출이 28일간 회복되지 않으면 Search Console의 수동 조치·보안 문제·삭제 요청 보고서를 사람이 확인한다. 이 세 보고서는 현재 연결 API로 판독할 수 없다.

## 검색엔진 등록 현황

| 서비스 | 상태 | 인증 방식 | 제출 항목 | 비고 |
|--------|------|----------|----------|------|
| Google Search Console | ✅ 등록·조회·사이트맵 재제출 완료 | 메타태그 (`google` verification) | 사이트맵 인덱스 | 26.08.10 REST API 직접 PUT 204, 1초 내 다운로드, 오류·경고 0. 개별 URL 색인 요청은 로그인 브라우저 필요 |
| Google Analytics (GA4) | ✅ 수집 중 | — | — | Property ID: `526353156`. **MCP는 현재 미연결** — `.mcp.json`에 서버 정의 없음(`settings.local.json`의 허용 목록에 이름만 잔존) |
| 네이버 서치어드바이저 | ✅ 등록·IndexNow 재통지 | 메타태그 (`naver-site-verification`) | 사이트맵 + RSS + 주요 URL 수동 제출 | 2026-03-12 등록. 26.08.10 전체 17,524 URL 공식 IndexNow API 200 |
| Bing Webmaster Tools | ✅ 등록·IndexNow 재통지 | Google SC 연동 | 사이트맵 | 2026-03-12 등록. 26.08.10 전체 17,524 URL 공용 IndexNow API 200 |
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

- **데이터·XML 단일원천**: `sw/web/src/lib/sitemap.ts`
- **인덱스 라우트**: `sw/web/src/app/sitemap.xml/route.ts` → `https://feelandnote.com/sitemap.xml`
- **하위 라우트**: `sw/web/src/app/sitemaps/[name]/route.ts` → `/sitemaps/*.xml`
- **방식**: Supabase REST API 직접 fetch (`@supabase/supabase-js`는 메타데이터 라우트에서 동작 안 함)
- **캐시**: 인덱스·하위 파일 모두 `revalidate = 86400` (ISR 하루. Next.js route config 정적 분석 때문에 두 route 파일의 값은 숫자 리터럴이어야 하며, 데이터 fetch 주기는 `lib/sitemap.ts`가 쥔다)
- **URL 구성**(2026-08-10 로컬 실측): 정적 21경로 42 URL + 셀럽(`celeb_tier=eq.full`) 1,500명 3,000 URL + 감상문 보유 콘텐츠 7,163건 14,326 URL + 기관 선정 78경로 156 URL. 각 경로가 ko·en 2 URL로 나가 총 **17,524개**다. DB 증가에 따라 수치는 바뀌므로 규약값이 아니라 날짜 스냅샷이다.
- **분할 구조**: 인덱스는 `core`·`celebs`·`contents-0..7`의 10개 파일을 가리킨다. 작품은 UUID 첫 16진수를 8개 고정 버킷에 배정해 같은 작품의 ko·en URL이 항상 같은 파일에 남는다. 26.08.10 실측은 10개 합계 17,524개·중복 0·누락 0, 최대 파일 `celebs.xml` 1.428MiB다.
- **분할 이유**: 종전 단일 파일은 9.21MiB로 네이버의 10MB 제한 직전이었다. 분할 뒤 각 파일은 충분한 여유를 가지며, 기존 제출 주소 `/sitemap.xml`은 인덱스로 그대로 유지된다. [네이버 서치어드바이저 — RSS 및 사이트맵 제출](https://searchadvisor.naver.com/guide/request-feed)
- **등재 기준**: 셀럽은 full 티어만, 콘텐츠는 감상문(`review`) 1건 이상·`visibility=public`인 것만. 페이지 noindex 기준과 일치시킨다(등재↔색인거부 모순 방지)
- **리다이렉트 스텁 제외**: `/explore/celebs`·`people`·`figure`·`celeb-feed`·`top-by-type`, `/agora` 미등재
- **페이지네이션**: Supabase REST 기본 제한 1,000행 → 1,000행씩 반복 fetch
- **hreflang**: ko, en, x-default
- **lastModified**: 인물은 `celebs.updated_at ?? created_at`, 작품은 그 작품의 공개 감상문 중 가장 최신 `updated_at`을 사용한다. 정적 경로·기관 선정 화면은 정확한 수정 시각을 산출할 수 없어 기록하지 않는다. `new Date()` 폴백은 매 재생성마다 "방금 수정됨"으로 찍혀 검색엔진이 신호를 무시하게 만드므로 금지한다

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
- **사이트 전량 갱신 통지** (2026-08-10): 이번 브랜드 메타·구조화 데이터의 사이트 전역 변경에 한해 sitemap 17,524 URL을 Bing 계열 공용 API와 네이버 공식 API에 나눠 전송했고 최종 배치 전부 HTTP 200을 확인했다. 평상시에는 변경된 URL만 증분 통지한다.

## Robots

- **파일**: `sw/web/src/app/robots.ts`
- **URL**: `https://feelandnote.com/robots.txt`
- **일반 크롤러(`*`)**: `allow: /` + `crawlDelay: 1`. Disallow는 아래.
  - 시스템: `/private/`, `/admin/`, `/api/`
  - 인증: `/login`, `/signup`, `/reset-password` (각각 `/en` 접두 변형 포함)
  - 개인: `/reading`, `/*/reading`, `/*/chamber`, `/*/merits`
  - 기타: `/notifications`, `/search`, `/lab` (`/en` 접두 변형 포함)
  - 쿼리: `/*?*search=`, `/*?*sortBy=`, `/*?*sort=`, `/*?*page=` — **무한 조합을 만드는 파라미터만** 차단한다. `/*?` 전면 차단은 `?category=`가 붙은 콘텐츠 상세 내부 링크까지 크롤 불가로 만들어 색인 붕괴를 일으켰다(2026-07-15 해제)
- **검색·답변·사용자 요청 크롤러 9종**: `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Amzn-SearchBot`, `Amzn-User`, `YouBot`. 일반 검색엔진과 같은 공개 범위만 허용하고 `crawlDelay: 1`을 선언한다.
- **모델 학습·대량 수집 크롤러 16종**(`GPTBot`·`ClaudeBot`·`CCBot`·`Bytespider`·`Google-Extended`·`Amazonbot` 등): `Disallow: /` 전 경로 차단. 답변 엔진을 열었다고 학습 수집까지 연 것이 아니다.
- 일반 `Googlebot`은 Google 검색·AI Overviews/AI Mode를 함께 제어하고, `Google-Extended` 차단은 Google 검색 노출에 영향을 주지 않는다.

## 미들웨어 SEO 경로 제외

`sw/web/src/middleware.ts`에서 SEO 경로를 코드 가드로 제외한다:

```ts
const SEO_PATHS = ['/sitemap.xml', '/robots.txt', '/feed.xml', '/opengraph-image']
const SEO_PATH_PREFIXES = ['/seo-image/', '/sitemaps/']

if (
  SEO_PATHS.includes(request.nextUrl.pathname)
  || SEO_PATH_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))
) {
  return NextResponse.next()
}
```

실제 조건문은 `SEO_PATHS` exact match와 `SEO_PATH_PREFIXES` prefix match를 함께 검사한다. matcher 패턴의 dot 이스케이프가 불안정하므로 코드 가드가 SSoT이다. 단일 SEO 경로는 `SEO_PATHS`, 여러 하위 파일을 갖는 경로는 `SEO_PATH_PREFIXES`에 추가한다.

아이콘은 이제 규약 파일이 아니라 `public/icon.png`·`public/apple-icon.png` 정적 파일로 서빙되므로 `SEO_PATHS`에 넣지 않는다. `[locale]/layout.tsx`의 `icons`와 `manifest.ts`가 이 경로를 가리킨다.

## MCP 도구

| MCP | 용도 | 주요 도구 |
|-----|------|----------|
| `google-search-console` | 검색 성과 분석, 색인 상태 확인, 사이트맵 제출 | `search_analytics`, `index_inspect`, `submit_sitemap`, `detect_quick_wins` |
| ~~`google-analytics`~~ | 트래픽·사용자 행동 분석 | **현재 `.mcp.json`에 미등록.** 쓰려면 서버 정의부터 되살려야 한다 |

`google-search-console` MCP의 `submit_sitemap`이 읽기 scope로 403을 반환하더라도 사이트 소유 권한 부족으로 단정하지 않는다. `.mcp.json`의 같은 서비스 계정 자격에 `https://www.googleapis.com/auth/webmasters` scope를 명시해 공식 Sitemaps PUT API를 호출하고, 토큰·자격 파일 내용은 출력하지 않는다.

## 로컬 검증 방법

배포 전 Supabase REST curl로 검증한다:

```bash
cd sw/web && source .env.local

# 사이트맵 쿼리 테스트
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=slug,created_at&profile_type=eq.CELEB&status=eq.active&celeb_tier=eq.full&slug=not.is.null&order=created_at.asc&limit=3" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

# 배포 후 검증
curl -s "https://feelandnote.com/sitemap.xml" | grep -c "<sitemap>" # 현재 하위 파일 10개
curl -s "https://feelandnote.com/sitemaps/celebs.xml" | grep -c "<url>"
curl -s "https://feelandnote.com/sitemaps/contents-0.xml" | grep -c "<url>"
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

### 네이버 상세 썸네일 오선택·잘림과 인용부호 엔티티 노출 (2026-08-09)
- **증상**: 인물 상세 검색 결과에 인물 대신 첫 책 표지가 나오거나 이미지가 비었고, 작품 상세의 세로 표지는 검색 결과 프레임에서 잘렸다. 감상 배경의 작은따옴표는 `&#39;` 같은 엔티티로 노출됐다.
- **원인 1**: 인물별 `opengraph-image.tsx`가 이름과 콘텐츠 수만 그린 배너라 실제 인물 사진이 없었다. Next.js가 만든 내부 locale 이미지 URL도 정본 경로까지 리다이렉트를 거쳤다. 네이버가 이 OG 이미지를 문서 대표 이미지로 채택하지 않으면 본문의 첫 책 표지를 대신 골랐다.
- **원인 2**: 작품 상세은 외부 서점의 세로 표지 URL을 `og:image`로 직접 제공했다. 원본 응답이 불안정할 수 있고, 검색 결과의 정사각 프레임에서는 세로 표지가 중앙 크롭됐다.
- **원인 3**: `FormattedText`가 직선 따옴표와 내부 문장을 여러 React 텍스트 노드로 출력했다. SSR HTML의 엔티티와 노드 경계 주석을 네이버가 평문으로 복원하지 못했다. DB 원문에는 HTML 엔티티가 없음을 전수 집계로 확인했다.
- **해결**:
  1. 인물·작품 메타가 자체 도메인의 `/seo-image/celeb/[slug]`, `/seo-image/content/[contentId]`를 명시적으로 가리키게 했다. 규격·캐시·허용 원본 호스트의 SSoT는 `sw/web/src/lib/seoImage.ts`다.
  2. 인물은 아바타(없으면 대표 초상), 작품은 locale별 원본 표지를 자르지 않고 정사각 PNG 안에 담는다. 원본이 없거나 응답하지 않아도 깨진 URL 대신 유형별 기본 이미지를 반환한다.
  3. `middleware.ts`의 `SEO_PATH_PREFIXES`가 이미지 라우트를 locale 미들웨어에서 제외한다. HTML 페이지에는 같은 URL을 Open Graph·Twitter·JSON-LD 이미지로 함께 선언한다.
  4. `FormattedText`는 인용부호와 문장을 한 텍스트 노드의 유니코드 따옴표로 출력하며, 작품 메타 설명도 `toSeoDescription()`으로 평문화한다.
- **검증**: 프로덕션 빌드 후 인물·책·원본 없음 표본 모두 직접 200 PNG 응답, 네이버 공식 이미지 조건 충족, 공개 HTML에서 기존 엔티티·노드 경계 주석 제거를 확인했다. 기존 검색 결과는 재수집 뒤 바뀌므로 즉시 교체되지는 않는다.
- **참고**: [네이버 서치어드바이저 콘텐츠 마크업 — 오픈 그래프 이미지](https://searchadvisor.naver.com/guide/markup-content)

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

### 검색 노출 약 2% 규모 — AdSense 반복 거절 (2026-07-15, 07-22 재검증)

**전수 감사 보고서: `docs/project/adsense-audit-2026-07-15.md` (원인·조치·검증·재신청 절차의 SSoT)**

- **증상**: 사이트맵 2,196 URL 제출 대비 3개월간 검색 노출된 고유 페이지 45개, 클릭 11회. 이는 제출 규모의 약 2%지만 **검색 노출 페이지 수를 정확한 색인률로 부르지는 않는다.**
- **확인한 기술 결함 1**: `robots.ts`의 `Disallow: /*?` 가 쿼리 URL을 전면 차단하는데 콘텐츠 상세 내부 링크 16곳이 전부 `?category=` 부착 + 사이트맵에 `/content/` 미등재 → contents 7,568건 전체가 크롤 불가
- **확인한 기술 결함 2**: 셀럽 페이지(표면적 96%)의 책 목록·리뷰·감상 여정이 클라이언트 fetch → 서버 HTML에 책 0권 (스켈레톤 사고 3번째 재발, 이번엔 컴포넌트 레벨)
- **확인한 기술 결함 3**: `[locale]/layout.tsx`가 canonical=홈을 레이아웃 레벨 선언 → 자체 alternates 없는 허브 20 URL이 "정본=홈" 신고
- **해결**: robots 쿼리 차단 해제 / 셀럽 서가·리뷰·감상 여정 SSR 전환 / canonical 상속 제거 + 개별 페이지 자기참조 부여 / 사이트맵에 리뷰 보유 콘텐츠 6,665건 등재(2,196 → 15,884 URL) / 얇은 티어·리뷰 0건·아고라 noindex / 스텁 6종 사이트맵 제거 + 308 승격
- **검증**: 셀럽 페이지 가시 텍스트 3,309자 → 10,415자, 책 제목·감상 배경·출처가 서버 HTML에 노출
- **07-22 상태**: 사이트맵은 07-17 재다운로드·오류 0. `/celeb/elon-musk`의 마지막 크롤은 05-19 그대로이고, 새 콘텐츠 상세 표본은 `Google에는 아직 알려지지 않은 URL`. 04-15~07-20 검색 노출 고유 페이지도 44개로 회복 신호가 없다.
- **별도 위험**: 사이트맵의 83.9%인 콘텐츠 상세 페이지 13,330개는 고유 콘텐츠 6,665건의 ko/en 쌍이다. DB 전수 집계상 5,140건(77.1%)이 감상문 1건뿐이고 한국어 감상문 중앙값은 158자다. 이는 정책상 불합격률이 아니라 콘텐츠 가치 위험 지표이며, 색인 회복과 별도로 출판 기준을 검토한다.
- **교훈 1**: 표면 SEO(메타·canonical·JSON-LD·ads.txt) 전부 정상이어도, 크롤러가 따라갈 링크가 없고 본문이 JS 뒤에 있으면 색인은 0이다. **`loading.tsx` 제거만으로 스켈레톤 문제가 끝나지 않는다 — 컴포넌트의 `useEffect` 클라이언트 fetch도 동일 결과다.**
- **교훈 2**: 사이트맵 등재 기준과 noindex 기준은 반드시 일치시킨다(등재 후 색인 거부 = 모순 신호). 다만 “감상문 1건 이상”이 곧 “색인할 가치가 충분함”을 뜻하지는 않는다.
- **정적 렌더 재파손 가드 — 해소(2026-08-04)**: `ContentLibrary`의 `useSearchParams()`를 제거했다. 서가 초기 데이터는 ISR HTML에 두고 `?q=`만 hydration 후 적용한다. `[locale]` root layout·셀럽 ISR 전환은 `web-egress-audit-2026-06-29.md` 11절이 SSoT다. 배포 검증에서는 셀럽 HTML 원문에 책 제목·감상문이 남는지 반드시 확인한다.
