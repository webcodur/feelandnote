# 08. 기술 스택 및 아키텍처

## 기술 스택

| 계층 | 기술 | 이유 |
|------|------|------|
| **프레임워크** | Next.js (기존 프로젝트) | 코드베이스 통합 |
| **렌더링** | HTML Canvas + Pixi.js | 2D 스프라이트, 타일맵, 성능 |
| **상태 관리** | Zustand 또는 useReducer | 게임 상태 (턴, 자원, 유닛) |
| **DB** | Supabase (기존) | 캐릭터/콘텐츠 로딩 |
| **오디오** | Howler.js | BGM/SE 재생, 볼륨 제어 |
| **타일맵** | @pixi/tilemap 또는 수동 구현 | 전장 렌더링 |

---

## 디렉터리 구조 (예상)

```
sw/web/src/
├── app/(main)/rest/suikoden/       # 라우트
│   └── page.tsx                     # 게임 진입점
├── components/features/game/suikoden/
│   ├── SuikodenGame.tsx             # 메인 게임 컴포넌트
│   ├── screens/
│   │   ├── TitleScreen.tsx          # 타이틀
│   │   ├── SetupScreen.tsx          # 주군 선택, 난이도
│   │   ├── StrategyScreen.tsx       # 전략 맵 (메인 루프)
│   │   ├── BattleScreen.tsx         # 전투 씬
│   │   ├── ManagementScreen.tsx     # 거점 경영
│   │   └── ResultScreen.tsx         # 승리/패배
│   ├── ui/
│   │   ├── CharacterCard.tsx        # 캐릭터 정보 카드
│   │   ├── StatsBar.tsx             # 스탯 표시
│   │   ├── ResourceBar.tsx          # 자원 표시
│   │   ├── MiniMap.tsx              # 미니맵
│   │   └── DialogBox.tsx            # 대화/이벤트 창
│   ├── battle/
│   │   ├── BattleMap.tsx            # 전투 맵 렌더링 (Canvas)
│   │   ├── BattleHUD.tsx            # 전투 UI
│   │   ├── UnitSprite.tsx           # 유닛 스프라이트
│   │   └── EffectLayer.tsx          # 이펙트 레이어
│   └── hooks/
│       ├── useGameState.ts          # 게임 전체 상태
│       ├── useBattleEngine.ts       # 전투 로직
│       ├── useAI.ts                 # AI 행동 결정
│       └── useAudio.ts             # 음악/효과음
├── lib/game/suikoden/
│   ├── types.ts                     # 게임 타입 정의
│   ├── constants.ts                 # 상수 (건물, 지형, 등급 등)
│   ├── engine/
│   │   ├── gameEngine.ts            # 턴 진행, 상태 전이
│   │   ├── combatEngine.ts          # 전투 계산
│   │   ├── economyEngine.ts         # 자원/경영 계산
│   │   ├── diplomacyEngine.ts       # 외교 계산
│   │   └── eventEngine.ts           # 이벤트 판정
│   ├── ai/
│   │   ├── aiController.ts          # AI 의사결정
│   │   ├── strategies.ts            # 정복/책략/경제/인덕/문화형
│   │   └── pathfinding.ts           # 이동 경로 계산
│   ├── data/
│   │   ├── mapData.ts               # 지역/거점 정의
│   │   ├── buildingData.ts          # 건물 데이터
│   │   └── eventData.ts             # 이벤트 데이터
│   └── utils/
│       ├── statCalc.ts              # 스탯 계산 유틸
│       ├── gradeCalc.ts             # 등급 산정
│       └── itemCalc.ts              # 아이템 효과 계산
└── actions/game/suikoden/
    ├── loadCharacters.ts            # DB에서 캐릭터 로딩
    └── loadItems.ts                 # DB에서 아이템 로딩
```

---

## DB 연동

### 게임 시작 시 로딩

```typescript
// loadCharacters.ts
async function loadGameCharacters() {
  // 1906년 이전 사망자 + 영향력 데이터 있는 인물
  const { data } = await supabase
    .from('profiles')
    .select(`
      id, nickname, title, profession, nationality, gender,
      birth_date, death_date, bio, quotes,
      avatar_url, portrait_url,
      celeb_influence (
        political, strategic, tech, social, economic, cultural,
        transhistoricity, total_score
      )
    `)
    .not('death_date', 'is', null)
    .not('death_date', 'eq', '')
    // 연도 필터는 클라이언트에서 처리

  return data.filter(c => getDeathYear(c.death_date) <= currentYear - 120)
}
```

```typescript
// loadItems.ts
async function loadGameItems() {
  // 게임 캐릭터들의 콘텐츠를 아이템으로 변환
  const { data } = await supabase
    .from('user_contents')
    .select(`
      content_id,
      user_id,
      review,
      contents (
        id, type, title, creator, thumbnail_url
      )
    `)
    .in('user_id', characterIds)

  return data
}
```

### 게임 세이브 (선택적)

- localStorage 기반 세이브 (MVP)
- 추후 Supabase에 `game_saves` 테이블 추가 가능

---

## 핵심 타입 정의

```typescript
interface GameCharacter {
  id: string
  nickname: string
  title: string
  profession: Profession
  nationality: string
  gender: boolean | null
  birthDate: string
  deathDate: string
  bio: string
  quotes: string
  avatarUrl: string | null
  portraitUrl: string | null

  // 전투 스탯 (DB에서 매핑)
  stats: {
    martial: number    // strategic → 무력
    craft: number      // tech → 기술
    intellect: number  // political → 지략
    virtue: number     // social → 덕망
    economy: number    // economic → 경영
    culture: number    // cultural → 문화
  }

  // 파생 스탯
  hp: number           // transhistoricity × 2.5
  command: number      // max(martial, intellect)
  charm: number        // (virtue + culture) / 2
  grade: Grade         // total_score 기반
  unitClass: UnitClass // profession 기반
}

interface GameItem {
  id: string
  contentId: string
  type: 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC'
  title: string
  creator: string
  thumbnailUrl: string | null
  category: 'scroll' | 'painting' | 'manual' | 'score'
  grade: ItemGrade
  bonuses: StatBonuses
  originCelebId: string  // 어떤 셀럽이 추천했는지
  review: string | null  // 추천 이유
}

interface GameState {
  turn: number
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  phase: 'management' | 'action' | 'event' | 'settlement'
  factions: Faction[]
  wanderers: GameCharacter[]
  map: WorldMap
  selectedFaction: string // 플레이어 세력 ID
}

interface Faction {
  id: string
  leaderId: string
  name: string
  color: string
  members: GameCharacter[]
  territories: Territory[]
  resources: Resources
  items: GameItem[]
  fame: number          // 명성
  relations: Record<string, number> // 다른 세력과의 관계
}
```

---

## 렌더링 방식

### 전략 맵

- **DOM 기반** (React 컴포넌트)
- SVG 또는 CSS Grid로 지역/거점 표시
- 클릭/터치로 거점 선택
- 간단한 애니메이션 (CSS transition)

### 전투 씬

- **Canvas 기반** (Pixi.js)
- 32×32 타일 그리드
- 스프라이트 시트에서 프레임 애니메이션
- 이펙트 레이어 오버레이

### UI

- **DOM 기반** (React + Tailwind)
- 게임 화면 위에 오버레이
- 반응형 (모바일 대응)

---

## 개발 단계

| 단계 | 범위 | 예상 에셋 |
|------|------|----------|
| **MVP** | 주군 선택 → 턴제 전투 1회 | 초상화 템플릿, 전투 타일, 전투 BGM 1곡, SE 5종 |
| **Alpha** | 전략 맵 + 전투 + 영입 | + 세계 지도, 건물 5종, BGM 3곡 |
| **Beta** | 경영 + 외교 + AI | + 건물 전체, UI 전체, BGM 전체 |
| **Release** | 이벤트 + 밸런싱 + 세이브 | + 이펙트 전체, SE 전체 |
