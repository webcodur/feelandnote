# 서비스 화면 (sw/web)

사용자 대면 웹(`sw/web`)의 화면 지도다. 백오피스(`sw/web-bo`)·데이터 파이프라인은 다루지 않는다.

서비스 데이터는 DB 필드와 R2 서비스 리소스를 사용한다. 부가데이터 생성·보관 금지와 반영 뒤 전량 폐기는 [`데이터 원칙`](../data/README.md)을 따른다.

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
| 07 | [`service-07-mascots.md`](service-07-mascots.md) | 불씨·부엉이·사자의 역할, 화면 활용·자산 재사용 | `components/shared/mascots/` 및 각 사용처 |

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
  page.tsx                  # 홈 — 서비스 소개, 매체·독서 연결도, 공지·문의
  support/                  # 응원하기 — 한국어 쿠팡 생필품 구매 안내 (영문 비공개)
  shop/                     # 상품구매 — 한국어 쿠팡 독서용품 (영문 비공개)
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

인물과 작품은 각각 주요 메뉴다. 휴대폰·태블릿은 홈·인물·작품·쉼터와 음악 재생기 칸을 두며, 내 기록과 친구·팔로우는 헤더 프로필 메뉴로 들어간다. 프로필 메뉴의 문의·의견 보내기는 홈의 이메일 안내(`/#contact`)로 연결한다. 중첩 주소의 활성 메뉴는 `activeNavigationHref`가 가장 구체적인 주소 하나로 정한다.

`FOOTER_SECTIONS`가 푸터 네 칼럼(인물, 작품, 쉼터·게시판, 서비스 안내)의 링크를 정한다. 서비스 안내에는 소개·약관·개인정보처리방침을 두고, 검색·문의는 따로 두지 않는다.

`/support`는 공통 헤더, 홈 본문 끝, 서비스 소개의 운영 안내, 푸터에서 들어간다. 홈의 응원 안내는 한국에서 접속한 한국어 방문자에게만 표시하고, 국가가 확인되지 않으면 숨긴다. 홈·소개 안내는 `SupportCallout.tsx`, 공통 주소는 `navigation.tsx`의 `SUPPORT_LINK`를 쓴다. `/support`와 `/shop`은 두 칸짜리 화면 전환으로 오가며 전환·푸터 주소는 같은 파일의 `SUPPORT_SHOP_LINKS`가 쥔다. 상품은 `commerce_products`에서 읽고, 상품 종류·묶음·제휴 연결 규칙은 `sw/web/src/constants/supportProducts.ts`, 화면 문구는 `messages/{ko,en}/support.json`이 쥔다. 쿠팡 파트너스 주소는 상품별 `affiliateUrl`로 연결하며, 도서용 링크프라이스 승인 설정을 사용하지 않는다. `/support`는 상품 카드의 별표로 즐겨찾기를 켜고 끄며 최상단 구획에 모아 보여 준다. 즐겨찾기와 로켓프레시 표시 설정은 `useSupportShopping.ts`가 브라우저에 저장하고, 프레시 숨김은 즐겨찾기 구획에도 적용한다. 구매는 상품별 링크에서 새 창으로 연다.

## 허브 구성 단일원천

홈은 짧은 서비스 소개, 매체별 감상 기록 샘플과 공개 수치, 인물의 감상·등장·집필·관련 도서 목록, 검색·공지·운영 문의로 이어진다. 공용 아틀라스 목차는 서비스 소개와 감상 기록·인물과 책·검색·공지·운영 문의의 다섯 번호 구획을 연결하며, 공개 인물 수와 감상 수는 감상 기록 구획의 제목 다음에 링크 없는 작은 한 줄로 가운데 정렬한다. ‘감상 기록’과 ‘인물과 책’은 각자 배경·외곽선·둥근 모서리를 가진 독립 구획으로 표시한다. 검색·공지·운영 문의도 같은 제목·간격 규격을 쓴다. 공지는 제목과 날짜를 같은 목록으로 표시하고, 모두 접힌 상태에서 선택한 글의 본문을 펼쳐 읽는다. 감상 기록은 넓은 화면에서 큰 대표 사진과 작품·감상을 나눈 편집면으로 표시하고, 좁은 화면에서는 세로 원본 비율의 네모형 대표사진과 이름을 가운데 모으고, 이전·다음 버튼을 양옆에 배치한다. 넓은 화면의 대표 사진은 기존 portrait_url을 원본 비율로 표시하고, 없거나 불러오지 못하면 아바타를 표시한다. 좁은 화면도 portrait_url 원본을 자르지 않고 표시하며, 없거나 불러오지 못하면 avatar_url 원본을 네모형으로 표시한다. 대표 사진과 아바타는 처음 나타날 때 BlurDissolve로 표시하고, 로드가 끝난 이미지는 다시 전환할 때 즉시 표시한다. 첫 작품을 미리 선택해 표지와 본문을 보여준다. 감상은 「감상 배경:」, 다른 도서 관계는 「작품 소개:」를 본문 앞에 붙인다. 실제로 잘린 본문만 눌러 전체보기 모달을 열며, 감상 배경은 본문과 같은 문단에서 「감상 배경: 본문」으로 표시한다. 감상 배경 글자에만 밑줄과 출처 링크를 적용하고, 출처가 없으면 일반 글자로 둔다. 출처는 전체보기 모달에서도 표시한다. 별도의 감상 출처·전문 읽기·작품 보기 링크 줄은 두지 않는다. 하단의 인물 전체 감상·인물 탐색·작품 소개 카드 영역은 두지 않는다. 책 소개와 감상 배경이 둘 다 있는 책에만 표지 옆 전환 버튼 하나를 표시하고, 같은 자리에서 본문·색상·출처를 바꾼다. 둘 중 하나만 있으면 그 본문을 바로 표시한다. 현재 선택한 책의 소개만 확인하며, 소개 로딩·실패가 감상 본문을 가리지 않도록 한다. 표지는 공통 ContentCoverLink로 작품 상세에 연결하고, 우상단 확대 버튼은 이미지 뷰어를 연다. 매체 아이콘·이름 탭은 인물명과 균형이 맞는 크기로 표시하고 좁은 화면에서는 두 열로 배치한다. 같은 매체의 다른 작품은 「이전·현재 순서·다음」을 묶은 넘기기 조작으로 순환한다. 작품 상세는 표지와 제목 링크로 연다. 리뷰·소개 전환과 미리보기는 같은 표지 옆 조작 줄에 모은다. 영상·음원·이미지는 별도 미리보기 모달을 열 때만 불러오며, 모달을 닫으면 재생 요소를 제거한다. 미리보기 로딩과 재생은 홈 본문의 높이를 바꾸지 않는다. 자료가 없으면 모달에서 안내한다. 인물은 마지막 선택을 유지하고 화면에 들어왔다는 이유로 자동 전환하지 않는다. 작품 선택 칩·별도 연결도·돌아가기 버튼은 두지 않는다. ‘인물과 책’은 도서 관계를 살펴보는 별도 편집면이다. 같은 책장 구획의 상위 이름은 「인물과 책 / People and Books」로 통일한다. 홈과 공통 책장의 관계 분류는 「감상·등장·집필·관련 주제 / Read·Appearing·Written·Related themes」로 맞춘다. 넓은 화면의 대표사진 폭은 감상 기록과 같게 유지하며, 인물 패널은 사진과 이름의 실제 높이만 사용한다. 넓은 화면은 대표사진 옆의 남은 높이를 리뷰·소개 본문이 채우며, 좁은 화면은 본문 미리보기 높이를 넉넉히 둔다. 넘치는 경우 눌러 전문을 읽는다. 탭 아래에 분류 이름을 반복하지 않는다. 관련 주제 분류는 책의 표지·제목·작가를 먼저 보여 주고, 그 아래 별도 안내 블록에 주제 이름·연결과 저장된 한 줄 정의를 나눠 표시한다. 정형화된 인물 연결 문장은 반복하지 않는다. 소개가 없을 때 빈 안내 문단을 만들지 않는다. 읽은 책·등장하는 책·집필한 책·속한 세계를 다룬 책을 구분하고, 한 권씩 표지와 감상·소개를 읽으며 다음 작품으로 넘긴다. 같은 잘림·전체보기 규칙을 적용하고, 관련 주제 분류의 주제 이름을 누르면 해당 주제 페이지로 이동한다. 인물·작품 첫 목록의 화면 위계는 [인물](service-01-explore.md)과 [작품](service-02-library.md)을 따른다.

서비스 소개(`/about`)는 홈으로 영구 이동한다. 소개는 `/#about`, 문의는 `/#contact`에서 읽는다. 응원하기·상품구매는 각각 소개·구매 조건·제휴 고지를 독립된 이용 안내 구획에 모으고, 상품군별 구획과 함께 공통 번호·아틀라스 목차로 연결한다. 즐겨찾기 구획과 목차 항목은 저장한 상품이 있을 때만 표시한다.

홈 연결도의 대표 인물·작품은 `components/features/home/introduction/config.ts`가 정한다. `actions/home/getHomeGraphData.ts`는 활성 인물의 공개 감상과 실제 도서 관계를 읽는다. 오늘의 인물과 주목할 만한 감상은 홈에 노출하지 않는다. 오늘의 인물은 `/explore/today`에서 이용한다.

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
