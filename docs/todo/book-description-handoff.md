# 책 소개 출처 전환·복사본 폐기 인수인계

## 개요

이 작업의 목적은 BOOK의 책 소개 본문을 DB에 복사해 두고 출처를 알 수 없게
보여 주는 구조를 정리하는 것이다. 책 소개를 작품 메타데이터에 중복 저장하지
않고, 실제로 확인한 외부 출처를 선택해 화면이 그 출처에서 읽도록 바꾼다.

현재 데이터베이스에는 새 테이블이나 컬럼을 만들지 않았다. 기존
content_locales와 figure_book_editions의 description에는 출처 표식만 두고,
sources.description에는 그 표식에 대응하는 조회 주소를 둔다.

| description 값 | 조회 출처 | 적용 언어 |
|---|---|---|
| KAKAO | 카카오 ISBN 도서 검색 주소 | ko |
| DAUM | 다음 도서 상세 주소 | ko |
| OPEN | OpenLibrary 주소 | en |

publisher 컬럼은 출처 선택 필드가 아니다. 출판사 이름은 기존 서지 데이터로
그대로 남고, 출처를 나타내는 것은 description 표식과 sources.description이다.
CHECKED라는 별도 값은 만들지 않았다.

NULL은 외부 소개를 아직 선정하지 못한 상태다. 화면은 NULL인 행을 임의의
ISBN이나 반대 언어의 소개로 보충하지 않는다. 반대 언어에만 확인된 소개가
있어 사람이 번역해 둔 문장, 출처가 명시된 수기 문장은 검증 없이 지우지
않고 locale 행에 보관한다.

## 선정 규칙

- 한국어는 같은 ISBN의 카카오 검색 결과와 다음 상세 본문을 확인하고, 유효한
  한국어 본문 중 더 긴 것을 최초 선정한다. 다음 장애 때 자동 선정 과정에서
  이미 확인한 카카오 본문을 사용할 수 있지만, 표식이 저장된 뒤에는 선택된
  출처만 다시 조회한다.
- 영어는 OpenLibrary의 영문 판본·작품 주소만 사용한다. OpenLibrary가
  비영어 자료로 확인되면 en 소개로 채택하지 않는다.
- selected edition이 있으면 그 판본의 ISBN이 우선이다. 다른 ISBN의 locale
  소개를 빌리지 않는다.
- 기존 소개가 번역·수기·조사 결과로 표시되거나 출처가 불명확하면 일괄
  외부 본문으로 덮지 않는다.
- figure_book_editions는 이미 인물 도서 상세 화면이 사용하는 기존 판본
  데이터다. 이번 작업에서 판본을 새로 만들거나 판본별 값을 추가하지
  않았다. 다만 해당 행도 화면에서 사용되므로 locale 행과 함께 표식과 주소를
  정리했다.

## 실제 작업 기록

### 1. 원본 백업

첫 전체 백업은 다음 위치에 보관되어 있다.

~~~text
D:\feelandnote-backups\book-descriptions\2026-09-09T10-59-31-758Z\book-descriptions.json
size: 22,387,282 bytes
sha256: 2eba1352d657a09f7e7b10f072ab6d1ca9717ae916847d519628c7f7663c00d4
~~~

contents.metadata에서 소개 키를 제거하기 전 별도 백업도 보관되어 있다.

~~~text
D:\feelandnote-backups\book-descriptions\2026-09-10T07-30-00-000Z-metadata-cleanup\book-metadata-descriptions.json
sha256: c753a57f580f8086c62b42da8e5608dfb452ad5b18c2f44ee0d4410a7ceccf4c
~~~

각 마이그레이션 반영분도 같은 상위 폴더 아래의 시간별 디렉터리에 건별
JSON과 SHA-256 sidecar로 남아 있다. 백업은 삭제하지 않는다.

### 2. 독자 코드의 출처 선택 반영

다음 코드에서 선택된 source와 sourceUrl을 함께 읽도록 정리했다.

- packages/content-search/src/book-introduction.ts
- packages/content-search/src/book-introduction-contract.ts
- packages/content-search/src/openlibrary.ts
- sw/web/src/lib/utils/book-description.ts
- sw/web/src/hooks/useBookIntroduction.ts
- sw/web/src/actions/contents/fetchBookMetadata.ts
- sw/web/src/actions/contents/getContentBrief.ts
- sw/web/src/actions/contents/getContentDetail.ts
- sw/web/src/actions/figure-books/getFigureBookPresentations.ts

NULL 행을 읽을 때 legacyFallback으로 카카오나 OpenLibrary를 몰래 다시
호출하던 분기를 제거했다. 캐시 키도 selected-source-v2, v9-source,
v10-source로 올려 이전 호환 결과가 남지 않게 했다. source 표식 자체는
본문으로 출력하지 않는다.

공통 BOOK 메타데이터 갱신 함수도 바꿨다.

- packages/shared/src/lib/book-metadata.ts

이제 새로 들어오는 값과 이전 metadata 어느 쪽에서도
description, description_ko, description_en, overview, summary, storyline,
bookIntroEn, contents를 보존하지 않는다. 소개는 locale/edition 행에서만
다룬다.

### 3. 한국어 데이터 전환

한국어 전체 작업은 BOOK 12,252건을 한 워커가 순차 처리했다. ISBN별
새 조회 사이에는 최소 1초를 두었고, 카카오와 다음도 한 ISBN 안에서
순차 호출했다.

일반 전환이 끝난 뒤, 기존 sources.description이 유효한 다음 주소인데
본문이 남아 있어 자동 본문 비교만으로 바꾸지 못한 229건을 별도
source-only 경로로 처리했다. 주소를 로컬에서 검증·정규화하고 DAUM
표식만 기록했으므로 이 229건에는 외부 호출이 없었다.

### 4. 영어 데이터 전환

영어 전체 작업은 기존 OpenLibrary 주소를 로컬에서 검증하고 OPEN 표식만
기록하는 source-only 방식으로 끝냈다. 이 단계에서 OpenLibrary API 호출은
0회다.

재시작 구간은 24개 배치, 11,932행 처리와 3,516행 변경으로 종료했고,
중단 전 성공한 320행을 합쳐 전체 12,252건의 대상 커서를 끝까지 확인했다.
감사 범위는 locale·edition 합계 25,567행이다.

### 5. contents.metadata 소개 복사본 삭제

삭제 전 BOOK 892행에 인식된 소개 키가 있었고, 그중 실제 문자열이 있는
행은 871건이었다. 위 백업을 만든 뒤 한 트랜잭션으로 삭제했다.

~~~text
before=892
after=0
~~~

첫 SQL 시도에서 contents.updated_at이 실제 스키마에 없어 오류가 났지만
트랜잭션이 롤백되어 데이터는 바뀌지 않았다. 잘못된 컬럼을 제거한 두 번째
시도가 성공했고, 재조회로 0건을 확인했다.

### 6. 임시 파일 정리

마이그레이션 중 만든 %TEMP%\feelandnote-book-sources-* 파일 28개
로그·진단 파일을 확인 후 삭제했다. 같은 패턴의 잔여 파일은 0개다.
D드라이브 백업은 임시 파일로 보지 않고 유지했다.

## 최종 DB 감사

감사 시점의 BOOK 수는 12,252, 관련 locale·edition 행은 25,567이다.
핵심 결과는 다음과 같다.

~~~json
{
  "books": 12252,
  "rows": 25567,
  "markers": {
    "content_locales.ko.DAUM": 5352,
    "content_locales.ko.KAKAO": 1328,
    "content_locales.en.OPEN": 2962,
    "figure_book_editions.ko.DAUM": 2208,
    "figure_book_editions.ko.KAKAO": 565,
    "figure_book_editions.en.OPEN": 656
  },
  "empty": {
    "content_locales.ko": 2343,
    "content_locales.en": 4533,
    "figure_book_editions.ko": 366,
    "figure_book_editions.en": 1475
  },
  "nonmarker": {
    "content_locales.ko": 796,
    "content_locales.en": 1286,
    "figure_book_editions.ko": 414,
    "figure_book_editions.en": 1281
  },
  "invalidMarkerCount": 0,
  "mismatchCount": 0,
  "trustedNonMarkerCount": 0,
  "legacySourcesCount": 16,
  "metadataRows": 0
}
~~~

nonmarker 행은 신뢰할 외부 주소가 없는 기존 수기·번역·기타 본문이다.
별도의 trusted URL을 가지고 본문을 함께 남긴 행은 0건이다. legacySources
16건은 OpenLibrary 또는 카카오를 근거로 사람이 작성한 요약·번역이며,
정규 URL 객체가 아니어서 삭제하지 않고 보존했다.

## 외부 호출 제한과 준수 확인

- 한국어 대량 호출은 단일 순차 워커와 1초 간격으로 제한했다.
- 영어 source-only 전환은 네트워크를 사용하지 않았다.
- OpenLibrary 일반 조회에는 FeelandNote 식별 User-Agent를 보낸다.
- OpenLibrary 모듈 자체도 요청 사이 1초 간격을 유지한다.
- 영어 bulk apply는 source-only 또는 명시한 단일 content-id 없이는
  실행되지 않는다.
- 실행 로그에 429, 일일 한도 초과, 초당 한도 초과 신호가 없었다.

참고한 제공자 정책 문서:

- OpenLibrary API: https://openlibrary.org/developers/api
- Kakao quota: https://developers.kakao.com/docs/ko/getting-started/quota

## 검증

다음 검증을 수행했다.

~~~text
pnpm exec tsx --test sw/web/src/lib/utils/book-description.test.ts sw/web-bo/scripts/contents/book-description-sources-contract.test.ts packages/content-search/src/openlibrary.test.ts packages/content-search/src/book-introduction.test.ts
36 passed, 0 failed

pnpm --filter @feelandnote/web exec tsc --noEmit --incremental false --pretty false
passed

pnpm check:agents
AGENTS.md guard passed: 140/140 lines, 11928/12288 bytes

pnpm build:web
completed

node scripts/check-standalone-runtime.mjs
[standalone-runtime] Oracle Linux sharp + libvips 포함 확인

curl.exe -s -o NUL -w "web_dev_http=%{http_code}" http://localhost:3000
web_dev_http=200
~~~

웹 개발 서버는 사용자 프로세스이므로 재시작하지 않았다.

## 반영 결과

인수인계 문서를 작성한 뒤 책 소개 코드와 문서를 커밋했다.

- 커밋: 34e75c1a0733f7aef6d73c733d128557e3705954
- push: origin/main 반영 완료
- Oracle release: 34e75c1a-web-20260910t081403z
- 슬롯: green
- 현재 트래픽: 기본 포트 3000
- 서비스와 Caddy: active
- canary: 검증 후 inactive로 정리

격리 빌드가 성공했고 Oracle Linux용 sharp·libvips를 확인했다. canary에서
페이지 200, 정적 자산 48개, 실제·fallback SEO 이미지 800×800,
explore 두 차례 응답을 확인했다. 공개 bill-gates 페이지와 SEO 이미지도
200으로 확인했고 새 deployment id가 공개 HTML에 포함됐다.

Cloudflare는 배포 출력의 범위대로 cached-html만 퍼지했다. celeb·content
접두사와 explore directory·timeline 파일 요청이 모두 HTTP 200, 각 1회
시도였고 전체 존 퍼지는 하지 않았다.

NULL 소개 행의 공개 작품 페이지는 200으로 응답했으며 HTML에 KAKAO·DAUM·OPEN
표식과 legacyFallback이 없었다. 표식이 있는 공개 작품 페이지는 새
deployment id와 DAUM 표식이 확인됐고 표식이 본문으로 출력되지는 않는다.

## 반영 후 재확인

운영 반영 뒤 DB를 읽기 전용으로 다시 조회했다.

~~~json
{
  "books": 12252,
  "metadataRows": 0,
  "metadataNonempty": 0,
  "markers": {
    "koDAUM": 7560,
    "koKAKAO": 1893,
    "enOPEN": 3618
  },
  "legacySources": 16,
  "trustedNonMarker": 0
}
~~~

관련 테스트 36개, 메타데이터 계약 테스트, 타입 검사, check:agents,
웹 빌드와 standalone 검증은 모두 통과했다. 이후 운영 계획 모드에서
현재 commit이 34e75c1a이고 service·Caddy가 active이며 purge 계획이
none임을 다시 확인했다.
