# 셀럽 데이터 생성 디렉토리

페르소나(persona)와 고유 대사(dialogue) JSON 파일을 직군별로 관리한다.
에이전트가 JSON을 생성하고, 검수 후 일괄 DB 등록한다.

---

## 디렉토리 구조

```
docs/celeb-data/
├── persona/{profession}/{nickname}.json
└── dialogue/{profession}/{nickname}.json
```

- 파일명: `{한글 닉네임}.json` (공백은 `_`로 대체)
  - 예: `persona/commander/알렉산더_대왕.json`

---

## 파일 형식

### persona/{profession}/{nickname}.json

```json
{
  "celeb_id": "uuid",
  "nickname": "한글 닉네임",
  "profession": "직군 코드",
  "temperance": 0, "diligence": 0, "reflection": 0, "courage": 0,
  "loyalty": 0, "benevolence": 0, "fairness": 0, "humility": 0,
  "command": 0, "martial": 0, "intellect": 0, "charm": 0,
  "pessimism_optimism": 0, "conservative_progressive": 0,
  "individual_social": 0, "cautious_bold": 0,
  "rationale": "수치 산정 근거 해설 (150~300자)"
}
```

- 룰북: `docs/project/celeb/celeb-5-persona.md`

### dialogue/{profession}/{nickname}.json

```json
{
  "celeb_id": "uuid",
  "nickname": "한글 닉네임",
  "profession": "직군 코드",
  "speech_tone": "톤 코드",
  "lines": {
    "greeting": ["[e1, e2] 대사1", "[e1, e2] 대사2", "[e1, e2] 대사3"],
    "answer": ["...", "...", "..."],
    "deploy": ["...", "...", "..."],
    "battle_win": ["...", "...", "..."],
    "battle_draw": ["...", "...", "..."],
    "battle_lose": ["...", "...", "..."],
    "clash_attack": ["...", "...", "..."]
  }
}
```

- 룰북: `docs/project/celeb/celeb-speech.md` §6.3
- 7상황 × 3변형 = 21개 대사

---

## 에이전트 작업 단위

직군 폴더 단위로 에이전트에게 할당한다. 대량 직군은 분할 가능.

| 직군 | persona | dialogue | 비고 |
|------|---------|----------|------|
| actor | 225 | 225 | 50명씩 분할 권장 |
| politician | 135 | 135 | 50명씩 분할 권장 |
| author | 127 | 127 | 50명씩 분할 권장 |
| musician | 103 | 103 | 50명씩 분할 권장 |
| humanities_scholar | 100 | 100 | 50명씩 분할 권장 |
| commander | 89 | 89 | 한 번에 가능 |
| scientist | 74 | 74 | 한 번에 가능 |
| entrepreneur | 71 | 71 | 한 번에 가능 |
| visual_artist | 32 | 32 | 한 번에 가능 |
| leader | 24 | 24 | 한 번에 가능 |
| director | 21 | 21 | 한 번에 가능 |
| athlete | 21 | 21 | 한 번에 가능 |
| social_scientist | 20 | 20 | 한 번에 가능 |
| investor | 17 | 17 | 한 번에 가능 |
| other | 6 | 6 | 한 번에 가능 |
| influencer | 6 | 6 | 한 번에 가능 |
| **합계** | **1,071** | **1,071** | |

---

## DB 일괄 등록 (검수 완료 후)

### persona 등록

```sql
INSERT INTO celeb_persona (celeb_id, temperance, diligence, reflection, courage, loyalty, benevolence, fairness, humility, command, martial, intellect, charm, pessimism_optimism, conservative_progressive, individual_social, cautious_bold, rationale)
VALUES
  ('{celeb_id}', ...),
  ...
ON CONFLICT (celeb_id) DO UPDATE SET
  temperance = EXCLUDED.temperance,
  diligence = EXCLUDED.diligence,
  -- ... 전체 컬럼
  updated_at = now();
```

### dialogue 등록

```sql
INSERT INTO celeb_dialogues (celeb_id, lines)
VALUES
  ('{celeb_id}', '{lines JSON}'),
  ...
ON CONFLICT (celeb_id) DO UPDATE SET lines = EXCLUDED.lines, updated_at = now();
```

---

## 주의사항

- Supabase 프로젝트 ID: `wouqtpvfctednlffross`
- 기존 DB 데이터와 충돌 시 ON CONFLICT로 덮어쓴다
- 파일 생성만으로 DB에 반영되지 않음. 반드시 별도 등록 작업 필요
