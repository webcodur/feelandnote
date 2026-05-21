---
name: remo-voice-sync
description: Remotion 음성 파이프라인 3~5단계(transcribe → align → chunk) 일괄 실행. 2단계(TTS, voice:tts) 이후 또는 텍스트·타이밍 변경 후 한 번 호출. "sub 채워줘", "시맨틱컷", "파이프라인 돌려줘", "파이프라인 밟아줘", "파이프라인 밟기", "voice 동기화", "음성 후처리", "sync 돌려줘", 오디오/텍스트 교체 후 마무리 시 실행.
---

# Voice Sync — 3~5단계 일괄 실행

음성 파이프라인 5단계 중 사용자 수동 단계(1·2)를 제외한 **3·4·5단계**를 한 번에 순차 실행하는 단일 진입점.

## 파이프라인 5단계 (전체)

```
─ Synthesis ─
1. pronounce    본문 모호표기 ↔ 발화규칙        (voice:pronounce, LLM 옵션)
2. tts          음성 합성 (유료 API)              (voice:tts)
─ Alignment ─
3. transcribe   단어 시간 추출                    (voice:transcribe)  ← 이 스킬
4. align        세그먼트 시간 + 자동 안전망       (voice:align)        ← 이 스킬
─ Composition ─
5. chunk        의미 단위 분할 + 적용 + 검증      (voice:chunk)        ← 이 스킬
```

각 단계는 자체 검증·트랜잭션 보장. **별도 reconcile-check / sub-check 단계 없음** — 4·5에 흡수됨.

## 인자 규약 (전 단계 공통)

- `--episode <인물>-ko` 또는 `<인물>-en` — locale 접미사 필수. 누락 시 에러(자동 default 차단으로 음성 덮어쓰기 사고 방지).
- `--long` 또는 `--shorts <N>` — 정확히 하나 필수.
- `--only <wav-stem-부분일치,…>` — 특정 wav만 처리. 콤마 구분 다중 가능.

### 변경 음원만 좁혀 처리 (필수 원칙)

사용자가 "S07·S08 두 개만 변경했다"처럼 범위를 알리면 **반드시 `--only`로 좁혀 실행**한다. 전체 쇼츠/롱폼 대상 실행은 시간·연산 낭비. 사용자가 매번 `--only`를 직접 지시하지 않아도 알아서 좁힌다.

- wav stem 패턴: 쇼츠는 `S{NN}-{segment-id}` (예: `S08-book-context-1`), 롱폼은 `D{NN}b-summary` 등.
- 명시 범위 없으면 전체.

## 수동 단계 (1·2)는 이 스킬에서 실행 안 함

- **1 pronounce**: 새 본문에 모호 표기 등장 시 사용자가 `pnpm voice:pronounce -- --episode <인물>-ko` 또는 `/voice-pronounce` 스킬로 보강
- **2 tts**: 유료 API. 사용자 사전 승인 필수 (`feedback_no_auto_generation`).
  - 롱폼: `pnpm voice:tts -- --episode <인물>-ko --long --normalize --start-key 17`
  - 쇼츠: `pnpm voice:tts -- --episode <인물>-ko --shorts <N> --only <wav-stem> --normalize --start-key 17`
  - `--normalize` 필수(라우드니스 균일). Gemini 키 로테이션 인덱스(`--start-key`)는 메모리 `reference_voice_api_key.md` 참조.
  - ElevenLabs 음성은 사용자 전담(스킬·Claude는 생성 안 함). 변경 wav가 ElevenLabs 산출물이면 2단계 건너뛰고 곧장 3단계로.

위 두 단계가 끝난 뒤 이 스킬을 호출하면 3·4·5 자동 처리.

## 호출 키워드

- `/voice-sync <인물>-ko` — 누락된 sub만 채움
- `시맨틱컷 <인물>-ko` — 기존 sub 전량 삭제 후 재분할
- `"파이프라인 돌려줘"`, `"파이프라인 밟기"`, `"파이프라인 밟아줘"`, `"voice 동기화"`, `"음성 후처리"`, `"sync 돌려줘"` 등 자연어

## 작업 흐름

### Step 0: 사전 확인

- 에피소드 디렉토리: `sw/remotion/public/episodes/{stage}/<인물>/`
- `ko.json`(또는 `en.json`) 존재 확인
- 사용자가 변경 알린 wav 식별 → `--only` 인자 구성
- (옵션) `pnpm voice:pronounce -- --episode <인물>-ko` dry-run으로 발화 누락 점검 — 누락 있으면 사용자에게 `/voice-pronounce` 호출 안내 후 중단

### Step 1: Transcribe (3단계)

```bash
# 롱폼 전체
python scripts/voice/3-transcribe.py --episode <인물>-ko --long
# 쇼츠 N번 전체
python scripts/voice/3-transcribe.py --episode <인물>-ko --shorts <N>
# 변경된 음원만 (권장 — 변경 범위 알 때 항상 사용)
python scripts/voice/3-transcribe.py --episode <인물>-ko --shorts <N> --only S07-celeb-zhuge-3,S08-book-context-1
```

- `voice/{locale}/2-word-timings.json`에 단어 timing 기록 (전체 파일 단일 dump → 중단되어도 디스크는 직전 상태 유지)
- `원문?` 또는 orphaned 경고 → 스키마 불일치, 중단 후 사용자에게 보고

### Step 2: Align (4단계)

```bash
# 롱폼
pnpm voice:align -- --episode <인물>-ko --long --update-json
# 쇼츠
pnpm voice:align -- --episode <인물>-ko --shorts <N> --update-json
# 변경된 음원만
pnpm voice:align -- --episode <인물>-ko --shorts <N> --only S07-celeb-zhuge-3,S08-book-context-1 --update-json
```

- `ko.timing.json`(롱폼) / `shorts/ko-{N}.timing.json`(쇼츠)의 voiceTimings·duration 갱신
- **자체 안전망 자동 적용**: 음수 duration·극단 찌부 자동 복구 (출력 로그에 `✓ 안전망:` 라인)
- 기존 sub는 텍스트 동일한 세그먼트만 보존
- `imageChangeAt` 자동 해소 — 텍스트 앵커가 발화 시각으로 변환
- `sub 미처리 N건` 경고 = Step 3 대상

### Step 3: Chunk 분할안 작성 (5단계 입력)

3단계가 보고한 `sub 미처리` 세그먼트만 대상. 이미 sub 있는 세그먼트는 건너뜀.

**시맨틱컷 모드**일 때만 전량 삭제 후 재분할.

각 세그먼트마다 LLM이 [tts.md 4단계 규칙](../../../docs/project/remotion/book-recommend/voice/tts.md)으로 분할:

#### ⛔ 절대 금지

- 글자 수 N등분
- 고유명사 파괴 (`"맨해튼" / "프로젝트"`)
- 지시사+체언 분리 (`"이" / "책을"`, `"그" / "점에"`)
- 보조용언 분리 (`"할 수" / "없는"`, `"적이" / "있다"`)
- 관형절+피수식어 분리

#### ✅ 분할 우선순위

1. 쉼표 뒤 (있으면 최우선 — 5-chunk.ts가 자동으로 기계식 선분할함)
2. 절 경계 — 연결어미(`~고`, `~며`, `~지만`, `~면`, `~서`, `~여`) 뒤
3. 주어/목적어 뒤 — `~은/는/이/가`, `~을/를` 뒤. 서술어까지 10자 이내면 합침
4. 수식절+피수식어 한 덩어리

#### 📏 청크 길이 한도

- **각 sub 청크 35자 이하.** 초과 시 파이프라인이 `sub 청크 과대` 경고로 자동 보고한다.
- 35자 초과 청크를 포함한 세그먼트는 Step 3에서 재분할 대상으로 다시 처리해야 한다.

#### 🎬 쇼츠 전용 규칙 (`--shorts <N>` 스코프)

쇼츠는 세로 화면에 자막이 한 줄씩 빠르게 흐르므로 롱폼보다 더 잘게 끊는다.

- **의미 단위 우선** — 어절 수보다 의미 단위 경계가 먼저. 절·구·부사어·관형구가 각각 한 덩어리.
- **분량 기준 3~4 어절.** 통사 결속(보조용언·지시사+체언·관형절+피수식어·관형구 체인+체언·의존명사구)이 길게 묶이는 경우만 5~6 어절 허용.
- **모든 voiceTimings 인덱스에 sub 작성.** 30자 이하라 "sub 불필요"로 판정된 짧은 발화도 쇼츠에서는 명시 분할(예: "ICBM 한 발에" / "2천만 불.").
- 의미 결속을 깨면서 어절 수만 맞추지 않는다. 한 청크가 5~6 어절이어도 결속이 자연스러우면 그쪽이 정답.

#### 자기 검증

각 청크가 다음 충족하는지 확인:
- [ ] `sub.join(' ') === text`
- [ ] 고유명사 한 청크 내 유지
- [ ] 보조용언/지시사 분리 없음
- [ ] 단독 읽기 의미 통함

#### subs.json 형식

```json
{
  "<wav-key>": {
    "<voiceTimings 인덱스>": ["청크1", "청크2", ...]
  }
}
```

- 롱폼 wav-key 예: `D05b-summary`
- 쇼츠 wav-key 예: `shorts-2/S07-celeb-zhuge-3`
- voiceTimings 인덱스: 해당 wav 안의 줄(문장) 순서 (0-based). 4단계 align 출력의 `[N]` 번호와 동일.
- 임시 파일은 `scripts/voice/subs-<인물>-<범위>.json` 등에 저장 후 입력으로 넘기고, 적용 검증이 끝나면 삭제.

### Step 4: 적용 + 검증 (트랜잭션)

분할 결과를 `subs.json`으로 저장한 뒤:

```bash
pnpm voice:chunk -- --episode <인물>-ko --input scripts/voice/subs-<인물>-<범위>.json
```

- 모든 세그먼트의 `sub.join === text` 일괄 검증 → 하나라도 실패하면 abort, 디스크 미수정
- 통과하면 일괄 커밋
- 콤마가 남은 LLM 청크는 자동 재분할(후처리)됨

### Step 5: subTimings 자동 계산

```bash
# Step 2와 같은 인자로 한 번 더
pnpm voice:align -- --episode <인물>-ko --shorts <N> --update-json
```

- 4단계가 다시 한 번 voiceTimings를 빌드하면서 sub 기반 subTimings 자동 산출
- 안전망도 다시 적용

### Step 6: 최종 검증 (자동)

```bash
pnpm voice:chunk -- --episode <인물>-ko --check
```

- 깨진 sub: 0 / 누락 sub: 0 (30자 초과 기준) / sub 청크 과대: 0 (35자 초과 기준)

### Step 7: 임시 파일 정리 + 보고

- `subs-<인물>-<범위>.json` 등 임시 입력 파일 삭제
- 각 단계 결과 요약 (전사 단어수 일치, align 안전망 복구 건수, 분할 적용 건수, 최종 검증)
- 사용자 결정 필요한 항목 (content-audio mismatch 등)

## Sub 작업 가능 여부

| 조건 | 판정 | 조치 |
|------|------|------|
| `voiceTimings` 필드 없음 | 불가 | "1~3단계 미완, voice:tts → voice:transcribe → voice:align 순서로" |
| `start/end` 비어있음 | 불가 | "voice:align 실행 필요" |
| 모든 세그먼트 `start/end/text` 있음 | 가능 | 진행 |

## 기존 sub 처리

**시맨틱컷일 때:**
1. 대상 에피소드의 voiceTimings 전 세그먼트에서 `sub`·`subTimings` **전량 삭제**
2. `text` 기준으로 새로 분할
3. 기존 sub 절대 참조 안 함

**일반 `/voice-sync`일 때:**
- sub 이미 있는 세그먼트 → 건너뜀
- sub 없는 세그먼트만 → 분할 대상
- 30자 이하 → 분할 불필요, sub 없이 유지

## 안전망(4단계 align) 자동 복구 범위

**자동 복구 대상**:
- 음수 duration (`end < start`) — 다음 세그먼트 start 직전까지 확장
- 극단 찌부 (음절수 × 130ms 기준 50% 미만 + 5자 이상) — 음절×130ms로 확장 (overflow 방지)

**자동 복구 안 함 (사용자 UI 보정)**:
- 미세 어긋남(±0.5초) — VoiceTimingEditor 모달에서 드래그
- 치환 구간의 정확한 발음 시작 시점 — 사용자 체감 확인 필요

UI는 `remotion-bo`의 ScenarioView → SYNC 탭 → "편집기 열기" 모달.

## 흔한 함정

- locale 접미사(`-ko`/`-en`) 누락 → 즉시 에러. TS·Python 모두 동일 규약(2026-05-02 통일).
- `--shorts`와 `--long` 동시 지정 또는 둘 다 누락 → 에러.
- `--only` 인자 매칭은 wav stem `includes` 부분일치 → `book-context-1`만 줘도 `S08-book-context-1.wav`에 매칭. 다중은 콤마.
- ElevenLabs 산출 wav 변경 후 2단계 호출 → 차단됨(잠금 보호). 3단계부터 진행.
- 1.3배 등 후처리 볼륨 부스트는 정규화 이후 적용 → 약한 클리핑 가능. 길이는 그대로라 timing 재계산 불필요.
