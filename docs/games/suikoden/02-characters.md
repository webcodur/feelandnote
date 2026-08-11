# 02. 캐릭터 시스템

## 동적 로딩 원칙

캐릭터는 **게임 시작 시 DB에서 동적으로 로딩**한다.
사전에 하드코딩하지 않으며, DB에 셀럽이 추가되면 자동으로 게임에 반영된다.

> 예외: 시나리오(`scenarios.ts`)는 등장 인물을 프로필 UUID로 지정한다. 인물 명단을 바꾸면 이 UUID 맵을 함께 고쳐야 한다.

### 로딩 조건 (`loadSuikodenCharacters()`)

```sql
SELECT p.id, p.nickname, p.title, p.profession, p.nationality, p.gender,
       p.birth_date, p.death_date, p.bio, p.avatar_url,
       ci.*, cp.persona
FROM celebs p
JOIN celeb_influence ci ON ci.celeb_id = p.id
LEFT JOIN celeb_persona cp ON cp.celeb_id = p.id
WHERE p.publication_status = 'active'
  AND p.death_date IS NOT NULL AND p.death_date != ''
  AND p.profession IS NOT NULL
-- 사망 120년 경과 판정(CUTOFF_YEARS)은 JS에서 처리
ORDER BY total_score DESC
```

- 사망일이 현재로부터 120년 이전인 인물만 포함
- 영향력 평가(`celeb_influence`)가 완료된 인물만 포함
- 직군(`profession`)이 없으면 병과를 정할 수 없어 제외
- 스펙트럼(`celeb_persona`)이 있으면 스탯·Grade 산정에 활용
- 명언은 `celeb_dialogues`의 `lines->quote`에서 따로 가져온다

---

## 이중 스탯 체계

### 스펙트럼 스탯 (`celeb_persona` 기반, 16종) — 주 체계

`dbToCharacter()`가 스펙트럼 16축 값을 그대로 캐릭터 스탯으로 쓴다.

**능력 4종 (0~100)**

| 스탯 | DB 컬럼 | 용도 |
|------|---------|------|
| **통솔** | `command` | 조직/군대/국가 지휘력. HP·방어율·내정 |
| **무력** | `martial` | 전투/군사 실행력. 근접 대미지·속도 |
| **지력** | `intellect` | 지적 능력/분석력. 계략·외교 |
| **매력** | `charm` | 인간적 매력/존재감. 등용·외교 |

**덕목 8종 (0~100)**: `temperance`, `diligence`, `reflection`, `courage`, `loyalty`, `benevolence`, `fairness`, `humility`
→ 전투에서 실제로 쓰이는 건 `courage`(방어율)뿐이다. `loyalty`는 포로 등용 저항, `benevolence`·`charm`은 방랑 영입에 쓴다. 나머지는 표시용이다.

**성향 4축 (-50~+50)**: `pessimism_optimism`, `conservative_progressive`, `individual_social`, `cautious_bold`
→ **게임 로직에 반영되지 않는다.** `CharacterInfoPanel`에서 표시만 한다. 패시브 설계는 아래 「성향 패시브」 참조.

### 영향력 스탯 (`celeb_influence` 기반) — 폴백 전용

`celeb_persona`가 없는 인물에만 쓴다. `celeb_influence` 값을 스케일해 스펙트럼 자리에 채운다. 인물 대부분이 스펙트럼을 갖고 있으므로 실사용 빈도는 낮다.

---

## 스펙트럼 실측 분포

**모든 공식은 이 범위 내에서 동작해야 한다.**

### 능력 4종 (0~100)

| 스탯 | MIN | P25 | P50 | P75 | MAX | 비고 |
|------|-----|-----|-----|-----|-----|------|
| command | 8 | 30 | 45 | 68 | 98 | 넓은 분포 |
| martial | 0 | 4 | 5 | 15 | 95 | **극단 편향** — 비전투 인물 대다수 0~15 |
| intellect | 30 | 65 | 78 | 88 | 99 | 상위 압축, 하한 높음 |
| charm | 18 | 62 | 72 | 82 | 98 | 상위 압축 |

### 덕목 8종 (0~100)

| 스탯 | MIN | P50 | MAX | 스탯 | MIN | P50 | MAX |
|------|-----|-----|-----|------|-----|-----|-----|
| temperance | 5 | 60 | 98 | loyalty | 15 | 62 | 99 |
| diligence | 25 | 82 | 98 | benevolence | 5 | 58 | 98 |
| reflection | 10 | 68 | 98 | fairness | 5 | 60 | 90 |
| courage | 35 | 68 | 98 | humility | 3 | 50 | 95 |

### 성향 4축 (-50~+50)

| 축 | MIN | P50 | MAX | 편향 |
|----|-----|-----|-----|------|
| pessimism_optimism | -42 | 10 | 45 | 약간 낙관 |
| conservative_progressive | -45 | 15 | 48 | 약간 진보 |
| individual_social | -45 | 15 | 45 | 약간 공동체 |
| cautious_bold | -40 | 20 | 50 | 대담 편향 |

### 직군별 스펙트럼 보유 인원

| 직군 | 인원 | 직군 | 인원 |
|------|------|------|------|
| actor | 225 | director | 21 |
| musician | 96 | athlete | 21 |
| politician | 88 | social_scientist | 19 |
| author | 80 | investor | 17 |
| entrepreneur | 71 | visual_artist | 16 |
| humanities_scholar | 71 | leader | 9 |
| scientist | 65 | influencer | 5 |
| commander | 58 | other | 4 |

> ※ 게임 대상은 사망 120년 이상 인물만. 현대 배우·음악인은 대부분 제외된다.

---

## 등급 (Grade)

### 스펙트럼 기반 Grade (우선)

`celeb_persona`가 있는 인물은 능력 4종을 **내림차순 정렬** 후 가중 평균한다.

```
sorted = [command, martial, intellect, charm] 내림차순
Grade 점수 = sorted[0]×0.4 + sorted[1]×0.3 + sorted[2]×0.2 + sorted[3]×0.1
```

### 폴백: total_score 기반

`celeb_persona`가 없는 인물은 `celeb_influence.total_score`로 폴백한다.

### 등급표 (`GRADE_THRESHOLDS`)

| 등급 | 점수 | 색상 |
|------|------|------|
| **SS** | 85+ | 금색 |
| **S** | 75-84 | 보라 |
| **A** | 65-74 | 파랑 |
| **B** | 55-64 | 초록 |
| **C** | 45-54 | 흰색 |
| **D** | 35-44 | 회색 |
| **E** | <35 | 갈색 |

### 샘플 검증

| 인물 | cmd/mar/int/cha | Grade | 등급 |
|------|----------------|-------|------|
| 알렉산더 대왕 | 95/88/82/95 | 92.3 | SS |
| 칭기즈 칸 | 98/85/80/85 | 89.7 | SS |
| 나폴레옹 | 95/40/92/93 | 88.3 | SS |
| 카이사르 | 95/55/85/95 | 89.0 | SS |
| 예수 | 75/5/90/98 | 81.7 | S |
| 석가모니 | 65/15/95/85 | 78.0 | S |
| 공자 | 58/5/92/72 | 70.5 | A |
| 폴 디랙 | 12/3/95/18 | 46.1 | C |
| 마리 앙투아네트 | 15/3/30/65 | 38.3 | D |

### Grade의 게임 내 역할

| 용도 | 내용 | 상태 |
|------|------|------|
| 병력 상한 | `GRADE_TROOPS` — SS 1000 ~ E 200 | 구현됨 |
| 급여 | `GRADE_SALARY` — SS 10 ~ E 2 (턴당) | 구현됨 |
| 영입 요구 명성 | `GRADE_FAME_REQ` — SS 900 ~ E 0 | 구현됨 |
| 방랑 영입 난이도 | 등급 패널티 SS −25% ~ C이하 0 | 구현됨 |
| 세력/방랑자 분리 | `PLAYER_GRADE_THRESHOLD = 55` | **자유 모드 전용 — 현재 미사용.** 시나리오가 명단을 직접 지정한다 |

---

## 캐릭터 전투 속성

원작(수호전 천도)의 장수 개인 스탯 체계를 계승한다.

| 속성 | 원작 | 실제 구현 |
|------|------|----------|
| `hp/maxHp` | HP 0~100 | 월드맵은 `100 + cmd×0.5 + mar×0.3`, 전투 진입 시 `300 + cmd×2.0 + mar×1.0`로 재계산. **두 공식이 공존한다** |
| `troops/maxTroops` | 병력 0~1,000 | 등급별 상한(`GRADE_TROOPS`). 식량 소비 산정에 쓴다. 전투 대미지에는 관여하지 않는다 |
| `morale` | 사기 0~100 | 초기 80. 전투 중엔 진영 단위 사기(`allyMorale`/`enemyMorale`)를 따로 쓴다 |
| `loyaltyValue` | 충성 0~100 | 이탈 방지. 포상/처벌로 조절. 포로 등용 저항에도 반영 |
| `equipment` | 무기/군마/조선/부적 | `TroopEquipment` 4종 수량제. 상세는 `05-items.md` |

---

## 병과

`profession` → 병과 자동 매핑(`PROFESSION_TO_CLASS`). **7병과 체계.**

| 병과 | 한자 | 아이콘 | 해당 직군 | 핵심 스탯 | 역할 |
|------|------|--------|----------|----------|------|
| **장수** | 將 | ⚔️ | commander, athlete | martial, command | 전투 주력, 돌격, 일기토 |
| **성인** | 聖 | ✨ | leader | benevolence, charm | 사기 버프, 치유, 등용 특화 |
| **책사** | 策 | 🪭 | humanities_scholar, social_scientist | intellect, reflection | 계략, 도술, 정보 수집 |
| **관료** | 官 | 📜 | politician, investor | command, fairness | 외교, 내정, 수비 |
| **예인** | 藝 | 🎭 | author, musician, visual_artist, director, actor | charm, intellect | 문화, 민심, 사기 회복 |
| **장인** | 匠 | 🔨 | scientist, entrepreneur | intellect, diligence | 건설, 생산, 공성 |
| **유격** | 遊 | 🗡️ | influencer, other | charm, courage | 정찰, 교란, 빠른 이동 |

병과별 공격 배율·속도 보정·기본 배치 행·스킬은 `03-combat.md` 참조.

---

## 영입 시스템

### 방랑 인재

게임 시작 시, AI 세력에 소속되지 않은 인재들은 방랑자 상태로 존재한다.
방랑 페이즈에서 직접 조우하거나, 전략 페이즈에서 선술집 방문자를 등용한다.

### 실제 구현된 영입 확률 — 경로마다 공식이 다르다

**1. 방랑 중 조우 영입** (`attemptRecruitGuest()`)

```
확률 = clamp(0.05 ~ 0.80,
             0.20 + 주군charm×0.003 + 주군benevolence×0.002 - 등급패널티)

등급패널티: SS 0.25 / S 0.15 / A 0.10 / B 0.05 / C·D·E 0
```

**2. 선술집 방문자 등용** (`turnEngine`, 담당관 배정 후 1턴 뒤 판정)

명성이 `GRADE_FAME_REQ` 요구치에 못 미치면 배정 자체가 막힌다. 판정에는 담당관 스탯과 명성 보너스(최대 +20%)가 들어간다.

**3. 포로 등용** (`calcRecruitRate()`)

```
확률(%) = clamp(5 ~ 90,
                30 + min(20, fame×0.02)          // 명성 보너스, 최대 +20
                   + min(15, 주군charm×0.15)      // 매력 보너스, 최대 +15
                   - min(25, 대상loyaltyValue×0.25)  // 충성도 패널티, 최대 -25
                   - min(20, 대상loyalty×0.2))       // 충의 패널티, 최대 -20
```

### 등용 확률 — 통합 설계안 (미구현)

세 경로를 하나로 합치는 설계다. 국적 보정·의기투합·삼고초려·선물은 **아직 코드에 없다.**

```
등용 확률(%) = BASE + RECRUITER_BONUS - TARGET_RESIST + MODIFIERS

BASE = 30
RECRUITER_BONUS = charm×0.3 + benevolence×0.1 + fairness×0.1
TARGET_RESIST   = target.loyalty × 0.4

MODIFIERS:
  + 10  (같은 nationality)
  + 20  (의기투합: 공유 콘텐츠 보유)
  + 10/회 (삼고초려: 연속 방문, 최대 +30)
  + gift_value × 0.5

최소 5%, 최대 95%
```

**샘플**: 나폴레옹(cha93, ben35, fair55)이 loyalty 60 인물 등용
= 30 + 93×0.3 + 35×0.1 + 55×0.1 - 60×0.4 = **42.9%**

### 명성 기반 영입 제한 (`GRADE_FAME_REQ`) — 구현됨

| 등급 | 필요 명성 |
|------|----------|
| E | 0 |
| D | 50 |
| C | 150 |
| B | 300 |
| A | 500 |
| S | 700 |
| SS | 900 |

---

## 스펙트럼 → 게임 메커니즘 매핑 (설계안)

> **대부분 미구현이다.** 아래는 스펙트럼 값을 내정 전반에 연결하는 설계이고, 현재 코드는 훨씬 단순한 규칙을 쓴다. 각 항목에 실제 구현을 병기한다.
> 모든 공식은 `celeb_persona`의 원시 값(0~100, 성향 -50~+50)을 직접 사용한다. 결과는 별도 명시 없는 한 0~100 범위로 클램프한다.

### 건축 (Construction)

**설계안**

```
건축 소요 턴 = 기본 3턴 - BONUS (최소 1턴)

BONUS:
  장인 병과 배치 시     → -1턴
  담당관 diligence ≥ 80 → 추가 -0.5턴 (반올림)

건물별 배치 요구 (담당관):
  경제 건물 (농장/시장/교역소)       : command ≥ 40
  군사 건물 (병영/연병장/무기고)      : martial ≥ 30 또는 command ≥ 60
  문화 건물 (도서관/학당/사원/극장)   : intellect ≥ 60
  특수 건물 (첩보부/외교관저/아카데미) : intellect ≥ 70 또는 command ≥ 70
```

**실제**: 건물마다 `buildTurns`가 고정값이고, 병과·diligence 보정이 없다. 요구 스탯은 건물 정의의 `requireStat`/`requireStatMin` 한 쌍으로 판정한다(예: 학당 `intellect ≥ 70`).

### 노동/생산 (Labor)

**설계안**

```
건물 생산량 = 기본 생산량 × (1 + EFFICIENCY_BONUS)

EFFICIENCY_BONUS = primary_stat / 200 + diligence / 400
```

| 건물 유형 | primary_stat | 설명 |
|----------|-------------|------|
| 농장/벌목장/광산 | command | 노동 동원·관리 |
| 시장/교역소 | charm | 교역·협상 |
| 도서관/학당 | intellect | 연구·교육 |
| 병영/연병장 | command | 훈련·통솔 |
| 사원/극장 | charm | 감화·공연 |

**샘플**: 나폴레옹(cmd95, dil92) 병영 담당 → 효율 1 + 95/200 + 92/400 = **×1.71** (+71%)
**샘플**: 마리 앙투아네트(cha65, dil25) 극장 담당 → 효율 1 + 65/200 + 25/400 = **×1.39** (+39%)

**실제**: 담당관이 실제 근무 중이면 **누구든 일괄 ×1.5**다. 스탯을 보지 않는다.

### 순찰 (Patrol)

**설계안**

```
위협 해결 확률(%) = 40 + STAT_BONUS    (최소 10%, 최대 95%)
```

| 위협 유형 | STAT_BONUS 공식 | 적합 병과 |
|----------|----------------|----------|
| 도적 | martial×0.4 + courage×0.2 | 장수, 유격 |
| 역병 | intellect×0.3 + benevolence×0.2 | 성인, 책사 |
| 반란 | command×0.3 + fairness×0.2 | 관료, 장수 |
| 화재 | intellect×0.2 + diligence×0.3 | 장인 |
| 간첩 | intellect×0.4 + reflection×0.2 | 책사 |

**샘플**: 알렉산더(mar88, cou98) vs 도적 = 40 + 88×0.4 + 98×0.2 = **94.8%** → 95%
**샘플**: 공자(mar5, cou62) vs 도적 = 40 + 5×0.4 + 62×0.2 = **54.4%**

**실제**: 위협 종류를 가리지 않고 하나의 공식만 쓴다 — `clamp(10~95, 40 + martial×0.4 + courage×0.2 - 위협power×5)`. 위협 유형별 분기는 미구현이다.

### 외교 (Diplomacy)

**설계안**

```
외교 성공률(%) = 30 + DIPLOMAT_BASE + ACTION_MOD    (최소 5%, 최대 90%)

DIPLOMAT_BASE = charm×0.2 + intellect×0.15 + command×0.1
```

| 행동 | ACTION_MOD |
|------|-----------|
| 동맹 제안 | + fairness×0.15 - 대상 경계도×0.3 |
| 위협/공갈 | + command×0.2 + martial×0.1 - 대상 courage×0.3 |
| 정전 협상 | + benevolence×0.15 + temperance×0.1 |
| 조공 요구 | + command×0.2 - 대상 humility의 역수(100-humility)×0.1 |

**실제** (`calcDiplomacyRate`): 행동별 분기 없이 하나의 공식을 쓴다.

```
확률 = clamp(0.05 ~ 0.95,
             0.3 + 주군intellect×0.003 + 주군charm×0.002
                 + 관계도×0.005
                 + min(0.2, (전력비 - 1)×0.1)
                 + min(0.15, fame×0.00015))
```

### 훈련 (Training)

**설계안**

```
훈련도 증가 = 5 × MULTIPLIER (/턴)

MULTIPLIER = 1 + command/200 + martial/400 + diligence/400
```

**샘플**: 칭기즈 칸(cmd98, mar85, dil88) → 5 × 1.92 = **9.6/턴**
**샘플**: 공자(cmd58, mar5, dil88) → 5 × 1.52 = **7.6/턴**

**실제**: 3턴마다 `command`/`martial`/`intellect` 중 **무작위 1종을 +1**한다. 스탯 보정이 없다.

---

## 성향 패시브 (설계안 — 미구현)

> 성향 4축은 현재 `CharacterInfoPanel` 표시 전용이다. 아래 보정은 코드에 없다.

4축 성향값을 **5로 나눈 값(%)**이 해당 방향의 행동에 보정을 준다. 양수·음수 양쪽 모두 이점이 있다.

```
보정(%) = disposition_value / 5
```

| 축 | 양수(+) 보정 | 음수(-) 보정 |
|----|------------|------------|
| **pessimism ↔ optimism** | 낙관: 등용 확률 +, 사기 회복 + | 비관: 계략 저항 +, 위기 판정(순찰) + |
| **conservative ↔ progressive** | 진보: 건축 속도 +, 연구 효율 + | 보수: 수비력 +, 민심 유지 + |
| **individual ↔ social** | 공동체: 동맹 외교 +, 세력 사기 + | 개인: 일기토 공격력 +, 단독 행동 + |
| **cautious ↔ bold** | 대담: 선제 공격 +, 돌격 대미지 + | 신중: 매복 탐지 +, 방어 전투 + |

**예시**: 알렉산더(cautious_bold +45) → 대담 보정 +9%. 선제 공격·돌격에 +9% 보너스.
**예시**: 공자(conservative_progressive -30) → 보수 보정 +6%. 수비력·민심 유지에 +6% 보너스.

---

## 캐릭터 표시 정보

게임 내에서 표시할 DB 필드:

| 표시 | DB 필드 | 예시 |
|------|---------|------|
| 이름 | `nickname` | 칭기즈 칸 |
| 수식어 | `title` | 몽골 제국의 건국자 |
| 초상화 | `avatar_url` | (없으면 병과 기본 아이콘) |
| 국적 깃발 | `nationality` | MN 🇲🇳 |
| 생몰년 | `birth_date` ~ `death_date` | 1162 ~ 1227 |
| 소개 | `bio` | 몽골 통일 후 유라시아 대제국... |
| 명언 | `quotes` | 전투 시 대사로 활용 |
