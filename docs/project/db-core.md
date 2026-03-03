# DB 스키마 - Core

Supabase 프로젝트 ID: `wouqtpvfctednlffross`

## 사용자/셀럽
- **`profiles`**: 사용자·셀럽 통합 테이블. `profile_type`('USER'|'CELEB')로 구분. 셀럽 전용: profession, title, bio, quotes, consumption_philosophy, nationality, birth/death_date, gender(bool), is_verified
- **`follows`**: 팔로우 관계 (follower_id → following_id)
- **`user_social`**: 소셜 카운터 캐시 (follower/following/friend/content_count)

## 콘텐츠
- **`contents`**: 콘텐츠 마스터. **id는 text** (web: 외부API ID 직접 사용, web-bo: UUID). type('BOOK'|'VIDEO'|'GAME'|'MUSIC'|'CERTIFICATE'), external_source
- **`user_contents`**: 사용자↔콘텐츠 관계. status('WANT'|'FINISHED'), rating(0~5), review, visibility('public'|'followers'|'private'), is_pinned, is_recommended
- **`records`**: 기록. type('NOTE'|'QUOTE'), content, location
- **`notes`** / **`note_sections`**: 구조화된 감상 노트 (템플릿, 섹션별 관리)
- **`playlists`** / **`playlist_items`**: 사용자 컬렉션

### contents ID 체계 (주의)
| 구분 | contents.id | external_id |
|------|-------------|-------------|
| web | 외부 API ID 직접 사용 (ISBN 등) | null |
| web-bo | UUID 생성 | 외부 API ID |

## 커뮤니티/시스템
- **`notifications`**, **`guestbook_entries`**, **`notices`**, **`feedbacks`**, **`board_comments`**
- **`reports`**: 신고 (target_type: user|record|content|comment|guestbook)
- **`user_scores`** / **`score_logs`**: 활동 점수 시스템
- **`tier_lists`**, **`blind_game_scores`**: 전장(Arena) 게임
- **`activity_logs`**: 활동 로그 (90일 보관)
- **`content_recommendations`**: 콘텐츠 추천 (sender→receiver)
