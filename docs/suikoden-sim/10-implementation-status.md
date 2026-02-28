# 10. 구현 현황 상세

> 파일별 구현 내용과 시스템 간 연결 관계. 작업 재개 시 참조용.

---

## 파일 구조

### 게임 로직 (`sw/web/src/lib/game/suikoden/`)

| 파일 | 역할 | 주요 export |
|------|------|------------|
| **types.ts** | 전체 타입 정의 | `GameState`, `GameCharacter`, `Faction`, `WorldPreview`, `BattleState` 등 |
| **constants.ts** | 상수 테이블 | `BUILDINGS`, `TERRITORIES`, `REGIONS`, `TACTIC_MATCHUP`, `DIFFICULTY_CONFIG` 등 |
| **engine.ts** | 게임 초기화 + 전투 | `previewWorld()`, `finalizeGame()`, `resolveRound()`, `checkBattleResult()` |
| **turnEngine.ts** | 턴 엔진 | `advanceTurn()` — 시간/건설/자원/식량/훈련/민심/인구/이벤트 |
| **aiTurn.ts** | AI 의사결정 | `evaluateAIDecisions()`, `assignIdleCharactersForFaction()` |
| **diplomacy.ts** | 외교 시스템 | `commandAlliance`, `commandCeasefire`, `commandTribute`, `commandSurrender` |
| **events.ts** | 이벤트 시스템 | `checkSeasonEvents()` — 계절/랜덤 이벤트 |
| **skills.ts** | 전투 스킬 | `getAvailableTactics()`, 병과별 스킬 정의 |
| **dialog.ts** | 대사 시스템 | DB 개인화 대사 + 톤별 기본 대사 |
| **utils.ts** | 유틸리티 | `dbToCharacter()`, `calcPersonaGrade()`, `getEffectiveGrade()` |
| **assetManager.ts** | 에셋 관리 | `preloadAssets()` |

### UI 컴포넌트 (`sw/web/src/components/features/game/suikoden/`)

| 파일 | 역할 |
|------|------|
| **SuikodenGame.tsx** | 최상위 — idle/setup/ingame 전환, worldPreview 상태 관리 |
| **SuikodenGameWrapper.tsx** | 래퍼 — Server Action으로 데이터 로딩 |
| **SuikodenLobby.tsx** | 로비 화면 |
| **SetupScreen.tsx** | 2단계 셋업 (1: 시대/난이도, 2: AI 세력 미리보기 + 주군 선택) |
| **WanderingScreen.tsx** | 방랑 페이즈 — 이벤트/이동/모집 |
| **StrategyScreen.tsx** | **내정 화면 핵심** — 모든 command 핸들러, 상태 관리 |
| **GameHUD.tsx** | 상단바 — 날짜, 계절, 인원, 영토, 명성, 자원 |
| **GameToolbar.tsx** | 도구바 — 캐릭터/시설 드롭다운, 퀵액션, 영토 정보 |
| **CommandMenu.tsx** | 사이드 패널 — 개발/인사/군사/외교 탭 |
| **WorldMapView.tsx** | 세계맵 뷰 (10지역 22영토) |
| **TextMapView.tsx** | 텍스트 기반 맵 뷰 |
| **BattleScreen.tsx** | 전투 — 전술 선택 + 라운드 결과 |
| **TacticSelectPanel.tsx** | 전술 선택 UI (6전술) |
| **BattleParticipantCard.tsx** | 전투 참가자 카드 |
| **DispositionScreen.tsx** | 포로 처분 (등용/감금/처형/석방) |
| **BuildingCard.tsx** | 건물 카드 |
| **BuildingCardGrid.tsx** | 건물 카드 그리드 |
| **CharacterPortrait.tsx** | 캐릭터 초상화 (도트 생성) |
| **CharacterDetailModal.tsx** | 캐릭터 상세 모달 |
| **CharacterInfoPanel.tsx** | 캐릭터 정보 패널 |
| **StatBars.tsx** | 스탯 바 |
| **DialogSnackbar.tsx** | 대사 스낵바 |
| **ResultScreen.tsx** | 결과 화면 |
| **SuikodenBackground.tsx** | 배경 |

---

## 핵심 시스템 상세

### 턴 엔진 (`advanceTurn()`)

1턴 = 10일. `advanceTurn()` 1회 호출이 1턴 진행.

```
1. advanceTime       — 시간 +10일 진행
2. updateConstructions — 건설 진행 (잔여 턴 -1)
3. generateResources  — 자원 생산 (매 턴)
4. paySalaries        — 급여 지불 (등급별)
5. consumeFood        — 식량 소비 (3턴마다)
6. processTraining    — 훈련 스탯 성장 (3턴마다)
7. updateStamina      — 체력 소모/회복
8. evaluateAIDecisions — AI 행동
9. updateTavernVisitors — 선술집 방문자 갱신
10. updateThreats      — 위협 출몰/해결
11. autoAssign         — 플레이어 자동 내정
12. updateMorale       — 민심 변동
13. updatePopulation   — 인구 변동 (3턴마다)
14. updateMaxBuildings — 건물 슬롯 갱신
15. checkEvents        — 계절/랜덤 이벤트
```

### 명성 (Fame) 시스템

- **범위**: 0 ~ 1000

#### 명성 획득

| 트리거 | 명성 | 위치 |
|--------|------|------|
| 건설 완료 | +2 | `turnEngine.ts` → `updateConstructions()` |
| 영토 점령 | +5 | `StrategyScreen.tsx` → `handleClaim()` |
| 인재 영입 | +1 | `StrategyScreen.tsx` → `handleRecruit()` |
| 동맹 체결 | +3 | `diplomacy.ts` → `commandAlliance()` |
| 정전 협정 | +2 | `diplomacy.ts` → `commandCeasefire()` |
| 항복 수락 | +10 | `diplomacy.ts` → `commandSurrender()` |

#### 등급별 영입 요구 명성

| 등급 | Grade 점수 | 필요 명성 |
|------|-----------|----------|
| E | <25 | 0 |
| D | 25-34 | 50 |
| C | 35-44 | 150 |
| B | 45-54 | 300 |
| A | 55-64 | 500 |
| S | 65-74 | 700 |
| SS | 75+ | 900 |

### 외교 시스템

- **관계도**: -100 ~ 100 (동맹 = 50 이상)
- **성공률**: 기본 30% + 스탯 보정 + 관계 보정 + 전력비 보정 + 명성 보너스

### 세율/민심/인구

| 세율 | 금 수입 배율 | 민심 영향 |
|------|------------|----------|
| 낮음 | ×0.5 | +2/턴 |
| 보통 | ×1.0 | 변동 없음 |
| 높음 | ×1.5 | -1/턴 |

### 위협 시스템

- 영토별 10% 확률로 출몰 (매 턴)
- 최대 동시 위협: 영토당 2개
- 캐릭터 배정 → 다음 턴에 판정
- 5턴 내 해결하지 않으면 소멸

---

## 작업 재개 가이드

### TypeScript 빌드 체크

```bash
cd sw/web && npx tsc --noEmit
```

### 다음 작업 후보 (우선순위순)

1. **이벤트 팝업 UI** — 현재 이벤트는 로그에만 표시. 화면 팝업 필요.
2. **학당 학습** — 훈련과 유사하게 intellect/virtue 성장 구현.
3. **징병 시스템** — 병영에서 인구→병력 전환.
4. **일기토** — martial ≥ 50 장수끼리 1:1 대결.
5. **장비 장착 UI** — CharacterDetailModal에 장비 교체 기능.
