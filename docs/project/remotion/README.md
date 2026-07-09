# Remotion 영상 제작 가이드

Remotion(React 기반 영상 프레임워크)으로 제작하는 영상 시리즈.

## 시리즈

| 시리즈 | 문서 | 설명 |
|--------|------|------|
| 서재 탐방 | [book-recommend/](book-recommend/README.md) | 셀럽의 추천 도서 소개. 롱폼(16:9) + 쇼츠(9:16) |
| 세력도 | [faction.md](faction.md) / [ELE 보이스 캐스팅](faction-voice-casting.md) | 인물 진영별 시네마틱 영상. 인물 대사 보이스 추천·메모·제외 운영 |
| 저승 술집 | [hell-bar/](hell-bar/README.md) | 삼국지 인물 페어 매치 토크쇼. 6~8분 |

## 인물 그룹 (시리즈 직교)

| 그룹 | 문서 | 코드 SSoT |
|------|------|-----------|
| 삼국지 | [three-kingdoms.md](three-kingdoms.md) | `packages/shared/src/lib/three-kingdoms.ts` |

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

### 음성 파이프라인

1단계(TTS)는 사용자 수동, 이후 **2~4단계(+3.5 조건부)는 `/voice-sync` 스킬 한 번 호출로 일괄 실행**된다. 사용자가 각 단계를 따로 기억할 필요 없음.

| 단계 | 스크립트 | 실행 | 역할 |
|------|----------|------|------|
| 1 | `2-synthesize.ts` → `2-synthesize/` 모듈 | `pnpm voice` (사용자 수동, 유료 API) | Gemini/ElevenLabs TTS → wav 생성 |
| 2 | `3-transcribe.py` | `/voice-sync` 내부 | WhisperX + diff-match-patch → `voice/{locale}/2-word-timings.json` |
| 3 | `4-align.ts` | `/voice-sync` 내부 | voiceTimings · duration · imageChangeAt 계산 |
| 3.5 | `4-align.ts (안전망 통합)` | `/voice-sync` 내부 (조건부) | 진단 — Whisper 오인식·duration 압축 탐지. 이슈 0건 시 스킵 |
| 4 | `5-chunk.ts` + 규칙 기반 분할 | `/voice-sync` 내부 | 자막 의미 단위 sub 분할 + 검증 |

**기본 흐름:**

```bash
# 1단계 (사용자 수동)
cd sw/remotion
pnpm voice:tts -- --episode <name> --long --normalize --update-json

# 2~4단계 (Claude Code에서 한 번에)
/voice-sync <name>
```

이 한 번의 스킬 호출 안에서 whisper → analyze → reconcile-check(조건부) → sub 생성 → sub:check 검증까지 자동 순차 실행된다. `/voice-sync` 스킬 상세는 `.claude/skills/remo-voice-sync/SKILL.md` 참조.

#### 0단계: Pre-flight (파이프라인 실행 전 필수)

**1단계(TTS) 실행 전에 반드시 수행한다.** 이 단계를 건너뛰면 숫자 타이밍 뭉개짐, voice-select 누락, duration 불일치가 파이프라인 완료 후에야 발견된다.

1. **텍스트 전문 읽기** — 대상 에피소드 JSON(롱폼 `ko.json` 또는 쇼츠 `shorts/ko-N.json`)의 모든 세그먼트 텍스트를 순서대로 읽는다.
2. **`tts.replace` 점검** — 텍스트에서 아라비아 숫자·한자·외국어 괄호를 찾아 `tts.replace`에 등록한다.
   - 숫자는 **단위 명사까지 한 덩어리**로 매핑 (예: `"133척의"` → `"백삼십삼 척의"`)
   - 고유어/한자어 판단은 단위와 문맥 기준 ([tts.md § 고유어 수사 vs 한자어 수사](book-recommend/voice/tts.md#고유어-수사-vs-한자어-수사) 참조)
   - 한자 괄호(`(母也天只)`)는 빈 문자열로 치환
   - 쉼이 필요한 곳은 `...`로 유도 (예: `"아니었습니다. 1 대"` → `"아니었습니다... 일 대"`)
3. **`voice-select.json` 점검** — ElevenLabs 세그먼트가 있으면 `voice/{locale}/voice-select.json`의 `slots`에 전부 등록되어 있는지 확인한다.
4. **imageChangeAt 텍스트 앵커 점검** — 숫자로 시작하는 앵커는 `tts.replace` 매핑 후에도 voiceTimings 매핑이 부정확할 수 있다. 파이프라인 완료 후 수동 보정이 필요할 수 있음을 인지한다.

#### 메인 트랙 단일성 원칙

- **TTS(1단계) 후 반드시 `/voice-sync`로 2~4단계 완주.** sub 없이 렌더·업로드 금지 — `splitSub()` 폴백은 고유명사·관형절을 파괴한다.
- `--only`로 부분 재생성했으면 `/voice-sync`도 동일 범위에서 호출한다 (스킬이 `--only` 전파).

> ⚠ **`pnpm voice:tts --update-json`은 duration만 갱신한다.** word-level voiceTimings는 3-transcribe + 4-align(= `/voice-sync` 내부)로만 업데이트된다. 플래그 이름에 속지 말 것.

```bash
cd sw/remotion
# 롱폼
pnpm voice:tts -- --episode <name> --long --normalize --update-json   # 1. TTS (사용자 수동)
# → Claude Code에서 /voice-sync <name>  (2~4단계 자동 일괄)

# 쇼츠
pnpm voice:tts -- --episode <name> --shorts 1 --normalize --update-json
# → /voice-sync <name> --shorts 1
```

#### 단일 타겟 스코프: `--long` / `--shorts <N>`

**`--long` 또는 `--shorts <N>` 중 정확히 하나**를 반드시 지정. 한 번의 명령은 하나의 대상(롱폼 전체 또는 쇼츠 1개)만 처리한다.

- `--long`: 본체 롱폼만. 쇼츠 파일은 건드리지 않음
- `--shorts <N>`: `shorts/{locale}-{N}.json` 1개만. `<N>`은 1-based 정수
- 둘 다 지정/둘 다 생략/존재하지 않는 인덱스 → 즉시 에러

쇼츠가 여러 개면 각각 1단계 TTS 실행 후 `/voice-sync <name> --shorts N` 개별 호출.

- `/voice-sync` 스킬은 3단계 sub 누락 경고가 0건이 될 때까지 4단계를 자동 완주
- 3단계(analyze)가 텍스트 동일 세그먼트의 기존 sub 자동 보존
- 불변식: `sub.join(' ') === text`
- 4단계 상세 규칙: [voice/tts.md — 4단계: sub 생성](book-recommend/voice/tts.md#4단계-자막-의미-단위-분할-sub-필드)

#### 개별 세그먼트 지정: `--only`

1단계와 `/voice-sync` 모두 `--only`로 특정 세그먼트만 처리 가능. `--long`/`--shorts <N>`와 함께 사용.

```bash
# 롱폼 특정 세그먼트
pnpm voice:tts -- --episode <name> --long --only D05b-summary --normalize --update-json
# → /voice-sync <name> --only D05b-summary  (동일 범위 전파)
```

- TTS(1단계)는 `--only` 지정 시 매니페스트 체크를 건너뛰어 자동 재생성
- `/voice-sync`는 해당 세그먼트만 2~4단계 재처리

- 복수 지정: `--only S07-book-quote-2,S08-book-context-3`

#### TTS 오버라이드와 파이프라인

`tts.replace` 치환맵이 있으면 WhisperX와 analyze가 자동으로 치환된 텍스트를 기준으로 매핑한다.
오버라이드는 **발음 변환 전용** (`334년` → `삼백삼십사 년`). 내용 변경은 `segments[].text`를 직접 수정한다.
TTS 오버라이드 구조 상세: [voice/tts.md — TTS 오버라이드 구조](book-recommend/voice/tts.md#tts-오버라이드-구조)

#### 잔존 WAV 감지

세그먼트 ID 변경 후 옛 WAV가 남으면 3-transcribe.py가 자동 경고하고 제외한다.

### bash 별칭

```
1/2/3/4/5     → dev 서버 실행 (web/bo/remotion/remotion-bo/lab)
rv/rvl        → voice/voice:list
```
