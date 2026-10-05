# 제휴 판매와 이용 혜택 운영

수익화 목표와 화면별 배치·UI 방향은 [서비스 방향과 수익화](ops-01-service-strategy.md)가 쥔다.
이 문서는 판매처별 준비 상태, 제휴 링크와 상품의 구분, 기존 데이터와 운영 경로를 다룬다.
계정 승인·지급·현재 수익은 코드 지원 여부와 별도로 확인해야 한다.

## 공통 데이터와 링크

| 대상 | 현재 단일 원천 |
|---|---|
| 일반 콘텐츠의 언어별 판매 링크 | `content_locales.affiliate_url`의 `{ platform, url }` 배열. 구조는 [콘텐츠 데이터](../data/data-02-content.md) |
| 인물의 등장·연관 도서 | 작품·판본·판매 상품을 분리한 `figure_book_contents`·`figure_book_editions`·`figure_book_products`. 관계와 공개 기준은 [인물 도서](../celeb/celeb-02-05-figure-books.md) |
| 플랫폼 라벨·언어·고지 문구 | [affiliatePlatforms.ts](../../../sw/web/src/constants/affiliatePlatforms.ts) |
| 인물 도서의 언어별 판매처 선택 | [figureBookLocale.ts](../../../sw/web/src/actions/figure-books/figureBookLocale.ts) |
| 일반 제휴 도서 조회·순위 | [getAffiliateBooks.ts](../../../sw/web/src/actions/home/getAffiliateBooks.ts)와 [affiliateBookPicks.ts](../../../sw/web/src/constants/affiliateBookPicks.ts) |
| 작품 카드 판매처·감상처 단추 | 도서는 [BookPurchaseSummary.tsx](../../../sw/web/src/components/features/commerce/BookPurchaseSummary.tsx), 게임·음악·영상은 [ContentAccessPanel.tsx](../../../sw/web/src/components/features/commerce/ContentAccessPanel.tsx). 한영 화면에서 공통 모달로 안내한다 |
| 박물관·게임 시안 | [targetProducts.ts](../../../sw/web/src/components/features/commerce/targetProducts.ts). DB 상품 운영 체계를 신설한 상태가 아니다 |

일반 상품 상세 주소와 수수료를 추적하는 제휴 주소는 다르다. 링크가 열리거나 상품을 DB에 등록할 수 있다는 사실만으로
제휴 연결·계정 승인·수익 발생을 판정하지 않는다. 링크의 도착 상품과 선택한 모델·판본이 일치하는지도 확인한다.

인물 도서의 한국어 판본은 예스24를 기준으로 연결하고 쿠팡 검색을 보조로 붙인다. 한국어 도서를 고르고 앞세우는 기준은 예스24다. 대표 판본은 예스24가 찾을 ISBN 판본이고, 쿠팡은 같은 판본에 붙는 보조 단추라 후보 자격·판본 선택·정렬을 정하지 않는다. 영어는 Amazon 상품이 걸린 판본이 먼저고 없으면 제목·저자 Amazon 검색으로 잇는다. 그 언어 판본이 없는 표시용 제목 행은 추천 도서 후보에서 뺀다. 판본 선택은 `pickPurchaseEdition`([figureBookLocale.ts](../../../sw/web/src/actions/figure-books/figureBookLocale.ts)), 화면의 기준 서점은 `getBookStorePlatform`([affiliatePlatforms.ts](../../../sw/web/src/constants/affiliatePlatforms.ts))이 쥔다. 일반 콘텐츠 상세는 플랫폼 상수의 언어로 표시를 가른다.
한국어판 주소를 영어 화면에 복사하거나 제목만 번역해 영문판으로 취급하지 않는다.
화면 언어에 따른 분기는 배송 가능 국가를 보장하지 않는다.

새로운 비도서 상품의 장기 관리 구조는 주요 화면 연구와 함께 정해야 한다. 기존 도서 판본 표에 기기·굿즈를 억지로 넣거나,
시안 확장을 이유로 테이블·컬럼을 자동 신설하지 않는다.

## 클릭 장부

「무엇을 눌렀나」는 우리가 직접 모은다. 사용자 웹의 `trackEvent`가 `commerce_open`·`commerce_click`을 `/api/track/commerce`에 비콘으로 보내고, 서버가 `commerce_events`에 적는다(종류·플랫폼·대상 작품·판본·화면·언어, 외부 차트 항목은 `external_ref`). 개발 환경의 눌림은 장부에 싣지 않는다.
실제 구매·수수료는 이 표에 없다 — yes24 애드온 정산(`/Member/FTMyAddon.aspx`)과 링크프라이스 AC(`/reports/*`)에서만 확인한다.
조회 화면은 백오피스 `/commerce`(사이드바 「운영」)다. 쓰기는 service_role 전용이고 읽기는 `is_admin()` 정책으로 관리자만 연다.
장부가 생기기 이전 구간은 같은 화면의 「GA4 기록」 칸이 보충한다 — `sw/web-bo/src/lib/ga4.ts`가 서비스계정으로 Data API를 읽어 같은 기간의 열림·클릭 합계·일별 추이·페이지별 클릭을 보여준다. `platform`·`content_id` 같은 매개변수는 GA 콘솔에 맞춤 측정기준으로 등록되지 않아 GA4쪽은 페이지(pagePath) 단위까지만 나뉘지만, `/content/{id}`·`/celeb/{slug}`는 화면이 작품·인물명으로 풀어 보여준다. GA4 보고서는 1~2일 지연된다. web-bo의 `GA_PROPERTY_ID`·`GA_CREDENTIALS_PATH`가 없거나 조회가 실패하면 그 칸만 비워 둔다.

## 영상·게임·음악의 이용·할인 연결

2026-09-26 공식 안내 확인. 수수료가 없는 공개 혜택도 제공 대상으로 삼는다. 아래 프로그램의 존재를 확인한 것이며, Feel&Note의 가입·승인이나 전용 할인 확보를 뜻하지 않는다.

| 경로 | 이용자에게 제공할 연결 | 제휴 여부와 조건 |
|---|---|---|
| Steam | 현재 작품의 공식 구매·할인 확인. [공식 위젯](https://partner.steamgames.com/doc/marketing/widget)은 가격·할인을 갱신한다 | [Steam 자체 어필리에이트는 없다](https://partner.steamgames.com/doc/marketing/utm_analytics?l=english). 일반 안내로 제공할 수 있다. 개발사와의 별도 보상 계약은 Steam 제휴와 구별한다 |
| [Green Man Gaming](https://www.greenmangaming.com/affiliates/)·[Fanatical](https://www.fanatical.com/en/affiliates) | 공식 유통 디지털 게임의 할인·번들. 각 상품의 Steam 등 등록처, 한국 등록 가능 여부, 본편·DLC를 확인 | 웹사이트 대상 제휴 모집이 있다. GMG는 Impact 신청·상품 카탈로그 API·전용 오퍼 경로, Fanatical은 AWIN 신청 경로를 안내한다. 판매처 전체가 아니라 실제 취급 작품에 한해 연결한다 |
| [Xsolla Partner Network](https://developers.xsolla.com/creators/campaigns-cc/) | 참여 개발사·퍼블리셔의 작품별 캠페인에서 게임 키·프로모션 코드·추적 링크 제공 | 캠페인에 따라 수익 배분 기회가 있다. [공식 FAQ](https://developers.xsolla.com/creators/faq-cc/)는 YouTube·Twitch·TikTok·X 채널을 지원한다고 안내한다. 웹사이트만으로 참여할 수 있는지와 Feel&Note가 참여 가능한 작품은 미확인이다 |
| [Apple Services Performance Partners](https://performance-partners.apple.com/home) | Apple Music의 앨범·곡, Apple TV의 작품과 구독 연결 | 음악·영상 구독 등의 적격 전환에 수수료를 지급한다. 현재 제한적으로 파트너를 선발하므로 신청·승인이 필요하며 국가·상품별 적격 여부를 확인한다. 공개 체험 안내는 제휴 승인과 별개다 |
| [Apple Music 한국](https://www.apple.com/kr/apple-music/)·[Spotify 한국](https://www.spotify.com/kr-ko/premium/) | 공식 신규 이용자 체험·학생 요금제 등 현재 제공되는 혜택 | 체험 이력·기기·결제 수단 등에 따라 적용이 다르다. Spotify의 일반 서비스용 수수료 제휴는 이번 조사에서 확인하지 못했다. 개인 초대 코드를 서비스용 제휴 코드로 전용하지 않는다 |
| [네이버플러스 디지털 콘텐츠 혜택](https://help.naver.com/service/23168/contents/19902) | 멤버십 가입자가 넷플릭스 광고형 스탠다드·Spotify Premium 베이직·PC Game Pass 등을 선택하는 방법 | 월별 선택 혜택이므로 여러 서비스를 동시에 무료 제공한다고 쓰지 않는다. 멤버십 요금과 선택 조건을 알리는 일반 안내다. [Spotify 베이직](https://help.naver.com/service/23168/contents/24787)은 다운로드·무손실 음원을 제공하지 않는다 |
| [JustWatch 파트너 API·위젯](https://www.justwatch.com/ca/JustWatch-Streaming-API) | 작품별 시청처·대여·구매 연결 | 수수료 기회도 공식 안내하지만 계약·이용료·한국 대상 조건은 개별 확인이 필요하다. 공개 페이지 연결과 API 데이터 사용 계약을 구별한다 |

게임·음악·영상은 [ContentAccessPanel.tsx](../../../sw/web/src/components/features/commerce/ContentAccessPanel.tsx)의 「구매 및 감상 / Buy & Enjoy」로 진입한다. 작품 상세, 인물·사용자 서재의 목록·펼침, 기관 선정 목록의 격자·펼침, 베스트셀러·불후의 명작, 오늘의 인물, 감상 피드, 인물 순위판, 빠른 기록, 기록 검색에서 같은 모달을 쓴다. 등록된 작품 카드의 공통 진입점은 [ContentPurchaseAction.tsx](../../../sw/web/src/components/features/commerce/ContentPurchaseAction.tsx)다. 도서도 [AccessDialog.tsx](../../../sw/web/src/components/features/commerce/AccessDialog.tsx)와 링크 카드를 공유하며 작품 정보 → 이용 방식·서비스 목록 → 짧은 수수료 안내 순서를 유지한다. 버튼 위치도 카테고리별로 나누지 않는다. 상세페이지·서재 펼침은 표지 바로 아래, 기관 선정 펼침은 작품 상세보기와 같은 하단 버튼 구역에 둔다. 실제 이동 링크에만 우측 화살표를 둔다. 확인된 Apple Music·Apple TV 링크는 공식 배지만 가운데에 두며 일반 카드·서비스명·화살표를 중복하지 않는다.

모달을 열 때 `/api/content-access/[contentId]` 요청 하나로 판매처별 진행 상황과 결과를 받는다. [contentAccessServer.ts](../../../sw/web/src/lib/commerce/contentAccessServer.ts)가 작품 정보를 한 번 읽고 판매처를 병렬 조회하며, 확인이 끝난 곳부터 표시한다. 목록 위에는 실제 조회 단계를 표시하고 각 행의 설명에는 해당 판매처의 진행 상황을 남긴다. 로딩·실패·연결 없음도 링크와 같은 한 줄 높이를 유지한다. 확인된 연결이 없으면 서비스명에 취소선을 긋고, 통신 실패는 별도 표시와 재시도로 구분한다. 재시도는 실패한 곳만 요청해 이미 받은 링크를 유지한다. 서버·클라이언트 캐시를 공유하며 시간 제한과 캐시 값은 [contentAccess.ts](../../../sw/web/src/lib/commerce/contentAccess.ts)가 쥔다. 새 DB 컬럼이나 작품별 수동 예외는 두지 않는다.

화면 언어와 판매 국가를 구별한다. Apple 차트는 한국어에서 한국, 영어에서 미국 목록을 조회한다. 게임 판매처와 일반 영상의 제공처 조회는 현재 한국 기준이며 모달의 진행 안내에 표시한다. 등록 음악은 검증된 Apple 작품 주소의 국가를 유지한다.

외부 차트는 검증된 원본 링크를 모달에 즉시 표시한다. Steam은 앱 ID를 IGDB의 외부 ID와 작품의 공식 Steam 주소에 대조한 뒤 기존 판매처 조회를 재사용한다. 추가 조회가 실패해도 원본 링크는 유지한다. Apple 차트는 국가·곡·영화 ID가 확인된 링크와 공식 배지를 그대로 쓰며, Apple 영화 ID를 TMDB ID로 취급하거나 제목만으로 OTT 제공처를 붙이지 않는다.

판매처별 제휴·비제휴 배지는 표시하지 않는다. 도서 제휴 여부는 [bookPurchaseRedirect.ts](../../../sw/web/src/lib/books/bookPurchaseRedirect.ts)가 실제 추적 주소와 경유 규칙으로 판별한다. YES24는 실제 상품 주소를 받은 뒤 제휴 여부를 판별하고 다른 서점은 먼저 이용할 수 있게 한다. 실제 제휴 링크가 있을 때만 목록 아래에 일부 링크에서 수수료를 받는다는 안내 한 문장을 둔다. 별도 제목·상자·서점명 나열·운영 지원 문구는 붙이지 않으며, 플랫폼 지정 고지가 있으면 공통 문장 대신 원문을 쓴다. 모든 링크가 비제휴이면 수수료 안내도 표시하지 않는다.

게임은 Steam·PlayStation·Xbox·Nintendo의 한국 판매처를 안내한다. 도서와 게임의 링크는 같은 높이·글자 크기·여백으로 서비스명을 가운데 정렬하고 화살표를 우측에 띄운다. PC·One·Series 같은 기기명은 행에 나열하지 않는다. 다른 판본·합본의 종류는 서비스명 옆에 표시하며 긴 이름은 한 줄 말줄임한다. 전체 상품명·기종·할인 정보는 링크 설명과 툴팁에 남긴다. [consoleReferences.ts](../../../sw/web/src/lib/games/consoleReferences.ts)와 [steamReferences.ts](../../../sw/web/src/lib/games/steamReferences.ts)가 저장 작품명과 IGDB 이름·별칭을 대조한 뒤 공식 주소와 명시된 이식·리마스터·리메이크·판본·포함 합본 관계를 따른다. 같은 이름의 확장판은 원작 부모 관계가 있을 때만 경유한다. 일반판을 VR판으로 바꾸거나 DLC·후속작을 임의로 대체하지 않는다.

[consoleStores.ts](../../../sw/web/src/lib/games/consoleStores.ts)는 PlayStation concept ID와 Xbox 상품 ID를 국내 상점에서 다시 확인한다. 정상 HTTP 응답이어도 오류·판매 중단 페이지이면 제외한다. Nintendo는 해외 상품 번호를 치환하지 않고 [IGDB의 지역별 정식 제목](https://api-docs.igdb.com/#game-localization)·원제를 국내 공식 검색과 상품 상세에 대조하며 재고와 대상 본체를 확인한다. 같은 제목의 Switch·Switch 2 상품도 기종을 구분해 검증한다. 상점 개명 고지가 다른 작품을 가리키면 동명 원작의 판매처로 연결하지 않는다. 연결을 찾지 못했다는 사실로 한국 미출시를 단정하지 않는다. 각 상점에서 우선 확인되는 판본을 안내하는 기능이며 모든 판본·판매처를 망라하는 가격 비교는 아니다.

Steam 가격은 [steamStore.ts](../../../sw/web/src/lib/games/steamStore.ts)가 한국 상점의 상품 번호·제목·판매 상태와 일치하는 단일 구매 옵션에서만 읽는다. 다른 판본·합본·Commercial License 가격을 대신 쓰지 않는다. 검색에서 제외됐어도 실제 구매 옵션이 있으면 연결하고, 작품만 확인되거나 상점 요청이 실패하면 검증된 링크만 남긴다. 만료된 가격은 숨기며 무료 플레이도 명시된 경우만 표시한다. 가격 표시는 Steam에 한하며 다른 스토어는 링크·기종·판본을 안내한다. 이 연결에는 제휴 수수료가 없다.

영상은 TMDB 작품 ID로 [Watch Providers API](https://developer.themoviedb.org/reference/movie-watch-providers)의 한국 제공처를 읽어 구독·대여·구매·무료·광고 포함을 구분한다. API는 개별 서비스의 재생 주소를 주지 않으므로 제공처 목록과 「TMDB에서 시청 링크 확인」을 구분한다. JustWatch·TMDB 출처를 함께 표시한다. 철회한 Watcha 검색·연결은 재도입하지 않는다.

음악은 저장된 Apple Music 주소의 곡·앨범 ID를 대조하고, 없으면 iTunes ID 조회로 보충한다. 음반 구매를 다시 붙이지 않는다. Spotify 등으로 자동 확장하는 데 검토한 [Songlink/Odesli 공개 API](https://linktree.notion.site/API-d0ebe08a5e304a55928405eb682f6741)는 종료됐으므로 사용하지 않는다. 현재 음악 연결은 Apple Music까지다.

IGDB는 [상업 이용에도 무료라고 안내하지만 파트너십과 출처 표시를 요구](https://api-docs.igdb.com/#business-related-faq)하므로 우리 계정의 해당 조건 충족 여부는 확인이 필요하다.

**전용 할인은 따로 확보해야 한다.** 게임은 개발사·퍼블리셔와 협의할 수 있고, [itch.io의 쿠폰 링크](https://itch.io/docs/creators/sales#coupon-codes)는 판매자가 특정 독자에게 공개할 할인 URL을 만드는 실제 기능이다. 해당 판매자의 동의가 전제이며 우리 수익 배분은 별도다. 영상은 [MUBI의 파트너십 문의](https://mubi.com/en/contact)가 협의 경로다. 할인권 확보·무료 제공이 보장된 프로그램으로 쓰지 않는다. [MUBI 개인 초대](https://mubi.com/en/referrals/terms)는 비상업적 용도로 제한되므로 서비스용 혜택으로 쓰지 않는다.

플랫폼 체험·멤버십 혜택과 Steam 외 판매처의 할인 비교는 아직 연결하지 않았다.

기간·금액을 갱신할 근거가 없으면 할인율을 고정 노출하지 않고 공식 혜택 확인으로 연결한다. 공통 흐름을 설계하기 전에 특정 작품 몇 개를 고정 진열하는 방식으로 대체하지 않는다.

## 예스24

한국어 작품 상세·실존 인물 서재 펼침·인물 도서의 판본 선택에서 현재 선택한 책만 ISBN으로 조회한다. 서버가 작품 유형과 판본 소속·언어를 확인해 저장 ISBN을 정하고, [공식 상품 상세 API](https://developers.yes24.com/api-doc/goods-item-detail)의 동일 ISBN·판매 중 상품만 구매 버튼으로 제공한다. 판본 ISBN이 없거나 절판·품절·미매칭·조회 실패이면 예스24 버튼을 만들지 않는다. 작품 메타는 보존하며 외부 검색 결과로 다른 판본을 자동 지정하지 않는다.

조회와 판매 상태 검증은 `sw/web/src/lib/books/yes24Purchase.ts`, 작품·판본 확인과 서버 캐시는 `sw/web/src/actions/contents/getYes24PurchaseLink.ts`가 담당한다. 구매 링크는 응답으로만 합치며 DB에 복사하지 않는다. 목록 전체를 미리 조회하지 않고, 화면의 모바일·데스크톱 중복 요청은 공유한다. 운영 활성화 조건은 [환경변수](../platform/platform-04-env-vars.md)의 `YES24_PURCHASE_ENABLED`를 따른다.

인물 화면 「연관 작품」은 고른 판본이 예스24에서 `판매중`일 때만 제목 아래에 판매지수·평점·판매가를 띄운다. 같은 판본 확인을 거쳐 상품 상세(`detail=Y`)를 조회하며, 서재 차트의 책 정보 모달과 `sw/web/src/lib/books/yes24DetailCache.ts`의 캐시를 나눠 쓴다. 한국어 화면 전용이다. 영어 화면의 Amazon은 가격·판매 정보를 받을 공식 경로가 없어 표시하지 않는다.

바깥 도서 카드에는 「구매 및 감상」 단추를 두고, 공통 이용처 모달 안에 `YES24`·`교보문고`·`쿠팡`·`알라딘`의 색상 그라데이션 링크를 세로로 배치한다. 영어 Amazon도 같은 모달에서 제휴 고지와 함께 안내한다. YES24는 같은 ISBN의 판매 정보와 실제 연결 주소를 함께 받아 표시하고, 확인할 수 없으면 예스24 검색 결과를 연다. 다른 판매처로 자동 이동하지 않는다. 교보·쿠팡·알라딘은 `/api/books/purchase/[contentId]` 경유가 저장 ISBN을 각 서점 주소로 푼다. 선택 판본은 `editionId`로 전달하며 다른 판본으로 대체하지 않는다. 중계 응답은 임시 이동·캐시 금지·비색인으로 처리하고, 링크를 미리 불러오지 않는다.

기본 상품 링크에는 제휴 수익이 없다. [애드온](https://developers.yes24.com/docs/addon)에 별도로 동의한 계정은 API가 반환한 `addOnLink`(`apis.yes24.com/a/<userKey>/goods/<상품번호>`)를 사용한다. 구매 안내에는 제휴 링크로 구매하면 필앤노트가 수수료를 받는다는 고지와 운영 지원 문장을 함께 둔다. 판매처별로 같은 안내를 반복하지 않는다. 애드온 동의는 즉시 활성화되고 해제할 수 없으므로 별도 명시적 승인을 받는다. API 키 발급·애드온 가입만으로 상업 이용 조건 확인을 대신하지 않는다. 서비스 공개 전 [공식 FAQ](https://developers.yes24.com/support/faq)에 따라 데이터 표시·캐시·다른 판매처 병기 방식을 문의한다.

애드온 정산 조건(2026-09 계정 확인): 주문 금액의 **3% 예치금** 또는 **3.3% YES포인트** 중 선택, 실적인정 **24시간**, 배송 완료 후 확정되어 **익월 10일** 지급. 예치금은 마이페이지 > 예치금 > 환불요청으로 계좌 출금이 되고, 포인트는 예스24 전용이다. 정산·실적 화면은 마이페이지 > 애드온 정산 관리(`/Member/FTMyAddon.aspx`)다 — 클릭수나 상품별 클릭 통계는 나오지 않고 출고 뒤 적립·정산만 보인다. **애드온 주소에 링크프라이스를 중첩하면 외부 프로그램이 우선되어 애드온 실적이 죽는다** — API의 `addOnLink`를 `linkmoa.kr` 등으로 다시 감싸지 않는다. 비도서의 링크프라이스 경로는 아래 절을 따른다.

운영 이용 조건은 [등록한 1:1 문의](https://developers.yes24.com/support/qna/58)의 답변에서 확인한다. 전일 순위·표지 표시, ISBN별 구매 연결, 애드온, 쿠팡 병기와 캐시 보관 방식을 함께 문의했다.

## 교보문고

한국어 도서 구매 모듈의 두 번째 서점이다. 공식 상품 조회 API가 없어 저장 ISBN을 `detailViewKor.laf`의 `barcode` 인자로 단 주소를 쓴다 — 서점 서버가 같은 ISBN의 상품 페이지(`product.kyobobook.co.kr/detail/S…`)로 넘겨준다. ISBN이 없으면 제목·저자 검색 주소(`search.kyobobook.co.kr/search?keyword=`)로 잇고, 둘 다 없으면 작품 상세로 돌린다. 다른 판본 대체·다른 판매처 자동 이동 없이 같은 판본만 잇는 규칙은 예스24와 같다.

연결은 예스24와 같은 중계가 쥔다 — `/api/books/purchase/[contentId]?seller=kyobo`가 `sw/web/src/lib/books/bookPurchaseRedirect.ts`의 `kyoboBookLink`로 주소를 만든다. 우리 작품이 아닌 차트 항목은 차트가 준 ISBN으로 화면에서 곧바로 같은 주소를 만든다.

수익 연결은 링크프라이스 머천트 `kbbook`(인터넷교보문고)다 — 2026-09-20 매체 `webcodur`(추적 ID `A100707726`)가 자동승인으로 승인완료됐다. `kyoboBookLink`가 만드는 모든 교보 주소는 딥링크 `https://linkmoa.kr/click.php?m=kbbook&a=A100707726&l=9999&l_cd1=3&l_cd2=0&tu=<교보 주소>`로 감싸서 나간다(`linkPriceKyoboUrl`). 조건: PC·모바일 웹 실시간 3.5%(핫트랙스 PC 2.1%), 실적인정 1일, 앱 제외, 중고도서·SAM 카테고리·쿠폰/포인트 사용분 미인정. 요율 표기는 월 단위로 갱신된다(확인 시점 2026-09-30까지) — AC에서 월 1회 승인 상태와 요율을 확인한다. 대가성 고지는 구매 시 필앤노트에 수수료가 지급된다는 사실을 밝힌다. [링크프라이스 공식 안내](https://shelpdesk.linkprice.com/list.php?child_menu=50&top_menu=23)의 문장은 예시이며, 공통 수수료·운영 지원 문구는 한영 `content.purchaseInfo.notice`·`support`가 쥔다. 서점이 지정한 고지 원문은 플랫폼 상수 `notice`에 둔다.

## 링크프라이스

교보문고 제휴가 타는 CPS 네트워크다. 어필리에이트 센터는 `ac.linkprice.net`, 매체 계정은 개인회원 `webcodur`, 추적 ID `A100707726`, 등록 사이트는 필앤노트다.

- 승인된 머천트: `kbbook`(인터넷교보문고 3.5%), `yes24`(예스이십사 2.1%) — 머천트 검색은 공식 표기명으로 해야 한다(`예스24`로 치면 결과가 안 나온다). 2026-09-26 YES24 승인과 PC·모바일 웹 2.1% 조건을 재확인했다. 도서는 기존 애드온을 사용하며, 비도서의 링크프라이스 운영 연결은 아직 없다. 두 추적 경로를 중첩하지 않는다. `coupang`은 수동승인으로 승인대기 중이다(아래 「쿠팡」 절).
- YES24 링크프라이스는 앱을 지원하지 않는다. 미인정 항목에는 티켓·영화 예매, 포인트 결제, 추적 거부 등이 명시돼 있으며 음반 제외는 기재돼 있지 않다. 실제 음반 구매의 정산 확인은 별개다. 상품 상세 딥링크를 사용하며 검색·메인 링크는 모바일에서 다른 화면으로 갈 수 있다.
- 클릭 도메인은 `linkmoa.kr` 외 `click.linkprice.com`·`lpweb.kr`·`lase.kr`·`bestmore.net`·`newtip.net`이 같은 파라미터로 동작한다. 딥링크는 AC의 `/adboxes/deep-link`에서 `l=9999&tu=<목적지>` 형식으로 만든다 — 링크 임의 가공 금지 규정이 있어 이 공식 형식만 쓴다.
- 실적·수익 확인: `/reports/summary`(날짜별 노출·클릭·구매·커미션), `/reports/detail`(건별 상품코드·상품명·가격·취소·UID), 정산은 `/myinfo/commission`. 클릭자 IP·유입 페이지·클릭 시각은 리포트에 없다. 건별 추적이 필요하면 링크에 `u_id`(사용자지정값)를 얹어 상세 리포트에서 구분한다 — 현재 링크는 `u_id` 없이 머천트 단위로만 잡힌다.
- 머천트별 유의사항(실적 제외 항목·금지 행위)은 머천트 상세의 「유의사항」 탭이 쥔다 — 신규 머천트 승인 시 반드시 읽는다.

## 쿠팡

기존 도서용 쿠팡 저장 상품 링크는 폐기했다. 수거 원본과 DB 상품 이력의 백업도 폐기 대상이며, 제휴 승인 여부와 무관하게 과거 링크를 복원하거나 재등록하지 않는다. 도서의 쿠팡 단추는 현재 판본의 ISBN·제목으로 검색 링크를 만든다. 남은 제휴 승인·비도서 상품 연결은 [`docs/todo/coupang-links.md`](../../todo/coupang-links.md)가 쥔다.
실제 화면별 구성은 상위 문서의 [기존 구성](ops-01-service-strategy.md#기존-구성과-주요-화면의-판매-방향)을 따른다.

2026-09-14 작업에서 로그인된 파트너스 화면의 상품 검색과 단축 링크 생성을 사용했다.
과거 기록의 최종 승인 전·API 키 미발급 상태를 현재까지 자동 연장하지 않는다.
최종 승인, API 사용 가능 여부, 심사 자료 제출 여부와 수익 실적은 계정에서 다시 확인할 항목이다.
API가 열렸다고 다른 종류의 쿠팡 API를 파트너스 API로 혼동하거나 ISBN·판매자·상품 옵션 검증을 생략하지 않는다.
공식 진입점은 [쿠팡 파트너스](https://partners.coupang.com/)다. 파트너스는 사이트 실적(과거 기준 3개월 15만원)이 최종 승인 조건이라 미달 상태에서 링크 생성이 막혔다.

대안 경로로 링크프라이스 머천트 `coupang`에 2026-09-20 승인 신청을 넣어 **승인대기** 상태다 — 수동승인이라 최대 2주 소요, 거절 시 1:1 문의로 재심사 요청한다. 조건(AC 확인): 일반 주문 2.1%(삼성·애플 스마트기기 0.7%), 다이나믹배너 경유 최대 3.15%, 실적인정 1일, PC·모바일·앱 전부 인정. 딥링크는 개별 상품 페이지와 **검색결과 페이지**를 지원한다 — 저장 상품 주소가 없어도 `coupang.com/np/search?q=<ISBN>`을 `tu`로 감싸는 교보와 같은 실시간 연결이 가능하다. 금지 행위에 「생성형AI/LLM 서비스 활용 홍보」가 있어 AI 큐레이션 서비스인 우리가 심사에서 걸릴 수 있다 — 거절 사유로 나오면 그때 대응한다. 대가성 문구 미기재는 실적 미인정 사유다.

코드는 승인대기 중에도 쿠팡 단추를 세운다 — `coupangBookLink`가 만드는 ISBN·제목 검색 링크는 `bookPurchaseRedirect.ts`의 `LINKPRICE_COUPANG_APPROVED`가 `false`인 동안 수수료 없는 일반 `coupang.com/np/search` 주소로 나가고, `true`로 바꾸면 같은 경로가 `linkmoa.kr` 딥링크로 자동 전환된다. 대가성 고지와 `sponsored` 표시는 `isAffiliatePurchaseLink`가 실제 수수료 여부로 판별하므로 무수익 링크에는 붙지 않는다. 미승인 상태의 linkmoa 링크는 게이트웨이가 에러로 내기 때문에 플래그를 켜기 전에는 절대 `linkmoa.kr` 주소를 만들지 않는다.

### 도서 상품 선정과 반영

- **상품 선정·교체·감사의 기준은 [coupang-book-affiliate 스킬](../../../.agents/skills/coupang-book-affiliate/SKILL.md)이 쥔다.**
  판본 일치와 실제 배송·판매 근거를 확인하며, DB에는 검증한 파트너스 단축 주소를 저장한다.
- 작품 자체를 새로 고르거나 인물의 등장·연관 관계를 바꾸는 판단은
  [figure-book-curation 스킬](../../../.agents/skills/figure-book-curation/SKILL.md)에서 먼저 한다.
  팔리는 상품이 있다는 이유로 인물이 읽거나 등장한 작품이라고 등록하지 않는다.
- 후보 수집·선택 입력·감사 명령은 [쿠팡 스크립트 README](../../../sw/web-bo/scripts/coupang/README.md)가 쥔다.
  브라우저 도구는 해당 세션의 사용 지침을 따른다. 예전 특정 확장의 제약을 모든 브라우저에 적용하지 않는다.
- 인물 도서의 상품 교체는 작품·판본·인물 관계를 보존하면서 해당 판매 상품을 갱신한다.
  DB 트리거·서버 액션의 무효화와 수동 확인 경로는 [인물 도서](../celeb/celeb-02-05-figure-books.md)와 스크립트 문서를 따른다.

### 비도서 상품과 시안

음반은 같은 앨범인지와 LP·CD 등 매체를, 게임은 본편·추가 콘텐츠·기종·언어를,
기기는 모델·옵션·호환 조건을 확인한다. 인물·작품 관련 상품은 실제 관계와 판매 상품의 일치가 먼저다.
이 기준으로 새로운 주요 화면 상품을 조사하는 일은 아직 남아 있다.

박물관에 남겨둔 시안은 일반 쿠팡 상품 URL을 로컬 코드에서 사용한다. 운영 DB의 제휴 주소 규칙을 바꾼 예외가 아니다.
시안의 현재 상태와 유지 방침은 [박물관 시안](ops-01-service-strategy.md#박물관-시안)을 따른다.

## Amazon Associates

영문 제휴 판매의 확장 대상이다. 코드에 Amazon이 있다는 사실과 가입·승인·지급 준비를 구별한다.
공식 정책은 비미국 거주자의 참여를 전제로 한다(비미국인은 세금 정보에 다르게 알리지 않는 한 미국 밖에서 서비스를 수행하는 것으로 간주한다).
[참여 정책](https://affiliate-program.amazon.com/help/operating/policies) · [운영계약](https://affiliate-program.amazon.com/help/operating/agreement)

**계정(2026-09-21 생성·신청 완료):** amazon.com 계정 `webcodur@gmail.com`(이름 윤시준)으로 가입했다. 추적 ID는 **`feelandnote-20`**이다. 수취인 Sijun Yun, 국가 Korea. 신청 사이트 목록: `https://feelandnote.com`, `https://www.youtube.com/channel/UC9gpAfGsqcPG_XD7fSKDM7g`(@feelandnote-en). 선언한 콘텐츠 유형은 Content or Niche Website다. 지금 상태는 「180일 안 유효 판매 3건」 심사 대기 구간이고, 그 전부터 SiteStripe·태그 링크는 동작한다.
세금은 2026-09-21 W-8BEN 인터뷰를 완료했다 — 개인·비미국인·미국 밖 수행 서비스로 신고해 **원천징수율 0.0%**로 확정됐다(계정 페이지 「United States Current Tax Status: Completed」). 지급 수단은 **Amazon 상품권(미국, $10~$2,000)을 임시 지정**해 뒀다 — Payoneer 가입은 완료했고 KYC 심사 대기 중이며, USD 수취계좌가 발급되면 「은행 계좌 추가」로 갈아탄다. 캐나다 세금 상태는 Incomplete로 남아 있다 — OneLink로 캐나다를 수익화할 때만 채우면 된다.
SiteStripe은 Enabled 상태다. 추적 ID는 `feelandnote-20`(웹 기본)과 `feelandnote-yt-20`(유튜브용, 신규 ID는 OneLink 반영까지 최대 24시간) 두 개다.

| 구분 | 확인한 구현과 남은 준비 |
|---|---|
| 사용자 웹 | 영어 콘텐츠 상세와 인물의 창작·연관 도서에서 Amazon 링크를 표시할 수 있다 |
| 메인·큐레이션 | `PopularBooks`는 한국어 전용이다. 기관 선정 구매 UI도 한국어 BOOK만 표시한다. 영문 메인 판매는 추가 설계가 필요하다 |
| 백오피스 인물 도서 | 영어 판본의 Amazon 상품 등록을 지원한다. [서버 액션](../../../sw/web-bo/src/actions/admin/figure-books.ts)이 판본 언어와 플랫폼을 대조한다 |
| 백오피스 일반 콘텐츠 | 기존 판매처 편집 UI에는 Amazon 선택과 영어 locale 전달이 갖춰져 있지 않다 |
| 링크 검증 | 상품 등록 검증은 [figure-book-product-validation.ts](../../../sw/web-bo/src/lib/figure-book-product-validation.ts)가 쥔다 — 아마존은 ASIN 10자리, `product_url`의 `amazon.com/dp·/gp/product/<ASIN>` 형식과 ASIN 일치, `affiliate_url`의 amazon.com·amzn.to 호스트와 외부 태그 차단을 강제한다. 등록 가능 여부와 수익 추적 가능 여부는 다르다 |
| 검색 링크 | `amazonBookSearch.ts`의 제목·저자 검색 폴백이 `tag=feelandnote-20`을 얹어 나간다(2026-09-21 반영) — 생성 시점부터 제휴 검색 링크다 |
| 저장 링크 | 기존 등록분 26건(인물 도서 상품 10 + `content_locales` 16)은 전부 `amazon.com/dp·/gp/product/<ASIN>` 형태의 무태그 정본 주소다 — DB는 태그 없는 상품 주소를 유지하고, `amazonBookSearch.ts`가 렌더 시점에 `tag=feelandnote-20`을 얹는다. .com 외 마켓플레이스·amzn.to는 그대로 둔다 |
| 대가성 표시 | `AFFILIATE_PLATFORMS.amazon.notice`에 필수 원문을 채웠고 구매 창(`BookPurchaseModal`)이 링크 단추와 같은 창에서 보여 준다. 「As an Amazon Associate I earn from qualifying purchases.」는 영어 화면 푸터에도 상시 게시된다 |
| 중계 | `/api/books/purchase`로 나가는 흐름은 클릭 뒤 이동이라 무클릭 리다이렉트 금지와 충돌하지 않지만, 버튼·링크가 Amazon 행선을 숨기지 않아야 한다 |
| 모바일 | 안드로이드 TWA에서 아마존 페이지를 WebView에 띄우면 정책 위반이다 — 외부 브라우저로 연다. 앱 자체를 사이트로 등록하면 별도 심사다 |

### 수수료와 실적 인정

커미션은 링크한 상품이 아니라 세션 안에 **실제로 산 상품의 카테고리** 요율을 따른다(고정율, 2026-09-21 확인): 물리 도서 **4.5%**, 물리 음반·디지털 음악·디지털 영상 5%, DVD·블루레이·PC 2.5%, 디지털 게임·TV 2%, 물리 게임·콘솔·식료품 1%, 그 외 4%. 콘텐츠 유형과 맞물리는 바운티(고정액)도 있다 — Audible 무료 체험 $20·유료 멤버십 $10~25, Kindle Unlimited 체험·가입 $3~10, Amazon Music Unlimited 체험·구독 $3, Prime 체험 $3.
[수수료 명세](https://affiliate-program.amazon.com/gp/associates/join/compensation.html)

세션은 클릭 후 24시간 경과, 주문 완료, 다른 어소시에이트 링크 클릭 중 가장 먼저 오는 시점까지다.
세션 안에 장바구니에 담긴 상품은 클릭 후 89일 안에 주문을 끝내면 인정되고, 구매는 180일 안에 출고·결제가 끝나야 유효다.
지급은 해당 월말 기준 약 60일 뒤다.
실적 제외: 취소·반품, 아마존 상표 입찰 유료광고 경유, 검색엔진이 생성·표시한 링크, 클릭 없이 중간 사이트를 거치는 리다이렉트, 본인·가족·직원 등 지인의 자가 구매, 링크 사용의 대가로 주는 보상(포인트·캐시백·기부 약속), 포맷이 깨진 링크, 구독 상품.

### 가입과 심사

가입은 무료이고, 심사 전부터 Associates Central의 링크 도구와 SiteStripe으로 태그 링크를 만들 수 있다 — 그 링크로 판매를 만들어야 심사가 시작된다.
심사는 가입 후 180일 안의 유효 판매 3건이 쌓인 뒤 진행되며, 주문 단위로 세어 한 주문의 여러 상품은 한 건으로 친다(지원 안내).
신청에 선언한 사이트 전부를 본다: 오리지널 콘텐츠가 실질적이고(기준치 글 10개 내외), 최근 60일 안의 콘텐츠가 있으며, 공개 접근되고, 신청자 소유여야 한다. 부적합 사이트와 아마존 상표를 도메인·식별자에 쓴 곳은 불가다. 거절 건은 재심하지 않고 고쳐서 재신청한다. 위반으로 해지된 이력이 있으면 사전 승인 없이 재가입할 수 없다.
계정은 2026-09-21 신청 완료 상태다 — 180일 카운트가 돌고 있고 유효 판매 3건이 쌓이면 심사가 진행된다.
[신청 심사](https://affiliate-program.amazon.com/help/node/topic/G8TW5AE9XL2VX9VM/)

### 링크 생성과 추적

- SiteStripe은 어소시에이트 계정으로 로그인한 amazon.com 페이지 상단 막대다. 보고 있는 페이지(상품 상세면 그 상품)의 텍스트·이미지 링크와 `amzn.to` 단축 링크를 만든다. 모바일은 아마존 쇼핑 앱의 GetLink가 같은 역할이다.
- Associates Central의 Product Links 도구와 수동 형식 `https://www.amazon.com/dp/<ASIN>?tag=feelandnote-20`도 공식이다. 검색·목록 페이지 주소에도 `tag`를 얹을 수 있다. 자가 작성 링크는 콘솔의 Link Checker로 확인한다.
- 모든 Special Link는 URL에 `feelandnote-20` 형식의 어소시에이트 ID를 파라미터로 포함해야 하고, 신청에 등록한 사이트에만 둔다. 링크 단축·버튼으로 Amazon에 간다는 사실이 불분명해지게 만들지 않는다.
- 추적 ID는 계정당 100개까지 만들어 화면·구획별 성과를 나눌 수 있다(링크프라이스 `u_id`에 해당). 특정 방문자에게 서브태그를 배정해 개인 행동을 추적하는 건 금지다.
- 검색결과·카테고리 같은 상품 목록으로의 링크는 그 페이지에 링크와 관련된 오리지널 콘텐츠가 있어야 한다 — 인물·작품 서술이 있는 화면은 채우지만, 링크만 덩그러니 놓인 자리에는 두지 않는다.
- 소셜 채널(Facebook·Instagram·X·YouTube·TikTok·Twitch, 팔로워 500+·공개)도 사이트 목록에 등록하면 Special Link를 둘 수 있다 — BookRecommend 유튜브 설명란의 확장 경로다.
[SiteStripe](https://affiliate-program.amazon.com/help/node/topic/GJMMT7G4C8K4Y3AY)

### 지급과 세금(한국 운영자)

수령 방법은 직접입금(최소 $10)·아마존 상품권($10, 상한 $2,000)·수표($100, 장당 $15 수수료)다.
공식 국제 이체(Fx4Cash)의 지원 은행은 미국·영국·유로존 52개국뿐이라 **한국 은행·KRW 직접 입금은 없다**.
한국 운영자의 실질 경로는 Payoneer 같은 USD 수취계좌를 「미국 은행」으로 등록하는 방식이거나 USD 수표 추심이다 — 공식 안내 밖이므로 계정 지급 설정과 수취 서비스 약관에서 확인할 항목이다. 반대로 Payoneer가 필수라고도 단정하지 않는다.
3년 무활동 계정의 적립금은 상품권 최소액까지 보류될 수 있다.
[국제 송금](https://affiliate-program.amazon.com/help/node/topic/G8VUMS6GTBCR9RGV)

지급 전 세금 인터뷰(W-8BEN)를 IRS 검증까지 마쳐야 한다. 조세조약 청구 없는 비미국인 커미션은 최대 30% 원천징수 대상이다.
미국 밖에서 수행한 서비스는 미국 원천소득이 아니라고 안내한다 — 인터뷰에서 수행 지역을 잘못 고르면 30%가 걸린다.
미국 원천소득이 있으면 1042-S가 익년 3월 15일까지 발행된다. 한국 측 소득 신고는 별도 판단이며 특정 세무 선택을 문서에서 일괄 지정하지 않는다.
[세금 인터뷰](https://affiliate-program.amazon.com/help/node/topic/GYJB2LE2AB473W2L)

### 고지와 콘텐츠 표시 규정

고지는 두 층이다. 사이트에 「As an Amazon Associate I earn from qualifying purchases.」를 명확히 게시하고(운영계약 §5, 위반은 중대 위반), 링크·리뷰 가까이 `(paid link)`·`#ad` 수준의 FTC 고지를 눈에 띄게 둔다. 원문은 `AFFILIATE_PLATFORMS.amazon.notice`에 있고 구매 창이 링크와 함께 노출한다 — 상시 게시는 영어 화면 푸터(`Footer.tsx`)가 맡는다.
[고지 안내](https://affiliate-program.amazon.com/help/node/topic/GHQNZAU6669EZS98)

가격·재고·평점·리뷰는 Creators API(또는 아마존이 서빙하는 링크)로 얻은 것만 표시할 수 있다.
시간당 갱신보다 느리면 날짜·시각 스탬프와 정해진 면책 문구를 붙인다. 상품 이미지 파일 저장은 금지이고 이미지 URL·기타 콘텐츠는 24시간까지만 캐시한다 — ASIN 자체는 무기한 저장할 수 있다.
수동으로 확인한 가격을 상시 가격처럼 붙이는 UI로 확장하지 않는다.
프로그램 콘텐츠·Special Link로 ML·LLM 모델을 만들거나 학습시키지 않는다. 사이트에 가격 추적·알림 기능을 두지 않는다. 클릭의 대가로 보상을 주지 않는다. 아마존 페이지를 사이트·앱의 프레임·WebView에 띄우지 않고, 팝업·자동 리다이렉트로 열지 않는다.
자동화(봇·에이전트)가 프로그램 콘텐츠에 접근할 때는 User-Agent에 `Agent/<이름>`을 명시하고 봇 차단 우회·CAPTCHA 회피를 하지 않는다(계약의 Agent Terms) — 상품 검증 자동화 설계의 조건이다.

### Creators API(구 PA-API)

PA-API 5는 폐기됐고 후속이 Creators API다 — 구형 호출은 403을 돌려준다.
어소시에이트 계정 뒤 콘솔에서 키 쌍을 발급받아 쓰고, 호출에는 키 쌍과 파트너 태그를 함께 보낸다.
초기 할당은 최대 1 TPS·8,640 TPD(첫 30일)이고 이후 **API가 낳은 출고 매출**로 조정된다 — 하루 $0.05당 +1 TPD, 최근 30일 출고매출 $4,320당 +1 TPS(최대 10).
최근 30일 유효 판매가 없으면 API 접근이 끊기고 판매가 출고되면 이틀 안에 돌아온다 — API가 없어도 SiteStripe 링크 수익은 계속 쌓인다.
가격·재고·이미지·리뷰의 정식 표시는 이 API가 필요하므로 운영 순서는 태그 링크 → 판매 실적 → API 접근이 된다.
[API 요금](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/api-rates) · [PA-API 폐기](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation)

### 국제 커버리지(OneLink)

미국 계정으로 캐나다·EU5(영·독·불·이·스)를 단일 스토어 ID로 수익화하는 설정이 있다.
일본·싱가포르·호주·네덜란드·사우디·폴란드·스웨덴은 각국 어소시에이트 계정을 만들어 스토어 ID를 연결해야 한다.
방문자를 지역 아마존으로 돌리고, 같은 상품이 없을 때 검색으로 보낼지(exact/close match)를 고른다. 한국에는 아마존 사이트가 없어 한국 방문자는 계속 .com에 머문다.
[OneLink](https://affiliate-program.amazon.com/help/node/topic/G8JHEWQ9GTDUN7EH)

위 외부 조건은 2026-09-21 공식 문서 확인 기준이다. 수수료율·심사·지급 조건은 신청과 운영 시점에 다시 확인한다.

## 다른 판매처

플랫폼 상수에는 알라딘·YES24·교보 등도 있지만 제휴 계약이나 수익 연결이 완료되었다는 뜻은 아니다.
알라딘은 수익 연결 없이 서점 선택지로 먼저 선다 — `aladinBookLink`가 저장 ISBN을 `wproduct.aspx?ISBN=` 상품 주소로, 없으면 제목·저자 검색으로 잇고 경유의 `seller=aladin`도 지원한다. 과거 알라딘 TTB 가입 시도는 로그인 문제로 보류되어 있었고(서비스 접근 문의 메일 발송 상태), 제휴가 열리면 같은 경유가 래핑을 얹어 갈아탄다.
서점 순위의 출처로 활용하는 것과 그 서점의 제휴 판매를 운영하는 것은 별개다.
예전 제휴 비교표의 수수료율·가입 가능 여부를 현행 계약 조건으로 복제하지 않는다.
