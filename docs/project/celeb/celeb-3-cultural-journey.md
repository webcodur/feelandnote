# 3. 감상 여정

뭘 보고 읽고 들었는지, 왜 좋아했는지, 그것이 인생에 어떤 영향을 줬는지 이야기로 풀어쓴 글. DB 컬럼: `profiles.cultural_journey`. 500자 이내.

---

## 작성 규칙

### 구조
- 작품은 2~3개만 쓴다. 가장 재미있는 것만 고른다.
- 첫 문단의 첫 문장은 본인 이름으로 시작한다.
- 마지막 문장은 자연스럽게 마무리한다. 앞에서 안 한 말을 새로 지어내지 않는다.
- 500자 이내.

### 문장
- 모든 문장에 주어를 넣는다. 주어를 콤마 뒤로 미루지 않는다.
- 대시(—, –, -) 사용 금지.

### 금지
- 정의하지 않는다. "A에게 독서란 B였다" 같은 문장 금지.
- 감상과 관계없는 감상적 문장을 붙이지 않는다. ("끝내 혼자였다", "그것이 그의 운명이었다" 등)

### 기호

| 용도 | 기호 |
|------|------|
| 작품명 | `『』` |
| 곡/에피소드 | `「」` |
| 직접 인용 | `""` |
| 강조/개념어 | `''` |

---

## 자료 수집

### full 셀럽 (celeb_tier = 'full')

```sql
SELECT c.type, cl.title, cl.creator, uc.review
FROM user_contents uc
JOIN contents c ON c.id = uc.content_id
LEFT JOIN content_locales cl ON cl.content_id = c.id AND cl.locale = 'ko'
WHERE uc.user_id = '{셀럽ID}'
ORDER BY c.type;
```

review 필드가 핵심 소스. DB 기록이 있으면 웹 검색은 불필요하다.

### light 셀럽 (celeb_tier = 'light')

웹 리서치만 사용.

---

## 교정 (작성 후 필수)

작성이 끝나면 아래를 확인한다:
1. 주어 없는 문장이 있는가?
2. 마지막 문장이 앞 내용과 관계없는 감상적 마무리인가?

위반이 있으면 고친 뒤 최종본을 확정한다.

---

변경 작업 시 `celeb-pipeline.md` §0 업데이트 가드를 따른다.
