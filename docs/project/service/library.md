# 작품 (`(main)/library/*`)

> **최종 실측 체크: 26.08.07** — 화면 목록·허브 구역·액션·상수·컴포넌트 경로를 코드와 전량 재대조. 그 사이 개편분(시대별·갈림길 → 인기 작품 통합, 기관 선정 신설, 내부 명칭 전면 개명)이 문서에 반영돼 있지 않았다

인물의 선택과 매체의 역사를 진열하는 영역이다. 네비게이션 라벨은 **"작품"**(26.08.07 개명, 옛 이름 "서가"), 코드 키와 주소는 `library`다.

## 리네이밍 잔재

이 영역은 원래 `/scriptures`(서고)였다. 2026-03-26에 주소를 `/library`로 바꿨고, 옛 주소는 `sw/web/next.config.ts`의 `redirects()`가 영구 리다이렉트(`permanent: true`)로 넘긴다. `/scriptures`, `/scriptures/:path*`, 그리고 로케일 접두어가 붙은 두 형태까지 네 규칙이다.

**26.07.16에는 "주소만 바꾸고 내부 명칭은 그대로 둔다"고 결정했으나, 그 뒤 코드가 전부 개명됐다**(26.08.06 실측). 이 절은 그 결정을 20일 넘게 현행으로 적어 두고 있었다.

| 자리 | 현재 이름 |
|------|------|
| 서버 액션 | `sw/web/src/actions/library/` |
| 컴포넌트 | `sw/web/src/components/features/library/` |
| 상수 | `constants/library.tsx` · `constants/libraryMuseum.ts` · `constants/library/` |
| i18n 파일 | `sw/web/messages/<locale>/library.json` |
| 허브 설정 | `LIBRARY_SECTIONS` · `LIBRARY_GROUP_ID` (`components/shared/hubSectionUtils.tsx`) |
| **아직 옛 이름** | DB 함수 `get_chosen_scriptures` · `get_scriptures_by_era` 둘뿐이다. `actions/library/chosen.ts`·`era.ts`가 호출한다 |

머리말 주석이 옛 경로(`/app/(main)/scriptures/...`)를 가리키던 9건은 26.07.16에 실제 경로로 교정했다. 기록관의 `collections/[id]/tiers` 주석이 옛 `archive/playlists`를 가리키던 것도 함께 고쳤다.

## 화면 목록

| 경로 | 역할 | 데이터 출처 |
|---|---|---|
| `/library` | 허브. 하위 4개 미리보기를 쌓는다 | `getBestsellers`, `getCuratedHub`, `getAcademyLessonProgressState` |
| `/library/popular` | **인기 작품.** 주간 베스트셀러 및 불후의 고전(시대·직군)을 2-Track으로 본다 | `getBestsellers`, `getChosenLibrary`, `getProfessionContentCounts` |
| `/library/curated` | **기관 선정 허브.** 대학·언론·시상 기관이 발표한 목록 | `getCuratedHub` |
| `/library/curated/[curator]` · `/[curator]/[list]` | 기관 상세 · 목록 상세 | `actions/library/curated.ts` |
| `/library/museum` | 박물관. 매체 역사 전시 | `constants/libraryMuseum.ts` (정적 JSON) |
| `/library/academy` | 학당. `ACADEMY_CATEGORY_IDS` 4종을 카드로 깐다 | `ACADEMY_CATEGORY_IDS` (정적) |
| `/library/academy/[category]` | 카테고리 진입 → 첫 코스로 리다이렉트 | — |
| `/library/academy/[category]/[course]` | 코스 본문(레슨) | `getAcademyLessonProgressState`. 레슨 목록(`ACADEMY_CONTENT_FILTERS`)은 페이지가 아니라 `AcademyLessonView`가 읽는다 |
| `/library/figure` | 레거시. `/explore/today`로 리다이렉트 | — |

**시대별(`/library/era`)과 갈림길(`/library/profession`)은 없어졌다.** 둘을 합쳐 인기 작품 한 화면으로 만들었고, 옛 주소는 `next.config.ts`가 `/library/popular`(직군은 `?view=profession`)로 넘긴다. 26.08.07 이전 이 문서는 두 화면이 살아 있다고 적고 있었다.

`/library/figure`는 페이지 리다이렉트와 `next.config.ts` 리다이렉트가 둘 다 있다.

## 레이아웃·허브

`library/layout.tsx`가 공통 배너(`LibraryBanner`)와 `PageContainer`를 씌운다.

허브(`/library`)는 `HubNav` + `HubSection` 5개를 쌓는다. 순서·라벨키·더보기 주소는 `hubSectionUtils.tsx`의 `LIBRARY_SECTIONS`가 단일원천이다.

| # | 섹션 | 미리보기 컴포넌트 | 더보기 |
|---|---|---|---|
| 1 | 인기 작품 | `PopularPreview` | `/library/popular` |
| 2 | 기관 선정 | `CuratedPreview` | `/library/curated` |
| 3 | 박물관 | `MuseumPreview` | `/library/museum` |
| 4 | 학당 | `AcademyPreview` | `/library/academy` |

**이 순서가 곧 이야기다** — 남은 작품(1·2) → 매체가 걸어온 길(3) → 다루는 법과 그 다음(4).

구역 부제(`library.hub`)도 26.08.07에 그 흐름으로 다시 썼다. 앞뒤가 이어지도록 쓰되, **각 부제는 그 구역이 실제로 담은 것만 말한다.**

| 구역 | 부제 |
|---|---|
| 박물관 | 책과 영상, 음악과 게임이 어떤 길을 걸어 지금에 이르렀는지 봅니다. |
| 학당 | 매체를 다루는 법, 그리고 AI와 함께 만드는 법을 배웁니다. |

> 옛 박물관 부제는 "수많은 사상과 창작물들이 어떻게 얽혀있는지"였는데 **이 화면은 사상을 다루지 않는다.** 옛 학당 부제의 "체화하는 수련의 공간"도 실제보다 부풀린 표현이었다.

같은 이유로 두 곳을 더 고쳤다(26.08.07).

- 배너 영문 부제(`home.library.englishTitle`) **Curated Reads → Curated Works.** 이 영역은 책만 담지 않는다. 인물 쪽 `Notable Figures`와 짝이 된다.
- 학당 화면 머리말(`library.academy.defaultDescription`)에서 AI를 뺐다. 화면은 매체 넷을 먼저 세우고 AI를 그 다음 장으로 두는데, 머리말이 AI를 맨 앞에 부르고 있어 순서가 거꾸로였다. **AI는 아래 이음말이 맡는다.**

4번 미리보기(`AcademyPreview`)는 학당 본 화면과 **같은 두 줄 배치**를 축약해 쓴다(매체 넷 + 개발중 게임 / 이음말과 함께 서는 AI). 한쪽만 고치면 첫 화면과 본 화면의 이야기가 어긋나므로 둘을 함께 바꾼다.

**오늘의 인물은 26.08.07에 뺐다.** 인물은 탐색과 홈이 이미 맡고 있었고, 이 구역만 더보기가 `/explore/today`로 나가 사용자를 이 메뉴 밖으로 내보냈다. `FigurePreview`와 `library.hub.figure`·`figureLabel` 문구도 함께 지웠다(`getTodayFigure` 액션은 탐색 쪽에서 계속 쓰므로 남긴다). 하위 링크(`navigation.tsx`의 `subLinks`)는 popular·curated·museum·academy 4개로 허브와 일치한다.

`library/page.tsx`(허브가 곧 이 파일이다)가 `PopularBooks`(쿠팡 제휴)를 임포트하지만 렌더는 주석 처리돼 있다. 코드 주석은 "쿠팡 제휴: AdSense 승인 전까지 비활성"이라 적는다. 탐색 허브와 홈에도 같은 패턴이 있다.

## 박물관 구조

`/library/museum`은 검색 파라미터 `cat`·`sub`를 받아 `MuseumTimeline`에 넘긴다. 카테고리 탭 + 서브 탭 + 간트 차트(`EraGanttChart`) + 시대 섹션(`MuseumEraSection`) + 목차(`MuseumTableOfContents`) + 모바일 네비(`MuseumMobileNav`)를 조합한다.

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

`/library/academy` → `[category]` → `[course]` 3단이다.

- **`/library/academy`**: **26.08.07에 두 줄로 갈랐다.** 윗줄은 사람이 다뤄온 매체(book·video·music + 개발중인 game), 아랫줄은 이음말과 함께 서는 `ai` 하나다. **AI를 매체 옆에 나란히 두면 "다섯 번째 매체"로 읽히기 때문**이고, AI는 앞의 넷 전부를 관통하는 다음 국면이라 줄을 갈랐다. 각 카드는 그 카테고리의 **첫 코스**로 바로 보낸다(`/library/academy/{cat}/{firstCourse}`). 카드 아이콘은 페이지 안의 `CATEGORY_ICONS` 맵이 정한다 — **카테고리를 늘릴 때 이 맵도 함께 늘려야 한다**(빠지면 `Icon`이 undefined가 되어 렌더가 깨진다). 이음말 문구는 `library.academy.bridgeTitle`·`bridgeDesc`다.
  - **개발중 카드는 `ACADEMY_UPCOMING_CATEGORY_IDS`가 따로 쥔다.** 지금은 `game` 하나뿐이고 누를 수 없는 점선 카드로 선다(문구 `upcomingBadge`·`upcomingNote`). `ACADEMY_CATEGORY_IDS`에 섞지 않은 이유는 그 목록이 `courses[0]`이 있다고 전제하는 곳이 다섯 군데(카드·탭·리다이렉트 2곳·미리보기)라서다. **코스를 채우면 이 목록에서 빼고 위로 옮긴다.**
  - AI를 감추던 `VISIBLE_ACADEMY_CATEGORY_IDS`는 코드에 없다(26.08.07 전수 검색 확인).
- **`/library/academy/[category]`**: 페이지 본문이 없다. `ACADEMY_CATEGORY_IDS`에서 카테고리를 찾아 첫 코스로 리다이렉트하고, 없는 카테고리면 `/library/academy`로 되돌린다.
- **`/library/academy/[category]/layout.tsx`**: 제목과 카테고리 탭(`AcademyCategoryTabs`)을 레이아웃에 둔다. 코스를 갈아탈 때 이 부분이 리로드되지 않게 하려는 배치다.
- **`/library/academy/[category]/[course]`**: 카테고리·코스를 검증하고(둘 중 하나라도 어긋나면 리다이렉트) `AcademyLessonView`를 렌더한다.

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

AI 학당의 데이터와 `/library/academy/ai/{foundations|prompting|creation}` 직접 경로는 활성 상태이고, `/library/academy`의 AI 카드도 지금은 함께 노출된다(26.08.07 확인). 26.07.30에 카드만 감추기로 했던 조치는 코드에 남아 있지 않다.

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
| `today-figure.ts` | 오늘의 인물 |
| `academyProgress.ts` | 학당 진도 |
| `helpers.ts` · `types.ts` · `index.ts` | 공용 헬퍼·타입·배럴 |

## 연계 문서

- 화면 지도: [README.md](README.md)
- 탐색(오늘의 인물 본편): [explore.md](explore.md)
- 콘텐츠·셀럽 데이터: `docs/project/data/02-content.md`, `docs/project/data/03-celeb.md`, `docs/project/celeb/`
- 다국어: `docs/project/platform/i18n.md`
