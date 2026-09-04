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

- 확인되지 않은 번역 제목·음차 저자·반대 언어 값을 복사해 locale을 채우지 않는다.
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

## 보고

```text
## 감사 결과
| 콘텐츠 | 관계 근거 | 작품·판본 | locale·표지 | 문장 | 판정 |

## 수정 내역
| 대상 ID | 변경 전 | 변경 후 | 근거 |

## 미해결
| 대상 ID | 확인하지 못한 항목 | 필요한 확인 |
```
