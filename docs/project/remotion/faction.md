# 팩션(Faction) — 세력도 시리즈

AI·기술 분야의 주요 인물을 **진영(세력)별로 묶어 보여주는 세로 영상** 시리즈. 무대사·무자막 음성 없이, 고정 길이 컷의 시간순 나열로 구성한다. 첫 에피소드는 `llm` — "AI를 만드는 사람들".

## 컨셉

- 한 에피소드 = 한 분야(예: LLM). 분야 안에 「세력(팀/기업)」 여러 개, 세력마다 「인물」 여러 명.
- 톤: 어둡고 시네마틱한 저조도 + 강한 명암. 팀 영웅/패밀리 화보 무드(PayPal 마피아 / 매트릭스 / 블레이드). 음악은 badass.
- 인물 표기 = 직함(한글) + 이름 + **강렬한 영어 별칭 한 줄**(epithet). 예: OpenAI / 샘 알트만 / CEO / "the herald of the machine age".

## 영상 흐름

```
인트로(타이틀)
 → 세력마다:
     solo 세력:   [인물 컷들]만 (팀 타이틀·화보 없음)
     일반 세력:   [팀 타이틀 카드]
                  화보 묶음마다: [화보 카드 → 그 묶음 인물 컷들]
                  (clusters 없는 팀도 단일 묶음으로 정규화 — 화보 카드는 항상 1장 이상)
 → 아웃트로(로고)
```

- **인물 컷**: 영화 포스터식. 시네마틱 인물 이미지가 화면을 가득 채우고(켄번스 줌), 하단 어두운 그라데이션 위에 직함 + 이름(순백) + 별칭(팀색 이탤릭)을 얹는다. 이미지가 없으면 이니셜.
- **팀 타이틀 카드**: 로고 컨셉아트(`titleArt`)를 풀스크린 배경으로 깔고 그 위에 세력명 + tagline. 회사 등장 직전 진입(브릿지) 비주얼. titleArt가 없으면 색 그라데이션 배경.
- **화보 카드**: 팀 그룹샷 이미지(`cluster.image` 또는 `group.image`) + 세력명 + 묶음 소제목(label). 이미지가 없으면 **"TEAM SHOT (이미지 없음)" 플레이스홀더 박스**로 화보 자리를 표시한다.

## 편성 원칙

1. **현직 기준** — 인물은 그 세력의 현직자만 싣는다(에피소드 기준 시점). 이탈자는 제외하거나 현 소속으로 옮긴다. 변동이 잦은 영역이므로 등재 전 웹으로 현직 여부를 교차 확인한다.
2. **화보 묶음(`clusters`)** — 인원이 많은 세력은 한 화보에 몰지 않고 여러 묶음으로 나눈다. 팀 타이틀은 1회만 뜨고, 묶음마다 화보 카드 + 인물 컷이 이어진다. (예: Google DeepMind = 「창업자」 + 「딥마인드」)
3. **모든 일반 세력에 화보 자리** — clusters가 없는 팀도 단일 화보 묶음으로 정규화되어 화보 카드 구간을 갖는다. 화보 이미지가 아직 없으면 플레이스홀더가 뜬다. (1명뿐인 팀·solo는 화보 없이 개인 컷)
4. **독립(`solo`)** — 무소속 개인들의 모음(예: 재야)은 팀이 아니다. `solo: true`면 팀 타이틀·화보를 생략하고 인물 컷만 노출한다.
5. **인물 사진** — 본서비스(셀럽 DB) 아바타(`avatar_url`, R2 URL)는 임시 표시용이고, 최종은 vanity 시네마틱 개인샷으로 교체한다. 에피소드 폴더의 로컬 이미지(폴더 경로·basename)로 연결한다.
6. **설명(`lines`)** — 한글 최대 3줄(영어 `linesEn` 분리). 작성·표시 원칙은 아래 「인물 문구 작성 원칙」을 따른다. (구버전 `epithet` 한 줄 별칭은 폐기)

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

## 데이터 모델 (SSoT: `sw/remotion/src/compositions/Faction/types.ts`)

```ts
FactionScript { title; subtitle?; music?; groups: FactionGroup[] }

FactionGroup {
  name; tagline?; color?; logo?;
  image?;                      // clusters 없는 팀의 전체 화보 (화보 카드에 표시)
  titleArt?;                   // 로고 컨셉아트 (타이틀 카드 풀스크린 배경)
  solo?: boolean;              // 무소속 개인군 — 팀 타이틀·화보 생략
  clusters?: FactionCluster[]; // 있으면 화보 묶음별로 분할 노출 (이때 people은 비움)
  people: FactionPerson[];     // clusters 없을 때 사용
}

FactionCluster { label?; image?; people: FactionPerson[] }

FactionPerson { name; role?; epithet?; org?; image?; slug? }
```

- **무결성 규칙**: clusters와 people이 동시에 차 있으면 안 된다. clusters가 있으면 인물은 각 cluster.people에 두고 group.people은 빈 배열. (렌더러가 clusters 우선이라 people에 든 인물은 영상에 안 나오는 유령이 됨.)
- BO 측 동일 정의: `sw/remotion-bo/src/lib/faction-types.ts` (구조 동기화 유지).

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

## 경로

```
sw/remotion/public/factions/<에피소드>/
  data.ko.json        # FactionScript (SSoT 데이터)
  _status.json        # 진행 상태 todo|live|done
  person-prompts.md   # 개인샷 프롬프트 (REF 아바타 → 시네마틱 변환, 비율 미지정)
  group-prompts.md    # 그룹샷(화보) 프롬프트 (개인샷 합성, 화보 단위)
  NN-<slug>/          # 팀 vanity 폴더 (예: '01-pioneers/앨런 튜링.webp', '02-google-deepmind/_founders.png')
  _refs/              # 개인샷 생성용 REF 아바타 (<인물명>.webp)
  images/             # BO 업로드 이미지 (basename 참조)
sw/remotion/public/music/  # 배경음악
```

- Remotion 등록: `sw/remotion/src/Root.tsx` Faction Folder. composition id = `Faction-<KEY>`(폴더명 대문자화). `public/factions/*/data.{ko|en}.json` 자동 스캔(`Faction/script.ts`).
- **이미지 경로 규칙** (`Faction.tsx`의 `imgSrc`):
  - `http`로 시작 → 외부 URL 그대로
  - 슬래시 포함(폴더 경로, 예 `1/앨런 튜링.webp`) → `factions/<에피소드>/<경로>` 직접
  - basename(예 `logo.png`) → `factions/<에피소드>/images/<basename>` (BO 업로드 호환)
- **vanity 폴더 규칙**: 팀 폴더는 `NN-<영문슬러그>/`(영상 순서, 매핑은 `person-prompts.md` 팀 폴더표). 인물샷 `NN-slug/<인물명>.png`, 단일 팀 화보 `NN-slug/_group.png`, 구글 묶음 화보 `02-google-deepmind/_founders.png`·`_deepmind.png`. 개인샷 생성용 REF 아바타는 `_refs/<인물명>.webp`.

## 코드 위치

| 영역 | 경로 |
|------|------|
| 영상 컴포지션 | `sw/remotion/src/compositions/Faction/` (Faction.tsx · types.ts · timing.ts · script.ts) |
| 데이터 I/O(서버) | `sw/remotion-bo/src/lib/faction-utils.ts` |
| 편집 UI | `sw/remotion-bo/src/components/faction/` (별칭·solo·화보 묶음 단일/분할 전환·팀 화보 편집, 미리보기 렌더 일치) |
| API 라우트 | `sw/remotion-bo/src/app/api/[series]/faction-*` |
| 미리보기 타이밍 | `sw/remotion-bo/src/components/faction/timing.ts` |

## 제작 워크플로우

1. **인물 선정** — 진영별로 추리고, 현직 여부를 웹으로 검증한다.
2. **본서비스 확보** — 미등록 인물은 셀럽으로 신규 등록(celeb-1) 후 아바타 자동수집(`sw/web-bo/scripts/upload-celeb-image-from-url.ts` 또는 `batch-celeb-wikimedia-avatars.ts`). 동명이인 주의 — 수집 후 얼굴을 육안 검증한다.
3. **데이터 작성** — `data.ko.json`에 세력·묶음·인물·별칭·solo를 채운다(BO 편집기 또는 직접).
4. **개인샷** — `person-prompts.md`의 인물별 프롬프트로, 각 인물 아바타를 REF로 넣어 시네마틱 개인샷을 생성한다(Gemini). 자세·복식이 그 팀 그룹샷 컨셉과 맞물리게 설계돼 있다.
5. **그룹샷** — `group-prompts.md`의 화보 단위 프롬프트로, 개인샷들을 합성해 그룹 화보를 만든다.
6. **이미지 연결** — vanity 폴더에 규칙대로 넣거나 BO 편집기에서 인물·화보 이미지를 지정한다.
7. **렌더** — Remotion Studio에서 `Faction-<KEY>` 확인 후 렌더. BO 편집기 「렌더」 버튼은 세 영상(`out/Faction/{ep}-KO-LV.mp4`·`-KO-S1.mp4`·`-KO-S2.mp4`)과 자막 3종(`.srt`)을 함께 만든다. 컴포지션 ID는 `Faction-<KEY>-KO-LV`·`-KO-S1`·`-KO-S2`.
8. **유튜브 업로드** — 아래 참조.

## 자막(SRT)

`pnpm faction:srt -- --episode <ep>` (BO 「렌더」 버튼에도 통합). 빌더는 `scripts/srt/faction-srt.ts`.

- 인물 대사 컷(voice·text)마다 자막 1개. 직함만(credit) 컷은 대사가 없어 제외.
- 타이밍은 `timing.ts`의 `buildCues` 와 동일 산식 → 영상과 드리프트 없음. 자막 텍스트는 화면 표기와 같게 `quoteChunks`(없으면 `quote`).
- 출력 `out/Faction/{ep}-{KO-LV|KO-S1|KO-S2}.srt`. 업로드 시 같은 이름의 `.srt` 를 자동으로 함께 올린다.

## 영상 종류 (SSoT: `FACTION_VARIANTS`)

컴포지션 ID·출력 파일 접미사·업로드 variant·상태 조회는 모두 `packages/shared/src/lib/youtube-faction-meta.ts`의 `FACTION_VARIANTS` 한 곳을 참조한다. Root.tsx 등록과 반드시 일치시킨다.

| variant key | 영상 | 컴포지션/출력 접미사 | 쇼츠 편(part) |
|---|---|---|---|
| `ko-longform` | 세로 롱폼(전체 세력) | `KO-LV` | — |
| `ko-shorts-1` | 세로 쇼츠 1편 | `KO-S1` | 1 |
| `ko-shorts-2` | 세로 쇼츠 2편 | `KO-S2` | 2 |

쇼츠는 진영의 `part`(1·2)로 갈린다. `part` 미지정/0 진영은 모든 편 공통. 편별 부제는 `subtitleByPart`, 대표 인물은 `heroesByPart`. 가로(LH)·영문(EN)은 렌더가 켜지면 이 표에 추가한다.

## 유튜브 업로드

**한국어 세로 영상 3종**(위 표)을 서재 탐방과 **같은 채널(KO)에 비공개**로 올린다.

### 구성 요소
- **메타 생성(SSoT)**: `packages/shared/src/lib/youtube-faction-meta.ts` — 제목/설명/태그. 서재 탐방의 책 기반 빌더와 분리. 쇼츠는 편(part)별로 제목 부제·등장 진영·대표 인물이 갈린다. 인물 태그는 한국어 영상 = 국문명 + 영문명, 영문 영상 = 영문명만. heroes 우선, 태그 총량 500자 예산. 진영 구분자는 한국어 가운뎃점·영문 em dash.
- **업로드 실행기**: `sw/remotion/scripts/youtube/youtube-faction.ts` — 데이터 로드(`public/factions/{ep}/data.json`) → variant별 `out/Faction/{ep}-{접미사}.mp4` 업로드 → 기록 저장. 공통 인프라(OAuth·영상/자막/썸네일 업로드)는 `youtube-core.ts` 공유.
- **CLI 분기**: `youtube-upload.ts` 가 `--series faction` 이면 위 진입점으로 위임.
- **업로드 기록**: `sw/remotion/scripts/youtube/faction-lineup.json` (서재 탐방의 `youtube-lineup.json` 과 별개).
- **인증 토큰**: 서재 탐방 것 공유(`credentials/youtube_token.json`). 추가 인증 불필요.
- **관리 화면**: BO 편집기 「유튜브」 토글 → `FactionYouTubePanel`. 업로드 상태·개별/전체 업로드·메타 미리보기·메타 반영·기록 삭제. API는 `/api/faction/youtube/{status,upload,sync}` (각 라우트에 세력도 분기). 렌더도 `/api/faction/render` 가 `FACTION_VARIANTS` 기준으로 3종을 건다.

### CLI
```bash
# 미리보기 (실제 업로드·인증 없이 제목·설명·태그 확인)
pnpm youtube:upload -- --episode 01-llm --series faction --dry
# 업로드 (3종 모두 / 롱폼만 / 쇼츠 1·2편만)
pnpm youtube:upload -- --episode 01-llm --series faction
pnpm youtube:upload -- --episode 01-llm --series faction --type longform
pnpm youtube:upload -- --episode 01-llm --series faction --type shorts
# 업로드된 영상의 제목·설명·태그만 다시 반영
pnpm youtube:patch-meta -- --episode 01-llm --series faction
```
