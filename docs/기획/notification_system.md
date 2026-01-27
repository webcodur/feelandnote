# 알림 시스템 구현 계획 (Notification System Plan)

## 1. 개요 (Overview)
사용자에게 발생하는 주요 상호작용(좋아요, 댓글, 팔로우 등)과 시스템 메시지(업적 등)를 실시간으로 전달하기 위한 알림 시스템을 설계 및 구현합니다.

## 2. 데이터베이스 스키마 (Database Schema)

### `notifications` 테이블 신설
기존 Supabase 스키마에 알림 저장용 테이블을 추가합니다.

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| `id` | UUID | Primary Key (Default: `gen_random_uuid()`) |
| `user_id` | UUID | 수신자 ID (FK -> `profiles.id`) |
| `actor_id` | UUID | 발신자/행위자 ID (FK -> `profiles.id`, Nullable - 시스템 알림일 경우 Null) |
| `type` | TEXT | 알림 유형 (`like`, `comment`, `follow`, `achievement`, `system` 등) |
| `title` | TEXT | 알림 제목 (옵션) |
| `message` | TEXT | 알림 내용 |
| `link` | TEXT | 클릭 시 이동할 링크 |
| `is_read` | BOOLEAN | 읽음 여부 (Default: `false`) |
| `created_at` | TIMESTAMPTZ | 생성 시간 (Default: `now()`) |
| `metadata` | JSONB | 추가 데이터 (예: `reference_id`, `image_url` 등) |

### 인덱스 (Index)
- `user_id` + `created_at` (DESC): 사용자별 알림 최신순 조회 최적화
- `is_read`: 안 읽은 알림 카운트 최적화

## 3. 알림 생성 로직 (Trigger Logic)
Supabase Database Trigger를 사용하여 주요 액션 발생 시 자동으로 알림을 생성합니다.

1.  **좋아요 (`record_likes`)**
    - Trigger: `INSERT ON record_likes`
    - Action: `records` 테이블을 조인하여 작성자(`user_id`)를 찾고, 작성자가 본인이 아닐 경우 알림 생성.
    - Type: `like`
    - Message: "{nickname}님이 회원님의 기록을 좋아합니다."

2.  **댓글 (`record_comments`)**
    - Trigger: `INSERT ON record_comments`
    - Action: `records` 테이블을 조인하여 작성자를 찾고 알림 생성. (대댓글 기능 추가 시 원 댓글 작성자에게도 알림 필요)
    - Type: `comment`
    - Message: "{nickname}님이 댓글을 남겼습니다."

3.  **팔로우 (`follows`)**
    - Trigger: `INSERT ON follows`
    - Action: `following_id`에게 알림 생성.
    - Type: `follow`
    - Message: "{nickname}님이 회원님을 팔로우합니다."

## 4. 실시간 및 프론트엔드 연동 (Realtime & Frontend)

### Supabase Realtime
- 클라이언트는 `notifications` 테이블의 `user_id = current_user.id` 조건으로 `INSERT` 이벤트를 구독합니다.
- 새 알림 수신 시:
    - 우측 상단 종 아이콘에 'New' 배지 표시
    - 토스트(Toast) 메시지 노출 (선택 사항)
    - 알림 목록 최상단에 추가

### 컴포넌트 (`HeaderNotifications.tsx`)
- **데이터 페칭**: Server Action 또는 Client-side fetching으로 초기 데이터 로드 (최신 20개 등).
- **읽음 처리**:
    - 알림 클릭 시: 해당 알림 `is_read = true` 업데이트 및 링크 이동.
    - '모두 읽음' 클릭 시: 해당 유저의 모든 알림 `is_read = true` 업데이트.
- **UI**:
    - 기존 Neo-Pantheon 스타일 유지.
    - 안 읽은 알림은 배경색(accent opacity)으로 구분.

## 5. 단계별 구현 순서 (Implementation Steps)
1.  **DB**: `notifications` 테이블 생성 SQL 작성 및 실행 (Migration).
2.  **DB**: 주요 테이블(`follows`, `record_likes` 등)에 대한 Trigger Function 작성 및 적용.
3.  **FE**: `HeaderNotifications.tsx`에 Supabase Client 연동 및 Realtime 구독 구현.
4.  **FE**: 알림 읽음 처리 및 '모두 읽음' 기능 구현.
5.  **Test**: 실제 계정 간 팔로우/좋아요 테스트를 통해 알림 생성 및 수신 확인.

## 6. 사운드 (Sound)
- `public/sounds/미사용/notification1.mp3` 파일을 활용하여 실시간 알림 수신 시 효과음 재생 옵션 추가 고려.
