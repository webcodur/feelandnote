# 인물 도서 EN 판본 결손

EN 화면의 「참고도서」는 요청 언어의 실제 판본이 있는 작품만 세운다(`sw/web/src/lib/celeb/authoredBooks.ts` `pickDisplayFigureBooks`). 판본·언어 카드 규칙은 [`celeb-02-05-figure-books.md`](../project/celeb/celeb-02-05-figure-books.md)와 [`celeb-02-02-content-registration.md`](../project/celeb/celeb-02-02-content-registration.md)가 쥔다.

## 문제 유형

인물 도서(`figure_book_characters` 관계 보유 작품) 7,937종 중 **en 판본(`figure_book_editions.locale='en'`)이 없는 작품 3,580종**(26.09.29 실측). 이 작품들은 EN 인물 상세·신화 모달의 「참고도서」에서 통째로 빠지고, 모드가 하나도 없으면 구획 자체가 사라진다(이자나미 EN 모달 제보로 발견).

| 버킷 | 건수 | 처리 |
|---|---:|---|
| en 카드에 ISBN 있음, en 판본 없음 | 2 | 판본만 등록 |
| en 카드는 표시용 제목 행(`sources.primary='none'`, ISBN 없음) | 1,652 | OL에서 실판본 찾아 판본 등록 + 카드 공식값 덮기 |
| en 카드 없음, 작품 정체성 있음(`wikidata:q…`·`<원저자>/<원제>`) | 79 | 정체성으로 OL 검색 → 카드+판본 등록 |
| `book/<isbn>` 국내서 | 1,812 | 영문판이 없는 정상 KO-only — 손대지 않는다 |
| 정체성 없음 | 35 | `assign-domestic-identity` 대상, 여기서 다루지 않는다 |
| 판본 자체 0건(ko도 없음) | 11 | 별개 결손 |

검증 규칙은 그대로다: OpenLibrary가 영어(`eng`)로 확인한 ISBN만 en 판본이 되고, 언어가 비어 있으면 ISBN 국가군 978-0·978-1·979-8만 영어권으로 본다. `Unti…`·`Anon…` 자리표시 기록은 영문판으로 치지 않는다. **없는 언어판을 지어내지 않는다.**

## 경로

- 탐색·검증 원장: `sw/web-bo/scripts/figure-books/en-edition-fill.mjs`. 위키데이터 QID → P648 OLID → 저작 판본 경로를 우선 쓰고, 없으면 OL 제목+저자 검색. 결과는 `data/celeb/figure-books/en-edition-fill.jsonl`에 쌓아 이어받는다.
- 반영: 같은 스크립트 `--apply`가 원장의 `resolved` 행만 en 판본 INSERT + en 카드 공식값 갱신한다. `title-only`(제목만 일치·저자 불일치) 행은 동명이서 위험이 있어 자동 반영하지 않고 수동 검토 큐로 둔다.
- `figure_book_editions` INSERT는 DB 트리거(`web_reval_ins`)가 연결 인물의 캐시 태그를 자동 무효화한다.

## 진행

- 26.09.29 착수.
- 파일럿 완료: 일본서기→*Nihongi*(Aston, Tuttle, 9780804836746)·고사기→*Kojiki*(Philippi, Princeton, 9780691061603) en 판본 등록. 이자나미 EN 모달에 「참고도서」가 다시 나온다.
- 진행 중: 전수 배치로 원장 축적 → `resolved` 행 반영 → `title-only`·`unresolved` 잔여는 수동 검토.
- 남은 것: en 판본의 아마존 구매 옵션(`figure_book_purchase_options`) — 판본이 있으면 카드는 나오지만 판매 연결은 별도 적재가 필요하다.
