# 음성 파이프라인 — 5단계 통합 규격

## 철학

각 단계는 **하나의 변환** 책임 + **자체 검증·자동 수정** + **트랜잭션 보장**.
단계가 분리된 진단/수정 도구는 폐기하고, 한 명령에 통합한다(`--dry-run`으로 검출만 가능).

```
─ Synthesis ─
1. pronounce    본문 모호표기 ↔ 발화규칙 결정·등록
2. tts          음성 합성 (유료)
─ Alignment ─
3. transcribe   음성에서 단어별 시간 추출
4. align        세그먼트 시간 매핑 + 자동 안전망
─ Composition ─
5. chunk        의미 단위(sub) 분할 + 적용 + 검증
```

## 사용자 흐름

본문 변경 후:

```bash
# 1: 본문 발화 규칙 점검 (dry-run으로 누락 검출)
pnpm voice:pronounce -- --episode <ep>
# 누락 있으면 LLM이 문맥을 보고 읽기를 정해 --apply로 ko.json에 등록

# 2: 음성 합성 (유료, 사용자 수동)
pnpm voice:tts -- --episode <ep> --long --normalize --update-json

# 3-5: 일괄 자동
/voice-sync <ep>
```

각 명령 단독 호출도 가능하지만 일반적으로 `/voice-sync`만 알면 된다.

## 단계 명세

### 1. pronounce — 발화 규칙 결정

**문제**: 본문에 "1865년", "10권의" 같은 숫자+단위가 있으면 합성기가 어떻게 읽을지 명시해야 한다 (한자어/고유어 수사 차이).

**입력**: ko.json
**출력 (apply 모드)**: ko.json의 `tts.replace` 자동 등록
**출력 (dry-run)**: 누락 토큰 리스트

dry-run 결과를 LLM이 받아 문맥을 보고 발화를 정한 뒤 `--apply`로 등록한다. 전용 스킬은 없다.

### 2. tts — 음성 합성

**입력**: ko.json (tts.replace 적용된 발화 텍스트)
**출력**: WAV 파일들
**비용**: 유료 API. 사용자 명시적 승인 필요(`feedback_no_auto_generation`).

### 3. transcribe — 단어 시간 추출

**입력**: WAV
**출력**: `voice/{locale}/2-word-timings.json`
**도구**: WhisperX + diff-match-patch
- WhisperX로 순수 전사 + 단어 timing
- 전사 텍스트와 원문을 문자 단위 대조
- EQUAL 구간 기준 timing을 원문 단어에 이식

장점: WhisperX가 "인리아스로"로 잘못 인식해도 timing은 정확 → diff가 "일리아스 로"에 매핑.

### 4. align — 세그먼트 시간 + 자동 안전망

**입력**: word-timings + ko.json
**출력**: `ko.timing.json`의 voiceTimings + duration
**자체 검증·복구 (안전망)**:
- 음수 duration (`end < start`) → 다음 세그먼트 start 직전까지 자동 확장
- 극단 찌부 (음절수 × 130ms 기준 50% 미만 + 5자 이상) → 음절×130ms로 확장 (overflow 방지)

**의도적 한계**:
- WAV 파형 직접 검출은 안 함 (안전망만)
- 미세 어긋남(±0.5초)은 사용자가 UI에서 손봄
- "확신 있는 명백한 오류"만 건드림

### 5. chunk — 의미 단위 분할

**입력**: ko.timing.json + LLM이 만든 subs.json
**출력**: voiceTimings의 각 세그먼트에 `sub` 배열 박힘 + subTimings 자동 계산은 4-align 재실행이 담당
**자체 검증 (트랜잭션)**:
- `sub.join(' ') === text` 불변식 일괄 검증
- 하나라도 실패 → abort, 디스크 미수정
- 전부 통과 → 일괄 커밋

**분할 규칙** ([`voice-02-tts.md`](voice-02-tts.md) 「5단계: 자막 의미 단위 분할」 참조):
- 절 경계 (연결어미 뒤)
- 주어/목적어 뒤 (서술어까지 10자 이내면 합침)
- 수식절+피수식어 한 덩어리
- 금기: 글자수 N등분, 고유명사 파괴, 지시사+체언 분리, 보조용언 분리

### 통합 원칙

| 원칙 | 적용 |
|------|------|
| 한 단계 = 한 책임 | 변환 1개만 담당 |
| 자체 검증·자동 수정 | 별도 check 명령 없음. dry-run 옵션으로 검출만 가능 |
| 트랜잭션 | 검증 실패 시 디스크 미수정 |
| 통합 명령 | `voice:*` 네임스페이스, 5개 명령으로 충분 |

## 명령 매핑

단계별 명령·스크립트 파일은 전 시리즈 공통 [음성 파이프라인 배선](../../../production/prod-03-voice-pipeline.md) 「명령 인덱스」가 쥔다. 옛 이름 `voice`·`analyze`·`sub:apply`·`sub:check`·`reconcile:check`는 alias로 남아 있다.

## 스킬

- **`/voice-sync <ep>`** — 3·4·5 일괄 자동(`.agents/skills/remo-voice-sync/`). 1단계와 5단계 단독 실행은 전용 스킬 없이 명령으로 한다.

## UI 보조 — VoicePipelineStatus 패널

web-bo `/book-recommend/<인물>/scenario` 페이지 상단 고정. 5단계의 위험지역을 한눈에:

- **Synthesis**: tts.replace 누락 토큰
- **Alignment**: 안전망 잔존 이상 (음수·찌부)
- **Composition**: sub 미분할 긴 문장 (30자↑) + 불변식 위반

각 항목 클릭 → 해당 세그먼트 모달(VoiceTimingEditor) 직링크. 사용자가 "위험지역만" 처리하면 그 외 문제 발생 가능성 최소화.

## Typewriter (영상 하이라이트 UI 측)

| 상태 | opacity | 색상 |
|------|---------|------|
| 읽을 단어 | 0.15 | 기본색 |
| 읽는 단어 | 0.25→1.0 (스윕) | 기본색 → 하이라이트색 (`color-mix`) |
| 읽은 단어 | 0.7 | 하이라이트색 15% 블렌딩 |

상수 (FPS=60):
- BOOST=4f (67ms 앞당김)
- FADE_IN=12f (200ms)
- FADE_OUT=15f (250ms)

## 폐기 이력

- **reconcile-check / reconcile-apply 분리**: 폐기. 4-align 안전망에 통합.
- **sub-apply / sub-check 분리**: 폐기. 5-chunk에 트랜잭션 통합.
- **wav2vec2 forced alignment**, **WAV silence 분할**: 폐기. 한국어·숫자 고밀도 에피소드에서 실패 이력. (`feedback_voice_alignment_dead_ends`)
