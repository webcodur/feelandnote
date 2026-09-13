# 콘텐츠 데이터 감사

이 문서는 인물과 콘텐츠의 관계, 작품 정체성, locale, 표지 데이터를 함께 대조해 잘못 연결되거나 근거 없이 채워진 값을 찾고 보완하는 규칙을 쥔다.

실존 인물의 관계 채택 근거는 [`celeb-02-01-content-research.md`](celeb-02-01-content-research.md), 작품·판본·외부 메타·locale 규칙은 [`celeb-02-02-content-registration.md`](celeb-02-02-content-registration.md), `review`·`review_en` 문장은 [`celeb-02-03-content-review.md`](celeb-02-03-content-review.md)가 정본이다. 등장 관계와 설명은 [`celeb-02-05-figure-books.md`](celeb-02-05-figure-books.md)를 따른다.

## 감사 대상

감상 관계 감사는 `celeb_tier`가 가른다.

| 티어 | 관계 데이터 | 감사 범위 |
|---|---|---|
| `full` | `celeb_contents` | 모든 감상 관계와 연결 작품·locale |
| `light` | `celeb_contents` 없음 | 0건 확정 여부와 실제 관계 부재. 관계가 있다면 티어·트리거 불일치로 보고 |

등장·연관 도서 감사는 `figure_book_contents`·`figure_book_characters`를 본다. 이 카탈로그는 실존 축과 무관하게 모든 인물에 붙을 수 있으므로, 관계가 있는 인물이면 티어와 관계없이 감사 대상이다.

등장 작품도 `contents`·`content_locales`의 작품 정체성과 판본 규칙은 공유한다. 다만 인물이 작품을 감상한 것이 아니므로 `source_url`·`review`를 요구하거나 `celeb_contents`로 옮기지 않는다.

`celeb_reality='FICTION'`은 `celeb_contents`를 쓰지 않으므로 감상 관계 감사에서 관계 부재가 정상이다. 실존·전승 판정 자체는 이 문서의 감사 대상이 아니다.

## 감사 절차

### Phase 1: 현재값을 빠짐없이 불러온다

대상의 `celebs.id`·`celeb_tier`·`celeb_reality`를 먼저 고정한 뒤 해당하는 관계, `contents`, 모든 `content_locales`를 함께 조회한다.

- 감상 관계는 `celeb_contents → contents → content_locales`를 본다.
- 등장·연관 도서는 `figure_book_characters → figure_book_contents → contents → content_locales`를 본다.
- locale이 없는 작품도 결과에서 사라지지 않도록 LEFT JOIN한다.
- 수정 전 관계 ID·콘텐츠 ID와 원래 값을 보존한다.

관계 행과 locale의 존재·부재를 모두 목록에 올렸을 때 조회가 끝난다.

### Phase 2: 인물과 작품의 관계를 검증한다

full의 각 `source_url`을 열어 인물과 정확한 작품, 감상·추천·구입 의사를 실제로 잇는지 확인한다. HTTP 응답만으로 통과시키지 않고 본문을 대조한다.

- 404처럼 실제로 사라진 링크는 같은 관계를 뒷받침하는 대체 출처를 찾는다.
- 403·429·봇 차단은 죽은 링크로 단정하지 않는다. 다른 경로로 내용을 확인하고, 확인하지 못하면 미해결로 남긴다.
- 대체 출처가 기존 `review` 전체를 뒷받침할 때만 `source_url`을 교체한다.
- `FINISHED`와 `WANT`가 출처에서 확인되는 행위와 맞는지 본다.
- `review`와 요청 범위의 `review_en`이 출처에 없는 동기·영향·감정을 보태지 않았는지 확인한다.

등장·연관 도서는 작품 안에서 인물의 실제 등장 여부, `relation_type`, 순서, `description`·`description_en`의 작품별 범위를 확인한다. 같은 세계관에 속한다는 이유로 관계를 통과시키지 않는다.

### Phase 3: 작품 정체성과 판본을 검증한다

제목·원저자·원제·외부 ID·ISBN·본문 범위를 대조해 연결된 `contents`가 실제 작품과 같은지 확인한다.

- 번역자·출판사·표지·장정만 다른 판본이 별도 작품으로 중복되지 않았는지 본다.
- 합본·분권·축약·개작처럼 본문 범위가 다른 작품을 원작과 합치지 않는다.
- 한 locale 안의 제목·저자·ISBN·출판사·표지가 같은 판본에서 왔는지 확인한다.
- 외부 메타와 표지 출처의 허용값은 등록 문서와 [`../platform/external-services.md`](../platform/external-services.md)를 그대로 적용한다.

동일 작품 여부를 확정하지 못하면 행을 합치거나 새 작품으로 교체하지 않고 미해결로 남긴다.

### Phase 4: locale과 표지를 검증한다

locale은 검증된 언어판만 존재해야 한다. ko·en 한쪽이 없다는 사실만으로 결손 판정을 내리지 않는다.

- 확인되지 않은 번역 제목·음차 저자·반대 언어 값을 복사해 locale을 채우지 않는다. `sources.title` 표식이 있는 표시용 제목 행은 예외이며 판본 값이 비어 있어야 정상이다.
- locale별 제목·저자·ISBN·표지가 실제 같은 판본인지 확인한다.
- 표지를 확인할 수 없고 `sources.thumbnail='confirmed_unavailable'`로 기록됐다면 정상 예외로 둔다.
- 다른 판본의 표지를 쓰려면 그 판본의 ISBN과 메타도 함께 맞아야 한다.
- 전체 한영 감사를 요청받았다면 `review`와 `review_en`을 각각 같은 근거 범위에서 검사한다. 한국어만 감사하라는 요청에서는 영문값을 만들거나 고치지 않는다.

`review_en`은 `content_locales`의 en 행과 별개인 인물×작품 관계 값이다. 영문판 locale의 유무만으로 `review_en`의 정상 여부를 판정하지 않는다.

### Phase 5: 확인된 오류만 고치고 재조회한다

조회·보고만 요청받았다면 값을 쓰지 않는다. 보완·반영이 범위에 포함된 경우에도 출처와 작품 정체성이 확인된 오류만 수정한다.

- 관계 수정은 인물 ID와 콘텐츠 ID를 함께 고정한다.
- locale 수정은 콘텐츠 ID와 locale을 함께 고정한다.
- 기존 유효값을 빈 문자열·`null`로 덮지 않는다.
- 감사 중 새 후보 작품, 진행 상태, 작업 큐를 만들지 않는다.
- 반영 뒤 같은 조건으로 다시 조회해 관계·작품·locale이 의도한 ID에 남았는지 확인한다.

확인하지 못한 항목을 미해결로 분리하고, 수정한 모든 값이 재조회 결과와 일치해야 감사가 끝난다.

## BOOK 언어 카드 전수 센서스

인물 단위 감사와 별개로 BOOK 언어 카드 전체를 기계로 훑는 기준이다. 카드를 만든 여러 배치가 같은 경로(카카오 제목 검색으로 수입 원서를 `ko`에 저장, OpenLibrary ISBN을 언어 확인 없이 `en`에 저장)를 써 왔으므로 새 배치가 들어오면 다시 돈다. 스크립트는 `sw/web-bo/scripts/figure-books/`에 있고 `sw/web-bo`에서 `node --env-file=.env scripts/figure-books/<파일>`로 실행한다.

| 감지 항목 | 기준 | 판정 |
|---|---|---|
| `ko` 카드 영문 제목 | `title`에 한글이 없음 | 한국 ISBN이면 카카오 ISBN 역조회로 제목이 맞을 때 정상(「1Q84 1」). 그 외는 카카오 저자·제목 검색으로 한국어판을 찾아 교체하고, 없으면 한국어 번역 제목의 표시용 제목 행(`sources.title='translated'`)으로 바꾼다 |
| `ko` 카드 영문 소개문 | `description`이 `KAKAO`·`DAUM`·`OPEN`·NULL이 아니고 한글이 없음 | 결함. 소개 본문을 저장하지 않고 표식만 둔다 |
| `ko` 카드 ISBN 없음 | `isbn` NULL이고 `sources.title` 표식 없음 | 검증되지 않은 번역·음차 제목. 카카오 제목·저자·결합 질의로 한국어판을 찾아 채우고, 없으면 표시용 제목 행으로 표식을 붙인다. 음차 제목(「위 곤 비 올라잇」)은 번역 제목으로 바꾼다. `sources.title` 표식이 있으면 정상 |
| `ko` 카드 비한국 ISBN | 978·979로 시작하는데 978-89·979-11이 아님 | 한글 제목에 영문판 ISBN을 복사한 카드(「고기를 먹어야 할까?」 9781118278727). 한국어판을 찾아 교체하고, 없으면 ISBN을 비워 표시용 제목 행으로 바꾼다. 카카오가 옛 국내서에 주는 바코드형 13자리(2008238000098 등)는 ISBN이 아니므로 제외한다 |
| `en` 카드 비영어권 ISBN | 978-0·978-1·979-8 밖 | OL 작품→판본 경로로 `eng` 판본을 찾아 교체한다. OL 태그만 믿지 않고 제목 언어·출판사를 같이 본다. 못 찾으면 [`celeb-02-05-figure-books.md`](celeb-02-05-figure-books.md)「작품 정체성」의 미확인 `en` 처리 규칙을 따른다 |
| 언어 카드 0장 작품 | `content_locales` 행 없음 | 관계가 있으면 대표 ISBN으로 카드를 만든다. 관계·기록 참조가 전혀 없으면 원행을 백업하고 지운다 |
| 대표 ISBN 불일치 | `contents.external_id`가 어느 카드 ISBN과도 다름(카드에 ISBN이 하나도 없는 작품은 제외) | `locale-rep-fix.mjs`가 `ko` 한국 ISBN → `en` 영어권 ISBN 순으로 맞춘다. `external_id`는 유일 인덱스라 그 ISBN을 이미 다른 작품이 대표로 쓰면 실패하는데, 그 경우는 같은 책이 두 작품으로 갈린 중복이다. 쌍을 뽑아 `merge-works.mjs`로 통합한다. 남길 작품은 카드 ISBN을 대표로 쓰는 쪽이다. 회원 기록(`member_contents`)은 스크립트가 옮기며, `contents.record_count`는 셀럽 감상 수까지 합친 값이라 회원 기록 유무의 판정 기준으로 쓰지 않는다 |

- 정상 예외(결함으로 잡지 않는다): 카카오가 옛 국내서에 주는 바코드형 13자리 `ko` 카드, 악보의 ISMN, 한국 ISBN을 단 영문 원문 POD(`en`만 둔다), 영어권 출판사(Springer·Tuttle·인도·싱가포르·홍콩 등)의 `en` 카드, 기관 선정 적재분에서 옮겨 온 수입 원서 `en` 카드(`sources.primary='kakao_book'`, `note`에 imported foreign edition — [`../service/curated-lists.md`](../service/curated-lists.md) 5-4).
- `content_locales.updated_at`은 갱신에도 바뀌지 않아 시각으로 변경을 추적할 수 없다. 26.09.11 갱신한 「바리바리 전설」·「화학 원론」 `ko` 행이 03-06 원상태로 돌아가 있던 원인 미상 사례가 있다(다시 반영함). 재발하면 원인을 찾는다.
- 판본 범위가 달라 통합에서 뺀 쌍은 [`../../todo/celeb/README.md`](../../todo/celeb/README.md)에 둔다.
- 집계: `locale-census.mjs`(전체·배치별, `--out`으로 목록 저장) · `locale-verify.mjs`(인물 연결분·비연결분 분리).
- 교정: `locale-plan-apply.mjs`(계획 JSON의 `koFix`·`koDel`·`enFix`) · `locale-restore.mjs`(지운 카드 복구·카드 0장 작품에 카드 신설) · `locale-display-title.mjs`(미확인 언어 카드를 표시용 제목 행으로 전환·신설) · `locale-dead-works.mjs`(참조 없는 카드 0장 작품 삭제 — `contents`를 가리키는 표 전부를 참조로 본다) · `../contents/display-names-apply.mjs`(표시용 행 저자명을 그 언어 표기로, ko 표시행 신설) · `../contents/book-availability-sync.mjs --aladin`(실판본 절판 표식, 표본 점검용). 모두 dry-run이 기본이고 `--apply`로 반영한다.
- 카카오 저자 검색은 결과 10건이 한도라 다작 저자(스티븐 킹)의 책을 놓친다. 제목 검색과 제목+저자 결합 질의를 함께 돌리고, 후보의 저자·역자·출판사로 동명이서를 가른 뒤 채택한다. 카드 제목만 보고 고르면 「열역학 강의」(플랑크)에 손탁의 교재가 붙는다.
- ISBN을 바꾼 행은 `data/celeb/figure-books/locale-restore-log.jsonl`에 `op`가 `koFix`·`enFix`·`ko-restore`·`en-create`·`ko-create`로 남는다. 소개 출처 재선정이 이 로그를 읽는다. 지운 행은 같은 폴더의 `*-backup.jsonl`에 원행이 있다.
- 새 카드의 소개 표식은 `@feelandnote/content-search/book-introduction`의 `fetchBookIntroduction({ isbn, locale })`로만 정한다. 소개를 받지 못하면 `description`은 NULL이다.
- 표시용 제목 행 판정은 `sources.primary='none'`이고 `sources.title`이 `translated`·`romanized`·`original` 중 하나일 때다. `sources.title`은 옛 등록 경로가 제목 필드의 출처 URL로도 쓰던 키라(3,788행) 값이 있다는 것만으로 표시행으로 보면 정상 한국어판에 `[no-ko]`가 붙는다. 웹 배지·검증 스크립트·배치 모두 같은 기준을 쓴다.

## 보고

```text
## 감사 결과
| 콘텐츠 | 관계 근거 | 작품·판본 | locale·표지 | 문장 | 판정 |

## 수정 내역
| 대상 ID | 변경 전 | 변경 후 | 근거 |

## 미해결
| 대상 ID | 확인하지 못한 항목 | 필요한 확인 |
```
