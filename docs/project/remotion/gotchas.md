# Remotion 영상·음성 제작 함정 모음

이 문서는 Remotion 기반 영상 제작(북리커맨드·팩션·쇼츠)과 그 음성 파이프라인에서 실제로 겪은 실패와 그 원인을 모은 것이다. 같은 함정을 두 번 밟지 않기 위한 축적물이며, 특히 "이미 시도했다가 폐기된 방향"을 다시 제안하지 않도록 명시한다. 음성 합성·정렬·자막 타이밍 작업 전, 렌더나 미리보기 성능 문제를 진단할 때, 롱폼·카드뉴스 데이터 구조를 건드리기 전, 그리고 렌더·합성 실행 여부를 판단할 때 먼저 읽는다.

---

## 1. 음성 합성

### Gemini TTS는 한국어 사극체를 못 낸다

모델 버전(2.5-flash-preview / 3.1-flash-tts-preview)과 무관하게 한국어 사극체(비장체·낮은 톤·결연·호통·속삭임 같은 시대극 캐릭터 발화) 재현이 불가능하다.

2026-05-01 직접 비교 테스트로 확정했다. Charon·Sadachbia·Algieba 3종 보이스로 사극 4케이스(격노에서 용서로, 비장에서 간청으로, 한자어 사색조, 속삭임에서 외침으로)를 prefix 방식과 3.1 inline 태그 방식 양쪽으로 24개 생성했고, 유저 청취 결과 "2.5나 3.1이나 동일하게 사극체가 불가능함"으로 결론 났다. 한국어 본문에 영어 inline 태그를 넣어도 톤 전환 효과가 미미해 일반체와 구별이 약하다. `[pause]` 태그만 길이 차이로 또렷이 작동했고 톤·register는 그대로였다.

- 사극체·비장체·시대극 캐릭터 발화는 ElevenLabs 전용이다.
- **폐기**: 사극 retone을 명분으로 한 Gemini 3.1 업그레이드. 단가만 2배로 오른다.
- **폐기**: "사극 톤 더 살려보자" 요청에 Gemini 모델 변경·태그 튜닝을 재제안하는 것. retone 파이프라인 보강(tail padding, manual normalize) 또는 ElevenLabs로 우회한다.
- 영어 사극풍·셰익스피어풍 텍스트는 미테스트라 별도 검증이 필요하다. 위 결론은 한국어에 한정된다.

### ElevenLabs v3는 문장 맨 앞 대괄호 태그가 첫 구절을 삼킨다

eleven_v3 모델은 문장 맨 앞에 붙은 대괄호 감정·톤 태그(예: `[속삭이듯, 슬프게] 본문...`)를 연기 지시로 해석하면서, 바로 뒤 첫 구절(주어부 등)까지 함께 흡수해 발화에서 누락시킨다. 한국어에서 특히 잦다.

실측: 입력 "반지의 제왕과 책들은 제게 영웅이라면 마땅히 세상을 구해야 한다는 사명을 일깨워주었습니다."에서 음성은 "제게 영웅이라면..."부터 나왔다("반지의 제왕과 책들은 " 누락). 감정 표식을 끄니 정상이었다.

원인은 remotion-bo 음성 패널의 buildEleText가 `[감정] 본문` 형태로 태그를 맨 앞에 붙이는 데 있다(scenario-voice/types.ts).

- "ElevenLabs 생성 텍스트 앞부분이 안 들어간다" 류 신고를 받으면 감정·톤 표식(페이지 기본 톤 eleSendOpts, 구간 톤 segmentMeta.tags) 켜짐 여부를 가장 먼저 의심한다.
- 텍스트 조립·route는 앞을 자르지 않으므로 그쪽을 헤매지 않는다.
- 임시 회피는 표식 끄기다. 표식을 살리려면 태그를 첫 구절 뒤로 밀거나 본문과 분리하는 방식이 후보지만, 효과 확인에 유료 생성이 필요하다.

### Gemini TTS 키 로테이션

마지막 성공 키는 **35**(2026-06-27 기준. 23으로 시작해 23~34가 모두 429, 35에서 성공).

- TTS 호출 시 반드시 `--start-key 35`를 지정한다. 미지정 시 1번부터 시작해 429를 여러 번 맞고서야 도달하므로 시간을 버린다.
- 키 할당량은 시간이 지나면 리셋되므로(대체로 일일) 며칠 뒤에는 낮은 번호부터 재사용할 수 있다. 다만 신뢰하지 말고 실제 429가 나면 이 문서를 갱신한다.
- 이력: 17(2026-05-01) → 69(2026-05-09) → 23(2026-06-13) → 35(2026-06-27).

### voice 생성에는 `--normalize`가 필수다

`pnpm voice -- --episode <name> --long --update-json` 실행 시 반드시 `--normalize`를 포함한다. 없으면 생성된 wav가 라우드니스 정규화되지 않아 볼륨이 들쭉날쭉하고 영상 믹스 단계에서 음량 차이가 드러난다.

이순신 에피소드에서 `--normalize`를 빠뜨려 12건 전부 정규화 없이 넘어갔고, 유저가 "보이스 정규화가 파이프라인에 없나?"로 지적해 사후 보정했다.

- 롱폼: `pnpm voice -- --episode <name> --long --update-json --normalize`
- 쇼츠: `pnpm voice -- --episode <name> --shorts 1 --update-json --normalize`
- 정규화 단독 실행: `pnpm voice -- --episode <name> --long --normalize` (TTS 없이 OUT_DIR wav 일괄 loudnorm)
- 타겟은 I=-19 LUFS, TP=-1.5, LRA=11, linear 모드. 원본은 `.raw/`에 자동 백업된다.
- ElevenLabs 엔진일 때는 정규화가 자동 스킵된다.
- 완전한 순서는 voice → normalize → whisper → analyze.

### 파이프라인 실행 전 tts 오버라이드를 확인한다

에피소드 JSON의 `tts` 오버라이드 섹션을 반드시 확인한다. TTS는 오버라이드 텍스트로 음성을 만들지만 화면 자막은 `segments[].text` 원문을 표시하므로, 오버라이드가 있으면 화면과 음성이 어긋난다.

마르쿠스 아우렐리우스 쇼츠에서 `tts.shorts[7]`, `tts.shorts[9]`에 오버라이드가 있는 것을 확인하지 않고 파이프라인을 돌려 자막과 음성이 불일치했고, 존재를 모른 채 여러 번 재생성하며 시간을 버렸다.

- 파이프라인 시작 전 `grep "tts" episode.json`으로 유무를 확인하고, 있으면 화면 텍스트와의 차이를 파악한 뒤 필요시 동기화하고 진행한다.

### TTS가 텍스트를 변조했다고 의심하지 않는다

오디오와 텍스트가 다르면 TTS 변조가 아니라 내 분석이 틀렸거나 잘못된 소스를 참조한 것이다. 유저는 TTS 변조 가설 제기를 명확히 거부했다.

불일치 발견 시 점검 순서: (1) 어떤 텍스트로 생성했는지 (2) JSON 소스가 최신인지 (3) 세그먼트 매핑이 올바른지.

### 백오피스 볼륨 부스트는 청감상 효과가 없다

`packages/shared/src/bo/voice-utils/audio.ts`(26.07.25 승격 전 `sw/remotion-bo/src/components/voice-utils/`)의 `applyGain`은 곱하기 직후 DynamicsCompressorNode를 limiter로 통과시킨다(threshold -6 dBFS, ratio 20:1, knee 6 dB). 이 강한 압축이 부스트한 신호를 즉시 평탄화해 1.5배를 주든 2배를 주든 결과가 같다.

2026-05-02 제갈량 쇼츠2 검증에서 발견했다. 측정상 RMS는 +2~3 dB 오른 것처럼 보여도 인지 라우드니스는 정체했고, 유저가 "1.5배든 2배든 그대로였다"고 명시 보고했다. 같은 wav를 ffmpeg `volume=1.3,alimiter=limit=0.891`로 처리하니 즉시 "압도적으로 더 크게" 들렸다.

- wav 음량을 실제로 키울 때는 백오피스 부스트 UI를 신뢰하지 말고 ffmpeg로 직접 처리한다.
- 라우드니스 통일 우선이면 `loudnorm=I=-12:TP=-1.0:LRA=11` 2-pass linear(`sw/remotion/scripts/voice/2-synthesize/normalize.ts` 참조).
- 단순 N배 부스트는 `volume=N,alimiter=level_in=1:level_out=1:limit=0.891:attack=5:release=50`. 1.3~1.5배를 권장한다. true peak는 sample peak보다 0.5~1 dB 높게 나올 수 있다.
- 처리 전 원본은 `.raw/`(normalize.ts가 자동 백업)나 별도 `.before-*` 폴더에 보존한다.
- 근본 수정은 부스트 UI의 limiter를 완화하거나(threshold 0 dB / ratio 2:1 / true-peak 모드) GainNode만 쓰는 것이다. 발견 시점에는 수정하지 않았다.

---

## 2. 음성 정렬과 자막 타이밍

### 폐기된 정렬 방식 (재제안 금지)

음성 파이프라인(2-whisper.py, 3-timings.ts) 수정 제안 시 아래 세 방향은 이미 실패 이력이 있다. 대안을 제시할 때 이 목록을 먼저 배제하고 시작한다.

| 폐기 방향 | 실패 원인 |
|---|---|
| wav2vec2 forced alignment에 원고 text 직접 전달(`whisperx.align(synth_segments, ...)`) | wav2vec2 한국어 모델은 원고를 타겟으로 줘도 정렬에 실패한다. 숫자·한자·고유명사 구간이 어긋난다 |
| WAV silence 분할 + 음절 비례 분배(ASR을 건너뛰고 RMS silence만으로 phrase 경계 추정) | silence 경계 검출 자체가 한국어 TTS 오디오에서 신뢰 불가 |
| ASR + diff-match-patch 단독(현재 방식) | 부분적으로 작동하지만 숫자 literal digit 재구성과 시간창 압축(예: "1576년" 140ms) 버그가 상존한다. 근본 해결이 아니라 현상 유지용이다 |

2026-04-11 이순신 에피소드의 숫자·한자 하이라이트·앵커·발음 붕괴 분석 중 위 방향들을 순차 제안했고 유저가 "다 망했던 방식"이라며 회수를 지시했다. 기계적 파이프라인만으로는 한국어 숫자·고유명사 alignment가 안정화되지 않는다는 것이 유저의 경험적 판단이다.

남은 현실 경로는 **ASR+diff 유지 + LLM 보정 후처리**다. LLM이 오디오는 못 듣지만 whisper text와 display_text 대조로 오인식을 교정하고 비상식적 duration을 재분배할 수 있다. 기계적 방식으로 또 다른 "스마트한" 묘수를 찾으려 하지 않는다.

### sub 청크 분할은 LLM이 손으로 한다

쇼츠·롱폼 voiceTimings의 sub 청크를 글자수 임계나 어절 묶음 알고리즘으로 일괄 자동 분할하지 않는다. remo-voice-sync 스킬의 분할 우선순위대로 LLM이 한 sentence씩 직접 작성한다.

2026-05-10 elon-musk 쇼츠1에서 어절 글자수(평균 8자, 최대 12자) 기준으로 81개를 자동 분할했다가 관형절과 피수식어 분리("평생 품어 온 / 단어입니다", "1961년 출간된 SF / 명작"), 고유명사 파괴("'낯선 땅 / 이방인'으로"), 의미 단위 무시가 한꺼번에 터졌다. 유저가 "단위를 제멋대로 자르면 어떻게 해"라고 강하게 지적했다. `sub.join === text` 검증 통과만 보고 의미 단위를 검토하지 않은 것이 직접 원인이다.

분할 우선순위:
1. 쉼표 뒤(5-chunk.ts가 자동 처리)
2. 절 경계 — 연결어미(~고, ~며, ~지만, ~면, ~서, ~여) 뒤
3. 주어·목적어 뒤 — ~은/는/이/가/을/를 뒤
4. 수식절과 피수식어는 한 덩어리

절대 금지:
- 고유명사 파괴(`'낯선 땅' / '이방인'`, `맨해튼 / 프로젝트`)
- 관형절과 피수식어 분리(`평생 품어 온 / 단어`)
- 보조용언 분리(`만들 / 겁니다`, `할 수 / 있을까요`)
- 지시사와 체언 분리(`이 / 책을`, `그 / 점에`)

검증은 두 단계다. (1) `sub.join(' ') === text` 자동 검증, (2) 각 청크가 단독으로 읽혀도 의미가 통하는지 자가 점검. 한 sentence라도 어색하면 그 sentence 전체를 다시 쓴다. "대부분 맞으니 넘긴다"는 금지다. 유저는 한 단위라도 어긋나면 결과 전체를 거부한다.

참고: 팩션 대사 자막 덩어리(quoteChunks) 분할도 같은 원칙으로 Claude가 수동 처리한다.

### 옛 대본 잔재 wav가 배속 산출을 오염시킨다

대본을 개작한 뒤 재생성하지 않은 옛 wav가 남으면 배속 산출(remo-voice-cps-match)이 망가진다.

증상은 한 필드가 "N자 ÷ 비정상적으로 긴 wav합 = 낮은 자/초 → ×2.0 클램프"로 계산되어, 정상 음성이 2배속으로 폭주하는 것이다(elon-musk 책10 후속2가 10.9자/초로 떠 보인 사례). 원인은 match-cps의 wav 매칭 정규식이 멀티토막 접미사 `_\d+`(예: `D10d4_2-after.wav`)를 같은 필드로 합산하는 데 있다. 이 접미사가 정상 멀티토막이 아니라 옛 대본 잔재이면 현재 텍스트 글자수(짧음)를 잔재 포함 wav 길이(긺)로 나누게 되어 자/초가 절반 이하로 떨어진다. 실제 발화는 토막마다 5자/초 안팎으로 정상인데도 배속이 과도하게 잡히므로 무음 문제로 오인하기 쉽다.

대처:
1. `3-transcribe.py`가 "잔존 WAV N건 — 에피소드에 해당 세그먼트 없음"을 보고하면 흘리지 않는다. 잔재 후보다.
2. 판별은 각 wav 세그먼트 텍스트가 현재 `book.ko.json`(quote/after/contextMain)에 있는지 대조한다. **0개 매칭이면 잔재**다. 부분 매칭(뒷 문장만 없음)이면 wav 자체가 옛 버전이므로 재생성 대상이다.
3. 잔재는 삭제하지 말고 `voice/<locale>/_backup-stale-wav/<engine>/`으로 옮긴다(복구 가능). 그 뒤 match-cps를 다시 산출한다.

### 발화속도 통일 스킬 (remo-voice-cps-match)

북리커맨드 음성의 체감 발화속도(자/초)를 목표값으로 통일한다. 호출어는 "배속 맞춰줘", "발화속도 통일", "자초 맞춰".

- 스크립트: `sw/remotion/scripts/voice/match-cps.ts` (`pnpm voice:match-cps --episode <ep>`)
- 원리: 배속 r = 목표자초 ÷ (공백 제외 글자수 ÷ wav 실측 길이). clampRate 0.5~2.0. 토막은 wav를 전부 합산해 필드 평균을 맞춘다.
- 저장 위치: `book.ko.json`의 `*PlaybackRate`(summary/contextMain/quote/after). remotion playback-rate.ts가 `<Audio playbackRate>`로 렌더에 반영한다. 원본 wav와 타이밍은 바뀌지 않는다.
- 기본 목표는 6.5자/초, 제목은 기본 제외(`--include-title`로 포함), dry-run이 기본이고 `--apply`로 저장한다.
- 자/초 표시는 BO ScenarioRow.tsx(공백 제외 글자수 ÷ wav길이/배속). `×N` 표시가 있으면 영상 배속이 걸린 것이다. 하단 ×2는 미리보기 전용(localStorage)이라 무관하다.
- 엔진은 `voice-select.json`의 slots[파일명] ?? default(gemini).

### align 출력의 0s를 컷 묻힘으로 단정하지 않는다

`pnpm voice:align` 출력에 `imageChangeAt "..." #1 → 0s (sentence)` 같은 줄이 보여도 "그 컷 전환점이 영상 시작점에 몰려 첫 컷이 묻힌다"고 단정하지 않는다.

2026-05-10 elon-musk 쇼츠1 explanation-4에서 두 텍스트 앵커가 0s로 표기된 것을 보고 첫 컷(final-17a) 누락을 보고했으나, 실제 렌더에서는 4컷이 모두 정상 노출되고 있었다. align 로그의 0s가 곧 영상 누락은 아니다. whisper가 합성 음성을 호흡 단위로 묶어 sentence boundary가 합쳐졌더라도, voiceTimings의 sub 분할 시점이나 word-timing 보조 정보가 컷 전환점을 따로 잡아주는 경로가 있다.

- `→ 0s (sentence)`는 sentence 단위 매칭의 기본 fallback일 수 있다. 실제 timing.json의 컷 시각이나 렌더 영상으로 검증한 뒤 보고한다.
- 확인하지 못했으면 "확인이 필요한 의심"으로만 말하고 단정하지 않는다.
- 유저가 영상에서 정상 동작을 확인했다고 하면 그 보고를 신뢰하고 추가 보정을 시도하지 않는다.

### elon-musk 1권 모드(solo)는 폐기됐다

elon-musk 「서재 탐방」에서 "롱폼"은 10권짜리 본편(타이밍 키 `D01`~`D10`, 그리고 intro/philosophy/outro인 B1·B2·E1)을 가리킨다. 1권 모드(SOLO, 타이밍 키 `solo-B01/S**-s*`)는 폐기됐다.

같은 `meta.ko.timing.json` 안에 solo 세그먼트가 남아 있어 `voice:align --long`·`voice:chunk` 검증에 함께 걸려 나오지만 렌더에 쓰이지 않으므로 무시한다. 유저가 "솔로는 다 폐기, 롱폼이라고 하면 10권짜리 내용물"이라고 명시했다(2026-07-01). AGENTS.md TODO의 "1권 모드(SOLO) 음성 외 완료" 항목과 배치되면 유저 지시를 우선한다.

머스크 음성 파이프라인·발화속도·렌더 작업 시 `solo-B01/*` 세그먼트의 경고(과대·비정상 짧음 등)는 조치 대상에서 제외한다.

---

## 3. 렌더와 미리보기

### 켜둔 Studio는 모듈 경로 개편을 못 따라온다 — "(module has no exports)" 경고는 재시작부터

공용 패키지 승격 등으로 import 경로가 바뀌면, **떠 있던 Studio의 webpack이 옛 캐시로 새 모듈을 빈 모듈로 읽어** `export 'X' was not found in './voice-names' (module has no exports)` 류 경고를 쏟는다(26.07.26 담화 voice-names 승격 직후 실사례). 진위 판별 순서: ① `npx remotion bundle`(프로덕션 번들)에서 경고 0이면 코드는 무결 ② 새 포트로 Studio를 새로 띄워 경고가 사라지면 캐시 확정 → **기존 Studio 재시작이 해법.** tsc 통과는 번들 통과를 보장하지 않으므로, shared를 엔진 번들에 처음 물릴 때는 번들 레벨 검증을 한다.

### renderStill 컴포넌트의 이미지는 Remotion `<Img>` 필수

renderStill(@remotion/renderer)로 정지 이미지(카드뉴스 등)를 뽑을 때 이미지는 반드시 `import { Img } from 'remotion'`을 쓴다. 일반 `<img>`는 로드 완료를 기다리지 않고 캡처되어, 특히 외부 URL 이미지(R2 avatar 등)가 누락된다.

`<Img>`는 onload까지 delayRender로 렌더를 붙잡지만 일반 `<img>`는 붙잡지 않는다. 증상은 로컬 staticFile 이미지(책 표지)는 뜨는데 외부 URL 이미지(avatar_url)만 빈 배경으로 나가는 것이다. Remotion Studio 미리보기에서는 실시간이라 로드를 기다려 멀쩡히 보이므로 더 헷갈린다. BookCard 카드뉴스 출고(`render:cards`)에서 전 인물 얼굴이 누락된 적이 있다.

부가: `render:cards` 번들은 public 전체(팩션 이미지 포함)를 Temp로 복사하므로, 반복하면 `Temp/remotion-*`이 쌓여 ENOSPC(디스크 풀)가 날 수 있다. 가끔 정리한다.

### 렌더 스크립트 stdout에 손대지 않는다

`sw/remotion/scripts/render/render-all.ts` 및 유사 핫패스에 `process.stdout._handle.setBlocking(true)` 같은 동기 쓰기 강제, console.log 플러시 훅, 그 외 stdout 동작 변경 코드를 넣지 않는다.

2026-05-05 빈센트 롱폼 렌더 중 비-TTY 블록 버퍼링으로 진행 로그가 안 보여 setBlocking(true)을 시도했더니 유저가 "혹시라도 렌더 늦추거나 방해할 가능성이 있으면 빼라"고 명시했다. 실제 성능 영향은 무시할 수준(write당 마이크로초)이지만 유저는 렌더 안정성을 우선한다. 렌더는 한 번에 30분에서 1시간 걸리는 작업이라 작은 변동도 허용하지 않는다.

진행 가시화가 필요하면 stdout 대신 이 중 하나를 쓴다.
- `fs.appendFileSync`로 사이드카 진행 로그 파일에 기록
- 외부 폴링(렌더 산출 디렉토리 mtime 등)
- 유저가 직접 TTY 터미널에서 실행

어느 쪽이든 렌더 스크립트 본체에 끼워 넣기 전에 유저에게 한 번 더 확인한다.

### Studio 미리보기 렉은 추측하지 말고 실측부터

"1배속도 못 돌린다" 류 신고를 받으면 코드를 훑고 추측하지 말고 프로파일을 먼저 뜬다.

팩션 01 렉 사건(2026-07-02)에서 1차 추측(영상 인코딩)이 빗나갔다. 실측하니 페인트가 아니라 JS가 97%였고, 범인은 FactionBgm의 덕킹 `duckAt`이었다. 음량 콜백이 호출될 때마다 68명 발화 구간 전체를 bezier easing으로 interpolate하며 훑었고, Studio 타임라인이 음량 곡선을 그리느라 이 콜백을 수만 번 호출했으며, 매 프레임 buildCues를 재계산했다. 단일 구간 탐색 + useMemo + React.memo(FactionBgm)로 11fps에서 60fps 이상으로 회복했다.

측정 방법: scratchpad에 `npm i puppeteer-core` → 실행 중인 Studio URL을 열고 스페이스로 재생 → (1) rAF 델타로 실효 fps와 `page.metrics()`로 Script/Style/Layout 분해, (2) CDP `Profiler.start/stop`으로 셀프타임 상위 함수 집계. 헤드풀 Chrome(`C:/Program Files/Google/Chrome/Application/chrome.exe`)을 쓰고, goto는 "frame detached"가 잦아 newPage 재시도 루프가 필요하다.

교훈:
- `<Audio volume={fn}>` 콜백은 재생 프레임마다뿐 아니라 Studio 타임라인이 음량 곡선을 그리며 구간 전체에 대해 호출한다. 콜백 안에서 전 구간 배열을 루프하거나 bezier easing을 남발하지 않는다. 병합·정렬된 구간에서 해당 구간 하나만 계산한다.
- 콜백 참조도 memo로 고정해야 곡선 캐시가 산다.
- 컴포지션 최상위는 useCurrentFrame으로 매 프레임 재렌더되므로 프레임과 무관한 자식(BGM 등)은 React.memo로 끊고, 컷 레이어는 화면 밖이면 내용 생성 전에 null을 반환한다.

---

## 4. 데이터 구조

### 롱폼 본문 토막별 독립 설정

book-recommend 롱폼(요약·감상배경·후속맥락)을 여러 토막으로 나누면 각 토막이 화자·음량·배속·효과음을 독립 보유한다(2026-07 구현).

- 토막 1개(분할 안 함): 기존 단일 필드(`afterSpeaker`·`summaryGainDb` 등) 그대로. JSON과 동작이 바뀌지 않는다.
- 토막 2개 이상: 배열 필드 `*PartSpeakers`/`*PartGainDbs`/`*PartPlaybackRates`/`*PartSfxs`(after/summary/contextMain 12종). 읽기 폴백은 `배열?.[p] ?? 단일값`이다. 토막 인덱스 p는 `bookFieldParts(본문, *Parts)` 순서이며 음성 파일명 part 인자(`vnBookAfter(i,pi,ap)` 등)와 같다.
- 관련 파일: types.ts, BO 편집기(useLongformState의 `updateBookPartSetting`/`updateAfterPartSetting`, BookSection·QuotePairRow footer가 전 토막 노출), 렌더 legacy/BookRecommendLongLegacy.tsx, playback-rate.ts, longform-sfx.ts, 음성 jobs.ts.

**결함 이력(2026-07-03 전수정 완료)**: 현역 legacy 렌더에는 롱폼 오디오의 물리적 `playbackRate`가 아예 빠져 있었다(`_not-using` 쪽에는 있었다). applyPlaybackRates가 타임라인과 자막 시각만 1/r로 줄이고 오디오는 원속으로 재생해 배속 지정 구간이 뒤에서 잘려나갔다("대사가 끝까지 안 나오고 끊긴다"). 요약·감상배경·후속맥락 세 구간을 먼저 배선했고, 제목과 인용 오디오도 2026-07-03에 배선을 마쳤다(BookRecommendLongLegacy.tsx 제목 Audio에 `clampRate(book.titlePlaybackRate)`, 인용 Audio에 `clampRate(book.quotePairs[pi].quotePlaybackRate)`). elon-musk 롱폼은 10권 전 인용에 quotePlaybackRate 1.01~1.35가 걸려 있어 전권 인용이 잘리던 상태였다. 배속 미설정이면 `clampRate(undefined)=1`이라 동작은 불변이다.

### `faction-data.json`을 직접 편집하지 마라

팩션의 `sw/remotion/public/factions/<편>/faction-data.json`은 **원천이 아니라 산출물**이다(26.07.25 통합). 텍스트·구성의 단일 원천은 Supabase 5테이블이고, 이 파일은 `pnpm faction:export`가 DB에서 만들어 낸다. 렌더가 webpack 빌드타임에 이 파일을 동기 스캔하는 구조라 DB를 직접 못 읽어서 파일을 남기는 것이다.

- 파일 첫 키에 `_generated {from, at, episodeId, checksum}` 마커가 붙는다. **checksum이 안 맞으면 다음 내보내기가 중단되고 diff를 뿜는다**(`--force`로만 강행). 즉 손으로 고치면 그 편의 저장·렌더 흐름이 멈춘다.
- 수정은 web-bo `/factions` 편집 화면에서 한다. 저장하면 내보내기가 자동으로 따라 붙는다.
- 이미 손으로 고쳐 버렸으면 `pnpm faction:import -- --episode <편>`으로 DB에 재흡수한다. **임의로 실행하지 않는다** — DB가 더 새로울 수도 있어 반대 방향으로 덮어쓸 위험이 있다. 어느 쪽이 최신인지 확인하고 사람이 판단해 실행한다.
- 드리프트 상시 확인은 `pnpm faction:verify --drift`, 편별 검증은 `--episode <편>`.
- 실사례: `Gods-Greek-Compact`는 이관 뒤 사람이 JSON을 더 고쳐(대사 148곳 차이) 파일이 DB보다 새로운 상태로 남았다. 가드가 이 편의 내보내기를 막아 되돌림 사고는 안 났다.

### remotion-bo에서 팩션을 편집하려 하지 마라

팩션 편집·렌더·유튜브·카드·출간은 26.07.25에 web-bo로 옮겼고 remotion-bo의 팩션 구역은 전량 삭제됐다. **remotion-bo(3003)의 팩션 주소·창구는 404다.** 편집은 web-bo(3001) `/factions`에서 한다. remotion-bo에 남은 것은 담화·서재 탐방이다.

- 이름만 팩션인 잔존물에 속지 않는다 — `lib/faction-edit-route.ts`는 담화가 쓰는 공용 상수이고, `api/[series]/cards/[name]`은 서재 탐방 카드뉴스다(디스크 파일명이 `faction-cards.json`이라 개명하면 데이터가 끊긴다).
- 사진·음성 같은 로컬 자산은 그대로 `sw/remotion/` 디스크에 있다. web-bo의 팩션 자산 창구는 `sw/web-bo/.env`의 `FACTION_LOCAL=1`이 없으면 503과 사유를 낸다.

### 현역 롱폼 컴포넌트가 legacy라는 함정

sw/remotion BookRecommend 롱폼은 이름이 거꾸로 붙어 있다. 디버깅 전에 반드시 확인한다.

- **현역(실제 -L-VID 렌더)**: `legacy/BookRecommendLongLegacy.tsx`(Root.tsx가 `BookRecommendLegacy`로 import) + `legacy/BookCardVisualLegacy.tsx` + `legacy/CinematicPanelLegacy.tsx` + `legacy/PortraitSubtitles.tsx`.
- **미사용 테스트**: `BookRecommendLong.tsx` + `sections/BookCardVisual/{BookCardVisual,CinematicPanel,index}` + `sections/{GuideVoice,LongSubtitles}` + `caption-format.tsx`. Root.tsx에서 도달 불가하며 2026-06-29에 `compositions/BookRecommend/_not-using/`으로 격리하고 tsconfig에서 exclude 처리했다.

이미지 앵커 매칭이나 자막 점등이 화면에서 이상하면 `sections/BookCardVisual`(신·테스트)을 고쳐도 소용없다. 반드시 `legacy/BookCardVisualLegacy.tsx`의 `resolveImageTransitions`를 본다. 이 헛다리로 한 번 크게 돌았다.

고친 버그 참고: 다토막(summaryParts/contextMainParts) 책에서 legacy가 토막별 음성 타이밍을 `mergePartTimings`로 병합해 놓고도 이미지 매칭(`resolveImageTransitions`)에 넘기지 않아, 첫 토막 음성만 잡히고 둘째 토막부터 이미지가 전부 스킵됐다. 병합 타이밍을 summary/context 키에 덮어써 넘기도록 고쳤다.

dead 코드 판별은 `Root.tsx`부터 import 그래프 BFS로 reachable을 계산하는 것이 정확하다(export만 되고 composition으로 미사용인 경우를 잡으려면 index.ts의 re-export도 끊고 재계산한다).

### SNS 카드뉴스 (BookCard)

북리커맨드 인물·책 SNS 카드뉴스. SSoT는 `docs/project/card-news/IMPLEMENTATION.md`.

- **렌더러**: `sw/remotion/src/compositions/BookCard/BookCard.tsx`. 카드 7종(intro·shelf·cover·context·quote·number·cta). 대출카드(librarycard)는 폐기했다. 자매 컴포넌트는 `FactionCard/`. utils 의존을 끊고 자체 `resolveSrc(src, assetBase)`를 쓴다(remotion 렌더는 staticFile, 외부 앱은 assetBase). `josa`를 export한다. intro 소개 한 줄은 featuredQuote를 우선한다(philosophy 첫 문장은 "안녕하십니까" 같은 독백 인사라 후순위).
- **미리보기**: remotion-bo Cards 탭 `/book-recommend/<인물>/cards`. @remotion/player로 BookCard를 띄운다(remotion-bo에 원래 영상 미리보기가 없어 엔진을 추가했다. `transpilePackages:['@feelandnote/remotion']`, deep import `@feelandnote/remotion/src/...`). 로컬 표지는 `/api/rm-asset/[...path]`로 서빙한다(remotion public, 한글 폴더 디코딩). 기능은 A/B 토글·책 선별·비율(4:5·1:1·9:16)·편성 저장.
- **편성**: A「읽은 책 N권」= 후크 → intro → 대표 5권 cover → cta(캐러셀 8장). B「한 권 깊게」= cover → context 문단별 → cta. 짧은 책은 A, 깊은 책은 B.
- **편성 저장**: `public/episodes/<인물>/cards.json`에 `{version,selected}`. API는 `/api/<series>/cards/<name>`(server-utils findEpisodeDir). 영상 데이터와 분리돼 있다.
- **출고**: `pnpm render:cards`(scripts/render/render-cards.ts) → `out/cards/<인물>/<비율>/NN-종류.png`. SNS 업로드는 수동이다(인스타·쓰레드 자동 불가).

---

## 5. 환경

### remotion-bo 프로덕션 빌드는 webpack 고정

`sw/remotion-bo`의 프로덕션 빌드는 webpack으로 한다. package.json에 `"build": "next build --webpack"`.

Next 16 기본 빌더 Turbopack이, youtube 관리 route들(`youtube/meta`·`status`·`status-all`·`sync`·`thumb`, 그리고 26.07.25에 삭제된 `faction-card-export`)이 `path.join(process.cwd(),'..','remotion','out',...)`으로 렌더 산출물 `out/`을 fs 스캔하는 것을 정적 분석하다 `out/` 디렉토리를 번들 자산으로 추적하고, 한글명 파일 `out/Faction/02-페이팔마피아-KO-LV.srt`를 심볼릭 링크로 오인해(`points out of filesystem root`) 빌드를 중단시킨다. 경로 상수를 핸들러 내부로 옮기거나 force-dynamic을 붙여도 일관되게 풀리지 않는다. webpack 빌드가 이 버그를 회피한다.

dev(`next dev`, turbopack)는 lazy 컴파일이라 해당 route를 호출하지 않으면 터지지 않는다. dev는 그대로 두고 build만 webpack으로 한다. 빌드가 `.next`를 덮으므로 떠 있던 dev 서버는 한 번 재시작해야 한다.

### whisperx는 Python 3.12로 실행한다

음성 파이프라인 3단계 `voice:transcribe`(`scripts/voice/3-transcribe.py`)는 whisperx 모듈을 임포트한다.

- Bash tool의 기본 `python`은 Claude 에이전트 venv(`hermes-agent/venv`)를 가리키며 whisperx가 없다. `ModuleNotFoundError: No module named 'whisperx'`로 실패한다.
- whisperx는 Python312(`C:\Users\webco\AppData\Local\Programs\Python\Python312`, `py -3.12`)에만 설치돼 있다(torch·pyannote 스택 포함).
- 따라서 `py -3.12 scripts/voice/3-transcribe.py …`로 호출한다. `python scripts/...` 직접 호출은 금지다.
- whisperx CLI 단건 STT도 Python312의 CLI를 쓴다.

### R2 음성 파일 경로

- **web-bo 원본**: `celebs/{celebId}/voice/{locale}/{fileName}.mp3` — 명언(quote.mp3), 대사(g1.mp3 등). 이 경로는 유효하다.
- **remotion 영상 음성**: 로컬 `public/voice/{episode-name}/` 전용이다. R2 동기화 시스템(voice-r2.ts, r2-manifest.json)은 2026-03-23에 **폐기**했다.

R2는 일반 스토리지(셀럽 아바타 등)로만 쓴다. 영상 제작 음성은 로컬에서 직접 관리해 복잡도를 줄인다. remotion 음성 파이프라인(voice → whisper → analyze)만 사용하며 R2 업로드·다운로드 명령은 없다.

---

## 6. 작업 규칙

### 렌더는 명시적으로 시킬 때만 돌린다

`pnpm render`(영상 mp4 생성)는 유저가 "렌더해", "돌려봐"라고 할 때만 실행한다. "바꿔봐", "수정해", "적용해"는 코드 수정만 뜻한다. 코드를 고친 뒤 결과를 보여주려고 임의로 렌더를 돌리지 않는다.

렌더는 수 분에서 한 시간까지 걸리고 유저 작업 흐름을 방해한다. 같은 실수를 두 차례 지적받았다("롱폼 돌리라 한 적 없는데", "랜더 하라고 안했는데 뭐지"). 코드 수정 후에는 "확인하려면 렌더할까?"라고 묻고 대기한다.

### 음성 합성·파이프라인도 유저 요청 시에만

모든 음성 합성(Gemini · ElevenLabs · 파이프라인)은 유저가 명시적으로 요청할 때만 실행한다. 텍스트가 바뀌었다고 자동으로 wav를 지우고 `voice:tts`를 돌리지 않는다. align·chunk도 마찬가지다.

이유는 셋이다. (1) ElevenLabs는 LLM이 품질을 판단할 수 없어 유저가 사이트에서 직접 듣고 선별한다(`scripts/voice/2-synthesize/main.ts:79` 주석). (2) Gemini도 유저가 톤·자연스러움을 본인 귀로 검수해야 하는데, 텍스트가 바뀌었다고 즉시 재합성하면 검수 사이클을 가로챈다. (3) 합성·정렬은 시간과 키를 소모하므로 유저 페이스에 맞춰야 한다.

- 텍스트만 바꾸고 멈춘다. "음성 재생성 필요"만 보고하고 응답을 기다린다.
- 유저가 "음원 만들어줘", "재생성 ㄱ", "voice 다시"라고 해야 `voice:tts`를 실행한다.
- 파이프라인(transcribe·align·chunk)도 "파이프라인 돌려줘", "/voice-sync", "sub 채워줘" 같은 명시 요청 시에만 돌린다.
- ElevenLabs 슬롯은 Claude가 절대 합성하지 않는다. `--engine elevenlabs` 사용 금지.
- ElevenLabs 감정 태그 prefix 주입을 위한 `tts.replace` 편법 금지.
- celeb 오디오 변경은 유저가 "celeb-N 됐다"고 통지해야 후속 작업을 진행한다. 단어수 불일치 등으로 celeb 오디오가 구버전인지 선제적으로 점검·경고하지 않는다.

### 쇼츠 기반 롱폼 섹션은 수정하지 않는다

롱폼(ko.json) 책 섹션 중 images 배열이 `shorts/s1/`, `shorts/s2/` 같은 쇼츠 폴더 이미지로 주로 구성된 섹션은 쇼츠 스크립트에서 끌어온 것이다. 이런 섹션의 텍스트(contextMain·quote·after)는 수정·검토 대상에서 제외한다.

쇼츠가 단일원천이고 롱폼은 그 변환본이므로 롱폼만 고치면 어긋난다. 유저가 "쇼츠 기반은 냅두라"고 반복 지시했다.

- 책 섹션 검토 전 images 배열을 먼저 본다.
- `shorts/s*/` 경로가 약 50% 이상이면 쇼츠 기반으로 판단하고 제외한다.
- 비판적 검토·문장 다듬기·억지 연결 진단 등 모든 텍스트 작업이 차단 대상이다.
- 유저가 명시적으로 "쇼츠도 같이 손봐 달라"고 할 때만 예외다.

### 타이밍 저장이 원문을 덮어쓰지 않게 한다

VoiceTimingEditor 저장(SyncModeContent.handleSave) 시 토막 배열을 `segs.join(' ')`로 합쳐 원문 필드(shorts seg.text, books summary 등)에 다시 쓰는 경로를 만들지 않는다. 토막 분할이 `text.split(/\s+/)` 기준이라 `\n`·`\n\n`이 모두 같은 공백으로 취급되고, 다시 원문으로 들어가는 순간 문단 나눔이 영구 손실된다.

2026-05-06 zhuge-liang shorts-3/S06-celeb-zhuge-2에서 유저가 "타이밍 저장 (텍스트 포함)"을 누른 직후 7개의 `\n\n`·`\n`이 모두 단일 공백으로 뭉개졌다. 원문은 git 미추적이라 git으로 복구할 수 없었고, 직전 대화에서 읽어둔 원본 덕에 수동 복원했다.

- 저장 핸들러는 `voiceTimings[secKey][i].text`(토막별 자막)만 갱신한다. 원문(seg.text·summary·contextMain 등)은 절대 갱신하지 않는다.
- 원문 수정이 필요하면 SyncModeContent의 "원문 텍스트" 영역에서 직접 편집한다. 유저 입력은 `\n`을 그대로 유지한다.
- 어떤 분할 함수든 `/\s+/` 또는 `split(' ')` 후 `join(' ')` 라운드트립은 줄바꿈을 파괴한다. 이 패턴이 원문에 닿는 순간을 항상 막는다.
- VoiceTimingEditor 내부의 `splitTextAtRatio`·`shiftWord`도 `/\s+/` join 기반이지만 토막 자막 표시용이라 원문에 닿지 않는 한 괜찮다.

### 타이밍 저장은 상태가 아닌 ref에서 읽는다

VoiceTimingEditor 세그먼트 텍스트 저장 시 React 상태 전파 체인(onSegmentsChange → onEpisodeChange → setEpisode)은 stale closure로 실패할 수 있다. 여러 컴포넌트를 거치면 클로저가 이전 렌더의 데이터를 캡처해 최신 데이터가 누락된다. SyncModePanel을 독립 컴포넌트로 두고 segmentsRef를 직접 읽는 패턴이 확실하다.

- 저장 버튼은 상태가 아니라 ref에서 직접 데이터를 읽어 조립한다.
- 유저 파일(에피소드 JSON 등)을 테스트 목적으로 직접 수정하지 않는다. 데이터 손상 위험이 있다.
- voiceTimings의 text 필드는 수동 오버라이드 전용이다. 없으면 자동 문장 분할로 동작한다.
