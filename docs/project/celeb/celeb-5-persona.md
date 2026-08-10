# 5. 페르소나

> **최종 실측 체크: 26.07.16** — persona jsonb 구조·점수 범위 실측 대조
>
> **용어 경계:** 사용자 화면에서는 이 16개 축을 **16축 스펙트럼**(짧게 **스펙트럼**)이라 부른다. `persona`와 `celeb_persona`는 코드·DB의 안정된 내부명으로만 유지하며, 사용자 노출 문구에는 쓰지 않는다.

## 적용 대상

| 티어 | 수행 |
|------|------|
| **full** | 필수 |
| **light** | 필수 |
| **fiction** | 생략 |

fiction은 `celeb_persona` 행을 만들지 않는다. 티어 정의는 `celeb-pipeline.md` §티어를 따른다.

담당 에이전트는 `celeb-5-persona`. 의존 트랙은 basic뿐이다.

## 영문 처리

본 트랙은 **한국어와 영문을 함께 쓴다.** 각 항목의 `reason_en`과 `rationale_en`을 여기서 작성한다. i18n 트랙(`celeb-i18n.md`)은 `celeb_persona`를 건드리지 않는다. 영문을 비워두고 i18n으로 넘기지 않는다.

---

## DB 구조

`celeb_persona.persona` jsonb 단일 컬럼이 정본이다. 4그룹 위계 구조:

```json
{
  "abilities": {
    "command":   { "score": 0, "reason_ko": "통솔치 근거 (한국어)", "reason_en": "command reason (EN)" },
    "martial":   { "score": 0, "reason_ko": "", "reason_en": "" },
    "intellect": { "score": 0, "reason_ko": "", "reason_en": "" },
    "charm":     { "score": 0, "reason_ko": "", "reason_en": "" }
  },
  "inner_virtues": {
    "temperance":  { "score": 0, "reason_ko": "", "reason_en": "" },
    "diligence":   { "score": 0, "reason_ko": "", "reason_en": "" },
    "reflection":  { "score": 0, "reason_ko": "", "reason_en": "" },
    "courage":     { "score": 0, "reason_ko": "", "reason_en": "" }
  },
  "outer_virtues": {
    "loyalty":     { "score": 0, "reason_ko": "", "reason_en": "" },
    "benevolence": { "score": 0, "reason_ko": "", "reason_en": "" },
    "fairness":    { "score": 0, "reason_ko": "", "reason_en": "" },
    "humility":    { "score": 0, "reason_ko": "", "reason_en": "" }
  },
  "dispositions": {
    "pessimism_optimism":       { "score": 0, "reason_ko": "", "reason_en": "" },
    "conservative_progressive": { "score": 0, "reason_ko": "", "reason_en": "" },
    "individual_social":        { "score": 0, "reason_ko": "", "reason_en": "" },
    "cautious_bold":            { "score": 0, "reason_ko": "", "reason_en": "" }
  },
  "rationale_ko": "종합 해설 (한국어)",
  "rationale_en": "Overall analysis (EN)"
}
```

### 필드 구조

**축 이름·정의·점수 범위·기준점은 코드가 정본이다** — `packages/shared/src/constants/celeb-persona-scale.ts`.
이 문서에 수치를 옮겨 적지 마라. 26.08.08 통합 이전에는 이 문서와 백오피스 상수 파일이 각각 다른 척도를 들고 있었고, 채점 담당은 문서만 읽어 다른 한쪽을 보지 못했다.

| 무엇 | 코드의 어디 |
|------|------------|
| 16축 키·한국어 이름 | `PERSONA_AXES`, `AXIS_LABELS` |
| 축이 무엇을 재는가 | `AXIS_DEFINITIONS` |
| 점수 범위 (능력·덕목 0~100, 성향 -50~+50) | `axisRange`, `isScoreInRange` |
| 축별 기준점 인물 | `PERSONA_ANCHORS` |
| 무력 8단계 등급·하한선 규칙·배우 구간 | `MARTIAL_GRADES`, `MARTIAL_FLOOR_RULE`, `PERFORMER_MARTIAL_BANDS` |
| 삼국지 인물 전용 대응표 | `THREE_KINGDOMS_ANCHORS` |
| 채점 원칙(행적 우선·동점 금지 등) | `SCORING_PRINCIPLES`, `MIN_SCORE_GAP` |

`rationale_ko` / `rationale_en`은 인물 종합 해설이다. 작성법은 아래 「인물 분석 해설지」 절.

> `celeb_persona`에는 `command`·`martial`·`temperance` 등 16개 평면 컬럼이 아직 남아 있다. **폐기된 구 구조이며 읽지도 쓰지도 않는다.** 정본은 `persona` jsonb 하나뿐이다.

---

## reason_ko / reason_en 작성 가이드

각 필드의 `reason_ko`는 **"왜 이 점수인가"**를 행적 1~2개로 압축한 한 문장이다. `reason_en`은 동일 의미의 영문.

### 규칙

- **reason_ko**: 15~40자, 명사구/체언 중심
- **reason_en**: reason_ko와 동일 의미, 영문
- **구체적 사실**: "용감했다" ❌ → "매 전투 최전선 돌격, 수차례 중상" ✅
- **고점·저점 모두 근거 필수**: 15점이든 95점이든 행적을 명시
- **문자열 내 큰따옴표는 작은따옴표로 대체**

### 좋은 예시

| 필드 | score | reason_ko | reason_en |
|------|-------|-----------|-----------|
| courage | 95 | 사형 선고에도 신념 철회 거부 | Refused to recant beliefs despite death sentence |
| humility | 15 | 신의 아들 자처, 프로스키네시스 강요 | Claimed divinity, enforced proskynesis |
| cautious_bold | -35 | 10년 이상 숙고 후에만 저서 출판 | Published works only after 10+ years of deliberation |

### 나쁜 예시

| reason_ko | 문제 |
|-----------|------|
| "용감한 인물" | 구체적 행적 없음 |
| "높은 지력을 보유" | 동어반복 |
| "여러 업적을 남김" | 추상적 |

---

## 인물 분석 해설지 (rationale)

인물의 **능력 밸런스 + 덕목 편향 + 성향 축**을 종합하여 "어떤 능력과 성향을 가진 인물인지"를 분석하는 스탯 프로필 요약이다.

### 작성 원칙 (Bio 금지)

1.  **스탯 상관관계 분석**: "이 인물은 [A] 능력이 높고 [B] 성향이 강하여 전반적으로 [C]한 역량 구조를 지니게 된 인물이다"라는 형식으로 작성한다.
2.  **덕목과 능력의 결합**: 높은 도덕적 수치가 능력치에 어떤 영향을 주는지(혹은 그 반대인지)를 서술한다.
3.  **성향에 따른 행보 설명**: dispositions의 수치가 인물의 실질적인 판단 메커니즘을 어떻게 결정하는지 분석한다.
4.  **역사적 사실 배제**: 구체적인 사건(예: "적벽에서 패했다", "조선을 세웠다")은 bio의 영역이므로 rationale에서는 해당 사건이 증명하는 **인물의 기질적 특성**으로 치환하여 설명한다.
5.  **톤앤매너**: 정중하고 권위 있는 문체. 단정형 어미("~이다", "~했다")
6.  **분량**: 2~3문장, 100~200자

### 좋은 예시 (Rationale vs Bio)

*   **Bad (Bio형)**: "마케도니아의 왕으로 페르시아를 정복했다. 아리스토텔레스에게 배워 지력이 높고 최전선에서 싸운 용맹한 정복자이다."
*   **Good (Rationale형)**: "최정상급의 무력과 대담한 성향이 결합하여 불가능한 목표를 실행으로 옮기는 극단적 공격형 성격 구조이다. 높은 지력과 통솔력을 지녔으나, 낮은 절제력과 겸양 수치가 말년의 자기 파괴적 성향과 연결되어 제국의 영속성을 희생시키는 스탯 밸런스를 보여준다."

---

## 채점 원칙

**원칙 목록과 기준점은 코드가 정본이다** — `SCORING_PRINCIPLES`, `PERSONA_ANCHORS`, `MIN_SCORE_GAP`.
아래는 그 원칙이 왜 생겼는지의 배경이다.

**행적이 직군을 이긴다.** 헤밍웨이는 직군만 보면 무력 40대이나 1차대전 종군·복싱·아프리카 수렵·노르망디 동행을 근거로 72~75가 맞다. 직군 기본값은 행적 정보가 전혀 없을 때의 마지막 수단이다.

**같은 배치에서 같은 점수를 주지 마라.** 최소 3점 차를 두고, 인물 간 상대 비교로 서열을 확정한 뒤 점수를 매긴다. 티어 하한값(55·42·30)에 기계적으로 찍는 것이 가장 흔한 실패다.

**26.08.08 실측에서 드러난 세 가지 오독** — 같은 함정을 되풀이하지 마라.

| 오독 | 실제로 벌어진 일 |
|------|------------------|
| 명성·흥행력을 통솔로 환산 | 자기 제작사 하나를 운영하는 가수가 통솔 95를 받아 로마 황제(88)·베이징대 총장(88)보다 위에 놓였다 |
| "싸운 적 없음"을 "몸을 못 씀"으로 읽음 | 학자·문인 105명이 잔질(20 미만)에 들어갔다. 촘스키·장자처럼 병약 기록이 없는 사람까지 포함됐다 |
| 유명하면 지력도 높게 | 배우·대중가수의 지력이 12~18점 부풀려졌다. 사상가·기업가는 정상이었다 |

잣대가 없는 축은 채점 회차마다 흔들린다. 실측에서 무력(등급표 있음)은 회차가 바뀌어도 지휘관 평균이 76~78로 일정했으나, 통솔(당시 잣대 없음)은 인물 위상과의 상관이 -0.16에서 +0.54까지 요동쳤다. **기준점 표를 보지 않고 채점하지 마라.**

---

## 무력(martial) 채점 가이드

8단계 등급·하한선 규칙·배우 구간은 코드에 있다(`MARTIAL_GRADES`, `MARTIAL_FLOOR_RULE`, `PERFORMER_MARTIAL_BANDS`). 삼국지 인물은 `THREE_KINGDOMS_ANCHORS`를 따로 쓴다 — 게임 수치는 실존 인물보다 무장 무력이 전반적으로 높아 같은 자로 견주면 어긋난다.

**무력은 신체 능력의 총합이다.** 전투력·운동 능력·강인함·생존력을 모두 포함하고, 전장의 무인과 경기장의 선수를 같은 자로 잰다.

### 티어 내 세분화 기준

동일 티어 안에서 **상위/하위를 가르는 요소**:

| 상위 가산 요소 | 하위 감산 요소 |
|--------------|--------------|
| 직접 전투·격투 참여 기록 | 후방·참모 역할만 수행 |
| 중상 후 생존·복귀 | 병약·허약 기록 |
| 장기간 지속적 신체 활동 | 단발성·한시적 활동 |
| 다종목 신체 활동 (복싱+수렵+종군 등) | 단일 분야만 |
| 극한 환경 생존 (전쟁·오지·사고) | 안전한 환경에서만 활동 |

### 배우·음악인 무력

구간은 코드의 `PERFORMER_MARTIAL_BANDS`가 정본이다. **개별 필모그래피를 추적하지 마라** — 확실한 경우만 구분하고 나머지는 일반값을 준다.

- "액션 영화에 출연했다"만으로 무인 이상을 부여하지 않는다
- 확신이 없으면 일반값을 준다

---

## 금지 사항

- `celebs` 테이블에 새 레코드를 INSERT하지 않는다
- `celeb_id`는 반드시 기존 `celebs.id`를 사용한다
- 추측으로 점수를 부풀리지 않는다
- 모든 점수는 행적 근거가 있어야 한다
- 기존 개별 컬럼(command, martial 등)에 직접 INSERT하지 않는다. **persona jsonb만 사용**

---

## 작업 흐름

1. **기준점 확인**: `packages/shared/src/constants/celeb-persona-scale.ts`의 `PERSONA_ANCHORS`를 먼저 읽는다. **이 단계를 건너뛰면 회차마다 다른 자로 재게 된다.**
2. **셀럽 ID 확인**: `celebs` 테이블에서 해당 셀럽의 id 조회
3. **정보 수집**: WebSearch로 인물의 행적, 성품, 능력 관련 정보 검색
4. **점수 산정**: 기준점 인물과 견줘 각 항목별 score + reason_ko + reason_en 결정
5. **rationale_ko / rationale_en 작성**: 종합 해설지 작성
6. **DB 등록**: celeb_persona 테이블에 persona jsonb INSERT

> DB에 이미 등록된 같은 직군 인물을 잣대로 삼지 마라. 26.06.15 이전 채점분이 섞여 있어 그쪽에 맞추면 옛 편향을 물려받는다.

### 신규 등록

```sql
INSERT INTO celeb_persona (celeb_id, persona)
VALUES (
  '{셀럽ID}',
  '{
    "abilities": {
      "command":   { "score": 0, "reason_ko": "", "reason_en": "" },
      "martial":   { "score": 0, "reason_ko": "", "reason_en": "" },
      "intellect": { "score": 0, "reason_ko": "", "reason_en": "" },
      "charm":     { "score": 0, "reason_ko": "", "reason_en": "" }
    },
    "inner_virtues": {
      "temperance":  { "score": 0, "reason_ko": "", "reason_en": "" },
      "diligence":   { "score": 0, "reason_ko": "", "reason_en": "" },
      "reflection":  { "score": 0, "reason_ko": "", "reason_en": "" },
      "courage":     { "score": 0, "reason_ko": "", "reason_en": "" }
    },
    "outer_virtues": {
      "loyalty":     { "score": 0, "reason_ko": "", "reason_en": "" },
      "benevolence": { "score": 0, "reason_ko": "", "reason_en": "" },
      "fairness":    { "score": 0, "reason_ko": "", "reason_en": "" },
      "humility":    { "score": 0, "reason_ko": "", "reason_en": "" }
    },
    "dispositions": {
      "pessimism_optimism":       { "score": 0, "reason_ko": "", "reason_en": "" },
      "conservative_progressive": { "score": 0, "reason_ko": "", "reason_en": "" },
      "individual_social":        { "score": 0, "reason_ko": "", "reason_en": "" },
      "cautious_bold":            { "score": 0, "reason_ko": "", "reason_en": "" }
    },
    "rationale_ko": "",
    "rationale_en": ""
  }'::jsonb
)
ON CONFLICT (celeb_id) DO NOTHING;
```

### 기존 레코드 업데이트

```sql
UPDATE celeb_persona
SET persona = '{...}'::jsonb, updated_at = now()
WHERE celeb_id = '{셀럽ID}';
```

---

변경 작업 시 `celeb-pipeline.md` §0 업데이트 가드를 따른다.
