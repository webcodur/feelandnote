# Phase 4: 게이미피케이션

## 목표

**점수, 칭호, 놀이터 기능으로 사용자 참여 유도.**

---

## 기능 범위

| 기능 | 우선순위 | 설명 |
|------|----------|------|
| 점수 시스템 | P0 | 활동별 점수 적립 |
| 영향력 | P0 | 소셜 파워 수치화 |
| 칭호 | P1 | 조건 달성 시 자동 해금 |
| 티어리스트 | P1 | S/A/B/C/D 랭킹 |
| 블라인드 게임 | P2 | 기록으로 작품 맞추기 |

---

## 데이터베이스

### 테이블 목록

| 테이블 | 용도 |
|--------|------|
| user_scores | 점수 캐시 (활동/칭호/총점) |
| score_logs | 점수 획득 이력 |
| titles | 칭호 마스터 데이터 |
| user_titles | 유저별 해금 칭호 |
| tier_lists | 티어리스트 |
| blind_game_scores | 블라인드 게임 기록 |

> 상세 스키마는 `01_데이터베이스_스키마.md` 참조

---

## API 구현

### 디렉토리 구조

```
src/actions/
├── stats/
│   ├── getUserStats.ts
│   ├── getScoreLogs.ts
│   └── getActivityHeatmap.ts
├── titles/
│   ├── getUserTitles.ts
│   ├── getAllTitles.ts
│   └── checkTitles.ts
└── playground/
    ├── tierlist/
    │   ├── getTierLists.ts
    │   ├── createTierList.ts
    │   ├── updateTierList.ts
    │   └── deleteTierList.ts
    └── blindgame/
        ├── getQuestion.ts
        ├── submitAnswer.ts
        └── getLeaderboard.ts
```

### 핵심 API

#### getUserStats

```typescript
'use server'

export async function getUserStats(userId?: string) {
  const supabase = await createClient()

  const targetId = userId || (await supabase.auth.getUser()).data.user?.id

  const [scores, social, contentCount, recordCount] = await Promise.all([
    supabase.from('user_scores').select('*').eq('user_id', targetId).single(),
    supabase.from('user_social').select('*').eq('user_id', targetId).single(),
    supabase.from('user_contents').select('id', { count: 'exact' }).eq('user_id', targetId),
    supabase.from('records').select('id', { count: 'exact' }).eq('user_id', targetId)
  ])

  return {
    activityScore: scores.data?.activity_score || 0,
    titleBonus: scores.data?.title_bonus || 0,
    totalScore: scores.data?.total_score || 0,
    friendCount: social.data?.friend_count || 0,
    followerCount: social.data?.follower_count || 0,
    followingCount: social.data?.following_count || 0,
    influence: social.data?.influence || 0,
    contentCount: contentCount.count || 0,
    recordCount: recordCount.count || 0
  }
}
```

#### getBlindGameQuestion

```typescript
'use server'

export async function getBlindGameQuestion() {
  const supabase = await createClient()

  // 텍스트가 있는 공개 기록 중 랜덤 선택
  const { data } = await supabase
    .from('records')
    .select(`
      id,
      content,
      type,
      contentData:contents!content_id (
        id, title, type, creator
      )
    `)
    .eq('visibility', 'public')
    .in('type', ['REVIEW', 'QUOTE'])
    .not('content', 'is', null)
    .limit(100)

  if (!data || data.length === 0) {
    throw new Error('문제를 생성할 수 없습니다')
  }

  // 랜덤 선택
  const record = data[Math.floor(Math.random() * data.length)]

  return {
    questionId: record.id,
    text: record.content,
    hints: [
      { type: 'category', value: record.contentData?.type, penalty: 1 },
      { type: 'creator', value: record.contentData?.creator, penalty: 2 }
    ]
  }
}
```

---

## 점수 트리거

### 콘텐츠 추가 시 +1

```sql
CREATE OR REPLACE FUNCTION on_content_add()
RETURNS TRIGGER AS $$
BEGIN
  -- 점수 로그
  INSERT INTO score_logs (user_id, type, action, amount, reference_id)
  VALUES (NEW.user_id, 'activity', 'content_add', 1, NEW.content_id);

  -- 점수 업데이트
  UPDATE user_scores
  SET activity_score = activity_score + 1,
      total_score = total_score + 1,
      updated_at = now()
  WHERE user_id = NEW.user_id;

  -- 영향력 재계산
  PERFORM update_influence(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_content_insert
AFTER INSERT ON user_contents
FOR EACH ROW EXECUTE FUNCTION on_content_add();
```

### 기록 작성 시 +5

```sql
CREATE OR REPLACE FUNCTION on_record_add()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO score_logs (user_id, type, action, amount, reference_id)
  VALUES (NEW.user_id, 'activity', 'record_add', 5, NEW.id);

  UPDATE user_scores
  SET activity_score = activity_score + 5,
      total_score = total_score + 5,
      updated_at = now()
  WHERE user_id = NEW.user_id;

  PERFORM update_influence(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_record_insert
AFTER INSERT ON records
FOR EACH ROW EXECUTE FUNCTION on_record_add();
```

---

## 칭호 체크 로직

### Server Action

```typescript
// src/actions/titles/checkTitles.ts
'use server'

interface TitleCondition {
  type: string
  value: number
}

export async function checkAndUnlockTitles(userId: string) {
  const supabase = await createClient()

  // 유저 통계 조회
  const stats = await getUserStats(userId)

  // 미해금 칭호 조회
  const { data: unlockedIds } = await supabase
    .from('user_titles')
    .select('title_id')
    .eq('user_id', userId)

  const unlockedSet = new Set(unlockedIds?.map(t => t.title_id) || [])

  // 모든 칭호 조회
  const { data: titles } = await supabase
    .from('titles')
    .select('*')

  const newlyUnlocked = []

  for (const title of titles || []) {
    if (unlockedSet.has(title.id)) continue

    const condition = title.condition as TitleCondition

    if (checkCondition(condition, stats)) {
      // 칭호 해금
      await supabase.from('user_titles').insert({
        user_id: userId,
        title_id: title.id
      })

      // 보너스 점수 추가
      await supabase.from('score_logs').insert({
        user_id: userId,
        type: 'title',
        action: `title_${title.name}`,
        amount: title.bonus_score
      })

      await supabase
        .from('user_scores')
        .update({
          title_bonus: stats.titleBonus + title.bonus_score,
          total_score: stats.totalScore + title.bonus_score,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      newlyUnlocked.push(title)
    }
  }

  return newlyUnlocked
}

function checkCondition(condition: TitleCondition, stats: any): boolean {
  switch (condition.type) {
    case 'content_count':
      return stats.contentCount >= condition.value
    case 'record_count':
      return stats.recordCount >= condition.value
    case 'follower_count':
      return stats.followerCount >= condition.value
    default:
      return false
  }
}
```

---

## 체크리스트

### 데이터베이스
- [ ] user_scores 테이블 생성
- [ ] score_logs 테이블 생성
- [ ] titles 테이블 생성 + 초기 데이터
- [ ] user_titles 테이블 생성
- [ ] tier_lists 테이블 생성
- [ ] blind_game_scores 테이블 생성
- [ ] 점수 트리거들 생성
- [ ] 영향력 계산 함수 생성

### 점수/통계 API
- [ ] getUserStats 구현
- [ ] getScoreLogs 구현
- [ ] getActivityHeatmap 구현

### 칭호 API
- [ ] getAllTitles 구현
- [ ] getUserTitles 구현
- [ ] checkTitles 구현

### 티어리스트 API
- [ ] getTierLists 구현
- [ ] createTierList 구현
- [ ] updateTierList 구현
- [ ] deleteTierList 구현

### 블라인드 게임 API
- [ ] getQuestion 구현
- [ ] submitAnswer 구현
- [ ] getLeaderboard 구현

### UI
- [ ] 통계 페이지 (점수, 영향력)
- [ ] 업적서 페이지 (칭호 목록)
- [ ] 칭호 해금 팝업
- [ ] 티어리스트 에디터 (드래그앤드롭)
- [ ] 블라인드 게임 플레이 화면

---

## 완료 기준

1. 활동 시 점수가 자동 적립된다
2. 통계 페이지에서 점수와 영향력을 확인할 수 있다
3. 조건 달성 시 칭호가 해금된다
4. 티어리스트를 생성하고 작품을 배치할 수 있다
5. 블라인드 게임을 플레이할 수 있다

---

*04_Phase4_게이미피케이션.md - 최종 수정: 2025-12-07*
