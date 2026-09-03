# 프로필·기록관 (`(main)/[userId]/*`)

> **최종 실측 체크: 26.08.10** — `[userId]` 회원 전용 라우트, 회원 프로필·감상·방명록·
> 점수의 물리 도메인 전환과 사용자 웹 프로덕션 빌드를 대조했다.

한 사람의 기록을 모아 보여주는 영역이다. 네비게이션 라벨은 "내 기록", 코드 키는 `archive`다. `NAV_ITEMS`의 href는 `/{userId}` 자리표시자이며 실제 주소는 사용자 id로 채워진다.

## 회원 전용 경계

`[userId]` 라우트는 `member_profiles`에 존재하는 로그인 회원만 받는다. 셀럽 ID를 넣어 두
도메인을 추측하거나 유형 열로 분기하지 않는다. 회원 프로필이 없으면 `notFound()`다.

셀럽의 정본 주소는 `/celeb/{slug}`이며 `celebs`에서 별도로 조회한다. 옛 `[userId]`→셀럽
리다이렉트와 슬러그 없는 셀럽의 회원 화면 폴백은 26.08.10에 제거했다.

## 화면 목록

| 경로 | 역할 | 데이터 출처 |
|---|---|---|
| `/[userId]` | 소개. 회원 프로필 + 회원 방명록 | `getUserProfile`, `getGuestbookEntries(subjectKind='member')` |
| `/[userId]/reading` | 서재. 기록한 콘텐츠 | `RecordsContent` (클라이언트 페칭) |
| `/[userId]/reading/collections` | 묶음 목록 | `getFlows` (`Flows`가 클라이언트 페칭) |
| `/[userId]/reading/collections/[id]` | 묶음 상세 | `getFlow` (`FlowDetail`이 클라이언트 페칭) |
| `/[userId]/reading/collections/[id]/tiers` | 묶음 티어 편집 | `getFlow`, `updateFlow` (`TierEditView`가 클라이언트 페칭) |
| `/[userId]/merits` | 업적. 칭호·점수 | `getAchievementData`, `getProfileShowcase` |
| `/[userId]/chamber` | 관리. 통계 + 설정 | `getProfile`, `getDetailedStats` |

## 레이아웃·탭

`[userId]/layout.tsx`가 배너(`PageBanner` + `PrismBanner`), 탭(`ArchiveTabs`), 섹션 헤더(`ArchiveSectionHeader`)를 씌우고 본문을 `max-w-3xl`로 잡는다. `RecentProfileTracker`가 방문한 프로필을 기록한다.

탭 구성은 `sw/web/src/constants/archive.tsx`의 `ARCHIVE_TABS`가 단일원천이다.
`buildArchiveTabs(userId, isOwner, false)`가 `ownerOnly`·`nonCeleb` 플래그로 거른 뒤
`/{userId}{href}` 형태의 전체 주소를 붙인다. 세 번째 인자는 옛 공용 컴포넌트 계약의
잔재이며 이 라우트에서는 항상 `false`다.

| value | 라벨 | href | 제약 |
|---|---|---|---|
| `intro` | 소개 | `` (빈 문자열) | — |
| `records` | 서재 | `/reading` | — |
| `collections` | 묶음 | `/reading/collections` | — |
| `merits` | 업적 | `/merits` | — |
| `chamber` | 관리 | `/chamber` | `ownerOnly` |

`ARCHIVE_TABS`의 각 항목은 라벨 외에 제목·영문 라벨·설명 4종(방문자용 `description`/`subDescription`, 본인용 `ownerDescription`/`ownerSubDescription`)을 함께 들고 있다. `ArchiveSectionHeader`가 본인 여부에 따라 어느 쪽을 쓸지 고른다.

`nonCeleb` 플래그는 타입에 정의돼 있고 `buildArchiveTabs`가 필터링도 하지만, 현재 이 플래그를 켠 탭은 하나도 없다.

**이 상수의 라벨·설명은 한국어 문자열로 코드에 박혀 있다.** 다른 화면들이 `next-intl` 네임스페이스를 쓰는 것과 다르다. 영문 로케일에서도 이 값들은 한국어로 나온다.

## 소개 (`/[userId]`)

`ProfileContent`가 받는 것은 회원 프로필, 본인 여부, 회원 방명록 항목·총계와 현재 로그인
회원 ID다. 셀럽 영향력·16축 스펙트럼을 이 라우트에서 싣지 않는다.

**신고·차단(26.07.30)** — 방명록 항목마다 「방명록 신고 / 작성자 신고 / 작성자 차단」 메뉴가 붙는다(자기 글·내용이 가려진 비밀글 제외). 회원 프로필 상단에는 「사용자 신고 / 사용자 차단」이 붙는다. 인물(셀럽) 프로필은 운영이 만든 자료라 대상이 아니다.

차단한 사람의 방명록은 목록에서 걷어낸다. 🔴 **방명록 조회(`getGuestbookEntries`)는 `unstable_cache`로 보는 사람과 무관하게 캐시된다.** 차단 필터는 반드시 캐시 밖 래퍼에서 적용한다 — 캐시 안에서 차단 목록을 읽으면 한 사람의 차단 결과가 전체 사용자에게 캐시된다.

방명록은 본인이 볼 때 `markGuestbookAsRead()`로 `member_guestbook_entries`의 미확인 행을
읽음 처리한다. 작성자 표시는 로그인 회원 ID로 조회하며, 대상 프로필의 닉네임·아바타를
작성자 정보로 재사용하지 않는다.

소개 화면의 구성 요소는 `[userId]/` 아래 평면 파일로 있다. `ProfileContent`, `ProfileStatsSection`, `ProfileSettingsSection`, `ProfileAchievementsSection`, `UserBioSection`, `AvatarUploader`다.

메타 설명은 회원 닉네임을 넣은 기본 문구를 쓴다. 오픈그래프 `type`은 `profile`이다.

## 업적 (`/[userId]/merits`)

칭호 정의는 `sw/web/src/constants/titles.ts`의 `TITLES`가 단일원천이다. 17개이며 DB가 아니라 코드 상수다.

각 칭호는 코드·이름·설명·분류·등급·조건·아이콘을 갖는다.

- **분류(`category`)** 3종: `volume`(축적, 7개), `diversity`(다양성, 5개), `depth`(깊이, 5개).
- **등급(`grade`)** 4종: `common`(6개), `uncommon`(6개), `rare`(4개), `epic`(1개).
- **조건(`condition`)**: `{ type, value }` 꼴이다. `content_count`, `record_count`, `category_count`, `creator_count`, `avg_review_length`, `long_review_count`, `completed_count` 등이 쓰인다.

`getAchievementData(userId)`가 사용자 통계를 모아 각 칭호의 `condition`을 검사하고
`unlocked` 플래그를 붙인다. 점수 합계는 `member_scores`의 `activity_score`·`title_bonus`·
`total_score`에서 읽고, 최근 `member_score_logs` 20건은 본인에게만 내준다. 공개 조회는
`unstable_cache` + `createStaticClient`, 본인 조회는 세션 클라이언트를 쓴다.

전시할 칭호는 `getProfileShowcase(userId)`가 코드 배열로 내주고, `updateShowcase`로 바꾼다. 본인일 때만 편집 동선이 열린다(`isOwner`).

등급별 시각 규칙은 `[userId]/achievementTierStyles.ts`의 `TIER_STYLES`에 있다. 키는 `common`·`uncommon`·`rare`·`epic` 넷으로 `TitleDefinition['grade']`와 일치한다. 배경·테두리·글자색·그림자에 더해 `rare` 이상은 `glow`(의사 요소 광택)를 얹는다.

## 묶음 (컬렉션)

**화면에서는 "묶음", 코드에서는 `flow`(플로우)다.** 서버 액션은 `actions/flows/`, 컴포넌트는 `components/features/user/flows/`와 `components/features/user/detail/`에 있다. 주소만 `collections`다.

- **목록**: `Flows`가 `getFlows(userId)`로 채우는 클라이언트 컴포넌트다. 본인이면 생성 동선(`FlowEditor`)이 열린다.
- **상세**: `FlowDetail`이 `flowId`만 받아 스스로 읽는다.
- **티어 편집**: `TierEditView`가 `getFlow`로 읽고 `updateFlow`로 저장한다.

### 티어 체계

묶음 안의 항목을 5단으로 드래그해 배치한다. `TIER_LABELS`는 `S`·`A`·`B`·`C`·`D`이고, `TIER_CONFIG`가 각 단의 표시명·색·아이콘을 정한다.

| 단 | 표시명 |
|---|---|
| S | MYTHIC |
| A | LEGENDARY |
| B | EPIC |
| C | RARE |
| D | COMMON |

어디에도 넣지 않은 항목은 `unranked`로 남는다. 콘텐츠 타입(`selectedType`)으로 걸러 볼 수 있다.

이 5단 티어는 업적의 4등급(`common`~`epic`)과 **다른 체계**다. 표시명이 겹치지만(EPIC·RARE·COMMON) 서로 무관하다.

## 관리 (`/[userId]/chamber`)

본인만 들어간다. 로그인하지 않았거나 id가 다르면 `notFound()`다. 메타에 `robots: { index: false, follow: false }`를 건다.

`getProfile()`과 `getDetailedStats(userId)`를 읽어 통계 섹션과 설정 섹션을 세운다. 로그인 수단이 이메일인지(`app_metadata.provider === 'email'`)를 설정 섹션에 넘긴다 — 비밀번호 관련 동선을 가르는 값으로 보인다.

**차단한 사용자 관리(26.07.30)** — 같은 화면에 카드 하나로 붙어 있다(통계와 설정 사이). `getBlockedUsers()`를 서버에서 읽어 넘기고, 해제는 카드에서 처리한 뒤 화면을 다시 읽는다. 별도 라우트를 만들지 않았다 — 이 화면이 이미 본인 전용이고 계정 관리가 모여 있어 네비게이션에 새 항목을 낼 이유가 없다.

목록 조회가 실패하면 0건으로 명시해 보여준다. 빈 목록으로 위장하지 않는다.

## 파일 주석의 옛 경로

`collections/[id]/tiers/page.tsx`의 머리말 주석은 `/app/(main)/archive/playlists/[id]/tiers/page.tsx`를 가리킨다. 실제 경로와 다르다. `collections/[id]/page.tsx`의 주석은 화면을 "플로우 상세"라 부른다.

## 연계 문서

- 화면 지도: [README.md](README.md)
- 광장(팔로우·친구): [agora.md](agora.md)
- 셀럽 상세·영향력: `docs/project/data/03-celeb.md`, `docs/project/celeb/celeb-03-01-influence.md`
- 16축 스펙트럼(내부 레거시명 `persona`): `docs/project/celeb/celeb-03-02-spectrum.md`
