# 콘텐츠 등록

이 문서는 작품 정체성·판본·외부 메타·locale을 확인하고 `contents`와 관계 테이블에 등록하는 규칙을 쥔다. 실존 인물의 감상 근거는 [`celeb-02-01-content-research.md`](celeb-02-01-content-research.md), 감상경위 문장은 [`celeb-02-03-content-review.md`](celeb-02-03-content-review.md)를 따른다.

fiction도 BOOK 메타와 `content_locales` 규칙은 이 문서를 공유하지만 `celeb_contents`를 사용하지 않는다. 작품 속 인물 관계는 `figure_book_contents`·`figure_book_characters`에 저장한다.

## 작품과 판본

`contents` 한 행은 판본이 아니라 작품을 대표한다. ISBN은 대표 판본을 조회하는 키이지 작품 식별자가 아니다.

- 외부 API보다 먼저 `content_locales`의 한국어·영문 제목과 원저자로 기존 작품을 찾는다. 통칭과 국내 정식 제목·띄어쓰기가 다를 수 있으므로(『더 파이팅』→『더 화이팅』, 『헌터×헌터』→『헌터 X 헌터』) 영문 1권 ISBN 소유와 영문 제목으로도 대조한다.
- 번역자·출판사·표지·장정·개정·주석 차이만 있으면 기존 `contents`를 재사용한다.
- 원문·번역별 판본, 시리즈 대표 정리와 축약본 배제, 독립 선집·해설·재화의 구분은 [`celeb-02-05-figure-books.md`](celeb-02-05-figure-books.md)의 「작품·판본·상품」을 따른다. 본문 범위나 ISBN 차이만으로 별도 작품을 만들지 않는다.
- 같은 구성으로 이어지는 연속권(아동 학습 시리즈·신화 전집 등)은 정식 한국어판 1권 하나만 연결한다. 서점 페이지마다 인물의 글이 권별로 따로 있어도 2권 이후는 등록·연결하지 않고, 1권 글로 쓴다(26.11.11 사용자 지시). 제목과 내용이 따로 선 후속 소설(『듄』 2부, 『삼체』 2부 등)은 각각의 작품이다.
- 만화 시리즈는 정식 한국어판 1권을 대표 작품으로 등록하고, 영문 카드도 같은 시리즈의 영문판 1권으로 맞춘다. 인물이 시리즈 전체를 감상했어도 권별·세트·완전판 묶음으로 작품을 늘리지 않는다. 기존 시리즈 대표가 있으면 판형(완전판·소장판)이 달라도 재사용하고, 실제로 읽은 범위·판형·연재 매체는 감상경위에 적는다.
- 같은 작품인지 확정하지 못하면 새 행을 만들지 않는다. ISBN 중복 검사만 통과한 것은 작품 중복 검사가 아니다.
- 신규 BOOK을 만드는 경로는 ISBN 소유 작품과 원작 키를 직접 조회하지 않고 [`book-work-lookup.ts`](../../../packages/content-search/src/book-work-lookup.ts)를 호출한다. 소유 작품이 여럿이면 하나를 고르지 않고 등록을 멈춘다.
- 공급처 검색을 제목 앞부분 일치로 자동 매칭하면 속편(『곰돌이 푸 코너의 집』), 외전, 컬러링북, 게임 번들·DLC·시즌 상품, 다른 영상화가 잡힌다. 매칭된 제목이 원 제목과 정확히 같지 않은 건은 전부 사람이 판정한 뒤 반영한다.
- 번역서 저자 표기는 판마다 다르다(J. K. 롤링/조앤 K. 롤링). 해외 인물이 원서로 읽은 책은 OpenLibrary 원서 판을 먼저 찾는다.
- 기존 작품을 재사용할 때 새로 찾은 판본으로 기존 locale 메타를 함부로 덮어쓰지 않는다.
- 대표 ISBN이 같은 원전의 실재 구판이면 현재 카드 ISBN과 달라도 유지한다. 같은 본문의 신판은 ISBN이 달라도 추가 판본으로 늘리지 않는다. 같은 번역의 상품 차이를 판본으로 추가하지 않는다. 서로 다른 번역의 판본 구분은 인물 도서의 「작품·판본·상품」을 따른다.

## 타입별 메타 원천

외부 서비스의 현행 연결과 환경변수 이름은 [`../platform/platform-05-external-services.md`](../platform/platform-05-external-services.md)와 [`../platform/platform-04-env-vars.md`](../platform/platform-04-env-vars.md)가 쥔다. 직접 `curl` 명령을 복제하지 말고 `packages/content-search`의 래퍼를 사용한다.

| 유형 | 정식 메타 경로 | `external_source` |
|---|---|---|
| BOOK 한국어판 | `kakao-books.ts` | `kakao_book` |
| BOOK 영문 원서 | `openlibrary.ts` | `openlibrary` |
| VIDEO | `tmdb.ts` | `tmdb` |
| GAME | `igdb.ts` | `igdb` |
| MUSIC | `itunes-music.ts` | `itunes` |

Google Books와 네이버 도서는 신규 BOOK 메타·표지에 사용하지 않는다. Google Books의 소개문 수집 예외는 외부 서비스 문서를 따른다. Amazon은 BOOK 메타 원천이나 `external_source`가 아니다. 등록하지 않을 뿐 정보 확인에는 쓴다. 상품 상세의 서지(판형·출간일·부제·전체 저자·번역자)·추천사(Editorial Reviews·Praise)·미리보기·고객 리뷰는 판본 정체성, 원제·본문 범위, 신간의 실재, 인물의 추천·감상 근거를 대조하는 자료다. 이렇게 확인한 뒤 등록 값은 위 정식 메타 경로에서 가져오고, 아마존 값을 `content_locales` 메타로 옮겨 적지 않는다. 구매 링크를 `content_locales.affiliate_url`에 두는 것은 메타 등록과 별개다. 기존 등록 BOOK을 보완할 때 정식 메타 경로에 해당 판본의 데이터가 없으면 공식 출판사·도서관 등의 실물 서지와 본문 근거를 대조해 메타·표지를 채운다. `sources`에는 실제 확인한 자료의 URL을 기록하고, `external_source`를 허용 공급처에서 받은 것처럼 꾸미지 않는다. 과거 `sources`에 남은 공급처명만으로 오염으로 판정하지 않는다.

## BOOK

### 한국어판 확인

1. 한국어 제목과 원저자로 기존 `contents`를 찾는다.
2. 한국어 출판명을 모르면 서점 검색으로 실제 제목을 파악한 뒤 카카오로 확인한다.
3. 카카오 결과의 제목·원저자·ISBN·판매 상태를 대조한다. ISBN은 [`toIsbn13`](../../../packages/content-search/src/book-isbn.ts)으로 체크 숫자를 검증하고 ISBN-13으로 정규화한다. 공급자 상품 코드는 ISBN이 아니므로 `sources.provider_product_id` 등에 따로 보존한다.
4. `정상판매`이고 제목·저자가 일치하면 판본 실재를 확인한 것으로 본다.
5. `품절`·`절판`, 판매 상태 없음, 카카오 미검출이면 YES24·교보문고·알라딘 가운데 한 곳의 해당 ISBN 상품 상세 페이지가 열리는지 추가로 확인한다.

ISBN만 있거나 검색 스니펫·출판사 소개·도서관 소장 정보만 있는 판본은 신규 메타 등록을 통과하지 못한다. 제목·저자·ISBN을 모두 대조하고, 원제·목차·편저 표시로 동명 해설서·학습서·필사본·분권·다른 번역판의 정체성과 범위를 확인한다. 아래 절판 원어 작품 예외 외에는 ISBN과 실제 판본을 확인하지 못한 신규 BOOK을 만들지 않는다. 기존 카탈로그의 ISBN 없는 실재 구판은 공급자 코드와 확인 근거를 보존하며 표시용 제목 행으로 바꾸지 않는다. 현재 유통되는 리프린트가 같은 본문으로 확인되면 신규 작품의 대표 키로 사용할 수 있다.

한국어판을 확인하지 못했으면 ISBN·출판사·표지를 지어내지 않는다. 대신 **표시용 제목 행(display-title row)** 을 둔다. 이 행은 제목·저자 표기를 채우고 `isbn`·`publisher`·`thumbnail_url`은 비우며, `sources.primary='none'`과 `sources.title`에 `'translated'`(번역)·`'romanized'`(음차)·`'original'`(통용 영어 제목이 없거나 영어가 원어라 원제 유지) 중 하나를 적어 실제 판본 행과 구분한다. 작품·언어가 확인된 소개 본문과 번역문은 이 행에도 보관한다. 판본 미확인이나 ISBN 교체를 이유로 기존 소개를 지우지 않는다. 표시용 제목 행 판정은 `sources.primary='none'`이면서 `sources.title`이 이 세 값 중 하나일 때만이다. 옛 등록 경로가 `sources.title`에 제목 출처 URL을 넣은 행이 있으므로 키 존재만으로 판정하지 않으며, URL 값은 덮어쓰지 않는다. 화면은 이 행의 제목 앞에 `[no-ko]` 배지를 붙인다. 실제 판본이 확인되면 이 행을 공식 값으로 덮는다. 표시용 행의 `creator`는 **그 언어의 표기**로 적는다 — ko 행은 외래어 표기법에 따른 한국어 이름(국내 출판 관행 표기가 있으면 그것), en 행은 로마자 이름이다. 다른 사람으로 바꾸거나 없는 저자를 지어내지 않는다. 배치 반영은 `sw/web-bo/scripts/contents/display-names-apply.mjs`가 한다(26.09.13 사용자 결정: 「번역본이 없을 때 제목·저자명을 번역해 넣고 번역본 없음을 표기한다」).

### 절판 — 판본이 없는 원어 작품 (26.09.13)

기관 선정 목록에 오른 옛 한국 작품처럼 **원어가 한국어인데 지금 유통되는 판본이 없는 책**은 「번역본 없음」이 아니다. 이런 책은 작품을 만들어 목록에 잇되(`external_source`·`external_id` 비움), ko 행은 원제·저자를 든 표시용 행(`sources.primary='none'`, `sources.title='original'`)으로 두고 **`sources.availability='out_of_print'`** 를 적는다. 화면은 이 표식을 판본 확인보다 먼저 보고 「절판된 책 / Out of print」 띠를 붙인다(`content-locale.ts`의 `resolveTitleBadge`). 실재 판본을 카카오에서 확인했는데 판매 상태가 `절판`·`품절`이면 그 판본 행에도 같은 표식을 둔다. 새 컬럼을 만들지 않고 `sources` JSONB 한 키로 끝낸다. 선집·전집만 남은 작품은 선집을 판본으로 삼지 않고 이 절차를 따른다. 실행점은 `sw/web-bo/scripts/curated/research-apply.mjs`다.

감상 근거가 확인된 외국어 원전도 확보할 수 있는 한영 판본을 끝까지 찾은 뒤 없으면 건너뛰지 않는다. 같은 방식으로 판본 없는 작품을 만들고 ko·en 두 표시용 행에 `sources.availability='out_of_print'`를 둔다(26.10.29 사용자 결정). 독서 방식 책장 반영에서는 `scripts/browser/reading-way-books-apply.mjs`가 이 형식을 받는다.

실판본의 절판 여부는 카카오 검색 API의 `status`가 `절판`일 때, 또는 카카오가 상태를 비워 둔 책을 알라딘 상품 페이지(`wproduct.aspx?ISBN=`)의 `schema.org` `availability`가 `OutOfStock`이고 본문에 「절판」 문구가 있을 때 인정한다(26.09.13 실측: 카카오 빈 상태 표본 4권 전부 알라딘 절판, 정상판매 2권은 InStock). YES24·교보·다음 책은 스크립트 렌더링이라 한 번의 요청으로 못 읽는다. 실행점은 `sw/web-bo/scripts/contents/book-availability-sync.mjs --aladin`이며, 26.09.13에 한국어 실판본 전량을 한 번 돌렸다. **이후로는 전수 조회를 반복하지 않고** 새 등록분이나 표본(`--limit`)만 가끔 점검한다(사용자 결정).

감상·연결 도서가 **현역 판본이 있는데도 절판 판본 하나에만 묶여** 절판 띠가 붙거나 감상 선반에서 빠지는 경우가 있다(난중일기 완역본이 품절된 옛 ISBN에 묶였던 사례). 「현역 판본이 존재하는가」를 건별로 확인한 뒤 고친다. 진짜로 유통이 끝난 책도 있으므로 절판 표시를 일괄로 지우지 않는다. `sw/web-bo/scripts/contents/book-edition-refresh.mjs`는 정규화 제목과 저자 겹침으로 후보를 찾는다. 이것만으로 동일 저작을 확정하지 않고 원제·본문 범위를 대조하며, 현역 판본을 추가해도 실재 구판과 그 대표 키는 보존한다. 권수만 다른 다권본, 속편만 팔리는 시리즈, 판매 판본이 없는 절판서는 절판 표시가 맞는 상태로 둔다. 같은 저작이 여러 `contents`로 갈라졌으면 `merge-works.mjs`가 목록·컬렉션·기록·노트 연결까지 옮긴다.

### 영문판과 표지

Amazon 상품 연결·배치 실행·API 이용 조건은 [제휴 상거래의 Amazon 규칙](../operations/ops-03-affiliate-commerce.md#amazon-associates)을 따른다.

- OpenLibrary에서 영문 제목·원저자·ISBN과 본문 언어를 확인한다. ISBN 국가군과 `eng` 태그는 단서일 뿐이며, 판본 제목·출판사·원제·본문 범위를 함께 대조한다. 제목이 영어여도 다른 언어 번역이나 오디오북·해설서이면 원전의 영문 BOOK 판본으로 쓰지 않는다.
- 표지는 ISBN 기반 OpenLibrary cover를 사용하고, 없으면 같은 ISBN의 카카오 표지를 쓴다. 둘 다 없으면 같은 판본임을 눈으로 확인한 서점·출판사 표지를 `figure-books:book` 명세의 `en.cover{url,sourceUrl}`로 넣는다(아마존은 `images-na.ssl-images-amazon.com/images/P/<ISBN-10>.01.LZZZZZZZ.jpg`). `sources.thumbnail`에는 표지를 받은 페이지 URL을 남긴다. 응답 성공이나 cover ID만으로 채택하지 않고 실제 이미지의 제목·저자·판본을 대조한다. `-1` 같은 결손값, placeholder, 속표지·본문 페이지, 식별할 수 없는 장정 이미지는 표지로 쓰지 않는다. 이전의 `confirmed_unavailable`도 새로 확인한 같은 ISBN의 정상 표지가 있으면 보완한다.
- 한 locale 안의 ISBN·표지·출판사·제목은 같은 판본에서 가져온다. ko와 en이 서로 다른 판본인 것은 정상이다.
- 책 표지는 같은 판본의 큰 원본을 우선 저장한다. 신규 카카오 수집은 공통 래퍼의 원본 주소, OpenLibrary 수집은 L 크기를 사용하며, 수동 등록도 축소 썸네일을 그대로 저장하지 않는다.
- 기존 책과 신규 등록 뒤 표지 검사는 `sw/web-bo`에서 `pnpm contents:book-covers --upgrade-low-resolution`을 쓴다. 전체 언어 카드·판본의 이미지 크기를 실측하고, 작은 표지는 같은 ISBN의 교보·아마존 이미지와 예스24 상품을 자동 조회한다. 크기 기준과 이미지 일치 기준은 `book-low-resolution-upgrade.mjs`가 쥔다. 기본은 미리보기이며 `--apply`가 같은 ISBN·같은 이미지·실제 해상도 증가를 통과한 표지와 출처만 교체하고 재조회·캐시 갱신한다. `--upgrade-thumbnails`는 축소 주소를 같은 공급처의 큰 버전으로 바꾸는 별도 단축 경로이며 전체 실측을 대신하지 않는다.
- 이 정비에는 책별 LLM 호출·수동 조사·AI 업스케일링을 쓰지 않는다. 더 큰 동일 표지를 확보하지 못했거나 열람·비교에 실패한 표지는 해결로 세거나 별도 조사 과제로 만들지 않는다. 이미지 크기 캐시는 작업 중 OS 임시 폴더에서만 쓰며 DB 덤프는 만들지 않는다.
- 메타와 표지 출처가 다르면 `sources`에 각각 기록한다. 표지를 확인하지 못하면 `thumbnail_url=null`, `sources.thumbnail='confirmed_unavailable'`로 둔다.
- 출간됐지만 카카오·OpenLibrary에 아직 없는 영어 신간은 출판사 상품 페이지에서 ISBN·판형·출판사·표지를 확인해 en 판본 행을 채운다(26.10.30 사용자 지시). `sources.primary='publisher'`, `sources.isbn`에 ISBN을 확인한 출판사 페이지를 적고, 다른 항목도 실제로 확인한 페이지 URL을 남긴다. 작품의 `external_source`·`external_id`는 비우고 ko는 표시용 제목 행으로 둔다. 절판 표식은 붙이지 않는다. 독서 방식 책장 반영에서는 `reading-way-books-apply.mjs`가 이 형식을 받는다.
- 같은 형식을 **OpenLibrary 기록 결함으로 표준 등록기를 넘지 못하는 실재 도서**에도 쓴다(26.11.07 사용자 지시). 대상은 저자 ID 중복, 낭독자·번역자 혼입, 원전 기록의 공저자 누락, 언어 누락으로 어떤 판본도 통과하지 못하는 책이다. 출판사 페이지를 먼저 찾고, 절판 등으로 없으면 대형 서점·도서관 목록을 쓴다. 이때도 `primary`는 `publisher`이며 실제 출처는 `sources`의 URL로 구분한다. 종이책 ISBN-13을 쓰고 저자 전원을 적는다. 등록 전에 ISBN과 제목·저자로 기존 작품을 먼저 찾는다.
- **카카오 판본에 저자만 비어** 표준 등록기가 「공급처에서 판본의 제목·원저자·출판사를 확인할 수 없습니다」로 막으면 폐기하지 않는다. 같은 ISBN13의 YES24 상품 서지로 저자를 확인해 [`kakao-books.ts`](../../../packages/content-search/src/kakao-books.ts)의 `REVIEWED_MISSING_AUTHORS`에 ISBN13·다음 책 ID·저자와 YES24 주소를 올린 뒤 표준 등록기로 등록한다. 번역자는 넣지 않는다. 카카오에 판본이 아예 없는 한국어 원작 절판본은 위 「절판」 표시용 작품으로 처리한다.
- OpenLibrary 판정의 함정. **"creator is not declared" 오류를 별칭으로 고치면 안 되는 경우가 있다.** 원전 저자가 판본 저자의 일부이면 등록기가 원전 쪽을 택하므로 별칭을 넣으면 공저자가 조용히 빠진다. 언어가 적힌 판본만 통과해 전자책 ISBN이 들어오기 쉬우니 판형을 확인한다. `no verifiable cover`는 일시 실패가 많아 한 번 다시 돌린다. 등록기는 OpenLibrary·카카오·`en.cover` 순으로 표지를 고르며 자리표시와 속표지를 거르지 못하므로, 표지를 눈으로 확인한다.
- 카카오·OpenLibrary에 없거나 표지가 없는 판본은 YES24 상품 페이지에서 ISBN·출판사·표지를 확인해 채울 수 있다(26.11.06 사용자 지시). `sources.primary='yes24'`, `sources.isbn`·`sources.thumbnail`에 상품 URL을 남기고 표지를 눈으로 대조한다. 「이미지 준비중」 같은 자리표시 이미지와 다른 언어 번역판은 쓰지 않는다. 작품에 `figure_book_editions` 행이 있으면 같은 언어·같은 판본 행도 함께 넣는다. 상세 화면은 판본 표를 먼저 읽어, 언어 행이 없으면 다른 언어의 제목과 표지를 보여 준다. OpenLibrary 장애 때는 공식 등록 경로 대신 카카오의 같은 ISBN 판본으로 영문 행을 직접 등록할 수 있다(26.11.07 사용자 지시, `sources.primary='kakao_book'`). 제목이 일치할 때만 쓰고, 판본 표에 행이 없는 작품은 화면이 로케일 값을 그대로 쓴다.
- 검증 가능한 영문판이 없으면 판본 값을 채우지 않고 표시용 제목 행만 둔다(「한국어판 확인」의 표시용 제목 행 규칙과 같고 배지는 `[no-en]`). 한국어 도서의 영문 표시 제목은 **제목의 뜻을 옮긴 영어 번역 제목**을 기본으로 한다(`translated`). 실제 영문 번역판이 있으면 그 출판 제목을 쓰고(예: 채식주의자 → `The Vegetarian`), 표지에 출판사가 넣은 영문 부제가 있으면 그것을 우선한다. 영어권 관용이 음차 표기를 유지하는 고유명사 제목(예: `Liezi`, `Hong Gildong jeon`)만 `romanized`로 둔다 — 그 밖의 음차 표기는 영어 독자에게 의미 없는 문자열이라 금지한다(26.09.22 사용자 결정). EN 페이지에 한글 제목이 그대로 나가는 쪽이 더 크리티컬하므로 en 표시용 제목을 먼저 채운다.

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

BOOK 소개는 기존 `description`에 외부 출처 표시 또는 필요한 번역문을 둔다. 유형별 소개문 출처 채널의 실측 특성은 [`celeb-02-06-content-introduction-sources.md`](celeb-02-06-content-introduction-sources.md)가 쥔다. 예약값은 [`book-introduction-contract.ts`](../../../packages/content-search/src/book-introduction-contract.ts)가 쥔다. `NULL`은 조사 필요이며 별도 확인 완료 값을 만들지 않는다. 한국어는 같은 ISBN의 카카오·다음 소개 중 긴 유효 본문을 최초 선정하고, 영어는 OpenLibrary의 영문 소개를 확인한다. 실제 소개를 받은 뒤 출처 표시와 조회 주소(`sources.description`)를 저장하며, 화면은 선정된 출처만 조회·캐시한다. `figure_book_editions`의 판본 행도 같은 표시와 주소를 함께 갱신한다. 사용자 웹 등록·백오피스 외부검색 등록·인물 도서 배치는 등록 시점에 이 조회를 실행해 표시와 주소를 바로 저장하고, 소개를 받지 못하면 `NULL`로 둔다. 판본 ISBN을 바꾸면 소개 표시와 주소도 새 ISBN으로 다시 받는다. 백오피스 편집은 이를 강제하며 배치도 같은 순서를 따른다. 반대 언어에만 소개가 있으면 번역문을 해당 언어에 보관하고 그대로 표시한다. 일시적 조회 실패로 출처 표시나 번역문을 지우지 않는다. 기존 소개는 외부 복사본·번역·수기 작성 여부를 확인해 전환하며, 출처가 불명확한 문장을 일괄 삭제하지 않는다. `contents.metadata`에는 소개 복사본을 새로 만들지 않는다. 전환 실행점은 `sw/web-bo/scripts/contents/book-description-sources.ts`이며 기본 실행은 DB를 바꾸지 않는다. 대량 전환은 한 프로세스에서 ISBN마다 순차 호출하고 간격은 스크립트 상수가 쥔다. `--verify-markers`는 출처 표시가 박힌 모든 행을 재검증한다 — 저장된 출처 주소를 먼저 풀어보고, 실패하면 ISBN 기반 신규 조회를 시도하며, 둘 다 소개가 없으면 `NULL`(조사 필요)로 내리고 출처 주소는 `sources.description`에 보존한다. 기존 전환 전 복구본은 `D:\feelandnote\backups\book-descriptions`에 있다. 전환 결과 검증까지 보존하고, 이후 정리는 [작업 파일·백업 원칙](../data/README.md#작업-파일백업)을 따른다.

비어 있는 한국어 소개는 `sw/web-bo/scripts/contents/recover-book-introductions.ts --locale ko --provider yes24 --all-missing`으로 YES24에서도 보완한다. 기본은 미리보기이며 `--apply`가 저장한다. 상품 API의 ISBN·제목·저자를 기존 판본과 대조하고, 상품 페이지의 ISBN13을 다시 확인한 뒤 `#infoset_introduce textarea.txtContentText`에서 한국어 책소개만 추출한다. HTML에서 받은 본문은 기존 `description`에, 상품 주소는 `sources.description`에 저장하므로 방문 때 다시 스크래핑하지 않는다. 기존 소개는 보존하고, 원본 백업·동시 수정 검사·저장 후 재조회·운영 캐시 갱신을 거친다. 수집 결과는 로컬에 남아 재실행 때 재사용하며 `--lookup-cache`로 다른 수집 폴더를 지정할 수 있다. 영문 자동 쓰기는 기존 KO/EN 작품 불일치가 있어 차단되어 있으며, 작품명·원저자·판본을 개별 확인한 뒤에만 보완한다.

ISBN 없는 표시용 한국어 행도 원서의 작품·저자·판본과 실제 소개가 확인되면 소개를 번역해 저장할 수 있다. 한국어 ISBN은 번역의 선행 조건이 아니며, 번역으로 한국어판의 실존을 확인한 것으로 처리하지 않는다. `sources.primary=none`·제목 번역 표식이나 과거 저자 검색의 후보 0건은 국내판 부재의 증거가 아니다. 기존 `del`·`del-confirmed` 기록은 검색어·검색 범위를 함께 확인한다. 검수한 영문 소개의 한국어 번역은 `sw/web-bo/scripts/contents/apply-book-introduction-translations.ts --plan FILE`로 미리 보고 `--apply`로 저장한다. 원문 URL, `description_method=translation`, `description_source_locale=en`을 보존하며, 번역 대상과 원서 행 모두 검수 당시 값이 유지되는지 검사한다. 목차·독자 후기·서지 정보·다른 작품 소개는 번역 대상으로 삼지 않는다.

사용자 웹은 책 소개 본문과 함께 실제 출처 배지를 표시한다. 판정과 판본별 선택은 `sw/web/src/lib/utils/book-description.ts`가 맡는다. 선택 판본의 소개·출처가 없거나 조회에 실패해도 대표 판본·카드의 임시 소개·다른 공급처로 fallback하지 않는다. 번역 소개도 보존된 원본 소개 출처로 표시하며 Open Library 배지는 `OL`로 줄인다. F&N은 직접 작성한 소개에만 사용한다. 책 메타데이터의 공급처나 저장 본문이라는 이유로 출처를 추정하지 않으며, 근거가 없는 본문은 출처 미확인으로 표시한다.

영상·게임·음악의 비어 있는 소개는 `sw/web-bo/scripts/contents/collect-video-introductions.ts`, `collect-game-introductions.ts`, `collect-music-introductions.ts`로 공급처 원문과 검수 계획을 수집한다. 이 수집기는 DB를 쓰지 않는다. 외부 ID만 믿지 않고 기존 작품명·언어별 제목을 대조하며, 게임 본편과 제작 도구·DLC, 음악의 곡과 음반·가수 약력을 구별한다. 검수된 계획은 같은 폴더의 `apply-media-introductions.ts --plan FILE`로 검사하고 `--apply`로 저장한다. 원본 백업과 동시 수정 검사, 저장 후 재조회, 운영 캐시 갱신을 수행하며, 번역은 실제 원문 URL과 번역 여부·원문 언어를 보존한다. 모델 호출은 사용자가 승인한 CLI 스킬의 헬퍼를 사용한다.

콘텐츠 전체 수집을 발주받았으면 확인 가능한 한국어·영문 메타를 같은 작업에서 확보한다. 사용자가 한국어 데이터만 작성·교정하라고 범위를 제한했다면 en 행이나 `review_en`을 임의로 만들지 않는다.

- `contents`에는 title·creator·thumbnail_url 같은 locale 컬럼이 없다. 모든 언어별 메타는 `content_locales`에 둔다.
- 제목에 한글이 없다는 사실이나 ISBN 국가군만으로 판본 언어를 확정하지 않는다. 「1Q84」·「G」 같은 한국어판과 영문 원문을 담은 국내 POD를 구별하고, 카카오의 수입 원서는 본문 언어를 확인해 해당 locale에 둔다. `resolveBookLocale`의 제목 휴리스틱은 등록 후보의 기본값이며 언어 검증을 대신하지 않는다.
- 작품을 지우거나 합치는 도구는 `contents`를 가리키는 표 전부(`celeb_contents`·`member_contents`·`curated_list_items`·`flow_nodes`·`records`·`notes`·`figure_book_*`)를 참조로 본다. 하나라도 있으면 지우지 않고, 합칠 때는 keep 쪽으로 옮긴다.
- VIDEO는 TMDB ko/en, GAME과 MUSIC은 검증된 한국어 정식 표기와 기본 영문 메타를 사용한다.
- 한 언어의 판본을 확인하지 못했다고 반대 언어 값을 복사하지 않는다.

## 외부 ID

| 유형 | `external_id` |
|---|---|
| BOOK | 대표 판본 ISBN-13. ISBN 없는 실재 구판의 공급자 URL·코드와 절판 원어 작품의 빈 값은 별도 확인 근거를 보존한다 |
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

셀럽 감상 관계는 실제 감상한 작품만 `FINISHED`로 등록한다. 앞으로 감상하겠다는 의사만 확인된 작품은 `WANT`를 포함해 어떤 상태값으로도 `celeb_contents`에 등록하지 않는다. 상태 허용값과 공개 목록·집계 기준은 [감상 관계](../data/data-02-content.md#감상-관계)를 따른다. 기본 `visibility`는 `public`이다. 수정·삭제할 때는 `celeb_id`와 `content_id`를 함께 지정한다.

독서 방식 본문에 나오는 책의 작품·판본을 바꾸거나 새로 연결하면 [독서 방식 「본문이 바뀔 때 함께 처리」](celeb-05-02-reading-way.md#본문이-바뀔-때-함께-처리)대로 본문·감상배경·블로그까지 대조한다.

첫 `celeb_contents` 연결은 DB 트리거가 `light`를 `full`로 자동 승격하고 0건 확정 시각을 비운다. 별도 수동 승격 UPDATE를 하지 않는다.
