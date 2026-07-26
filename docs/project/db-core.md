# DB 스키마 - Core

> **최종 실측 체크: 26.07.16** — 실 DB 스키마 전량 대조, 아카이브에 격리됐던 sources·verified 정의 회수

Supabase 프로젝트 ID: `wouqtpvfctednlffross`

이 문서는 실제 스키마와 1:1 대조해 갱신한다.

## 사용자/인증

- **`profiles`**: 사용자·셀럽 통합 테이블. `profile_type`('USER'|'CELEB')로 구분
  - 주요 컬럼: nickname, nickname_en, email, avatar_url, bio, profession, title, nationality, birth_date, death_date, gender(bool), is_verified, claimed_by, role, status
  - `role` CHECK: 'user'|'admin'|'super_admin'
  - `status` CHECK: 'active'|'inactive'|'suspended'|'deleted'
  - `profile_type` CHECK: 'USER'|'CELEB'
  - `chk_celeb_profession`: `profile_type='CELEB'`이면 profession은 16종 중 하나 (leader, politician, commander, entrepreneur, investor, humanities_scholar, social_scientist, scientist, director, musician, visual_artist, author, actor, influencer, athlete, other)
  - `birth_date` / `death_date`는 **text** (BC 표기 `-384` 등을 담기 위함. date 타입 아님)
  - 셀럽 전용 컬럼은 `db-celeb.md` 참조
- **`follows`**: 팔로우 관계(follower_id → following_id)
- **`blocks`**: 차단 관계(blocker_id → blocked_id)
- **`user_social`**: 소셜 카운트 캐시 (follower/following/friend/content_count)

### profiles.quotes — 삭제됨

`profiles.quotes` / `profiles.quotes_en`은 **존재하지 않는다** (2026-03-23 마이그레이션 `drop_profiles_quotes_and_recreate_compat_view`로 DROP). 명언 SSoT는 `celeb_dialogues.lines.quote` → `db-celeb.md` 참조.

### cultural_journey — 생성 컬럼

- 실제 저장 컬럼은 **`consumption_philosophy`** / `consumption_philosophy_en`
- `cultural_journey` / `cultural_journey_en`은 그 값을 그대로 노출하는 **generated column** (읽기 전용, 직접 UPDATE 불가)
- **쓰기는 `consumption_philosophy`에** 한다

### profiles_compat 뷰

`profiles_compat` 뷰가 존재한다. profiles 전 컬럼에 `consumption_philosophy AS cultural_journey` 별칭을 얹은 하위호환용이며, quotes는 포함하지 않는다.

## 콘텐츠

- **`contents`**: 콘텐츠 마스터. 언어 중립 메타만 보유
  - 컬럼: `id`(text, 기본값 `gen_random_uuid()::text`), `type`, `subtype`, `metadata`(jsonb), `release_date`(text), `external_source`, `external_id`, `user_count`, `created_at`
  - `type` CHECK: 'BOOK'|'VIDEO'|'GAME'|'MUSIC' (자격증 타입 `CERTIFICATE`는 26.07.27 전면 폐기 — 코드·데이터·제약 모두 제거)
  - `external_source` CHECK: NULL 또는 'naver_book'|'google_books'|'openlibrary'|'tmdb'|'igdb'|'spotify' (DB가 허용하는 값. 운영 정책상 실제 사용 출처는 별도 규약을 따른다)
  - **title/creator/thumbnail_url/description/isbn/publisher/affiliate_url은 contents에 없다.** 전부 `content_locales`로 이관됨(2026-03-06 `drop_contents_legacy_locale_columns_v2`)
- **`content_locales`**: 콘텐츠 언어별 메타 (아래 상세)
- **`user_contents`**: 사용자↔콘텐츠 관계
  - 컬럼: user_id, content_id, status, rating, review, review_en, review_presets(text[]), is_spoiler, is_pinned, pinned_at, visibility, source_url, contributor_id, completed_at, is_recommended
  - `status` CHECK: 'WANT'|'FINISHED'
  - `rating` CHECK: 0~5 (numeric)
  - `visibility`: `visibility_type` enum, 기본값 'public'
  - UNIQUE(user_id, content_id)
  - 트리거 `trg_celeb_source_url`: user_id가 CELEB 프로필이면 **INSERT 시 source_url 필수** (없으면 예외)
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
// 단일 출처 (대부분의 경우)
{ "primary": "naver_book" }

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
| `spotify` | MUSIC ko/en | 2,965 |
| `tmdb` | VIDEO ko/en | 2,912 |
| `google_books` | BOOK en (구 스크립트. 신규 수집 금지) | 282 |
| `igdb` | GAME ko/en | 240 |
| `wikidata` | BOOK en | 147 |
| `none` | BOOK en. 출처 없음 확정 | 107 |
| `transliteration` | BOOK ko/en. 음역 생성 | 93 |
| `manual` | BOOK en. 수동 입력 | 35 |
| `wikipedia` | BOOK ko | 4 |
| `aladin` | BOOK ko | 3 |

> 타입별 기본 대응은 BOOK=naver_book(ko)/openlibrary(en), VIDEO=tmdb, GAME=igdb, MUSIC=spotify이다. 단 BOOK en은 위처럼 출처가 다변화돼 있다.
> `qnet`(3건)은 자격증 타입 폐기(26.07.27)와 함께 데이터째 삭제됐다.

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

> `sources.primary`(자유 jsonb)와 `contents.external_source`(CHECK 제약)는 **별개다.** 값 집합이 일치하지 않는다 — `wikidata`·`transliteration`·`manual`·`none`·`aladin`은 sources에만 존재하며 external_source CHECK는 이들을 허용하지 않는다.

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
| `external_id` | 외부 API 식별자 | ISBN, `tmdb-movie-550`, `igdb-1942`, `spotify-xxx` |

- **web / web-bo 구분 없이 단일 체계다.** 과거 "web은 외부 API ID를 id로 직접 사용" 서술은 폐기됨(2026-03-01 `convert_contents_id_to_uuid` + `set_contents_id_default_uuid`)
- `addContent`의 `params.id`는 externalId 의미 → `external_id`로 중복 체크 후 UUID 자동 생성
- `contents.id` 참조 FK: `user_contents`, `records`, `notes`, `flow_nodes`, `content_locales` (모두 ON DELETE CASCADE)
- 프론트엔드: `ContentDetailData.content.externalId` 필드로 전달

## 커뮤니티/시스템

- **`notifications`**, **`guestbook_entries`**, **`notices`**, **`feedbacks`**, **`board_comments`**
- **`free_posts`** / **`free_post_comments`**: 자유게시판 (author_id ON DELETE SET NULL)
- **`record_likes`** / **`record_comments`**: 기록 반응
- **`reports`**: 신고. target_type CHECK: user|record|content|comment|guestbook / status CHECK: pending|resolved|rejected
- **`user_scores`** / **`score_logs`**: 활동 점수 시스템
- **`tier_lists`**, **`blind_game_scores`**: 경장(Arena) 게임
- **`activity_logs`**: 활동 로그 (90일 보관)
- **`content_recommendations`**: 콘텐츠 추천 (sender→receiver)
- **`daily_figures`**: 오늘의 인물 (celeb_id FK)
- **`api_keys`** / **`api_key_usage`**: API 키 발급·사용량
- **`remotion_images`**: 리모션 영상용 이미지 카탈로그 (R2 저장, 에피소드 간 재활용). **RLS 비활성** 상태다

## 주요 트리거 (core)

| 테이블 | 트리거 | 동작 |
|--------|--------|------|
| `profiles` | `on_profile_created_scores` / `on_profile_created_social` | 프로필 생성 시 user_scores·user_social 행 생성 |
| `user_contents` | `trg_celeb_source_url` | CELEB의 user_contents INSERT에 source_url 강제 |
| `user_contents` | `trigger_update_content_count` | user_social.content_count 동기 |
| `user_contents` | `trigger_update_content_user_count` | contents.user_count 동기 |
| `follows` | `sync_follow_counts` / `handle_new_follow` / `handle_delete_follow` | 팔로우 카운트·알림 |
| `records` | `on_record_insert` | 점수 반영 |

셀럽 관련 트리거는 `db-celeb.md` 참조.
