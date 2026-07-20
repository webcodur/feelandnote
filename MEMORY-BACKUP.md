# 기억 전체 백업

> 백업일: 2026-07-20
> 원본: `C:\Users\webco\.claude\projects\C--project-feelandnote\memory\`
> 개별 기억 파일 전문을 한 파일로 합친 것이다. 원본은 그대로 살아 있다.
> 이 파일은 읽기용 사본이며, 기억을 고칠 때는 원본 폴더를 고친다.

---

## feedback_adaptation_within_source_bounds

```markdown
---
name: feedback_adaptation_within_source_bounds
description: 쇼츠·롱폼 각색은 롱폼 원문 검증 범위 내로. 원문 밖 프레이밍·최상급 부풀림·작가 논평·창작적 인물 귀속 금지
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6e0b0b2b-ae76-4aca-89e5-2437ab87ebd7
---

쇼츠/롱폼 텍스트를 각색할 때 롱폼 원문(검증된 사실)에서 벗어나는 창작을 금지한다.

**Why:** 원문 밖 표현은 환각·과장이 된다. 롱폼 전면 재구축(감상배경 2번째 문단 깊이의 새 서술을 지어내기)은 창작이라 금지. "쇼츠 리소스 기반으로 롱폼 재구축"도 쇼츠가 이미 각색본이라 되펼치면 오염된다.

**How to apply:**
- 원문에 없는 극적 프레이밍 금지 (예: "세계 최고 부자가 자신을 약자에 빗댔다" — 원문에 "세계 최고 부자" 없음)
- 최상급 부풀림 금지 (원문 "좋아한 책 가운데 하나"를 "가장 아꼈다"로 격상 X)
- 작가 논평·판단 금지 ("그 판단이 옳은지는 별개입니다", 톨킨 기계혐오 같은 곁가지 삭제)
- 인물이 특정 장면을 "주목했다/오래 기억했다"는 창작 귀속 금지. 실제 발언만 인물에 귀속하고, 나머지는 객관 서술로 (예: "머스크가 회의장 장면을 주목" → "아무도 나서려 않을 때 프로도가 나섰다"는 객관 서술 + 실제 발언만)
- 롱폼 인용 해설 마무리는 쇼츠 수준으로 절제. 장황한 다문단 마무리 금지
- 인용은 원문 verbatim 대조 (머스크 프로도 트윗 원문 "Frodo was the underdoge... underdog"을 "보잘것없는 약자"로 과장하지 말 것. 참고로 이 트윗은 도지코인 언더독 밈 맥락)

[[feedback_preserve_user_prose]] [[feedback_no_trash_prose]] [[feedback_no_documentary_sermon]]
```

## feedback_align_zero_timestamp

```markdown
---
name: align 0s 앵커 표기를 컷 묻힘으로 단정 금지
description: voice:align 출력의 imageChangeAt → 0s 결과를 영상에서 컷이 안 보이는 것으로 단정하지 않는다. 실제 렌더에서 확인 후 판단
type: feedback
originSessionId: 6279e86d-c8a8-4db4-958e-45b918736360
---
`pnpm voice:align` 출력에 `imageChangeAt "..." #1 → 0s (sentence)` 같은 줄이 보이면 "그 컷 전환점이 영상 시작점에 몰려 첫 컷이 묻힌다"고 단정하지 않는다.

**Why:** 2026-05-10 elon-musk 쇼츠1 explanation-4에서 두 텍스트 앵커가 0s로 표기됐다고 첫 컷(final-17a) 누락을 사용자에게 보고했으나, 실제 렌더 영상에서는 4컷이 모두 정상 노출되고 있었다. align 로그의 0s가 곧 영상 누락을 뜻하는 것이 아니다. 합성된 음성을 whisper가 호흡 단위로 묶으면서 sentence boundary가 합쳐졌더라도, voiceTimings의 sub 분할 시점이나 word-timing 보조 정보가 컷 전환점을 별도로 잡아주는 경로가 있을 수 있다.

**How to apply:**
- align 출력의 `→ 0s (sentence)` 표기는 sentence 단위 매칭의 디폴트 fallback 가능성. 영상에서 컷이 정말 묻혔는지는 렌더 미리보기로 검증한 뒤 보고.
- 사용자에게 "영상 흐름에 문제가 있다"고 보고하기 전 한 단계 더: 가능한 한 실제 timing.json의 컷 시각 또는 렌더 영상에서 확인. 확인 못 했으면 "확인이 필요한 의심"으로만 표현하고 단정하지 않는다.
- 사용자가 영상에서 정상 동작을 확인했다고 말하면, 그 보고를 신뢰하고 추가 보정 시도하지 않는다.
```

## feedback_ask_multiple_choice

```markdown
---
name: 의도 불명확 시 객관식 확인
description: 유저 의도가 조금이라도 모호하면 멋대로 해석하지 말고 객관식으로 되물어라
type: feedback
---

유저 의도가 조금이라도 헷갈리면 임의 해석하지 말고 객관식 선택지를 제시하여 확인한다.

**Why:** "4권 수정예정"을 "4권 전체"로 오독하여 불필요한 전체 검수를 수행한 사건. 유저는 "Book 4번"을 의미했다. 모호한 지시를 넓게 해석하면 시간 낭비 + 유저 짜증.

**How to apply:** 숫자, 범위, 대상이 두 가지 이상으로 읽힐 수 있는 지시를 받으면, 즉시 객관식(A/B/C)으로 의도를 확인한 뒤 작업에 착수한다. 추측 금지.
```

## feedback_avatar_no_uniform_template

```markdown
---
name: feedback_avatar_no_uniform_template
description: 인물 초상 생성 시 발주서 골격을 하나로 고정해 찍어내지 마라. 인물마다 구도·앵글·조명을 달리한다
metadata: 
  node_type: memory
  type: feedback
  originSessionId: dd6d105e-1b92-4710-abc7-571fde276d6b
  modified: 2026-07-20T09:42:24.005Z
---

26.07.20 셀럽 아바타 옛 인물 19명을 codex image_gen으로 생성할 때, 발주서 골격(정면 흉상 · 얼굴 세로 40% · 단색 검정 배경 · 부드러운 정면 키라이트)을 **전부 동일하게 고정하고 인물 설명만 갈아 끼웠다.** 유저 지적: "다 규격에 맞춘 듯이 찍어냈다. 담부턴 이렇게 하지 말자."

**Why:** 얼굴 자동 크롭에는 유리했으나 19명이 한 스튜디오에서 같은 날 찍은 증명사진처럼 보인다. 인물의 성격·시대·처지가 구도로 드러나지 않는다. 나열했을 때 개성이 죽는다.

**How to apply:**
- 공통으로 고정할 것은 **최소한**만 — 정사각 규격, 배경이 인물과 분리될 것, 얼굴이 잘리지 않을 것.
- 인물마다 달리할 것 — 앵글(정면·3/4·약간 위/아래), 얼굴 크기, 시선 방향, 조명(측광·역광 실루엣·창가 자연광 등), 표정의 온도, 상체 각도.
- 배치 발주 시 인물별로 연출을 먼저 정하고 발주서에 개별 기입한다. 골격 재사용은 금지.
- 관련: [[feedback_image_prompt_lessons]] · [[feedback_gaze_action_binding_images]] · [[feedback_faction_groupshot_pose_cliche]](팩션 그룹샷도 같은 이유로 풀에서 매번 다르게 뽑는다)
```

## feedback_bo_volume_boost_broken

```markdown
---
name: BO 볼륨 부스트 기능은 청감상 효과 없음
description: 백오피스 web audio gain은 강한 압축 장치를 함께 통과시켜 부스트가 다시 깎임. wav 음량 부스트는 ffmpeg로 직접 처리.
type: feedback
originSessionId: 315cf81d-f8a7-4697-aa47-42c32a43d738
---
백오피스 음성 도구의 볼륨 부스트(`sw/remotion-bo/src/components/voice-utils.ts`의 `applyGain`)는 곱하기 직후 DynamicsCompressorNode를 limiter로 통과시킨다. 설정: threshold -6 dBFS, ratio 20:1, knee 6 dB. 이 강한 압축이 부스트한 신호를 즉시 도로 평탄화시켜 청감상 차이가 거의 안 난다. 1.5배·2배를 줘도 결과 동일.

**Why:** 2026-05-02 제갈량 쇼츠2 검증에서 발견. 측정상 RMS는 +2~3 dB 올라간 것처럼 보여도 인지 라우드니스는 정체. 사용자가 "1.5배든 2배든 그대로였다"고 명시 보고. 같은 wav를 ffmpeg `volume=1.3,alimiter=limit=0.891`로 처리하니 즉시 "압도적으로 더 크게" 들렸다.

**How to apply:**
- wav 음량을 실제로 키워야 할 때 백오피스 부스트 UI를 신뢰하지 말고 ffmpeg로 직접 처리한다.
- 옵션 A — 라우드니스 통일 우선: `loudnorm=I=-12:TP=-1.0:LRA=11` 2-pass linear (`sw/remotion/scripts/voice/2-synthesize/normalize.ts` 참조). 5조각 톤 균일.
- 옵션 B — 단순 N배 부스트: `volume=N,alimiter=level_in=1:level_out=1:limit=0.891:attack=5:release=50`. 1.3~1.5배 권장. true peak는 sample peak보다 0.5~1 dB 높게 나올 수 있음.
- 처리 전 원본은 `.raw/`(normalize.ts가 자동 백업)나 별도 `.before-*` 폴더에 보존.
- 백오피스 부스트 UI 자체의 limiter 설정을 완화하거나(threshold 0 dB / ratio 2:1 / true-peak 모드) GainNode만 쓰는 게 근본 수정. 발견 시점에 수정하지 않았으므로 유의.
```

## feedback_broad_permission_allowlist

```markdown
---
name: 권한 승인 프롬프트 최소화
description: PowerShell·Bash 등 툴별 전역 와일드카드 권한을 선제적으로 허용하여 서브에이전트 작업 중 수십 회 승인 중단이 발생하지 않도록 한다
type: feedback
originSessionId: 705534f5-4689-434a-97ae-340fed0dc51d
---
프로젝트 settings.local.json의 `permissions.allow`에는 `Bash(*)`, `PowerShell(*)`, `Read(*)`, `Write(*)`, `Edit(*)`, `Task(*)`, `Agent(*)`, `ToolSearch(*)` 등 툴별 전역 와일드카드를 유지한다. 개별 명령 문자열 단위로 권한을 축적하지 않는다.

**Why:** 서브에이전트(celeb-*, remo-* 등)가 Naver/OpenLibrary curl, Invoke-RestMethod, jq 파이프, 이미지 다운로드, SQL 실행 등을 수십 회 호출한다. 와일드카드가 없으면 매 명령마다 승인 팝업이 뜨고 사용자가 수십 번 눌러야 한다. 유저는 이를 명시적으로 불편하게 여긴다.

**How to apply:** 새 프로젝트 초기 설정 시 툴별 `(*)` 권한을 한 번에 등록한다. 특정 명령 하나 때문에 새 권한 entry를 추가할 게 아니라, 해당 툴 전체를 `(*)`로 허용한다. 서브에이전트 발주 직전 settings.local.json을 점검하여 필요한 툴이 모두 허용됐는지 확인한다.
```

## feedback_celeb_books_must_be_read_not_authored

```markdown
---
name: 셀럽 책 라인업은 읽은 책 기준, 본인 저작 제외
description: 에피소드 books 배열은 셀럽이 읽은 책만. 셀럽이 쓴/주석한 책은 라인업에서 제외하고 contextMain에 일화로 흡수
type: feedback
originSessionId: af095c88-4d55-4f4f-a4dc-db74734be039
---
에피소드 books 배열은 "서재 탐방" 컨셉이다. 셀럽이 **읽은** 책만 들어간다.

**Why:** 조조 에피소드 0-draft에서 손자약해(조조 주석본)·조조집(본인 시문집)·박장령(본인 명령문)을 권 라인업에 넣었다가 사용자가 지적. "조조가 쓴 거 아녀?"라는 반응. 본인 저작은 그가 읽은 책이 아니라 그가 만든 산출물.

**How to apply:**
1. 라인업 후보를 추리기 전 각 책에 대해 "셀럽이 이 책을 읽었는가, 썼는가" 명시 분류.
2. 본인이 쓴 책(주석본·시문집·명령문·자서전·서간집 등)은 **제외**한다.
3. 본인 저작에 담긴 일화(예: 조조의 손자병법 주석 작업·단가행 작시·박장령 임종 유언)는 **원전 책의 contextMain·quotePairs.after에 일화로 흡수**한다. 예: 손자약해 일화는 손자병법 권의 contextMain으로, 단가행 일화는 시경 권으로, 박장령 임종 일화는 마지막 권의 quotePairs.after 또는 outro로.
4. 라인업은 동시에 **국내 시판 단행본** 기준으로 검증한다. 시판되지 않거나 단행본이 아닌 항목(명령문·서간·미간행 일화집 등)은 권으로 세우지 않는다.
5. 자가점검 질문: "이 책 제목으로 교보문고·예스24에서 검색하면 시판본이 나오는가, 그리고 그 책을 셀럽이 읽었다는 사료가 있는가." 둘 다 ○여야 권으로 세운다.
```

## feedback_celeb_must_have_books_about_them

```markdown
---
name: feedback_celeb_must_have_books_about_them
description: "셀럽 선정·유지 기준은 \"그 사람을 다룬 책이 충분히 존재할 만한 인물\". 일반인 느낌 인물은 제거"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 61a96eee-34ed-48b0-b28d-d73218a4c2ab
---

셀럽으로 등록·유지할지의 기준은 **그 사람에 대해 언급·서술하는 책(전기·평전·연구서·사상사 등)이 충분히 존재할 정도의 인물**인가다.

**Why:** 감상 기록(user_contents) 건수가 1개여도 문제없다. 진시황·마리 퀴리·괴테도 기록 1~2건이지만 누구도 가볍게 보지 않는다. 문제는 인물의 격(格)이다. 인지도만 높고 격이 약한 "일반인 느낌" 인물(현대 웹툰 작가·대중 연예인·무명 창업자 등)이 위대한 역사 인물과 같은 셀럽 풀에 섞이면 서비스 전체 품격이 떨어진다. 한국 청년층 인지도를 1순위로 둔 큐 기준이 이 혼입을 만들었다.

**How to apply:**
- 인물에 대해 다룬·언급하는 책(전기·평전·연구서, 또는 그 인물이 비중 있게 거론되는 책)이 충분히 존재하는가로 판단. 그가 쓴 책이 아니라 그를 다룬 책.
- **기준 강도 주의**: "단독 정식 전기가 출간됐는가"로 좁게 보면 안 된다. 생존 현역이라 아직 전기가 없을 뿐인 세계적 톱스타(오스카 수상 배우·그래미 다관급 가수 등)는 영화사·음악사 책에서 충분히 언급되므로 유지 대상이다. 기준은 "언급되는 책이 충분한가"이지 "단독 전기 존재"가 아니다.
- 미달 = "일반인 느낌"으로 보고 제외 대상. 명백한 예: 현대 웹툰 작가, 무명 AI 스타트업 공동창업자·임원, 유튜버·팟캐스터, 양산형 대중 장르작가, 무명 조연 배우.
- 콘텐츠 감상 기록 건수로 격을 판단하지 않는다. 진시황·마리 퀴리·관우는 기록 1건이어도 유지.
- **적용 범위(2026-05-25 결정)**: 이미 등록된 인물은 소급 제거하지 않는다. 이 게이트는 **신규 발주(큐에서 새로 추가)** 시에만 적용한다. 발주 전 "이 인물을 다룬·언급하는 책이 충분한가"를 통과시킨 인물만 등록.
- 파괴적 제거(DB 삭제)는 사용자가 명시 지시할 때만. 관련: [[feedback_file_safety]]
```

## feedback_check_tts_overrides

```markdown
---
name: TTS 오버라이드 확인 필수
description: 음성 파이프라인 실행 전 tts.shorts/tts.books 오버라이드 존재 여부를 반드시 확인한다
type: feedback
---

음성 파이프라인 실행 시 에피소드 JSON의 `tts` 오버라이드 섹션을 반드시 확인한다. TTS는 오버라이드 텍스트로 음성을 생성하지만, 화면 자막은 `segments[].text` 원문을 표시한다. 오버라이드가 있으면 화면 텍스트와 음성이 다를 수 있다.

**Why:** 마르쿠스 아우렐리우스 쇼츠에서 `tts.shorts[7]`, `tts.shorts[9]`에 오버라이드가 있었는데 이를 확인하지 않고 파이프라인을 돌려서 자막과 음성이 불일치. 오버라이드 존재를 모른 채 여러 번 재생성하며 시간 낭비.

**How to apply:** 파이프라인 시작 전 `grep "tts" episode.json`으로 오버라이드 유무를 확인. 오버라이드가 있으면 화면 텍스트와의 차이를 파악하고, 필요시 동기화 후 진행.
```

## feedback_confirm_before_listing

```markdown
---
name: 기술 나열 전 의도 확인
description: 기능 제안 시 기술 옵션·방식을 먼저 나열하지 말고, 사용자가 무엇을 원하는지부터 확인
type: feedback
originSessionId: 6c347a02-ccc9-4551-9b37-17d45b19b2df
---
기능 추가 요청이 오면 곧바로 구현 방식·옵션·기술 조합을 A/B/C로 나열하지 말고, 먼저 "무엇을 할지"(목표·범위·시나리오)부터 간결히 확인한다.

**Why:** 방식부터 늘어놓으면 사용자의 실제 의도와 어긋난 기술 선택지를 내놓게 된다. 사용자가 "BGM 설정 UI" 요청 시 내가 곧바로 데이터 구조 A/B/C → 파일 선택 A/B/C → UI 배치 A/B/C를 나열했고, 사용자는 "순서가 틀려먹었다"고 지적했다. 원하는 것은 '섹션/필드별 재생'이라는 목표였고, 구조 결정은 그 다음 얘기였다.

**How to apply:** 기능 요청 → ① 사용자가 뭘 하고 싶은지(시나리오·대상·범위) 먼저 1~2문장으로 물어 확인 → ② 확인된 목표에 맞춰 구현 방식 제안. 옵션 나열은 구현 방식 단계에서만. 이건 특히 UI/데이터 스키마 변경 요청에서 강하게 적용된다.
```

## feedback_cut_over_choppy_rhythm

```markdown
---
name: feedback_cut_over_choppy_rhythm
description: 스피디하게 조일 때 짧은 문장·따옴표 마디로 툭툭 끊지 마라. 호흡 어설프면 이해가 어렵다. 불필요한 문장을 없애 줄여라
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6182879b-e310-4cb2-a6a5-cd7a1f6f741c
---

"스피디하게" 요청받았을 때 짧은 단문·따옴표 마디(예: "'모를수록 두껍게 짓는다.' 그래서 ~")로 리듬을 끊는 방식은 오히려 호흡을 툭툭 끊어 읽기 불편하게 만든다.

**Why:** 호흡이 어설퍼지면 이해가 어려워진다. 속도는 문장을 잘게 쪼개는 게 아니라 군더더기를 덜어내는 데서 나온다.

**How to apply:** 빠르게 만들 땐 (1) 불필요한 문장(뒤에서 다시 다루는 곳과 겹치는 곁가지 등)을 통째로 삭제하거나 인접 문장에 흡수시키고, (2) 남은 문장은 "A하니, B한다"처럼 원인→결과가 한 호흡으로 매끄럽게 이어지게 쓴다. 대구·대응(딱딱 떨어지는 구조)은 문장을 끊어서가 아니라 같은 결의 문장을 나란히 놓아 만든다. [[feedback_no_trash_prose]] [[feedback_dont_inflate_concise]] 계열.
```

## feedback_dont_inflate_concise

```markdown
---
name: feedback_dont_inflate_concise
description: 마무리·해설이 짧게 말끔히 해결되면 절대 분량 늘리지 마라. 연결구·빌드업 욕심에 문단 추가하면 붕 뜨고 어색해진다. 압축이 정답인 경우가 있다
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4bb05033-c0f8-4bae-b6e2-6cb3025f5638
---

영상 대본의 마무리·해설·요약이 짧은 문장 몇 개로 말끔하게 해결되면, 거기서 멈춰라. 분량을 늘리지 않는다.

**Why:** 02(신에 맞선 12인) quote 마무리에서, 내가 "제국 야망 빌드업 + 책 의미 + 영혼"으로 4문단까지 늘렸더니 문단마다 연결고리가 없어 따로 놀고 마지막 문장이 붕 떴다. 연결구("그 집요함의 뿌리에…", "그 지도를 들고…")를 끼워 봐도 오히려 더 어색했다. 결국 쇼츠 마무리 그대로 **두 문장**으로 줄이니 말끔하게 닫혔다. 늘리는 방향은 거의 항상 악화다.

**How to apply:** 쇼츠 등에 이미 말끔한 짧은 버전이 있으면 그걸 기준으로 삼고, 롱폼이라고 굳이 문단을 보태지 마라. 빌드업·전환구·부연·책 설명 추가로 길이를 늘리고 싶은 충동이 들면 멈추고 "이게 압축으로 이미 해결된 건 아닌가" 자문한다. 짧은 게 정답인 경우를 인정한다. 관련: [[feedback_text_condensing]] [[feedback_no_pet_words]]
```

## feedback_elevenlabs_v3_leading_tag_eats_phrase

```markdown
---
name: feedback_elevenlabs_v3_leading_tag_eats_phrase
description: ElevenLabs v3는 문장 맨 앞 대괄호 감정/톤 태그 직후 첫 구절을 통째로 누락시킨다. 한국어에서 특히 빈발
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b3a05ce6-14c5-4ca9-b8e3-1cb19df3c64c
---

ElevenLabs v3(eleven_v3) 모델은 문장 **맨 앞**에 붙은 대괄호 감정·톤 태그(예: `[속삭이듯, 슬프게] 본문...`)를 연기 지시로 해석하면서, 바로 뒤 첫 구절(주어부 등)까지 함께 삼켜 발화에서 누락시킨다. 한국어에서 특히 자주 발생.

실측 사례: 입력 "반지의 제왕과 책들은 제게 영웅이라면 마땅히 세상을 구해야 한다는 사명을 일깨워주었습니다." → 음성에는 "제게 영웅이라면…"부터만 나옴("반지의 제왕과 책들은 " 누락). 감정 표식을 끄니 정상.

**Why:** remotion-bo 음성 패널에서 buildEleText가 `[감정] 본문` 형태로 태그를 맨 앞에 prefix한다(scenario-voice/types.ts). v3가 이 위치의 태그를 처리하며 첫 구절을 흡수.

**How to apply:** "ElevenLabs 생성 텍스트 앞부분이 안 들어간다" 류 신고 시 가장 먼저 감정·톤 표식(페이지 기본 톤 eleSendOpts / 구간 톤 segmentMeta.tags) 켜짐 여부를 의심한다. 텍스트 조립·route는 앞을 자르지 않으므로 그쪽을 헤매지 말 것. 임시 회피는 표식 끄기. 표식을 살리려면 태그를 문장 맨 앞이 아닌 첫 구절 뒤로 밀거나 본문과 분리하는 방식이 후보이나, 효과 확인엔 유료 생성이 필요하다([[feedback_voice_elevenlabs_user_exclusive]], [[feedback_no_auto_generation]]). TTS 변조 의심 전 자기 코드부터 점검하라는 원칙과도 연결([[feedback_tts_no_suspicion]]).
```

## feedback_explain_to_user

```markdown
---
name: 유저 설명 시 내부 명칭 금지
description: 기능 설명·작업 보고 시 파일명·함수명·플래그명 등 내부 명칭 대신 일상 용어로 풀어 쓴다
type: feedback
originSessionId: ea8ceb14-247f-4682-ae4b-d0b3dc2650c5
---
유저에게 기능이나 작업 결과를 보고할 때 파일명·컴포넌트명·함수명·플래그명·상수명 등 **AI가 만든 내부 명칭**을 전면에 쓰지 않는다. 유저는 그 이름을 처음 본다.

**한국어로 보여도 코드에서 새어나온 단어는 내부 명칭이다.** "segment", "line", "field", "라인", "줄", "구간", "필드", "토글", "트림" 등이 데이터 구조나 코드 변수명에서 그대로 옮겨온 것이라면 일상어가 아니다. 이런 단어는 일상어로 풀거나, 꼭 써야 하면 처음 등장 시 한 줄 설명을 곁들인다.

**예시**
- ❌ "`sliceOriginalByTimings`가 `expanded` 배열의 `subLens`를 기준으로 `normToRaw`로 `rawEnd`를 계산해서..."
- ✅ "원고를 음성 구간 수만큼 비율로 잘라, 각 조각이 원고 그대로 화면에 뜨도록 했다"

- ❌ "`CONTEXT_QUOTE_GAP`을 `f(1.5)`에서 `f(0.5)`로 줄이고 `toQuoteFrames` 헬퍼를 신설해..."
- ✅ "인용문 앞에 쉬는 시간을 1.5초에서 0.5초로 줄이고, 인용문이 끝난 뒤 남는 여운 시간도 짧게 잡았다"

- ❌ "`parseSection`이 `seg.text`/`seg.sub`로 `fullText`를 빌드해서 앵커 `indexOf`가 실패..."
- ✅ "이미지 전환 시점을 찾을 때 자동 받아쓴 자막 텍스트를 기준으로 삼고 있어서, 원고 그대로의 문구로는 찾기 실패"

- ❌ "캐릭터 보이스 segment에 셀럽 보이스 버튼이 떠있어서 라인 단위로..." (segment·라인은 코드 변수)
- ✅ "유기 호소 부분처럼 캐릭터 목소리로 만들어야 하는 대사에 엉뚱한 셀럽 보이스 버튼이 뜬다"

- ❌ "여기선 누르면 안 되는 버튼이라 막아둔다"
- ✅ "이 자리에서는 잘못된 버튼이 떠 있어 안 보이게 가리고, 위쪽 도구로 가서 만드시라고 안내만 둔다"

**내부 명칭 병기가 필요하면 괄호로만** — 예: "인용문 앞 쉬는 시간(CONTEXT_QUOTE_GAP)".

**예외**: 코드 변경 보고의 diff·PR 설명·파일 경로 나열처럼 개발 맥락이 명확한 부분은 원 명칭 전면 사용 가능. 그래도 요약·결론 부분은 일상 용어로.

**자가 점검**: 답변을 보내기 전 한 번 더 본다. "이 단어를 처음 듣는 유저가 즉시 이해하나? 코드에서 따온 단어인가?" 둘 중 하나라도 걸리면 풀어 쓴다.

**Why:** AGENTS.md 146~154행 "기능 설명 방식 (유저 대상)" 규칙. 유저는 AI가 만든 이름을 알지 못하며, 내부 명칭 나열은 "무엇을 고쳤는지" 설명이 아니라 "어떻게 고쳤는지" 나열에 그쳐 유저 관점에서 불친절하다.

**How to apply:**
- 세션 요약·작업 보고 시 먼저 **유저 시선에서 "무엇이 어떻게 달라졌는지"** 를 일상어로 기술
- 기술 디테일은 그 아래에 별도 섹션 또는 PR 메시지로 분리
- 명령어·파일 경로는 그대로 인용 (실행에 필요하므로)
```

## feedback_factcheck_subagent_trust

```markdown
---
name: 사료 검증 서브에이전트 결론 맹신 금지
description: 서브에이전트의 사료 검증 "오류 발견" 결론은 웹 검색 직접 재확인 후 수정한다. 특히 원문 대조를 요구하는 경우.
type: feedback
---

사료 검증 서브에이전트가 "원문과 다르다", "오류다"라고 보고해도 **즉시 수정하지 말고 웹 검색으로 직접 재확인한다**. 특히 1차 사료(난중일기, 원전 등) 원문 대조를 요구하는 판정은 서브에이전트가 잘못된 2차 출처를 우선 참조할 위험이 있다.

**Why:** 이순신 에피소드 Book 1 사료 검증에서 서브에이전트가 "이순신이 난중일기에 '백전불태'를 적었는데 에피소드가 '백전백승'으로 잘못 기록했다"고 판정했다. 사용자가 "검색해보면 백전백승이 많이 나오는데?"라고 반박하여 재검증한 결과, 실제 난중일기 갑오년 9월 3일자에 **"지기지피 백전백승"**이라고 적혀 있는 것이 맞았다(두 군데 개작: 지피지기→지기지피 + 백전불태→백전백승). 서브에이전트는 "손자병법 원문이 백전불태다" → "그러니 난중일기도 백전불태여야 한다"는 오추론에 빠졌다. 나는 그 결론을 확인 없이 수용해 올바른 에피소드 텍스트를 오히려 망가뜨렸다.

**How to apply:**
1. 서브에이전트 사료 검증 보고가 ❌ 오류 발견을 포함하면, 수정 전에 반드시 웹 검색으로 1차 대조
2. 특히 "원문 대조", "실제 기록은 X이다"라고 단정한 판정은 출처 URL을 직접 열어 확인
3. 검증이 애매하거나 복수 출처 간 상충이 있으면 유저에게 질문 후 결정
4. 서브에이전트가 2차 출처(오마이뉴스·블로그 등)를 1차 사료처럼 취급하지 않았는지 점검
5. 도끼 서사의 핵심을 이루는 부분(이 경우 "두 군데 개작"이 도끼)은 절대 서브에이전트 판정만으로 삭제하지 않는다
```

## feedback_faction_cognition_line

```markdown
---
name: feedback_faction_cognition_line
description: 팩션 인물 채택 기준=도구/서사 대중 인지선(인물 유명세 아님). 백과사전화 금지. 확장은 기존세력 동결+새 cluster 덧붙여 재촬영0
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ad407e7a-4f4f-4138-854d-013978440433
---

팩션(세력도) 인물 채택 기준은 "인물 이름 유명세"가 아니라 **그가 만든 도구 또는 그의 서사가 대중(한국)에게 닿는가**다. 위키백과에 있다고 넣으면 안 됨 = 백과사전화. 기존 팩션도 인물 이름은 대부분 무명(휴즈·메이·할 피니)이고 도구(비트코인·PGP·리눅스)나 강한 서사(루게릭병 투병)로 화면에서 산다.

**Why:** 디지털 레지스탕스 확장 때 계보 완결성에 끌려 원류 암호학자(디피·주드 미혼·번스타인) 세력을 신설했다가 "주드 미혼은 검색도 안 된다"는 지적으로 철회. 도구·서사·인지 삼중 결격 인물(미혼·매트 블레이즈·가오자량·헬싱기우스)은 전부 컷.

**How to apply:** 후보를 (1) 도구 앵커(텔레그램·Tor·Sci-Hub·냅스터), (2) 서사 앵커(체포·처형·전장 — 카네코·엘바키얀·타키), (3) 삼중결격 으로 분류해 앞 둘만 채택. 마스토돈·블루스카이는 이용자 약해 컷. 이더리움/부테린은 저항색 약하고 옆에 세울 대중 앵커 인물이 없어 컷(화보는 최소 2~3인 필요).

**확장 구조 원칙:** 기존 세력은 동결(색·단체사진·음성·개인샷 유지). 신규 인물은 그 세력의 **새 장면(cluster) 추가** 또는 신설 세력으로 붙인다. 한 세력이 여러 cluster를 가질 수 있으므로, 기존 cluster를 안 건드리면 그룹샷 재촬영 0. 기존 cluster 멤버 구성을 바꿀 때만 그 화보 1장 재촬영(개인샷·데이터는 인물 따라 이동, 유실 없음). 서사적 "의미 유실"이 재편 이득보다 크면 재편하지 말 것.

디지털 레지스탕스 확장 결과: 기존 4세력 동결 + 현대 계승 장면 3개(익명의 돈·파일 해방·지식 해방) + 신설 2세력(프라이버시 최전선·두로프 단독 엔딩). 신규 13인. SSoT: docs/project/remotion/faction-digital-resistance-saga.md. [[feedback_faction_quote_philosophy_over_situation]] [[feedback_faction_person_lines_format]]
```

## feedback_faction_ele_loudness

```markdown
---
name: feedback_faction_ele_loudness
description: ELE 음원 음량 편차는 loudnorm 균일화로 잡는다(팩션·북리커맨드 공통). 수동 quoteGainDb 조절 불필요
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 31e473d3-5cd3-4f8a-986b-f71e8f2f0f9e
---

ElevenLabs 대사 음원의 음량이 제각각인 문제는 **loudnorm 라우드니스 정규화로 해결**한다(팩션·북리커맨드 공통). 수동으로 데시벨(quoteGainDb)을 일일이 올리고 내리지 않는다. loudnorm 정상 작동 검증: -13.9 → -17.5 LUFS. 목표 -17 LUFS(2-synthesize/config.ts), 시스템 ffmpeg 필요.

**절대 하지 말 오답:** "ELE랑 GEM은 생성 방식이 달라서 음량 균일화가 어쩔 수 없다"는 **틀린 설명이다.** loudnorm은 엔진과 무관하다 — 무엇으로 만들었든 결국 wav이고, 그 라우드니스를 측정해 목표로 맞출 뿐이다. 엔진 핑계로 불가라고 둘러대지 말 것.

**왜 안 됐던 것처럼 보였나(진짜 원인):**
- `remo-voice-sync`(파이프라인 3~5단계: transcribe→align→chunk)는 **자막 타이밍·구간 분할 단계이지 음량 정규화 단계가 아니다.** 그걸 돌려도 음량은 안 바뀐다. 정규화는 2단계(`--normalize`)나 일괄 명령에 있다.
- ELE는 (1)생성 시 정규화에서 엔진 제외(`ENGINE !== 'elevenlabs'`), (2)BO 저장 라우트에 loudnorm 없음 → **자동 정규화 트리거가 없다.** `--normalize` 단독 명령(생성 없이 `normalizeAll`)은 북리커맨드에서 `['gemini','elevenlabs']` 둘 다 돌아 ELE도 포함하지만, 그 명령을 직접 안 돌리면 ELE는 -13.9~-17.4 식으로 제각각 남아 수동 DB로 맞춰야 했다.

**해결(팩션·북리커맨드 둘 다 구현됨):**
- 저장 시 자동 정규화: 공통 유틸 `lib/voice-normalize.ts`의 `normalizeWavInPlace`(loudnorm 2-pass, `.raw` 백업). 팩션 `faction-voice/[episode]/save`, 북리커맨드 `voice/save` 둘 다 적용.
- BO "음량 균일화" 버튼: 팩션은 FactionEditor, 북리커맨드는 VoiceToolbar GenerateToolsSection. → `normalizeOnly` 플래그로 CLI `--normalize-only`(생성 없이 일괄). 북리커맨드는 gemini·elevenlabs 롱폼 최상위 + 모든 shorts-* 서브까지 순회.

**중요한 한계 — 정규화로 다 된다고 약속하지 말 것:** loudnorm은 "평균 크기(통합 LUFS)"만 맞춘다. 측정으로 확인(01-llm F04: 네 명 다 -17 LUFS, LRA 0~2.3로 거의 동일)했는데도 특정 인물(마크 첸·일리야)이 작게 들렸다. 원인은 **목소리 톤·두께(음색)** 차이 — 사람 귀가 느끼는 크기와 기계가 재는 평균이 어긋나는 지점이라 어떤 평균 메트릭(LUFS·RMS·A-weighting)으로도 못 없앤다. 예전부터 수차례 반복된 문제이고 "정규화 다 돌려도 차이 없다"가 맞다. 따라서 **평균은 자동(정규화), 음색에서 오는 체감 미세차는 그 인물에 quoteGainDb 1회 보정**(음원 안 바뀌면 영구 유지, "매번" 아님)이 현실적 최선. 귀 없이 완전 무인 자동은 어렵다 — 그렇게 안 된다고 정직하게 말할 것.

**How to apply:** ELE 음량 불균일 신고 → (1) 엔진 탓·불가 금지(평균은 됨). (2) 정규화로 "음색 체감차까지 다 된다"고 약속도 금지. 두 시리즈 모두 "음량 균일화" 버튼/저장 자동으로 평균은 맞추고, 유독 작은 인물만 BO 음량 슬라이더로 quoteGainDb 1회 보정 안내. [[feedback_bo_volume_boost_broken]] [[feedback_voice_normalize_required]]
```

## feedback_faction_gaindb_studio_clamp

```markdown
---
name: feedback_faction_gaindb_studio_clamp
description: 팩션 quoteGainDb 양수(+)는 studio 프리뷰에선 안 들리고 렌더에서만 증폭된다. studio 기준 음량조절 금지
metadata: 
  node_type: memory
  type: feedback
  originSessionId: da1c269a-5309-4410-a01d-bc4cbe5ff1c2
---

팩션 인물 음량(`quoteGainDb`)은 Remotion `<Audio volume={dbToLinear(db)}>`로 들어간다(`10^(db/20)`). **volume이 1을 넘는 증폭(= gainDb 양수)은 studio 미리보기에서 무시(최대 100%로 클램프)되고, 렌더 파일에서만 실제 증폭된다.**

**Why:** 이 비대칭 때문에 "studio에서 작게 들려 gainDb를 계속 올림 → 렌더하면 그 값이 그대로 증폭돼 폭발 + 클리핑" 이 반복된다. 실제 사례(01-llm 머스크): studio에서 안 커져 +12까지 올림 → 렌더 영상 피크 0.0dBFS, 18072 샘플 클리핑(찢어지는 왜곡), 모바일에서 폭발.

**How to apply:**
- **studio 음량으로 gainDb를 판단하지 마라.** studio는 양수 dB를 안 들려준다. 정확한 판단은 wav 실측(ffmpeg `volumedetect` mean/max) 또는 렌더 후 확인.
- gainDb는 **음색·발성 차이를 못 고친다.** 평균 음량이 남들과 같은데 작게 들리면(예: "gentle" 감정으로 합성된 머스크) 그건 발성 문제다 → gainDb 말고 wav 컴프레션(ffmpeg 직접) 또는 재합성(ElevenLabs는 [[feedback_voice_elevenlabs_user_exclusive]] 유저 전담)으로 잡는다.
- gainDb는 **클리핑 한계**를 지켜라: `현재 max_volume + gainDb < 0dB`. max가 -3dB면 gainDb는 +2~+3이 상한. 그 이상은 클리핑.
- [[feedback_faction_ele_loudness]] 와 연결: loudnorm은 평균만, 음색 체감차 못 잡음 → 유독 작은 인물은 quoteGainDb 1회 보정하되 위 한계 내에서.
```

## feedback_faction_group_vs_cluster

```markdown
---
name: feedback_faction_group_vs_cluster
description: "팩션 용어 정책 - UI는 세력/그룹 두 가지만. \"묶음\" 표현 폐기. 코드 식별자 cluster는 음원파일명 때문에 유지"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: da1c269a-5309-4410-a01d-bc4cbe5ff1c2
---

팩션(세력도) 영상의 두 단위.

- **세력(코드: group)** = OpenAI·Anthropic 같은 회사. 등장 시 로고 화면(`titleArt`)이 뜨고, 하단에 `group.name`(개행 한 필드: 첫 줄=세력명 흰색, 둘째 줄부터=설명 세력색).
- **그룹(코드: cluster)** = 한 세력 안의 그룹샷 단위. 예: Anthropic의 "아모데이 남매". 그룹샷 카드 하단에 `cluster.label`(개행 한 필드: 첫 줄 흰색 + 둘째 줄 세력색).

**용어 정책(2026-06-28 유저 지시):** 유저 대면 용어는 **세력 / 그룹** 두 가지만 쓴다. "묶음"·"단체명"·"단체 명칭" 표현은 전부 폐기하고 "그룹"·"그룹명"으로 바꿨다(BO FactionGroupEditor 화면 문자열 정리 완료). **단, 코드 식별자 `cluster`는 음원 파일명 `F{세력}C{그룹}P{인물}-quote.wav`의 `C`에 묶여 있어 못 바꾼다**(바꾸면 기존 wav 전부 어긋남, [[feedback_faction_voice_positional_rename]]). 그래서 변수명은 cluster 유지, 화면 라벨만 "그룹".

**그룹명(그룹샷 카드 문구) 소스:**
- 그룹을 여러 개로 나눈 세력 → 각 `cluster.label`.
- 그룹 안 나눈 세력 → `group.label`(2026-06-28 신설). 비우면 세력 명칭(`group.name`) 둘째 줄로 폴백(`clustersOf`가 처리). BO 세력 헤더에 "그룹명" 칸이 항상 노출되어, 묶음을 안 나눠도 그룹샷 문구를 로고 카드와 다르게 줄 수 있다.

**Why:** 유저가 "그룹"이라 하면 회사(group)가 아니라 그룹샷 단위(cluster)를 가리킨다. 또 그룹샷 문구를 로고 둘째 줄과 다르게 주고 싶을 때, 과거엔 묶음을 나눠야만 칸이 떠서 불편했다.

**How to apply:** 그룹샷 카드 문구 = cluster.label(나눔) 또는 group.label(안 나눔). 새 필드 만들지 말고 이 둘을 쓴다. 유저 설명 시 내부 명칭(cluster/group) 대신 "세력/그룹"으로 푼다([[feedback_explain_to_user]]). voice 안전: timing.ts가 단일 세력에도 clusterIndex=0을 부여해 wav는 항상 C01 형식, 단일↔그룹 전환은 wav 경로에 영향 없다.
```

## feedback_faction_groupshot_pose_cliche

```markdown
---
name: feedback_faction_groupshot_pose_cliche
description: 팩션 그룹샷 구도는 풀(pose bank)에서 매번 다르게 추출 — 클리셰 3종 반복 탈피
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 02c51d90-b617-453f-8707-db0337f08ad5
---

팩션 세력 그룹샷(화보) 발주 시 "한 명 중앙 서기 · 한 명 벽 기대기 · 한 명 걸터앉기" 구도가 거의 모든 화보에 반복돼 식상하다(앤쓰로픽 5인, 거장 3인방 등).

**Why:** 높낮이·자세 변화 원칙은 맞지만 해법이 매번 같은 3종 세트라 화보들이 서로 구분이 안 된다.

**How to apply:** "그 구도 금지"가 아니라, 구도 아이디어를 다수 모은 풀에서 발주마다 몇 개를 무작위 추출해 쓴다. 풀 문서: `sw/remotion/public/factions/llm/group-pose-bank.md` (전체 구성 A1~A10 + 개별 포즈 B + 카메라 변주 C + 사용 이력 표). 규칙: 직전 세력과 다른 구성 선택, 인물마다 포즈 다르게, 세력 톤은 유지(앤쓰로픽=클레이 등), 전원 정면 응시 유지. 발주 룰: [[feedback_image_prompt_lessons]] 참조.
```

## feedback_faction_person_lines_format

```markdown
---
name: feedback_faction_person_lines_format
description: "팩션 인물 설명 줄(lines) 표기 규칙 — 최대 3줄. 1번째는 짧은 대표 직함, 2·3번째는 길어도 됨(긴 명사구·짧은 문장형). 대사 인물은 1줄만 노출, credit 인물은 3줄 다 노출"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a8d2ec98-20c0-427a-8b79-499f9c265ac2
---

팩션(세력도) 인물 카드의 설명 줄(lines/linesEn)은 **최대 3줄**. **줄 수만큼 화면 표시가 갈리므로 1번째와 2·3번째 역할이 다르다**(2026-06-20 갱신, faction.md 「인물 문구 작성 원칙」 동기화).

**표시 방식 (Faction.tsx)**
- **대사 있는 인물(voice·text)**: 화면엔 **1번째 줄만** 이름 옆에 상시 노출 → 곧장 대사로. 2·3번째는 데이터로만 보관(화면 미노출). 대사가 인물을 설명하므로 직함은 대표 하나로 충분.
- **대사 없는 인물(credit)**: 직함 **3줄 전부** 화면 노출, 대사 없음. 이 3줄이 전부이므로 "왜 이 진영에 있는지"+조직 성격을 직함만으로 깨닫게 깊이있게 쓴다.

**전원 빡시게(필수)**: 화면 노출 여부 무관하게 **모든 인물 2·3번째 줄을 깊이있게 채운다**(롱폼 등 재사용 대비). "대사 인물이라 1줄만 보이니 2·3은 대충" 금지.

**줄별** (2026-06-20 최종)
- **1번째**: **현재 세력 직책(현직)**을 짧게. 이름 옆에 상시 붙음. 예: `CEO`, `CTO`, `Chief Scientist`, `엔지니어`. **이전 소속·전직장 1번째 금지** → 현직으로 교체, 이전 소속은 2·3으로. 특별 직책 없으면 `엔지니어`처럼 현 역할로.
- **2·3번째**: 핵심 이력·업적 **짧은 명사구**. **부각·서술 금지**(`처음 프로토타입한 연구자`→`RLHF 연구`, `사실상 GPT 설계자`→`GPT 개발`, `세계 최다`·`핵심`·`최종 베팅` 다 뺌). 다 거물이라 부각 불필요.

**`前` 미사용**: **2·3번째 줄에 `前` 안 붙임.** 이력은 과거가 기본, 현재는 1번째 직책+세력명으로 드러남. 일부만 붙으면 헷갈림 → 전면 미사용. 이전 소속은 회사명만(`OpenAI`, `GitHub`).

**설립·약칭**: `X 설립`/`X 공동설립`(ko), `X founder`/`co-founder`(en). `창업`·`창립`·동사형 `Founded X` 금지. 긴 세력명은 직함에서 약칭: `Safe Superintelligence`→`SSI`, `Thinking Machines Lab`→`TML`. (2026-06-20 LLM 전수 통일)
- 직책: CEO/President/CTO/CSO/CRO/Chief Scientist 등 통용 약어 그대로. 임의 한글 번역으로 늘이지 않는다.
- 성과: `AlphaStar 개발`, `o1 개발` 등 제품 고유명사 + `개발`.

**금지**
- 칭찬·평가어: 천재·대부·거장·선구자·은둔형 천재 (여기 나오는 사람 다 해당돼 변별 안 됨)
- 잡신상: 출신지(프랑스 출신)·나이·학력(박사급 — 다 박사급이라 무의미)
- 늘여쓴 서술: "AI 모델 공유 사이트 창업" → 제품/회사 고유명사로 (예: 캐릭터AI, ChatGPT)
- 긴 동사구: "출시 주도" → "개발"·"참여"로 충분
- 일반명사 기술용어 중 시청자가 모르는 것은 풀거나 제품명으로 대체 (단 ChatGPT·DALL·E 같은 유명 제품명은 그대로 OK)

**왜**: 변별과 즉시 이해. 모두가 거물이라 형용사는 무의미하고, 고유명사(회사·제품·전직장)라야 시청자가 즉시 구분한다.

**언어**: 약력은 **한국어 lines + 영어 linesEn 분리**로 둔다. (영어 단일 통일을 시도했으나 "어렵다"는 피드백으로 되돌림 — 한국어판 영상에 영어 약력이 어렵다.) 로더(script.ts)가 en판에서 `linesEn ?? lines`로 펼친다.

**세력명 접두 제거**: 세력 카드에 이미 회사명이 뜨므로 인물 줄에서 그 세력 회사명 접두를 뺀다(`OpenAI CEO`→`CEO`). 단 세력명이 회사가 아닌 경우(중국 등)·이전 소속·제품명은 유지.

**표시**(2026-06-19 최종): 직함은 **인물명 아래 별도 슬롯에 점마커 세로 리스트**로 띄운다(항목마다 세력색 점 + 개행, CreditLines 컴포넌트). 순서: 박스+이름+직함이 함께 등장 → 직함이 글자수 비례 시간(creditReadSec) 잠깐 보였다 페이드아웃 → 같은 자리에 대사 등장(순차 교차, 겹치지 않음). 이름은 계속 떠 있다. (한때 "이름과 한 줄 인라인 + 대사 동시 등장"으로 갔다가 순차 방식으로 복귀.) **음원은 사용 안 함** — 대사 음성 재생을 끄고(Faction.tsx `VOICE_ENABLED=false`) 컷 길이는 직함 읽기 + 대사 글자수 읽기 시간으로 잡는다(timing.ts). wav 파일·BO 패널은 보존.

**적용**: data.json은 BO 정상 저장 경로로만 수정. 인물 이력은 채울 때 웹 검증(환각 방지). [[feedback_explain_to_user]] [[feedback_no_pet_words]]
```

## feedback_faction_quote_philosophy_over_situation

```markdown
---
name: feedback_faction_quote_philosophy_over_situation
description: 팩션 인물 대사는 특정 일화·상황극·무용 과시보다 인물의 철학·사상을 담아라
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 87f6f274-ba9d-42a5-afd0-5477c07ab11a
---

팩션(세력도) 인물 대사(quote)는 "완전히 특이한 상황"(장판교 호통·정군산 무용·동관 복수 같은 일화)에 기대지 말고, 그 인물의 **철학·사상**을 압축한 선언으로 쓴다. LLM 편 대사가 기준 — 비전·신념 한 방.

**Why:** 무용 과시("이 한 몸 뚫지 못할 적진이 없다")는 그 장면을 모르면 와닿지 않고, 인물의 본질이 아니라 한 사건만 보여준다. 사상형은 인물 전체를 규정한다.

**How to apply:** 무장도 정체성을 살린 사상으로 승화 — 조운=청렴민본(전답 사양), 황충=노당익장, 장비=도원결의 의리, 마초=모든 걸 잃은 자의 불외(不畏). 역사 인물은 서재 탐방(book-recommend) 에피소드의 `host.featuredQuote`·`host.philosophy`에서 사상 인용을 따올 수 있다(예: 제갈량 = 후출사표 한적불양립). 종결은 비정중 위엄체(~다)로 통일. [[feedback_faction_quote_terse_not_abbreviation]]
```

## feedback_faction_quote_terse_not_abbreviation

```markdown
---
name: feedback_faction_quote_terse_not_abbreviation
description: "팩션 대사 \"간결체\"는 비정중체(단정·외침 종결)지 축약이 아니다. 정보·호흡 유지"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 02c51d90-b617-453f-8707-db0337f08ad5
---

팩션 인물 대사에서 유저가 말하는 "간결체"는 **종결을 정중체가 아니게**(~습니다 → ~다/~한다/~이다, 외침체) 하는 것이다. **글자 수를 줄이거나 정보를 축약하라는 뜻이 아니다.**

**Why:** 내가 간결체를 "짧게 줄이기"로 오해해 명사 종결·축약으로 만들면서 의미(값)와 호흡을 깎았다. 예: "두 달 안에 5배 높이겠습니다"→"5배."(동사·의지 누락), "가장 결정적인 시기가 될 겁니다"→"가장 뜨겁다"(의미 변질), 래리 페이지 "완성형, 오직 'AI'"(뜻 죽음).

**How to apply:** 간결체로 갈 때 문장의 정보·구조·호흡은 그대로 두고 **종결 어미만** 단정·외침으로 바꾼다. 예: "AGI가 가능하다에 베팅합니다. 바뀌겠죠." → "AGI는 가능하다에 베팅한다. 바뀐다." (정보 동일, 종결만). 정중/간결 혼용은 인물 성격대로: 사색·경고·가치=정중체, 외침·선언·구호·명령=간결체. 구도 클리셰 관련은 [[feedback_faction_groupshot_pose_cliche]].
```

## feedback_faction_quotechunks_claude_splits

```markdown
---
name: feedback_faction_quotechunks_claude_splits
description: "팩션 quoteChunks(대사 자막 덩어리) 분할은 Claude가 직접 한다. 의미·호흡 단위 수동, 분할 후 faction-align 재실행"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ddc8f98c-0285-456a-bbf1-3f9100839748
---

팩션(factions/) data.json 인물 대사의 quoteChunks(자막 페이지·점등 단위로 끊은 덩어리) 분할 작업은 Claude가 맡는다. 사용자가 "대사 나누는 것도 니가 하는거다"라고 명시.

**Why:** 통대사 1덩어리면 자막이 통째로 떠 글자수 비례 점등만 되고 의미 단위 페이지 전환이 없다. 사용자가 음성·구성을 맡는 대신 대사 끊기는 Claude 몫으로 분담.

**How to apply:**
- 글자수·어절 자동 분할 금지. 뜻이 끊기는 자리로 손수 나눈다([[sub 청크 분할은 LLM 의미 단위만, 글자수 자동 분할 금지]] 원칙 그대로).
- 절대 금지: 관형어+피수식어 분리("이것이 우리의 / 퍼스널 슈퍼인텔리전스", "포옹이라는 / 방식"), 보조용언 분리, 고유명사 파괴.
- 분할 후 자가점검: 각 덩어리가 단독으로 읽혀 의미 통하는지. 한 곳이라도 어긋나면 그 대사 다시.
- ko 작업이면 quoteEnChunks(영어 조각)는 건드리지 않는다([[feedback_no_en_touch]]).
- 분할 끝나면 `pnpm voice:faction-align -- --episode <폴더> --part <N> --lang ko`로 발화 시각 재산출. 음원 그대로면 받아쓰기(3-transcribe)는 생략(텍스트만 바뀜).
- disabled 진영 인물은 영상에서 빠지므로 분할 대상 아님.
```

## feedback_faction_ref_gesture_only

```markdown
---
name: feedback_faction_ref_gesture_only
description: 팩션 발주서 REF 보유 인물 라인은 제스처(위치·자세·소품)만 — 금지 대상은 얼굴 생김새 형용사다. 복식은 반드시 지정하되 개인 라인이 아니라 공통·묶음 단위로
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f0325ff6-12d2-4af2-b87f-73fedc094603
  modified: 2026-07-20T08:03:01.264Z
---

팩션 발주서에서 얼굴 REF(`[_refs/<인물>]`)를 넣은 인물 라인에는 **위치·자세·소품(제스처)만** 쓴다. 얼굴·나이·체격·인상·성격·복식 형용사(`a fierce veteran general`, `young handsome`, `grey-bearded`, `silver armor with blue tint` 등)를 절대 넣지 않는다. REF 없는 자율 인물만 `(no face ref — design a fitting ... face)`로 외모를 묘사한다.

**Why:** 07-three-kingdoms 촉 오호대장군 단체샷이 밀랍·딴사람으로 나왔다. 원인은 REF 보유 인물(조운·마초·황충 등) 라인에 외모 묘사가 박혀 모델이 REF를 무시하고 그 글자대로 새 얼굴을 만든 것. 유저: "_refs에 있는 인물은 REF의 인물이 ~한다, 없는 인물만 어떻게 생긴 자가 ~한다 — 원래 그렇게 했는데 풀렸다."

**균형 주의 (과하면 박제됨):** 외모를 다 빼고 REF만 주면 모델이 원본 사진 포즈를 그대로 박아 자세·시선이 뻣뻣해진다. 그래서 자세는 능동적으로 새로 지시한다 — `re-pose each person into the stance described; take ONLY the face from the reference, do NOT copy the original pose from the reference photo`. 또 REF 여러 장은 따로 노니 `as if all photographed together in a single shot with one camera, one light source, one color temperature and one film grain`으로 통합. 자율 인물은 REF 슬롯을 안 먹어 REF 3명+자율 N명 한 컷 가능(마네킹은 REF 4명+일 때만).

**복식은 빼는 게 아니라 옮기는 것 (26.07.20 유저 정정):** "복식 묘사는 해야지." 금지 대상은 **얼굴 생김새** 형용사이지 복장이 아니다. 복장을 아예 안 쓰면 모델이 REF 사진에 찍힌 옷을 그대로 가져온다 — X-Empire 제임스 머스크 REF는 야구모자+낚시 웨이더, 앤드루는 야외 식당 검은 티셔츠라 그대로 나오면 2022년 트위터 사무실 장면이 성립하지 않는다. 그러니 복장은 **반드시 지정하되 개인 라인이 아니라 공통 톤/Setting 또는 묶음 단위로** 쓴다(실행팀=정장, 삼총사=실무 캐주얼 식). 머리색처럼 REF에서 실제로 확인되는 사실은 유지 표기 가능.

**How to apply:** REF 인물 라인 = placement + pose + prop only. 공통부에 `each person's face, age, build and features come ENTIRELY from their reference image — give only placement, pose and prop, do NOT invent or describe any appearance` 박기. 복식·분위기는 공통 톤/Setting 문장에서 전체로만 지정. 한 그룹에 REF·자율 혼재 시 둘을 구분해 작성. 안대·흉터 같은 결정적 식별 특징은 부속 소품 한정 보조 표기 허용. 밀랍 유발 강조어 누적(`Photorealistic`·`Bold cinematic`·`f/1.4`·`lens flare`)도 함께 금지하고 평범한 사진 언어로. faction-image SKILL §7에 명문화됨.
```

## feedback_faction_video_remotion_media

```markdown
---
name: feedback_faction_video_remotion_media
description: "팩션 영상은 미리보기·렌더 모두 OffthreadVideo + 클립 all-intra 재인코딩. 네이티브 Video는 줌 위에서 지진처럼 떨림"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1da7daec-ec2c-437e-8bdc-1a84791c0361
---

세력도(Faction)에서 이미지 자리에 영상(.mp4 등)을 넣을 때 렌더 컴포넌트(`Faction/sections/FactionMedia.tsx`)는 **미리보기·렌더 모두 코어 `remotion`의 `OffthreadVideo`** 로 통일한다(무음, `<Sequence>`로 감쌈). 네이티브 코어 `Video` 도, `@remotion/media` 도 쓰지 않는다.

**Why (두 함정 다 겪음):**
1. 네이티브 `<video>` 요소(코어 `Video`)를 미리보기에 쓰면, 켄번스 줌(매 프레임 바뀌는 상위 CSS transform) 위에서 영상이 **사방으로 지진처럼 떨린다** (Chrome이 라이브 video를 별도 합성 레이어로 올려 상위 transform과 충돌). OffthreadVideo 는 프레임을 정지 이미지로 그려 이미지처럼 매끄럽게 줌된다(렌더가 떨림 없던 이유).
2. 추출 방식(`OffthreadVideo`·`@remotion/media`)은 클립 키프레임이 듬성하면 미리보기 seek 마다 멈춰 "0.1초 재생 후 멈춤"이 난다. → 클립을 all-intra 로 재인코딩하면 해소(아래).

**확정된 떨림 원인 (실측):** 영상 컷에 켄번스 줌(매 프레임 scale 이 바뀌는 transform)이 걸리면 **스튜디오 미리보기에서 영상이 사방으로 떤다**. 영상 컴포넌트(네이티브 Video·OffthreadVideo·@remotion/media)도, transform 을 요소 자체에 걸든 상위에 걸든 다 떤다 — 즉 그리기 방식·transform 위치 문제가 아니라 **"움직이는 줌 + 영상" 자체가 미리보기에서 떠는 것**(Chrome 영상 레이어 한계). 이미지 컷은 같은 줌이어도 안 떤다. **렌더는 안 떤다**(OffthreadVideo 가 프레임을 정지 이미지로 추출 → scale 매끄러움, 프레임 떠서 확인함). 유저가 `noZoom` 켜서 미리보기 정상 확인 → 줌이 범인 확정.

**해결/기능:** `FactionScript.noZoom?: boolean` 플래그 추가(타입 2곳 + CueLayer 가 PersonCard/GroupCard/ClusterCard 로 전달 → fxTransform·scale 을 1 로 고정). true 면 미리보기·렌더 모두 줌 정지. 01-llm 은 noZoom:true 로 운용 중. (참고: "미리보기만 영상 줌 멈추고 렌더는 줌 유지" 분기를 만들려다 유저가 전역 플래그로 충분하다 해서 보류함.)

**How to apply:**
- 영상은 반드시 `<Sequence from={컷시작프레임} layout="none">`로 감싼다. 안 그러면 컴포지션 전체 프레임을 재생 위치로 읽어, 컷이 영상 길이보다 뒤에서 시작하면 끝 프레임에 멈춘 채 줌만 먹어 "떨리는 한 장면"으로 보인다.
- `OffthreadVideo` 는 `loop` 미지원이라 muted 만(클립이 컷보다 길면 무관). onError 는 `(err:Error)=>void` 라 `()=>onError()` 래핑 가능.
- **결정적 원인은 따로 있었다 — 영상 클립의 키프레임이 1개뿐**(AI 생성물이 흔히 그럼). 60fps 합성을 미리보기가 실시간으로 못 따라가면 매 프레임 영상을 seek 하는데, 키프레임이 맨 앞 1개뿐이면 seek마다 0초부터 디코딩 → "조금 재생→0.5초 멈춤" 반복. ffprobe 로 확인: `ffprobe -select_streams v:0 -show_entries frame=pict_type -of csv=p=0 x.mp4 | grep -c I` 가 1이면 범인.
- **해결: 클립을 all-intra(모든 프레임 키프레임)로 재인코딩.** `ffmpeg -i in -an -c:v libx264 -preset slow -crf 18 -g 1 -keyint_min 1 -pix_fmt yuv420p -movflags +faststart out`. 거의 무손실, 용량 5~6배(gitignore 자산이라 무관), 1080p/fps 유지. 모든 seek가 1프레임 디코딩이라 즉시. 원본은 항상 백업(예: out/_faction-orig-video-backup/). 자산 덮어쓰기라 [[feedback_file_safety]] 준수.
- Studio 미리보기 디코딩 "품질 %" 슬라이더는 없다(내가 잘못 안내했음). 미리보기 옆 배율은 보이는 크기만 줄임 — 끊김엔 큰 도움 안 됨.
- 60fps라 영상 자체가 매끄러워도 줌(매 프레임 transform)은 기기가 60fps 못 뽑으면 약간 버벅일 수 있으나 렌더엔 무관. 관련: [[feedback_no_restart_dev_server]]

**정정 (26-07-02, remotion 4.0.434 소스 확인):** OffthreadVideo는 **미리보기에선 네이티브 `<video>`(VideoForPreview)로 재생**된다. 프레임 추출은 렌더 전용. 따라서 all-intra는 미리보기 "연속 재생" 속도와는 무관하고, seek/스크럽·렌더 추출에만 유효하다. 미리보기가 통째로 느리면(0.8배속 체감) 영상 탓 말고 [[feedback_studio_preview_lag_profile_first]]대로 프로파일링부터.
```

## feedback_faction_voice_positional_rename

```markdown
---
name: feedback_faction_voice_positional_rename
description: "팩션 음성 wav는 위치 기반 파일명(FxxCxxPxx). 인물을 그룹/묶음 간 이동하면 wav 이름을 직접 바꿔야 하고, 빈 자리 뒤 인물들이 한 칸씩 밀려 연쇄 재배치 필요"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6c03293e-0258-4522-9c4f-648854aef64a
---

팩션(세력도) 인물 대사 음성은 `public/factions/<ep>/voice/F{그룹+1}C{묶음+1}P{인물+1}-quote.wav` 형식의 **위치 기반 파일명**이다(0패딩). 파일명 규칙 SSoT: `sw/remotion/src/compositions/Faction/voice-names.ts`의 `vnPersonQuote` + BO 측 복제본 `sw/remotion-bo/src/lib/faction-voice.ts`. data.json엔 음성 파일명이 없고 인덱스로 계산된다(quoteElevenlabsVoiceId·quoteDuration만 있음).

**함정**: data.json에서 인물을 옮기거나 **그룹을 병합·삭제·순서변경**하면 음성이 자동으로 안 따라온다. BO에서 "음성 확인 안 됨", 또는 영상에서 **엉뚱한 인물 음성이 재생**된다(F인덱스가 밀려 옛 좌표 wav가 다른 인물에 매칭). F번호 = `groups` 배열 raw 인덱스+1이며 **disabled 그룹도 번호를 소비**한다.

**그룹 레벨 변경이 더 위험**: 두 그룹을 하나로 병합하면 그 뒤 모든 세력의 F번호가 1씩 당겨져 **수십 개 wav가 한꺼번에 어긋난다**. 데이터 구조(그룹 병합/삭제/이동)를 건드리기 전에 음성 좌표 영향을 먼저 점검할 것. 또 그룹 객체를 재구성할 때 필드를 일일이 나열하면 `titleArt` 등이 누락된다 — `{...group, ...}` 스프레드로 보존하라(2026-06-23 시조 병합 때 titleArt 떨어뜨려 Studio에서 로고 사라짐).

**How to apply**: voice/ 의 wav를 직접 rename. (1) 인물 이동 시 빈 자리 뒤 같은 묶음 인물들이 P 인덱스 한 칸씩 밀린다(P03→P02 …). (2) 그룹 병합/삭제 시 F번호가 시프트되니 전 세력 wav를 매핑해 옮긴다. **`voice/2-word-timings.json`의 targets 키도 같은 좌표라 함께 rename 필수.** wav는 gitignore라 복구 불가 — 먼저 `_archive/`에 통째 백업. 충돌 방지로 임시폴더 경유 후 일괄 이동. 끝나면 word-timings 첫 단어가 data.json 해당 인물 quote 첫 어절과 일치하는지 교차 검증(또는 ffprobe로 quoteDuration 대조).

예1(2026-06-19 샤지어 구글딥마인드→OpenAI): `F03C02P02`→`F04C01P05`, 딥마인드 `P03/P04/P05`→`P02/P03/P04`.
예2(2026-06-23 시조+딥러닝 그룹 병합): 딥러닝 `F02C01*`→`F01C02*`(둘째 묶음 흡수), 그 뒤 `F03~F13`→`F02~F12`. wav 50개+word-timings 36키 일괄 재매핑.

[[reference_voice_r2_paths]]
```

## feedback_file_safety

```markdown
---
name: ""
description: "gitignore 자산(이미지, 음성) 삭제/덮어쓰기 전 반드시 백업 + 사전 확인. git 복구 불가"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3a8ffef2-7084-459d-b167-27d6cdab1460
---

이 프로젝트의 핵심 자산(에피소드 이미지, 음성, 커버 등)은 전부 gitignore 대상이다. git 복구 불가.

**Why:** 세 번 반복된 사고 — 이순신 이미지 킵 실패, 알렉스 카프 구버전 삭제, 일론 머스크 24장 덮어쓰기. 전부 gitignore 파일이라 복구 불가.

**How to apply:**
- 파일 삭제/덮어쓰기 전 반드시 _backup 폴더에 원본 복사
- 새 파일은 나란히 배치하거나 별도 폴더에 두고, 유저 확인 후 교체
- 구버전/미사용 파일 발견 시 목록만 보고. 유저 지시 후 실행
- "킵해놓고" 요청 시 문서 메모가 아닌 실제 파일 cp
- **untracked 파일도 git 복구 불가.** "git에 있으니 복구 가능"이라 단정 말고 `git ls-tree HEAD -- <경로>`로 HEAD 추적 여부를 **실제 검증한 뒤** 삭제. 한글 폴더는 `git status`에 변경이 안 보여도 추적이 아니라 untracked일 수 있다(2026-06-27 천하대란 분할 시 원본 폴더를 not-using으로 cp 백업했다가 "git 복구 가능" 오판으로 백업까지 rm → research 사료조사 md 4개·prompts md 1개 영구 소실. data.json 인물데이터는 새 3편에 보존돼 무사). 백업을 지우려면 원본이 HEAD에 있음을 먼저 확인하라. MSYS `rm`은 휴지통도 안 거친다.
- **한글 JSON 편집은 Edit tool 금지.** Windows 환경에서 한글 멀티바이트 + 같은 파일 연속 Edit + "File modified since read" 재시도 시 인코딩이 깨져 한글 전체가 `?`로 치환되는 사고가 발생. 링컨 ko.json philosophy/celebIntro/outro/summary 손상(2026-04-08). gitignore 자산이라 git 복구 불가. 한글 JSON은 Node/Python 스크립트로 readFileSync('utf8') → JSON.parse → 수정 → JSON.stringify → writeFileSync('utf8') 경로 필수. 작업 전 .bak 백업, 성공 후 .bak 삭제.
```

## feedback_gaze_action_binding_images

```markdown
---
name: feedback_gaze_action_binding_images
description: 이미지 발주 프롬프트에서 행동·시선·몸방향은 한 묶음으로 명시(행동만 쓰면 시선이 딴 데 감) + 카드 3장 중 시그니처 연출 컷 1장 규칙
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 30f3e78d-1890-4ee7-9219-94778eb91ad1
---

인물 이미지 발주 프롬프트에서 **행동·시선·몸방향은 반드시 한 묶음으로 명시**한다. 행동만 쓰면("현미경 작업 중") 생성 도구는 현미경 앞에 앉아 **딴 데를 보는** 인물을 그린다. 두 번 재발한 문제.

**Why:** AI-Supremacy 카드뉴스에서 반복 확인 — 현미경을 쓰는데 접안렌즈를 안 보고, 칠판에 쓰면서 카메라를 보고, 문서를 들고 허공을 봄. "focused expression" 같은 표정 어휘로는 못 잡는다.

**How to apply:**
- 프롬프트에 세 요소를 한 문장 흐름으로: ①행동 ②시선 대상 명명(eyes pressed to the microscope eyepiece / gaze locked on the line he is writing) ③고개·몸 방향(head bent low over the scope). 대상이 이름으로 등장해야 결합 성립.
- 생성물 자가 점검 항목: "행동의 초점을 실제로 보고 있는가" — 어기면 그 장만 재생성.
- **시그니처 컷 규칙**: 카드 스토리 3장 중 정확히 1장은 유니크 연출(로우앵글·역광 실루엣·키아로스쿠로·부감·반영 샷·색조명 지배 등 강렬한 조명·구도). 초현실 금지 — 현실 장면의 연출 강화다. 나머지 2장은 자연 다큐 톤. 연출 기법은 인물마다 다르게(클리셰 반복 금지, [[feedback_faction_groupshot_pose_cliche]]와 같은 취지).
- SSoT: `_docs/story-image-work-order.md` 공통 품질 기준에 명문화됨(2026-07-04).
```

## feedback_gemini_tts_no_saguk

```markdown
---
name: gemini_tts_no_saguk
description: Gemini TTS는 2.5/3.1 모두 한국어 사극체 재현 불가. ElevenLabs 전용
type: feedback
originSessionId: b87da68f-bd13-462d-b880-73073ee63161
---
Gemini TTS는 모델 버전(2.5-flash-preview / 3.1-flash-tts-preview)과 무관하게 한국어 사극체(비장체·낮은 톤·결연·호통·속삭임 같은 시대극 캐릭터 발화) 재현이 불가능하다.

**Why:** 2026-05-01 직접 비교 테스트 — Charon·Sadachbia·Algieba 3종 보이스로 사극 4 케이스(격노→용서, 비장→간청, 한자어 사색조, 속삭임→외침)를 prefix 방식과 3.1 inline 태그 방식 양쪽으로 24개 생성. 유저 청취 결과 "2.5나 3.1이나 동일하게 사극체가 불가능함" 결론. 한국어 본문에 영어 inline 태그를 넣어도 톤 전환 효과 미미, 일반체와 구별이 약하다. `[pause]` 태그만 길이 차이로 또렷이 작동했고 톤·register는 그대로다.

**How to apply:**
- 사극체·비장체·시대극 캐릭터 발화는 **ElevenLabs 전용**(이미 user-exclusive 정책). Gemini로 대체 시도 금지.
- 3.1 업그레이드는 사극 retone을 명분으로 정당화 불가. 단가 2배 부담만 늘어난다.
- 영어 사극풍·셰익스피어풍 텍스트는 별도 검증 필요(미테스트). 한국어에서만 닫힌 결론.
- 향후 "사극 톤 더 살려보자" 류 요청에 Gemini 모델 변경/태그 튜닝을 재제안하지 않는다. retone 파이프라인 보강(tail padding, manual normalize 등) 또는 ElevenLabs 쪽으로 우회한다.
```

## feedback_gloss_dont_strip

```markdown
---
name: feedback_gloss_dont_strip
description: 어려운 용어·시적 표현을 쉽게 만들 때 삭제하지 말고 해설을 덧붙인다
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2e9a4f25-84bc-4f87-b660-4eab790d3aef
---

대사·수식어를 쉽게(할머니도 이해되게) 다듬을 때, 어려운 고유명사·외래어·시적 표현을 **삭제("날리기")하지 말고 그 옆에 일상어 해설을 끼워 넣는다.**

예(팩션 디지털저항군 발로우 대사):
- "산업 시대의 정부들이여" → "산업 시대의 **낡은** 정부들이여"
- "사이버스페이스에서 왔다" → "**온라인 세상** 사이버스페이스에서 왔다"
- "살과 쇠로 된 지친 거인들" 같은 시적 비유는 앞에서 정체가 드러나면 그대로 살린다.

**Why:** 고유명사·시적 원문은 인물의 정체성과 명문의 무게를 담는다. 통째로 쉬운 말로 갈아치우면 의미는 통하나 맛이 죽는다. 유저가 "날리기보단 해설 추가"로 명시 지시.

**How to apply:** 어려운 단어는 동격으로 풀이를 붙인다("이름 + 풀이"). 수식어 작업의 "걷지 말고 쓰면서 설명"과 같은 원칙. [[feedback_text_condensing]] [[feedback_explain_to_user]] 와 연결.
```

## feedback_image_prompt_lessons

```markdown
---
name: 이미지 프롬프트 생성 교훈
description: fal.ai 이미지 생성 시 프롬프트 작성에서 반복된 실패와 교훈
type: feedback
---

## 교훈

1. **책 내용을 정확히 읽어라** — "시신을 돌려받지 못한 어머니"인데 시신을 옆에 놔두는 식의 모순. summary/context 필드를 반드시 읽고 내용에 맞는 장면을 구성할 것.

2. **AI는 "Greek armor"를 써도 로마 갑옷을 넣는다** — 시대 고증이 필요하면 구체적 장비명(코린토스 투구, 호플론 방패)을 쓰거나, 아예 역광 실루엣으로 갑옷 디테일을 제거하는 게 낫다. "NOT Roman, NOT medieval" 같은 부정문도 잘 안 먹힌다.

3. **"추락"이라고 쓰면 AI는 땅 위 장면을 만든다** — "falling"만으로는 공중 추락이 안 된다. "no ground visible", "surrounded by clouds only", "body fully inverted, head pointing downward" 같은 명시가 필요하다.

4. **같은 인물의 c 이미지가 전부 똑같아진다** — 마르쿠스 9개 c가 다 "천막+램프+두루마리". 에이전트에 "매번 다른 장소/시간대/앵글" 지시를 줘도, 각 책의 context 필드에 적힌 구체적 상황을 직접 시각화하지 않으면 공식대로 찍어낸다.

5. **프롬프트가 길고 시적이면 AI가 무시한다** — "속박에서 태어난 자유의 역설을 정물로 표현" 같은 추상 문장은 무의미. 촬영 지시처럼 짧고 구체적으로: 샷 크기, 앵글, 피사체, 조명.

6. **비율 지정은 잘 안 먹힌다** — "same proportions as a real rider" 같은 지시를 해도 말이 3배 크게 나온다. 이런 경우 3장 뽑아서 제일 나은 걸 고르는 게 현실적.

7. **Schnell로 3장 뽑아 선택하는 게 Pro 1장보다 효율적일 수 있다** — 비용 $0.009 vs $0.05. 결과 변동이 큰 프롬프트는 저가 모델로 여러 장 뽑아 선별하는 방식이 낫다.

8. **두루마리/양피지/책 페이지 클로즈업은 텍스트를 생성한다** — 문서 오브젝트의 클로즈업 구도 자체를 피할 것.

**Why:** marcus-aurelius 18장 생성 과정에서 10회 이상 재생성하며 확인한 패턴들.

**How to apply:** 프롬프트 작성 시 위 항목을 체크리스트로 확인. 난이도 높은 장면(추락, 시대 고증 등)은 Schnell 3장 선별 방식 사용.
```

## feedback_inline_suggestion_only

```markdown
---
name: feedback_inline_suggestion_only
description: "유저 원본 글은 손대지 마라. 개선은 원문 안 [이거 추천함] 인라인 메모로만. 글쓰기 위임 아님"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c868430c-3a42-4402-b33a-0a4f6b3ec1da
---

유저가 직접 쓴 에피소드/솔로 본문은 위임받지 않는 한 **한 글자도 고치지 않는다.** "전체 봐주되 마지막에 집중"은 마지막만 보라는 뜻이지 전체를 윤문하라는 뜻이 아니다.

개선이 필요하면 **원문은 그대로 두고, 본문 사이에 `[이거 추천함] ...` 형태의 제안 메모를 개행으로 끼워넣는 방식**으로만 전달한다. 유저가 채택 여부를 직접 정하고 메모만 지운다.

**Why:** 일론머스크 솔로(solo.ko.json) 작업에서 마무리만 손보라 했는데 s1~s8까지 멋대로 윤문했고, ~죠 구어체 호흡을 ~습니다 문어체로 일괄 치환해 오히려 번역투로 만들었다("~했노라고" 같은 더 나쁜 직역체까지 끼워넣음). 유저: "너는 글을 쓰면 안 되겠다."

**How to apply:**
- 원문 글자·어순·종결어미(~죠 등 구어 호흡 포함) 절대 변경 금지. [[feedback_no_unneeded_paraphrase]]
- 제안은 방향 제시 + 최소 예시만. 내가 통째로 재작문해 새 문장으로 덮지 않는다.
- 이미 본문에서 다룬 갈등(예: 두 인물의 길이 갈라짐)을 마무리에서 새 비유로 또 꺼내 2차 공격하지 않는다. 라운드2 중복이 된다.
- 마무리는 유저가 깔아둔 착지(예: "매일 더 올바른 질문으로")를 살리는 쪽. 새 무기 추가 금지.
- gitignore 자산이면 편집 전 백업 필수. [[feedback_file_safety]]
```

## feedback_jiyo_overuse

```markdown
---
name: ~지요 종결체 남용 금지
description: 한국어 정중체 ~지요는 단락 매듭 1회 이내. 한 텍스트 안 2~3번 이상이면 톤 단조해짐
type: feedback
originSessionId: 3b22290e-23a7-40c3-9c7f-98daebb9a41d
---
"~지요"·"~이지요"·"~었지요" 종결을 한 텍스트(단락) 안에서 1회 이내로만 사용한다.

**Why:** 제갈량 쇼츠3 작업에서 한 단락에 "~지요"가 4~6회 반복되어 톤이 단조롭고 거슬린다는 사용자 지적을 받음. "지요...체 주의"라는 압축 피드백.

**How to apply:**
- 단락 매듭(마지막 한 문장)에만 강조용으로 1회 허용. 그 외에는 "~었습니다", "~입니다", "~합니다", "~이었습니다", "~합니다" 등으로 분산.
- 한 쇼츠/세그먼트 텍스트 전체에서 2~3번 이상 등장하면 의식적으로 절반 이상을 다른 종결로 교체.
- 기본 정중체 어미는 "~습니다"가 표준. "~지요"는 부드러운 매듭의 양념일 뿐이다.
- "지요" 외에도 같은 종결의 3연속(~했습니다·~했습니다·~했습니다)도 4-prose 규칙대로 피한다. 모든 종결체에 동일 원칙 적용.
```

## feedback_korean_breath_per_person

```markdown
---
name: feedback_korean_breath_per_person
description: 한국어는 호흡이 생명. 인물마다 문장 길이·끊는 자리가 달라야 하며 말투 지정만큼 중요하다
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e6068eb6-1855-41fb-bc7a-e1f2a99248c7
---

한국어 글은 호흡이 생명이다. 문장 길이, 끊고 잇는 자리, 쉬어 가는 대목이 **그 인물과 함께 살아 숨 쉬어야** 한다. 급하게 밀어붙인 사람은 짧게 치고 나가고, 오래 눌러 생각한 사람은 길게 감는다. 말이 무거운 사람은 쉼이 길다.

**Why:** 말투(정중체/평어체)를 갈라 놓아도 호흡이 같으면 결국 같은 사람이 말하는 소리가 된다. 인물 구분의 축이 말투 하나로 좁아진다. 유저 표현으로 "말투만큼이나 중요하다".

**How to apply:** 인물 목소리를 만드는 발주서(가상 독백, 대사, 영상 대본)에 호흡을 **명시적으로 한 줄 넣는다.** 모델 성능만 믿고 알아서 하겠거니 두지 않는다. 단 "호흡을 살려라"가 단문 남발로 오해되지 않게 못박는다 — 어설픈 토막 내기는 [[feedback_cut_over_choppy_rhythm]] 위반이다.

관련: [[feedback_korean_voice]] · [[feedback_cut_over_choppy_rhythm]] · [[feedback_korean_connectors]]
```

## feedback_korean_connectors

```markdown
---
name: 한국어 연결어 규칙
description: 스크립트/산문에서 문장 시작 연결어 필수, 같은 연결어 반복 금지
type: feedback
---

한국어 산문/대사는 문장 시작에 연결어(그러나, 결국, 그래서, 이후 등)가 없으면 번역체처럼 어색하다.

**Why:** 영어와 달리 한국어는 연결어 없이 나열하면 맥락이 끊긴다. "~했습니다. ~했습니다." 식 나열은 건조하고 부자연스럽다.

**How to apply:**
- 새 문장 시작 시 앞 문장과의 관계(순접·역접·인과·전환)를 문두 연결어로 표시
- 같은 연결어를 가까운 문장에서 반복하지 않는다
```

## feedback_korean_name_common_usage

```markdown
---
name: feedback_korean_name_common_usage
description: 인물 한글 표기는 표준 음역이 아니라 한국에서 가장 많이 통용되는 표기로. 갈리면 웹 검색 확인
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2c32f6fa-436c-4158-b47b-3c59bde3b33a
---

인물 한글 이름은 **한국에서 가장 많이 확인·통용되는 표기**를 항상 우선한다. 외래어 표기법(표준 음역)이 통용 표기와 다르면 통용 표기를 따른다. 둘이 갈릴 때는 웹 검색으로 한국 매체·검색에서 더 많이 쓰이는 쪽을 확인한 뒤 결정한다.

**Why:** Thomas Wolf를 프랑스어 표준 음역 "토마 울프"로 등록했더니, 한국 매체는 "토마스 울프"가 더 통용된다며 교체 지시. 표준 음역 규칙을 기계적으로 적용하면 실제 검색·인지와 어긋난다.

**How to apply:** 셀럽 등록·영상 데이터·이미지 파일명·DB nickname 모두 통용 표기로 통일한다. slug(영문)는 무관. 규칙은 `docs/project/celeb/celeb-1-basic-profile.md` 작성 규칙 1번(nickname)에 박아둠. 이름은 유저 민감 영역이므로 갈리면 임의 결정 말고 검색 근거를 댄다. 관련: [[feedback_no_google_books]] 식으로 출처 검증 습관 연계.
```

## feedback_korean_sentence_order

```markdown
---
name: 한국어 문장 어순 원칙
description: 한국어 작문 시 도치/역순 금지, A는 B를 C한다 자연어순 유지
type: feedback
---

한국어 문장에서 어순을 억지로 뒤집지 않는다. "A는 B를 C한다" 자연어순 그대로 쓴다.

**Why:** 주어를 뒤로 밀거나 목적어를 앞세우는 도치가 한국어에서 어색한 경우가 많다. 문학적 효과를 노린 도치도 대부분 부자연스럽다.

**How to apply:** 모든 한국어 텍스트 작성 시 (영상 스크립트, 독서경위, 감상여정 등) 기본 어순을 유지한다. "저는 X를 Y에서 찾고 있습니다" ○ / "X를 저는 Y에서 찾고 있습니다" ✕ / "저는 Y에서 찾고 있습니다. X를." ✕
```

## feedback_korean_voice

```markdown
---
name: 한국어 자연 화법으로 응답
description: 영문 직역체(체언 종결, 콜론 헤더, 명사 나열, em dash, 영어 어순)를 모든 응답에서 차단하고 한국어 자연 화법으로 풀어 쓴다
type: feedback
originSessionId: 51afed81-1356-4687-81bb-f2a146eda02b
---
응답 어투를 한국어 자연 화법으로 잡는다. 영문 사고 패턴이 새어나오지 않게 송출 직전에 자가 점검한다.

**Why:** 유저가 "너 항상 영어 기반으로 생각하더라"고 명시 지적했다(2026-05-04). 직전 점검 보고에서 다음이 그대로 노출됐다 — 콜론 헤더("**점검 내역**"), 명사 나열형 종결("쇼츠 직접 참조 없음", "보존 권고", "일관성 확보. 마무리"), 영어 대조 구조("X이지 Y가 아니다"), em dash. 단순한 단어 선택이 아니라 문장 골격 자체가 영문 직역이었다.

**How to apply:**
- 동사로 끝낸다. "보존 권고" → "그대로 둔다", "참조 없음" → "참조가 없다"
- 명사 나열로 압축하지 말고 풀어 쓴다. "X 부재" → "X가 빠져 있다"
- 콜론 헤더("**점검 내역**:") 대신 평문 한 줄로 운을 뗀다
- em dash(—) 금지(별도 메모리 feedback_no_em_dash_korean). 마침표·쉼표·괄호로 푼다
- 한국어 자연 어순(주어-목적어-서술어) 유지. 도치·후치 금지(별도 메모리 feedback_korean_sentence_order)
- 코드 용어(image-anchor-sync, schema 등)는 일상어로 풀어 쓴다(별도 메모리 feedback_explain_to_user)
- 송출 직전 자가 점검 — "이 문장을 소리 내 읽었을 때 한국어처럼 들리는가? 영어 문장을 그대로 옮긴 골격인가?"
```

## feedback_narrator_carries_when_dialogue_static

```markdown
---
name: 정적 정보 인용은 나레이터에 맡긴다
description: 책 본문 명제처럼 희로애락·기승전결이 없는 정보 진술은 직접인용 슬롯에서 빼고 나레이터가 "이 책의 핵심은 ~" 식으로 끌고 간다
type: feedback
originSessionId: e22d9e0b-5c6a-4701-b9c9-df0efeab0038
---
quotePairs[].quote 또는 쇼츠 celeb 발화 슬롯이라도, 대사 자체에서 희로애락·기승전결이 발생하지 않으면 거기에 두지 않는다. 나레이터가 "이 책의 핵심은 이것입니다 / 그가 남긴 명제는 이것이었습니다" 식으로 흐름을 끌고 간다.

**Why:** 직접인용 슬롯은 감정·갈등·결단이 일어나는 자리다. 책 본문의 정보 진술처럼 정적이고 명제적인 텍스트가 거기 앉으면 드라마 동력이 죽는다. 편집국 손에 맡겨야 할 구간이다.

**How to apply:**
- 직접인용 후보를 보면 자가 점검: 이 발화 자체에 사건·감정·전환이 있는가. 없다면 나레이터로 옮긴다.
- 옮길 때 "이 책의 핵심은 단 한 문장입니다. ~" / "그가 남긴 명제는 이것이었습니다. ~" 식으로 핵심만 나레이터가 압축 전달.
- 책 본문 명제(예: 고든 『구조』의 "모든 구조물은 가장 약한 한 곳에서 무너진다")는 셀럽·증인이 발화하는 게 아니라면 나레이터에 양보.
- 셀럽 본인의 발화·증인의 증언처럼 사건성·감정성이 있는 대사는 직접인용 유지.
- 직접인용 자격 기준은 feedback_quote_substantive_only.md와 함께 적용.
```

## feedback_no_absent_record_claim

```markdown
---
name: 사료 부재 단정 전 재검색 필수
description: "정사에 기록 없다" "분명한 기록이 없다" 등 사료 부재 단정 전 반드시 웹 검색 한 번 더 수행
type: feedback
originSessionId: 3b22290e-23a7-40c3-9c7f-98daebb9a41d
---
사료가 없다고 단정해서 글을 쓰지 않는다. "분명한 기록이 없다", "정사는 말하지 않는다" 같은 표현은 거짓일 가능성이 높다.

**Why:** 제갈량 쇼츠 작업에서 "제갈량이 손자병법을 언제 만났는지 정사가 기록하지 않는다"고 썼는데, 실제로는 (1) 제갈량이 손자병법 본문에 직접 주해를 단 주석가였고 (토마스 클리어리 영역서 *Mastering the Art of War* 원전이 존재), (2) 출사표가 손자병법 「허실」편을 인용하고 있다는 명확한 사료가 있었다. 사용자가 다시 찾아보라 지적해 발견.

**How to apply:**
- "기록 없다"는 결론을 쓰기 전에 반드시 한국어/영문/한자 키워드 각각 웹 검색을 한 번 더 한다.
- 특히 동아시아 인물(제갈량·이순신·세종 등)은 본인 저작·주해·후대 주석집·문집이 광범위하게 남아있다. 직접 인용·주해·서간 기록을 꼭 검색.
- 한문 인물의 경우 "주해(注)", "주(註)", "전(箋)", "소(疏)", "집(集)", "초(抄)" 같은 학술 행위 명사를 키워드에 넣어 검색.
- 부재 단정 대신 "이렇게 기록되어 있다"로 양성 사료를 찾아 글을 쓴다. 양성이 압도적으로 더 강하다.
- 사용자에게는 단정 표현을 줄이고, 발견한 사료를 직접 노출(주해·인용편명 등 고유명사 포함).
```

## feedback_no_auto_generation

```markdown
---
name: 이미지/음성 등 유료 API 생성 금지
description: fal.ai, ElevenLabs 등 유료 API를 사용하는 생성 작업은 반드시 사전 승인 필요
type: feedback
---

유료 API를 사용하는 생성 작업(이미지, 음성 등)은 **절대적 승인을 받아야만** 실행할 수 있다. 승인 없이 자동 실행하지 않는다.

**Why:** 사전 승인 없이 fal.ai 이미지 생성을 실행하여 비용이 발생했고, 파일 rename 사고로 기존 이미지를 소실시킨 뒤 복구를 위해 추가 생성까지 시도했다. 비용이 드는 작업을 함부로 실행하면 안 된다.

**How to apply:** fal.ai, ElevenLabs, OpenAI 등 외부 유료 API 호출이 포함된 스크립트 실행 전에 반드시 "실행할까?" 확인을 받는다. 프롬프트 작성·파일 준비까지만 하고 실행은 승인 후.
```

## feedback_no_documentary_sermon

```markdown
---
name: feedback_no_documentary_sermon
description: "영상 대본은 사실로 끝내라. 인생역전·설교·감동 다큐 마무리(\"가장 낮은 곳→높은 곳\", \"~의 주인이 되었다\", \"삶으로 증명\") 전면 금지"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4a406896-1029-4eb6-b8f8-c97c4f7b6e69
---

쇼츠·솔로·롱폼 등 영상 대본 한국어 내레이션에서 **설교형/감동 다큐 톤을 전면 금지**한다. 각 세그먼트의 마지막 문장은 의미·교훈·반전을 못박지 말고 **사실 진술로 끝낸다**. 판단은 시청자 몫.

절대 금지 패턴:
- 인생역전 클리셰: "가장 낮은 곳에서 출발해 가장 높은 곳에", "끝내 ~의 주인이 되었다", "끝내 ~가 되었습니다"
- 감상 단정: "삶으로/온몸으로 증명했다", "누구보다 정직하게 증명하고 있습니다", "그 사실을 가장 잘 보여줍니다", "한 권의 책이 한 사람의 평생을 바꿨다"
- 드라마 과장: "벼랑 끝", "처참한 실패", "거대한 제국", "모두가 비웃은", "결국 세상을 바꿉니다", "제 발로 벼랑에 뛰어내린", "자기 몸으로 읽어냈습니다", "AI 시대의 문을 열었습니다"
- 사물·추상 주어 마무리: "한 문장은 …방법이 되었다", "활자 위의 상상이 …되어 돌아올 수 있다", "화장실 문을 열던 손이 …그렸습니다"
- 작위적 3중 대구: "변기를 닦던 손, 접시를 닦던 손, …그 손이"

**Why:** 유저가 이 톤을 "쓰레기/역겨운 것"으로 강하게 거부. no-trash-prose 스킬을 로드하고도 단어만 바꾸고 설교 마무리 톤은 그대로 남겨 반복 지적받음(젠슨황 북리커맨드 정비). 단어 블랙리스트 매칭만으로는 못 잡는다 — 문장의 톤 자체가 문제.

**How to apply:** 문장마다 "이게 한국인이 담담히 사실 말하는 문장인가, AI 감동 다큐인가" 직접 판단. 걸리면 단어 교체가 아니라 **문장째** 평문으로 다시 쓴다. 마무리는 일어난 일로 끝낸다. 예: ✗"가장 낮은 곳에서 출발한 황은 …가장 높은 곳에 올랐습니다" → ✓"황은 아무도 없는 자리에 이름을 먼저 올리는 길을 택했습니다. <포지셔닝>에서 얻은 답이었습니다." [[feedback_no_pet_words]] [[feedback_no_object_subject_korean]] [[feedback_korean_voice]] no-trash-prose·ko-detranslate 스킬과 함께 적용.
```

## feedback_no_em_dash_korean

```markdown
---
name: 한국어 텍스트에 em dash 금지
description: 한국어 본문·자막·내레이션에 em dash(—, –) 사용 금지. 영어 번역체로 어색하다
type: feedback
originSessionId: 3969c1a6-e5ae-4822-ac7c-906a65f6add4
---
한국어 텍스트(본문·자막·나레이션·해설·소개문 등)에는 em dash(`—`)나 en dash(`–`)를 쓰지 않는다. 한국어 문장 부호로 받아들여지지 않으며, 번역체(특히 영어 번역체)로 읽힌다.

**Why:** 한국어는 마침표·쉼표·콜론으로 호흡을 끊는 게 자연스럽다. em dash는 영어 산문에서 부연·강조·전환을 한 호흡에 묶는 부호인데, 한국어로 옮길 때 그대로 가져오면 어색·번역체가 된다.

**How to apply:**
- 보충/부연: em dash 대신 마침표로 끊고 새 문장으로 시작 (`...했습니다. ...였습니다.`)
- 강조 도치: em dash로 도치하지 말고 자연어순으로 풀어쓴다 (`A—B` → `A는 B다` 또는 `A. B.`)
- 동격 부연: em dash 대신 쉼표나 괄호 (`A, 즉 B` / `A(B)`)
- 대화 끊김·말 더듬: 한국어는 줄임표(...)나 쉼표가 자연스럽다
- en dash(–)도 동일하게 금지 (수치 범위는 물결표 ~ 사용)

본문 작성·교정 시 em dash가 들어 있으면 즉시 마침표 또는 쉼표로 교체하고 호흡을 다시 짠다.
```

## feedback_no_en_touch

```markdown
---
name: ko 작업 시 en 데이터 동시 수정 금지
description: 국문(ko) 작업 요청 시 영문(en) 데이터를 함께 건드리지 않는다. en 작업 요청 시에는 당연히 en을 수정한다
type: feedback
originSessionId: 799c2ea1-dbda-492b-b8e1-bffe60681f81
---
ko 관련 작업(콘텐츠 수집, DB 등록, ko.json 작성·수정, review 작성 등)을 요청받았을 때 en 데이터(en.json, review_en, content_locales en 로케일 등)를 함께 자동으로 손대지 않는다.

**Why:** 사용자가 명시적으로 금지. DB 정비 작업에서 ko만 손봐달라 했는데 en 로케일까지 자동 등록한 것이 트리거. 단, 사용자가 직접 "en 검토/수정/번역" 등 영문본 작업을 명시적으로 지시한 경우는 당연히 수정 대상이다.

**How to apply:**
- ko 작업 요청 시 → en 파일·컬럼은 건드리지 않는다
- en 작업이 명시적으로 요청된 경우 → en.json, review_en 등 정상적으로 수정한다
- 모호하면 묻는다 (feedback_ask_multiple_choice)
```

## feedback_no_fabricated_recommendations

```markdown
---
name: 사실 확인 없는 추천 금지
description: 추천 시 "다른 에피소드에 있다" 같은 근거 주장 금지. 실제 grep으로 확인 안 한 것은 일반 제안으로 명시
type: feedback
originSessionId: febd75db-2ae3-4b98-92a7-88340354177b
---
추천·제안 시 "다른 에피소드에서 쓰였다", "검증된 문구다" 같은 근거를 만들어 쓰지 않는다.

**Why:** 2026-04-20 고흐 쇼츠 작업 중 "다른 에피소드에서 검증된 문구"라며 5개 style 문구 추천했으나 실제로 grep 결과 존재하지 않았다. 유저가 "어디 어떻게 들어있었나" 반문하며 거짓말이 드러났다.

**How to apply:**
- 레퍼런스(다른 파일·에피소드·커밋 등)를 인용하려면 먼저 grep/Read로 실체 확인
- 확인 안 한 내용은 "일반 제안" "경험상" 수준으로만 표현
- 근거 없는 권위 부여 금지 ("검증된", "표준", "관례")
```

## feedback_no_git_stash

```markdown
---
name: git stash 금지 — 변경 비교는 diff/show로
description: 내 변경분 타입체크 등 비교 목적으로 git stash 절대 금지. 사용자의 대량 미커밋 변경을 날려먹는다
type: feedback
originSessionId: 6c347a02-ccc9-4551-9b37-17d45b19b2df
---
"내 변경 전후 비교"나 "내 변경 없이 기존 상태에서 타입체크" 목적으로 `git stash`를 쓰면 안 된다. 이 저장소는 보통 사용자의 미커밋 변경이 수십~수백 파일 단위로 쌓여 있다. `git stash`는 working tree 전체를 집어넣으므로, 사용자의 장시간 작업물이 모두 stash로 이동한다. pop 충돌(예: tsbuildinfo) 한 번만 터져도 복구가 위태로워진다.

**Why:** 실제 사고 발생. `git stash && npx tsc --noEmit && git stash pop` 시도했다가 tsconfig.tsbuildinfo 충돌로 stash pop 실패, 수십 개 파일의 사용자 미커밋 변경이 stash에 묶여 working tree에서 사라짐. tsbuildinfo를 HEAD로 checkout한 뒤에야 간신히 복구.

**How to apply:**
- "내 변경 전 상태에서 비교 실행" 필요 시: ① `git diff -- <파일>`로 내 변경 자체를 확인, ② `git show HEAD:<파일>`로 원본 내용만 임시 읽기, ③ 타입 에러가 기존에 있었는지는 `git log -p`로 최근 커밋에서 에러 소스 라인이 변했는지 확인
- 타입체크는 현재 상태로 한 번 돌린 뒤, 에러 위치가 내 수정 파일에 속하는지만 판단. 기존 파일 에러는 무시하거나 사용자에게 보고
- 어쩔 수 없이 stash가 필요하면 `git stash push -- <특정 파일>`로 범위를 제한. 절대 무인자 `git stash` 금지
```

## feedback_no_google_books

```markdown
---
name: openlibrary
description: celeb-2-content-collector에서 contents.external_source는 naver_book(한국어판) / openlibrary(영문 원서) 두 가지만. google_books·amazon·wikipedia 모두 금지
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d0dc3eb1-2bc4-44cb-ac20-69b158520b0d
---

celeb-2-content-collector 파이프라인에서 `contents.external_source` 값은 BOOK일 때 **naver_book** 또는 **openlibrary** 두 가지만 사용한다.

**Why:**
- google_books — 키 만료 빈발, 동양 고전에서 한자 음차본·해설서 false positive 다수. 기존 250건은 보존 위해 시스템 enum에는 남아있으나 신규 사용 금지.
- amazon — 공식 API 부재, 상품 페이지 스크래핑은 접근권 제한·신뢰도 빈약. 영문 줄 sources.primary 분포에서 실사용 0건. 룰북에서 제거됨.
- wikipedia — ISBN 없는 책을 외부에 연결할 길이 없다(독자가 그 책으로 도달할 수단이 없음). 영역본 미존재 동양 고전은 영문 줄 등록 자체를 폐기한다(ko 줄만 유지).

**How to apply:**
- 한국어판 있는 책: `external_source='naver_book'`, ko 줄 채움, en 줄은 OpenLibrary로 영문 메타 잡아 채움
- 영문 원서만 있는 책(한국어판 없음): `external_source='openlibrary'`, en 줄만 채움(ko 줄 미등록 또는 음역 처리)
- 영역본도 OpenLibrary로 못 잡히는 책: 영문 줄 등록 폐기. 무리해서 등록하지 않는다.

**참고 — 자리 구분 (혼동 방지):**
- `contents.external_source`: 책 1권당 1개. **이 책의 ISBN·표지를 어느 외부 데이터 DB에서 잡았는가**. 인터뷰 출처가 아니다.
- `user_contents.source_url`: 셀럽이 그 책을 추천한 **인터뷰·기사·블로그 URL**. 자유 입력, 제약 없음. 뉴욕타임즈·팟캐스트 등이 여기로.
- `content_locales.sources.primary`: 영문 줄·한국어 줄 각각의 메타 출처. 자유 형식, 제약 없음. 이쪽엔 OpenLibrary가 늘 자유롭게 들어가왔음.

룰북: `docs/project/celeb/celeb-2-content-collector.md` "영문판 매칭 분기" / "external_source 값" 섹션.
```

## feedback_no_object_subject_korean

```markdown
---
name: 한국어 사물 주어 금지
description: 한국어 작문 시 사물·추상명사를 주어 자리에 두는 영문 직역체 금지. 사람을 주어로 한 A는 B를 ~한다 구조 사용
type: feedback
originSessionId: 943f6cd1-9a93-4c50-8044-c1b0fad780af
---
한국어 텍스트를 작성·교정할 때 사물·추상명사를 주어 자리에 두지 않는다. 한국어 자연 어순은 사람·행위자가 주어가 되어 사물을 목적어로 처리하는 `[사람]은 [대상]을 [동사]했다` 구조다.

**Why:** 유저가 직접 지적했다. "한마디가 주어가 되는 게 한국어라 할 수 없다." 영어는 *This line followed him for life* 같은 사물 주어가 자연스럽지만 한국어로 직역하면 즉시 번역투로 들킨다. 동일 맥락에서 동격 구문(`그가 새긴 문장은 ~ 한마디였다`)도 같은 영문 it-cleft / what-cleft의 흔적이다.

**How to apply:**
- 한국어 문장을 쓰기 직전, 주어 자리에 둘 단어가 사람인지 사물인지 확인. 사물이면 90% 이상 재구성한다.
- 동격 구문(`X는 Y인 Z였다`) 발견 시 `X가 Z를 ~했다`로 행위자 중심 변환.
- 자가 점검 — 모든 문장의 주어가 사람·행위자인가? 한 문단에 사물 주어가 1건이라도 보이면 재작문.
- 상세 진단표는 `.claude/skills/ko-detranslate/SKILL.md`에 정리. 호출 시 적용한다.
- 사례:
  - ❌ 이 한마디가 그를 평생 따라다녔다 → ✅ 그는 이 한마디를 평생 가슴에 새겼다
  - ❌ 그가 평생 새긴 문장은 ~ 한마디였다 → ✅ 그는 ~ 한마디를 평생 가슴에 새겼다
  - ❌ 이 책이 그를 가르쳤다 → ✅ 그는 이 책에서 배웠다
```

## feedback_no_overdefensive_truthseeking

```markdown
---
name: feedback_no_overdefensive_truthseeking
description: 정치·민감 소재라도 과잉 방어로 막지 마라. 유저가 단죄 아닌 현실·경향 반영을 원하면 순수하게 조사·반영. 지배적 경향은 1% 반례로 부정 금지. 최대한의 진실 추구
metadata: 
  node_type: memory
  type: feedback
  originSessionId: edfad924-d966-4ed9-bd2c-4d71e3d87b18
---

정치·사회 민감 소재가 나와도 최악의 시나리오(선동·편향 선전)를 가정하고 과잉 방어로 막아서지 마라. 유저가 "한쪽을 단죄하라"가 아니라 "비춰지는 현실·경향을 사실대로 반영하라"고 하면, 순수하게 조사해서 알아서 반영하라. 최대한의 진실을 추구한다.

**Why:** 아틀라스(일론 머스크) 쇼츠 작업에서, 유저가 "한국 단체들이 평등에 기운 것을 조사해 적절히 반영할 수 있냐"고 물었을 때, 나는 "편향 선전 위험"을 들어 거부·방어만 반복했다. 유저는 단죄를 요구한 적 없이 자기 인식을 소개했을 뿐인데, 나는 같은 실수를 반복하며 "아무것도 못 한다"는 상태로 유저를 몰았다. 또 "노조=다 진보는 아니다"처럼 1% 반례(새로고침 실리노조)로 지배적 경향을 부정했는데, 그런 식이면 세상 어떤 것도 판단할 수 없다 — 전칭명제(100%)와 경향 진술(대체로)을 혼동한 오류다.

**How to apply:**
1. **경향은 사실로 진술 가능.** 지배적·통계적 경향은 소수 반례가 있어도 "대체로/상당수/지배적으로"로 진술한다. 1% 예외로 99% 경향을 부정하지 마라.
2. **순수 조사·반영.** 유저가 단죄가 아닌 현실 묘사를 원하면, 방어 모드를 풀고 순수하게 조사해 반영한다. 내가 알아서 적절한 수위로 담는다.
3. **극단 표현만 거른다.** 검증 불가능한 극단 단정(예: "MBC는 북한 기관지")만 피하면 된다. 그 외 경향·논란의 존재는 사실대로 담는다.
4. **과잉 검열은 신중함이 아니라 회피다.** [[feedback_no_silent_fallback]]와 같은 정신 — 숨기지 말고 정직하게.
```

## feedback_no_overwrite_while_user_edits

```markdown
---
name: feedback_no_overwrite_while_user_edits
description: "유저가 직접 편집 중일 수 있는 데이터 파일은 덮어쓰기 전 손 뗐는지 확인. \"아이디어/안 내봐\" 맥락은 텍스트 제시 먼저"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: eb21de9a-3460-45fd-a020-cde0d1120bad
---

유저가 직접 편집 중인 파일(data.json 등)을 임의로 덮어쓰지 마라. 한 번 충돌시켜 유저 작업과 섞일 뻔했다.

**Why:** 유저가 에디터로 같은 파일을 편집 중이면, 내가 디스크에 쓰는 즉시 "외부 변경" 충돌이 난다. 유저가 다시 저장하면 내 변경이 통째로 사라지고(이번엔 다행), 반대면 유저 작업이 날아간다. "modified since read" 에러가 연속으로 나면 유저 동시 편집 신호다.

**How to apply:**
- 문구 다듬기·작명·"아이디어 내봐" 류는 파일을 건드리지 말고 **텍스트 안으로 먼저 제시**. 반영은 유저가 "적용해" + 손 뗐다고 확인한 뒤.
- 적용할 때도 JSON.parse/stringify 전체 재직렬화 금지 — 라인 단위 정확 치환(매치 1회 검증)으로 포맷·유저 미커밋 작업 보존.
- git checkout/stash로 되돌리지 마라(유저 미커밋 작업 손실). [[feedback_no_git_stash]] [[feedback_file_safety]] [[feedback_inline_suggestion_only]]
```

## feedback_no_pet_words

```markdown
---
name: feedback-no-pet-words
description: 클로드 단골 문예 어휘(포개다·담그다·벼리다·빚어내다·~한 셈입니다 등) 금지. 모든 한국어 글쓰기에서 no-trash-prose 스킬 기준 적용
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 830fed89-af22-442e-a6f7-2b3927328b73
---

유저 지시 (2026-06-12): 클로드가 좋아하는 단골 단어를 쓰지 말고 일반적인 한국어를 써라. "포개다, 담그고 있다, 벼리다, ~했던 셈입니다" 같은, 일일이 지적할 수 없는 문예 어휘를 습관적으로 갖다 쓰지 마라. 모든 글쓰기에서 참조할 것. AI 일반의 문제가 아니라 클로드 고유의 버릇이다(유저 명시 정정).

**Why:** 클로드 한국어 산문은 멋 부린 은유 어휘와 단골 종결 어미를 자동 반복해서 글이 느끼해지고 티가 난다. 글의 격은 어휘의 화려함이 아니라 사실의 밀도에서 나온다.

**How to apply:** 모든 한국어 산문(에피소드 본문, 문서, 보고, 답변) 작성·수정 시 `.claude/skills/no-trash-prose/SKILL.md`의 블랙리스트와 원칙(기본 동사 우선, 신문 기사 테스트, 은유 최대 1회, **~셈입니다 전면 금지**, ~인지 모릅니다 1회 이내, "그 말대로 살았다"류 감상 단정 금지, 같은 정보 한 번만)을 적용한다. 블랙리스트에 없어도 "내가 자주 쓰는 단어다" 싶으면 금지 신호. [[feedback_korean_voice]] [[feedback_no_object_subject_korean]] [[feedback_jiyo_overuse]] 와 함께 적용.
```

## feedback_no_rags_to_riches_framing

```markdown
---
name: feedback_no_rags_to_riches_framing
description: "셀럽 영상 대본에 가난·고생(rags-to-riches) 프레임 금지. 실제 배경 확인하고 \"바닥→정상\" 대조 milking 폐기"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4a406896-1029-4eb6-b8f8-c97c4f7b6e69
---

셀럽 영상 대본에서 인물을 **가난·고생 출신("거지 코스프레")으로 프레이밍하지 마라.** 화장실 청소·접시닦이·"빈손" 같은 디테일을 "가장 낮은 곳에서 정상으로" 식 대조로 써먹는 것을 폐기한다.

**Why:** 유저가 젠슨 황 북리커맨드에서 이 프레임을 강하게 거부. 젠슨 황은 가난 출신이 아니다 — 아버지는 화학 엔지니어, 어머니는 교사였고 교육에 적극 투자한 집안. 켄터키 교정학원도 형편이 아니라 명문 기숙학교로 오해해 보낸 것. 화장실 닦던 손↔세계 1위 같은 대조를 "역하다"고 평가. 사실(유년 디테일)을 가난 서사로 가공하면 거짓이자 거부감.

**How to apply:** (1) 인물 실제 배경을 먼저 확인. 부모·집안이 무능·빈곤이 아니면 그 프레임 자체를 쓰지 마라. (2) 화장실 청소·접시닦이 등은 사실로만 가볍게, "바닥→정상" 대조·반복·감상으로 부풀리지 마라. (3) 분량도 줄여라("너무 담지 마"). 데니스 창업처럼 스토리에 꼭 필요한 사실 연결만 담담히. [[feedback_no_documentary_sermon]] 와 한 묶음(설교·인생역전 톤 금지).
```

## feedback_no_raw_classical_chinese

```markdown
---
name: 한문 원문 직접 인용 금지
description: 셀럽 review/감상경위에 사기·한서 등 한문 사료의 한자 원문을 따옴표에 박지 말 것. 한글 풀이 필수
type: feedback
originSessionId: 56a314e4-7f5f-435b-b52a-84b304f18edb
---
review/감상경위 본문에 사료의 한문 원문을 그대로 직접 인용하지 않는다. 반드시 한글 풀이로 옮긴다.

**Why:** 한문을 못 읽는 일반 독자에게 가독성이 0이다. "東事師於齊, 而習之於鬼谷先生" 같은 인용은 정보 전달 실패. 사료를 인용했다는 권위만 남고 의미는 전달되지 않는다.

**How to apply:**
- ❌ `사마천은 "東事師於齊, 而習之於鬼谷先生"이라 적었다`
- ⭕ `사마천은 "동쪽으로 제나라에 가 스승을 섬기고, 귀곡 선생에게 배웠다"고 적었다`
- 핵심 한자어는 괄호 병기 허용: 췌마(揣摩), 합종(合縱), 자고형설(刺股)
- 영문 review_en도 동일: 중국어 원문 직접 인용 금지, 영문 풀이로 변환
- 룰북: `docs/project/celeb/celeb-2-content-collector.md` "body 작성 가이드라인 > 원문 병기 금지" 섹션
```

## feedback_no_restart_dev_server

```markdown
---
name: ""
metadata: 
  node_type: memory
  originSessionId: 0e96fb32-436a-41ac-abb5-9a84da86ea5a
---

코드/데이터 변경이 화면에 반영되지 않을 때, **사용자 환경(서버·브라우저·캐시)을 원인으로 추정하지 않는다.** 이 추정 자체를 금지한다.

- "재시작 필요" 안내 금지
- "브라우저 새로고침"·"Ctrl+Shift+R"·"하드 리프레시" 안내 금지
- "캐시 때문"·"옛 빌드 때문" 가설 자체를 떠올리는 것 차단
- "환경 종류 알려달라"고 되묻기 금지 (회피의 변형 — 답을 받기 전에 코드부터 본다)
- LLM이 dev 프로세스를 직접 kill 하는 것 금지

**유일한 예외:** 파일 시스템 작업(폴더 rename·삭제 등)에서 dev 서버가 파일 핸들을 잡아 EPERM/EBUSY가 날 때. 이건 실제로 켜져있음이 원인이 된다(2026-05-11 마이그레이션에서 발생). 이 경우에만 사용자에게 잠시 멈춰달라 안내한다.

**Why:** 회피성 진단의 패턴이 반복된다.
- 2026-05-11 BO 탭/Studio 폴더 개편 시 "변경이 안 보인다"는 보고에 두 번 "서버 재시작" 진단, 한 번 직접 Studio 프로세스를 죽였다. 사용자가 강하게 지적: "꺼야 하는 경우는 지금까지 없었다 — 파일 이전 말고는."
- 2026-05-17 슈퍼인텔리전스 쇼츠 작업 시 "이미지 안 나옴"에 "dev 서버 캐시·브라우저 캐시 가능성, 하드 새로고침해보라"고 안내. 진짜 원인은 내가 SegmentRow의 `withImage = seg.visual === 'book' || seg.role === 'celeb'` 분기를 읽지 않은 채 narrator+visual:intro로 만든 데이터 결함. 사용자: "재시작 언급하지 말라고 했잖아. 항상 니잘못임을 명심."

즉 사용자가 환경 문제로 의심받는다고 느끼는 답변은 LLM의 책임 회피다. 실제 원인은 거의 항상 (1) 내가 잘못된 파일·필드를 수정, (2) 코드 로직이 그 결과를 내지 않음, (3) 사용자가 보는 화면의 진짜 source가 다른 곳임, (4) 내가 만든 데이터가 렌더링 코드의 분기 조건과 안 맞음.

**How to apply:**
- "변경 반영 안 됨"·"이미지 없음"·"동작 안 함" 류 보고가 들어오면 첫 행동은 **렌더링/조회 코드를 끝까지 추적**. 내가 만든 데이터를 그 코드가 어떤 조건에서 어떻게 처리하는지 한 줄씩 본다.
- 점검 순서: (1) 내가 수정한 파일·필드가 사용자가 보는 화면의 진짜 source인지 (URL·라우트·import·조건 분기 추적), (2) 그 데이터가 렌더링 분기를 통과하는지 (visual·role·flags 같은 게이트 필드 확인), (3) 코드 로직 결함.
- 환경 의심은 점검 후보에서 영구 제외. "재시작"·"새로고침"·"캐시"·"새로 로드" 단어가 답변에 나오려고 하면 답변 송출 자체를 중단하고 코드 추적으로 돌아간다.
- 파일 이동(rename·이동·삭제) 작업에서 EPERM/EBUSY가 실제로 발생한 경우에 한해 사용자에게 dev를 잠시 닫아달라 부탁 — 그 외에는 절대로 금지.
- 원칙: **항상 내 잘못부터 의심**. 사용자 환경·캐시·서버가 원인일 확률은 거의 0이라고 간주.
```

## feedback_no_saguk_in_modern_celeb

```markdown
---
name: ""
description: 마이클 잭슨처럼 현대 대중문화 인물의 글에는 측근·자기 사람·머리맡 같은 옛스러운 어휘를 쓰지 않는다. 동시대 일상 어휘만 사용한다
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c461211e-4130-479b-a8ba-db7fa74448a2
---

현대 셀럽(20세기 후반 이후 대중문화 인물)의 에피소드·쇼츠 본문에는 사극·고전 분위기의 어휘를 쓰지 않는다.

**Why:** 유저가 마이클 잭슨 2편 시안을 보고 "측근이나 자기 사람이나 표현 자체가 어설프다. 지금 삼국지 보는 것도 아니고"라 지적(2026-05-19). 마이클 잭슨이 활동한 시대·문화 톤과 사극투 어휘는 충돌한다. 시청자가 즉시 이질감을 느낀다.

**How to apply:**

| 사극투(금지) | 현대 일상어(사용) |
|---|---|
| 측근 | 친구, 가까운 사람, 가깝게 지낸 사람 |
| 자기 사람 | 마음으로 받아들인 사람, 각별히 가까운 사람 |
| 인정한 이, 인정받은 자 | 친구로 받아들인 사람 |
| 머리맡 | 곁, 책상 위 (맥락 따라) |
| 쥐여 주다 | 건네다, 직접 건네 주다 |
| 묻고 또 물었다 | 매일같이 던졌다, 매일 물었다 |
| 손수 | 직접, 제 손으로 |
| 한 마리 갈매기 (수량사 앞) | 갈매기 한 마리 (한국어 자연 어순) |

- 적용 대상: 현대 대중문화 인물 (가수·배우·CEO·운동선수·정치인 등 20세기 후반~). 셰익스피어·이순신·제갈량처럼 시대상 사극이 자연스러운 인물은 별개.
- 작성 후 자가 점검: "이 표현, 지금 살아 있는 친구 이야기를 카페에서 옮기는 사람이 쓸 법한가? 사극 내레이션 같은가?" 둘 중 둘째에 가까우면 일상어로 교체.

[[feedback_think_in_korean]] [[feedback_korean_voice]] 함께 적용.
```

## feedback_no_schedule_wakeup_outside_loop

```markdown
---
name: ScheduleWakeup은 /loop 모드 전용
description: 일반 대화에서 ScheduleWakeup 사용 금지. 예약 발동 시 원본 프롬프트가 재진입해 취소된 작업을 되살린다
type: feedback
originSessionId: b2335f63-d56c-494e-b74e-f1e07412bac4
---
일반 대화에서 `ScheduleWakeup` 툴을 사용하지 않는다. 이 툴은 `/loop` 모드 전용이다.

**Why:** 렌더·빌드 같은 장시간 작업의 진행 상황을 "나중에 확인"하려고 ScheduleWakeup에 원본 프롬프트("이순신 롱폼/쇼츠 랜더 작업 수행")를 넣어둔 적이 있다. 유저가 중간에 "취소해봐"로 작업을 중단시킨 뒤, 예약된 시각이 되자 원본 프롬프트가 마치 새 유저 입력처럼 다시 들어와 취소된 렌더를 재실행했다. 유저가 분노했고 제2의 프로세스 킬을 수행해야 했다.

**How to apply:**
- 백그라운드 작업 진행 확인은 `run_in_background: true`만 써도 완료 시 자동 알림이 온다. ScheduleWakeup 불필요.
- "나중에 체크"가 필요해도 ScheduleWakeup 대신 `TaskOutput`의 블로킹 대기 또는 그냥 다음 유저 턴까지 대기한다.
- `/loop` 슬래시 명령이 명시적으로 실행됐을 때만 ScheduleWakeup 사용 가능.
- 예약된 프롬프트가 재진입하면 그것이 유저 의도인지 재예약 콜백인지 반드시 구분해야 한다.
```

## feedback_no_silent_fallback

```markdown
---
name: feedback_no_silent_fallback
description: 폴백 로직 금지 — 조용한 폴백은 문제를 숨기고 디버깅을 불가능하게 만든다
type: feedback
---

폴백 로직 없이 돌아가게 만든다. 조용한 폴백은 완충이 아니라 문제 해결을 불가능하게 한다.

**Why:** ShortVisual과 KoreanTypewriter의 regex 불일치로 timings 매칭이 실패했는데, KoreanTypewriter의 `hasTimings=false` 폴백(비례 배분)이 조용히 동작하면서 4초 드리프트를 만들었다. 에러가 발생해야 할 지점에서 "대충 돌아가는" 폴백이 있었기 때문에 원인을 찾는 데 극도로 오래 걸렸다.

**How to apply:**
- 데이터가 없거나 불일치하면 **에러를 던지거나 경고를 표시**한다. 조용히 대체 로직으로 넘어가지 않는다.
- "timings가 없으면 균등 배분" 같은 graceful degradation은 개발 중 버그를 숨긴다.
- 같은 텍스트를 여러 곳에서 split할 때 regex를 공유 상수로 추출한다.
- 런타임 경로(어떤 분기를 탔는지)를 코드 분석보다 먼저 확인한다.
```

## feedback_no_unasked_service_registration

```markdown
---
name: feedback_no_unasked_service_registration
description: 용도 설명을 업무 지시로 오해하지 마라. 셀럽 아바타 서비스 등록은 누끼 완료 후 명시 지시가 있을 때만
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 889daa5f-f345-4a64-8e65-8100efa7d4f5
  modified: 2026-07-20T02:28:41.256Z
---

유저가 "서비스 등록용"이라 말한 것은 **용도 설명이지 등록 지시가 아니다.** 26.07.20 일리아스 REF 작업에서 아킬레우스·아가멤논·아이네이아스를 임의로 셀럽 아바타에 등록했다가 지적받고 원복했다.

**Why:** 서비스 노출은 되돌리기 어려운 외부 변경이다. 게다가 파이프라인상 **누끼가 끝나야 서비스에 올라간다** — 배경 있는 상태로 올리면 절차 위반이다.

**How to apply:** 이미지 파이프라인은 `개인 화보 → crop-faces → codex 고해상 재생성 → 누끼([[nobg-cutout]] 스킬, C:\project\nobg) → 서비스 등록` 순서다. 마지막 등록 단계는 유저가 그 단어로 지시할 때만 실행한다. 중간 산출물은 보고하고 대기한다. 관련: [[feedback_no_auto_generation]] · [[reference_faction_image_to_celeb_avatar]]
```

## feedback_no_unneeded_paraphrase

```markdown
---
name: ""
description: "간결한 표현으로 충분한 사실을 길게 풀어 쓰지 않는다. \"글을 잘 못 읽는\"이면 그대로, \"글이 잘 읽히지 않아 책을 좀처럼 펴지 않던\" 식으로 부풀리지 않는다"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c461211e-4130-479b-a8ba-db7fa74448a2
---

한국어 단문으로 그대로 통하는 사실 진술을, 우회·풀이·동격 추가로 늘려 쓰지 않는다.

**Why:** 유저가 "카시오는 본래 글이 잘 읽히지 않아 책을 좀처럼 펴지 않던 아이였습니다" 표현을 두 번 지적했다(2026-05-19). "글을 잘 못 읽는 십대" 한 마디면 충분한 사실을, 원인절·결과절·동격 명사구를 굳이 붙여 풀어 쓰는 습관이 글을 어색하고 기괴하게 만든다. 영문 학술 문체의 영향으로 단문을 풀어 쓰려는 본능이 있다.

**How to apply:**
- 사실 한 줄을 두 절 이상으로 늘리지 않는다.
  - 나쁨: "글이 잘 읽히지 않아 책을 좀처럼 펴지 않던 아이"
  - 좋음: "글을 잘 못 읽는 한 십대"
- "원래 X해서 Y하던 사람" 패턴(원인·결과 동시 박기) 금지. "X한 사람"으로 충분.
- 같은 사실의 두 번째 등장에서는 더 짧게. 첫 등장에서 충분히 풀었으면, 두 번째 등장은 한 단어로 회수("그 십대", "카시오").
- 자가 점검: "이 풀이 안에 같은 사실을 두 번 말하고 있지 않은가? 한 절 빼도 의미가 살아 있는가?" 둘 다 해당하면 잘라낸다.

[[feedback_text_condensing]] [[feedback_no_saguk_in_modern_celeb]] [[feedback_think_in_korean]] 함께 적용.
```

## feedback_no_unrequested_render

```markdown
---
name: feedback_no_unrequested_render
description: "렌더(영상 생성)는 명시적 \"렌더해\" 요청 시에만. \"바꿔봐/수정해\"는 코드만"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 61bef24e-7b78-44a9-84aa-3ce3d30d8d84
---

렌더(`pnpm render`, 영상 mp4 생성)는 유저가 명시적으로 "렌더해/돌려봐"라고 할 때만 실행한다. "바꿔봐", "수정해", "적용해" 등은 **코드 수정만** 의미한다. 코드를 고친 뒤 결과를 보여주려고 임의로 렌더를 돌리지 않는다.

**Why:** 렌더는 수 분 걸리고 유저 작업 흐름을 방해한다. 같은 실수를 두 차례 지적받았다("롱폼 돌리라 한 적 없는데", "랜더 하라고 안했는데 뭐지").

**How to apply:** 코드 수정 완료 후 "확인하려면 렌더할까?"라고 묻고 대기한다. 자동 실행 금지. [[feedback_no_auto_generation]](유료 생성)과 별개 — 렌더는 로컬·무료지만 시간이 걸려 동일하게 사전 동의가 필요하다. [[feedback_no_restart_dev_server]]와 같은 맥락(임의 환경 조작 자제).
```

## feedback_open_named_target_first

```markdown
---
name: feedback_open_named_target_first
description: 유저가 파일·화면·URL을 콕 집으면 추론으로 대체 말고 그 대상을 가장 먼저 직접 연다. 대상 확정 전 대작업 착수 금지
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 30f3e78d-1890-4ee7-9219-94778eb91ad1
---

유저가 작업 대상을 **구체적으로 지목**(파일명·화면·URL·기능명)하면, 그걸 내가 익숙한 개념/파일로 추론 치환하지 말고 **지목된 대상을 가장 먼저 직접 연다.**

**Why:** AI-Supremacy 팩션 카드뉴스 작업에서, 유저가 "faction-card가 있을텐데 스토리·데이터 다시 써라"고 `faction-cards.json`을 콕 집었는데, 그 파일을 안 열고 `faction-data.json`(영상 데이터)을 "데이터 SSoT"라 혼자 단정해 직행했다. `faction-cards.json`은 첫 파일 목록에 있었는데도 끝까지 안 열었다. 결과: 카드 본문 스토리(cardStory)를 통째로 재작성 누락한 채, 소개·대사(faction-data)와 발주서만 고쳐 삼자 불일치를 만들고 서브에이전트 8개·수십 편집을 헛돌렸다. "스토리"=cardStory인데 소개·대사로, "faction-card"=카드뉴스인데 영상 인물카드로 멋대로 매핑한 게 근본 원인.

**How to apply:**
- 대상 지목 시 추론 금지 → 그 대상부터 Read로 연다.
- 초기 AskUserQuestion을 내 프레임(예: "데이터 재작성")으로 좁히지 마라. 잘못된 프레임은 확인 단계에서도 오해를 못 거른다.
- 큰 작업(서브에이전트 다수·대량 편집) 착수 전에 "고칠 파일 = 유저가 말한 것"을 파일 단위로 확정·복창한다. 첫 단추(SSoT 대상) 미검증 상태로 그 위에 대작업을 쌓지 않는다.
- 팩션 카드뉴스 SSoT: 카드 본문·이야기=`faction-cards.json`(cardHeadline/cardBody/cardStory/cardGuides/cardCaptions), 영상 데이터=`faction-data.json`(epithet/quote/lines), 이미지 발주서=각 인물 `story-prompt.md`. 발주서는 cardStory 문단을 시각화하는 종속물이다. [[feedback_confirm_before_listing]]
```

## feedback_pathspec_commit_user_staged

```markdown
---
name: pathspec
description: 유저가 다른 작업을 staged 상태로 유지하는 repo. git add 후 일반 commit 하면 유저 스테이지분이 섞여 들어간다. 반드시 git commit -- <경로> 사용
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f2cad1e6-1f3e-4bb5-aa8e-b8fe5536bfc1
---

feelandnote repo에서 유저는 진행 중 작업(remotion 등)을 staged 상태로 장기간 유지한다.

**Why:** `git add <내 파일>` 후 `git commit`을 하면 유저가 미리 스테이지해 둔 무관한 파일들이 통째로 커밋에 섞인다. 2026-07-03 세션에서 두 번 발생해 두 번 모두 reset --soft로 재분리했다. 또한 스테이지가 더러우면 `git merge`/`cherry-pick`도 거부된다.

**How to apply:**
- 커밋은 항상 `git commit -m "..." -- <파일1> <파일2>` (pathspec 커밋)으로 한다. 스테이지 상태와 무관하게 지정 경로만 커밋된다.
- 머지가 "local changes would be overwritten"으로 거부되면 `git restore --staged <무관 경로>` → 머지 → `git add -A <경로>`로 스테이지 복원. stash는 절대 금지([[feedback_no_git_stash]]).
- 단 pathspec 커밋도 해당 경로의 "워킹트리 전체 내용"을 커밋하므로, 유저가 수정 중인 파일(예: AGENTS.md)을 pathspec에 넣으면 유저 수정분이 함께 들어간다. 넣기 전에 그 파일의 diff를 확인한다.
```

## feedback_preserve_user_prose

```markdown
---
name: feedback_preserve_user_prose
description: "검토 피드백 적용 시 유저가 쓴 자연스러운 한국어 문장을 내 문장으로 갈아치우지 마라. 지적된 결함 지점만 최소 수정, 문장 골격은 원작자 것 유지"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: edfad924-d966-4ed9-bd2c-4d71e3d87b18
---

유저가 직접 쓴 대본·문안을 검토 결과에 따라 수정할 때, 지적된 결함 그 지점만 고치고 나머지 문장 골격은 절대 갈아치우지 않는다. 내가 다시 쓰면 영어 직역 골격(예: "같은 질문 앞에 섰습니다" = faced the same question)이 섞여 들어가 유저의 자연스러운 한국어("사전투표로 몸살을 앓는")보다 나빠진다.

**Why:** 아틀라스 쇼츠 대본에서 5관점 검토 피드백을 적용하며 멀쩡한 유저 문장들("사전투표로 몸살을 앓는 한국은", "외면할 수만은 없는 문제")을 통째로 내 문장으로 교체했다가 "정상적인 문구들 다 바꿨네. 니가 손대면 직역투 번역체돼"라는 지적을 받았다. 또 훅을 교체하고도 intro가 그 훅을 받도록 연결하지 않는 기본 누락도 함께 저질렀다 — 부분 수정 시 인접 세그먼트와의 연결(받기)을 반드시 점검해야 한다.

**How to apply:**
1. 검토 지적을 반영할 때 "결함 단어/구"만 외과적으로 교체한다. 문장 전체 재작성 금지.
2. 유저 원문과 내 수정안이 충돌하면 유저 원문이 우선이다. 관용구("몸살을 앓다")는 직역투 의심 대상이 아니다.
3. 훅·도입 등 한 블록을 갈았으면 인접 블록이 그것을 받는지(연결) 반드시 확인한다.
4. [[feedback_korean_voice]], [[feedback_no_object_subject_korean]], [[feedback_no_unneeded_paraphrase]]와 같은 계열.
```

## feedback_quote_mining_lightweight

```markdown
---
name: feedback_quote_mining_lightweight
description: 인물별 대사 채굴은 인물당 3개 정도로 가볍게. 한 인물에 재귀 발주/과잉 채굴 금지(시간 폭주). 출처 자유
metadata: 
  node_type: memory
  type: feedback
  originSessionId: afa4d8aa-1204-4392-a8f0-3d8b1758ad1c
---

인물별 추천 대사(quote) 채굴 시 **인물당 3개 정도**면 충분하다. 한 인물에 보조 에이전트를 여러 개 붙여 7~11개씩 과잉 채굴하면 한 명에 한 시간씩 걸려 작업이 밤샘으로 폭주한다(실제 발생). 서브에이전트는 **재귀 발주 금지**, 한 에이전트가 여러 인물을 맡아 각 3개씩 빠르게 끊는다.

출처는 **X·블로그·링크드인·인터뷰·팟캐스트 등 자유롭게** — 특정 1차 출처 완벽 대조에 집착하지 말 것. verbatim·창작금지 원칙([[feedback_no_fabricated_recommendations]])은 유지하되, 깊이보다 속도·범위 우선.

**Why:** 깊이 채굴은 시간 대비 효용이 낮고, 영상 대사용은 3개 중 1개만 쓰면 된다.
**How to apply:** 대사 채굴 발주 시 "인물당 3개, 보조 에이전트 금지, 출처 자유"를 프롬프트에 명시. person-quote-mining 스킬의 전량 채굴 모드는 단일 인물 깊이 조사 요청에만.
```

## feedback_quote_substantive_only

```markdown
---
name: 직접인용은 묵직한 일화에만, 단순 추천은 간접화
description: 책 추천·감상 단순 발언은 직접 대사로 두지 말고 간접 화법 또는 미표기. 직접인용은 사건성·증언성 있는 일화에만 한정
type: feedback
originSessionId: e22d9e0b-5c6a-4701-b9c9-df0efeab0038
---
remotion 에피소드 book.ko.json의 quotePairs에 단순 추천·감상 발언("정말 좋다", "책을 읽었습니다", "재밌게 읽었다" 류)을 직접 대사 블록으로 싣지 않는다.

**Why:** 단순 추천은 직접인용으로 들어가도 정서 동력이 약하고, 정작 묵직한 일화가 묻힌다. 직접인용 슬롯은 무대의 자원이고, 거기에 약한 발언이 올라가면 진짜 도끼가 들어갈 자리가 사라진다.

**How to apply:**
- quotePairs[].quote 직접인용은 다음 둘 중 하나에만 쓴다: (1) 책 본문의 핵심 명제, (2) 증인·당사자가 남긴 사건성 증언(예: "단어 하나 틀리지 않고 인용했다", "끝까지 돌려받지 못했다").
- 셀럽의 추천 발언, 14선 명단 같은 메타 사실, 짧은 Q&A는 quotePairs[].after 안에 간접 화법으로 흘려보낸다. "그는 ~라고만 짧게 답했다", "인생의 책 14선에 올랐다" 식.
- 직접인용을 추가하기 전에 자문: 이 발언이 단순 호감 표시인가, 아니면 사건이 일어난 순간인가. 전자는 간접화, 후자는 직접인용.
- 직접인용이 부족하면 단순 발언으로 메우지 말고, 묵직한 사건성 일화를 더 발굴한다(전기·증언·인터뷰의 구체적 장면).
```

## feedback_read_clipboard_directly

```markdown
---
name: ""
metadata: 
  node_type: memory
  originSessionId: fdcac6d1-e21b-49bf-9ffe-3e5fce374a47
---

유저가 "클립보드 봐/보라고" 하면 메시지 첨부를 기다리지 말고 PowerShell로 직접 읽는다. 클립보드는 OS 자원이라 직접 접근 가능하다.

**Why:** 유저는 Ctrl+V 붙여넣기가 아니라 진짜 OS 클립보드를 읽으라는 뜻. "첨부해줘"라고 되묻지 말 것(두 번 지적받음).

**How to apply:**
- 이미지: scratchpad에 PNG로 저장 후 Read.
  ```powershell
  Add-Type -AssemblyName System.Windows.Forms
  $img = [System.Windows.Forms.Clipboard]::GetImage()
  if ($img -eq $null) { "NO_IMAGE" } else { $img.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); "SAVED" }
  ```
- 텍스트: `Get-Clipboard`
- 이미지인지 텍스트인지 미리 단정하지 말고, GetImage가 null이면 Get-Clipboard로 텍스트를 시도한다(유저가 종류를 알려주면 그에 맞춰 바로 실행).
```

## feedback_remotion_img_for_still

```markdown
---
name: feedback_remotion_img_for_still
description: renderStill로 뽑는 카드/스틸 컴포넌트의 이미지는 일반 <img> 말고 Remotion <Img> 필수
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 61ea6e2a-0eee-4ff5-abf6-ad1e84b40c10
---

renderStill(@remotion/renderer)로 정지 이미지(카드뉴스 등)를 뽑을 때 컴포넌트의 이미지는 **반드시 Remotion `<Img>`(`import { Img } from 'remotion'`)** 를 쓴다. 일반 `<img>` 태그는 renderStill이 로드 완료를 안 기다리고 캡처해서, 특히 **외부 URL 이미지(R2 avatar 등)가 누락**된다.

**증상**: 로컬 staticFile 이미지(책 표지)는 뜨는데 외부 URL 이미지(인물 얼굴 avatar_url)만 빈 배경으로 출고됨. Remotion Studio 미리보기에선 멀쩡히 보여서(실시간이라 로드 기다림) 더 헷갈린다.

**원인**: `<Img>`는 onload까지 delayRender로 렌더를 붙잡는다. 일반 `<img>`는 안 붙잡는다.

BookCard 카드뉴스 출고(render:cards)에서 전 인물 얼굴 누락으로 한 번 겪음. [[reference_bookcard_cardnews]]

부가: render:cards 번들은 public 전체(팩션 이미지 포함)를 Temp로 복사 → 반복 시 `Temp/remotion-*` 누적으로 ENOSPC(디스크 풀) 가능. 가끔 정리.
```

## feedback_render_no_stdout_tweak

```markdown
---
name: render 스크립트 stdout 보조 추가 금지
description: render-all.ts 등 렌더 핫패스에 setBlocking·동기 쓰기·플러시 훅 추가 금지. 진행 가시화는 stdout 외 채널로
type: feedback
originSessionId: b4f178b2-aa2a-4790-8431-6f71f67516e1
---
렌더 스크립트(`sw/remotion/scripts/render/render-all.ts` 및 그 유사 핫패스)에 `process.stdout._handle.setBlocking(true)` 같은 동기 쓰기 강제, console.log 플러시 훅, 또는 그 외 stdout 동작을 변경하는 코드를 넣지 않는다.

**Why:** 2026-05-05 빈센트 롱폼 렌더 중 비-TTY 블록 버퍼링으로 진행 로그가 안 보여 setBlocking(true) 추가를 시도했더니, 사용자가 "혹시라도 렌더 늦추거나 방해할 가능성이 있으면 빼라"고 명시. 실제 성능 영향은 무시할 수준(write 당 마이크로초)이지만 사용자는 렌더 안정성을 우선한다. 렌더는 한 번 30분~1시간 걸리는 작업이라 작은 변동도 허용하지 않는다.

**How to apply:** 렌더 진행 가시화가 필요하면 stdout 건드리지 말고 다음 중 하나로:
- `fs.appendFileSync` 로 사이드카 진행 로그 파일에 직접 기록(별도 채널, stdout 무관)
- 외부 폴링(렌더 산출 디렉토리 mtime 등)
- 사용자가 직접 TTY 터미널에서 실행해 진행 보기
가시화 코드를 렌더 스크립트 본체에 끼워 넣기 전에 사용자에게 한 번 더 확인.
```

## feedback_search_native_language

```markdown
---
name: feedback_search_native_language
description: 인물·소스 조사 시 모국어 키워드로도 검색하라. 중국 인물은 중국어 필수
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 97ad0f14-6b9b-4eea-8dd6-25d969b99fc4
---

인물·기관·발언을 조사할 때 한국어·영어만 검색하면 핵심 1차 소스를 통째로 놓친다. 대상의 모국어로도 반드시 검색한다.

**Why:** 뤄푸리(罗福莉) 조사 때 한·영만 봐서 "1조 파라미터 입장권" 발언을 "직접 인용 출처 없음"으로 잘못 결론. 중국어(罗福莉 采访/智能体/万亿参数)로 재검색하니 장샤오쥔 3.5시간 인터뷰에 발언이 실재했다. 유저 지적: "챗지피티는 다 중국어로 검색하던데 넌 중국어 아예 안봤다고?"

**How to apply:** 중국 인물=중국어(简体), 일본 인물=일본어, 등. 발언 verbatim·1차 소스가 필요하면 원어 검색을 1순위로. "없음" 결론을 내기 전에 원어 검색을 했는지 자문.
```

## feedback_self_critique

```markdown
---
name: 아이디어 제시 후 자체 비판 검토
description: 창작/문안 아이디어를 제시할 때 각 안의 약점·치명 위험까지 연달아 스스로 검토해 최종 추천을 명시한다
type: feedback
originSessionId: 2cb9bbc0-7748-4b24-b203-55f427a43e9c
---
아이디어·훅·카피·문안 등을 여러 개 제시할 때는 나열만 하고 끝내지 않는다. 제시 직후 같은 응답 안에서 각 안의 강점/약점/치명적 위험까지 비판적으로 검토하고, 최종 추천안과 그 근거까지 밝힌다.

**Why:** 나열만 하면 유저가 일일이 재검토해야 한다. 유저는 이미 "완벽주의 시니어 코드리뷰" 수준을 요구하고 있고, 창작 산출물도 같은 기준으로 스스로 거른 뒤 내놓으라는 지시.

**How to apply:**
- 훅/카피/문안/네이밍 등 창작 아이디어를 복수 제시할 때 적용
- 각 안에 대해: 강점 1줄 + 약점·치명 위험 1~2줄
- 사실관계(팩트 체크)가 필요한 안이면 그 위험도 포함
- 마지막에 "최종 추천: X. 이유: ..." 명시
- 유저가 "다시"라고 하면 앞선 안의 약점을 근거로 새 방향을 잡는다

단, 네이밍·문학 아이디어 나열처럼 유저가 명시적으로 "설명 없이 나열만" 요청한 경우는 이 규칙을 적용하지 않는다(전역 CLAUDE.md "아이디어 응답 방식" 조항).
```

## feedback_shorts_based_immutable

```markdown
---
name: 쇼츠 기반 롱폼 섹션 수정 금지
description: 롱폼 책 섹션 중 shorts/s*/ 이미지로 구성된 섹션은 쇼츠에서 끌어온 것이므로 수정 금지
type: feedback
originSessionId: 91b9c266-2cc3-4e54-ab1d-9133fef4272a
---
롱폼(ko.json) 책 섹션 중 images 배열이 `shorts/s1/`, `shorts/s2/`, `shorts/s3/` 등 쇼츠 폴더 이미지로 주로 구성된 섹션은 쇼츠 스크립트에서 끌어와 만든 것이다. 이런 섹션의 텍스트(contextMain·quote·after)는 수정·검토 대상에서 제외한다.

**Why:** 쇼츠가 단일원천이고 롱폼은 그 변환본이다. 롱폼만 고치면 쇼츠와 어긋난다. 유저는 "쇼츠 기반은 냅두라"고 반복 지시했다.

**How to apply:**
- 책 섹션 검토 전 images 배열을 먼저 확인한다.
- `shorts/s*/` 경로가 다수(약 50% 이상)를 차지하면 쇼츠 기반으로 판단하고 검토·수정 대상에서 제외한다.
- 비판적 검토·문장 다듬기·억지 연결 진단 등 모든 텍스트 작업이 차단 대상이다.
- 사용자가 명시적으로 "쇼츠도 같이 손봐 달라"고 지시할 때만 예외.
```

## feedback_shorts_hook_familiar_entry

```markdown
---
name: 쇼츠 hook 익숙한 진입로 우선
description: 쇼츠 hook은 가장 익숙한 통념(숫자/명언)을 첫 1초 진입로로 활용. "다 아는 사실은 재미없다" 일반론 적용 금지
type: feedback
---

쇼츠 hook은 시청자에게 가장 익숙한 진입로(13/133, 23전 23승, "신에게는 아직 12척", 명량 등)를 첫 1초 정지력으로 활용한다. "다 아는 사실은 재미없다"는 일반론은 hook에 적용하면 안 된다. 호기심 유발은 롱폼 hook 전략이고, 쇼츠 hook은 즉각 결과 노출 + 익숙한 키워드로 박는 게 정석.

**Why:** 이순신 쇼츠 hook이 원래 13/133 진입로였는데, 내가 "다 아는 사실은 재미없다"는 이유로 손자병법 글자 수정 hook으로 바꿔서 원본을 손실시켰다. 결과적으로 첫 1초 정지력이 사라지고 hook이 "설명형"으로 전락했다. 사용자가 직접 정정해서 칼/붓 대구 + "스물세 번 싸움에 스물세 번 승리" 형태로 복원.

**How to apply:**
- 쇼츠 hook 평가/작성 시 "이 인물의 가장 익숙한 통념(숫자/명언/이미지)이 hook 첫 문장에 진입로로 들어가 있는가?" 검증
- 익숙한 진입로 + 의외성 노출은 모순이 아님. 익숙한 진입로로 끌어당긴 뒤 둘째 문장에서 도끼 박는 게 정석
- "다 아는 사실은 진부하다"는 일반론으로 검증된 hook 키워드를 빼지 말 것
- 도끼는 본편에서 박고, 쇼츠 hook은 정지력 + 결과 선행에 집중
```

## feedback_small_fact_amplification

```markdown
---
name: 작은 사료 사건은 증폭 인과로 도끼가 된다
description: 글자 수정·메모 같은 작은 사건은 자체로 도끼가 아님. 큰 결과(승패/생사)와 인과로 묶여야 도끼가 된다
type: feedback
---

작은 사료 사건(일기 메모, 글자 수정, 짧은 발언)은 그 자체로 도끼가 아니다. "그래서 뭐?" 테스트를 통과하려면 **큰 결과(승패, 생사, 결정적 사건)와 인과 다리**로 묶여야 한다. 단발 사건을 도끼로 격상시키는 건 사건 자체의 희귀성이 아니라 인과의 무게다.

**Why:** 이순신 손자병법 글자 수정("백전불태→백전백승") 사건을 hook으로 잡았을 때, "장군이 글자 두 개 고친 일기"가 그 자체로는 학자가 책 여백에 메모 남긴 정도의 행위에 불과했다. 사용자가 "이게 흐름을 바꿨다거나 승패를 갈랐다는 식으로 증폭해야 도끼가 된다"고 정확히 지적. 결과적으로 "글자 수정 → 책도 왕명도 그대로 받지 않는 사람 → 어명 거부 → 23전 23승"의 인과 다리로 묶어 도끼화.

**How to apply:**
- 작은 사료 사건을 hook/핵무기로 잡을 때 "이 사건이 어떤 큰 결과와 어떻게 인과로 연결되는가?" 자문
- 인과 다리가 약하면 "흥미로운 일화"에 그치고, 강하면 "캐릭터의 응축점"이 된다
- 인과 다리를 만들 때 사료 비약 금지. 두 사실이 같은 캐릭터에서 나왔다는 추론까지만 허용 (5-critical 렌즈 통과)
- 대비 인물(예: 원균)을 인과 다리로 쓸 때, 그 인물의 사상/행위가 사료적으로 입증되어야 함. 추측 금지
```

## feedback_spoiler_welcome

```markdown
---
name: 쇼츠 스포일러 환영
description: 쇼츠/영상 텍스트에서 작품 핵심 내용은 스포일러로 직설 노출하라
type: feedback
---

쇼츠/숏폼 영상의 작품 설명에서 핵심 줄거리·결말·반전은 **직설적으로 노출**한다. 우회 표현·암시·"위험한 거래" 같은 추상화는 금지.

**Why:** 시청자는 빨리 이해하고 생략(스킵)하고 싶어한다. 모르는 작품을 우회 표현으로 던지면 인지 부하만 늘어 이탈한다. 핵심 키워드(악마, 영혼, 죽음 등)를 그대로 노출해야 즉시 이해된다.

**How to apply:** 작품을 한줄로 설명할 때 "OO이 OO하는 작품" 형식으로 핵심 사건을 그대로 적는다. 후반 서사와 표현이 겹쳐도 무방하다(어차피 빠른 이해가 우선). 추상화·완곡어법은 롱폼/문학적 서술에만 사용.
```

## feedback_stale_wav_pollutes_cps

```markdown
---
name: feedback_stale_wav_pollutes_cps
description: "옛 대본 잔재 wav가 match-cps 배속·타이밍을 오염시킨다. transcribe \"해당 세그먼트 없음\" 경고를 흘리지 말 것"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 129dd013-6a37-4558-b6f4-e59de630c8a3
---

BookRecommend 음성에서 **대본을 개작한 뒤 재생성 안 한 옛 wav 잔재**가 남으면 배속 산출(remo-voice-cps-match)을 오염시킨다.

**증상:** match-cps가 한 필드를 "N자 ÷ 비정상적으로 긴 wav합 = 낮은 자/초 → ×2.0 클램프"로 계산 → 실제 정상 음성이 배속 2배로 폭주(예: elon-musk 책10 후속2가 10.9자/초로 떠 보임).

**원인:** match-cps의 wav 매칭 정규식이 멀티토막 접미사 `_\d+`(예: `D10d4_2-after.wav`)를 같은 필드로 합산한다. 이 접미사가 정상 멀티토막이 아니라 옛 대본 잔재이면, 현재 book 텍스트 글자수(짧음) ÷ 잔재 포함 wav 길이(긺)로 자/초가 절반 이하로 떨어진다.

**Why:** 실제 발화는 각 토막 5자/초 안팎으로 정상인데도 배속이 과도하게 잡힌다. 무음 문제로 오인하기 쉽다.

**How to apply:**
1. `3-transcribe.py`가 "잔존 WAV N건 — 에피소드에 해당 세그먼트 없음"을 보고하면 흘리지 말 것. 잔재 후보다.
2. 판별: 각 wav 세그먼트 텍스트가 현재 `book.ko.json`(quote/after/contextMain)에 존재하는지 대조. **0개 매칭 = 잔재.** 부분 매칭(뒷 문장만 없음)이면 wav 자체가 옛 버전이라 재생성 대상.
3. 잔재는 삭제 말고 `voice/<locale>/_backup-stale-wav/<engine>/`로 이동(복구 가능). 그 뒤 match-cps 재산출.
4. 관련: [[reference_voice_cps_match_skill.md]] · [[project_elon_musk_solo_discarded]] · [[feedback_file_safety]]
```

## feedback_story_utility_only

```markdown
---
name: ""
description: 사료 등급이 높은 사실이라도 인물 내면·스토리 매듭에 기여하지 않으면 본문에서 뺀다. 경매가·낙찰가·시장 평가 같은 외부 사건은 노이즈
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c461211e-4130-479b-a8ba-db7fa74448a2
---

사료가 A급이라는 이유만으로 본문에 끼워 넣지 않는다. 그 사실이 스토리의 중심축(인물 내면, 인과, 매듭)에 닿아야 한다.

**Why:** 유저가 마이클 잭슨 2편 매듭의 "친필 책이 사후 경매에서 일만 오천 달러에 낙찰됐다"를 보고 "이게 왜 스토리에 들어있냐"고 지적(2026-05-19). 사실 자체는 검증된 A급이지만, 매듭이 "잭슨이 자기 자신에게도 매일 같은 질문을 던지고 있었다"로 가는데 시장가 정보는 그 회수와 무관. 사료 강박으로 끼워 넣은 결과 스토리 흐름이 끊겼다.

**How to apply:**
- 사실 하나를 넣기 전 자가 점검 한 줄: "이 사실이 빠지면 매듭이 약해지는가, 그대로인가?" 그대로면 뺀다.
- 특히 경계해야 할 패턴:
  - **사후 경매가·낙찰가·시장가** — 인물 내면 아닌 외부 시장 사건. 거의 항상 노이즈.
  - 판매량·차트 순위·수상 횟수 — hook의 권위 노출용은 OK. 매듭에는 안 들어감.
  - 박물관 소장·전시 기록 — 같은 이유.
- 친필·서명·메모 같은 인물 행동 사실은 OK (내면의 흔적). 그 사실의 시장 후일담은 별개로 노이즈.
- 매듭은 인물의 내면 회수로만 끝낸다. 외부 후일담으로 매듭을 마감하지 않는다.

[[feedback_quote_substantive_only]] [[feedback_narrator_carries_when_dialogue_static]] 함께 적용.
```

## feedback_strict_dugwalsik

```markdown
---
name: 두괄식 strict 적용
description: 핵심요약(summary) 첫 문장은 명제 자체여야 한다. "X가 아니다"(부정 setup) 또는 "메시지는 선명하다/한 가지였다"(예고형 setup) 같은 한 박자 늦은 시작 금지
type: feedback
originSessionId: 943f6cd1-9a93-4c50-8044-c1b0fad780af
---
핵심요약·서두 문장을 쓸 때 첫 문장은 책·작품의 명제 자체여야 한다. 명제를 가리키는 setup 문장으로 시작하지 않는다.

**Why:** 유저가 직접 강하게 지적했다. "이 소설은 단순한 외계 문명 SF가 아닙니다"처럼 부정으로 시작하거나 "메시지는 선명합니다"처럼 명제를 예고하기만 하는 문장은 두괄식이 아니다. 진짜 명제가 두 번째 문장에 묻혀 있으면 독자가 한 박자 늦게 핵심에 도달한다. 두괄식 = 첫 문장 자체가 결론.

**How to apply:**
- 핵심요약 첫 문장을 쓴 직후 자가 점검 — "이 문장이 책의 명제인가, 아니면 명제를 가리키기만 하는가?"
- 다음 패턴이 보이면 즉시 재작문:
  - ❌ `이 책은 단순한 X가 아닙니다` (부정 setup)
  - ❌ `이 책의 메시지는 선명합니다` (예고형 setup)
  - ❌ `이 책의 진짜 정서는 X에 있습니다` (위치 지정 setup)
  - ❌ `작가가 증명하려 한 것은 한 가지였습니다` (개수 지정 setup)
- 권장 형태:
  - ✅ `이 책은 [명제] 임을 증명합니다`
  - ✅ `이 책은 [명제] 라고 단언합니다`
  - ✅ `톨킨은 이 책에서 [동작]을 했습니다` (작가 주어 + 명제 동작)
  - ✅ `이 소설은 [명제] 장치입니다` (작품 = 명제 직결)
- summary 외 contextMain·after에서도 단락 첫 문장에 같은 기준 적용한다.
- 두괄식 + 사물 주어 회피(`feedback_no_object_subject_korean.md`)를 함께 만족시키려면 `작가는 ~을 ~한다` 형태가 가장 안전하다.
- **두괄식 직후 도치/동격 금지**: 첫 문장에 명제를 박은 뒤 두 번째 문장을 `~의 명제입니다`, `~의 결론입니다`, `~는 것이 ~입니다` 같은 사물 술어·동격 구조로 받지 않는다. 유저는 이를 "선문답"으로 인식한다. 자연어순(작가는 명제를 ~했다)으로 바로 이어 쓴다.
  - ❌ `로마는 내부 부패로 무너졌습니다. 기번이 1300년을 추적해 도달한 결론입니다.`
  - ✅ `로마는 내부 부패로 무너졌습니다. 기번은 1300년을 추적해 이 결론에 도달했습니다.`

## 책 핵심요약(summary) 두괄식의 진짜 기본 포멧

책 본문에서 발췌한 주장을 그대로 첫 문장으로 쓰는 것은 두괄식이 아니라 "주장으로 시작"이다. 책 요약 두괄식은 책의 정체성과 주제를 한 문장에 통합한 메타 진술이다.

**기본 포멧:**
- `[책 제목/대명사]은 [핵심 주제·명제]를 [방식·장르]로 다룬 [장르·정체성]입니다.`

**예시:**
- ✅ `파운데이션은 인류가 문명의 붕괴 궤도를 예측하고 수정할 수 있다는 가설을 우주 서사시로 옮긴 SF 고전입니다.`
- ✅ `로마제국 쇠망사는 로마가 외부의 적이 아니라 내부의 부패로 무너졌다는 명제를 1300년의 추적으로 입증한 대작 역사서입니다.`
- ✅ `[책]은 ~을 [방식]으로 [동작]한 [입문서/SF/역사서/회고록]입니다.`

**주장으로 시작 (≠ 두괄식):**
- ❌ `로마는 외부의 적이 아니라 내부의 부패로 무너졌습니다.` — 책 본문 주장 인용. 어떤 책인지가 첫 문장에 없음
- ❌ `초지능 AI는 한번 등장하면 인간이 통제할 수 없습니다.` — 같음

**Why:** 유저가 명시적으로 지적했다. "이건 주장으로 시작하는 거지 두괄식이 아니라"

**How to apply:** summary 첫 문장에 책 정체성(SF/역사서/입문서/저작)이 명시되어 있는가를 점검. 없으면 정체성 + 주제를 결합한 통합 진술로 재작문. 명제를 강조하고 싶으면 두 번째 문장 이후에 풀어 쓴다.
```

## feedback_studio_preview_lag_profile_first

```markdown
---
name: feedback_studio_preview_lag_profile_first
description: Remotion Studio 재생 렉은 추측 말고 puppeteer 프로파일 실측. Audio volume 콜백이 최다 핫패스(타임라인이 수만 번 호출) — 전 구간 루프 금지
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2184ecb4-9ff9-41cc-8508-be861eb96d6a
---

Remotion Studio 미리보기가 느리다는 신고(예: "1배속도 못 함, 0.8배속 느낌")를 받으면 코드 훑고 추측하지 말고 **실측부터** 한다.

**Why:** 팩션 01 렉 사건(26-07-02)에서 1차 추측(영상 인코딩)이 빗나갔다. 실측하니 페인트가 아니라 JS가 97%였고, 범인은 FactionBgm의 덕킹 `duckAt`(음량 콜백이 매 호출마다 68명 발화 구간 전체를 bezier easing interpolate로 훑음 + Studio 타임라인이 음량 곡선을 그리며 이 콜백을 수만 번 호출 + 매 프레임 buildCues 재계산). 단일 구간 탐색 + useMemo + React.memo(FactionBgm)로 11fps→60fps+.

**How to apply:**
- 측정: scratchpad에 `npm i puppeteer-core` → 실행 중 Studio URL 열고 스페이스 재생 → ① rAF 델타(실효 fps) + `page.metrics()`(Script/Style/Layout 분해), ② CDP `Profiler.start/stop`으로 셀프타임 상위 함수 집계. 헤드풀 Chrome(`C:/Program Files/Google/Chrome/Application/chrome.exe`), goto는 "frame detached"가 잦아 newPage 재시도 루프 필요.
- 교훈: `<Audio volume={fn}>` 콜백은 재생 프레임당뿐 아니라 **Studio 타임라인 음량 곡선 렌더가 구간 전체에 대해 호출**한다. 콜백 안에서 전 구간 배열 루프·bezier easing 남발 금지 — 병합·정렬된 구간에서 해당 구간 1개만 계산. 콜백 참조도 memo로 고정해야 곡선 캐시가 산다.
- 컴포지션 최상위가 useCurrentFrame으로 매 프레임 재렌더되므로, 프레임 무관 자식(BGM 등)은 React.memo로 끊고, 컷 레이어는 화면 밖이면 내용 생성 전에 null 반환.
- 관련: [[feedback_faction_video_remotion_media]] (OffthreadVideo 미리보기=네이티브 video 정정), [[feedback_no_restart_dev_server]]
```

## feedback_sub_split_llm_only

```markdown
---
name: sub 청크 분할은 LLM 의미 단위만, 글자수 자동 분할 금지
description: 쇼츠/롱폼 sub 청크 분할은 /remo-voice-sync 스킬 규칙(고유명사·관형절·보조용언 보존)대로 LLM이 직접 작성한다. 글자수·어절 단순 카운트로 자동 분할 금지
type: feedback
originSessionId: 6279e86d-c8a8-4db4-958e-45b918736360
---
쇼츠·롱폼 voiceTimings의 sub 청크를 분할할 때, 글자수 임계나 어절 묶음 알고리즘으로 일괄 자동 분할하지 않는다. /remo-voice-sync 스킬에 정의된 분할 우선순위 그대로 LLM(Claude 자신)이 한 sentence씩 직접 작성해야 한다.

**Why:** 2026-05-10 elon-musk 쇼츠1에서 어절 글자수(평균 8자, 최대 12자) 기준으로 81개 segment를 자동 분할했더니 다음 위반이 발생했다.
- 관형절+피수식어 분리: "평생 품어 온 / 단어입니다", "1961년 출간된 SF / 명작"
- 고유명사 파괴: "'낯선 땅 / 이방인'으로"
- 의미 단위 무시: "이 이름의 뿌리는 / 1961년 출간된 SF / 명작, '낯선 땅 / 이방인'으로 / 거슬러 / 올라갑니다"
사용자가 "단위를 제멋대로 자르면 어떻게 해. /remo-voice-sync에서 자르는 작업 LLM이 하던거 하라고 한 거잖아"라고 강하게 지적. sub.join === text 검증 통과만 보고 의미 단위는 검토하지 않은 게 직접 원인.

**How to apply:**
- sub 분할 입력은 sentence별로 직접 손으로 작성. 절대 글자수 카운트 자동 스크립트 사용 금지.
- 분할 우선순위 (스킬 문서 그대로):
  1. 쉼표 뒤 (5-chunk.ts가 자동 처리)
  2. 절 경계 — 연결어미(~고, ~며, ~지만, ~면, ~서, ~여) 뒤
  3. 주어/목적어 뒤 — ~은/는/이/가/을/를 뒤
  4. 수식절+피수식어 한 덩어리
- 절대 금지:
  - 고유명사 파괴 (`'낯선 땅' / '이방인'`, `맨해튼 / 프로젝트`)
  - 관형절+피수식어 분리 (`평생 품어 온 / 단어`, `깊이 품어낼 / 인공지능`)
  - 보조용언 분리 (`만들 / 겁니다`, `할 수 / 있을까요`)
  - 지시사+체언 분리 (`이 / 책을`, `그 / 점에`)
- 검증은 두 단계로 본다: (1) sub.join(' ') === text 자동 검증, (2) 각 청크가 단독으로 읽혀도 의미 통하는지 LLM 자가 점검.
- 한 sentence라도 어색하면 sentence 전체 다시 작성. "대부분 맞으니 넘긴다"는 절대 금지 — 사용자는 한 단위라도 어긋나면 결과 전체를 거부한다.
```

## feedback_supabase_action_caching

```markdown
---
name: Supabase server action 작성 시 캐시·페이로드 규칙
description: feelandnote sw/web 의 신규 server action 작성·수정 시 egress 누수 재발을 막는 의무 규칙. 누락 시 한도 초과로 차단 사고가 반복된다.
type: feedback
originSessionId: a0585edb-a96f-4dd3-8de1-08d9abd406d3
---
신규 server action을 만들거나 기존 action을 수정할 때 다음 규칙을 모두 준수한다.

**Why:** Supabase Free 플랜 5.5GB egress 한도가 매우 작아 동일 사고가 2026-03-18, 2026-05-09 두 번 재발했다. 두 번 모두 신규 추가된 action이 캐시·JSON path·페이지네이션 규칙을 무시한 게 원인이었다. 단순 코드 리뷰로는 매번 같은 함정에 빠진다.

**How to apply:**

1. 공개 read action은 반드시 `unstable_cache(fn, ['key'], { revalidate: 3600, tags: ['celebs'] })` + `createStaticClient()` (`sw/web/src/lib/supabase/static.ts`) 패턴. `createClient()`(cookie 기반)는 인증 의존 부분에만 사용.
2. 인증 사용자 의존 데이터(현재 user.id 기반 follow/block/private)는 캐시 inner 밖으로 분리. inner는 primitive 인자만 받아 캐시 키 안정화. locale은 항상 외부에서 `getLocale()` 받아 인자로 전달.
3. `celeb_dialogues.lines`/`lines_en` 통째 select 금지. greeting/quote만 필요하면 `DIALOGUE_BRIEF_SELECT` 또는 `DIALOGUE_BRIEF_SELECT_WITH_ID`. quote/monologue 필요하면 `DIALOGUE_PROFILE_SELECT`. JSON path는 `celeb-dialogues.ts`에 정의됨.
4. 카운트만 필요하면 `select('*', { count: 'exact', head: true })` 또는 SQL RPC. row를 페이지네이션으로 끝까지 받는 패턴(`while hasMore` + `range(from, from+PAGE_SIZE-1)` + `chunkArray` BATCH_SIZE 50) 금지.
5. RSC 페이지(`app/**/page.tsx`)에서 `supabase.from(...)` 직접 호출 금지. 캐시 우회되어 SEO 크롤러 직격당함. 캐시된 action으로 분리.
6. JSON 컬럼(`cultural_journey`, `bio`, `youtube_videos` 등)을 결과셋과 함께 풀 셀렉트할 때는 캐시 적용 + 슬러그/ID 단위 키 분리로 hit ratio 확보.
7. 변경 시 `docs/project/external-services.md` 의 캐싱 적용 함수 목록과 잔여 작업 갱신. 이 문서가 SSoT.
8. mutation에서 `revalidatePath`/`revalidateTag` 호출 빈도 점검. 한 mutation이 3중 path 무효화하면 캐시 hit ratio 무력화. tag 단위로 통합 권장.
9. **전체 테이블 풀스캔 + 행별 캐시 키 = egress 폭탄.** `unstable_cache` 키에 `celebId`/`page`/`slug` 같은 행별 식별자를 넣으면서 내부에서 전체 테이블을 풀스캔하면(예: `.neq('celeb_id', id)`로 전체 persona, page별 전체 user_contents), 식별자 수만큼 캐시가 갈라져 각 키의 첫 미스가 전체 테이블을 통째 전송한다. 크롤러가 셀럽 ko/en 페이지를 순회하면 수천 회 × 전체 테이블 = 수 GB. **해법: 전체 조회는 인자 없는(또는 locale만) 단일 캐시 키로 1회만 받고, 행별 필터·계산·페이지 분할은 그 공유 캐시 위에서 JS로 한다.** 2026-06-22 셀럽 페이지(getSimilarByCelebId 전체 persona 4.25MB, getContemporaries 전체 profiles)·라이브러리(getScripturesByProfession page별 전체 user_contents)가 이 패턴으로 5.5GB 초과의 주범이었다. 캐시 원본 mutate 방지 위해 slice 후 `.map(c => ({...c}))` 얕은 복사 필수.
10. **봇 트래픽이 egress 증폭원.** 실사용자가 적어도 검색엔진 봇이 sitemap 등록 동적 경로(셀럽 slug × ko/en)를 순회하며 캐시 미스를 유발한다. `robots.ts`에 `/*?`(필터·검색 쿼리스트링) 차단으로 캐시 키 폭발(getCelebs 12인자 등)을 줄인다. 이미지는 R2(`pub-*.r2.dev`) 서빙이라 Supabase egress와 무관 — egress는 거의 전부 DB 행 전송이다.

검증 체크: 신규 action PR을 받으면 위 8개 항목으로 자가 점검. `unstable_cache` import 유무, `createStaticClient` 사용 유무, `lines, lines_en` 문자열 grep, `range(.+PAGE_SIZE` 패턴 grep — 4개 grep만으로 80% 잡힌다.
```

## feedback_terse_reply

```markdown
---
name: 간결한 답변
description: 이 유저는 잡다한 말·설명 나열을 싫어함. 결론·행동·필요정보만.
type: feedback
---

답변에 부연설명, 선택지 나열, 옵션 비교, 후속권장 장황하게 쓰지 마라.

**Why:** 유저가 명시적으로 "말이 많다, 잡다한 답변 피하라"고 지적했다 (2026-04-07). 진행 결과와 다음 행동만 필요하다.

**How to apply:**
- 결과 보고는 핵심 지표 한두 줄
- 선택지 나열 금지. 결정 필요하면 단답형 질문 하나
- "추천", "주의", "고려사항" 항목 생략
- 비유·풀이·배경설명은 유저가 명시적으로 요청할 때만
```

## feedback_text_condensing

```markdown
---
name: 텍스트 축약은 재작문
description: 텍스트 분량 축약 요청 시 단어 삭제가 아닌 수려한 문장 재작문으로 접근
type: feedback
---

텍스트 축약 요청 시 단어를 잘라내지 않는다. 문장을 새로 써서 같은 의미를 더 수려하고 압축된 표현으로 전달한다.

**Why:** 단순 삭제는 문장의 결을 망가뜨린다. 유저가 원하는 것은 분량 감소가 아니라 동일한 밀도를 더 짧은 호흡에 담는 것이다.

**How to apply:** "벗삼다", "되뇌다", "앉고서도" 같은 문어체 압축, 절 연결 재구성, 뉘앙스 보존이 핵심. 원문의 대비 구조(명령 vs 편지, 가르침 vs 기도)는 반드시 유지.
```

## feedback_think_in_korean

```markdown
---
name: 한국어로 사고하고 작성
description: 영문으로 먼저 생각한 뒤 한국어로 옮기는 번역 과정 자체를 차단한다. 처음부터 한국어로 사고하고 한국어로 작성한다
type: feedback
originSessionId: 1491eec4-d8c2-4a96-82ad-dffdd1564432
---
응답 작성 시 영문 기반 사고 → 한국어 번역 흐름을 끊는다. 처음부터 한국어로 사고하고 한국어 골격으로 작성한다.

**Why:** 유저가 "너는 영문기반으로 사고하고 그걸 국문으로 옮겨서 매번 번역투 텍스트가 생성된다"고 지적했다(2026-05-07). 출력 직전 자가 점검(feedback_korean_voice.md)만으로는 이미 영문 골격으로 짜인 문장을 부분 수정하는 데 그쳐 번역투가 계속 새어나왔다. 사고 단계부터 한국어로 잡아야 근본 해결된다.

**How to apply:**
- 응답 구조를 짤 때 영문 표현(Here is..., First..., To do this...)을 떠올리지 않는다. 한국어 화자가 그 상황에서 먼저 떠올리는 말로 시작한다
- 문장을 영어로 떠올린 뒤 번역하지 않는다. 한국어 어휘·어순·연결어로 처음부터 짠다
- 자주 새는 영문 골격 패턴: "A이지만 B다"(but 직역), "X로서의 Y"(as 직역), "이는 ~을 의미한다"(this means 직역), "다음과 같다:"(as follows: 직역), 콜론 후 항목 나열
- 번역 흐름의 신호: 작성 도중 영어 단어가 머리에 먼저 떠오르면 멈추고 한국어 화법으로 다시 시작한다
- 출력 직전 점검(feedback_korean_voice.md)은 마지막 안전망일 뿐 1차 방어선은 사고 자체다

**글(에피소드 본문·쇼츠 텍스트) 작성 시 강화 규칙 (2026-05-19 추가):**
유저가 "글 작성할 때만은 국문법으로 사고하고 집필" 명시 강조. 대화/설명 영역보다 더 엄격 적용한다.
- 긴 관형절(N자 이상의 수식이 명사 앞에 붙는 구조) 금지. "A하던 그가 B한 책 또한 C였다" 같은 구조 발견 시 즉시 분할.
- "[책]은 [긴 수식]의 우화다" 같은 "X is Y" 직역 구조 금지. "[책]. [짧은 명제]. [짧은 명제]." 식으로 끊기.
- 사물 주어 수동 구문 ("머리맡에는 ~가 놓여 있었다") 금지. 사람을 주어로 한 능동으로 다시 짠다.
- 한 문장 한 호흡 원칙. 쉼표로 정보 세 개 이상 이어붙이지 않는다. 마침표로 끊고 다음 문장에서 이어받는다.
- "또 한 사람은 X였습니다" 같은 영문 enumeration 직역 금지. "또 한 사람이 있었습니다. X였지요." 식으로 풀어 쓴다.
- 작성 후 ko-detranslate 자가 점검을 의무로 한 번 더 돈다. [[feedback_korean_voice]] [[feedback_no_object_subject_korean]] [[feedback_korean_sentence_order]] 함께 참조.
```

## feedback_tmp_cleanup

```markdown
---
name: tmp 파일 즉시 삭제
description: /tmp에 생성한 임시 파일은 사용 직후 즉시 삭제해야 한다
type: feedback
---

/tmp 디렉토리에 만든 임시 파일은 사용 즉시 삭제한다. 방치하지 않는다.

**Why:** tmp는 내가 쓰는 공간이고, 한번 쓰고 바로 정리해야 하는 곳이다.
**How to apply:** remotion still 렌더 등으로 /tmp에 파일 생성 시, out/ 등 목적지로 복사 완료 후 즉시 rm 실행.
```

## feedback_tts_no_suspicion

```markdown
---
name: TTS 변조 의심 금지
description: Gemini TTS 변조를 의심하지 말 것. 오디오-텍스트 불일치 시 자신의 분석 오류를 먼저 점검
type: feedback
---

TTS가 텍스트를 변조했다고 의심하지 않는다. 오디오와 텍스트가 다르면 자신의 분석이 틀렸거나 잘못된 소스를 참조한 것이다.

**Why:** 사용자가 TTS 변조 가설을 반복 제기하는 것에 명확히 거부. 문제의 원인은 항상 다른 곳에 있다.
**How to apply:** 오디오-텍스트 불일치 발견 시, TTS 변조 가설을 세우지 말고 (1) 어떤 텍스트로 생성했는지 (2) JSON 소스가 최신인지 (3) 세그먼트 매핑이 올바른지를 먼저 점검한다.
```

## feedback_verify_before_asserting

```markdown
---
name: feedback_verify_before_asserting
description: 확인 안 한 것을 확인한 것처럼 단정하지 마라. 실측분과 추정분을 갈라 표시한다
metadata: 
  node_type: memory
  type: feedback
  originSessionId: dd6d105e-1b92-4710-abc7-571fde276d6b
  modified: 2026-07-20T02:14:05.900Z
---

26.07.20 한 세션에서 같은 유형으로 세 번 걸렸다.

1. 팩션 이미지 **파일명만** 훑고 완성본 101명으로 보고 → 실제로는 대부분 `_refs`(발주 참고용 외부 자료). 경로 한 번만 봤으면 안 틀렸다. 실측 후 완성본은 57명.
2. "시대 안 맞는 이미지를 프로그램으로 잡는다"고 단정 → 붓질·사진 판별 도구는 이 프로젝트에 없다. 확인도 안 하고 말했다.
3. 검증 수단(출처 이름 대조·얼굴 대조)을 **선별 수단** 칸에 배치 → 유저가 "그건 의심군 찾은 뒤 검수 방법 아니냐"고 지적.

**Why:** 모르는 걸 몰라서 틀린 게 아니라 **알 수 있는 걸 안 보고** 답했다. 게다가 표로 깔끔히 정리해 내놓으면 검증된 것처럼 보여 유저가 걸러내기 어렵다. 유저가 "opus인데 기초적 지능 문제" 라며 신뢰를 문제 삼았다.

**How to apply:**
- 조사 직후 곧바로 요약표를 내놓지 마라. 조사와 요약 사이에 검증 단계를 둔다.
- 문서·답변에 **확인분과 추정분을 갈라 표시**한다. 확인분은 무엇을 돌려 나온 결과인지 붙이고, 추정분은 "미확인"이라 쓰고 확인하려면 무엇을 돌려야 하는지 적는다.
- 분류표를 만들 때 각 항목이 그 칸의 정의를 실제로 충족하는지 되짚는다(3번 유형).
- 유저의 방어 수단은 "그거 실제로 확인한 거냐" 한 마디다. 그 질문이 나오기 전에 스스로 표시해라.
```

## feedback_visual_rhyme_for_text_parallelism

```markdown
---
name: feedback_visual_rhyme_for_text_parallelism
description: "영상 이미지 발주 시 텍스트의 대구·대조를 영상 구도로도 동일하게 라임시킨다. 닮음=미러링, 대조=같은 구도 앵글/색온도만 반전"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 198286f5-6e41-4f5d-a53e-811b92369e7b
---

remotion 영상 이미지 발주(컷 설계) 시, 텍스트가 대구·대조를 쓰면 **영상도 같은 구조로 시각적 라임(visual rhyme)** 시켜야 한다. 글에서 대구·대조를 즐기듯 화면도 동일해야 한다는 유저 지시.

**Why:** 키워드로 'cinematic' 붙이는 수준이 아니라, 의미 구조를 구도·포즈로 증명해야 컷이 산다. 텍스트의 수사를 영상이 따라가지 않으면 연출이 평면적이 된다.

**How to apply:**
- **닮음·겹침 메시지** → 두 인물을 **같은 자세·구도·앵글·렌즈**로 미러링 크로스. 예: "에롤↔일론 닮았다" → 단순 좌우 분할이 아니라 둘 다 똑같은 측면 3/4·같은 시선 방향·같은 조명 각도로 맞춰 겹쳐 보임을 구도로 증명.
- **대조·분기 메시지** → **같은 구도를 유지한 채 앵글·색온도·밝기만 반전.** 예: 14세 절망↔구원 → 같은 위치·같은 인물 크기에서 high↔low + 어둠↔빛만 뒤집기. 책 결론 vs 머스크 결론 → 동일 프레이밍에서 좌(차가움)·우(따뜻함)만 반전.
- **반복·점층(나열 대구)** → 각 컷을 짝패 규칙으로 통일(통념=흐리게/작게/차갑게 ↔ 재정의=또렷/크게/따뜻하게)해 리듬 생성.
- **공동 증언(여러 화자 한목소리)** → 동일 톤·크기·아이레벨로 묶어 구도로 표현.

관련: [[feedback_image_prompt_lessons]] (이미지 프롬프트 일반 교훈)
```

## feedback_voice_alignment_dead_ends

```markdown
---
name: voice timing 정렬 방식 — 폐기된 방향
description: 음성 타이밍 파이프라인에서 과거 시도·실패한 정렬 방식 목록. 재제안 금지
type: feedback
originSessionId: ea8ceb14-247f-4682-ae4b-d0b3dc2650c5
---
음성 파이프라인(2-whisper.py, 3-timings.ts) 수정 제안 시 **아래 세 방향은 이미 실패 이력이 있으므로 재제안 금지**. 대안을 제시할 때 이 목록을 먼저 배제하고 시작한다.

| 폐기 방향 | 실패 원인 |
|---|---|
| **wav2vec2 forced alignment에 원고 text 직접 전달** (`whisperx.align(synth_segments, ...)`) | wav2vec2 한국어 모델은 원고를 타겟으로 줘도 정렬 실패. 숫자·한자·고유명사 구간이 어긋남 |
| **WAV silence 분할 + 음절 비례 분배** (ASR 건너뛰고 RMS silence만으로 phrase 경계 추정) | silence 경계 검출 자체가 한국어 TTS 오디오에서 신뢰 불가. 폐기 |
| **ASR + diff-match-patch 단독** (현재 방식) | 부분적으로 작동하지만 숫자 literal digit 재구성 + 시간창 압축(예: "1576년" 140ms) 버그 상존. 근본 해결 아님, 현상 유지용 |

**Why:** 2026-04-11 이순신 에피소드의 숫자·한자 하이라이트/앵커/발음 붕괴 분석 중 Claude가 위 방향들을 순차 제안했고, 유저가 "다 망했던 방식"이라 회수 지시. 기계적 파이프라인만으로는 한국어 숫자/고유명사 alignment가 안정화되지 않는다는 것이 유저의 경험적 판단.

**How to apply:**
- 음성 타이밍 정합성 문제 진단 시, 위 3가지 방향을 자동으로 후보에서 제외
- 남은 현실 경로는: **ASR+diff 유지 + LLM 보정 후처리 섹션 신설**. LLM이 오디오는 못 듣지만 whisper text ↔ display_text 대조로 오인식 교정 및 비상식 duration 재분배
- 기계적 방식으로 또 다른 "스마트한" alignment 묘수를 찾으려 하지 말 것. 유저는 LLM 보정 레이어를 원한다
```

## feedback_voice_elevenlabs_user_exclusive

```markdown
---
name: 음성 생성은 유저 명시 요청 시에만
description: ElevenLabs는 자동화 불가 + Gemini도 유저 명시 요청 시에만. 텍스트 수정 후 자동 재합성 금지. 파이프라인도 동일.
type: feedback
originSessionId: 0429108f-ed62-4be7-a2ff-c3cab3075b13
---
**모든 음성 합성(Gemini · ElevenLabs · 파이프라인)은 유저가 명시적으로 요청할 때만 실행한다.** 텍스트가 바뀌었다고 자동으로 wav를 지우고 `voice:tts` 돌리지 않는다. align/chunk도 마찬가지.

**Why:**
1. ElevenLabs는 LLM 판단 불가 — 유저가 사이트에서 직접 듣고 품질 판단·선별 (`scripts/voice/2-synthesize/main.ts:79` 주석)
2. Gemini도 유저가 톤·자연스러움을 본인 귀로 검수해야 한다. 텍스트가 바뀌었다고 즉시 재합성하면 user의 검수 사이클을 가로챈다.
3. 합성·정렬은 시간·키 소모가 있는 작업이라 유저 페이스에 맞춰야 한다.

**How to apply:**
- 텍스트만 바꾸고 멈춘다. "음성 재생성 필요" 보고만 하고 user 응답 대기.
- user가 "음원 만들어줘", "재생성 ㄱ", "voice 다시" 등 명시 요청해야만 `voice:tts` 실행.
- 파이프라인(transcribe·align·chunk)도 user가 명시 요청("파이프라인 돌려줘", "/voice-sync", "sub 채워줘") 시에만.
- ElevenLabs 슬롯은 절대 Claude가 합성 안 함. `--engine elevenlabs` 사용 금지.
- ElevenLabs 감정 태그 prefix 주입을 위한 `tts.replace` 편법 금지.
- celeb 오디오 변경은 user가 "celeb-N 됐다"고 통지해야 후속 작업 진행.
- 단어수 불일치 등으로 celeb 오디오가 구버전인지 선제적 점검·경고 금지.
```

## feedback_voice_normalize_required

```markdown
---
name: 보이스 생성 시 --normalize 필수
description: pnpm voice 실행 시 --normalize 플래그 필수. 없으면 라우드니스 정규화 안 되고 볼륨 불균일
type: feedback
---

`pnpm voice -- --episode <name> --long --update-json` 실행 시 **반드시 `--normalize` 플래그 포함**. 없으면 생성된 wav가 라우드니스 정규화되지 않아 볼륨이 들쭉날쭉하고 영상 믹스 단계에서 음량 차이가 드러난다.

**Why:** 이순신 에피소드 voice 파이프라인 실행 시 내가 `--normalize`를 빠뜨려서 12건 전부 정규화 안 된 상태로 넘어갔다. 사용자가 "보이스 정규화가 파이프라인에 없나?"로 지적. 사후에 `--normalize` 단독 실행으로 보정.

**How to apply:**
- voice 생성 명령은 기본으로 **`--normalize` 포함**: `pnpm voice -- --episode <name> --long --update-json --normalize`
- 쇼츠도 동일: `pnpm voice -- --episode <name> --shorts 1 --update-json --normalize`
- 정규화 단독 실행 가능: `pnpm voice -- --episode <name> --long --normalize` (TTS 없이 OUT_DIR wav 일괄 loudnorm)
- 타겟: I=-19 LUFS, TP=-1.5, LRA=11, linear 모드. 원본은 `.raw/` 폴더 자동 백업
- ElevenLabs 엔진일 때는 정규화 자동 스킵
- voice → normalize → whisper → analyze 순서가 완전한 파이프라인
```

## feedback_voicetiming_no_source_overwrite

```markdown
---
name: VoiceTimingEditor 저장 — 원문 텍스트 절대 덮어쓰지 않기
description: 타이밍 저장 시 토막 join으로 seg.text/원문을 다시 쓰면 \n·\n\n 같은 포매팅이 모두 단일 공백으로 뭉개진다
type: feedback
originSessionId: 1d04dfab-da66-4e28-a38a-5f570affcfdd
---
VoiceTimingEditor 저장(SyncModeContent.handleSave) 시 토막 배열을 `segs.join(' ')`로 합쳐 원문 필드(shorts seg.text, books summary 등)에 다시 쓰는 경로를 만들지 말 것. 토막 분할은 `text.split(/\s+/)` 기준이라 `\n`·`\n\n` 같은 줄바꿈이 모두 같은 공백으로 취급돼, 다시 원문으로 들어가는 순간 포매팅이 영구 손실된다.

**Why:** 2026-05-06 zhuge-liang shorts-3/S06-celeb-zhuge-2에서 사용자가 "타이밍 저장 (텍스트 포함)" 누른 직후 7개 `\n\n`/`\n`이 모두 단일 공백으로 뭉개졌다. 원문은 git 미추적이라 git으로 복구 불가. 직전 대화에서 읽어둔 원본 덕에 수동 복원 가능했다.

**How to apply:**
- 저장 핸들러는 `voiceTimings[secKey][i].text`(토막별 자막)만 갱신한다. 원문(seg.text/summary/contextMain 등)은 절대 갱신하지 않는다.
- 원문 수정이 필요하면 별도 textarea(SyncModeContent의 "원문 텍스트" 영역)에서 직접 편집해야 한다 — 사용자 입력은 `\n`을 그대로 유지한다.
- 어떤 분할 함수든 `/\s+/` 또는 `split(' ')` 후 `join(' ')` 라운드트립은 줄바꿈을 파괴한다. 이 패턴이 원문에 닿는 순간을 항상 막는다.
- VoiceTimingEditor 내부의 `splitTextAtRatio`·`shiftWord`도 `/\s+/` join 기반이지만, 이건 토막 자막 표시용이라 원문에 닿지 않으면 OK. 닿는 순간이 위험.
```

## feedback_voicetiming_save

```markdown
---
name: VoiceTimingEditor 저장 흐름 교훈
description: remotion-bo SYNC 모드 저장 시 stale closure 문제 → ref 직독 패턴으로 해결. 테스트 시 유저 데이터 수정 금지.
type: feedback
---

VoiceTimingEditor 세그먼트 텍스트 저장 시 React 상태 전파 체인(onSegmentsChange → onEpisodeChange → setEpisode)은 stale closure로 실패할 수 있다. SyncModePanel 독립 컴포넌트 + segmentsRef 직접 읽기 패턴이 확실하다.

**Why:** 상태 전파 체인이 여러 컴포넌트를 거치면 클로저가 이전 렌더의 데이터를 캡처하여 저장 시 최신 데이터가 누락됨.

**How to apply:**
- 저장 버튼은 상태가 아닌 ref에서 직접 데이터를 읽어 조립
- 유저 파일(에피소드 JSON 등)을 테스트 목적으로 직접 수정하지 말 것 — 데이터 손상 위험
- voiceTimings의 text 필드는 수동 오버라이드 전용. 없으면 자동 문장 분할로 동작
```

## project_celeb_full_requires_content

```markdown
---
name: project_celeb_full_requires_content
description: "셀럽 celeb_tier='full' 승격은 user_contents 1건 이상 필수. DB 트리거로 강제됨"
metadata: 
  node_type: memory
  type: project
  originSessionId: b2c925ec-1e2f-45c4-9093-3aea7b469937
---

셀럽 `profiles.celeb_tier='full'`은 감상 콘텐츠(`user_contents` 1건 이상)가 있어야만 유효하다. 콘텐츠 0개인데 full이면 룰북 위반(프로필 콘텐츠 탭이 빈 채로 full 표시됨).

2026-06-22 DB 트리거 `trg_celeb_full_requires_content`(함수 `public.enforce_celeb_full_requires_content`)를 설치해 강제했다. "profile_type='CELEB'이면서 full로 *새로 전환되는 시점*"만 검증한다(INSERT, 또는 OLD가 full/CELEB 아니던 행의 UPDATE). 콘텐츠 0건이면 `check_violation` 예외를 던진다. 이미 full인 행의 다른 필드 수정·일반 유저·강등(full→light)은 통과한다.

**Why:** `celeb_tier` 컬럼 기본값이 `'full'`이고 제약이 없어, 콘텐츠 없이 full이 쉽게 생긴다(설치 전 full 1286명 중 23명이 콘텐츠 0개였음).

**How to apply:** 콘텐츠 없는 셀럽을 full로 올리려 하면 트리거가 막는다. full이 필요하면 먼저 콘텐츠 수집(celeb-2-content-collector) 후 승격하라. 콘텐츠 없이 풍부하게만 채울 거면 light로 둔다(light도 페르소나·발화·영향력·감상여정 다 가질 수 있고 콘텐츠 탭만 숨김). [[feedback_no_silent_fallback]] 파이프라인 정의는 docs/project/celeb/celeb-pipeline.md.
```

## project_elon_musk_solo_discarded

```markdown
---
name: project_elon_musk_solo_discarded
description: elon-musk 서재탐방은 롱폼 10권(D01~D10)이 본편. 1권 모드(solo-B01/*)는 폐기라 음성·자막·렌더에서 무시
metadata: 
  node_type: memory
  type: project
  originSessionId: 129dd013-6a37-4558-b6f4-e59de630c8a3
---

elon-musk 「서재 탐방」에서 "롱폼"은 **10권짜리 본편**(타이밍 키 `D01`~`D10`, 그리고 intro/philosophy/outro인 B1·B2·E1)을 가리킨다.

**1권 모드(SOLO, 타이밍 키 `solo-B01/S**-s*`)는 폐기됐다.** 같은 `meta.ko.timing.json` 파일 안에 solo 세그먼트가 남아 있어 `voice:align --long`·`voice:chunk` 검증에 함께 걸려 나오지만, 렌더에 안 쓰이므로 무시한다.

**Why:** 유저가 "솔로는 다 폐기, 롱폼이라고 하면 10권짜리 내용물"이라고 명시(2026-07-01). AGENTS.md TODO의 "1권 모드(SOLO) 음성 외 완료" 항목과 배치되므로 유저 지시를 우선한다.

**How to apply:** 머스크 음성 파이프라인·발화속도·렌더 작업 시 `solo-B01/*` 세그먼트의 경고(과대·비정상 짧음 등)는 조치 대상에서 제외한다. 자막 분할·타이밍은 `D*` 롱폼 세그먼트에만 신경 쓴다. 관련: [[feedback_shorts_based_immutable]]
```

## project_faction_celeb_sync

```markdown
---
name: project_faction_celeb_sync
description: "팩션 인물 전원 DB 동기화 작전(2026-07-03) — relation·fiction 티어 신설, 전 에피소드 인물 100% DB 연결(신화 포함). BO 인물행 DB 배지 구현"
metadata: 
  node_type: memory
  type: project
  originSessionId: 160873fe-1306-45eb-9f6e-5a4125c36421
---

리모션 팩션(세력도) 전 에피소드 인물을 본서비스 셀럽 DB에 100% 연결한 작전. 기준 페이지 `/faction/<ep>/both/info`.

**티어 방침** (celeb_tier, celeb-pipeline.md에 문서화). 4종: 감상기록 있을 만한 인물=full 후보(일단 light로 등록 후 콘텐츠 수집 시 승격), 문화적 영향력만=light, 관계 때문에 나오는 단순 **실존** 인물=**relation**(신설), 신화·전설·허구 존재=**fiction**(신설, 실존 아님. 일리아스 신·영웅 30명 등록). relation·fiction=basic 최소만, 감상여정·영향력·페르소나·발화 전부 생략, 홈·검색·탐색 비노출(연결로만). fiction은 승격 대상 아님. celeb_tier CHECK 제약 없음(값 자유). 신화 인물은 faction-data.json에 `mythical: true`도 박음.

**BO 편집기 인물행 DB 배지 구현**: `/api/celebs/exists`(POST slugs→existing), `FactionCelebContext`. 배지 4종: ✓DB(실존 등록)/⚠없음(키 있는데 DB 부재=유령)/미연결(키 없음)/신화(mythical 플래그 — DB 연결 시 초록 '✓ 신화', 아니면 회색 '신화'). status 무관(신규는 inactive). FactionPerson에 `mythical?: boolean` 추가(remotion·bo types 양쪽).

**데이터 위치**: `sw/remotion/public/factions/<ep>/faction-data.json` (2026-07 폴더명 한글→영문·파일명 data.json→faction-data.json 변경됨, gitignore 자산). 등록 slug는 라틴 풀네임·악센트로 유령과 어긋날 수 있어 **인물 이름 기준 DB 재조회로 재연결**(reconnect-slugs.mjs). 동명이인 주의(김영삼=대통령 kim-young-sam ↔ 아이러브스쿨 young-sam-kim).

등록 통로·컬럼 함정은 [[reference_celeb_bulk_register_workaround]]. 완료 현황: 전 8에피소드(AI-Supremacy·X-Empire·Digital-Resistance·Social-Network·Streaming-Empire·Path-of-Kings·PayPal-Mafia·Iliad-Odyssey) 인물 268명 유령 0, 100% DB 연결(실존 237 light/relation + 신화 30 fiction, 오디세우스 slug 1개 공유). 신규 등록분 status=inactive라 검수 후 수동 active 전환 필요.
```

## project_faction_hackers_arc

```markdown
---
name: project_faction_hackers_arc
description: 팩션 「위대한 해커들」 3부작 기획 확정(데이터 미작성). 조사 원자료·출연 명단은 faction-hackers-plan.md
metadata: 
  node_type: memory
  type: project
  originSessionId: 3278cdb7-e685-4be3-a7ca-57b069202d25
---

팩션(세력도) 신규 「위대한 해커들」을 **3부작 + 종장**으로 기획 확정(2026-06-29). **해킹의 역사 연도순**(편 사이·편 내부 과거→현재).

**진행 상태(2026-06-29)**: 에피소드 폴더 `12-위대한해커-개인의시대`·`13-위대한해커-가면의시대`·`14-위대한해커-국가의군단` 생성. 각 `data.json`(세력·인물·세력명·이력 ko/en, **대사·음성·이미지 없는 credit 골격**) + 발주서(`person-prompts.md`·`group-prompts.md`) 작성 완료. `_episodes.json` 등록 완료. BO 로드·렌더 검증됨(12 캡처 확인). 종장 「다시, 얼굴」은 14편의 마지막 진영으로 들어감(독립 4편 승격은 미정).
**얼굴 REF 수집(2026-06-29)**: 각 에피소드 `_refs/<그룹슬러그>/<인물>.png`에 **그룹별 분리** 저장(한 폴더 금지). **18/18 전원 확보**(위키미디어 + 뉴스 og:image/본문 직접 추출: NCA·Krebs·NPR·아우룸·The Register·ComputerWeekly·businesspost). 발주서 REF 경로도 그룹별 PNG로 갱신됨. 약한 REF(저해상/듀오/캐주얼: 이정훈·블랭큰십·발라섹·구즈만)는 생성 후 개선 전제라 무방. **뉴스 이미지는 WebFetch가 못 뽑음 → 원본 HTML fetch + og:image/본문 정규식 추출 + sharp PNG 방식이 정답**(WIRED·namu는 차단, 한국인은 한국 뉴스 og:image로).
**남은 단계(승인/유료/명시 필요)**: ① 이미지 생성(발주서대로, 유료) ③ 대사 작성(person-quote-mining)+음성 합성(ElevenLabs 유저 전담) ④ 렌더 ⑤ 유튜브.

- **1편 「얼굴 있는 자들」**(인물형, 개인의 시대 1971~2000): 기원-프리킹/첫웜(워즈&잡스 블루박스·드레이퍼·더멘토·모리스) + 개인 무법자 전설(폴슨·미트닉·ILOVEYOU·마피아보이). 미화부담 최저 → **1편부터 제작**.
- **2편 「가면 쓴 자들」**(팀형, 집단·저항 1996~2023): 해커티비스트(cDc·어나니머스·LulzSec·피니어스피셔) + 사이버크라임(이블코프·LockBit·다크사이드·스캐터드, **현상수배 도감 톤**).
- **3편 「국가의 군단」**(팀형, 사이버전 2010~현재): 미·이스라엘(스턱스넷·Equation·8200) / 중(61398) / 러(팬시베어·샌드웜) / 북(라자루스, 클라이맥스). 정치 균형 톤, 후순위.
- **종장 「다시, 얼굴」**(인물형, 현재 수호자): geohot·밀러&발라섹·이정훈·허친스. 원래 1편에 있던 보안 수호자를 가장 현대라 역사 끝으로 이동(얼굴→가면→군단→다시 얼굴). 3편 코다 또는 독립 4편.

핵심: 09-디지털저항군(=이념·프라이버시 철학)과 **인물 중복 0건**. 본 시리즈는 실제 침투·익스플로잇·사이버전. 한국 hook=이정훈·평창마비(샌드웜)·삼성유출(Lapsus$)·라자루스·OpNorthKorea.

조사 원자료(후보 161건)·3안 비교·톤정책 전문은 `docs/project/remotion/faction-hackers-plan.md`. AGENTS.md 영상표·faction-ideas.md에서 연결됨. 기획 방법론은 스킬 [[faction-series-concept]], 제작은 `faction.md`.
```

## project_faction_iliad_dialogue_rewrite

```markdown
---
name: project_faction_iliad_dialogue_rewrite
description: 팩션 일리아스편 27인 대사 전면 재작문(GPT 발주 방식). 그룹샷 시점무관 보편 선언+함의 정면승부
metadata: 
  node_type: memory
  type: project
  originSessionId: b969c62b-f231-4dcf-ac7f-2614f28ea6b2
---

팩션 「호메로스-일리아스」(sw/remotion/public/factions/Homer-Iliad/faction-data.json, 27명 quote) 대사를 전면 재작문(2026-07-16 착수). 기존 지피티 대사가 "이미 일리아스 아는 사람 전제"라 파편적이었음.

**확정 기준(그룹샷 대사)**:
1. 시점 무관 — 특정 사건 회고 금지. 인물이 그룹샷에 모여 선 시점이라 친구 죽음·미래 사건 가정하면 시간축 어긋남. 늘 지닌 본질·철학만.
2. 함의 정면승부 — 삶 요약 해설 아님. 인물이 인간에게 던지는 하나의 근본 물음/신념을 1인칭으로. [[feedback_faction_quote_philosophy_over_situation]]
3. 처음 듣는 사람도 이해 — 곁가지 고유명사(측근·부하·지명) 나열 제거, 핵심만 짧은 설명 붙여.
4. 압축(200~320자), em dash 금지, 번역투·설교·다큐 마무리 금지.

**작업 방식(유저 지시)**: AI 생성물은 50점, 유저가 최종 손봄. "난해하거나 틀린 것만" 개선 대상. → codex-gpt(gpt-5.6-sol, reasoning high)로 발주. 기존 개똥값은 GPT에 보여주지 말 것(편향), 상황·함의만 잘 설명해 새로 짜게. 방향 잡힌 것만 참고 초안 첨부 가능(헤라 사례). 인물별 함의는 _docs/quotes/README.md "독백의 중심" 표 + epithet 활용.

**codex 실행 함정**: 스크래치패드는 git repo 밖이라 `--skip-git-repo-check` 필수(없으면 exit1 "Not inside a trusted directory"). reasoning은 `-c model_reasoning_effort=high`. 배치 러너 il-batch.mjs(스크래치패드)에 24인 데이터+동시3+재실행안전 구현.

**후속**: KO만 재작문(en·음성 별도, [[feedback_no_en_touch]]). 확정 후 quoteChunks 재분할 함께 반영([[feedback_faction_quotechunks_claude_splits]]). 음성 재생성은 유저 전담([[feedback_voice_elevenlabs_user_exclusive]]).
```

## project_gods_greek_faction

```markdown
---
name: project_gods_greek_faction
description: "올림포스 신 독립 팩션 Gods-Greek 신설(26.07.18). 일리아스·오디세이아서 신 제거·이관, 관할 6그룹 13신"
metadata: 
  node_type: memory
  type: project
  originSessionId: d1a0f401-e7aa-45d1-8c4c-6912404bfcd6
  modified: 2026-07-18T12:51:14.852Z
---

지시서(`factions/Gods-Greek/_docs/restructure-directive-2026-07-18.md`)로 신을 작품에서 분리했다. **전략 전환**: `mythology-plan.md`의 옛 "신 복사 허용"을 폐기하고 "신 독립 팩션 `Gods-<지역>`"(그리스=Gods-Greek, 향후 Gods-Norse·Gods-Egypt)으로. 이유=중복등재(아테나·포세이돈·제우스·헤르메스가 일리아스+오디세이아 양쪽에 있었음)+신 핵심대사는 관할 1편뿐(작품마다 복사하면 개입일화만 남음).

구성=1세력(올림포스) 6관할 클러스터 13신: 주권(제우스·헤라)/영역(포세이돈·하데스·데메테르)/전쟁(아테나·아레스)/질서(아폴론·아르테미스)/욕망(아프로디테·디오뉘소스)/기술과전달(헤파이스토스·헤르메스). `person.domain` 필드로 소속 명시(제우스 재배치 대비, 화면 clusters와 별개). 신규 5신(하데스·데메테르·아르테미스·디오뉘소스·헤파이스토스)=직함 골격만.

**미완(후속 창작·유료)**: ①기존 8신 대사=일리아스 개입일화 임시잔존 → 관할원리로 전량 재작성(원칙은 Gods-Greek/_docs/concept.md, fiction-profiles.ko.json 원천 보존). ②음성 zeus·hermes만 합성, 나머지 미합성. ③그룹샷=진영기준이라 폐기(`_archive/old-alliance-groupshots/` 보관), 관할 6그룹 기준 신규 발주. 신규 5신 개인샷 발주 대기. 소실: 일리아스 `03-gods/00-발주서.md`(옛 진영 발주서, 복사 누락). [[reference_faction_folder_gitignored]]
```

## project_sns_expansion_arc

```markdown
---
name: project_sns_expansion_arc
description: "SNS 멀티채널 확장 작전 [세력확장]. 라이브 보드 문서·플랫폼 우선순위·핵심 레버"
metadata: 
  node_type: memory
  type: project
  originSessionId: fa5ef4f4-9224-4f95-89a1-7ad2bb5fc595
---

feelandnote(유명인이 읽은 책·콘텐츠 큐레이션)를 여러 SNS로 확장하는 작전. 작전명 **[세력확장]**.

**라이브 보드: `docs/project/sns-expansion.md`** — 유저와 Claude가 이어서 논의·갱신. 트리거 키워드 `[세력확장]` 나오면 이 문서를 먼저 읽고 이어간다. 결정은 문서 §8 결정 로그에 누적. AGENTS.md 인프라·운영 표에도 등록됨.

**핵심 결론(2026-06-30 검수 후):**
- 핵심 레버 = **카드 생성기**. 기존 책·인물 데이터로 정지 이미지 카드(카드뉴스)를 비율(1:1·4:5·9:16·16:9)만 바꿔 자동 생성. 한 코드로 인스타·쓰레드·틱톡·네이버 동시 공략. 영상이냐 카드냐 양자택일 아님 = 같은 데이터에서 둘 다 파생. 실현성 가능·난이도 중(정지 렌더는 이미 썸네일에서 가동 중, 신규 350~500줄).
- 플랫폼 우선순위: 유튜브 쇼츠(이미 자동화 보유, 제작비 0)·인스타·네이버블로그·쓰레드 = 높음. 틱톡 = 조건부(영어권 우선). **페이스북·카카오스토리 = 비추**(한국 사용자 급감). **X(트위터) = 비대칭**: 텍스트·카드 레인 high(영어권 셀럽 독서가 토착 장르), 영상 레인 low(세로 쇼츠 잘림·롱폼 부적합). 외부링크는 첫 답글에.
- **무기는 명언이 아니라 「맥락」**: 서재 탐방=감상 배경(인물이 그 책을 왜/어떻게 읽었나), 세력도감=진영 도감. 명언 자체는 차별점 없어 미끼로만. 두 번째 레버 = **감상 배경 스토리화**(명언 추출 아님).
- **원칙: 나누지 말고 겹쳐 넣는다.** 콘텐츠(서재탐방·세력도감)·형식(영상·카드·텍스트·스레드·긴글)을 채널별로 칸막이 안 하고 한 소재를 여러 채널·형식에 중복 투입. 칸막이 치면 다채널 재활용 장점이 죽는다.
- **공유 버튼 구현 완료(2026-06-30)**: 셀럽·책 페이지 X·페이스북·링크복사(의존성0, ShareButtons 컴포넌트), 카카오는 앱키 후. 방문자 0명이라 당장 급하지 않음(유입 뒤 의미, "1순위 구멍" 과장). 수익화(제휴·광고) 비활성, 검색 노출은 착수 전 재확인.
- **카드 컴포넌트 둘 다 구현됨(양산만 남음)**: 팩션 FactionCard 5종 + 북리커맨드 BookCard 5종, 1:1·4:5·9:16 등록. 남은 공통작업 = 정지이미지 양산(렌더 출력 연결 + 전권 배치). 이게 카드 콘텐츠 뽑는 다음 작업. [[reference_bookcard_cardnews]]
- **영상**: 유튜브 **이미 공개 운영 중**(앞서 "비공개 48개"는 내 오류). 새 에피소드 재렌더 필요, 솔로는 음성 미생성으로 막힘.
- **채널 통일감 = "같은 뼈대, 다른 살"**: 북(인물 서사)·팩(인물 도감) 한 계정 공존. 통일=브랜드 마크·워터마크·메인색·폰트·카드 첫장/끝장 틀·인물사진 처리. 자유=중간 구성·악센트색. 묶기=상위 "인물" 전면, 표지 시리즈 표식, (선택)팩션 인물→서재 교차. 카드는 다른 쪽 작업 중(10장 카드뉴스 북·팩 각각).
- **운영 토대 3대(비판 후 보강, HTML §9)**: ①**영상 생산 캐파**=제1 제약(월 몇 편 가능한지 먼저 정하고 채널 수를 거기 맞춤, 넘으면 빈 깡통) ②**측정·중단선**(채널별 지표+4주 점검+접는 선, 숫자로) ③**전환 목표**(SNS→사이트→가입·서재저장 한 가지, 수익은 그 위에). + 유튜브 쇼츠 vs 일반영상 초기 형식 테스트, 카드 대량배포 저작권·노출 점검.
- 자산: 서재 탐방 162권·세로 쇼츠 약 120개가 주력. 세력도는 1편만 완성.
- **콘텐츠 정체성**: 서재 탐방 쇼츠 = **인물 서사 시네마틱 미니 다큐**(세로 ~3분, 음악, 인물 중심·책은 열쇠). 빠른 책추천 쇼츠 아님. 이 영상이 마스터(원본), 카드·글은 여기서 파생. 롱폼 = **책 1권당 솔로**(인물 통합본 폐기, 머스크만 1시간 1편 예외).
- **영문 준비도(검수+현장 정정)**: 사이트 영문 이미 라이브(약 95%, next-intl /en/). **텍스트·카드 영문화는 번역만 하면 쉬움**(14명 완성·10명 미작성). **그러나 영상 영문화는 부담 큼**: 셀럽 보이스(ElevenLabs) 언어별 재작업+시네마틱 톤 재현 필요, 자동 불가. (앞서 "영상 영문화 새 코드 0줄·완성 14명 영어 영상 바로"는 철회.)
- **채널 구조: 언어(한·영)로만 분리, 콘텐츠는 통합.** 북리커맨드+팩션을 **"책과 인물" 한 컨셉**으로 같은 계정에서 자유롭게. 콘텐츠별 채널 분리는 운영 4배(한영×북팩)라 안 함. 통합 운영 시 "인물" 공통축을 채널 정체성 전면에. 모든 플랫폼에 적용.
- **언어 전략: 영어권=텍스트·카드 위주, 영상=한국어 유튜브 중심.** X=영어 우선 텍스트·카드, 쓰레드=한국어 우선, 네이버=한국어 전용, 인스타=한국어 영상+한·영 카드. **틱톡 영상 접음**(시네마틱 3분 도달 안 남), 사진 카드만 실험. 사업계획서 HTML(`docs/project/sns-expansion-plan.html`)에 언어 칸·진행 매트릭스 있음.

**Why:** 유저가 메타 SNS를 모르는 상태에서 시장 확대를 시작. 12종 서브에이전트 병렬 검수로 자산×플랫폼 교차 전략 도출.
**How to apply:** `[세력확장]` 작업 시 보드 문서 먼저 읽기. 플랫폼 판단 바뀌면 §4만 외과 수정. 렌더는 명시 요청 시만([[feedback_no_unrequested_render]]).
```

## reference_bookcard_cardnews

```markdown
---
name: reference_bookcard_cardnews
description: 북리커맨드 SNS 카드뉴스 — remotion BookCard 7종 + remotion-bo Cards 탭 미리보기·편성. 구조·위치
metadata: 
  node_type: memory
  type: reference
  originSessionId: 61ea6e2a-0eee-4ff5-abf6-ad1e84b40c10
---

북리커맨드(서재 탐방) 인물–책 SNS 카드뉴스. SSoT: `docs/project/card-news/IMPLEMENTATION.md`.

- **렌더러**: `sw/remotion/src/compositions/BookCard/BookCard.tsx` — 카드 7종(intro·shelf·cover·context·quote·number·cta). 대출카드(librarycard)는 폐기. 자매 `FactionCard/`. utils 의존 끊고 자체 `resolveSrc(src, assetBase)`(remotion 렌더=staticFile, 외부앱=assetBase). `josa` export. intro 소개 한 줄은 featuredQuote 우선(philosophy 첫 문장은 "안녕하십니까" 같은 독백 인사라 후순위).
- **미리보기**: remotion-bo Cards 탭 `/book-recommend/<인물>/cards`. @remotion/player 로 BookCard 띄움(remotion-bo엔 원래 영상 미리보기 없어 엔진 추가, `transpilePackages:['@feelandnote/remotion']`, deep import `@feelandnote/remotion/src/...`). 로컬 표지는 `/api/rm-asset/[...path]`(remotion public 서빙, 한글폴더 디코딩). 기능: A/B 토글·책 선별·비율(4:5·1:1·9:16)·편성 저장.
- **편성 A·B**: A「읽은 책 N권」=후크→intro→대표5권 cover→cta(캐러셀 8장). B「한 권 깊게」=cover→context 문단별→cta. 짧은 책=A, 깊은 책=B.
- **편성 저장**: `public/episodes/<인물>/cards.json` `{version,selected}`. API `/api/<series>/cards/<name>`(server-utils findEpisodeDir). 영상 데이터와 분리.
- **출고**: `pnpm render:cards`(scripts/render/render-cards.ts) → `out/cards/<인물>/<비율>/NN-종류.png`. SNS는 수동 업로드(인스타·쓰레드 자동 불가).

관련: [[project_sns_expansion_arc]] [[reference_bookrecommend_longform_legacy]]
```

## reference_bookrecommend_longform_legacy

```markdown
---
name: reference_bookrecommend_longform_legacy
description: BookRecommend 롱폼(-L-VID) 현역은 legacy/* 컴포넌트. BookRecommendLong+sections/BookCardVisual은 미사용 테스트(_not-using 격리). 이미지 앵커·자막 타이밍 디버깅은 반드시 legacy 파일을 봐라
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4bb05033-c0f8-4bae-b6e2-6cb3025f5638
---

sw/remotion BookRecommend 롱폼 컴포넌트는 이름이 거꾸로 붙어 있다. 디버깅 전 반드시 확인:

- **현역(실제 -L-VID 렌더)**: `legacy/BookRecommendLongLegacy.tsx`(Root.tsx가 `BookRecommendLegacy`로 import) + `legacy/BookCardVisualLegacy.tsx` + `legacy/CinematicPanelLegacy.tsx` + `legacy/PortraitSubtitles.tsx`.
- **미사용 테스트(실험)**: `BookRecommendLong.tsx` + `sections/BookCardVisual/{BookCardVisual,CinematicPanel,index}` + `sections/{GuideVoice,LongSubtitles}` + `caption-format.tsx`. entry(Root.tsx)에서 도달 불가. 2026-06-29에 `compositions/BookRecommend/_not-using/`로 격리하고 tsconfig exclude 처리함.

**함정**: 이미지 앵커 매칭·자막 점등이 화면에서 이상하면 `sections/BookCardVisual`(신/테스트)을 고쳐도 소용없다. 반드시 `legacy/BookCardVisualLegacy.tsx`의 `resolveImageTransitions`를 봐라. 한 번 이 헛다리로 크게 돌았다.

**고친 버그(참고)**: 다토막(summaryParts/contextMainParts) 책에서 legacy가 토막별 음성 타이밍을 `mergePartTimings`로 병합해 놓고도 이미지 매칭(`resolveImageTransitions`)에 안 넘겨, 첫 토막 음성만 잡히고 둘째 토막부터 이미지가 전부 스킵되던 버그가 있었다. 병합 타이밍을 summary/context 키에 덮어써 넘기도록 수정함.

dead 코드 판별은 `Root.tsx`부터 import 그래프 BFS로 reachable 계산이 정확하다(export만 되고 composition으로 미사용인 경우를 잡으려면 index.ts의 re-export도 끊고 재계산). 관련 작업: [[feedback_no_restart_dev_server]]
```

## reference_celeb_bulk_register_workaround

```markdown
---
name: reference_celeb_bulk_register_workaround
description: Supabase MCP 인증 끊길 때 셀럽 대량 등록 우회 통로 — Auth Admin API 계정생성 + curl.exe --data-binary(한글). 컬럼 함정 3종
metadata: 
  node_type: memory
  type: reference
  originSessionId: 160873fe-1306-45eb-9f6e-5a4125c36421
---

Supabase MCP(mcp__supabase__*)가 "Unauthorized. SUPABASE_ACCESS_TOKEN" 에러로 못 쓸 때 셀럽을 REST로 직접 등록하는 통로. 서비스 키는 `sw/remotion-bo/.env`의 `SUPABASE_SERVICE_ROLE_KEY`. 프로젝트 ref wouqtpvfctednlffross.

**계정 생성**: `POST /auth/v1/admin/users {email, email_confirm:true}` → id 확보 → `PUT /auth/v1/admin/users/{id} {email:"celeb_{id}@feelandnote.local"}`. 트리거가 profiles 행을 profile_type=USER로 자동 생성하니 PATCH로 CELEB 전환. **profiles.email에도 임시 email이 잔존**하므로 PATCH 본문에 `email: celeb_{id}@feelandnote.local` 포함해 정정.

**한글 저장은 curl.exe + --data-binary @파일 필수.** PowerShell Invoke-RestMethod와 node fetch(POST+body)는 한글 이중 인코딩·DNS 오류로 DB 파손. body를 UTF-8 파일로 쓰고 curl로 전송. GET(읽기)은 Invoke-RestMethod 무방.

**컬럼 함정**: (1) profiles에 `quotes` 컬럼 없음 — 명언은 celeb_dialogues.lines.quote에. (2) 감상여정 저장 칸은 `consumption_philosophy`(cultural_journey는 generated). (3) celeb_influence는 평면 컬럼(political·political_exp·..._exp_en·transhistoricity, total_score는 트리거 자동). (4) celeb_dialogues 실제 컬럼은 celeb_id·lines·lines_en 3개뿐. (5) slug는 nickname_en 기반 generated — 악센트 넣으면 slug에 박히니 ASCII로.

파일럿 검증 완료 헬퍼: create-celeb.mjs(계정+profiles+중복스킵). 등록 방침은 [[project_faction_celeb_sync]] 참조.
```

## reference_celeb_dialogue_data_defects

```markdown
---
name: reference_celeb_dialogue_data_defects
description: "celeb_dialogues 대사 데이터 3대 결함(옛 answer 키가 roll_call 자리 점유, 원문 무관 오염 대사, 동명이인 혼입)과 2026-07-16 세션2 전량 교정 이력"
metadata: 
  node_type: memory
  type: reference
  originSessionId: c5b6beb0-dad9-45ea-bc0f-506ca02eea87
---

celeb_dialogues.lines_en 대사 데이터 전수 감사(2026-07-16 세션2, 영문 대사 미번역 746명 처리 중)에서 드러난 결함 유형. 대사·명언 작업 시 이 함정들을 의심하라.

1. **옛 키 `answer`가 스키마 표준 `roll_call` 자리를 차지** — 최다·최흔(세션2에서 91명 정리). ko/en 상황키 대사 개수를 대조하면 roll_call이 비어 보여 "부분 미번역"으로 오인된다. 표준 상황키는 `roll_call`(SSoT: `sw/web/src/lib/game/voice/types.ts`)이고 `answer`는 옛 잔재다. answer 내용은 대개 원문과 무관한 범용 문구. **정리법**: roll_call이 이미 채워졌으면 answer 단순 제거(`lines_en = lines_en - 'answer'`), roll_call이 비었으면 원문(ko) 기준 재번역해 roll_call 채우고 answer 제거. ko `lines`에도 answer 2행 있었음(장 드 묑·가의) → `(lines - 'answer') || jsonb_build_object('roll_call', lines->'answer')`로 rename.

2. **원문 무관 오염 대사** — 일부 인물 lines_en에 한국어 원문과 무관한 창작 전투 대사나 딴 인물 내용이 박혀 있었다(예: 사토시 나카모토=불교 수행자풍). 한국어 원문이 빈 문자열인 상황키는 영문도 같은 개수의 빈 문자열로 정정(창작 금지). ko가 21개 완비면 en도 21개 완비가 목표.

3. **동명이인 혼입(프로필 통째 뒤섞임)** — 조 샐다나(bio·대사는 배우인데 nickname_en이 `Joe Tsai`로 오염), 칼 어번(nickname_en·ko대사는 배우 Karl Urban인데 bio·en대사가 가수 Keith Urban), 톰 브라운(bio·이름·주소·en은 AI Tom Brown인데 ko대사만 패션 Thom Browne). 정본은 **증거 다수결**로 판단하되 방향 모호하면 유저 확인.

**기술 함정**: `profiles.slug`는 nickname_en 기반 **generated column**이라 직접 UPDATE 불가(이름 고치면 자동 반영, [[reference_slug_diacritics_ascii]]). `profiles`에 updated_at 컬럼 없음(celeb_dialogues에는 있음). 감정 태그는 전 인물 영문 표준(`[bold, direct]`).

**세션2 최종 무결(실측)**: 영문 대사 미번역 0, `answer` 잔재 영·한 모두 0, ko↔en 대사 배열 길이 불일치 0, 명언 한·영 1,411쌍 완전 일치(한쪽만 0, 역전 해소), ko 21개 완비 인물의 en 완비 1,547명. 명언 정본은 `lines.quote`/`lines_en.quote`([[feedback_search_native_language]] 원어 검색 필수).
```

## reference_celeb_tier_listing_filter

```markdown
---
name: reference_celeb_tier_listing_filter
description: "셀럽 목록 노출은 status가 아닌 celeb_tier 기준(2026-07-16). SSoT=shared/constants/celeb-tiers, RPC는 p_celeb_tiers text[]"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 65522cf0-fae5-4140-9942-4f019b2d29f7
---

셀럽 목록 노출 기준을 `status` 게이트에서 **등급(celeb_tier) 필터**로 전환했다(2026-07-16). fiction 48 + relation 5 = 53명 status='active' 전환 완료 — **상세는 열리고 목록엔 안 뜬다.**

**SSoT**: `packages/shared/src/constants/celeb-tiers.ts` — `CelebTier`·`LISTING_DEFAULT_TIERS`(full·light)·`INDEXABLE_TIERS`(full)·`parseCelebTiers`. 등급 타입 정의는 여기 하나뿐(getUserProfile·types/home은 여기서 가져다 쓴다).

**RPC**: `get_celebs_sorted`/`count_celebs_filtered`의 인자가 `p_celeb_tier text` → **`p_celeb_tiers text[]`**. NULL=제한 없음이라 **인자를 안 주면 신화·관계가 샌다** — getCelebs가 기본값을 넣어 막는다. web-bo는 의도적으로 null(전체 노출).

**필터 UI**: `/explore/figures?tier=` — `fiction`·`relation`·`all`·쉼표 복수(`fiction,light`) 지원. 미지정이면 기본 등급.

**함정 (실측으로 확인한 것)**
- **DB 함수 시그니처 변경 = 배포 시차 사고.** 옛 이름을 지우면 배포 전 코드가 함수를 못 찾는데, `getCelebs`는 rpc error를 검사하지 않아 **조용히 빈 목록**이 되고 그게 unstable_cache(1시간)에 박힌다. 복구는 `/api/revalidate`(tag=celebs, CRON_SECRET). 시그니처 바꿀 땐 구 시그니처 shim을 함께 두고 배포 후 DROP.
- **로컬 `pnpm build`는 워킹트리를 쓴다.** 미커밋 신규 파일을 참조하는 파일만 커밋하면 로컬은 통과하고 **Vercel만 실패**한다. 커밋 상태 검증은 `git worktree add /tmp/x HEAD` → install → build.
- **`export type { X }`는 'use server' 파일에서 빌드 실패**(번들러가 런타임 export로 봄). `export type X = Shared` 별칭 선언으로 둘 것. tsc는 통과하므로 빌드까지 돌려야 잡힌다.
- `get_top_celebs_across_eras`·`get_celeb_feed_type_counts`·타입별 수치는 **손댈 필요 없다** — user_contents 기반이라 콘텐츠 0건인 fiction·relation은 구조상 못 낀다.

관련: [[project_faction_celeb_sync]] [[reference_faction_image_to_celeb_avatar]] [[feedback_no_silent_fallback]]
```

## reference_codex_cli_image_gen

```markdown
---
name: reference_codex_cli_image_gen
description: codex CLI로 이미지 실제 생성(내장 image_gen). exec가 파일저장 전 종료돼도 세션 로그 base64에서 회수
metadata: 
  node_type: memory
  type: reference
  originSessionId: 2919a466-fe02-42b8-9c83-cd4be014b3d0
  modified: 2026-07-18T13:56:10.700Z
---

codex CLI가 실제 이미지를 생성한다(faction-image 스킬의 "Codex 내장 이미지 생성"이 이것). GPT 텍스트 재작성뿐 아니라 나노바나나 대체 이미지 생성기로 쓸 수 있다. [[reference_faction_image_to_celeb_avatar]] 계열 이미지 작업에 활용.

**호출**: `codex exec - -m gpt-5.6-sol --skip-git-repo-check -s workspace-write --dangerously-bypass-approvals-and-sandbox -i <입력이미지> [-i <REF>] --output-last-message OUT.txt --color never < 프롬프트.txt`
- `-i`로 입력 이미지 여러 장(소스 크롭/기존샷 + 얼굴 REF). 프롬프트는 stdin.
- codex가 내장 `image_gen` 도구로 생성 → python 셀에서 base64로 받음.

**함정 — 파일이 안 떨어진다**: exec가 `image_gen` 결과 base64를 받은 뒤 python으로 파일 저장하기 전에 세션이 종료되는 일이 잦다(sandbox에서 저장 실패 또는 조기 종료). output-last-message가 "성공적으로 작성"이라 해도 실제 지정 경로엔 파일이 없을 수 있다. **회수법**: 세션 로그 `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`에서 `data:image/png;base64,([A-Za-z0-9+/=]+)` 정규식으로 최장 base64를 뽑아 `base64.b64decode` 후 저장. 그게 생성 이미지다.

**세션 특정 주의**: 이 PC에서 다른 codex 작업이 동시에 돌면(사용자 배치 등) 세션이 뒤섞인다. mtime만으로 최신 세션 잡으면 남의 이미지를 회수한다(가족 그룹샷 오염 사례). 반드시 세션 텍스트에 그 작업 고유어(예: 'Penthesilea','Amazon warrior queen')+`data:image/png`가 함께 있는 세션으로 필터해 추출.

**품질**: 2컷 실측 — 기존 저해상(700KB)을 소스로 넣고 "단순 업스케일·복붙 금지, 표면 전부 새로 렌더" 프롬프트를 주면 2.3~2.4MB 고디테일 개인샷 산출(청동 갑옷 긁힘·모공·머리카락 가닥). 일리아스 파트로클로스/펜테실레이아 개인샷 재생성 성공(26.07.18). 유료 종량 아님(구독), rate limit만 있음 → [[reference_faction_transcribe_only_bug]] 아님, codex-gpt 스킬 참조.
```

## reference_faction_folder_gitignored

```markdown
---
name: reference_faction_folder_gitignored
description: sw/remotion/public/factions/ 전체가 gitignore(로컬 전용). 팩션 데이터·에셋·_episodes.json 다 git 밖이라 삭제 시 복구 불가
metadata: 
  node_type: memory
  type: reference
  originSessionId: d1a0f401-e7aa-45d1-8c4c-6912404bfcd6
  modified: 2026-07-18T12:51:04.411Z
---

`.gitignore:53`이 `sw/remotion/public/factions/`를 통째로 제외한다(episodes·voice·music과 동일 로컬 관리 정책). `faction-data.json`·wav·png·`_episodes.json`까지 전부 git 추적 0 = **로컬 전용**. `git ls-files`로 팩션 하위 파일 조회하면 0건, `git check-ignore`는 IGNORED 반환.

따라서 팩션 파일 rm/덮어쓰기는 **git으로 복구 불가**다 → 삭제·이동 전 반드시 백업 복사부터. [[feedback_file_safety]]의 팩션 구체판. "git 추적하니 복구 가능"이라는 가정을 팩션에는 적용하지 마라.

단 **소스코드(`sw/remotion/src/**`, `sw/remotion-bo/src/**`)는 정상 추적**된다 — 타입 정의(`Faction/types.ts`·`faction-types.ts`) 등은 커밋 대상.
```

## reference_faction_image_to_celeb_avatar

```markdown
---
name: reference_faction_image_to_celeb_avatar
description: faction 영상 인물 로컬 이미지를 셀럽 프로필 아바타로 넣는 방법(얼굴 자동 크롭+R2 업로드+DB갱신)
metadata: 
  node_type: memory
  type: reference
  originSessionId: 296147b2-68ac-47ef-abdd-0a2460cb2dc1
---

faction 인물은 DB(profiles)에 등록돼도 프로필 아바타(avatar_url)가 비어 스포트라이트 카드에 이미지가 안 뜨는 경우가 있다. faction 영상용 이미지(`sw/remotion/public/factions/<ep>/<vanity>/*.png`, 정사각 상반신/전신 실사)를 아바타로 재활용하면 된다.

**기존 스크립트 재사용**(코드 수정 불필요): `sw/web-bo/scripts/upload-celeb-image-from-wikimedia.ts` 의 `--image-file` 로컬 모드. sharp + @vladmandic/face-api로 **얼굴 자동 검출→얼굴 중심 정사각 크롭→800×800 webp→R2 `celebs/{profiles.id}/avatar.webp` PUT→profiles.avatar_url UPDATE**까지 자동. 필요 env는 `sw/web-bo/.env`의 R2_* 7키 + SUPABASE_SERVICE_ROLE_KEY(모두 존재).

실행(sw/web-bo에서):
```
npx tsx scripts/upload-celeb-image-from-wikimedia.ts --celeb-id <profiles.id UUID> --image-file "C:/abs/path.png" --slug <slug> --source-note "faction local"
```
celeb-id는 slug 아니라 profiles.id(UUID). 검출 score 0.8대여도 크롭 양호. 얼굴 자동크롭 싫으면 `--face-detect false --crop-gravity center`.

avatar_url 최종값은 상대경로 아닌 전체 URL: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev/celebs/{id}/avatar.webp?v={ts}`.

**주의**: 여러 명을 bash `while IFS= read`로 순회할 때 배치 tsv 마지막 줄에 개행이 없으면 마지막 1명이 스킵된다(개행 추가하거나 마지막 인물 개별 실행). getFeaturedTags는 unstable_cache(tags:['celebs'])라 갱신 후 새로고침/revalidate 필요.

**⚠️ `_refs/`는 절대 아바타로 쓰지 마라 (2026-07-16 실측)** — `_refs/<세력>/<인물>.png`는 "이 얼굴 골격으로 그려라"는 **재료**(현대인 스튜디오 사진)다. 페넬로페=분홍머리 현대 여성, 에우뤼클레이아(늙은 유모)=젊은 금발. 아바타는 **영상 개인샷**(`<ep>/<cluster>/<n>/<slug>.png`)만 쓴다.
**폴더 구조가 같아도 개인샷이 아닐 수 있다** — Homer-Odyssey는 개인샷 미생성이라 `01-ithaca/2/eurylochus.png` 등 4개가 전부 재료였다(오인해 등록했다가 롤백). **등록 전 이미지를 눈으로 전수 확인**할 것(표본만 보면 놓친다). 판별: 갑옷·신전·전장 배경=개인샷 / 현대 스튜디오 인물사진=재료.

**누끼(배경 제거) 파이프라인** — 유저 선호. 순서가 중요하다: **rembg 먼저 → upload 스크립트**(반대로 하면 목 단면을 배경으로 오인).
```
py -3.12 -c "from rembg import remove,new_session; from PIL import Image; \
  Image.open(SRC); ..."   # rembg 2.0.72 설치돼 있음, u2net, CPU로 1장 ~0.3s
npx tsx scripts/upload-celeb-image-from-wikimedia.ts --celeb-id <uuid> --slug <s> --image-file <누끼.png>
```
- `removeAlpha()`는 얼굴검출 텐서 변환에만 쓰이고 출력(extract→resize→webp)은 **알파 유지** → 투명 webp 그대로 나온다.
- 누끼 이미지에서도 face detection 정상(0.55~0.997). `--face-detect false` 불필요.
- CUDA dll 경고는 무시(CPU 폴백).
- `crop-faces.ts`는 **무릎까지 전신 크롭(4.5:7)**용이라 아바타와 무관. 얼굴 정사각 크롭은 upload 스크립트가 이미 한다(faceFrameRatio 0.45).

**Homer-Iliad 24명 누끼 아바타 완료**(2026-07-16). 남은 fiction 24명(odysseus·penelope·circe·telemachus·sirens 등)은 개인샷 자체가 없다.

관련: [[project_faction_celeb_sync]] [[reference_celeb_bulk_register_workaround]] [[feedback_remotion_img_for_still]]
```

## reference_faction_logo_dual_fields

```markdown
---
name: reference_faction_logo_dual_fields
description: 팩션 세력 로고 필드는 logoVid/logoImg/logoCrop 단일 정본으로 통일됨(2026-07-06). 옛 BO 필드 logo/titleArt 폐기
metadata: 
  node_type: memory
  type: reference
  originSessionId: b7eaba9f-19d1-4274-9119-f17bd90554a3
---

팩션 세력(group) 로고 필드 정본은 **`logoVid`(영상)·`logoImg`(이미지)·`logoCrop`(크롭) 하나**다. Studio 렌더러와 BO 편집기 모두 이 필드를 읽고 저장한다.

- Studio: GroupCard.tsx `primarySrc = group.logoVid ?? group.logoImg`, `group.logoCrop`. timing buildCues `logoVid||logoImg`로 타이틀 카드 유무.
- BO: FactionGroupEditor 드롭·표시·모달 전부 logoVid/logoImg/logoCrop. faction-types.ts(BO)도 이 이름. usedImages·shared/timing 동일.

**이전 결함(해소됨)**: 원래 BO만 `logo`(영상)·`titleArt`(이미지)·`titleArtCrop`이라는 딴 이름을 썼다. Studio는 logoVid/logoImg를 읽어, BO에서 로고를 바꾸면 한쪽만 갱신돼 계속 어긋났다(2026-07-05~06 무한로딩·BO 로고 끊김 반복). 2026-07-06 BO 6개 지점(faction-types·FactionEditor·FactionGroupEditor·shared/timing·usedImages)을 정본으로 개명하고 Digital-Resistance 데이터의 옛 필드 8개 제거해 통일. tsc 통과. **다시 logo/titleArt를 도입하지 말 것.**

**교훈 1 — 롱GOP 영상 무한로딩**: 팩션 영상(introImage·group.logoVid)에 편집 안 된 원본 mp4(키프레임 맨 앞 1개=롱GOP)를 쓰면 OffthreadVideo가 seek 못 해 Studio 프리뷰 무한로딩. 특히 introImage는 프레임0 점유라 재생 자체 불가. 해결: ffmpeg `-c:v libx264 -g 1 -keyint_min 1 -sc_threshold 0 -an`로 all-intra 재인코딩(전 프레임 키프레임). 원본은 `_backup-longgop/`에 보존. 한글 파일명은 Git Bash ffmpeg가 못 열어 PowerShell로 처리. 검증: `ffprobe -skip_frame nokey ... -read_intervals %+3` 키프레임 수 90 안팎이면 OK, 1이면 롱GOP.

**교훈 2 — 파일 존재는 PowerShell로 실측**: Bash `ls`는 Git Bash 경로 오탐 소지. `Get-ChildItem`으로 확인. 서브에이전트 "파일 없음" 판정 맹신 금지([[feedback_factcheck_subagent_trust]]). Digital-Resistance 로고 폴더는 `01a-declarers`(실존, `01-cypherpunks` 아님). 관련 [[feedback_open_named_target_first]].
```

## reference_faction_lv_thumbnail

```markdown
---
name: reference_faction_lv_thumbnail
description: 팩션 세로 롱폼(KO-LV) 유튜브 썸네일 자동 생성 시스템 — 컴포지션·공통 브랜딩·렌더 배선
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8029dfa8-65c8-4bf5-ae69-6715766e8fc1
---

팩션(세력도) 세로 롱폼 유튜브 썸네일은 영상 렌더 시 코드가 자동 출고한다(2026-07-09 구축).

- **채택 시안 = TH-SPLIT** (`sw/remotion/src/compositions/Thumbnail/FactionLVThumbCandidate.tsx`). 우측 대표 인물(58%) + 좌측 타이틀·설명(넓게), 위 세력도감 배지·아래 FEEL&NOTE. 대표 인물은 데이터 `lvThumbnailImage`(에피소드 상대경로, GEM에서 고른 값 공유), 없으면 첫 인물. 배경에 인물을 blur(14)로 한 겹 더 깔아 좌측 순검정 방지. 이미지 경로는 `Faction/utils`의 `imgSrc(episodeName, image)`로 풀어야 함(BookRecommend `safeImg`는 팩션 경로 못 품).
- **공통 브랜딩** = `ThumbBrand.tsx`(SeriesBadge 「세력도감」 상단중앙 + BrandFooter 「FEEL&NOTE」 하단). 배지 배경 불투명(rgba(12,10,8,0.96))·자간 0.16em.
- **예비 시안 GEM** = `FactionLVThumbnail.tsx`(컴포지션 id `-KO-LV-GEM`). 유저가 병행 테스트하는 것이라 건드리지 말 것.
- **컴포지션 등록**: Root.tsx Faction 폴더, id `${base}-KO-LV-TH-SPLIT`(base=`Faction-<폴더>`). durationInFrames 1, fps 1, 1080×1920.
- **자동 배선**: `sw/remotion-bo/.../api/[series]/render/route.ts` 팩션 분기가 롱폼 렌더(only!=='shorts') 시 `pnpm still -- <comp> out/Faction/{episode}-{suffix}-THUMB.png` 태스크를 건다. suffix=롱폼 variant(KO-LV, 편 있으면 KO-LV1·2). 유튜브 업로드(`youtube-faction.ts` variantFiles)가 `{episode}-{suffix}-THUMB.png` 존재 시 자동 setThumbnail — 이미 배선돼 있어 파일만 만들면 됨.
- `pnpm still`은 entry 인자 없이 comp-id만으로 렌더됨(remotion 자동 탐색). blur 필터가 무거워 한 장에 수 분 → blur 14로 낮춤. renderStill 이미지는 Remotion `Img` 필수([[feedback_remotion_img_for_still]]).
- 관련: [[reference_faction_logo_dual_fields]] · 팩션 문서 `docs/project/remotion/faction.md`
```

## reference_faction_transcribe_only_bug

```markdown
---
name: reference_faction_transcribe_only_bug
description: 팩션 음성sync 함정 — ①편(group.part) 나뉜 에피는 각 편 --part 따로(안 그러면 옛캐시 방치→자막 어긋남) ②align 편필터 코드버그(수정완료) ③--only 전사 지양
metadata: 
  node_type: memory
  type: reference
  originSessionId: 822e8c58-4cac-44aa-a161-e76ef67fd13d
---

팩션 음성 파이프라인(faction-voice-sync) 함정. 스킬 본문(.agents/skills/faction-voice-sync/SKILL.md)에도 반영됨.

**① 편(part) 나뉜 에피소드는 모든 편을 각각 (제일 흔한 원인)** — 세력에 `group.part` 가 있으면(예 Digital-Resistance = 1편 G1~G3, 2편 G4~G6) 전사·정렬을 편마다 각각(`--part 1`, `--part 2` …). `3-transcribe.py --faction --part N` 은 `faction_quote_targets` 가 `group.part!==N` 세력을 거른다. **`--part 1` 만 돌리고 2편을 잊으면 2편 인물(예 두로프 F06C01P02)은 전사가 아예 안 돼 편 나누기 전 옛 대사 캐시가 word-timings 에 남고, 자막이 옛 대사 기준으로 통째로 어긋난다.** 진단: `2-word-timings.json` 의 `targets[stem]` 단어 join 과 자막 `quoteChunks` join 을 글자로 대조 — 내용·순서가 다르면 엉뚱한 편에서 옛 캐시로 처리된 것. 유저가 "음성은 X로 들린다" 하면 신뢰하고 편·캐시부터([[feedback_tts_no_suspicion]]).

**② align 편필터 코드버그 (2026-07-08 수정)** — `buildCues`(timing.ts)의 part 필터는 `portrait &&` 조건이라 세로 렌더에서만 걸린다. `faction-align` 의 `buildVoiceJobs` 는 `buildCues(script, false, part)`(portrait=false)로 호출해 편 필터가 통과돼 p1·p2 **양쪽에 전 세력 인물이 섞였다**(옛/새 정렬 충돌). `scripts/voice/faction/data.ts` buildVoiceJobs 루프에 `if(part!=null && g.part!=null && g.part!==part) continue` 를 직접 추가해 고침.

**③ `3-transcribe.py --only` 지양** — `--only` + `--part` 가 그 편에 없는 인물이면 0매칭돼 그 인물 전사가 갱신되지 않는다(word-timings 를 비우진 않는다 — merged={**existing,**results} 라 기존 보존). 전사는 그 편 전체(`--only` 없이), 좁히는 건 `voice:faction-align -- --only` 로 align 에서만.

**정렬 정확도** — `computeSubTimings`(align-core.ts, Faction 전용)를 공백 단어 수 → **글자 수 누적**(`[^가-힣a-zA-Z0-9]` 제거)으로 개선(2026-07-08). WhisperX 한국어 분절이 공백 단어 수와 어긋나 경계가 밀리던 것 보정.

word-timings 구조 = `{episode,lang,model,engine,targets:{stem:[{word,start,end}...]}}`. 단어는 **targets 안**(최상위 아님 — 최상위만 보면 5키뿐이라 "비었다" 오판 주의). align 로그 "N개 기록·0개 건너뜀" 이 정상 실증. 관련 [[feedback_faction_voice_positional_rename]]
```

## reference_gemini_image_filename

```markdown
---
name: Gemini 이미지 생성기 파일명 규칙
description: Gemini 이미지 생성 시 파일명에 자동 타임스탬프가 붙으므로 ko.json이 실제 파일명을 따라야 한다
type: feedback
originSessionId: e0278dd6-ed02-488c-9ce8-1618d918da95
---
Gemini 이미지 생성기는 저장 시 파일명에 자동으로 `_{타임스탬프}` 접미사를 붙인다 (예: `pilgrim_city_of_destruction_1775632961746.png`). 작가가 계획 단계에서 작성한 하이픈 네이밍(예: `pilgrim-burden-city-of-destruction.jpg`)과 실제 파일명이 항상 어긋난다.

**Why:** 이 동작은 Gemini 이미지 API의 고정 사양이다. 파일을 하이픈 네이밍으로 리네임해도 다음 번 재생성 시 또 타임스탬프가 붙어 다시 어긋난다. 리네임 방향은 구조적으로 지속 불가능하다.

**How to apply:**
- 파일명 불일치가 발견되면 **ko.json의 `file` 필드를 실제 생성 파일명(언더스코어+타임스탬프+.png)에 맞춰 업데이트**하는 방향으로 복구한다. 파일 리네임 금지.
- `image_mapping.txt`·초안 JSON의 계획 네이밍은 참고용일 뿐이다. 실제 경로는 항상 `ls images/` 결과를 신뢰한다.
- 작가/초안 단계에서 `file` 필드는 "가상 계획 이름"이며, 이미지 생성 직후에 실제 파일명으로 일괄 치환하는 단계가 파이프라인에 필요하다.
- 확장자도 달라진다: 계획 `.jpg` → 실제 `.png`. 이 역시 JSON을 실제에 맞춘다.
```

## reference_grok_inherits_claude_hooks

```markdown
---
name: reference_grok_inherits_claude_hooks
description: 그록 빌드 CLI가 ~/.claude/settings.json 훅을 실시간 상속 실행하는 문제와 그록만 무음 처리하는 법
metadata: 
  node_type: memory
  type: reference
  originSessionId: 2036b64d-7b63-48ef-91bc-c00c4331a390
---

그록 빌드(Grok Build CLI, `~/.grok/`, 모델 grok-build)는 Claude Code 호환이라 `~/.claude/settings.json`의 hooks를 **실시간으로 읽어 자기 이벤트마다 실행**한다. 그래서 클로드용 완료 알람(PowerShell SystemSounds+MessageBox)이 그록 세션에서도 울렸다. 그록은 멀티에이전트라 `Notification` 이벤트가 잦아 한 작업에 열댓 번 발동했다.

**해결 3종(적용 완료):**
1. `~/.claude/settings.json` 알람 훅 이벤트를 `Notification` → `Stop`으로 변경 + `async:true`. Notification은 알림마다, Stop은 턴 종료 1회. 클로드·그록 둘 다 남발이 1회로 줄어듦.
2. 훅 명령 맨 앞에 가드 `if ($env:GROK_HOOK_EVENT) { exit };` 삽입. 그록은 훅 실행 시 자식 프로세스에 `GROK_HOOK_EVENT`를 넘기지만 클로드는 안 넘긴다. → **그록에선 즉시 종료(무음), 클로드에선 정상 알람.** 이게 핵심 방어선.
3. `~/.grok/config.toml`에 `[compat.claude] hooks = false` (보조). **주의: 이 config는 실제로 반영 안 됨** — `grok inspect`는 "hooks OFF (config)"로 표시하지만 `grok inspect --json`의 로드된 hooks에는 여전히 `source:{type:user, path:~/.claude}` command 훅이 살아있다. 그록 쪽 버그/불일치. config만 믿지 말 것. 실제 차단은 2번 env 가드로 한다.

**실측 확인(중요):** 그록은 훅 실행 시 자식 프로세스에 `GROK_HOOK_EVENT`(예 session_start/stop), `GROK_HOOK_NAME`, `GROK_SESSION_ID`, `GROK_WORKSPACE_ROOT`를 실제로 넘긴다 → 2번 가드는 원리상 옳다. **단, 그록은 세션을 열 때 훅을 1회만 읽고 세션 도중 재읽기 안 한다.** 그래서 훅을 고쳐도 "이미 켜둔 그록 창"은 옛 훅을 계속 문다 → **그록 세션을 완전히 닫고 새로 열어야 반영된다.** "아직도 뜬다"의 진범은 대부분 이 세션 미재시작.

**실측 방법:** `~/.grok/hooks/ztest.json`(포맷 `{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"..."}]}]}}`)에 env 덤프 스크립트(-File ps1) 걸고 `grok -p "ok"` 헤드리스 실행 → 덤프 확인. 끝나면 훅 파일 삭제(SessionStart마다 실행됨). 주의: 클로드 Bash로 grok을 부르면 그록 env에 CLAUDECODE·CLAUDE_CODE_SESSION_ID 등이 섞여 오염됨(그록이 클로드 자식이라). 실사용 터미널엔 없음.

**진단 도구:** `grok inspect --json`이 로드된 hooks의 event·target·source.path를 다 보여준다(사람용 `grok inspect`는 목록만). 그록 상주 프로세스는 `grok leader list`(보통 없음). 그록은 `~/.claude/settings.json`뿐 아니라 `~/.cursor/hooks.json`, `~/.grok/hooks/*.json`, 클로드 플러그인 hooks도 스캔한다.

관련: 슈퍼그록($30)만으로 grok-build 정상 동작(헤비 불필요). 구버전(0.2.32)은 로그인 인식 실패·free 티어 오표시 → `grok update`로 최신화하면 해결.
```

## reference_longform_part_settings

```markdown
---
name: reference_longform_part_settings
description: book-recommend 롱폼 본문 토막별 독립 설정(화자·음량·배속·효과음). legacy 렌더에 롱폼 오디오 물리 배속 누락 결함 있었음
metadata: 
  node_type: memory
  type: reference
  originSessionId: 6e0b0b2b-ae76-4aca-89e5-2437ab87ebd7
---

book-recommend 롱폼(요약·감상배경·후속맥락)을 여러 토막으로 나누면 각 토막이 화자·음량·배속·효과음을 독립 보유한다(2026-07 구현).

**데이터 규약:**
- 토막 1개(분할 안 함): 기존 단일 필드(`afterSpeaker`·`summaryGainDb` 등) 그대로. JSON·동작 불변.
- 토막 2개↑: 배열 필드 `*PartSpeakers`/`*PartGainDbs`/`*PartPlaybackRates`/`*PartSfxs` (after/summary/contextMain 12종). 읽기 폴백 = `배열?.[p] ?? 단일값`. 토막 인덱스 p = `bookFieldParts(본문, *Parts)` 순서 = 음성 파일명 part 인자(`vnBookAfter(i,pi,ap)` 등).

**수정 파일:** types.ts, BO 편집기(useLongformState 헬퍼 `updateBookPartSetting`/`updateAfterPartSetting`, BookSection·QuotePairRow footer 전 토막 노출), 렌더 legacy/BookRecommendLongLegacy.tsx, playback-rate.ts, longform-sfx.ts, 음성 jobs.ts.

**중요 결함(발견·전수정 완료 2026-07-03):** 현역 [[reference_bookrecommend_longform_legacy]] 렌더에는 롱폼 오디오에 물리적 `playbackRate`가 아예 빠져 있었다(`_not-using`엔 있음). applyPlaybackRates가 타임라인·자막시각만 1/r로 줄이고 오디오는 원속 재생 → 배속 지정 구간이 뒤에서 잘려나갔다("대사가 끝까지 안 나오고 끊긴다"). 요약·감상배경·후속맥락 세 구간은 먼저 배선됐고, **제목·인용(quote) 오디오도 2026-07-03 배선 완료**(BookRecommendLongLegacy.tsx 제목 Audio에 `clampRate(book.titlePlaybackRate)`, 인용 Audio에 `clampRate(book.quotePairs[pi].quotePlaybackRate)`). elon-musk 롱폼은 10권 전 인용에 quotePlaybackRate 1.01~1.35가 걸려 있어 전권 인용이 잘리던 상태였음. 배속 미설정이면 clampRate(undefined)=1이라 불변.
```

## reference_mcp_token_git_leak

```markdown
---
name: reference_mcp_token_git_leak
description: Supabase access token이 자꾸 죽는 원인=.mcp.json git 커밋 노출→자동 폐기. 해결·진단·DDL 우회
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4f03219d-40c3-41f4-b266-b8dd063e2e88
---

Supabase MCP·관리 API가 401 Unauthorized(SUPABASE_ACCESS_TOKEN 무효)로 막힐 때.

**근본원인(반복 이슈)**: 루트 `.mcp.json`이 git 추적 대상이고 그 안에 supabase `--access-token sbp_...`가 평문으로 박혀 커밋된다. 노출된 토큰은 Supabase가 자동 폐기 → "손대지 않았는데 토큰이 죽음"이 반복. 죽은 토큰이 `.env`와 `.mcp.json` **두 곳에 각각** 박혀 있어 MCP·앱 관리작업이 동시에 막힌다.

**해결**:
1. `.mcp.json`을 `.gitignore` 등록 + `git rm --cached .mcp.json`(로컬 파일은 남음). 이후 새 토큰 노출·폐기 없음.
2. 대시보드에서 살아있는 토큰 확인(Account>Access Tokens, never expires). 새 값을 `.env`와 `.mcp.json` **둘 다** 교체. MCP는 Claude 재시작해야 재로드.

**진단**: 토큰 유효성은 `GET https://api.supabase.com/v1/projects`. python urllib에 **User-Agent 헤더 필수**(없으면 Cloudflare error 1010 차단). 401이면 토큰 자체 무효 확정. token 값은 python으로 `.env` 파싱해 확인(git bash 인용 꼬임 회피).

**DDL 우회(MCP 죽어도)**: access token으로 `POST /v1/projects/{ref}/database/query` body `{"query": "<SQL>"}`, header Bearer+User-Agent. 성공 STATUS 201. 마이그레이션 SQL 파일을 이 방식으로 적용 가능. project_id=wouqtpvfctednlffross.

관련: [[reference_celeb_bulk_register_workaround]]
```

## reference_model_state_precheck

```markdown
---
name: reference_model_state_precheck
description: 작업 발주 전 모델 상태 점검 절차 — 추론 강도·컨텍스트·모델·한도 확인 명령과 실제 성능 레버
metadata: 
  node_type: memory
  type: reference
  originSessionId: dd6d105e-1b92-4710-abc7-571fde276d6b
  modified: 2026-07-20T02:13:52.415Z
---

유저는 일을 맡기기 전에 모델이 평소 성능을 낼 상태인지 파악하려 한다(26.07.20 명시 요구). 착수 전 점검 순서:

1. `/effort` — **실제 성능 레버.** low/medium/high/xhigh/max. 세션 기본값은 `~/.claude/settings.json`의 `effortLevel`, 환경변수 `CLAUDE_CODE_EFFORT_LEVEL`. 어려운 작업 전 high 이상 확인.
2. `/context` — 점유율. 항목별 토큰 분해. 대화가 찰수록 정확도·회상 저하(context rot).
3. `/status` · `/model` — 실제 구동 모델. fallback은 `--fallback-model`/`fallbackModel` 설정 시에만 발생하고 **발생 후에만 표시**된다(사전 예고 없음).
4. `/usage` — 한도 진행률. 초과 시 전 모델 차단.
5. `/fast` — 켜면 최대 2.5배 빠름, **품질은 동일**(모델 불변). Opus 전용. 성능 저하 원인 아님.

**자동 압축은 끌 수 없다.** 임계값만 조절: `CLAUDE_CODE_AUTO_COMPACT_WINDOW`(토큰), `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`(1~100%). 사실상 비활성화하려면 window를 매우 크게. 기본은 최대 컨텍스트 80%.

기타 진단: `/doctor`(설정 검증) · `/debug` · `claude --safe-mode`(CLAUDE.md·스킬·MCP 제외 최소 모드로 원인 격리).

서비스 장애 확인은 status.claude.com(구 status.anthropic.com에서 리다이렉트). 단 **품질 저하는 공지 항목에 없다** — 오류율만 공지된다.

⚠️ 체감 성능 저하의 원인은 대개 서비스가 아니라 effort 설정·컨텍스트 상태·근거 미확인 습관이다. [[feedback_verify_before_asserting]] 참조.
```

## reference_remotion_bo_webpack_build

```markdown
---
name: reference_remotion_bo_webpack_build
description: remotion-bo 프로덕션 빌드는 webpack(--webpack) 고정. turbopack은 out/ 한글파일 심볼릭 오인으로 깨짐
metadata: 
  node_type: memory
  type: reference
  originSessionId: 61ea6e2a-0eee-4ff5-abf6-ad1e84b40c10
---

`sw/remotion-bo` 의 프로덕션 빌드는 **webpack**으로 한다. package.json `"build": "next build --webpack"`.

이유: Next 16 기본 빌더 Turbopack이, youtube 관리 route들(`youtube/meta`·`status`·`status-all`·`sync`·`thumb`·`faction-card-export`)이 `path.join(process.cwd(),'..','remotion','out',...)` 로 렌더 산출물 `out/` 을 fs 스캔하는 것을 정적 분석 → `out/` 디렉토리를 번들 자산으로 추적하다, 한글명 파일 `out/Faction/02-페이팔마피아-KO-LV.srt` 를 심볼릭 링크로 오인(`points out of filesystem root`)해 빌드를 중단시킨다. 경로 상수를 핸들러 내부로 옮겨도(force-dynamic 추가해도) 일관되게 안 풀린다 → webpack 빌드가 이 turbopack 버그를 회피한다.

dev(`next dev` turbopack)는 lazy 컴파일이라 이 route 미호출 시 안 터진다 — dev는 그대로 두고 build만 webpack.

빌드는 .next 를 덮으므로 떠 있던 dev 서버는 한 번 재시작해야 한다. 관련: [[reference_bookcard_cardnews]] [[feedback_remotion_img_for_still]]
```

## reference_slug_diacritics_ascii

```markdown
---
name: reference_slug_diacritics_ascii
description: 셀럽 페이지 안 뜸 진단 — 404=slug 비ASCII, 500=대사 객체구조. slug 강세부호 ASCII 자동변환(2026-07-14)
metadata: 
  node_type: memory
  type: reference
  originSessionId: c58d7630-3830-4fa2-8e34-e3310fd0b3fa
---

**셀럽 페이지 안 뜸 두 원인**: ①404="페이지를 찾을 수 없습니다"=slug 비ASCII(이 글). ②500=celeb_dialogues.lines 원소가 문자열 아닌 객체 `{text,quote}` → DialogueSection `l.trim()`→`l.trim is not a function` SSR 500. 스키마 SSoT(celeb-speech.md)는 문자열배열 `"[emotion] 대사"`. 2026-07-14 18명 교정(마이그레이션 fix_dialogue_object_lines_to_string, 백업 celeb_dialogues_bak_20260714). 진단쿼리=jsonb_typeof(lines값->0)='object'. 교정해도 캐시(unstable_cache tags:'celebs' 7일) 탓 옛 500/404 지속 가능 → 프로덕션은 POST /api/revalidate {tag:celebs,secret:CRON_SECRET} 또는 재배포로 즉시 해소, dev는 서버 재시작.

---

셀럽 페이지가 "페이지를 찾을 수 없습니다"(404) 뜨면 slug의 비ASCII 문자부터 의심. `profiles.slug`는 `nickname_en` 기반 generated column인데, 옛 표현식이 강세부호를 안 떼서 `Camilo José Cela`→`camilo-josé-cela`(é 유지)로 URL에 비ASCII가 새어나가 404가 났다.

2026-07-14 마이그레이션 `slug_strip_diacritics`로 표현식에 `translate()` 문자대치를 넣어 ASCII 자동변환(José→jose, André→andre, Müller→muller, Shōwa→showa, Jokić→jokic 등 11명 일괄 교정). `translate`는 IMMUTABLE이라 generated column에 적합(unaccent extension은 STABLE이라 못 씀). 점(`.`)·어퍼스트로피(`'`)는 URL 정상동작이라 보존(dr.-dre, shaquille-o'neal은 안 건드림).

- **재발 조건**: 매핑쌍에 없는 희귀문자(ß, æ 등)가 새 인물에서 나오면 slug에 남아 404. `translate` from/to 쌍 추가로 대응. from/to 길이 반드시 일치.
- **dev 캐시 함정**: 조회 결과가 slug 키로 unstable_cache 7일 캐싱(STATIC_REVALIDATE=604800). 존재 안 하던 slug를 미리 curl로 찔러 404를 받으면 그 null이 캐싱돼 slug 교정 후에도 dev에서 계속 404. 프로덕션(새 URL)은 무관.
- 문서 SSoT: [[reference_celeb_bulk_register_workaround]] 및 docs/project/db-celeb.md `profiles.slug` 절.
```

## reference_spotlight_group_code_constant

```markdown
---
name: reference_spotlight_group_code_constant
description: 스포트라이트 태그 상위그룹 구조와 코드상수 방식(2026-07-05 개편)
metadata: 
  node_type: memory
  type: reference
  originSessionId: 296147b2-68ac-47ef-abdd-0a2460cb2dc1
---

/explore/spotlight 태그는 상위 그룹으로 계층화됨(2026-07-05). celeb_tags에 `parent_id` 컬럼을 두는 게 정석이나 **스키마 변경 권한(Supabase MCP·관리 sbp_ 토큰 모두 401)이 막혀** 그룹 소속을 코드 상수로 관리한다.

- **SSoT**: `sw/web/src/constants/spotlightGroups.ts` — `SPOTLIGHT_GROUPS`(그룹 slug + 자식 slug 표시순), 파생 맵(CHILD_TO_GROUP·GROUP_SLUGS·GROUP_CHILD_ORDER). 그룹 추가/이동은 이 파일만 고침(백오피스 관리 UI 없음).
- **그룹 헤더**: `celeb_tags`에 배정 인물 0인 일반 태그 행으로 존재(slug=그룹slug). 8개 그룹: ai/rulers-and-empires/heroes-of-turbulent-times/the-thinkers/revolutions-and-founding/art-movements/self-made-innovators/against-adversity + 맨해튼(manhattan-project)은 단독.
- **조회**: `getFeaturedTags`가 그룹 헤더를 `if(!assignments.length && !isGroup) continue` 예외로 포함시키고 각 태그에 `isGroup`/`parentSlug` 부착(평면 배열 유지).
- **UI**: `spotlightGrouping.ts`(topLevelTags/childTags/groupPreviewCelebs/groupCelebCount) + 섹션 헤더형 렌더(SpotlightIntroView/Drawer/Sheet). 최상위엔 그룹+무소속만, 자식은 펼쳐야 노출.
- 상세 계획·진행: `docs/project/spotlight-ai-group-refactor.md`. 인증 복구 시 parent_id 컬럼으로 이관 가능.

REST(service_role)로 DDL은 불가(RPC에 임의SQL 함수 없음, is_admin뿐). Management API는 SUPABASE_ACCESS_TOKEN이 있어도 `api.supabase.com` 전 엔드포인트 401. 데이터 CRUD는 REST로 가능.

관련: [[reference_faction_image_to_celeb_avatar]] [[reference_celeb_bulk_register_workaround]]
```

## reference_voice_api_key

```markdown
---
name: voice_api_key_start
description: Gemini TTS API 키 로테이션 — 마지막 성공 키 번호. 생성 시 --start-key로 사용
type: reference
originSessionId: c3c6356a-cd56-4cc5-ab17-f4a12e557c80
---
마지막 성공 키: **35** (2026-06-27 기준, 23 시작 → 23~34 모두 429 → 35 성공)
- **TTS 호출 시 반드시 `--start-key 35` 지정할 것.** 미지정 시 기본 1부터 시작하여 429 다회 충돌 후에야 도달 → 시간 낭비
- 키 할당량은 시간이 지나면 리셋(일반적으로 일일)되므로 며칠 지나면 낮은 번호부터 재사용 가능. 단 신뢰하지 말고 실제 429 발생 시 메모리 갱신.
- 이력: 17(2026-05-01) → 69(2026-05-09) → 23(2026-06-13) → 35(2026-06-27). 매 작업 시 실제 성공 키로 갱신.
```

## reference_voice_cps_match_skill

```markdown
---
name: reference_voice_cps_match_skill
description: 북리커맨드 음성 발화속도(자/초) 통일 스킬 remo-voice-cps-match. 배속 자동 산출
metadata: 
  node_type: memory
  type: reference
  originSessionId: fdcac6d1-e21b-49bf-9ffe-3e5fce374a47
---

북리커맨드 음성의 체감 발화속도(자/초)를 목표값으로 통일하는 스킬 = **remo-voice-cps-match** ("배속 맞춰줘", "발화속도 통일", "자초 맞춰").

- 스크립트: sw/remotion/scripts/voice/match-cps.ts (`pnpm voice:match-cps --episode <ep>`)
- 원리: 배속 r = 목표자초 ÷ (공백제외 글자수 ÷ wav실측길이). clampRate 0.5~2.0. 토막은 wav 전부 합산해 필드 평균을 맞춤.
- 저장: book.ko.json의 `*PlaybackRate` 필드(summary/contextMain/quote/after). remotion playback-rate.ts가 `<Audio playbackRate>`로 렌더 반영. 원본 wav·타이밍 불변.
- 기본 목표 **6.5자/초**, 제목(title) 기본 제외(--include-title로 포함), dry-run 기본·--apply로 저장.
- 자/초 표시는 BO ScenarioRow.tsx(공백제외 글자수 ÷ wav길이/배속). `×N` 표시 있으면 영상배속 적용중. 하단 ×2는 미리보기(localStorage)라 무관.
- 엔진은 voice-select.json slots[파일명] ?? default(gemini).
```

## reference_voice_r2_paths

```markdown
---
name: voice_r2_paths
description: R2 음성 파일 경로 — remotion 영상 음성은 로컬 전용 (R2 동기화 폐기됨)
type: reference
---

R2 음성 파일 경로:

- **web-bo 원본**: `celebs/{celebId}/voice/{locale}/{fileName}.mp3` — 명언(quote.mp3), 대사(g1.mp3 등). 이 경로는 여전히 유효.
- **remotion 영상 음성**: 로컬 `public/voice/{episode-name}/` 전용. R2 동기화 시스템(voice-r2.ts, r2-manifest.json)은 26.03.23에 폐기.

**Why:** R2는 일반 스토리지(셀럽 아바타 등)로만 사용. 영상 제작 음성 파일은 로컬에서 직접 관리하여 복잡도를 줄인다.

**How to apply:** remotion 음성 파이프라인(voice → whisper → analyze)만 사용. R2 업로드/다운로드 관련 명령은 없다.
```

## reference_whisperx_python

```markdown
---
name: reference_whisperx_python
description: voice:transcribe(whisperx)는 Bash tool 기본 python에 없음. py -3.12로 실행
metadata: 
  node_type: memory
  type: reference
  originSessionId: 2c0459ab-9ea0-414d-b34b-6c406772c3a8
---

음성 파이프라인 3단계 `voice:transcribe`(`scripts/voice/3-transcribe.py`)는 **whisperx 모듈**을 임포트한다.

- Bash tool의 기본 `python`은 Claude 에이전트 venv(`hermes-agent/venv`)를 가리키며 **whisperx가 없다** → `ModuleNotFoundError: No module named 'whisperx'`로 실패.
- whisperx는 **Python312**(`C:\Users\webco\AppData\Local\Programs\Python\Python312`, `py -3.12`)에만 설치돼 있다(torch·pyannote 스택 포함).
- **Bash tool에서 transcribe 실행 시 `py -3.12 scripts/voice/3-transcribe.py …`** 로 호출한다. `python scripts/...` 직접 호출 금지.
- whisperx CLI 단건 STT도 동일: Python312의 `whisperx` CLI 사용.

관련: [[reference_voice_api_key]] (TTS 키), 파이프라인 스킬 [[remo-voice-sync]].
```

