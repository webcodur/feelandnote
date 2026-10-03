# 인물 도서 EN 판본 결손

EN 화면의 「참고도서」는 요청 언어의 실제 판본이 있는 작품만 세운다(`sw/web/src/lib/celeb/authoredBooks.ts` `pickDisplayFigureBooks`). 판본·언어 카드 규칙은 [`celeb-02-05-figure-books.md`](../project/celeb/celeb-02-05-figure-books.md)와 [`celeb-02-02-content-registration.md`](../project/celeb/celeb-02-02-content-registration.md)가 쥔다.

## 문제 유형

인물 도서(`figure_book_characters` 관계 보유 작품) 7,939종 중 **en 판본(`figure_book_editions.locale='en'`)이 없는 작품 3,114종**(26.10.01 실측). 이 작품들은 EN 인물 상세·신화 모달의 「참고도서」에서 통째로 빠지고, 모드가 하나도 없으면 구획 자체가 사라진다(이자나미 EN 모달 제보로 발견). 아래 버킷 표는 26.09.29 기준 분류다.

| 버킷 | 건수 | 처리 |
|---|---:|---|
| en 카드에 ISBN 있음, en 판본 없음 | 2 | 판본만 등록 |
| en 카드는 표시용 제목 행(`sources.primary='none'`, ISBN 없음) | 1,652 | OL에서 실판본 찾아 판본 등록 + 카드 공식값 덮기 |
| en 카드 없음, 작품 정체성 있음(`wikidata:q…`·`<원저자>/<원제>`) | 79 | 정체성으로 OL 검색 → 카드+판본 등록 |
| `book/<isbn>` 국내서 | 1,812 | 영문판이 없는 정상 KO-only — 손대지 않는다 |
| 정체성 없음 | 35 | `assign-domestic-identity` 대상, 여기서 다루지 않는다 |
| 판본 자체 0건(ko도 없음) | 11 | 별개 결손 |

검증 규칙은 그대로다: OpenLibrary가 영어(`eng`)로 확인한 ISBN만 en 판본이 되고, 언어가 비어 있으면 ISBN 국가군 978-0·978-1·979-8만 영어권으로 본다. `Unti…`·`Anon…` 자리표시 기록은 영문판으로 치지 않는다. **없는 언어판을 지어내지 않는다.**

OL의 `eng` 태그 오염 대응(26.09.30 추가): 비영어권 국가군 ISBN(978-2·978-3·978-7 등)은 Taschen·Prestel·König·Kodansha International·Foreign Languages Press 같은 영문서 출판사만 인정하고, 제목이 비영어 기능어만으로 이뤄졌으면(영어 단어·소유격 `'s`가 없으면) eng 태그가 있어도 거른다. 프랑스어판에 eng 태그가 붙어 통과한 `Le Colonel Chabert`(9782266083300) 등 10건이 이 검사로 잡혀 제거됐다.

## 경로

- 탐색·검증 원장: `sw/web-bo/scripts/figure-books/en-edition-fill.mjs`. 위키데이터 QID → P648 OLID → 저작 판본 경로를 우선 쓰고, 없으면 OL 제목+저자 검색. 결과는 `data/celeb/figure-books/en-edition-fill.jsonl`에 쌓아 이어받는다.
- 반영: 같은 스크립트 `--apply`가 원장의 `resolved` 행만 en 판본 INSERT + en 카드 공식값 갱신한다. `title-only`(제목만 일치·저자 불일치) 행은 동명이서 위험이 있어 자동 반영하지 않고 수동 검토 큐로 둔다.
- `figure_book_editions` INSERT는 DB 트리거(`web_reval_ins`)가 연결 인물의 캐시 태그를 자동 무효화한다.

## 진행

- 26.09.29 착수.
- 파일럿 완료: 일본서기→*Nihongi*(Aston, Tuttle, 9780804836746)·고사기→*Kojiki*(Philippi, Princeton, 9780691061603) en 판본 등록. 이자나미 EN 모달에 「참고도서」가 다시 나온다.
- 26.09.30 전수 배치 완료 — 원장 3,638행 전부 처분됨(큐 잔여 없음):
  - `resolved` 501 → DB 반영 완료(en 판본 +491: 1차 479 + 수동승인 19 − 중복 스킵 등, 카드 501 갱신·생성).
  - `rejected` 150 → 제목만 같은 다른 책(한국 저자 평전·아동서에 동명 영문서가 걸린 것 140건, 판정 기록 `reviewed: diff-work`) + 비영어판 10건(`non-english-edition`, DB에서 판본 삭제·카드 원복 완료).
  - `no-en-edition` 1,163 → OL에서 검증 가능한 영문판이 없는 것으로 확정.
  - `domestic` 1,824 → 영문판 없는 정상 KO-only, 손대지 않음.
- `figure-books:audit` 클린 — `publicEnWorks` 5,212, `invalidRelatedDescriptions` 0.
- 남은 것: en 판본의 아마존 구매 옵션(`figure_book_purchase_options`) — 판본이 있으면 카드는 나오지만 판매 연결은 별도 적재가 필요하다(아마존 제휴 측 진행 중). 또 `no-en-edition`에는 OL 미수록 실존 영문판(예: 정유정 『7년의 밤』의 Penguin판, 김영하 『빛의 제국』 영역본)이 일부 섞여 있을 수 있다 — 새 증거가 생기면 원장에 resolved로 추가해 재반영한다.

## 실판본 확인·귀속 검사 미통과

아래는 영문판 부재가 아니다. 현재 OL 원전과 서버 작품의 제목·전체 원저자가 일치하지 않거나 OL 판본·원전의 저자 연결 자체가 어긋나 등록되지 않았다. 게이트를 우회하지 않고 서지 연결을 바로잡은 뒤 재검한다. 조사 근거와 ISBN별 오류는 `data/celeb/figure-books/_work/shelf-audit-decisions-20261003.json`에 있다.

| 인물·작품 | 작품 ID | 영문 ISBN | 검사 결과 |
|---|---|---|---|
| 앨런 튜링 — The Shortest History of AI | `e2b67d52-b6ae-5485-9f00-2a9598ba1d90` | `9798893030891` | OL 원전 제목 `Shortest History of AI`와 서버 원제 불일치 |
| 앨런 튜링 — Alan Turing: The Enigma | `0dd5a60a-1883-5d0c-9a57-eae4a383d2d0` | `9781784700089` | 국내서 정체성·원전 앵커와 OL 제목·저자 불일치 |
| 동중서 — 춘추번로 | `44a14186-800d-5b23-8919-47890c4f4c2d` | `9780231169325` | OL 원전 제목·저자 목록이 현재 작품과 불일치; 편집자와 잘못된 저자 항목이 포함됨 |
| 덩샤오핑 — My Father | `3ed2720b-49dd-5aaf-b46c-be4da836035f` | `9780465016259` | OL 원전의 저자 목록을 판본에서 확인할 수 없음 |
| 스탠리 큐브릭 — Interviews | `6fcb42f4-d148-55ed-b98d-235f34c8d0a2` | `9781578062973` | OL 원전의 저자 목록을 판본에서 확인할 수 없음 |
| 세종대왕 — 홍길동전 | `adaf3329-f33c-4ae1-b9aa-a7a4955f2e19` | `9780143107699` | OL `The Story of Hong Gildong`·`Kyun Hŏ`와 현재 작품 앵커 불일치 |
