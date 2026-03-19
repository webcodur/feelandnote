# Voice Timing Design — 설계 철학 및 노하우

지휘자용 문서. 파이프라인 전체 구조, 도구별 역할 분담, 설계 의사결정 근거를 기술한다.
연주자(에이전트)가 참조하는 실행 스펙은 `voice-timing-for-agent.md`에 있다.

## 파이프라인 전체 구조

```
1차-a: analyze-voice.ts (프로그래밍)
  WAV → RMS 배열 + 무음 탐지 + 초안 voiceTimings
  → timing-debug.json 출력 (RMS, sentences, duration)

1차-b: whisper-words.py (Whisper)
  WAV → 단어별 타임스탬프
  → whisper-debug.json 출력

2차: /voice-timing-refine (LLM 스킬)
  Whisper 단어 타임스탬프(주 신호) + RMS(교차검증) + 원본 텍스트
  → 문장 경계 결정 → voiceTimings JSON 반영
```

## 도구별 역할 분리 원칙

```
Whisper → "이 소리가 몇 초에 나는가" (음향 분석)
RMS     → "이 시점이 무음인가"        (신호 검증)
LLM     → "이 단어가 어떤 문장인가"    (언어 이해 + 퍼지 매칭)
```

하나의 도구로 전부 해결하려 하면 깨진다. Whisper 단독은 인식 오류로, RMS 단독은 해상도 한계로, LLM 단독은 음향 정보 부재로 각각 실패한다.

## LLM이 잘하는 일 vs 못하는 일

**잘하는 일:**
- Whisper "Snowcrash" → 원본 "Snow Crash" 퍼지 매칭
- "the U.S."가 독립 문장인지 다음 절에 붙는지 문맥 판단
- 쉼표 뒤 갭이 문장 경계인지 문장 내 쉼인지 구별

**못하는 일 (프로그래밍이 낫다):**
- RMS 숫자 배열에서 발화/무음 구간 식별 — 단순 threshold 비교를 LLM이 할 이유 없음
- 글자 수/음절 수 비례 계산

## Whisper 실무 팁

- **base 모델이면 충분하다.** TTS 생성 오디오는 깨끗하므로 인식률보다 타이밍 정확도가 중요.
- **인식 텍스트는 신뢰하지 않는다.** "Invidia"(=NVIDIA), "Jensen Humb"(=Huang), "0-1"(=Zero to One) 등 오인식이 빈번. 타이밍만 가져가고 텍스트 매칭은 LLM이 한다.
- **CPU 전용으로 충분하다.** TTS 클립은 5~40초 수준. GPU 없이 base 모델로 파일당 3~5초.
- **이전에 Whisper가 실패한 이유:** 인식 결과를 직접 사용하려 했기 때문. 지금은 타이밍만 취하고 텍스트 정렬은 LLM이 하므로 인식 오류가 문제되지 않는다.

## RMS 교차검증 패턴

- Whisper word end 시점의 RMS ≥ 0.02인 경우가 빈번 (발화 꼬리, 잔향)
- ±100ms 내 RMS 최저점으로 이동하면 대부분 해결
- 무음이 없는 구간도 존재 (빠른 발화 전환, 극적 연결) → Whisper end 그대로 사용
- RMS threshold 0.02는 Gemini TTS 기준. 다른 TTS 엔진이면 조정 필요

## LLM 앵커링 문제

- 1차 draft를 "참고용"이라 해도 LLM은 그걸 앵커로 삼아 미세 조정만 한다
- 독립 분석을 원하면 draft를 아예 빼야 한다
- 현재 스킬은 whisper-debug.json을 주 신호로 사용하고, timing-debug.json에 포함된 draft는 최종 비교용으로만 참조

## 에이전트 병렬화

- 3분할이 적절: (A/B/E), (D01-D04), (D05-D07/S). 각 파트 8~11개 타겟
- whisper-debug.json은 가벼워서 전체 읽기 가능
- timing-debug.json은 무거우므로 각 타겟의 rms/sentences/duration만 부분 읽기

## 실패한 접근

| 접근 | 실패 이유 |
|------|-----------|
| LLM에 draft 주고 "검증해" | 1차와 동일한 로직을 반복할 뿐. 추가 가치 없음 |
| LLM에 RMS만 주고 "분석해" | 숫자 나열에서 패턴 읽기는 가능하나, 단어 경계를 모르므로 결국 비례 추정으로 회귀 |
| Whisper 인식 텍스트를 자막으로 직접 사용 | 오인식이 자막에 노출. 원본 텍스트가 항상 정답 |
| Whisper 단독 사용 (과거) | 인식 결과를 직접 사용하려 했기 때문에 인식 오류가 곧 타이밍 오류로 이어짐 |
