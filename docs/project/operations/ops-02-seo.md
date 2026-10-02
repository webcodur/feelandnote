# SEO

사이트맵·robots·메타데이터·구조화 데이터·검색엔진 등록과 색인 운영 규칙이다. Google 일일 색인 신청과 현재 도달점은 [Google 일일 색인 신청](../../continuous/google-indexing.md), URL별 검사·접수 결과는 [신청 데이터](../../../data/seo-index-inspection-20260909.json)가 쥔다. 검색 노출·색인의 날짜별 실측을 이 문서에 쌓지 않는다.

인물 상세의 감상 목록은 초기 본문과 같은 데이터·순서로 JSON-LD를 만든다. 후속 기록은 「감상 기록 전체 보기」에서 `/celeb/<slug>/records/<page>`로 연결한다. 각 쪽은 감상·출처와 이전·다음 링크를 HTML에 싣고, 한국어·영어마다 자기 canonical과 hreflang을 제공한다. 페이지 크기는 `recordsPageData.ts`의 `RECORDS_PAGE_SIZE`가 쥔다. [Google 크롤 가능한 링크](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) · [구조화 데이터 정책](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

## 브랜드·사이트명 단일원천

브랜드 표기 규약은 문서 문자열이 아니라 코드가 쥔다.

**워드마크는 한 단어 `feelandnote`다(26.09.11).** Google은 `Feel&Note`를 feel·note 두 토큰으로 자른다. 홈·인물·소개 페이지 가시 본문에 `feelandnote`가 0회였고, 같은 날 「feelandnote」 검색 1페이지에는 그 철자를 쓰는 YouTube 채널·네이버 블로그만 나오고 사이트는 없었다. 그래서 사이트명·워드마크·본문 표기를 YouTube 채널과 같은 `feelandnote`로 통일했다. `Feel&Note`·`Feel & Note`는 `alternateName`으로만 남기고 새 문구에 쓰지 않는다. 로고는 `feel`·`and`·`note` 세 span을 공백 없이 붙여 DOM 텍스트가 한 단어가 되게 한다. 홈이 이미 색인돼 있으므로 「feelandnote」 검색 반영 여부를 1~2주 뒤 확인한다.

같은 날 함께 반영한 조치 두 가지다. ① 미들웨어 matcher가 `.txt`·`.xml` 같은 확장자 경로를 건너뛰어 `/llms.txt`가 `locale="llms.txt"`로 레이아웃까지 와 홈 HTML을 200으로 돌려주던 소프트 404를 `[locale]/layout.tsx`의 locale 검증(`hasLocale` → `notFound`)으로 막았다. 루트 레이아웃이 던진 404는 Next 기본 404 셸로 나가며 상태 코드·noindex만 필요하므로 별도 루트 not-found를 두지 않는다. ② 홈의 오늘의 인물 구획을 `data-nosnippet`으로 감쌌다. `site:` 결과에서 홈 설명이 그날 인물의 소개문(프레디 머큐리)으로 나왔기 때문이며, 색인·순위와 무관한 미리보기 통제다.

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
3. 홈페이지는 설명형 절대 제목을 사용하고, 내부 페이지는 locale별 짧은 브랜드 접미사를 자동으로 붙인다. 개별 메시지에 같은 브랜드 접미사를 또 넣지 않는다. 인물 상세만 예외로 접미사 없이 절대 제목을 쓴다(아래 「인물 상세 메타데이터」).
4. 한국어 화면의 한글 표기, 영문 워드마크, 붙여쓰기 별칭 `feelandnote`가 같은 서비스임을 홈페이지 가시 텍스트와 `alternateName`으로 함께 밝힌다.
5. `meta keywords`는 Google 색인·순위 신호가 아니다. 메시지에 남은 keywords 배열을 브랜드 회복 수단으로 간주하지 않는다.

## 인물 상세 메타데이터

인물 상세의 제목과 설명은 `sw/web/src/lib/celeb/meta.ts`가 만들고, 메타 태그 조립은
`celeb/[slug]/celebPageMetadata.ts`가 맡는다.

Google은 `<title>`이 길거나 틀에 박혀 있으면 화면에서 크게 보이는 문구로 제목을 바꿔 쓴다.
`headline`을 제목 앞에 두던 때 빌 게이츠 검색 결과 제목이 `headline`만 남고 이름이 빠졌다.
26.09.28 URL Inspection API로 보니 빌 게이츠의 마지막 크롤은 09-09로, 09-13 제목 교체 전 버전을 들고 있었다.
아래 규칙은 같은 날 커밋 `658a9cb6`로 운영 배포하고 `cached-html` 퍼지까지 마쳤다. 재수집 신청은 [Google 일일 색인 신청](../../continuous/google-indexing.md)이 쥔다.
그래서 제목은 이름을 앞쪽에 두고, 한국어는 쉼표로 여러 토막을 내지 않으며, 제목의 말이 화면 머리
(수식어·이름 h1·`headline`·건수 줄)에도 보이게 한다. [Google — Title links](https://developers.google.com/search/docs/appearance/title-link)

| 대상 | 제목 | 설명문 |
|---|---|---|
| 감상 기록이 있는 실존 `full` | `빌 게이츠(MS 설립)가 감상한 책 177권·음악 73곡·영상 13편`. 영어는 `Bill Gates (Microsoft Founder): 177 Books Read`. 분야는 건수 많은 순으로 제목 폭(한글 30자 어림) 안에 드는 만큼 싣는다. 합계 2건 이하는 `이름(수식어)의 책 감상 기록` | `이름, headline.` → 가장 많은 분야의 대표작 3개 → 전 분야 건수. 넘치면 나머지 분야 건수, 대표작 순으로 덜어 낸다 |
| `light`·`BOTH`·`FICTION`, 기록 없는 `full` | `이름, headline`. `headline`이 없으면 전승 인물은 `이름, 《원전》의 등장인물`, 그다음 `이름, title`, 이름만 | 인물 안내 첫 문장. 없으면 `이름, headline.` + bio 첫 문장(「…에 등장한다.」 같은 공통 첫 문장 제외) → 원전 속 행적·인물 관계, 실존 `light`는 실제 있는 영향력 평가·16축 스펙트럼·인물 관계만 |

- 감상 기록 제목에는 수식어(`title`)를 이름 뒤 괄호로 붙인다. 이름만으로는 누군지 모를 인물이 많아서다.
  수식어는 화면에서 이름 위에 얹는 딱지라 문장 속 꾸밈말로 두면 어색하거나(「MS 설립 빌 게이츠가」)
  뜻이 갈린다(「「레미제라블」 빅토르 위고가 감상한」). 조사는 괄호 앞 이름에 맞추고, 괄호는 동명이인도 가른다.
- `light`·전승 인물 제목은 `이름, headline`에서 끝낸다. 「~의 이야기」를 붙이면 headline이 「~의 X」로 끝나는
  373명은 「의」가 겹치고(「조조의 책사의 이야기」), 서술형으로 끝나는 96명은 문장이 깨진다(26.09.28 전수).
- 인물 상세 제목에는 브랜드 접미사를 붙이지 않는다(`celebPageMetadata.ts`의 `title.absolute`).
  검색 결과의 사이트 이름은 Google이 홈페이지의 `WebSite` 구조화 데이터·제목·헤딩으로 정하므로 인물 제목의
  접미사는 그 신호가 아니다. [Google — Site names](https://developers.google.com/search/docs/appearance/site-names)
  접미사 7자는 수식어와 건수에 쓴다. 03-26 전역 접미사 제거와 4월 노출 급락은 시기만 겹쳤고
  같은 기간 서비스 장애로 인한 빈 본문 재수집이 더 유력한 원인이다. 잃는 것은 「필앤노트 + 인물명」
  질의에서 제목이 브랜드와 맞지 않게 되는 점이다.
- 대표작은 `actions/celebs/getCelebSignatureWorks.ts`가 고른다. 다른 인물도 많이 감상한 작품
  (`contents.celeb_count`)부터 쓰며, 영문 화면은 영문 제목이 있는 작품만 쓴다.
- 전승 인물의 《원전》은 `rankSourceWork`가 고른다. 위키데이터에 잡힌 작품, 원제·원저자가 기록된 번역본, 그 밖의 책,
  다시 쓴 책(retelling)·ISBN으로만 식별되는 요즘 책 순이다. 목록 차례만 보던 때 제우스의 원전이 《일리아스》가 아닌 책으로 나갔다.
- 영어 제목은 `Name: headline`이 64자를 넘으면 `Name: title`로 줄인다(`EN_TITLE_MAX_CHARS`). 검색 결과 한 줄에 64자는 들고 76자는 잘렸다.
- 인용문과 모든 인물에 똑같이 붙는 안내 문구(「한 페이지에서 살펴보세요」 등)는 설명문에 넣지 않는다.
- 영문 화면에서 한국어로 대체된 인물 안내·bio는 설명문에 싣지 않는다(`translationFallbacks`).
- 화면 머리의 건수 줄은 `full` 인물에만 `HeroIdentity.tsx`가 그리고, 문구는 제목과 같은
  `formatCelebRecordCounts`를 쓴다.

구조화 데이터는 모두 `Person`을 중심 엔터티로 유지한다. `full`의 공개 감상 기록만
`ItemList`로 연결하고, `fiction`의 원전·등장 작품은 `CreativeWork.character`로 인물과 잇는다.
픽션 프로필의 서사 기준 연도와 배경 국가는 실제 생몰일·국적이 아니므로 해당 값을
구조화 데이터에 선언하지 않는다. canonical·hreflang·Open Graph·Twitter 문구도 같은
티어별 제목과 설명을 공유한다.

## 인물 상세 밖 페이지 메타데이터

26.09.28 `core.xml` 356 URL을 Googlebot UA로 전수 감사하고 아래 규칙으로 고쳤다.

- **메타데이터는 `<head>`에 있어야 한다.** Next.js는 `htmlLimitedBots`에 든 봇에만 메타데이터를 기다려
  `<head>`에 싣고, 나머지는 해석이 늦으면 본문 뒤쪽으로 스트리밍한다. 기본 명단은 JS를 실행한다는 이유로
  Googlebot을 뺀다. 감사 때 기관 선정 약 70쪽의 title·description·canonical이 `<head>`에 없었다(재요청 때는
  있었다 — 캐시가 식은 요청에서만 난다). Google은 `<head>` 밖의 rel=canonical을 무시하므로 `next.config.ts`가
  `Googlebot`을 Next 기본 정규식 앞에 이어 붙인다. 이 설정은 기본 명단을 대체하므로 기본 정규식을 빼지 않는다.
  [Google — rel=canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- **기관 선정** — 기관 상세 제목은 `기관명: 목록1, 목록2 외 N개`(`lib/library/curatedMeta.ts`, 접미사를 뺀 폭
  24). 기관명만 쓰던 제목(「CNN」)은 무엇이 있는 페이지인지 알리지 못했고, 실제 검색어는 목록 이름이다.
  목록 이름 앞의 기관명은 뗀다(「칸 영화제: 황금종려상」). 떼면 토막만 남는 이름(「여성문학상 수상작」→「수상작」,
  「Women's Prize for Fiction」→「for Fiction」)은 떼지 않고 기관명 머리도 두지 않는다(`curatedListSubject`).
  기관·목록 설명은 머리 문장 — 목록은 「누가 낸 무슨 목록, 수록작 N편·개·장」, 기관은 「이 기관의 선정 목록: …」 —
  뒤에 소개문 요약을 잇는다(`leadDescription`). 게임·음악 수상 목록의 소개문은 상 이름 없이 연도로 시작해
  소개문만으로는 무슨 상인지 몰랐다. 화면의 소개문은 고치지 않는다. 소개문 전문(170~690자) 대신
  `toSeoSummary`(`lib/seo.ts`)가 남은 폭 안에 드는 앞 문장까지만 싣는다.
  해마다 발표하는 수상 목록(`isAnnual`이고 기관 종류가 시상 기관·영화제, `isAwardHistoryList`)은 제목을
  `역대 {목록} 수상작 N개 · {기관}`로 쓴다 — 「GOTY 수상작」「황금종려상 수상작」이 실제 검색어다. 기관명을 붙여 폭 24를
  넘으면 기관명을 뗀다. 영어는 `{목록}: Every Winner`. 목록 이름 끝의 「수상작」「Winners」는 떼고 붙인다. 설명은
  「{기관} {목록} 역대 수상작.」 뒤에 「최근 수상작: 〈A〉, 〈B〉.」를 잇는다. 연도는 쓰지 않는다 — 시상식 해와 출시·개봉 해 중 무엇을
  기준으로 삼는지가 목록마다 다르다. 허브의 영화·게임·음악 화면은
  `metaTitleByMedia`와 실제 기관·목록 수로 만든 설명을, 2쪽부터는 제목 끝에 `· N쪽`을 붙인다(정본 규칙은
  「내부 링크 통로」의 기관 선정 허브).
- **작품 첫 화면은 베스트셀러다**(`/explore/works`). 검색 제목·설명은 기관 선정이 아니라 분야별 순위와 그 출처를
  말한다(`library.meta`). 불후의 명작은 「주제별 탐색」 카드 문구(`library.hub.classics*`)가 짧은 안내라
  검색용 문구를 따로 둔다(`library.popular.classicsMeta*`).
- **제목은 본문 + 사이트명 접미사 하나다.** 메시지에 `| 인물`·`| 작품` 같은 중간 구획을 넣지 않는다
  (「세력도감 | 인물 | 필앤노트」). 하위 화면이 허브 이름을 이어 쓰는 경우(`세력 · 세력도감`,
  `강좌 - 분야 | 학당`)가 있으므로 허브 `metaTitle`은 짧은 이름으로 두고, 허브 자체의 긴 제목은 따로 둔다
  (`explore.faction.hubMetaTitle`).
- **쿼리로 갈리는 주소는 제목·설명도 갈린다.** 분야별 챔피언 4개 주소는 `metaTitleByType`·
  `metaDescriptionByType`을 쓴다. 설명이 없는 페이지는 사이트 공통 설명을 물려받아 홈과 중복되므로
  (세력도감이 그랬다) 실제 섹션 이름과 규모로 설명을 만든다.
- **인원·건수를 문구에 박지 않는다.** 「1,000명 이상」은 실제 인원의 몇 분의 일이 된 채 남아 있었다.
  디렉토리처럼 화면이 이미 세는 값이 있으면 그 값을 넘기고, 없으면 숫자 없이 쓴다.
- 노출 용어는 [platform-02-code-rules.md](../platform/platform-02-code-rules.md) 「사용자 노출 용어」를 따른다(셀럽 → 인물,
  Celebrity → Figure). 한국어 조사가 붙는 이름은 `withParticle`을 쓴다(「빌 게이츠이」 교정).
- **공유 정보(og·twitter)의 제목·설명·주소는 레이아웃에 두지 않는다.** 레이아웃(`[locale]/layout.tsx`)은 대표 이미지·
  사이트명·로케일만 두고, 제목·설명은 Next가 각 페이지의 title·description으로 채운다. 레이아웃에 두면 자기
  openGraph가 없는 모든 페이지가 홈 제목·홈 주소로 공유됐다. 페이지는 제목·설명만 다시 적는 openGraph를 선언하지
  않는다 — 선언하면 레이아웃 값을 통째로 덮어 대표 이미지가 빠진다(26.09.29 탐색·신화·가상독백·작품·기록 목록).
  자기 그림이 있는 인물·작품 상세만 openGraph를 통째로 선언한다.
- **기관·목록 상세의 h1은 기관명·목록명이다.** 배너 이름은 클라이언트에서 채워져 서버 HTML에서 「기관 선정」으로
  굳으므로, 이 주소에서 배너는 제목 요소를 내려놓고(`BannerHeading asHeading`) 본문 머리가 h1이 된다.
- 한 페이지의 h1 여러 개는 검색 결함으로 보지 않는다. Google은 h1 개수를 문제 삼지 않는다고 밝혔다
  ([Search Engine Land, 2019 Mueller 답변](https://searchengineland.com/multiple-h1s-wont-get-in-the-way-of-your-seo-google-says-322909)).
  직군 명부의 배너 h1과 「지도자 인물」 h1이 그렇다. 탐색 배너 h1에 허브 이름이 섞여 「탐색 분야별 챔피언」으로
  읽히는 문제는 배너 머리(`BannerHeading`)가 경로 줄과 제목을 나누는 작업에서 다룬다.

## 설명문은 끝난 문장만 싣는다

검색 설명을 「…」로 자르지 않는다(26.09.29 유저 지시). 소개문을 줄일 때는 폭 안에 통째로 드는 앞 문장까지만 잇고,
첫 문장부터 넘치면 그 페이지의 머리 문장만 둔다. 작품 이름·인용 속 마침표와 「…」는 원문이므로 괄호·따옴표 안과
영어 약어(no.·Dr.·U.S.) 뒤에서는 문장을 끊지 않는다. 문장 나누기와 폭 어림은 `lib/seoSentences.ts`
(`splitSentences`·`summarizeSentences`·`appendWithinSnippet`)가 쥐고 인물 메타·`toSeoSummary`·신화·세력 메타가 함께 쓴다.
검색 결과 설명 두 줄은 한글 한 자를 1로 친 폭 84로 어림한다(`SNIPPET_WIDTH`). 기관 선정 설명은 종전대로 160자 안에서 줄인다.

설명은 백과사전 첫머리처럼 무엇인지와 누가 있는지만 말한다. 「봅니다」「모았습니다」「살펴보세요」처럼 페이지가 하는 일을
말하거나 권하는 문장은 넣지 않는다(26.09.29 유저 지시). 새로 쓰는 설명은 소개글과 같은 「-다」체로 맺는다. 명단·판본처럼
자주 바뀌는 수(인원·책 수)도 넣지 않는다 — 검색 결과는 다음 방문까지 옛 숫자를 보인다. 한 해에 한 번 바뀌는 수상 목록의
수상작 수는 제목에만 둔다.

## 신화·세력도감

26.09.29 전까지 신화 78편은 `/explore/myth` 한 주소를 정본으로 나눠 썼고, 세력 188개 주소는 사이트맵에도 서버 HTML의
링크에도 없었다. 「오디세이아 줄거리」로 찾아올 페이지가 없었던 것이다.

- **주소** — 신화는 `/explore/myth/<slug>`, 세력은 `/explore/faction/<slug>`가 정본이다. 옛 `/explore/myth?myth=<slug>`는
  미들웨어가 나머지 조건을 실은 채 308로 옮긴다. 화면 동작과 h1은 [탐색](../service/service-01-explore.md) 「신화 주소」가 쥔다.
- **제목** — 실제 검색어를 쓴다. 신화는 `{이름} 줄거리와 등장인물`(영어 `{Name}: Story and Characters`), 세력은
  `{이름}: {대표 2명} 등`, 이야기 속 세력은 `{이름} 등장인물: …`이다. 세력 이름과 같은 사람(「임꺽정」)은 제목에서 빼고,
  접미사를 뺀 폭 24를 넘으면 대표를 한 명으로, 그래도 넘치면 `{이름} 주요 인물`로 둔다. 첫 화면은 `hubMetaTitle`을 쓴다. 지역별 신화 페이지는 두지 않는다 — 「일본 신화」「그리스 신화」
  같은 기존 신화 한 편과 검색어가 겹친다.
- **설명** — `{한 줄 정의}.`로 연다(`faction_lv2.headline`, 규격은 [탐색](../service/service-01-explore.md) 「한 줄 정의」) — 이름은
  제목이 이미 말하므로 되풀이하지 않는다. 뒤는 「만나 보세요!」로 끝내는 초대 문장이다(266개 실데이터 검수 후 26.09.30 채택):
  그룹이 둘 이상이면 「그룹1, 그룹2, 그룹3 등으로 나뉜 인물들을」을 싣고, 그룹 이름이 이미 사람을 가리키면(들·진·사상가 꼬리 등)
  「…로 나눠 만나 보세요!」로 줄인다. 그룹이 없거나 하나뿐이면 제목·한 줄 정의가 부르지 않은 사람으로 「…도 만나 보세요!」를 잇고,
  부를 사람도 없으면 「{이름}의 인물들을 만나 보세요!」로 끝낸다. 영어는 같은 구조를 「Meet …!」로 옮긴다.
  한 줄 정의가 없으면 이름과 소개글의 끝난 문장으로 시작한다. 첫 화면 설명은 지역·분야 이름만 싣는다.
  조립은 `lib/atlasMeta.ts`가 쥔다.
- **통로** — 두 화면 아래 늘 펼친 전체 목록(`AtlasIndex`)과 인물 상세의 「소속 신화·세력」 링크(`RelatedFigureLinks`)가
  한 편 주소로 가는 서버 HTML 링크다. 선택기 창은 누른 뒤에만 그려져 통로가 아니다.
- **사이트맵** — 화면이 여는 것과 같은 조건(신화는 `published`, 세력은 `is_featured`, 숨기지 않은 인물 한 명 이상)만
  `core.xml`에 싣는다(`lib/sitemap.ts`의 `fetchAtlasPaths`).

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

### 답변 엔진이 인용하는 조건

검색 순위와 별개로 AI Overviews·AI Mode·ChatGPT·Perplexity가 문서를 인용할지는 아래가 가른다.
외부 관측을 정리한 것이므로 자사 실측으로 확인하기 전에는 가설로 다룬다.

| 조건 | 내용 | 현재 상태 |
|------|------|-----------|
| 서버 렌더 | AI 크롤러는 JavaScript를 실행하지 않는다. 클라이언트에서만 그리는 텍스트는 인용 후보가 아니다 | 충족. `/celeb/chey-tae-won` 실측에서 감상배경 전문·출처 URL·인물 안내가 서버 HTML 가시 텍스트 4,069자로 나온다 |
| 자기완결 | 앞뒤 맥락 없이 떼어도 말이 되는 단락 | 충족. 감상배경이 누가·언제·무엇을·출처를 한 단락에 담는다 |
| 직답 선행 | 구획 첫머리에 정의와 결론을 두고 근거를 뒤에 붙인다 | 인물 안내 집필은 [전용 규칙](../celeb/celeb-05-01-reading.md)을 따른다 |
| 신선도 | 오래 방치된 문서는 인용 후보에서 밀린다 | 인물 페이지는 정적이라 취약하다 |
| 출처 명시 | 구체 사실과 1차 출처를 단 문장이 인용된다 | 충족. 감상배경마다 출처 URL이 붙는다 |

영어권 연구가 제시하는 「최적 구절 134~167 단어」 같은 길이 기준은 옮기지 않는다. 한국어는 단어 수가
대응하지 않는다. 길이가 아니라 자기완결성으로 판단한다.

**브랜드 언급이 백링크보다 강한 신호다.** Ahrefs가 75,000개 브랜드를 본 조사에서 YouTube 언급이 AI 인용과
가장 강하게 상관했고 백링크 기반 도메인 지표는 약했다(3자 연구, 자사 미검증). 이 프로젝트는 이미 한국어
YouTube 채널로 서재탐방을 발행한다. 외부 신뢰도를 백링크로 쌓으려 하지 말고 영상과 인물
페이지가 서로를 가리키게 만드는 편이 빠르다. `Organization.sameAs`의 YouTube 연결이 그 통로다.

### AI 답변 노출의 통제 수단

AI 전용 opt-out 파일은 없다. AI Overviews·AI Mode 노출은 `noindex`·`nosnippet`·`data-nosnippet`·`max-snippet`
같은 표준 색인·미리보기 지시자가 함께 통제한다. 3자 AI 크롤러를 막는 `robots.ts`의 UA 차단과는 별개 축이다.
[Google Search Central — AI features](https://developers.google.com/search/docs/appearance/ai-features)

여기서 두 가지가 따라 나온다.

1. 작품 상세 noindex(08-25)는 검색과 AI 답변에서 동시에 뺀다. 다만 셀럽 감상 원문은 인물 상세에 그대로
   실리므로 인용 소재 자체가 사라지지는 않는다.
2. **게임용 창작 대사가 인용 가능한 상태다.** 인물 상세의 「고유 대사」는 실제 발언이 아니라 게임용
   창작물인데 서버 HTML 가시 텍스트로 나온다. 면책 문구가 같은 페이지에 있어도 단락만 떼어가면 함께
   가지 않고, 프로필 상단의 실제 인용구와 한 층에 섞여 있다. 창작 대사 블록을 `data-nosnippet`으로 감싸는
   것을 검토한다.

### 구조화 데이터 타입 판정

Google이 리치 결과를 거둬들인 타입을 새로 붙이지 않는다. 판정만 적고 실제 출력은 `sw/web/src/lib/seo.ts`와
각 페이지가 쥔다.

| 타입 | 판정 | 근거 |
|------|------|------|
| Book Actions | 붙이지 않는다 | 리치 결과에서 제거됐다. 도서 서비스라도 SERP 이득이 없다 |
| `FAQPage` | 새로 붙이지 않는다 | 2026-05-07 전체 사이트 대상 FAQ 리치 결과 폐지. 진짜 Q&A 페이지에는 `QAPage`를 쓴다 |
| `HowTo`·`SpecialAnnouncement`·`ClaimReview` | 붙이지 않는다 | 리치 결과 폐지 |
| `Person`·`WebSite`·`Organization`·`BreadcrumbList`·`ItemList`·`VideoObject` | 유지 | 현행 유효 |

JSON-LD는 서버 렌더 HTML에 싣는다. 클라이언트에서 주입하면 처리가 지연된다.

## 판정에서 굳은 원칙

과거 노출 붕괴·색인 실패 조사에서 확인해 규칙으로 남긴 것이다. 날짜별 실측과 경위는 커밋 이력에서 꺼낸다.

1. **색인 보존과 검색 노출을 구분한다.** 홈·허브가 「제출되고 색인 생성됨」이어도 일반 검색 후보에서 사실상 탈락할 수 있다. 색인이 남았다는 이유로 사용자 체감 문제를 축소하지 않는다. 회복 판정은 같은 page 필터와 비개인화 검색을 7·14·28일에 비교해 내린다. 한 번의 수동 검색이나 하루의 노출 변동으로 회복을 선언하지 않는다.
2. **크롤러가 받는 500은 색인 이탈이다.** 한 컬럼 오류로 `full` 인물 상세 81%가 500이 된 배포가 있었다. 배포 뒤에는 티어별(`full`·`light`·`BOTH`·`FICTION`) 인물 상세 표본의 200을 확인한다. 조회 시간 초과로 화면이 통째로 죽는 경우도 같다 — 필요한 대상 id만 넘겨 집계한다.
3. **접힌 링크는 없는 링크다.** 아코디언·모달 뒤의 목록과 `onClick` 상태 전환 탭은 크롤러가 받는 HTML에 링크로 남지 않는다. 항상 그려지는 카드와 `<Link href>`를 쓴다. 규칙은 「내부 링크 통로」가 쥔다.
4. **작품 상세 `/content/[id]`는 전량 `noindex, follow`이고 사이트맵에서 뺀다.** 본문 대부분이 서점·출판사에 선재하는 소개문이고 주소가 UUID라 작품명 질의 유입이 0이었으며, 오히려 브랜드+인물 질의에서 인물 페이지 자리를 잠식했다. 페이지는 열려 있고 내부 링크로 닿는다.
5. **사이트맵 크기는 처방이 아니다.** 제출 URL을 늘렸을 때도 줄였을 때도 색인은 움직이지 않았다. 크기 조정을 반복해 제안하지 않는다. 다만 공개 범위를 넓히면 `INDEXABLE_TIERS`를 통해 색인 기준도 딸려 넓어진다는 것을 결정 때 의식한다.
6. **사이트맵 등재 기준과 `noindex` 기준은 일치시킨다.** 등재해 놓고 색인을 거부하면 모순 신호다. 「감상문 1건 이상」이 곧 색인할 가치를 뜻하지는 않는다.
7. **구글 전용 noindex로 인물 페이지를 거르지 않는다.** 구글이 방문하지 않은 페이지를 막아도 평가 재료가 바뀌지 않고, 오래 둔 noindex는 재방문을 줄여 신뢰가 오른 뒤 넓힐 자리를 스스로 닫는다. 감상 기록 수는 인물 페이지 가치 기준이 아니다(신화·전설 인물은 인물 분석이 본체다).
8. **제출·통지는 수신일 뿐이다.** 사이트맵 재제출은 재읽기 예약이고, 같은 URL을 반복 제출해도 대기열 우선순위는 오르지 않는다. IndexNow HTTP 200도 색인 보장이 아니다. 접수·재읽기·재크롤·색인·노출을 구분해 보고한다.
9. **외부 통로는 소속을 밝힌다.** 네이버 블로그(책)·티스토리(영화)는 검색 결과 자리를 차지해 사람을 사이트로 보내는 통로다. 소속 공개가 저가치 대량 콘텐츠의 면제 조건은 아니다([Google 스팸 정책](https://developers.google.com/search/docs/essentials/spam-policies)). 운영은 [`blog-naver-book.md`](../../continuous/blog-naver-book.md)·[`blog-tistory-cinema.md`](../../continuous/blog-tistory-cinema.md)가 쥔다. 블로그가 감상 배경 원문을 일부 옮겨 싣는 것은 중단 사유가 아니다.
10. **수동 조치·보안 문제는 API로 못 읽는다.** Search Console 화면으로 확인하며, 「감지된 문제 없음」은 자동 시스템 평가까지 배제하는 근거가 아니다. 화면을 열기 위해 도메인 속성(`sc-domain:feelandnote.com`, DNS 확인)과 URL 접두어 속성(`https://feelandnote.com/`, 메타태그 확인)을 함께 유지한다.
11. **H1은 문서에 하나다.** 모바일·데스크톱 배너를 CSS로 숨기더라도 둘 다 `<h1>`이면 다중 H1이다. 모바일 제목은 접근성 헤딩 role로 둔다. `aria-hidden` 장식 이미지의 `alt=""`는 정상이며 경고를 없애려 의미 없는 alt를 만들지 않는다.
12. **옛 주소는 308로 통합한다.** 강세부호가 든 옛 slug·오염된 인물 주소는 `sw/web/src/middleware.ts`에서 현행 ASCII slug로 영구 이동한다.
13. **표기가 검색어와 다르면 DB 이름을 고친다.** 통용 표기와 다른 `celebs.nickname`(예: `멧 데이먼`)은 Wikidata 한국어 라벨·한국어 위키백과 문서명과 대조해 교정한다. slug·영문명·canonical은 그대로 둔다.

## 재발 방지 — 렌더와 메타 파일

- **핵심 본문은 서버에서 생성한다.** Google과 네이버 모두 JavaScript 렌더링을 지원하므로 스켈레톤 자체를 색인 실패의 원인으로 일반화하지 않는다. `Lane`·`Suspense`는 서버 본문을 스트리밍하고, 봇에는 `lib/render-mode.ts`가 완성 본문을 선택한다. `next.config.ts`의 `htmlLimitedBots`는 Googlebot·Yeti의 메타데이터를 기다리게 한다. 인물 상세의 Cloudflare HTML 캐시는 일반 브라우저 요청만 저장해 봇의 head 메타데이터가 사람용 스트림과 섞이지 않게 한다. 핵심 본문을 `useEffect` 조회에만 의존시키지 않는다. 배포 검증은 봇 UA의 최종 HTML에서 제목·본문·실제 링크·JSON-LD와 미완성 경계가 없는지를 함께 확인한다. 규칙 원문은 [`platform-02-code-rules.md`](../platform/platform-02-code-rules.md), 검색엔진 동작은 [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)·[네이버 JavaScript 가이드](https://searchadvisor.naver.com/guide/seo-advanced-javascript)가 설명한다.
- **새 메타데이터 규약 파일은 미들웨어 제외에 넣는다.** `next-intl` 미들웨어가 `/sitemap.xml`·`/opengraph-image` 같은 확장자 없는 경로를 locale 라우트로 가로챈다(「미들웨어 SEO 경로 제외」). 아이콘은 `public/icon.png`(192×192, 48px 배수)·`public/apple-icon.png` 정적 파일이다.
- **검색 결과 대표 이미지는 자체 도메인 라우트로 준다.** 인물·작품 메타는 `/seo-image/celeb/[slug]`·`/seo-image/content/[contentId]`를 Open Graph·Twitter·JSON-LD에 함께 선언한다. 정사각 JPEG에 자르지 않고 담으며 원본이 없어도 기본 이미지를 돌려준다. 규격·허용 호스트는 `sw/web/src/lib/seoImage.ts`·`seoImageOrigin.ts`가 쥔다.
- **인용부호는 한 텍스트 노드의 유니코드 따옴표로 출력한다.** 여러 React 텍스트 노드로 쪼개면 SSR 엔티티와 노드 경계 주석이 검색 스니펫에 평문으로 샌다(`FormattedText`, 메타 설명은 `normalizeSeoText()`).
- **메타 문구에 locale을 빠뜨리지 않는다.** 영문 페이지 제목에 한국어 직업명이 섞였던 적이 있다(`getCelebProfessionLabel`에 locale 전달).
- **`?? []` 폴백으로 조회 오류를 삼키지 않는다.** 없는 컬럼 오류가 빈 사이트맵으로 조용히 나간 적이 있다. 배포 전 REST 쿼리를 로컬에서 실제로 호출해 본다.

## 검색엔진 등록 현황

| 서비스 | 상태 | 인증 방식 | 제출 항목 | 비고 |
|--------|------|----------|----------|------|
| Google Search Console | 등록됨 | 메타태그 (`google` verification) | 사이트맵 인덱스·URL 검사 | 도메인 속성과 URL 접두어 속성을 유지한다. 접수·재수집의 현재 도달점은 [색인 신청](../../continuous/google-indexing.md)이 쥔다 |
| Google Analytics (GA4) | ✅ 수집 중 | — | — | Property ID: `526353156`. **MCP는 현재 미연결** — `.mcp.json`에 서버 정의 없음(`settings.local.json`의 허용 목록에 이름만 잔존) |
| 네이버 서치어드바이저 | 등록됨 | 메타태그 (`naver-site-verification`) | 사이트맵 + RSS + 웹 페이지 수집 | 기존 사이트맵을 유지하고 변경된 주요 주소를 수집 요청한다 |
| Bing Webmaster Tools | 등록됨 | 기존 확인된 사이트 속성 | 사이트맵·URL 검사 | 기존 사이트에서 사이트맵 `Re-submit`과 URL `Request indexing`을 사용한다 |
| Daum 검색등록 | ✅ 제출 | 신규등록 폼 | URL + 사이트 설명 | 2026-03-12 |

### 주소 개편 후 검색 등록

작품의 정본 경로는 `/explore/works`다. 옛 주소의 308 이전과 모드별 진입점은 [작품 화면](../service/service-02-library.md)이 쥔다. 배포 뒤 실제 HTML의 canonical·hreflang, 옛 주소의 목적지·검색 조건 보존, `core.xml`의 새 주소, robots 접근 허용을 함께 확인한다.

제출 주소는 기존 `https://feelandnote.com/sitemap.xml`을 유지한다. 구글·빙에서는 등록된 사이트맵을 재제출할 수 있으며, 네이버는 같은 주소의 사이트맵을 삭제·재등록할 필요 없이 주요 새 주소를 「웹 페이지 수집」에 넣는다. 네이버 입력란에는 경로만 넣지 말고 `https://feelandnote.com/...` 전체 주소를 쓴다. [네이버 사이트맵 안내](https://searchadvisor.naver.com/guide/request-feed)

작품 탐색 첫 화면(베스트셀러, `/explore/works`)·불후의 명작·기관 선정은 각각 별도 주소이며, 구글·빙의 개별 요청에는 한국어와 영문 주소를 사용한다. 제출 접수, 사이트맵 재읽기, URL 재크롤, 색인·검색 노출을 구분한다. 같은 URL을 반복 제출해 처리 순서를 당기려 하지 않는다. [Google 재크롤 요청 안내](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)

### 인증 메타태그 위치

`sw/web/src/app/[locale]/layout.tsx` → `generateMetadata()` → `verification`:
```ts
verification: {
  google: [
    "Rstp-6NcSTn3BTPnDH06HS5PN2goDih-CVNg",        // 도메인 속성 sc-domain:feelandnote.com
    "T7ZylbeabtPvV55la720kqhWakxGDQDgh6MJ3k4q6ms", // URL 접두어 속성 https://feelandnote.com/
  ],
  other: {
    "naver-site-verification": "693d325afc4dad4701aa2c7c4a29c78f2ee7e445",
  },
},
```

두 개를 다 유지한다. 하나를 지우면 그 속성의 소유권 확인이 풀린다. 왜 둘인지는
「판정에서 굳은 원칙」 10이 쥔다.

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
- **기관 선정 허브**(`/explore/works/curated`): 작품 첫 화면(`/explore/works`, 베스트셀러)의 「주제별 탐색」
  카드에서 한 층 아래로 들어간다. 격자는 선정 목록 카드(`CuratedListCard`)이고, 카드마다 목록 상세와 기관 상세
  주소가 실제 `<a>`로 HTML에 실린다(링크 안에 링크를 넣지 않는다). 한 쪽에 12개라 나머지 목록은 쪽 링크와
  매체 칩(`?media=`) 링크 뒤에 있다. 그래서 **매체(도서 밖)·쪽 주소는 자기 주소를 정본으로 둔다** — 1쪽으로
  모으면 2쪽부터의 목록 링크가 정본이 아닌 화면에만 남는다. 검색·국가·주제·기관 조건은 그 매체의 첫 쪽으로
  모은다. 규칙은 `lib/library/curatedMeta.ts`의 `resolveCuratedHubMeta`가 쥔다.
  [Google — 쪽 나눔](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)
  모든 기관·목록 주소는 `core.xml`에도 있다. 클릭 뒤에 생기는 모달의 링크만으로 검색 접근이 보장된다고
  판정하지 않는다.
- **카테고리 탭도 링크여야 한다**: 탭이 `onClick` 상태 전환이면 선택된 탭의 내용만 HTML에 실린다.
  `<Link href>`로 세우고 `onClick`에서 `preventDefault` 하면 사용자 경험은 그대로면서 나머지 탭이
  크롤러에 보인다(`components/ui/CategoryTabFilter.tsx`). **접힌 것은 없는 것이다** — 아코디언·모달·탭·
  「더 보기」 뒤에 링크를 두면 색인에서 사라진다.
- **신화·세력 주소**로 가는 전체 목록과 인물 상세의 소속 링크는 「신화·세력도감」 절이 쥔다.
- **홈 링크 수를 늘리지 않는다**: 12를 24로 되돌리면 링크 하나의 무게가 옅어지고 화면에는 명단
  벽이 선다. 커버리지는 3층(직군 명부)이 맡는다.

## 사이트맵

- **데이터·XML 단일원천**: `sw/web/src/lib/sitemap.ts`
- **인덱스 라우트**: `sw/web/src/app/sitemap.xml/route.ts` → `https://feelandnote.com/sitemap.xml`
- **하위 라우트**: `sw/web/src/app/sitemaps/[name]/route.ts` → `/sitemaps/*.xml`
- **방식**: PostgREST API 직접 fetch(DB SDK는 메타데이터 라우트에서 동작하지 않았음)
- **캐시**: 인덱스·하위 파일 모두 `revalidate = 86400` (ISR 하루. Next.js route config 정적 분석 때문에 두 route 파일의 값은 숫자 리터럴이어야 하며, 데이터 fetch 주기는 `lib/sitemap.ts`가 쥔다)
- **URL 구성**: 정적 탐색·기관 선정·직군 명부·신화·세력 한 편 주소는 `core.xml`, 공개 인물 상세는 `celebs.xml`에 담는다. 각 경로가 ko·en 2 URL로 나가며 현재 건수는 XML에서 확인한다. 작품 첫 화면(베스트셀러, `/explore/works`)·불후의 명작(`?mode=classics`)·기관 선정은 `core.xml`에 따로 등재한다. 옛 베스트셀러 주소 `/explore/works/popular`(`mode` 없음)는 `/explore/works`로 영구 이동하므로 싣지 않는다. 베스트셀러의 분야(`?category=`)는 외부 차트를 옮겨 보여 주는 화면이라 정본을 `/explore/works` 하나로 모은다.
- **분할 구조**: 인덱스는 `core`·`celebs` 2개 파일을 가리킨다. 종전 `contents-0..7` 8개는 2026-08-14에 제거했고 해당 주소는 404다.
- **작품 상세 제외**(2026-08-14): `/content/{uuid}`는 사이트맵에 넣지 않는다. 당시 본문 복제 문제가 확인됐고 제출 URL의 79%를 차지했다. 실제 크롤 예산 소진 비중은 측정하지 않았다. 판정 근거는 「색인 회복 실패 재조사」절이 쥔다. 되돌리려면 그 절의 3번 근거를 먼저 반박해야 한다. 2026-08-25부터 작품 상세는 페이지 자체도 `noindex`다(아래 「네이버 실측과 작품 상세 noindex 전환」).
- **분할 이유**: 종전 단일 파일은 9.21MiB로 네이버의 10MB 제한 직전이었다. 작품 제외 후에는 여유가 크지만, 인물 증가에 대비해 인덱스 구조는 유지한다. 기존 제출 주소 `/sitemap.xml`은 인덱스로 그대로다. [네이버 서치어드바이저 — RSS 및 사이트맵 제출](https://searchadvisor.naver.com/guide/request-feed)
- **등재 기준**: 인물은 active이면서 `INDEXABLE_TIERS`에 포함된 티어만. 현행 인물 티어는 모두 고유한 상세 정보를 제공하므로 색인하며, 페이지 robots 기준과 사이트맵 기준은 같은 상수를 쓴다. 작품은 등재하지 않는다(위 항목)
- **리다이렉트 스텁 제외**: `/explore/celebs`·`people`·`figure`·`celeb-feed`·`top-by-type`, `/agora` 미등재
- **페이지네이션**: PostgREST 기본 제한 1,000행 → 1,000행씩 반복 fetch
- **hreflang**: ko, en, x-default. 페이지 HTML은 각 `generateMetadata`의 `alternates`가 같은 https 주소로 선언한다. next-intl 미들웨어의 `Link` 응답 헤더는 프록시 뒤 요청 주소로 만들어져 `http://`로 나갔으므로 `i18n/routing.ts`의 `alternateLinks: false`로 끈다(26.09.28).
- **lastModified**: 인물은 `celebs.updated_at ?? created_at`을 사용한다. `updated_at`은 트리거 `touch_profile_updated_at`이 조회수·접속 시각·slug·감상여정 열을 뺀 실제 열 변경에만 올린다. 그래서 인물 전량의 lastmod가 최근 날짜로 몰려 있는 것은 한 줄 정의·수식어 일괄 개편 같은 실제 열 수정의 결과다. 다만 화면에 보이지 않는 열만 바뀐 경우까지 거르지는 않는다(26.09.28 확인). 정적 경로·기관 선정 화면은 정확한 수정 시각을 산출할 수 없어 기록하지 않는다. `new Date()` 폴백으로 매 재생성마다 "방금 수정됨"을 신고하지 않는다.

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
- **인물 전량 재통지** (2026-08-25): 네이버가 인물 페이지 대부분을 색인하지 않은 것을 실측으로 확인하고 `celebs.xml` 6,118 URL을 Bing 계열 공용·네이버 공식 API에 각각 2배치 POST했다. 4배치 전부 HTTP 200이다. 통지는 재수집 요청일 뿐 색인 보장이 아니다.
- **인물 제목·설명문 개편 전량 통지** (2026-09-28): 인물 상세 제목·설명문을 전량 바꾼 배포(`658a9cb6`) 뒤 `celebs.xml` 11,122 URL을 Bing 계열 공용 API(5,000·5,000·1,122)와 네이버 공식 API(10,000·1,122)에 보냈고 5개 배치 전부 HTTP 200이다. 같은 날 Google은 사이트맵 API 재제출과 URL 색인 요청으로 처리했다([Google 일일 색인 신청](../../continuous/google-indexing.md)). Bing·네이버 콘솔의 사이트맵 재제출은 하지 않았다 — 등록된 사이트맵은 그대로이고 전량 갱신 신호는 IndexNow로 보낸다.
- **인물 상세 밖 페이지 메타·작품 첫 화면 개편 통지** (2026-09-28): 「인물 상세 밖 페이지 메타데이터」 규칙과 작품 첫 화면(베스트셀러)·기관 선정 목록 카드·탐색 목차 개편을 배포(`bee159f7`, `cached-html`·`seo` 퍼지)한 뒤 `core.xml` 348 URL을 Bing 계열 공용 API와 네이버 공식 API에 각각 1배치로 보냈고 둘 다 HTTP 200이다. Google은 서비스 계정 `sitemaps.submit`(204)으로 사이트맵을 다시 제출했다.
- **신화·세력 한 편 주소 개설 통지** (2026-09-30): 「신화·세력도감」 개편 배포(`694e2e46`, `seo`·`cached-html` 퍼지) 뒤 새 주소 266개의 한·영 532 URL을 Bing 계열 공용 API와 네이버 공식 API에 각각 1배치로 보냈고 둘 다 HTTP 200이다. 같은 날 Google은 `sitemaps.submit`(204) 재제출과 URL 색인 요청으로 처리했다.
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
- **모델 학습·대량 수집 크롤러 UA 20종**(`GPTBot`·`ClaudeBot`·`CCBot`·`Bytespider`·`Amazonbot`·`meta-externalagent`와 SEO 수집기 등, 명단은 `sw/web/src/lib/blocked-crawlers.ts`): `Disallow: /` 전 경로 차단. 같은 명단을 Cloudflare WAF(1차 차단)와 미들웨어(2차 403)가 쓴다. 답변 엔진을 열었다고 학습 수집까지 연 것이 아니다.
- **robots 전용 토큰** `Applebot-Extended`: UA 없이 robots.txt로만 작동하며 Apple 모델 학습만 제어한다. Siri·Spotlight 검색은 `Applebot`이 담당하므로 전면 차단해도 검색 노출은 유지된다.
- **`Google-Extended`는 기본 안내만 허용**(2026-09-11): 홈·`/about`·`/explore/directory`·`/privacy`·`/terms`와 `/en` 변형만 `Allow`, 나머지는 `Disallow: /`. 이 토큰은 Gemini 모델 학습과 **Gemini 앱·Vertex AI 그라운딩**을 함께 제어하므로 전면 차단하면 Gemini 답변에서 서비스 소개조차 빠진다. 경로 규칙을 따르고 자체 크롤을 하지 않아 추가 부하는 없다. [Google-Extended](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers)
- 일반 `Googlebot`은 Google 검색·AI Overviews/AI Mode를 함께 제어하고, `Google-Extended`는 Google 검색 포함·순위에 영향을 주지 않는다.
- **분리 원칙(2026-09-11 결정)**: 개별 데이터(인물·작품 상세) 보호는 학습 차단 한 축으로만 한다. 검색·답변 봇에게 상세를 감추지 않는다 — Google AI Mode는 Googlebot 색인을 그대로 쓰므로 3자 답변 봇만 막아도 보호 효과가 없고 인용만 잃는다. `data-nosnippet`·Bing `nocache`로 상세 블록을 빼는 안은 검색 스니펫까지 잃어 채택하지 않았다.
- **Cloudflare 층**(학습 봇 1차 차단, 호스팅 ASN 챌린지의 Perplexity 예외, AI 봇 정책 Search·Agent·Training 허용, 관리 규칙이 미검증 IP의 AI 봇 UA를 막으므로 로컬 curl 시험이 진짜 봇 처리와 다르다는 점)은 [platform-05-external-services.md](../platform/platform-05-external-services.md)의 「Cloudflare 앞단 캐시」 절이 쥔다. 진짜 봇의 허용·차단은 대시보드 AI Crawl Control › Security로 본다.

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

`google-search-console` MCP의 `submit_sitemap`이 `403 Insufficient Permission`을 반환하더라도 사이트 소유 권한 부족으로 단정하지 않는다. 읽기 API와 제출 권한은 다르다. 승인된 제출 작업은 [aside-browser](../../../.agents/skills/aside-browser/SKILL.md) 또는 코덱스 브라우저 확장의 기존 관리자 로그인으로 이어갈 수 있다. 다른 계정의 빈 사이트 목록을 보고 새 사이트를 중복 등록하지 말고, 기존 소유 계정과 속성을 먼저 확인한다. 공식 Sitemaps PUT API를 직접 사용하는 경우에는 `https://www.googleapis.com/auth/webmasters` scope가 필요하며 토큰·자격 파일 내용은 출력하지 않는다.

## 로컬 검증 방법

배포 전 PostgREST curl로 검증한다:

```bash
cd sw/web && source .env.local

# 사이트맵 쿼리 테스트
curl -s "${NEXT_PUBLIC_DB_API_URL}/rest/v1/celebs?select=slug,created_at&publication_status=eq.active&celeb_tier=eq.full&slug=not.is.null&order=created_at.asc&limit=3" \
  -H "apikey: ${NEXT_PUBLIC_DB_PUBLISHABLE_KEY}" \
  -H "Authorization: Bearer ${NEXT_PUBLIC_DB_PUBLISHABLE_KEY}"

# 배포 후 검증
curl -s "https://feelandnote.com/sitemap.xml" | grep -c "<sitemap>" # 현재 하위 파일 2개
curl -s "https://feelandnote.com/sitemaps/celebs.xml" | grep -c "<url>"
curl -s -o /dev/null -w "%{http_code}\n" "https://feelandnote.com/sitemaps/contents-0.xml" # 예상: 404
curl -s -I "https://feelandnote.com/feed.xml" | grep Content-Type  # 예상: application/rss+xml
curl -s -I "https://feelandnote.com/robots.txt" | grep Content-Type # 예상: text/plain
```
