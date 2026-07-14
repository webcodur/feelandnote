# 아키텍처

## 디렉토리 구조 (sw/web/src)
```
app/
  (auth)/              # 인증 (login, signup, reset-password)
  (main)/              # 메인 레이아웃
    [userId]/           # 프로필/기록관 (chamber, merits, reading)
    agora/              # 광장 (feed, celeb-feed, friend-feed, board/notice, board/feedback)
    rest/               # 쉼터 (dawn, labyrinth, hegemony)
    content/[contentId]/ # 콘텐츠 상세
    explore/            # 탐색 (celebs, followers, following, friends, similar)
    notifications/
    scriptures/         # 서고 (chosen, era, profession, sage)
  (policy)/             # 약관
  (standalone)/         # 독립 레이아웃 (content, search)
  about/  |  auth/callback/  |  lab/
  reading/              # 독서 워크스페이스 (독립 라우트, 자체 actions/components/hooks)

actions/               # Server Actions: achievements, activity, auth, board, celebs, contents, guestbook, home, notes, notifications, playlists, recommendations, records, scriptures, search, user
components/
  features/            # 도메인별 (agora, board, book, content, explore, game, home, influence, landing, lounge, profile, recommendations, scriptures, user)
  layout/  |  shared/  |  ui/ (cards, icons/dark-theme, Layout)
  lab/
contexts/              # SoundContext
lib/                   # auth, config, errors, supabase(client/server/middleware), utils
types/                 # content, database, home, recommendation, supabase(자동생성)
constants/             # agora, archive, arena, board, categories, celebProfessions, filterStyles, image, influence, materials, navigation, scriptures, statuses, titles, zIndex
```

## 디렉토리 구조 (sw/web-bo/src)
```

## 디렉토리 구조 (sw/audio-bo)

로컬 GPU와 D드라이브 모델을 사용하는 독립 음성 작업실. 공개 웹 라우팅·사이트맵과 분리한다.

```text
src/app/                  # 단일 작업실 화면 + 작업 API
src/components/           # 새 작업, 단계 실행, 대본, 결과 비교
src/lib/                  # D드라이브 작업 저장소, 경로, 백그라운드 실행
scripts/audio-worker.ps1  # 단계별 로컬 작업자
scripts/*.py              # 받아쓰기, 학습, 합성
```
app/(admin)/           # activity-logs, api-usage, blind-game, celebs, contents, guestbooks, members, notes, playlists, records, reports, scores, settings, tier-lists, titles, users
  api/contents/search/ # 콘텐츠 검색 API
  login/
actions/admin/  |  components/  |  constants/  |  contexts/  |  hooks/  |  lib/supabase/  |  utils/
```

## 네비게이션 (5대 섹션)
`@/constants/navigation.tsx`가 Single Source of Truth. PC 헤더 + 모바일 바텀탭 공유.

| 키 | 라벨 | 경로 | 설명 |
|---|---|---|---|
| explore | 탐색 | /explore | 셀럽/사용자 탐색, 스포트라이트 |
| scriptures | 서고 | /scriptures | 셀럽 아카이브 (시대별, 직군별, 선택, 현인) |
| agora | 광장 | /agora | 피드, 게시판 |
| rest | 쉼터 | /rest | 미니게임 (여명, 미궁, 패권) |
| archive | 기록관 | /[userId] | 개인 프로필 (서재, 업적, 독서) |

## 콘텐츠 상세 라우팅
`/content/[contentId]` → `getContentDetail(contentId, category)` 호출.
