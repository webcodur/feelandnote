# 작품 (`(main)/explore/works/*`)

인물의 선택과 매체의 역사를 진열하는 탐색의 **작품** 모드다. 정본 주소는 `/explore/works`이며, 인물 모드와의 전환은 [explore.md](explore.md)가 설명한다. 서버 액션·컴포넌트·번역의 내부 이름은 `library`를 유지한다.

옛 `/library`·`/scriptures` 계열은 `sw/web/next.config.ts`가 새 주소로 직접 308 이전한다. `figure`는 오늘의 인물, `era`·`profession`은 인기 작품으로 보낸 뒤 나머지 하위 경로를 처리한다. 한국어 접두어 `/ko`는 제거하고 영문 `/en`과 검색 조건은 유지한다.

| 자리 | 현재 이름 |
|------|------|
| 서버 액션 | `sw/web/src/actions/library/` |
| 컴포넌트 | `sw/web/src/components/features/library/` |
| 상수 | `constants/library.tsx` · `constants/libraryMuseum.ts` · `constants/library/` |
| i18n 파일 | `sw/web/messages/<locale>/library.json` |
| 탐색 링크 | `WORKS_LINKS` (`constants/navigation.tsx`) |
| **아직 옛 이름** | DB 함수 `get_chosen_scriptures` · `get_scriptures_by_era` 둘뿐이다. `actions/library/chosen.ts`·`era.ts`가 호출한다 |

## 화면 목록

| 경로 | 역할 | 데이터 출처 |
|---|---|---|
| `/explore/works` | 기관 선정 목록과 다른 탐색 방법 안내 | `getCuratedHub` |
| `/explore/works/popular` | **베스트셀러.** 판매처의 도서 순위 | `getBestsellers` |
| `/explore/works/popular?mode=classics` | **불후의 명작.** 인물이 감상한 작품을 시대·직군·매체로 탐색 | `getChosenLibrary`, `getProfessionContentCounts` |
| `/explore/works/curated` | **기관 선정 허브.** 대학·언론·시상 기관이 발표한 목록 | `getCuratedHub` |
| `/explore/works/curated/[curator]` · `/[curator]/[list]` | 기관 상세 · 목록 상세 | `actions/library/curated.ts` |
| `/explore/works/museum` | 박물관. 매체 역사 전시 | `constants/libraryMuseum.ts` (정적 JSON) |
| `/explore/works/academy` | 학당. `ACADEMY_CATEGORY_IDS` 4종을 카드로 깐다 | `ACADEMY_CATEGORY_IDS` (정적) |
| `/explore/works/academy/[category]` | 카테고리 진입 → 첫 코스로 리다이렉트 | — |
| `/explore/works/academy/[category]/[course]` | 코스 본문(레슨) | `getAcademyLessonProgressState`. 레슨 목록(`ACADEMY_CONTENT_FILTERS`)은 페이지가 아니라 `AcademyLessonView`가 읽는다 |

## 레이아웃·허브

`explore/works/layout.tsx`가 배너(`LibraryBanner`), 모드 탭, `PageContainer`를 씌운다. 상위 탐색 레이아웃은 작품 화면을 그대로 통과시켜 배너와 여백이 겹치지 않게 한다. 두 모드의 공통 배너·소개·검색 패널·카드 반응·페이지 이동 규칙은 [탐색](explore.md)이 쥔다.

첫 화면의 「기관의 선택」은 [기관 선정](curated-lists.md#31-사용자-웹)의 `CuratedHubView`를 사용한다. 그 아래 베스트셀러·불후의 명작·박물관·학당은 `ExploreFeatureCard`와 [FNN-흑동주조](../production/image-generation.md#fnn-흑동주조) 이미지로 안내한다. 박물관·학당은 카드와 진입 화면에 「재편 중」을 표시하되 현재 콘텐츠는 계속 열어 둔다. 링크와 푸터는 `navigation.tsx`의 `WORKS_LINKS`를 공유한다.

베스트셀러와 불후의 명작은 첫 화면부터 별도 카드다. 베스트셀러는 `/explore/works/popular`, 명작은 `?mode=classics`로 진입하며 메타·canonical·사이트맵과 한영 웜업도 두 진입점을 구분한다.

## 인기 작품 갱신

`/explore/works/popular`는 한국어에서 예스24 전일 베스트셀러, 영문에서 미국 Apple Books 유료 전자책 차트를 보여준다. 한국어는 순위 기준일, 영문은 확인 시각과 출처를 표시한다. 미국 전체 도서 시장이나 실시간 판매량으로 표현하지 않는다. 순위 카드는 원본 판매처로 이동하며, 외부 차트 메타를 DB에 등록하지 않는다. 불후의 명작은 기존 내부 작품 카드와 시대·직군·매체 필터를 유지한다.

`actions/library/bestsellers.ts`가 공식 API·피드를 서버 캐시로 읽고 `lib/library/bestsellerFeed.ts`가 검증과 유효기간을 담당한다. 이용할 수 없는 목록은 준비 중으로 표시하며 오래된 수집 파일로 대체하지 않는다. `BookChartGrid`와 `BestsellerFreshness`가 차트를 그린다. 차트는 인물 상세 「참고도서」와 같은 공통 상품 목록(`components/shared/AffiliateBookList.tsx`)으로 순위·표지·YES24 단추·「책 상세 보기」를 그린다. 차트 항목은 우리 작품이 아니므로 YES24 단추와 표지는 차트 API가 준 애드온 제휴 주소(`addOnLink` → `purchase_url`, 모양이 어긋나면 상품 주소)를, 작품 상세 대신 「책 정보」 단추(정보 아이콘·점선 금색 테두리로 다른 목록의 「책 상세 보기」와 구별)가 외부 페이지로 내보내지 않고 YES24 상품 상세 API(`getYes24BookDetail`, ISBN 단위 하루 캐시)로 받은 표지·서지·가격·평점·책 소개를 모달(`Yes24BookModal`)로 띄운다. Apple Books 차트는 차트가 준 정보와 서점 단추만 보인다. 예스24 활성화 조건과 발급처는 [환경변수](../platform/env-vars.md), 공급처 운영 조건은 [외부 서비스](../platform/external-services.md)를 따른다.

## 박물관 구조

`/explore/works/museum`은 검색 파라미터 `cat`·`sub`를 받아 `MuseumTimeline`에 넘긴다. 카테고리 탭 + 서브 탭 + 간트 차트(`EraGanttChart`) + 시대 섹션(`MuseumEraSection`) + 목차(`MuseumTableOfContents`) + 모바일 네비(`MuseumMobileNav`)를 조합한다.

카테고리는 `MUSEUM_CATEGORY_IDS` 4종이고 각각 서브카테고리 3개다.

| 카테고리 | 서브카테고리 |
|---|---|
| `book` | `media`, `writing_tool`, `typography` |
| `video` | `media`, `technique`, `space` |
| `music` | `media`, `instrument`, `experience` |
| `game` | `platform`, `interface`, `graphics` |

서브카테고리의 표시 형태는 `SUB_CATEGORY_VIEW_TYPE`이 정한다. 기본은 `timeline`이고, `book/typography`만 `catalog`(`TypographyCatalog`)다.

**뷰 타입 4종의 담당은 이렇다** (26.07.16 실측). `SUB_CATEGORY_VIEW_TYPE`은 박물관·학당 키를 한 곳에 모아 두므로 둘을 섞어 보면 오판한다.

| 뷰 | 그리는 곳 | 해당 키 |
|----|-----------|---------|
| `timeline` | `MuseumTimeline` (기본값) | 박물관 서브카테고리 대부분 |
| `catalog` | `MuseumTimeline` → `TypographyCatalog` | `book/typography` |
| `lesson` | `AcademyLessonView` (학당) | `book/system`, `music/harmony`, `video/*` 4종, `ai/*` 3종 |
| `comparison` | **구현 없음** | `book/reading` (아래) |

**`book/reading`은 미완성이다.** `MUSEUM_CATEGORY_IDS`·`ACADEMY_CATEGORY_IDS` 어디에도 `reading` 서브카테고리가 없어 도달할 수 없고, `comparison` 뷰를 그리는 코드도 없다. 데이터(`BOOK_READING_HISTORY_TIMELINE`)는 2개 era만 있다. 살리려면 뷰 신규 구현 + 메뉴 등록 + 데이터 확충이 필요하므로 새 기능 개발에 해당한다. 죽은 설정이지만 의도를 남기려 제거하지 않고 상수에 주석으로 명기했다.

전시 데이터는 DB가 아니라 정적 JSON이다. `constants/library/{ko,en}/{book,video,music,game}.json`을 `getLibraryData(locale)`가 로케일별로 캐시해 내준다.

## 학당 계층

`/explore/works/academy` → `[category]` → `[course]` 3단이다.

- **`/explore/works/academy`**: **26.08.07에 두 줄로 갈랐다.** 윗줄은 사람이 다뤄온 매체(book·video·music + 개발중인 game), 아랫줄은 이음말과 함께 서는 `ai` 하나다. **AI를 매체 옆에 나란히 두면 "다섯 번째 매체"로 읽히기 때문**이고, AI는 앞의 넷 전부를 관통하는 다음 국면이라 줄을 갈랐다. 각 카드는 그 카테고리의 **첫 코스**로 바로 보낸다(`/explore/works/academy/{cat}/{firstCourse}`). 카드 아이콘은 페이지 안의 `CATEGORY_ICONS` 맵이 정한다 — **카테고리를 늘릴 때 이 맵도 함께 늘려야 한다**(빠지면 `Icon`이 undefined가 되어 렌더가 깨진다). 이음말 문구는 `library.academy.bridgeTitle`·`bridgeDesc`다.
  - **개발중 카드는 `ACADEMY_UPCOMING_CATEGORY_IDS`가 따로 쥔다.** 지금은 `game` 하나뿐이고 누를 수 없는 점선 카드로 선다(문구 `upcomingBadge`·`upcomingNote`). `ACADEMY_CATEGORY_IDS`에 섞지 않은 이유는 그 목록이 `courses[0]`이 있다고 전제하는 곳이 다섯 군데(카드·탭·리다이렉트 2곳·미리보기)라서다. **코스를 채우면 이 목록에서 빼고 위로 옮긴다.**
  - AI를 감추던 `VISIBLE_ACADEMY_CATEGORY_IDS`는 코드에 없다(26.08.07 전수 검색 확인).
- **`/explore/works/academy/[category]`**: 페이지 본문이 없다. `ACADEMY_CATEGORY_IDS`에서 카테고리를 찾아 첫 코스로 리다이렉트하고, 없는 카테고리면 `/explore/works/academy`로 되돌린다.
- **`/explore/works/academy/[category]/layout.tsx`**: 제목과 카테고리 탭(`AcademyCategoryTabs`)을 레이아웃에 둔다. 코스를 갈아탈 때 이 부분이 리로드되지 않게 하려는 배치다.
- **`/explore/works/academy/[category]/[course]`**: 카테고리·코스를 검증하고(둘 중 하나라도 어긋나면 리다이렉트) `AcademyLessonView`를 렌더한다.

카테고리·코스 구성은 `ACADEMY_CATEGORY_IDS`가 단일원천이다.

| 카테고리 | 코스 |
|---|---|
| `book` | `system` |
| `video` | `light_and_camera`, `composition`, `editing`, `narrative` |
| `music` | `harmony` |
| `ai` | `foundations`, `prompting`, `creation` |

박물관도 4종(게임 포함)이지만 구성이 다르다. 학당의 `game`은 26.08.07에 자리만 세웠고 코스가 없다(`ACADEMY_UPCOMING_CATEGORY_IDS`). 그전에는 박물관에만 게임이 있어 "사람이 다뤄온 모든 매체"라는 흐름이 학당에서 끊겨 보였다.

`ai`는 26.07.30에 넣었다. 그전까지 학당은 감상 매체(도서·영상·음악)만 다뤘다. 코스 3종은 원리(`foundations`) → 활용(`prompting`) → 결과물과 쟁점(`creation`) 순서로 이어지고, 세 코스가 서로를 참조하므로 **레슨을 재배치할 때 앞 코스를 가리키는 서술이 깨지지 않는지 확인해야 한다.**

각 코스가 담는 레슨 id 목록은 `ACADEMY_CONTENT_FILTERS`가 정한다. `music/harmony`만 12개이고 나머지 여덟 코스는 모두 8개다. 모든 학당 코스의 `SUB_CATEGORY_VIEW_TYPE` 값은 `lesson`이다.

레슨 본문은 정적 JSON이다. `constants/library/{ko,en}/`의 `book-academy.json`·`video-academy.json`·`music-harmony.json`·`ai-academy.json` 네 벌이고, `getLibraryData(locale)`가 로케일별로 캐시해 내준다. 카테고리와 레슨 파일을 잇는 곳은 `AcademyLessonView`의 `getLessonSource()`다. **분기에 없는 카테고리는 화성학 레슨으로 조용히 폴백하므로**, 카테고리를 늘릴 때 이 함수도 함께 늘린다.

### AI 레슨 이미지

AI 학당 24개 레슨에는 레슨마다 핵심 단계 한 곳에 GPT 생성 이미지 1장을 둔다. 공개 파일은 `public/images/library/ai/ai-academy/<lesson-id>.webp`의 640×640 실제 WebP이고, 한국어·영문 데이터가 같은 파일을 공유하되 `imageAlt`만 각 언어로 쓴다. 이미지는 UI·텍스트·도식 대신 분류 작업대, 금형 공방, 무대 그림막, 보존 작업 같은 실제 물리 장면으로 개념을 설명한다.

AI 학당의 데이터와 `/explore/works/academy/ai/{foundations|prompting|creation}` 직접 경로는 활성 상태이고, `/explore/works/academy`의 AI 카드도 지금은 함께 노출된다(26.08.07 확인). 26.07.30에 카드만 감추기로 했던 조치는 코드에 남아 있지 않다.

26.07.30 검수에서 24장 원본을 승인·실패 기준에 맞춰 전수 육안 확인했고, 공개 파일 24장과 KO/EN 연결 48곳의 id·단계·URL·대체 텍스트를 일대일 대조했다. 공개본은 전부 640×640 WebP이며 1024×1024 승인 후보를 quality 88로 변환한 바이트와 일치했다. `tsc --noEmit`과 전체 `build:web`, KO/EN 3개 코스 경로 6곳 및 이미지 URL 24곳의 개발 서버 응답도 통과했다.

`music/harmony`는 전용 구현이 따로 있다. `components/features/library/academy/HarmonyLesson/`과 `SheetMusic.tsx`(악보)다. 레슨 데이터 타입(`LessonSection`)은 단계(`steps`)·목표(`objectives`)·악보 예제(`sheetExamples`)·퀴즈(`quiz`)를 갖는다.

**레슨 본문이 쓸 수 있는 마크다운은 제한적이다.** `HarmonyLesson/sections/MarkdownRenderer.tsx`가 처리하는 것은 문단(`\n\n` 분리), `- ` 목록, 모든 줄이 `|`로 시작하는 표, 그리고 인라인 `**굵게**`·백틱 코드뿐이다. **코드펜스(```)와 제목(`#`)은 지원하지 않아** 그대로 글자로 노출된다. 문단 안의 줄바꿈도 줄로 살아나지 않는다.

진도는 `getAcademyLessonProgressState()`가 로그인 여부(`isSignedIn`)와 진행 상태(`progress`)를 함께 내주고, 허브 미리보기와 코스 페이지가 이를 각각 받는다.

## 서버 액션

`sw/web/src/actions/library/`가 이 영역의 데이터를 댄다.

| 파일 | 역할 |
|---|---|
| `era.ts` | 시대별 집계 |
| `profession.ts` | 직군별 콘텐츠 수 |
| `chosen.ts` | 선택된 콘텐츠 목록 |
| `celebs.ts` | 시대 전반 상위 인물 |
| `curated.ts` | 기관 선정 — 기관·목록·작품 조회 |
| `samples.ts` | 직군별 콘텐츠 표본 |
| `today-figure.ts` | 오늘의 인물. 조회 결과에 KST 편성일을 함께 담고 홈·상세의 날짜 표시에 그대로 사용한다 |
| `academyProgress.ts` | 학당 진도 |
| `helpers.ts` · `types.ts` · `index.ts` | 공용 헬퍼·타입·배럴 |

### 감상 인원 수는 필요한 작품만 묻는다

`fetchUserContentCounts(db)` 를 인자 없이 부르면 `get_user_content_counts` 가 `member_contents` 전체를 `contents` 와 조인해 집계한다. 26.09.04에 `/explore/works/popular` 가 그 호출로 **문 시간을 넘겨(57014) 서버 렌더가 통째로 실패**했다. 결과가 비면 감상 인원이 0으로 굳으므로 코드가 일부러 에러를 던지는 자리다.

**쓸 작품의 id 를 모아 넘긴다.** 그러면 `get_content_celeb_user_counts` 로 범위가 좁혀진다. id 가 많으면 그것도 무거우므로 500개씩 나눠 부르고 합친다.

```ts
const contentIds = [...new Set(typedData.map(item => item.content_id))]
const userCountMap = await fetchUserContentCounts(db, undefined, contentIds)
```

캐시(`unstable_cache`)가 평소에는 이 호출을 가려 주지만, 캐시가 비는 순간 그대로 드러난다. 캐시를 믿고 무거운 쿼리를 두지 않는다.

## 연계 문서

- 화면 지도: [README.md](README.md)
- 탐색 공통 구조·인물 모드: [explore.md](explore.md)
- 기관 선정 허브·목록·로고: [curated-lists.md](curated-lists.md)
- 콘텐츠·셀럽 데이터: `docs/project/data/02-content.md`, `docs/project/data/03-celeb.md`, `docs/project/celeb/`
- 다국어: `docs/project/platform/i18n.md`
