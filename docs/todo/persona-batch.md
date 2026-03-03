# 페르소나 일괄 생성 작업 계획서

1,071명 셀럽 페르소나 수치를 JSON 파일로 작성 후 DB에 일괄 반영한다.

---

## 현황

| 구분 | 파일 수 | 상태 |
|------|---------|------|
| 제미니 작성 (reason_ko 보존, score=0) | 240 | nested 구조, reason_ko 한국어만 |
| 빈 템플릿 | 831 | flat 구조, 전부 빈값 |
| **합계** | **1,071** | |

---

## 최종 JSON 형식 (i18n 포함)

모든 파일을 아래 형식으로 통일한다.

```json
{
  "celeb_id": "UUID",
  "nickname": "인물명",
  "profession": "직군코드",
  "abilities": {
    "command":   { "score": 85, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "martial":   { "score": 70, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "intellect": { "score": 90, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "charm":     { "score": 75, "reason_ko": "한국어 근거", "reason_en": "English reason" }
  },
  "inner_virtues": {
    "temperance":  { "score": 60, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "diligence":   { "score": 70, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "reflection":  { "score": 65, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "courage":     { "score": 80, "reason_ko": "한국어 근거", "reason_en": "English reason" }
  },
  "outer_virtues": {
    "loyalty":     { "score": 55, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "benevolence": { "score": 60, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "fairness":    { "score": 70, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "humility":    { "score": 40, "reason_ko": "한국어 근거", "reason_en": "English reason" }
  },
  "dispositions": {
    "pessimism_optimism":       { "score": 15, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "conservative_progressive": { "score": -10, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "individual_social":        { "score": 20, "reason_ko": "한국어 근거", "reason_en": "English reason" },
    "cautious_bold":            { "score": 30, "reason_ko": "한국어 근거", "reason_en": "English reason" }
  },
  "rationale_ko": "한국어 종합 해설 (100-200자)",
  "rationale_en": "English summary (100-200 chars)"
}
```

### 필드 규칙

- `reason_ko`: 15-40자 한국어, 명사구/체언 중심
- `reason_en`: reason_ko의 영문 번역 (동일 의미, 동일 길이 수준)
- `rationale_ko`: 2-3문장, 100-200자, 스탯 상관관계 분석
- `rationale_en`: rationale_ko의 영문 번역
- `score` 범위: abilities/virtues 0-100, dispositions -50~+50
- 채점 룰북: `.claude/rules/celeb-5-persona.md`

### 제미니 파일 처리

- 기존 `reason_ko` (한국어): 그대로 유지 (스키마 리네임 완료)
- `reason_en`: 새로 작성
- `score`: 새로 채점 (기존값 0으로 리셋됨)
- `rationale_ko`: 새로 작성 (제미니 것 덮어쓰기)

### 빈 템플릿 처리

- flat 구조 → nested 구조로 변환
- 모든 필드 새로 작성

---

## 배치 실행 계획

소넷 에이전트로 직군별 배치 처리한다. 2-3개 병렬 실행.

| 배치 | 직군 | 인원 | 제미니 | 빈값 |
|------|------|------|--------|------|
| 1 | actor (1/3) | 75 | 55 | 20 |
| 2 | actor (2/3) | 75 | 56 | 19 |
| 3 | actor (3/3) | 75 | 55 | 20 |
| 4 | politician (1/2) | 68 | 6 | 62 |
| 5 | politician (2/2) | 67 | 6 | 61 |
| 6 | author | 127 | 35 | 92 |
| 7 | musician | 103 | 0 | 103 |
| 8 | humanities_scholar | 100 | 11 | 89 |
| 9 | commander | 89 | 8 | 81 |
| 10 | scientist + entrepreneur | 145 | 3 | 142 |
| 11 | 소규모 6개 | 147 | 5 | 142 |

### 에이전트 지시문 (각 배치 공통)

```
1. `.claude/rules/celeb-5-persona.md` 룰북을 읽는다
2. `docs/celeb-data/persona/{profession}/` 디렉토리의 JSON 파일을 순서대로 읽는다
3. 각 인물에 대해:
   a. 제미니 파일(nested 구조): reason_ko 유지, score 채점, reason_en 추가, rationale_ko/rationale_en 작성
   b. 빈 파일(flat 구조): nested 구조로 전환, 전 필드 작성
4. 같은 배치 내 인물끼리 상대비교하며 점수 조정 (동점 금지)
5. 완성된 JSON을 파일에 저장
```

### 품질 게이트

- 배치 완료 후 직군 내 스탯 분포 요약 출력
- martial 분포가 룰북 앵커와 크게 괴리하면 재조정
- 동일 점수 클러스터링 발견 시 재조정

---

## DB 반영 (2단계)

JSON 파일 전체 완성 후 Node.js 스크립트로 일괄 반영한다.

### 스크립트: `scripts/persona-bulk-update.mjs`

```
1. docs/celeb-data/persona/**/*.json 전체 읽기
2. celeb_id별로 persona jsonb 구성
3. DB 구조에 맞게 변환:
   - persona jsonb 내부에 abilities/inner_virtues/outer_virtues/dispositions/rationale/rationale_en 저장
4. 배치 UPSERT 실행 (50명 단위)
   INSERT INTO celeb_persona (celeb_id, persona)
   VALUES ('{id}', '{jsonb}'::jsonb)
   ON CONFLICT (celeb_id) DO UPDATE SET persona = EXCLUDED.persona, updated_at = now();
```

### DB persona jsonb 최종 구조

```json
{
  "abilities": {
    "command":   { "score": 85, "reason_ko": "...", "reason_en": "..." },
    "martial":   { "score": 70, "reason_ko": "...", "reason_en": "..." },
    "intellect": { "score": 90, "reason_ko": "...", "reason_en": "..." },
    "charm":     { "score": 75, "reason_ko": "...", "reason_en": "..." }
  },
  "inner_virtues": { ... },
  "outer_virtues": { ... },
  "dispositions": { ... },
  "rationale_ko": "한국어 해설",
  "rationale_en": "English summary"
}
```

> JSON 파일의 `celeb_id`, `nickname`, `profession`은 메타 정보로 파일에만 존재. DB persona jsonb에는 포함하지 않는다.

---

## 주의사항

- **DB 키**: `charm` 사용 (DB 기존 일부 레코드에 `charisma`로 들어간 것은 이 작업에서 `charm`으로 통일)
- **모델**: 소넷 (claude-sonnet-4-6)
- **병렬**: 동시 2-3개 에이전트
- **검수**: 1단계(JSON) 완료 후 분포 확인 → 2단계(DB) 실행
