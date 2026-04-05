---
name: remo-render-bookrecommend
description: BookRecommend 시리즈의 롱폼/쇼츠 영상을 한국어·영문으로 렌더링한다. /render <에피소드명> [옵션] 으로 실행.
---

# Remotion Render — BookRecommend 영상 렌더링

BookRecommend 시리즈의 롱폼(16:9) 및 쇼츠(9:16) MP4 + SRT를 렌더링한다.

## 호출 형식

```
/render <에피소드명> [옵션]
```

### 에피소드명 규칙

- 한국어 버전: `dario-amodei`, `jensen-huang` 등 (slug 그대로)
- 영문 버전: `dario-amodei-en` 처럼 `-en` 접미사 추가
- "영문", "EN", "en" 키워드가 있으면 `-en` 접미사를 자동 추가

### 옵션

| 옵션 | 설명 |
|------|------|
| (없음) | 롱폼 + 쇼츠 모두 렌더 |
| `--only longform` 또는 `롱폼` | 롱폼만 렌더 |
| `--only shorts` 또는 `쇼츠` | 쇼츠만 렌더 |

### 호출 예시

- `/render dario-amodei-en 쇼츠` → 다리오 아모데이 영문 쇼츠만
- `/render jensen-huang 롱폼` → 젠슨황 한국어 롱폼만
- `/render alexander-the-great` → 알렉산더 한국어 롱폼 + 쇼츠 모두
- `다리오 아모데이 영문 롱폼 렌더` → `/render dario-amodei-en --only longform`

## 실행 흐름

### Step 1: 에피소드 존재 확인

에피소드 JSON 파일이 존재하는지 확인한다:
```
sw/remotion/public/episodes/{done|live|todo}/<person>/<locale>.json
```

없으면 사용자에게 안내하고 중단한다.

### Step 2: 렌더 실행

작업 디렉토리: `sw/remotion`

```bash
cd sw/remotion
pnpm render:all -- --episode <에피소드명> [--only longform|shorts]
```

- 렌더는 시간이 오래 걸린다 (쇼츠 ~3분, 롱폼 ~15분)
- **timeout을 600000ms (10분)으로 설정**한다
- 롱폼은 프레임이 많으므로 (약 20,000+) 인내심 있게 대기한다

### Step 3: 출력 확인

렌더 완료 후 출력 파일 존재를 확인한다:

| 타입 | MP4 경로 | SRT 경로 |
|------|----------|----------|
| 롱폼 | `sw/remotion/out/{Label}/{Lang}/L-VID.mp4` | `sw/remotion/out/{Label}/{Lang}/L-VID.srt` |
| 롱폼 썸네일 | `sw/remotion/out/{Label}/{Lang}/L-THUMB.png` | — |
| 쇼츠 | `sw/remotion/out/{Label}/{Lang}/S-VID.mp4` | `sw/remotion/out/{Label}/{Lang}/S-VID.srt` |

- `{Label}`: PascalCase (예: `DarioAmodei`, `JensenHuang`, `AlexanderTheGreat`)
- `{Lang}`: `KO` 또는 `EN`

### Step 4: 결과 보고

```
**[렌더 완료]** <에피소드명> <타입>
- MP4: <경로> (<파일 크기>)
- SRT: <경로>
- 썸네일: <경로> (롱폼인 경우)
```

## Composition ID 규칙

render-all.ts가 자동으로 생성하지만, 참고용:

- 롱폼: `{Label}-{Lang}-L-VID` (예: `DarioAmodei-EN-L-VID`)
- 쇼츠: `{Label}-{Lang}-S-VID` (예: `DarioAmodei-EN-S-VID`)
- 롱폼 썸네일: `{Label}-{Lang}-L-THUMB`

## 주의사항

- 렌더 전 음성 파이프라인(voice → whisper → analyze)이 완료되어 있어야 한다
- voiceTimings가 없으면 렌더 시 타이밍 오류가 발생한다
- public 디렉토리가 크므로 (300MB+) 번들링에 시간이 걸린다
