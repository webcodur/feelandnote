# DB ?¤í‚¤ë§?- Core

Supabase ?„ë¡œ?íŠ¸ ID: `wouqtpvfctednlffross`

## ?¬ìš©???€??
- **`profiles`**: ?¬ìš©?Â·ì????µí•© ?Œì´ë¸? `profile_type`('USER'|'CELEB')ë¡?êµ¬ë¶„. ?€???„ìš©: profession, title, bio, quotes, consumption_philosophy, nationality, birth/death_date, gender(bool), is_verified
- **`follows`**: ?”ë¡œ??ê´€ê³?(follower_id ??following_id)
- **`user_social`**: ?Œì…œ ì¹´ìš´??ìºì‹œ (follower/following/friend/content_count)

## ì½˜í…ì¸?
- **`contents`**: ì½˜í…ì¸?ë§ˆìŠ¤?? **id??text** (web: ?¸ë?API ID ì§ì ‘ ?¬ìš©, web-bo: UUID). type('BOOK'|'VIDEO'|'GAME'|'MUSIC'|'CERTIFICATE'), external_source
- **`user_contents`**: ?¬ìš©?â†”ì½˜í…ì¸?ê´€ê³? status('WANT'|'FINISHED'), rating(0~5), review, visibility('public'|'followers'|'private'), is_pinned, is_recommended
- **`records`**: ê¸°ë¡. type('NOTE'|'QUOTE'), content, location
- **`notes`** / **`note_sections`**: êµ¬ì¡°?”ëœ ê°ìƒ ?¸íŠ¸ (?œí”Œë¦? ?¹ì…˜ë³?ê´€ë¦?
- **`academy_lesson_progress`**: ÇĞ´ç ·¹½¼ ÇĞ½À ±â·Ï (ÃÖ±Ù ÇĞ½À, ¿Ï·á ¿©ºÎ, ¿Ï·á ½Ã°¢)
- **`playlists`** / **`playlist_items`**: ?¬ìš©??ì»¬ë ‰??

### contents ID ì²´ê³„ (ì£¼ì˜)
| êµ¬ë¶„ | contents.id | external_id |
|------|-------------|-------------|
| web | ?¸ë? API ID ì§ì ‘ ?¬ìš© (ISBN ?? | null |
| web-bo | UUID ?ì„± | ?¸ë? API ID |

## ì»¤ë??ˆí‹°/?œìŠ¤??
- **`notifications`**, **`guestbook_entries`**, **`notices`**, **`feedbacks`**, **`board_comments`**
- **`reports`**: ? ê³  (target_type: user|record|content|comment|guestbook)
- **`user_scores`** / **`score_logs`**: ?œë™ ?ìˆ˜ ?œìŠ¤??
- **`tier_lists`**, **`blind_game_scores`**: ?„ì¥(Arena) ê²Œì„
- **`activity_logs`**: ?œë™ ë¡œê·¸ (90??ë³´ê?)
- **`content_recommendations`**: ì½˜í…ì¸?ì¶”ì²œ (sender?’receiver)
