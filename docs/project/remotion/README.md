# Remotion 영상 제작 가이드

Remotion(React 기반 영상 프레임워크)으로 제작하는 영상 시리즈.

## 시리즈

| 시리즈 | 문서 | 설명 |
|--------|------|------|
| 서재 탐방 | [book-recommend/](book-recommend/README.md) | 셀럽의 추천 도서 소개. 롱폼(16:9) + 쇼츠(9:16) |

---

## 공통 코드 구조

```
sw/remotion/public/
  episodes/
    pre-todo/                      ← 초안 풀 (flat JSON, 검수 전)
    todo/<person>/                 ← 검수 완료, voice 미생성
    live/<person>/                 ← 진행중 (voice 작업)
    done/<person>/                 ← 완료 (YouTube 업로드)
      <locale>.json                  에피소드 콘텐츠 (텍스트, 메타, 이미지)
      <locale>.timing.json           타이밍 데이터 (voiceTimings, duration) — 파이프라인 자동 생성
      voice/<locale>/<engine>/       생성된 음성 파일
      images/                        시네마틱 배경 + 쇼츠 이미지
      covers/                        책 표지 이미지
  common/                          ← 공유 리소스 (음성, 이미지, SFX)
  covers/                          ← 초안용 표지 (pre-todo 참조)
  scripts/
    voice/                         ← TTS 생성, WhisperX, 분석
    srt/                           ← 자막 생성·검증·적용
    image/                         ← 이미지 생성·등록·검색
    render/                        ← 렌더 스크립트
    youtube/                       ← YouTube 업로드·편성
    dev.mjs                        ← 개발 서버 + 정적 파일 서버
  src/
    Root.tsx                       ← Remotion 등록 (Composition)
    compositions/
      BookRecommend/               ← 서재 탐방
      Thumbnail/                   ← 썸네일
```

## 명령어

### 개발 서버

```bash
pnpm dev:remotion     # Remotion Studio (:3002) + serve (:8001)
pnpm dev:remotion-bo  # 영상 관리 대시보드 (:3003)
```

### 음성 파이프라인 (4단계, 순서 엄수)

텍스트 변경 후 반드시 1~3단계를 모두 실행한다. 4단계는 3단계 이후 별도 실행.

```bash
cd sw/remotion
pnpm voice -- --episode <name> --update-json           # 1. TTS 생성 (변경분만 자동 감지)
python scripts/voice/whisper-words.py --episode <name>        # 2. WhisperX 단어 타임스탬프 추출
pnpm analyze -- --episode <name> --update-json          # 3. voiceTimings + duration 동기화
# 4. 자막 의미 단위 분할 — Claude Code에 "sub 채워줘" 요청 (LLM이 의미 단위로 분할)
pnpm sub:check -- --episode <name>                     # 4a. 누락·깨진 sub 확인
pnpm sub:apply -- --episode <name> --input subs.json   # 4b. sub 매핑 일괄 적용 (선택)
```

#### 범위 필터: `--shorts` / `--long`

1~3단계 모두 `--shorts` 또는 `--long` 플래그로 범위를 제한할 수 있다.
쇼츠만 작업할 때 롱폼 voiceTimings/sub를 건드리지 않는다.

```bash
pnpm voice -- --episode <name> --shorts --force --update-json   # 쇼츠만 TTS
python scripts/voice/whisper-words.py --episode <name> --shorts        # 쇼츠만 WhisperX
pnpm analyze -- --episode <name> --shorts --update-json          # 쇼츠만 analyze
```

- 3단계 실행 시 sub 누락 세그먼트가 자동 경고된다.
- 3단계(analyze)는 텍스트가 동일한 세그먼트의 기존 sub를 자동 보존한다.
- 불변식: `sub.join(' ') === text` (공백 조인)
- 4단계 상세 규칙: [voice/tts.md — 4단계: sub 생성](book-recommend/voice/tts.md#4단계-자막-의미-단위-분할-sub-필드)

#### 개별 세그먼트 지정: `--only`

1~3단계 모두 `--only`로 특정 세그먼트만 처리할 수 있다. 나머지 파일은 건드리지 않는다.
TTS(1단계)는 `--only` 지정 시 매니페스트 체크를 건너뛰어 자동으로 재생성된다.

```bash
pnpm voice -- --episode <name> --only S07-book-quote-2 --update-json
python scripts/voice/whisper-words.py --episode <name> --only S07-book-quote-2
pnpm analyze -- --episode <name> --only S07-book-quote-2 --update-json
```

- 복수 지정: `--only S07-book-quote-2,S08-book-context-3`
- 롱폼도 동일: `--only D05b-summary`
- `--shorts`/`--long`과 동시 사용하지 않는다 (독립 필터)

#### TTS 오버라이드와 파이프라인

`tts.replace` 치환맵이 있으면 WhisperX와 analyze가 자동으로 치환된 텍스트를 기준으로 매핑한다.
오버라이드는 **발음 변환 전용** (`334년` → `삼백삼십사 년`). 내용 변경은 `segments[].text`를 직접 수정한다.
TTS 오버라이드 구조 상세: [voice/tts.md — TTS 오버라이드 구조](book-recommend/voice/tts.md#tts-오버라이드-구조)

#### 잔존 WAV 감지

세그먼트 ID 변경 후 옛 WAV가 남으면 whisper-words.py가 자동 경고하고 제외한다.

### bash 별칭

```
1/2/3/4/5     → dev 서버 실행 (web/bo/remotion/remotion-bo/lab)
rv/rvl        → voice/voice:list
```
