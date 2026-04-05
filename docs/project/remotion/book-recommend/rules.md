# 불변 규칙

코드 수정 전 반드시 확인.

---

## 윤리/표현

- **인용부호("\u201C\u201D)는 검증된 실제 발언에만 사용.** AI 작성 텍스트(philosophy, philosophySnippet)에 인용부호 금지.
- **context/contextAfter 본문 내 간접 인용에도 인용부호 필수.** `~라고 썼습니다`, `~를 인용하여`, `~라는 구절` 등 타인의 발언·구절을 옮길 때 해당 부분을 `\u201C...\u201D`로 감싼다. 예: `\u201C오 키타이론이여\u201D라는 비탄의 외침`.
- **셀럽 음성(ElevenLabs)은 검증된 직접 인용문에만 사용.** 감상철학 등 AI 작성 텍스트는 나레이터 음성으로 읽는다.
- **ElevenLabs 호출은 백오피스(`VoiceGenWorkspace`)에서 수동 제어.** generate-voice.ts에서 자동 호출하지 않는다.

## 표지 이미지

- **한영 에피소드는 양쪽 locale 모두 유효한 `thumbnail_url`이 있는 콘텐츠만 포함.** 한쪽이라도 없으면 해당 콘텐츠 제외.
- **외부 URL 금지.** 렌더 시 매 프레임 HTTP 요청이 발생하여 극심한 속도 저하 + 타임아웃 에러. `public/covers/`에 로컬 다운로드 후 `covers/cover-NNN.jpg` 경로로 교체.
- DB `content_locales` 테이블이 표지 URL의 단일원천. 에피소드 JSON 생성 시 반드시 DB 최신 URL을 조회.

## 데이터 흐름

- duration 값은 `<locale>.timing.json`이 SSoT. 폴백 상수(`CELEB_INTRO_FALLBACK`, `BRIDGE_FALLBACK`, `OUTRO_FALLBACK`)는 timing.ts에서 관리. 매직넘버 사용 금지.
- `toFrames()` = 배치용(+15 버퍼), `toAudioFrames()` = 자막/하이라이트용(버퍼 없음)
- 라벨 duration: `narrator.labelSummaryDuration`, `narrator.labelContextDuration`
- 컴포넌트는 `episodeName` prop으로 경로 분기. 모듈 레벨에서 EPISODE_NAME 직접 사용 금지.
- 이미지 전환은 시간이 아닌 **대사(텍스트 앵커)**에 묶는다. 음성 재생성 시 `text` 앵커가 자동으로 voiceTimings에서 재매핑된다. `images` 배열 상세: `images.md`
- **category 필드 규칙**: DB `contents.type`이 BOOK이 아닌 항목은 에피소드 JSON `books[]`에 `category` 필드 필수 (VIDEO, GAME, MUSIC). BOOK인 항목은 필드 생략 (기본값). 포스터 우상단 아이콘 뱃지 + 타이틀 카테고리 라벨은 BOOK 외 카테고리에만 표시된다.

## 롱폼 vs 쇼츠 차이

| 항목 | 롱폼 | 쇼츠 |
|------|------|------|
| 해상도 | 1920×1080 | 1080×1920 |
| 구조 | 섹션 순차 (Brand→Intro→Books→Recap→Outro) | 4비트 (훅→누구→책→펀치) |
| 인물 등장 | FeaturedQuote에서 아바타 등장 | 훅에 이름 포함 → Beat2에서 아바타 바로 등장 |
| 라벨 오디오 | "핵심 요약", "감상경위" | 없음 |
| 자막 | Subtitles 컴포넌트 | Sub 컴포넌트 (비트별 독립) |
| Safe Zone | 없음 | 상하 15% 비움 (플랫폼 UI 겹침) |

**롱폼 패턴을 쇼츠에 복사 금지.** 쇼츠 기획 SSoT: `shorts.md`

---

## 개발 주의사항

### 한글 경로 우회

Remotion `staticFile()`이 한글 경로에서 동작하지 않는다. 별도 정적 서버로 우회:

```bash
pnpm serve   # dev.mjs가 자동 실행. 포트는 REMOTION_SERVE_PORT 환경변수 (기본 8005)
```

`sf()` 헬퍼 (`utils.ts`)가 `STATIC_SERVER` 상수로 정적 서버 URL을 제공한다. 포트는 `REMOTION_SERVE_PORT` 환경변수 (기본 8001). **`style.css`의 `@font-face` URL만 하드코딩** — CSS에서 환경변수 사용 불가. 포트 변경 시 함께 수정할 것.

**캐시 버스터(`?v=Date.now()`) 사용 금지.** HMR마다 모듈이 재평가되어 모든 오디오 URL이 변경되면 브라우저 캐시가 무효화되고 오디오 스터터링이 발생한다. 대신 Remotion `prefetch()` API로 오디오를 blob-url 방식으로 미리 로드한다. 파일 변경 시에는 브라우저 하드 리프레시(Ctrl+Shift+R).

### 오디오 스터터링 방지

- `Date.now()` 등 비결정적 값을 URL에 넣지 않는다.
- 모든 오디오를 `prefetch(url, { method: 'blob-url', contentType: 'audio/wav' })`로 선로드.
- `useEffect` cleanup에서 `free()` 호출 필수.

### interpolate 함정

- `extrapolateRight: 'clamp'`는 마지막 output 값을 영원히 유지한다. 한 섹션 후 사라져야 하는 요소(opacity 등)는 반드시 output 배열 끝을 `0`으로 마감해야 한다.
- **`[start, start+N, start+dur-M, start+dur]` 패턴에서 `dur <= N+M`이면 비단조 에러 발생.** 반드시 `fadeInOut()` (`utils.ts`) 헬퍼를 사용한다. 이 헬퍼는 자동으로 fadeIn/fadeOut을 `dur/3`으로 축소하여 단조 증가를 보장한다.

### 쇼츠(BookRecommendShort) 주의사항

- **롱폼 패턴을 그대로 복사하지 않는다.** 쇼츠는 독립 포맷.
- **훅 텍스트에 인물 이름이 포함되면 Beat2에서 실루엣 reveal을 하지 않는다.** 이미 정체를 밝혔으므로 아바타를 바로 보여준다.

### 공통 유틸 (utils.ts)

- `STATIC_SERVER` / `sf()`: 정적 파일 서버 URL. 한글 경로 우회용. JS 파일에서 이 상수만 사용.
- `makeVf()`: 에피소드별 음성 경로 팩토리. 롱폼·쇼츠 공용. `loadVoiceSelect`를 인자로 받는다.
- `BrandLogo`: variant(`full`/`brand`/`watermark`), fontSize로 모든 로고 표시. 로고 변경 시 이 파일만 수정.
- `safeImg`: 빈 `thumbnail_url` 방어. 모든 `<Img>` 사용처에 적용.
- `fadeInOut`: 안전한 opacity 애니메이션. inputRange 단조 증가 보장.

### JSX 개행

- `{'\n'}`은 HTML에서 렌더링되지 않는다. 줄바꿈이 필요하면 `<br />` 또는 별도 `<div>`.

### Windows 호환

- `execFile('pnpm', ...)` → Windows에서 ENOENT. `pnpm.cmd` 사용 필수.

---

## 작업 전 체크리스트

- [ ] 이 변경이 롱폼/쇼츠/둘 다에 영향을 주는가?
- [ ] interpolate에 가변값이 들어가는가? → `fadeInOut()` 사용
- [ ] 새 `<Img>`를 추가하는가? → `safeImg()` 적용
- [ ] 이미지 전환을 추가하는가? → `images` 배열에 `text` 앵커로 정의 (시간 하드코딩 금지)
- [ ] 하드코딩 프레임 상수를 쓰는가? → timing.ts 상수 또는 JSON duration 사용. 매직넘버 금지
- [ ] 로고/브랜드 텍스트가 있는가? → `BrandLogo` 사용
- [ ] `EPISODE_NAME`을 직접 참조하는가? → `episodeName` prop 사용
- [ ] 인용부호를 쓰는가? → 검증된 실제 발언인지 확인
- [ ] ElevenLabs를 호출하는가? → 백오피스 수동 제어 원칙 확인
