# 독서 방식 이어하기

작성·수정·계정 운용과 단독 실행은 [독서 방식 룰북](../project/celeb/celeb-05-02-reading-way.md)이 쥔다. Gemini에 보내는 규칙은 그 문서의 `<!-- argon -->` 구간만 쓴다.

## 현재 재개 지점

블로그 후보 인물을 웹 Gemini의 Carbon 높음으로 쓰고 있다(아래 「블로그 후보 인물 작성」). 26.11.11 오스틴 올레드는 Ultra 계정(u4) 대화 `2868b55dbd6acaf4`에서 생성 중이었고, 다음 차례는 아만 생어·정유정이다. 생성 중이던 대화는 같은 계정에서 열어 회수하고, 비어 있으면 새 대화로 다시 보낸다.

이건희·이어령·무스타파 술레이만은 26.11.07의 Argon 본문이 저장돼 있고 재작성이 남았다. 당시 작업 폴더의 미반영 원고는 한 컴퓨터의 임시 폴더에만 있으므로 재개 입력으로 쓰지 않는다. Carbon 새 대화에서 조사부터 다시 하고, 저장 때 착수 시점의 한영 값과 비교해 다른 세션 변경을 덮어쓰지 않는다.

과거에 맥락 수정을 지적해 다시 쓰게 한 인물은 이전 원고·지적을 보내지 않고 새 대화에서 조사부터 다시 한다. 국소 오류만 고친 건은 재작성에서 뺀다. 복구한 본문에 빠진 책이 있으면 감상 근거를 확인해 책장도 연결한다.

다음 대상은 현재 DB와 블로그 대장으로 선정한다. 과거 명단·계정 번호·한도 시각이나 삭제된 임시 작업 폴더를 재개 입력으로 쓰지 않는다. 블로그 쪽은 `D:/blog-assets/naver-blog/posts.json`의 `readingWay.sourceHash`와 현재 DB 본문의 UTF-8 SHA-256을 비교한다.

조사·본문 저장·블로그 반영은 본 세션이 직접 수행하고, 새로 필요한 작품·판본은 '대기 - 판본 (수령)' 세션에 인계한다.

## 실행 진입점

현행 본문·감상배경 작성은 룰북 「단독 실행 도구」의 웹채팅 경로([`scripts/browser/reading-way-web/`](../../scripts/browser/reading-way-web/))로 한다. 아래 러너는 집계·다음 대상 확인과 export 함수 제공에 쓴다.

저장소 루트에서 실행한다. 아래 계정 표기는 구문 예시이므로 현재 로그인 계정과 High 선택 가능 여부를 확인해 바꾼다.

```powershell
# 모델 호출 없이 현재 DB 집계와 다음 대상 선정
node --import tsx scripts/browser/reading-way-argon.mjs --summary
node --import tsx scripts/browser/reading-way-argon.mjs --limit 10

# 한국어 원고만 회수
node --import tsx scripts/browser/reading-way-argon.mjs --apply --collect-only --limit 10 --pool u0:0,u0:2

# 본문을 바꾸지 않는 별도 책장 조사
node --import tsx scripts/browser/reading-way-argon.mjs --apply --books-only --only TARGET_SLUG --pool u0:0
```

회수 뒤의 무료 웹채팅 번역·본문 저장·도서 메타 확인·감상 관계 삽입·기존 블로그 수정은 룰북의 「단독 실행 도구」를 따른다. `draft_ready`·`books_pending`은 회수 상태이며 DB 반영 완료가 아니다. 회수 전용 러너는 정상 종료하므로 실행자는 회수 뒤 검수·무료 번역·저장·블로그 반영을 이어서 처리하고 다음 인물로 넘어간다. 러너를 띄우거나 원고를 회수했다는 보고만 남기고 턴을 끝내지 않는다. 진행 화면의 실행점은 [브라우저 도구 README](../../scripts/browser/README.md)에 있다.

저장 단계가 `query returned no rows` 등으로 실패해도 글이 이미 저장됐을 수 있다. 다시 생성하기 전에 DB 값과 원고를 대조하고, 일치하면 캐시만 갱신한다.

`--books-only` 재실행이 첨부 단계에서 `Current input attachment missing`으로 멈춘 사례가 있다(26.11.06, 원고 회수는 같은 날 정상). 일시 장애인지 Gemini 화면 변경인지 가리지 못했다. 재현되면 첨부 단계를 먼저 고치고, 이 문단을 지운다.

응답이 「웹 검색 중」에서 멈추는 사례가 있다(26.11.07). 중지 버튼이 없고 새로고침하면 대화가 비어 있어 기다려도 나오지 않는다. 정상 응답은 2~5분이므로 8분을 넘으면 끊고 새 대화로 보낸다. 원문을 첨부한 재검수는 「새 웹 검색이 필요 없다」고 적으면 1~2분에 끝났다. 무료 번역기는 입력을 한 줄로 보내므로 영어 문단 구분이 사라질 수 있다. 저장 전에 한국어 문단 수와 대조한다.

러너는 한 명이라도 High 확인이 보류(`model_verification_pending`)되면 배치 전체를 멈춘다. 남은 인물은 따로 다시 보낸다. 새 대화 전체 검수와 단서 재조사는 CLI 옵션이 없어 러너의 `submit`·`collect`를 import해 쓴다. 본문이 있는 인물은 `--feedback`으로만 대상이 되고, 단서 파일은 본문이 빈 인물에게만 첨부된다.

맥락을 짚지 않는 전체 검수는 문장을 다듬을 뿐 근거 없는 주장을 거르지 못했다(26.11.08, 4건 모두). 근거 없는 대목이 그대로 남거나 오히려 늘었다. 저장 전에 문장 단위로 원출처를 대조한다.

## 블로그 후보 인물 작성 (26.11.10 착수)

네이버 신규 글 후보(`sw/web-bo/scripts/naver-blog/lib/roster-data.mjs`의 `buildRoster` 후보) 가운데 독서 방식이 빈 실존 인물을 후보 순번대로 쓴다. 착수 시점 1,020명이었다. 대상은 매번 `buildRoster`를 다시 계산해 현재 DB로 고른다. 발송·회수·저장은 룰북 「단독 실행 도구」의 웹채팅 경로를 따른다.

- 저장 37명: 김경일·네이선 램버트·라이언 홀리데이·강신주·이재명·마크 맨슨·이안 호가스·타일러 코웬·이명현·살만 루슈디·장대익·버지니아 울프(이상 Argon), 제임스 클리어·표창원·이광형·패트릭 벳데이비드·마빈 랴오·김경주·오강남·한홍구·잭 에드워즈·박노자·우종학·조너선 하이트·스튜어트 브랜드·김대식·정운찬·김찬호·첼시 프랭크·백낙청·스콧 애런슨·스콧 영·김윤식·톰 빌유·김동춘·라이언 셰이·이언 M. 뱅크스(이상 Carbon).
- Carbon 응답은 생성 끝에 "An error occurred"로 끝나는 일이 잦다(23회 중 약 8회). 정운찬은 출처표 요청까지 오류가 나 실행자가 참조 원문으로 확인한 대목만 남겼다.
- 26.11.11 u4에서 탭 두 개로 동시 발송해 보니 두 탭 모두 원고를 정상 회수했다. 오류율이 눈에 띄게 오르지 않는 한 두 탭으로 돌린다.
- Carbon도 출처 없는 문장을 낸다. 오강남은 26문장 중 17문장이 검색 요약에만 기대 실행자가 확인 원문만으로 다시 짰고, 벳데이비드는 레이 달리오의 제사를 본인 말로, 한홍구는 연재 꼭지 소개문을 본인 글로 옮겼다. 26.11.11 분량 상한을 목표가 아닌 선으로, 직접 인용을 핵심 서너 군데로 줄인 뒤에도 문단 첫 문장에 출처 없는 요약이 남는다.

### 다시 쓸 인물

빈 원고는 빈 값으로 저장하지 않았다. 끝나면 이 목록에서 지운다.

- `aman-madaan`: 참조가 굿리즈 리뷰(로그인 필요)뿐이라 Argon 원고가 비었다.
- `patrick-o'shaughnessy`: 출처표 20문장 중 17문장이 출처 없음(참조가 트윗뿐)이라 폐기했다. 블로그·Colossus 원출처를 직접 찾아 새 대화로 보낸다. 팟캐스트 진행자라 녹취 대조가 필요하다.
- `moon-jae-in`: 출처표 12문장 중 서울경제 대목만 확인했다. 평산책방 인사말·독서노트·『대통령의 독서』 인용은 미확인(psbooks·경향은 스크립트 렌더링).
- `cho-hae-joang`: Argon High 빈 원고(참조 경향신문 1건). 다른 원출처로 다시 보낸다.
- `park-tae-woong`: Carbon 원고가 325자·2문단의 근거 없는 일반론이었다. 참조가 알라딘 이벤트 1건뿐이라 다른 원출처가 필요하다.
- `byun-young-joo`: Carbon 원고 1,721자의 대부분이 유튜브 `3AvVqg9GgM4`·`Je042JvGPJY` 근거라 자막 대조가 필요하다(26.11.11 yt-dlp 429). 채널예스 21867·spinoza1677 822 원문과 일부 세부(춘향전·선데이서울 일화)가 맞지 않았다.
- 본문은 있으나 사유 기록 없이 재작성 후보로 남은 인물: `jung-seung-je` `han-dong-hoon` `hwang-kyo-ahn` `huh-young-man` `na-kyung-won` `duke-of-wellington` `richard-dawkins` `martin-luther`. 재작성 전에 현재 본문과 원출처를 대조해 필요한지부터 가린다.

### 본문에 나왔으나 책장에 없는 책

`--books-only` 또는 웹채팅 책장 보완 경로로 감상경위를 받아 반영하고, 끝난 줄은 지운다.

- `mark-manson`: 안티프래질(Antifragile, Taleb) · 인피니트 제스트(Infinite Jest, Wallace) — 본문 근거 markmanson.net/7-books, /5-massive-books
- `lee-jae-myung`: 암굴왕(몬테크리스토 백작) · 해저 2만리 · 태백산맥 — 근거 중앙일보 25341144, 시사저널 164833, 월간중앙 312832
- `ian-hogarth`: 안나 카레니나(Anna Karenina) — 근거 ianhogarth.com/blog/my-favourite-books-films-and-artists-of-2014 1위
- `tyler-cowen`: 숨겨진 우주(Warped Passages, Randall) · 지옥편(Inferno, Dante) · 아이네이스(Aeneid, Vergil) — 근거 MR 2005/10/what_ive_been_r, 2006/02/moby_dick_the_g
- `lee-myeong-hyeon`: 에덴의 용(The Dragons of Eden, Sagan) — 근거 theliverary.kr/article?id=1357 / 과학자처럼 사고하기 확인 필요(pressian 68345). 문더스트는 본인 번역서(집필 탭 후보), 필사노트는 본인 저서
- `salman-rushdie`: 거울 나라의 앨리스(Through the Looking-Glass) · 반지의 제왕(Lord of the Rings) — 근거 en.wikipedia Salman_Rushdie 인용(원출처 Rushdie 에세이 확인 필요). 젊은 예술가의 초상은 인용 언급뿐
- `james-clear`: The Tell-Tale Brain (명령하는 뇌, 착각하는 뇌), The Subtle Art of Not Giving a F*ck (신경 끄기의 기술)
- `lee-kwang-hyung`: Day of Empire (제국의 미래, 에이미 추아) — 출처 readingnews 12585 "이 책을 읽고 바뀌었다"
- `patrick-bet-david`: That Was Then, This Is Now · Of Mice and Men (18세까지 완독한 두 권) · Measure What Matters(OKR, 두 번 읽음) · The Ride of a Lifetime — 출처 Doing the Impossible PDF, readthistwice
- `kim-kyung-ju`: 장석남 『지금은 간신히 아무도 그립지 않을 무렵』 — 출처 dailytw 10649·dadoc 1493 (군 시절 제대까지 읽음)
- `oh-gang-nam`: 불트만 『신약성서와 신화』(New Testament and Mythology, 류동식 역) — 출처 aladin 작가 인터뷰 @28108 (본인은 제목을 '인가 하는'으로 불확실하게 기억)
- `jack-edwards`: The Hunger Games(헝거 게임, '지금까지 독서가로 남은 이유') — 출처 youtube Y_JEgBP2SmE. 산소 도둑의 일기는 80/150쪽 중단 고민(완독 미확인), 솔로몬의 노래는 미독
- `vladimir-tikhonov`: 호메로스 『오디세이아』(어린 시절 특히 좋아함) — 출처 ch.yes24 Article 14033
- `woo-jong-hak`: 전쟁과 평화 · 카라마조프가의 형제들 · 분노의 포도 · 침묵의 행성 밖에서(C. S. 루이스) · 그리스도교를 다시 묻다(더글러스 존 홀) — 출처 solarcosmos.tistory.com 671·681·1122
- `stewart-brand`: 노버트 위너 『사이버네틱스』(Cybernetics, 1968 브록먼과 밑줄 그으며 읽음) — 출처 edge.org Fred Turner
- `daeshik-kim`: The Hitchhiker's Guide to the Galaxy 1권(은하수를 여행하는 히치하이커를 위한 안내서, 고교 시절부터 탐독) — 출처 gknewson 762. 책장엔 2권(The Restaurant at the End of the Universe)만 있음
- `kim-chan-ho`: 김종삼 시집 『북 치는 소년』(대학 입학 후 처음 산 책) — 출처 hani 882388. 김우창 저서는 제목 미특정
- `kim-yun-sik`: 임화 『문학의 논리』(1940, 서재 창가 책꽂이에 두고 자주 들춰봄) — 출처 m-joongang 302602
- `tom-bilyeu`: The Gunslinger (Stephen King) — 근거: awesomeatyourjob 209 녹취 "the book that changed my life ... my dad convinced me"
- `kim-dong-chun`: 리영희 『전환시대의 논리』 — 근거: 한겨레 452409 "하늘이 무너지는 충격", 리영희재단 회고문(1977년 입학 후 읽음)
- `iain-m.-banks`: The Lord of the Rings (J. R. R. Tolkien) — 1969 구록 도서관 1·2권, 언윈 문고본으로 재독 — 근거: Science Fiction Eye 1990 인터뷰

## 책 등록이 남은 인물

아래 인물은 독서 방식 글을 저장했으나 글에 나온 책의 감상 콘텐츠 등록을 끝내지 않았다. `--books-only --only SLUG`로 조사하고 책장 반영기로 미리 본 뒤 반영한다. 작품에 판본 행이 있으면 같은 언어 행까지 맞춘다([콘텐츠 등록](../project/celeb/celeb-02-02-content-registration.md) 「영문판과 표지」). 끝난 인물은 이 목록에서 지운다.

`chow-yun-fat` `chris-hemsworth` `david-goggins` `ichiro-suzuki` `james-hetfield` `jeremy-renner` `kim-seung-youn` `lea-seydoux` `lee-hoe-yeong` `lisa-su` `mark-rothko` `pierce-brosnan` `rebecca-ferguson` `sung-uk-moon`

## 글과 책장 전수 대조 결과 (26.11.08)

독서 방식이 있는 424명의 본문을 두 갈래로 검증했다. 다시 돌리면 [reading-way-shelf-scan.mts](../../scripts/browser/reading-way-shelf-scan.mts)가 책장에 없는 후보를 낸다. 기계 후보 수를 누락 수로 읽지 않는다.

- **책장에 없는 책.** 후보 1,003건을 LLM이 문맥·책장으로 거르고 원문을 확인해 153건을 책장에 넣었다. 근거를 못 찾은 책은 깊게 재조사해 찾으면 등록하고, 끝내 없으면 본문에서 뺐다.
- **책장에 있는 책.** 본문 문장 1,228건을 그 책의 감상 콘텐츠와 대조하고, 어긋난 258건만 소스 링크로 확인했다. 틀린 쪽이 감상이면 감상을 고쳤다. 감상 콘텐츠가 있으면 이 대조가 웹 검색보다 싸고 정확하다.
- 본문은 모두 175명을 고쳤고 블로그 독서 방식 구획도 같은 값으로 교체했다.

- 주제 문장의 근거까지 무너진 10명은 Argon High로 새로 썼다. 원문 대조를 거쳐 7명을 저장했다. 판빙빙·궁리·조이 웡은 Argon이 근거 부족으로 빈 원고를 냈고 책장에도 감상 책이 없어 조사 미달로 저장했다. 같은 상태였던 `hans-zimmer` `lee-kun-hee`는 다른 세션이 맡았다.

## 기존에 남긴 책장 확인 후보

아래는 과거 문서에서 남긴 미확정 후보다. 착수할 때 현재 책장과 원출처를 다시 확인하고 이미 반영된 작품은 제외한다.

- 닐 디그래스 타이슨: NYT 2013 「By the Book」의 버트런드 러셀 소책자 4권.
- 댄 브라운: 해당 인터뷰의 추가 도서 6권(`Moonwalking with Einstein` 등).
- 마리사 메이어: Paul Johnson의 `Churchill`, IEEE Spectrum 2012 인터뷰.
- 에밋 시어: 2023-08-26 「7 books to know me」 트윗과 추가 트윗.
- 실베스터 스탤론: `Gödel, Escher, Bach`·`Revolt of the Angels`, Interview 1985-09.
- 원출처 미확보: 인드라 누이 트윗 4건, 젠슨 황의 `Zero to One`(Milken 2025 녹취록), 마이클 잭슨의 기존 `Life of P. T. Barnum` 관계.
- 키라 나이틀리: 마사 겔혼의 다하우 취재 글은 원출처 대목과 수록집을 확정하지 못해 추가하지 않았다.
- 아리아나 허핑턴: 기존 책장 재큐레이션 출처의 원출처 추적 후보.
- 마거릿 대처: 더글러스 리드 『Insanity Fair』. 자서전에 "made a deep impression on me"로 확인했다(『The Path to Power』 2장). Argon High 감상경위를 받아 OpenLibrary `/works/OL1162898W`로 연결한다.
- 살라딘: 우사마 이븐 문키드 『디완』. 근거가 아랍어 위키뿐이다. 비위키 원출처를 찾지 못하면 본문의 "즐겨 읽었다"를 확인된 범위로 고친다.
- 윤서인: 『신의 탑』 1권(9791190153171)의 저자를 `REVIEWED_MISSING_AUTHORS`에 보완했다. 유튜브 `Ea3wowN52gw` 자막에서 감상 대목을 다시 확인한 뒤 등록한다.
- 닥터 수스: 기존 에드워드 리어 『넌센스 노래』 관계의 출처가 리어 본인의 브리태니커 항목이다. 수스의 독서 근거가 없어 관계를 지울지 사용자 확인이 필요하다.

확인·반영·검증이 끝난 항목은 이 목록에서 제거한다. 완료 이력이나 원고 사본은 쌓지 않는다.
