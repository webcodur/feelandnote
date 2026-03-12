# Quote 재작성 작업 지시서

고대~근대 셀럽 446명의 기존 quote를 전면 재작성한다.

## Supabase 프로젝트 ID

`wouqtpvfctednlffross`

## 제외 대상 (음성 녹음 있음 — 절대 수정 금지)

| id | nickname |
|----|----------|
| 65f9e925-7f8c-4e18-b056-a45d96c6e7b6 | 레오나르도 다빈치 |
| 86a2b3f1-784a-4b6d-8ef3-f31f8be7dcf6 | 루트비히 판 베토벤 |
| cdd36fdd-b90b-4b5d-bfc3-4f5fa9f10905 | 미야모토 무사시 |
| 0cd0577a-e189-49f6-a763-f38201bf571b | 빈센트 반 고흐 |
| 71ee7d5f-b876-4b86-8bfc-df635acea863 | 손자 |
| deb5a570-a009-410d-9436-77180a85a058 | 알렉산더 대왕 |
| c26f8b69-738e-46ea-bb53-929ebfe6166d | 에이브러햄 링컨 |
| a1ecd156-f516-4f8a-9156-b0cf9deffac7 | 요한 볼프강 폰 괴테 |
| 73d5da05-cccf-47ba-bc52-5b1a39725b9b | 이순신 |
| 9508ba04-50f6-488b-939f-1328d0293685 | 잔 다르크 |
| 6fcd1574-efe3-4674-ace7-06763841d34d | 제갈량 |
| e94f8fc2-9010-4f39-9d32-2dad78a83cd2 | 칭기즈 칸 |
| 4e554ba5-b10d-49f3-a4a5-1e3f8b6af199 | 클레오파트라 |

## 작업 흐름

### 1. 배치 조회 (30명씩)

```sql
SELECT p.id, p.nickname, p.nickname_en, p.speech_tone, p.profession,
  cd.lines->>'quote' AS current_quote_ko,
  cd.lines_en->>'quote' AS current_quote_en
FROM profiles p
JOIN celeb_dialogues cd ON cd.celeb_id = p.id
WHERE p.celeb_tier IS NOT NULL
  AND p.status = 'active'
  AND (p.birth_date < '1900-01-01' OR p.birth_date IS NULL)
  AND p.has_voice IS NOT TRUE
  AND p.nickname NOT IN ('bytebodybalance', '주인장')
ORDER BY p.nickname
LIMIT 30 OFFSET {offset};
```

### 2. 재작성

기존 quote를 참고하되, **백지 상태에서 새로 쓴다**. 기존 것이 이미 좋으면 동일하게 써도 된다.

### 3. 배치 UPDATE (celeb_dialogues만)

```sql
UPDATE celeb_dialogues SET
  lines = jsonb_set(lines, '{quote}', to_jsonb(v.q_ko)),
  lines_en = jsonb_set(lines_en, '{quote}', to_jsonb(v.q_en))
FROM (VALUES
  ('{id1}'::text, '{quote_ko_1}'::text, '{quote_en_1}'::text),
  ('{id2}'::text, '{quote_ko_2}'::text, '{quote_en_2}'::text)
) AS v(cid, q_ko, q_en)
WHERE celeb_dialogues.celeb_id = v.cid;
```

> **주의**: `profiles.quotes`는 더 이상 사용하지 않는다. `celeb_dialogues`만 업데이트하면 된다.

### 4. 배치 보고

```
## 배치 {N} (OFFSET {offset})
- 검수: {총}명
- 재작성: {n}명
- 유지(기존과 동일): {n}명
- UPDATE 완료
```

---

## 명언 작성 규칙

### 핵심 원칙

- **업적/작품 기반 창작이 기본 전략**. 이 인물들은 대부분 실제 발언 기록이 없다.
- 인물의 **고유한 업적/사건/철학**이 반드시 녹아있어야 한다.
- 같은 직군의 다른 인물이 말하면 어색해야 한다 (고유성 테스트).
- 시대착오적 표현 금지.

### 모범 사례

**광개토대왕** (bold):
- KO: `천제의 후손이 다스리는 땅에 경계란 없다. 사방 끝이 보이거든, 거기까지가 고구려다`
- EN: `The land ruled by heaven's descendant knows no border. If you can see the horizon, that is Goguryeo.`
- 분석: 핵심 업적(영토 확장) + 고유 정체성(천제의 후손/고구려) + 스케일

**이순신 한산도가** (loyal):
- KO: `한산섬 달 밝은 밤에 칼을 어루만지는데, 어디선가 피리 한 가락 불어와 애를 끓이는구나.`
- 분석: 문학가/시인은 본인 작품 구절 사용 가능. 이순신의 시이므로 정체성 그 자체.

### 문학가·시인 특칙

author, poet, playwright, humanities_scholar 직군 + 고대 문인은 **본인 작품 구절을 quote로 사용할 수 있다**.

### 포맷

- **50자 이내**, 한 문장, 한국어
- quotes_en은 자연스러운 영문 번역 (직역 금지)
- 따옴표로 감싸지 않음
- 이스케이프 문자 금지

### speech_tone별 어조 (필수 준수)

| tone | KO 어미 | 예시 |
|------|---------|------|
| **bold** | ~하라, ~이다, ~하겠다 | 내 사전에 불가능은 없다 |
| **composed** | ~뿐이다, ~따름이다 | 삶은 짧다. 낭비하기 때문에 짧은 것이다 |
| **gentle** | ~이죠, ~않을까요 | 상상력은 지식보다 중요하죠 |
| **free** | ~거든, ~잖아, ~인데 | 나는 마약을 하지 않는다. 내가 곧 마약이다 |
| **humble** | ~뿐입니다, ~하겠습니다 | 신에게는 아직 열두 척의 배가 있습니다 |
| **loyal** | ~해야 한다, ~하겠노라 | 역사는 바로 세워야 한다 |

### 검수 기준 (재작성 판정)

아래 중 하나라도 해당하면 재작성:

- AI 생성 냄새 (범용적, 고유성 zero, "X는 Y이다" 정의형)
- speech_tone 어조 불일치
- 인물 고유 맥락/업적 없이 누구나 할 수 있는 말
- 밋밋하고 스케일이 안 느껴짐
- 캐릭터 대사, 노래 가사, 타인 명언 오귀속

기존 quote가 이미 고유하고 임팩트 있으면 그대로 유지해도 된다.
