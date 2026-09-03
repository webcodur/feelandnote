# 인물 등장·연관 도서

이 문서는 픽션·신화·실존 인물의 등장 도서와 연관 도서를 판정하고, 작품 아래 읽을 판본을 두는 규칙을 쥔다. 인물이 작품을 감상했다는 뜻이 아니므로 `celeb_contents`와 혼용하지 않는다.

후보 작품의 발굴과 재선정은 [`fiction-source-curation`](../../../.agents/skills/fiction-source-curation/SKILL.md), 작품·판본·locale 메타는 [`celeb-02-02-content-registration.md`](celeb-02-02-content-registration.md), 한국어 판매 판본과 제휴 상품은 [`coupang-book-affiliate`](../../../.agents/skills/coupang-book-affiliate/SKILL.md)를 따른다.

## 작품 판정

- 등장 도서는 본문·목차·색인·검색 가능한 미리보기에서 인물명이나 확인된 이명·표기 변형을 찾는다. 최초 원전·각색·외전으로 다시 나누지 않고, 실제로 등장하거나 중심 대상으로 다뤄지면 `appearance`다.
- 연관 도서는 제목과 저자만 보고도 그 인물의 핵심 조직·사건·시대·종목·장르·역할·세부 분야와의 관계가 보여야 한다. 축구선수의 축구사·축구 전술서처럼 분야 전체를 이해시키는 책도 허용한다. 일반 자기계발서와 두 단계 이상 건너간 연상은 제외한다.
- `athlete`, `scientist`처럼 내부 구성이 이질적인 직군 전체에 같은 책을 복사하지 않는다. 같은 직군이라는 사실 하나만으로는 부족하지만 관련성이 그 인물에게만 고유할 필요는 없다. 실제 종목·포지션·장르·악기·연구 분야처럼 프로필에서 확인되는 구체적인 하위 맥락과 책 주제가 바로 맞으면 여러 인물이 같은 책을 공유할 수 있다.
- 작품 수를 미리 정하지 않는다. 기원·주요 과업·갈등·결말·후대 변형 가운데 어떤 국면을 직접 읽게 하는지 보고 적당한 수를 남긴다.
- 같은 신화권·시리즈·거친 직군 태그라는 이유로 관계를 복사하지 않는다. 작품마다 실제 등장 또는 직접 관련 근거가 있어야 한다.
- 검증된 관계는 판매 판본이나 제휴링크가 없다는 이유로 삭제하지 않는다. 한국어 사용자 책장에는 현재 검증된 활성 쿠팡 제휴 상품이 있는 판본만 노출한다.

## 작품·판본·상품

- `fiction_source_characters`는 인물과 작품의 등장·연관 관계를 연결한다. 물리 이름은 기존 호환을 위해 유지한다.
- `fiction_source_editions`는 작품 아래 ISBN별 판본을 둔다. 번역자·출판사·장정·개정·합본·분권·축약 차이는 여기서 구분하며 `contents`를 복제하지 않는다.
- `fiction_source_products`는 판본 아래 판매 상품을 둔다. 상품은 바뀔 수 있으므로 같은 판본·플랫폼의 기존 상품을 비활성 이력으로 남기고 현재 상품 하나만 활성화한다.
- 독립된 저작인 재화·각색·파생 작품만 새 `contents`가 될 수 있다. 단지 본문 범위나 ISBN이 다르다는 이유로 새 작품을 만들지 않는다.
- 시리즈 후속권에서 이야기가 중간부터 시작되면 실제 진입에 필요한 선행권이나 합본을 함께 검토한다. 인물이 나오지 않는 선행권을 등장 작품으로 꾸미지 않는다.
- 기존 BOOK이 제목·저자만 같고 작품 정체성이 불명확하면 자동 재사용하지 않는다. 같은 작품임을 확인한 뒤 기존 행을 명시적으로 재사용하고 판본을 그 아래 등록한다.

## 관계 유형

| 값 | 의미 |
|---|---|
| `appearance` | 인물이 본문에 실제 등장하거나 작품의 중심 대상으로 다뤄지는 도서 |
| `related` | 인물의 핵심 조직·사건·시대·종목·장르·역할·세부 분야를 직접 이해하게 하는 도서 |

`origin`·`adaptation`은 더 사용하지 않는다. 최초 원전인지 각색인지와 관계없이 인물이 실제로 나오면 `appearance`다.

## 등장 설명

`fiction_source_characters.description`과 `description_en`은 `appearance` 관계에서 그 작품 안에 확인되는 인물의 역할·관여 사건·결말만 쓴다. `related` 관계에서는 두 필드가 모두 `NULL`이어야 하며 DB와 백오피스가 입력을 막는다.

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

- `content_id`와 인물 ID가 정확한가
- 같은 작품이 판본마다 중복 생성되지 않았는가
- 판본 ISBN과 활성 상품이 정확히 연결됐는가
- 관계 유형과 순서가 맞는가
- `appearance` 설명이 해당 작품의 본문 범위를 넘지 않는가
- `related` 관계의 두 설명 필드가 `NULL`인가
- 실제 영문판·Amazon 연결 없이 `description_en`이 생기지 않았는가
