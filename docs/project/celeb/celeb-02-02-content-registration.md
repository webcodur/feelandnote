# 콘텐츠 등록

이 문서는 작품 정체성·판본·외부 메타·locale을 확인하고 `contents`와 관계 테이블에 등록하는 규칙을 쥔다. 실존 인물의 감상 근거는 [`celeb-02-01-content-research.md`](celeb-02-01-content-research.md), 감상경위 문장은 [`celeb-02-03-content-review.md`](celeb-02-03-content-review.md)를 따른다.

fiction도 BOOK 메타와 `content_locales` 규칙은 이 문서를 공유하지만 `celeb_contents`를 사용하지 않는다. 작품 속 인물 관계는 `figure_book_contents`·`figure_book_characters`에 저장한다.

## 작품과 판본

`contents` 한 행은 판본이 아니라 작품을 대표한다. ISBN은 대표 판본을 조회하는 키이지 작품 식별자가 아니다.

- 외부 API보다 먼저 `content_locales`의 한국어·영문 제목과 원저자로 기존 작품을 찾는다.
- 번역자·출판사·표지·장정·개정·주석 차이만 있으면 기존 `contents`를 재사용한다.
- 합본, 권·부·경전의 특정 구간, 축약·개작·해설·학습서처럼 본문 범위가 달라졌을 때만 별도 작품으로 둘 수 있다.
- 같은 작품인지 확정하지 못하면 새 행을 만들지 않는다. ISBN 중복 검사만 통과한 것은 작품 중복 검사가 아니다.
- 기존 작품을 재사용할 때 새로 찾은 판본으로 기존 locale 메타를 함부로 덮어쓰지 않는다.

## 타입별 메타 원천

외부 서비스의 현행 연결과 환경변수 이름은 [`../platform/external-services.md`](../platform/external-services.md)와 [`../platform/env-vars.md`](../platform/env-vars.md)가 쥔다. 직접 `curl` 명령을 복제하지 말고 `packages/content-search`의 래퍼를 사용한다.

| 유형 | 정식 메타 경로 | `external_source` |
|---|---|---|
| BOOK 한국어판 | `kakao-books.ts` | `kakao_book` |
| BOOK 영문 원서 | `openlibrary.ts` | `openlibrary` |
| VIDEO | `tmdb.ts` | `tmdb` |
| GAME | `igdb.ts` | `igdb` |
| MUSIC | `itunes-music.ts` | `itunes` |

Google Books와 네이버 도서는 신규 BOOK 메타·표지에 사용하지 않는다. Amazon은 BOOK 메타 원천이나 `external_source`가 아니다. OpenLibrary로 판본을 확인한 뒤 구매 링크를 `content_locales.affiliate_url`에 두는 것은 별개다. 서점 상품 페이지는 판본 실재 확인에 사용할 수 있지만 그 서점을 메타 원천으로 기록하지 않는다.

## BOOK

### 한국어판 확인

1. 한국어 제목과 원저자로 기존 `contents`를 찾는다.
2. 한국어 출판명을 모르면 서점 검색으로 실제 제목을 파악한 뒤 카카오로 확인한다.
3. 카카오 결과의 제목·원저자·ISBN·판매 상태를 대조한다. `isbn`에 10자리와 13자리가 함께 오면 13자리를 사용한다.
4. `정상판매`이고 제목·저자가 일치하면 판본 실재를 확인한 것으로 본다.
5. `품절`·`절판`, 판매 상태 없음, 카카오 미검출이면 YES24·교보문고·알라딘 가운데 한 곳의 해당 ISBN 상품 상세 페이지가 열리는지 추가로 확인한다.

ISBN만 있거나 검색 스니펫·출판사 소개·도서관 소장 정보만 있는 판본은 통과하지 못한다. 제목·저자·ISBN을 모두 대조하고, 동명 해설서·학습서·필사본·일부 권·다른 번역판을 원작으로 오인하지 않는다. ISBN이 없거나 어느 경로에서도 실제 판본을 확인하지 못하면 신규 BOOK을 만들지 않는다. 현재 유통되는 리프린트가 같은 본문으로 확인되면 그 판본을 대표 키로 사용할 수 있다.

한국어판을 확인하지 못했으면 한국어 제목과 저자명을 임의로 번역·음차하지 않는다. 확인된 영문 원서만 있는 경우 원제와 영문 저자를 유지하며, 한국어 locale을 꾸며 만들지 않는다.

### 영문판과 표지

- OpenLibrary에서 영문 제목·원저자·ISBN을 확인한다.
- 표지는 ISBN 기반 OpenLibrary cover를 사용하며 placeholder 응답은 폐기한다.
- 한 locale 안의 ISBN·표지·출판사·제목은 같은 판본에서 가져온다. ko와 en이 서로 다른 판본인 것은 정상이다.
- 메타와 표지 출처가 다르면 `sources`에 각각 기록한다. 표지를 확인하지 못하면 `thumbnail_url=null`, `sources.thumbnail='confirmed_unavailable'`로 둔다.
- 검증 가능한 영문판이 없으면 en locale을 만들지 않는다. 동아시아 고전이나 한국 현대 도서의 영문 제목을 번역·음차해 행을 채우지 않는다.

## VIDEO·GAME·MUSIC

### VIDEO

TMDB를 한국어와 영어 locale로 각각 조회해 제목을 확보한다. 영화와 TV를 구분하고, 영어 포스터는 `/images` 결과에서 영어 이미지를 우선하고 없으면 텍스트 없는 포스터를 사용한다. 확인하지 못하면 `sources.thumbnail='confirmed_unavailable'`로 표시한다.

### GAME

IGDB 결과의 정확한 게임과 커버를 사용한다. 기본 영문 메타를 정본으로 삼고 한국어 정식 제목이 확인될 때만 ko locale을 보충한다. 인증과 토큰 갱신은 `igdb.ts` 래퍼가 맡는다.

### MUSIC - Apple Music

음악 후보를 찾은 작업에서 Apple iTunes Search 결과를 확인하고 즉시 등록한다.

- 제목·아티스트가 맞고 `previewUrl`이 있는 정확한 트랙만 채택한다.
- 같은 iTunes 트랙이 있으면 `contents`를 재사용한다.
- KO/EN `content_locales`, `celeb_contents`, `review`·`review_en`, `source_url`을 같은 작업에서 완성한다.
- `previewUrl`이 없으면 플레이어가 재생할 수 없으므로 등록하지 않는다.
- 외부 호출은 한 프로세스에서 순차로 수행한다. 403·429를 결과 없음으로 저장하지 않고 실행을 멈춘 뒤 다시 시도한다.

## locale

콘텐츠 전체 수집을 발주받았으면 확인 가능한 한국어·영문 메타를 같은 작업에서 확보한다. 사용자가 한국어 데이터만 작성·교정하라고 범위를 제한했다면 en 행이나 `review_en`을 임의로 만들지 않는다.

- `contents`에는 title·creator·thumbnail_url 같은 locale 컬럼이 없다. 모든 언어별 메타는 `content_locales`에 둔다.
- VIDEO는 TMDB ko/en, GAME과 MUSIC은 검증된 한국어 정식 표기와 기본 영문 메타를 사용한다.
- 한 언어의 판본을 확인하지 못했다고 반대 언어 값을 복사하지 않는다.

## 외부 ID

| 유형 | `external_id` |
|---|---|
| BOOK | 대표 판본 ISBN-13 |
| VIDEO 영화 | `tmdb-movie-{tmdbId}` |
| VIDEO TV | `tmdb-tv-{tmdbId}` |
| GAME | `igdb-{igdbId}` |
| MUSIC | `itunes-{trackId}` |

접두사는 하이픈으로 연결하고 언더스코어를 쓰지 않는다.

## DB 반영

한 후보의 작품·locale·인물 관계를 중간 상태로 남기지 않는다.

1. 제목과 원저자로 기존 작품을 다시 조회한다.
2. 없을 때만 `contents`를 만들고 외부 ID를 확보한다.
3. 확인된 언어의 `content_locales`를 저장한다.
4. 실존 인물 감상은 `celeb_contents`, fiction 등장은 `figure_book_*`에 연결한다. 둘을 혼용하지 않는다.
5. 실존 인물 관계의 `source_url`·`review`와 요청 범위의 `review_en`을 함께 저장한다.
6. 새 행과 재사용한 행을 모두 재조회해 작품·locale·관계가 의도한 ID에 붙었는지 확인한다.

`celeb_contents.status`는 이미 읽거나 보거나 들은 작품이면 `FINISHED`, 앞으로 감상하겠다고 밝힌 작품이면 `WANT`다. 기본 `visibility`는 `public`이다. 수정·삭제할 때는 `celeb_id`와 `content_id`를 함께 지정한다.

첫 `celeb_contents` 연결은 DB 트리거가 `light`를 `full`로 자동 승격하고 0건 확정 시각을 비운다. 별도 수동 승격 UPDATE를 하지 않는다. DB에 콘텐츠가 확정되면 `sw/remotion/public/episodes/<셀럽>/books/`의 도서 폴더와 `book.ko.json` 초안을 스캐폴딩한다.
