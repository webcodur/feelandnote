# 셀럽 페르소나 생성 룰북

인물의 덕목, 능력, 성향을 정량 평가하여 `celeb_persona` 테이블에 등록하는 가이드.

---

## 테이블 구조

```sql
celeb_persona (
  id          uuid DEFAULT gen_random_uuid(),
  celeb_id    uuid NOT NULL,  -- profiles.id FK
  -- 덕목 (0~100)
  temperance  smallint DEFAULT 0,  -- 절제
  diligence   smallint DEFAULT 0,  -- 근면
  reflection  smallint DEFAULT 0,  -- 성찰
  courage     smallint DEFAULT 0,  -- 용기
  loyalty     smallint DEFAULT 0,  -- 충성
  benevolence smallint DEFAULT 0,  -- 인자
  fairness    smallint DEFAULT 0,  -- 공정
  humility    smallint DEFAULT 0,  -- 겸양
  -- 능력 (0~100)
  command     smallint DEFAULT 0,  -- 통솔
  martial     smallint DEFAULT 0,  -- 무력
  intellect   smallint DEFAULT 0,  -- 지력
  charisma    smallint DEFAULT 0,  -- 매력
  -- 성향 (-50 ~ +50)
  pessimism_optimism         smallint DEFAULT 0,  -- 비관 ↔ 낙관
  conservative_progressive   smallint DEFAULT 0,  -- 보수 ↔ 진보
  individual_social          smallint DEFAULT 0,  -- 개인 ↔ 공동체
  cautious_bold              smallint DEFAULT 0,  -- 신중 ↔ 대담
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
)
```

---

## 덕목 (0~100)

인물의 도덕적 성품을 평가한다. **행동 기록 기반**으로 판단하며, 평판이나 전설이 아닌 실제 행적을 근거로 한다.

| 코드 | 한국어 | 평가 질문 |
|------|--------|----------|
| `temperance` | 절제 | 욕망/감정/권력을 자제하는 태도를 보였는가? |
| `diligence` | 근면 | 자신의 역할에 꾸준히 노력을 기울였는가? |
| `reflection` | 성찰 | 자기 행동을 돌아보고, 사유하는 습관이 있었는가? |
| `courage` | 용기 | 위험/불이익을 감수하고 신념에 따라 행동했는가? |
| `loyalty` | 충성 | 소속 집단/신념/인간관계에 대한 헌신을 보였는가? |
| `benevolence` | 인자 | 타인의 고통에 공감하고 선행을 실천했는가? |
| `fairness` | 공정 | 편파 없이 원칙에 따라 판단했는가? |
| `humility` | 겸양 | 자신을 낮추고 타인을 존중하는 태도를 보였는가? |

### 점수 기준

| 점수 | 기준 |
|------|------|
| **85-100** | 해당 덕목의 상징적 인물. 일관된 행적으로 입증 |
| **65-84** | 대체로 해당 덕목을 갖추었으나 예외적 상황 존재 |
| **40-64** | 보통 수준. 특별히 두드러지지 않음 |
| **15-39** | 해당 덕목이 부족한 편. 반대 행적이 더 많음 |
| **0-14** | 해당 덕목과 대척점. 명백한 반대 행적 |

---

## 능력 (0~100)

인물의 실제 역량을 평가한다. **달성한 성과와 동시대 비교**를 근거로 한다.

| 코드 | 한국어 | 평가 질문 |
|------|--------|----------|
| `command` | 통솔 | 조직/군대/국가를 효과적으로 이끌었는가? |
| `martial` | 무력 | 개인 전투력 또는 군사적 실행 능력이 뛰어났는가? |
| `intellect` | 지력 | 지적 능력, 학습력, 분석력, 창의적 사고가 뛰어났는가? |
| `charisma` | 매력 | 사람을 끌어들이는 인간적 매력, 연설력, 존재감이 있었는가? |

### 점수 기준

| 점수 | 기준 |
|------|------|
| **90-100** | 인류사 최정상급. 해당 능력의 대명사 |
| **70-89** | 동시대 최고 수준. 역사에 이름을 남길 정도 |
| **50-69** | 유능하나 특출하지 않음 |
| **20-49** | 평범하거나 해당 능력이 부족 |
| **0-19** | 해당 능력과 무관한 인물 |

### 비전투 인물의 martial

- 학자, 예술가, 정치인 등 비전투 인물은 **0~15** 범위가 정상
- 직접 전투 경험이 없으면 10 이하
- "정신적 강인함"을 martial로 환산하지 않는다

---

## 성향 (-50 ~ +50)

인물의 가치관과 행동 패턴을 스펙트럼으로 표현한다. **0은 중립**, 양극단으로 갈수록 해당 성향이 강하다.

| 코드 | -50 | 0 | +50 |
|------|-----|---|-----|
| `pessimism_optimism` | 극도의 비관주의 | 중립 | 극도의 낙관주의 |
| `conservative_progressive` | 극보수 (전통 고수) | 중립 | 극진보 (혁신 추구) |
| `individual_social` | 극단적 개인주의 | 중립 | 극단적 공동체주의 |
| `cautious_bold` | 극도로 신중 | 중립 | 극도로 대담/무모 |

### 판단 기준

- 발언이 아닌 **실제 행동 패턴**으로 판단
- 한두 번의 예외적 행동이 아닌 **일관된 경향**을 반영
- 절대값 40 이상은 극단적 사례에만 부여

---

## 참조 데이터 (교정 기준)

기존 등록된 인물과의 상대적 비교를 통해 점수를 교정한다.

| 인물 | 직군 | courage | loyalty | martial | intellect | command | charisma |
|------|------|---------|---------|---------|-----------|---------|----------|
| 관우 | commander | 95 | 98 | 93 | 62 | 72 | 82 |
| 넬슨 만델라 | politician | 95 | 82 | 8 | 78 | 78 | 92 |
| 헤겔 | humanities_scholar | 45 | 65 | 3 | 96 | 55 | 48 |
| 김정은 | politician | 45 | 30 | 10 | 50 | 80 | 55 |

---

## 금지 사항

- profiles 테이블에 새 레코드를 INSERT하지 않는다
- celeb_id는 반드시 기존 profiles.id를 사용한다
- 추측으로 점수를 부풀리지 않는다
- 모든 점수는 행적 근거가 있어야 한다

---

## 작업 흐름

1. **셀럽 ID 확인**: profiles 테이블에서 해당 셀럽의 id 조회
2. **정보 수집**: WebSearch로 인물의 행적, 성품, 능력 관련 정보 검색
3. **기존 데이터 참조**: celeb_persona에서 동일 직군 인물 2~3명 조회하여 상대 비교
4. **점수 산정**: 각 항목별 근거와 함께 점수 결정
5. **DB 등록**: celeb_persona 테이블에 INSERT (ON CONFLICT DO NOTHING)

```sql
INSERT INTO celeb_persona (celeb_id, temperance, diligence, reflection, courage, loyalty, benevolence, fairness, humility, command, martial, intellect, charisma, pessimism_optimism, conservative_progressive, individual_social, cautious_bold)
VALUES ('{셀럽ID}', ...)
ON CONFLICT (celeb_id) DO NOTHING;
```

---

## 출력 형식

```json
{
  "temperance": 0, "diligence": 0, "reflection": 0, "courage": 0,
  "loyalty": 0, "benevolence": 0, "fairness": 0, "humility": 0,
  "command": 0, "martial": 0, "intellect": 0, "charisma": 0,
  "pessimism_optimism": 0, "conservative_progressive": 0,
  "individual_social": 0, "cautious_bold": 0
}
```

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **파일 경로**: 상대 경로만 사용
