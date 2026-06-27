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

- 슬러그 그대로 사용: `dario-amodei`, `jensen-huang` 등
- 언어 분리는 `--lang` 옵션으로 처리한다 (`-en` 접미사 방식은 deprecated, 호환용으로만 유지)

### 옵션

| 옵션 | 설명 |
|------|------|
| (없음) | 한·영 × 롱폼·쇼츠 전부 렌더 |
| `--only longform` 또는 `롱폼` | 롱폼만 렌더 |
| `--only shorts` 또는 `쇼츠` | 쇼츠만 렌더 |
| `--lang ko` 또는 `한국어`/`한/KO` | 한국어 버전만 렌더 |
| `--lang en` 또는 `영문`/`영어`/`EN` | 영문 버전만 렌더 |

언어와 타입 옵션은 자유롭게 조합 가능하다.

### 호출 예시

- `/render alex-karp --lang ko --only shorts` → 알렉스 카프 한국어 쇼츠만
- `/render alex-karp 한국어 쇼츠` → 동일 (자연어 → 옵션 변환)
- `/render dario-amodei --lang en --only shorts` → 다리오 아모데이 영문 쇼츠만
- `/render jensen-huang --lang ko --only longform` → 젠슨황 한국어 롱폼만
- `/render alexander-the-great` → 알렉산더 한·영 × 롱폼·쇼츠 전부

### 자연어 → 옵션 매핑

사용자 입력을 다음과 같이 변환한다:

- "한국어", "한", "KO", "ko" → `--lang ko`
- "영문", "영어", "EN", "en" → `--lang en`
- "한/영", "한영", "전부", (언어 미지정) → `--lang` 생략 (양쪽 모두)
- "쇼츠" → `--only shorts`
- "롱폼" → `--only longform`

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
pnpm render:all -- --episode <에피소드명> [--lang ko|en] [--only longform|shorts]
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
