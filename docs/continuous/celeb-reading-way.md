# 독서 방식 이어하기

작성·대조·번역·저장·공개·책장 보완과 계정 운용은 [독서 방식 룰북](../project/celeb/celeb-05-02-reading-way.md)이 쥔다. Gemini에 보내는 규칙은 그 문서의 `<!-- argon -->` 구간만 쓴다. 이 문서는 다음 작업자가 이어 갈 대상만 둔다.

## 현재 상태

- 26.11.23 신규 조사를 일단 마무리했다(사용자 지시). 본문 또는 조사 미달을 저장한 인물은 같은 날 공개까지 마쳤다.
- 다음 대상은 현재 DB로 고른다. 과거 명단·계정 번호·한도 시각이나 삭제된 임시 작업 폴더를 재개 입력으로 쓰지 않는다.
  - 미조사: `celeb_reality`가 `REAL`·`BOTH`이고 `reading_way IS NULL`인 인물.
  - 순서: 룰북 「1-2. 발송」의 우선순위.
- 블로그 쪽은 `D:/feelandnote/blog-assets/naver-blog/posts.json`의 `readingWay.sourceHash`와 현재 DB 본문의 UTF-8 SHA-256을 비교해 고칠 글을 고른다.

## 재조사 대상

맡을 때 DB 값이 여전히 NULL인지 확인하고, 조사부터 새 대화로 다시 한다. 끝나면 줄을 지운다.

### 조사 칸이 답하지 못한 인물

일시 오류(「An error occurred」·빈 답·시간 초과)가 거듭됐다. 근거가 없다는 판정이 아니다.

- `jeong-so-young` `laurence-olivier` `karl-malden` `ko-young-bae` `paul-kim` `zior-park` `moon-chae-won`

### 원고를 받았으나 근거를 확인하지 못한 인물

원고는 폐기했다. 다시 조사할 때 아래 사정을 피할 출처를 먼저 찾는다.

- `dirk-bogarde`: 출처 대부분이 dirkbogarde.co.uk로 401·403 접근 차단이었다.
- `jung-woo-sung`: 독서 근거가 책 띠지 글 두 건뿐이었고, 그중 한 건은 원문을 확인하지 못했다.
- `kim-hae-sook`: 원고가 데뷔·대본 읽기·SNS 이야기뿐이고 책 독서 근거가 없었다. 다른 출처가 없으면 조사 미달로 확정한다.
- `kim-so-hyun-2` `shin-sang-ok` `yelo`: Neon 원문 묶음과 Carbon 조사가 모두 근거 없음이었다. 웹 검색이 정상인 때 한 번 더 확인하고, 그래도 없으면 조사 미달로 확정한다.
- `aman-madaan`: 참조가 굿리즈 리뷰(로그인 필요)뿐이고, 홈페이지·인터뷰에도 공개된 독서 발언이 없었다. 조사 미달로 확정할 대상이다.

### 조사 미달로 저장한 인물

26.11.23에 확정했다. 판정 기준은 룰북 「4-2. 조사 미달」이다. 사용자가 재조사를 지시할 때 다시 연다.

- 책 독서 근거 없음, 책장 없음: `hanjin` `eun-hwi` `cha-seung-won` `yoo-young-jae` `son-dong-pyo` `dohoon` `oh-sung-jun` `yuha` `ji-su-yeon` `seo-yu-ri` `son-yeon-jae` `yonghoon` `shin-ye-chan` `richard-widmark` `ryan-o'neal` `park-hyo-shin` `kim-ji-mee` `im-chang-jung` `fred-astaire` `edward-g.-robinson`
- 근거가 원문을 열 수 없는 출처뿐: `jean-marais` `shelley-winters`(인터넷 아카이브 자서전 스캔), `deborah-kerr`(전문 무단 게재본·잡지 스캔 이미지)
- 원고가 독서 아닌 이야기뿐: `baek-yoon-sik`(시나리오 읽기), `jon-voight`(연기 수업·대본), `jukjae`(책장 두 권도 출판사 소개 글)
- 이전 판정: `jang-yoon-jeong`

## 재작성 때 쓸 원출처

본문은 저장돼 있다. 그 인물의 글을 고칠 때 아래 출처로 다시 대조한다.

- `patrick-o'shaughnessy`: 2016 독서법 트윗 스레드, David Senra 팟캐스트 녹취(rosetta.to, 우파니샤드 일화). 2014 블로그 주소는 도박 광고 사이트로 넘어가 쓸 수 없다.
- `moon-jae-in`: 한겨레 2023 김언호 대담 https://www.hani.co.kr/arti/politics/politics_general/1075786.html (누나 교과서·보수동 헌책방·『전환시대의 논리』·활자 중독). 『대통령의 독서』는 신동호의 책이고 문재인은 추천만 했다.
- `park-tae-woong`: 알라딘 이벤트 페이지의 본인 글 「박태웅의 말」(유년~AI 시기 독서 이력)과 추천 30권 한 줄 평.
- `tom-bilyeu`: 2020-01-29 트윗 「The best books I read in 2019」(『Can't Hurt Me』 1번, 『The Blank Slate』 4번).
- 사유 기록 없이 재작성 후보로 남은 인물: `jung-seung-je` `han-dong-hoon` `hwang-kyo-ahn` `huh-young-man` `na-kyung-won` `duke-of-wellington` `richard-dawkins` `martin-luther`. 현재 본문과 원출처를 대조해 필요한지부터 가린다.

## 책장 대기

### 본문에 나왔으나 책장에 없는 책

- 후보는 [body-gap.mjs](../../scripts/browser/reading-way-web/body-gap.mjs)로 다시 뽑는다. 기계 후보 수를 누락 수로 읽지 않는다.
  - 『』와 《》를 둘 다 잡는다. 「사진을 올렸다」처럼 읽기 동사가 없는 문맥은 `--reading`에서 빠지므로 전체 목록도 본다.
  - 오탐: 번역 제목이 책장 한국어판 제목과 다른 경우(『타이탄』=『부의 제국 록펠러』), 책장에 영문 제목만 있는 경우, 괄호 부제·쉼표 차이, 옛 제목(『암굴왕』=『몬테크리스토 백작』).
  - 인물 이름만 거론한 책과 남이 읽은 책은 뺀다. 원출처에서 본인의 독서를 확인한 책만 넣는다.
- 처리 순서는 블로그 대기열 인물 → 공개 글 인물 → 나머지다.
- `lee-myeong-hyeon`: 『과학자처럼 사고하기』 감상 근거를 확인한다(pressian 68345). 문더스트는 본인 번역서, 필사노트는 본인 저서라 대상이 아니다.
- `herbert-von-karajan`: 브라운 『Is yoga for you?』(1938, 호이서만 대담)는 대담 원문을 찾지 못해 미등록이다. 자서전(엔들러 구술)에는 이 대목이 없다.

### 책 등록이 남은 인물

본문은 저장했으나 본문에 나온 책의 감상 등록을 끝내지 않았다. 룰북 「5. 책장 보완」으로 처리한다.

- `ichiro-suzuki` `lee-hoe-yeong` `rebecca-ferguson` `sung-uk-moon`
- `frank-sinatra`: 뮈르달 『An American Dilemma』(1944). 한국어판이 없어 OpenLibrary 원서 판으로 등록한다. 근거는 FT 2015-12-11 캐플런 평전 서평(「From pulp novels he graduated to weightier fare」).

### 책장 확인 후보

착수할 때 현재 책장과 원출처를 다시 확인하고 이미 반영된 작품은 뺀다.

- 닐 디그래스 타이슨: NYT 2013 「By the Book」의 버트런드 러셀 소책자 4권.
- 댄 브라운: 해당 인터뷰의 추가 도서 6권(`Moonwalking with Einstein` 등).
- 마리사 메이어: Paul Johnson의 `Churchill`, IEEE Spectrum 2012 인터뷰.
- 에밋 시어: 2023-08-26 「7 books to know me」 트윗과 추가 트윗.
- 실베스터 스탤론: `Gödel, Escher, Bach`·`Revolt of the Angels`, Interview 1985-09.
- 마거릿 대처: 더글러스 리드 『Insanity Fair』. 자서전 『The Path to Power』 2장에 "made a deep impression on me"로 확인했다. OpenLibrary `/works/OL1162898W`로 연결한다.
- 윤서인: 『신의 탑』 1권(9791190153171). 유튜브 `Ea3wowN52gw` 자막에서 감상 대목을 다시 확인한 뒤 등록한다.
- 살라딘: 우사마 이븐 문키드 『디완』. 근거가 아랍어 위키뿐이다. 비위키 원출처를 찾지 못하면 본문의 「즐겨 읽었다」를 확인된 범위로 고친다.
- 원출처 미확보: 인드라 누이 트윗 4건, 젠슨 황의 `Zero to One`(Milken 2025 녹취록), 마이클 잭슨의 기존 `Life of P. T. Barnum` 관계, 아리아나 허핑턴의 재큐레이션 출처.
- 키라 나이틀리: 마사 겔혼의 다하우 취재 글은 원출처 대목과 수록집을 확정하지 못해 추가하지 않았다.
- 닥터 수스: 기존 에드워드 리어 『넌센스 노래』 관계의 출처가 리어 본인의 브리태니커 항목이다. 수스의 독서 근거가 없어 관계를 지울지 사용자 확인이 필요하다.

## 배움의 태도 소재

감상 기록이 부실한 인물에게만 붙일 배움 일화를 모은다(규칙은 룰북 「1-4. 근거가 얇은 인물」). 출처를 확인한 일화만 적고, 그 인물의 독서 방식을 저장하면 줄을 지운다.

| 인물 | 일화 | 출처 | 상태 |
|---|---|---|---|
| `ingvar-kamprad` | 난독증으로 상품 번호 대신 낱말 이름을 붙임, 이케아 창업 무렵 상업학교 재학 | 위키백과(IKEA) | 소재 확보 |
| `natwarlal` | 상업학사 과정·증권 중개에서 은행 규정을 익혀 위조와 엮어 사기에 씀 | 위키백과 | 소재 확보 |
| `jeanne-de-la-motte` | 계보 확인으로 기숙학교 교육, 런던에서 거짓 회고록 출간 | 위키백과(영·프) | 소재 확보 |
| `joey-wong` | 중학생 때 공부 부담을 피하려 전학 | 중문 위키백과 | 소재 확보 |
| `floyd-mayweather-jr` | 아버지·삼촌에게 배운 방어 기술, 트레이너를 아버지에서 삼촌으로 바꿈 | 위키백과 | 소재 확보 |
| `steven-seagal` | 우에시바 제자라는 주장은 사실과 어긋남, 처가 도장에서 검은띠를 따고 도장 운영 | 위키백과 | 소재 확보 |
| `luis-miguel` | 초등 5학년 뒤 가정교사 교육, 독학 소믈리에, 4개 언어 | 위키백과 | 소재 확보 |
| `nancy-carroll` | 순수미술 5년 뒤 LAMDA, 모교 연설의 '배우고 부딪혀 보는 즐거움' | 앨린스 스쿨 소식 | 소재 확보 |
| `alida-valli` | 15세에 국립영화실험센터 입학, 상대 배우의 언어로 대사 촬영 | 위키백과 | 소재 확보 |
| `spencer-locke` | 연기 학교, 모션 캡처 경험을 그린스크린 훈련으로 여김 | IGN 2006 | 소재 확보 |
| `jang-yoon-jeong` | 연습생 4년, 후배에게 선배·선생님 노래를 공부하라고 조언 | 뉴스엔 201006151553031001 | 소재 확보 |
| `jean-claude-van-damme` | 가라테 수련 중 16세부터 5년간 발레를 배움 | 위키백과 | 소재 확보 |
| `pom-klementieff` | 법학을 접고 쿠르 플로랑, 「30 록」으로 영어 습득 | 위키백과 | 소재 확보 |
| `denise-richards` | 말이 어려운 딸과 소통하려 수어를 배움 | 위키백과 | 소재 확보 |
| `celine-dion` | 학교를 싫어하고 형제자매에게 배움, 영어를 익혀 영어권 진출 | 위키백과 | 소재 확보 |
| `norman-reedus` | 연기 교육 없이 무대에 섬, 「플로팅」에서 연기가 예술임을 깨달음 | Daily Actor(Metro 인터뷰) | 소재 확보 |
| `gerard-butler` | 법대 법학회장에서 해고된 수습 변호사, 팬텀 역을 위해 곧바로 노래를 배움 | 위키백과 | 소재 확보 |
| `mohammed-bin-salman` | 법학 차석 졸업, 손자·처칠의 책을 즐겨 읽음 | 아랍뉴스 | 소재 확보 |
| `ken-rhee` | 고려대 교환학생, 학사장교 시험을 위해 6개월 국어·국사 특별과외 | 문화일보 11204126 | 소재 확보 |

확인·반영·검증이 끝난 항목은 이 문서에서 지운다. 완료 이력이나 원고 사본은 쌓지 않는다.
