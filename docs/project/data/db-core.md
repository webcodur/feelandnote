# DB 스키마 - Core

> **최종 실측 체크: 26.08.10** — 회원·셀럽 물리 도메인, 감상·팔로우·방명록·소셜·
> 점수·알림 테이블과 현역 RPC·트리거의 운영 적용을 대조했다. 레거시 테이블 제거는 새 앱
> 배포 뒤의 마지막 게이트라 아직 적용하지 않았다.

Supabase 프로젝트 ID: `wouqtpvfctednlffross`

이 문서는 실제 스키마와 1:1 대조해 갱신한다.

8/9 분리 뒤 회원과 셀럽은 물리 테이블부터 다르다. 회원은
`user_accounts` → `member_profiles` · `member_contents`, 셀럽은 `celebs` →
`celeb_contents`를 사용한다. 셀럽 전용 열·외래키·RPC·트리거의 상세는
[`db-celeb.md`](./db-celeb.md)가 단일원천이다.

## 사용자/인증

- **`auth.users`**: Supabase 로그인 자격. 애플리케이션 공개 프로필 원천이 아니다
- **`user_accounts`**: 로그인 회원의 계정·권한·제재 상태. `id → auth.users.id ON DELETE
  RESTRICT`
  - 관리자 판정은 `is_admin()`을 사용한다. 앱이나 RLS에서 역할 문자열을 따로 판정하지 않는다
- **`member_profiles`**: 회원 공개 프로필. `id → user_accounts.id ON DELETE CASCADE`
  - 주요 컬럼: `nickname`, `avatar_url`, `bio`, `birth_date`, `nationality`, `is_verified`,
    `selected_title`, `showcase_titles`, `created_at`, `updated_at`
- **`celebs`**: 로그인 계정과 독립된 셀럽 원본. 상세는 `db-celeb.md` 참조
- **`member_member_follows`**: 회원→회원 팔로우. 두 열 모두 `user_accounts.id`를 참조한다
- **`member_celeb_follows`**: 회원→셀럽 팔로우. `member_id → user_accounts.id`,
  `celeb_id → celebs.id`
- **`blocks`**: 차단 관계(blocker_id → blocked_id). `unique(blocker_id, blocked_id)`, 자기 차단 금지 CHECK, 양쪽 FK CASCADE
  - 🔴 **RLS가 `blocker_id = auth.uid()` 행만 select를 허용한다.** 즉 "내가 차단한 사람"은 읽지만 **"나를 차단한 사람"은 누구도 읽을 수 없다**(관리자 화면도 마찬가지). 목록 숨김이 단방향인 이유가 이것이다. 양방향이 필요하면 `SECURITY DEFINER` RPC 신설 또는 RLS 정책 추가가 선행돼야 한다 — 코드로 우회할 수 없다
- **`member_social_stats`**: 회원의 follower/following/friend/influence/content 카운트 캐시
- **`celeb_metrics`**: 셀럽의 follower/content 카운트 캐시

### 제거한 혼합 구조 — 역사 문서에서만 등장

옛 `profiles`·`user_contents`와 저장형 `profile_type`, `profiles_compat`, `follows`,
`user_social`은 2026-08-10 최종 제거 마이그레이션에서 운영 DB에서 삭제됐다. 현역 코드와 새
DB 객체는 위 전용 테이블에서 시작한다. 과거 이름이 필요하면 마이그레이션 파일과 커밋 이력에서 찾는다.
`20260809184517_retire_legacy_profile_domain.sql`은 새 앱 배포와 구버전 인스턴스 종료를
확인한 뒤 2026-08-10 적용됐다. 이 절은 현재 사용법이 아니라 제거 결과를 설명한다.

## 콘텐츠

- **`contents`**: 콘텐츠 마스터. 언어 중립 메타만 보유
  - 컬럼: `id`(text, 기본값 `gen_random_uuid()::text`), `type`, `subtype`, `metadata`(jsonb), `release_date`(text), `external_source`, `external_id`, `member_count`, `celeb_count`, `record_count`, `created_at`
  - `member_count`와 `celeb_count`는 두 감상 관계의 전수 집계이고, `record_count`는 두 값을
    합친 전체 기록 주체 수다. 옛 `user_count` 열은 2026-08-10 운영 DB에서 제거됐다
  - `type` CHECK: 'BOOK'|'VIDEO'|'GAME'|'MUSIC'
  - `external_source` CHECK: NULL 또는
    `'kakao_book'|'google_books'|'openlibrary'|'aladin'|'tmdb'|'igdb'|'itunes'`.
    MUSIC은 별도 CHECK로 `itunes`만 허용한다. 신규 BOOK은 `kakao_book`(ko) 또는
    `openlibrary`(en)만 쓴다
  - **title/creator/thumbnail_url/description/isbn/publisher/affiliate_url은 contents에 없다.** 전부 `content_locales`로 이관됨(2026-03-06 `drop_contents_legacy_locale_columns_v2`)
- **`content_locales`**: 콘텐츠 언어별 메타 (아래 상세)
- **`member_contents`**: 회원 감상 기록. `member_id → user_accounts.id`,
  `content_id → contents.id`
  - 컬럼: `member_id`, `content_id`, `status`, `rating`, `review`, `review_en`,
    `review_presets`, `is_spoiler`, `is_pinned`, `pinned_at`, `visibility`, `source_url`,
    `contributor_member_id`, 등록자 스냅샷, `completed_at`, `is_recommended`
  - UNIQUE(`member_id`, `content_id`)
  - 평점 또는 리뷰가 처음 생기는 전환은 DB 트리거가 활동 점수 5점을 정확히 한 번만 부여한다
- **`celeb_contents`**: 셀럽 감상경위. `celeb_id → celebs.id`,
  `content_id → contents.id`
  - 셀럽과 작품의 출처 기반 감상 관계이며 별점 필드는 없다. 별점은 개별 회원의 `member_contents.rating`에만 기록한다
  - `source_url` 필수 가드와 0건 확정 해제·셀럽 지표 갱신은 이 테이블의 트리거가 맡는다
  - UNIQUE(`celeb_id`, `content_id`)
- 두 감상 테이블은 `status` CHECK('WANT'|'FINISHED')와 `visibility`(`visibility_type`, 기본값 'public')를 공유한다
- `member_contents.rating` CHECK: 0~5 (numeric). 셀럽 감상경위에는 별점을 두지 않는다
- **`records`**: 기록. type CHECK 'NOTE'|'QUOTE', content, rating, location, visibility, source_url, contributor_id
- **`notes`** / **`note_sections`**: 구조화된 감상 노트. notes(user_id, content_id, snapshot jsonb, memo) + note_sections(title, memo, is_completed, sort_order)
- **`academy_lesson_progress`**: 학당 레슨별 학습 진행 (category_id/sub_category_id/lesson_id, is_completed, completed_at, last_studied_at)

### 플로우(Flow) — 구 playlists

`playlists` / `playlist_items` 테이블은 **존재하지 않는다**. 현재 구조는 다음과 같다.

- **`flows`**: 플로우 마스터 (FK 이름에 `playlists_user_id_fkey` 잔재가 남아 있음)
- **`flow_nodes`**: 플로우 노드 (→ `contents.id` FK)
- **`flow_stages`** / **`flow_progress`** / **`saved_flows`**

## content_locales

콘텐츠 언어별 메타의 단일 저장소. 2026-03-06 마이그레이션(`create_content_locales` → `drop_contents_legacy_locale_columns_v2`)으로 이관 완료.

| 컬럼 | 타입 | 비고 |
|------|------|------|
| `content_id` | text | PK(복합), `contents.id` FK ON DELETE CASCADE |
| `locale` | text | PK(복합). 실사용 값: `ko`, `en` |
| `title` | text | |
| `creator` | text | 저자·감독·아티스트 |
| `thumbnail_url` | text | |
| `description` | text | |
| `isbn` | text | |
| `publisher` | text | |
| `affiliate_url` | jsonb | 제휴 링크 (locale별) |
| `verified` | boolean | **3상태**. 아래 참조 |
| `sources` | jsonb | 필드별 출처 추적. 아래 참조 |
| `created_at` / `updated_at` | timestamptz | |

- **PK**: `(content_id, locale)`
- 콘텐츠 1건은 로케일별로 0~N행을 가진다. 한쪽 로케일만 있는 콘텐츠가 정상적으로 존재한다

### 인덱스 / RLS

```sql
CREATE INDEX idx_content_locales_locale ON content_locales (locale);
CREATE INDEX idx_content_locales_isbn ON content_locales (isbn) WHERE isbn IS NOT NULL;
```

RLS 활성. 정책 3종: SELECT `USING (true)` 전체 공개 / INSERT `WITH CHECK (auth.role() = 'authenticated')` / UPDATE `USING (true) WITH CHECK (true)`.

### verified — 3상태 정의

`verified`는 boolean이지만 **NULL을 포함한 3상태**로 쓴다. "찾아봤는데 없음"과 "아직 안 찾아봄"을 구분하기 위한 설계다. NULL을 false로 뭉개면 재수집 대상 판별이 깨진다.

| 값 | 의미 | 예시 |
|----|------|------|
| `NULL` | 아직 검색 안 함 | 신규 등록 직후 |
| `true` | 검색 완료, 데이터 확인됨 | Open Library에서 ISBN+썸네일 확인 |
| `false` | 검색했으나 데이터 없음 | 해당 ISBN이 존재하지 않음 |

3상태 모두 실사용 중이다 (실측 2026-07-16: en true 6959 / false 506 / NULL 12, ko true 6888 / false 7 / NULL 63).

### sources JSONB 스키마

각 필드의 데이터 출처를 추적한다. **CHECK 제약이 없는 자유 jsonb다** — 아래 값은 실측 분포이며 DB가 강제하지 않는다.

```jsonc
// 신규 한국어 BOOK의 단일 출처
{ "primary": "kakao_book" }

// 혼합 출처 (썸네일만 다른 곳에서 왔을 때)
{ "primary": "openlibrary", "thumbnail": "goodreads" }
```

#### 키

| 키 | 의미 | 실측 건수 |
|----|------|-----------|
| `primary` | 레코드의 title·creator·isbn 출처 | 14,416 |
| `thumbnail` | 썸네일만 별도 출처일 때. 없으면 primary와 동일 | 5,275 |
| `google_books_id` | Google Books 볼륨 ID 부가 기록 | 133 |
| `note` | 자유 메모 | 22 |
| `isbn` | ISBN만 별도 출처일 때 | 1 |

#### primary 값 (실측 2026-07-16)

| 값 | 주 대상 | 건수 |
|----|---------|------|
| `openlibrary` | BOOK en (신규 파이프라인) | 3,819 |
| `naver_book` | BOOK ko | 3,806 |
| `tmdb` | VIDEO ko/en | 2,912 |
| `google_books` | BOOK en (구 스크립트. 신규 수집 금지) | 282 |
| `igdb` | GAME ko/en | 240 |
| `wikidata` | BOOK en | 147 |
| `none` | BOOK en. 출처 없음 확정 | 107 |
| `transliteration` | BOOK ko/en. 음역 생성 | 93 |
| `manual` | BOOK en. 수동 입력 | 35 |
| `wikipedia` | BOOK ko | 4 |
| `aladin` | BOOK ko | 3 |

> 위 표는 **2026-07-16 당시의 역사적 분포**다. 신규 수집의 현재 기본 대응은
> BOOK=`kakao_book`(ko)/`openlibrary`(en), VIDEO=`tmdb`, GAME=`igdb`, MUSIC=`itunes`다.
> 기존 `naver_book`·`google_books` 표기는 과거 데이터의 출처 이력으로만 읽는다.

#### thumbnail 값 (실측 2026-07-16)

| 값 | 비고 | 건수 |
|----|------|------|
| `goodreads` | BookCover API 경유 Goodreads 표지 | 2,050 |
| `openlibrary` | Open Library 커버 | 1,463 |
| `tmdb_en` | TMDB 영문 포스터 | 1,326 |
| `confirmed_unavailable` | 수집처 전부 미보유 확정. **재수집 스킵 대상** | 220 |
| `google_books` | | 190 |
| `tmdb` | | 12 |
| `naver_book` | | 6 |
| `aladin` | | 3 |
| `openlibrary_isbn` | | 2 |
| `confirmed_unavailable_en` | | 2 |
| `tmdb_textless` | 텍스트 없는 포스터 | 1 |

> `sources.primary`(자유 jsonb)와 `contents.external_source`(CHECK 제약)는 **별개다.** 값 집합이
> 일치하지 않는다. `wikidata`·`transliteration`·`manual`·`none` 등은 sources에만 존재한다.
> `aladin`은 2026-08-10 live CHECK가 허용하는 호환 값이지만, 신규 BOOK 메타·커버 수집 정책은
> `kakao_book`(ko)·`openlibrary`(en)만 허용한다.

## content_locales 조회 규칙

### `!inner` JOIN 금지 — LEFT JOIN을 써라

**해당 locale 행이 없는 콘텐츠는 `!inner`에서 결과 자체가 통째로 누락된다.** content_locales는 콘텐츠당 로케일 행이 0~N개이고 한쪽만 있는 경우가 정상이므로, inner join을 걸면 목록에서 조용히 사라진다.

```typescript
// ❌ ko 행이 없는 콘텐츠는 결과에서 사라진다
.select('id, type, content_locales!inner(title, creator, thumbnail_url)')
.eq('content_locales.locale', locale)

// ✅ LEFT JOIN — 행이 없어도 콘텐츠는 남는다
.select('id, type, content_locales(locale, title, creator, thumbnail_url)')
// → data.content_locales = [{ locale: 'ko', ... }, { locale: 'en', ... }]
```

### 기본 조회 (단일 로케일)

```sql
SELECT c.id, c.type, c.release_date,
       cl.title, cl.creator, cl.thumbnail_url
FROM contents c
LEFT JOIN content_locales cl
  ON c.id = cl.content_id AND cl.locale = :locale
WHERE c.id = :id;
```

### Fallback 조회 (ko 우선, 없으면 en)

```sql
SELECT c.id, c.type, c.release_date,
       COALESCE(cl_pref.title, cl_fb.title) AS title,
       COALESCE(cl_pref.creator, cl_fb.creator) AS creator,
       COALESCE(cl_pref.thumbnail_url, cl_fb.thumbnail_url) AS thumbnail_url
FROM contents c
LEFT JOIN content_locales cl_pref
  ON c.id = cl_pref.content_id AND cl_pref.locale = :preferred  -- 'ko'
LEFT JOIN content_locales cl_fb
  ON c.id = cl_fb.content_id AND cl_fb.locale = :fallback       -- 'en'
WHERE c.id = :id;
```

### 양쪽 로케일 조회 (web-bo 관리 화면)

```sql
SELECT c.id, c.type,
       ko.title AS title_ko, ko.isbn AS isbn_ko, ko.verified AS verified_ko,
       en.title AS title_en, en.isbn AS isbn_en, en.verified AS verified_en
FROM contents c
LEFT JOIN content_locales ko ON c.id = ko.content_id AND ko.locale = 'ko'
LEFT JOIN content_locales en ON c.id = en.content_id AND en.locale = 'en'
WHERE c.type = 'BOOK'
ORDER BY c.created_at DESC;
```

### 콘텐츠 생성

`contents` INSERT 시 `content_locales` 행을 자동 생성하는 **트리거는 없다** (`contents`에 트리거 0개). 앱 코드에서 `contents` INSERT + `content_locales` INSERT를 함께 처리한다.

## contents.id — UUID 체계

`contents.id`는 UUID 문자열 (컬럼 타입은 text, 기본값 `gen_random_uuid()::text`). 외부 API 식별자는 `contents.external_id`에 보존한다.

| 컬럼 | 역할 | 형식 |
|------|------|------|
| `id` | PK, FK 조인용 | UUID (text 저장) |
| `external_id` | 외부 API 식별자 | ISBN, `tmdb-movie-550`, `igdb-1942`, `itunes-1440857781` |

- **web / web-bo 구분 없이 단일 체계다.** 과거 "web은 외부 API ID를 id로 직접 사용" 서술은 폐기됨(2026-03-01 `convert_contents_id_to_uuid` + `set_contents_id_default_uuid`)
- `addContent`의 `params.id`는 externalId 의미 → `external_id`로 중복 체크 후 UUID 자동 생성
- `contents.id` 참조 FK: `member_contents`, `celeb_contents`, `records`, `notes`, `flow_nodes`, `content_locales` (모두 ON DELETE CASCADE)
- 프론트엔드: `ContentDetailData.content.externalId` 필드로 전달

## 커뮤니티/시스템

- **`member_notifications`**: 로그인 회원 알림. 수신자는 `member_id`, 행위자는
  `actor_member_id`로 `user_accounts.id`를 참조한다. 인증 사용자는 본인 행의 읽음 처리·삭제만
  할 수 있고 임의 INSERT는 허용하지 않는다
- **`member_guestbook_entries`** / **`celeb_guestbook_entries`**: 회원 방명록과 셀럽
  방명록. 작성자는 항상 `author_member_id → user_accounts.id`다
- **`notices`**, **`feedbacks`**, **`board_comments`**
- **`free_posts`** / **`free_post_comments`**: 자유게시판 (author_id ON DELETE SET NULL)
- **`record_likes`** / **`record_comments`**: 기록 반응
- **`reports`**: 신고. target_type CHECK: user|record|content|comment|guestbook|**post|feedback**(26.07.30 2종 추가) / status CHECK: pending|resolved|rejected
  - `target_user_id` — 신고 대상 글의 작성자(FK → `user_accounts` ON DELETE SET NULL). 운영 화면이 반복 신고·악용을 집계하는 축이다. 26.07.30 추가
  - `unique(reporter_id, target_type, target_id)` — 같은 사람이 같은 대상을 중복 신고하지 못한다. **접수 액션은 이 위반(23505)을 오류가 아니라 "이미 신고함"으로 돌려준다**
  - 인덱스: `(status, created_at desc)` · `(target_type, target_id)` · `(target_user_id)`
  - RLS: 본인 신고 insert·select, `admin`·`super_admin`은 ALL
- **`member_scores`** / **`member_score_logs`**: 회원 활동 점수와 로그. 셀럽의 옛 점수·
  로그는 `private.celeb_score_archive`·`private.celeb_score_log_archive`에 비노출 보관한다
- **`tier_lists`**, **`blind_game_scores`**: 경장(Arena) 게임
- **`activity_logs`**: 활동 로그 (90일 보관)
- **`content_recommendations`**: 회원 콘텐츠 추천(sender→receiver).
  `member_content_id → member_contents.id`; 알림은 참여자·상태를 검증하는
  `create_recommendation_notification` RPC가 수신자와 행위자를 서버에서 결정한다
- **`daily_figures`**: 오늘의 인물 (celeb_id FK)
- **`api_keys`** / **`api_key_usage`**: API 키 발급·사용량
- **`remotion_images`**: 리모션 영상용 이미지 카탈로그 (R2 저장, 에피소드 간 재활용). **RLS 비활성** 상태다

## 주요 트리거 (core)

| 테이블 | 트리거 | 동작 |
|--------|--------|------|
| `member_profiles` | 회원 초기화 트리거 | `member_social_stats`·`member_scores` 초기 행 보장 |
| `celebs` | 셀럽 초기화 트리거 | `celeb_metrics` 초기 행 보장 |
| `member_contents` | 카운트·점수 트리거 | 회원 콘텐츠 수와 `contents.member_count` 갱신, 최초 감상 점수 1회 반영 |
| `celeb_contents` | 출처·카운트·0건 확정 트리거 | `source_url` 강제, 셀럽 지표와 `contents.celeb_count` 갱신, 콘텐츠 추가 시 0건 확정 해제 |
| `member_member_follows` | 관계·알림 트리거 | 회원 follower/following/friend 카운트와 이벤트별 알림 동기 |
| `member_celeb_follows` | 관계 트리거 | 회원 following과 셀럽 follower 카운트 동기 |
| `member_guestbook_entries` | 방명록 알림 트리거 | 이벤트별 회원 알림 생성·삭제 |
| `records` | 점수 트리거 | 회원 점수를 이벤트당 한 번 반영 |

셀럽 관련 트리거는 `db-celeb.md` 참조.
