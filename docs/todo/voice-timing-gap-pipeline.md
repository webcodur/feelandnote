# 단어 단위 voiceTimings 파이프라인

## 개요

WhisperX 전사 + diff-match-patch 매핑으로 **단어별** 타임스탬프를 추출하여 voiceTimings를 생성한다.

## 파이프라인

```bash
pnpm voice -- --episode <name> --update-json    # 1. 음성 생성
python scripts/voice/whisper-words.py --episode <name> # 2. 단어 타임스탬프 (whisperx + diff)
pnpm analyze -- --episode <name> --update-json   # 3. 구절 병합 + duration 동기화
# 4. 자막 의미 단위 분할 — "sub 채워줘" (LLM이 긴 세그먼트에 sub 필드 추가)
```

4단계 상세: [voice/tts.md — 4단계](../project/remotion/book-recommend/voice/tts.md#4단계-자막-의미-단위-분할-sub-필드)

## 핵심 로직

### whisper-words.py (WhisperX + diff-match-patch)

1. WhisperX로 오디오를 **순수 전사** → 단어별 타임스탬프 추출
2. 전사 텍스트와 원문을 **diff-match-patch**로 문자 단위 대조
3. EQUAL 구간을 기준으로 WhisperX 타임스탬프를 원문 단어에 이식
4. 매칭 실패 단어는 이전/다음에서 균등 보간

장점:
- WhisperX가 "인리아스로"로 잘못 인식해도 **타이밍은 정확** → diff가 "일리아스 로"에 매핑
- 한영 혼용("OpenAI", "Claude") 타겟도 타임스탬프 존재 (Whisper가 음성을 인식하므로)
- 원문 강제 정렬(forced alignment)의 영어 단어 누락 문제 없음

### analyze-voice.ts — mergeIntoPhrases()

단어 세그먼트를 **구절 단위**로 병합한다. 분절 기준은 **구두점(`, . ! ?`)만** 사용한다.

- 호흡 무음, 단어 수 제한 등 오디오 기반 분절은 하지 않는다
- 구두점 사이의 의미 단위 분할은 4단계 LLM sub이 전담

### 의미 단위 분할 (sub) — 4단계

3단계가 만든 문장 단위 세그먼트에 LLM이 `sub` 필드를 추가한다.
`expandSubTimings()`가 글자수 비례로 타이밍을 자동 분배.

### Typewriter.tsx (하이라이트 UI)

| 상태 | opacity | 색상 |
|------|---------|------|
| 읽을 단어 | 0.2 | 기본색 |
| 읽는 단어 | 0.25→1.0 (스윕) | 기본색→하이라이트색 (`color-mix` 블렌딩) |
| 읽은 단어 | 0.85 | 하이라이트색 25% 블렌딩 |

- BOOST=4f (67ms 앞당김), FADE_IN=12f (200ms), FADE_OUT=15f (250ms)
