---
name: remo-voice-sync
description: Remotion 음성 파이프라인 2~4단계(whisper → analyze → reconcile 조건부 → sub) 일괄 실행. TTS(1단계) 이후 또는 텍스트·타이밍 변경 후 반드시 한 번 호출. "sub 채워줘", "시맨틱컷", "파이프라인 돌려줘", "voice 동기화", 오디오/텍스트 교체 후 한 세트 마무리 시 실행.
---

# Voice Sync — 메인 트랙 2~4단계 일괄 실행

1단계(TTS)를 제외한 **2~4단계(+3.5 reconcile 조건부)**를 한 번의 호출로 순차 실행하는 단일 진입점. 사용자가 각 단계를 따로 기억할 필요 없음.

## ⛔ 전제 — 파이프라인 단일성

```
1. TTS(pnpm voice)       ← 사용자 수동 (유료 API)
2. whisper(2-whisper.py) ← 이 스킬이 실행
3. analyze(3-timings.ts) ← 이 스킬이 실행
3.5 reconcile (조건부)    ← 이슈 있을 때만
4. sub(LLM 의미 단위 분할) ← 이 스킬이 실행
```

- **2~4단계는 한 세트다.** 3단계까지만 돌리고 4단계(sub)를 빼먹으면 자막이 `splitSub()` 폴백으로 떨어져 고유명사·관형절·보조용언이 파괴된다. 이 스킬 호출 한 번에 2~4단계 전부 완주한다.
- 4단계 sub가 없으면 렌더·Studio·YouTube 업로드 어느 쪽이든 자막 품질 붕괴.
- `pnpm voice --update-json`은 **duration만** 갱신한다. voiceTimings는 2·3단계가 갱신한다. 플래그 이름에 속지 말 것.
- 과거 사고 이력: 마르쿠스 아우렐리우스(10개 재생성 중 6개만 파이프라인), 알렉스 카프 쇼츠2 들숨 테스트, 이순신 sub 누락.

## 1단계(TTS)는 이 스킬에서 실행하지 않는다

- TTS는 유료 API. **사용자 사전 승인 필수**(`feedback_no_auto_generation`)
- 사용자가 먼저 `pnpm voice -- --episode <name> --long --normalize --update-json` 등 실행
- TTS 끝나면 이 스킬을 호출해서 2~4단계 한 번에 완주

## 필수 사전 읽기

실행 전 Read tool로 읽는다:

- `docs/project/remotion/book-recommend/voice/tts.md` — 4단계 sub 분할 규칙, 안티패턴

## 호출 키워드

사용자가 다음 중 하나로 호출한다:

- `/voice-sync <에피소드명>` — 신규 sub 생성 (기존 sub 없는 세그먼트만)
- `시맨틱컷 <에피소드명>` — 기존 sub 전량 삭제 후 **재분할** (force 모드)
- `"sub 채워줘"`, `"파이프라인 돌려줘"`, `"voice 동기화"` 등 자연어 요청

## 범위 옵션

- `--long` — 롱폼만 처리
- `--shorts <N>` — 쇼츠 N번만 처리
- 둘 다 미지정 시 기본값: **`--long`**
- `--only <key>` — 특정 세그먼트만 (2·3단계에 전달)

## 작업 흐름

### Step 0: 대상 확인

에피소드 디렉토리 위치: `sw/remotion/public/episodes/{stage}/{person}/`

`ko.json` (또는 `{locale}-{part}.json`) 존재 여부 확인. 없으면 중단.

### Step 1: Whisper (2단계)

```bash
python scripts/voice/2-whisper.py --episode <에피소드명> --long
# 또는 --shorts <N>
```

- `voice/{locale}/2-word-timings.json`에 단어 타임스탬프 기록
- 출력 로그에서 `원문?` 또는 orphaned 경고가 있으면 스키마 불일치 — 중단 후 사용자에게 보고

### Step 2: Analyze (3단계)

```bash
pnpm analyze -- --episode <에피소드명> --long --update-json
# 또는 --shorts <N>
```

- `ko.timing.json`의 `voiceTimings`·`duration` 갱신
- 3-timings.ts가 기존 sub를 자동 보존 (텍스트 동일한 세그먼트)
- 출력 로그에서 `fallback` 모드 세그먼트가 있으면 whisper 데이터 없음 — whisper 재실행 필요
- `sub 미처리 N건` 경고 = 4단계 대상 목록. 건수·세그먼트 메모

### Step 3: Reconcile-check (3.5단계, 조건부)

```bash
pnpm reconcile:check -- --episode <에피소드명>
```

- 탐지 이슈 0건 → 스킵, Step 4로
- `text-mismatch` 또는 `duration-compressed` 이슈 있음 → 보고 후 판단:
  - **text-mismatch가 content-audio 불일치** (원고 수정 vs 옛 TTS) → 사용자에게 재녹음 or 원고 되돌림 결정 요청 후 Step 4 진행
  - **duration-compressed** (숫자/한자 정렬 실패) → LLM 보정 필요. 이 스킬 내부에서 처리하거나, 현재 앵커가 구절 단위면 무시하고 Step 4

### Step 4: Sub 생성 (4단계)

3단계가 보고한 `sub 미처리` 세그먼트만 대상. 이미 sub 있는 세그먼트는 건너뜀.

**시맨틱컷 모드**일 때만 전량 삭제 후 재분할. 일반 모드는 누락분만 채움.

각 세그먼트마다 **tts.md 4단계 규칙**으로 분할:

#### ⛔ 절대 금지

- 글자 수 N등분 (인위적 중간점)
- 고유명사 파괴 (`"맨해튼" / "프로젝트"`)
- 지시사+체언 분리 (`"이" / "책을"`, `"그" / "점에"`)
- 보조용언 분리 (`"할 수" / "없는"`, `"적이" / "있다"`)
- 관형절+피수식어 분리

#### ✅ 분할 기준 (우선순위)

1. **절 경계** — 연결어미(`~고`, `~며`, `~지만`, `~면`, `~서`, `~여`) **뒤**
2. **주어/목적어 뒤** — `~은/는/이/가`, `~을/를` 뒤. 서술어까지 10자 이내면 합침
3. **수식절+피수식어 한 덩어리** — 관형절 + 피수식 명사 분리 금지

#### 자기 검증 체크리스트

분할 후 각 청크 확인:

- [ ] `sub.join(' ') === text` (불변식)
- [ ] 고유명사(인명·책제목·지명) 한 청크 내 유지
- [ ] 보조용언 분리되지 않음 (`수 없는`, `수 있는`, `적이 있다`)
- [ ] 지시사+체언 분리되지 않음 (`이 책`, `그 점`, `이 구절`)
- [ ] 각 청크 단독 읽기 의미 통함

### Step 5: 저장 + 검증

1. `ko.timing.json`의 `voiceTimings[key][idx].sub`에 직접 기록
2. `analyze` 재실행 — subTimings 자동 계산 (단어 경계 기반)
   ```bash
   pnpm analyze -- --episode <에피소드명> --long --update-json
   ```
3. `sub:check` — 불변식·누락 검증
   ```bash
   pnpm sub:check -- --episode <에피소드명>
   ```
4. 결과 기대치: **깨진 sub 0건 / 누락 sub 0건**

### Step 6: 사용자 보고

- 각 단계 실행 결과 요약 (처리한 파일 수, sub 추가 건수)
- 발견된 이슈(orphaned, fallback, reconcile)와 조치
- 아직 수동 결정 필요한 항목(content-audio mismatch 등) 명시

## Sub 작업 가능 여부 판별

| 조건 | 판정 | 조치 |
|------|------|------|
| `voiceTimings` 필드 없음 | 불가 | "1~3단계 미완, `pnpm voice` 먼저 실행" 안내 |
| `voiceTimings` 있으나 `start/end` 비어있음 | 불가 | "3단계(analyze) 실행 필요" 안내 |
| 모든 세그먼트 `start/end/text` 있음 | 가능 | 진행 |

여러 에피소드 요청 시, 각각 판별하여 불가한 건 건너뛰고 사유 보고.

## 기존 sub 처리

**시맨틱컷(force 모드)일 때:**
1. 대상 에피소드의 voiceTimings 전 세그먼트에서 `sub`·`subTimings` 필드 **전량 삭제**
2. `text` 필드(원문)만 기준으로 새로 분할
3. 기존 sub 절대 참조하지 않음 — 기존 분할이 오염원

**`/voice-sync`(일반 모드)일 때:**
- sub 이미 있는 세그먼트 → 건너뜀 (기존 존중)
- sub 없는 세그먼트만 → 분할 대상
- 텍스트가 짧아(30자 이하) 분할 불필요 → sub 없이 유지
