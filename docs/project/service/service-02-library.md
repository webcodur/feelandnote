# 작품 (`(main)/explore/works/*`)

인물의 선택과 매체의 역사를 진열하는 **작품** 화면이다. 정본 주소는 `/explore/works`이며, 주요 메뉴에서 직접 연다. 메뉴 배치는 [서비스 화면 지도](README.md)가 쥔다. 서버 액션·컴포넌트·번역의 내부 이름은 `library`를 유지한다.

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
| `/explore/works` | **베스트셀러**(작품 모드 첫 화면). 분야 선택과 도서·영상·게임·음악 순위, 아래 「주제별 탐색」 안내 | `getBestsellers`, `getMusicChart`, `getStoreChart`, `getSteamChart` |
| `/explore/works/popular?mode=classics` | **불후의 명작.** 인물이 감상한 작품을 시대·직군·매체로 탐색. `mode` 없는 옛 베스트셀러 주소는 분야·출처 조건을 들고 `/explore/works`로 영구 이동 | `getChosenLibrary`, `getProfessionContentCounts` |
| `/explore/works/curated` | **기관 선정.** 대학·언론·시상 기관이 발표한 선정 목록 카드 | `getCuratedHub` |
| `/explore/works/curated/[curator]` · `/[curator]/[list]` | 기관 상세 · 목록 상세 | `actions/library/curated.ts` |
| `/explore/works/museum` | 박물관. 매체 역사 전시 | `constants/libraryMuseum.ts` (정적 JSON) |
| `/explore/works/academy` | 학당. `ACADEMY_CATEGORY_IDS` 4종을 카드로 깐다 | `ACADEMY_CATEGORY_IDS` (정적) |
| `/explore/works/academy/[category]` | 카테고리 진입 → 첫 코스로 리다이렉트 | — |
| `/explore/works/academy/[category]/[course]` | 코스 본문(레슨) | `getAcademyLessonProgressState`. 레슨 목록(`ACADEMY_CONTENT_FILTERS`)은 페이지가 아니라 `AcademyLessonView`가 읽는다 |

## 레이아웃·허브

`explore/works/layout.tsx`가 배너(`LibraryBanner`)와 `PageContainer`를 씌운다. 상위 탐색 레이아웃은 작품 화면을 그대로 통과시켜 배너와 여백이 겹치지 않게 한다. 두 모드의 공통 배너·소개·검색 패널·카드 반응·페이지 이동 규칙은 [탐색](service-01-explore.md)이 쥔다.

작품 상세(`/content/[contentId]`)는 인물 상세와 같은 `PageContainer`·`HubSection`·`AtlasNav`와 공통 상세 폭을 쓴다. 첫 구획 「작품 정보」는 배너 아래 표지·제목·서지·기록·공유·판본 선택을 모으고, 「작품 소개」 전문을 표지 오른쪽 정보 열에 이어 표시하고, 모바일에서는 아래 전체 너비로 옮긴다. 도서 배너는 `lib/books/bookBanner.ts`가 분류한다. 기기별 이미지 전환·표시·원본 로드 실패 시 대체 처리는 인물 상세와 같은 `components/shared/DetailBanner.tsx`를 쓴다. 배너 원본은 `public/images/content/banners/`에 두고, `lib/contentBannerAssets.ts`가 PC·모바일별 해시 키로 등록한 R2 공개 주소를 연결한다. 공개 감상 인물의 시대·문화권과 작품 발행일을 사용하며, 판본 발행일로 고전을 현대 도서로 바꾸지 않는다. 도서 외 배너는 영상의 가로 배경·게임 스크린샷을 먼저 쓰고, 없거나 로드에 실패하면 `lib/contentBanner.ts`가 장르별 이미지를 고른다. 영상·게임의 한영 장르 배열과 음악의 단일 장르 값 모두 처리하며, 표시 언어를 걸러내기 전에 테마를 정해 국문·영문을 맞춘다. 장르가 없거나 대응되지 않을 때만 매체별 기본 배너를 쓴다. 포스터·음반 표지는 배너로 확대하지 않는다. 구획 머리는 공용 번호·제목을 유지하면서 여백을 줄이고, 모바일도 작은 표지와 핵심 정보를 나란히 둔다. 관련 인물·기관 선정·내 리뷰·내 노트·다른 리뷰·최근 본 작품은 실제 표시된 순서대로 구획 번호와 목차를 맞춘다. 「내 리뷰」는 직접 작성과 짧은 반응 중 하나로 기록한다. 짧은 반응을 선택하면 별점·본문·스포일러 설정이 비활성화된다. 본문 칸을 클릭하거나 선택한 반응을 다시 누르면 선택을 해제하고 작성 중이던 내용으로 돌아간다. 별도 전환 버튼·제목·안내 문구는 두지 않는다. 반응 저장은 기존 `review_presets`만 갱신하며 비활성화된 초안은 저장하지 않는다. 직접 작성으로 저장하면 반응을 비운다. 외부자료 탐색은 제공하지 않는다. 리뷰 카드는 전문을 기본으로 표시하고 아주 긴 리뷰만 「더보기」로 펼친다. 장문 판정은 `ReviewCard.tsx`가 실제 표시 높이로 판단하며 카드 내부 세로 스크롤은 두지 않는다. 구매·감상은 표지 아래 공통 모듈을 쓰며, 음악 표지는 정사각형으로 표시한다.

첫 화면은 **베스트셀러**다(`explore/works/page.tsx` → `sections.tsx`의 `BestsellerMain` → `BestsellerSection`). 첫 화면에서 곧바로 작품의 표지가 보여야 한다 — 기관 선정을 첫 화면에 두었을 때는 기관 로고나 선정 목록이 먼저 나와 작품까지 두 번 더 눌러야 했다(26.09.28 유저 지시로 자리 교체). 그 아래 기관 선정·불후의 명작·박물관·학당은 `ExploreFeatureCard`와 [FNN-흑동주조](../production/prod-01-image-generation.md#fnn-흑동주조) 이미지로 안내한다. 그림·재편 표시는 `constants/exploreLenses.ts`가 쥔다. 박물관·학당은 카드와 진입 화면에 「재편 중」을 표시하되 현재 콘텐츠는 계속 열어 둔다. 재편 중 카드는 큰 카드 아래 낮은 줄 카드로 둔다(`REORGANIZING_WORK_LENSES`). 첫 목록에서는 큰 모드 탭·번호 구획 제목을 두지 않고, 공용 아틀라스 목차로 아래 「주제별 탐색」 안내 카드에 이동한다([인물](service-01-explore.md)). 링크와 푸터는 `navigation.tsx`의 `WORKS_LINKS`를 공유한다.

하위 화면은 선택한 항목의 이름을 배너 경로 줄에 표시하고 해당 목록·필터만 보여준다. 불후의 명작은 `/explore/works/popular?mode=classics`로 진입하며 메타·canonical·사이트맵과 한영 웜업(`scripts/lib/oracle-web-remote.mjs`·`.github/workflows/warm-web.yml`)도 이 주소를 쓴다. 옛 베스트셀러 주소(`/explore/works/popular`, `mode` 없음)는 사이트맵·웜업에서 빼고 페이지가 `/explore/works`로 영구 이동시킨다.

## 인기 작품 갱신

`/explore/works`는 `category=BOOK|VIDEO|GAME|MUSIC`으로 분야를 고른 뒤 `source`로 출처를 고른다(기본값은 주소에 싣지 않는다). 분야는 랭킹과 같은 각진 칩(`CategoryChip.tsx`)으로 표시하며, 기관 선정·검색·광장·박물관·학당의 카테고리 선택도 같은 계열을 쓴다. 모양과 선택 강조는 `exploreNavLayout.ts`, 매체별 대표색은 `constants/categoryColors.ts`가 쥔다. 분야를 바꿀 때 보던 자리를 지킨다. 출처 고르기 줄은 한 분야에 출처가 둘 이상일 때만 세운다 — 지금은 분야마다 하나라 칩 하나가 고를 것 없이 자리만 차지했다. 출처 목록·기본 선택·연동 여부·원본 주소는 `lib/library/chartSources.ts`가 쥐며, 다른 분야나 언어의 출처가 주소에 남아 있으면 해당 분야의 기본 출처를 선택한다. `ChartSourceNotice`는 칩 아래 결과 줄 자리에 선다 — 첫 줄은 무엇의 순위인지(「국내 도서 · 일별 판매 순위」), 둘째 줄은 갱신 시각과 「YES24에서 원본 보기」, 제휴 수수료가 발생하는 출처만 공통 구매 고지를 한 줄 더 붙인다. 영상·게임·음악도 도서와 같은 공통 작품 카드로 순위·표지·제목을 나열하며, 좁은 화면에서는 두 열로 나열하고 넓은 화면에서는 가운데 정렬해 줄바꿈한다. 카드 본체를 누르면 작품 정보 모달(`ChartWorkModal`)을 연다. 소개문을 제공하는 정보 모달에서는 중복 INTRO를 생략한다. 소개문이 없는 영상·게임 항목은 INTRO를 유지하고, 음악은 공식 차트에 소개문이 없어 소개 단추를 만들지 않는다. 영상은 공식 피드의 줄거리·장르·공개일, 게임은 Steam 앱 ID에 맞는 소개·개발사·배급사, 음악은 공식 피드의 발매일·장르·명시적 콘텐츠 표시를 제공한다. 음악 소개문이나 가사는 만들어 넣지 않는다. 카드 하단의 「구매 및 감상」은 [공통 구매·감상 모달](../operations/ops-03-affiliate-commerce.md)을 바로 열고, 정보 모달의 같은 단추는 구매 창으로 전환한다. Apple 공식 배지는 실제 서비스 링크에 둔다.

도서는 한국어에서 예스24 일별 베스트셀러, 영문에서 미국 Apple Books 유료 전자책 차트를 보여준다. 도서만 20위까지 받아 오므로 처음에는 10위까지 보이고 「11~20위 더 보기」로 나머지를 편다(`BookChartGrid.tsx`) — 다른 분야와 첫 화면 길이를 맞춘다. 한국어는 순위 기준일, 영문은 확인 시각과 출처를 표시하며 전체 도서 시장이나 실시간 판매량으로 표현하지 않는다. 음악은 `actions/library/musicChart.ts`와 `lib/library/musicChart.ts`가 한국·미국 Apple Music 인기곡을 읽고 검증한다. 영상은 `actions/library/storeChart.ts`와 `lib/library/storeChart.ts`가 한국·미국 Apple 영화 스토어의 공개 RSS를 읽으며 극장·OTT 전체나 Apple TV 구독작 순위로 표현하지 않는다. Apple 목록에는 공식 배지·작품 링크·피드 갱신 시각을 함께 표시한다.

게임은 Steam 전 세계 동시 플레이 순위를 기본으로 표시한다. `actions/library/steamChart.ts`와 `lib/library/steamChart.ts`가 공개 Web API의 순위와 상품 정보를 앱 ID로 대조해 게임명·표지·소개·개발사·배급사·동시 플레이어 수·오늘 최대 인원·집계 시각을 제공한다. 게임이 아닌 소프트웨어와 미확인 상품은 제외하고 공식 순위 번호를 유지한다. 캐시 갱신·만료 기준은 코드가 쥔다. PlayStation·Xbox·IGDB는 실제 목록 연동 전까지 출처 설정에서 주석 처리해 화면에 표시하지 않으며, 해당 출처의 옛 주소로 들어와도 표시 가능한 기본 목록을 연다. 서로 다른 지표를 종합 순위로 합치거나 모바일 앱 차트로 대신하지 않는다. TMDB 트렌딩·IGDB 인기 지표 연동은 별도의 상업 이용 확인을 기다린다. 선택한 분야만 서버에서 조회하며 외부 차트 메타를 DB에 등록하지 않는다. 불후의 명작은 기존 내부 작품 카드와 시대·직군·매체 필터를 유지한다.

`actions/library/bestsellers.ts`가 공식 API·피드를 서버 캐시로 읽고 `lib/library/bestsellerFeed.ts`가 검증과 유효기간을 담당한다. 이용할 수 없는 목록은 준비 중으로 표시하며 오래된 수집 파일로 대체하지 않는다. `BookChartGrid`와 `BestsellerFreshness`가 차트를 그린다. 차트는 인물 상세 「참고도서」와 같은 공통 상품 목록(`components/shared/AffiliateBookList.tsx`)으로 순위·표지·제목과 구매 단추를 그린다. 카드 본체는 외부 페이지로 이동하지 않고 책 정보 모달(`Yes24BookModal`)을 연다. 한국어는 YES24 상품 상세 API(`getYes24BookDetail`, ISBN 단위 하루 캐시)의 표지·서지·가격·평점·책 소개를 표시한다. 영문은 `getAppleBookDetail`이 미국 차트의 도서 ID로 조회·검증한 소개문·발행일·장르를 표시하고 소개 출처를 붙인다. DB에는 등록하지 않으며 Apple 가격을 Amazon 가격으로 표시하지 않는다. 책·다른 매체·일반 작품 소개는 공통 정보 창(`ContentInfoDialog`)의 표지·서지·본문·고정 하단 구매 단추를 쓴다. 구매 단추는 공통 서점·감상처 창으로 전환하며 카드 아래 같은 단추로도 바로 열 수 있다. 영문 도서는 저장 Amazon 상품 주소가 없으면 선택 판본 ISBN, 없으면 제목·저자로 Amazon 도서 검색을 연다. 상단 Apple Books 링크는 순위 출처로 표시한다. 예스24 활성화 조건과 발급처는 [환경변수](../platform/platform-04-env-vars.md), 공급처 운영 조건은 [외부 서비스](../platform/platform-05-external-services.md)를 따른다.

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
| `today-figure.ts` | 오늘의 인물. 접속 국가의 공개 감상 후보를 우선하고 후보가 없으면 기존 세계 편성으로 돌아간다. 추천 노출 제외와 감상 자격을 유지하며, 조회 결과의 KST 편성일을 홈·상세 날짜 표시에 그대로 사용한다 |
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
- 탐색 공통 구조·인물 모드: [service-01-explore.md](service-01-explore.md)
- 기관 선정 허브·목록·로고: [service-03-curated-lists.md](service-03-curated-lists.md)
- 콘텐츠·셀럽 데이터: `docs/project/data/data-02-content.md`, `docs/project/data/data-03-celeb.md`, `docs/project/celeb/`
- 다국어: `docs/project/platform/platform-03-i18n.md`

인기 작품 조회는 실패한 빈 목록을 캐시하지 않는다.
