# 10. 구현 현황 상세

> **최종 실측 체크: 26.07.30** — 천도 코드·실제 진입 경로·검증 결과 전수 대조

> 파일별 구현 내용과 시스템 간 연결 관계. 현재 코드 사실의 기준이다.
> 시나리오 선택→방랑→거병→경영→전투·외교→통일·패망의 핵심 완주 흐름은 코드상 연결됐다. 브라우저 실제 한 판 완주·실 DB 고정 UUID·전체 web 빌드는 아래 검증 한계 때문에 아직 최종 승인 전이다.
> 기획 의도는 01~09 참조, 이 문서는 **실제 코드 상태**만 기록한다.

---

## 요약 — 기획서와 코드가 갈라진 지점

작업 전에 이것부터 읽는다. 01~09 기획서에 적힌 것 중 코드와 다른 항목이다.

| 항목 | 기획서 서술 | 실제 코드 |
|------|-----------|----------|
| **전투** | 6전술 상성 카드 선택, 10라운드 | **3×5 그리드 개별 인물 턴제, 최대 30턴.** 전술 카드 폐기 |
| **셋업 1단계** | 시대 + 난이도 선택 | **시나리오 5종 중 택1** (시대·난이도는 시나리오에 내장) |
| **주군 후보** | Grade < 55 방랑자 풀에서 선택 | **시나리오가 지정한 후보 명단**에서 선택 |
| **인물 로딩** | 전체 활성 인물 동적 로딩 | **`SUIKODEN_CHARACTER_IDS`의 시나리오 고정 인물만 조회**, 필수 인물 누락 시 시나리오 비활성 |
| **아이템** | 콘텐츠 기반 두루마리/보물 | **폐기.** 수량제 장비 4종(무기/군마/조선/부적) |
| **진입** | `/rest/suikoden` 페이지 | **전용 페이지 없음.** `/[locale]/rest` 카드 또는 `#suikoden` 직접 접근으로 연다 |
| **저장** | 미구현 | **브라우저 단일 자동 저장·이어하기.** 실패 시 플레이 유지와 경고 |
| **일기토** | 미구현 | **구현.** 시전자 선공 후 대상 생존 시 반격하는 1:1 상호 타격 |
| **캠페인 종료** | 잔존 세력 1개면 승리 | **활성 영토 전부 점령 통일, 플레이어 영토 0 패망, 난이도 제한 턴 초과** 중앙 판정 |

---

## 파일 구조

### 게임 로직 (`sw/web/src/lib/game/suikoden/`) — 15개

| 파일 | 역할 | 주요 export |
|------|------|------------|
| **types.ts** | 전체 타입 정의 | `GameState`, `GameCharacter`, `Faction`, `WorldPreview`, `BattleState`, `BattleUnit`, `TroopEquipment`, `ScenarioDef` 등 |
| **constants.ts** | 상수 테이블 + `SKILL_DEFS` | `BUILDINGS`(15), `TERRITORIES`(22), `REGIONS`(10), `SKILL_DEFS`(14), `GRADE_*`, `EQUIPMENT_MAX`, `DIFFICULTY_CONFIG`, `THREAT_DEFS` 등 |
| **engine.ts** | 셋업·방랑·거병·전투 결과·포로 처분 | `previewWorld()`, `previewScenario()`, `finalizeGame()`, `initGame()`, `raiseArmy()`, `abandonFortress()`, `generateWanderingEvent()`, `attemptRecruitGuest()`, `dismissGuest()`, `moveToRegion()`, `initBattle()`, `applyBattleResult()`, `collectDispositionTargets()`, `calcRecruitRate()`, `applyDisposition()`, `finalizeDisposition()` |
| **battleEngine.ts** | **그리드 턴제 전투 엔진** | `initBattleState()`, `getValidTargets()`, `executeAction()`, `checkBattleEnd()`, `selectAIAction()`, `confirmPlacement()`, `syncLegacyParticipants()` |
| **campaign.ts** | 중앙 캠페인 판정·소멸 세력 정리 | `resolveCampaignOutcome()` |
| **save.ts** | 브라우저 단일 자동 저장 | `saveSuikodenGame()`, `loadSuikodenGame()`, `hasSuikodenGame()`, `clearSuikodenGame()` |
| **turnEngine.ts** | 턴 엔진 + 내정 커맨드 | `advanceTurn()`, `commandBuild/Assign/Reassign/Unassign/Idle/Train/Reward/Punish/Demolish/AssignRecruiter/CancelRecruiter/Dispatch/Recall/SetTaxRate/Equip/Reinforce()` |
| **aiTurn.ts** | AI 의사결정 | `evaluateAIDecisions()`, `assignIdleCharactersForFaction()` |
| **diplomacy.ts** | 외교 | `commandAlliance`, `commandCeasefire`, `commandTribute`, `commandSurrender`, `getRelation`, `isAllied` |
| **events.ts** | 계절/랜덤 이벤트 | `checkSeasonEvents()` **1개뿐** |
| **skills.ts** | 스킬 가용 판정만 (1KB) | `getAvailableSkills(unit)` **1개뿐**. 스킬 데이터는 `constants.ts`, 실행은 `battleEngine.ts` |
| **dialog.ts** | 대사 생성 | `generateDialog()` **1개뿐** |
| **utils.ts** | 유틸 | `dbToCharacter()`, `getEffectiveGrade()`, `getEffectiveGradeScore()`, `getRegionForNationality()`, `getTerritoryForNationality()`, `getBirthYear()`, `getDeathYear()`, `shuffle()`, `getTerritoryDef()`, `getTotalTroops()`, `getTotalPower()`, `getActiveNeighborInfo()`, `isActiveTerritory()`, `isActiveRegion()` |
| **scenarios.ts** | 시나리오 5종·고정 인물 검사 | `SCENARIOS`, `SUIKODEN_CHARACTER_IDS`, `getMissingScenarioCharacterIds()` |
| **assetManager.ts** | 초상 경로·폴백 | `getPortraitUrl()`, `getCharacterFallback()`, `preloadAssets()` |

> `calcTacticDamage()`, `calcPersonaGrade()`는 **export되지 않는다.** `calcPersonaGrade`는 `utils.ts` 내부 함수이고, 전술 대미지 계산 함수는 전투 개편으로 사라졌다.

### UI 컴포넌트 (`sw/web/src/components/features/game/suikoden/`)

**루트**

| 파일 | 역할 |
|------|------|
| **SuikodenGame.tsx** | 최상위 — idle/setup/ingame 전환, 페이즈 라우팅, 상태 변경 자동 저장·이어하기 복구·저장 실패 경고 |
| **SuikodenGameWrapper.tsx** | 래퍼 — 배경·공개 로비·페이즈 라벨·오디오 설정을 `GameShell`에 주입. `DialoguesMap` 타입 export |
| **SuikodenLobby.tsx** | 공개 로비 — 저장본이 있으면 이어하기·새 게임, 없으면 새 캠페인 시작 |
| **SuikodenBackground.tsx** | 배경 어댑터 — idle에선 캔버스(`WindsOfLiangshanBackground`), 인게임에선 단색 |
| **SetupScreen.tsx** | 2단계 셋업. 시나리오 필수 인물 누락 시 해당 시나리오 시작 불가와 누락 안내 |
| **WanderingScreen.tsx** | 방랑 페이즈 — 지역 이동, 객장 영입/해산, 거병, 랜덤 이벤트 |
| **GameHUD.tsx** | 상단바 — 날짜, 계절, 인원, 영토, 명성 |
| **GameToolbar.tsx** | 커맨드 도구바 — 개발/군사/외교/기타, 세율, 건물 현황 |
| **TextMapView.tsx** | 텍스트 맵 뷰 (지구본 대체) |
| **BattleScreen.tsx** | 전투 오케스트레이터 |
| **BattleGridView.tsx** | 한쪽 진영의 3×5 유닛 그리드 렌더 + 타겟 클릭 |
| **BattleSVGOverlay.tsx** | 공격/스킬 SVG 애니메이션 오버레이 |
| **PlacementScreen.tsx** | 전투 전 3×5 배치 (유닛 교환, 적 진형 미리보기) |
| **TurnOrderBar.tsx** | 행동 순서 초상 스트립 |
| **ActionPanel.tsx** | 유닛별 행동 버튼 (공격/스킬/방어/후퇴) |
| **DispositionScreen.tsx** | 포로 처분 |
| **ResultScreen.tsx** | 결과 화면 |
| **CharacterPortrait.tsx** | 초상 (등급 테두리 + 폴백) |
| **CharacterInfoPanel.tsx** | 캐릭터 상세 패널 — 능력/덕목/성향/병과 |
| **DialogSnackbar.tsx** | 대사 스낵바 (큐, 키보드 닫기) |
| **i18n.ts** | 게임 전용 ko/en 텍스트 테이블 + 로그 후번역기 (779줄) |

**하위 디렉토리**

```
hooks/useSuikodenAudio.ts        — 페이즈별 BGM 매핑, 공용 useGameAudio 위임
StrategyScreen/
  StrategyScreen.tsx             — 전략 화면 레이아웃 + 거점 스플래시
  useStrategyCommands.ts         — 턴/건설/외교 등 모든 커맨드 핸들러
  sections/StrategyRightPanel.tsx — 지구본/텍스트맵 토글 + 정보 패널
  types.ts, index.ts
BuildingCardGrid/
  BuildingCardGrid.tsx           — 건물 카드 + 드래그앤드롭 배치 + 등용 담당 지정
  sections/BuildingSlot.tsx      — 슬롯 1칸
  types.ts, index.ts
WorldMapView/
  WorldMapView.tsx               — d3 + topojson 지구본
  sections/renderMap.ts          — 국가 채색·국경·거점 점
  constants.ts, types.ts, index.ts
```

**사라진 컴포넌트** (옛 문서에 있으나 코드에 없음): `CommandMenu.tsx`, `TacticSelectPanel.tsx`, `BattleParticipantCard.tsx`, `BuildingCard.tsx`, `CharacterDetailModal.tsx`, `StatBars.tsx`.
`BuildingCard`는 컴포넌트가 아니라 `types.ts`의 **타입 이름**으로만 남아 있다.

### Server Actions (`sw/web/src/actions/game/suikoden/index.ts`)

| 함수 | 내용 |
|------|------|
| `loadSuikodenCharacters()` | `.in('id', SUIKODEN_CHARACTER_IDS)`로 시나리오 고정 인물만 조회한다. 활성·사망 120년·직군·영향력 조건을 적용하고, 조회된 ID의 명언만 추가한 뒤 `totalScore` 내림차순 정렬 |
| `loadSuikodenDialogues()` | 같은 고정 인물의 `lines`/`lines_en`만 `unstable_cache`로 캐싱(키 `suikoden-dialogues`, 태그 `CELEBS`+`DIALOGUES`) |

> **`loadSuikodenItems()`는 존재하지 않는다.** 장비 개편 때 함께 제거됐다.

### 실제 진입 경로

- **`/rest/suikoden` 페이지는 없다.** `app/[locale]/(main)/rest/suikoden/`에 `loading.tsx`만 있고 `page.tsx`가 없다.
- 실제 화면은 **`/[locale]/rest`**다. 서버가 고정 인물·대사를 함께 읽어 `RestGameGrid`에 넘긴다.
- 천도 카드를 누르면 주소가 `#suikoden`으로 바뀌고 `SuikodenGameWrapper`가 그 자리에서 열린다. `/[locale]/rest#suikoden` 직접 접근과 이후 해시 변경도 자동으로 게임을 연다.
- `constants/navigation.tsx`의 `{ key: "suikoden", href: "/rest/suikoden" }`는 아직 404를 가리키는 죽은 링크다.

---

## 핵심 시스템 상세

### 셋업 플로우 (실제)

```
로비(GameShell) → [시작]
  → SetupScreen 1단계: 시나리오 5종 중 택1 (시대·난이도는 시나리오에 내장)
  → previewScenario(scenario, characters) → WorldPreview
  → SetupScreen 2단계: AI 세력·방랑자 목록(좌) + 주군 후보 카드(중) + 선택 상세(우)
  → finalizeGame(preview, playerLeaderId) → GameState
  → 방랑 페이즈(WanderingScreen)
```

- `finalizeGame(preview, playerLeaderId)` — **인자 2개.** 옛 문서의 `items` 세 번째 인자는 없다.
- `getMissingScenarioCharacterIds()`가 선택 시나리오의 주군 후보·AI·방랑자 고정 UUID를 조회 결과와 대조한다. 하나라도 없으면 시작 화면에서 해당 시나리오를 비활성화하고 누락 수를 안내한다.
- `previewWorld(allChars, difficulty, era)`와 `initGame()`은 엔진에 남은 자유 모드 유물이며 현행 화면은 import하거나 호출하지 않는다.
- 로비는 비밀코드 없이 공개돼 있다. 브라우저 저장본이 있으면 이어하기와 새 게임을 구분해 제공한다.
- 상태가 바뀔 때 키 `feelandnote:suikoden:save`(버전 1)로 자동 저장한다. 종료 결과가 확정되면 저장본을 지우며, 저장 실패는 현재 플레이를 중단하지 않고 경고만 표시한다.

### 전투 시스템 — 그리드 턴제 (2026-06 개편)

전술 카드 전투는 **삭제됐다** (`engine.ts:921` 주석: "레거시 전술 카드 전투 함수는 삭제됨").

| 항목 | 값 |
|------|-----|
| 격자 | `BATTLE_GRID_ROWS = 3` × `BATTLE_GRID_COLS = 5` (0=전열/1=중열/2=후열) |
| 턴 제한 | `BATTLE_MAX_TURNS = 30` |
| 출진 인원 | 진영당 5명 — **상수 아님**, `aiTurn.ts`의 `.slice(0, 5)` 하드코딩 |
| 행동 순서 | 속도 정렬 (`10 + CLASS_SPEED_BONUS + floor(martial/25)`) |
| 이동 | 없음. 배치 후 위치는 타겟팅(전열 우선)과 행 광역에만 관여 |
| 종료 | 한쪽 전멸 / 사기 0 이하 / 30턴 소진(무승부) |

**실제 대미지 공식** (`battleEngine.ts`)

```
HP        = max(10, round(300 + command×2.0 + martial×1.0))     ← calcUnitHp
근접      = max(1, round(martial×0.8 × CLASS_ATTACK_MULT × weaponMod
                        × (1 - defRate - defending) × moraleMod × rand(0.85~1.15)))
  weaponMod = 1 + weapons/10000×0.3        (최대 +30%)
  defRate   = min(0.5, command×0.004 + courage×0.002)
  defending = 방어 상태면 0.5
계략      = max(1, round(intellect×0.7 × (1 - 대상intellect×0.004)
                        × charmResist × rand(0.9~1.1)))
  charmResist = 1 - charms/1000×0.3
사기배율  = ≥90:1.15 / ≥70:1.05 / ≥50:1.0 / ≥30:0.85 / ≥10:0.7 / else 0.5
돌격      = 근접 ×1.5 × horseMod(1 + horses/1000×0.2), 자상 = 가한 피해의 15%
매복      = 근접(사기배율 1.2 적용)
공성타격  = 성벽 보유 시에만 ×3
치유      = 대상 maxHp의 30%
```

> **HP 공식이 두 벌이다.** `utils.dbToCharacter`는 `100 + command×0.5 + martial×0.3`(월드맵 표시용, 약 100~180), `battleEngine.calcUnitHp`는 `300 + command×2.0 + martial×1.0`(전투 내부, 약 300~500). 어느 쪽인지 명시하지 않고 "HP 공식"이라 쓰면 안 된다.

**스킬 14종** (`constants.ts` `SKILL_DEFS`): `charge`, `duel_provoke`, `heal`, `barrier`, `confuse`, `fire_attack`, `iron_wall`, `diplomacy_threat`, `inspire`, `culture_sway`, `trap`, `siege_strike`, `ambush`, `detect_trap`.
가용 판정은 `skills.getAvailableSkills()`가 담당하고, 플레이어 화면은 모든 대상 지정 기술에 실제 대상 선택을 연결한다.

- `duel_provoke`: 시전자 1.3배 선공, 대상 생존 시 1.1배 반격
- `trap`: 적 전열에 설치해 다음 행동 직전 최대 HP 20% 피해. `detect_trap`은 아군 함정 해제
- 혼란은 다음 행동 한 번을 막고 해제된다. 방어·철벽·결계도 정해진 다음 피격/행동까지만 유지된다.

**전투 손실 연속성**: 인물의 기존 부상률과 병력률을 전투 시작 HP·병력에 반영한다. 종료 시 남은 체력·병력을 캠페인 인물에 다시 기록하므로 다음 전투에서 자동으로 완치·완충되지 않는다.

**전투 UI 흐름**: `BattleScreen` → 배치 화면(3×5 교환·적 진형 미리보기) → 전투 화면(HUD·사기·행동 순서·양측 격자·행동 선택·로그). 모바일에서는 양 진영을 위아래로 배치하고 각 칸을 가용 폭의 5등분으로 계산한다. 저장된 전투가 AI 차례여도 자동 행동을 다시 시작한다. 종료 후 `applyBattleResult`와 포로 처분을 거쳐 `resolveCampaignOutcome`이 통일·패망·제한 턴을 판정한다.

**죽은 상수 — 건드리기 전에 확인할 것**: `TACTIC_MATCHUP`, `TACTIC_INFO`, `CLASS_TACTIC_BONUS`는 `constants.ts`에 여전히 export돼 있으나 **어느 파일도 import하지 않는다.** `TacticType`은 `types.ts:13`에 "레거시 — 참조용으로 유지"로 명시돼 있다.

### 턴 엔진 (`advanceTurn()`)

1턴 = 10일. `phase`가 `wandering` 또는 `battle`이면 그대로 반환한다. `turnCount + 1` 후 아래 순서로 실행한다.

```
1  advanceTime              — +10일, 월/년 롤오버, 계절 갱신
2  updateConstructions      — 건설 진행
3  generateResources        — 자원 생산 (무기고 weapons 포함)
4  paySalaries              — 등급별 급여
5  consumeFood              — 3턴마다
6  processTraining          — 3턴마다
7  updateStamina            — 체력 소모/회복
8  evaluateAIDecisions      — AI 행동. phase가 battle이 되면 여기서 즉시 반환
9  updateTavernVisitors     — 선술집 방문자 갱신
10 updateThreats            — 위협 출몰/해결
11 assignIdleCharactersForFaction — autoAssign일 때만
12 updateMorale             — 민심
13 updatePopulation         — 3턴마다
14 updateMaxBuildings       — min(12, floor(8 + population/5000))
15 checkEvents              — `resolveCampaignOutcome` 중앙 판정 후, 게임이 끝나지 않았을 때만 `checkSeasonEvents`
```

### 주요 상수 실측값 (`constants.ts`)

| 상수 | 값 |
|------|-----|
| `TURN` | 턴당 10일, 선술집 체류 3턴, 식량 소비 3턴, 훈련 3턴, 위협 지속 5턴, 위협 확률 0.10, 영토당 최대 위협 2 |
| `INITIAL_GAME_TIME` | 1002년 3월 1일 |
| `PLAYER_GRADE_THRESHOLD` | 55 |
| `GRADE_THRESHOLDS` | SS≥85 / S≥75 / A≥65 / B≥55 / C≥45 / D≥35 / E≥0 |
| `GRADE_FAME_REQ` | SS 900 / S 700 / A 500 / B 300 / C 150 / D 50 / E 0 |
| `GRADE_SALARY` (턴당) | SS 10 / S 8 / A 7 / B 5 / C 4 / D 3 / E 2 |
| `GRADE_TROOPS` | SS 1000 / S 800 / A 700 / B 500 / C 400 / D 300 / E 200 |
| `EQUIPMENT_MAX` | weapons 10000 / horses 1000 / ships 1000 / charms 1000 |
| `CLASS_ATTACK_MULT` | general 1.3 / ranger 1.0 / artisan 0.85 / official 0.6 / saint 0.4 / strategist 0.4 / artist 0.2 |
| `CLASS_SPEED_BONUS` | ranger +4 / strategist +2 / general 0 / saint 0 / official −1 / artist −2 / artisan −3 |
| `CLASS_DEFAULT_ROW` | general 0, official 0 / ranger 1, artisan 1 / saint 2, strategist 2, artist 2 |
| `DIFFICULTY_CONFIG` | easy `{aiFactions 3, startMembers 5, maxTurns 150, startAP 5}` / normal `{5,3,100,4}` / hard `{7,1,80,3}` |
| `BUILDINGS` | 15종 — farm, market, trade, lumber, mine, barracks, training, walls, armory, library, academy, temple, theater, tavern, patrol |
| `TERRITORIES` / `REGIONS` | 22 / 10 |
| `WANDERING_MAX_COMPANIONS` / `WANDERING_TRAVEL_TURNS` | 5 / 20 |

> `EQUIPMENT_LABELS`, `EQUIPMENT_COST`, `BATTLE_MAX_UNITS`, `BATTLE_MAX_ROUNDS`는 **존재하지 않는다.**
> `DIFFICULTY_CONFIG.maxTurns`는 `resolveCampaignOutcome()`이 제한 턴 패배에 사용한다. `startAP`만 정의 뒤 읽히지 않는다.

### 명성 (Fame)

- 범위 0~1000 (`diplomacy.ts`·`turnEngine.ts`에서 클램프)
- 등급별 영입 요구 명성 = `GRADE_FAME_REQ` (위 표)
- 획득: 건설 완료 +2 / 영토 점령 +5 / 인재 영입 +1 / 동맹 +3 / 정전 +2 / 항복 수락 +10
  (점령·영입 트리거는 `StrategyScreen/useStrategyCommands.ts`로 이동했다)

### 대사 (`dialog.ts`)

- 상황 11종: `join_accept`, `join_refuse`, `join_rejected`, `recruit_ask`, `farewell`, `turn_start`, `battle_start`, `battle_win`, `battle_lose`, `building_done`, `visitor_arrive` — 전 상황에 6톤 템플릿이 있다
- 톤 6종: `loyal`, `composed`, `bold`, `humble`, `gentle`, `free`
- DB 연동은 `celeb_dialogues.lines`. **`DB_KEY_MAP`이 4종만 매핑한다** — `join_accept`→`greeting`, `visitor_arrive`→`greeting`, `battle_win`→`battle_win`, `battle_lose`→`battle_lose`. 나머지 7종은 DB 대사가 없고 톤 템플릿만 쓴다
- 톤 선택: `courage≥80` → bold / 여성(`gender===false`)이면 strategist는 composed, 아니면 gentle / `benevolence≥80` → humble / 그 외 병과별 기본값

### 시나리오

| 시나리오 | id | 시대 | 난이도 |
|---------|-----|------|-------|
| 삼국쟁패 | `three_kingdoms` | ancient | normal |
| 십자군 전쟁 | `crusades` | medieval | hard |
| 전국시대 | `sengoku` | modern | normal |
| 나폴레옹 전쟁 | `napoleonic` | modern | hard |
| 대몽골제국 | `mongol_empire` | medieval | hard |

`scenarios.ts`의 프로필 UUID에서 `SUIKODEN_CHARACTER_IDS`를 중복 제거해 만든다. Server Actions는 이 목록만 조회하고, `getMissingScenarioCharacterIds()`가 선택 시나리오의 필수 인물 누락을 검사한다. 인물 명단을 바꾸면 시나리오 정의와 고정 ID 조회가 함께 바뀌는지 확인해야 한다. 26.07.30 작업에서는 실 DB UUID 전원 생존 여부를 조회하지 못했다.

### 시나리오별 활성 영역 제한

`GameState.activeTerritoryIds` / `activeRegionIds`. 빈 배열 = 전체 활성. `finalizeGame()`에서 세력 거점 + 주군 후보 거점으로 자동 도출한다. 적용 지점: `raiseArmy()`, `moveToRegion()`, `generateWanderingEvent()`, `aiExpand()`, `getActiveNeighborInfo()`(GameToolbar), `WanderingScreen`, `TextMapView`, `WorldMapView`.

### i18n

게임 전용 텍스트 테이블 `i18n.ts`와 next-intl 메시지(`rest.arena.suikoden`)를 **둘 다** 쓴다. 컴포넌트는 `useTranslations('rest.arena.suikoden')`와 `getSuikodenText(locale)`를 병행한다.

- 로케일 ko/en 2종. `resolveLocale`은 `en`으로 시작하지 않으면 전부 `ko`
- export 6종: `getSuikodenText`, `stripSuikodenFactionSuffix`, `formatSuikodenDate`, `formatSuikodenElapsed`, `translateSuikodenMessage`, `translateSuikodenBattleLog`
- `translate*` 두 함수는 **정규식 기반 KO→EN 후번역기**다. 엔진이 만든 한국어 로그 문자열을 매칭해 영어로 재조립한다. **엔진 로그 문구를 바꾸면 이 정규식이 조용히 깨진다.**

---

## 에셋 (`sw/web/public/images/game/suikoden/`)

| 디렉토리 | 파일 수 | 상태 |
|----------|--------|------|
| `territories/` | 19 `.png` | 거점 배경. **22개 중 19개.** `new_york`, `tenochtitlan`, `sydney` 누락 |
| `regions/` | 8 `.png` | **10개 중 8개.** `americas`, `oceania` 누락 |

> `BuildingCardGrid.tsx:103`과 `StrategyScreen.tsx:70`이 `imageUrl` 필드를 읽지 않고 `/images/game/suikoden/territories/${territory.id}.png` 문자열로 조립한다. 그래서 위 3개 거점은 404를 낸다.

**오디오** (`sw/web/public/assets/suikoden/`, `hooks/useSuikodenAudio.ts`)

| 파일 | 용도 |
|------|------|
| `suikoden-main--name-of-gangho.mp3` | 「강호의 이름으로」 — idle/result에서 선행 |
| `suikoden-ingame--words-of-wind.mp3` | 「바람이 전한 말」 — setup/wandering/strategy/battle/disposition에서 선행 |

효과음(`sfxFiles`)은 **빈 배열**이다.

---

## 남은 확장 항목 — 코드로 확인한 것

핵심 완주 흐름에 필요한 일기토·예비 병사 보충·통일/패망/제한 턴·자동 저장은 구현됐다. 아래는 별도 확장 항목이다.

| 항목 | 실제 상태 |
|------|----------|
| **인구→병력 징병** | 병영 예비 병사를 인물에게 배치하는 `commandReinforce()`는 구현됐다. 인구를 병사로 바꾸고 민심을 깎는 별도 징병은 없다 |
| **학당 학습** | 건물은 있고 학습은 없다. `academy`의 `effect.special: 'discover'`, `temple`의 `special: 'sorcery'`를 읽는 코드가 없다 |
| **이벤트 팝업** | 계절 이벤트는 효과와 로그만 남긴다. 선택지가 있는 화면 이벤트는 방랑 페이즈뿐이다 |
| **문화 승리 / 외교 승리** | 미구현. 현행 정식 승리는 시나리오 활성 영토 전부 점령이다 |
| **저장 확장** | 브라우저 단일 자동 저장은 구현됐다. 수동 저장·여러 슬롯·서버 동기화는 없다 |
| **수상전(조선)** | `ships`는 배분·표시만 되고 전투 보정이 없다 |
| **장비 구매 UI** | `EQUIPMENT_COST`가 없다. 구매 경로는 무기고 생산뿐이다 |

**추가로 남은 결함·잔재**

- `battleEngine.updateMorale`이 `allyDead`/`enemyDead`를 계산하고 쓰지 않는다. 실제 적용되는 사기 변동은 리더 격파(−30)뿐이다.
- `constants/navigation.tsx`의 `/rest/suikoden` 링크는 실제 해시 진입 경로와 달라 404다.
- 자유 모드용 `previewWorld()`·`initGame()`과 6전술 상수는 현행 화면에서 호출하지 않는 유물로 남아 있다.

---

## 작업 재개 가이드

### 타입 체크

```bash
NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter '@feelandnote/web' exec tsc --noEmit --pretty false
```

### 지난 개편 이력

**전투 밸런스 (2026-03-01)** — 전투 1~2턴 종료, 장수 100% 승률 문제 대응. HP 3배, 근접 −33%, 계략 −30%, 방어율 상한 0.5, 사기 6단계, 돌격 ×1.5·자상 15%, `CLASS_ATTACK_MULT`/`CLASS_SPEED_BONUS` 재조정, `charge` 조건 `martial≥50 OR command≥70`.

**장비 개편 (2026-03-01)** — 콘텐츠 기반 아이템 → 수량제 장비 4종. `GameItem`/`ItemCategory`/`ItemGrade`/`Faction.items`/`GameState.allItems`/`loadSuikodenItems()`/`dbToItem()`/`calcItemBonuses()`/`calcItemGrade()` 전부 제거. 상세는 `05-items.md`.

**그리드 전투 전환 (2026-06)** — 6전술 카드 전투를 3×5 그리드 개별 유닛 턴제로 교체. `battleEngine.ts` 신설, 전술 카드 함수·`TacticSelectPanel`·`BattleParticipantCard` 삭제. 전술 상수는 미사용 상태로 잔존.

**시나리오 셋업 전환** — 셋업 1단계가 시대/난이도 선택에서 시나리오 선택으로 바뀌었다. `previewWorld`는 호출되지 않는 유물이 됐다.

**컴포넌트 분할** — `StrategyScreen`/`BuildingCardGrid`/`WorldMapView`가 동명 디렉토리로 분할됐다. 옛 경로를 참조하는 문서·주석이 남아 있을 수 있다.

### 다음 작업 후보 (우선순위순)

1. **브라우저 실제 완주 검증** — 한국어/영어·모바일에서 시나리오 선택부터 통일·패망·제한 턴까지 확인한다.
2. **실 DB 고정 인물 검증** — 시나리오 5종의 필수 UUID가 전부 활성 조회되는지 확인한다.
3. **죽은 링크 정리** — `navigation.tsx`의 `/rest/suikoden`을 실제 `/rest#suikoden` 진입과 맞춘다.
4. **이벤트 팝업 UI** — 이벤트가 로그에만 남는다.
5. **거점 배경 3장** — `new_york`/`tenochtitlan`/`sydney` 이미지 추가, 또는 `imageUrl` 필드를 읽도록 교정.
6. **인구→병력 징병** — 예비 병사 보충과 별개로 인구를 병사로 전환하고 민심을 반영할지 설계한다.
7. **학당 학습** — `special: 'discover'` 처리.
8. **장비 구매 UI** — 비용 상수부터 정의해야 한다.

---

## 현재 검증 상태 (26.07.30)

- 천도 범위 ESLint: **0 errors / 19 warnings**
- 천도 관련 코드 경로 `git diff --check`: **통과**
- Node 22 내장 TypeScript 로딩: 시나리오 **5종 확인**
- 전체 TypeScript 검사와 `pnpm build:web`: 천도 밖의 사용자 수정 파일 `sw/web/src/constants/scripturesMuseum.ts`가 존재하지 않는 `scriptures/ko/ai-academy.json`, `scriptures/en/ai-academy.json`을 가져와 중단했다. 이 두 오류 외 천도 타입 오류는 보고되지 않았다.
- 미검증: 브라우저 실제 한 판 완주, 한국어/영어·모바일 시각 확인, 실 DB 시나리오 고정 UUID 전원 생존 여부, 엔진 런타임 직접 실행.

따라서 **코드상 본 서비스 진입과 핵심 완주 흐름은 연결됐지만, 배포 가능 확정 상태는 아니다.** 전체 빌드 차단 원인을 해소하고 위 실제 플레이 검증을 마친 뒤 최종 승인한다.
