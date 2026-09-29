# 렌더 출력

> **최종 실측 체크: 26.07.16** — `sw/remotion/package.json` 스크립트, `scripts/render/render-all.ts`, `src/Root.tsx` 컴포지션 ID, `scripts/youtube/youtube-upload.ts`, `packages/shared/src/lib/youtube-meta.ts` 대조

## 명령어

```bash
pnpm render:all                                              # 전체 에피소드
pnpm render:all -- --episode jensen-huang                    # 특정 에피소드 (한·영 모두)
pnpm render:all -- --episode jensen-huang --lang ko          # 한국어만
pnpm render:all -- --episode jensen-huang --only longform    # 롱폼만
pnpm render:all -- --episode jensen-huang --only shorts      # 쇼츠만
pnpm render:all -- --episode jensen-huang --only solos       # 1권 모드(SOLO)만
pnpm render:all -- --episode elon-musk --only solos --book-index 0   # 특정 책의 솔로만
pnpm render:all -- --episode abraham-lincoln --only shorts --shorts-index 2            # 특정 슬롯 쇼츠만
pnpm render:all -- --episode abraham-lincoln --only shorts --shorts-index 2 --srt-only # 영상 없이 SRT만 재생성
```

## 출력 구조

```
out/{Label}/
  KO/
    LH-VID.mp4          ← 롱폼 영상
    LH-VID.srt          ← 롱폼 자막
    LH-THUMB.png        ← 롱폼 썸네일 (1280×720)
    S{N}-VID.mp4       ← 쇼츠 영상 (N=1,2,...)
    S{N}-VID.srt       ← 쇼츠 자막
    B{NN}-VID.mp4      ← 1권 모드 영상 (NN=책번호 2자리, 01,02,...)
    B{NN}-VID.srt      ← 1권 모드 자막 (음성 통합 후 생성, 현재 미구현)
  EN/
    LH-VID.mp4
    ...
    B{NN}-VID.mp4
```

- `{Label}`: PascalCase 인물명 (예: `JensenHuang`, `AlexanderTheGreat`)
- 한영이 `KO/`, `EN/` 서브폴더로 분리
- 1권 모드는 책별로 독립 영상 — 한 인물이 솔로 데이터를 가진 책 N개 = N편 출력

### 예시

```
out/JensenHuang/
  KO/
    LH-VID.mp4       85MB
    LH-VID.srt
    LH-THUMB.png     599KB
    S1-VID.mp4      7.9MB
    S1-VID.srt
  EN/
    LH-VID.mp4       93MB
    LH-VID.srt
    LH-THUMB.png     592KB
    S1-VID.mp4      8.3MB
    S1-VID.srt
```

```
out/ElonMusk/             ← 솔로 회차 보유 인물
  KO/
    LH-VID.mp4
    ...
    B01-VID.mp4     ← 1권 모드 회차 1 (은하수 안내서)
    B06-VID.mp4     ← 1권 모드 회차 6 (파운데이션)
```

## 렌더 옵션

| 항목 | 값 | 비고 |
|------|-----|------|
| 코덱 | H.264 | `package.json` `render` 스크립트 기본값 |
| 컨테이너 | MP4 | |
| 중간 프레임 | **PNG** (무손실) | JPEG 사용 시 어두운 배경 이미지 색상 손실 발생 |
| GL 백엔드 | angle | Windows 호환 |
| 동시성 | 75% | CPU 코어의 75% 사용 |
| 썸네일 | `remotion still` | frame 0 캡처, PNG 출력 |

### PNG 무손실이 필요한 이유

롱폼 배경 이미지(`legacy/BookCardVisualLegacy.tsx`)는 어둡게 눌러 처리된다. JPEG 중간 프레임을 사용하면 어두운 영역의 색상 정보가 손실되어 렌더 결과가 스튜디오 프리뷰보다 훨씬 어둡게 나온다. PNG 무손실 프레임으로 이 문제를 해결한다.

```json
// package.json — 기본 render 스크립트
"render": "remotion render --image-format=png --gl=angle"
```

## 컴포지션 ID 규칙

Root.tsx에서 등록하는 컴포지션 ID:

| 타입 | ID 패턴 | 해상도 | 비고 |
|------|---------|--------|------|
| 롱폼 영상 | `{Label}-{Lang}-L-VID` | 1920×1080 | **ID는 `L-VID`, 출력 파일명만 `LH-VID.mp4`** |
| 롱폼 썸네일 | `{Label}-{Lang}-LH-THUMB` | 1280×720 | 1프레임 |
| 쇼츠 영상 | `{Label}-{Lang}-S{slot}-VID` | 1080×1920 | slot = 쇼츠 고정 출력 번호 (아래 참조) |
| 1권 모드 영상 | `{Label}-{Lang}-B{NN}-VID` | 1920×1080 | NN=책번호 2자리 (1-based) |

- 롱폼 영상 ID와 출력 파일명이 어긋난다. 컴포지션은 `...-L-VID`인데 mp4는 `LH-VID.mp4`로 떨어진다. Studio에서 컴포지션을 찾을 때 `LH-VID`로 검색하면 썸네일만 나온다.
- **쇼츠 썸네일 컴포지션은 없다.** 쇼츠는 영상만 출고한다.
- **파트 접미사**: 한 인물이 2편 이상으로 나뉘면 Lang 뒤에 `-P{N}`이 붙는다 (1편은 접미사 없음). 예: `AbrahamLincoln-KO-P2-L-VID`.

`slot`은 각 `shorts.{locale}.json`에 박힌 고정 번호다. 없으면 `max+폴더순`으로 부여되며, slot이 하나도 없는 에피소드만 폴더순 1..N으로 폴백한다. 배열 인덱스와 다를 수 있으므로 렌더 전 슬롯 매핑을 확인한다.

EN 에피소드(`-en` 접미사)는 baseName에서 `-en`을 제거한 후 PascalCase로 변환하여 KO와 같은 Label을 공유한다.

## YouTube 업로드 연동

### 메타 오버라이드 (선택)

```
out/{Label}/youtube-meta.json
```

UI에서 제목/설명을 편집하면 이 파일에 저장된다. 업로드 시 이 파일이 있으면 자동생성 값 대신 적용.

```json
{
  "ko-longform":  { "title": "...", "description": "..." },
  "ko-shorts-1":  { "title": "...", "description": "..." },
  "ko-solo-1":    { "title": "...", "description": "..." },
  "en-longform":  { "title": "...", "description": "..." },
  "en-shorts-1":  { "title": "...", "description": "..." },
  "en-solo-1":    { "title": "...", "description": "..." }
}
```

variant 키 규약:

| 변형 | 키 |
|------|----|
| 롱폼 | `{lang}-longform` |
| 쇼츠 | `{lang}-shorts-{N}` (N = 쇼츠 인덱스, 1-based) |
| 1권 모드 | `{lang}-solo-{N}` (N = 책 번호, 1-based) |

### 렌더 → 업로드 흐름

```
render-all.ts (에피소드 slug)
  → toCompId("jensen-huang")    = { label: "JensenHuang", lang: "KO" }
  → toCompId("jensen-huang-en") = { label: "JensenHuang", lang: "EN" }
  → 컴포지션 JensenHuang-KO-L-VID → out/JensenHuang/KO/LH-VID.mp4
  → 컴포지션 JensenHuang-EN-L-VID → out/JensenHuang/EN/LH-VID.mp4

youtube-upload.ts (에피소드 slug)
  → out/JensenHuang/KO/, out/JensenHuang/EN/ 에서 변형 스캔
    (롱폼 LH-VID + 쇼츠 S{slot}-VID + 솔로 B{NN}-VID)
  → youtube-meta.json 있으면 override 적용
  → Google YouTube API 업로드
```

자동 메타 생성기는 `packages/shared/src/lib/youtube-meta.ts`:

- `buildTitle` / `buildDescription` — 롱폼 + 쇼츠
- `buildSoloTitle` / `buildSoloDescription` — 1권 모드 전용 (한 권 라벨 + 짧은 인트로 + 해시태그)
- `buildTags` — 변형 공통 (현재 솔로 전용 태그 분기 없음, 향후 검토)

## CLI 업로드

```bash
# 솔로 한 권 업로드
pnpm youtube:upload -- --episode elon-musk --type solo --book-index 0

# 솔로 전체 (책별 차례로)
pnpm youtube:upload -- --episode elon-musk --type solo

# 드라이런
pnpm youtube:upload -- --episode elon-musk --type solo --book-index 0 --dry
```

`patch-meta`(`pnpm youtube:patch-meta`)는 현재 솔로 미지원 — 음성 파이프라인 통합 이후 정비.
