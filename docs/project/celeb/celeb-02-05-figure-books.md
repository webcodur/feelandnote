# 인물 도서

이 문서는 **인물 도서** — 인물에 묶인 작품·판본·상품과 등장·연관 관계 — 의 용어와 판정·등록 규칙을 쥔다. 인물이 작품을 감상했다는 뜻이 아니므로 `celeb_contents`와 혼용하지 않는다.

후보 작품의 조사와 재선정은 [`figure-book-curation`](../../../.agents/skills/figure-book-curation/SKILL.md), 작품·판본·언어 카드의 책 정보는 [`celeb-02-02-content-registration.md`](celeb-02-02-content-registration.md), 한국어 판본과 제휴 상품은 [`coupang-book-affiliate`](../../../.agents/skills/coupang-book-affiliate/SKILL.md)를 따른다.

이 카탈로그는 `celeb_tier`(`full`·`light`)와 `celeb_reality`(`REAL`·`BOTH`·`FICTION`) 어느 쪽과도 무관하게 모든 인물을 연결할 수 있다. 관우가 『삼국지연의』를 등장 작품으로 가지듯 실존 인물도 등장 작품을 가진다. 물리 테이블 이름이 `fiction_source_*`였을 때 "픽션 인물 전용 테이블"이라는 오해를 계속 만들어 `figure_book_*`로 정정했다. 인물의 실존·전승 판정은 `celebs.celeb_reality`가 쥐며, 자세한 구분은 [`celeb-00-01-pipeline.md`](celeb-00-01-pipeline.md)의 「존재와 속성을 구분한다」를 따른다.

## 용어

한 개념에 이름 하나, 모든 이름에 부모 하나. 서비스 화면·백오피스·문서·스크립트가 아래 말만 쓴다. 화면에 보이는 값은 `packages/shared/src/constants/figure-book-terms.ts`가 쥐고, 서비스 i18n은 그 값과 같은지 테스트로 검사한다. 말을 바꾸려면 이 표 → 상수 → i18n 순으로 고친다.

| 한국어 | English | 코드 · DB | 뜻 |
|---|---|---|---|
| **인물 도서** | Figure Books | `figure_book_*` | 이 영역 전체. 인물에 묶인 작품·판본·상품 |
| ├ 인물 | Figure | `celebs` | 실존·전승·픽션 모두 |
| ├ 작품 | Work | `figure_book_contents` + `contents` | 저작 하나. 『오디세이아』 그 자체 |
| │ ├ 작품 정체성 | Work identity | `metadata.figureBook.workIdentity` | 이 행이 세상의 어떤 저작인지 나타내는 키. 같은 키면 같은 작품 ID |
| │ │ ├ 위키데이터 작품 | Wikidata work | `wikidata:q…` | 1순위. 위키데이터에 그 저작 항목이 있을 때 |
| │ │ ├ 원작 | Original work | `<원저자>/<원제>` | 2순위. 원저자 Original author · 원제 Original title을 확인한 번역서 |
| │ │ └ 국내서 | Domestic book | `book/<ISBN>` | 3순위. 원서가 없는 한국어 책. 이 책이 곧 저작 |
| │ ├ 언어 카드 | Locale card | `content_locales` (ko · en) | 언어별 표시 정보 — 제목·저자·표지·소개. 두 카드는 같은 저작이어야 한다 |
| │ └ 판본 | Edition | `figure_book_editions` | 언어·역자·출판사·ISBN이 다른 실제 책 한 종 |
| │ 　 └ 상품 | Product | `figure_book_products` | 판본의 판매 링크. 쿠팡(ko) · 아마존(en). 활성 상품 Active product는 판본·플랫폼당 하나 |
| └ 관계 | Relation | `figure_book_characters` | 인물 ↔ 작품을 잇는 줄 |
| 　 ├ 등장 | Appearance | `relation_type = appearance` | 인물이 본문에 실제로 나온다. 등장 설명 Appearance note(`description`)를 단다 |
| 　 ├ 연관 | Related | `relation_type = related` | 인물의 분야·사건·시대를 이해하게 하는 책. 설명 없음 |
| 　 └ 창작 | Creation | `relation_type = authored` | 인물이 쓴 작품. 설명 없음. 위키데이터 P50·P170·P800이 근거다 |

- **화면 구획 이름은 관계명 + 작품**으로만 만든다: 등장 작품 Appearing Works · 연관 작품 Related Works · 창작 작품 Created Works. 인물 화면 아래 구매 구획은 연관 작품의 상품에 추천 도서(읽은 책·직군·인기)를 이어 붙이므로 「연관 작품과 추천 도서 Related works and recommended books」라 부른다.
- 없앤 말: 등장 도서·연관 도서 → 등장 작품·연관 작품, 책장 → 인물 도서, 원전 → 등장 작품, 저작(인물 본인 것) → 창작, 관련 상품·관련 도서 → 연관 작품, 서지 → 책 정보.
- 감상·서재·감상록은 이용 기록 영역의 말이라 여기서 쓰지 않는다.

내부 작업(문서·스크립트 전용)의 이름은 은유나 API 호출 같은 수단이 아니라 **데이터에 무슨 일이 일어나는지**로 짓는다. 이름 짓기 규칙 자체는 [`agent-rules.md`](../agent-rules.md)의 「이름 짓기」가 쥔다.

| 한국어 | English | 스크립트 | 하는 일 |
|---|---|---|---|
| **인물 도서 정비** | Figure book maintenance | — | 아래 일들의 묶음 |
| 작품 후보 조사 | Candidate work search | `appearance-muse-candidates` · `appearance-by-work` | 모델에 물어 인물이 나오는 책 후보를 받고 카카오로 실재를 확인한다. 인물 기준·작품 기준 둘 다 돈다 |
| 위키데이터 작품 정보 추출 | Wikidata work extraction | `wikidata-works-extract` | 인물에 걸린 작품 항목(P50·P800·P170)을 꺼내 JSONL로 쌓는다 |
| 작품 일치 확인 | Work matching | `wikidata-works-match` | 꺼낸 항목이 DB 작품인지 QID → ISBN → 제목 순으로 확인한다. 있으면 QID를 붙이고, 없으면 새 작품을 만들고, 두 작품에 걸리면 통합 후보로만 남긴다 |
| └ 새 작품 책 정보 채우기 | Filling in book details for new works | 같은 스크립트 안 | 카카오·OpenLibrary에서 제목·저자·출판사·ISBN·표지·소개를 받아 작품 행과 언어 카드를 채운다. 두 곳 다 못 받으면 만들지 않는다 |
| 번역서 원작 확인 | Original-work identification | `translated-original-work` | 국내서로 굳은 번역서의 원제·원저자·영문판을 찾아 정체성을 원작으로 바꾸고 영문 언어 카드·판본을 붙인다 |
| 중복 작품 통합 | Duplicate work merge | `merge-works` | 같은 저작이 두 행이면 관계·판본·언어 카드·감상 기록을 한 행으로 옮기고 나머지를 지운다 |
| 미완성 작품 복구 | Incomplete work recovery | `wikidata-works-match --repair` | 반영이 끊겨 언어 카드 없이 남은 작품 행을 채우거나 지운다 |
| 잘못 붙은 영문 카드 제거 | Removing wrongly attached English cards | `wikidata-works-match --repair` · `en-locale-audit` | 비영어 판본이 영문 카드로 들어간 것, 해설서에 원전의 영문 카드가 붙은 것을 뗀다 |

## 작품 판정

- 등장 관계는 본문·목차·색인·검색 가능한 미리보기에서 인물명이나 확인된 이명·표기 변형을 찾는다. 최초 저작·각색·외전으로 다시 나누지 않고, 실제로 등장하거나 중심 대상으로 다뤄지면 `appearance`다.
- 연관 관계는 제목과 저자만 보고도 그 인물의 핵심 조직·사건·시대·종목·장르·역할·세부 분야와의 관계가 보여야 한다. 축구선수의 축구사·축구 전술서처럼 분야 전체를 이해시키는 책도 허용한다. 일반 자기계발서와 두 단계 이상 건너간 연상은 제외한다.
- `athlete`, `scientist`처럼 내부 구성이 이질적인 직군 전체에 같은 책을 복사하지 않는다. 같은 직군이라는 사실 하나만으로는 부족하지만 관련성이 그 인물에게만 고유할 필요는 없다. 실제 종목·포지션·장르·악기·연구 분야처럼 프로필에서 확인되는 구체적인 하위 맥락과 책 주제가 바로 맞으면 여러 인물이 같은 책을 공유할 수 있다.
- 작품 수를 미리 정하지 않는다. 기원·주요 과업·갈등·결말·후대 변형 가운데 어떤 국면을 직접 읽게 하는지 보고 적당한 수를 남긴다.
- 같은 신화권·시리즈·거친 직군 태그라는 이유로 관계를 복사하지 않는다. 작품마다 실제 등장 또는 직접 관련 근거가 있어야 한다.
- 검증된 관계는 판매 판본이나 제휴링크가 없다는 이유로 삭제하지 않는다. 인물 도서 화면은 활성 상품이 있는 작품이면 그 상품이 붙은 판본만, 없으면 요청 언어의 판본을 구매 버튼 없이 보여 준다. 노출 판정은 `sw/web/src/actions/figure-books/getFigureBooks.ts`가 쥔다.

## 작품·판본·상품

- `figure_book_characters`는 인물과 작품의 등장·연관 관계를 연결한다.
- `figure_book_editions`는 작품 아래 ISBN별 판본을 둔다. 번역자·출판사·장정·개정·합본·분권·축약 차이는 여기서 구분하며 `contents`를 복제하지 않는다.
- `figure_book_products`는 판본 아래 판매 상품을 둔다. 상품은 바뀔 수 있으므로 같은 판본·플랫폼의 기존 상품을 비활성 이력으로 남기고 현재 상품 하나만 활성화한다.
- 독립된 저작인 재화·각색·파생 작품만 새 `contents`가 될 수 있다. 단지 본문 범위나 ISBN이 다르다는 이유로 새 작품을 만들지 않는다.
- 시리즈 후속권에서 이야기가 중간부터 시작되면 실제 진입에 필요한 선행권이나 합본을 함께 검토한다. 인물이 나오지 않는 선행권을 등장 작품으로 꾸미지 않는다.
- 기존 BOOK이 제목·저자만 같고 작품 정체성이 불명확하면 자동 재사용하지 않는다. 같은 작품임을 확인한 뒤 기존 행을 명시적으로 재사용하고 판본을 그 아래 등록한다.

## 작품 정체성

작품 하나가 ko·en 언어 카드와 여러 판본을 거느린다. 한국어 판본을 작품으로 승격해 `contents`를 만들면 영문판이 붙을 자리가 없어지고 같은 작품이 번역서마다 갈라진다. `contents.metadata.figureBook.workIdentity`는 「용어」 표의 순서 — 위키데이터 작품 → 원작 → 국내서 — 로 정한다. `content_id`는 어느 규칙이든 `fiction-source-work:<identity>`의 UUID v5라 같은 작품은 어느 경로로 등록해도 같은 ID를 받는다. 1순위이면 `metadata.figureBook.wikidataQid`, 2순위이면 `originalTitle`·`originalCreator`를 함께 남긴다.

- 등록 전에 QID → ISBN → 원제·원저자 순으로 기존 작품을 찾는다. 있으면 그 `content_id` 아래 판본만 더한다.
- 번역서는 원제·원저자와 영문판 ISBN13을 찾아 `en` 언어 카드와 영문 판본을 같이 만든다. OpenLibrary가 영어(`eng`) 판본으로 확인한 ISBN만 `en`으로 쓴다. 언어 표시가 비어 있으면 ISBN 국가군 978-0·978-1·979-8만 영어권으로 본다 — 일본(978-4)·프랑스(978-2)·독일(978-3) 판본이 영문판으로 들어온 적이 있다. 원서만 확인되고 영문판이 없으면 정체성만 2순위로 바꾸고 `en`은 비워 둔다.
- 역자가 없는 한국어 책은 국내서로 보고 3순위를 유지한다.
- 정체성이 비어 있는 작품을 두지 않는다. 인물 도서로 지정된 작품에 정체성이 없으면 `assign-domestic-identity.mjs`가 ISBN으로 3순위를 즉시 주고, 다음 회차의 번역서 원작 확인·작품 일치 확인이 1·2순위로 올린다.
- 카카오는 수입 원서도 낸다. 한국 ISBN(978-89·979-11)이 아니면 한국어판이 아니므로 `ko` 언어 카드로 쓰지 않는다.
- 위키데이터 작품 항목은 `wikidata-works-extract.mjs`로 꺼내고 `wikidata-works-match.mjs`로 DB 작품과 일치를 확인한다. 같은 작품이면 QID를 붙이고 정체성을 1순위로 올리며, 없는 작품은 카카오 또는 OpenLibrary에서 책 정보를 채운 것만 만든다. 위키데이터 라벨만으로 언어 카드를 만들지 않는다.
- 같은 정체성으로 모인 중복 작품은 `merge-works.mjs`로 관계·판본·언어 카드·감상 기록을 한 행에 모은 뒤 나머지를 지운다. 일치 확인이 낸 통합 후보에는 해설서가 원전으로 잡힌 오탐이 섞이므로 dry-run 표의 제목을 보고 승인 목록을 따로 만든다.
- 한 작품의 ko·en 언어 카드는 같은 저작이어야 한다. 한국 저자의 해설서·입문서·강의록(『…읽기』·『…강해』)에 원전의 영문 카드를 붙이지 않는다. 그런 행은 영문 사이트에 해설서가 원전으로 뜨고 일치 확인이 해설서를 원전으로 잡는다. 의심 행은 `en-locale-audit.mjs`로 판정해 `en` 카드를 뗀다.

## 관계 유형

| 값 | 의미 |
|---|---|
| `appearance` | 등장 — 인물이 본문에 실제 등장하거나 작품의 중심 대상으로 다뤄지는 작품 |
| `related` | 연관 — 인물의 핵심 조직·사건·시대·종목·장르·역할·세부 분야를 직접 이해하게 하는 작품 |
| `authored` | 창작 — 인물이 쓴 작품. 위키데이터 작품 항목(P50·P800·P170)을 들여올 때 `wikidata-works-match.mjs`가 만들고, 같은 쌍이 `related`로 남아 있으면 `authored`로 올린다 |

창작을 저자 이름 비교로 가르던 방식(`related` + 저자 표기 일치)은 푸시킨/푸쉬킨·Mao Zedong/Mao Tse-tung 같은 표기 변형마다 어긋나 DB 값으로 확정했다(마이그레이션 `20260907010000_add_authored_relation_type`). 인물 화면은 `appearance`를 「등장 작품」에, `authored`를 「창작」 탭 앞에(위키데이터의 나머지 창작이 뒤에 이어진다), `related`를 아래 「연관 작품과 추천 도서」에 상품으로 표시한다(`sw/web/src/lib/celeb/authoredBooks.ts`). 감상 기록이 없어도 표시한다. 관련성이 약해 보인다는 이유로 창작 관계를 지우지 않는다.

`origin`·`adaptation`은 더 사용하지 않는다. 최초 저작인지 각색인지와 관계없이 인물이 실제로 나오면 `appearance`다.

## 등장 설명

`figure_book_characters.description`과 `description_en`은 `appearance` 관계에서 그 작품 안에 확인되는 인물의 역할·관여 사건·결말만 쓴다. `related`·`authored` 관계에서는 두 필드가 모두 `NULL`이어야 하며 DB와 백오피스가 입력을 막는다.

- 작품 세계 전체의 설정이나 다른 작품의 일화를 섞지 않는다.
- 작품 소개인 `content_locales.description`으로 대신하지 않는다.
- 한국어판과 본문을 확인한 작업은 `description`만 작성한다.
- `description_en`은 같은 작품의 실제 영문판과 영어 본문 범위, Amazon 구매 경로를 확인한 별도 영어 작업에서만 작성한다. 한국어 설명을 번역해 자리를 채우지 않는다.
- 사용자 화면은 요청 언어의 설명만 보여 주며 반대 언어로 대체하지 않는다.

## 등록

먼저 백오피스 `/figure-books`와 아래 감사 명령으로 기존 작품·판본·인물 관계를 확인한다. `faction:audit`는 팩션(세력도감) 영상 시리즈 감사 명령이라 이름이 비슷할 뿐 이 카탈로그와 무관하다 — 혼동해 잘못된 감사를 돌리지 않는다.

```text
pnpm --dir sw/web-bo figure-books:audit -- --json
```

신규 작품과 언어 카드는 작품 정체성과 본문 범위를 명시한 JSON으로 dry-run한다.

```text
pnpm --dir sw/web-bo figure-books:book -- --file <명세.json>
```

명세는 원저자·작품·제목 이명, 첫 판본 종류, 본문 범위와 확인된 ko/en ISBN을 구분한다. 구매 링크는 이 명세에 넣지 않는다. 같은 작품의 추가 판본은 다음 명령으로 dry-run한다.

```text
pnpm exec node --env-file=sw/web-bo/.env --import tsx sw/web-bo/scripts/figure-books/source-edition-batch.ts --file <판본.json>
```

카카오·OpenLibrary 정규화 제목에서 합본·완역·일러스트 같은 실제 판본 수식어가 빠질 때만 명세의 `editionTitle`로 복원한다. 작품명과 판본명을 다시 섞기 위한 임의 제목에는 쓰지 않는다.

한국어판 책 정보는 카카오 ISBN, 영문판 책 정보는 OpenLibrary ISBN만 사용한다. 상품은 판본이 확정된 뒤 `coupang-book-affiliate` 절차로 연결한다. 검증 가능한 한국어 번역본이 없으면 임의 번역 제목을 만들지 않고 확인 URL과 원제 정보를 남긴다.

대량 등록은 `figure-books:book`을 반복하지 않는다. 그 도구는 호출마다 카탈로그 전량을 다시 읽는다. 후보 검수표(ISBN)에서 작품·언어 카드·판본을 한 번에 넣는 경로는 `sw/web-bo/scripts/figure-books/bulk-register-books.mjs`이며, 위키데이터 추출본이 있으면 ISBN으로 저작 QID를 찾아 처음부터 1순위 정체성을 쓴다. 판본은 `figure_book_contents` 트리거가 언어 카드마다 만들고 단권만 `full/complete`로 채운다.

작품별 인물 관계는 다음 명령으로 dry-run한다.

```text
pnpm --dir sw/web-bo figure-books:batch -- --file <명세.json>
```

이 명령들은 기본적으로 DB를 쓰지 않는다. 사용자가 등록·반영을 명시한 경우에만 `--apply`한다. 반영 뒤 `figure-books:audit`으로 다음을 확인한다.

- `content_id`와 인물 ID가 정확한가
- 같은 작품이 판본마다 중복 생성되지 않았는가
- 판본 ISBN과 활성 상품이 정확히 연결됐는가
- 관계 유형과 순서가 맞는가
- `appearance` 설명이 해당 작품의 본문 범위를 넘지 않는가
- `related`·`authored` 관계의 두 설명 필드가 `NULL`인가
- 실제 영문판·Amazon 연결 없이 `description_en`이 생기지 않았는가
