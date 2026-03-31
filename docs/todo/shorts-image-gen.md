# 영상 이미지 생성 지시서

## 공통 규칙

- 다른 경로에 생성 후 옮기는 작업은 하지 않는다
- 스타일: 시네마틱 디지털 페인팅, Neo-Pantheon (고전 신전 테마의 다크 UI)
- 이미지 안에 텍스트/글자/문자 절대 금지 (no text, no letters, no words, no writing)

---

## A. 숏츠 배경 이미지

### 생성 도구

Gemini (Google AI Studio) — 정사각형만 지원되지만 코드에서 `objectFit: cover`로 잘리므로 무관.

### 저장 경로

```
sw/remotion/public/images/shorts/{에피소드명}.png
```

### 규격

- 포맷: PNG
- 톤: **반드시 어두운 톤**. 밝은 하늘/밝은 배경 금지
- 이유: 코드에서 `brightness(0.35) saturate(0.6)` 필터가 걸림. 원본이 밝으면 필터 후 밋밋해진다

---

## B. 롱폼 시네마틱 이미지

### 저장 경로

```
sw/remotion/public/episodes/{status}/{에피소드명}/images/{책인덱스}-{1|2}.jpg
```

- `1` = summary — 책의 핵심 장면/세계관
- `2` = context — 셀럽이 이 책을 만난 맥락/영향

예시: `sw/remotion/public/episodes/live/elon-musk/images/1-1.jpg`

### 규격

- 포맷: JPG
- **비율: 16:9 가로형 (절대 정사각형 금지)**
- 해상도: 1920x1080 이상
- 톤: 어두운 기반, 드라마틱 라이팅
- 공통 스타일 프리픽스: `cinematic digital painting, dramatic lighting, rich tones, concept art, no text, no letters, no words, no writing, 16:9 widescreen`

### 이미지 유형별 규칙

#### `{idx}-1.jpg` (summary)

책의 핵심 장면/세계관을 시네마틱하게 표현한다.

- 인물은 실루엣으로만. 얼굴 식별 불가해야 한다 (no visible faces)
- 책의 줄거리나 핵심 테마를 시각화
- 감정과 분위기 중심

#### `{idx}-2.jpg` (context)

셀럽이 이 책을 만난 맥락/영향을 표현한다.

- 풍경, 오브젝트 중심. 사람은 넣지 않거나 실루엣으로만
- 셀럽이 책을 읽은 장소, 시대적 배경, 책이 미친 영향을 시각화

### 코드 등록

이미지를 생성한 에피소드는 `BookCardVisual.tsx`의 `CINEMATIC_EPISODES` Set에 추가해야 화면에 반영된다.

```typescript
// sw/remotion/src/compositions/BookRecommend/sections/BookCardVisual.tsx
export const CINEMATIC_EPISODES = new Set(['elon-musk', '추가할-에피소드명'])
```

### 프롬프트

각 에피소드 디렉토리의 `prompts.json`에 책별 s/c 프롬프트가 정의되어 있다. 이미지 생성 시 해당 파일의 prompt 필드를 사용한다.

```
sw/remotion/public/images/episodes/{에피소드명}/prompts.json
```

### 현재 상태

| 에피소드 | 책 수 | 이미지 | 프롬프트 | 비고 |
|---------|------|--------|---------|------|
| elon-musk | 10 | 20장 | 완료 | 이미지 생성 완료 |
| alexander-the-great | 8 | 16장 | 완료 | |
| yi-sun-sin | 5 | 10장 | 완료 | |
| napoleon-bonaparte | 7 | 14장 | 완료 | |
| marcus-aurelius | 9 | 18장 | 완료 | |
| leonardo-da-vinci | 10 | 20장 | 완료 | |
| galileo-galilei | 6 | 12장 | 완료 | |
| nikola-tesla | 4 | 8장 | 완료 | |
| albert-einstein | 8 | 16장 | 완료 | |
| dario-amodei | 4 | 8장 | 완료 | |
| jensen-huang | 7 | 14장 | 완료 | |
| mark-zuckerberg | 9 | 18장 | 완료 | |
| steve-jobs | 9 | 18장 | 완료 | |
| warren-buffett | 8 | 16장 | 완료 | |
| abraham-lincoln | 10 | 20장 | 완료 | |
| jim-carrey | 6 | 12장 | 완료 | |

이미지 생성 후 `CINEMATIC_EPISODES` Set에 에피소드명을 추가해야 화면에 반영된다.
