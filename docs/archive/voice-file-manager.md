# Voice/Cover 파일 관리 기능 — 작업 지시서

## 배경

Remotion `public/` 디렉토리가 640MB(voice 521MB, covers 69MB)로 비대해졌다.
dev server가 이를 전부 서빙하면서 메모리 폭주 → 이미지 로딩 실패 → 무한 리렌더링이 발생한다.
**작업 중인 에피소드의 파일만 public에 두고, 나머지는 archive에 보관하는 관리 기능**이 필요하다.

## 아키텍처

```
sw/remotion/public/voice/<episode>/    ← 활성 (dev server 서빙)
sw/remotion/voice-archive/<episode>/   ← 비활성 (dev server 무관)

sw/remotion/public/covers/             ← 활성 covers
sw/remotion/covers-archive/            ← 비활성 covers
```

- **Load(올리기)**: archive → public 이동 (mv)
- **Unload(내리기)**: public → archive 이동 (mv)
- 파일시스템 직접 이동이므로 dev server 재시작 불필요, 즉시 반영

## API 엔드포인트

### 1. `GET /api/[series]/voice/storage`

에피소드별 파일 로드 상태 조회.

**응답:**
```json
{
  "episodes": [
    {
      "name": "elon-musk",
      "status": "loaded",
      "fileCount": 42,
      "sizeBytes": 38000000,
      "sizeLabel": "38 MB"
    },
    {
      "name": "jim-carrey",
      "status": "unloaded",
      "fileCount": 35,
      "sizeBytes": 28000000,
      "sizeLabel": "28 MB"
    },
    {
      "name": "abraham-lincoln",
      "status": "none",
      "fileCount": 0,
      "sizeBytes": 0,
      "sizeLabel": "0 MB"
    }
  ],
  "totalLoaded": { "count": 747, "sizeBytes": 521000000, "sizeLabel": "521 MB" },
  "totalArchived": { "count": 0, "sizeBytes": 0, "sizeLabel": "0 MB" }
}
```

상태:
- `loaded` — public/voice에 존재
- `unloaded` — archive에 존재
- `partial` — 양쪽 모두에 일부 존재
- `none` — 음성 파일 없음

### 2. `POST /api/[series]/voice/storage`

에피소드 파일 로드/언로드.

**요청:**
```json
{
  "action": "unload",
  "episodes": ["elon-musk", "alexander-the-great"]
}
```

또는:
```json
{
  "action": "load",
  "episodes": ["jim-carrey"]
}
```

**동작:**
- `unload`: `public/voice/<episode>/` → `voice-archive/<episode>/` (디렉토리 통째 mv)
- `load`: `voice-archive/<episode>/` → `public/voice/<episode>/` (디렉토리 통째 mv)
- archive 디렉토리 없으면 자동 생성
- 이미 해당 상태면 스킵

**응답:** 처리 결과 + 갱신된 상태 목록 (GET과 동일 형식)

## 구현 위치

### 서버

| 파일 | 작업 |
|------|------|
| `sw/remotion-bo/src/lib/server-utils.ts` | `getVoiceStorageStatus()`, `loadVoiceFiles()`, `unloadVoiceFiles()` 함수 추가 |
| `sw/remotion-bo/src/app/api/[series]/voice/storage/route.ts` | GET/POST 라우트 (신규) |

경로 상수:
```ts
const VOICE_DIR = path.join(REMOTION_ROOT, 'public', 'voice')
const VOICE_ARCHIVE = path.join(REMOTION_ROOT, 'voice-archive')
```

### 클라이언트 (UI)

시리즈 홈 (`/[series]/page.tsx`)에 **Storage 관리 섹션** 추가. 또는 별도 탭.

| 요소 | 설명 |
|------|------|
| 에피소드 목록 | 이름, 상태(loaded/unloaded/none), 파일 수, 용량 표시 |
| 체크박스 선택 | 복수 에피소드 선택 |
| Load / Unload 버튼 | 선택한 에피소드 일괄 처리 |
| 총 용량 표시 | 현재 loaded 합계 (목표: 200MB 이하 유지) |

## 주의사항

- `common/` 디렉토리(`public/voice/common/`)는 **절대 언로드하지 않는다** — 전체 에피소드 공유 음성.
- 언로드 시 해당 에피소드의 Remotion 프리뷰에서 오디오가 안 나온다. 이건 의도된 동작.
- `voice-archive/` 디렉토리는 `.gitignore`에 추가한다.
- covers 관리는 동일 패턴으로 별도 엔드포인트를 추가할 수 있으나, voice가 521MB로 압도적이므로 voice 우선 구현.

## .gitignore 추가

```
sw/remotion/voice-archive/
sw/remotion/covers-archive/
```
