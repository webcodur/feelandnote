# 작품 소개 보완

서비스에 노출되는 책에 소개가 없는 문제를 처리한다. 실제 번역본이 없어 노출되지 않는 언어 카드는 대상이 아니다.

## 현재 도달점

2026-11-10 운영 재집계에서 출력되는 결손(소개 없음)은 한국어 0건·영어 2,347건이다. 기본 선택판뿐 아니라 사용자가 선택할 수 있는 다른 판본과 언어 카드도 포함한 수치이며, 영어 기본 선택판만의 누락은 2,343건이다. 새 책이 계속 등록되므로 현재 대상은 아래 집계 명령으로 다시 확인한다. 『Journeys and Explorations in the Cotton Kingdom』과 Robert Watson의 『History of the Reign of Philip the Second, King of Spain』은 현재 ISBN의 복각본 수록 범위가 불명확해 보류 중이다. 『Ever Newer Shores』와 George F. Sterne의 『Secrets of the Millionaires』는 책 내용을 설명할 독립 출처를 찾지 못했다.

출처 조회는 Google Books 무료 키의 일일 한도가 차면 ISBN 정확 일치 응답을 받을 수 없다. 이때는 OpenLibrary 판본·원전 설명과 출판사·도서관·서평 페이지를 읽어 쓰고, 그 페이지를 `sourceUrl`·`evidence`로 남긴다.

`pnpm contents:book-introductions`는 기본 선택판과 사용자가 선택할 수 있는 다른 판본을 함께 확인한다. 전체 보완 대상은 `targetRows`이며, 언어별 `defaultMissing`은 기본 선택판의 소개 누락 수다. 본문과 사용 가능한 출처 참조가 모두 없는 경우를 센다.

ISBN도 작품 앵커(`workTitle`)도 없어 선정 제외 근거를 붙일 수 없는 값 없는 행(내용을 확인할 수 없는 악보·자리표시 행)은 `guardedCatalogExclusions`의 `whole_work`로 작품째 지운다. 보호 참조(감상·이용 기록 등)가 있으면 가드가 막는다.

남은 행은 검증한 제공자 본문을 먼저 쓰고, 반대 언어에만 본문이 있으면 번역한다. 원문 소개가 없는 책은 조사 작성(`apply-book-research-introductions.ts --plan FILE --apply`)으로 채운다. 근거 주소는 ISBN의 WorldCat 검색(`https://search.worldcat.org/search?q=bn:<ISBN>`)이나 카카오·위키백과 문서를 쓴다. OpenLibrary 주소는 교정 경로의 독립 출처 검사에서 거부된다. 조사 작성의 분량은 공백 제외 한국어 150–450자, 영어 350–1,400자이며, 한 행이라도 분량·대상이 맞지 않으면 그 묶음 전체가 반영되지 않는다. 이미 쓴 소개를 고칠 때는 `reviewedIntroductionCorrection`을 붙인 보호 반영(`guarded-catalog-repairs.mjs`)을 쓴다.

아래 행은 소개를 쓰지 않고, 그 언어의 ISBN 행 전부(언어 카드와 판본 행)에 `sources.edition_selection_evidence`(`independent_selection_review`)를 붙여 책장에서 뺀다. 카드에도 근거를 붙여야 남은 카드가 대체 노출되지 않는다. 작품·관계·이용 기록은 지우지 않는다. 2026-10-30에 한국어 94작품(190행)과 영어 240작품(456행)을 이렇게 처리했다.

- `non_reading_product`: 미리보기·챕터 샘플러, 서점 진열대·묶음 박스, 판촉 스티커, 봉제 인형·담요 선물 세트, 빈 쪽 개그 노트·일지, 타로 덱, 다이어리, 구성 권을 알 수 없는 세트, 원작 낭독이 아닌 라디오 드라마 음원
- `editorial_exclusion`: 학습 해설·요약서(SparkNotes·Monarch Notes 등), 독서 모임 안내 책자, 자가출판 명언집·약력집·짜깁기 책, 위키 문서 편집 주문형 출판물, 저자·번역 표시 없는 주문형 복각본, 국내 전자책 출판사(부크크·유페이퍼·퍼플·퍼블리안·뉴가출판사 등)의 공유 저작물 재수록본, 씨엘·굿에듀러닝 PDF 소책자, 인물 이름이 제목의 비유로만 쓰인 책, 출간 예정으로만 남은 ISBN, 한두 곡짜리 연주용 악보, 내용을 확인할 수 없는 행
- `children_only`·`children_picture`·`graded_reader`: 인물을 다룬 어린이 전기·그림책·학습만화와 단계별 영어 읽기 교재. 인물이 직접 쓴 어린이 책이나 인물 연결 없이 읽기 목록에 오른 그림책·동화는 서비스가 다루는 책이므로 소개를 쓴다
- `wrong_locale`: 다른 언어판(스페인어·프랑스어·독일어·베트남어·일본어·중국어)이나 한국어 제목 상품이 그 언어 행에 들어간 경우. 영어 번역이 없는 외국어 원서가 읽기 목록에 오른 경우는 소개를 쓴다

실제 책의 완전 낭독 오디오북(Library Edition, Bookcassette, CST 등)은 판매 형식만으로 빼지 않고 작품 소개를 쓴다. 출판사 소개나 서평을 찾지 못한 실제 책은 확인한 서지와 인물 정보만 적고 자료가 없다고 밝힌다.

영어 판본 행에 소개 대신 출처 이름 `KAKAO`·`DAUM`만 들어간 경우가 있다. 영어 화면은 이 표식으로 원문을 불러오지 않으므로 결손으로 잡힌다. 2026-10-30에 15건을 실제 소개로 교체했다. 한국어 행의 같은 표식(판본 약 4,100건, 카드 약 4,700건)은 화면이 카카오·다음 원문을 불러오는 정상 참조이므로 건드리지 않는다.

2026-10-30에 영어 조사 소개를 쓴 책 가운데 초등학생 전용 도서 68건(Lerner 48쪽, Heinemann Creative Lives, Child's World, Gareth Stevens 등의 인물 전기와 그림책·읽기 입문서)을 책장 선정에서 제외했다. 새 필드를 만들지 않고 기존 제외 계약을 썼다. 원작 앵커(`workTitle`·`workCreator`)가 있는 작품은 `contents.metadata.figureBook.workSelectionEvidence`, 앵커가 없는 작품은 해당 ISBN 행의 `sources.edition_selection_evidence`에 근거를 남겼다. 인물 관계·소개·이용 기록은 지우지 않았다.

2026-10-01에 넣은 한국어 조사 소개 287건(카드 기준, 판본 행 35건)은 실제 내용 한두 문장 뒤에 「한국어 번역으로 소개되어 국내 독자도 접할 수 있다. 오랫동안 문헌과 총서를 통해 읽혀 온 작품이다.」를 되풀이해 분량을 채웠다. 한국어판이 없는 책에도 이 문장이 붙어 사실과 다르다. 출처도 OpenLibrary 검색 주소다. `description LIKE '%오랫동안 문헌과 총서를 통해 읽혀 온 작품이다%'`로 찾는다. 2026-10-30에 작품 291건 중 183건은 근거 문서(위키백과·카카오 서지)로 다시 썼고, 근거 문서를 찾지 못한 81건은 서지 검색으로 확인한 제목·지은이(와 확인된 저자 정보)만 적고 내용을 전하는 자료가 없다고 밝히는 소개로 바꿨다. 같은 날 가드 계약을 넓혀 교정 경로가 받지 않던 17건도 같은 방식으로 바꿨다. 같은 날 어린이 책도 서비스가 다루는 경우에는 소개를 쓰기로 하고 그림책·읽기 입문서 8건을 원작 서지·수상·줄거리로 다시 썼다. 남은 2건(유일한·김정희 위인 동화)은 해당 인물을 다룬 어린이 전기라 소개를 쓰지 않는다.

행 형태별 교정 계약은 다음과 같다(`guarded-catalog-repairs.mjs`).

- 한국어 행에 ISBN이 있으면 ISBN 교정(`reviewedIntroductionCorrection`의 isbn·locale·editionTitle).
- ISBN 없는 한국어 카드이고 영어 카드에 ISBN이 있으면 `independent_locale_reference_introduction_review`.
- 작품 전체에 ISBN이 없으면 `independent_work_introduction_review`. 이 경로는 비우기(null)를 허용하지 않아 근거 있는 소개로만 바꿀 수 있다. ISBN 없는 판본 행도 같은 언어 카드를 참조하고 `editionId`를 명시하면 이 경로로 고친다. 어느 카드에도 저자가 없을 때만 `creatorUnrecorded: true`로 제목 결속을 허용하며, 저자를 새로 넣지 못한다.
- 두 ISBN 없는 경로 모두 행의 `sources.primary`(`none`·`kakao_book`·`openlibrary` 등)를 그대로 유지해야 한다. 바꾸면 거부한다.

- 본문 검사(`forLocale`)는 영문 제목을 괄호로 많이 단 한국어 소개(「영어고전」 시리즈 일부)를 받지 않는다. 이런 행은 조사 작성이나 번역 경로로 채운다.
- `hasText` 대상은 저장된 출처 표식이 있어 수집 소개로 덮어쓰지 않는다. 비소개 판정 뒤 교체 경로로 처리한다.
- 어린이 전기·학습 총서는 소개를 채우지 않고 [인물 도서 룰북](../project/celeb/celeb-02-05-figure-books.md) 기준으로 작품 단위 선정 제외(`workSelectionEvidence`)한다.

출처가 CAPTCHA로 막혀도 화면은 소개 없음으로 확정하지 않고 다시 시도한다(운영 반영됨). 요청 실패만으로 기존 출처를 지우지 않는다.

엉뚱한 인물에 붙은 비도서(제목의 낱말이 인물 이름과 겹친 악보·잡지·음악 이론서 등)와 인물 연결 없이 남은 문제집은 소개를 쓰지 않고 `guardedCatalogExclusions`의 `catalog_only`로 책장에서 빼고, 남는 언어 카드가 대체 노출되지 않게 그 ISBN 행에 `sources.edition_selection_evidence`(`non_reading_product`·`editorial_exclusion`)를 붙인다. 작품·언어 카드·이용 기록은 지우지 않는다. 2026-10-30에 5건(본조비 III 밴드스코어→조비, 민요 선율 조식과 화성→조식, LEE 잡지→보아, 연결 없는 중학 영어 문제집 2건)을 이렇게 처리했다.

## 잘린 소개 점검

소개가 문장 중간에 끊겨 있으면 저장값이 잘린 사본이다. 원인과 채널 특성은 [소개 수집 룰북](../project/celeb/celeb-02-06-content-introduction-sources.md)이 쥔다. 2026-11-06에 전수 보완했다. 새 대량 등록 뒤에는 끝이 문장이 아닌 240~262자 행과 정확히 500자·1,200자인 행을 먼저 뽑아 본다.

`sw/web-bo`에서 실행한다. 미리보기로 사유별 건수를 본 뒤 `--apply --backup-dir <작업 폴더>/_backup`을 붙인다.

```powershell
# 저장 본문이 전문의 일부로 확인된 행을 전문 출처로 바꾼다
pnpm contents:book-sources --content-ids-file <ID 파일> --include-stored --locale ko --limit 100000

# KAKAO 표식을 같은 ISBN의 더 긴 다음 전문으로 옮긴다
pnpm contents:book-sources --content-ids-file <ID 파일> --kakao-to-daum --locale ko --limit 100000
```

- 대조에 실패한 행은 도구가 그대로 둔다. 저장값과 다음 전문을 나란히 읽어 판단한다.
- 끝이 문장이 아니어도 추천사 출처(`-동아일보`), 수록작 목록, 인용 쪽수(`【389-390쪽】`)는 잘림이 아니다.
- 더 긴 원문이 없으면 마지막 완결 문장까지만 남긴다. 작품명 괄호 안의 느낌표에서 끊지 않도록 괄호 짝을 본다.
- 영문이 주인 한국어 행은 표식으로 바꾸면 화면이 거르므로 전문을 본문으로 저장한다.
- 잘린 영문을 번역한 행에는 끊긴 조각이 남는다(`Grammy Awar 후보`). 원문을 고치면 번역도 함께 본다.

## 반복 실행 순서

`sw/web-bo`에서 실행한다.

```powershell
# 현재 남은 대상 집계
pnpm contents:book-introductions

# 현재 대상의 소개 원문 수집
pnpm contents:book-introductions --collect

# 검수한 소개의 변경 내용 확인 → 반영
pnpm contents:book-introductions --reviewed "<검수 JSON 경로>"
pnpm contents:book-introductions --reviewed "<검수 JSON 경로>" --apply
```

새 책만 처리하려면 `--content-id <작품 ID>`를 붙인다. 기존 조회 자료를 이어 쓰려면 `--collect --work-dir "<기존 작업 폴더>"`로 실행한다. 어느 경우든 현재 DB에서 대상을 다시 읽는다.

수집한 소개는 같은 작품·ISBN·언어·본문 범위인지 읽고 검수한다. 반영 명령은 DB 재조회, 책장 선택 확인, 관련 캐시 갱신, 기본 선택판의 운영 상세 확인까지 수행한다. 입력 형식과 전체 옵션은 [실행 스크립트](../../sw/web-bo/scripts/contents/book-introductions.mjs)의 `--help`를 본다.

기존 카탈로그에 해당 언어 판본이 빠져 있으면 카드 소개를 채워도 화면은 다른 언어 판본을 고를 수 있다. 실제 판본까지 확인한 경우에만 검수 항목의 `catalogReview`를 함께 지정한다. 통합 스크립트는 같은 카드·ISBN·제목·저자와 읽은 출처를 대조하고, 판본 연결 뒤에도 소개가 선택되는지와 운영 상세를 확인한다.

출처·번역·조사 작성 규칙은 [소개 수집 룰북](../project/celeb/celeb-02-06-content-introduction-sources.md), 판본·인물 연결은 [인물 도서 정리](figure-books.md)를 따른다. 영상·게임·음악도 같은 출처 룰북을 사용하며, 검수한 소개는 `apply-media-introductions.ts --plan FILE --apply`로 반영한다.
