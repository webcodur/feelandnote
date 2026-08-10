# 삼국지 인물 그룹 — SSoT

후한 말 ~ 삼국 시대 인물을 묶어 관리하는 인덱스 문서. 시리즈와 직교하는 인물 그룹 축이다.

- **book-recommend**(서재 탐방): 삼국지 인물이 개별 에피소드로 등장한다. **현재 이 명단을 쓰는 유일한 시리즈다.** 인물 폴더 `sw/remotion/public/episodes/three-kingdoms/<slug>/`, 컴포지션 `BookRecommend`.

> 「저승 술집(hell-bar)」은 폐기됐다(2026-07-16). 삼국지 인물 페어 매치 전용 시리즈로 기획됐으나 구현된 적이 없다(컴포지션·데이터 전무). 기획 보존본은 `docs/archive/hell-bar/README.md`. 인물끼리 사상을 부딪치는 자리는 「가상 담화」(`discourse.md`)가 대신하며, 담화는 2026-07-16 기준 삼국지 인물을 아직 쓰지 않는다(`qin-shi-huang`·`musk-altman` 2편).

본 문서가 명단의 단일원천이며, 시리즈별 진행 상태는 각 시리즈 lineup 문서가 관리한다. 명단은 시리즈와 직교하므로 담화 등 다른 시리즈가 같은 슬러그를 쓰게 되면 위 목록에 행을 추가한다.

## 슬러그 명단

코드 SSoT: `packages/shared/src/lib/three-kingdoms.ts`. 인물 폴더 SSoT: `sw/remotion/public/episodes/three-kingdoms/`. 추가·제거 시 양쪽 동시 갱신.

명단은 DB(`celebs`)에 등록되고 그룹 폴더에 존재하며 감상 콘텐츠(`celeb_contents`)가 1건 이상인 인물 22명. 생몰 순.

| 슬러그 | 한국어 | 생몰 | 칭호 | 진영·분류 |
|--------|--------|------|------|----------|
| `zhang-zhongjing` | 장중경 | 150-219 | 의성 | 의학 |
| `kong-rong` | 공융 | 153-208 | 건안칠자 | 후한·문인 |
| `cao-cao` | 조조 | 155-220 | 위왕 | 위 |
| `guan-yu` | 관우 | 160-219 | 관성제군 | 촉 |
| `liu-bei` | 유비 | 161-223 | — | 촉 |
| `xun-yu` | 순욱 | 163-212 | 왕좌지재 | 조조 책사 |
| `lu-su` | 노숙 | 172-217 | 천하이분지계 | 오 |
| `zhou-yu` | 주유 | 175-210 | 적벽의 도독 | 오 |
| `cai-wenji` | 채염 | 177-249 | 호가십팔박 | 여류 시인 |
| `lu-meng` | 여몽 | 178-220 | 오하아몽 | 오 |
| `sima-yi` | 사마의 | 179-251 | 중달 | 위·진 |
| `zhuge-liang` | 제갈량 | 181-234 | 와룡 | 촉 |
| `sun-quan` | 손권 | 182-252 | 오나라 창립자 | 오 |
| `lu-xun` | 육손 | 183-245 | 이릉의 화공 | 오 |
| `cao-pi` | 조비 | 187-226 | 전론 | 위·황제 |
| `cao-zhi` | 조식 | 192-232 | 칠보시 | 위·시인 |
| `deng-ai` | 등애 | 197-264 | 촉을 무너뜨린 위의 칼 | 위 |
| `jiang-wei` | 강유 | 202-264 | 촉한 마지막 명장 | 촉 |
| `ruan-ji` | 완적 | 210-263 | 영회시 | 죽림칠현 |
| `ji-kang` | 혜강 | 223-262 | 광릉산 | 죽림칠현 |
| `wang-bi` | 왕필 | 226-249 | 득의망상 | 현학 |
| `chen-shou` | 진수 | 233-297 | 「삼국지」 저자 | 사가 |

> 2026-05 보충: `lu-su`·`zhou-yu`·`deng-ai` 사료 조사로 현재 `celeb_contents`에 이관된 감상 관계를 등록 완료(노숙 3권, 주유 3권, 등애 2권). 명단·폴더·코드 SSoT 모두 갱신.
> 마속·위연·장비·조운 등은 DB 미등록이라 명단에서 제외. 등록 시점에 추가. (폐기된 hell-bar 기획서에 페어 후보로 적혀 있던 인물들이다 — `docs/archive/hell-bar/README.md`)
> `yi-sun-sin`(이순신)은 조선 인물이라 삼국지 그룹에 포함하지 않는다.

## 진행 상태 (시리즈 무관 합산)

인물 폴더는 `sw/remotion/public/episodes/three-kingdoms/<slug>/`. 진척도는 각 폴더 안 `_status` 파일이 SSoT다.

| 슬러그 | `_status` | ko.json | 비고 |
|--------|-----------|---------|------|
| `zhuge-liang` | live | ✓ | 쇼츠 3개 업로드 |
| `sima-yi` | live | ✓ | |
| `cao-cao` | live | ✓ | |
| `guan-yu` | todo | ✓ | |
| `xun-yu` | todo | ✓ | pre-todo에서 승격 |
| `kong-rong` | todo | ✓ | pre-todo에서 승격 |
| `ji-kang` | todo | ✓ | pre-todo에서 승격 |
| `ruan-ji` | todo | ✓ | pre-todo에서 승격 |
| `zhang-zhongjing` | todo | ✓ | pre-todo에서 승격 |
| `lu-su`·`zhou-yu`·`deng-ai` | todo | — | 2026-05 사료 조사 후 현재 `celeb_contents`에 이관된 관계 등록. ko.json 미작성 |
| `liu-bei`·`sun-quan`·`lu-meng`·`lu-xun`·`cao-pi`·`cao-zhi`·`jiang-wei`·`cai-wenji`·`wang-bi`·`chen-shou` | todo | — | 빈 폴더 + `_status`만 (DB 스캐폴딩 대기) |

상세 편성 순서는 `book-recommend/lineup/lineup.md`를 본다.

## 유튜브 메타 시그널 규약

본 명단에 속하는 슬러그는 업로드·메타 패치 시 다음 시그널이 **자동 부착**된다. 호출자가 따로 챙길 필요 없다.

| 위치 | 한국어 | 영문 |
|------|--------|------|
| `tags` 배열 | `삼국지`, `삼국지인물` | `ThreeKingdoms`, `RomanceOfTheThreeKingdoms` |
| `description` 해시태그 줄 | `#삼국지` | `#ThreeKingdoms` |

자동 부착 지점은 `packages/shared/src/lib/youtube-meta.ts`의 `buildTags`·`buildDescription` 두 함수. 호출처에서 `celebSlug`(= 폴더 슬러그)만 정확히 전달하면 작동한다.

### 영향받는 호출 경로

- `sw/remotion/scripts/youtube/youtube-upload.ts` — `pnpm youtube:upload`, `pnpm youtube:patch-meta`
- `sw/web-bo/src/app/api/[series]/youtube/sync/route.ts` — BO 대시보드의 YouTube 동기화

기존 업로드된 영상에 시그널을 소급 적용하려면 `pnpm youtube:patch-meta -- --episode <slug>` 실행. 영상 파일은 그대로 두고 제목·설명·태그만 갱신한다.

## 갱신 절차

새 인물 추가 시:

1. `packages/shared/src/lib/three-kingdoms.ts`의 `THREE_KINGDOMS_MEMBERS` 배열에 슬러그 추가 (알파벳 순 유지)
2. 본 문서의 슬러그 명단 표에 행 추가
3. 해당 인물의 기존 업로드가 있다면 `pnpm youtube:patch-meta -- --episode <slug>`로 메타 갱신

제거 시 같은 순서를 역으로 수행. 단, 이미 업로드된 영상의 시그널이 자동 제거되지는 않으므로 patch-meta 한 번 더 돈다.

## 클로드 스킬

`/three-kingdoms` — 본 문서와 코드 roster를 일관되게 유지·점검하는 스킬. 명단 조회, 신규 인물 추가, 메타 시그널 누락 점검을 수행한다. `.claude/skills/three-kingdoms/SKILL.md` 참조.
