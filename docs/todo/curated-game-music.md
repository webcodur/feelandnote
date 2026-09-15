# 기관 선정 게임·음악 목록 추가

기관 선정은 책·영상 목록만 담았다. 게임(올해의 게임 수상작)·음악(빌보드 연말 결산) 목록을 같은 구조로 더한다. 데이터 구조·수집 원칙·판정 기준은 [`curated-lists.md`](../project/service/curated-lists.md)가 쥐고, 이 문서는 남은 일만 적는다.

## 이미 받아 주는 곳 (26.09.15 코드 확인)

- **DB** — `curated_lists.content_type` CHECK에 `GAME`·`MUSIC`이 들어 있다(`curated-lists.md` §2.2).
- **사용자 웹** — 매체 진열 순서(`useCuratedBrowse.ts`의 `MEDIA_ORDER`)와 탭 이름(`messages/*/library.json`의 `curated.mediaLabel`: 게임·음악 / Games·Music)이 있다. 목록이 하나라도 생긴 매체만 탭이 선다. 탭은 숫자를 달지 않고 여백을 줄여 두었다(26.09.15).
- **백오피스** — `/curated` 원장과 목록 편집기에 게임·음악 아이콘이 있다. 유형을 골라 저장하는 동작은 첫 적재 때 확인한다.
- **작품 메타 창구** — 게임은 IGDB, 음악은 iTunes Search API(`external_source='itunes'`, 곡 단위 `itunes-{trackId}`)다([`external-services.md`](../project/platform/external-services.md) 「외부 콘텐츠 검색 API」).

## 남은 일

1. **목록 후보 확정** — 사용자가 짚은 후보는 올해의 게임과 빌보드다. 담기 전에 `curated-lists.md` §4.3 판정 기준 「누가, 언제, 이 목록을 목록으로서 발표했나」와 원문 `source_url`을 확인한다. 후보 명단은 사용자 승인 뒤 적재한다.
2. **담는 방식 결정** — `curated-lists.md` §2.4를 따른다.
   - 해마다 한 편씩 쌓이는 상(올해의 게임): 목록 1행 + `is_annual` + 항목 `year`
   - 해마다 통째로 갈리는 차트(빌보드 연말 결산): 연도별 목록 + 같은 `series_key`. 몇 해를 담을지 먼저 정한다 — 얇은 목록이 기관 화면을 카드로 뒤덮어 하나로 합친 학과별 목록 선례(§4.3)가 있다.
3. **음악의 단위** — 우리 MUSIC 작품은 곡(`trackId`) 단위다. 곡 차트는 그대로 잇는다. 앨범 차트를 담으려면 앨범을 어떤 작품에 이을지부터 정한다.
4. **적재·연결 스크립트 확장** (`sw/web-bo/scripts/curated/`) — 지금은 책·영상만 다룬다.
   - `register.ts` — 대상 목록을 `BOOK`·`VIDEO`로만 고르고 새 작품도 둘 중 하나로만 만든다. 게임은 IGDB, 음악은 `packages/content-search/src/itunes-music.ts`로 찾아 등록하는 분기를 더한다. 음악은 미리듣기(`previewUrl`)가 있는 결과만 저장하고 분당 약 20회 제한을 지킨다.
   - `match.ts` — 기존 작품 후보를 `BOOK`·`VIDEO`로만 거른다. 목록 매체와 같은 유형만 후보로 삼는 규칙을 게임·음악에도 적용한다.
   - `titles.mjs` — 한국어 출간명 질의의 갈래가 책·영상 둘뿐이다. 게임·음악 제목에 이 단계가 필요한지 판단한다.
5. **사용자 카드 표지** — 목록 카드(`CuratedListCard.tsx`)와 목록 상세 격자(`CuratedListGrid.tsx`)는 영상만 따로 구별한다(필름 구멍 띠·영상 아이콘). 표지 틀은 세로형(3:4·2:3)이라 정사각 앨범 표지는 잘린다. 게임·음악의 표지 비율과 매체 표식을 정한다.
6. **마감** — 적재 뒤 `/api/revalidate`에 `curated` 태그를 던지고 허브·목록 화면·사이트맵 노출을 확인한다. 끝나면 규칙을 `curated-lists.md`에 흡수하고 `docs/todo/README.md` 행과 이 문서를 지운다.
