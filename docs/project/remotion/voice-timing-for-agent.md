# Voice Timing Refinement — 실행 스펙

에이전트(연주자)가 참조하는 실행 규격. 설계 철학과 노하우는 `voice-timing-for-master.md` 참조.

## 데이터 형식

### whisper-debug.json — 주 신호

```
public/voice/<episode>/whisper-debug.json
```

```json
{
  "episode": "jensen-huang-en",
  "model": "base",
  "targets": {
    "B2-philosophy": [
      { "word": "Hello,", "start": 0.0, "end": 0.48 },
      { "word": "I'm", "start": 0.84, "end": 1.12 },
      { "word": "Jensen", "start": 1.12, "end": 1.44 },
      { "word": "Huang.", "start": 1.44, "end": 1.70 },
      { "word": "Reading", "start": 2.60, "end": 2.78 },
      ...
    ]
  }
}
```

Whisper `word` 텍스트는 오인식 가능 ("Snowcrash"="Snow Crash", "Invidia"="NVIDIA"). **타이밍은 정확하므로 word가 틀려도 시각 정보는 신뢰한다.**

### timing-debug.json — 교차검증용

```
public/voice/<episode>/timing-debug.json
```

| 필드 | 용도 |
|------|------|
| `rms` | 50ms 윈도우 RMS. `rms[i]` 시각 = `i × 0.05`초. 경계가 무음에 있는지 확인용 |
| `sentences` | 원본 텍스트 문장 분할 |
| `duration` | 오디오 총 길이 |
| `draft` | 1차 프로그래밍 추정 (최종 비교용. 분석에 사용하지 않는다) |

---

## 분석 절차

### Step 1. Whisper 단어 → 원본 문장 매핑

원본 문장을 순서대로 읽으면서 Whisper 단어를 앞에서부터 소비한다.

```
원본: ["Hello,", "I'm Jensen Huang.", "Reading Alice in Wonderland..."]

Whisper:
  [0] Hello,    0.00~0.48
  [1] I'm       0.84~1.12
  [2] Jensen    1.12~1.44
  [3] Huang.    1.44~1.70  ← 문장2 끝
  [4] Reading   2.60~2.78  ← 문장3 시작
  ...

매핑:
  문장1: word[0]      (0.00~0.48)
  문장2: word[1~3]    (0.84~1.70)
  문장3: word[4~16]   (2.60~5.90)
```

**오인식 처리:** 텍스트가 안 맞으면 **순서와 위치**로 판단. 단어 수 불일치도 위치 기반으로 해결.

### Step 2. 경계 시각 결정

```
경계 = 이전 문장 마지막 단어의 end (발화 종료 시점)
소수점 3자리 반올림
```

### Step 3. RMS 교차검증

```
rmsIndex = Math.round(경계 / 0.05)
```

- `rms[rmsIndex] < 0.02` → ✅ 경계 유지
- `rms[rmsIndex] ≥ 0.02` → ±100ms(±2인덱스) 내 RMS 최저점으로 미세 조정

### Step 4. 검증

**불변 제약:**
- `result[0].start = 0.000`
- `result[마지막].end = duration`
- 세그먼트 수 = 문장 수
- `result[i].end = result[i+1].start`
- 소수점 3자리 반올림

**품질 확인:**
- 모든 경계의 RMS < 0.02
- 세그먼트 길이 ≥ 0.3초 (미만이면 수동 검토 보고)

---

## 실행 방법

```bash
# 1차-a: RMS 분석 + 초안
pnpm analyze -- --episode <name> --update-json --export-debug

# 1차-b: Whisper 단어 타임스탬프
python scripts/whisper-words.py --episode <name>

# 2차: LLM 타이밍 결정
/voice-timing-refine <name>
```

---

## 리포트 형식

```
=== voice-timing-refine: <에피소드명> ===

[B2-philosophy] 9문장, 61 whisper words
  매핑: s1=w[0], s2=w[1-3], s3=w[4-16], ...
  경계: 0→0.48→1.70→5.90→...→22.571
  RMS 검증: 전체 ✅
  기존 대비 변경: 경계1 0.62→0.48, 경계8 21.4→21.35

변경: N건 / 총: 26건
```
