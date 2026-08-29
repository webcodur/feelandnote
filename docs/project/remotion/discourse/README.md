# 가상 담화(Discourse) — 독백·대담 시리즈

> **최종 실측 체크: 26.07.16** — 대조 범위: `sw/remotion/src/Root.tsx`(Discourse 폴더·컴포지션 ID) · `src/compositions/Discourse/`(types·timing·voice-names·sections 6종) · `public/discourses/`(`_episodes.json`·에피소드 3편) · `remotion-bo/src/lib/series-registry.ts`(discourse 등록) · `remotion-bo` discourse lib 3종·`components/discourse/` · `packages/shared/src/lib/`(youtube-discourse-meta **부재 확인**).

> 🔴 **통합 완료(26.07.26) — 편집·출간은 web-bo `/discourses` 하나다.**
> 텍스트·구성의 단일 원천은 DB `discourse_*` 3테이블이고, `discourse-data.json`·`cast.json`·`turns.json`
> 세 파일은 **렌더용 산출물**이다(직접 편집 금지 — 손 편집은 내보내기가 막는다).
> 영상 관리 대시보드(remotion-bo)의 담화 구역은 폐기됐다. 아래 본문의 「BO」 서술은 **폐기된 과거 상태**로 읽는다.
> 통합 설계·현황: [`unification.md`](unification.md)

**상태: 구현 1차 완료 (2026-07-16). 엔진·에피소드 5편 가동. 젠슨 황 독백의 1:1 이미지 10장 연결. 음성·렌더 CLI 미착수.**

| 층 | 상태 |
|----|------|
| 엔진 (`sw/remotion/src/compositions/Discourse/`) | ✅ types·timing·script·voice-names·constants·utils·Discourse.tsx·sections 7종·subs.ts |
| Studio 등록 | ✅ `Discourse-<ep>-KO-S{n}` / `KO-LV{n}` — 4개 컴포지션 실측 확인 |
| BO (`sw/remotion-bo`) | ✅ 시리즈 분기 데이터화(`isFactionSeries` 제거) · lib 3종 · 편집기(**원고 중심 전면 개편 26.07.21** — 원고/인물 탭·세부 패널·음원 자리 검증) |
| 에피소드 | ✅ `qin-shi-huang`(독백 1인·발언 10) · `musk-altman`(대담 2인·발언 14) · `jensen-huang`(독백 1인·발언 7) — 모두 `_status: todo`(미공개) |
| 이미지 | 🟡 젠슨 황 1:1 고유 컷 10장 생성·연결. 기존 2편은 미착수 |
| 음성 | ❌ 0개. TTS 파이프라인(`voice:discourse`) 미착수 |
| 렌더·유튜브 CLI | ❌ 미착수. BO 렌더 요청은 **501 명시 응답**(조용한 폴백 금지) |

**BO 미리보기 한계(의도적)**: `@remotion/player` 로 `Discourse` 를 직접 재생하지 못한다. 엔진 로더(`script.ts`)가 `require.context` 로 에피소드를 빌드 시점에 훑어 담아 BO 번들에 실리지 않는다. 그래서 **컷 흐름 도식**으로 간다(팩션 편집기와 동형). 단 팩션이 BO에 근사 산식을 복제해 둔 것과 달리 담화는 렌더의 `buildCues` 를 그대로 import 하므로 **미리보기와 렌더가 갈릴 여지가 없다**. 실제 화면은 Studio에서 본다. 실재생으로 바꾸려면 엔진에 로더 비의존 진입점 + `assetBase` 주입이 필요하다(팩션 `FactionCard` 선례).

인물이 자신의 사상을 1인칭으로 말하고, 다른 인물이 끼어들어 반박하며, 라이벌·친구·적과 정면으로 대담하는 **세로 영상** 시리즈. 팩션(세력도감)·북리커맨드(서재 탐방)에 이은 세 번째 시리즈다.

**한 사람의 독백과 여럿의 대담을 한 엔진이 함께 다룬다.** 몇 명이 나오는지, 서로 말을 섞는지는 **편마다 데이터로 정한다**. 순수 독백 1인편, 독백에 난입 반박이 붙는 편, 처음부터 3~4인이 주고받는 편이 모두 같은 구조 위에 놓인다.

대사의 원천은 인물의 **원전·실제 저작·발언**이다. 조사한 재료를 그대로 낭독하지 않고 다른 인물과 주고받는 대사로 재작성한다.

---

## 1. 컨셉

- 한 에피소드 = 한 논제 또는 한 인물의 사상. 그 자리에 인물 1~4명이 모인다.
- 상대는 **실존 관계**(생전의 라이벌·친구·적)를 기본으로 하되, **시대 초월 조합**도 특별편으로 낸다.
- 톤: 팩션의 저조도 시네마틱을 계승하되, 팩션이 「화보」라면 이쪽은 「대좌」다. 인물이 서로를 향해 말한다.

### 팩션과 무엇이 다른가 (별도 시리즈인 이유)

| | 팩션 | 가상 담화 |
|---|---|---|
| 뼈대 | **인물 명단** (세력 > 그룹 > 인물) | **발언 순서** (누가 → 누구에게 → 무엇을) |
| 인물 등장 | 1인 = 1컷 = 1대사, 다시 안 나옴 | 같은 인물이 말했다 반박당했다 되받는다 |
| 대사 관계 | 인물끼리 무관 (각자 자기 말) | 발언이 앞 발언을 **받는다** |
| 컷 길이 | 인물 컷 1.1초 고정 | 대사 음성 길이에 따라 가변 |
| 음원 이름 | 인물 자리 기반 `FxxCxxPxx` | 발언 순서 기반 (§5 미결) |
| 텍스트 출처 | 실제 발언 채굴(`quoteOrigin` verbatim) | 사상 재구성 (실제 발언 아님 → **고지 필수**) |

화면 연출·자막 글자 점등·음성 발화 시각 맞추기·**이미지 교체 방식**은 팩션에서 그대로 가져온다. **데이터 모델과 대본 작법만 새로 짠다.**

---

## 2. 원천 자료 — 원전·실제 저작·발언

대사는 인물의 원전, 실제 저작, 확인된 발언에서 길어 온다. 조사 자료는 담화 원고와 출처 자료에 남기고 `celebs` 프로필 칼럼에 백필하지 않는다.

**조사 산문을 그대로 못 쓴다.** 문어체 산문은 대담 발화로 어색하다. 확인된 내용을 대담 발화로 재작성하고, 충돌이 생기면 원전·실제 저작·발언을 우선해 교정한다.

---

## 3. 고지 원칙 (중요)

실존 인물에게 하지 않은 말을 시키는 시리즈다. **오해 방지가 기능 요건이다.**

- 서비스는 이미 안내를 단다: "인물의 저서와 공개된 발언을 바탕으로 사상과 신념을 재구성한 글입니다. 본인이 실제로 남긴 말은 아닙니다." (`sw/web/messages/ko/celeb.json` `virtualMonologueNote`)
- 영상은 논쟁 장면이라 오해 소지가 더 크다. **최소 3중으로 건다**:
  1. 인트로 카드에 고지 문구 (음성 낭독 포함 검토)
  2. 화면 하단 상시 소자막 (전 구간)
  3. 유튜브 설명 첫 줄 + 아웃트로
- **생존 인물**은 별도 판단이 필요하다. 사자(死者) 위주 편성이 안전하다. 생존 인물 등장 시 승인 필수.
- 실제 발언을 인용하는 경우엔 팩션처럼 `origin`(verbatim 원문)을 병기해 **재구성분과 실발언을 구분**한다.

### 인용 규약 (musk-altman 편에서 확립)

생존 인물·현재진행 분쟁을 다루며 규칙이 필요해졌다. **전 에피소드에 적용한다.**

1. **제3자 증언은 대사로 쓰지 않는다.** 인물이 각자 **자기 입으로 실제 한 말**만 인용한다. 제3자의 비난(동료·이사회·전직 직원 증언)을 상대 인물 입에 넣으면 재구성이 아니라 명예훼손이다.
   - 실무적으로도 필요 없다. 좋은 담화편은 **자기 말이 자기를 겨누는 구조**에서 힘이 나온다. 남의 말을 빌려올 이유가 없다.
2. **큰따옴표 = 실제 발언.** 재구성 대사에는 따옴표를 쓰지 않는다. 시청자가 화면에서 둘을 구분할 수 있어야 한다.
3. **`origin` + `originRef` 는 세트.** 원문만 있고 출처가 없으면 검증이 불가능하다.
4. **자료 등급을 문서에 남긴다.** 1차(이메일 원본·공식 대본·법원 문서)와 2차(보도·재게시본)를 구분하고, 2차 단독 근거는 대사에서 단정형으로 쓰지 않는다. 확인 불가 항목은 **질문형으로만** 건드리거나 아예 뺀다.
5. **에피소드마다 `_docs/sources.md`** — 채택 인용·등급·배제한 것과 그 이유·확인 불가 목록. 표본: `public/discourses/musk-altman/_docs/sources.md`.
6. **한쪽 편들기 금지.** 양쪽 모두 자기 말에 발목 잡히는 구조가 아니면 그 조합은 담화가 아니라 공격이다.

---

## 4. 영상 흐름 (초안)

```
인트로(논제 + 고지)
 → 등장 인물 소개 컷 (1~4명, 팩션 인물 컷 계승)
 → 발언 턴 반복:
     독백 턴:   발언자 전면 + 대사 자막 글자 점등
     반박 턴:   난입 연출 → 반박자 전면
     대담 턴:   두 인물 대치 구도
 → (선택) 논제 매듭 카드
 → 아웃트로(로고 + 고지)
```

### 이미지 — 인물 수와 장수는 무관하다

**인물이 n명이라고 이미지가 n장이 아니다.** 팩션과 동일하게, **대사가 흐르는 도중 적정 시점에 이미지가 자유롭게 넘어간다.**

- 팩션은 인물 대사의 **의미 덩어리 인덱스**를 지목해 이미지를 교체한다 (`person.imageChanges[{ chunk, image }]` — `Faction/types.ts`). 담화도 이 방식을 그대로 계승한다.
- 즉 한 인물의 한 발언 안에서도 이미지가 여러 번 바뀐다. 발언이 길수록, 감정이 꺾이는 지점이 많을수록 장수가 는다.
- 인물 한 명이 여러 턴에 걸쳐 등장하므로 **인물당 이미지 수요가 팩션보다 훨씬 크다**. 팩션은 인물당 1~2장(`<slug>.png` + 대사컷 `<slug>_2.png`)이면 충분했으나, 담화는 인물당 5~10장을 예상한다. 경로 규격이 갈리는 지점이다 (§8).
- 교체 지점은 **대본 작성 시 사람이 지목한다.** 덩어리 분할이 Claude 수동 작업인 것과 같은 이유다 (메모리 `feedback_faction_quotechunks_claude_splits`).

### 그 외 연출

- **발언 턴 길이**는 대사 음성 길이에 따라 가변이다. 팩션 인물 컷(1.1초 고정)과 다르다.
- 인물 컷·자막·글자 점등은 팩션 `PersonCard`·`components/caption/Typewriter`·`ShortCaption`을 재사용한다.
- **난입·대치 연출은 신규**다. 팩션 `transitions.tsx`(glitch/tear/whip 등)를 소재로 쓴다.

---

## 5. 데이터 모델 (확정 — 구현됨)

**SSoT는 코드다: `sw/remotion/src/compositions/Discourse/types.ts`.** 아래는 뼈대를 읽기 위한 요약이며, 필드 단위 사실은 반드시 코드를 본다(BO 미러: `remotion-bo/src/lib/discourse-types.ts`).

실물이 초안에서 갈린 지점: 음성 설정을 팩션식 평면 나열 대신 **`DiscourseVoice` 한 벌로 묶어** `Speaker.voice` → `Turn.voice` 계승 구조로 뒀다. 그 밖에 `originRef`(출처, `origin`과 세트) · `living`(생존 인물 표시) · `disabled`(인물·발언 데이터 보존한 채 제외) · `showCastIntro` · `titleByPart`/`titleByLvPart` 가 실물에 추가됐다.

```ts
DiscourseScript {
  title; titleEn?;              // 영상 명칭 (앞부분\n뒷부분 — 팩션 통합 방식 계승)
  logline; loglineEn?;          // 시작문구
  notice; noticeEn?;            // 고지 문구
  topic?; topicEn?;             // 논제
  cast: Speaker[];              // 등장 인물 (1~4명) — 1명이면 순수 독백편
  turns: Turn[];                // 발언 순서 — 이 배열이 뼈대
  music?; tracks?; musicDuckVolume?;
  holdMotion?; transition?;     // 전역 모션 기본값 (팩션 계승, 인물→전역 계승)
  longformLayout?;              // 롱폼 편 경계 (팩션 계승)
}

Speaker {
  name; nameEn?; slug;          // slug = 본서비스 셀럽 slug와 일치
  lines[3]; linesEn[3];         // 직함 3줄 (팩션 작성 원칙 그대로)
  epithet?; epithetEn?;         // 수식어
  image?; imageCrop?;           // 소개 컷 기본 이미지
  color?;                       // 인물 색 (자막·이름 강조)
  era?;                         // 생몰 — 시대 초월 조합에서 표시
  mythical?: boolean;
  holdMotion?;                  // 인물 단위 지속 효과
  // 음성 설정 (팩션 quote* 세트 계승 — 인물 단위 기본값)
  speaker?; engine?; style?; elevenlabsVoiceId?; ...
}

Turn {
  cast: number;                 // cast 배열 인덱스 = 발언자
  kind: 'monologue' | 'accuse' | 'rebuttal' | 'reply' | 'agree';
  to?: number;                  // 누구를 향한 발언인가 (cast 인덱스)
  text; textEn?;                // 대사
  chunks?[]; chunksEn?[];       // 의미 덩어리 자막 (팩션 quoteChunks 계승 — 수동 분할)
  origin?;                      // 실제 발언이면 verbatim 원문
  image?; imageCrop?;           // 이 턴 시작 이미지 (없으면 Speaker.image)
  imageChanges?: { chunk: number; image: string }[];   // 덩어리 인덱스에서 이미지 교체 (팩션 계승)
  transition?; holdMotion?;     // 진입 효과 · 지속 효과 (팩션 두 축 계승)
  duration?; gainDb?; playbackRate?;   // 음성 메타
  part?;                        // 쇼츠 편
}
```

### 설계 논점 — 결론

1. **음원 파일 이름 — 결정: 후보 B `T01-<slug>.wav`** (구현 완료, `Discourse/voice-names.ts` `vnTurn`). 번호(1-based·0패딩) + 발언자 slug라 밀림이 **눈으로 잡힌다**. 수식어 낭독은 인물 자리 기반 `C01-<slug>-epithet.wav`(`vnCastEpithet`). 검증 함수 `vnVerify`가 발언 배열과 디스크 wav를 대조해 밀림·누락을 구분하고, BO 편성 탭이 이걸로 배너·행 배지를 띄운다. 규칙은 `remotion-bo/src/lib/discourse-voice.ts`에 복제돼 있다(워크스페이스 경계로 import 불가 — **한쪽을 고치면 반드시 양쪽**).
   - 미채택: A `T01-quote.wav`(팩션 동형, 밀림이 소리로만 드러남) · C 불변 id(밀림은 막으나 사람이 순서를 못 읽음).
2. **턴 길이 산식 — 결정** (구현 완료, `Discourse/timing.ts`). 음성 `duration`이 있으면 그 길이, 없으면 글자 수 ÷ `CPS`(6.5) 추정. 여기에 `TURN_PAD_SEC`(0.55) 여유를 더하고 `TURN_MIN_SEC`(1.6) 아래로는 안 내려간다(`turnSec`). BO는 이 산식을 복제하지 않고 `buildCues`를 직접 import한다.
3. **반박 난입 연출 — 미결.** 앞 발언을 자르고 들어오는가(오버랩), 끝난 뒤 들어오는가. 오버랩이면 음성 트랙 2개가 겹친다. 현재 구현은 발언을 순차 배치한다.
4. **쇼츠 절단 지점 — 팩션 `part` 계승으로 확정**(`Turn.part`, `shortsPartNumbers`). 롱폼 편 경계는 `longformLayout`의 `{ cut: true }`가 가른다(`KO-LV1`·`KO-LV2`…). 실사용 검증은 음성·렌더 CLI 착수 후.
5. **인물 이미지 경로 — 젠슨 황 편에서 `cast/<slug>/01.png` 폴더형을 첫 적용했다** (§8). 한 인물의 여러 턴에 10장을 연결해 장수 확장 조건을 실물로 확인했다.

---

## 6. 편성 원칙 (초안)

1. **논제 우선** — 인물 조합이 아니라 논제가 먼저다. "이 둘을 붙이면 재밌겠다"보다 "이 물음에 이 둘이 갈린다"가 편을 만든다.
2. **실존 관계 기본** — 생전에 실제로 얽힌 라이벌·친구·적. 고증 부담이 적고 관계가 이미 대중에게 알려져 설명이 필요 없다.
3. **시대 초월은 특별편** — 수백 년 차를 붙일 때는 왜 만났는지에 대한 설정이 필요하다. 남발하면 시리즈 신뢰가 흔들린다.
4. **사상 근거** — 모든 대사는 원전·실제 저작·발언에 근거해야 한다. 인물이 하지 않았을 말을 시키지 않는다.
5. **인물 확보** — 등장 인물은 본서비스 셀럽 DB에 있어야 한다(`slug` 연결). 미등록 인물은 팩션과 동일하게 티어 나눠 선등록 (`docs/project/celeb/celeb-pipeline.md`).
6. **대중 인지선** — 팩션과 동일. 인물 유명세가 아니라 **논제가 대중에게 닿는가**로 판단한다.

### 작법 — 첫 발언은 독백으로 열지 않는다 (musk-altman 편에서 확립)

**담화는 두 사람이 마주 앉은 자리다.** 그런데 인물의 사상을 산문에서 길어 오다 보면, 인물이 이 논제와 무관한 자기소개를 허공에 대고 읊는 것으로 첫 컷이 채워진다. musk-altman 초고가 정확히 그랬다 — 머스크가 문제 푸는 방식(물리 법칙 우선)을 15초 동안 말한 뒤에야 논제가 등장했고, 알트만은 논제를 말하는데 머스크는 방법론을 말하는 **서로 딴소리 상태**로 시작했다. 대담이 아니라 연설 두 개였다.

**상대를 부르고 따지는 데서 연다.** 이름을 호명하고("샘.") 무슨 일이 있었는지 짚고 "지금 그 조직은 무엇입니까"로 넘긴다. 첫 컷에서 논제가 서고, 상대는 대답할 수밖에 없고, 그 대답이 곧 두 번째 발언이 된다. 이 자리를 위해 `kind: 'accuse'`(추궁)를 두었다 — 앞 발언을 받지 않으면서 상대를 향하는 유일한 종류다(`monologue`는 허공, `rebuttal`은 받을 앞말이 있어야 한다).

인물의 사상 선언이 필요하면 **몰린 뒤 마지막에** 세운다. 방어하다 끝에 자기 논리를 꺼내는 편이, 처음부터 선언하고 시작하는 것보다 세다.

### 작법 — 사건은 장 표지가 옮기고, 대사는 사상만 다툰다

담화 대사는 사상 재구성이라 **무슨 일이 있었는지를 말해주지 않는다.** musk-altman 초고가 그랬다 — 두 사람이 명분과 위험을 놓고 열세 번 주고받는데 소송이 있었다는 사실이 한 번도 안 나왔고, 마지막에 "1심은…" 표지가 뜨자 시청자는 무슨 재판인지 알 도리가 없었다. 인물에게 사건을 설명시키면 대사가 해설이 되어 죽는다.

**장 표지(`era`)를 연표로 쓴다.** 발언 사이 제 시점에 사실 한 줄씩 꽂으면 사건이 흐르고 대사는 사상만 다투면 된다(설립 → 이탈 → 제소 → 판결). 표지가 옮기는 사실도 `_docs/sources.md` 의 사실 골격에 근거해야 한다.

- **장 표지 첫 줄은 150px로 뜬다. 연도만 넣는다.** 문장을 넣으면 세 줄로 터진다. 둘째 줄부터가 70px 문구 자리다(`Faction/sections/EraCard.tsx` — 담화가 그대로 재사용).
- 사건의 핵심 한 건(이 편에서는 소송)은 **대사에도 한 번 심는다.** 표지에만 두면 인물이 남 일처럼 말하는 꼴이 된다.
- 마지막 표지는 발언 개수와 같은 자리를 가리켜 맨 끝에 둔다(§5 `DiscourseLongformItem`).

---

## 7. 규격

| 항목 | 값 |
|------|-----|
| 해상도 | 1080×1920 (9:16), FPS 60 — 팩션과 동일 |
| 영상 종류 | 세로 롱폼(`KO-LV`, 편 경계 시 `KO-LVN`) + 세로 쇼츠(`KO-SN`) |
| 언어 | 한국어 우선. 원천이 ko 단일이므로 영문은 후순위 |
| 채널 | 서재 탐방·팩션과 같은 KO 채널, 비공개 업로드 |

### 완성 정의 — BO를 팩션과 같은 층위까지 만든다

**Studio에서 렌더가 나오는 것은 완성이 아니다.** 팩션은 remotion-bo에서 편집·미리보기·음성·이미지·렌더·유튜브를 모두 처리하고, Studio는 확인용이다. 담화도 **같은 층위**로 만든다. 아래가 전부 서야 완성이다.

| BO 기능 | 팩션 선례 | 담화에서 |
|---------|-----------|----------|
| 사이드바 시리즈 진입 | `series-registry.ts` + `FactionList` | 에피소드 목록 + 상태(`todo`/`live`/`done`) |
| 편집기 「정보」 탭 | 세력·인물 실체 | **인물(cast) 실체** — 이름·직함·수식어·이미지·음성 설정 |
| 편집기 「편성」 탭 | 세력 순서·편 배정·배경음악 | **턴 순서·편 배정·배경음악** — 발언 추가·삭제·재배치가 핵심 |
| 대사 편집 | `quote`/`quoteChunks` | 턴별 대사 + 의미 덩어리 분할 + **이미지 교체 지점 지정** |
| 음성 패널 | 엔진·보이스·스타일·감정·미리듣기·트림 | 동일 (턴 단위) |
| 미리보기 | `@remotion/player` + 렌더와 동일 타이밍 산식 | 동일 |
| 렌더 버튼 | 영상 + 자막 일괄 | 동일 |
| 유튜브 패널 | 상태·업로드·메타 미리보기·반영 | 동일 |
| 이미지 업로드·크롭 | `faction-image` API | 동일 (인물당 다수 이미지 → UI 부담이 팩션보다 크다) |

**턴 순서 편집이 팩션에 없는 신규 UI다.** 팩션 편성 탭은 세력 순서를 다루지만, 담화는 발언 하나하나를 넣고 빼고 옮긴다. 이때 음원 파일이 밀리는 문제(§5-1)가 UI에서 바로 드러나므로, 데이터 모델과 함께 설계한다.

이 요건 때문에 **remotion-bo의 `isFactionSeries()` 이분기를 세 갈래로 푸는 작업이 선택이 아니라 진입 조건**이다 (§9).

---

## 8. 경로

```
sw/remotion/public/discourses/
  _episodes.json            # ✅ 화이트리스트 — 여기 없으면 컴포지션이 안 뜬다
  <에피소드>/
    discourse-data.json     # ✅ 메타·편성 — 제목·논제·시작문구·고지·배경음악·장 표지(longformLayout)
    cast.json               # ✅ 인물 실체 (Speaker[])
    turns.json              # ✅ 발언 (Turn[]) — 가장 두껍고 가장 자주 고친다
    _status.json            # ✅ todo | live | done
    _docs/sources.md        # ✅ 인용 출처·등급·배제 사유 (§3-5)
    data.timing.<locale>.json  # ⏳ 발화 시각 (음성 착수 시). 키 = wav stem
    voice/T01-<slug>.wav    # ⏳ 발언별 음원 (명명 확정 §5-1, voice-names.ts)
    voice/C01-<slug>-epithet.wav  # ⏳ 수식어 낭독
    cast/<slug>/01.png      # ⏳ 인물 이미지 (다수 — 아래 참조, 경로 미결)
    _refs/<slug>.png        # ⏳ 생성용 REF
```

✅ = 실재(2026-07-16 실측) · ⏳ = 규격만 정해진 예정 경로. 현재 에피소드 3편이며, `jensen-huang`에 `cast/jensen-huang/01.png`~`10.png`가 실재한다. 음성은 전 편 미착수다.

### 데이터를 세 파일로 나눈 이유 (26.07.16 확정)

처음엔 통짜 `discourse-data.json` 하나였다. **대사를 고치려면 제목·고지·배경음악 설정을 헤치고 들어가야 했고, 메타 한 줄을 고치려면 수백 줄 대사 배열을 스크롤해야 했다.** 여기에 음성 길이(`duration`)·영문 대사(`textEn`/`chunksEn`)·이미지 교체 지점이 붙으면 발언 하나가 40줄을 넘어 한 편이 600줄이 된다.

- `turns.json` — **가장 두껍고 가장 자주 고친다.** 음성 파이프라인이 `duration` 을 쓰는 곳도 여기다. 따로 두면 대사 작업이 이 파일 하나로 끝난다.
- `cast.json` — 인물 실체. 음성 설정·이미지·색이 붙어 두꺼워진다. 한 번 정하면 잘 안 바뀌어 대사와 수명이 다르다.
- `discourse-data.json` — 나머지 메타·편성. 얇게 유지한다.

**합치고 나누는 곳은 두 군데뿐이다.** 렌더는 `Discourse/script.ts` 의 로더가 `require.context` 세 개로 훑어 합치고, BO는 `discourse-utils.ts` 의 `loadDiscourseEpisode`/`saveDiscourseEpisode` 가 합치고 나눈다. **그 바깥은 나뉜 사실을 모른다** — 화면·API·타입은 통짜 `DiscourseScript` 하나만 다룬다. 새 파일을 더 쪼갤 일이 생겨도 이 두 곳만 고치면 된다.

`cast.json`(인물 명단)과 `cast/`(그 인물 사진 폴더)는 짝이다. 파일과 폴더가 같은 이름을 쓰는 것은 의도한 것이다.

**cast·turns 가 없으면 에러를 던진다.** 빈 배열로 폴백하면 인물도 대사도 없는 영상이 조용히 렌더되고, BO 저장이 그 빈 상태를 덮어써 원본을 날린다.

- 팩션의 세력(`NN-slug/`)·클러스터(`1/`) 계층이 **없다**. 인물이 평면이고 순서는 턴이 정한다.

### 인물 이미지 폴더형 (확정 — 팩션 규격과 갈리는 지점)

팩션은 인물당 `<slug>.png` + 대사컷 `<slug>_2.png` 평면 파일명을 쓰고, **인물 하위 폴더형을 신규 비권장**으로 못박았다(`factions/_docs/folder-rules.md` §12-2, AI편 레거시 `01-alan_turing/body.png`).

담화는 사정이 다르다. **한 인물이 여러 턴에 걸쳐 말하고 턴마다 이미지가 여러 번 바뀌므로 인물당 5~10장**이 나온다. `<slug>_7.png`까지 늘어난 평면 파일명은 읽기 어렵다.

- **확정: `cast/<slug>/01.png` 폴더형.** `jensen-huang` 편에서 10장(`01.png`~`10.png`)을 첫 실사용했고, 7개 발언의 `image`·`imageChanges`에 전부 다른 파일을 연결했다.
- 미채택: `cast/<slug>.png` + `<slug>_2.png`… 팩션 동형. 관례는 일치하지만 장수가 늘면 파일명이 무너진다.

**팩션 규격을 어기는 게 아니라 조건이 다른 것**이다. 담화는 같은 인물이 여러 턴에 반복 등장하므로 인물 폴더형을 SSoT로 삼는다. 별도 `discourses/_docs/folder-rules.md` 작성 전까지 이 절이 경로 규격이다.

그 외 규격(상태 어휘, 단체→크롭→개인 이미지 파이프라인, `_archive`/`_staging`, REF 원칙)은 `factions/_docs/folder-rules.md`를 그대로 준용한다.

---

## 9. 착수 시 건드릴 지점

팩션 조사 기준 체크리스트. 상세 근거는 §10 참조.

**remotion**
- [x] `src/compositions/Discourse/` 신설 — `types.ts`(SSoT) / `script.ts`(로더) / `timing.ts` / `index.ts` / `Discourse.tsx` / `constants.ts` / `utils.ts` / `voice-names.ts` / `subs.ts` / `sections/` 6종(`IntroCard`·`CastCard`·`TurnCard`·`EraCard`·`CueLayer`·`OutroCard`)
- [x] `src/Root.tsx` — import + `<Folder name="Discourse">` 블록. `durationInFrames`는 등록 시점 `calcDiscourseFrames()` 동기 호출(팩션 관례, `calculateMetadata` 미사용). 한국어 키만 등록(`-en` 필터 — 원천이 ko 단일)
- [x] `public/discourses/` + `_episodes.json` 화이트리스트 (없으면 컴포지션이 안 뜬다)
- [x] 폴더명은 **영문·숫자·하이픈만** — 컴포지션 ID가 된다

**packages/shared**
- [ ] `youtube-discourse-meta.ts` — **미착수(실측 확인: `packages/shared/src/lib/`에 `youtube-faction-meta.ts`만 있다).** `discourseVariants()` / 제목·태그·설명 빌더. **컴포지션 ID의 단일원천을 여기로 옮긴다** (팩션 주석에 "예전엔 양쪽에 정규식이 복붙돼 규칙이 어긋났다"는 사고 이력이 있다)
  - 현재 `discourseCompBase()`는 `Root.tsx` 안에 있다(`Discourse-<폴더명>`). 유튜브 CLI 착수 시 shared로 승격해 복붙을 원천 차단한다.

**음성**
- [ ] `voice:discourse` / `voice:discourse-align` 스크립트 + `scripts/voice/discourse/`
- [ ] `scripts/voice/3-transcribe.py`에 `--discourse` 플래그
- [ ] wav 명명 함수는 `Discourse/voice-names.ts` + **`remotion-bo/src/lib/discourse-voice.ts`에 복제** (워크스페이스 경계로 import 불가)

**렌더·업로드**
- [ ] `scripts/srt/discourse-srt.ts`, `scripts/youtube/youtube-discourse.ts` + `discourse-lineup.json`
- [ ] 스킬 `remo-render-discourse` / `remo-upload-discourse` / `discourse-voice-sync`

**remotion-bo (작업량 최대)**
- [x] `src/lib/series-registry.ts`에 `SeriesDefinition` 추가
- [x] `src/lib/discourse-types.ts`(remotion types 미러) / `discourse-utils.ts`(IO) / `discourse-voice.ts`(음원 명명 복제)
- [x] **`isFactionSeries()` 이분기 데이터화 — 완료(26.07.16).** 호출처 41곳 전량 전환 후 함수 **제거**. 대체 필드 3개:
  - `dataModel: 'book' | 'faction' | 'discourse'` — 데이터 구조 계열. IO·목록·홈·편집기 선택
  - `episodeHome: string` — 진입 목적지(`'scenario'` / `'both/info'`). 리다이렉트 4곳의 분기를 소멸시켰다
  - `langTabEditor: boolean` — 라우팅 가드·레이아웃 래퍼
  - 헬퍼: `seriesDataModel()` · `isSeriesModel(id, model)` · `usesLangTabEditor()` · `episodeHomePath()`
  - 여러 곳은 분기가 아니라 **키 등록표**로 바뀌어 새 시리즈가 한 줄로 붙는다: `SERIES_EPISODE_IO`(server-utils) · `EPISODE_LISTS`(Sidebar) · `SERIES_HOMES` · `EDITORS` · `FILE_SERIES` · `STATUS_WRITERS`
  - **의도적으로 안 넣은 것**: `editorKind`(현재 `dataModel`과 1:1이라 중복·드리프트 위험 — 갈리는 날 쪼갠다) · `dataFile`(읽는 범용 코드가 없어 즉시 데드필드)
  - **유일하게 남긴 하드코딩**: `middleware.ts`의 `series !== 'faction'`. Next `matcher`가 정적 리터럴을 요구해 `/faction/:path*`가 이미 박혀 있고, 그 리터럴을 반영하는 검사라 손대지 않았다
  - 담화 렌더·유튜브 라우트는 CLI 미구현이라 **501 명시 응답**을 둔다(조용한 폴백 금지 — 책 경로로 새면 안 된다)
- [x] `components/discourse/DiscourseEditor` — **원고 중심 전면 개편(26.07.21).** 유저 지적(조각 카드 편집이 어렵다 — 한 덩어리로 쓰고 나서 오디오·이미지·화자 구획을 정해야 한다)으로 「정보/편성」 2탭을 철거하고 **「원고 | 인물」 2탭**으로 재편. 구 발언 탭 주소로 들어와도 원고가 열린다.
  - **원고 탭(기본) — 발언마다 한 행, 왼쪽 대사 · 오른쪽 그 대사의 사진**(26.07.27 재편). CSS 격자 `grid-cols-[minmax(0,1fr)_20rem]` + `items-start` 로 짜여 **한 발언의 대사와 사진이 언제나 같은 행**에 놓인다. 행 높이는 둘 중 깊은 쪽이 정하고 얕은 쪽엔 빈 자리가 남는다 — **높이를 재서 맞추지 않는다.** 팩션 인물 행과 같은 짜임새이고, 다른 것은 단위뿐이다(팩션=인물 하나, 담화=발언 하나).
    - 대사 입력칸은 공용 `QuoteEditor`(`packages/shared/src/bo/quote-editor.tsx`) — 팩션 `FactionQuoteEditor` 를 승격시킨 것이라 **팩션·담화가 같은 부품**을 쓴다. 엔터 = 덩어리(chunk) = 이미지·자막 전환 단위, 줄 위 점선 표식(＋전환·드래그 이동·✕·**눌러서 사진 고르기**), 사진이 걸린 줄부터 다음 자리 전까지 카드와 같은 색으로 배경 칠. 줄 수가 바뀌면 `adjustImageChanges`(같은 파일)가 사진 자리를 따라 민다.
    - `text`는 chunks에서 파생(`join(' ')`, 팩션 quote 파생과 동일 — 이중 입력 소멸). 발언 추가·삭제·순서는 행 머리 단추(사진·음성이 붙은 발언 삭제 시 확인창) + 10단계 되돌리기.
    - ⚠️ **폐기된 접근 2종 — 재제안 금지.** ① 문장 자동 분할 + gap 클릭(26.07.21 반려). ② **대본 전체를 입력창 하나로 이어 쓰는 연속 원고**(26.07.21~27 운용 후 폐기) — 통짜 textarea는 중간에 여백을 넣을 수 없어 오른쪽 사진과 행을 맞출 방법이 없다. JS로 발언 높이를 재서 사진 열을 밀어 맞추는 보정도 시도했다가 **「뭘 눈으로 봐, 높낮이 맞도록 레이아웃 설계하라」**로 반려됐다. 딸린 `ManuscriptEditor.tsx`·`manuscript.ts`(`remapTurns`)·`TurnImageColumn.tsx` 삭제.
  - **행의 오른쪽 칸 = 그 발언의 사진**(`sections/TurnRow.tsx`, 20rem). #1 시작(비면 인물 사진 상속 표시) → #N 넘김 → 「사진 넘김 추가」(덩어리 1개면 비활성) → 고아 앵커 경고. 담화 전체 사진이 행을 따라 위에서 아래로 전부 늘어선다 — 고른 발언 것만 띄우지 않는다.
    - 🔴 **카드는 공용 부품 `ImageCard`**(`packages/shared/src/bo/media.tsx`). 팩션·담화가 **같은 부품**을 쓴다 — 280px 가로형 = 썸네일 112px + 머리띠(이름표·색감·△사진만 비우기·삭제) + 걸리는 구절 + children(구절 고르기). 끌어다 놓기는 부품이 스스로 받고(`useImageDrop`), 사진 고르는 창은 **부르는 쪽**이 띄운다(대사 표식 클릭으로도 같은 창이 열려야 해서 여닫는 권한을 부품이 쥐면 안 된다). `ANCHOR_THEMES`·`themeAt`·`IMAGE_FILTER_OPTIONS`도 같은 파일. **팩션의 `ImageChangeSlot`과 인라인 `#1 기본` 카드(약 90줄)는 삭제하고 이 부품으로 교체**했다.
    - 🔴 **사진 칸은 사진만 다룬다.** 발언 설정을 여기 끼워 넣지 않는다(26.07.27 유저: 「'설정' 이게 뭐지 이미지 배열에서?」). 카드 본문의 「발언 시작점 고정」 같은 설명 문구도 뺐다 — 사진 배열에 대사 용어가 섞이면 무슨 화면인지 흐려진다. 설정(`TurnDetailPanel`: 종류·대상·쇼츠 편·효과·콘티·음성)은 **왼쪽 대사 칸 아래 「설정」 접기**로 들어간다(팩션 인물 행과 동일).
    - 🔴 **발언 원문(`origin`/`originRef`)은 발언별 폼에서 분리**해 상단 「발언 원문」 패널(`TurnOriginPanel`)로 모았다. 담화 전체를 놓고 한꺼번에 정리하는 자료라 매 단락에 박지 않는다(26.07.27 유저 지시). 패널은 적힌 개수·**출처 없는 원문 개수**를 머리에 세고 「적힌 것만」 추리기를 지원한다.
    - **색 대조**: `shared/anchorMap.ts`의 `turnAnchorMap`이 발언 안에서 사진이 걸린 자리마다 색을 배정 → 대사에서 **그 사진이 떠 있는 구간의 줄 배경**과 카드 테두리·머리띠·표식이 같은 색. 미지정 자리는 회색(`bg-slate-400/25`) + 라벨 「사진 없음」.
    - **사진 목록은 Ctrl+Q 토글**(`useImagePoolToggle`, 팩션과 동일) + 26rem.
    > 🔴 개편 이유(26.07.27 유저): 「이미지 넣고 다루기 쉽지 않다 — 팩션에서처럼 하는 게 쉬울 것」. 이식은 **네 번 반려됐다**: ① 카드 모양만 베끼고 고른 발언 하나만 표시 + 카드를 두 벌로 구현(「사진들이 쭉 떠야지」·「공통컴포넌트 작업까지도 해둘 줄 알았는데」) ② 사진 배열에 「설정」·대사 용어가 섞임 ③ 발언 원문을 매 단락에 박음 ④ 높이를 JS로 재서 맞춤(「뭘 눈으로 봐, 높낮이 맞도록 레이아웃 설계하라」). **팩션을 따라한다는 건 겉모양이 아니라 ⑴전량 조망 ⑵부품 공유 ⑶칸의 역할 분리 ⑷레이아웃으로 맞물리는 짜임새까지다.**
  - **편집 방어(26.07.21)**: 발언 수 변경 시 스냅샷 10단계 되돌리기(Ctrl+Z) · dirty 상태 beforeunload 경고 · 발언 소멸 시 배너 알림(사진·음성 붙은 발언은 명시) + undo 복구 · 범위 밖 to 인덱스에도 화면 생존 · duration 보유 발언 내용 변경 시 「음원 재생성 필요」 배너(세션 한정 — 데이터에 원문 지문이 없다). ⚠️ 대사가 빈 발언은 원고에 표현 자리가 없어(빈 줄=경계) 편집 시 소멸한다 — undo·배너로만 방어.
  - **철거**: `DiscourseTurnsTab`·`TurnRow`·`ChunkEditor` 삭제(참조 4범주 검색으로 무참조 확인). `textEn`/`chunksEn`은 편집 UI 없이 **보존만** 한다(엔진이 ko만 등록 — 어떤 편집 경로에서도 파생·삭제하지 않음).
  - **음원 자리 경고**: `GET /api/[series]/discourse-voice/[episode]` 가 실제 wav 목록을 읽고 `vnVerify` 로 대조 → 원고 탭 상단 배너(밀림/누락 구분) + 발언 행 배지. 분할·병합·삭제 전에 밀림 예고 확인창(wav 0개면 생략).
  - **타이밍**: BO가 산식을 복제하지 않는다. 렌더의 `Discourse/timing.ts` 가 순수 모듈이라 `buildCues` 를 **직접 import** 한다(`components/discourse/shared/timing.ts`). 팩션(BO 근사치 복제)보다 엄격하다.
  - **미리보기는 팩션과 동형(컷 흐름 도식)**. `@remotion/player` 로 `Discourse` 컴포넌트를 직접 물릴 수 없다 — `script.ts` 가 `require.context` 로 에피소드를 빌드 시점에 훑어 담는 구조라 BO 번들에 실리지 않는다(tsc 실측: `Property 'context' does not exist on type 'Require'`). 팩션 카드 미리보기가 Player를 쓰는 것은 `FactionCard` 가 로더를 거치지 않고 `assetBase` prop 을 받기 때문이다. 담화도 Player를 쓰려면 로더 비의존 진입점이 필요하다(엔진 변경 사안).
  - 잔여: 음성 생성·정규화 패널(담화 TTS CLI 부재), 유튜브 패널, 카드/도감, 「음원 재생성 필요」 배지 영구화(저장 형식에 원문 지문 추가 필요)

**문서**
- [x] `docs/project/remotion/README.md` 시리즈 표에 행 추가 (26.07.16 — 폐기된 hell-bar 행을 이 시리즈가 대체)
- [x] `docs/project/remotion/README.md` 시리즈 표에서 이 문서 연결
- [ ] `public/discourses/_docs/folder-rules.md` (팩션 것 준용 + 차이만) — 인물 이미지 경로 확정(§8) 후 작성

---

## 10. 재사용 자산 (팩션·공통)

| 자산 | 경로 | 비고 |
|------|------|------|
| 글자 점등 자막 | `src/components/caption/Typewriter.tsx` | 이미 시리즈 무관 공통으로 승격됨 |
| 소자막 | `src/components/caption/ShortCaption.tsx` | 자동 페이징(ko 30자) |
| 발화 시각 라이브러리 | `src/lib/voice-timing/` | `expandSubTimings`·`paginateSentences` |
| 인물 컷 | `Faction/sections/PersonCard.tsx` | 승격 후보. 이미지 교체(`imageChanges`) 로직 포함 |
| 자막 글로우 | `Faction/sections/CaptionBackdrop.tsx` | 승격 후보 |
| 전환 효과 | `Faction/transitions.tsx` | 난입 연출 소재 |
| 지속 모션 | `Faction/utils.ts` `resolveHoldMotion`·`holdMotionTransform` | 켄번스·패닝 계승 |
| 브랜드 로고 | `BookRecommend/brand.ts` | 이미 팩션이 크로스 import 중 |
| 정렬 저수준 | `scripts/voice/lib/align-core.ts` | 공유 |

---

## 11. 시리즈 이름

| 축 | 값 |
|----|-----|
| 한국어 명칭 (화면·유튜브 노출) | **가상 담화** |
| 영문 코드명 (폴더·컴포지션 ID·출력 파일) | **`Discourse`** |

「담화」는 혼자 하는 말과 주고받는 말을 함께 덮는 낱말이라 **독백편·대담편을 한 이름 아래 둘 수 있다**.

한국어 명칭은 노출 문구라 나중에 바꿔도 싸다. **영문 코드명은 컴포지션 ID·출력 파일명·유튜브 기록에 박히므로 확정 후 변경하지 않는다.**

미채택 후보(기록): `Monologue` / `Symposium` / `Seance` / `Voices` / `Colloquy` / `Dialogos`

---

## 12. 다음 단계

1. ~~시리즈 이름 확정~~ (완료 — §11)
2. ~~파일럿 대본~~ (완료 — `qin-shi-huang` 독백 1인·발언 10, `musk-altman` 대담 2인·발언 14, `jensen-huang` 단순 독백 1인·발언 7)
3. ~~데이터 모델 확정 → `types.ts`~~ (완료 — §5)
4. ~~remotion-bo 이분기 데이터화~~ (완료 — §9)
5. **이미지** — `jensen-huang`에서 폴더형 경로와 10컷 연결을 첫 실사용. 기존 2편은 별도 발주 필요
6. **음성 CLI** — `voice:discourse` / `voice:discourse-align`. wav 명명은 확정됨(§5-1)
7. **렌더·유튜브 CLI** — `youtube-discourse-meta.ts` 승격부터. 그때까지 BO는 501 명시 응답
8. **난입 연출 확정**(§5-3) — 오버랩 여부. 음성이 붙어야 실물로 판단된다

---

— 작성 2026-07-16: 기획 착수. 데이터 모델·연출 미확정.
— 개정 2026-07-16b: 시리즈 이름 확정 (가상 담화 / `Discourse`). 독백·대담 통합 — 인원·대화 여부는 편별 데이터. 이미지 교체(`imageChanges`) 팩션 계승 명시 · 인물당 다수 이미지 경로 논점 추가.
— 개정 2026-07-16c: 코드 실측 대조. §5 데이터 모델 확정 표기(음원 명명·턴 길이 산식 결론 반영) · §8 경로 실재/예정 구분 · §9 remotion·문서 항목 완료 표기, `youtube-discourse-meta.ts` 미착수 명시. 폐기된 hell-bar 자리를 이 시리즈가 대체함을 `README.md`·`three-kingdoms.md`에 반영.
— 개정 2026-07-21: BO 편집기 원고 중심 전면 개편 — §9 반영. 1차 설계(문장 자동 분할 + gap 클릭)는 유저 반려로 전면 폐기하고, 팩션 대사 에디터 패턴(연속 입력·엔터=덩어리·이미지 전환 라인)을 이식·확장(빈 줄=발언 경계·화자 칩·`remapTurns` 실시간 재분배)으로 확정.
— 개정 2026-07-27: 원고 탭을 **발언 = 격자 한 행(왼쪽 대사 · 오른쪽 사진)** 으로 재편 — §9 반영. 연속 원고(`ManuscriptEditor`·`manuscript.ts`)와 JS 높이 보정(`TurnImageColumn`) 폐기. **공용 부품 2종 승격**: 사진 카드 `ImageCard`(shared/bo/media, 팩션 `ImageChangeSlot`·인라인 카드 삭제) · 대사 입력칸 `QuoteEditor`+`adjustImageChanges`(shared/bo/quote-editor, 팩션 `FactionQuoteEditor` 삭제). 발언 원문은 `TurnOriginPanel`로 분리. 반려 4회 이력은 §9 본문 참조.
