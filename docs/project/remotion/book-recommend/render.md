# 렌더 출력

## 명령어

```bash
pnpm render:all                                    # 전체 에피소드
pnpm render:all -- --episode jensen-huang           # 특정 에피소드
pnpm render:all -- --episode jensen-huang --only longform   # 롱폼만
pnpm render:all -- --episode jensen-huang --only shorts     # 쇼츠만
```

## 출력 구조

```
out/{Label}/
  KO/
    L-VID.mp4          ← 롱폼 영상
    L-VID.srt          ← 롱폼 자막
    L-THUMB.png        ← 롱폼 썸네일 (1280×720)
    S-VID.mp4          ← 쇼츠 영상
    S-VID.srt          ← 쇼츠 자막
  EN/
    L-VID.mp4
    L-VID.srt
    L-THUMB.png
    S-VID.mp4
    S-VID.srt
```

- `{Label}`: PascalCase 인물명 (예: `JensenHuang`, `AlexanderTheGreat`)
- 한영이 `KO/`, `EN/` 서브폴더로 분리
- 한영 모두 있으면 에피소드당 **영상 4 + SRT 4 + 썸네일 4 = 12종** 출력

### 예시

```
out/JensenHuang/
  KO/
    L-VID.mp4       85MB
    L-VID.srt
    L-THUMB.png     599KB
    S-VID.mp4       7.9MB
    S-VID.srt
  EN/
    L-VID.mp4       93MB
    L-VID.srt
    L-THUMB.png     592KB
    S-VID.mp4       8.3MB
    S-VID.srt
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
| 롱폼 영상 | `{Label}-{Lang}-L-VID` | 1920×1080 | |
| 롱폼 썸네일 | `{Label}-{Lang}-L-THUMB` | 1280×720 | 1프레임 |
| 쇼츠 영상 | `{Label}-{Lang}-S-VID` | 1080×1920 | |
| 쇼츠 썸네일 | `{Label}-{Lang}-S-THUMB` | 1080×1920 | 1프레임 |

EN 에피소드(`-en` 접미사)는 baseName에서 `-en`을 제거한 후 PascalCase로 변환하여 KO와 같은 Label을 공유한다.

## YouTube 업로드 연동

### 메타 오버라이드 (선택)

```
out/{Label}/youtube-meta.json
```

UI에서 제목/설명을 편집하면 이 파일에 저장된다. 업로드 시 이 파일이 있으면 자동생성 값 대신 적용.

```json
{
  "ko-longform": { "title": "...", "description": "..." },
  "ko-shorts":   { "title": "...", "description": "..." },
  "en-longform": { "title": "...", "description": "..." },
  "en-shorts":   { "title": "...", "description": "..." }
}
```

### 렌더 → 업로드 흐름

```
render-all.ts (에피소드 slug)
  → toCompId("jensen-huang")    = { label: "JensenHuang", lang: "KO" }
  → toCompId("jensen-huang-en") = { label: "JensenHuang", lang: "EN" }
  → out/JensenHuang/KO/L-VID.mp4, out/JensenHuang/EN/L-VID.mp4

youtube-upload.ts (에피소드 slug)
  → toCompLabel("jensen-huang") = "JensenHuang"
  → out/JensenHuang/KO/, out/JensenHuang/EN/ 에서 4종 스캔
  → youtube-meta.json 있으면 override 적용
  → Google YouTube API 업로드
```
