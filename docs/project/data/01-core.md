# 공통 DB

로그인 회원과 서비스 공통 데이터의 물리 경계를 설명한다. 콘텐츠는 [`02-content.md`](02-content.md), 인물은 [`03-celeb.md`](03-celeb.md)를 본다. 컬럼 전체와 RLS 원문은 [`sw/web/database/migrations/`](../../../sw/web/database/migrations/)에서 확인한다.

## 회원 원본

| 저장소 | 책임 |
|---|---|
| `auth.users` | 로그인 자격. 공개 프로필 원천이 아니다 |
| `user_accounts` | 계정 상태·권한·제재. `id`는 Auth 사용자와 같은 UUID다 |
| `member_profiles` | 닉네임·아바타·소개 등 회원 공개 프로필. `id → user_accounts.id`인 1:1 행 |
| `member_social_stats` | 팔로워·팔로잉·친구·콘텐츠 등 파생 개수 |
| `member_scores`·`member_score_logs` | 회원 활동 점수와 산출 로그 |

관리자 판정은 DB 함수 `is_admin()`을 사용한다. 애플리케이션과 RLS가 역할 문자열을 각각 해석하지 않는다.

## 회원 관계

| 저장소 | 관계 |
|---|---|
| `member_member_follows` | 회원 → 회원 팔로우 |
| `member_celeb_follows` | 회원 → 인물 팔로우 |
| `blocks` | `blocker_id`가 `blocked_id`를 차단한 방향 관계 |

두 팔로우 테이블과 점수·통계의 파생 개수는 DB 트리거가 맞춘다. 클라이언트가 카운터를 따로 증감하지 않는다. 차단을 적용하는 조회는 양방향 관계를 검사해야 하며, 일반 사용자가 읽을 수 있는 차단 행의 범위를 넓혀야 한다면 코드 우회가 아니라 RLS 또는 보안 RPC를 먼저 바꾼다.

## 커뮤니티와 알림

| 묶음 | 저장소 |
|---|---|
| 방명록 | `member_guestbook_entries`, `celeb_guestbook_entries` |
| 알림 | `member_notifications` |
| 게시판 | `free_posts`, `free_post_comments`, `board_comments`, `feedbacks`, `notices` |
| 기록 반응 | `record_likes`, `record_comments` |
| 신고 | `reports` |
| 회원 추천 | `content_recommendations` |

알림 행은 팔로우·방명록·댓글·좋아요 같은 원 사건과 함께 트리거 또는 전용 RPC가 만든다. 화면에서 알림만 직접 생성해 원 사건과 분리하지 않는다.

## 공통 시스템

- `activity_logs`: 서비스 활동 로그
- `api_keys`·`api_key_usage`: API 키와 사용량
- `daily_figures`: 오늘의 인물 편성
- `tier_lists`·`blind_game_scores`: 게임 저장값

각 기능의 선택·노출·운영 규칙은 담당 앱이나 서비스 문서가 쥔다. 이 문서는 테이블이 어느 물리 도메인에 속하는지만 정한다.
