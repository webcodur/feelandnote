# 인물 도서 정리

인물 도서 발굴과 기존 등장 관계·판본 정리의 현재 도달점이다. 용어와 판정 규칙은 [`../project/celeb/celeb-02-05-figure-books.md`](../project/celeb/celeb-02-05-figure-books.md), 작품 선정은 [`figure-book-curation`](../../.agents/skills/figure-book-curation/SKILL.md), 상품 연결은 [`coupang-book-affiliate`](../../.agents/skills/coupang-book-affiliate/SKILL.md)가 쥔다. 이 문서는 그 규칙을 복제하지 않고 어디까지 갔는지만 기록한다. 말은 룰북 「용어」 표의 것만 쓴다.

## 판본·등장 도서 정리의 현재 도달점

마지막 작업: 2026-10-19 13:40 KST. 사오정에서 시작해 서유기 원전에 연결된 인물들의 책장을 대조했다. 동명 현대소설·45세 정년·영어 교재·게임 안내서와 당나라 장군 이정의 오연결을 해제했고, 유머집·어린이 그림 재화·중국어판·영어 읽기 교재의 선정 또는 언어 오류는 기존 DB 근거에 반영했다. 손오공에게 빠져 있던 고우영 만화의 등장 관계도 연결했다. 사오정의 한국어 실화면에는 오승은 원전과 고우영 만화 두 작품이 나온다. 이 묶음이나 전체 판본의 전수 검수가 끝났다는 뜻은 아니다.

다음 확인은 손오공의 『손오공(초록문고 20)』(9788979680201)·『손오공(새싹문학관 9)』(9788900024227), 삼장법사의 김원석 『서유기 1:삼장법사와 손오공』(9788939500242)이다. 서지만 확인돼 본문 범위·독자군 판정을 보류했다. ISBN 없는 옛 표시용 행도 실제 판본으로 승인하지 않았다.

고우영 만화의 현재 대표는 자음과모음 첫 권(9788954418393)이다. 노바코믹스 복원판 상권(9791194755838)과 상·하 구성은 카카오·YES24에서 확인했으나, 구판의 실물 서지·소개를 보존하면서 같은 원문 대표를 바꾸는 작업은 남았다. YES24의 상·하 묶음은 서점 구성 상품이므로 별도 ISBN 판본으로 만들지 않는다. 기존 전역 잔여 판단은 [`인물 남은 작업`](../todo/celeb/README.md#문서-없이-남은-판단)에서 이어간다.

## 무엇을 고치는 작업인가

`FICTION` 인물은 전원이 등장 작품을 가지지만 실존 인물은 대부분 직군 공통책 한 권만 붙어 있다. 『스크린 연기의 비밀』 한 권이 배우 277명에게, 『스포츠 유전자』가 105명에게 붙은 식이다. 관계 전체의 59%가 스물아홉 권에서 나온다. 이는 [`celeb-02-05-figure-books.md`](../project/celeb/celeb-02-05-figure-books.md)가 금지한 직군 일괄 복사다.


## 통과 조건과 작업 순서는 다른 문제다

인물 도서 화면은 활성 상품이 있는 작품이면 그 판본만, 없으면 요청 언어의 판본을 구매 버튼 없이 보여 준다(`sw/web/src/actions/figure-books/getFigureBooks.ts`). 한 인물을 끝냈다고 말하려면 세 가지가 모두 참이어야 한다.

1. 그 책 본문에 인물이 실제로 나오거나 인물이 책의 중심 대상이다
2. 작품과 판본이 카카오 ISBN으로 확정돼 등록됐다
3. 배송 배지가 붙은 쿠팡 상품이 그 판본에 연결됐다

**이 셋은 통과 조건이지 작업 순서가 아니다.** 어느 쪽에서 출발하든 상관없고, 가장 적게 버리는 경로를 고른다. 인물에서 출발해 책을 찾다 보면 쿠팡에 없는 책을 조사하는 데 시간을 쓰고, 판매 목록에서 출발하면 그 낭비가 사라진다. 실측에서 인물 기준으로 찾은 285권 중 125권(44%)이 쿠팡 단계에서 탈락했다.

판매 목록에서 출발하는 것은 규칙 위반이 아니다. [`coupang-book-affiliate`](../../.agents/skills/coupang-book-affiliate/SKILL.md)가 금지하는 것은 **후보 밖의 관련서를 판매가 좋다는 이유로 대신 고르는 일**이다. 후보 풀을 판매 중인 책으로 한정하는 것과, 등장 판정을 판매 상태로 대체하는 것은 다르다. 1번 조건은 어느 경로에서도 그대로 지킨다 — 잘 팔린다는 이유로 인물이 나오지도 않는 책을 등장 작품으로 올리지 않는다.

무료로 되는 필터를 유료·수동 단계 앞에 세운다. 카카오 판매 신호(`status`·`sale_price`)로 절판을 먼저 걷어내고, 인물당 대표 한 권으로 줄인 뒤에 쿠팡 화면을 연다. 실측에서 이 두 필터가 838건을 285건으로 줄였다.

## 도달점


| 축 | 값 |
|---|---|
| 관계 | 8,899건 — 등장 5,515 · 창작 3,384 · 연관 0 (09-18 15:00, 통합·QID 부착 반영 뒤) |
| 관계가 하나라도 있는 활성 인물 | 2,147명 |
| 등장 작품 2권 이상 / 1권 / 0권 (활성 실존) | 1,166명 / 850명 / 1,267명 |
| 공개 작품 | 한국어 4,385권 · 영어 3,781권 |
| 위키데이터 유래 작품 | 1,818개, 전부 영문 카드 보유(표시용 제목 행 155건 포함) |

- **등장 0권 1,267명은 전원이 인물 기준 조사를 거친 난공략분이다**(`appearance-muse-2026-09-04.jsonl` 1,090명 + 09-15 파동 177명, 09-18 대조). 억지로 붙이지 않고 비워 둔다(26.09.15 확정). 새 조사 엔진이 생기기 전에는 다시 돌리지 않는다.
- 카카오 미검증 후보는 YES24 상품 검색(`yes24-verify-candidates.mjs`, ISBN·판매중 확인용. 판정 대체·표지·구매 연결에는 쓰지 않는다)으로 재확인한다.
- 이 환경에서는 PowerShell 분리 프로세스가 무로그 사망하므로 배치는 전경 청크로만 돌린다. 출력은 파일로만 받는다.
- 26.09.08 앙솔로지 55권에서 실존 인물 211명에게 넣은 관계 565건은 이미 모은 결과만 반영한 것이다. 작품 단위 순회 자체는 룰북 「작품 기준 폐기」에 따라 더 쓰지 않는다.
- 정체성 미정이던 558권은 `assign-domestic-identity.mjs`로 ISBN 3순위 정체성을 받았고, 번역서 원작 확인·작품 일치 확인이 1·2순위로 올린다.

### 판매처 — 기준 서점은 YES24

한국어 도서의 가격·판매 정보는 판본 ISBN으로 YES24에서 조회하고, 영문 구매처는 Amazon이다. **판본 ISBN을 확보한다.** 쿠팡의 현재 연결 방식과 과거 링크 폐기 방침은 [`ops-03-affiliate-commerce.md`](../project/operations/ops-03-affiliate-commerce.md)가 쥔다.

등장 작품 가운데 ko 판본 ISBN이 없는 것은 4권뿐이다(09-18): 『천일야화』(판본 미정), 『해칭 트위터』·『친구 속의 스파이』(한국어판 미확인 표시용 행), 『나폴레옹 전기』는 09-18에 길산 2017 판본(`9788995201206`, edition 11218)을 등록했다.

**판본 성격이 비어 있는 행이 많다.** 대량 등록은 단권만 `full/complete`로 채우고 다권·세트는 비워 두므로 미정 판본이 2,000건 넘게 쌓여 있다. 작품당 판본이 하나면 당장 드러나지 않는다. 판본이 둘 이상인 작품은 카카오 책 정보(역자·소개)로 성격을 정해 두었고(2026-09-07, 17건), 『리비우스 로마사』(현대지성) 한 건만 권 구성이 확인되지 않아 비워 두었다.

### 신규 인물 574명 축(2026-09-16)

`new-figures` 작업으로 등록한 비활성 인물(`created_at ≥ 2026-09-16`, `publication_status=inactive` 유지) 대상이다.

- **위키데이터 축 반영 끝** — QID 백필로 416명을 잡고 `wikidata-works-extract`에 신규 인물 스코프를 넣어 625개 작품 항목(85개 판본 접힘 → 540 작품)을 얻었다. `wikidata-works-match --apply`로 기존 작품 QID 부착 6·새 작품 51권·창작 관계 61건을 넣었다. 서지 정보가 없는 258건은 이 경로로는 못 잡는다.
- **기존 재고 직접 매칭 반영 끝** — 제목·저자 필드에서 신규 인물 이름을 잡아 141건을 뽑고, 저자 문자열로 동명이인(존 로↔존 로크, 제이 굴드↔스티븐 제이 굴드, 이시↔이시구로·미시마 등)을 걸러 창작 16·등장 1 관계를 넣었다. 천주실의 중복 작품(`975788bb-…`)은 통합 후보.
- **저작 축 반영 끝** — 카카오 저자 필드 일치로 236행을 뽑고 동명이인(데이비드 리빙스턴↔리빙스턴 스미스, 제이 굴드↔스티븐 제이 굴드, 존 로↔존 로 타운젠드, 제임스 호프만 정보원↔커피 저자, 윌리엄 워커↔앳킨슨 등)과 외국 판본·판본 중복을 걸러 107행(45명)을 승인했다. 신규 작품 98권 + `authored` 관계 99건(8건 기존 관계와 중복). 후보 파일 `authored-candidates-new-figures(-ko).json`, 승인 큐 `authored-review-queue-new-figures.json`.


## 인물 단위 정밀 정비

대량 채우기와 별개로, 인물 신설 직후나 「등장 책이 한두 권뿐」이라는 신고가 있을 때 인물 한 명의 책장을 통째로 점검·보강한다. 판정·등록 규칙은 룰북과 `figure-book-curation` 스킬이 쥐며, 여기는 대상 선정·운영 루프와 사토시 나카모토 회차에서 확인된 운영 노하우만 둔다.

### 대상 선정 — 신호 합집합 × 결손 플래그

`scripts/figure-books/shelf-audit-targets.mjs`가 정비 후보를 점수 순으로 낸다(읽기 전용). 신호는 `celebs.view_count`와 `celeb_influence.total_score` 각각의 백분위 가운데 큰 값이고(합집합 상위), 결손 플래그는 인물이 가진 관계 작품에서 읽는다.

| 플래그 | 결손 | 정비 동작 |
|---|---|---|
| `thin` | 관계 ≤2건 | 등장·창작 후보 조사로 확장 |
| `koGap:N` | ko 판본 없는 작품 N종 | 카카오로 국내판 재검·판본 등록 |
| `koRecheck:N` | `verified_unavailable`·표시용 ko 행 N종 | 다른 제목의 번역서 재검(디지털 화폐 사례) |
| `enGap:N` | 번역 작품인데 en 판본 없는 것 N종 | OL 판본 재검·카드 전환 |
| `dup:N` | 같은 workIdentity의 중복 작품 N종 | `merge-works` 통합 검토 |

```bash
node --env-file=.env --import tsx scripts/figure-books/shelf-audit-targets.mjs --limit 100 --out ../../data/celeb/figure-books/shelf-audit-targets.json
```

관계 0건 인물은 기본으로 제외한다(조사 완료된 난공략분 — `--include-empty`로만 본다). 26.10.03 실측으로 결손 보유 1,835명이 잡혔다.

### 운영 루프

- **서브 위임** — 사용자 지시에 따라 책장 정밀 정비는 인물별로 서브에 나눠 맡긴다. 발주에는 `figure-book-curation` 스킬과 이 절의 경로, 담당 인물·기존 작품 정보만 전달한다. 서브는 담당 인물의 조사·수리·readback을 수행하고, 메인은 대상 분배·공유 작품의 쓰기 충돌 조정·통합 검수·캐시 갱신을 맡는다.
- **백그라운드 조사** — 목록의 slug를 묶어 `appearance-muse-candidates.mjs --slugs <slug들> --out <날짜>.jsonl`로 돌린다. 외부 CLI 엔진(opencode·agy·claude·codex·devin)은 사용자가 그 회차에 지정한 `--backend`만 쓰고, 출력은 jsonl에 이어받는다. 모델 없이 돌릴 때는 카카오 인물명 직접 검색 경로(아래)를 쓴다.
- **정비 실행** — 조사 결과는 후보일 뿐이며 아래 8단계를 인물 단위로 돌린다. 등록·반영 `--apply`는 사용자 지시 때만이다.
- 작업 자료는 반영·재조회 검증 뒤 전량 폐기하며 [데이터 원칙](../project/data/README.md)을 따른다.

### 정비 절차

1. **현황 매트릭스** — `figure_book_characters`로 인물의 관계를 뽑고 작품별 언어 카드·판본을 나열한다. 화면은 요청 언어의 등록 판본을 요구하므로 카드만 있고 판본이 없는 작품은 그 언어 목록에 안 뜬다 — 「한 권뿐」 신고의 상당수가 이 원인이다.
2. **후보 발굴** — 카카오 인물명 직접 검색(한글·영문 표기 각각)으로 저자 일치(→`authored`)와 중심 대상(→`appearance`)을 나누고, 출판사 소개문으로 「주제가 그 인물인가/그 인물의 분야 일반인가」를 가른다. 위키데이터 작품 항목(P50)으로 본인 저작 목록을 대조한다.
3. **기존 재고 우선** — 제목·원제로 DB를 대조해 이미 있는 작품에는 `figure-books:batch`로 관계만 잇는다. 본인 저작에는 `appearance`가 아니라 `authored`를 단다.
4. **신규 작품** — `figure-books:book` dry-run → `--apply`. 정체성은 룰북 「작품 정체성」 순서를 따른다. 인물별 임시 명세는 반영 검증 뒤 폐기한다.
5. **중복·후처리** — 같은 저작의 두 작품은 `merge-works.mjs`(dry-run → apply). 추가 판본은 `source-edition-batch`다 — 카카오가 같은 책의 인쇄판·전자판·타 출판사 재판 ISBN을 같이 내놓으므로 후보 ISBN은 전수 대조한다.
6. **판본 귀속 실패 대응** — 저자 표기 차이(월리스/월레스)처럼 같은 책인데 앵커와 어긋나면 `edition_work_evidence`를 카드 `sources`에 보존 후 재시도한다. en 판본은 OL 원전 제목이 서버 원전과 다르면 근거로도 못 넘는다 — OL 데이터 정정이 선행이다(게이트 상세는 룰북 「등록」).
7. **번역본 재검** — `koTranslationStatus='verified_unavailable'`인 작품도 번역서가 다른 제목으로 나와 있을 수 있다(사례: Digital Cash → 『디지털 화폐』, 에코리브르). 저자명·원제 변형으로 카카오를 재검하고, 실판본이 있으면 표시용 행을 공식 값으로 덮고 상태를 `published`로 교정한다.
8. **마무리** — 관계 목록 readback으로 ko/en 화면 권수를 확인하고 `figure-books:audit`을 돌린다. 상품 연결은 `coupang-book-affiliate`로 넘긴다.

## 작품 후보 조사 경로

**기존 재고 직접 매칭은 소진됐다.** `figure-books:direct-candidates`가 BOOK 7,949권을 훑어도 남은 후보는 오탐 위주다. '세트'·'리아'·'헤라'처럼 짧은 이름이 책 제목의 부분 문자열로 잡힌다. 상품까지 붙은 미연결 후보 11건 중 10건이 오탐이었다.

### 인물에서 출발하기

`scripts/figure-books/appearance-muse-candidates.mjs`가 등장 작품 없는 실존 인물을 영향력 점수 순으로 세워 모델에 조사를 지시하고, 응답을 카카오 제목+저자 매칭으로 검증한다. 결과는 `data/celeb/figure-books/appearance-muse-*.jsonl`에 인물 단위로 쌓이며 같은 `--out`으로 다시 실행하면 이어서 돈다.

```bash
node --env-file=.env scripts/figure-books/appearance-muse-candidates.mjs --backend claude --concurrency 5 --out ../../data/celeb/figure-books/appearance-muse-<날짜>.jsonl
```

**조사 엔진은 자주 막히므로 갈아끼운다.** `--backend`가 `opencode`·`agy`·`claude`·`codex`를 받는다. opencode 무료 라인은 Exa 검색 한도, Go 라인은 크레딧, agy는 구글 계정 쿼터(약 4시간 주기)에 걸린다. 막힌 엔진은 조사 실패를 기록하지 않고 넘기므로 다음 실행에서 그 인물을 다시 잡는다. 동시 실행 수를 올리면 한도가 빨리 소진된다 — 동시 12에서 실패율이 23%→53%로 올랐고 동시 6에서는 0이었다.

**이 출력은 후보일 뿐 검수를 대신하지 않는다.** 모델은 책을 지어내지는 않았으나 서사로 엮는 단계에서 시점과 입장을 뒤집는 결함이 있다([`opencode-muse`](../../.agents/skills/opencode-muse/SKILL.md)). 등장 설명은 반영 전에 사람이 본다.

카카오 매칭이 실패해도 후보가 틀린 것은 아니다. 실측에서 실패 사유의 절반이 동일인 이명이었다(교황 베네딕토 16세 ↔ 요제프 라칭거, N.T. 라이트 ↔ 톰 라이트). 실패분은 버리지 말고 검수에서 되살린다.

### 카카오 인물명 직접 검색(외부 모델 없이)

조사 엔진이 막혔을 때 560명을 이 경로로 처리했다(2026-09-16). 인물의 한글 표기와 영문 표기를 각각 카카오 도서 검색에 넣고, 히트를 두 축으로 나눠 수동 판정한다.

- **저자 필드가 인물과 일치 → `authored` 후보.** 성+명 부분 일치는 증거가 아니며 미들네임이 다른 동명이인(리빙스턴↔리빙스턴 스미스), 성만 같은 동명이인(제이 굴드↔스티븐 제이 굴드), 이름 겹침(존 로↔존 로 타운젠드)이 주된 오탐이다. 한국 ISBN(978-89·979-11)이 아닌 행과 큰글자책·세트 등 같은 저작의 다른 판본은 뺀다.
- **인물이 중심 대상인 전기·평전 → `appearance` 후보.** 저자가 다른 사람이고 책 주제가 그 인물인 경우만 해당한다. 본인 저작을 등장으로 넣지 않는다.

판정 후 승인 큐를 `bulk-register-books`에 넣는다. 큐 행의 `kakao.isbn`이 `isbn10 isbn13` 공백 결합 형식이면 13자리 토큰 하나로 정규화해야 한다 — `bare()` 결과가 13자가 아니면 조용히 스킵된다. 관계는 `appearance-relations` + `apply-reviewed`(등장) 또는 `figure_book_characters` 직접 삽입(창작·연관)으로 넣는다.

### 판매 목록에서 출발하기

인물 이름으로 쿠팡을 먼저 검색해 배송 배지가 붙은 도서만 받고, 그중 그 인물이 중심인 책을 고르는 방향이다. 조사 비용이 들지 않고 쿠팡 단계 탈락이 구조적으로 사라지므로, 등록 가능한 책을 빨리 늘려야 할 때 이쪽이 낫다. 대신 상품명만으로는 인물이 실제로 다뤄지는지 알 수 없으므로 등장 범위는 따로 확인한다. 어린이 위인전·문제집처럼 카드에 내놓기 어려운 상품이 섞이는 것도 이 경로의 몫이다.

두 경로는 배타적이지 않다. 인물 기준 조사는 쿠팡에 없는 책까지 파일에 남겨 두므로 나중에 상품이 생기면 그대로 쓴다.

## 반영

작품이 DB에 이미 있으면 `figure-books:apply-reviewed`로 관계만 잇는다. 없으면 검수표 단위로 `scripts/figure-books/bulk-register-books.mjs`가 작품·ko 언어 카드·판본을 한 번에 만든다(한두 권은 `figure-books:book`). 모두 기본이 dry-run이며 사용자가 반영을 지시했을 때만 `--apply`한다. 반영 뒤 `figure-books:audit`으로 확인한다.

카카오 ISBN으로 등록된 작품은 국내서 정체성으로 굳은 상태다. 정체성을 바로잡고 영문판을 붙이는 후처리는 룰북 「용어」의 내부 작업 표 순서대로 돈다.

1. **위키데이터 작품 정보 추출** `wikidata-works-extract.mjs` — QID 보유 실존 인물의 작품 항목(P50·P800·P170, P31이 책 유형)을 `data/celeb/figure-books/wikidata-works.jsonl`에 쌓는다. 이어받기가 되고 WDQS 429는 Retry-After만큼 쉰다.
3. **번역서 원작 확인** `translated-original-work.mjs` — QID가 없는 국내서 정체성 작품 가운데 역자가 있는 번역서의 원제·원저자·영문판 ISBN13을 모델에 묻고 OpenLibrary로 확인한다. `--apply`는 정체성을 원작으로 바꾸고 영어 판본이 확인되면 `en` 언어 카드·판본을 만든다. 같은 정체성으로 모인 작품은 `merge-candidates.json`에 남긴다.
4. **중복 작품 통합** `merge-works.mjs` — 통합 후보 쌍을 한 행에 모은다. 감상 기록이 붙은 작품은 지우지 않는다. 일치 확인이 낸 후보에는 해설서가 원전으로 잡힌 오탐이 섞이므로 dry-run 표의 제목을 보고 승인 목록을 따로 만들어 `--apply`한다.
5. **미완성 작품 복구·잘못 붙은 영문 카드 제거** `wikidata-works-match.mjs --repair` — 반영이 중간에 끊겨 언어 카드 없이 남은 작품 행을 캐시로 다시 채우거나 지운다. 영어권 ISBN(978-0·978-1·979-8)이 아닌 `en` 카드는 OpenLibrary 언어로 다시 확인하되 **지우지 않고** `en-display-title-plan.json`(표시용 제목 행 전환 계획)을 써서 `locale-display-title.mjs`에 넘긴다. ISBN이 없는 행은 이미 표시용 행이라 대상이 아니다. 26.09.18까지는 이 단계가 `--apply`를 보지 않고 ISBN 없는 행까지 지웠다(아래 회차 기록). `en-locale-audit.mjs`는 한국어 해설서에 원전의 영문 카드가 붙은 행을 모델(기본 opencode 무료)에 "같은 저작인가"만 물어 가르고, 다르면 `en` 카드·판본을 뗀다.

정체성 규칙 자체는 [`celeb-02-05-figure-books.md`](../project/celeb/celeb-02-05-figure-books.md)의 「작품 정체성」이 쥔다.

### 26.09.18 회차

- `--repair`를 dry-run으로 알고 돌렸는데 `apply` 가드가 없어 위키데이터 유래 작품의 **영문 표시용 제목 행 153건**(ISBN 없음, `sources.primary='none'`)을 지웠다. 판본·상품·작품 삭제는 0건. `data/celeb/book-introductions/ko-en/*.json`의 target 스냅샷(제목·저자·표기)과 승인 번역(`translation`)으로 140건, 위키데이터 영문 라벨로 15건을 되살려 155건을 다시 넣었다(소개문 139건 포함, 기록은 `locale-display-title-backup.jsonl`의 `restoredAfterRepairIncident`). 외국어 라벨이 남은 4건(『아름다운 문장 책』·『무엇 때문에?』·『나쁜 생각들』·『캠프를 떠난 다섯 친구』 제외 3건)은 통용 영어 제목을 못 정해 원제를 뒀다. 도구는 dry-run 기본·표시용 행 제외·삭제 대신 전환 계획 출력으로 고쳤다.
- 미완성 작품 0건. 비영어권 ISBN `en` 카드 11건은 OpenLibrary가 영어판으로 확인한 인도·독일·네덜란드 영문 출판사 판본이라 정상이다.
- **통합 29쌍 반영(사용자 지시, 15:00까지 배치)** — 09-07 잔여 3쌍·『천주실의』 2쌍(`merge-pending-2026-09-18.json`)과 위키데이터 일치 확인이 낸 41쌍 중 같은 저작이 제목으로 분명한 24쌍(`merge-candidates-wikidata-approved-2026-09-18.json`). 원행 백업은 `_backup/merge-works-before-2026-09-18.json`·`_backup/merge-works-wikidata-before-2026-09-18.json`. **보류 17쌍**은 `merge-candidates-wikidata.json`에 남아 있다 — 남김 쪽이 선집·해설서·합본·분권인 것(『예브게니 오네긴·대위의 딸』, 『아퀴나스의 신학대전 (배경, 구조, 영향)』, 『엔네아데스 선집』, 『허균과 홍길동전』, 『적과 흑 1』, 『스노 크래시 1』, 『1Q84 1』, 『열하일기(상)』, 『촘스키 전3권』, 『전쟁 회고록』/『단결 제2권』, 『기술복제시대의 예술작품 … 외』), 판본 충돌(『채식주의자』, 도킨스 자서전 2), 다른 저작 의심(『감정의 혼란』↔『과거로의 여행』, 『은하제국의 흥망』↔『티끌 같은 별들』, 『탄원하는 여인들』 아이스킬로스/에우리피데스, 『신학-정치론』). 사람이 keep 방향을 정해야 한다.
- **작품 일치 확인 반영** — QID 부착 63건, 창작 관계 39건. 새 작품 후보 1,610권은 상한 60으로 시험한 60권 전부 카카오·OpenLibrary 책 정보가 없어 0권 생성. 나머지도 같은 성격(`noBibliography` 10,889)이라 이 경로로는 더 안 늘어난다.
- **판본 성격 미정 4,234건은 손대지 않았다.** 단권 가정을 일괄로 씌우면 축약본·어린이판이 `full`로 찍힌다. 판본이 둘 이상인 작품만 사람이 정한다.
- **보류 17쌍 전량 판정·반영 완료** — 같은 저작 13쌍은 통합(keep 방향 4쌍 반전 포함). 선집·합본·분권은 삭제하지 않고 `edition_kind`로 남겼다(선집 1·합본 1·분권 4). 다른 저작 2쌍은 통합하지 않았다 — 에우리피데스·아이스킬로스 『탄원하는 여인들』은 별개 비극이라 양쪽 유지, 츠바이크 쌍은 QID 오부착이라 『과거로의 여행』→Q3228257·『감정의 혼란』→Q2550138로 교환. 해설서 2건은 원작과 분리했다 — 토렐 『아퀴나스의 신학대전』은 `book/9791198606259`로 QID 해제하고 Blackfriars 판본 카드·판본을 『신학대전』 행(Q653871)으로 이관, 김형호 『허균과 홍길동전』은 `book/9788981069162`를 유지하고 『홍길동전』 행에 Q14911972 부착. 통합 과정에서 표시용이던 언어 카드 6건을 실판본 카드로 되살리고 오부착 관계 2건(벤야민 에세이↔헤르타 뮐러, 토렐 해설서↔아퀴나스)을 지웠다.
- **`en-locale-audit` 실행(모델 대조 없이 사람 판정, 09-18)** — ko·en 카드 쌍 1,626건 가운데 en 실판본 ISBN 보유 182건을 전수 대조해 원전과 다른 저작의 카드 32건을 뗐다(기존 큐 20건 + 신규 12건: 해설서 원전 카드·동명이서·비평선집·희곡 각색본). 뗀 자리에 올바른 영문판 5건(죄와 벌·말콤 엑스·트레일블레이저·헤로도토스 역사·거장과 마르가리타)을 OpenLibrary 확인 판본으로 달고, 「신학대전 1」 en 카드의 저자 오기(H. Noldin→Thomas Aquinas)를 고쳤다. 판정 원장 `en-locale-verdicts.jsonl`.
- **번역서 원작 확인(외부 CLI 없이 직접 조사)** — `book/<isbn>` 정체성 2,310건 중 카카오 역자 보유 1,099건이 번역서. 위키데이터 작품 캐시(`wikidata-works.jsonl`) ko 라벨 대조로 29건 매칭 — 7건 QID 반영, 22건은 기존 QID 행과 중복이라 `merge-works`로 통합(백업 `_backup/merge-tow-cache-before-2026-09-18.json`).
- **수동 주석 542건 반영 완료** — 위키데이터 API가 IP 스로틀(429)에 잠겨 경로를 바꿨다: 원제·원저자는 에이전트가 직접 주석하고 OpenLibrary만으로 영문판을 검증했다(QID는 필수가 아니라 후순위). 자동 OL 매칭이 낸 오배치·스왑 12건(뱅크시↔시팅불, 록펠러↔이더리움, 가와시마↔톰 크린, 소로우↔로크 등)을 전수 대조로 잡아 고치고, OL 미스 3건은 ISBN 직접 확인으로 해결했다. `--apply`로 정체성 갱신 535건(QID 보유 7건 건너뜀)·en 판본 272건, 백업 `_backup/tow-manual-before-2026-09-18.json`. 같은 정체로 모인 43쌍 가운데 같은 저자의 **다른 저작** 2쌍을 통합 전에 걸러 고쳤다(『검은 말』은 Pale Horse가 아니라 `boris-savinkov/the-black-horse`, 『부의 완성』은 Unshakeable이 아니라 `tony-robbins/the-holy-grail-of-investing` — 『부의 완성』에 달린 허구 en 카드 "Wealth Mastery"도 삭제). 나머지 41쌍은 `merge-works`로 통합(백업 `_backup/merge-tow-manual-before-2026-09-18.json`). manual 원장 반영 스크립트에 `fetchBookIntroduction` 타임아웃 내성을 넣었다.
- **기존 세션 원장 720건 전수 검수·반영 완료** — 사람이 ko 제목·저자와 원제·원저자를 전수 대조해 오식별 1건을 고쳤다(『존 도어의 OKR 레볼루션』은 Speed & Scale이 아니라 Measure What Matters, en ISBN 9780241290873). `--apply`로 정체성 갱신 699건(QID 보유 21건 건너뜀)·en 판본 362건, 백업 `_backup/tow-old-before-2026-09-18.json`. 통합 후보 8쌍 중 같은 저자의 다른 저작 1쌍을 걸렀다 — 『칭기스 칸, 신 앞에 평등한 제국을 꿈꾸다』는 Making of the Modern World가 아니라 `jack-weatherford/genghis-khan-and-the-quest-for-god`(잘못 들어간 en 판본도 삭제). 나머지 7쌍은 drop 행 부재 4건 자동 건너뜀·3쌍 통합(백업 `_backup/merge-tow-old-before-2026-09-18.json`).
- **미주석 번역서 2차 주석 21건 반영** — 라틴 원제를 확실히 아는 건만 주석해 OL 검증 후 반영, en 판본 9건(독일어·튀르키예어 ISBN은 적용 시 자동으로 original-only 강등). 통합 후보 0건, 백업 `_backup/tow-manual2-before-2026-09-18.json`.
- **비라틴 원전 로마자 주석 245건 반영 완료** — 위키데이터 없이 원제·원저자를 로마자로 주석해 같은 파이프라인으로 돌렸다. OL 검증은 en 카드 판정용이라 resolved 54건(수동 대조로 오매칭 6건 걸러 original-only 강등 — 4대비극↔로미오와 줄리엣, 철학적 탐구↔Blue and Brown Books, 드래곤볼↔DBZ 9권, 불새 박스↔Phoenix 11권, 소녀 편↔vol.2, 플라톤의 철학↔Rowe 다른 저작). 적용 정체성 갱신 240건·en 판본 6건, 백업 `_backup/tow-cjk-before-2026-09-18.json`. en 판본 제목이 정체성으로 새어 잘못된 슬러그 8종(사기→records-of-the-grand-historian-han-dynasty-i, 정사삼국지→shou-ch-en/empresses-and-consorts, 플루타르크→parallel-lives-vol-4 등)을 표준 정체로 정정하고, 전수 대조에서 잘못 붙은 주석 11건(피터 틸↔순자 등)은 백업으로 복원·원제 불명 2건과 정정 5건(량치차오 이태리 삼걸전, 카르마 경영, 器識, Chen Yu'an, 로마인이야기5 권명)을 고쳤다. 같은 저작 통합 24쌍 반영(사기 8·정사삼국지 5·삼국지연의 4·순자 복원 등 — 삼국지연의 3쌍은 en locale PK 충돌로 중단돼 drop 측 중복 en 카드 삭제 후 재통합), keep 백업 `_backup/merge-tow-cjk-before-2026-09-18.json`.
- **잔여 실태(재집계)** — `book/` 잔존은 142가 아니라 **1,519건**이다: domestic 865(국내서, 정상 정체성) + 원장 미포함 627(역자 0건 — 대부분 국내서, 외국 저자 38건 중 처리 가능분은 이번 배치로 흡수) + unresolved 27(원제 불명 — 모옌 산문집·이중톈 강의·Poe 선집 등 사람 판정 필요). QID 백필은 위키데이터 스로틀 해소 후 `tow-wd-cands.jsonl` 이어하기.
- **unresolved 27건 전량 판정 완료** — 웹 조사로 원제·원저자를 확정했다. 2건(楊貴妃伝·安禄山と楊貴妃)은 선행 처리됐고, 2건(『여성리더 영어연설문』 국내 편역집·『고대 그리스 서정시』 다저자 선집)은 단일 원작이 아니라 `book/` 유지가 맞다. 나머지 23건을 주석해 `--apply`로 정체성 갱신 23건 — 가디언즈 오브 갤럭시 Vol.2 오피셜 가이드는 원서명 확인으로 `marvel-comics/guardians-of-the-galaxy-vol-2-the-official-guide` 정체 부여(영화 부속 간행물이라 독립 정체). 백업 `_backup/tow-u27-before-2026-09-18.json`. OL 검증 resolved 6건 중 en 판본이 없던 5건을 직접 삽입(Metaphysics는 기존 Penguin 판본 보유로 건너뜀 — en 카드가 이미 있으면 적용부가 판본 삽입을 건너뛰는 사양 보완). 같은 저작 통합 2쌍 — 『헨리 포드』→『나의 삶과 일』, 『이정의 신유학』→『정 주 철학의 뿌리를 찾아서』(drop 측 로마자 en 카드 선삭제 후 통합). 처리분 `book/` 잔존 0.

### 26.10.03 회차 — 사토시 나카모토 인물 도서 점검·보강

- 등장 2건만 붙어 있던 것을 조사해 관계 13건(등장 12·창작 1)으로 확장. 신규 작품 7권(사토시의 서·비트코인 현상·비트코인 지혜의 족보·비트코인 탄생의 비밀·The Secret Life·The Bitcoin Standard·Digital Cash)과 기존 재고 3권(Digital Gold·Bitcoin Billionaires·The Blocksize War)에 관계를 잇고, 백서 작품(`34b3cd63`)에는 `authored`를 넣었다.
- 같은 저작이던 필레우시스 『비트코인 백서』(`book/9791199097407`)를 백서 작품으로 통합해 판본·관계를 이관했다(백업 `_backup/merge-a689c59c…`).
- 추가 판본 5건 — 미스터 나카모토 인쇄판(9791124038314, 저자 표기 월레스/월리스 차이로 ko 카드 `sources.edition_work_evidence`에 독립 검수 근거 보존 후 등록), 사토시의 서 2021판(9791162243855)·전자판(9791175796898), 비트코인 지혜의 족보 백산출판사판(9791188626069), Digital Cash 한국어판 『디지털 화폐』(9788962632194, 에코리브르 — 등록 때 `verified_unavailable`로 놓쳤던 실번역서라 표시용 제목 행을 공식 값으로 덮고 `koTranslationStatus`를 `published`로 교정).
- 후속 조사 정리 — 『인문학, 비트코인 백서를 읽다』(윤성호, 한양대학교출판부, 9788972188780)를 백서를 정면으로 읽는 국내 단독 저작으로 추가 등록(등장 관계 포함, 총 14건). 나머지 보류 3건은 조사로 확정: 『Behind the Mask』는 Affirm Press가 2020-01 소송 위협으로 출간 취소해 실재 판본이 없음(영구 제외), Frisby 『Bitcoin: The Future of Money?』는 OL 판본 3종이 언어·표지를 동시에 갖춘 것이 없고 2025 Boundless 재판(9781917943017)은 OL 미등록(등록 불가), 백서 영문판은 OL이 유일 영문 판본(Ignota 9781999675929)을 다른 원전 "White Paper" 아래 두고 공저자 Brekke·Bridle까지 붙어 `verifyEditionWork`의 원전 제목·저자 대조를 통과할 방법이 없음(OL 원전 병합이 필요한 외부 데이터 문제).

### 26.10.03 회차 — `shelf-audit-targets` 상위 인물 1차 정비

`shelf-audit-targets.mjs --limit 100`(`data/celeb/figure-books/shelf-audit-targets.json`) 상위 thin 인물 8명을 카카오 인물명 직접 검색으로 정밀 정비했다. 조사 후보가 없는 인물은 판정만 하고 넘겼다.

- **bill-ackman** 관계 2→3건 — 신규 작품 Christine S. Richard 『Confidence Game: How Hedge Fund Manager Bill Ackman Called Wall Street's Bluff』(en 전용, `0ac61685`) 등록 + 등장 관계. en 판본 2종(Wiley 9780470648278 + Bloomberg 9780470873304 — 다른 부제의 같은 저작, `edition_work_evidence` 보존 후 등록).
- **en 카드 오부착 수리** — 『뒤통수의 심리학』(마리아 코니코바, `0d0e2f34`)에 리처드 책의 en 카드·판본이 붙어 있던 것을 떼고(백업 `_backup/detach-0d0e2f34-en-conf.json`), 코니코바 정본 en 카드·판본(9780525427414, edition 16842)으로 교정. 작품 검색 매처가 이 오부착 카드 때문에 리처드 신규 작품을 동일 작품으로 오인했으므로 **오부착 수리가 신규 등록보다 먼저다**.
- **jamie-dimon** 관계 2→3건 — 신규 작품 Duff McDonald 『Last Man Standing: The Ascent of Jamie Dimon and JPMorgan Chase』(en 전용, `e15435a5`) 등록 + 등장 관계.
- **son-woong-jung** — 『모든 것은 기본에서 시작한다』 큰글자책 판본(9791193238431, edition 16846) 추가. 제목 접미사 차이로 `edition_work_evidence` 보존 후 등록.
- **조사 완료·변경 없음** — andrew-huberman(Protocols 국문판 미출간, koGap 정상)·larry-fink(카카오 결과가 Larry Fink 사진작가·KDP 자가출판 잡음뿐)·jason-statham·yang-hak-seon·daniel-ek(스포티파이 회사 서적은 인물 직접 대상이 아니라 제외).
- **운영 노하우 추가** — OL 판본 제목이 부제를 합쳐 돌려주므로 카드·원전 앵커가 짧은 표제면 `editionMatch`가 실패한다. 이 경우 `contents.metadata.workTitle`/`workCreator`를 OL 원전값으로 채우면 `original` 앵커로 통과한다(카드는 공식 전체 제목 유지).
- 마무리 readback — bill-ackman 관계 3(ko 2·en 1), jamie-dimon 관계 3(ko 2·en 2), `figure-books:audit` 손댼 작품 의심 목록 없음.

### 26.10.03 회차 — 상위 인물 2차 정비(결손 플래그 축, 인계 중간 상태)

큐의 enGap·koGap·dup 축을 정비했다. **예수 배치는 명세·근거 준비까지 끝났고 적용은 다음 작업자가 한다.**

- **적용 완료**
  - barack-obama — 『담대한 희망』 ko 판본 2종(9788925511054 버락 오바마 표기판·9788925588803 개정판, edition 16853·16854). 카카오 제목 정규화(「(양장본 HardCover)」 제거·「(개정판)」 유지) 후의 실표제를 증거 `edition_title`에 맞춰야 통과했다.
  - julius-caesar — 갈리아전기 계열 ko 판본 4종(edition 16847·16848·16849·16850).
  - niccolo-machiavelli — 『피렌체사』(16851)·『전쟁의 기술』(16852) ko 판본. The Art of War 작품의 `workCreator`가 「孙武」로 오염돼 있던 것을 마키아벨리로 교정(Q610942는 마키아벨리의 Dell'arte della guerra가 맞음) 후 통과.
  - matt-damon — 『물은 왜 가난한 사람들에게 더 비싼 걸까?』와 `Worth of Water`는 같은 저작의 중복 작품 → `merge-works` 적용(판본 9791124471029 이관·중복 관계 정리).
  - confucius — 『춘추』 작품에 **다이앤 디 프리마의 동명 시집**(City Lights) en 카드·판본이 오부착돼 있던 것을 떼고 ko 카드 유지.
- **조사 완료·변경 없음** — muhammad·elon-musk·dario-amodei·charlemagne·li-si·jensen-huang의 enGap는 독일어 원전·국내 원저작·OL 미등록 등 실판본 없는 정상 결손. michael-jackson은 『댄싱 더 드림』 국내 번역 없음 확인, 나머지는 ko 원저작이라 정상.
- **jesus — 적용 대기(다음 작업자 인계)**
  - 조사 완료: 라칭거 『나자렛 예수』 3부작(바오로딸 1·2·유년기 + 김영사 단권), 크로산·타이쎈/메르츠 『역사적 예수』, 파리니 『예수, 인간의 얼굴을 한 신』, 폴 존슨 『예수평전』 후보 확정. 기존 작품 `c2191622`(나자렛의 예수) 발견.
  - **이미 DB에 쓴 준비분**: `c2191622` en 카드 저자 → `Joseph Ratzinger`(OL 정준값), `contents.metadata.workTitle/workCreator` = `Jesus of Nazareth`/`Joseph Ratzinger`(원전 앵커), ko 카드 `sources.edition_work_evidence`에 ko 판본 4건의 귀속 증거 보존.
  - **dry-run 통과·미적용 명세** `data/celeb/figure-books/jesus/`: 신규 작품 4건(`historical-jesus-crossan`·`historischer-jesus-theissen`·`human-face-of-god-parini`·`jesus-paul-johnson`), 관계 1건(`rel-jesus-nazareth`, appearance), 판본 5건(`editions-nazareth` — ko 바오로딸 3권+김영사 1권은 `volume/volume-N-of-3` scope, en은 Part 1인 9780385523417만 — 나머지 en 판본은 OL이 언어 필드 없음).
  - 다음 작업자 순서: ① 신규 4건 `--apply` → ② `rel-jesus-nazareth` `source-batch --apply` → ③ `editions-nazareth` `source-edition-batch --apply`(dry-run 재확인 후) → ④ 신규 작품 4건의 관계 명세 작성·반영 → ⑤ readback + `figure-books:audit`.
  - 타이쎈 판본 교훈: Fortress판(9780800631239)은 판본 저자가 타이쎈만이라 실패 — SCM판 9780334026969(저자 2명 기재·표지·eng)로 교체해 통과. OL 원전 제목이 독일어 `Historische Jesus`라 `metadata.workTitle`을 그 값으로 맞춰야 en 하드 게이트를 지난다.

### 26.10.03 회차 — 책장 「같은 책」 판본 접기 + 역자 백필

- 신고: 『사토시의 서』(초판·개정증보판·전자책)가 동일 칩 3개, 『비트코인 지혜의 족보』(케이디북스→백산출판사 판권 이전 재출간)가 칩 2개로 노출 — 출판사·출간일만 다른 판본을 유저 선택지로 나열한 결함.
- **원칙 확정**: 책장 칩의 같은 책 판정 구분자는 출판사·출간일이 아니라 역자·본문 범위·판본 성격이다. 다른 역자의 번역본(오만과 편견 민음사↔열린책들 등)은 다른 책으로 남고, 같은 역자의 판권 이전 재출간·개정판·전자책은 접는다. 출판사가 다른 판본을 접는 것은 역자 동일 확인 또는 다른 언어 카드가 없는 원어 작품뿐이다 — 출판사만 기계 비교하면 다른 번역본을 삼킨다.
- **구현**: `figureBookLocale.ts`에 `collapseSameBookEditions` — 키 = 정규화 제목(판차 꼬리표·공백 제거) + 저자(없으면 출판사) + 역자 + 판본 성격 + 범위(`null`≈`full/complete`). 대표는 구매 링크 보유 → 최신 출간 → sortOrder. `includeAll=true` 경로(콘텐츠 상세)는 접지 않는다.
- **역자 기반 보존**: 카카오 `translators`를 `kakao-books.ts` 메타로 노출하고 등록 3경로(source-edition-batch·source-book-batch·admin)가 판본 `sources.translators`에 자동 기록하게 했다.
- **기존 판본 백필**: 같은 키 후보 228건 + ko 다판본 작품 확장분 905건을 카카오 ISBN 조회로 `sources.translators` 백필(미등재 9건, 백업·명단은 `data/celeb/figure-books/_work/`).
- **효과**: 다판본 작품·언어 1,012 → 접은 뒤 다중 칩 923(잔여는 대부분 역자가 다른 실번역본). 검증 사례 — 사토시의 서 1칩, 지혜의족보 1칩, 오만과 편견·일리아스는 역자별 3칩 유지.
- 검증: `figureBookLocale.test.ts` 8건 통과(역자 동일 재출간 접기·역자 상이 분리 포함), `figure-books:audit` 이슈 없음.

### 26.10.03 회차 — 3차 정비(예수 인계분 적용 + koGap 상위)

- **jesus 배치 적용 완료** — 신규 작품 4건(크로산 The Historical Jesus·타이쎈/메르츠 Der historische Jesus·파리니·폴 존슨)+『나자렛의 예수』관계·ko 판본 4종(바오로딸 1·2·유년기+김영사)+en Part 1 판본(9780385523417).
  - 인계 시 막힌 원인 2가지: ① `edition_work_evidence`의 `original_title/creator`는 작품 원전값(`metadata.workTitle/workCreator`)과 같아야 한다 — 카드값이 아니라 **원전 앵커값**(Jesus of Nazareth/Joseph Ratzinger). ② 증거의 정준 키는 `method`(type만 있으면 매칭 안 됨). 구본 증거는 표시용 판본 행의 `sources`에도 남아 같이 교정했다.
- **캐시 주의** — `getFigureBooksForCeleb`는 `cachedDetail`(`figure-books-by-celeb-v*`)로 캐시된다. 노출 로직 변경에는 캐시 키 버전을 올린다(v16→v17). DB 데이터만 수정했다면 `/api/revalidate`로 연결 인물의 `celebs:<id>`·`celebs:<slug>`와 작품의 `contents:<id>` 태그를 갱신하고, 응답의 `complete: true`로 Cloudflare 퍼지까지 확인한다. 같은 작품에 연결된 다른 인물도 포함한다.
- **koGap 상위 판본 보충** — 명세·증거 `data/celeb/figure-books/_work/ko-ed-10-03/`:
  - marx: 브뤼메르 18일 중복 작품 통합(`merge-marx-brumaire.json`, keep=QID 7c8fab96)+비르투판, 그룬트리스=『정치경제학 비판 요강』2종, 임금노동과 자본 2종 — edition 16871·16875~16876·16879~16880
  - hemingway: 제5열·우리 시대에 2종 — 16877·16881~16882
  - einstein: 나는 세상을 어떻게 보는가 3종(같은 역자, 칩 1개)·아인슈타인 평전 — 16872~16874·16878
  - balzac: 사촌 베트 상·하(volume scope) — 16869~16870
  - aristotle: 실판본 없음 판정
- **등록 불가·미번역 잔여** — 카카오가 구식 내부 코드(2004xxx)를 돌려 ISBN-13 검증 불가: 위험한 여름(영한문화사85)·철학의 빈곤(아침89). 국내 단행본 미존재 확인: 고브세크·베아트릭스·페라구스 등 발자크 11종, 헤밍웨이 5종, 마르크스 자본론 제2권·고타 강령 비판 등.
- 추가 정비 대상은 현재 DB에서 조회한다.
