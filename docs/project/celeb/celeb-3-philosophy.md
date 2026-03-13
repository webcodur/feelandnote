# 셀럽 감상 편력 생성 룰북

---

## 이게 뭔가

이 사람이 뭘 보고 읽고 들었는지, 왜 좋아했는지, 그것이 인생에 어떤 영향을 줬는지 이야기로 풀어쓴 글이다. DB 컬럼: `profiles.cultural_journey`. 한 사람의 취향이 어떻게 만들어졌는지를 보여주는 짧은 이야기다.

---

## 작성 규칙

- 모든 문단의 첫 문장은 반드시 주어로 시작한다. 첫 문단과 마지막 문단은 본인 이름, 중간 문단은 "그는"/"그녀는" 등 3인칭도 좋다.
- 주어 없이 시작하는 문단은 허용하지 않는다.
- 500자 이내.

---

## 기호 규칙

| 용도 | 기호 |
|------|------|
| 작품명 | `『』` |
| 곡/에피소드 | `「」` |
| 직접 인용 | `""` |
| 강조/개념어 | `''` |

대시(—, –, -) 사용 금지. 한국어에서는 대시를 쓰지 않는다.

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

## 업데이트 가드

`docs/project/celeb/celeb-common-update-guard.md` 참조.

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
