# 08. 기술 스택 및 아키텍처

> **최종 실측 체크: 26.07.30** — 코드 구조·DB 조회 범위·진입 경로·브라우저 저장 대조

> 파일별 상세 구현 현황은 `10-implementation-status.md`가 단일원천이다. 이 문서는 아키텍처 골격만 다룬다.

## 기술 스택

| 계층 | 기술 | 비고 |
|------|------|------|
| **프레임워크** | Next.js (App Router) | 기존 프로젝트 통합 |
| **렌더링** | React DOM + Tailwind CSS | 전투·UI는 DOM/SVG |
| **세계맵** | d3 + topojson | 지구본 렌더 (`WorldMapView`). 배경 캔버스는 로비 전용 |
| **상태 관리** | useState + useCallback | Zustand 미사용, 순수 React 상태 |
| **DB** | Supabase | 캐릭터/대사 동적 로딩 |
| **Server Action** | Next.js Server Actions | DB 쿼리 서버사이드 실행 |
| **다국어** | next-intl + 게임 전용 `i18n.ts` | ko/en 2종. 두 체계를 병행한다 |

---

## 디렉터리 구조

### 게임 로직 (`sw/web/src/lib/game/suikoden/`)

| 파일 | 역할 |
|------|------|
| **types.ts** | 전체 타입 정의 |
| **constants.ts** | 상수 테이블 + 스킬 정의(`SKILL_DEFS`) |
| **engine.ts** | 셋업(`previewScenario`/`finalizeGame`), 방랑, 거병, 포로 처분 |
| **battleEngine.ts** | 그리드 턴제 전투 엔진 |
| **campaign.ts** | 통일·패망·제한 턴 판정, 소멸 AI 세력·방랑 인물 정리 |
| **save.ts** | 브라우저 단일 자동 저장·불러오기·삭제 |
| **scenarios.ts** | 시나리오 5종 정의, 고정 인물 ID 목록·누락 검사 |
| **turnEngine.ts** | 턴 엔진 + 내정/외교 커맨드 + 예비 병사 보충 |
| **aiTurn.ts** | AI 의사결정 |
| **diplomacy.ts** | 외교 |
| **events.ts** | 계절/랜덤 이벤트 |
| **skills.ts** | 스킬 가용 판정 |
| **dialog.ts** | 대사 생성 |
| **utils.ts** | 변환·헬퍼 |
| **assetManager.ts** | 초상 경로·프리로드 |

### UI 컴포넌트 (`sw/web/src/components/features/game/suikoden/`)

`SuikodenGameWrapper` → `GameShell` → `SuikodenGame`이 페이즈를 라우팅한다.
`StrategyScreen`, `BuildingCardGrid`, `WorldMapView`는 동명 디렉토리로 분할돼 있다.
전체 파일 목록과 역할은 `10-implementation-status.md` 참조.

### Server Actions (`sw/web/src/actions/game/suikoden/index.ts`)

| 함수 | 역할 |
|------|------|
| `loadSuikodenCharacters()` | `SUIKODEN_CHARACTER_IDS`의 시나리오 고정 인물만 로딩 (`profiles` + `celeb_influence` + `celeb_persona`, 명언 별도 조회) |
| `loadSuikodenDialogues()` | 같은 고정 인물의 대사만 로딩 (`celeb_dialogues`, `unstable_cache` 캐싱) |

### 라우트

**전용 페이지는 없다.** 게임은 쉼터 화면(`/[locale]/rest`)의 카드로 그 자리에 열린다.

```
app/[locale]/(main)/rest/page.tsx        — 서버. 고정 인물·대사를 Promise.all로 로딩
  └ RestGameGrid (클라이언트)             — 게임 카드 4장, 주소 해시 감지
      └ activeGame === "suikoden" 일 때 SuikodenGameWrapper 를 dynamic import 로 마운트

app/[locale]/(main)/rest/suikoden/       — loading.tsx 만 있고 page.tsx 없음 → 404
```

천도 카드를 누르면 주소가 `#suikoden`으로 바뀌며, `/[locale]/rest#suikoden` 직접 접근이나 해시 변경도 자동으로 게임을 연다. `constants/navigation.tsx`에는 아직 `/rest/suikoden` 링크가 남아 있어 이 경로만 404다.

---

## DB 연동

### 캐릭터 로딩

`profiles`에서 필요한 프로필·영향력·페르소나를 읽되 `.in('id', SUIKODEN_CHARACTER_IDS)`로 **시나리오 5종이 실제 사용하는 고정 인물만** 조회한다.

필터:
- `status = 'active'`
- `death_date` 존재 (null·빈문자 제외)
- `profession` 존재
- 사망 연도 ≤ 현재 연도 − 120 (`CUTOFF_YEARS`, JS에서 판정)
- `id`가 `SUIKODEN_CHARACTER_IDS`에 포함

정렬은 `totalScore` 내림차순이다. 명언도 조회가 끝난 고정 인물 ID만 `celeb_dialogues`에서 읽는다. 선택 시나리오에 필요한 인물이 결과에 없으면 `getMissingScenarioCharacterIds()`가 누락을 반환하고 시작 화면이 해당 시나리오를 비활성화한다.

- `celeb_persona` 있으면 페르소나 기반 Grade 산정 (우선)
- 없으면 `total_score` 기반 Grade 폴백

### 대사 로딩

`celeb_dialogues`도 `.in('celeb_id', SUIKODEN_CHARACTER_IDS)`로 고정 인물의 `celeb_id, lines, lines_en`만 캐싱한다(`unstable_cache`, 태그 `CELEBS`+`DIALOGUES`). 전체 대사 테이블을 가져오지 않는다.

### 아이템 로딩

**없다.** 콘텐츠 기반 아이템 시스템은 폐기됐고 `loadSuikodenItems()`도 제거됐다. 장비는 게임 내부에서 생산·배분한다 (`05-items.md`).

### 게임 저장

브라우저 `localStorage`에 한 판을 자동 저장한다.

- 키: `feelandnote:suikoden:save`, 형식 버전 1
- 상태가 바뀔 때 저장하고 로비에서 이어하기를 제공한다
- 전투 애니메이션 임시 값은 저장하지 않으며, 게임 종료 시 저장본을 삭제한다
- 저장소 접근이 거부되거나 가득 차면 현재 플레이는 계속하고 한/영 경고를 표시한다
- 수동 저장·여러 슬롯·서버 동기화는 없다

---

## 렌더링 방식

| 화면 | 렌더링 |
|------|--------|
| 세계맵 | d3 + topojson 지구본, 텍스트맵 대체 뷰 |
| 전투 | 3×5 그리드 DOM + SVG 애니메이션 오버레이 |
| 내정 | 카드 그리드 + 드래그앤드롭 |
| 로비 배경 | 캔버스 (`WindsOfLiangshanBackground`) — idle 전용, 인게임에선 단색 |
| UI 전체 | Tailwind CSS, 반응형 |

---

## 상태 관리

```
GameShell (로비·전체화면·오디오 관리)
  └ SuikodenGame
      ├── internalPhase: 'idle' | 'setup' | 'ingame'   // useState
      ├── gameState: GameState | null                  // useState
      ├── worldPreview: WorldPreview | null            // useState (셋업 중)
      ├── dialogQueue: DialogEntry[]                   // useState
      └── updateState: (fn) => void                    // useCallback

StrategyScreen/useStrategyCommands.ts
  └── advanceTurn(state) → newState  // 순수 함수
```

- 게임 상태는 `GameState` 단일 객체로 관리
- 턴 엔진(`advanceTurn`)은 순수 함수 — 이전 상태를 받아 새 상태를 반환
- `onUpdateState(fn)` 패턴으로 부모에서 상태 갱신
- 인게임 페이즈(`wandering`/`strategy`/`battle`/`disposition`/`result`)는 `GameState.phase`가 정하고, `SuikodenGame`이 화면을 고른다

---

## 다국어 처리 주의

게임 텍스트는 두 경로로 나온다.

1. **next-intl** — `useTranslations('rest.arena.suikoden')`. 정적 UI 라벨
2. **`i18n.ts`** — `getSuikodenText(locale)`. 게임 전용 텍스트 테이블

여기에 더해 `translateSuikodenMessage` / `translateSuikodenBattleLog`가 **엔진이 생성한 한국어 로그 문자열을 정규식으로 매칭해 영어로 재조립**한다. 엔진의 로그 문구를 바꾸면 이 정규식이 조용히 깨진다. 로그 텍스트 수정 시 `i18n.ts`를 함께 확인한다.
