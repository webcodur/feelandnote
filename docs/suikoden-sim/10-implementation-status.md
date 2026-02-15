# 10. 구현 현황 상세

> 파일별 구현 내용과 시스템 간 연결 관계. 내일 작업 재개 시 참조용.

---

## 파일 구조

### 게임 로직 (`sw/web/src/lib/game/suikoden/`)

| 파일 | 역할 | 주요 export |
|------|------|------------|
| **types.ts** | 전체 타입 정의 | `GameState`, `GameCharacter`, `Faction`, `TerritoryId`, `TaxRate` 등 |
| **constants.ts** | 상수 테이블 | `BUILDINGS`, `TERRITORIES`, `GRADE_THRESHOLDS`, `GRADE_FAME_REQ`, `RT` 등 |
| **engine.ts** | 게임 초기화 | `initGame()` — DB 데이터로 GameState 생성 |
| **rtEngine.ts** | **실시간 엔진 핵심** | `processTick()`, 자원/건설/이동/민심/인구/훈련 + 각종 command 함수 |
| **aiRealtime.ts** | AI 의사결정 | `evaluateAIDecisions()` — idle 배치, 건설, 병사 모집, 확장, 침공 |
| **diplomacy.ts** | 외교 시스템 | `commandAlliance`, `commandCeasefire`, `commandTribute`, `commandSurrender` |
| **events.ts** | 이벤트 시스템 | `checkSeasonEvents()` — 계절/랜덤 이벤트 (월 1회) |
| **pathfinding.ts** | A* 경로탐색 | `findPath()` |
| **mapGenerator.ts** | 영토 맵 생성 | `generateTerritoryMap()`, `addWallsToMap()` |
| **skills.ts** | 전투 스킬 | 병과별 스킬 정의 |
| **aiStrategy.ts** | 전투 AI | 턴제 전투 AI 로직 |
| **utils.ts** | 유틸리티 | DB→GameCharacter 변환, 등급 계산, 지역 매핑 |
| **assetManager.ts** | 에셋 관리 | 이미지/사운드 리소스 |

### UI 컴포넌트 (`sw/web/src/components/features/game/suikoden/`)

| 파일 | 역할 |
|------|------|
| **SuikodenGame.tsx** | 최상위 — 화면 전환(타이틀/셋업/전략/전투/결과) |
| **StrategyScreen.tsx** | **내정 화면 핵심** — 모든 command 핸들러, 상태 관리 |
| **GameHUD.tsx** | 상단바 — 날짜, 계절, 인원, 영토, 명성, 자원, 배속 |
| **GameToolbar.tsx** | 도구바 — 캐릭터/시설 드롭다운, 퀵액션, 영토 정보 |
| **CommandMenu.tsx** | 사이드 패널 — 개발/인사/군사/외교 탭 |
| **TerritoryInteriorView.tsx** | 영토 내부 16x12 타일맵 렌더링 |
| **TileContextMenu.tsx** | 타일 우클릭 메뉴 — 건설/이동/근무/캐릭터 선택 |
| **CharacterToken.tsx** | 캐릭터 도트 토큰 |
| **CharacterPortrait.tsx** | 캐릭터 초상화 |
| **CharacterDetailModal.tsx** | 캐릭터 상세 모달 |
| **WorldMapMini.tsx** | 미니 세계맵 |
| **WorldMapView.tsx** | 전체 세계맵 |
| **BattleScreen.tsx** | 턴제 전투 화면 |
| **SkillMenu.tsx** | 전투 스킬 선택 |
| **TitleScreen.tsx** | 타이틀 화면 |
| **SetupScreen.tsx** | 게임 설정 (세력 선택, 난이도) |
| **ResultScreen.tsx** | 결과 화면 |

---

## 핵심 시스템 상세

### 명성 (Fame) 시스템

- **범위**: 0 ~ 1000
- **HUD 표시**: `⭐ {fame}/1000`

#### 명성 획득 트리거

| 트리거 | 명성 | 위치 |
|--------|------|------|
| 건설 완료 | +2 | `rtEngine.ts` → `updateConstructions()` |
| 영토 점령 | +5 | `StrategyScreen.tsx` → `handleClaim()` |
| 인재 영입 성공 | +1 | `StrategyScreen.tsx` → `handleRecruit()` |
| 동맹 체결 | +3 | `diplomacy.ts` → `commandAlliance()` |
| 정전 협정 | +2 | `diplomacy.ts` → `commandCeasefire()` |
| 항복 수락 | +10 | `diplomacy.ts` → `commandSurrender()` |

#### 등급별 영입 요구 명성

| 등급 | totalScore | 필요 명성 |
|------|-----------|----------|
| E | 0-24 | 0 |
| D | 25-34 | 50 |
| C | 35-44 | 150 |
| B | 45-54 | 300 |
| A | 55-64 | 500 |
| S | 65-74 | 700 |
| SS | 75+ | 900 |

- **정의**: `constants.ts` → `GRADE_FAME_REQ`
- **필터링**: `StrategyScreen.tsx` → `handleRecruit()` — wanderers에서 명성 부족 캐릭터 제외
- **메시지**: 명성 부족 시 "명성이 부족하다. (최소 N 필요, 현재 M)" 표시

#### 명성 보너스 효과

| 효과 | 수식 | 최대 | 위치 |
|------|------|------|------|
| 영입 성공률 | `fame × 0.00015` | +15% | `StrategyScreen.tsx` |
| 외교 성공률 | `fame × 0.00015` | +15% | `diplomacy.ts` → `calcDiplomacyRate()` |

### 외교 시스템

- **관계도**: -100 ~ 100 (동맹 = 50 이상)
- **성공률**: `30% + 지략×3% + 인애×2% + 관계×0.5% + 전력비×10% + 명성보너스`

| 행동 | 비용 | 관계 변화 | 명성 |
|------|------|----------|------|
| 동맹 | 금 200 | 성공: +50 / 실패: -10 | +3 |
| 정전 | 금 100 | 성공: +20 | +2 |
| 조공 | 금 가변 | +gold/10 | - |
| 항복 권유 | 없음 | 영토/인재 흡수 | +10 |

### 이벤트 시스템

매월 1일 0시에 `checkSeasonEvents()` 호출.

| 계절 | 이벤트 | 확률 | 효과 |
|------|--------|------|------|
| 봄 | 풍년 | 15% | 식량 +30% |
| 봄 | 역병 | 8% | 병력 -10% |
| 여름 | 홍수 | 10% | 식량 -50, 민심 -5 |
| 여름 | 풍작 | 12% | 식량 +80 |
| 가을 | 수확제 | 20% | 민심 +10 |
| 가을 | 유민 유입 | 10% | 인구 +200 |
| 겨울 | 한파 | 15% | 식량 -100 |
| 무관 | 도적 | 5% | 금 -30, 민심 -3 |
| 무관 | 상인 행렬 | 6% | 금 +50, 자재 +30 |
| 무관 | 고서 발견 | 4% | 지식 +40 |
| 무관 | 축제 | 5% | 민심 +5, 인구 +50 |

### 세율/민심/인구

| 세율 | 금 수입 배율 | 민심 영향 |
|------|------------|----------|
| 낮음 | ×0.5 | +2/일 |
| 보통 | ×1.0 | 변동 없음 |
| 높음 | ×1.5 | -1/일 |

- **민심 범위**: 0-100
- **인구 변동**: 월 1회, 민심 50 이상이면 +50~150, 미만이면 -50~100

### 인사 시스템

| 명령 | 조건 | 효과 | 위치 |
|------|------|------|------|
| 훈련 | 연병장 필요 | power/skill/stamina +0.1~0.3/30틱 | `rtEngine.ts` → `processTraining()` |
| 포상 | 금 50 | 충성 +10, 사기 +5 | `rtEngine.ts` → `commandReward()` |
| 처벌 | 없음 | 충성 -15, 사기 -10 | `rtEngine.ts` → `commandPunish()` |

---

## 실시간 엔진 틱 처리 순서

`processTick()` 1회 호출 = 1틱 = 게임 내 1시간.

```
1. advanceTime        — 시간 1시간 진행
2. moveCharacters     — 캐릭터 이동 처리
3. updateConstructions — 건설 진행
4. generateResources  — 자원 생산 (24틱마다 = 1일)
5. consumeFood        — 식량 소비 (720틱마다 = 30일)
6. processTraining    — 훈련 스탯 성장
7. evaluateAIDecisions — AI 행동 (120틱마다 = 5일)
8. updateMorale       — 민심 변동 (24틱마다)
9. checkEvents        — 계절/랜덤 이벤트 (월 1일)
10. updatePopulation  — 인구 변동 (720틱마다)
```

---

## 작업 재개 가이드

### TypeScript 빌드 체크

```bash
cd sw/web && npx tsc --noEmit
```

현재 에러 0.

### 다음 작업 후보 (우선순위순)

1. **이벤트 팝업 UI** — 현재 이벤트는 로그에만 표시. 화면 팝업 필요.
2. **학당 학습** — 훈련과 유사하게 intellect/virtue 성장 구현.
3. **징병 시스템** — 병영에서 인구→병력 전환.
4. **민심 세분화** — 폭동(0-19) 시 건물 파괴/인재 이탈.
5. **장비 장착 UI** — CharacterDetailModal에 장비 교체 기능.
