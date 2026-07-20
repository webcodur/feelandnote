# 10. 구현 현황 상세

> **최종 실측 체크: 26.07.16** — 게임 코드 전수 대조(전투 모델·라우트·파일 트리). 이후 게임이 비활성이라 갱신 없음

> 파일별 구현 내용과 시스템 간 연결 관계. 작업 재개 시 참조용.
> 기획 의도는 01~09 참조, 이 문서는 **실제 코드 상태**만 기록한다.

---

## 요약 — 기획서와 코드가 갈라진 지점

작업 재개 전에 이것부터 읽는다. 01~09 기획서에 적힌 것 중 코드와 다른 항목이다.

| 항목 | 기획서 서술 | 실제 코드 |
|------|-----------|----------|
| **전투** | 6전술 상성 카드 선택, 10라운드 | **3×5 그리드 개별 유닛 턴제, 최대 30턴.** 전술 카드 폐기 |
| **셋업 1단계** | 시대 + 난이도 선택 | **시나리오 5종 중 택1** (시대·난이도는 시나리오에 내장) |
| **주군 후보** | Grade < 55 방랑자 풀에서 선택 | **시나리오가 지정한 후보 명단**에서 선택 |
| **아이템** | 콘텐츠 기반 두루마리/보물 | **폐기.** 수량제 장비 4종(무기/군마/조선/부적) |
| **라우트** | `/rest/suikoden` 페이지 | **페이지 없음.** `/rest` 화면의 카드로 게임을 그 자리에 띄운다 |
| **아이템 로딩** | `loadSuikodenItems()` | **함수 자체가 없다** |
| **일기토** | 미구현 | 여전히 미구현. `duel_provoke` 스킬은 일반 공격으로 대체된 껍데기 |

---

## 파일 구조

### 게임 로직 (`sw/web/src/lib/game/suikoden/`) — 13개

| 파일 | 역할 | 주요 export |
|------|------|------------|
| **types.ts** | 전체 타입 정의 | `GameState`, `GameCharacter`, `Faction`, `WorldPreview`, `BattleState`, `BattleUnit`, `TroopEquipment`, `ScenarioDef` 등 |
| **constants.ts** | 상수 테이블 + `SKILL_DEFS` | `BUILDINGS`(15), `TERRITORIES`(22), `REGIONS`(10), `SKILL_DEFS`(14), `GRADE_*`, `EQUIPMENT_MAX`, `DIFFICULTY_CONFIG`, `THREAT_DEFS` 등 |
| **engine.ts** | 셋업·방랑·거병·포로 처분 | `previewWorld()`, `previewScenario()`, `finalizeGame()`, `initGame()`, `raiseArmy()`, `abandonFortress()`, `generateWanderingEvent()`, `attemptRecruitGuest()`, `dismissGuest()`, `moveToRegion()`, `initBattle()`, `applyBattleResult()`, `collectDispositionTargets()`, `calcRecruitRate()`, `applyDisposition()`, `finalizeDisposition()` |
| **battleEngine.ts** | **그리드 턴제 전투 엔진** | `initBattleState()`, `getValidTargets()`, `executeAction()`, `checkBattleEnd()`, `selectAIAction()`, `confirmPlacement()`, `syncLegacyParticipants()` |
| **turnEngine.ts** | 턴 엔진 + 내정 커맨드 전부 | `advanceTurn()`, `commandBuild/Assign/Reassign/Unassign/Idle/Train/Reward/Punish/Demolish/AssignRecruiter/CancelRecruiter/Dispatch/Recall/SetTaxRate/Equip()` |
| **aiTurn.ts** | AI 의사결정 | `evaluateAIDecisions()`, `assignIdleCharactersForFaction()` |
| **diplomacy.ts** | 외교 | `commandAlliance`, `commandCeasefire`, `commandTribute`, `commandSurrender`, `getRelation`, `isAllied` |
| **events.ts** | 계절/랜덤 이벤트 | `checkSeasonEvents()` **1개뿐** |
| **skills.ts** | 스킬 가용 판정만 (1KB) | `getAvailableSkills(unit)` **1개뿐**. 스킬 데이터는 `constants.ts`, 실행은 `battleEngine.ts` |
| **dialog.ts** | 대사 생성 | `generateDialog()` **1개뿐** |
| **utils.ts** | 유틸 | `dbToCharacter()`, `getEffectiveGrade()`, `getEffectiveGradeScore()`, `getRegionForNationality()`, `getTerritoryForNationality()`, `getBirthYear()`, `getDeathYear()`, `shuffle()`, `getTerritoryDef()`, `getTotalTroops()`, `getTotalPower()`, `getActiveNeighborInfo()`, `isActiveTerritory()`, `isActiveRegion()` |
| **scenarios.ts** | 시나리오 5종 | `SCENARIOS` |
| **assetManager.ts** | 초상 경로·폴백 | `getPortraitUrl()`, `getCharacterFallback()`, `preloadAssets()` |

> `calcTacticDamage()`, `calcPersonaGrade()`는 **export되지 않는다.** `calcPersonaGrade`는 `utils.ts` 내부 함수이고, 전술 대미지 계산 함수는 전투 개편으로 사라졌다.

### UI 컴포넌트 (`sw/web/src/components/features/game/suikoden/`)

**루트**

| 파일 | 역할 |
|------|------|
| **SuikodenGame.tsx** | 최상위 — `GameShell`의 Game 인터페이스 구현. idle/setup/ingame 전환, 페이즈 라우팅 |
| **SuikodenGameWrapper.tsx** | 래퍼 — 배경·로비·페이즈 라벨·오디오 설정을 `GameShell`에 주입. `DialoguesMap` 타입 export |
| **SuikodenLobby.tsx** | 로비 (`GameLobbyMain` 패턴 타이틀 화면) |
| **SuikodenBackground.tsx** | 배경 어댑터 — idle에선 캔버스(`WindsOfLiangshanBackground`), 인게임에선 단색 |
| **SetupScreen.tsx** | 2단계 셋업 (1: 시나리오 선택, 2: 주군 선택) |
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
| `loadSuikodenCharacters()` | `profiles` + `celeb_influence` + `celeb_persona` 조인 로딩. `status='active'`, `death_date` 존재, `profession` 존재로 필터 후 JS에서 사망 120년(`CUTOFF_YEARS`) 경과 판정. 이어서 `celeb_dialogues`에서 `quote`/`quote_en`만 추가 조회. `totalScore` 내림차순 정렬 |
| `loadSuikodenDialogues()` | `celeb_dialogues`의 `lines`/`lines_en` 전체를 `unstable_cache`로 캐싱(키 `suikoden-dialogues`, 태그 `CELEBS`+`DIALOGUES`) |

> **`loadSuikodenItems()`는 존재하지 않는다.** 장비 개편 때 함께 제거됐다.

### 라우트 — 문서가 가장 크게 어긋났던 지점

- **`/rest/suikoden` 페이지는 없다.** `app/[locale]/(main)/rest/suikoden/`에 `loading.tsx`만 있고 `page.tsx`가 없다. (dawn/labyrinth/hegemony도 동일 구조)
- 실제 라우트는 **`/rest`** 하나다. `rest/page.tsx`(서버)가 `loadSuikodenCharacters()` + `loadSuikodenDialogues()`를 `Promise.all`로 호출해 `RestGameGrid`(클라이언트)에 넘긴다.
- `RestGameGrid`는 카드 4장을 그리고, 천도 카드(`/images/games/suikoden-card.webp`, 라벨 `CHEONDO`)를 누르면 `activeGame === "suikoden"`이 되어 `SuikodenGameWrapper`를 동적 import로 그 자리에 마운트한다. 링크 이동이 아니다.
- `constants/navigation.tsx:95`에 `{ key: "suikoden", href: "/rest/suikoden" }`가 남아 있다. **대상 페이지가 없으므로 이 링크는 죽어 있다.** `rest/page.tsx`의 `GAME_SECTIONS`는 해시(`/rest#suikoden`)를 쓴다.

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
- `previewWorld(allChars, difficulty, era)`와 `initGame()`은 **엔진에 남아 있으나 어디서도 호출되지 않는다.** `SuikodenGame.tsx`가 import만 하고 쓰지 않는 죽은 참조다. Grade 55 기준 자동 세력 분리(자유 모드)는 이 함수 안에만 살아 있다.
- `previewWorld`는 `playerCandidates: []`, `scenarioId: ''`를 반환한다 — 주군 후보는 `previewScenario`만 채운다.

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
가용 판정은 `skills.getAvailableSkills()` — 병과 + 스탯 요구치로 필터. `charge`만 특례 (`martial ≥ 50` **또는** `command ≥ 70`).

**전투 UI 흐름**: `BattleScreen` → `phase === 'placement'`면 `PlacementScreen`(3×5 배치, 클릭 교환, 적 진형 미리보기) → 확정 후 HUD/양측 사기 게이지/`TurnOrderBar`/좌우 `BattleGridView` + `BattleSVGOverlay`/플레이어 턴에 `ActionPanel`/로그 12줄. AI는 `selectAIAction` + `executeAction`을 `setTimeout` 체인(초기 300ms, 플레이어 행동 후 900ms, AI 연속 400ms)으로 처리. 종료 시 `syncLegacyParticipants` → `applyBattleResult` → `collectDispositionTargets`.

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
15 checkEvents              — 승리 판정(잔존 세력 1 → isGameOver) 후 checkSeasonEvents
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
> `DIFFICULTY_CONFIG.maxTurns`와 `startAP`는 정의만 돼 있고 **읽는 코드가 없다** — 턴 초과 패배 조건은 미구현이다.

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

`scenarios.ts` 내부 `ID` 맵에 프로필 UUID 51개가 상수로 박혀 있다. 인물 명단 변경 시 이 맵을 함께 고쳐야 한다.

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

## 미구현 — 코드로 확인한 것

| 항목 | 실제 상태 |
|------|----------|
| **일기토** | `battleEngine.ts:527`에 `// 일기토 (미구현 — 간단한 공격으로 대체)`. `duel_provoke`는 `calcMeleeDamage(actor, target, 1.3)`을 부르는 껍데기. UI에선 평범한 스킬 버튼으로 보인다. (`lib/game/duelEngine.ts`는 천도와 무관한 별개 게임) |
| **징병** | `징병`/`conscript` 문자열이 코드에 **없다.** `Resources.troops`는 쌓이기만 하고 `character.troops`로 옮기는 코드가 없다. 유사물: AI 전용 `aiRecruit`(식량→병력), `barracks`의 `troopsPerTurn: 50` |
| **학당 학습** | 건물은 있고 학습은 없다. `academy`의 `effect.special: 'discover'`를 **읽는 코드가 없다.** 적용되는 건 `knowledgePerTurn: 25`뿐. `temple`의 `special: 'sorcery'`도 동일하게 방치 |
| **이벤트 팝업** | 팝업 컴포넌트·상태가 없다. `events.ts`는 효과를 적용하고 `state.log`에 문자열만 추가한다. 선택지가 있는 유일한 이벤트는 방랑 페이즈의 `WanderingEvent` |
| **문화 승리 / 외교 승리** | 미구현. `checkEvents`는 잔존 세력 1개(통일)만 판정 |
| **턴 초과 패배** | 미구현. `DIFFICULTY_CONFIG.maxTurns`를 읽는 코드가 없다 |
| **세이브/로드** | 미구현. localStorage 사용처 없음 |
| **수상전(조선)** | `ships`는 배분·표시만 되고 전투 보정이 없다 |
| **장비 구매 UI** | `EQUIPMENT_COST`가 없다. 구매 경로는 무기고 생산뿐 |

**추가로 발견한 결함** (수정은 별도 판단)

- `battleEngine.updateMorale`이 `allyDead`/`enemyDead`를 계산하고 쓰지 않는다. 실제 적용되는 사기 변동은 리더 격파(−30)뿐이다.
- `SuikodenGame.tsx`가 `initGame`, `previewWorld`를 import만 하고 호출하지 않는다.

---

## 작업 재개 가이드

### 타입 체크

```bash
cd sw/web && npx tsc --noEmit
```

### 지난 개편 이력

**전투 밸런스 (2026-03-01)** — 전투 1~2턴 종료, 장수 100% 승률 문제 대응. HP 3배, 근접 −33%, 계략 −30%, 방어율 상한 0.5, 사기 6단계, 돌격 ×1.5·자상 15%, `CLASS_ATTACK_MULT`/`CLASS_SPEED_BONUS` 재조정, `charge` 조건 `martial≥50 OR command≥70`.

**장비 개편 (2026-03-01)** — 콘텐츠 기반 아이템 → 수량제 장비 4종. `GameItem`/`ItemCategory`/`ItemGrade`/`Faction.items`/`GameState.allItems`/`loadSuikodenItems()`/`dbToItem()`/`calcItemBonuses()`/`calcItemGrade()` 전부 제거. 상세는 `05-items.md`.

**그리드 전투 전환 (2026-06)** — 6전술 카드 전투를 3×5 그리드 개별 유닛 턴제로 교체. `battleEngine.ts` 신설, 전술 카드 함수·`TacticSelectPanel`·`BattleParticipantCard` 삭제. 전술 상수는 미사용 상태로 잔존.

**시나리오 셋업 전환** — 셋업 1단계가 시대/난이도 선택에서 시나리오 선택으로 바뀌었다. `previewWorld`는 호출되지 않는 유물이 됐다.

**컴포넌트 분할** — `StrategyScreen`/`BuildingCardGrid`/`WorldMapView`가 동명 디렉토리로 분할됐다. 옛 경로를 참조하는 문서·주석이 남아 있을 수 있다.

### 다음 작업 후보 (우선순위순)

1. **죽은 링크 정리** — `navigation.tsx`의 `/rest/suikoden`이 404다. 페이지를 만들거나 링크를 `/rest#suikoden`으로 고친다.
2. **이벤트 팝업 UI** — 이벤트가 로그에만 남는다.
3. **거점 배경 3장** — `new_york`/`tenochtitlan`/`sydney` 이미지 추가, 또는 `imageUrl` 필드를 읽도록 교정.
4. **징병 시스템** — 병영에서 인구→병력 전환. `Resources.troops` 소비처를 만든다.
5. **학당 학습** — `special: 'discover'` 처리.
6. **일기토** — 껍데기 `duel_provoke`를 실제 1:1 대결로.
7. **장비 구매 UI** — 비용 상수부터 정의해야 한다.
