# 탐색 (`(main)/explore/*`)

> **최종 실측 체크: 26.07.16** — 탐색 화면 실측(실화면 10 + 레거시 5 확정)

인물을 여러 축으로 훑는 영역이다. 허브 하나에 실제 화면 10개, 레거시 리다이렉트 5개로 이뤄진다.

## 화면 목록

| 경로 | 역할 | 데이터 출처 |
|---|---|---|
| `/explore` | 허브. 4개 미리보기 + 네비게이터 | `getCelebs`, `getTopByContentType`, `getPersonaDistribution`, `getFeaturedTags` |
| `/explore/figures` | 인물 목록. 파라미터 유무로 두 모드 | `getCelebs` 또는 `getCelebsByProfession` + 4종 집계 |
| `/explore/ranking` | 분야별 랭킹. 콘텐츠 타입별 Top 10 | `getTopByContentTypeFull`, `getSharedContents` |
| `/explore/persona` | 인물 분석. 16축 극단 인물 + 차순위 10명 | `getPersonaExtremes` |
| `/explore/today` | 오늘의 인물 | `getTodayFigure` |
| `/explore/faction` | 세력도감 | `getFeaturedTags` |
| `/explore/faction/[slug]` | 테마별 고유 주소 세력도감 | `getFeaturedTags` |
| `/explore/feed` | 인물 피드 | `getCelebFeed` |
| `/explore/timeline` | 국가별 연대기 | `getCelebTimeline` |
| `/explore/youtube` | 유튜브 채널 모음 | `getYoutubeCelebs` |
| `/explore/directory` | 전체 인물 디렉토리 (SEO 인덱스) | `getCelebDirectory` |

레거시 리다이렉트 5개.

| 경로 | 목적지 | `next.config.ts` 규칙 |
|---|---|---|
| `/explore/figure` | `/explore/today` | 있음 |
| `/explore/people` | `/agora/social` | 있음 |
| `/explore/celeb-feed` | `/explore/feed` | 있음 |
| `/explore/top-by-type` | `/explore/ranking` | 있음 |
| `/explore/celebs` | `/explore/figures` | 있음 |

다섯 모두 두 겹이다 — 페이지 리다이렉트(307)와 `next.config.ts`의 설정 리다이렉트(308)가 함께 있다. 설정 쪽은 로케일 접두어가 없는 형태와 `/:locale(ko|en)/...` 형태를 각각 규칙으로 둔다.

## 레이아웃·허브

`explore/layout.tsx`가 배너(`ExploreBanner`)와 `PageContainer`를 씌운다.

허브(`/explore`)는 `HubNav` + `HubSection` 4개다. 순서·라벨키·더보기 주소는 `hubSectionUtils.tsx`의 `EXPLORE_SECTIONS`가 단일원천이다.

| # | 섹션 | 컴포넌트 | 더보기 |
|---|---|---|---|
| 1 | 랭킹 | `RankingTabs` (왕성한 탐구자 · 분야별 최고 탭) | `/explore/ranking` |
| 2 | 성향 분석 | `PersonaDistribution` | `/explore/persona` |
| 3 | 세력도감 | `FactionCard` | `/explore/faction` |
| 4 | 전체 탐구자 | `HubCelebGrid` | `/explore/figures?tier=full` |

랭킹 섹션만 `hideDivider`로 깔고 섹션 래퍼의 더보기를 뗀다 — 탭 내부에서 탭별 더보기를 따로 처리하기 때문이다.

허브 네비게이터에는 섹션과 별개로 `EXPLORE_STANDALONE` 5개가 붙는다.

| 라벨키 | href |
|---|---|
| `navFeed` | `/explore/feed` |
| `navTimeline` | `/explore/timeline` |
| `navYoutube` | `/explore/youtube` |
| `navDirectory` | `/explore/directory` |
| `navOthers` | `/explore/figures?tier=light` |

허브 데이터는 다섯 갈래를 병렬로 읽는다 — 콘텐츠 30건 이상 인물 6명(`content_count` 정렬), 타입별 최고, 성향 분포, 일일 추천 12명(`tier: "full"`), 세력도감 태그. 세력도감 카드는 `is_featured`이고 인물이 붙은 태그 중 앞 4개, 태그마다 인물 4명까지만 추려 넘긴다.

`PopularBooks`(쿠팡 제휴)를 임포트하지만 렌더는 주석 처리돼 있다.

`navigation.tsx`의 탐색 하위 링크는 9개(figures·ranking·persona·today·faction·feed·timeline·youtube·directory)다. `EXPLORE_SECTIONS` + `EXPLORE_STANDALONE` 조합과 항목이 어긋난다 — 하위 링크에는 `today`가 있고 허브 네비게이터에는 없으며, 반대로 `navOthers`(`?tier=light`)는 허브에만 있다.

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

## 인물 분석 (`/explore/persona`)

`getPersonaExtremes({ runnersUpLimit: 10 })`로 16축 각각의 극단 인물과 차순위 10명을 받아 `PersonaFullSection`에 넘긴다. 파일 주석은 이 화면을 "비범한 기록가"라 부르지만 네비게이션 라벨은 "인물 분석"이다. `revalidate = 3600`.

허브의 성향 분포(`PersonaDistribution`)는 `getPersonaDistribution()`이라는 다른 액션을 쓴다.

## 오늘의 인물 (`/explore/today`)

`getTodayFigure()`가 인물·콘텐츠와 함께 `source`를 내주고 셋 다 `TodayFigureSection`에 넘어간다. 인물이 없으면 아무것도 그리지 않는다(`null`).

이 액션은 `actions/scriptures`에 있다. 서가 허브의 첫 섹션과 홈 화면도 같은 액션을 쓴다. 서가의 `/library/figure`와 탐색의 `/explore/figure`가 모두 이 주소로 리다이렉트한다.

## 세력도감 (`/explore/faction`, `/explore/faction/[slug]`)

두 화면 모두 `getFeaturedTags()`로 태그 전체를 읽어 `FeaturedFaction`에 넘기고, `location="explore-pc"`를 고정으로 준다. 차이는 어느 테마를 펼친 채 열지 정하는 방법뿐이다.

- `/explore/faction`: 검색 파라미터 `?tag=`의 값을 `initialTagId`로 넘긴다.
- `/explore/faction/[slug]`: `slug`로 태그를 찾아 그 `id`를 `initialTagId`로 넘긴다. 못 찾으면 `notFound()`다.

**태그·그룹 체계는 여기서 다루지 않는다.** 그룹 계층의 단일원천(`celeb_tags.parent_id`, 26.07.26 코드 상수에서 승격), 그룹 헤더가 일반 태그 행으로 존재하는 구조, `getFeaturedTags`가 `parentSlug`를 붙이는 방식은 아래 문서를 본다.

- `docs/project/celeb/celeb-tag-system.md` — 셀럽 태그 체계·상위 그룹 현행 규격
- `docs/project/faction-ai-group-refactor.md` — 그룹 계층 설계 경위(상수 시대 기록)

## 인물 피드 (`/explore/feed`)

`getCelebFeed({ limit: 10 })`로 첫 10건과 커서·다음 여부를 받아 `CelebFeedSection`에 초기값으로 넘긴다. 이후는 클라이언트가 커서로 이어 붙인다.

광장의 `/agora/feed`와 `/agora/celeb-feed`, 탐색의 `/explore/celeb-feed`가 모두 이 주소로 리다이렉트한다.

## 국가별 연대기 (`/explore/timeline`)

`getCelebTimeline(locale)`로 인물과 국가 목록을 받아 `TimelineSection`에 넘긴다. 로케일은 `en`이 아니면 모두 `ko`로 접는다.

파일 주석이 밝히듯 별도 태그를 쓰지 않고 기존 데이터(`nationality`, `birth_date`)만으로 세운다. `revalidate = 3600`.

## 유튜브 채널 (`/explore/youtube`)

`getYoutubeCelebs()`로 인물 목록을 받아 `YoutubeChannelContent`에 로케일과 함께 넘긴다. 파일 주석은 "서재 탐방 영상(본편·쇼츠)을 인물 페이지와 연결하여 진열한다"고 적는다.

영상 제작 파이프라인은 `docs/project/remotion/`이 다룬다.

## 디렉토리 (`/explore/directory`)

크롤러가 한 번에 전체 인물 주소를 발견하도록 세운 인덱스 화면이다. 페이지 본문에 모든 로직이 있다.

`getCelebDirectory()`로 전체 인물을 받아 이름 첫 글자로 묶는다. 한글은 유니코드 계산으로 초성 19자 중 하나를 뽑고, 알파벳은 대문자로, 나머지는 `#`으로 넣는다. 묶음 순서는 초성 → 알파벳 → `#`이다.

표시 이름은 영문 로케일이고 `nickname_en`이 있으면 그것을, 아니면 `nickname`을 쓴다. 각 항목은 `/celeb/{slug}`로 건다. 상단에 직군 범례(`CELEB_PROFESSIONS` + `PROFESSION_ICONS` + `PROFESSION_COLORS`)와 총 인원수, 초성 앵커 네비게이션이 붙는다.

## 연계 문서

- 화면 지도: [README.md](README.md)
- 서가(오늘의 인물 미리보기): [library.md](library.md)
- 광장(`/explore/people` 목적지): [agora.md](agora.md)
- 세력도감 그룹: `docs/project/faction-ai-group-refactor.md`
- 셀럽 태그: `docs/project/celeb/celeb-tag-system.md`
- 셀럽 데이터: `docs/project/db-celeb.md`
- SEO: `docs/project/seo.md`
