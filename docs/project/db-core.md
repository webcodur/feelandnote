# DB ?�키�?- Core

Supabase ?�로?�트 ID: `wouqtpvfctednlffross`

## ?�용???�??
- **`profiles`**: ?�용?�·�????�합 ?�이�? `profile_type`('USER'|'CELEB')�?구분. ?�???�용: profession, title, bio, quotes, cultural_journey, nationality, birth/death_date, gender(bool), is_verified
- **`follows`**: ?�로??관�?(follower_id ??following_id)
- **`user_social`**: ?�셜 카운??캐시 (follower/following/friend/content_count)

## 콘텐�?
- **`contents`**: 콘텐�?마스?? **id??text** (web: ?��?API ID 직접 ?�용, web-bo: UUID). type('BOOK'|'VIDEO'|'GAME'|'MUSIC'|'CERTIFICATE'), external_source
- **`user_contents`**: ?�용?�↔콘텐�?관�? status('WANT'|'FINISHED'), rating(0~5), review, visibility('public'|'followers'|'private'), is_pinned, is_recommended
- **`records`**: 기록. type('NOTE'|'QUOTE'), content, location
- **`notes`** / **`note_sections`**: 구조?�된 감상 ?�트 (?�플�? ?�션�?관�?
- **`academy_lesson_progress`**: �д� ���� �н� ��� (�ֱ� �н�, �Ϸ� ����, �Ϸ� �ð�)
- **`playlists`** / **`playlist_items`**: ?�용??컬렉??

### contents ID 체계 (주의)
| 구분 | contents.id | external_id |
|------|-------------|-------------|
| web | ?��? API ID 직접 ?�용 (ISBN ?? | null |
| web-bo | UUID ?�성 | ?��? API ID |

## 커�??�티/?�스??
- **`notifications`**, **`guestbook_entries`**, **`notices`**, **`feedbacks`**, **`board_comments`**
- **`reports`**: ?�고 (target_type: user|record|content|comment|guestbook)
- **`user_scores`** / **`score_logs`**: ?�동 ?�수 ?�스??
- **`tier_lists`**, **`blind_game_scores`**: ?�장(Arena) 게임
- **`activity_logs`**: ?�동 로그 (90??보�?)
- **`content_recommendations`**: 콘텐�?추천 (sender?�receiver)
