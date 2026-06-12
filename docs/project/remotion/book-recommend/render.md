# 렌더 출력

## 명령어

```bash
pnpm render:all                                              # 전체 에피소드
pnpm render:all -- --episode jensen-huang                    # 특정 에피소드
pnpm render:all -- --episode jensen-huang --only longform    # 롱폼만
pnpm render:all -- --episode jensen-huang --only shorts      # 쇼츠만
pnpm render:all -- --episode jensen-huang --only solos       # 1권 모드(SOLO)만
pnpm render:all -- --episode elon-musk --only solos --book-index 0   # 특정 책의 솔로만
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

BookCardVisual의 배경 이미지는 `brightness(0.2) saturate(0.7)` 필터로 매우 어둡게 처리된다. JPEG 중간 프레임을 사용하면 어두운 영역의 색상 정보가 손실되어 렌더 결과가 스튜디오 프리뷰보다 훨씬 어둡게 나온다. PNG 무손실 프레임으로 이 문제를 해결한다.

```json
// package.json — 기본 render 스크립트
"render": "remotion render --image-format=png --gl=angle"
```

## 컴포지션 ID 규칙

Root.tsx에서 등록하는 컴포지션 ID:

| 타입 | ID 패턴 | 해상도 | 비고 |
|------|---------|--------|------|
| 롱폼 영상 | `{Label}-{Lang}-LH-VID` | 1920×1080 | |
| 롱폼 썸네일 | `{Label}-{Lang}-LH-THUMB` | 1280×720 | 1프레임 |
| 쇼츠 영상 | `{Label}-{Lang}-S{N}-VID` | 1080×1920 | N=1-based |
| 쇼츠 썸네일 | `{Label}-{Lang}-S{N}-THUMB` | 1080×1920 | 1프레임 |
| 1권 모드 영상 | `{Label}-{Lang}-B{NN}-VID` | 1920×1080 | NN=책번호 2자리 (1-based) |

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
  → out/JensenHuang/KO/LH-VID.mp4, out/JensenHuang/EN/LH-VID.mp4

youtube-upload.ts (에피소드 slug)
  → toCompLabel("jensen-huang") = "JensenHuang"
  → out/JensenHuang/KO/, out/JensenHuang/EN/ 에서 변형 스캔
    (롱폼 LH-VID + 쇼츠 S{N}-VID + 솔로 B{NN}-VID)
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

`patch-meta`·`db-sync`는 현재 솔로 미지원 — 음성 파이프라인 통합 이후 정비.
