# 7. 영문 번역

> **최종 실측 체크: 26.08.10** — 감상 여정과 가상 독백의 신규 번역 중단을 현행 파이프라인과 대조

## 적용 대상

| 티어 | 수행 |
|------|------|
| **full** | 필수 |
| **light** | 필수 |
| **fiction** | 생략 |

fiction은 basic 최소 항목만 채우는 티어다. 번역하지 않는다. 티어 정의는 `celeb-pipeline.md` §티어를 따른다.

담당 에이전트는 `celeb-7-i18n`. **모든 트랙 완료 후** 실행한다.

### 작업 범위 경계

한국어 데이터만 작성·교정하라는 요청에는 영문 열·영문 JSON·영문 locale을 자동으로 함께
수정하지 않는다. 영문 검토·번역이 명시된 경우에만 이 트랙을 실행한다. 단, 사용자가
`celeb-2-content-collector` 전체 수집을 요청한 경우에는 그 룰북이 한·영 메타를 한 번에
확보하도록 정한 별도 계약을 따른다. 즉 **ko 전용 수정**과 **콘텐츠 전체 수집**을 같은 범위로
해석하지 않는다.

## 번역 대상

| # | 테이블 | 소스 컬럼 | 번역 컬럼 | 비고 |
|---|--------|----------|----------|------|
| 1 | `celebs` | `title` | `title_en` | 수식어 (2~8자 → 영문 동등 표현) |
| 2 | `celebs` | `bio` | `bio_en` | 소개글 (2줄 분량) |
| 3 | `celeb_influence` | `*_exp` (7개) | `*_exp_en` | 영향력 설명 (30자 이내) |
| 4 | `celeb_dialogues` | `lines` (jsonb) | `lines_en` (jsonb) | 고유 대사 21개 + quote |

### 번역 대상이 아닌 것

| 항목 | 이유 |
|------|------|
| `celebs.quotes` / `quotes_en` | **해당 컬럼이 없다.** 명언 정본은 `celeb_dialogues.lines.quote` / `lines_en.quote`이며 위 #4에 포함된다 |
| `celebs.nickname_en` | basic 트랙(`celeb-1-basic-profile.md`)이 작성한다 |
| `celeb_persona`의 `reason_en` / `rationale_en` | 스펙트럼 트랙(`celeb-5-spectrum.md`)이 작성한다 |
| `consumption_philosophy*` / `cultural_journey*` | 감상 여정 신규 작성·번역 중단. `retire/celeb-3-cultural-journey.md` 참조 |
| `virtual_monologue*` | 가상 독백 서비스 노출·신규 작성·번역 중단. `retire/virtual-monologue.md` 참조 |

---

## 작업 흐름

### 1. 대상 셀럽 데이터 조회

```sql
SELECT p.id, p.nickname, p.nickname_en, p.title, p.bio,
       p.death_date, p.profession
FROM celebs p
WHERE p.id = '{celebId}'
  AND p.celeb_tier IN ('full', 'light');
```

### 2. 영향력 데이터 조회

```sql
SELECT political_exp, strategic_exp, tech_exp, social_exp,
       economic_exp, cultural_exp, transhistoricity_exp
FROM celeb_influence
WHERE celeb_id = '{celebId}';
```

### 3. 고유 대사 조회

```sql
SELECT lines FROM celeb_dialogues WHERE celeb_id = '{celebId}';
```

`lines`는 jsonb 객체다. 구조는 아래와 같다.

```json
{
  "quote": "대표 명언 (문자열 1개)",
  "greeting":     ["[emotion, emotion] 대사1", "대사2", "대사3"],
  "roll_call":    ["...", "...", "..."],
  "deploy":       ["...", "...", "..."],
  "battle_win":   ["...", "...", "..."],
  "battle_draw":  ["...", "...", "..."],
  "battle_lose":  ["...", "...", "..."],
  "clash_attack": ["...", "...", "..."]
}
```

7개 상황 × 3개 변형 = 21개 대사에 `quote` 1개가 더해진다. `lines_en`은 **동일한 키 구조**를 그대로 유지한 영문 객체다. 키를 바꾸거나 배열 길이를 줄이지 않는다.

### 4. 번역 실행 → DB UPDATE

각 필드를 번역 후 배치 UPDATE.

---

## 번역 규칙

### 공통

- **의역 우선**: 직역보다 영어 화자에게 자연스러운 표현 사용
- **고유명사**: 인물명은 `nickname_en` 값 사용, 작품명은 영문 정식 제목 사용
- **겹낫표 → 이탤릭**: 한국어 『작품명』 → 영문 *Title*
- **톤 유지**: 원문의 문체·격식 수준을 영문에서도 유지

### title (수식어)

- 2~8자 한국어를 동등한 영문 표현으로 변환
- 예: "맨발의 무용가" → "Barefoot Dancer", "철의 여인" → "Iron Lady"
- 이미 영어권에서 통용되는 별칭이 있으면 그것을 사용

### bio (소개글)

- 간결한 2문장 유지
- 주어 없이 시작하는 한국어 문체 → 영문에서는 주어 추가 가능
- 예: "미국 출신 무용가." → "An American dancer."

### lines.quote (명언)

명언은 `celeb_dialogues.lines.quote` → `lines_en.quote`로 번역한다.

- **원문 복원 원칙**: 원래 외국어로 발화된 명언은 해당 언어 원문을 복원
  - 예: "나는 생각한다, 고로 존재한다" → "I think, therefore I am"
  - 예: 일본어 원문 명언 → 영어 번역본 중 가장 통용되는 버전
- **한국어 원문 명언**: 영어로 번역 (한국 인물의 경우)
- 웹 검색으로 공인된 영문 번역을 확인한 후 사용
- 따옴표로 감싸지 않는다

### celeb_influence *_exp (영향력 설명)

- 30자 이내 1문장 → 영문 동등 길이
- 예: "현대 무용 창시, 발레 패러다임 전환" → "Founded modern dance, shifted ballet paradigm"

### celeb_dialogues lines (고유 대사)

- 7개 상황 키와 각 3개 배열 구조를 그대로 유지. 키 추가·삭제 금지
- 기존 `[emotion, emotion]` 태그는 문자 단위로 그대로 유지한다. 다만 한쪽 언어의 결손을 새로 번역할 때 다른 언어의 태그를 복제하거나 새 태그를 만들지 않는다. 발화 지시는 ELE 보이스를 실제로 들은 사용자가 보완하는 운영 데이터이므로 AI 번역 작업자는 생성·교체·삭제하지 않는다.
- speech_tone의 뉘앙스를 영문에서도 반영
  - `free` → casual, informal English
  - `bold` → assertive, commanding
  - `composed` → measured, calm
  - `loyal` → firm, devoted
  - `humble` → modest, graceful
  - `gentle` → warm, soft
- **여성 인물**: 한국어에서 정중체를 사용했으므로, 영문에서도 polite tone 유지
- clash_attack: 짧고 강렬한 영문 (15자 이내 유지)

---

## 배치 처리

복수 셀럽을 처리할 때는 배치 UPDATE를 사용한다.

```sql
-- celebs 배치
UPDATE celebs SET
  title_en = CASE id
    WHEN '{id1}' THEN '{title_en_1}'
    WHEN '{id2}' THEN '{title_en_2}'
  END,
  bio_en = CASE id
    WHEN '{id1}' THEN '{bio_en_1}'
    WHEN '{id2}' THEN '{bio_en_2}'
  END
WHERE id IN ('{id1}', '{id2}');

-- celeb_influence 배치
UPDATE celeb_influence SET
  political_exp_en = CASE celeb_id ... END,
  strategic_exp_en = CASE celeb_id ... END,
  tech_exp_en = CASE celeb_id ... END,
  social_exp_en = CASE celeb_id ... END,
  economic_exp_en = CASE celeb_id ... END,
  cultural_exp_en = CASE celeb_id ... END,
  transhistoricity_exp_en = CASE celeb_id ... END
WHERE celeb_id IN ('{id1}', '{id2}');

-- celeb_dialogues 배치 (lines_en 전체를 jsonb로 교체)
UPDATE celeb_dialogues SET
  lines_en = CASE celeb_id
    WHEN '{id1}' THEN '{...}'::jsonb
    WHEN '{id2}' THEN '{...}'::jsonb
  END,
  updated_at = now()
WHERE celeb_id IN ('{id1}', '{id2}');
```

---

변경 작업 시 `celeb-pipeline.md` §0 업데이트 가드를 따른다.
