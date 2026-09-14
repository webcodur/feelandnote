# Google 일일 색인 신청

주요 미색인 인물 URL은 Search Console에서 색인 생성을 직접 요청한다. 자동 재수집만 기다리지 않고,
매일 아직 요청하지 않은 URL을 Google이 요청 한도·제한을 표시할 때까지 순차 신청한다.
10개 같은 임의 건수에서 멈추지 않는다. 제한 문구와 마지막 접수 URL을 남기고,
기존 요청의 재크롤·색인 반영 여부도 확인한다. 요청 접수만으로 SEO 문제가 해결됐다고 처리하지 않는다.

「할당량 초과」가 한 번 뜨면 그날 신청은 끝이다. 할당량은 URL별이 아니라 속성 전체의 하루 한도라서
같은 URL 재시도나 다른 URL 시도가 모두 거부된다. 이미 접수한 URL을 다시 누르면 한도만 깎이므로 URL당 한 번만 누른다.
하루 접수 건수는 고정이 아니다(09-09 30건, 09-11 12건, 09-13 11건, 09-14 50건).

2026-09-11에는 12개가 접수됐다. 레오나르도 다빈치 영문(`/en/celeb/leonardo-da-vinci`)에서 할당량 초과를 확인했다.
09-09 신청 30건은 09-11 API 재조회에서, 09-11 신청 12건과 홈·영문 홈·소개 3건은 09-13 API 재조회에서 모두 색인됨이었다.
위 재조회 표본에서는 당일 몇 시간 안에 크롤·색인이 확인됐다. 모든 신청의 처리 시간을 보장하지 않는다. 할당량에 막힌 다빈치 영문도 09-11에 색인됐다.

**다음 검사는 최신 배포 이후의 재수집 여부부터 확인한다.** 09-13 API 검사에서는 한영 `/explore`,
빌 게이츠·일론 머스크·젠슨 황 상세가 색인됨이며 자기 canonical과 일치했다. `/explore/figures`와
`/explore/faction`도 색인됨으로 확인되어 앞선 허브 미인지 판정과 다르다. 저장된 옛 판정을 현재 상태로 간주하지 않는다.
현재 `/explore/figures`는 `/explore`로 영구 이동하므로 한국어·영어 모두 재신청 대상에서 제외한다.
한영 탐색·대표 인물의 마지막 크롤과 수집 본문을 최신 배포본과 비교한 뒤, 남은 허브와 조회수 순 미색인 인물을 확인한다.
**09-13 접수: 허브 11건.** `/explore/figures`·`/explore/faction`·`/explore/ranking`·`/en/explore`·`/en/library`·`/en/about`·
`/en/explore/figures`·`/en/explore/faction`·`/explore/youtube`·`/explore/spectrum`·`/library/curated`이 접수됐다.
`/explore/timeline`은 「오류 발생 — 색인 생성 요청을 제출하는 중에 문제가 발생했습니다」로 실패했고(할당량 아님, 1회만 시도),
`/explore/directory/entrepreneur`에서 「할당량 초과」가 떠 멈췄다. 인물 순번은 하나도 넣지 못했다.
이때 남은 `/explore/timeline`·`/explore/directory/entrepreneur`·조회수 순 인물 28건은 09-14에 모두 접수됐다.
남은 순번은 조사 데이터의 `dailyIndexingRequests` 배열에서 최신 날짜 항목의 `nextQueue`가 쥔다.

**09-14 접수: 50건, 일반 오류: 0건.** 기존 대기 30건·조회수 순 추가 미색인 인물 18건·
최신 배포본 재수집용 `/explore`와 `/library/popular` 2건이 접수됐다. 마지막 접수는
`/celeb/sylvester-stallone`이며, 다음 `/en/celeb/sylvester-stallone`에서 「할당량 초과 —
일일 할당량을 초과하여 이 요청을 처리할 수 없습니다. 내일 다시 제출해 주세요.」가 떠 즉시 중단했다.
다음 신청은 **`/en/celeb/sylvester-stallone` → `/en/celeb/venerable-beopjeong`** 순서다.
두 주소는 API 검사에서 미색인으로 확인됐다. 이후에는 접수 이력과 현재 색인 상태를 제외하고 조회수 순으로 후보를 이어간다.

09-14 신청 전 한영 탐색·빌 게이츠 한국어는 색인됨이지만 마지막 크롤은 각각 09-10·09-12·09-09였고,
서재 인기작은 09-07이었다. 최신 배포 이후 재수집과 오늘 접수한 50건의 실제 색인 반영은 다음 검사에서 확인한다.

UI 로그인 계정은 도메인 속성(`sc-domain:feelandnote.com`)에 접근 권한이 없어 「이 속성에 액세스할 수 없습니다」가 뜬다.
UI 신청은 URL 접두어 속성(`https://feelandnote.com/`)에서만 한다. 도메인 속성은 API 서비스 계정으로만 읽는다.
API 검사 링크(`inspectionResultLink`)는 도메인 속성용이라 UI에서 열리지 않으므로 검색창에 URL을 직접 넣는다.
검색창은 Return이 아니라 Enter 키로 제출된다. 요청 버튼은 URL당 한 번만 누르고, 「오류 발생」도 재시도하지 않는다.

같은 날(09-11) 위 「할당량 초과」 뒤 몇 시간 지나 브랜드 표기(feelandnote) 배포 직후
URL 접두어 속성(`https://feelandnote.com/`)에서 홈·영문 홈·소개(`/`, `/en`, `/about`) 3개를
접수했고 한도 문구가 다시 뜨지 않았다. 한도가 하루 고정 건수가 아니라는 또 하나의 실측이다.
같은 날 코어 사이트맵 298 URL을 Bing 공용·네이버 IndexNow에
통지해 둘 다 HTTP 200을 받았다.

URL별 요청·제한 결과는 [조사 데이터](../../data/seo-index-inspection-20260909.json),
검색 노출·색인에 관해 확인된 사실은 [SEO 현황](../project/operations/seo.md)을 참고한다.
