# game/shared — 게임 공통 컴포넌트

패권(Hegemony) 게임에서 추출한 공통 모듈. 여명/미궁/천도 등 다른 게임에서 재사용한다.

---

## 현재 파일 구성

```
shared/
  hooks/
    useGameAudio.ts       # 오디오 엔진 (BGM 전환, SFX 재생, 음소거)
  GameLobbySettings.tsx   # 로비 설정 메뉴 (오디오 토글)
  GameLobbyNavRow.tsx     # 로비 메뉴 행 UI
  GameContentItem.tsx     # 게임 내 콘텐츠 아이템 (기존)
  ContentReviewModal.tsx  # 콘텐츠 리뷰 모달 (기존)
```

### 상위 공통 (components/shared/)

| 파일 | 역할 |
|------|------|
| `GameFullScreen.tsx` | 전체화면 래퍼 (브레드크럼, 배경, 푸터) |
| `GameAudioPlayer.tsx` | 하단 오디오 플레이어 UI |

---

## 새 게임 래퍼 작성법

`battle/HegemonyGame.tsx`를 복사한 뒤 아래 5곳만 교체한다.

| # | 교체 대상 | 패권 기준 | 설명 |
|---|----------|----------|------|
| 1 | 오디오 훅 | `useBattleAudio()` | `useGameAudio(CONFIG)` 직접 호출 또는 전용 thin wrapper |
| 2 | `PHASE_LABEL` | idle/draft/captain/battle/result | 게임별 페이즈명 |
| 3 | 게임 본체 | `<BattleGame ... />` | `<DawnGame ... />` 등 |
| 4 | 배경 | `<GameBackground ... />` | 게임별 배경 컴포넌트 |
| 5 | 브레드크럼 | `"패권"` | `"여명"`, `"미궁"` 등 |

---

## useGameAudio 사용법

```ts
import { useGameAudio, type GameAudioConfig } from "@/components/features/game/shared/hooks/useGameAudio";

const CONFIG: GameAudioConfig = {
  basePath: "/assets/dawn/audio",
  sfxFiles: ["sfx-click.mp3", "sfx-correct.mp3"],
  getBgmTracks: (state, context) => {
    switch (state) {
      case "idle": return [{ src: "/assets/dawn/audio/bgm-lobby.mp3", label: "Lobby" }];
      case "play": return [{ src: "/assets/dawn/audio/bgm-play.mp3", label: "Play" }];
      default:     return [];
    }
  },
  // bgmVolume: 0.35,  (기본값)
  // sfxVolume: 0.6,   (기본값)
  // fadeMs: 800,       (기본값)
};

function useDawnAudio() {
  return useGameAudio(CONFIG);
}
```

### setBgm 시그니처

```ts
setBgm(state: string, context?: Record<string, unknown>)
```

- `state` — 게임 페이즈명 (자유 문자열)
- `context` — 추가 정보 객체. 패권에서는 `{ playerWins: boolean }`을 전달하여 승/패 BGM을 분기한다.

### SFX 캐시 격리

`basePath`별로 캐시가 분리된다. 서로 다른 게임의 SFX가 충돌하지 않는다.

---

## 로비 공통 컴포넌트

### GameLobbySettings

오디오 on/off 설정 UI. 모든 게임에서 동일한 형태.

```tsx
<GameLobbySettings
  onBack={() => setMenu("main")}
  bgmMuted={bgmMuted}
  sfxMuted={sfxMuted}
  toggleBgmMuted={toggleBgmMuted}
  toggleSfxMuted={toggleSfxMuted}
/>
```

### GameLobbyNavRow

로비 메뉴 행. 아이콘 + 라벨 + 서브라벨 + 화살표.

```tsx
<GameLobbyNavRow icon={<BookOpen size={14} />} label="규칙" sub="Rules" onClick={...} />
<GameLobbyNavRow icon={<Users size={14} />} label="대인전" sub="Multiplayer" disabled />
```

---

## 주의사항

1. **GameFullScreen / GameAudioPlayer는 건드리지 않는다** — 이미 게임 무관하게 동작하는 상위 공통 컴포넌트다.
2. **오디오 CONFIG는 컴포넌트 바깥에 선언한다** — 렌더마다 새 객체가 생성되면 useEffect 무한 루프가 발생한다. 모듈 레벨 상수 또는 useMemo로 안정화할 것.
3. **sfxFiles 배열도 동일** — 매 렌더 새 배열이면 프리로드가 반복된다. 모듈 레벨에 고정.
4. **getBgmTracks의 context 타입** — `Record<string, unknown>`이므로 소비측에서 타입 단언이 필요하다. 게임별 wrapper에서 캡슐화하면 외부 노출을 막을 수 있다.
5. **로비 UI는 게임별로 분기 가능** — `GameLobbySettings`와 `GameLobbyNavRow`는 공통이지만, 로비 전체 레이아웃(타이틀, CTA, 규칙)은 게임마다 다르므로 각 게임 폴더에 둔다.
