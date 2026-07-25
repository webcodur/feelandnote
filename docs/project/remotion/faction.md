# 팩션(Faction) — 세력도 시리즈

AI·기술 분야의 주요 인물을 **진영(세력)별로 묶어 보여주는 세로 영상** 시리즈. 무대사·무자막 음성 없이, 고정 길이 컷의 시간순 나열로 구성한다. 첫 에피소드는 `llm` — "AI를 만드는 사람들".

## 컨셉

- 한 에피소드 = 한 분야(예: LLM). 분야 안에 「세력(팀/기업)」 여러 개, 세력마다 「인물」 여러 명.
- 톤: 어둡고 시네마틱한 저조도 + 강한 명암. 팀 영웅/패밀리 화보 무드(PayPal 마피아 / 매트릭스 / 블레이드). 음악은 badass.
- 인물 표기 = 직함(한글) + 이름 + 핵심 이력 줄(`lines`, 최대 3줄). 예: OpenAI / 샘 알트만 / CEO.

## 영상 흐름

```
인트로(타이틀)
 → 세력마다:
     solo 세력:   [인물 컷들]만 (팀 타이틀·화보 없음)
     일반 세력:   [팀 타이틀 카드]
                  그룹(cluster)마다: [화보 카드 → 그 그룹 인물 컷들]
                  (안 나눈 세력 = 그룹 1개 — 화보 카드는 항상 1장 이상)
 → 아웃트로(로고)
```

- **인물 컷**: 영화 포스터식. 시네마틱 인물 이미지가 화면을 가득 채우고(켄번스 줌), 하단 어두운 그라데이션 위에 직함 + 이름(순백) + 핵심 이력 줄(`lines`)을 얹는다. 이미지가 없으면 이니셜.
- **팀 타이틀 카드**: 로고(영상 `logoVid` 우선, 없으면 이미지 `logoImg`)를 풀스크린 배경으로 깔고 그 위에 세력 명칭을 얹는다. 앞부분(첫 줄)은 흰색으로 세력을 식별하고, 뒷부분은 세력색으로 표시한다. 회사 등장 직전 진입(브릿지) 비주얼. 로고가 둘 다 없으면 타이틀 카드 자체를 생략하고, 로드 실패 시 색 그라데이션 배경.
- **화보 카드**: 팀 그룹샷 이미지(`cluster.image`) + 세력 명칭(앞부분 흰색 식별 / 뒷부분 세력색) + 단체 명칭(`label`의 앞부분\n뒷부분). 이미지가 없으면 **"TEAM SHOT (이미지 없음)" 플레이스홀더 박스**로 화보 자리를 표시한다.

## 편성 원칙

1. **현직 기준** — 인물은 그 세력의 현직자만 싣는다(에피소드 기준 시점). 이탈자는 제외하거나 현 소속으로 옮긴다. 변동이 잦은 영역이므로 등재 전 웹으로 현직 여부를 교차 확인한다.
2. **그룹(`clusters`)** — 모든 세력은 그룹 1개 이상으로 구성된다. 인원이 많으면 여러 그룹으로 나눈다. 팀 타이틀은 1회만 뜨고, 그룹마다 화보 카드 + 인물 컷이 이어진다. 각 그룹의 단체 명칭은 `label`(앞부분\n뒷부분)에 담는다. (예: Google DeepMind = 「창업자」 + 「딥마인드」)
3. **모든 일반 세력에 화보 자리** — 안 나눈 세력(그룹 1개)도 화보 카드 구간을 갖는다. 화보 이미지가 아직 없으면 플레이스홀더가 뜬다. (그룹샷 없는 1명뿐인 팀·solo는 화보 없이 개인 컷)
4. **독립(`solo`)** — 무소속 개인들의 모음(예: 재야)은 팀이 아니다. `solo: true`면 팀 타이틀·화보를 생략하고 인물 컷만 노출한다.
5. **인물 사진** — 본서비스(셀럽 DB) 아바타(`avatar_url`, R2 URL)는 임시 표시용이고, 최종은 vanity 시네마틱 개인샷으로 교체한다. 에피소드 폴더의 로컬 이미지(폴더 경로·basename)로 연결한다.
6. **인물 이력(`lines`)** — 한글 최대 3줄(영어 `linesEn` 분리). 작성·표시 원칙은 아래 「인물 문구 작성 원칙」을 따른다.

## 인물 문구(lines) 작성 원칙

인물의 직함·이력은 `lines`(한국어)·`linesEn`(영어)에 **최대 3줄**까지 담는다. **줄 수만큼 화면 표시가 갈리므로, 1번째 줄과 2·3번째 줄의 역할이 다르다.**

**표시 방식 (`Faction.tsx`)**
- **대사 있는 인물**(`voice`·`text`): 화면엔 **1번째 줄만** 이름 옆에 상시 노출되고 곧장 대사로 넘어간다. 2·3번째 줄은 이 영상에선 화면 미노출이지만 **데이터로 충실히 채운다.**
- **대사 없는 인물**(`credit`): 직함 **3줄 전부**가 화면에 뜨고 대사는 없다. 이 3줄이 그 인물의 전부다. 시청자가 "이 사람이 왜 이 진영에 있는지"와 **조직의 성격**을 직함만으로 깨닫도록 깊이있게 쓴다.

**전원 빡시게 작성 (필수)**: 화면 노출 여부와 무관하게 **모든 인물의 2·3번째 줄을 깊이있게 채운다.** 롱폼 등 다른 포맷에서 이 줄들이 노출될 수 있으므로, "대사 인물이라 1줄만 보이니 2·3번째는 대충"은 금지. 전원이 credit 인물 기준으로 작성된다.

**줄별 작성**
- **1번째 줄**: **현재 세력에서의 직책(현직)**을 짧게. 이름 옆에 상시 붙으므로 간결하게. 예: `CEO`, `CTO`, `Chief Scientist`, `엔지니어`. **이전 소속·전직장을 1번째에 두지 않는다** — 현직으로 교체하고 이전 소속은 2·3번째로 내린다. (특별한 직책이 없으면 `엔지니어`처럼 현 역할로.)
- **2·3번째 줄**: 핵심 이력·업적을 **짧은 명사구**로. **부각·서술 금지** — 모두 거물이라 누구를 부각할 필요가 없다. `RLHF를 처음 프로토타입한 연구자`→`RLHF 연구`, `사실상 GPT 계보의 설계자`→`GPT 개발`, `세계 최다 피인용`·`핵심`·`최종 베팅` 같은 수식 전부 뺀다.

**`前` 처리**: **2·3번째 줄에 `前`을 붙이지 않는다.** 이 줄들은 지나온 이력이라 과거가 기본값이고, 현재 소속은 1번째 직책과 세력 이름으로 이미 드러난다. 일부에만 `前`이 붙으면 헷갈리므로 전면 미사용. 이전 소속은 회사명만 적는다(`OpenAI`, `GitHub`, `Cursor 총괄`).

**설립·약칭 표기**: 설립은 `X 설립`/`X 공동설립`(한국어), `X founder`/`X co-founder`(영문)로 통일한다. `창업`·`창립`·동사형 `Founded X` 금지. 긴 세력명은 직함에서 약칭한다: `Safe Superintelligence`→`SSI`, `Thinking Machines Lab`→`TML`.

**금지**: 칭찬·평가어(천재·대부·선구자), 부각 수식어(처음·사실상·세계 최다·핵심·최종 베팅), 잡신상(출신지·나이·학력). 사실·고유명사 위주로. 한국어 산문은 `no-trash-prose` 기준을 따른다.

**언어**: 한국어 `lines` + 영어 `linesEn` 분리. 로더(`script.ts`)가 en판에서 `linesEn ?? lines`로 펼친다.

## 대사 처리 스텝 (직함·수식어·음성)

인물 컷 구성은 **3개 독립 토글**로 정한다(BO 「대사 처리」 체크박스 = `stepCredit`·`stepEpithet`·`stepVoice`). 켜진 스텝이 **직함 2·3줄 → 수식어 → 대사** 순서로 나오고, 이름 옆 직함 1줄(`lines[0]`)은 항상 노출된다.

- **직함 스텝**(`stepCredit`): 직함 2·3번 줄을 순차로 띄운다(타이핑 사운드 동반).
- **수식어 스텝**(`stepEpithet`): `epithet`(한 문장 수식어)을 띄우고 나레이터가 낭독한다(세로 쇼츠 전용).
- **음성 스텝**(`stepVoice`): 대사(`quote`)를 표시하고 음원이 있으면 재생한다. **꺼지면 대사 자체가 안 뜨고** 켜진 리드 스텝만 보이고 끝난다.

세 값이 모두 없으면(레거시 데이터) `quoteMode`(voice/text/credit/full) + 수장 자동 규칙에서 환산한다(`personSteps`). 타이밍·길이 산식은 `personLeadTiming`(SSoT).

### 수식어 나레이션

`epithet`은 **팩션 낭독 음성**이 읽는다. 이는 화면에 등장하는 인물이나 별도 해설자 캐릭터가 아니다. `FactionScript.narrator.logline`에 둔 한 벌의 음성 설정을 영상 제목·시작문구·롱폼 챕터명·모든 인물 수식어가 공유한다. `readTitle`/`readLogline`/`readChapterTitle`로 읽을 항목을 고르며, 제목과 시작문구를 모두 끄면 같은 목소리를 챕터명·수식어에만 쓴다. 초기 인격형 나레이터의 `name`·`image`·`intro` 필드는 기존 데이터 렌더 호환용일 뿐 새 편집 화면에서는 만들지 않는다. 마무리 낭독은 새 UI에서 제공하지 않는다.

인물의 `epithetEngine`·`epithetSpeaker`·`epithetStyle`·`epithetElevenlabsVoiceId`·`epithetEleOptions`·`epithetEleEmotions`·`epithetEleTrail`·`epithetGainDb`·`epithetPlaybackRate`가 비어 있으면 공용 낭독 설정을 상속한다. 값이 있는 인물만 예외로 우선한다. BO는 편집할 때 공용값을 펼쳐 보여주고, 공용값과 같은 중복 필드는 저장 전에 다시 걷어낸다.

수식어 음원 파일은 대사와 같은 자리 규칙에 접미사만 다르게 — `FxxCxxPxx-epithet.wav`(`vnPersonEpithet`). 길이는 `epithetDuration`에 기록되며, 있으면 그 길이에 맞춰 재생·정지 후 대사로 교차한다(없으면 글자 수 읽기 추정·무음). 음량·배속은 인물 예외값 또는 공용 낭독값을 따른다. 시작 낭독 파일은 하위 호환 파일명 `narrator-logline.wav`를 유지한다.

챕터명은 `FactionChapter.narrate`가 있으면 그 값을, 없으면 전역 `readChapterTitle`을 따른다. 음원은 제목 해시 기반 `chapter-<key>.wav`라 챕터를 재배치해도 다른 음성이 붙지 않고, 제목이나 언어가 바뀌면 새 파일로 분리된다. 챕터별 `voice.quoteDuration`이 있으면 표지 컷은 `0.45초 지연 + 실제 재생시간 + 0.8초 여유`를 모두 담도록 자동 연장된다. BGM 덕킹과 SRT 챕터 자막도 같은 큐를 따른다.

BO는 인물 행에 **「수식어」 음성 패널**을 둔다(대사 음성 패널과 동일 — 엔진·보이스·스타일·감정·미리듣기·트림·들숨 제거). 패널은 슬롯(`QUOTE_SLOT`/`EPITHET_SLOT`)으로 같은 컴포넌트를 공유하며, 읽고 쓰는 인물 필드(`quote*`/`epithet*`)와 음원 파일만 다르다. 합성 설정은 `epithetEngine`·`epithetSpeaker`·`epithetStyle`·`epithetElevenlabsVoiceId`·`epithetEleOptions`·`epithetEleEmotions`·`epithetEleTrail`.

### ELE 보이스 캐스팅

인물별 ElevenLabs 보이스는 BO 음성 설정 모달에서 추천 후보를 먼저 듣고 확정한다. 보이스별 청취 메모와 `좋음`/`보류`/`제외` 판단은 전역 보이스 도감에 저장되며, `제외` 보이스는 다음 추천에서 빠진다. 운영 방식은 `sw/remotion/public/factions/_voice-casting/README.md`를 따른다.

**폴더·파일·작업 단계(아이디어→발주→음성) 규격 SSoT**: `sw/remotion/public/factions/_docs/folder-rules.md` — 신규 시리즈·문서·에셋 경로는 여기만 본다.

## 데이터 모델 (SSoT: `sw/remotion/src/compositions/Faction/types.ts`)

화면에 뜨는 텍스트 명칭은 모두 **하나의 필드 안에 개행으로 앞부분과 뒷부분을 담는 통합 방식**을 따른다. 첫 줄이 앞부분, 둘째 줄부터가 뒷부분이다.

- **영상 명칭** = `title`(+`titleEn`, 편별 `titleByPart`). 첫 줄=앞부분, 둘째 줄부터=뒷부분.
- **세력 명칭** = `name`(+`nameEn`). 앞부분(첫 줄)은 식별용·흰색, 뒷부분은 세력색.
- **단체 명칭** = `label`(+`labelEn`). 앞부분(첫 줄)·뒷부분(둘째 줄)을 한 필드에 담는다.
- **시작문구** = `logline`(+`loglineEn`, 편별 `loglineByPart`). 단일 한 줄, 화면에서 황금색.

```ts
FactionScript { title; titleEn?; titleByPart?; logline?; loglineEn?; loglineByPart?; music?; groups: FactionGroup[] }

FactionGroup {
  name; nameEn?;               // 세력 명칭 (앞부분\n뒷부분)
  tagSlug?;                    // 본서비스 세력도감 연결 키 (celeb_tags.slug). 여러 세력이 한 태그 공유 가능
  color?;
  logoVid?;                    // 영상 로고 (타이틀 카드 풀스크린 배경, logoImg보다 우선)
  logoImg?;                    // 이미지 로고 (logoVid 없을 때 타이틀 카드 + 카드뉴스 표지·소속 배지. 없으면 카드에 "로고 이미지 없음" 결함 표시)
  logoCrop?;                   // 로고 타이틀 카드 표시 맞춤 (위치·확대)
  solo?: boolean;              // 무소속 개인군 — 팀 타이틀·화보 생략
  clusters: FactionCluster[];  // 그룹 목록 (필수, 1개 이상). 안 나눈 세력 = 그룹 1개
}

FactionCluster { label?; labelEn?; image?; people: FactionPerson[] }  // label = 단체 명칭 (앞부분\n뒷부분)

FactionPerson { name; role?; org?; image?; slug? }
```

- **무결성 규칙**: 인물은 항상 `clusters[].people`에 담는다. `group.people`·`group.label`·`group.shotEffects`는 폐지됐다(2026-07 통일 이관 — 안 나눈 세력도 그룹 1개로 저장). 음원 파일명도 항상 그룹 자리 포함 `FxxCxxPxx`(solo 포함).
- **폐기된 필드**: `subtitle`/`subtitleEn`/`subtitleByPart`(→ `title`로 흡수), `tagline`/`taglineEn`(→ `name` 뒷부분으로 흡수), `note`/`noteEn`(→ `label` 뒷부분으로 흡수), `titleArt`/`titleArtCrop`/`logo`(→ `logoVid`/`logoImg`/`logoCrop`으로 분리 이관, 2026-07), `group.image`/`group.imageCrop`(카드 표지 배경 별도 지정 칸 — 로고 이미지와 위계가 같아 폐지, 표지는 logoImg 단일 소스. 2026-07). 통합 전에는 앞부분·뒷부분이 별도 필드였으나 지금은 한 필드 개행으로 합쳤다.
- BO 측 동일 정의: `sw/web-bo/src/lib/faction-types.ts` (구조 동기화 유지). remotion-bo 쪽 사본은 Phase 5에서 삭제됐다.

## 인물 컷 모션 — 진입 효과 · 지속 효과 (두 축, 세로 쇼츠 전용)

인물 컷의 움직임은 **독립된 두 축**이다. 둘은 따로 설정하며 동시에 적용된다.

- **진입 효과 `transition`** — 컷이 **바뀌는 순간**의 모션. 바깥 레이어(`CueLayer`·`CutEnter`)가 담당. 미지정이면 크로스페이드. `slideLeft/slideRight/glitch/tear/crt/zoompunch/whip/filmburn/pixelate/shutter`.
- **지속 효과 `holdMotion`** — 컷이 **떠 있는 동안** 사진에 계속 거는 카메라 움직임(`PersonCard`의 `fxTransform`). 인물→세력→에피소드 계승, **미지정 기본 = `none`(정지)**. `none/zoomin/zoomout/kenburns/panLeft/panRight/zoomPulse/handheld`.
  - 속도·진폭은 `constants.ts`의 `HOLD_*` 상수(컷 길이 무관 정속, 상한 클램프). 1.1초 컷에서도 체감되게 잡았다.
  - 계승 해석은 `utils.ts`의 `resolveHoldMotion`. **레거시 호환**: `holdMotion`이 한 단계도 없고 `transition`이 명시적 zoom류(`zoomin/zoomout/kenburns`, auto가 그 순번에서 zoom으로 풀릴 때 포함)면 그 zoom을 지속 효과로 승계한다(`transition` 미지정 기본값 `zoomout`은 타지 않음 — 신규 인물은 정지로 시작).
- **전역 정지 스위치 `noZoom`** — true면 지속 효과를 전부 무시하고 정지. 떨림 점검·정적 연출용.
- **단체샷도 동일 적용**: 화보 카드(`ClusterCard`)·팀 로고 카드(`GroupCard`)도 같은 지속 효과를 쓴다. 단체샷엔 개인이 없으므로 세력→에피소드만 계승(`resolveGroupHoldMotion`), 미지정이면 정지. 단체샷 이미지는 비율 유지(여백 블러)라 이동(패닝·흔들림)은 `FilledImage`의 `tx`·`ty`로 전달한다. 줌·이동 계산은 인물 컷과 같은 공유 함수(`utils.ts`의 `holdMotionParts`/`holdMotionTransform`).
- **편집(BO)**: 인물·세력·전역 각 드롭다운(`holdMotion.ts` 공유 옵션). 세력 드롭다운 하나가 그 세력의 인물 컷·단체샷을 함께 제어한다. 전역에는 일괄 도구 2개 — **모두 끄기**(개별 설정 제거 + 전역 정지), **전체 통일 덮어쓰기**(개별 제거 + 전역값으로 통일 + `noZoom` 해제).
- (후속) 화면 오버레이(필름 그레인·비네팅·스캔라인 등 `holdOverlay`)는 미구현. 카메라 움직임축만 우선 적용.

## 타이밍 (SSoT: `Faction/timing.ts`)

| 컷 | 길이(초) |
|----|----------|
| 인트로 | 2.5 |
| 팀 타이틀 카드 | 1.8 |
| 화보 카드 | 1.8 |
| 인물 컷 | 1.1 |
| 아웃트로 | 3.0 |
| 크로스페이드 | 0.3 |

FPS 60. 해상도 1080×1920(9:16). 컷마다 시작·길이를 `buildCues()`가 부여한다. 렌더러와 BO 미리보기 타이밍은 같은 정규화 규칙(`clustersOf`)을 따른다.

## 배경음악 (SSoT: `Faction/FactionBgm.tsx`)

세력 단위로 곡을 갈아끼운다. **롱폼과 쇼츠가 서로 다른 곡을 쓴다.**

- **세력 곡** — 세력마다 `musicLongform`(롱폼용)·`musicShorts`(쇼츠용)를 따로 지정한다(음량은 `musicLongformVolume`/`musicShortsVolume`). 세력 진입 시 그 곡으로 크로스페이드(1.2초) 교체하고, 미지정 세력은 직전 곡을 이어간다. 렌더 방향(롱폼/쇼츠)에 맞는 필드만 읽는다.
- **쇼츠 편(part) 분리** — 쇼츠는 편 필터(`buildCues(script, true, part)`)로 그 편 세력만으로 전환점을 잡는다. 편 첫 세력에 `musicShorts`를 걸면 그 편 전체가 그 곡(과거 편별 통짜 곡과 동일 효과).
- **전역 폴백** — 세력 곡이 하나도 없으면 전역 `tracks`(순차·순환) 또는 `music` 한 곡. 세력 곡이 있고 첫 세력만 미지정이면 전역곡으로 시작한다.
- **덕킹** — 대사(voice) 구간엔 `musicDuckVolume`로 낮췄다 복귀한다.
- **폐기됨**: 편별 통짜 곡 `musicByPart`/`musicVolumeByPart`, 세력 공용 곡 `music`/`musicVolume`(→ Longform/Shorts로 분리).

## 경로

**폴더·파일명·단계 상세 SSoT**: `sw/remotion/public/factions/_docs/folder-rules.md`
아래는 엔진이 읽는 최소 트리 요약이다. 신규 작업은 folder-rules만 따른다.

```
sw/remotion/public/factions/<에피소드>/
  faction-data.json   # 렌더용 빌드 산출물 (DB에서 내보낸다 — 직접 편집 금지). data.ko.json / data.json 폐기
  _status.json        # todo | live | done  (BO VALID_STATUSES)
  00-발주서-인덱스.md  # 이미지 착수 시 (스킬 faction-image)
  00-<group-slug>.md  # 세력별 발주서 (또는 NN-slug/00-발주서.md)
  NN-<slug>/          # 세력 폴더 (groups[] 순서 = 01, 02 …)
    _logo.png         # 세력 로고 → group.logoImg
    _logo.mp4         # 선택 → group.logoVid
    <cluster>/        # 1, 2, … (묶음 1개여도 1/ 필수)
      _group.png      # 단체 화보 → cluster.image
      <slug>.png      # 개인샷 → person.image
  _refs/              # 생성용 REF
  voice/              # TTS 산출
  data.timing.pN.ko.json  # 쇼츠 편별 발화 시각
sw/remotion/public/music/  # 배경음악
```

- Remotion 등록: `sw/remotion/src/Root.tsx` Faction Folder. composition id = `Faction-<KEY>`(폴더명 대문자화). `public/factions/*/faction-data.json` 자동 스캔(`Faction/script.ts`).
- **이미지 경로 규칙** (`Faction.tsx`의 `imgSrc`):
  - `http`로 시작 → 외부 URL 그대로
  - 슬래시 포함(폴더 경로, 예 `01-greeks/1/agamemnon.png`) → `factions/<에피소드>/<경로>` 직접
  - basename만(레거시 BO 업로드) → `factions/<에피소드>/images/<basename>` (신규 비권장)
- **세력 폴더 규칙**: `NN-<영문슬러그>/` = `groups[]` 배열 순서와 1:1. 인물·단체 파일명 정본은 folder-rules §3·§8 (`_group.png`, `_logo.png`, `<slug>.png`). 레거시 별칭(`group.png`, `group_shot.png`)은 §12 대응표.

## faction-data.json은 산출물이다 — 직접 편집 금지

텍스트·구성의 단일 원천은 **Supabase 5테이블**이고, `faction-data.json`은 `pnpm faction:export`가 DB에서 만들어 내는 **렌더용 빌드 산출물**이다. 렌더가 webpack 빌드타임에 이 파일을 동기 스캔하는 구조라 DB를 직접 읽을 수 없어서 파일을 남긴다.

- 파일 첫 키에 `_generated {from, at, episodeId, checksum}` 마커가 붙는다(렌더는 미지 키를 무시한다).
- 손으로 고치면 다음 내보내기가 **checksum 불일치로 중단하고 diff를 뿜는다.** `--force`로만 강행된다.
- 내보내기 전 원본은 `.export-backup/<시각>/`에 남는다(git 미추적이라 필수).
- 수정은 web-bo `/factions` 편집 화면에서 한다. 이미 손으로 고쳐 버렸다면 `pnpm faction:import -- --episode <편>`으로 DB에 재흡수하되, **반대 방향으로 덮어쓸 위험이 있으므로 사람이 판단해 실행한다**(임의 실행 금지).
- 상시 감시는 `pnpm faction:verify`(`--all` / `--episode <편>` / `--drift`).

## 코드 위치

| 영역 | 경로 |
|------|------|
| **텍스트·구성 원천(DB)** | Supabase 5테이블 — `faction_episodes` · `faction_groups` · `faction_clusters` · `faction_people` · `faction_episode_parts` |
| 조립·분해 | `packages/shared/src/lib/faction-schema.ts`(핫 필드 split/join) · `faction-assemble.ts`(DB 행 ↔ FactionScript) |
| 내보내기 | `packages/shared/src/bo/faction-export.ts` + CLI `sw/remotion/scripts/faction/{import,export,verify}.ts` (`pnpm faction:import|export|verify`) |
| 편집 화면 | `sw/web-bo/src/app/(admin)/factions/` + `sw/web-bo/src/components/factions/` |
| 서버 액션 | `sw/web-bo/src/actions/admin/factions/{episodes,script,export,publish}.ts` |
| 로컬 자산 창구 | `sw/web-bo/src/app/api/faction/**` (사진·음성·작업 — `FACTION_LOCAL=1` 없으면 503) |
| 본서비스 출간(DB·R2) | `sw/web-bo/src/lib/faction-sync/` + `actions/admin/factions/publish.ts` + `components/factions/FactionPublishPanel.tsx` |
| 영상 컴포지션 | `sw/remotion/src/compositions/Faction/` (Faction.tsx · types.ts · timing.ts · script.ts) — 무수정, `faction-data.json` 소비자 |
| 미리보기 타이밍 | `sw/web-bo/src/components/factions/shared/timing.ts` |
| ~~remotion-bo 팩션 구역~~ | **폐기(26.07.25 Phase 5)** — 편집·렌더·유튜브·카드·출간 전부 삭제. 팩션 주소·창구는 404다. 담화·서재 탐방만 remotion-bo에 남는다 |

통합 설계 SSoT는 `docs/project/remotion/faction-unification.md`다(§4 경계 · §6 내보내기 · §7 음성 길이 · §8 web-bo 이식 · §9 폐기).

## 편집 화면 (web-bo, `FactionEditor.tsx`)

주소는 **web-bo(포트 3001)** 의 `/factions`(편 목록)·`/factions/<편>/<언어>/<탭>`(편집기)다. 사이드바 「세력도」로 들어간다. 언어는 `ko|en|both`, 탭은 `info|shorts|longform`이며 `/factions/<편>`으로 들어오면 `ko/info`로 보낸다.

**로컬 실행이 전제다** — 사진·음성·발화 시각·렌더 산출물은 `sw/remotion/` 디스크에 있으므로 팩션 로컬 자산 창구(`api/faction/**`)는 `sw/web-bo/.env`의 `FACTION_LOCAL=1`이 없으면 503과 사유를 낸다. 렌더 저장소를 다른 자리에 두려면 `REMOTION_ROOT`로 옮긴다.

편집기 상단 탭은 **정비 / 편성**이고, 편성은 하위에 **쇼츠 · 롱폼**을 둔다.

- **정비 탭**(`info`) — 세력·인물의 실체(이름·이력·대사·음성·컷 효과)와 전역 설정(영상 명칭·시작문구·intro/outro·전역 배경음악·덕킹·효과음·움직임 효과 기본값). 세력은 배열 순서로 전체 평면 나열(활성 + 「재료」 접이식으로 영상 제외 세력).
- **편성 > 쇼츠**(`shorts`) — 사용자가 지정하는 `shortsPartCount` + 편별 영상 명칭·시작문구·통합화면 + 세력의 편 배정·편 안 순서 + **세력별 쇼츠 곡**. 편수 조절기 또는 세력 배정 드롭다운의 `+ 다음 편 추가`로 N편을 늘린다.
- **편성 > 롱폼**(`longform`) — `FactionLongformPanel`: 세력 순서 + 시대 문구 카드 + **편 경계(롱폼 편 분할)** + **세력별 롱폼 곡**.

편 배정(`part`)·순서·배경음악 전환은 편성 탭에서(곡 전환은 영상 흐름의 문제라 각 맥락에 둔다), 세력·인물 내용은 정비 탭에서 다룬다. 편성 탭에서 세력 이름을 누르면 정비 탭의 그 세력 카드로 이동한다. 곡 선택 UI는 공용 `shared/FactionMusicPicker.tsx`.

저장은 전체 스크립트를 서버 액션 `saveFactionScript`로 한 번에 한다(부분 저장 없음). DB 쓰기는 원자 RPC 하나로 묶이고, 기준 시각이 어긋나면 거부한다. 저장 직후 `faction-data.json` 내보내기가 자동으로 따라 붙는다. 헤더 「출간」 버튼은 세력도감 반영 패널을, 「렌더」·「유튜브」는 각각 렌더·업로드 창구를 연다.

## 제작 워크플로우

텍스트·구성은 DB가 원천이고 사진·음성·발화 시각은 로컬 디스크에 남는다. 그래서 손대는 자리가 단계마다 갈린다 — 각 단계에 **어디서 하는 일인가**를 붙였다.

1. **기획·명단** — *어디서: 조사·웹 검색, 셀럽 파이프라인(web-bo `/celebs`).*
   진영별로 인물을 추리고 현직 여부를 웹으로 교차 확인한다(편성 원칙 1). 미등록 인물은 티어를 나눠 먼저 등록한다. 동명이인 주의. 티어 기준(상세 `docs/project/celeb/celeb-pipeline.md`):
   - 감상 기록이 있을 만한 실존 인물 → `light`(콘텐츠 확보 시 `full` 승격)
   - 관계 때문에 나오는 단순 실존 인물 → `relation`(basic 최소)
   - **신화·전설·허구 속 존재**(신·영웅·괴물·서사 속 집단) → `fiction`(basic 최소, 실존 아님). 스킬 `fiction-profile-monologue`로 기본 정보와 `profiles.virtual_monologue`를 먼저 완성한다. 얼굴은 없어도 된다. 인물 데이터에는 `mythical: true`를 함께 박는다.

   등록 여부·티어는 편집기 인물 행 배지로 확인한다: **✓ DB**(실존 등록·연결) / **⚠ 없음**(키는 있는데 DB 부재) / **미연결**(키 없음) / **신화**(fiction, `mythical` 플래그 — DB 연결 시 초록).
2. **편 만들기·구성 입력** — *어디서: web-bo `/factions`(편 생성) → `/factions/<편>/ko/info` 정비 탭. 쓰는 곳은 DB다.*
   세력 명칭·단체 명칭·인물·이력 줄(`lines`)·solo를 채운다. 인물은 항상 묶음(cluster) 아래에 담는다. 세력마다 세력도감 연결 키(`tagSlug`)를 함께 지정해 두면 9단계 출간이 막히지 않는다.
3. **사진 발주·배치** — *어디서: 발주서 `sw/remotion/public/factions/<편>/*.md` + 편집기 사진 풀. 파일은 로컬.*
   스킬 `faction-image` + `00-발주서-*.md`. **단체샷 승인 → 크롭(`<slug>-crop`) → 개인샷(`<slug>.png`)** 순서(folder-rules §8). `person-prompts.md`/`group-prompts.md` 신규 금지. 파일을 세력 폴더 정본 경로에 두고 `logoImg` / `clusters[].image` / `people[].image`를 실제 파일과 동일 문자열로 맞춘다(유저 승인 후).
4. **대사·수식어 작성** — *어디서: 편집기 정비 탭 인물 행. 쓰는 곳은 DB다.*
   대사(`quote`)·자막 덩어리(`quoteChunks`)·수식어(`epithet`)를 채운다. fiction 인물 대사는 본 서비스 가상 독백에서 핵심 갈등 하나를 압축해 만들며, 독백에 없는 철학을 새로 붙이지 않는다. 어록 출처는 `quoteOrigin`·`minedQuotes`.
   검토는 스킬 `faction-dialogue-review`. 작성·수정은 완성이 아니라 새 판이다. 현재 문장에서 검토 렌즈를 4~7개 새로 만들고, 최소 3개로 따로 읽은 뒤 수정한다. 수정안은 이전 평가를 보지 않는 새 순환을 한 번 더 거친다. 두 순환을 통과해야 승인 후보이며, 최종 승인은 사용자만 한다. 이력은 `_docs/dialogue-review/`에 둔다.
5. **음성 합성** — *어디서: 터미널 `pnpm voice:faction`. 산출물은 `<편>/voice/`(로컬).*
   유저가 명시적으로 요청할 때만 돌린다(`gotchas.md` §6).
6. **받아쓰기·발화 시각** — *어디서: 스킬 `/faction-voice-sync`(WhisperX + `pnpm voice:faction-align`). 산출물은 `data.timing.pN.<언어>.json`(로컬), 음성 길이는 DB.*
   이어서 `pnpm faction:durations-pull`로 wav 실측 길이를 DB에 반영한다. 음성 길이(`quoteDuration`·`epithetDuration`)는 **음성 파이프라인 소유**라 사람이 입력하는 칸이 없다 — DB에 값이 있으면 편집기 저장이 덮지 않는다.
7. **내보내기** — *어디서: 편집기 저장 시 자동. 수동은 터미널 `pnpm faction:export`.*
   DB를 읽어 `faction-data.json`(+`_episodes.json`)을 다시 만든다. 렌더·자막·유튜브·음성 파이프라인은 전부 이 파일을 읽으므로, DB만 고치고 내보내기를 건너뛰면 영상에 반영되지 않는다.
8. **렌더·자막·썸네일** — *어디서: 편집기 「렌더」 버튼, 또는 Remotion Studio에서 `Faction-<KEY>` 확인 후 직접.*
   「렌더」 버튼은 세 영상(`out/Faction/{ep}-KO-LV.mp4`·`-KO-S1.mp4`·`-KO-S2.mp4`)과 자막 3종(`.srt`)을 함께 만든다. 컴포지션 ID는 `Faction-<KEY>-KO-LV`·`-KO-S1`·`-KO-S2`. 렌더 직전에 파일을 DB와 맞추는 내보내기가 한 번 더 돈다.
9. **유튜브 업로드 · 세력도감 출간** — *어디서: 편집기 헤더의 「유튜브」·「출간」 패널.*
   유튜브는 아래 「유튜브 업로드」 절 참조. 출간은 세력도감(DB `celeb_tags`·`celeb_tag_assignments` + R2 이미지)에 반영한다 — 진단으로 막힌 항목을 확인하고, 미리보기(dry-run)로 변경 예정을 본 뒤 출간한다. 소개문은 채움 전용(도감에서 사람이 다듬은 글을 덮지 않음), 이미지는 해시 기반 멱등 업로드, 출간할 때만 운영 웹 캐시를 무효화한다. **상세는 `docs/project/web-bo.md` 「세력도」 절, 설계 SSoT는 `faction-unification.md` §4·§9.**

## 자막(SRT)

`pnpm faction:srt -- --episode <ep>` (BO 「렌더」 버튼에도 통합). 빌더는 `scripts/srt/faction-srt.ts`.

- 인물 대사 컷(voice·text)마다 자막 1개. 직함만(credit) 컷은 대사가 없어 제외.
- 타이밍은 `timing.ts`의 `buildCues` 와 동일 산식 → 영상과 드리프트 없음. 자막 텍스트는 화면 표기와 같게 `quoteChunks`(없으면 `quote`).
- 출력 `out/Faction/{ep}-{KO-LV|KO-SN}.srt`. 업로드 시 같은 이름의 `.srt` 를 자동으로 함께 올린다.

## 영상 종류 (SSoT: `factionVariants`)

컴포지션 ID·출력 파일 접미사·업로드 variant·상태 조회는 모두 `packages/shared/src/lib/youtube-faction-meta.ts`의 `factionVariants(groups, longformLayout)` 한 곳을 참조한다. Root.tsx 등록과 반드시 일치시킨다.

| variant key | 영상 | 컴포지션/출력 접미사 | 편 |
|---|---|---|---|
| `ko-longform` | 세로 롱폼(통짜, 편 경계 없을 때) | `KO-LV` | — |
| `ko-longform-N` | 세로 롱폼 N편(편 경계 있을 때) | `KO-LVN` | 롱폼 편(lvPart) N |
| `ko-shorts-N` | 세로 쇼츠 N편 | `KO-SN` | 쇼츠 편(part) N |

- **쇼츠 편(part)** — BO에서 `shortsPartCount`를 1…N으로 정하고 진영의 `part`를 배정한다. `part` 미지정/0 진영은 모든 편 공통. 편별 영상 명칭은 `titleByPart`, 편별 시작문구는 `loglineByPart`, 대표 인물은 `heroesByPart`. 렌더·자막·업로드 대상은 실제로 배정된 양수 `part`에서 동적으로 파생한다.
- **롱폼 편(lvPart)** — 롱폼 배치(`longformLayout`)에 꽂은 **편 경계(`{cut:true}`)**로 갈린다. 경계 n개 → 롱폼 n+1편(KO-LV1·KO-LV2…), 경계가 없으면 기존 통짜 KO-LV 하나. 각 편은 자체 인트로·아웃트로를 갖고, 시대 문구 카드는 자기 구간의 편에 속한다. 배치에 빠진 활성 세력은 마지막 편에 붙는다. 편별 영상 명칭은 `titleByLvPart`, 시작문구는 `loglineByLvPart`, 대표 인물은 `heroesByLvPart`(미지정이면 공통값). 유튜브 제목은 편별 명칭이 없으면 `(N부)`를 덧붙여 중복을 막는다. 쇼츠 `part`와는 완전히 독립된 축이다.
- 가로(LH)·영문(EN)은 렌더가 켜지면 이 표에 추가한다.

## 유튜브 업로드

**한국어 세로 롱폼 + 편성된 쇼츠 N편**(위 표)을 서재 탐방과 **같은 채널(KO)에 비공개**로 올린다.

### 구성 요소
- **메타 생성(SSoT)**: `packages/shared/src/lib/youtube-faction-meta.ts` — 제목/설명/태그. 서재 탐방의 책 기반 빌더와 분리. 쇼츠는 편(part)별로 영상 명칭(`titleByPart`)·등장 진영·대표 인물이 갈린다. 인물 태그는 한국어 영상 = 국문명 + 영문명, 영문 영상 = 영문명만. heroes 우선, 태그 총량 500자 예산. 진영 구분자는 한국어 가운뎃점·영문 em dash.
- **업로드 실행기**: `sw/remotion/scripts/youtube/youtube-faction.ts` — 데이터 로드(`public/factions/{ep}/faction-data.json`) → variant별 `out/Faction/{ep}-{접미사}.mp4` 업로드 → 기록 저장. 공통 인프라(OAuth·영상/자막/썸네일 업로드)는 `youtube-core.ts` 공유.
- **CLI 분기**: `youtube-upload.ts` 가 `--series faction` 이면 위 진입점으로 위임.
- **업로드 기록**: `sw/remotion/scripts/youtube/faction-lineup.json` (서재 탐방의 `youtube-lineup.json` 과 별개).
- **인증 토큰**: 서재 탐방 것 공유(`credentials/youtube_token.json`). 추가 인증 불필요.
- **관리 화면**: web-bo 편집기 「유튜브」 토글 → `FactionYouTubePanel`. 업로드 상태·개별/전체 업로드·메타 미리보기·메타 반영·기록 삭제. 창구는 web-bo `api/faction/youtube/{status,upload,sync}`. 렌더도 `api/faction/render`가 `factionVariants` 기준으로 현재 편성된 종류를 동적으로 건다. 두 창구 모두 스크립트를 돌리기 직전에 파일을 DB와 맞추는 내보내기를 한 번 거친다.

### CLI
```bash
# 미리보기 (실제 업로드·인증 없이 제목·설명·태그 확인)
pnpm youtube:upload -- --episode 01-llm --series faction --dry
# 업로드 (현재 편성 전체 / 롱폼만 / 쇼츠 N편만)
pnpm youtube:upload -- --episode 01-llm --series faction
pnpm youtube:upload -- --episode 01-llm --series faction --type longform
pnpm youtube:upload -- --episode 01-llm --series faction --type shorts
# 업로드된 영상의 제목·설명·태그만 다시 반영
pnpm youtube:patch-meta -- --episode 01-llm --series faction
```
