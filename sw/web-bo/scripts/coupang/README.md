# 쿠팡 파트너스 링크 만들기

도서에 붙일 쿠팡 제휴 링크를 만드는 도구 네 종. 상품 선정은
`coupang-book-affiliate` 스킬, 사업 정책은 `docs/project/operations/monetization.md`가
쥔다. 여기는 **쓰는 법만** 적는다.

## 전제

파트너스 오픈API 키는 최종 승인(누적 매출 15만원) 뒤에야 나온다. 그전까지는
파트너스 사이트를 사람이 열어 두고 브라우저로 조작하는 수밖에 없다.

**Claude in Chrome 확장은 쿠팡 도메인을 차단한다.** 사이트 허용 목록으로 풀리지
않으므로 아래처럼 크롬을 따로 띄우고 puppeteer로 붙는다.

```bash
# 1) 크롬을 원격 조작 가능하게 띄운다 (평소 쓰는 크롬과 섞이지 않는 별도 프로필)
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --remote-debugging-port=9222 --user-data-dir=C:\Users\<사용자>\coupang-profile

# 2) 그 창에서 사람이 직접 파트너스에 로그인한다 (비밀번호는 도구가 다루지 않는다)
```

## 순서 — 지금은 자동으로 고르지 마라

화면을 긁는 이 방식은 상품명과 값밖에 못 얻는다. 점수로 1등을 뽑아 봐야 명백한
오탐만 걸러낼 뿐 "더 나은 후보가 있었는지"를 보지 못한다. 그렇게 넣은 363권을
되짚으니 76권이 개별 서점 재고·묶음 상품·엉뚱한 판본이었다(26.08.08).
**열쇠가 없는 동안에는 가운데 판단을 사람이 한다.**

> **오픈API가 열리면 이 도구들은 쓸모가 끝난다.** API는 `categoryName`·`isRocket`·
> `productPrice`를 함께 주므로, 카테고리로 도서만 남기고 로켓배송 여부로 개별 서점
> 재고를 배제하는 것만으로 여기 적힌 오탐이 대부분 사라진다. 그때는 ISBN이 맞는
> 상품을 자동으로 집고, 사람은 판본이 애매한 건만 보면 된다.

```bash
# 1단계 — 후보만 모은다. 링크는 만들지 않는다
node candidates.mjs <대상.json> <후보.json>

# 2단계 — 사람이 후보 목록을 읽고 상품 상세 근거를 회수한다
node inspect.mjs <검토대상.json> <근거.json>

# 3단계 — 고른 것 하나만 만들어 자료에 넣는다
node pick.mjs <선택.json>

# 언제든 — 인물 등장·연관 도서의 현재 링크를 선정 근거와 대조한다
node audit.mjs --fiction-sources --evidence ../../../../data/coupang/fiction-source-picks-2026-09-02.json
```

### 대상.json

```json
[{ "content_id": "...", "title": "논어", "creator": "공자", "publisher": "홍익출판사", "isbn": "9791191805086" }]
```

신규 등장·연관 도서를 서비스에 없는 상태에서 쿠팡 상품부터 찾을 때는
`content_id` 대신 조사 안에서 고유한 `candidate_key`를 쓴다.

```json
[{ "candidate_key": "myth-japan-reading-1", "title": "일본 신화" }]
```

후보에서 실제 판매 중인 적절한 책을 고르고 본문·목차·색인으로 대상 인물의 등장 범위를
확인한 다음 서비스의 기존 작품을 검색한다. 같은 작품이 있으면 그 `content_id`를
재사용하고, 없으면 한국어판 ISBN을 카카오에서 확인해 BOOK으로 등록한다. 그 뒤에만
`선택.json`에 `content_id`를 넣어 `pick.mjs`를 실행한다. 인물 관계는 `fiction:source:batch`로 별도 반영하며, `related`에는 등장 설명을 넣지 않는다.

검색은 **제목만으로** 한다. 저자·출판사를 붙이면 후보가 좁아져 더 나은 상품을
놓친다. 다만 제목이 흔한 낱말이면 엉뚱한 물건이 나오므로(「풀잎」→조화,
「롤리타」→향수, 「티마이오스」→식품, 「자연학」→자연 도감, 「해커스」→토익 교재)
그럴 때만 대상에 `query` 필드로 `제목 저자`를 넣어 다시 돌린다. `title`은 서비스 작품명으로 보존한다.

### 선택.json

```json
[
  {
    "content_id": "...",
    "isbn": "9791191805086",
    "title": "논어",
    "query": "논어",
    "name": "논어",
    "productId": "1234567890",
    "productUrl": "https://www.coupang.com/vp/products/1234567890?itemId=...&vendorItemId=...",
    "affiliateUrl": "https://link.coupang.com/a/...",
    "qualityEvidence": ["로켓배송 배지", "상품평 120개"],
    "state": "linked"
  }
]
```

`name`·`productId`·`productUrl`은 후보.json에서 그대로 복사한다. `qualityEvidence`에는
상품 화면에서 직접 본 로켓배송·도착 보장 배지와 판매 근거를 적는다. 배송 배지가 없으면
선택하지 않는다. `pick.mjs`는 다시 검색한 결과에서 같은
상품 ID와 판매 항목을 찾아 링크를 만들며, 사라졌거나 달라졌으면 반영하지 않는다.
`content_id`·`isbn`이 없거나 검색 순번 `idx`만 적힌 옛 선택 자료는 거부한다. 인물 도서는
`content_id + isbn`으로 `figure_book_editions`의 정확한 판본을 찾고, 상품을
`figure_book_products`에 등록한다. 일반 도서는 기존 `content_locales` 경로를 쓴다.

## 고르는 기준

`coupang-book-affiliate` 스킬의 판정을 따른다. 후보 번호만 보고 고르지 말고 상품 화면을
열어 판본·배송·판매 신호를 확인한다. 같은 제목이 둘 이상인 책은 반드시 `content_id`로
대상을 고정한다.

기존 인물 도서 감사에서 현재 판본이 축약·분권이거나 판매 상태가 나쁘면 그 상품을 억지로
유지하지 않는다. 같은 작품의 완역·다른 번역·합본이 각기 읽을 이유가 있으면 작품 아래
판본을 여러 개 둘 수 있다. 후속권 하나만 놓였거나 배송 기준을 못 넘으면 작품·판본·인물
관계는 보존하고 상품만 비활성화한다.

## 감사

`audit.mjs`는 기본으로 인물 등장·연관 도서만 본다. `--all-books`를 주면 모든 한국어 BOOK을 보지만,
선정 근거가 없는 기존 링크는 `missing_evidence`로 실패한다. 선정 자료는 `items` 배열에
`content_id`·`isbn`·`productId`·`productUrl`·`affiliateUrl`·`qualityEvidence`·`state`를 둔다.
`state`는 이미 단축 링크가 있는 `linked`, 상품은 골랐지만 파트너스 링크 생성이 남은
`pending_short_link` 둘뿐이다.

감사는 DB의 쿠팡 주소가 선정 자료의 파트너스 단축 주소와 같은지 확인하고, 실제 리다이렉트된 상품 ID를
선정 자료와 대조한다. ISBN이나 상품 ID가 다르거나 배송 배지 근거가 없으면 실패한다. 링크가
링크 없는 인물 도서 관계는 허용하되, `linked`로 적은 항목에 링크가 없으면 실패한다. 전체 결과 파일이
필요할 때만 `--output <경로>`를 주며 기본 실행은 파일을 만들지 않는다.

인물 도서 BOOK의 작품 소개가 문장 중간에서 끊기거나 비어 있으면 아래 명령으로 전수 확인한다.
같은 ISBN의 다음 책 상세 소개가 현재 글의 앞부분과 일치할 때만 늘리며, `--apply`는 관련
작품·인물 캐시까지 갱신한다.

```bash
pnpm fiction:source:descriptions
pnpm fiction:source:descriptions --apply
```

## 넣은 뒤

판본·상품 표는 DB 트리거가 관련 작품과 인물 책장 캐시를 자동으로 비운다. 트리거 밖의 자료를
직접 고친 경우에만 아래처럼 해당 작품 태그를 수동으로 비운다.

**고친 건수만큼만 비운다.** 한 건이면 그 한 건의 태그를 보낸다.

```bash
curl -X POST https://feelandnote.com/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"tag":"contents:<content_id>","secret":"<CRON_SECRET>"}'

# 여러 건이면 배열로
  -d '{"tag":["contents:<id1>","contents:<id2>"],"secret":"..."}'
```

🔴 `{"tag":"contents"}`처럼 도메인만 보내지 마라. 작품 화면 10,640장이 전부 낡은
것으로 처리되고 그 뒤 방문·크롤링마다 재생성이 쌓인다. 26.08.08에 이 작업을 하며
도메인 비우기를 여러 번 부른 탓에 하루 만에 ISR 쓰기가 61만에서 110만으로 늘었다
(무료 한도 20만). 목록 화면은 1시간 수명이라 따로 비울 필요가 없다.
