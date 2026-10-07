# 서비스 화면 (sw/web)

사용자 대면 웹(`sw/web`)의 화면 지도다. 백오피스(`sw/web-bo`)·데이터 파이프라인은 다루지 않는다.

라우팅은 App Router이며 모든 화면이 `src/app/[locale]/` 아래에 있다(`locale` = `ko` | `en`). 네비게이션 단일원천은 `sw/web/src/constants/navigation.tsx`다.

## 문서 목록

| 주소 | 문서 | 영역 | 경로 |
|---|---|---|---|
| 01 | [`service-01-explore.md`](service-01-explore.md) | 탐색 공통 배너·조작·카드와 인물 모드, 세력도감·신화 | `(main)/explore/*` |
| 02 | [`service-02-library.md`](service-02-library.md) | 작품 | `(main)/explore/works/*` |
| 03 | [`service-03-curated-lists.md`](service-03-curated-lists.md) | 기관 선정의 검색·목록 카드·로고·목록·데이터 | `(main)/explore/works/curated/*` |
| 04 | [`service-04-celeb-detail.md`](service-04-celeb-detail.md) | 인물 상세의 구획·감상 목록 펼침·작품 소개 | `(main)/celeb/[slug]/*` |
| 05 | [`service-05-profile.md`](service-05-profile.md) | 프로필·기록관 | `(main)/[userId]/*` |
| 06 | [`service-06-agora.md`](service-06-agora.md) | 광장 | `(main)/agora/*` |

쉼터(`(main)/rest/*`)는 게임 영역이라 이 묶음에서 제외한다. 게임 문서는 [`docs/games/README.md`](../../games/README.md)에서 찾는다.

## 라우트 그룹

| 그룹 | 레이아웃 | 구성 |
|---|---|---|
| `(main)` | `LayoutMain` + `QuickRecordProvider` | 홈, 인물, 작품, 광장, 프로필·기록관, 쉼터, 셀럽 상세, 콘텐츠 상세, 알림 |
| `(standalone)` | `(main)`과 동일(`LayoutMain` + `QuickRecordProvider`) | 검색(`/search`) |
| `(policy)` | 자체 레이아웃(로고 헤더 + 3xl 본문) | 서비스 소개, 문의, 이용약관, 개인정보처리방침 |

`(main)`과 `(standalone)`은 현재 레이아웃 구현이 동일하다. `(standalone)`의 파일 주석은 "사이드바 메뉴에 포함되지 않는 독립 페이지"라는 의도를 밝히지만, 코드상 렌더 결과 차이는 없다.

그룹 밖에 있는 라우트도 존재한다. `(auth)`(로그인·가입·비밀번호 재설정), `/lab/*`(실험 화면)이다. 이 문서 묶음의 범위 밖이다.

## `(main)` 화면 지도

```
(main)/
  page.tsx                  # 홈 — 오늘의 인물, 주목할 만한 감상, 검색 급증 인물, 공지
  explore/                  # 탐색 구조·인물 → service-01-explore.md
    works/                  # 작품 → service-02-library.md
  agora/                    # 광장 → service-06-agora.md
  [userId]/                 # 프로필·기록관 → service-05-profile.md
  rest/                     # 쉼터 (범위 밖)
  celeb/[slug]/             # 셀럽 상세 (slug 기반 정본 주소)
  content/[contentId]/      # 콘텐츠 상세
  notifications/            # 알림 목록 (클라이언트 컴포넌트, 최대 100건)
```

인물 상세(`celeb/[slug]/`)의 구획·감상 목록·작품 소개 규격은 [`service-04-celeb-detail.md`](service-04-celeb-detail.md)가 쥔다.

## 네비게이션 단일원천

`navigation.tsx`의 `NAV_ITEMS`는 5개 항목이다. 각 항목의 `showInHeader` · `showInBottomNav` · `showInHomePage` 플래그로 PC 헤더 · 모바일 바텀탭 · 홈 섹션 노출을 가른다.

| key | 라벨 | href | 헤더 | 바텀탭 | 홈 섹션 |
|---|---|---|---|---|---|
| `home` | 홈 | `/` | — | O | — |
| `explore` | 인물 | `/explore` | O | O | O |
| `library` | 작품 | `/explore/works` | O | O | O |
| `rest` | 쉼터 | `/rest` | O | O | — |
| `archive` | 내 기록 | `/{userId}` | — | — | O |

인물과 작품은 각각 주요 메뉴다. 모바일은 홈·인물·작품·쉼터와 음악 재생기 칸을 두며, 내 기록과 친구·팔로우는 헤더 프로필 메뉴로 들어간다. 문의·의견 보내기는 프로필 메뉴와 푸터에 둔다. 중첩 주소의 활성 메뉴는 `activeNavigationHref`가 가장 구체적인 주소 하나로 정한다.

`FOOTER_SECTIONS`가 푸터 네 칼럼(인물, 작품, 쉼터·게시판, 서비스 안내)의 링크를 정한다.

## 허브 구성 단일원천

홈은 오늘의 인물·주목할 만한 감상·검색 급증 인물을 둔다. 최신 공지는 브랜드 줄 아래 한 줄에서 읽고 전체 게시판으로 이동한다. 주목할 만한 감상은 공용 포스터·세로형 인물 아바타·감상배경 전문을 보여 주며, 책에는 공용 구매 및 감상 모듈을 둔다. 오늘의 인물 감상 카드는 표지·서지 아래 전체 폭에서 감상을 읽고 출처·구매 조작을 본문 흐름에 배치한다. 자유게시판 홈 구획은 현재 주석 처리해 표시하지 않는다. 홈 목차 설정은 `hubSectionUtils.tsx`의 `HOME_SECTIONS`가 쥔다. 인물·작품 첫 목록의 화면 위계는 [인물](service-01-explore.md)과 [작품](service-02-library.md)을 따른다.

홈의 「주목할 만한 감상」은 한영 본문·감상 근거·연결 작품을 검수한 도서 감상에서 매일 한국 시간 낮 12시에 한 편만 고른다. 기존 승인 시각으로 날짜별 선정 결과를 재계산하고 반년 안에 선정된 같은 리뷰는 제외하며, 노출 이력을 저장하지 않는다. 새 승인은 다음 정오부터 후보가 되므로 과거 순서에 끼어들지 않는다. 최초 검수일에는 정오 이후 승인된 감상도 사용한다. 후보가 부족한 날은 중복 감상 대신 안내를 보여 준다. 승인 취소·삭제로 과거 후보가 사라지면 재계산 결과가 바뀔 수 있어 중복 방지는 현재 후보 집합을 기준으로 한다. 한영 홈은 같은 리뷰를 보여 주며 공개·완독·비 스포일러·공개 인물 조건을 충족해야 한다. 선택과 제외 기간은 `lib/reviews/featuredReview.ts`, 정오 캐시 갱신은 `scripts/oracle-db/feelandnote-featured-review.cron`이 맡는다.

## 화면 이름

헤더는 **인물·작품·쉼터**, 하단은 **홈·인물·작품·쉼터·음악**이다. 인물(`/explore`)과 작품(`/explore/works`)은 각각 직접 진입하며 큰 모드 전환 탭은 두지 않는다. 「서가」는 책만 담는 어감이라 쓰지 않는다. 주소와 내부 코드 키는 유지한다.

- 화면에 뜨는 글자: 인물·작품 메뉴는 `messages/<locale>/nav.json`의 `nav.explore`·`nav.library`
- `navigation.tsx`의 `label`은 **개발용 참고값이라 화면에 안 뜬다.** 이름을 바꿀 때 둘을 함께 고친다
- 화면 제목 접미는 상위 이름을 쓰되, 제목에 같은 말이 이미 있으면 접미를 뺀다("오늘의 인물 | 인물"이 되지 않도록)
- 허브 배너는 한국어 제목만 둔다. 영문 부제는 그리지 않는다(`components/shared/bannerStyles.ts`)


## 코드 명칭과 화면 명칭의 불일치

작품 화면은 `/explore/works`에 있고 내부 코드·번역 키는 `library`를 유지한다. 이전 주소 처리와 내부 모듈의 위치는 [service-02-library.md](service-02-library.md)를 본다.

기록관 쪽도 비슷하다. 컬렉션 상세 티어 화면(`[userId]/reading/collections/[id]/tiers/page.tsx`)의 파일 주석은 옛 경로 `/app/(main)/archive/playlists/[id]/tiers/page.tsx`를 가리킨다. 코드 내부에서 컬렉션은 `flow`(플로우)로 불린다.

## 연계 문서

- 아키텍처 전반: `docs/project/platform/platform-01-architecture.md`
- 백오피스: `docs/project/apps/apps-01-web-bo.md`
- 다국어: `docs/project/platform/platform-03-i18n.md`
- SEO: `docs/project/operations/ops-02-seo.md`
- 코드 규칙: `docs/project/platform/platform-02-code-rules.md`
- 셀럽 데이터: `docs/project/celeb/`, `docs/project/data/data-03-celeb.md`
