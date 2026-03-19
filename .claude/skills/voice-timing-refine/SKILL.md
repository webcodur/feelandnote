---
name: voice-timing-refine
description: Whisper 단어 타임스탬프 + RMS 파형 + 원본 텍스트로 voiceTimings 경계를 결정한다.
---

# Voice Timing Refine — Whisper + 파형 기반 타이밍 결정

Whisper의 word-level timestamps를 주 신호로, RMS 파형을 교차검증으로 사용하여 문장별 경계를 결정한다.

**필수 참조:** 작업 전 `docs/project/remotion/voice-timing-for-agent.md`를 Read tool로 읽는다.

## 트리거

- "voiceTimings 검수", "타이밍 보정", "timing refine"
- `/voice-timing-refine <에피소드명>`

## 실행 절차

### 0. 사전 확인

디버그 파일 2개 존재 확인:
```
sw/remotion/public/voice/<에피소드>/whisper-debug.json   ← Whisper 단어 타임스탬프
sw/remotion/public/voice/<에피소드>/timing-debug.json     ← RMS 파형 데이터
```

없으면 안내:
```bash
cd C:/project/feelandnote/sw/remotion
npx tsx scripts/analyze-voice.ts --episode <name> --update-json --export-debug
python scripts/whisper-words.py --episode <name>
```

### 1. 데이터 읽기

1. `docs/project/remotion/voice-timing-for-agent.md` 읽기
2. `whisper-debug.json` 읽기 — **주 신호** (단어별 start/end)
3. `timing-debug.json` 읽기 — **교차검증** (rms 배열, sentences, duration)
4. `episodes/book-recommend/<에피소드>.json` 읽기 — 현재 voiceTimings

### 2. 각 타겟별 분석

단일 세그먼트(문장 1개) 타겟은 건너뛴다.

#### Step 1. Whisper 단어 → 원본 문장 매핑

timing-debug.json의 `sentences`(원본 문장 배열)와 whisper-debug.json의 단어 배열을 대조한다.

**방법:**
- 원본 문장을 순서대로 읽으면서, Whisper 단어를 앞에서부터 소비
- 원본 문장의 단어와 Whisper 단어를 순서 기반으로 매칭
- Whisper 오인식은 무시 ("Snowcrash"→"Snow Crash", "Invidia"→"NVIDIA") — **순서와 위치**로 판단
- 각 문장의 시작 단어 인덱스와 끝 단어 인덱스를 기록

```
문장1 "Hello,": whisper word[0] (0.00~0.48)
문장2 "I'm Jensen Huang.": whisper word[1~3] (0.84~1.70)
```

#### Step 2. 경계 시각 결정

각 문장 경계 = 이전 문장 마지막 단어의 end와 다음 문장 첫 단어의 start 사이 갭의 중간점 또는 시작점.

```
gap_start = word[마지막].end     (이전 문장 끝)
gap_end   = word[다음첫번째].start (다음 문장 시작)
경계      = gap_start            (발화 종료 시점)
```

갭이 없는 경우(단어가 연속): 마지막 단어의 end를 경계로 사용.

소수점 3자리 반올림.

#### Step 3. RMS 교차검증

결정된 경계 시각에서 `rms[Math.round(경계/0.05)]`를 확인:
- RMS < 0.02 → ✅ 무음 확인
- RMS ≥ 0.02 → 경계를 ±100ms 범위에서 RMS 최저점으로 미세 조정

#### Step 4. 검증

- `result[0].start = 0.000` (고정)
- `result[마지막].end = duration` (고정)
- 세그먼트 수 = 문장 수 (변경 불가)
- `result[i].end = result[i+1].start` (연속성)
- 세그먼트 길이 ≥ 0.3초 (미만이면 수동 검토 보고)

### 3. JSON 수정

에피소드 JSON의 `voiceTimings[키]`를 수정한다. **text 필드는 건드리지 않는다.**

기존과 동일한 결과가 나온 타겟은 수정하지 않는다.

### 4. 리포트

```
=== voice-timing-refine: <에피소드명> ===

[B2-philosophy] 9문장, 61 whisper words
  매핑: s1=w[0], s2=w[1-3], s3=w[4-16], ...
  경계: 0→0.480→1.700→5.900→...→22.571
  RMS 검증: 전체 ✅
  기존 대비 변경: 경계1 0.62→0.48, 경계8 21.4→21.35

변경: N건 / 총: 26건
```

## 주의사항

- **Whisper 단어 타임스탬프가 주 신호.** RMS는 교차검증용.
- Whisper 인식 텍스트가 틀려도 타이밍은 신뢰한다. 텍스트 매칭은 순서/위치 기반.
- text 필드를 수정하지 않는다.
- 단일 세그먼트 타겟은 건너뛴다.
