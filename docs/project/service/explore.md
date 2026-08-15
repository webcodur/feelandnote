# 인물 (`(main)/explore/*`)

> **최종 실측 체크: 26.08.11** — 스펙트럼 주소·액션·컴포넌트와 레거시 리다이렉트를 코드에 재대조했다. 라벨을 「탐색」에서 **「인물」**로 바꿨다(26.08.07, 주소·코드 키는 `explore` 유지)

인물을 여러 축으로 훑는 영역이다. 짝이 되는 축은 작품(`/library`)이다 — **사람과, 그 사람이 남긴 것.** 허브 하나에 실제 화면 10개, 레거시 리다이렉트 6개로 이뤄진다.

## 화면 목록

| 경로 | 역할 | 데이터 출처 |
|---|---|---|
| `/explore` | 허브. 3개 미리보기 + 네비게이터 (본문 §허브 절과 일치. 26.08.11 실측) | `getCelebs`, `getTopByContentType`, `getSpectrumDistribution`, `getFeaturedTags` |
| `/explore/figures` | 인물 목록. 파라미터 유무로 두 모드 | `getCelebs` 또는 `getCelebsByProfession` + 4종 집계 |
| `/explore/ranking` | 분야별 랭킹. 콘텐츠 타입별 Top 10 | `getTopByContentTypeFull`, `getSharedContents` |
| `/explore/spectrum` | 스펙트럼. 16축 극단 인물 + 차순위 10명 | `getSpectrumExtremes` |
| `/explore/today` | 오늘의 인물 | `getTodayFigure` |
| `/explore/faction` | 세력도감 | `getFeaturedTags` |
| `/explore/faction/[slug]` | 테마별 고유 주소 세력도감 | `getFeaturedTags` |
| `/explore/feed` | 인물 피드 | `getCelebFeed` |
| `/explore/timeline` | 국가별 연대기 | `getCelebTimeline` |
| `/explore/youtube` | 영상관. 서재 탐방·세력도감 소개 + 재생목록 + 시리즈별 영상 | `getYoutubeCelebs`, `getYoutubeFactionVideos`, `constants/youtube.ts` |
| `/explore/directory` | 전체 인물 디렉토리 (SEO 인덱스) | `getCelebDirectory` |

레거시 리다이렉트 6개.

| 경로 | 목적지 | `next.config.ts` 규칙 |
|---|---|---|
| `/explore/figure` | `/explore/today` | 있음 |
| `/explore/people` | `/agora/social` | 있음 |
| `/explore/celeb-feed` | `/explore/feed` | 있음 |
| `/explore/top-by-type` | `/explore/ranking` | 있음 |
| `/explore/celebs` | `/explore/figures` | 있음 |
| `/explore/persona` | `/explore/spectrum` | 없음. 페이지 리다이렉트만 유지 |

기존 다섯 주소는 두 겹이다 — 페이지 리다이렉트(307)와 `next.config.ts`의 설정 리다이렉트(308)가 함께 있다. 설정 쪽은 로케일 접두어가 없는 형태와 `/:locale(ko|en)/...` 형태를 각각 규칙으로 둔다. `/explore/persona`는 과거 공유 주소 호환을 위한 페이지 리다이렉트만 둔다.

## 레이아웃·허브

`explore/layout.tsx`가 배너(`ExploreBanner`)와 `PageContainer`를 씌운다.

허브(`/explore`)는 `HubNav` + `HubSection` 3개다. 순서·라벨키·더보기 주소는 `hubSectionUtils.tsx`의 `EXPLORE_SECTIONS`가 단일원천이다.

| # | 섹션 | 컴포넌트 | 더보기 |
|---|---|---|---|
| 1 | 랭킹 | `RankingTabs` (인기 프로필 · 챔피언 · 오늘의 추천 탭) | 탭별 (`figures?tier=full` / `ranking` / `figures?tier=full`) |
| 2 | 성향 분석 | `SpectrumDistribution` | `/explore/spectrum` |
| 3 | 세력도감 | `FactionCard` | `/explore/faction` |

**인기 프로필 탭은 영향력과 다른 축이다**(2026-07-26 신설). 영향력은 인류사 기준의 고정값이라 "지금 무엇이 읽히는가"를 담지 못하고, 누적 조회수로 세워도 앞자리가 영원히 고정된다. 그래서 **최근 30일 조회수**로 매긴다. 실측 차이 — 젠슨 황은 누적 1위·30일 2위, 리처드 파인만은 누적 18회인데 30일 17회로 최근 급등분이다. 데이터 구조·시딩 내역은 `db-celeb.md`의 「인물 조회수」 절.

**26.08.02 개편** — 랭킹과 옛 '전체 탐구자'가 같은 카드 격자 12장으로 사실상 같은 화면이었다. 기록 수집가 탭(30건 이상, `content_count` 정렬)을 제거하고, 분야별 챔피언은 '챔피언'으로 줄이며 카드 위에 "{분야}의 대가" 문구를 얹었다. '전체 탐구자'(실체는 일일 추천 12명)는 '오늘의 추천'으로 개명해 별도 구획을 없애고 **랭킹 구획의 셋째 탭**으로 흡수했다(탭 부제에 매일 바뀜을 명시).

첫 섹션이 `hideDivider`를 쥔다(현재는 랭킹). 랭킹 섹션은 래퍼의 더보기를 떼어 쓴다 — 탭 내부에서 탭별 더보기를 따로 처리하기 때문이다.

**구획은 항상 그려진다**(26.08.15 전환). 예전에는 조회 결과가 빈 구획을 접고 목차·번호도 "실제로 그려지는 구획"에서만 뽑았다. 그 규칙이 늦거나 실패한 구획을 조용히 지워, 콜드 상태에서 새로고침할 때마다 구획 수가 달라 보였다. 지금은 목차·번호·총 개수를 `EXPLORE_SECTIONS` 고정값에서 뽑고, 조회에 실패한 구획은 제자리에 「불러오지 못했습니다 · 다시 시도」를, 정말 0건인 구획은 「아직 자료가 없습니다」 한 줄을 세운다.

허브 껍데기(목차 + 구획 세 개의 헤더)는 조회를 기다리지 않고 즉시 나간다. 본문은 구획마다 `Lane`(`components/ui/pending`)으로 감싸 각자 자기 조회만 기다린다. `HubSection`은 레인 밖에 두므로 제목·부제·번호가 먼저 서고 그 안쪽만 채워진다 — 그래서 별도의 허브 스켈레톤 컴포넌트를 두지 않는다. 봇·미확인 UA에게는 `Lane`이 스트리밍 없이 완성 HTML을 주고(스켈레톤을 본문으로 읽히는 사고 방지), 사람 브라우저만 구획별로 흘려보낸다. 같은 이유로 `explore/loading.tsx`는 26.08.15에 지웠다. 구획별 조회·실패 처리는 `explore/sections.tsx`에 모여 있고, 페이지에는 `maxDuration = 30`을 둬 콜드에서 봇 응답이 잘리지 않게 한다.

랭킹 구획의 세 탭은 각각 실패·0건을 따로 다룬다. 실패한 탭은 탭 단추를 남기고 본문만 다시 시도로 바꾸며(무엇이 빠졌는지 보이게), 0건인 탭만 뺀다. 셋 다 실패하면 구획 본문 전체가 다시 시도가 된다.

허브 네비게이터에는 섹션과 별개로 `EXPLORE_STANDALONE` 5개가 붙는다.

| 라벨키 | href |
|---|---|
| `navFeed` | `/explore/feed` |
| `navTimeline` | `/explore/timeline` |
| `navYoutube` | `/explore/youtube` |
| `navDirectory` | `/explore/directory` |
| `navOthers` | `/explore/figures?tier=light` |

허브 데이터는 다섯 갈래다 — **최근 30일 조회 상위 12명(`trending` 정렬)**, 타입별 최고, 성향 분포, 일일 추천 12명(`tier: "full"`), 세력도감 태그. 앞의 셋 중 랭킹 구획이 쓰는 인기·타입별·일일 추천은 한 레인 안에서 `Promise.allSettled`로 함께 읽고, 성향 분포와 세력도감은 각자 레인이다. 인기(`trending`)만 목록 캐시(1시간)로 따로 감싼다 — 30일 창 순위를 7일 캐시에 묶으면 한 주 내내 같은 줄이 나온다. 세력도감 카드는 `is_featured`이고 인물이 붙은 태그 4개만 추려 넘기며, 카드에서 인물 얼굴을 노출하지 않으므로 프로필은 조회하지 않는다.

**세력도감 4장 편성**(`getFactionHubPreviews`) — 사람이 고른 고정 명단 `HUB_PINNED_SLUGS`가 먼저 자리를 잡고, 빈 자리만 자동 규칙(대분류 하나씩 · 단체샷 있는 테마 우선 · `sort_order` 순)이 채운다. 26.08.03 유저 선정: `ai-pioneers` · `paypal-mafia` · `greek-roman-myth` · `digital-resistance`. 자동 규칙만 돌 때는 앞 순번이 이겨 인간형 로봇·마케도니아 제국이 잡혔다(실측). 명단의 태그가 사라지거나 인물이 0이면 그 자리는 자동 선정으로 넘어간다.

세력도감 미리보기는 PC·모바일 모두 1:1 단체샷 표지를 사용한다. PC에서는 2×2 그리드, 모바일에서는 다음 카드가 일부 보이는 가로 스냅 캐러셀로 노출한다. 카드에는 제목과 설명만 얹고, 인물 얼굴 묶음과 별도 탐색 문구는 두지 않는다.

`PopularBooks`(쿠팡 제휴)는 목차 밖 맨 아래에 레인 하나로 붙는다. 한국어 화면이고 링크가 걸린 책이 있을 때만 스스로 그려지므로 대기 자리를 미리 잡지 않는다.

`navigation.tsx`의 하위 링크는 9개(figures·ranking·spectrum·today·faction·feed·timeline·youtube·directory)다. `EXPLORE_SECTIONS` + `EXPLORE_STANDALONE` 조합과 항목이 어긋난다 — 하위 링크에는 `today`가 있고 허브 네비게이터에는 없으며, 반대로 `navOthers`(`?tier=light`)는 허브에만 있다.

## 인물 목록 (`/explore/figures`)

한 라우트가 두 화면을 겸한다. `isGridView(params)`가 판정한다 — `FILTER_KEYS`(profession·nationality·contentType·gender·search·sortBy·page·pageSize·tagId·tier) 중 하나라도 비어 있지 않은 문자열로 들어오면 그리드다.

- **캐러셀 모드** (파라미터 없음): `getCelebsByProfession()`으로 직군별 구획을 만들어 `CelebsByProfession`에 넘긴다.
- **그리드 모드** (파라미터 있음): `getCelebs()`로 걸러 `CelebsSection`에 넘긴다.

두 모드 모두 필터 UI용 집계 4종(`getProfessionCounts`, `getNationalityCounts`, `getContentTypeCounts`, `getGenderCounts`)을 함께 읽는다.

파라미터 검증 규칙.

- `sortBy`: `daily_recommend`, `composite`, `influence`, `follower`, `content_count`, `name_asc`, `birth_date_desc`, `birth_date_asc` 중 하나. 그 밖이면 `daily_recommend`.
- `pageSize`: 12·24·48·96 중 하나. 그 밖이면 24.
- `page`: 1 미만이거나 숫자가 아니면 1.
- `tier`: `full` 또는 `light`만 통과.
- `all` 값은 필터를 걸지 않는 것으로 본다(`notAll`).

`isGridView`는 `FILTER_KEYS`에 `tagId`를 넣지만 페이지 본문은 `tagId`를 파싱하지 않는다. `?tagId=`만 붙이면 그리드 모드로 넘어가되 그 값은 조회에 쓰이지 않는다 — 의도가 불명확하다.

`revalidate = 3600`이다.

## 랭킹 (`/explore/ranking`)

`getTopByContentTypeFull()`로 콘텐츠 타입별 인물 목록을 받고, 타입마다 상위 인물들의 id를 모아 `getSharedContents(ids, type, 10)`로 공통 감상 콘텐츠를 병렬 조회한다. 결과를 `TopByTypeSection`에 함께 넘긴다.

파일 주석은 "4개 콘텐츠 타입별 Top 10"이라 적고 스켈레톤도 4구획 × 10칸으로 그린다. 실제 구획 수는 `getTopByContentTypeFull()`이 내주는 값에 달렸다.

메타·i18n 네임스페이스는 옛 이름 `explore.topByType`을 그대로 쓴다. `revalidate = 3600`.

## 스펙트럼 (`/explore/spectrum`)

`getSpectrumExtremes({ runnersUpLimit: 10 })`로 16축 각각의 극단 인물과 차순위 10명을 받아 `SpectrumFullSection`에 넘긴다. DB의 `celeb_persona` 테이블과 `persona` JSONB 열, RPC `get_persona_extremes`만 레거시 저장소 식별자로 유지한다. `revalidate = 3600`.

허브의 성향 분포(`SpectrumDistribution`)는 `getSpectrumDistribution()`이라는 다른 액션을 쓴다.

## 오늘의 인물 (`/explore/today`)

`getTodayFigure()`가 인물·콘텐츠와 함께 `source`를 내주고 셋 다 `TodayFigureSection`에 넘어간다. 인물이 없으면 아무것도 그리지 않는다(`null`).

이 액션은 `actions/library`에 있다. 홈 화면도 같은 액션을 쓴다(작품 허브의 첫 구역이던 자리는 26.08.07에 없앴다). `/library/figure`와 `/explore/figure`가 모두 이 주소로 리다이렉트한다.

## 세력도감 (`/explore/faction`, `/explore/faction/[slug]`)

두 화면 모두 `getFeaturedTags()`로 태그 전체를 읽어 `FeaturedFaction`에 넘기고, `location="explore-pc"`를 고정으로 준다. 차이는 어느 테마를 펼친 채 열지 정하는 방법뿐이다.

- `/explore/faction`: 검색 파라미터 `?tag=`의 값을 `initialTagId`로 넘긴다.
- `/explore/faction/[slug]`: `slug`로 태그를 찾아 그 `id`를 `initialTagId`로 넘긴다. 못 찾으면 `notFound()`다.
- 인물 화보의 대사 버튼은 해당 팩션 배치의 `faction_atlas_members.quote/quote_en`만 자막으로 보낸다. 게임용 `celeb_dialogues`의 greeting·quote로 폴백하지 않는다.

**테마·그룹의 운영 규격은 여기서 복제하지 않는다.** 그룹 계층의 단일원천(`celeb_tags.parent_id`), 그룹 헤더가 일반 테마 행으로 존재하는 구조, `getFeaturedTags`가 `parentSlug`를 붙이는 방식은 아래 문서를 본다.

- `docs/project/apps/web-bo.md` 「세력도감」 — 현행 운영·편집 규격
- `docs/project/remotion/faction/unification.md` §4-3 — 제작·서비스 데이터 단일화 설계

## 인물 피드 (`/explore/feed`)

`getCelebFeed({ limit: 10 })`로 첫 10건과 커서·다음 여부를 받아 `CelebFeedSection`에 초기값으로 넘긴다. 이후는 클라이언트가 커서로 이어 붙인다.

광장의 `/agora/feed`와 `/agora/celeb-feed`, 인물의 `/explore/celeb-feed`가 모두 이 주소로 리다이렉트한다.

## 국가별 연대기 (`/explore/timeline`)

`getCelebTimeline(locale)`로 인물과 국가 목록을 받아 `TimelineSection`에 넘긴다. 로케일은 `en`이 아니면 모두 `ko`로 접는다.

파일 주석이 밝히듯 별도 태그를 쓰지 않고 기존 데이터(`nationality`, `birth_date`)만으로 세운다. `revalidate = 3600`.

## 영상관 (`/explore/youtube`)

홈의 통합 영상 히어로가 이 내부 화면으로 연결된다. 상단은 `constants/youtube.ts`를 단일원천으로 삼아 서재 탐방·세력도감의 본편과 쇼츠 재생목록, locale별 채널 홈을 안내한다. 영문 채널에 아직 없는 세력도감은 실제 영상이 있는 한국어 재생목록으로 연결하고 화면에 언어 차이를 명시한다.

두 시리즈 소개 아래에는 시리즈별 영상 보관소를 둔다. 서재 탐방은 `getYoutubeCelebs()`가 `celebs.youtube_videos`를 읽어 locale 본편·쇼츠를 우선 진열하고, 각 영상에서 인물 상세로 돌아간다. 세력도감은 `getYoutubeFactionVideos()`가 `constants/youtube.ts`의 공개 재생목록을 YouTube Atom 피드로 읽고, 출간 태그의 `celeb_tags.youtube_videos`를 영상 ID 기준으로 병합한다. 공개 영상은 DB 연결 여부와 무관하게 모두 노출하고, 연결된 영상은 첫 세력명과 추가 세력 수를 표시한다. `/explore/faction`으로 돌아가는 링크도 제공한다.

YouTube 피드와 DB 병합 결과는 6시간 캐시한다. 피드 조회가 실패하면 오류를 서버 로그에 남기고 DB 연결 영상만으로 보관소를 유지한다.

영상 제작 파이프라인은 `docs/project/remotion/`이 다룬다.

## 디렉토리 (`/explore/directory`)

크롤러가 한 번에 전체 인물 주소를 발견하도록 세운 인덱스 화면이다. 페이지 본문에 모든 로직이 있다.

`getCelebDirectory()`로 전체 인물을 받아 이름 첫 글자로 묶는다. 한글은 유니코드 계산으로 초성 19자 중 하나를 뽑고, 알파벳은 대문자로, 나머지는 `#`으로 넣는다. 묶음 순서는 초성 → 알파벳 → `#`이다.

표시 이름은 영문 로케일이고 `nickname_en`이 있으면 그것을, 아니면 `nickname`을 쓴다. 각 항목은 `/celeb/{slug}`로 건다. 상단에 직군 범례(`CELEB_PROFESSIONS` + `PROFESSION_ICONS` + `PROFESSION_COLORS`)와 총 인원수, 초성 앵커 네비게이션이 붙는다.

## 연계 문서

- 화면 지도: [README.md](README.md)
- 서가(오늘의 인물 미리보기): [library.md](library.md)
- 광장(`/explore/people` 목적지): [agora.md](agora.md)
- 세력도감 운영·그룹: `docs/project/apps/web-bo.md` 「세력도감」
- 세력도감 단일화: `docs/project/remotion/faction/unification.md` §4-3
- 셀럽 데이터: `docs/project/data/db-celeb.md`
- SEO: `docs/project/operations/seo.md`
