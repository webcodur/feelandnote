# 서비스 화면 (sw/web)

> **화면 지도 최종 실측: 26.07.30 · 인물 상세 테마 연결 코드·파일 대조: 26.08.03**

사용자 대면 웹(`sw/web`)의 화면 지도다. 백오피스(`sw/web-bo`)·데이터 파이프라인은 다루지 않는다.

라우팅은 App Router이며 모든 화면이 `src/app/[locale]/` 아래에 있다(`locale` = `ko` | `en`). 네비게이션 단일원천은 `sw/web/src/constants/navigation.tsx`다.

## 문서 목록

| 문서 | 영역 | 경로 |
|---|---|---|
| [library.md](library.md) | 작품 | `(main)/library/*` |
| [agora.md](agora.md) | 광장 | `(main)/agora/*` |
| [profile.md](profile.md) | 프로필·기록관 | `(main)/[userId]/*` |
| [explore.md](explore.md) | 인물 | `(main)/explore/*` |

쉼터(`(main)/rest/*`)는 게임 영역이라 이 묶음에서 제외한다.

## 라우트 그룹

| 그룹 | 레이아웃 | 구성 |
|---|---|---|
| `(main)` | `LayoutMain` + `QuickRecordProvider` | 홈, 인물, 작품, 광장, 프로필·기록관, 쉼터, 셀럽 상세, 콘텐츠 상세, 알림 |
| `(standalone)` | `(main)`과 동일(`LayoutMain` + `QuickRecordProvider`) | 검색(`/search`) |
| `(policy)` | 자체 레이아웃(로고 헤더 + 3xl 본문) | 서비스 소개, 문의, 이용약관, 개인정보처리방침 |

`(main)`과 `(standalone)`은 현재 레이아웃 구현이 동일하다. `(standalone)`의 파일 주석은 "사이드바 메뉴에 포함되지 않는 독립 페이지"라는 의도를 밝히지만, 코드상 렌더 결과 차이는 없다.

그룹 밖에 있는 라우트도 존재한다. `(auth)`(로그인·가입·비밀번호 재설정), `/reading`·`/reading/[contentId]`(독서 워크스페이스, 자체 라우트), `/lab/*`(실험 화면)이다. 이 문서 묶음의 범위 밖이다.

## `(main)` 화면 지도

```
(main)/
  page.tsx                  # 홈 — 오늘의 인물, 기록 섹션, 자유게시판 미리보기, 탭 섹션, 영상관 통합 히어로
  explore/                  # 인물 → explore.md
  library/                  # 작품 → library.md
  agora/                    # 광장 → agora.md
  [userId]/                 # 프로필·기록관 → profile.md
  rest/                     # 쉼터 (범위 밖)
  celeb/[slug]/             # 셀럽 상세 (slug 기반 정본 주소)
  content/[contentId]/      # 콘텐츠 상세
  notifications/            # 알림 목록 (클라이언트 컴포넌트, 최대 100건)
```

셀럽 상세의 02번 구획은 티어에 따라 갈린다. `full`은 감상·창작 기록물을 표시하고,
`fiction`은 `fiction_source_contents`에 지정된 대표 콘텐츠를 「원전·등장 작품」으로 표시한다.
대표 콘텐츠 상세에서는 같은 관계를 역으로 읽어 「이 작품의 인물」을 보여준다.
이 등장 관계는 감상 관계인 `celeb_contents`와 분리되어 있다.

인물 상세는 국적·생몰연도로 39개 세계를 정해 상단 배너·대표 화보 액자·구획 번호·서체를 바꾼다. 세계 배너 사진은 26.08.03 기준 4판 네이티브 3:1 규격으로 **39/39종 완료**했다. 화면은 `세계 배너 → 인물 입장부 → 기록` 순서이며, 배너·입장부·기록 본문은 같은 최대 1024px 가로축을 쓴다. 배너는 이 파노라마 면을 직접 채워 좌우 검은 칸이나 흐린 확대 채움을 만들지 않는다. 별도 대형 선언문과 PC 목차의 중복 인물 카드는 제거했다. PC 목차는 항목 아이콘·번호를 없애고 상단에 나침반 아이콘 하나와 외곽선을 둔 독립 박스로 만들어 1024px 본문 바깥 왼쪽 여백에 24px 간격으로 배치한다. 항목은 가운데 정렬하며 본문 폭을 나눠 쓰지 않는다. 대표 화보가 없는 인물은 같은 240px 인물 열에 큰 원형 아바타를 두는 정식 대체 레이아웃을 쓴다. 직군 기반 색 테마는 폐기했고 직군은 아이콘·명칭에만 쓴다. 바깥 배경·UI 면·테두리는 세계 ID를 5개 재질 계열로 배정해 39/39 운영 적용했으며, `/lab/celeb-themes`에서 개별 재질 15종과 대표 조합 5종을 같은 토큰으로 검증한다. 전체 결정 규칙은 `docs/project/celeb-detail-themes.md`, 배너 제작 규격과 완료 현황은 `docs/project/celeb-world-banners.md`가 쥔다.

## 네비게이션 단일원천

`navigation.tsx`의 `NAV_ITEMS`는 5개 항목이다. 각 항목의 `showInHeader` · `showInBottomNav` · `showInHomePage` 플래그로 PC 헤더 · 모바일 바텀탭 · 홈 섹션 노출을 가른다.

| key | 라벨 | href | 헤더 | 바텀탭 | 홈 섹션 |
|---|---|---|---|---|---|
| `home` | 홈 | `/` | — | O | — |
| `explore` | 인물 | `/explore` | O | O | O |
| `library` | 작품 | `/library` | O | O | O |
| `rest` | 쉼터 | `/rest` | O | O | — |
| `archive` | 내 기록 | `/{userId}` | — | O | O |

광장(`/agora`)은 `NAV_ITEMS`에 없다. 풋터의 `FOOTER_MISC_LINKS`(소셜·공지사항·피드백)로만 노출된다.

`FOOTER_NAV_ITEMS`는 `subLinks`가 있고 `rest`가 아닌 항목만 추린다. 결과적으로 풋터에는 인물·작품 두 항목의 하위 링크가 나열된다. 브랜드 링크(`FOOTER_BRAND_LINKS`)는 서비스 소개·검색·이용약관·개인정보처리방침·문의하기다.

## 허브 구성 단일원천

인물·작품은 허브 페이지 하나에 미리보기 섹션을 쌓고, 각 섹션에서 하위 화면으로 보낸다. 섹션 순서·라벨키·더보기 주소는 `sw/web/src/components/shared/hubSectionUtils.tsx`가 단일원천이다(`EXPLORE_SECTIONS`, `EXPLORE_STANDALONE`, `LIBRARY_SECTIONS`). 허브 네비게이터(`HubNav`)와 각 섹션(`HubSection`)이 이 설정에서 라벨·순서·번호를 함께 읽는다.

## 화면 이름 변경 이력

**26.08.07 — 「탐색」을 「인물」로, 「서가」를 「작품」으로 바꿨다.** 두 메뉴가 사람 축과 작품 축으로 짝을 이루게 하려는 것이다. 「서가」는 도서관 용어라 일상어가 아니라는 지적이 있었고, 책만 담는 어감인데 실제로는 영상·음악·게임도 담고 있었다. 주소(`/explore`·`/library`)와 코드 키는 바꾸지 않았다.

- 화면에 뜨는 글자: `messages/<locale>/nav.json`의 `nav.explore`·`nav.library`
- `navigation.tsx`의 `label`은 **개발용 참고값이라 화면에 안 뜬다.** 이름을 바꿀 때 둘을 함께 고친다
- 화면 제목 접미도 함께 정리했다 — 상위 이름을 접미로 쓰되, 제목에 같은 말이 이미 있으면 접미를 뺀다("오늘의 인물 | 인물"이 되지 않도록)
- 배너 영문 부제는 `home.<key>.englishTitle`에 있다. 인물 `Notable Figures` / 작품 `Curated Works`

**26.08.07 실제 화면 확인** — 개발 서버에서 두 허브·학당·인기 작품을 열어 배너 제목, 헤더 메뉴, 하단 탭, 빵부스러기, 화면 제목이 모두 새 이름으로 바뀐 것을 눈으로 확인했다. 하단 탭은 글자 수가 이전과 같아(두 글자) 좁은 화면에서도 줄바꿈이 없다.

> **확인 중 걸린 것 — 인기 작품 구역이 통째로 사라져 있었다.** 처음에는 "개발 환경의 캐시가 굳은 것이라 코드 결함이 아니다"로 판단했으나 **틀렸다.** 조회가 실패해도 빈 목록을 정상 결과처럼 돌려주고 있었고, 그 빈 값이 7일짜리 캐시에 박히는 구조였다. 같은 사고가 셀럽 목록에서 이미 났던 것이라(`docs/project/celeb/celeb-gotchas.md` §1) 재발 방지까지 적혀 있었는데 이 조회에는 적용되지 않았다. 26.08.07에 조회 실패를 캐시하지 않도록 고치고 캐시를 비워 복구했다. 자세한 내용과 남은 위험 지점은 `docs/project/tooling-gotchas.md` §3.

## 코드 명칭과 화면 명칭의 불일치

작품 영역은 2026-03-26에 `/scriptures`에서 `/library`로 주소가 바뀌었다. 당시엔 "주소만 바꾸고 내부 명칭은 그대로 둔다"고 정했으나 **그 뒤 코드가 전부 개명됐고, 지금 옛 이름은 DB 함수 두 개뿐이다**(26.08.06 실측). 자세한 내용은 [library.md](library.md)의 "리네이밍 잔재" 절을 본다.

기록관 쪽도 비슷하다. 컬렉션 상세 티어 화면(`[userId]/reading/collections/[id]/tiers/page.tsx`)의 파일 주석은 옛 경로 `/app/(main)/archive/playlists/[id]/tiers/page.tsx`를 가리킨다. 코드 내부에서 컬렉션은 `flow`(플로우)로 불린다.

## 연계 문서

- 아키텍처 전반: `docs/project/architecture.md`
- 백오피스: `docs/project/web-bo.md`
- 다국어: `docs/project/i18n.md`
- SEO: `docs/project/seo.md`
- 코드 규칙: `docs/project/code-rules.md`
- 셀럽 데이터: `docs/project/celeb/`, `docs/project/db-celeb.md`
