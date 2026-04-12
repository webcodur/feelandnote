# 단어 단위 voiceTimings 파이프라인

## 개요

WhisperX 전사 + diff-match-patch 매핑으로 **단어별** 타임스탬프를 추출하여 voiceTimings를 생성하고, 기계적 매핑이 해결하지 못하는 잔여 오류를 LLM 보정으로 재정비한다.

## 파이프라인

1단계(TTS)만 사용자 수동, 이후 2~4단계(+3.5 조건부)는 `/voice-sync` 스킬 한 번 호출로 일괄 실행.

```bash
# 1단계만 사용자 수동 (유료 API)
pnpm voice -- --episode <name> --long --normalize --update-json
# 또는 --shorts <N>

# Claude Code에서 2~4단계 일괄
/voice-sync <name>             # 롱폼
/voice-sync <name> --shorts 1  # 쇼츠
```

이 한 번의 스킬 호출 안에서:
1. `python scripts/voice/2-whisper.py` — WhisperX + diff-match-patch
2. `pnpm analyze --update-json` — voiceTimings/duration/imageChangeAt
3. `pnpm reconcile:check` — 진단 (이슈 0건 시 스킵)
4. LLM sub 의미 단위 분할 → `ko.timing.json`에 직접 기록 → `analyze` 재실행(subTimings 자동 계산) → `sub:check` 검증

자동 순차 실행된다.

4단계 상세: [voice/tts.md — 4단계](../project/remotion/book-recommend/voice/tts.md#4단계-자막-의미-단위-분할-sub-필드)
스킬 상세: `.claude/skills/remo-voice-sync/SKILL.md`

## 핵심 로직

### 2-whisper.py (WhisperX + diff-match-patch)

1. WhisperX로 오디오를 **순수 전사** → 단어별 타임스탬프 추출
2. 전사 텍스트와 원문을 **diff-match-patch**로 문자 단위 대조
3. EQUAL 구간을 기준으로 WhisperX 타임스탬프를 원문 단어에 이식
4. 매칭 실패 단어는 이전/다음에서 균등 보간

장점:
- WhisperX가 "인리아스로"로 잘못 인식해도 **타이밍은 정확** → diff가 "일리아스 로"에 매핑
- 한영 혼용("OpenAI", "Claude") 타겟도 타임스탬프 존재 (Whisper가 음성을 인식하므로)
- 원문 강제 정렬(forced alignment)의 영어 단어 누락 문제 없음

### 3-timings.ts — mergeIntoPhrases()

단어 세그먼트를 **구절 단위**로 병합한다. 분절 기준은 **구두점(`, . ! ?`)만** 사용한다.

- 호흡 무음, 단어 수 제한 등 오디오 기반 분절은 하지 않는다
- 구두점 사이의 의미 단위 분할은 4단계 LLM sub이 전담

### 보정 — 3.5단계 (조건부, `/voice-sync` 내부)

`pnpm reconcile:check`가 다음을 탐지:

- **Whisper literal digit 재구성** — "천오백칠십육 년" 발화를 literal `"1576년"` 토큰으로 받아쓰고 140ms 시간창에 찌부되는 현상
- **Whisper 고유명사 오인식** — "시경→식영", "갑오년→가보년", "계사년→개사년" 등이 seg.text에 STT 원문으로 남는 현상
- **한자 괄호 스트립으로 인한 앵커 `indexOf` 실패**

**근본 해결**: `2-whisper.py`가 신 스키마(`contextMain`, `quotePairs[]`)를 이해하도록 수정하여 diff-match-patch 매핑이 **모든 세그먼트에 제대로 적용**되면 대부분 자동 교정된다 (STT "가보년" → 원고 "갑오년" 치환). 이순신 세션(2026-04-11)에서 이 버그 고친 뒤 reconcile 이슈 0건으로 떨어짐.

`reconcile:check` 이슈 0건이면 건너뛴다. 남은 이슈(content-audio mismatch 등)는 `/voice-sync` 스킬이 보고만 하고 수동 판단 요청.

폐기된 접근: wav2vec2 forced alignment(원고 타겟), WAV silence 분할. 둘 다 한국어·숫자 고밀도 에피소드에서 실패 이력. 상세는 `feedback_voice_alignment_dead_ends` 메모리.

### 의미 단위 분할 (sub) — 4단계

3.5단계까지 정돈된 문장 세그먼트에 LLM이 `sub` 필드를 추가한다.
`expandSubTimings()`가 글자수 비례로 타이밍을 자동 분배.

### Typewriter.tsx (하이라이트 UI)

| 상태 | opacity | 색상 |
|------|---------|------|
| 읽을 단어 | 0.2 | 기본색 |
| 읽는 단어 | 0.25→1.0 (스윕) | 기본색→하이라이트색 (`color-mix` 블렌딩) |
| 읽은 단어 | 0.85 | 하이라이트색 25% 블렌딩 |

- BOOST=4f (67ms 앞당김), FADE_IN=12f (200ms), FADE_OUT=15f (250ms)
