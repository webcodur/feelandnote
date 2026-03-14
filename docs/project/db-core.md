# DB 스키마 - Core

Supabase 프로젝트 ID: `wouqtpvfctednlffross`

## 사용자/인증

- **`profiles`**: 사용자·셀럽 통합 테이블. `profile_type`('USER'|'CELEB')로 구분. 주요 사용: profession, title, bio, quotes, cultural_journey, nationality, birth/death_date, gender(bool), is_verified
- **`follows`**: 팔로우 관계(follower_id → following_id)
- **`user_social`**: 소셜 카운트 캐시 (follower/following/friend/content_count)

## 콘텐츠

- **`contents`**: 콘텐츠 마스터. **id는 text** (web: 외부 API ID 직접 사용, web-bo: UUID). type('BOOK'|'VIDEO'|'GAME'|'MUSIC'|'CERTIFICATE'), external_source
- **`user_contents`**: 사용자↔콘텐츠 관계. status('WANT'|'FINISHED'), rating(0~5), review, visibility('public'|'followers'|'private'), is_pinned, is_recommended
- **`records`**: 기록. type('NOTE'|'QUOTE'), content, location
- **`notes`** / **`note_sections`**: 구조화된 감상 노트 (템플릿 섹션별 관리)
- **`academy_lesson_progress`**: 학당 레슨별 학습 진행 (최근 학습, 완료 레슨, 완료 시간)
- **`playlists`** / **`playlist_items`**: 사용자 컬렉션

### contents ID 체계 (주의)

| 구분 | contents.id | external_id |
|------|-------------|-------------|
| web | 외부 API ID 직접 사용 (ISBN 등) | null |
| web-bo | UUID 생성 | 외부 API ID |

## contents.id — UUID 체계

`contents.id`는 UUID (`gen_random_uuid()::text`). 외부 API 식별자는 `contents.external_id`에 보존.

| 컬럼 | 역할 | 형식 |
|------|------|------|
| `id` | PK, FK 조인용 | UUID |
| `external_id` | 외부 API 식별자 | ISBN, `tmdb-movie-550`, `igdb-1942`, `spotify-xxx` |

- `addContent`의 `params.id`는 externalId 의미 → `external_id`로 중복 체크 후 UUID 자동 생성
- FK 참조: `user_contents`, `records`, `notes`, `flow_nodes`, `content_locales` → `contents.id`
- 프론트엔드: `ContentDetailData.content.externalId` 필드로 전달

## 커뮤니티/시스템

- **`notifications`**, **`guestbook_entries`**, **`notices`**, **`feedbacks`**, **`board_comments`**
- **`reports`**: 신고 (target_type: user|record|content|comment|guestbook)
- **`user_scores`** / **`score_logs`**: 활동 점수 시스템
- **`tier_lists`**, **`blind_game_scores`**: 경장(Arena) 게임
- **`activity_logs`**: 활동 로그 (90일 보관)
- **`content_recommendations`**: 콘텐츠 추천 (sender→receiver)
