# Remotion 영상 제작

Remotion으로 만드는 영상 시리즈의 문서 허브다. 이 문서는 진입점만 쥐고, 시리즈별 데이터·제작 규격과 파이프라인 단계는 하위 문서가 쥔다.

파일명은 `<영역>-<NN>-<이름>.md`다. 최상위는 `remotion-`, 서재 탐방은 `br-`, 그 음성 하위는 `voice-`, 가상 담화는 `discourse-`를 쓴다. 두 자리 번호는 읽는 순서 겸 묶음 주소다(서재 탐방: 01~09 형식·계약, 10대 편성, 40대 이미지, 50대 출력·검수, 60대 파생물). 글쓰기 단계 `writer/0-draft.md`~`7-translation.md`는 실행 순서 번호라 그대로 둔다.

## 시리즈

| 시리즈 | 먼저 볼 문서 | 범위 |
|---|---|---|
| 서재 탐방 | [`book-recommend/`](book-recommend/README.md) | 인물의 추천 도서를 소개하는 롱폼·쇼츠·SOLO |
| 책과 사람 | [`book-person/`](book-person/README.md) | 나레이터 단독 세로 쇼츠 |
| 가상 담화 | [`discourse/`](discourse/README.md) | 인물의 1인칭 독백·반박·대담 |
| 랭킹 | [`ranking/`](ranking/README.md) | 한 축의 순위를 나레이터가 읽고, 인물마다 설명·이미지가 한 번씩 나온다 |

Remotion 영상의 남은 작업은 [`docs/todo/remotion.md`](../../todo/remotion.md)가 쥔다.

세력도감 영상 시리즈는 26.09.16에 저장소에서 걷었다. 영상·음성·자산은 `D:\remotion-assets\factions`, 렌더본은 `D:\remotion_done\Faction`, DB 제작 표·어록·유튜브 업로드 기록은 `D:\feelandnote-backups\faction-video`에 있고, 코드는 커밋 이력에서 꺼낸다. 세력도감은 웹 도감만 남았다([`apps-01-web-bo.md`](../apps/apps-01-web-bo.md) 「세력도감」).

## 인물 그룹

시리즈와 직교하는 인물 명단은 별도 문서와 코드 SSoT가 쥔다.

| 그룹 | 문서 | 코드 SSoT |
|---|---|---|
| 삼국지 | [`remotion-01-three-kingdoms.md`](remotion-01-three-kingdoms.md) | `packages/shared/src/lib/three-kingdoms.ts` |

공통 제작 함정과 재발 방지 기록은 [`remotion-90-gotchas.md`](remotion-90-gotchas.md)에서 찾는다.

## 제작 관리

현행 편집·출간 창구는 [`apps-01-web-bo.md`](../apps/apps-01-web-bo.md)다.

## 코드·데이터 진입점

| 대상 | 진입점 |
|---|---|
| Remotion 앱 | `sw/remotion/src/` |
| 제작 스크립트 | `sw/remotion/scripts/` |
| 서재 탐방 데이터 | `sw/remotion/public/episodes/` |
| 책과 사람 데이터 | `sw/remotion/public/book-person/` |
| 가상 담화 데이터 | `sw/remotion/public/discourses/` |
| 랭킹 데이터 | `sw/remotion/public/rankings/` |
| 제작 백오피스 | `sw/web-bo/` |

에피소드 폴더 배치와 파일 SSoT는 각 시리즈 문서에서 확인한다. 이 허브에는 상태 폴더·파일 목록을 복제하지 않는다.

### 자산 보관소와 작업 폴더

`public/<시리즈>/<편>`의 **실체는 `D:\remotion-assets\<시리즈>\<편>`에 산다.** 작업 중인 편만 `public`에 정션(junction)으로 걸어 두며, Node·Studio·백오피스·파이프라인은 정션 너머를 예전 경로 그대로 읽고 쓴다. `public`이 7.5 GB·11,000 파일이던 시절 Studio가 페이지마다 그 전부를 훑던(5초) 부담을 없애려고 나눴다. 공유 자산(`music`·`covers`·`common`)과 `_`로 시작하는 폴더·파일은 `public`에 그대로 둔다.

```bash
pnpm --filter remotion assets list [시리즈]        # ● staged(작업 중) · ○ archived(보관소만) · ◆ public-only(실체가 public)
pnpm --filter remotion assets stage episodes elon-musk     # 보관소 편을 작업 폴더에 건다
pnpm --filter remotion assets unstage episodes elon-musk   # 정션만 푼다 — 실체는 남는다
pnpm --filter remotion assets archive episodes <새 편>     # 백오피스가 public에 새로 만든 편을 보관소로 옮기고 되건다
```

- 백오피스에서 새 편을 만들면 실체가 `public`에 생긴다(◆). 작업이 끝나거나 무거워지면 `archive`로 옮긴다.
- 서재 탐방(`episodes`) 백오피스 목록은 `public`을 읽으므로 **걸어 둔 편만 보인다.** 보관소 편을 손대려면 먼저 `stage`.
- 담화(`discourses`)는 git이 파일을 추적한다. 정션 너머로도 git은 파일을 보므로 상태가 바뀌지 않지만, 담화 편을 `unstage`하면 git이 삭제로 본다 — 담화는 걸어 둔 채로 쓴다.
- 렌더 창고(`.render-stage`)는 보관소 옆(`D:\remotion-assets\.render-stage`)에 만든다. 같은 볼륨이라 하드링크가 산다.
- 보관소 위치는 `REMOTION_ASSET_ARCHIVE`로 바꾼다. 다른 컴퓨터에는 보관소가 없으니 `public`에 실체가 그대로 있는 옛 구조로 돈다.

## 주요 명령

```bash
pnpm dev:remotion
pnpm dev:bo
```

렌더·음성·이미지처럼 시리즈별 인자가 필요한 명령은 해당 시리즈 문서를 따른다.

서재 탐방 음성 파이프라인(pronounce → tts → transcribe → align → chunk)의 단계 계약은 [`voice-01-timing-pipeline.md`](book-recommend/voice/voice-01-timing-pipeline.md), 전 시리즈 공통 배선과 명령 인덱스는 [`prod-03-voice-pipeline.md`](../production/prod-03-voice-pipeline.md)가 쥔다.
