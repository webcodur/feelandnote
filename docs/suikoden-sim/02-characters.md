# 02. 캐릭터 시스템

## 동적 로딩 원칙

캐릭터는 **게임 시작 시 DB에서 동적으로 로딩**한다.
사전에 하드코딩하지 않으며, DB에 셀럽이 추가되면 자동으로 게임에 반영된다.

### 로딩 조건

```sql
SELECT p.*, ci.*, cp.command, cp.martial, cp.intellect, cp.charisma
FROM profiles p
JOIN celeb_influence ci ON ci.celeb_id = p.id
LEFT JOIN celeb_persona cp ON cp.celeb_id = p.id
WHERE p.death_date IS NOT NULL
  AND p.death_date != ''
  AND (연도 환산) <= (현재연도 - 120)
```

- 사망일이 현재로부터 120년 이전인 인물만 포함
- 영향력 평가(`celeb_influence`)가 완료된 인물만 포함
- 페르소나(`celeb_persona`)가 있으면 Grade 산정에 활용

---

## 이중 스탯 체계

### 기존 스탯 (celeb_influence 기반, 7스탯)

전투 메커니즘의 기반. `celeb_influence` 테이블에서 매핑.

| 게임 스탯 | DB 컬럼 | 범위 | 용도 |
|----------|---------|------|------|
| **완력** | `strategic` | 0-10 | 돌격/유인 전술 |
| **기량** | `tech` | 0-10 | 교역소/광산/성벽 건설 |
| **지력** | `political` | 0-10 | 계략/화공 전술, 학당 건설 |
| **체력** | `transhistoricity / 4` | 0-10 | HP 결정 |
| **충의** | `social` | 0-10 | 충성도 초기값 |
| **인애** | `cultural` | 0-10 | 고무 전술, 사원 건설 |
| **용기** | `max(완력, 지력)` | 0-10 | 돌격/고무 보조 |

### 페르소나 스탯 (celeb_persona 기반, 4능력)

Grade 산정 및 게임 시작 시 세력/방랑자 분류에 사용.

| 스탯 | DB 컬럼 | 범위 | 용도 |
|------|---------|------|------|
| **통솔** | `command` | 0-100 | 조직/군대/국가 지휘력 |
| **무력** | `martial` | 0-100 | 전투/군사 실행력 |
| **지력** | `intellect` | 0-100 | 지적 능력/분석력 |
| **매력** | `charisma` | 0-100 | 인간적 매력/존재감 |

---

## 등급 (Grade)

### 페르소나 기반 Grade (우선)

`celeb_persona`가 있는 인물은 능력 4종의 가중평균으로 Grade를 산정한다.

```
sorted = [command, martial, intellect, charisma] 내림차순
Grade 점수 = sorted[0]×0.4 + sorted[1]×0.3 + sorted[2]×0.2 + sorted[3]×0.1
```

### 폴백: total_score 기반

`celeb_persona`가 없는 인물은 기존 `celeb_influence.total_score`로 폴백.

### 등급표

| 등급 | 점수 | 색상 | 게임 내 역할 |
|------|------|------|------------|
| **SS** | 85+ | 금색 | AI 세력 리더 |
| **S** | 75-84 | 보라 | AI 세력 핵심 |
| **A** | 65-74 | 파랑 | AI 세력 멤버 |
| **B** | 55-64 | 초록 | AI 세력 일반 |
| **C** | 45-54 | 흰색 | **플레이어 선택 가능** |
| **D** | 35-44 | 회색 | **플레이어 선택 가능** |
| **E** | <35 | 갈색 | **플레이어 선택 가능** |

- **Grade ≥ 55 (B 이상)**: 게임 시작 시 AI 세력에 자동 배정
- **Grade < 55 (C 이하)**: 플레이어가 선택할 수 있는 방랑자 풀

---

## 병과

`profession` 기반 자동 분류. 7병과 체계.

| 병과 | 한자 | 아이콘 | 해당 직군 | 역할 |
|------|------|--------|----------|------|
| **장수** | 將 | ⚔️ | commander, leader, athlete | 전투 주력, 돌격, 일기토 |
| **책사** | 策 | 🪭 | humanities_scholar, social_scientist | 계략, 도술, 정보 수집 |
| **장인** | 匠 | 🔨 | scientist, entrepreneur, investor | 건설, 생산, 공성 |
| **관료** | 官 | 📜 | politician | 외교, 내정, 수비 |
| **예인** | 藝 | 🎭 | author, musician, visual_artist, director, actor | 문화, 민심, 사기 회복 |
| **유격** | 遊 | 🗡️ | influencer, other | 정찰, 교란, 빠른 이동 |

### 병과별 전투 특성

| 병과 | 공격 배율 | HP 보정 | 행동순서 보정 | 고유 능력 |
|------|----------|--------|-------------|----------|
| 장수 | martial ×1.5 | +20% | 0 | 돌격(첫 턴 대미지 2배) |
| 책사 | intellect ×1.2 | 0 | +1 | 계략(매턴 시전 가능) |
| 장인 | intellect ×1.0 | 0 | -2 | 공성(성벽 대미지 3배) |
| 관료 | — | 0 | 0 | 수비(성벽 위 방어력 2배) |
| 예인 | — | 0 | -1 | 고무(인접 아군 사기 +10/턴) |
| 유격 | martial ×1.0 | 0 | +3 | 기습(선제공격), 이동력 +1 |

---

## 영입 시스템

### 방랑 인재

게임 시작 시, AI 세력에 소속되지 않은 인재들은 방랑자 상태로 존재한다.
방랑 페이즈에서 직접 조우하거나, 전략 페이즈에서 선술집 방문자를 등용한다.

### 영입 확률

```
등용 확률(%) = BASE + RECRUITER_BONUS - TARGET_RESIST + MODIFIERS

BASE = 30
RECRUITER_BONUS = charisma×0.3 + benevolence×0.1 + fairness×0.1
TARGET_RESIST   = target.loyalty × 0.4

MODIFIERS:
  + 10  (같은 nationality)
  + 20  (의기투합: 공유 콘텐츠 보유)
  + 10/회 (삼고초려: 연속 방문, 최대 +30)
  + gift_value × 0.5

최소 5%, 최대 95%
```

### 명성 기반 영입 제한

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
