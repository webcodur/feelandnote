# 10. 구현 현황 상세

> 파일별 구현 내용과 시스템 간 연결 관계. 작업 재개 시 참조용.

---

## 파일 구조

### 게임 로직 (`sw/web/src/lib/game/suikoden/`)

| 파일 | 역할 | 주요 export |
|------|------|------------|
| **types.ts** | 전체 타입 정의 | `GameState`, `GameCharacter`, `Faction`, `WorldPreview`, `BattleState` 등 |
| **constants.ts** | 상수 테이블 | `BUILDINGS`, `TERRITORIES`, `REGIONS`, `TACTIC_MATCHUP`, `DIFFICULTY_CONFIG` 등 |
| **engine.ts** | 게임 초기화 + 전투 | `previewWorld()`, `previewScenario()`, `finalizeGame()`, `initBattle()`, `applyBattleResult()` |
| **scenarios.ts** | 시나리오 정의 (5개) | `SCENARIOS` — 삼국쟁패/십자군/전국시대/나폴레옹/대몽골 |
| **turnEngine.ts** | 턴 엔진 | `advanceTurn()` — 시간/건설/자원/식량/훈련/민심/인구/이벤트 |
| **aiTurn.ts** | AI 의사결정 | `evaluateAIDecisions()`, `assignIdleCharactersForFaction()` |
| **diplomacy.ts** | 외교 시스템 | `commandAlliance`, `commandCeasefire`, `commandTribute`, `commandSurrender` |
| **events.ts** | 이벤트 시스템 | `checkSeasonEvents()` — 계절/랜덤 이벤트 |
| **skills.ts** | 전투 스킬 | `getAvailableTactics()`, 병과별 스킬 정의 |
| **dialog.ts** | 대사 시스템 | 플랫폼 공용 톤(loyal/composed/bold/humble/gentle/free) + DB celeb_dialogues 연동. 11상황(join_accept/join_refuse/join_rejected/recruit_ask/farewell/turn_start/battle_start/battle_win/battle_lose/building_done/visitor_arrive) |
| **utils.ts** | 유틸리티 | `dbToCharacter()`, `calcPersonaGrade()`, `getEffectiveGrade()`, `calcTacticDamage()`, `commandEquip()`, `getActiveNeighborInfo()` |
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
| **BuildingCardGrid.tsx** | 건물 카드 그리드 — 거점 배경 이미지(`/images/game/suikoden/territories/{id}.png`) 적용 |
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

### 시나리오 시스템

- **정의**: `scenarios.ts` — 5개 시나리오 (`ScenarioDef` 타입)
- **셋업**: `SetupScreen.tsx` — 시나리오 선택 UI + 플레이어 후보 선택
- **미리보기**: `previewScenario()` — 시나리오 기반 AI 세력/방랑자/플레이어 후보 구성
- **확정**: `finalizeGame()` — 미선택 후보를 AI 세력으로 자동 전환

| 시나리오 | 시대 | 난이도 | 플레이어 후보 | AI 세력 |
|---------|------|-------|-------------|---------|
| 삼국쟁패 | ancient | normal | 유비/조조/손권 | 진시황 |
| 십자군 전쟁 | medieval | hard | 리처드1세/살라딘 | 메흐메트2세/블라드3세/엘시드 |
| 전국시대 | modern | normal | 노부나가/이에야스/신겐 | 히데요시/요리토모 |
| 나폴레옹 전쟁 | modern | hard | 나폴레옹/웰링턴 | 비스마르크/프리드리히2세/표트르/예카테리나 |
| 대몽골제국 | medieval | hard | 칭기즈칸/이세민 | 주원장/쿠빌라이/티무르/살라딘/왕건 |

### 시나리오별 활성 영역 제한

`GameState.activeTerritoryIds` / `activeRegionIds`로 시나리오에 해당하는 거점/지역만 활성화.

- **빈 배열** = 전체 활성 (레거시/자유 모드 호환)
- **시나리오 모드**: `finalizeGame()`에서 모든 세력의 거점 + 플레이어 후보 거점에서 자동 도출

#### 제한 적용 범위

| 대상 | 함수/컴포넌트 | 필터 방식 |
|------|-------------|----------|
| 거병 가능 거점 | `raiseArmy()` | `isActiveTerritory()` |
| 이동 가능 지역 | `moveToRegion()` | `isActiveRegion()` |
| 방랑자 출현 | `generateWanderingEvent()` | 활성 지역 내 인물만 |
| AI 확장 | `aiExpand()` | `isActiveTerritory()` |
| 군사 탭 이웃 | `CommandMenu.tsx`, `GameToolbar.tsx` | `getActiveNeighborInfo()` |
| 빈 거점 목록 | `WanderingScreen.tsx` | `activeTerritoryIds` 필터 |
| 텍스트맵 | `TextMapView.tsx` | 활성 지역/거점만 렌더 |
| 3D 지구본 | `WorldMapView.tsx` | 활성 거점·연결선·대륙만 렌더 |

---

## 작업 재개 가이드

### TypeScript 빌드 체크

```bash
cd sw/web && npx tsc --noEmit
```

### 전투 밸런스 개편 (2026-03-01)

**문제**: 전투 1~2턴 종료, 장수 100% 승률, 비전투 병과 전투 불가.

**변경 사항**:
- HP 3배 증가: `100 + cmd×0.5 + mar×0.3` → `300 + cmd×2.0 + mar×1.0`
- 근접 대미지 33% 감소: `mar×1.2` → `mar×0.8`
- 계략 대미지 30% 감소: `int×1.0` → `int×0.7`, 저항 `int×0.003` → `int×0.004`
- 방어율 상한 축소: `0.7` → `0.5`, command 가중 증가: `×0.003` → `×0.004`
- 사기 6단계: 1.15/1.05/1.0/0.85/0.7/0.5
- 돌격 너프: ×2 → ×1.5, 자상 20% → 15%
- 문화 감화 버프: 사기 -10 → -15
- CLASS_ATTACK_MULT: general 1.5→1.3, artisan 1.0→0.85, official 0.7→0.6, saint/strategist 0.5→0.4, artist 0.3→0.2
- CLASS_SPEED_BONUS: ranger 3→4, strategist 1→2, official 0→-1, artist -1→-2, artisan -2→-3
- inspire 요구: charisma 50→40
- charge 복합 조건: martial≥50 OR command≥70
- heal/barrier profession 체크 제거

### 에셋 (`sw/web/public/images/game/suikoden/`)

| 디렉토리 | 파일 수 | 용도 |
|----------|--------|------|
| `territories/` | 19개 `.png` | 거점 배경 이미지 — BuildingCardGrid 뒷배경 |
| `regions/` | 8개 `.png` | 지역 배경 이미지 (미사용) |

### 장비 시스템 개편 (2026-03-01)

**변경**: 콘텐츠 기반 아이템(두루마리/보물/GameItem) → 원작 4종 수량제 장비(`TroopEquipment`)

- **제거**: `GameItem`, `ItemCategory`, `ItemGrade` 타입, `Faction.items`, `GameState.allItems`, `loadSuikodenItems()`, `dbToItem()`, `calcItemBonuses()`, `calcItemGrade()`
- **추가**: `TroopEquipment` (weapons/horses/ships/charms), `EQUIPMENT_MAX/LABELS/COST`, `commandEquip()`, `aiDistributeEquipment()`
- **Resources 확장**: `weapons`, `horses`, `ships`, `charms` 필드 추가
- **GRADE_TROOPS 상한**: SS:1000, S:800, A:700, B:500, C:400, D:300, E:200
- **전투 보정**: 무기(+30% 공격), 군마(+20% 돌격), 부적(-30% 계략/화공 피해)
- **무기고 생산**: armory 건물이 매 턴 weapons 생산 (33/턴, 배치 시 50/턴)
- **UI**: CharacterInfoPanel 소유물 탭 → 4종 장비 프로그레스 바
- **상세**: `docs/suikoden-sim/05-items.md` 참조

### 다음 작업 후보 (우선순위순)

1. **이벤트 팝업 UI** — 현재 이벤트는 로그에만 표시. 화면 팝업 필요.
2. **학당 학습** — 훈련과 유사하게 intellect/virtue 성장 구현.
3. **징병 시스템** — 병영에서 인구→병력 전환.
4. **일기토** — martial ≥ 50 장수끼리 1:1 대결.
5. **장비 구매/배분 UI** — StrategyScreen에서 무기고 건물을 통한 장비 구매·캐릭터 배분 인터페이스.
