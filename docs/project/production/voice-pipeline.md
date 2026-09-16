# 음성 파이프라인 — Feel&Note 배선

범용 파이프라인(단계·기법·기준값·구현 명세)은 [`voice-pipeline-universal.md`](voice-pipeline-universal.md)가 쥔다. 이 문서는 **이 저장소에 그 파이프라인이 어떻게 배선됐는가**만 쥔다: 시리즈별 명령·엔진·보이스 배정, 저장 위치, DB·R2 계약, 이미지 전환 처리, 상수 소유권.

값 자체를 문서가 소유하지 않는다 — 표의 정본 열이 가리키는 코드 상수가 정본이다. 단계별 실행 계약의 세부는 시리즈 문서가 쥔다: 서재탐방 5단계는 [`../remotion/book-recommend/voice/voice-timing-pipeline.md`](../remotion/book-recommend/voice/voice-timing-pipeline.md), 음성 정리 규칙은 [`voice-cleanup.md`](voice-cleanup.md), 환경변수 배치는 [`../platform/env-vars.md`](../platform/env-vars.md), audio-bo 작업실은 [`../apps/audio-bo.md`](../apps/audio-bo.md).

## 명령 인덱스 (sw/remotion)

```text
pnpm voice:pronounce     1. 발화 사전 등록 (1-pronounce.ts)
pnpm voice:tts           2. 합성 + 정리 + 정규화 (2-synthesize.ts, --list 로 목록)
pnpm voice:transcribe    3. whisperx 전사 (py 런처 필수)
pnpm voice:align         4. 정렬 + 안전망 (4-align.ts)
pnpm voice:chunk         5. 청크 분할/적용/--check (5-chunk.ts)
pnpm voice:match-cps     +  자/초 배속 산출 (match-cps.ts)

셀럽 대사: sw/audio-bo/scripts/celeb-dialogue-voice-*.py → web-bo/scripts/celeb/dialogue-voice-publish.ts
```

## 2-1. 서재탐방 (BookRecommend)

- **엔진**: 나레이터·요약·쇼츠 = Gemini 무료 키. 실제 인물(celeb) 구간 = ElevenLabs만 — Gemini `VOICE.celeb`(Puck)은 폴백 전용이다.
- **보이스**: 기본 Charon. 스타일 prefix는 `NARRATOR_STYLE_DEFAULT`("편안하고 자연스럽게").
- **저장**: `public/episodes/<에피>/voice/<locale>/<engine>/…wav`. 타이밍은 같은 에피소드 폴더의 `*.timing.json`에 `voiceTimings`·`duration`·`subTimings`.
- **이미지 전환**: 세그먼트의 `imageChangeAt`이 발화 시각으로 해소된다(텍스트 앵커 → 발화 시각). 배속 적용 시 `imageChangeAt.t`도 duration과 함께 1/r 스케일된다.
- **파일키→역할**: `roleForLongformKey` 등 정책 함수가 narrator/summary/celeb을 판정해 엔진을 가른다.

## 2-3. 책과사람 (book-person)

- **엔진**: 나레이션 = Gemini, 인물 인용 = ElevenLabs. 합성은 공용 엔진(`lib/gemini-engine.ts`·`lib/elevenlabs-engine.ts`)을 쓰고 에피소드별 잡 구성·스타일만 자체 보유한다.
- ElevenLabs 인용 문장 앞에는 오디오 태그를 둔다(나레이션 하한 `[deliberate]` 기본).

## 2-4. 셀럽 대사 22종

- **엔진**: ElevenLabs만 — 실존 인물 고유 목소리가 전부다. 생성은 `sw/audio-bo/scripts/celeb-dialogue-voice-generate.py`.
- **슬롯**: 상황(greeting/roll call/deploy/battle win·draw·lose/clash attack/quote) × 변형 3개 = 22종. 슬롯 목록·파일명 스템은 shared `voice-names.ts` + web-bo `voice-path.ts`가 정본, 파이썬은 생성 JSON 브리지로 받는다.
- **QC**: `celeb-dialogue-voice-qc.py`(whisper 재전사 대조). `low-match`는 원문 대조로 판단, `unmatched-tail`·`tag-spoken`은 공개 전 해소 필수.
- **발행**: `dialogue-voice-publish.ts` — manifest 22개·voice ID·파일 전량 확인 후 `--apply`, 기존 R2 음원은 `_backup` 보존. 발행 후 `voice_v` 쿼리로 캐시를 끊는다(R2 키 규칙은 `voice-path.ts`).

## 2-5. audio-bo 작업실

웹에는 읽어주기 합성 경로를 두지 않는다. 운영에서 막혀 있고 키도 없던 개발 전용 창구라 26.09.16에 걷었다(화성학 수업 읽어주기 단추 포함).
- **audio-bo 작업실**: 인터뷰 추출(yt-dlp) → 정리(DeepFilterNet) → 전사(faster-whisper) → 학습·합성(GPT-SoVITS 실험 유지). 루트 경로는 `src/lib/paths.ts`가 쥐고 worker가 env로 주입한다 — `audio-worker.ps1`은 폴백 없이 env 필수.

## 상수 소유권 — 단일화 현황

감사에서 잡은 이중 관리는 아래 정본으로 모두 모였다. 규칙을 바꿀 때는 정본만 고친다 — 나머지 위치는 import·호출일 뿐이다.

| 값 | 정본(SSoT) | 소비자 |
|---|---|---|
| ElevenLabs 기본 설정 + `EleSettings` 형태 | `packages/shared/src/bo/voice-utils/engine.ts` (`ELEVENLABS_TTS_DEFAULTS`·`DEFAULT_ELE_SETTINGS`) | web-bo `dialogue-studio`·`api/celebs|[series] voice/preview`·`actions/admin/voice-gen.ts`, remotion `book-person/tts.ts`·`lib/elevenlabs-engine.ts`. audio-bo 파이썬은 언어 경계상 기본값에 포인터 주석만 |
| Gemini 모델·보이스 목록 | `packages/shared/src/lib/voice-policy.ts` (`MODEL_GEMINI_25/31`, 보이스 목록) | remotion 합성 스크립트·web-bo 미리듣기·web 읽기 TTS |
| Google 무료 키 풀(env 열거 규약) | `packages/shared/src/lib/gemini-keys.ts` (`googleFreeApiKeys`) | remotion `lib/gemini-engine.ts`·web-bo `lib/gemini-tts.ts` |
| PCM→WAV 헤더 | `packages/shared/src/lib/pcm-wav.ts` (`wrapPcmAsWav`) | web-bo `lib/gemini-tts.ts` |
| web-bo 미리듣기 키 로테이션+재시도 | `sw/web-bo/src/lib/gemini-tts.ts` (`synthesizeGeminiPreview`) | `api/[series]/voice/{gemini,gemini-v3}/preview` 라우트 2곳 |
| 라우드니스 목표 | `packages/shared/src/bo/voice-normalize.ts` | remotion `2-synthesize/config.ts`가 import |
| 정렬 신호처리·sub 청크 정책 | `sw/remotion/scripts/voice/lib/align-core.ts` | `4-align.ts`(서재탐방)·`5-chunk.ts` — sub 청크는 자막 한 줄 단위 |
| 배속 클램프 | `sw/remotion/src/compositions/BookRecommend/playback-rate.ts` (`PLAYBACK_RATE_*`·`clampRate`) | `scripts/voice/match-cps.ts` |
| Gemini 합성+키 순회(스크립트) | `sw/remotion/scripts/voice/lib/gemini-engine.ts` | `2-synthesize/engines.ts`·`book-person/tts.ts` |
| ElevenLabs 합성(스크립트) | `sw/remotion/scripts/voice/lib/elevenlabs-engine.ts` | `2-synthesize/engines.ts`·`book-person/tts.ts` |
| 셀럽 대사 슬롯→파일명 | `packages/shared/src/bo/voice-utils/voice-names.ts` + web-bo `voice-path.ts` | `dialogue-voice-publish.ts`, 파이썬은 생성 JSON 브리지 경유 |
| 오디오 루트 경로 | `sw/audio-bo/src/lib/paths.ts` (worker가 env로 주입) | `audio-worker.ps1`은 env 필수(폴백 제거) |
| ElevenLabs 계정 레지스트리 | `packages/shared/src/lib/ele-accounts.ts` | web-bo·audio-bo 공용 |
| 셀럽 voice ID | DB `celebs.voice_id_ko/en` | 언어가 다른 ID 임의 재사용 금지 |

### 잔존 수동 미러(이 파이프라인 범위 밖)

- `web-bo/src/lib/discourse-types.ts` — 씬·타입 정의 미러. 음성 파이프라인 상수가 아니라 타입이라 이번 통합 대상에서 제외했다. 통합 시 shared 이관 검토 대상.
- `scripts/voice/test-voices.ts`·`_test-v3-saguk.ts` — gitignore된 로컬 스크래치. 정본 규약과 무관하게 방치.
