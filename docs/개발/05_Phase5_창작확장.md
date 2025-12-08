# Phase 5: 창작 & 확장

## 목표

**창작 기능, 나머지 카테고리, 알림 시스템.**

---

## 기능 범위

| 기능 | 우선순위 | 설명 |
|------|----------|------|
| What If | P0 | 상상 시나리오 작성 |
| 매체 전환 | P1 | 투표 기반 제안 |
| OST 상상 | P1 | 장면별 선곡 |
| 애니메이션 | P0 | TMDB API (애니 태그) |
| 게임 | P1 | IGDB API 연동 |
| 공연 | P2 | 직접 입력 |
| 알림 | P0 | 팔로우, 좋아요, 댓글 알림 |

---

## 데이터베이스

### 테이블 목록

| 테이블 | 용도 |
|--------|------|
| creations | 창작물 메인 테이블 |
| whatifs | What If 상세 데이터 |
| media_conversions | 매체 전환 상세 |
| media_conversion_votes | 매체 전환 투표 |
| ost_imaginations | OST 상상 상세 |
| creation_likes | 창작물 좋아요 |
| creation_comments | 창작물 댓글 |
| notifications | 알림 |

> 상세 스키마는 Phase 5 전용 스키마 문서로 분리 예정

---

## 알림 트리거

### 팔로우 알림

```sql
CREATE OR REPLACE FUNCTION notify_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id, message)
  VALUES (
    NEW.following_id,
    'follow',
    NEW.follower_id,
    (SELECT nickname FROM profiles WHERE id = NEW.follower_id) || '님이 팔로우했습니다'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_follow_notify
AFTER INSERT ON follows
FOR EACH ROW EXECUTE FUNCTION notify_follow();
```

### 좋아요 알림 (records 테이블 기준)

```sql
CREATE OR REPLACE FUNCTION notify_record_like()
RETURNS TRIGGER AS $$
DECLARE
  v_record_owner UUID;
BEGIN
  SELECT user_id INTO v_record_owner
  FROM records WHERE id = NEW.record_id;

  -- 자신의 글에 좋아요는 알림 X
  IF v_record_owner != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type, message)
    VALUES (
      v_record_owner,
      'like_record',
      NEW.user_id,
      NEW.record_id,
      'record',
      (SELECT nickname FROM profiles WHERE id = NEW.user_id) || '님이 기록을 좋아합니다'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_record_like_notify
AFTER INSERT ON record_likes
FOR EACH ROW EXECUTE FUNCTION notify_record_like();
```

---

## IGDB API 연동

### 설정

```typescript
// src/lib/api/igdb.ts

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID!
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET!

let accessToken: string | null = null
let tokenExpiry: number = 0

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken
  }

  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?` +
    `client_id=${TWITCH_CLIENT_ID}&` +
    `client_secret=${TWITCH_CLIENT_SECRET}&` +
    `grant_type=client_credentials`,
    { method: 'POST' }
  )

  const data = await response.json()
  accessToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in * 1000)

  return accessToken
}

export async function searchIGDB(query: string) {
  const token = await getAccessToken()

  const response = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain'
    },
    body: `
      search "${query}";
      fields name, cover.url, first_release_date,
             involved_companies.company.name,
             platforms.name, genres.name;
      limit 20;
    `
  })

  return response.json()
}
```

---

## API 구현

### 디렉토리 구조

```
src/actions/
├── contents/
│   ├── searchAnime.ts       -- 추가
│   ├── searchGames.ts       -- 추가
│   └── addPerformance.ts    -- 추가 (직접 입력)
├── creations/
│   ├── getCreations.ts
│   ├── createWhatIf.ts
│   ├── createMediaConversion.ts
│   ├── createOstImagination.ts
│   ├── updateCreation.ts
│   ├── deleteCreation.ts
│   ├── likeCreation.ts
│   ├── commentCreation.ts
│   └── voteMediaConversion.ts
└── notifications/
    ├── getNotifications.ts
    ├── markAsRead.ts
    └── getUnreadCount.ts
```

### 핵심 API

#### createWhatIf

```typescript
'use server'

interface CreateWhatIfParams {
  contentId: string
  subtype: 'alternate_ending' | 'alternate_choice' | ...
  body: string
}

export async function createWhatIf(params: CreateWhatIfParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. creations insert
  const { data: creation } = await supabase
    .from('creations')
    .insert({
      user_id: user.id,
      content_id: params.contentId,
      type: 'whatif'
    })
    .select()
    .single()

  // 2. whatifs insert
  await supabase.from('whatifs').insert({
    creation_id: creation.id,
    subtype: params.subtype,
    body: params.body
  })

  // 3. 점수 +10
  await addScore(user.id, 'activity', 'creation_whatif', 10)

  return { creationId: creation.id }
}
```

#### voteMediaConversion

```typescript
'use server'

export async function voteMediaConversion(mediaConversionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 투표 추가
  const { error } = await supabase
    .from('media_conversion_votes')
    .insert({
      media_conversion_id: mediaConversionId,
      user_id: user.id
    })

  if (error) {
    if (error.code === '23505') {
      throw new Error('이미 투표했습니다')
    }
    throw error
  }

  // 투표 수 증가
  await supabase.rpc('increment_vote_count', { mc_id: mediaConversionId })

  // 목표 달성 체크
  const { data: mc } = await supabase
    .from('media_conversions')
    .select('vote_count, vote_goal, creation:creations!creation_id(user_id)')
    .eq('id', mediaConversionId)
    .single()

  if (mc.vote_count >= mc.vote_goal) {
    // 목표 달성 알림 및 보너스 (구현 필요)
  }

  return { voteCount: mc.vote_count }
}
```

#### getNotifications

```typescript
'use server'

interface GetNotificationsParams {
  cursor?: string
  limit?: number
  unreadOnly?: boolean
}

export async function getNotifications({
  cursor,
  limit = 20,
  unreadOnly = false
}: GetNotificationsParams = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!actor_id (id, nickname, avatar_url)
    `)
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) throw error

  return {
    items: data,
    nextCursor: data.length === limit ? data[data.length - 1].created_at : null
  }
}
```

---

## 체크리스트

### 데이터베이스
- [ ] creations 테이블 생성 + RLS
- [ ] whatifs 테이블 생성
- [ ] media_conversions 테이블 생성
- [ ] media_conversion_votes 테이블 생성
- [ ] ost_imaginations 테이블 생성
- [ ] creation_likes 테이블 생성
- [ ] creation_comments 테이블 생성
- [ ] notifications 테이블 생성 + RLS
- [ ] 알림 트리거들 생성

### 콘텐츠 API
- [ ] searchAnime 구현
- [ ] searchGames 구현 (IGDB)
- [ ] addPerformance 구현

### 창작 API
- [ ] getCreations 구현
- [ ] createWhatIf 구현
- [ ] createMediaConversion 구현
- [ ] createOstImagination 구현
- [ ] likeCreation 구현
- [ ] commentCreation 구현
- [ ] voteMediaConversion 구현

### 알림 API
- [ ] getNotifications 구현
- [ ] markAsRead 구현
- [ ] getUnreadCount 구현

### UI
- [ ] 창작 작성 모달 (3종)
- [ ] 창작 피드 카드
- [ ] 매체 전환 투표 UI
- [ ] 알림 드롭다운
- [ ] 알림 페이지
- [ ] 콘텐츠 추가에 애니/게임/공연 탭

---

## 완료 기준

1. What If 시나리오를 작성할 수 있다
2. 매체 전환을 제안하고 투표할 수 있다
3. OST 상상을 작성할 수 있다
4. 애니메이션, 게임을 검색하고 추가할 수 있다
5. 팔로우, 좋아요, 댓글 알림을 받을 수 있다

---

*05_Phase5_창작확장.md - 최종 수정: 2025-12-07*
