# Phase 3: 소셜

## 목표

**팔로우 관계, 피드, 좋아요/댓글 상호작용.**

---

## 기능 범위

| 기능 | 우선순위 | 설명 |
|------|----------|------|
| 팔로우 | P0 | 팔로우/언팔로우 |
| 차단 | P1 | 차단/해제 |
| 프로필 조회 | P0 | 다른 유저 프로필 |
| 피드 | P0 | 팔로잉 유저 활동 |
| 좋아요 | P0 | 기록 좋아요 |
| 댓글 | P1 | 기록 댓글 (1depth) |

---

## 데이터베이스

### 테이블 목록

| 테이블 | 용도 |
|--------|------|
| follows | 팔로우 관계 |
| blocks | 차단 관계 |
| user_social | 소셜 캐시 (팔로워/팔로잉/친구 수) |
| record_likes | 기록 좋아요 |
| record_comments | 기록 댓글 |

> 상세 스키마는 `01_데이터베이스_스키마.md` 참조

---

## API 구현

### 디렉토리 구조

```
src/actions/
├── social/
│   ├── follow.ts
│   ├── unfollow.ts
│   ├── block.ts
│   ├── unblock.ts
│   ├── getFollowers.ts
│   ├── getFollowing.ts
│   ├── getFriends.ts
│   └── checkRelation.ts
├── feed/
│   └── getFeed.ts
└── records/
    ├── likeRecord.ts
    ├── unlikeRecord.ts
    ├── getComments.ts
    └── addComment.ts
```

### 핵심 API

#### follow

```typescript
'use server'

export async function follow(targetUserId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다')
  if (user.id === targetUserId) throw new Error('자신을 팔로우할 수 없습니다')

  // 차단 여부 확인
  const { data: blocked } = await supabase
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id})`)

  if (blocked && blocked.length > 0) {
    throw new Error('차단된 사용자입니다')
  }

  await supabase.from('follows').insert({
    follower_id: user.id,
    following_id: targetUserId
  })
}
```

#### getFeed

```typescript
'use server'

interface GetFeedParams {
  type?: 'all' | 'following'
  cursor?: string
  limit?: number
}

export async function getFeed({
  type = 'following',
  cursor,
  limit = 20
}: GetFeedParams = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다')

  // 팔로잉 목록
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = following?.map(f => f.following_id) || []

  // 차단 목록
  const { data: blocked } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id)

  const blockedIds = blocked?.map(b => b.blocked_id) || []

  // 기록 조회 (visibility가 public인 것만)
  let query = supabase
    .from('records')
    .select(`
      *,
      user:profiles!user_id (id, nickname, avatar_url),
      content:contents!content_id (id, title, creator, thumbnail_url, type)
    `)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type === 'following' && followingIds.length > 0) {
    query = query.in('user_id', followingIds)
  }

  if (blockedIds.length > 0) {
    query = query.not('user_id', 'in', `(${blockedIds.join(',')})`)
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

#### likeRecord

```typescript
'use server'

export async function likeRecord(recordId: string): Promise<{ liked: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다')

  // 이미 좋아요 했는지 확인
  const { data: existing } = await supabase
    .from('record_likes')
    .select('id')
    .eq('record_id', recordId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // 좋아요 취소
    await supabase.from('record_likes').delete().eq('id', existing.id)
    return { liked: false }
  } else {
    // 좋아요
    await supabase.from('record_likes').insert({
      record_id: recordId,
      user_id: user.id
    })
    return { liked: true }
  }
}
```

---

## records RLS 수정

피드에서 다른 사용자의 공개 기록을 볼 수 있도록 RLS 정책 수정 필요.

```sql
-- 기존 SELECT 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Users can view own records." ON records;

CREATE POLICY "Users can view records" ON records
FOR SELECT USING (
  -- 본인 기록
  user_id = auth.uid()
  -- 전체 공개 (차단 제외)
  OR (
    visibility = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = records.user_id)
         OR (blocker_id = records.user_id AND blocked_id = auth.uid())
    )
  )
  -- 팔로워 공개
  OR (
    visibility = 'followers'
    AND EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid() AND following_id = records.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = records.user_id)
         OR (blocker_id = records.user_id AND blocked_id = auth.uid())
    )
  )
);
```

---

## 체크리스트

### 데이터베이스
- [ ] follows 테이블 생성 + RLS
- [ ] blocks 테이블 생성 + RLS
- [ ] user_social 테이블 생성
- [ ] user_social 자동 생성 트리거
- [ ] 팔로우 카운트 동기화 트리거
- [ ] record_likes 테이블 생성 + RLS
- [ ] record_comments 테이블 생성 + RLS
- [ ] records RLS 정책 수정

### 소셜 API
- [ ] follow 구현
- [ ] unfollow 구현
- [ ] block 구현
- [ ] unblock 구현
- [ ] getFollowers 구현
- [ ] getFollowing 구현
- [ ] getFriends 구현
- [ ] checkRelation 구현

### 피드 API
- [ ] getFeed 구현 (팔로잉 필터, 차단 제외)

### 상호작용 API
- [ ] likeRecord 구현
- [ ] getComments 구현
- [ ] addComment 구현
- [ ] deleteComment 구현

### UI
- [ ] 프로필 페이지 (팔로우 버튼)
- [ ] 팔로워/팔로잉 목록
- [ ] 피드 페이지
- [ ] 피드 카드 (좋아요, 댓글 수)
- [ ] 댓글 영역

---

## 완료 기준

1. 다른 유저를 팔로우/언팔로우할 수 있다
2. 피드에서 팔로잉 유저의 기록을 볼 수 있다
3. 기록에 좋아요를 누를 수 있다
4. 기록에 댓글을 작성할 수 있다
5. 차단한 유저의 콘텐츠가 보이지 않는다

---

*03_Phase3_소셜.md - 최종 수정: 2025-12-07*
