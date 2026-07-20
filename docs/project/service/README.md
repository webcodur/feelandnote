# 서비스 화면 (sw/web)

> **최종 실측 체크: 26.07.16** — 화면 그룹·네비게이션 구성 실측

사용자 대면 웹(`sw/web`)의 화면 지도다. 백오피스(`sw/web-bo`)·데이터 파이프라인은 다루지 않는다.

라우팅은 App Router이며 모든 화면이 `src/app/[locale]/` 아래에 있다(`locale` = `ko` | `en`). 네비게이션 단일원천은 `sw/web/src/constants/navigation.tsx`다.

## 문서 목록

| 문서 | 영역 | 경로 |
|---|---|---|
| [library.md](library.md) | 서가 | `(main)/library/*` |
| [agora.md](agora.md) | 광장 | `(main)/agora/*` |
| [profile.md](profile.md) | 프로필·기록관 | `(main)/[userId]/*` |
| [explore.md](explore.md) | 탐색 | `(main)/explore/*` |

쉼터(`(main)/rest/*`)는 게임 영역이라 이 묶음에서 제외한다.

## 라우트 그룹

| 그룹 | 레이아웃 | 구성 |
|---|---|---|
| `(main)` | `LayoutMain` + `QuickRecordProvider` | 홈, 탐색, 서가, 광장, 프로필·기록관, 쉼터, 셀럽 상세, 콘텐츠 상세, 알림 |
| `(standalone)` | `(main)`과 동일(`LayoutMain` + `QuickRecordProvider`) | 검색(`/search`) |
| `(policy)` | 자체 레이아웃(로고 헤더 + 3xl 본문) | 서비스 소개, 문의, 이용약관, 개인정보처리방침 |

`(main)`과 `(standalone)`은 현재 레이아웃 구현이 동일하다. `(standalone)`의 파일 주석은 "사이드바 메뉴에 포함되지 않는 독립 페이지"라는 의도를 밝히지만, 코드상 렌더 결과 차이는 없다.

그룹 밖에 있는 라우트도 존재한다. `(auth)`(로그인·가입·비밀번호 재설정), `/reading`·`/reading/[contentId]`(독서 워크스페이스, 자체 라우트), `/lab/*`(실험 화면)이다. 이 문서 묶음의 범위 밖이다.

## `(main)` 화면 지도

```
(main)/
  page.tsx                  # 홈 — 오늘의 인물, 기록 섹션, 자유게시판 미리보기, 탭 섹션, 유튜브 선반
  explore/                  # 탐색 → explore.md
  library/                  # 서가 → library.md
  agora/                    # 광장 → agora.md
  [userId]/                 # 프로필·기록관 → profile.md
  rest/                     # 쉼터 (범위 밖)
  celeb/[slug]/             # 셀럽 상세 (slug 기반 정본 주소)
  content/[contentId]/      # 콘텐츠 상세
  notifications/            # 알림 목록 (클라이언트 컴포넌트, 최대 100건)
```

## 네비게이션 단일원천

`navigation.tsx`의 `NAV_ITEMS`는 5개 항목이다. 각 항목의 `showInHeader` · `showInBottomNav` · `showInHomePage` 플래그로 PC 헤더 · 모바일 바텀탭 · 홈 섹션 노출을 가른다.

| key | 라벨 | href | 헤더 | 바텀탭 | 홈 섹션 |
|---|---|---|---|---|---|
| `home` | 홈 | `/` | — | O | — |
| `explore` | 탐색 | `/explore` | O | O | O |
| `scriptures` | 서가 | `/library` | O | O | O |
| `rest` | 쉼터 | `/rest` | O | O | — |
| `archive` | 내 기록 | `/{userId}` | — | O | O |

광장(`/agora`)은 `NAV_ITEMS`에 없다. 풋터의 `FOOTER_MISC_LINKS`(소셜·공지사항·피드백)로만 노출된다.

`FOOTER_NAV_ITEMS`는 `subLinks`가 있고 `rest`가 아닌 항목만 추린다. 결과적으로 풋터에는 탐색·서가 두 항목의 하위 링크가 나열된다. 브랜드 링크(`FOOTER_BRAND_LINKS`)는 서비스 소개·검색·이용약관·개인정보처리방침·문의하기다.

## 허브 구성 단일원천

탐색·서가는 허브 페이지 하나에 미리보기 섹션을 쌓고, 각 섹션에서 하위 화면으로 보낸다. 섹션 순서·라벨키·더보기 주소는 `sw/web/src/components/shared/hubSectionUtils.tsx`가 단일원천이다(`EXPLORE_SECTIONS`, `EXPLORE_STANDALONE`, `SCRIPTURES_SECTIONS`). 허브 네비게이터(`HubNav`)와 각 섹션(`HubSection`)이 이 설정에서 라벨·순서·번호를 함께 읽는다.

## 코드 명칭과 화면 명칭의 불일치

서가는 2026-03-26에 `/scriptures`에서 `/library`로 주소가 바뀌었다. 주소만 바뀌었고 내부 명칭은 `scriptures`가 그대로 남아 있다. 자세한 내용은 [library.md](library.md)의 "리네이밍 잔재" 절을 본다.

기록관 쪽도 비슷하다. 컬렉션 상세 티어 화면(`[userId]/reading/collections/[id]/tiers/page.tsx`)의 파일 주석은 옛 경로 `/app/(main)/archive/playlists/[id]/tiers/page.tsx`를 가리킨다. 코드 내부에서 컬렉션은 `flow`(플로우)로 불린다.

## 연계 문서

- 아키텍처 전반: `docs/project/architecture.md`
- 백오피스: `docs/project/web-bo.md`
- 다국어: `docs/project/i18n.md`
- SEO: `docs/project/seo.md`
- 코드 규칙: `docs/project/code-rules.md`
- 셀럽 데이터: `docs/project/celeb/`, `docs/project/db-celeb.md`
