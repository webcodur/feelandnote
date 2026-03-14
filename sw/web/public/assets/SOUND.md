# 사운드 에셋 가이드

## 디렉토리 구조

```
assets/
├── common/        ← 전역 공용 SFX
├── hegemony/      ← 패권 BGM
├── dawn/          ← 여명 BGM
├── labyrinth/     ← 미궁 BGM
└── suikoden/      ← 천도 BGM
```

- **BGM**: 게임별 폴더에 보관한다.
- **SFX**: `common/`에 보관한다. 모든 게임에서 공유 가능.
- **공용 BGM**: 승패 결과 등 게임 공통 BGM도 `common/`에 보관한다.

## 파일 네이밍 규칙

```
{게임명}-{역할}--{곡제목slug}.mp3
```

| 구성 요소 | 설명 | 예시 |
|-----------|------|------|
| 게임명 | 소속 게임 영문명 | `suikoden`, `hegemony`, `labyrinth`, `dawn` |
| 역할 | 게임 내 용도 | `main`, `battle`, `draft`, `gameplay`, `ingame` |
| `--` | 역할과 곡 제목 구분자 | |
| 곡제목slug | 곡 고유 제목 (영문 kebab-case) | `name-of-gangho`, `words-of-wind` |

- 곡 제목이 미정이면 역할까지만 표기한다: `hegemony-intro.mp3`
- 곡 제목이 확정되면 `--` 뒤에 추가한다: `hegemony-intro--march-of-glory.mp3`
- SFX는 `sfx-{동작}.mp3` 형식을 따른다: `sfx-card-select.mp3`
- 공용 BGM은 `bgm-{역할}.mp3` 형식을 따른다: `bgm-result-win.mp3`
- 파일명에 한국어를 사용하지 않는다.

## 공용 (common)

| 파일명 | 용도 | 곡 제목 |
|--------|------|---------|
| `bgm-result-win.mp3` | 승리 결과 | — |
| `bgm-result-lose.mp3` | 패배 결과 | — |

## 게임별 BGM 목록

### 패권 (hegemony) — 5곡

| 파일명 | 역할 | 곡 제목 |
|--------|------|---------|
| `hegemony-main--in-the-name-of-olympus.mp3` | 메인 | 올림포스의 이름으로 |
| `hegemony-draft.mp3` | 드래프트 | — |
| `hegemony-battle.mp3` | 전투 | — |
| ~~승패 BGM~~ | → `common/`으로 이동 | |

### 천도 (suikoden) — 2곡

| 파일명 | 역할 | 곡 제목 |
|--------|------|---------|
| `suikoden-main--name-of-gangho.mp3` | 메인 | 강호의 이름으로 |
| `suikoden-ingame--words-of-wind.mp3` | 인게임 | 바람이 전한 말 |

### 미궁 (labyrinth) — 2곡

| 파일명 | 역할 | 곡 제목 |
|--------|------|---------|
| `labyrinth-main--deliberation-of-stone.mp3` | 메인 | Deliberation of Stone |
| `labyrinth-gameplay.mp3` | 게임플레이 | — |

### 여명 (dawn) — 3곡

| 파일명 | 역할 | 곡 제목 |
|--------|------|---------|
| `dawn-main.mp3` | 메인/로비/게임오버 | — |
| `dawn-ingame--awaited-dawn.mp3` | 인게임 | Awaited Dawn |
| `dawn-streak--judgment-of-the-golden-thrones.mp3` | 연속 10+ 정답 | Judgment of the Golden Thrones |

## 코드 연동

각 게임의 오디오 훅에서 경로를 관리한다.

| 게임 | 훅 파일 |
|------|---------|
| 패권 | `features/game/battle/hooks/useBattleAudio.ts` |
| 천도 | `features/game/suikoden/hooks/useSuikodenAudio.ts` |
| 미궁 | `features/game/labyrinth/hooks/useLabyrinthAudio.ts` |
| 여명 | `features/game/dawn/hooks/useDawnAudio.ts` |

- `basePath`: BGM 경로 기준 (`/assets/{게임명}`)
- `sfxBasePath`: SFX 경로 기준 (`/assets/common`). 미지정 시 `basePath` 사용.
- 새 곡 추가 시 파일을 해당 폴더에 넣고, 훅의 `getBgmTracks`에 등록한다.
