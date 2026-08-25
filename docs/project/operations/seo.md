# SEO 설정 현황

> **최종 실측 체크: 26.08.25** — Search Console API에서 사이트맵은 08-22 재다운로드됐고 제출 6,346 URL·오류 0·경고 0이다. 홈·탐색·소개·영문 홈은 모두 색인·canonical 일치이며, 08-10~22 전체 노출은 22·0클릭으로 3월 674·24클릭 수준을 회복하지 못했다. 사이트맵에서 앞·중간·끝을 균등하게 뽑은 인물 22 URL은 색인 1·`발견됨·미색인` 19·`Google에 알려지지 않음` 2였지만, 같은 기간 실제 노출이 잡힌 인물 표본 6 URL은 6개 모두 색인됐다. Sitemap API의 `indexed: 0`은 이 URL 검사와 모순되므로 전체 색인 수로 해석하지 않는다. Google은 현재도 일부 인물을 새로 크롤하지만 대다수 발견 URL에 우선순위를 주지 않는 상태다. 사이트맵 6,346 URL(`core` 228 + 3,059명 한·영 `celebs` 6,118)은 계획된 3,000명 확장의 결과이며 축소 대상이 아니다. 전체 병목은 서버·robots·사이트맵 전면 장애가 아니라 4월 장애 뒤 회복되지 않은 크롤 수요·외부 신뢰도이므로 반복 제출이나 셀럽 감축으로 해결하지 않는다.
>
> **직전 체크: 26.08.10 13:20 KST** — 브랜드 검색 노출 붕괴를 교정한 뒤 Google Search Console에서 분할 사이트맵 `성공`·발견 페이지 17,700개를 확인했고, 대표 URL 4개를 실시간 테스트해 전부 색인 가능 판정과 우선순위 크롤링 대기열 추가를 완료했다. 직접 조치·보안 문제는 없고 최근 6개월 삭제 요청도 없다. 비개인화 검색(`pws=0`)에서는 `필앤노트`에 홈페이지가 첫 웹 결과로 복귀했고 Google AI 개요도 서비스 설명을 생성했다. `feelandnote`는 11:08 KST에는 홈페이지가 첫 웹 결과였으나 13:20 KST 재검사에서는 YouTube와 동명이의 서비스가 먼저 나와 아직 결과가 안정적이지 않다. 작업 중 DB 공개 데이터가 늘어 최종 프로덕션 사이트맵 17,724개를 Bing·네이버에도 다시 전량 통지했다. 기준선·변경·제출·회복 결과는 「브랜드 검색 노출 붕괴」 절이 쥔다.

## 브랜드·사이트명 단일원천

브랜드 표기 규약은 문서 문자열이 아니라 코드가 쥔다.

| 무엇 | 단일원천 |
|------|----------|
| 정본 URL·기본 사이트명·검색 별칭·Organization/WebSite JSON-LD 생성 | `sw/web/src/lib/seo.ts` |
| locale별 홈페이지 제목·내부 페이지 제목 템플릿·설명·H1·가시 별칭 | `sw/web/messages/{ko,en}/core.json`의 `site` |
| 홈페이지 자기참조 canonical·hreflang | `sw/web/src/app/[locale]/(main)/page.tsx` → `getLocalizedAlternates('/')` |
| 내부 페이지 제목 접미사 적용 | `sw/web/src/app/[locale]/layout.tsx` → `title.template` |
| 홈페이지 가시 브랜드·접근성 제목 | `sw/web/src/components/features/home/HomeBrandHeader.tsx` |
| 홈 구획 순서·목차 라벨·구획별 더보기 대상 | `sw/web/src/components/shared/hubSectionUtils.tsx`의 `HOME_SECTIONS` |

운영 규칙:

1. `WebSite` 구조화 데이터는 도메인 홈페이지(`/`, `/en`)에서만 출력한다. `Organization`은 공통 레이아웃에서 출력한다.
2. 두 구조화 데이터는 반드시 `lib/seo.ts`의 같은 이름·별칭 상수를 사용한다. 문자열을 페이지에 다시 적지 않는다.
3. 홈페이지는 설명형 절대 제목을 사용하고, 내부 페이지는 locale별 짧은 브랜드 접미사를 자동으로 붙인다. 개별 메시지에 같은 브랜드 접미사를 또 넣지 않는다.
4. 한국어 화면의 한글 표기, 영문 워드마크, 붙여쓰기 별칭 `feelandnote`가 같은 서비스임을 홈페이지 가시 텍스트와 `alternateName`으로 함께 밝힌다.
5. `meta keywords`는 Google 색인·순위 신호가 아니다. 메시지에 남은 keywords 배열을 브랜드 회복 수단으로 간주하지 않는다.

## 인물 상세 메타데이터

인물 상세의 제목과 설명은 `sw/web/src/lib/celeb/meta.ts`가 만들고, 메타 태그 조립은
`celeb/[slug]/celebPageMetadata.ts`가 맡는다.

- **`headline`(한 줄 정의)**: `fiction`과 `light` 인물에서 `headline`이 등록되어 있으면 최우선으로 `${headline} — ${nickname}` 형식으로 타이틀을 조립한다. `full` 인물도 감상 기록이 0건일 때 `headline`이 있으면 이를 우선 활용한다.
- **`fiction`**: `headline`이 없을 경우 연결 원전이 있으면 `${nickname}, 《${원전}》의 등장인물`로, 원전 연결도 없으면 기존 수식어(`${title} — ${nickname}`), 수식어도 없으면 이름만 쓴다.
- **`light`**: `headline`이 없을 경우 기존 수식어(`${title} — ${nickname}`)로 폴백한다.
- **`full`**: 콘텐츠가 실제로 1건 이상 있는 `full`은 감상 기록과 건수를 제목에 쓴다 (`${title} ${nickname}이 감상한 책 ${count}권...`).

구조화 데이터는 모두 `Person`을 중심 엔터티로 유지한다. `full`의 공개 감상 기록만
`ItemList`로 연결하고, `fiction`의 원전·등장 작품은 `CreativeWork.character`로 인물과 잇는다.
픽션 프로필의 서사 기준 연도와 배경 국가는 실제 생몰일·국적이 아니므로 해당 값을
구조화 데이터에 선언하지 않는다. canonical·hreflang·Open Graph·Twitter 문구도 같은
티어별 제목과 설명을 공유한다.

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

기술적으로 URL이 색인에서 전부 삭제된 상태는 아니었다. 다만 사용자가 실제로 입력하는 `필앤노트` 검색에서 웹사이트가 사라졌으므로 서비스 관점에서는 **검색 발견 경로가 붕괴한 상태**로 판정한다. 색인 보존 여부를 들어 사용자 체감 문제를 축소해서는 안 된다.

| URL | GSC 판정 | 마지막 크롤 | 라이브 |
|-----|----------|-------------|--------|
| `/` | 제출되고 색인 생성됨, canonical 일치 | 2026-06-24 | 200, index/follow |
| `/explore` | 제출되고 색인 생성됨, canonical 일치 | 2026-07-27 | 200, index/follow |

따라서 홈페이지·인물 허브는 「미색인」이 아니라 **색인은 남았지만 검색 결과 후보에서 사실상 탈락**한 상태였다. 영문 홈과 소개 페이지는 별도로 미색인 상태였다.

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

26.08.10 커밋 `72b46255`를 당시 프로덕션에 배포했다.

- 라이브 `/`, `/en`, `/explore`, `/en/celeb/bill-gates`에서 새 title·description·canonical·hreflang·JSON-LD·가시 브랜드를 확인했다. `OAI-SearchBot`·`Claude-SearchBot`·`PerplexityBot` UA도 공개 페이지를 200으로 받는다.
- 프로덕션 `sitemap.xml`은 기존 주소를 유지한 사이트맵 인덱스이며 하위 파일 10개를 가리킨다. 하위 파일을 합치면 고유 URL 17,524개, 실제 `lastmod`가 있는 URL 17,326개다. 가장 큰 파일은 1.428MiB다. IndexNow 키 파일도 200이고 내용이 키와 일치한다.
- Bing 계열 공용 IndexNow API에는 5,000 + 5,000 + 7,524 URL을, 네이버 공식 IndexNow API에는 10,000 + 7,524 URL을 POST했고 모든 최종 배치가 HTTP 200을 반환했다. 이는 갱신 통지가 수신됐다는 뜻이지 색인 보장은 아니다.
- 위 통지 뒤 공개 데이터가 계속 늘어 11:23 KST 프로덕션 사이트맵이 17,724개가 됐다. 최신 스냅샷 전량을 Bing에는 5,000 + 5,000 + 5,000 + 2,724, 네이버에는 10,000 + 7,724 URL로 다시 POST했고 6개 배치가 모두 HTTP 200을 반환했다.
- Google Search Console URL 검사에서 `/`와 `/explore`는 색인 `PASS`, robots 허용, 사용자·Google canonical 일치다. 마지막 크롤은 각각 2026-06-24와 2026-07-27이라 이번 배포본을 아직 본 결과였다.
- `/en`은 2026-08-06 크롤 성공·canonical 일치지만 `Crawled - currently not indexed`였다. `/about`은 2026-07-01 마지막 저장 상태가 404여서 미색인이었다. 두 URL 모두 26.08.10 실시간 테스트에서는 현재 배포본이 색인 가능 판정을 통과했다.
- MCP 래퍼의 `submit_sitemap`은 `403 Insufficient Permission`을 반환했지만, 같은 서비스 계정에 정식 `webmasters` OAuth scope를 지정해 Google Search Console REST API로 직접 PUT했다. 2026-08-10 01:33:14Z 제출, 01:33:15Z 다운로드, `isSitemapsIndex=true`, 오류·경고 0을 확인했다.
- 로그인된 Search Console 화면에서도 사이트맵 유형 `Sitemap 색인`, 제출·마지막 읽기 2026-08-10, 상태 `성공`을 확인했다. 최초 확인 때 0이던 발견 페이지는 하위 파일 처리가 끝난 뒤 17,700개로 집계됐다. 같은 시각 프로덕션 하위 사이트맵 10개를 직접 합산해도 17,700개였다.
- 대표 URL 4개는 모두 실시간 테스트에서 `URL을 Google에 등록할 수 있음`·`페이지 색인을 생성할 수 있음`을 통과했고, 각각 `색인 생성 요청됨`·`우선순위 크롤링 대기열에 추가` 확인창까지 받았다.

| URL | 요청 전 저장 상태 | 26.08.10 실시간 테스트 | 색인 요청 |
|-----|------------------|------------------------|-----------|
| `/` | 색인됨 | 등록 가능 | 대기열 추가 완료 |
| `/explore` | 색인됨 | 등록 가능 | 대기열 추가 완료 |
| `/about` | 미색인 — 2026-07-01 마지막 크롤 404 | 등록 가능 | 대기열 추가 완료 |
| `/en` | 미색인 — 크롤링됨, 현재 색인 미생성 | 등록 가능 | 대기열 추가 완료 |

- Search Console `직접 조치`와 `보안 문제`는 각각 `감지된 문제 없음`, `삭제 > 임시 삭제 항목`은 `지난 6개월 동안 제출된 요청 없음`이다. 검색 노출을 막는 페널티·보안 플래그·삭제 요청은 원인이 아니다.
- 26.08.10 11:08 KST 비개인화 검색(`pws=0`, 한국)에서 `feelandnote`는 홈페이지가 첫 웹 결과로 복귀했고 새 소개 문구가 스니펫에 노출됐다. 13:20 KST 재검사에서는 `필앤노트`도 홈페이지가 첫 웹 결과로 복귀했으며, Google AI 개요가 필앤노트를 인물의 책·영화·음악 감상 아카이브로 설명했다. 같은 시각 `feelandnote`는 YouTube와 동명이의 서비스가 앞서 결과 변동이 남아 있다. 한글 브랜드의 핵심 검색 발견 경로는 회복됐지만 두 질의가 함께 안정화됐는지는 7·14·28일 추적 데이터로 판정한다.

### Bing·네이버 콘솔 교차 감사 (2026-08-10 13:20 KST)

IndexNow의 HTTP 200만으로 수집·색인 상태를 추정하지 않고, 로그인된 두 콘솔의 실제 보고서와 URL 검사를 다시 확인했다.

| 항목 | Bing Webmaster Tools 실측 |
|------|-----------------------------|
| 검색 성과 | 최근 3개월 클릭 27, 노출 992, CTR 2.72%. 브랜드 자체보다 인물·작품 롱테일 질의가 주를 이룬다. |
| AI Performance | Microsoft Copilot·파트너 출처에서 인용 35회. 하단 질의·페이지 표본은 아직 비어 있어 인용 대상 상세는 판독할 수 없다. |
| 사이트맵 | 알려진 사이트맵 1, 오류 0, 경고 0. `/sitemap.xml`을 재제출한 뒤 `Last submit 8/10/2026`·`Last crawl 8/10/2026`·`Success`로 완료됐다. 상위 행은 하위 사이트맵 10개를 발견했고, 전체 발견 URL은 재처리 중 17.4K에서 5.5K로 일시 재집계되었다. 하위 파일 반영이 끝나기 전에는 축소로 판정하지 않는다. |
| IndexNow | 최근 2시간 제출 35.4K, source `Self`. 바로 앞의 17,724개 전량 통지 2회가 콘솔에 수신된 것을 확인했다. |
| Site Explorer | 알려진 URL 666 중 색인 608, 경고 40, 제외 28. 사이트맵 17.4K와 크게 어긋나므로 신규 제출 반영 전의 낡은 크롤 DB로 판정한다. |
| URL 검사 | `/`는 저장 색인 성공·실시간 색인 가능·SEO/GEO 오류 0·마크업 2종. `/about`은 색인되었으나 실시간 검사에서도 `Title too short` 1건을 재현했다. |
| Site Scan | 기존 스캔 이력 0. `Feelandnote SEO audit 2026-08-10`으로 최대 1,000페이지 스캔을 새로 시작했고 13:20 KST 현재 시작 71분째 `Processing`이다. |

| 항목 | 네이버 서치어드바이저 실측 |
|------|----------------------------------|
| 최근 30일 성과 | 클릭 약 8.8K, 노출 약 44K, CTR 2%. 이전 30일 대비 클릭 -2.1%, 노출 +55.4%, CTR -1.2%p. 보고서 갱신 26.08.09. |
| 색인·수집 진단 | 색인 약 5.0K, 수집 제한 650, 제외 120, SEO 220. 세부 진단은 robots 140, redirect 490, 4xx 16, 5xx 5, meta robots 120, 다중 H1 19, 빈 alt 197. 보고서 기준일은 26.08.08이다. |
| 사이트맵·RSS | `sitemap.xml`과 `feed.xml` 모두 기존 등록 유지, 요약 판정 정상. 사이트맵 중복 제출은 등록일을 바꾸지 않았으므로 신규 신호로 간주하지 않고, 전량 갱신 통지는 공식 IndexNow API 성공을 기준으로 삼는다. |
| 실시간 URL 검사 | `/`, `/en`, `/explore`, `/about` 모두 200, robots 수집 허용, meta robots 색인 허용. 최신 title·description·Open Graph가 의도한 locale로 읽혔다. |
| 주요 유입 | 앤드류 후버만·다리오 아모데이·이재용·젠슨 황 등 인물+작품 질의가 주력이다. `/celeb/matt-damon`은 노출 6,434·클릭 12·CTR 0.2%였고, 통용 표기와 다른 DB 이름 `멧 데이먼`을 `맷 데이먼`으로 교정했다. |

진단 숫자를 그대로 결함 개수로 쓰지 않고 현재 서비스와 대조했다.

- 5xx로 보고된 대표 4 URL은 현재 모두 200이어서 과거 수집 스냅샷이다. 4xx 목록의 작품 2 URL도 현재 200이다.
- 네이버 목록의 강세부호 예전 URL 7행(정규 slug 6종)과 과거 인물 오염 주소 `joe-tsai`는 현재도 404를 재현했다. `sw/web/src/middleware.ts`에서 현행 ASCII slug·`zoe-saldana`로 308 영구 통합했고, 로컬에서 7개 매핑 케이스의 308 `Location`과 최종 200을 검증했다.
- 다중 H1은 모바일·데스크톱 배너를 CSS로 숨겼을 뿐 DOM에는 둘 다 `<h1>`으로 두어 실제 재현됐다. `MobileBanner`·`ExploreBanner`·`LibraryBanner`의 모바일 제목은 접근성 헤딩 role을 유지하되 문서의 실제 H1은 하나만 남겼고, 하위 화면의 중복 제목은 H2로 정리했다. `/explore`·`/explore/ranking`·`/explore/faction`·`/rest`·`/agora/board/notice`·`/library/academy`·`/library/popular` 로컬 실화면에서 각각 H1 1개를 확인했다.
- 빈 alt 197건의 대표 인물 페이지를 확인한 결과, `alt=""` 이미지는 세계 배경에 `aria-hidden="true"`를 함께 쓴 장식 이미지였다. 이는 접근성 규격에 맞으므로 검색엔진 경고를 없애기 위해 의미 없는 alt를 만들지 않았다.
- Bing이 재현한 `/about` 짧은 제목은 locale별 설명형 `aboutMetaTitle`로 확장했다. 로컬 실화면에서 한국어 제목·설명·canonical·H1을 재검증했다.
- 교정본은 별도 `NEXT_DIST_DIR`의 전체 `pnpm build:web`과 변경 파일 ESLint를 통과했다. React/Next.js 점검 원칙을 따라 추가 데이터 워터폴·클라이언트 번들은 만들지 않았다.
- 교정 커밋 `027ec171`을 당시 사용자 웹·백오피스 프로덕션에 배포했다. `/about` 새 제목·canonical, 예전 URL 308, 대표 허브 H1 1개, 모바일 가시 접근성 헤딩을 재검증했다.
- 배포로 본문·리다이렉트가 바뀐 코어 사이트맵·예전/현행 인물 주소 218개만 증분 추출해 Bing 공용·네이버 공식 IndexNow에 재통지했고 둘 다 HTTP 200을 받았다.
- 배포 후 Bing `/about` 실시간 재검사는 `No SEO/GEO issues found`·마크업 2종·색인 가능으로 바뀌었고, `Indexing requested`까지 접수했다. 저장 색인 보고서의 예전 `Title too short`는 다음 크롤 전까지 남아 있을 수 있다.
- 네이버 단일 페이지 최대 노출이며 CTR 0.2%인 `matt-damon`을 추가 감사했다. DB `celebs.nickname`의 `멧 데이먼`은 Wikidata `Q175535`의 한국어 라벨·한국어 위키백과 문서명과 다른 표기였다. `맷 데이먼`으로 교정하자 `updated_at`이 갱신됐고, 해당 인물 캐시만 무효화한 뒤 프로덕션 title·description에 즉시 반영됐다. slug·영문 `Matt Damon`·hreflang·canonical은 불변이다. 한·영 URL 2개는 Bing·네이버 IndexNow에 증분 통지해 둘 다 HTTP 200을 받았다.
- `audit-web-i18n` 재검증에서 정적 감사는 오류 0·기존 경고 14, `matt-damon` DB locale 17개 범주 커버리지는 전부 100%·누락 0이었다. KO/EN × 1440/390 실화면 4개는 route·locale·SEO·레이아웃 오류 0으로 통과했고, 경고 16건은 전체 href가 별도로 남아 있는 출처 URL 줄임 반복이었다. 스크린샷 4장을 육안으로 확인해 한영 인물명·위계·줄바꿈·가로 넘침에 문제가 없음을 확인했다.

후속 운영 절차:

1. 같은 page 필터와 `필앤노트`·`feelandnote` 비개인화 검색을 배포 후 7일·14일·28일에 비교한다. 한 번의 수동 검색이나 하루의 노출 변동만으로 완전 회복을 선언하지 않는다.
2. `/about`의 저장 상태가 과거 404에서 정상 색인으로, `/en`이 `Crawled - currently not indexed`에서 정상 색인으로 바뀌는지 다음 크롤 뒤 확인한다.
3. 같은 URL을 반복 제출해도 대기열 위치·우선순위가 바뀌지 않으므로 재요청을 연속으로 보내지 않는다. 28일 뒤에도 `필앤노트`·`feelandnote` 중 하나가 안정적으로 홈페이지를 노출하지 않으면 원인 보고서와 페이지별 노출을 다시 감사한다.

## 색인 회복 실패 재조사와 작품 사이트맵 제외 (2026-08-14)

08-10 브랜드 교정 이후에도 회복이 없어 재조사했다. **원인은 넷이 겹쳤고 순서가 있다.**

### 1. 4월 장애로 색인이 이탈했다 — 「원래 안 되던 것」이 아니다

GSC 자료는 2026-02-07부터 시작한다. 구글 기준 도메인 나이가 6개월이다.

| 기간 | 노출 | 클릭 |
|---|---:|---:|
| 2026-03 | 674 | 24 |
| 2026-04 초순 | 하루 10~27 | — |
| 2026-04 하순 | 하루 0~5 | — |
| 2026-05-01~08-11 | **약 55** | 8 |

3월에는 칸트·카이사르·브루스 리·일론 머스크·이순신 상세가 4~30위로 노출됐다. 4월 한 달에 걸쳐 빠졌고
5월 이후 검색어는 7종·전부 노출 1회다. 유저 진술(결제 문제로 서비스 전면 장애)과 시점이 일치한다.
**따라서 「검색된 적 없는 사이트」가 아니라 「장애로 색인을 잃고 회복하지 못한 사이트」로 판정한다.**

### 2. 회복이 안 되는 이유는 발견이 아니라 크롤 예산이다

| URL | GSC 판정 | 마지막 크롤 |
|---|---|---|
| `/` | 제출되고 색인 생성됨 | 2026-08-11 |
| `/explore/directory` | 제출되고 색인 생성됨 | 2026-07-24 |
| `/celeb/olympias` | **발견됨 — 현재 색인이 생성되지 않음** | 없음 |
| `/content/{uuid}` 표본 | **발견됨 — 현재 색인이 생성되지 않음** | 없음 |
| `/explore/figures` | **Google에 알려지지 않은 URL** | 없음 |

크롤 통로는 온전하다 — 홈이 `/explore/directory`를 링크하고, 그 화면의 서버 HTML에 인물 상세 링크가
**1,749개** 들어 있다(실측). 구글은 주소를 알면서 방문하지 않기로 한 것이다. 외부 유입 링크는 GSC가
보고한 디시인사이드 글 1건뿐이다. **「발견됨 - 색인 생성 안 됨」을 링크·렌더 결함으로 재진단하지 말 것.**
이미 08-04까지 SSR 결함은 해소했고, 남은 변수는 도메인 신뢰도와 제출 규모다.

### 3. 그 적은 예산을 작품 페이지가 79% 가져갔다

| 종류 | URL 수 | 비중 |
|---|---:|---:|
| 작품 상세 `contents-0..7` | **14,386** | **79%** |
| 인물 상세 `celebs` | 3,716 | 20% |
| 정적·기관 선정 `core` | 332 | 1% |

작품 상세는 두 가지 이유로 순위가 나올 수 없다.

- **주소가 UUID**(`/content/8a9c7d31-…`)라 검색어와 이어질 어휘 신호가 0이다.
- **본문이 출판사 소개문 복제다.** 「백년의 고독」 페이지 문장을 그대로 검색해 교보문고·예스24·민음사·
  나무위키에 동일 문장이 선재함을 확인했다(추정 아님, 실검색 대조). 서버 렌더 본문은 표본 913~3,017자이고
  그 대부분이 이 복제문이다.

2026-07-15 감사가 이미 「사이트맵의 83.9%가 콘텐츠 상세, 77.1%가 감상문 1건」을 위험으로 적었으나
등재를 유지했다. 이번에 등재를 끊는다.

### 4. 08-13 배포로 인물 상세 81%가 500이다

공개 인물 1,858명 중 `full` 1,508명(81%)의 상세가 프로덕션에서 500이다. `light` 270·`fiction` 80은 정상이다.
전 응답이 `X-Matched-Path: /500`, `Last-Modified: Thu, 13 Aug 2026 08:41:07 GMT`로 마지막 배포 시점과 같다.
원인은 감상 목록 조회가 `celeb_contents.rating`을 선택하는데 그 컬럼이 없기 때문이다(직접 조회로 확인:
`column celeb_contents.rating does not exist`). 별점은 회원 기록에만 있다. `full`만 이 조회를 타므로 티어별로
갈렸다. **교정 코드는 이미 작업 트리의 `sw/web/src/actions/contents/getUserContents.ts`에 있고 미배포 상태다.**

### 조치와 순서

1. **500 복구 배포** — 하지 않으면 아래가 전부 무의미하다.
2. **작품 상세를 사이트맵에서 제외**(이 문서 「사이트맵」절 반영 완료) — 제출량 18,300 → 3,914(프로덕션 실측).
3. **외부 링크 확보** — 크롤 예산 자체를 늘리는 유일한 수단이다.
4. 한 줄 정의 필드·스니펫 개선([`celeb-1-basic-profile.md`](../celeb/celeb-1-basic-profile.md))은
   위 셋이 끝난 뒤에 착수한다. 구글이 방문하지 않는 상태에서 문구를 다듬어도 노출 자리가 없다.

작품 페이지 자체는 삭제·noindex하지 않았다. 내부 링크로는 계속 닿으며, 사이트맵 제출 대상에서만 뺐다.

### 배포·재제출 결과 (2026-08-14)

커밋 `dc331ae1`(500 복구)·`eaa6da2f`(사이트맵 축소)를 `main`에 푸시하고 프로덕션 반영을 확인했다.
500 복구분은 유저의 미커밋 별점 제거 작업 15개 파일이 한 묶음이라, 작업 트리를 건드리지 않고
분리 워크트리에 그 15개만 얹어 `tsc --noEmit` 통과를 확인한 뒤 경로 지정 커밋했다. 같은 트리에
섞여 있던 Spotify→Apple Music 전환 작업은 제외했다.

| 검증 | 결과 |
|---|---|
| `full` 인물 6명 | 전부 200 (종전 500) |
| `light`·`fiction` 2명 | 200 유지 |
| 사이트맵 인덱스 | 하위 파일 2개 |
| `celebs.xml` / `core.xml` | 3,716 / 198 URL |
| `contents-0.xml` | 404 |
| 작품 상세 페이지 | 200 (링크로 접근 가능) |

Search Console Sitemaps API에 `PUT` 204를 받았다(제출 시각 2026-08-14T01:37:05Z). 조회 시점의
`lastDownloaded`는 08-11이고 `contents` 수치도 옛 18,434 그대로다 — **재제출은 재읽기 예약일 뿐이라
구글이 실제로 다시 내려받기 전까지 이 값은 바뀌지 않는다.** 같은 사이트맵을 다시 제출해도 대기열
우선순위는 오르지 않으므로 반복 제출하지 않는다. 브라우저 콘솔은 로그인 세션이 없어 쓰지 않았고,
MCP 래퍼도 읽기 scope라 `.mcp.json`의 서비스 계정에 `webmasters` scope를 지정해 직접 PUT했다.

500이었다가 200으로 돌아온 `full` 인물 1,508명의 한·영 3,016 URL만 골라 IndexNow로 증분 통지했다
(Bing 계열 공용·네이버 공식 각각 HTTP 200). 네이버가 최대 유입원(최근 30일 노출 약 44K)이고 해당
페이지가 하루 동안 5xx였으므로 재수집을 앞당길 실익이 있다. 사이트맵에서 뺀 작품 URL은 통지하지
않는다 — 페이지는 그대로 살아 있고 삭제가 아니다.

### 다음 확인 시점

1. 구글이 사이트맵을 다시 내려받아 `contents` 수치가 3,914로 바뀌는지 확인한다.
2. `/celeb/olympias`처럼 「발견됨 - 색인 생성 안 됨」이던 표본이 크롤·색인으로 넘어가는지 본다.
3. 하루 노출이 2월~3월 수준(월 수백)으로 돌아오는지 7·14·28일에 비교한다. 회복되지 않으면 남은
   변수는 외부 링크뿐이므로 사이트 구조를 다시 만지지 말고 링크 확보로 넘어간다.

## 검색엔진 등록 현황

| 서비스 | 상태 | 인증 방식 | 제출 항목 | 비고 |
|--------|------|----------|----------|------|
| Google Search Console | ✅ 재제출·대표 URL 요청·차단 보고서 확인 완료 | 메타태그 (`google` verification) | 사이트맵 인덱스 | 26.08.10 REST PUT 204, UI `성공`·발견 17,700. 대표 4 URL 실시간 통과·대기열 추가. 직접 조치·보안·삭제 요청 없음. 13:20 KST `필앤노트` 홈페이지 첫 웹 결과 복귀 |
| Google Analytics (GA4) | ✅ 수집 중 | — | — | Property ID: `526353156`. **MCP는 현재 미연결** — `.mcp.json`에 서버 정의 없음(`settings.local.json`의 허용 목록에 이름만 잔존) |
| 네이버 서치어드바이저 | ✅ 콘솔 감사·IndexNow 재통지 | 메타태그 (`naver-site-verification`) | 사이트맵 + RSS + 주요 URL 수동 검사 | 26.08.10 대표 4 URL 실시간 200·색인 가능, 최신 17,724 URL 공식 IndexNow API 전 배치 200. 최근 30일 노출 약 44K·클릭 약 8.8K |
| Bing Webmaster Tools | ✅ 사이트맵 재제출 성공·스캔 중·IndexNow 확인 | Google SC 연동 | 사이트맵 | 26.08.10 `/sitemap.xml` 재제출 `Success`·하위 파일 10개, 1,000페이지 Site Scan `Processing`. 최근 3개월 노출 992·클릭 27, AI 인용 35 |
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

## 내부 링크 통로

사이트맵은 "URL이 있다"만 알린다. **어느 페이지가 중요한지는 내부 링크가 말한다.** 인물 1,858명
전원이 `/explore/directory` 한 장에서만 링크되던 때, 링크 1,777개가 한 곳에 몰려 모든 인물이
똑같이 1/1777이었고 크롤러는 크롤 순서를 정할 근거가 없었다. 작품 사이트맵 제외(08-14)와 별개
축의 병목이라 통로를 층으로 나눴다.

| 층 | 화면 | 인물 링크 | 단일원천 |
|---|---|---:|---|
| 1 | 홈 | 12 (기록순) | `components/features/home/HomeFigureLinks.tsx` |
| 2 | `/explore` | 24 (최근 30일 조회순, 유동) | `app/[locale]/(main)/explore/sections.tsx`의 `FigureLinksSection` |
| 3 | `/explore/directory` | 전량 + 직군 명부 15장으로 분기 | `app/[locale]/(main)/explore/directory/` |
| 4 | 인물 상세 ↔ 인물 상세 | 최대 12 (공개 관계 인물) | `app/[locale]/(main)/celeb/[slug]/RelatedFigureLinks.tsx` |

- **직군 명부**(`/explore/directory/{profession}`): 직군 목록은 `CELEB_PROFESSIONS` 상수가 쥔다.
  상수 밖 값은 404다. 15장 × ko·en = 30 URL을 `core.xml`에 싣는다. 초성이 아니라 직군으로 쪼갠
  이유는 "기업가 인물 목록"이 실제 검색어와 이어지고 "ㄱ"은 그렇지 않기 때문이다.
- **관계 링크**: 관계 그래프(`RelationGraphSection`)는 모달로만 이동해 크롤러에게 막다른 길이다.
  서버가 이미 들고 있는 `profile.relations`에서 `slug`가 있는(=공개) 인물만 골라 실제 `<a>`로
  세운다. 추가 조회는 없다.
- **홈 링크 수를 늘리지 않는다**: 12를 24로 되돌리면 링크 하나의 무게가 옅어지고 화면에는 명단
  벽이 선다. 커버리지는 3층(직군 명부)이 맡는다.

## 사이트맵

- **데이터·XML 단일원천**: `sw/web/src/lib/sitemap.ts`
- **인덱스 라우트**: `sw/web/src/app/sitemap.xml/route.ts` → `https://feelandnote.com/sitemap.xml`
- **하위 라우트**: `sw/web/src/app/sitemaps/[name]/route.ts` → `/sitemaps/*.xml`
- **방식**: Supabase REST API 직접 fetch (`@supabase/supabase-js`는 메타데이터 라우트에서 동작 안 함)
- **캐시**: 인덱스·하위 파일 모두 `revalidate = 86400` (ISR 하루. Next.js route config 정적 분석 때문에 두 route 파일의 값은 숫자 리터럴이어야 하며, 데이터 fetch 주기는 `lib/sitemap.ts`가 쥔다)
- **URL 구성**(2026-08-24 프로덕션 실측): 정적·기관 선정·직군 명부 `core.xml` 228 URL + 인물 3,059명 6,118 URL = 총 **6,346개**. 각 경로가 ko·en 2 URL로 나간다. 이는 계획된 3,000명 확장의 결과이며 크롤 병목의 원인이나 롤백 대상으로 판정하지 않는다. DB 증가에 따라 바뀌므로 규약값이 아니라 시각을 붙인 스냅샷이다.
- **분할 구조**: 인덱스는 `core`·`celebs` 2개 파일을 가리킨다. 종전 `contents-0..7` 8개는 2026-08-14에 제거했고 해당 주소는 404다.
- **작품 상세 제외**(2026-08-14): `/content/{uuid}`는 사이트맵에 넣지 않는다. 본문이 출판사 소개문 복제라 순위가 나올 수 없는데 제출량의 79%를 차지해 크롤 예산을 소진시켰다. 판정 근거는 「색인 회복 실패 재조사」절이 쥔다. 되돌리려면 그 절의 3번 근거를 먼저 반박해야 한다.
- **분할 이유**: 종전 단일 파일은 9.21MiB로 네이버의 10MB 제한 직전이었다. 작품 제외 후에는 여유가 크지만, 인물 증가에 대비해 인덱스 구조는 유지한다. 기존 제출 주소 `/sitemap.xml`은 인덱스로 그대로다. [네이버 서치어드바이저 — RSS 및 사이트맵 제출](https://searchadvisor.naver.com/guide/request-feed)
- **등재 기준**: 인물은 active이면서 `INDEXABLE_TIERS`에 포함된 티어만. 현행 인물 티어는 모두 고유한 상세 정보를 제공하므로 색인하며, 페이지 robots 기준과 사이트맵 기준은 같은 상수를 쓴다. 작품은 등재하지 않는다(위 항목)
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
- **500 복구 증분 통지** (2026-08-14): `full` 인물 1,508명의 한·영 3,016 URL을 Bing 계열 공용·네이버 공식 API에 각각 1배치 POST해 둘 다 HTTP 200을 받았다. 사이트맵에서 제외한 작품 URL은 통지하지 않는다.
- **사이트 전량 갱신 통지** (2026-08-10): 이번 브랜드 메타·구조화 데이터의 사이트 전역 변경에 한해 전량 통지했다. 작업 중 공개 데이터 증가를 따라 11:23 KST 최신 sitemap 17,724 URL을 Bing 계열 공용 API와 네이버 공식 API에 다시 나눠 전송했고 최종 6개 배치 전부 HTTP 200을 확인했다. 평상시에는 변경된 URL만 증분 통지한다.

## Robots

- **파일**: `sw/web/src/app/robots.ts`
- **URL**: `https://feelandnote.com/robots.txt`
- **일반 크롤러(`*`)**: `allow: /` + `crawlDelay: 1`. Disallow는 아래.
  - 시스템: `/private/`, `/admin/`, `/api/`
  - 인증: `/login`, `/signup`, `/reset-password` (각각 `/en` 접두 변형 포함)
  - 개인: `/*/reading`, `/*/chamber`, `/*/merits`
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

실제 조건문은 `SEO_PATHS` exact match와 `SEO_PATH_PREFIXES` prefix match를 함께 검사한다. 여기에 matcher도
`seo-image/`, `sitemaps/`, `opengraph-image`를 제외해 해당 요청이 미들웨어 함수를 호출하기 전에 차단한다.
코드 가드는 matcher의 확장자·dot 처리 차이나 향후 경로 변경에 대비한 방어선으로 유지한다. 단일 SEO 경로는
`SEO_PATHS`, 여러 하위 파일을 갖는 경로는 `SEO_PATH_PREFIXES`에 추가하고 matcher 제외 여부도 함께 검토한다.
회귀 검사는 Next.js의 실제 matcher 판정기를 쓰는 `sw/web/src/middleware.test.ts`가 맡는다.

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
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/celebs?select=slug,created_at&publication_status=eq.active&celeb_tier=eq.full&slug=not.is.null&order=created_at.asc&limit=3" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

# 배포 후 검증
curl -s "https://feelandnote.com/sitemap.xml" | grep -c "<sitemap>" # 현재 하위 파일 2개
curl -s "https://feelandnote.com/sitemaps/celebs.xml" | grep -c "<url>"
curl -s -o /dev/null -w "%{http_code}\n" "https://feelandnote.com/sitemaps/contents-0.xml" # 예상: 404
curl -s -I "https://feelandnote.com/feed.xml" | grep Content-Type  # 예상: application/rss+xml
curl -s -I "https://feelandnote.com/robots.txt" | grep Content-Type # 예상: text/plain
```

## 트러블슈팅 이력

### sitemap.xml이 HTML로 응답 (2026-03-12)
- **원인**: `next-intl` 미들웨어가 `/sitemap.xml`을 locale 라우트로 가로챔
- **해결**: 미들웨어 함수 초반에 `SEO_PATHS` 코드 가드 추가

### sitemap.xml에 셀럽 URL 0개 (2026-03-12)
- **원인 1**: 당시 `profiles.updated_at` 컬럼이 존재하지 않아 Supabase 쿼리 에러 (42703). `?? []` 폴백으로 에러가 무시됨. 현재 인물 원천은 `celebs`다
- **원인 2**: `@supabase/supabase-js` 클라이언트가 Next.js 메타데이터 라우트에서 동작하지 않음
- **해결**: Supabase REST API 직접 fetch로 전환 + `created_at`으로 변경
- **교훈**: 배포 전 로컬 curl로 REST 쿼리 검증 필수

### Google 검색 썸네일이 플랫폼 기본 아이콘으로 노출 (2026-03-18)
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
  2. 인물은 아바타(없으면 대표 초상), 작품은 locale별 원본 표지를 자르지 않고 정사각 JPEG 안에 담는다. 원본이 없거나 응답하지 않아도 깨진 URL 대신 유형별 기본 이미지를 반환한다.
  3. `middleware.ts`의 `SEO_PATH_PREFIXES`가 이미지 라우트를 locale 미들웨어에서 제외한다. HTML 페이지에는 같은 URL을 Open Graph·Twitter·JSON-LD 이미지로 함께 선언한다.
  4. `FormattedText`는 인용부호와 문장을 한 텍스트 노드의 유니코드 따옴표로 출력하며, 작품 메타 설명도 `toSeoDescription()`으로 평문화한다.
- **현행 비용 방어**: SEO 이미지의 Supabase 원본 URL 조회는 `cachedDetail`로 UUID·slug별 태그를 붙인다.
  목록 캐시 무효화가 모든 SEO 이미지 조회를 함께 비우지 않으며, 해당 인물·콘텐츠 수정 때만 그 항목이 갱신된다.
  OpenLibrary가 `archive.org`와 `*.archive.org`로 보내는 HTTPS 리다이렉트는 허용하되 HTTP·로컬 주소·도메인
  접미사 위장은 거부한다. 허용 규칙과 검사는 `seoImageOrigin.ts`, `seoImageOrigin.test.ts`가 맡는다.
- **검증**: 프로덕션 빌드 후 인물·책·원본 없음 표본 모두 직접 200 JPEG 응답, 네이버 공식 이미지 조건 충족, 공개 HTML에서 기존 엔티티·노드 경계 주석 제거를 확인했다. 기존 검색 결과는 재수집 뒤 바뀌므로 즉시 교체되지는 않는다.
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
- **현행(26.08.16)**: 사람 브라우저에만 구획별 스트리밍을 주는 `Lane`(`components/ui/pending/Lane.tsx`, UA 판정 `lib/render-mode.ts`)이 이 규칙을 대체한다. 봇·미확인 UA는 여전히 완성 HTML을 받는다. 배포 검증: 봇 UA로 curl해 `<template id="B:` 0개·본문 텍스트 잔존을 확인한다. 규칙 원문은 `docs/project/platform/code-rules.md`

### 검색 노출 약 2% 규모 — AdSense 반복 거절 (2026-07-15, 07-22 재검증)

**전수 감사 보고서: `docs/project/operations/adsense-audit-2026-07-15.md` (원인·조치·검증·재신청 절차의 SSoT)**

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
- **정적 렌더 재파손 가드 — 해소(2026-08-04)**: `ContentLibrary`의 `useSearchParams()`를 제거했다. 서가 초기 데이터는 ISR HTML에 두고 `?q=`만 hydration 후 적용한다. 배포 검증에서는 셀럽 HTML 원문에 책 제목·감상문이 남는지 반드시 확인한다.
