# 에이전트 도구 장부 (툴북)

외부 도구의 **현재 구성·용도 배정·문서 색인**을 쥐는 장부다. 도구·모델·한도는 수시로 바뀌므로 최신 값은 여기서만 고친다. 다른 문서·런북은 도구 이름이나 모델명을 직접 박지 말고 이 문서로 연결한다.

- 호출 방식·Windows 함정·재시도 규약은 각 도구의 스킬이 쥔다 — 이 문서는 무엇이 있고 무엇에 쓰는지만 적는다.
- 사용 시점(지시 없이 쓰지 않는다)과 공통 함정은 [`agent-rules.md`](agent-rules.md) 「도구」가 쥔다.
- 호출 자체의 범용 기법(CLI 상호 호출·진단-편집 분업·병렬화)은 [`../resource/`](../resource/README.md) 0x 묶음이 쥔다.

## 도구 사전

이 저장소에서 쓰는 외부 CLI·자동화 도구의 전부다. 각 항목은 정체·용도·규약 원천을 연결한다.

### 텍스트·이미지 생성 CLI

| 도구 | 정체 | 스킬 | 헬퍼 | 현재 용도 배정 |
|---|---|---|---|---|
| codex | OpenAI 코딩 CLI. `exec` 비대화 호출 | `codex-gpt` | `scripts/codex-call.mjs` | GPT 호출은 모두 `gpt-6.1-sol`. 조사·사실 검증·산문·대사·내장 image_gen 이미지 생성(REF 입력 지원) |
| agy | Antigravity CLI(Gemini) 비대화 호출 | `agy-antigravity` | `scripts/agy-call.mjs` | 한국어 산문 처리 — 인물안내·가상독백 문장 생성. 큰 실내·군중 장면 이미지 |
| agy 계정 | agy 구글 계정 풀 쿼터·전환 | `agy-accounts` | — | agy 쿼터 소진 시 계정 전환·갱신 |
| Kiro | Kiro CLI의 GPT Sol 비대화 | `kiro-gpt` | — | GPT 라인 보조 채널. 터미널×워커 병렬 |
| opencode | muse-spark 등 로컬 CLI | `opencode-muse` | — | 한국어 산문 저비용 대량 배치. **조사를 명시하지 않으면 내재 지식으로 지어낸다** |
| devin | Devin CLI 비대화(-p) | `devin-swe` | `scripts/devin-call.mjs` | 조사·작성·정비의 통째 위임(무료 SWE-2) |

### 브라우저·웹 접근

| 도구 | 정체 | 규약 원천 | 용도 |
|---|---|---|---|
| aside | 사용자 실제 브라우저를 CLI로 제어(세션·쿠키 그대로) | `aside-browser` | 로그인 화면 제어·원문 열람 |
| insane-search | 웹 페이지 열람 도구 | `agent-rules.md` 「도구」 29 | 웹 페이지는 처음부터 이쪽으로 연다 — `WebFetch` 거부 도메인이 많다 |

### 미디어 생성·처리

| 도구 | 정체 | 규약 원천 | 용도 |
|---|---|---|---|
| ElevenLabs | TTS 합성 | `elevenlabs-v3-tags` · `celeb-dialogue-voice-publish` | 대사 음원·내레이션 합성, v3 오디오 태그 |
| nobg | 로컬 배경 제거 도구 `C:\project\nobg` | `nobg-cutout` | 누끼 — 직접 rembg 코드를 짜지 않는다 |
| GPT-SoVITS | 로컬 음성 학습·합성 | `interview-audio-pipeline` | 화자 학습·한국어 합성 |

### 참고 문서 (도구별 SSoT가 아닌 범용 기법·외부 API 수치)

| 문서 | 내용 |
|---|---|
| [`../resource/res-01-agent-operations.md`](../resource/res-01-agent-operations.md) | 모델 역할 분담·병렬화 한계·자동화 경계 |
| [`../resource/res-02-cli-agent-invocation.md`](../resource/res-02-cli-agent-invocation.md) | CLI 에이전트를 셸로 호출하는 공통 규격·함정 |
| [`../resource/res-03-diagnose-edit-verify.md`](../resource/res-03-diagnose-edit-verify.md) | 진단-편집 분업 패턴 |
| [`../resource/res-31-openai-usage.md`](../resource/res-31-openai-usage.md) | OpenAI API 모델·비용·이미지 옵션(작성 시점 기준) |
| [`production/prod-01-image-generation.md`](production/prod-01-image-generation.md) | 이미지 발주 원칙 — 구도·REF·검수 |

## 쓰는 법

- **용도 배정은 위 표가 정한다.** GPT 호출은 `gpt-6.1-sol`로 통일한다. 현재 회차의 SWE-2 호출은 취소했다.
- **발주문에는 조사와 언어를 명시한다.** 사람·사건이 든 원고는 "조사하라"를 빼면 기억으로 쓰고, 한국어 결과는 「한국인이 한국어로 쓴 글답게」를 매번 싣는다.
- **도구가 바뀌면 이 표 한 줄만 고친다.** 새 CLI를 붙일 때는 `agent-rules.md` 「도구」 30~31번을 따른다 — 스킬을 먼저 만들고 헬퍼로 굳힌다.
- **각 도구의 상세 호출·한도·함정은 스킬 문서가 원천이다.** 이 장부에는 바뀌기 쉬운 현재 배정만 적고 스냅샷처럼 쌓지 않는다.

## 아바타 합성 (26.10.03 기준)

실존 인물 초상화 합성의 도구 배정이다. 우선순위가 아니라 **시드 상태×인물 유형별 라우팅**이다 — `celeb/celeb-08-01-avatar.md` 「생성 아바타 배치」의 2단계가 이 배정을 따른다.

| 대상 | 도구 | 이유 |
|---|---|---|
| 기본 | **웹 GPT「디지털 노마드」**(aside) | 디폴트 합성 채널 |
| codex 사용 가능할 때 | **codex 내장 image_gen** (`codex-gpt` 스킬) | 한도 소진 시가 아니라 사용 가능한 동안 쓴다 — 지금은 codex가 살아 있다 |
| 남성 + 시드가 이미 준수 | **웹 Gemini**(aside)로 충분 | 남성은 팍팍한 질감이 오히려 어울려 작업이 쉽다. **반드시 웨이스트샷 이하 구도**로 뽑아 우하단 다이아몬드 로고(~0.88)가 reframe 크롭에서 뜯겨 나가게 한다 |
| 여성 | 보정 프롬프트를 크게 얹고 상위 도구 우선 | 프로젝트가 스튜디오샷 컨셉이라 매끈하고 가다듬은 스튜디오 결과가 기본. 보정 프롬프트의 기여가 크다 |
| 시드 열화·복구 필요(저해상도·측면·훼손) | 복구성 재작업으로 상위 도구 | 간단 터치로 끝나는 건과 구분한다 |

**시드 수집 규칙** — 위키 한 장을 그대로 씨앗으로 쓰지 않는다. 구글 이미지 검색 1페이지에 뜨는 후보군을 한 번 검토하고 고른다 — 개판난 이미지가 시드가 될 수 있다. 수집은 `insane-search`·aside로 하고 신원 근거는 아바타 룰북 「신원」 절을 따른다. 합성 결과는 nobg·reframe 전 단계 산출물이다.

## 시나리오 배정 — 실존 인물 등록 (26.10.03 기준)

[`celeb/celeb-00-03-real-figure-runbook.md`](celeb/celeb-00-03-real-figure-runbook.md)의 각 단계는 이 배정을 따른다. 조사·가이드·사실 판정은 작업자가 맡고, 문장·이미지 생성만 아래로 넘긴다.

| 단계 | 도구 | 메모 |
|---|---|---|
| 0 명단 조사 | 작업자 직접 + `insane-search` | 실존·소속·언론 노출·얼굴 존재 |
| 1 원장 작성 | 작업자 직접 | 한국인이 쓴 한국어 수준 |
| 2 등록·3 배정 | 로컬 스크립트 | 외부 CLI 없음 |
| 4 아바타 | 시드 수집 `insane-search`·aside → **초상화 합성**(위 「아바타 합성」 우선순위) → nobg → reframe | Commons 크롭은 자유라이선스 사진 한정 폴백 |
| 5 인물안내·가상독백 | **agy(Gemini)** | 작업자가 출처를 확인하고 글의 방향·사용할 정보를 리스팅해 전달한다. agy는 그 재료로 한국어 문장만 작성한다 |
| 5 상황 대사·한마디 | **codex gpt-6.1-sol** | 실제 발언 기반 |
| 세력 이미지(단체샷·화보·표지) | **codex 내장 image_gen** | 공통 발주는 이미지 생성·발주 규칙, 테마 표지는 `faction-image` 스킬 |
