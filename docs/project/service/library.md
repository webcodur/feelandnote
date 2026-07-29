# 서가 (`(main)/library/*`)

> **최종 실측 체크: 26.07.30** — 부분 대조: 학당 계층·뷰 타입·마크다운 렌더러 범위를 코드와 재대조(AI 분야 신설분 포함). 박물관·허브·액션 절은 26.07.16 대조 그대로

인물의 선택과 매체의 역사를 진열하는 영역이다. 네비게이션 라벨은 "서가", 코드 키는 `scriptures`다.

## 리네이밍 잔재

이 영역은 원래 `/scriptures`(서고)였다. 2026-03-26에 주소를 `/library`로 바꿨고, 옛 주소는 `sw/web/next.config.ts`의 `redirects()`가 영구 리다이렉트(`permanent: true`)로 넘긴다. `/scriptures`, `/scriptures/:path*`, 그리고 로케일 접두어가 붙은 두 형태까지 네 규칙이다.

주소만 바뀌었고 내부 명칭은 손대지 않았다. 아래는 모두 현재도 `scriptures`를 쓴다.

- 서버 액션: `sw/web/src/actions/scriptures/`
- 컴포넌트: `sw/web/src/components/features/scriptures/`
- 상수: `sw/web/src/constants/scriptures.tsx`, `constants/scripturesMuseum.ts`, `constants/scriptures/`
- i18n 네임스페이스: `scriptures.*`
- 네비게이션 키: `NAV_ITEMS`의 `scriptures`, `HOME_SECTIONS`의 `scriptures`, 홈 섹션 id `scriptures-section`
- 허브 설정: `SCRIPTURES_SECTIONS`, `SCRIPTURES_GROUP_ID`

**내부 명칭은 앞으로도 바꾸지 않는다** (26.07.16 결정). 주소 리네이밍과 내부 식별자는 별개 문제이며, 액션·컴포넌트·상수·i18n 네임스페이스·네비 키를 일괄 개명하면 범위 대비 위험만 크다. `code-rules.md`의 "사용자 노출 용어" 규칙과 같은 원칙이다 — **사용자에게 보이는 것만 정본 용어를 쓰고, 코드 내부 식별자는 건드리지 않는다.**

머리말 주석이 옛 경로(`/app/(main)/scriptures/...`)를 가리키던 9건은 26.07.16에 실제 경로로 교정했다. 기록관의 `collections/[id]/tiers` 주석이 옛 `archive/playlists`를 가리키던 것도 함께 고쳤다.

## 화면 목록

| 경로 | 역할 | 데이터 출처 |
|---|---|---|
| `/library` | 허브. 하위 5개 미리보기를 쌓는다 | `getTodayFigure`, `getScripturesByEra`, `getProfessionContentCounts`, `getContentSamplesByProfession`, `getAcademyLessonProgressState` |
| `/library/era` | 불후의 명작. 전 시대 + 시대별 인물의 선택 | `getScripturesByEra`, `getChosenScriptures`, `getTopCelebsAcrossAllEras` |
| `/library/profession` | 갈림길. 분야별 인물의 필독서 | `getProfessionContentCounts` |
| `/library/museum` | 박물관. 매체 역사 전시 | `constants/scripturesMuseum.ts` (정적 JSON) |
| `/library/academy` | 학당. 카테고리 4종 카드 | `ACADEMY_CATEGORY_IDS` (정적) |
| `/library/academy/[category]` | 카테고리 진입 → 첫 코스로 리다이렉트 | — |
| `/library/academy/[category]/[course]` | 코스 본문(레슨) | `getAcademyLessonProgressState`. 레슨 목록(`ACADEMY_CONTENT_FILTERS`)은 페이지가 아니라 `AcademyLessonView`가 읽는다 |
| `/library/figure` | 레거시. `/explore/today`로 리다이렉트 | — |

`/library/figure`는 페이지 리다이렉트와 `next.config.ts` 리다이렉트가 둘 다 있다.

## 레이아웃·허브

`library/layout.tsx`가 공통 배너(`ScripturesBanner`)와 `PageContainer`를 씌운다.

허브(`/library`)는 `HubNav` + `HubSection` 5개를 쌓는다. 순서·라벨키·더보기 주소는 `hubSectionUtils.tsx`의 `SCRIPTURES_SECTIONS`가 단일원천이다.

| # | 섹션 | 미리보기 컴포넌트 | 더보기 |
|---|---|---|---|
| 1 | 오늘의 인물 | `FigurePreview` | `/explore/today` |
| 2 | 불후의 명작 | `EraPreview` | `/library/era` |
| 3 | 갈림길 | `ProfessionPreview` | `/library/profession` |
| 4 | 박물관 | `MuseumPreview` | `/library/museum` |
| 5 | 학당 | `AcademyPreview` | `/library/academy` |

1번 섹션의 더보기가 `/explore/today`라서, 서가 허브의 첫 항목만 탐색 영역으로 나간다. 서가 하위 링크(`navigation.tsx`의 `subLinks`)는 era·profession·museum·academy 4개뿐이고 오늘의 인물은 빠져 있다.

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

**`book/reading`은 미완성이다.** `MUSEUM_CATEGORY_IDS`·`ACADEMY_CATEGORY_IDS` 어디에도 `reading` 서브카테고리가 없어 도달할 수 없고, `comparison` 뷰를 그리는 코드도 없다(전역 검색 결과 `comparison` 히트는 전부 독서 워크스페이스 `[locale]/reading/` 것으로 무관하다). 데이터(`BOOK_READING_HISTORY_TIMELINE`)는 2개 era만 있다. 살리려면 뷰 신규 구현 + 메뉴 등록 + 데이터 확충이 필요하므로 새 기능 개발에 해당한다. 죽은 설정이지만 의도를 남기려 제거하지 않고 상수에 주석으로 명기했다.

전시 데이터는 DB가 아니라 정적 JSON이다. `constants/scriptures/{ko,en}/{book,video,music,game}.json`을 `getScripturesData(locale)`가 로케일별로 캐시해 내준다.

## 학당 계층

`/library/academy` → `[category]` → `[course]` 3단이다.

- **`/library/academy`**: `ACADEMY_CATEGORY_IDS`를 카드 4장으로 깐다. 각 카드는 그 카테고리의 **첫 코스**로 바로 보낸다(`/library/academy/{cat}/{firstCourse}`). 카드 아이콘은 페이지 안의 `CATEGORY_ICONS` 맵이 정한다 — **카테고리를 늘릴 때 이 맵도 함께 늘려야 한다**(빠지면 `Icon`이 undefined가 되어 렌더가 깨진다).
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

박물관도 4종(게임 포함)이지만 구성이 다르다. 학당에는 `game`이 없고 대신 `ai`가 있다.

`ai`는 26.07.30에 넣었다. 그전까지 학당은 감상 매체(도서·영상·음악)만 다뤘다. 코스 3종은 원리(`foundations`) → 활용(`prompting`) → 결과물과 쟁점(`creation`) 순서로 이어지고, 세 코스가 서로를 참조하므로 **레슨을 재배치할 때 앞 코스를 가리키는 서술이 깨지지 않는지 확인해야 한다.**

각 코스가 담는 레슨 id 목록은 `ACADEMY_CONTENT_FILTERS`가 정한다. `music/harmony`만 12개이고 나머지 여덟 코스는 모두 8개다. 모든 학당 코스의 `SUB_CATEGORY_VIEW_TYPE` 값은 `lesson`이다.

레슨 본문은 정적 JSON이다. `constants/scriptures/{ko,en}/`의 `book-academy.json`·`video-academy.json`·`music-harmony.json`·`ai-academy.json` 네 벌이고, `getScripturesData(locale)`가 로케일별로 캐시해 내준다. 카테고리와 레슨 파일을 잇는 곳은 `AcademyLessonView`의 `getLessonSource()`다. **분기에 없는 카테고리는 화성학 레슨으로 조용히 폴백하므로**, 카테고리를 늘릴 때 이 함수도 함께 늘린다.

`music/harmony`는 전용 구현이 따로 있다. `components/features/scriptures/academy/HarmonyLesson/`과 `SheetMusic.tsx`(악보)다. 레슨 데이터 타입(`LessonSection`)은 단계(`steps`)·목표(`objectives`)·악보 예제(`sheetExamples`)·퀴즈(`quiz`)를 갖는다.

**레슨 본문이 쓸 수 있는 마크다운은 제한적이다.** `HarmonyLesson/sections/MarkdownRenderer.tsx`가 처리하는 것은 문단(`\n\n` 분리), `- ` 목록, 모든 줄이 `|`로 시작하는 표, 그리고 인라인 `**굵게**`·백틱 코드뿐이다. **코드펜스(```)와 제목(`#`)은 지원하지 않아** 그대로 글자로 노출된다. 문단 안의 줄바꿈도 줄로 살아나지 않는다.

진도는 `getAcademyLessonProgressState()`가 로그인 여부(`isSignedIn`)와 진행 상태(`progress`)를 함께 내주고, 허브 미리보기와 코스 페이지가 이를 각각 받는다.

## 서버 액션

`sw/web/src/actions/scriptures/`가 이 영역의 데이터를 댄다.

| 파일 | 역할 |
|---|---|
| `era.ts` | 시대별 집계 |
| `profession.ts` | 직군별 콘텐츠 수 |
| `chosen.ts` | 선택된 콘텐츠 목록 |
| `celebs.ts` | 시대 전반 상위 인물 |
| `samples.ts` | 직군별 콘텐츠 표본 |
| `today-figure.ts` | 오늘의 인물 |
| `academyProgress.ts` | 학당 진도 |
| `helpers.ts` · `types.ts` · `index.ts` | 공용 헬퍼·타입·배럴 |

## 연계 문서

- 화면 지도: [README.md](README.md)
- 탐색(오늘의 인물 본편): [explore.md](explore.md)
- 셀럽 데이터: `docs/project/db-celeb.md`, `docs/project/celeb/`
- 다국어: `docs/project/i18n.md`
