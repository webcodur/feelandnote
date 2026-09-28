# Google 일일 색인 신청

**현재 도달점(2026-09-28):** 인물 검색 제목·설명문 개편 배포 뒤 사이트맵을 API로 재제출하고 11건을 접수했다(아래 09-28 항목).
다음 신청은 **`/en/celeb/jean-michel-basquiat` → `/en/celeb/agatha-christie`**부터이며, 이후 순번은 조사 데이터 09-28 항목의 `nextQueue`(86건)가 쥔다.
다음 확인은 09-28 우선 접수분(빌 게이츠·찰리 멍거는 색인됨 상태에서 새 제목 재수집, 헤라클레스·마리아는 첫 수집, 아킬레우스 한국어는 크롤링됨-미색인에서 재평가)의 마지막 크롤과 색인 상태다.
09-26에 접수한 작품 주소 6건의 재크롤·색인 반영도 아직 확인하지 않았다.
같은 날 Bing·네이버에는 인물 URL 전량을 IndexNow로 통지했다(기록은 [SEO 현황](../project/operations/seo.md) 「IndexNow」 절).

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
**09-15 접수: 45건, 할당량 초과 없음.** 09-14 접수 50건은 API 재조회에서 48건이 색인됐고
`/celeb/michael-jackson`·`/celeb/benjamin-franklin`은 「크롤링됨 - 현재 색인이 생성되지 않음」이었다.
조회수 순 후보 96개를 API로 먼저 검사해 미색인 86개만 순번에 넣었다. 자동화 창 크기가 줄어 조작이 멈춰
`/celeb/gerard-butler` 앞에서 끝냈다. `/celeb/michelle-williams`는 실시간 테스트 중 대화상자를 닫아 접수 여부가
불확실하다. `/en/celeb/jo-jung-rae`는 접수 뒤 포커스가 남은 「다시 요청」에 Enter가 들어가 중복 테스트가 시작됐고 Esc로 닫았다.
다음 신청은 **`/celeb/michelle-williams` → `/celeb/gerard-butler`** 순서이고, 이후 순번은 조사 데이터 09-15 항목의 `nextQueue`가 쥔다.

**09-17 접수: 12건, 도메인 속성에서 신청.** 09-15 접수 45건은 API 재조회에서 전부 색인됐다(09-15에 「크롤링됨 - 현재 미색인」이던 `/en/celeb/benjamin-franklin` 포함). 이날 Aside 브라우저의 Google 세션은 `webcodur@gmail.com` 등 6개 계정이 로그인 상태였고 URL 접두어 속성에는 전부 「액세스할 수 없습니다」였으나, **`webcodur@gmail.com`으로 도메인 속성(`sc-domain:feelandnote.com`)은 열렸다.** 도메인 속성에서도 URL 검사·색인 요청이 그대로 동작해 여기서 신청했다. `/celeb/michelle-williams`부터 `/celeb/bernard-arnault`까지 12건이 「색인 생성 요청됨」으로 접수됐고 다음 `/en/celeb/bernard-arnault`에서 할당량 초과가 떠 중단했다. 다음 신청은 **`/en/celeb/bernard-arnault`**부터이며 이후 순번은 조사 데이터 09-17 항목의 `nextQueue`가 쥔다.

**09-18 접수: 4건, 도메인 속성.** 09-17 접수 12건은 API 재조회에서 11건이 색인됐고(마지막 크롤 09-17 06:24~06:43Z), 마지막 접수분 `/celeb/bernard-arnault`만 「발견됨 - 현재 색인이 생성되지 않음」에 크롤 이력이 없었다. Aside 기본 Google 계정은 `webcodur3`라 도메인 속성이 막혔고, `authuser=webcodur@gmail.com`을 붙여 `/u/5/`로 열면 된다. `/en/celeb/bernard-arnault`·`/celeb/daniela-amodei`·`/en/celeb/daniela-amodei`·`/celeb/li-zhi` 4건이 접수됐고 다음 `/en/celeb/li-zhi`에서 「할당량 초과」가 떠 중단했다. 자동화 도중 검사 로딩 판정이 어긋나 다니엘라 아모데이 한국어 결과 화면에서 클릭이 한 번 더 들어갔을 수 있어 실제 소모는 5건일 수 있다. 다음 신청은 **`/en/celeb/li-zhi`**부터이며 이후 순번은 조사 데이터 09-18 항목의 `nextQueue`(25건)가 쥔다. 큐가 25건이라 하루 50건이 접수되는 날이면 바닥나므로, 신청 전에 조회수 순 미색인 인물을 API로 추가 검사해 채운다.

**09-20 접수: 10건, 도메인 속성.** 09-18 접수 4건은 API 재조회에서 3건이 색인됐고(`/en/celeb/bernard-arnault`·`/en/celeb/daniela-amodei`·`/celeb/li-zhi`) `/celeb/daniela-amodei`만 「발견됨 - 현재 미색인」이었다. 기존 큐 25건은 전량 미색인 확인, 조회수 순 후보에서 미색인 23건을 더해 48건 큐로 시작했다. Aside의 `webcodur@gmail.com` 세션이 만료돼 있었고 Google 10계정 상한 때문에 다른 세션 전부 로그아웃 뒤 Vault 자동완성으로 재로그인해 도메인 속성을 열었다. `/en/celeb/li-zhi`부터 `/en/celeb/mark-wahlberg`까지 10건이 「색인 생성 요청됨」으로 접수됐고 다음 `/celeb/donnie-yen`에서 「할당량 초과」가 떠 중단했다. `/celeb/mike-tyson`은 헬퍼가 같은 URL을 재검사해 클릭이 한 번 더 들어갔을 수 있어 실제 소모는 11건일 수 있다. 다음 신청은 **`/celeb/donnie-yen`**부터이며 이후 순번은 조사 데이터 09-20 항목의 `nextQueue`(38건)가 쥔다.

**09-22 접수: 27건, 일반 오류: 2건, 도메인 속성.** 09-20 접수 10건은 API 재조회에서 모두 색인됐고 자기 canonical과 일치했다. Aside는 권한 계정 로그아웃·10계정 상한에 막혀 기존 세션을 유지하고, Chrome의 `webcodur@gmail.com` 로그인으로 신청했다. 견자단 한국어부터 정지용 한국어까지 27건이 접수됐다. `/celeb/achilles`·`/en/celeb/daniel-craig`는 「오류 발생」으로 실패해 재시도하지 않았다. 다음 `/en/celeb/chung-ji-yong`에서 「할당량 초과 — 일일 할당량을 초과하여 이 요청을 처리할 수 없습니다. 내일 다시 제출해 주세요.」를 확인하고 즉시 중단했다. 다음 신청은 **`/en/celeb/chung-ji-yong` → `/celeb/achilles` → `/en/celeb/daniel-craig`**부터다. 조회수 순 후속 후보 22건도 API로 미색인을 확인해 추가했으며, 남은 33건의 순서는 조사 데이터 09-22 항목의 `nextQueue`가 쥔다. 이전 접수분 중 다니엘라 아모데이 한국어는 「Google에는 아직 알려지지 않은 URL」, 베르나르 아르노 한국어는 「발견됨 - 현재 미색인」으로 남아 있다.

**09-23 접수: 11건, Chrome + Windows UI Automation.** 09-22 접수 27건은 API 재조회에서 모두 색인됐고 자기 canonical과 일치했다(마지막 크롤 09-21 16:36~17:15Z). Aside의 `webcodur@gmail.com`은 여전히 로그아웃 상태이고 활성 세션 10계정 상한이라, Chrome의 webcodur 세션을 UIA(접근성 트리)로 조작해 신청했다 — `sw/remotion/scripts/_scratch-uia.ps1`(트리·요소 탐색)와 `_scratch-gsc-submit.ps1`(큐 루프)가 그 구현이다. `en/celeb/chung-ji-yong`부터 `en/celeb/kang-full`까지 11건이 접수됐고 다음 `celeb/mel-gibson`에서 「할당량 초과」가 떠 중단했다. 큐가 바닥날 경우에 대비해 조회수 순 후보 40인(80 URL)을 API로 미리 검사해 미색인 78건을 뒤에 붙였고(`nikola-tesla`·`charles-darwin` 한국어는 이미 색인이라 제외), 남은 100건의 순서는 조사 데이터 09-23 항목의 `nextQueue`가 쥔다. 다음 신청은 **`/celeb/mel-gibson`**부터다.

**09-25 접수: 10건, 도메인 속성(Chrome + UIA).** 09-23 접수 11건은 API 재조회에서 8건이 색인됐고 `/celeb/achilles`는 「크롤링됨 - 현재 미색인」, `/celeb/kang-full`·`/en/celeb/kang-full`은 「발견됨 - 현재 미색인」으로 크롤 이력이 없다. 큐 100건은 API 재검사에서 전량 미색인을 확인했다. `/celeb/mel-gibson`부터 `/en/celeb/marc-chagall`까지 10건이 「색인 생성 요청됨」으로 접수됐고 다음 `/celeb/agatha-christie`에서 「할당량 초과」가 떠 중단했다. 도중 한 번 stephen-curry 영문의 결과 대화상자가 남아 콤보박스가 접근성 트리에서 숨는 동안 찾기가 실패해 자동화가 멈췄고(`FATAL no combobox`), 콤보박스 탐색에 닫기 재시도 루프를 넣은 뒤 재개했다. 다음 신청은 **`/celeb/agatha-christie`**부터이며 이후 순번은 조사 데이터 09-25 항목의 `nextQueue`(90건)가 쥔다.

**09-28 접수: 11건, 일반 오류 1건, 도메인 속성(Aside `u0` 프로필).** 인물 검색 제목·설명문 개편(`658a9cb6`) 배포 뒤 재수집용으로 먼저 신청했다. 신청 전 API 검사에서 빌 게이츠 한·영·찰리 멍거는 색인됨이지만 마지막 크롤이 제목 교체 전인 09-09였고, 헤라클레스 한·영·마리아는 「발견됨 - 현재 미색인」(크롤 이력 없음), 아킬레우스 한국어는 「크롤링됨 - 현재 미색인」(09-23)이었다. 이 7건과 09-25 큐의 아가사 크리스티 한국어·레오니다스 1세 한·영·장미셸 바스키아 한국어가 「색인 생성 요청됨」으로 접수됐다. `/en/celeb/agatha-christie`는 「오류 발생」으로 재시도하지 않았고, 다음 `/en/celeb/jean-michel-basquiat`에서 「할당량 초과」가 떠 중단했다. 사이트맵은 서비스 계정 API(`sitemaps.submit`)로 재제출했다 — 서비스 계정에 제출 권한이 있어 UI가 필요 없다.
- Aside에는 프로필이 여럿이고 `webcodur@gmail.com`은 `u0`(Profile 0)에 로그인돼 있다. `aside account list`로 먼저 확인하고 `aside repl --account u0`로 연다. 기본 프로필(`u1`)만 보고 구글 전체 로그아웃·재로그인으로 풀지 않는다(이날 그렇게 해 기본 프로필의 구글 계정 10개를 불필요하게 로그아웃했다).
- `openTab()`으로 연 탭은 repl 호출이 끝나면 닫힌다. 검사 → 「색인 생성 요청」 → 결과 대화상자 확인·닫기를 URL당 repl 한 호출(45~95초) 안에 끝냈다. 요청 버튼은 검사 완료 뒤 본문에 대상 URL이 보이고 스냅숏에 「색인 생성 요청」 버튼이 있을 때만 누른다.
- 이 경로를 스크립트로 남겼다. `sw/remotion`에서 `node scripts/_scratch-gsc-aside-queue.mjs [우선 경로 ...]`를 실행하면 우선 경로와 조사 데이터 최신 `nextQueue`를 API로 먼저 검사하고(큐 항목은 색인됨이면 건너뛴다), URL마다 `_scratch-gsc-aside-request.js`를 `aside repl --account u0`로 돌려 할당량 초과에서 멈춘 뒤 오늘 항목을 조사 데이터에 붙인다. 같은 날 두 번 돌리지 않는다. 이 문서의 도달점 문장은 사람이 고친다.
- URL Inspection API 호출은 건당 약 7초이고, 이날 96건 중 8건이 `Internal error`·시간 초과로 실패했다. 실패한 큐 항목은 미색인으로 보고 신청 대상에 남긴다.

Chrome을 UIA로 돌릴 때 요령(09-23 확인):
- 창 선택은 클래스 `Chrome_WidgetWin_1` + 소유 프로세스가 `chrome`인 것으로 제한한다 — Aside도 Chromium이라 같은 클래스를 쓴다.
- 「닫기」라는 이름의 버튼은 창 닫기(크롬 크롬 UI)와 대화상자 닫기(페이지 문서)가 공존한다. 반드시 Document 조상을 가진 것만 누른다. 창 닫기를 누르면 Chrome 창이 통째로 닫힌다(한 번 실수로 닫았다가 재오픈).
- Esc로 결과 대화상자를 닫으려면 먼저 `SetForegroundWindow`로 Chrome을 전면에 둬야 한다. SendKeys는 전면 창에만 간다.
- 결과 대화상자가 떠 있는 동안은 상단 URL 검사 콤보박스가 접근성 트리에서 숨는다. 다음 URL 검사 전에 대화상자를 닫았는지 먼저 본다.
- 닫기 클릭 후에도 대화상자가 사라지기 전 순간에는 콤보박스가 트리에 없다(09-25 확인). 콤보박스 탐색은 재시도 루프로 두고, 안 보이면 대화상자 닫기를 다시 누른다.
- 최근 API로 검사한 URL은 UI 검사도 몇 초 안에 끝나고, 실시간 테스트는 30~45초 정도다.
- 콤보박스는 `ValuePattern.SetValue`로 URL을 넣고 Enter로 제출한다. SetValue 후 값을 다시 읽어 확인한다.

Chrome에 권한 계정이 로그인돼 있으면 Aside의 다른 Google 계정을 로그아웃하지 않고 Chrome에서 이어서 신청할 수 있다. 창 너비에 따라 URL 검사 입력란이 바로 보이거나 「검색」 버튼 안에 있으므로 현재 화면을 확인한다.

UI 신청 요령(09-15 확인):
- 자동화 창을 앞에 크게 띄워 둔다. 창이 뒤로 가거나 줄면 캡처가 시간 초과되고 입력이 먹지 않는다.
- 검색창은 「검색어 지우기」로 비운 뒤 입력하고, 입력칸을 확대 캡처해 주소를 확인한 다음 Enter를 누른다.
  전체 선택 단축키는 글자 `a`로 들어갈 수 있다. 입력이 안 들어간 채 누른 Enter는 포커스가 남은 「다시 요청」을 누른다.
- 요청 버튼은 헤더 주소가 바뀐 것을 본 뒤에만 누른다. 실시간 테스트는 50~100초 걸리므로 결과 대화상자를 본 뒤 닫는다.
- 조사 데이터 파일은 그날 신청이 끝난 뒤 한 번만 갱신한다. 건마다 다시 쓰지 않는다.

Aside repl로 자동화한 경로(09-17):
- Search Console 요소는 shadow DOM이라 `document.querySelector`로 버튼이 안 잡힌다. `snapshot()`의 ref로 locator를 클릭하거나 `getByRole`을 쓴다.
- URL 검사는 상단 combobox에 `fill()` 후 `press('Enter')`로 제출된다. 결과 대화상자의 「닫기」는 `Escape`로 닫아도 된다(실시간 테스트 중에는 취소되므로 결과 확인 뒤에만).
- repl 호출은 120초 제한이 있어 「요청 클릭 → 다음 호출에서 결과 폴링·닫기 → 다음 URL 검사·클릭」 순환으로 나누어 돌렸다.
- MCP `repl`은 세션 간 변수가 유지된다. `__poll/__inspect/__clickReq/__close` 도우미를 심고 큐 배열을 두고 URL 하나씩 처리했다.
- `getByRole`의 `name`은 문자열만 받는다. 정규식을 넘기면 `[object Object]`로 깨진다.
- 검사 로딩 대화상자(「Google 색인에서 데이터 가져오는 중」)는 로딩이 끝나도 DOM에 남고 `isVisible()`도 참이다. 검사 완료는 헤더 주소가 요청한 URL과 같고 본문에 「페이지가 변경되었나요? 색인 생성 요청」과 「최근 크롤링」이 함께 보이는 것으로 판정한다. 이 판정을 느슨하게 두면 옛 결과 화면의 버튼을 눌러 한도만 깎인다(09-18).
- 「할당량 초과」 대화상자는 `getByRole('dialog')` 목록에 잡히지 않았다. 폴링이 계속 시간 초과되면 스크린샷으로 확인한다.
- 이전 URL의 「색인 생성 요청됨」 결과 대화상자가 닫히지 않은 채 남으면 다음 URL 검사 후에도 본문에 그 문구가 남아 있어 「이미 요청됨」으로 오판한다(09-20). 검사 완료 판정과 요청됨 판정 모두 먼저 본문 헤더가 목표 URL과 일치하는지 확인하고, 「요청됨」 문구가 보이면 Esc·닫기로 대화상자를 닫은 뒤 재판정한다(09-20에 mark-wahlberg en이 이 오판으로 한 차례 스킵됐다가 재검사로 접수).

도메인 속성(`sc-domain:feelandnote.com`)은 `webcodur@gmail.com` 관리자 계정으로 연다. 다른 계정이 기본이면 「이 속성에 액세스할 수 없습니다」가 뜰 수 있으므로 기존 권한 계정을 확인한다. API 읽기는 서비스 계정으로 도메인 속성을 쓴다.
URL 접두어 속성(`https://feelandnote.com/`)은 Chrome의 `feelandnote@gmail.com` 계정으로 사이트맵 재제출·URL 색인 요청이 가능했다(09-26). 과거 Aside 세션의 접근 실패를 접두어 속성 전체의 권한 없음으로 일반화하지 않는다. 빙의 기존 사이트는 `webcodur@gmail.com` 로그인으로 확인했고, 네이버는 Aside의 기존 로그인으로 수집을 요청했다.
API 검사 링크(`inspectionResultLink`)는 UI에서 그대로 열리지 않으므로 검색창에 URL을 직접 넣는다.
검색창은 Return이 아니라 Enter 키로 제출된다. 요청 버튼은 URL당 한 번만 누르고, 「오류 발생」도 재시도하지 않는다.

같은 날(09-11) 위 「할당량 초과」 뒤 몇 시간 지나 브랜드 표기(feelandnote) 배포 직후
URL 접두어 속성(`https://feelandnote.com/`)에서 홈·영문 홈·소개(`/`, `/en`, `/about`) 3개를
접수했고 한도 문구가 다시 뜨지 않았다. 한도가 하루 고정 건수가 아니라는 또 하나의 실측이다.
같은 날 코어 사이트맵 298 URL을 Bing 공용·네이버 IndexNow에
통지해 둘 다 HTTP 200을 받았다.

URL별 요청·제한 결과는 [조사 데이터](../../data/seo-index-inspection-20260909.json),
검색 노출·색인에 관해 확인된 사실은 [SEO 현황](../project/operations/seo.md)을 참고한다.
