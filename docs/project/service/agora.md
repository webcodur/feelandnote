# 광장 (`(main)/agora/*`)

> **최종 실측 체크: 26.08.04** — 게시판 3종 KO/EN 데이터 분리·공지 번역·날짜 표기 실측. 신고·차단은 26.07.30 대조분

사용자끼리 글을 쓰고 서로를 팔로우하는 커뮤니티 영역이다.

`navigation.tsx`의 `NAV_ITEMS`에는 광장이 없다. 헤더·바텀탭에 노출되지 않고, 풋터의 `FOOTER_MISC_LINKS`(소셜·공지사항·피드백)로만 들어간다.

## 색인 제외

`agora/layout.tsx`가 광장 전체에 `robots: { index: false, follow: true }`를 건다. 2026-07-15에 넣었고, 코드 주석은 이유를 이렇게 적는다 — 게시글 총량이 한 자릿수라 검색엔진에 "제작 중인 사이트" 신호를 보내고 사이트 평균 콘텐츠 품질을 떨어뜨린다. 커뮤니티가 성장하면 제거할 선언이다.

`/agora/social`은 페이지 자체 메타에서 `index: false, follow: false`로 더 강하게 잠근다.

## 화면 목록

| 경로 | 역할 | 데이터 출처 |
|---|---|---|
| `/agora` | `/agora/board/free`로 리다이렉트 | — |
| `/agora/social` | 친구·팔로잉·팔로워·취향 유사 유저를 한 페이지에 섹션별로 | `getFriends`, `getMyFollowing`, `getFollowers`, `getSimilarUsers`, `getProfile` |
| `/agora/social-feed` | 친구들의 활동 피드 | `FriendFeedSection` (클라이언트 페칭) |
| `/agora/board/free` | 자유게시판 목록 | `getFreePosts` |
| `/agora/board/free/write` | 자유게시판 작성 | — |
| `/agora/board/free/[id]` | 자유게시판 상세 + 댓글 | `getFreePost`, `getFreeComments`, `incrementFreePostView` |
| `/agora/board/free/[id]/edit` | 자유게시판 수정 | `getFreePost` |
| `/agora/board/notice` | 공지사항 목록 | `getNotices` |
| `/agora/board/notice/write`, `/[id]`, `/[id]/edit` | 공지 작성·상세·수정 | `actions/board/notices` |
| `/agora/board/feedback` | 피드백 목록(카테고리 필터) | `getFeedbacks` |
| `/agora/board/feedback/write`, `/[id]`, `/[id]/edit` | 피드백 작성·상세·수정 | `actions/board/feedbacks` |
| `/agora/feed` | 레거시. `/explore/feed`로 리다이렉트 | — |
| `/agora/celeb-feed` | 레거시. `/explore/feed`로 리다이렉트 | — |
| `/agora/friend-feed` | 레거시. `/agora/social-feed`로 리다이렉트 | — |

레거시 3종은 페이지 리다이렉트만 있고 `next.config.ts`의 `redirects()`에는 대응 규칙이 없다.

## 레이아웃·탭

`agora/layout.tsx`가 배너(`PageBanner` + `HegemonyMapBanner compact`)와 `PageContainer`, 그리고 공통 탭(`AgoraTabs`)을 씌운다. 게시판 3종은 `board/layout.tsx`가 본문 폭을 `max-w-3xl`로 한 번 더 좁힌다.

탭 구성은 `sw/web/src/constants/agora.tsx`의 `AGORA_ITEMS`가 단일원천이다.

| value | href |
|---|---|
| `free` | `/agora/board/free` |
| `social` | `/agora/social` |
| `social-feed` | `/agora/social-feed` |
| `notice` | `/agora/board/notice` |
| `feedback` | `/agora/board/feedback` |

`AgoraTabs`는 현재 주소가 `item.href`로 시작하는 항목을 활성 탭으로 잡고, 어디에도 맞지 않으면 `social`로 떨어뜨린다. 라벨은 `agora.items.*` 네임스페이스에서 읽되 하이픈을 캐멀케이스로 바꿔 키를 만든다(`celeb-feed` → `celebFeed`).

## 게시판 3종

세 게시판은 목록·상세·작성·수정 네 화면 구조가 같고, 서버 액션과 권한 규칙이 다르다.

### 언어 분리 원칙 (26.08.04)

- 자유게시판과 피드백은 행마다 `locale`(`ko` 또는 `en`)을 저장한다. 작성한 언어의 목록·상세에서만 노출하며 사용자 글을 자동 번역하지 않는다. 도입 전 글은 모두 `ko`로 귀속했다.
- 공지사항은 한 행에 `title`·`content`와 필수 `title_en`·`content_en`을 함께 둔다. 관리자는 작성·수정 화면에서 두 언어를 모두 입력하고, 화면은 현재 locale의 제목·본문만 고른다.
- 공지·피드백 공용 댓글(`board_comments`)도 `locale`로 분리한다. 같은 공지 ID를 한영 화면이 공유하더라도 댓글은 섞이지 않는다. 자유게시판 댓글은 이미 locale이 고정된 부모 글을 통해 분리하고, 작성 시 부모와 요청 locale의 일치를 검증한다.
- 상대 시간과 절대 날짜는 각각 `date-fns` locale과 `Intl.DateTimeFormat` locale을 사용한다. 시간대는 양쪽 모두 `Asia/Seoul`이다.
- 홈에 끼워 넣은 자유게시판 목록도 현재 요청 locale을 그대로 넘긴다. 따라서 `/en` 홈은 영문 자유글만 읽는다.
- 목록 캐시는 `notices`, `feedbacks`, `board-comments` 태그로 무효화해 한쪽 언어에서 작성·수정·삭제한 직후 해당 화면이 오래된 목록을 보여주지 않게 한다.

### 자유게시판 (`free`)

익명 게시판이다. 로그인하면 계정으로, 아니면 익명으로 쓴다.

- 목록: 한 쪽에 20건(`ITEMS_PER_PAGE = 20`), `?page=` 로 넘긴다.
- 상세: 글·댓글·관리자 여부·로그인 사용자를 함께 읽고, 조회수를 1 올린 뒤 화면에는 올린 값을 반영해 넘긴다.
- 수정: 글에 `author_id`가 없으면 익명 글로 보고 비밀번호를 요구한다(`needsPassword`). 저장 시 검증은 계정 글이면 본인 또는 관리자, 익명 글이면 비밀번호다.

**신고·차단(26.07.30)** — 글 상세와 댓글마다 신고·차단 메뉴가 붙는다. 글은 「게시물 신고 / 작성자 신고 / 사용자 차단」, 댓글은 「댓글 신고 / 작성자 신고 / 작성자 차단」이다. 자기 글에는 뜨지 않는다.

- **익명 글은 작성자 신고·차단을 낼 수 없다.** `author_id`가 비어 있어 대상을 특정할 수 없다. 글 자체 신고만 가능하다.
- 차단한 사람의 글·댓글은 목록에서 걷어낸다(`getFreePosts`·`getFreeComments`). 두 조회는 캐시를 쓰지 않아 요청마다 보는 사람 기준으로 걸러진다.
- 전체 건수는 걸러낸 만큼만 뺀 근사값이다. 뒷 페이지의 차단 글은 반영되지 않는다.
- 작성 폼과 댓글 폼에 금지 내용 안내와 약관 링크가 상시 뜬다. 동의 없이 제출을 막지는 않는다.
- 부품·정책 요건은 [안드로이드 앱 SSoT](../apps/android-app-feasibility-review-2026-07-29.md) §5.1·§14.

### 공지사항 (`notice`)

- 목록: 한 쪽에 10건. `isAdmin(db)` 결과를 목록에 넘겨 관리자에게만 쓰기 동선을 준다.

### 피드백 (`feedback`)

- 목록: 한 쪽에 10건. `?category=`로 거른다.
- 유효 카테고리는 `CELEB_REQUEST`, `CONTENT_REPORT`, `FEATURE_SUGGESTION` 셋뿐이고, 그 밖의 값은 무시하고 전체를 보여준다.
- 상태(`FeedbackStatus`)는 `PENDING`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`다. 카테고리·상태의 배지 색은 `sw/web/src/constants/board.tsx`가 정한다.

## 소셜

`/agora/social`은 네 섹션을 한 페이지에 세운다. 각 섹션의 컴포넌트는 `components/features/user/explore/sections/` 아래에 있다(탐색 영역 폴더에 있으나 광장에서 쓴다).

추리는 일은 섹션 컴포넌트가 아니라 `social/page.tsx`가 먼저 해서 넘긴다.

| 섹션 | 컴포넌트 | 비고 |
|---|---|---|
| 친구 | `FriendsSection` | `getFriends` |
| 팔로잉 | `FollowingSection` | 친구를 걸러내려는 의도이나 **실제로는 걸러지지 않는다**(아래) |
| 팔로워 | `FollowersSection` | 내가 맞팔하지 않은(`!is_following`) 대상만 남긴다 |
| 취향 유사 | `SimilarSection` | `getSimilarUsers(10)`. 사용한 알고리즘 값(`algorithm`)을 함께 받는다 |

> **결함 — 팔로잉 목록의 친구 제외가 동작하지 않는다.**
> `social/page.tsx`가 `.map(f => ({ ...f, is_friend: false })).filter(f => !f.is_friend)`를 쓴다. 모든 항목에 `is_friend: false`를 덮어쓴 뒤 그 값으로 거르므로 아무것도 걸러지지 않는다. 친구인 상대도 팔로잉 목록에 그대로 남아 친구 섹션과 중복 노출된다. 팔로워 쪽 필터는 덮어쓰기가 없어 정상 동작한다.

섹션 제목은 `explore.people` 네임스페이스에서, 페이지 메타 제목은 `agora.social`에서 읽는다.

`/agora/social-feed`는 서버에서 로그인 사용자 id만 뽑아 `FriendFeedSection`에 넘기고, 나머지는 클라이언트가 채운다. 서버 컴포넌트를 `Suspense`로 감싸고 전용 스켈레톤을 보여준다.

## 연계 문서

- 화면 지도: [README.md](README.md)
- 인물 피드(`/explore/feed`): [explore.md](explore.md)
- 프로필·팔로우 대상: [profile.md](profile.md)
- SEO·색인 정책: `docs/project/operations/seo.md`
