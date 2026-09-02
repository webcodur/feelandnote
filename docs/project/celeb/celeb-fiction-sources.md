# Fiction 원전·등장 작품

이 문서는 fiction 인물이 실제로 등장하거나 그 인물을 직접 다루는 작품을 판정하고, 작품 아래 읽을 판본을 두는 규칙을 쥔다. 인물이 작품을 감상했다는 뜻이 아니므로 `celeb_contents`와 혼용하지 않는다.

후보 작품의 발굴과 재선정은 [`fiction-source-curation`](../../../.agents/skills/fiction-source-curation/SKILL.md), 작품·판본·locale 메타는 [`celeb-02-02-content-registration.md`](celeb-02-02-content-registration.md), 한국어 판매 판본과 제휴 상품은 [`coupang-book-affiliate`](../../../.agents/skills/coupang-book-affiliate/SKILL.md)를 따른다.

## 작품 판정

- 본문·목차·색인·검색 가능한 미리보기에서 인물명이나 확인된 이명·표기 변형을 찾는다. 책 소개에 같은 신화권이나 시대가 적혀 있다는 이유만으로 연결하지 않는다.
- 최초·최고 원전만 고집하지 않는다. 인물을 실제로 만날 수 있는 번역본·재화·개작·현대 신화집·연구서도 서로 다른 읽기 경로를 주면 연결할 수 있다.
- 작품 수를 미리 정하지 않는다. 기원·주요 과업·갈등·결말·후대 변형 가운데 어떤 국면을 직접 읽게 하는지 보고 적당한 수를 남긴다.
- 같은 신화권·시리즈에 속한다는 이유로 등장 명단을 복사하지 않는다. 작품마다 인물의 실제 등장 근거가 있어야 한다.
- 검증된 원전 관계는 판매 판본이나 제휴링크가 없다는 이유로 삭제하지 않는다. 사용자 책장 노출과 작품 관계를 구분한다.

## 작품·판본·상품

- `fiction_source_characters`는 인물과 작품을 연결한다. 같은 작품의 모든 등장인물이 이 관계를 공유한다.
- `fiction_source_editions`는 작품 아래 ISBN별 판본을 둔다. 번역자·출판사·장정·개정·합본·분권·축약 차이는 여기서 구분하며 `contents`를 복제하지 않는다.
- `fiction_source_products`는 판본 아래 판매 상품을 둔다. 상품은 바뀔 수 있으므로 같은 판본·플랫폼의 기존 상품을 비활성 이력으로 남기고 현재 상품 하나만 활성화한다.
- 독립된 저작인 재화·각색·파생 작품만 새 `contents`가 될 수 있다. 단지 본문 범위나 ISBN이 다르다는 이유로 새 작품을 만들지 않는다.
- 시리즈 후속권에서 이야기가 중간부터 시작되면 실제 진입에 필요한 선행권이나 합본을 함께 검토한다. 인물이 나오지 않는 선행권을 등장 작품으로 꾸미지 않는다.
- 기존 BOOK이 제목·저자만 같고 작품 정체성이 불명확하면 자동 재사용하지 않는다. 같은 작품임을 확인한 뒤 기존 행을 명시적으로 재사용하고 판본을 그 아래 등록한다.

## 관계 유형

| 값 | 의미 |
|---|---|
| `origin` | 그 작품에서 처음 창작된 인물 |
| `adaptation` | 원작을 재구성한 재화·축약·각색·파생 작품의 인물 |
| `appearance` | 작품에 등장하거나 사전·연구서·문화사에서 명시적으로 다뤄지는 인물 |

오래된 작품이라는 이유로 `origin`을 주지 않는다. 소실 원전의 계통만 전하고 실제로 읽을 수 있는 작품은 그 작품의 성격에 따라 `adaptation` 또는 `appearance`로 둔다.

## 등장 설명

`fiction_source_characters.description`과 `description_en`은 그 작품 안에서 확인되는 인물의 역할·관여 사건·결말만 쓴다.

- 작품 세계 전체의 설정이나 다른 원전의 일화를 섞지 않는다.
- 작품 소개인 `content_locales.description`으로 대신하지 않는다.
- 한국어판과 본문을 확인한 작업은 `description`만 작성한다.
- `description_en`은 같은 작품의 실제 영문판과 영어 본문 범위, Amazon 구매 경로를 확인한 별도 영어 작업에서만 작성한다. 한국어 설명을 번역해 자리를 채우지 않는다.
- 사용자 화면은 요청 언어의 설명만 보여 주며 반대 언어로 대체하지 않는다.

## 등록

먼저 백오피스 `/fiction-sources`와 아래 감사 명령으로 기존 작품·판본·인물 관계를 확인한다.

```text
pnpm --dir sw/web-bo fiction:audit -- --json
```

신규 BOOK과 locale은 작품 정체성과 본문 범위를 명시한 JSON으로 dry-run한다.

```text
pnpm --dir sw/web-bo fiction:source:book -- --file <명세.json>
```

명세는 원저자·작품·제목 이명, 첫 판본 종류, 본문 범위와 확인된 ko/en ISBN을 구분한다. 구매 링크는 이 명세에 넣지 않는다. 같은 작품의 추가 판본은 다음 명령으로 dry-run한다.

```text
pnpm exec node --env-file=sw/web-bo/.env --import tsx sw/web-bo/scripts/fiction/source-edition-batch.ts --file <판본.json>
```

한국어판 메타는 카카오 ISBN, 영문판 메타는 OpenLibrary ISBN만 사용한다. 상품은 판본이 확정된 뒤 `coupang-book-affiliate` 절차로 연결한다. 검증 가능한 한국어 번역본이 없으면 임의 번역 제목을 만들지 않고 확인 URL과 원제 정보를 남긴다.

작품별 인물 관계는 다음 명령으로 dry-run한다.

```text
pnpm --dir sw/web-bo fiction:source:batch -- --file <명세.json>
```

이 명령들은 기본적으로 DB를 쓰지 않는다. 사용자가 등록·반영을 명시한 경우에만 `--apply`한다. 반영 뒤 `fiction:audit`으로 다음을 확인한다.

- `content_id`와 fiction 인물 ID가 정확한가
- 같은 작품이 판본마다 중복 생성되지 않았는가
- 판본 ISBN과 활성 상품이 정확히 연결됐는가
- 관계 유형과 순서가 맞는가
- 설명이 해당 작품의 본문 범위를 넘지 않는가
- 실제 영문판·Amazon 연결 없이 `description_en`이 생기지 않았는가
