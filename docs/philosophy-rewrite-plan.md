# 감상 철학 재작성 계획

## 문제

감상 철학(`consumption_philosophy`)이 작성되어 있으나 **수집된 콘텐츠가 실제로 반영되지 않은 인물**이 대량 존재한다.

### 증상

- 철학 텍스트에 구체적 작품명(`『』`)이 없거나, 있어도 **본인 저서**만 언급
- 수집된 타인 콘텐츠(user_contents)가 4~34건 있는데도 철학에 하나도 반영 안 됨
- 예: 리처드 도킨스 — 콘텐츠 12건 보유, 철학에는 본인 저서 `『이기적 유전자』`만 언급

## 규모

| 구분 | 인원 |
|------|------|
| 1차: `『』` 자체가 없음 | 340명 |
| 2차: `『』` 있으나 수집 콘텐츠 미반영 | 211명 |
| **합계 (중복 제거 필요)** | **약 400~500명 추정** |

### 2차 대상 콘텐츠 보유량별 분포

| 콘텐츠 수 | 인원 | 우선순위 |
|-----------|------|---------|
| 11건+ | 약 60명 | 1순위 — 데이터 충분, 즉시 재작성 |
| 4~10건 | 약 100명 | 2순위 |
| 1~3건 | 약 50명 | 3순위 — 보충 검색 필요할 수 있음 |

## 판별 쿼리

### 1차: 작품명 자체 없음

```sql
SELECT id, nickname, profession
FROM profiles
WHERE profile_type = 'CELEB'
  AND consumption_philosophy IS NOT NULL
  AND LENGTH(consumption_philosophy) > 50
  AND consumption_philosophy NOT LIKE '%『%'
ORDER BY nickname;
```

### 2차: 작품명 있으나 수집 콘텐츠 미반영

```sql
WITH celeb_contents AS (
  SELECT p.id AS celeb_id, p.nickname, p.profession,
         p.consumption_philosophy, c.title AS content_title
  FROM profiles p
  JOIN user_contents uc ON uc.user_id = p.id
  JOIN contents c ON c.id = uc.content_id
  WHERE p.profile_type = 'CELEB'
    AND p.consumption_philosophy IS NOT NULL
    AND LENGTH(p.consumption_philosophy) > 50
),
celeb_stats AS (
  SELECT celeb_id, nickname, profession,
    COUNT(*) AS total_content,
    SUM(CASE
      WHEN consumption_philosophy LIKE '%' || LEFT(content_title, 8) || '%'
      THEN 1 ELSE 0
    END) AS mentioned_count
  FROM celeb_contents
  GROUP BY celeb_id, nickname, profession
)
SELECT nickname, profession, total_content, mentioned_count
FROM celeb_stats
WHERE mentioned_count = 0 AND total_content >= 4
ORDER BY total_content DESC;
```

## 작업 방법

1. 위 쿼리로 대상자 목록 확정
2. `celeb-philosophy` 에이전트로 5~10명씩 배치 처리
3. 기존 철학 전면 교체 (UPDATE)
4. 룰북 `.claude/rules/celeb-3-philosophy.md` 기준 준수
   - 결정적 콘텐츠(타인 작품) 1개 이상 필수
   - DB `user_contents.review`를 핵심 소스로 활용
   - `『』` 겹낫표로 작품명 표기
