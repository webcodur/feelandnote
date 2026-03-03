# 천도 게임 개발 룰북

천도(天導) 게임 개발 시 참조하는 가이드.

---

## 게임 개요

- **오마주**: 코에이 『수호전 천도 108성』 (1996)
- **데이터**: Feelandnote 플랫폼의 셀럽(역사 인물) DB를 캐릭터로 활용
- **라우트**: `/rest/suikoden`

---

## 데이터 소스

- **캐릭터**: Supabase `profiles` + `celeb_persona` + `celeb_influence` (사망 120년 이상 인물)
- **아이템**: Supabase `contents` + `user_contents`
- **대사**: Supabase `celeb_dialogues`
- **게임 시작 시 DB에서 동적 로딩** — 캐릭터는 사전 정의되지 않음

---

## 기획 문서

`docs/suikoden-sim/` 디렉토리에 기획서 원본이 있다.

| 파일 | 내용 |
|------|------|
| `01-overview.md` | 게임 컨셉, 목표, 핵심 루프 |
| `02-characters.md` | 캐릭터 시스템 |
| `03-combat.md` | 전투 시스템 |
| `04-management.md` | 거점 경영 |
| `05-items.md` | 아이템 시스템 |
| `06-campaign.md` | 캠페인 |
| `07-assets.md` | 에셋 명세 |
| `08-tech.md` | 기술 스택 |
| `09-feature-roadmap.md` | 기능 로드맵 |
| `10-implementation-status.md` | 구현 현황 |

---

## 코드 경로

### 게임 로직

```
sw/web/src/lib/game/suikoden/
  types.ts        — 타입 정의
  constants.ts    — 상수
  engine.ts       — 게임 초기화
  turnEngine.ts   — 턴 엔진
  aiTurn.ts       — AI 의사결정
  diplomacy.ts    — 외교
  events.ts       — 이벤트
  skills.ts       — 스킬
  dialog.ts       — 대사
  utils.ts        — 유틸
  scenarios.ts    — 시나리오 정의 (5개)
  assetManager.ts — 에셋 관리
```

### UI 컴포넌트

```
sw/web/src/components/features/game/suikoden/
  SuikodenGame.tsx           — 최상위 화면
  SuikodenGameWrapper.tsx    — 래퍼
  SuikodenLobby.tsx          — 로비
  StrategyScreen.tsx         — 내정 화면
  BattleScreen.tsx           — 전투 화면
  SetupScreen.tsx            — 셋업
  GameHUD.tsx                — HUD
  GameToolbar.tsx            — 도구바
  CommandMenu.tsx            — 커맨드 메뉴
  WorldMapView.tsx           — 월드맵
  TextMapView.tsx            — 텍스트맵
  CharacterDetailModal.tsx   — 캐릭터 상세
  CharacterPortrait.tsx      — 캐릭터 초상
  CharacterInfoPanel.tsx     — 캐릭터 정보
  StatBars.tsx               — 스탯 바
  BuildingCard.tsx           — 건물 카드
  BuildingCardGrid.tsx       — 건물 그리드
  DispositionScreen.tsx      — 배치 화면
  WanderingScreen.tsx        — 방랑 인재
  BattleParticipantCard.tsx  — 전투 참가자
  TacticSelectPanel.tsx      — 전술 선택
  ResultScreen.tsx           — 결과 화면
  DialogSnackbar.tsx         — 대사 스낵바
  SuikodenBackground.tsx     — 배경
```

### Server Actions

```
sw/web/src/actions/game/suikoden/index.ts
  loadSuikodenCharacters()  — 캐릭터 로딩
  loadSuikodenItems()       — 아이템 로딩
```

### 라우트

```
sw/web/src/app/(main)/rest/suikoden/page.tsx
```

---

## 페르소나 기반 스탯 시스템

기존 `celeb_influence` 기반 6스탯(무력/기술/지략/덕망/경영/문화) 시스템을 **폐기**하고, `celeb_persona` 테이블의 16개 페르소나 값으로 전면 교체한다.

---

### 1. 데이터 현황

`celeb_persona` 실측 분포. **모든 공식은 이 범위 내에서 동작해야 한다.**

#### 능력 4종 (0~100)

| 스탯 | MIN | P25 | P50 | P75 | MAX | 비고 |
|------|-----|-----|-----|-----|-----|------|
| command | 8 | 30 | 45 | 68 | 98 | 넓은 분포 |
| martial | 0 | 4 | 5 | 15 | 95 | **극단 편향** — 비전투 인물 대다수 0~15 |
| intellect | 30 | 65 | 78 | 88 | 99 | 상위 압축, 하한 높음 |
| charm | 18 | 62 | 72 | 82 | 98 | 상위 압축 |

#### 덕목 8종 (0~100)

| 스탯 | MIN | P50 | MAX | 스탯 | MIN | P50 | MAX |
|------|-----|-----|-----|------|-----|-----|-----|
| temperance | 5 | 60 | 98 | loyalty | 15 | 62 | 99 |
| diligence | 25 | 82 | 98 | benevolence | 5 | 58 | 98 |
| reflection | 10 | 68 | 98 | fairness | 5 | 60 | 90 |
| courage | 35 | 68 | 98 | humility | 3 | 50 | 95 |

#### 성향 4축 (-50~+50)

| 축 | MIN | P50 | MAX | 편향 |
|----|-----|-----|-----|------|
| pessimism_optimism | -42 | 10 | 45 | 약간 낙관 |
| conservative_progressive | -45 | 15 | 48 | 약간 진보 |
| individual_social | -45 | 15 | 45 | 약간 공동체 |
| cautious_bold | -40 | 20 | 50 | 대담 편향 |

#### 직군별 페르소나 보유 인원

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

### 2. 병과(UnitClass) 재정의

`profession` → 병과 자동 매핑. **7병과 체계.**

| 병과 | 한자 | 해당 직군 | 핵심 스탯 | 역할 |
|------|------|----------|----------|------|
| **장수** | 將 | commander, athlete | martial, command | 전투 주력, 돌격, 일기토 |
| **성인** | 聖 | leader | benevolence, charm | 사기 버프, 치유, 등용 특화 |
| **책사** | 策 | humanities_scholar, social_scientist | intellect, reflection | 계략, 도술, 정보 수집 |
| **관료** | 官 | politician, investor | command, fairness | 외교, 내정, 수비 |
| **예인** | 藝 | author, musician, visual_artist, director, actor | charm, intellect | 문화, 민심, 사기 회복 |
| **장인** | 匠 | scientist, entrepreneur | intellect, diligence | 건설, 생산, 공성 |
| **유격** | 遊 | influencer, other | charm, courage | 정찰, 교란, 빠른 이동 |

#### 병과별 전투 특성

| 병과 | 공격 배율 | HP 보정 | 행동순서 보정 | 고유 능력 |
|------|----------|--------|-------------|----------|
| 장수 | martial ×1.5 | +20% | 0 | 돌격(첫 턴 대미지 2배), 일기토 도발 |
| 성인 | — | 0 | 0 | 치유(아군 HP 30% 회복), 결계(1턴 피해무효) |
| 책사 | intellect ×1.2 | 0 | +1 | 계략(매턴 시전 가능), 도술(intellect 80+) |
| 관료 | — | 0 | 0 | 수비(성벽 위 방어력 2배), 외교전(사기 감소) |
| 예인 | — | 0 | -1 | 고무(인접 아군 사기 +10/턴), 문화 감화 |
| 장인 | intellect ×1.0 | 0 | -2 | 공성(성벽 대미지 3배), 함정 설치 |
| 유격 | martial ×1.0 | 0 | +3 | 기습(선제공격), 이동력 +1, 매복 탐지 |

---

### 3. 등급(Grade) 산정

능력 4종을 **내림차순 정렬** 후 가중 평균:

```
sorted = [command, martial, intellect, charm] 내림차순
Grade = sorted[0]×0.4 + sorted[1]×0.3 + sorted[2]×0.2 + sorted[3]×0.1
```

| 등급 | 점수 | 색상 |
|------|------|------|
| **SS** | 85+ | 금색 |
| **S** | 75–84 | 보라 |
| **A** | 65–74 | 파랑 |
| **B** | 55–64 | 초록 |
| **C** | 45–54 | 흰색 |
| **D** | 35–44 | 회색 |
| **E** | <35 | 갈색 |

#### 샘플 검증

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

---

### 4. 페르소나 → 게임 메커니즘 매핑

모든 공식은 `celeb_persona`의 원시 값(0~100, 성향 -50~+50)을 직접 사용한다. 결과는 별도 명시 없는 한 0~100 범위로 클램프한다.

#### 4.1 등용 (Recruitment)

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

#### 4.2 건축 (Construction)

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

#### 4.3 노동/생산 (Labor)

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

#### 4.4 순찰 (Patrol)

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

#### 4.5 외교 (Diplomacy)

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

#### 4.6 훈련 (Training)

```
훈련도 증가 = 5 × MULTIPLIER (/턴)

MULTIPLIER = 1 + command/200 + martial/400 + diligence/400
```

**샘플**: 칭기즈 칸(cmd98, mar85, dil88) → 5 × 1.92 = **9.6/턴**
**샘플**: 공자(cmd58, mar5, dil88) → 5 × 1.52 = **7.6/턴**

---

### 5. 성향(Disposition) 패시브 보정

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

### 6. 전투 시스템 (현재 구현)

6전술 상성 카드 선택형 전투. 매 라운드 양측이 전술을 선택하고 상성에 따라 배율이 적용된다.

#### 6.1 전투 개요

- **방식**: 턴제 전술 선택형 (카드/전술 상성)
- **참여**: 세력당 최대 5명 출진 (`BATTLE_MAX_UNITS = 5`)
- **턴 제한**: 최대 10라운드 (`BATTLE_MAX_ROUNDS = 10`)
- **승패**: 적 전원 괴멸, 또는 라운드 소진 시 무승부

#### 6.2 전술 6종

| 전술 | 아이콘 | 설명 | 병사 소모율 |
|------|--------|------|-----------|
| 돌격 (`charge`) | 🐎 | 강력한 돌격 | 15% |
| 방어 (`defend`) | 🛡️ | 피해 경감 | 0% |
| 계략 (`stratagem`) | 🪭 | 지력 대결 | 5% |
| 화공 (`fire`) | 🔥 | 광역 피해 | 10% |
| 고무 (`morale`) | 📯 | 사기 회복 | 0% |
| 유인 (`feint`) | 🗡️ | 반격 | 5% |

#### 6.3 상성 매트릭스 (`TACTIC_MATCHUP`)

유리 1.4, 불리 0.65, 중립 1.0.

- 돌격 → 계략에 강함(1.4), 방어·유인에 약함(0.65)
- 방어 → 화공에 강함(1.4)
- 계략 → 고무·유인에 강함(1.4), 돌격에 약함(0.65)
- 화공 → 방어·고무에 약함(0.65)
- 유인 → 돌격에 강함(1.4), 계략에 약함(0.65)

#### 6.4 병과별 전술 보정 (`CLASS_TACTIC_BONUS`)

| 병과 | 보정 전술 | 추가 위력 |
|------|----------|----------|
| 장수 | 돌격 | +30% |
| 책사 | 계략 +40%, 화공 +30% | |
| 관료 | 방어 | +20% |
| 예인 | 고무 | +50% |
| 유격 | 유인 +40%, 화공 +10% | |
| 장인 | 방어 | +20% |

#### 6.5 전투 결과

| 결과 | 조건 | 후속 |
|------|------|------|
| 공격 승리 | 방어 측 전원 괴멸 | 영토 점령 + 포로 처분(DispositionScreen) |
| 방어 승리 | 공격 측 전원 괴멸 | 공격 측 후퇴 |
| 무승부 | 10라운드 소진 | 양측 후퇴 |

#### 6.6 일기토 (미구현)

martial ≥ 50 장수끼리 1:1 대결. 추후 구현 예정.

---

### 7. 게임 시작 플로우 (2단계 셋업)

```
로비(SuikodenLobby) → [시작] 버튼
  → SetupScreen 1단계: 시대(ancient/medieval/modern) + 난이도(easy/normal/hard) 선택
  → [세력 확인] 버튼 → previewWorld() 호출
  → SetupScreen 2단계: AI 세력 미리보기(좌) + 방랑자 그리드(중) + 선택 상세(우)
  → [시작] 버튼 → finalizeGame() 호출
  → 방랑 페이즈(WanderingScreen)로 게임 시작
```

#### Grade 기반 캐릭터 분리

- **Grade ≥ 55 (B 이상)**: AI 세력 리더/멤버로 자동 배정
- **Grade < 55 (C 이하)**: 플레이어가 선택할 수 있는 방랑자 풀
- 상수: `PLAYER_GRADE_THRESHOLD = 55`

#### 핵심 함수

- `previewWorld(allChars, difficulty, era)` → `WorldPreview` (AI 세력 구축 + 방랑자 분리)
- `finalizeGame(preview, playerLeaderId, items)` → `GameState` (게임 시작)

---

## 작업 규칙

1. **기획서 참조**: `docs/suikoden-sim/` 기획서에 정의된 수치/로직을 우선한다
2. **타입 체크**: 작업 완료 후 `cd sw/web && npx tsc --noEmit` 통과 확인
3. **상수 관리**: 매직 넘버 금지, `constants.ts`에서 관리
4. **문서 갱신**: 시스템 추가/변경 시 `10-implementation-status.md` 업데이트

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **파일 경로**: 상대 경로만 사용
