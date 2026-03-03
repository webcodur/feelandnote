# 08. 기술 스택 및 아키텍처

## 기술 스택

| 계층 | 기술 | 비고 |
|------|------|------|
| **프레임워크** | Next.js (App Router) | 기존 프로젝트 통합 |
| **렌더링** | React DOM + Tailwind CSS | Canvas/Pixi.js 미사용 |
| **상태 관리** | useState + useCallback | Zustand 미사용, 순수 React 상태 |
| **DB** | Supabase | 캐릭터/콘텐츠/대사 동적 로딩 |
| **Server Action** | Next.js Server Actions | DB 쿼리 서버사이드 실행 |

---

## 디렉터리 구조

### 게임 로직 (`sw/web/src/lib/game/suikoden/`)

| 파일 | 역할 | 주요 export |
|------|------|------------|
| **types.ts** | 전체 타입 정의 | `GameState`, `GameCharacter`, `Faction`, `WorldPreview` 등 |
| **constants.ts** | 상수 테이블 | `BUILDINGS`, `TERRITORIES`, `REGIONS`, `TACTIC_MATCHUP` 등 |
| **engine.ts** | 게임 초기화 | `previewWorld()`, `finalizeGame()`, `resolveRound()`, 전투 로직 |
| **turnEngine.ts** | 턴 엔진 | `advanceTurn()` — 자원/건설/식량/훈련/민심/인구 처리 |
| **aiTurn.ts** | AI 의사결정 | `evaluateAIDecisions()` — idle 배치, 건설, 확장, 침공 |
| **diplomacy.ts** | 외교 시스템 | `commandAlliance`, `commandCeasefire`, `commandTribute` |
| **events.ts** | 이벤트 시스템 | `checkSeasonEvents()` — 계절/랜덤 이벤트 |
| **skills.ts** | 전투 스킬 | 병과별 전술 가용 여부, 스킬 정의 |
| **dialog.ts** | 대사 시스템 | DB 대사 + 기본 대사 선택 |
| **utils.ts** | 유틸리티 | `dbToCharacter()`, `calcPersonaGrade()`, 등급 계산 |
| **assetManager.ts** | 에셋 관리 | 이미지 프리로드 |

### UI 컴포넌트 (`sw/web/src/components/features/game/suikoden/`)

| 파일 | 역할 |
|------|------|
| **SuikodenGame.tsx** | 최상위 — idle/setup/ingame 전환 |
| **SuikodenGameWrapper.tsx** | 래퍼 — Server Action 호출, 데이터 주입 |
| **SuikodenLobby.tsx** | 로비 화면 |
| **SetupScreen.tsx** | 2단계 셋업 (시대/난이도 → AI 세력 미리보기 + 주군 선택) |
| **WanderingScreen.tsx** | 방랑 페이즈 — 이벤트, 동료 모집, 지역 이동 |
| **StrategyScreen.tsx** | 전략 화면 — 모든 내정/군사/외교 핸들러 |
| **GameHUD.tsx** | 상단바 — 날짜, 계절, 자원, 명성 |
| **GameToolbar.tsx** | 도구바 — 캐릭터/시설 드롭다운, 영토 정보 |
| **CommandMenu.tsx** | 사이드 패널 — 개발/인사/군사/외교 탭 |
| **WorldMapView.tsx** | 세계맵 — 10지역 22영토 SVG/DOM |
| **TextMapView.tsx** | 텍스트 기반 맵 뷰 |
| **BattleScreen.tsx** | 전투 — 전술 선택 + 라운드 결과 |
| **TacticSelectPanel.tsx** | 전술 선택 UI |
| **BattleParticipantCard.tsx** | 전투 참가자 카드 |
| **DispositionScreen.tsx** | 포로 처분 화면 |
| **BuildingCard.tsx** | 건물 카드 |
| **BuildingCardGrid.tsx** | 건물 카드 그리드 |
| **CharacterPortrait.tsx** | 캐릭터 초상화 (도트 생성) |
| **CharacterDetailModal.tsx** | 캐릭터 상세 모달 |
| **CharacterInfoPanel.tsx** | 캐릭터 정보 패널 |
| **StatBars.tsx** | 스탯 바 |
| **DialogSnackbar.tsx** | 대사 스낵바 |
| **ResultScreen.tsx** | 결과 화면 |
| **SuikodenBackground.tsx** | 배경 |

### Server Actions (`sw/web/src/actions/game/suikoden/index.ts`)

| 함수 | 역할 |
|------|------|
| `loadSuikodenCharacters()` | DB에서 캐릭터 로딩 (profiles + celeb_influence + celeb_persona) |
| `loadSuikodenItems()` | DB에서 아이템 로딩 (user_contents + contents) |

### 라우트

```
sw/web/src/app/(main)/rest/suikoden/page.tsx
```

---

## DB 연동

### 캐릭터 로딩 쿼리

```sql
SELECT p.*, ci.*, cp.command, cp.martial, cp.intellect, cp.charm
FROM profiles p
JOIN celeb_influence ci ON ci.celeb_id = p.id
LEFT JOIN celeb_persona cp ON cp.celeb_id = p.id
WHERE p.death_date IS NOT NULL
  AND p.death_date != ''
  -- 사망 120년 이전 인물만
```

- `celeb_influence` 기반 7스탯 매핑
- `celeb_persona` 있으면 페르소나 기반 Grade 산정 (우선)
- `celeb_persona` 없으면 `total_score` 기반 Grade 폴백

### 아이템 로딩

```sql
SELECT uc.*, c.*
FROM user_contents uc
JOIN contents c ON c.id = uc.content_id
WHERE uc.user_id IN (게임 캐릭터 ID 목록)
```

콘텐츠 타입(BOOK/VIDEO/GAME/MUSIC) → 아이템 카테고리(scroll/painting/manual/score) 변환.

### 게임 세이브

- localStorage 기반 (추후 구현 예정)

---

## 렌더링 방식

전체 DOM 기반. Canvas/WebGL 미사용.

| 화면 | 렌더링 |
|------|--------|
| 세계맵 | React 컴포넌트 (SVG/DOM, 좌표 기반 배치) |
| 전투 | React 컴포넌트 (카드 UI, 전술 선택 패널) |
| 내정 | React 컴포넌트 (카드 그리드, 드롭다운 메뉴) |
| UI 전체 | Tailwind CSS, 반응형 |

---

## 상태 관리

```
SuikodenGame (최상위)
  ├── gameState: GameState          // useState
  ├── worldPreview: WorldPreview    // useState (셋업 중)
  ├── dialogQueue: DialogEntry[]    // useState
  └── updateState: (fn) => void     // useCallback

StrategyScreen
  └── advanceTurn(state) → newState  // 순수 함수
```

- 게임 상태는 `GameState` 단일 객체로 관리
- 턴 엔진(`advanceTurn`)은 순수 함수 — 이전 상태를 받아 새 상태를 반환
- `onUpdateState(fn)` 패턴으로 부모에서 상태 갱신
