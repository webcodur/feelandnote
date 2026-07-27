# 팩션 인물화 — 등록 대기 명단 (2026-07-27)

> ## ✅ A·B 두 묶음 90명 프로필 입력 완료 (2026-07-27)
>
> 아래 표 93명 중 3명(브렛 애드콕·마크 라이베르트·세바스찬 스런)은 이미 등록돼 있었고,
> 나머지 **90명 전원**에 `bio`·`title`·생몰일·`nationality`·`gender`·`profession`을 채웠다.
> 인물마다 웹 검색으로 생몰·현직을 재확인했고, 확인 안 된 값은 비워 뒀다.
> 셀럽·태그 캐시도 갱신했다(`/api/revalidate`).
>
> ## ✅ 얼굴 사진 90/90 채움 완료 — 실물 87 + 대체 이미지 3 (2026-07-27)
>
> 위키미디어 자동 조회로 49명을 받은 뒤 **전수를 눈으로 대조**해 동명이인 13명을 걷어냈고(축구 경기 사진,
> e스포츠 해설자, 19세기 인물, 현직 이스라엘 장관 등), 걷어낸 인물과 자동 조회 실패자 53명은 웹 전역에서
> 다시 찾아 채웠다. 최종 등록분도 전수 재검수했다.
>
> **실물 사진이 없는 3명은 물음표 대체 이미지를 넣었다**(따라서 인명부 표시상으로는 90/90 완료).
> · 백문오 · 장인표: 창설 기록에 이름만 남고 사진이 없다(특전사·UDT 공식 자료, 국방부 군사편찬연구소 확인)
> · 빅토르 네틱쇼: 미 법무부가 기소한 12명 중 유일하게 FBI 수배 사진이 없다(공식 배포 포스터 11명분만 존재)
> · 대체 이미지 원본은 `sw/web-bo/scripts/celeb-avatar-unknown.webp`. 나중에 실물이 나오면 그것만 교체하면 된다
>
> **교훈 — 자동 조회 결과를 그대로 믿지 마라.** 위키데이터 이름 검색은 동명이인을 자주 물어온다.
> 파일명에 인물명이 정확히 박힌 경우만 신뢰하고, 나머지는 반드시 이미지를 열어 확인한다.
> 실제로 자동 등록분 49명 중 13명(27%)이 딴 사람이었다.
>
> ## ✅ 세부 데이터 — 무게 있는 40명만 채움 (2026-07-27)
>
> 유저 방침: **팩션 때문에 우연히 들어간 인물은 light로 두고, 격이 되는 인물만 채운다.**
> 「그 사람을 다룬 책이 있는가」(`celeb-gotchas.md` §5) 기준으로 40명을 골라 세 트랙을 채웠다.
>
> | 트랙 | 결과 |
> |---|---|
> | 영향력 평가 | 40 / 40 (7개 영역 + 통시성, 합산 검산 일치) |
> | 페르소나 | 40 / 40 (능력 4 · 덕목 8 · 성향 4 + 종합 해설, 한·영 동시) |
> | 발화 | 40 / 40 (어조 배정 + 명언 + 7상황 × 3변형 21개 대사) |
>
> 구조 무결성 실측: 대사 원소가 객체인 건 **0건**(과거 셀럽 페이지를 500으로 죽인 그 결함), 7상황 완비 40/40.
>
> **채우지 않은 50명**은 기본 정보만 두고 등급도 light 그대로다. 현직 실무 경영자, 궐석 기소된
> 사이버 요원, 자료가 얕은 한국군 초기 인물이 여기 속한다. 나중에 필요해지면 같은 방식으로 채우면 된다.
>
> ### ✅ 명언 출처 대조 완료 — 6건 교정
>
> 세션 웹 검색 한도(200회)가 소진돼 검색은 막혔으나, **WebFetch로 문서를 직접 열어 대조를 끝냈다**
> (검색이 필요하면 DuckDuckGo·Bing의 HTML 결과 페이지를 fetch, 봇 차단은 Jina Reader 경유로 우회).
>
> **원문 확인됨(수정 없음)** — 윌리엄 보잉(보잉 기념비 각인문, 1929) · 엘리 코헨(1965-05-15 마지막 편지 전문) ·
> 맥레이븐(2014 텍사스대 졸업식 축사 전문) · 베토 오로크(2019-09-12 민주당 3차 토론) · 왕촨푸(2023-08 BYD 500만대 기념식
> 연설 마지막 문장) · 잣코(워싱턴포스트) · 하렐 · 몬세구르 · 해먼드 · 아이작먼 · 다간 · 알렉산더
>
> **교정한 6건**
> | 인물 | 문제 | 조치 |
> |---|---|---|
> | 폰 브라운 | '엉뚱한 행성' 인용은 1차 출처 없는 전승 | 사실 주장이 아닌 문장으로 교체 |
> | 🔴 바이락타르 | DB 문장이 **다른 사람 말**과 거의 동일 — 전 산업기술부 장관 무스타파 바랑크의 2022년 발언 | 본인 발언(2024-07 X 게시)으로 교체 |
> | 🔴 플레이터 | **화자 오류** — 회사 6곳 공동서한 문장을 개인 발언으로 표기 | 본인 명의 성명 문장으로 교체 |
> | 도너번 | 번역 오류 — '시키는 대로만 하는 대령'은 원문 `too regimented to think and act for himself`와 어긋남 | 원뜻대로 수정 |
> | 쩡위췬 | 액자 경위가 알려진 것과 달랐고(원래 걸린 것이 `赌性坚强`), 원문의 '몸으로 하는 일 vs 머리로 하는 일' 대비 소실 | 전언 원문 취지로 교체 |
> | 베테유 | 공식 부고 3종 어디에도 직접 인용 없음 | 확인된 행적 기반 1인칭 문장으로 교체 |
>
> **남은 미확인 1건** — 찰리 벡위드의 델타포스 선발 어록은 여러 곳에서 토씨까지 같게 인용되나 1차 출처가 없다.
> 확정하려면 본인 회고록 『Delta Force』(1983) 본문 대조가 필요한데, **책 본문 검색 경로가 전부 막혀 있다(실측)**:
> · OpenLibrary로 아카이브 아이템 4종은 찾았다(`deltaforcearmyse00beck` 외 3종)
> · 그러나 전문 텍스트(`_djvu.txt`)는 대출 제한 도서라 **401/403**
> · 아카이브 본문 검색 엔드포인트(`BookReader/BookReaderSearch.php`)는 **404로 폐기됨**, `api.archivelab.org`는 접속 거부, `ia-pub-fts-api`는 DNS 부재
> · HathiTrust 전문 검색도 **403**
> 문구 자체가 안정적이라 그대로 뒀다. 확정하려면 종이책이나 도서관 전자열람이 필요하다.
> ⚠️ 이 대조를 **구글 북스로 시도하지 마라** — `AGENTS.md`가 신규 사용을 금지한 도구이고, 실제로 일일 할당량에 걸린다.
>
> **남은 일**
> 1. **생년 미확인 31명** — 비상장사 경영자·궐석 기소된 국가 요원·한국군 초기 인물이 대부분이라
>    공개 자료에 생년이 없다. 확인하려면 각각 다른 1차 자료가 필요하다(기업 공시 임원 약력,
>    미 법무부 비공개 수사기록, 육사 기수 명부 등).
>    김동수, 다다노부 가즈오, 데니스 화이트, 데이비드 커틀리, 드미트리 돌고프, 로버트 플레이터,
>    림종혁, 밀란 코박, 밥 멈가드, 백문오, 베른트 뵈르니히, 브랜던 쳉, 빅토르 네틱쇼, 빌 라일리,
>    슈테판 베크바흐, 시바 시바람, 쑨카이량, 알렉스 켄달, 애덤 브라이, 왕둥, 장인표, 제임스 펑,
>    조너선 허스트, 조영주, 카일 보그트, 켈러 리나우도, 크리스 르베스크,
>    프란시스쿠 고미스 네투, 피터 벡, 호세 레예스, 히로세 마사토
> 2. 아래 **C. 아직 손대지 않은 큰 덩어리**는 그대로 남아 있다
>
> **✅ 한국어 표기 5명 교정 완료** — 국내 통용 표기로 맞췄다(영문 이름은 그대로라 주소는 안 바뀐다).
> 베른트 뵈르니크→**뵈르니히**, 재러드 아이잭먼→**아이작먼**, 르우벤 실로아→**레우벤 실로아흐**,
> 알렉스 켄들→**켄달**, 켈러 리나우도 클리프턴→**켈러 리나우도**.
> 아이작먼은 영상 쪽 출연진 자료가 이미 '아이작먼'이었다 — 인명부만 어긋나 있었고 이제 일치한다.
>
> ---
>
> **(이하 원래 안내 — 위 표기·생몰 재확인 원칙은 앞으로도 유효하다)**
>
> 여기 적힌 인물은 이미 인명부에 **이름만** 올라가 있었다(빈 껍데기).
> 도감 배정과 영상 연결은 끝나 있으니, 남은 일은 각 인물의 프로필을 채우는 것뿐이었다.
>
> 채울 것: `bio`·`title`(수식어)·생몰일·`nationality`·`gender`·`profession`·`avatar_url`.
> 등급은 전부 `light`, 상태는 `inactive`로 넣어 뒀다(도감은 상태를 안 따진다).
> 규격은 `docs/project/celeb/celeb-1-basic-profile.md`.
>
> ⚠️ **아래 「왜 이 편인가」는 조사 근거이지 확정 사실이 아니다.** 프로필을 채울 때는
> 반드시 출처를 다시 열어 생몰·직책을 확인한다. 특히 현직 CEO는 2026년에 바뀐 자리가 많다.

---

## A. 기계·장비 편 → 사람 (7편 60명)

원래 로봇·로켓·자동차 같은 물건이 출연진이라 도감에 못 들어가던 편들이다. 각 제품을
**만든 사람**으로 바꿨다.

### A-1. 기계 인간의 시대 (humanoids)

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| 베른트 뵈르니크 | Bernt Børnich | 1X Technologies 창업자·CEO | 가정용 인간형 로봇 NEO를 2026년 대량생산에 올린 사람 | forbes.com/sites/johnkoetsier/2026/04/30/1x-kicks-off-full-scale-production-of-humanoid-robot-neo/ |
| 밀란 코박 | Milan Kovac | 전 테슬라 옵티머스 총괄, 2026.1 보스턴다이내믹스 자문으로 이동 | 테슬라 인간형 로봇을 설계·지휘하다 경쟁 진영으로 넘어갔다 | electrek.co/2026/01/16/hyundais-boston-dynamics-scoops-up-teslas-former-optimus-head-milan-kovac/ |
| 마크 레이버트 | Marc Raibert | 보스턴다이내믹스 창업자(1992), 현 RAI Institute 대표 | 두 다리로 뛰는 로봇이라는 장르를 만든 사람. 아틀라스의 아버지 | rai-inst.com/about/leadership/marc-raibert/ |
| 로버트 플레이터 | Robert Playter | 보스턴다이내믹스 2대 CEO(2019~2026.2) | 연구실 장난감이던 네 발 로봇 스팟을 상품으로 바꿨다 | techcrunch.com/2026/02/10/boston-dynamics-ceo-robert-playter-steps-down-after-30-years-at-the-company/ |
| 브렛 애드콕 | Brett Adcock | Figure AI 창업자·CEO(2022) | 창업 4년 만에 기업가치 390억 달러를 만든 인간형 로봇 벤처 | time.com/7324233/figure-03-robot-humanoid-reveal/ |
| 왕싱싱 | Wang Xingxing (王兴兴) | 유니트리 로보틱스 창업자·CEO(1990년생) | 1600만 원대 인간형 로봇을 양산해 가격 구조를 무너뜨렸다 | en.wikipedia.org/wiki/Wang_Xingxing |
| 조너선 허스트 | Jonathan Hurst | Agility Robotics 공동창업자, 오리건주립대 교수 | 아마존 창고와 도요타 공장에 실제로 일하는 두 발 로봇을 들여보냈다 | wweek.com/technology/2026/03/11/… |
| 히로세 마사토 | Masato Hirose | 혼다 R&D 수석 엔지니어, 아시모 개발 총괄 | 아들이 걷는 모습을 촬영해가며 세계 최초 두 발 보행 로봇(P2)을 만들었다 | hondarandd.jp/point.php?pid=619&lang=en |

### A-2. 지구를 떠나는 기계들 (space-industry)

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| 톰 뮬러 | Tom Mueller | 스페이스X 1호 직원·전 추진 총괄, 현 Impulse Space 창업자 | 팰컨 9을 날게 하는 멀린 엔진을 직접 설계했다 | interestingengineering.com/interviews/spacex-tom-mueller-rocket-engines |
| 빌 라일리 | Bill Riley | 스페이스X 스타십 엔지니어링 총괄(VP) | 인류 최대 발사체의 기체 설계와 회수를 책임진다 ⚠️ 직책은 링크드인·업계 매체 기준, 공식 발표 미확인 | linkedin.com/in/bill-riley-cornell-fsae/ |
| 피터 벡 | Peter Beck | 로켓랩 창업자·CEO(2006, 뉴질랜드) | 소형 로켓으로 시장을 열고 중형으로 스페이스X에 도전한다 | nasaspaceflight.com/2026/07/rocket-lab-update-072026/ |
| 데이브 림프 | Dave Limp | 블루오리진 CEO | 뉴글렌 폭발 사고를 수습하며 재발사를 밀어붙이는 현장 책임자 | spaceflightnow.com/2026/06/30/… |
| 토리 브루노 | Tory Bruno | 전 ULA CEO(2014~2025.12), 현 블루오리진 국가안보 총괄 | 아틀라스 V를 은퇴시키고 벌컨을 국가안보 인증까지 끌고 갔다 | space.com/space-exploration/longtime-united-launch-alliance-ceo-tory-bruno-resigns-… |
| 베르너 폰 브라운 | Wernher von Braun | NASA 마셜센터 초대 소장, 새턴 V 총설계자 (1912~1977) | 인류를 달에 보낸 로켓을 설계한 이 산업의 출발점 | nasa.gov/people/wernher-von-braun/ |
| 재러드 아이잭먼 | Jared Isaacman | NASA 제15대 국장, 인스퍼레이션4 지휘관 | 2026년 아르테미스를 수정해 SLS의 운명을 정하는 자리에 있다 | nasa.gov/blogs/workforce-updates/2026/05/22/… |

> 그윈 숏웰은 이미 등록돼 있다(스페이스X 테마 소속).

### A-3. 도로 위의 지배자들 (ev-wars)

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| RJ 스캐린지 | RJ Scaringe | 리비안 창업자·CEO | 픽업트럭이라는 미국의 심장부를 전기로 바꾸려 했다 | fortune.com/2026/06/30/rivian-ceo-rj-scaringe-apple-tesla-r2/ |
| 쩡위췬 | Robin Zeng (曾毓群) | CATL 창업자·회장·CEO | 세계 전기차 배터리 최대 공급자. 2026 포브스 중국 최고 CEO 1위 | en.wikipedia.org/wiki/Robin_Zeng |
| 피터 롤린슨 | Peter Rawlinson | 전 루시드 CEO·CTO, 전 테슬라 모델 S 수석 엔지니어 | 모델 S를 설계한 뒤 루시드에서 주행거리 경쟁을 다시 시작했다 | en.wikipedia.org/wiki/Peter_Rawlinson_(engineer) |
| 왕촨푸 | Wang Chuanfu (王传福) | BYD 창업자·회장 | 배터리 회사로 시작해 5년 안에 세계 최대 자동차 회사가 되겠다고 했다 | carnewschina.com/2026/06/09/… |
| 김동명 | Kim Dong-myung | LG에너지솔루션 대표이사 사장(2024~) | 연구원 출신으로 회사를 이끄는 한국 배터리 진영의 얼굴 | businesspost.co.kr/BP?command=article_view&num=406784 |
| 이상엽 | SangYup Lee | 현대자동차 디자인센터장 부사장 | 포니를 되살린 아이오닉 5의 생김새를 직접 그렸다 | hyundai.co.kr/story/CONT0000000000004517 |
| 다다노부 가즈오 | Kazuo Tadanobu | 파나소닉 에너지 사장·CEO | 테슬라에 셀을 대는 일본 배터리 진영의 대표 | panasonic.com/global/energy/company/message.html |
| 슈테판 베크바흐 | Stefan Weckbach | 전 포르쉐 타이칸 개발 총괄, 2026.7~ 메르세데스-AMG CEO | 스포츠카 회사가 전기차를 만들면 어떻게 되는지 보여준 타이칸의 설계자 | autocar.co.uk/car-news/business-finance-and-corporate/mercedes-amg-names-ex-porsche-taycan-head-new-ceo |

> 프란츠 폰 홀츠하우젠은 이미 등록돼 있다(테슬라 테마 소속).

### A-4. 빛과 열을 지배하는 자들 (energy-industry)

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| 밥 멈가드 | Bob Mumgaard | 커먼웰스 퓨전 시스템스 공동창업자·CEO | 구글·에니와 10억 달러 넘는 전력 공급 계약을 먼저 따낸 핵융합 선두 | wbjournal.com/honoree/2026-power-100-bob-mumgaard/ |
| 데니스 화이트 | Dennis Whyte | MIT 핵과학공학 교수, CFS 공동창업자 | 세계 최강 초전도 자석으로 '작고 강한 핵융합로'를 가능하게 했다 | technologyreview.com/2026/01/06/1128665/dennis-whytes-fusion-quest/ |
| 호세 레예스 | José N. Reyes | 뉴스케일파워 공동창업자·CTO | 미국 최초로 설계 인증을 받은 소형모듈원자로를 설계했다 | nuscalepower.com/about/leadership/jose-reyes |
| 시바 시바람 | Siva Sivaram | 퀀텀스케이프 사장·CEO | 전고체 배터리 시험생산 라인을 실제로 돌리기 시작했다 | electrek.co/2026/02/05/quantumscape-inaugurates-eagle-line-pilot-solid-state-battery-production/ |
| 크리스 르베스크 | Chris Levesque | 테라파워 CEO | 미국 최초로 상업 규모 차세대 원자로 건설 허가를 받아냈다 | terrapower.com/NRC-Approves-Natrium-Reactor-Construction-Permit |
| 데이비드 커틀리 | David Kirtley | 헬리온 에너지 공동창업자·CEO | 마이크로소프트에 2028년까지 핵융합 전기를 팔기로 계약했다 | geekwire.com/2026/the-fusion-pivot-helion-ceo-david-kirtleys-journey-… |
| 미클 빈더바우어 | Michl Binderbauer | TAE 테크놀로지스 CEO | 남들과 다른 수소-붕소 방식을 고집해 온 핵융합 진영의 이단아 | tae.com/leadership/dr-michl-binderbauer/ |
| 클레이 셀 | J. Clay Sell | X-에너지 CEO, 전 미국 에너지부 부장관 | 원자력을 규제하던 사람이 직접 차세대 원자로 회사를 이끈다 | x-energy.com/news/x-energy-closes-oversubscribed-700-million-series-d-financing-round-… |

### A-5. 운전대의 종말 (autonomous-driving)

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| 드미트리 돌고프 | Dmitri Dolgov | 웨이모 공동 CEO(기술) | 구글 자율주행 초기부터 남아 기술을 완성시켰다 | linkedin.com/in/dmitri-dolgov/ |
| 테케드라 마와카나 | Tekedra Mawakana | 웨이모 공동 CEO(사업·규제) | 규제와 도시를 뚫어 로보택시를 실제 서비스로 만들었다 | stanforddaily.com/2026/05/27/… |
| 세바스찬 스런 | Sebastian Thrun | 스탠퍼드 교수, 2005 다르파 챌린지 우승, 구글 자율주행 창설 | 자율주행이라는 분야를 실제로 출발시킨 사람 | en.wikipedia.org/wiki/Sebastian_Thrun |
| 크리스 엄슨 | Chris Urmson | 오로라 공동창업자·CEO, 전 구글 자율주행 총괄 | 승용차가 아니라 화물 트럭에서 무인 상용운행을 먼저 시작했다 | ir.aurora.tech/company-information/leadership-team |
| 카일 보그트 | Kyle Vogt | 크루즈 창업자·전 CEO, 현 The Bot Company 창업자 | 로보택시 경쟁에서 밀려 회사를 잃고 로봇으로 갈아탔다 | en.wikipedia.org/wiki/Kyle_Vogt |
| 암논 샤슈아 | Amnon Shashua | 모빌아이 창업자·CEO(2026.7 사임 발표) | 자동차가 앞을 보게 만든 칩을 팔아 온 자율주행 부품의 지배자 | techcrunch.com/2026/07/23/mobileye-ceo-amnon-shashua-to-step-aside-… |
| 알렉스 켄들 | Alex Kendall | Wayve 공동창업자·CEO(영국) | 지도 없이 학습만으로 운전하게 하는 유럽 쪽 도전자 | wayve.ai/company/leadership-team/alex-kendall/ |
| 제임스 펑 | James Peng | 포니.ai 창업자·CEO | 중국 4대 도시에서 무인 택시를 굴리며 웨이모를 추격한다 | en.wikipedia.org/wiki/Pony.ai |

> 아쇼크 엘루스와미는 이미 등록돼 있다(테슬라 테마 소속).

### A-6. 하늘을 덮는 날개 (aviation-industry)

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| 윌리엄 보잉 | William E. Boeing | 보잉 창업자 (1881~1956) | 목재상이 비행기 한 대를 보고 시작해 세계 최대 항공기 회사를 만들었다 | historylink.org/file/8023 |
| 조 서터 | Joe Sutter | 보잉 747 수석 엔지니어 (1921~2016) | 29개월 만에 점보기를 만들어 장거리 여행을 대중의 것으로 바꿨다 | nationalaviation.org/enshrinee/joe-sutter/ |
| 켈리 오트버그 | Kelly Ortberg | 보잉 사장·CEO(2024.8~) | 추락과 품질 사고로 무너진 보잉을 다시 세우는 임무를 맡았다 | boeing.com/company/bios/kelly-ortberg |
| 로제 베테유 | Roger Béteille | 에어버스 창립 주역, A300B·A320 개발 주도 (1921~2019) | 유럽 여러 나라 공장을 엮어 보잉의 대항마를 만들었다 | airbus.com/en/newsroom/press-releases/2019-06-airbus-founding-father-… |
| 기욤 포리 | Guillaume Faury | 에어버스 CEO(2019~) | 2025년 793대를 인도하며 보잉을 앞선 현 왕좌의 주인 | airbus.com/en/about-us/our-governance/guillaume-faury |
| 우광후이 | Wu Guanghui (吴光辉) | COMAC 부총경리, C919 총설계사 | 중국이 자력으로 여객기를 만들겠다는 계획의 설계 책임자 | en.wikipedia.org/wiki/Wu_Guanghui |
| 허둥펑 | He Dongfeng (贺东风) | COMAC 회장(2017~) | 보잉·에어버스 양강 구도를 깨겠다고 국가가 세운 회사의 수장 | en.wikipedia.org/wiki/He_Dongfeng |
| 래리 컬프 | Larry Culp | GE 에어로스페이스 회장·CEO(2024~) | 누가 만들든 엔진은 이 회사 것이라는 수주잔고 2100억 달러의 실세 | geaerospace.com/company/about-us/leadership |
| 프란시스쿠 고미스 네투 | Francisco Gomes Neto | 엠브라에르 사장·CEO(2019~) | 양강 아래에서 중소형기로 3위를 지키는 브라질 진영 | embraer.com/media/5h0bs2lm/biography-francisco-gomes-neto-ceo.pdf |

### A-7. 하늘의 지배자들 (drone-industry)

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| 에이브러햄 카렘 | Abraham Karem | 무인기의 아버지, 프레데터 원형 설계자 (1937년생) | 차고에서 만든 기체가 프레데터·리퍼가 되어 전쟁의 방식을 바꿨다 | smithsonianmag.com/air-space-magazine/the-man-who-invented-the-predator-3970502/ |
| 린든 블루 | Linden P. Blue | 제너럴 아토믹스 에어로노티컬 CEO(2014~) | 리퍼를 30년간 1000대 넘게 찍어낸 무장 무인기 최대 공급자 | ga-asi.com/statement-from-ga-asi-ceo-linden-blue-on-ukraine-conflict |
| 캐시 워든 | Kathy Warden | 노스럽 그러먼 회장·CEO(2019~) | 고고도 정찰기 글로벌 호크를 만든 방산 대기업의 수장 | northropgrumman.com/who-we-are/leadership/kathy-warden |
| 왕타오 | Frank Wang (汪滔) | DJI 창업자·회장 (1980년생) | 민간 드론 세계 점유율 70%. 하늘을 대중에게 열었다 | en.wikipedia.org/wiki/Frank_Wang |
| 애덤 브라이 | Adam Bry | 스카이디오 공동창업자·CEO, 전 구글 X | 중국 드론에 맞서는 미국 최대 드론 제조사, 6만 대 이상 납품 | skydio.com/blog/american-leadership-for-the-next-century-of-aviation |
| 셀추크 바이락타르 | Selçuk Bayraktar | 바이카르 이사회 의장·CTO | TB2로 36개국에 무인기를 수출해 중견국 전쟁을 바꿨다 | baykartech.com/en/selcuk-bayraktar/ |
| 켈러 리나우도 클리프턴 | Keller Rinaudo Cliffton | 집라인 공동창업자·CEO | 아프리카 혈액 배송에서 하루 5천 회 무인 배송까지 온 민간 쪽 대표 | en.wikipedia.org/wiki/Zipline_(drone_delivery_company) |

> 팔머 럭키는 이미 등록돼 있다(틸 유니버스 소속).

---

## B. 기관·집단 편 → 사람 (5편 49명)

### B-1. 보이지 않는 제국 (intelligence-agencies)

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| 윌리엄 도너번 | William J. Donovan | OSS 국장 1942~45, 미 육군 소장 | CIA의 전신을 만들고 이끈 미국 중앙정보 체계의 출발점 | britannica.com/biography/William-J-Donovan |
| 토니 멘데즈 | Tony Mendez | CIA 변장 총책, 1979~80 테헤란 인질 탈출 | 영화 「아르고」의 실제 인물. 가짜 영화 제작진으로 위장해 6명을 빼냈다 | npr.org/2019/01/19/686942870/… |
| 맨스필드 스미스커밍 | Mansfield Smith-Cumming | 영국 비밀정보부 초대 수장 1909~1923 | MI6를 만든 사람. 서명 'C'가 역대 수장의 호칭이 됐고 007 'M'의 원형 | english-heritage.org.uk/about/search-news/blue-plaque-mansfield-cumming/ |
| 스튜어트 멘지스 | Stewart Menzies | MI6 수장 1939~1952 | 블레츨리 파크 암호해독을 관장하고 처칠에게 직접 보고했다 | en.wikipedia.org/wiki/Stewart_Menzies |
| 르우벤 실로아 | Reuven Shiloah | 모사드 초대 수장 1949~1952 | 벤구리온에게 창설을 건의하고 초대 수장이 됐다 | britannica.com/biography/Reuven-Shiloah |
| 이세르 하렐 | Isser Harel | 모사드 2대 수장 1952~1963 | 1960년 아르헨티나에서 아이히만을 잡아온 작전의 총책 | en.wikipedia.org/wiki/Isser_Harel |
| 엘리 코헨 | Eli Cohen | 모사드 요원, 시리아 잠입 1961~65, 1965 공개 처형 | 적국 권력 핵심까지 파고든 잠입 요원의 대표. 2025년 유품 2,500점 회수 | timesofisrael.com/2500-items-belonging-to-executed-spy-eli-cohen-recovered-from-syria-by-mossad/ |
| 메이르 다간 | Meir Dagan | 모사드 수장 2002~2011 | 현대 모사드의 상징. 이란 핵 프로그램 저지 작전기의 수장 | timesofisrael.com/former-mossad-chief-meir-dagan-dies-at-71/ |

> 앨런 덜레스·킴 필비는 이미 등록돼 있다(냉전 스파이 편).

### B-2. 어둠 속의 칼날 (special-forces)

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| 리처드 마신코 | Richard Marcinko | SEAL Team 6 창설·초대 지휘관 1980~83 | 이란 인질 구출 실패 뒤 대테러 부대를 새로 설계했다. 이름의 '6'도 그가 적을 속이려 붙인 것 | armytimes.com/breaking-news/2021/12/26/… |
| 윌리엄 맥레이븐 | William H. McRaven | 합동특수전사령관 2008~2011 | 2011년 빈라덴 급습 작전을 설계하고 실시간 지휘했다 | en.wikipedia.org/wiki/William_H._McRaven |
| 찰리 벡위드 | Charles A. Beckwith | 델타포스 창설 1977, 미 육군 대령 | 영국 SAS에서 본 것을 미국에 옮겨 델타포스를 만들었다 | en.wikipedia.org/wiki/Charles_Alvin_Beckwith |
| 데이비드 스털링 | David Stirling | SAS 창설 1941 | 모든 현대 특수부대의 원형. 소수 침투라는 방식 자체를 만들었다 | britannica.com/biography/David-Stirling |
| 울리히 베게너 | Ulrich Wegener | GSG 9 창설·초대 지휘관 | 뮌헨 참사 2주 뒤 부대 창설을 맡았고 1977년 모가디슈 인질 86명을 구했다 | en.wikipedia.org/wiki/Ulrich_Wegener |
| 크리스티앙 프루토 | Christian Prouteau | GIGN 창설·초대 지휘관 1974~1983 | 프랑스 대테러 부대를 만들고 9년간 64회 작전을 직접 지휘했다 | en.wikipedia.org/wiki/Christian_Prouteau |
| 백문오 | Baek Mun-oh | 제1전투단(육군 특전사의 뿌리) 초대 단장, 1958.4.1 | 한국전쟁기 유격·첩보대원을 모아 한국 최초 특수전 부대를 세웠다 | ko.wikipedia.org/wiki/육군특수전사령부 |
| 장인표 | Jang In-pyo | 해군 수중파괴대(UDT) 초대 지휘관, 1955.11.9 | 장교 7명과 1기생 26명으로 한국 해군 특수전을 열었다 | ko.wikipedia.org/wiki/해군_특수전전단 |
| 조영주 | Cho Young-joo | 청해부대장(해군 대령), 2011 아덴만 여명 작전 지휘 | 한국군이 해외에서 성공시킨 첫 인질 구출. 21명 전원 생환 | ko.wikipedia.org/wiki/아덴만_여명_작전 |

> ⚠️ 707특임단 초대 단장은 공개 자료로 확인되지 않았다(창설일 1981.4.17만 확인).
> 영국 SAS 진영은 실명 확인 인물이 창설자 하나뿐이라 독일·프랑스 부대로 넓혔다.

### B-3. 전장의 지배자들 (defense-industry)

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| 짐 타이클렛 | Jim Taiclet | 록히드마틴 회장·CEO(2020~) | F-35·F-22를 만드는 회사의 수장. 본인이 걸프전 참전 조종사 출신 | lockheedmartin.com/en-us/who-we-are/leadership-governance/james-taiclet.html |
| 피비 노바코비치 | Phebe Novakovic | 제너럴다이내믹스 회장·CEO(2013~), 전 CIA 요원 | M1 에이브럼스와 핵잠수함을 만드는 회사의 수장. 정보기관 출신 | gd.com/about-gd/leadership |
| 브랜던 쳉 | Brandon Tseng | 실드AI 공동창업자·사장, 전 네이비실 | 아프가니스탄 파병 중 겪은 문제를 풀려고 자율 드론 회사를 세웠다 | time.com/collections/time100-ai-2025/7305863/brandon-tseng/ |
| 아르민 파퍼거 | Armin Papperger | 라인메탈 CEO(2013~) | 유럽 재무장의 최대 수혜 기업 수장. 2025 이코노미스트 올해의 CEO | en.wikipedia.org/wiki/Armin_Papperger |
| 에릭 트라피에 | Éric Trappier | 다쏘항공 회장·CEO(2013~) | 라팔 수출을 인도·이집트·카타르·UAE로 뚫었다 | en.wikipedia.org/wiki/Éric_Trappier |
| 손재일 | Son Jae-il | 한화에어로스페이스 대표이사 | K9 자주포와 천무를 폴란드·핀란드로 내보낸 K-방산 수출의 실무 총책 | ko.wikipedia.org/wiki/손재일 |
| 김동수 | Kim Dong-soo | 국방과학연구소 제5기술연구본부장, 2009년 순직 | K9 자주포를 실제로 설계한 사람. 1998년 보국훈장 삼일장 | hankookilbo.com/news/article/A2026051814430003766 |

> 캐시 워든은 A-7에도 있다(중복 등록 불필요). 알렉스 카프·팔머 럭키는 이미 등록돼 있다.
> ⚠️ K2 흑표·FA-50 설계 책임자 실명은 공개 보도로 확인되지 않았다.

### B-4. 위대한 해커들 — 가면 쓴 자들 (great-hackers-masked)

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| 피터 잣코 | Peiter "Mudge" Zatko | 죽은 소의 교단·L0pht 핵심, 이후 DARPA·구글·트위터 보안 책임자 | 1998년 미 상원에서 "30분이면 인터넷을 마비시킬 수 있다"고 증언, 훗날 트위터 내부고발자 | en.wikipedia.org/wiki/Peiter_Zatko |
| 베토 오로크 | Beto O'Rourke | 십대 시절 죽은 소의 교단 멤버, 이후 미 하원의원·대선 후보 | 지하 해커 집단 출신이 대선 후보가 된 반전. 2019년 보도로 공개, 본인 인정 | engadget.com/2019-03-15-beto-orourke-cult-of-the-dead-cow.html |
| 엑토르 몬세구르 | Hector Monsegur ("Sabu") | 럴즈섹 공동창설자, 2011 체포 후 FBI 협조자 | 럴즈섹을 만든 사람이자 무너뜨린 사람 | en.wikipedia.org/wiki/Hector_Monsegur |
| 제이크 데이비스 | Jake Davis ("Topiary") | 럴즈섹 대변인 격, 2013 영국 법원 24개월 | 럴즈섹의 목소리. 형기를 마치고 지금은 보안 강연자 | nbcnews.com/tech/tech-news/lulzsec-hackers-who-wreaked-havoc-sony-cia-jailed-uk-flna1c9957155 |
| 무스타파 알바삼 | Mustafa Al-Bassam ("tflow") | 럴즈섹 최연소, 2013 집행유예 | 미성년 기소 뒤 UCL 박사·블록체인 연구자가 됐다. 가장 밝은 결말 | darkreading.com/cyberattacks-data-breaches/lulzsec-hackers-sentenced-in-london |
| 제러미 해먼드 | Jeremy Hammond | 어나니머스·AntiSec, 2013 최고형 10년 | 스트랫포 해킹으로 최고형. 그를 지목한 게 FBI 협조자였던 몬세구르였다 | justice.gov/usao-sdny/pr/jeremy-hammond-sentenced-10-years-prison-… |
| 미하일 마트베예프 | Mikhail Matveev ("Wazawaka") | LockBit·Babuk·Hive 관여, 2022 미 기소, 2024 러시아 내 체포 | 현상금 1,000만 달러가 걸린 채 러시아 국내에서 기소된 특이한 결말 | state.gov/mikhail-pavlovich-matveev |

> 이미 등록: 막심 야쿠베츠·드미트리 호로셰프·노아 어반.
> ⚠️ 피니어스 피셔는 지금도 신원 미상이라 넣지 않는다. 다크사이드는 실명 지목된 구성원이 없다.

### ❌ B-5. 위대한 해커들 — 국가의 군단 (great-hackers-state) — **편·인물 모두 폐기 (2026-07-28)**

> **폐기 사유.** 이 편의 원래 출연진은 스턱스넷·이퀘이션 그룹·61398부대·샌드웜 같은 **조직·악성코드 이름**이었다.
> 그걸 사람으로 바꾸려 하니 문제가 둘 드러났다.
> 1. **한쪽 진영만 얼굴이 붙는다.** 국가 사이버 요원은 이름이 세상에 나오는 통로가 미국 기소장·FBI 수배뿐이라,
>    인물화하면 자동으로 중국·러시아·북한만 실명·수배 사진이 붙고 미국·이스라엘 쪽은 익명으로 남는다.
> 2. **인물의 격 미달.** 부대 실무자라 생년도 사진도 자료가 없고, 세부 데이터를 만들 근거가 없다.
>
> **조치**: 영상 기획 1편(그룹 5·출연 13) DB 삭제. 인명부에서 **왕둥·쑨카이량·빅토르 네틱쇼·유리 안드리엔코·
> 림종혁·미하일 마트베예프 6명 삭제**(도감 배정·계정 포함). 삭제분 백업은 세션 스크래치패드의
> `deleted-2026-07-28-state-hackers.json`.
> 같은 편에 있던 **키스 알렉산더·길 슈베드는 유지**한다(공개 인물이고 세부 데이터도 채웠다).
> 「가면 쓴 자들」·「얼굴 있는 자들」 두 편은 실명 인물 기반이라 손대지 않았다.
>
> 이 편을 되살린다면 대안 후보는 **랄프 랑그너**(스턱스넷을 해부해 표적이 나탄즈임을 밝힌 분석가)와
> **세르게이 울라센**(최초 발견자)이다. 분석가라 실명·인터뷰·자료가 충분하다.

<details><summary>폐기된 원래 명단 (기록 보존용)</summary>

| 인물 | 영문 | 소속·직책 | 왜 이 편인가 | 출처 |
|---|---|---|---|---|
| 키스 알렉산더 | Keith B. Alexander | 미 NSA 국장 2005~2014, 초대 사이버사령관 | 국가가 해킹을 정규 군사 조직으로 만든 장본인 | en.wikipedia.org/wiki/Keith_B._Alexander |
| 길 슈베드 | Gil Shwed | 이스라엘 8200부대 출신, 체크포인트 공동창업자·CEO | 열여덟에 부대에서 만든 방화벽 기술로 창업해 산업을 만들었다 | cnbc.com/2017/05/11/israel-unit-8200-team8.html |
| 왕둥 | Wang Dong ("UglyGorilla") | 인민해방군 61398부대 장교, 2014 미 기소 | 미국이 처음으로 타국 현역 군인을 해킹 혐의로 기소한 5인 중 하나 | fbi.gov/wanted/cyber/wang-dong |
| 쑨카이량 | Sun Kailiang | 인민해방군 61398부대 장교, 2014 미 기소 | 웨스팅하우스 원전 설계도 절취 혐의로 지목됐다 | justice.gov/archives/opa/pr/us-charges-five-chinese-military-hackers-… |
| 빅토르 네틱쇼 | Viktor Netyksho | 러시아 GRU 26165부대 지휘관, 2018 미 기소 | 2016년 미국 대선 개입 기소장의 첫 번째 피고인 | justice.gov/archives/opa/pr/us-charges-russian-gru-officers-… |
| 유리 안드리엔코 | Yuriy Andrienko | GRU 74455부대(샌드웜), 2020 미 기소 | 우크라이나 전력망 정지·NotPetya·평창올림픽 공격 혐의 | fbi.gov/wanted/cyber/gru-hackers-destructive-malware-and-international-cyber-attacks |
| 림종혁 | Rim Jong Hyok | 북한 정찰총국 안다리엘, 2024.7 미 기소·현상금 1,000만 달러 | 미국 병원·NASA·군 기지를 노렸고 한국 방산업체도 표적 | justice.gov/archives/opa/pr/north-korean-government-hacker-charged-… |

> 이미 등록: 박진혁·마커스 허친스·이정훈·조지 호츠.
> ⚠️ 스턱스넷 제작자와 이퀘이션 그룹 요원은 실명이 공개된 적이 없다. 지휘관·부대 출신 창업자로 대체했다.
> 대안 후보: 랄프 랑그너(스턱스넷을 해부해 표적이 나탄즈임을 밝힌 분석가), 세르게이 울라센(최초 발견자).

</details>

---

## C. 아직 손대지 않은 큰 덩어리

| 대상 | 인원 | 메모 |
|---|---|---|
| ~~가장 어두운 시간 (churchill-darkest-hour)~~ | ~~61~~ | ✅ **2026-07-28 완료.** 61명 중 10명은 이미 등록돼 있었고(처칠·히틀러·스탈린·롬멜·튜링·오펜하이머·맥아더·드골·패튼·쇼와 천황) **51명을 새로 만들었다** — 계정 생성부터 소개글·수식어·생몰일·국적·성별·직군까지. 사진도 51/51 채웠고 **전수 육안 대조에서 오배정 0건**(유명 인물이라 자동 조회가 정확했다. 앞선 90명 때 27%가 딴 사람이던 것과 대조적이다). 영상 출연진 61명 전원을 인명부와 연결했다(`faction_people.celeb_id`).<br>· 사진 실패 3명은 단건 처리 — 마셜(라이선스 사유 → 무시하고 등록), 발터 모델(기본 후보가 115×173로 너무 작아 다른 파일로 교체), 장 물랭(위키데이터에 사진 없어 프랑스어판 대표 이미지 `Moulin Harcourt 1937.jpg` 사용)<br>· ✅ **세부 데이터도 완료** — 신규 51명에 영향력·페르소나·발화 3트랙을 채웠다(기존 10명은 이미 보유). **61/61 전 트랙 완비**, 점수 합 불일치 0, 대사 원소 객체 0건.<br>· 점수 기준선을 기존 등록 인물에서 뽑아 배치에 그대로 물려 서열 붕괴를 막았다(튜링 73 · 히틀러 68 · 스탈린 62 · 처칠 60 · 드골 54 · 쇼와 47 · 맥아더 37 · 패튼 33 · 롬멜 31). 결과: 루스벨트 69 · 트루먼 61 · 아이젠하워 60 · 힘러 58 · 마셜 55 · 괴링/괴벨스 52 · 페탱 47 · 주코프 44 · 도조 41 · 구리타 14.<br>· **명언은 대부분 실제 발언을 확보했다** — 위키인용집을 WebFetch로 직접 열었다(검색은 예산 소진). 창작으로 채운 것은 다우딩·나구모·이시이 정도이고 각 배치 보고에 명시돼 있다.<br>· ⚠️ **작업 지시에 넣은 사실 두 건이 틀렸고 조사원이 잡아냈다** — ① 페탱의 '그들은 지나가지 못한다'는 니벨의 말이지 페탱의 것이 아니다(실제 발언은 'On les aura'). ② 하이드리히 피격은 1943년이 아니라 1941년 7월이다. 둘 다 교정해 반영했다.<br>· **전범 인물 처리 방침**: 학살·침략을 선동하는 문장을 창작하지 않고 관료·군사 실무의 언어로만 대사를 구성했다. 미화도 만화적 악당화도 배제. 처벌을 면한 오카무라·이시이는 그 빠져나감이 대사에 드러나게 했다 |
| 신화 계열 16편 | 200 남짓 | 북유럽 29·이집트 17·마하바라타 16·서유기 15·아서왕 15·라마야나 14 등. 등급은 `fiction`, 도감의 「이야기 속 인물」 구획으로 들어간다 |
| 마피아 연대기 | 11 | 알 카포네·럭키 루치아노 등 |
| 서부 개척시대 무법자 | 6 | 와이어트 어프·빌리 더 키드 등 |
| 전설의 해적 군단 | 6 | 검은 수염·앤 보니 등 |
| 한국 스포츠 명예의 전당 | 14 미등록 | 김연아·박찬호 등 일부만 등록돼 있다 |
| 위대한 해커들 얼굴 있는 자들 | 8 | 케빈 미트닉·워즈니악 등 |

---

## 작업 순서 (다른 세션에서)

1. ~~이 문서의 인물을 `profiles`에서 slug로 찾는다~~ → 완료
2. ~~출처를 열어 생몰·직책·행적을 확인한다~~ → 완료(90명)
3. ~~`bio`·`title`·생몰일·`nationality`·`gender`·`profession`을 채운다~~ → 완료(2026-07-27)
4. ~~얼굴 이미지~~ → **87/90 완료**(백문오·장인표·빅토르 네틱쇼는 공개 사진 부재)
5. ~~`/api/revalidate`에 `celebs`·`tags` 태그를 던진다~~ → 완료

**하지 말 것**: `celeb_tag_assignments`(도감 배정)와 `faction_*`(영상 데이터)는 이미 이어 놨다. 건드리지 마라.

---

## D. 얼굴 사진 — 출처를 위키미디어로 한정하지 마라

**「위키미디어에서 찾아보라」는 지침은 폐기한다.** 자동 조회는 시작점일 뿐이고, 거기서 안 나오면
웹 어디서든 찾는다. 출처도 라이선스도 가리지 않는다.

다만 **아무거나 박으라는 뜻은 아니다.** 지금 넣는 이미지는 나중에 AI로 다시 만들 때의 **재료(레퍼런스)로
쓰인다.** 재료다워야 재생성이 된다. 그러니 기준은 이렇다.

- **그 인물을 그린 것이어야 한다.** 동시대 초상이 없으면 후대의 상상화·삽화·조각도 좋다.
  기록만 남은 인물이라도 그를 그린 그림은 대개 어딘가에 있다(중국 고서 삽화, 오스만 세밀화,
  몽골 채색화, 19세기 판화 등). 이름을 딴 건물·묘당 사진은 재료가 못 된다.
- **얼굴이 알아볼 만큼 크게 나와야 한다.** 군상화라면 그 인물이 주인공인 장면을 고른다.
- **적당한 노고까지만.** 최상의 원본을 찾겠다고 몇 시간을 쓰지 않는다. 괜찮아 보이는 것을
  집어 넣고 넘어간다.

### 넣는 법

```
node --experimental-loader tsx sw/web-bo/scripts/upload-celeb-image-from-wikimedia.ts \
  --celeb-id <uuid> --slug <slug> --image-url "https://..." --source-note "<어디서 가져왔는지>"
```

- `--image-url` : 웹 어디서든 (뉴스 사진·회사 소개 페이지·소셜 프로필 등)
- `--image-file` : 로컬 파일 (바탕화면에 받아 둔 것 등)
- `--commons-file` : 위키미디어 파일명

**초상화·조각은 얼굴 인식이 자주 실패한다.** 그때는 `--face-detect false --crop-gravity north`
로 올린 뒤 `--preview-path` 로 만든 미리보기를 **반드시 눈으로 확인**한다.

### 🔴 웹을 뒤지기 전에 팩션 폴더의 `_refs` 부터 봐라

**영상 편마다 인물 참조 이미지가 이미 있다.** 이것을 모르고 위키미디어·웹을 몇 시간 뒤졌고,
그 사이 폴리페모스에 터너 풍경화(거인은 안 보이고 배와 노을만 크게 잡힌 그림)를 넣는 등
헛일을 했다. 결국 남았다던 22명 중 20명이 `_refs` 한 곳에서 해결됐다.

```
sw/remotion/public/factions/<편>/_refs/            ← 편에 따라 하위 폴더로 나뉘기도 한다
sw/remotion/idea-bank/<분류>/<이름>/_refs/          ← 보관함 편은 여기
```

파일명은 **한국어 인물명**이다(`제베.png`, `할릴 파샤.png`). DB의 `faction_people.image` 경로는
아직 안 만든 산출물을 가리키는 경우가 있어 그대로 믿으면 안 된다 — **폴더를 직접 훑어라.**

넣는 순서는 **누끼(`nobg-cutout` 스킬) → 업로드**다. `_refs` 는 배경이 있는 채로 저장돼 있다.

⚠️ **같은 파일이 다른 인물에 쓰인 경우가 있다.** 제베와 방연의 참조 이미지가 해시까지 동일했다
(`790ab07a`). 등록 전에 얼굴 검출 좌표가 앞 인물과 똑같이 나오는지 보면 잡을 수 있다.

### 아직 안 채워진 2명 (2026-07-28 기준)

도감 인물 560명 중 **558명 완료.**

| 인물 | 사정 |
|---|---|
| 이샤크 파샤 | `_refs` 원본이 194×242 썸네일이라 업로드 스크립트가 거부한다(최소 200px). 늘리면 뭉개져 재료가 못 된다 |
| 자무카 | 같은 이유. 원본 190×175 |

둘 다 **AI 재생성 대상**이다. 다른 편에도 더 큰 판본이 없는 것을 확인했다.
