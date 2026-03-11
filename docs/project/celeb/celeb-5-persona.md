# 셀럽 페르소나 생성 룰북

인물의 능력, 덕목, 성향을 정량 평가하여 `celeb_persona.persona` jsonb에 등록하는 가이드.

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

| 그룹 | 키 | score 범위 | reason_ko / reason_en |
|------|-----|-----------|----------------------|
| `abilities` | command, martial, intellect, charm | 0~100 | 해당 점수의 역사적 근거 1문장 (15~40자), 영문 동일 의미 |
| `inner_virtues` | temperance, diligence, reflection, courage | 0~100 | 위와 동일 |
| `outer_virtues` | loyalty, benevolence, fairness, humility | 0~100 | 위와 동일 |
| `dispositions` | pessimism_optimism, conservative_progressive, individual_social, cautious_bold | -50~+50 | 위와 동일 |
| `rationale_ko` | — | 텍스트 | 인물 종합 해설 한국어 (아래 참조) |
| `rationale_en` | — | 텍스트 | 인물 종합 해설 영문 |

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

## 스탯 항목

### 능력 (abilities, 0~100)

| 코드 | 한국어 | 의미 |
|------|--------|------|
| `command` | 통솔 | 조직/군대/국가를 이끄는 역량 및 관리 능력 |
| `martial` | 무력 | 개인 전투력, 군사적 실행 능력, 신체적 강인함 |
| `intellect` | 지력 | 지적 능력, 분석력, 창의적 사고, 전문 지식 |
| `charm` | 매력 | **인간적 매력, 예술적 아우라, 대중적 호소력, 사람을 매료시키는 힘(Magnetism).** 위압적인 권위뿐만 아니라 우아함, 아름다움, 품격 등 타인을 이끄는 모든 종류의 매혹적 존재감을 포함한다. |

### 내적 덕목 (inner_virtues, 0~100)

| 코드 | 한국어 | 의미 |
|------|--------|------|
| `temperance` | 절제 | 욕망/감정/권력의 자제 |
| `diligence` | 근면 | 꾸준한 노력 |
| `reflection` | 성찰 | 자기 행동을 돌아보는 습관 |
| `courage` | 용기 | 위험을 감수하고 신념에 따른 행동 |

### 외적 덕목 (outer_virtues, 0~100)

| 코드 | 한국어 | 의미 |
|------|--------|------|
| `loyalty` | 충성 | 집단/신념/인간관계에 대한 헌신 |
| `benevolence` | 인자 | 타인의 고통에 대한 공감과 선행 |
| `fairness` | 공정 | 편파 없는 원칙적 판단 |
| `humility` | 겸양 | 자신을 낮추고 타인을 존중 |

### 성향 (dispositions, -50 ~ +50)

| 코드 | -50 | 0 | +50 |
|------|-----|---|-----|
| `pessimism_optimism` | 극도의 비관 | 중립 | 극도의 낙관 |
| `conservative_progressive` | 극보수 | 중립 | 극진보 |
| `individual_social` | 극단적 개인주의 | 중립 | 극단적 공동체주의 |
| `cautious_bold` | 극도로 신중 | 중립 | 극도로 대담 |

---

## 능력치 채점 원칙

### 최우선 원칙: 행적 기반 평가

**직군은 참고일 뿐, 실제 행적이 점수를 결정한다.**

1. **1순위**: 해당 인물의 실제 행적·활동·성과 기록
2. **2순위**: 직군 기본값 (행적 정보가 전혀 없을 때만 폴백)

예: 헤밍웨이(author)는 직군만 보면 40대이나, WWI 종군·복싱·아프리카 수렵·노르망디 동행 등 행적 기반으로 72~75가 적절하다.

### 동점 금지 규칙

**같은 배치 내에서 동일 점수를 부여하지 않는다.**

- 같은 티어에 여러 인물이 배치될 때, 최소 **3점 이상** 차이를 둔다
- 티어 하한값(55, 42, 30 등)에 기계적으로 찍는 행위를 금지한다
- 반드시 인물 간 상대 비교를 거쳐 서열을 확정한 뒤 점수를 부여한다

---

## 무력(martial) 채점 가이드

코에이 『삼국지14』 무력 체계를 참조한 8단계 등급제.

### 핵심: 무력 = 신체 능력의 총합

전투력·운동 능력·신체 강인함·생존력을 모두 포함한다. 전장의 무인과 경기장의 운동선수는 **동일 척도**로 평가한다.

### 8단계 등급

| 등급 | 한자 | 점수 | 기준 | 앵커 |
|------|------|------|------|------|
| **武神** | 무신 | 95-100 | 인류사 최정상 전투력/운동 능력, 신화적 존재 | 알렉산더 대왕(98), 마이클 조던(97) |
| **猛將** | 맹장 | 85-94 | 전장/경기장의 전설, 직접 전투로 역사를 바꿈 | 오기(90), 이순신(88) |
| **勇將** | 용장 | 75-84 | 실전 경험 풍부, 직접 전투 참여 + 생존 | 칭기즈 칸(80), 롬멜(80) |
| **武人** | 무인 | 65-74 | 군사 교육 이수 또는 신체 중심 직업 활동 | 나폴레옹(68), 헤밍웨이(73) |
| **文武** | 문무 | 50-64 | 일정 수준의 신체 활동 기록 有 | 공자(51), 일반 배우(50-55) |
| **書生** | 서생 | 35-49 | 학자·문인 기본값, 특별한 신체 활동 없음 | 간디(38), 스티브 잡스(36) |
| **虛弱** | 허약 | 20-34 | 병약 기록, 신체 활동 극히 제한적 | 마리 앙투아네트(25), 뉴턴(22) |
| **殘疾** | 잔질 | 5-19 | 신체 장애, 중증 질환으로 활동 불가 | 손빈(10), 스티븐 호킹(8) |

### 삼국지14 대응표

| 삼국지 무력 | 본 시스템 | 삼국지 인물 예시 |
|------------|----------|----------------|
| 95-100 | 武神 95-100 | 여포(100), 장비(98), 관우(97) |
| 85-94 | 猛將 85-94 | 조운(96), 손견(90) |
| 70-84 | 勇將 70-84 | 조조(75대) |
| 50-69 | 武人·文武 | 일반 무장, 황건당 잡장 |
| 30-49 | 書生·文武 | 순욱(35대), 문관급 |
| 1-29 | 虛弱·殘疾 | 황호(10대) |

### 티어 내 세분화 기준

동일 티어 안에서 **상위/하위를 가르는 요소**:

| 상위 가산 요소 | 하위 감산 요소 |
|--------------|--------------|
| 직접 전투·격투 참여 기록 | 후방·참모 역할만 수행 |
| 중상 후 생존·복귀 | 병약·허약 기록 |
| 장기간 지속적 신체 활동 | 단발성·한시적 활동 |
| 다종목 신체 활동 (복싱+수렵+종군 등) | 단일 분야만 |
| 극한 환경 생존 (전쟁·오지·사고) | 안전한 환경에서만 활동 |

### 배우·음악인 무력 일반화 규칙

배우·음악인의 무력은 개별 필모그래피를 추적하지 않는다. **확실한 경우만 구분하고 나머지는 일반값을 부여한다.**

| 조건 | 무력 범위 | 예시 |
|------|----------|------|
| **실제 무술가/격투가 출신** | 勇將~猛將 (75-90) | 이소룡, 성룡, 지나 카라노 |
| **스포츠 선수 출신 배우** | 武人 (65-74) | 제이슨 스타뎀(다이빙), 드웨인 존슨(레슬링) |
| **대표적 액션스타** (비무술 출신이나 액션 대명사) | 武人 (65-70) | 아놀드 슈왈츠제네거, 실베스터 스탤론 |
| **그 외 배우·음악인** | 文武 (50-55) | 일반값. 개별 작품 추적 금지 |

- "액션 영화에 출연했다"만으로 武人 이상을 부여하지 않는다
- 확신이 없으면 文武 일반값(42-50)을 부여한다
- 무용·댄서 출신은 文武 상위(55-60) 배치

---

## 금지 사항

- profiles 테이블에 새 레코드를 INSERT하지 않는다
- celeb_id는 반드시 기존 profiles.id를 사용한다
- 추측으로 점수를 부풀리지 않는다
- 모든 점수는 행적 근거가 있어야 한다
- 기존 개별 컬럼(command, martial 등)에 직접 INSERT하지 않는다. **persona jsonb만 사용**

---

## 작업 흐름

1. **셀럽 ID 확인**: profiles 테이블에서 해당 셀럽의 id 조회
2. **정보 수집**: WebSearch로 인물의 행적, 성품, 능력 관련 정보 검색
3. **기존 데이터 참조**: celeb_persona에서 동일 직군 인물 2~3명 조회하여 상대 비교
4. **점수 산정**: 각 항목별 score + reason_ko + reason_en 결정
5. **rationale_ko / rationale_en 작성**: 종합 해설지 작성
6. **DB 등록**: celeb_persona 테이블에 persona jsonb INSERT

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

## 업데이트 가드 (필수)

**반드시 `docs/project/celeb/celeb-common-update-guard.md`를 읽고 따른다.**

핵심: 기존 데이터 참조 없이 백지 재작성. UPDATE 직전 비교하여 동일하면 SKIPPED. 배치 완료 시 카운트 보고 필수.

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **파일 경로**: 상대 경로만 사용
