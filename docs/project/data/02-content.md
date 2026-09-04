# 콘텐츠 DB

작품 원본과 언어별 메타, 회원·인물의 감상 관계, 인물 등장·연관 도서의 작품·판본·상품 구조를 설명한다. 작품 판정과 외부 API 사용법은 [`../celeb/celeb-02-02-content-registration.md`](../celeb/celeb-02-02-content-registration.md)와 [`../platform/external-services.md`](../platform/external-services.md)가 쥔다.

## 작품과 locale

`contents`는 언어 중립인 작품 원본이다.

- `id`는 UUID 문자열이지만 컬럼 타입은 `text`다. 외부 서비스의 ISBN·TMDB·IGDB·iTunes 식별자는 `external_id`에 둔다.
- `type`은 `BOOK`·`VIDEO`·`GAME`·`MUSIC`이다.
- `member_count`·`celeb_count`·`record_count`는 관계 테이블에서 파생되는 개수다.
- 제목·제작자·표지·설명·ISBN·출판사·제휴 링크는 `contents`가 아니라 `content_locales`에 둔다.
- BOOK 한 행은 작품을 대표한다. 번역·출판사·장정·분권이 다른 판본 때문에 `contents`를 복제하지 않는다.

`content_locales`의 PK는 `(content_id, locale)`이다. 한 작품에 한 언어만 있는 상태도 정상이며, locale 행이 없다는 이유로 작품 원본까지 누락시키면 안 된다.

| 필드 | 의미 |
|---|---|
| `title`, `creator`, `description` | 해당 언어의 표시 메타 |
| `thumbnail_url`, `isbn`, `publisher` | 해당 언어에서 확인한 판본 메타 |
| `affiliate_url` | 역사적 단수형 이름을 유지한 JSONB 배열. 일반 콘텐츠의 locale별 `{ platform, url }` 제휴 링크 |
| `sources` | 필드 출처를 보존하는 자유 JSONB. DB가 키 집합을 강제하지 않는다 |
| `verified` | `null` 미조사 / `true` 확인 / `false` 조사했으나 없음 |

`verified`의 세 상태를 boolean 두 상태로 합치지 않는다. `false`와 `null`은 재수집 여부가 다르다. 신규 수집 제공자와 `sources`에 남아 있는 과거 출처 문자열은 같은 집합이 아니므로, 신규 메타 정책은 외부 서비스 문서에서 확인한다.

### 조회 경계

locale 행을 조건으로 `content_locales!inner` 조인하면 그 언어가 없는 작품이 결과에서 사라진다. 작품 목록은 `contents`를 기준으로 두고 locale을 LEFT JOIN한 뒤 요청 언어와 명시적인 fallback을 선택한다.

```sql
select content.id, locale.title, locale.creator
from contents as content
left join content_locales as locale
  on locale.content_id = content.id
 and locale.locale = :locale
where content.id = :content_id;
```

`contents` 생성만으로 locale 행이 생긴다고 가정하지 않는다. 등록 경로는 작품 원본과 확인된 각 locale을 함께 저장하고 다시 조회한다.

## 감상 관계

| 저장소 | 주체와 의미 |
|---|---|
| `member_contents` | 회원의 감상 상태·평점·리뷰·공개 범위 |
| `celeb_contents` | 실존 인물과 작품 사이의 출처 기반 감상 관계 |
| `records` | 회원의 노트·인용 기록 |
| `notes`·`note_sections` | 구조화된 감상 노트 |

`member_contents`와 `celeb_contents`는 각각 `(주체, content_id)` 관계를 한 번만 가진다. 회원 평점은 `member_contents.rating`에만 있으며 `celeb_contents`에는 평점이 없다. 인물 관계에는 `source_url`과 감상경위 `review`·`review_en`을 사용한다. 조사·등록·감상경위의 세부 경계는 [`../celeb/README.md`](../celeb/README.md)의 콘텐츠 문서군을 따른다.

첫 `celeb_contents` 관계가 생기면 DB가 `light` 인물을 `full`로 승격하고 0건 확정 시각을 비운다. `full` 전환에는 적어도 한 관계가 있어야 한다. 이 티어 의미는 [`../celeb/celeb-00-01-pipeline.md`](../celeb/celeb-00-01-pipeline.md)가 쥔다.

## 인물 등장·연관 도서

인물의 등장·연관 도서 관계는 감상이 아니므로 `celeb_contents`를 사용하지 않는다. 이 카탈로그는 `celeb_tier`·`celeb_reality` 어느 쪽과도 무관하게 모든 인물을 연결한다 — 옛 이름 `fiction_source_*`가 "픽션 전용"이라는 오해를 낳아 `figure_book_*`로 정정했다.

```text
contents
  └─ figure_book_contents       작품을 카탈로그에 지정
       ├─ figure_book_characters  작품 ↔ 인물
       └─ figure_book_editions    작품 아래 실제 읽는 판본
            └─ figure_book_products  판본별 판매 상품과 교체 이력
```

- `figure_book_contents.content_id`는 `contents.id`를 재사용하는 PK다.
- `figure_book_characters`의 PK는 `(content_id, celeb_id)`다. `relation_type`은 `appearance`·`related`만 허용하며 모든 인물 티어를 연결할 수 있다. `related`에서는 `description`·`description_en`이 모두 `NULL`이어야 한다.
- `figure_book_editions.id`가 판본 PK다. locale은 `ko`·`en`, `edition_kind`는 마이그레이션 CHECK 값만 허용한다. ISBN이 있으면 `(content_id, locale, isbn)`이 유일하다. ISBN 없는 판본은 이 유일성 조건에 들어가지 않는다.
- `figure_book_products`는 `edition_id`를 참조한다. 플랫폼은 `coupang`·`amazon`이며, 한 판본·플랫폼에는 활성 상품 하나만 허용한다. 공개 조회는 활성 상품만 노출한다.

작품 선정, 판본 범위, 등장 관계와 설명은 [`../celeb/celeb-02-05-figure-books.md`](../celeb/celeb-02-05-figure-books.md)가 유일하게 쥔다. 쿠팡 상품 검증은 `coupang-book-affiliate` 스킬을 따른다.

## 플로우와 학습

- `flows`·`flow_nodes`·`flow_stages`·`flow_progress`·`saved_flows`: 콘텐츠를 순서와 단계로 묶는 플로우
- `academy_lesson_progress`: 학당 레슨 진행

`flow_nodes.content_id`는 `contents.id`를 참조한다. 옛 라우트 이름이 남아 있어도 DB 모델은 `playlists`가 아니라 `flows`다.
