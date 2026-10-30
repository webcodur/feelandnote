# 독서 방식 작업 인계

**2026-10-30 15:32 일단락(사용자 지시).** 러너와 감시기를 모두 멈췄다. 재개 전에 Gemini 화면을 한 번 열어 Google 확인 화면이 없는지 본다. DB 기준 수치는 `--summary`로 다시 조회한다.

**다섯 번째 묶음(26.10.30 11:28 선정 20명)의 진행 상태**
- 반영 완료 9명: stanley-kubrick·sylvester-stallone·ralph-fiennes·mike-tyson·jo-jung-rae는 본문 국소 수정 후 저장했다(조정래는 책 0권, 타이슨은 책장 5→12권). jean-claude-van-damme·hwang-young-cho·pom-klementieff·denise-richards는 조사 미달(빈 본문)로 저장했다.
- 미요청 11명: otto-von-bismarck, alex-karp, kim-seung-youn, daniela-amodei, takeda-shingen, rebecca-ferguson, daniel-ek, eiichiro-oda, haruki-murakami, ms-rachel, donnie-yen. 재개하면 `--collect-only --limit 20`이 위 두 명과 함께 우선순위대로 다시 고른다.

**재개 전에 알아 둘 변경(26.10.30, 커밋 전)**
- Argon 첨부는 세 룰북(`celeb-05-02`·`celeb-02-01`·`celeb-02-03`)의 `<!-- argon -->` 구간만 보낸다. 한 사람 요청이 약 2만 7천 자에서 약 1만 400자로 줄었다. 13:28 이전에 받은 원고는 통째 첨부로 쓴 것이다.
- 장시간 실행은 감시기(`scripts/browser/reading-way-watch-start.mjs`)로 띄운다. 사용법은 아래 항목과 룰북에 있다.
- 아마존 상품 페이지는 등록 값으로 쓰지 않지만 판본·신간 실재·추천사 확인에는 쓴다([등록 규칙](../project/celeb/celeb-02-02-content-registration.md#타입별-메타-원천)).

**남은 책장 일** (작업 폴더의 `pending-books.txt`가 임시 원본이다. 지워져도 아래로 재개할 수 있다)
- `--books-only`로 받을 책: neil-degrasse-tyson 버트런드 러셀 소책자 4권(NYT 2013 「By the Book」), dan-brown 같은 기사의 추가분(『Moonwalking with Einstein』 등 6권), marissa-mayer 『Churchill』(Paul Johnson, IEEE Spectrum 2012), emmett-shear 「7 books to know me」(2023-08-26 트윗)와 추가 트윗들, sylvester-stallone 『Gödel, Escher, Bach』·『Revolt of the Angels』(Interview 1985-09).
- 원출처를 못 읽은 항목: indra-nooyi 트윗 4건(웨이백 CDX 접속 실패), jensen-huang 『Zero to One』(Milken 2025 녹취록 PDF 미확보), michael-jackson 기존 관계 『Life of P. T. Barnum』(출처가 팬 블로그이고 출처마다 책이 달라 작품 미확정).

**운영 메모**
- 분량 상한(26.10.30 도입) 이전에 저장된 본문 중 상한을 넘던 69명은 `--shorten`으로 모두 줄여 저장했다(남은 대상 0명). 새 원고는 러너가 상한을 검사한다.
- 실행은 `node scripts/browser/reading-way-watch-start.mjs --rounds N -- <러너 인수>`로 감시기를 분리해 띄운다. 실행자는 `node scripts/browser/reading-way-watch.mjs --wait 1500`으로 기다렸다가, 검수 대기 원고는 대조 결과를 읽고 판단한 뒤 저장한다. 상태·기록은 `%TEMP%/feelandnote/reading-way-watch/`의 `status.json`·`watch.log`다. Kiro 셸 도구는 `--pool u0:2` 같은 인수를 서버 실행으로 오인해 막으므로, 감시기 시작은 백그라운드 프로세스 도구로 실행한다.
- Aside 메뉴의 「web」 프로필이 자동화가 쓰는 u0(webcodur@gmail.com)다. 확인 화면은 이미 열려 있던 탭에는 보이지 않을 수 있으므로, 사용자에게 그 프로필에서 새 탭으로 `gemini.google.com/u/<번호>/app`을 열어 확인을 통과해 달라고 요청한다. 26.10.30 15:00에 topstarpicks002 계정에서 한 번 통과하자 같은 프로필의 다른 계정도 함께 풀렸다. 감시기 격리 기록은 `status.json`의 `quarantine`·`flags`를 비우고 다시 띄운다.
- 26.10.30 07:57 Google 확인 화면(`google.com/sorry`)이 계정 4·1·2·0에 같은 식별값으로 떠 접속 단위로 막혔다. 같은 날 Aside 브라우저로 Google 검색을 수십 회 돌린 뒤였으므로, 원출처 검색은 `remote_web_search`·`web_fetch`를 먼저 쓰고 Aside Google 검색은 X 등 일반 검색이 닿지 않는 경우에만 쓴다. 축약본은 원래 본문에 없던 사실이 들어가지 않았는지 대조한 뒤 저장한다.
- 이미 책장에 있는 작품이 원고에 다시 나오면 삽입기가 거부한다. 원고의 감상배경이 더 정확하면 기존 관계 행의 `review`·`review_en`·`source_url`을 현재 행 비교 transaction으로 바꾸고(작업 폴더의 `setrev.mjs`), 새 작품만 계획에 넣는다.
- 별도 감사 후보: arianna-huffington 기존 책장의 재큐레이션 사이트 출처.

판본 선택·절판 표시·번역본 없음 같은 일상 판단은 실행자가 확인해 처리하고 보고 없이 다음 묶음으로 넘어간다. 사용자에게는 규칙으로 정할 수 없는 판단이나 예상 밖 문제만 알린다(26.10.29 사용자 지시).
작업 중 드러난 중복 작품·잘못된 판본 같은 데이터 이상은 실행자가 바로 고치고 보고하지 않는다. 새로 찾은 조사 기법은 그 회차 안에 [조사 룰북](../project/celeb/celeb-02-01-content-research.md) 「재큐레이션에서 원출처 추적」에 적는다(26.10.30 사용자 지시).

작성·수정·우선순위의 정본은 [독서 방식 룰북](../project/celeb/celeb-05-02-reading-way.md)이다. 실제 값은 서비스 DB에서 다시 조회한다.

앞선 블룸버그 작업은 독서 방식과 뉴욕타임스 2012년 기사에 근거한 리뷰 4건, [기존 네이버 글](https://blog.naver.com/dmx777/221799683610)의 교정까지 반영했다. 이것을 기존 책장 전체의 전수 감사 완료로 세지 않는다.

## 담당자가 처음 읽을 파일

작업 디렉터리는 `C:/project/feelandnote`다. 루트 `AGENTS.md`를 먼저 읽고, 아래 문서를 해당 단계에서 연다.

| 파일 | 확인할 내용 |
|---|---|
| [독서 방식 룰북](../project/celeb/celeb-05-02-reading-way.md) | 필드의 취지, Argon과 실행자의 역할, 수정 허용 범위, 조사 순서 |
| [Aside 스킬](../../.agents/skills/aside-browser/SKILL.md) | 실제 로그인 세션 제어, 계정별 연결, 첨부·다운로드·정리 |
| [콘텐츠 조사](../project/celeb/celeb-02-01-content-research.md) · [감상경위](../project/celeb/celeb-02-03-content-review.md) | 책을 실제 감상·추천했다는 근거와 책별 한영 글 |
| [콘텐츠 등록](../project/celeb/celeb-02-02-content-registration.md) · [콘텐츠 감사](../project/celeb/celeb-02-04-content-audit.md) · [작품·판본](../project/celeb/celeb-02-05-figure-books.md) | 기존 작품 재사용, 메타·언어·표지, 기존 데이터 교정과 보존 |
| [데이터 관리](../project/data/README.md) | 현재 DB 조회, UTF-8 SQL 전달, 임시 자료 폐기 |
| [Argon 러너](../../scripts/browser/reading-way-argon.mjs) | `submit`·`collect`·`save`·`revalidate`·`database`, 실제 CLI 옵션 |
| [책장 반영기](../../scripts/browser/reading-way-books-apply.mjs) | `validatePlan`·`resolveBook`·`applyPlan`, 원본 기반 새 관계 삽입 |

## 역할과 조사 대상

웹 Gemini **Argon, Pro 이상 계정, 사고 수준 High**가 조사·분석·한국어 작성·최종 수정·영문 번역을 모두 맡는다. 실행자는 인물 식별 정보, 룰북, 최소한의 출처 링크를 전달한다. 김윤환의 「책과 사람」에 해당 인물이 있으면 그 기사 링크를 우선 쓴다. 초기 발주에 실행자가 고른 사실 목록·완성 문장·문단 구성안을 얹지 않는다.

실행자는 결과를 **사실 확인 목적으로** 읽는다. 문체·비유·해석을 취향으로 평가해 고치거나, 내용을 축약·윤문하지 않는다. 플랫폼의 인물 분석과 해석은 허용된다. 확인되지 않은 발언·내면·인과관계를 사실로 썼는지는 출처로 검증한다. 본문이 독서 방식인지, 책별 리뷰를 모은 연표인지에 대한 작성 기준도 룰북을 Argon에게 전달해 적용한다.

단순 연도·이름·대명사·링크 등의 사실 오류는 근거를 확인하고 국소 수정한다. 잘못 조사한 사실을 바로잡으면 글의 맥락까지 바뀌는 경우에만 오류와 실제 출처를 Argon에게 보내 다시 받는다. 스타일 문제를 사실 오류처럼 포장해 돌려보내지 않는다.

대상은 `celeb_reality IN ('REAL','BOTH')`이며 `FICTION`은 제외한다. 우선순위는 **네이버 게시 → 서비스 조회수 → 네이버 예약 → 영향력 → 나머지**다. 러너가 현재 블로그 기록과 DB로 선정한다. 약 20명씩 조사하며 미완료 책장 검증을 마친 뒤 다음 묶음으로 간다.

`celebs.reading_way`·`reading_way_en`의 두 빈 문자열은 실제 조사 후 Argon이 미달로 판정한 경우다. NULL은 미조사이며, 사실 오류 원고의 노출을 보류한 작업 상태도 NULL로 남길 수 있다. 한도·접속 실패·검색 도구 부재·모델 거절은 조사 미달이 아니다. 일반 배치는 이미 미달인 인물을 다시 고르지 않으며, 명시적 재조사 지시가 있어야 `--retry-insufficient`를 쓴다.

## Gemini 계정과 연결

1. `aside account list`로 현재 브라우저 프로필을 보고, 선택한 프로필에서 `googleAccounts.list()`로 로그인된 Google 계정을 확인한다. 예전 계정 번호·구독·초기화 시각을 현재 상태로 간주하지 않는다. 비밀값은 문서나 로그에 복사하지 않는다.
2. Aside 프로필 `u0`와 Gemini URL의 `/u/2/`는 다른 번호다. `--pool u0:2`는 Aside 프로필 u0 안의 Google 계정 2를 뜻한다. URL과 화면의 실제 계정을 대조한다.
3. 전체 동시 작업은 별도 `AsideClient`·MCP 연결 **두 개까지**다. 각 연결이 자신의 Page 핸들·대화 URL·실제 REPL `pwd`·첨부·다운로드를 보유한다. 같은 client의 `callRepl()`은 직렬 처리되므로 `Promise.all()`만 붙여 병렬화하지 않는다. 서로 다른 러너를 띄웠어도 전체 두 연결 한도와 계정 중복 배정을 확인한다.
4. 전송 직전에 실제 Argon·Pro·High와 첨부 완료를 확인한다. 인물이 바뀌면 새 대화, 같은 인물의 사실 교정·응답 회수는 기존 대화 URL을 쓴다. 러너의 `ensureArgonHigh`가 이를 검사한다.
5. 한 계정의 한도는 그 작업에만 적용한다. 다른 계정의 회수·저장은 계속한다. 초기화 시각은 실제 한도 문구에 있을 때만 기록한다. 구독 종료·로그인 필요와 구분하고, Google의 비정상 트래픽·본인 확인 화면이면 자동 계정 순환을 중단한다. 다른 모델로 대체하지 않는다.

Aside는 유료 자연어 `exec`가 아닌 REPL을 쓴다. 기존 [AsideClient](../../.agents/skills/aside-browser/scripts/aside-client.mjs)를 생성하고 `await client.ready`로 기다린다. 반복 제어는 연결을 유지하며, 계정·연결을 바꾸면 새 `pwd`에 입력 파일을 다시 준비한다.

## 호출 명령과 결과 회수

아래 명령은 저장소 루트에서 실행한다. 계정 풀과 대상 slug는 **실제 확인한 값으로 바꾼다**. `u0:0,u0:2`는 구문 예시이며 현재 사용 가능 계정이라는 뜻이 아니다.

```powershell
# DB 현황만 조회. 모델을 호출하지 않는다.
node --import tsx scripts/browser/reading-way-argon.mjs --summary

# 새 본문·책 자료를 회수하고, 사실 검수 전에는 DB에 노출하지 않는다.
node --import tsx scripts/browser/reading-way-argon.mjs --apply --collect-only --only TARGET_SLUG --pool u0:0,u0:2

# 남은 책 검증을 끝낸 뒤 우선순위에 따른 다음 20명의 원고·책 자료를 회수한다.
node --import tsx scripts/browser/reading-way-argon.mjs --apply --collect-only --limit 20 --pool u0:0,u0:2

# 기존 본문은 유지하고 지정한 인물의 책 자료만 받는다.
node --import tsx scripts/browser/reading-way-argon.mjs --apply --books-only --only TARGET_SLUG --pool u0:0,u0:2

# 현재 우선순위의 다음 20명 선택만 확인한다. 호출·저장은 하지 않는다.
node --import tsx scripts/browser/reading-way-argon.mjs --limit 20
```

`--apply`가 없으면 대상 선정 후 끝난다. **일반 `--apply`는 본문을 바로 저장하지만 `--apply --collect-only`는 회수만 한다.** 새 원고·사실 오류 재작성은 후자를 기본으로 쓴다. `--collect-only`와 `--books-only`·`--continuous`는 함께 쓸 수 없고, `--books-only`는 `--only`가 필요하다. 일반 발행 경로의 `--book-research`는 본문 저장과 책 자료 회수를 함께 수행하므로 검수 전 회수 모드와 혼동하지 않는다.

사실 교정은 `%TEMP%/feelandnote/<자기 작업 폴더>/facts.txt`에 실제 오류·근거 URL만 쓰고 전달한다. 책 범위를 한두 권으로 좁힐 때도 이 파일에 대상 작품과 확인할 사실을 명시한다.

```powershell
node --import tsx scripts/browser/reading-way-argon.mjs --apply --collect-only --only TARGET_SLUG --pool u0:0,u0:2 --feedback 'TARGET_SLUG=C:/ABSOLUTE/facts.txt'

# 실제 기존 대화와 같은 프로필·Google 계정으로 재개한다.
node --import tsx scripts/browser/reading-way-argon.mjs --apply --books-only --only TARGET_SLUG --pool u0:2 --resume 'TARGET_SLUG=https://gemini.google.com/u/2/app/ACTUAL_CHAT_ID?hl=ko' --feedback 'TARGET_SLUG=C:/ABSOLUTE/facts.txt'
```

러너가 룰북과 발주문을 파일로 첨부하며, 인물별 식별 정보와 출처를 함께 보낸다. 별도 UI 교정 안내를 `fill()`로 넣을 때는 짧은 안내의 줄바꿈을 공백으로 정규화한다. Gemini가 여러 문단에 빈 줄을 덧붙여 입력 일치 검증이 실패한 사례가 있다. 긴 내용을 직접 타이핑하는 대신 파일로 첨부한다.

인수할 JSON은 다음 모양이다. 책만 받을 때는 최상위 `ko`·`en`을 만들지 않는다.

```json
{
  "slug": "TARGET_SLUG",
  "ko": "최종 한국어 독서 방식",
  "en": "같은 사실의 최종 영어 본문",
  "books": [{
    "title_ko": "한국어 작품명", "title_en": "영문 작품명",
    "author_ko": "원저자", "author_en": "Original author",
    "source_url": "https://실제-감상-근거",
    "source_urls": ["https://추가-근거"],
    "evidence": "감상 관계를 확인한 조사 내용",
    "review_ko": "이 인물의 책별 한국어 감상배경",
    "review_en": "같은 감상배경의 영어 본문"
  }],
  "unresolved": []
}
```

완료는 해당 요청 뒤의 응답으로 확인한다. 새 사용자 메시지 접수, 응답 순서·인물, 생성 중지 버튼·검색 진행 상태, JSON 완결성을 함께 본다. `/app/<id>` 주소가 늦게 생길 수 있으므로 `page.evaluate(() => location.href)`로 실제 주소를 읽는다. URL 지연·관측 타임아웃만으로 다시 전송하지 않는다. 완료된 응답의 회수 오류는 같은 대화에서 해결한다.

러너는 화면의 현재 응답과 다운로드 본문을 대조하고 원본 SHA-256을 남긴다. 진행 로그의 `books_pending.output`·`sha256`·`url`이 회수 원본을 찾는 단서다. 다른 탭의 파일이 섞인 다운로드는 새 생성 대신 기존 완료 응답에서 재회수한다. 원본 JSON을 편집하거나 긴 본문을 상위 대화에 반복 출력하지 않는다.

## 사실 검수와 본문 등록

기계 검사는 인물·형식·해시·동시 변경을 확인한다. 감상 근거와 사실관계는 실행자가 원출처 본문을 읽고 판단한다. HTTP 200, 검색 스니펫, 모델의 `evidence`만으로 검수 완료라고 하지 않는다. 실제 화자가 누구인지, 그 사람이 해당 작품을 읽거나 추천했는지, 연도와 판본 범위가 맞는지 확인한다.

Argon 원고에서 반복해 나온 오류다. 원문과 대조할 때 이 유형부터 본다(26.10.29 두 번째 묶음).

| 유형 | 실제 사례 |
|---|---|
| 출처 없는 독서법 일반론 | "에세이를 쓰듯 자료를 읽는다"(블란쳇), "빈곤 연구서를 읽을 때 저자의 시각을 눈여겨본다"(유누스). 본인 발언을 찾지 못하면 문장째 뺀다 |
| 날짜·장면 이동 | 워싱턴의 『돈키호테』 구입을 5월 정족수 대기 중으로 옮김(실제 9월 17일), "2024년 인터뷰"(실제 2023년 10월) |
| 머뭇거린 말을 단정 | "이 책도 에단 호크가 준 것 같다"를 "그 상자에서 꺼낸 책"으로(팰트로) |
| 질문자의 말을 인물에게 | 『트라이시클』 기자가 꺼낸 로종 경구를 브리지스가 인용했다고 씀 |
| 숫자·고유명사 바꿈 | 할인 매대 "50센트~1달러"를 25센트로(타이슨), 셰드린을 체르니솁스키로(마르크스), 『자본론』에 없는 『고리오 영감』 |
| 두 출처를 이어 붙인 인과 | 『사피엔스』 독서를 『기억 전달자』의 경고와 연결(브리지스). 본인이 잇지 않았으면 뺀다 |
| 다른 언어 낱말 섞임 | 영문 본문의 인도네시아어 "ratusan" |
| 축하·언급을 추천으로 | 친구 출간을 축하한 트윗을 『The Charisma Myth』 추천으로(마이어). 원문 전체를 읽고 감상·추천인지 본다 |
| 같은 제목의 다른 저자 책 | 21세기북스 2005 『미래를 경영하라』(톰 피터스)를 드러커 책으로(공병호). 국내판 출판사·연도로 원서를 대조한다 |
| 출처 목록과 다른 책 | 파이브북스 다섯 권에 없는 『죽음의 부정』을 넣고 『Elia Kazan』을 뺌(우디 앨런). 큐레이션 목록은 원문 목록과 한 권씩 맞춘다 |
| 본인 서술과 반대 | "책을 거의 안 읽었다"고 썼으나 자서전 서문은 "I've always been an avid book reader"(셰이) |
| 색 표시·굵게 표시 오독 | 2005년 목록의 녹색 책을 주황색 「각별한 책」으로(호프먼). 표시는 원문 HTML의 실제 색·굵기로 확인한다 |

관계 판정은 [콘텐츠 조사](../project/celeb/celeb-02-01-content-research.md)를 다시 확인한다. 이번 묶음에서 실행자가 처음에 잘못 뺐다가 바로잡은 기준은 다음과 같다. 책 추천사는 「추천사를 썼다」로 채택한다. 직접 산 책이나 "다음에 읽겠다"고 밝힌 책은 읽을 의사로 채택하고, 아직 읽지 않았다는 사실을 감상배경에 쓴다. 『잠언』처럼 범위를 특정한 경전은 성경 전체와 별도 작품으로 둔다. 그림책 제외는 [작품·판본](../project/celeb/celeb-02-05-figure-books.md) 기준을 따른다. 같은 저자의 다른 책을 언급했다는 사실만으로는 그 책을 읽었다고 보지 않는다.

Argon이 "현재 환경에서 검색 도구가 비활성화되어" 같은 사유를 `unresolved`에 남기면 그 원고는 원문 없이 기억으로 쓴 것이다. 러너는 이 응답을 저장하거나 조사 미달로 처리하지 않는다. `research_unavailable` 이벤트를 남기고 그 계정을 한 시간 쉬게 한 뒤, 다른 계정의 새 대화로 두 번까지 다시 받는다. 사유를 남기지 않고 기억으로 쓴 원고는 코드가 잡지 못하므로 위 표대로 대조한다.

단순 사실 수정은 원본을 보존한 채 적용할 부분만 명시한다. 맥락을 바꾸는 오류는 `--feedback`으로 Argon에 돌려보내 최종 원고를 다시 받는다. 사실 오류 원고의 노출 보류가 필요하면 현재값을 비교하는 transaction으로 두 본문을 NULL 처리한다. `save()`는 문자열 본문용이라 NULL 보류에 그대로 쓸 수 없다. 접속 실패를 미달 빈 문자열로 저장하지 않는다.

검수한 `--collect-only` 원고는 러너가 export하는 `save(person, result, work)`와 `revalidate(person)`로 저장한다. 별도 본문 등록 CLI는 없다. 다음은 일회성 실행 파일의 기본 형태다. 원본 경로와 회수 시 기록한 SHA-256을 인수로 받으며, 사실 검수를 끝낸 뒤에만 실행한다.

```js
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root = 'C:/project/feelandnote';
process.loadEnvFile(path.join(root, 'sw/web-bo/.env'));
const {database, save, revalidate} = await import(
  pathToFileURL(path.join(root, 'scripts/browser/reading-way-argon.mjs')).href
);
const [source, expectedHash] = process.argv.slice(2);
if (!source || !path.isAbsolute(source) || !/^[a-f0-9]{64}$/.test(expectedHash ?? '')) throw Error('원본 경로·해시 필요');
const raw = await fs.readFile(source);
if (createHash('sha256').update(raw).digest('hex') !== expectedHash) throw Error('원본 변경');
const result = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''));
if (!/^[a-z0-9][a-z0-9.-]*$/.test(result.slug ?? '')) throw Error('인물 식별 오류');
await fs.mkdir(path.join(os.tmpdir(), 'feelandnote'), {recursive: true});
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'feelandnote/reading-way-main-'));
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
const query = `SELECT json_build_object('id',id,'slug',slug,'ko',reading_way,'en',reading_way_en)
 FROM public.celebs WHERE slug=${literal(result.slug)} AND celeb_reality IN ('REAL','BOTH');`;
const person = JSON.parse((await database(query, work)).text.trim());
// 허용된 국소 사실 수정이 있으면 이 지점에서 검증한 부분만 적용한다.
await save(person, result, work);
await revalidate(person);
console.log(JSON.stringify({saved: person.slug, temporaryWork: work}));
```

위 코드를 자기 임시 작업 폴더의 실행 파일로 저장했다면 호출 형식은 다음과 같다. `EXPECTED_SHA256`은 회수 로그의 실제 64자리 값으로 바꾼다.

```powershell
node --import tsx C:/ABSOLUTE/apply-main.mjs C:/ABSOLUTE/argon-result.json EXPECTED_SHA256
```

`save`는 현재 한영 본문을 비교하고 인물 행을 잠근 뒤, 두 본문 이외 값의 보존과 저장 후 원문 일치를 검사한다. 통신 오류가 나도 이미 commit됐을 수 있으므로 현재 DB를 재조회하고 결과가 같은지 확인한다. 원본·현재값이 다른데 강제로 덮어쓰지 않는다. SQL은 `database()`가 UTF-8 파일로 전달한다. 한글 SQL을 PowerShell 텍스트 파이프로 psql에 보내지 않는다.

예제는 원본 JSON이 정상 JSON인 경우다. 다운로드에 코드 펜스 등이 붙었으면 러너의 `parseOriginal` 규격을 확인해 메모리에서 해석하고, 원본 파일 자체는 바꾸지 않는다. 임시 SQL과 실행 파일은 반영 검증 뒤 데이터 관리 규칙대로 정리한다.

## 조사에서 나온 책을 책장에 반영

1. **현재 책장을 먼저 조회한다.** 인물의 `celeb_contents`, 연결 `contents`, 모든 `content_locales`, 실제 `figure_book_editions`·상품과 관련 참조를 본다. 기존 작품은 QID → ISBN → 원제·원저자로 찾는다. ISBN만 달라졌다고 새 작품을 만들지 않는다.
2. **관계를 판정한다.** 실제 독서·감상·추천·감상 의사가 근거에 있어야 한다. 집필·소장·일반 언급·다른 화자의 발언을 감상으로 옮기지 않는다. 작가 일반 선호의 대표 작품 연결은 조사 룰북의 명시 조건에 따른다.
3. **작품과 판본을 가른다.** 같은 원전의 다른 번역은 같은 작품 아래 둔다. 단편집과 표제작, 저자·편자의 독립 선집, 재화·각색·학습용 축약본은 실제 목차와 본문 범위로 판단한다. 표제작을 대표로 연결할 때는 실제 감상 범위와 서비스의 대표 선정을 구별한다.
4. **정식 메타를 확인한다.** 한국어는 `getKakaoBookByIsbn`·`searchBooks`, 영어는 `getOpenLibraryBookMetadata`를 쓴다. 영어 제목만 보고 영어판으로 삼지 않으며 OL 판본의 실제 언어·원저자·원작 연결을 확인한다. 네이버·Google Books·Amazon을 신규 BOOK 메타 원천으로 쓰지 않는다. 아마존 상품 페이지는 판본·신간 실재·추천사 확인에 쓴다([등록 규칙](../project/celeb/celeb-02-02-content-registration.md#타입별-메타-원천)). ISBN·출판사·번역자를 추정해 채우지 않는다.
5. **소개·표지를 따로 확인한다.** `fetchBookIntroduction({isbn, locale})`가 실제 소개를 준 뒤에만 `KAKAO`·`DAUM`·`OPEN` 표식과 출처를 저장한다. 실패·미확인은 NULL이며 기존 유효 소개를 지우지 않는다. 표지는 실제 이미지를 열어 같은 ISBN의 제목·저자·판본을 대조한다. 실제 검색 후 못 찾은 표지만 `thumbnail_url=null`, `sources.thumbnail='confirmed_unavailable'`로 둔다.
6. **감상배경은 해당 인물의 Argon 원본에서 가져온다.** 다른 인물의 리뷰를 복사하지 않는다. 실제 한영 판본을 못 찾은 쪽은 등록 규칙의 표시용 제목 행을 쓰며, `sources.primary='none'`, `sources.title='translated'|'romanized'|'original'`, ISBN·출판사·표지 NULL로 구별한다. 한영 판본을 끝내 찾지 못한 책은 건너뛰지 않고 [「절판」](../project/celeb/celeb-02-02-content-registration.md#절판--판본이-없는-원어-작품-260913) 규칙대로 `external_id`·`external_source`를 `null`로 둔 작품과, `sources.availability='out_of_print'`를 단 ko·en 표시용 행 두 개로 등록한다. ISBN·출판사를 꾸며 넣지 않는다. OL 래퍼가 저자 목록 불일치로 거부한 판본은 OL 판본 JSON의 언어·저자·작품 연결과 표지를 직접 대조해 맞으면 쓴다.

래퍼 경로는 `packages/content-search/src/kakao-books.ts`, `openlibrary.ts`, `book-introduction.ts`다. 환경변수를 읽는 모듈은 `process.loadEnvFile()` 뒤에 동적 import하거나 Node `--env-file=sw/web-bo/.env`로 먼저 로드한다. Windows 절대경로의 import는 `pathToFileURL()`을 쓴다.

새 감상 관계는 `reading-way-books-apply.mjs`의 계획으로 등록한다. 다음은 **이미 있는 작품**에 관계 한 개를 추가하는 입력 형식이다. 인덱스는 0부터 시작하고 원본 파일의 실제 책 번호를 쓴다.

```json
{
  "slug": "TARGET_SLUG",
  "originals": [{"path": "C:/ABSOLUTE/argon-result.json", "sha256": "회수한 원본의 실제 SHA-256"}],
  "relations": [{
    "content_id": "검수한 기존 작품 ID", "original_index": 0, "book_index": 0,
    "factual_edits": [{"field": "source_url", "from": "원본의 링크", "to": "확인한 실제 근거 링크"}]
  }]
}
```

국소 수정이 없으면 `factual_edits`를 생략한다. 허용 필드는 `review`·`review_en`·`source_url`이며 `from`이 정확히 한 번 있어야 한다. 문자열 치환은 사실 수정용으로만 쓴다.

새 작품이 정말 없을 때는 `newWorks: [{id, external_id, external_source, locales: [...]}]`를 추가한다. locale 행에는 `locale,title,creator,isbn,publisher,thumbnail_url,description,sources`를 모두 명시한다. ko·en 두 행과 실제 판본의 ISBN 하나 이상이 필요하다. 판본이 없는 작품만 `external_id`·`external_source`를 `null`로 두고 두 행 모두 절판 표시용 행으로 넣는다. 기존 작품의 빠진 locale만 추가할 때는 `newLocales`를 쓴다. 필수값과 예외는 `validatePlan`을 직접 확인한다. `newWorks`의 작품 INSERT는 ID·타입·외부 ID·공급처만 저장하므로, 임의로 붙인 metadata가 저장될 것으로 기대하지 않는다. 원전 메타 보완은 검수한 카탈로그 교정으로 처리한다.

```powershell
node scripts/browser/reading-way-books-apply.mjs --plan C:/ABSOLUTE/verified-plan.json
node scripts/browser/reading-way-books-apply.mjs --plan C:/ABSOLUTE/verified-plan.json --apply
```

미리보기가 통과한 같은 계획을 반영한다. 이 도구는 원본 해시·인물·중복 ISBN·기존 관계·작품·locale의 동시 변경을 검사하고, 삽입 후 이전 기록 보존·책 수 증가·원문 일치·캐시 갱신을 확인한다. **삽입 전용**이므로 이미 있는 관계가 나오면 현재 DB를 검토하고, 재시도로 중복 등록하지 않는다. COMMIT 후 재조회·캐시 단계에서 실패할 수도 있으므로 도구 오류를 곧 미반영으로 간주하지 않는다.

## 기존 리뷰·메타·판본을 고칠 때

기존 `celeb_contents.review` 교정은 책장 삽입기에 넣지 않는다. 현재는 별도 리뷰 갱신 CLI가 없으므로 작업 폴더의 일회성 실행 파일에서 `database()`로 처리한다. 실제 행 ID·인물 ID·작품 ID를 고정하고 전체 이전 행을 비교하는 transaction으로 확정한 `review`·`review_en`·`source_url`만 바꾼다. ID·`created_at`·상태·공개 설정·기여자·회원·자식 참조와 나머지 감상은 보존한다. 연결 작품의 검수 전후 참조도 대조하고 같은 조건으로 재조회한다.

작품·locale·실판본의 수정은 [guarded-catalog-repairs.mjs](../../sw/web-bo/scripts/figure-books/lib/guarded-catalog-repairs.mjs)를 쓴다.

- `captureCatalogRepairSnapshot(null, workIds)`로 현재 18개 표를 **메모리에서** 읽는다. DB 덤프나 별도 복구 원장을 만들지 않는다.
- 검수한 `changes: [{table,before,patch}]`로 `planGuardedCatalogRepairs`를 먼저 실행한다.
- `guardedCatalogRepairs`는 **실제 쓰기**다. `apply:false`·`dryRun:true`가 미리보기 옵션일 것이라고 생각하고 부르지 않는다. 현재값 비교·transaction·독립 재조회를 통과해야 한다.
- 기존 소개의 제거·교체와 제외 판본 변경은 코드가 정한 독립 검수 근거가 필요하다. 실제 ISBN·원전·출처를 읽고 그 계약에 맞는 근거만 넣는다. 보호 검사를 통과하려고 근거를 지어내거나 가드를 약하게 만들지 않는다.
- 이미 검수·등록된 정상 판본으로 제외 판본의 대표 카드를 교체할 때는 `reviewedRepresentativeReplacement`를 쓴다. 원래 제외 근거와 정상 실판본을 보존한다. 제외된 같은 판본의 복원과는 다른 작업이다.

추가 번역판은 `sw/web-bo/scripts/figure-books/source-edition-batch.ts --file ABSOLUTE_PLAN`으로 미리 보고 `--apply`로 넣는다. 실제 명령은 다음과 같다.

```powershell
node --env-file=sw/web-bo/.env --import tsx sw/web-bo/scripts/figure-books/source-edition-batch.ts --file C:/ABSOLUTE/editions.json
```

입력의 `contentId,locale,isbn,editionKind,textScope,sortOrder`와 실제 본문 범위를 확인한다. 단권이라는 이유로 `full/complete`를 채우지 않는다. 원전 귀속 검사가 막으면 해당 ISBN·공식 제목·전체 저자·범위·독립 출처를 확인해 `sources.edition_work_evidence`의 `independent_work_review`로 서버에 먼저 보존하고 다시 검사한다. 영문판의 OL 원전 자체가 다르면 이 근거로도 우회할 수 없다.

## 반영 확인·진행 화면·정리

본문은 `revalidate(person)`, 책·메타 변경은 `revalidateTags`와 공유 캐시 태그 상수로 인물 ID·slug·작품 ID 및 필요한 집합 태그를 갱신한다. 캐시 실패만으로 이미 반영된 DB 쓰기를 반복하지 않는다. `--revalidate-only --only SLUG`는 **본문 캐시 재시도용**이며 작품 태그까지 처리하는 옵션이 아니다.

현재 DB의 한영 본문·감상배경·링크·권수를 다시 조회하고, [공개 인물 페이지](https://feelandnote.com/celeb/hayao-miyazaki)와 백오피스 `/celebs/<slug>#reading-way`에서 해당 내용을 확인한다. SWR 첫 응답이 이전 값이면 후속 응답을 확인한다. 저장 성공, 원본 일치, 캐시 갱신, 실제 노출을 별도로 판단한다. 사용자의 개발 서버는 재시작하지 않고, 캐시 때문에 build를 돌리지 않는다.

기존 블로그 글에도 교정한 감상배경이 실려 있다면 [네이버 블로그 지속 과제](blog-naver-book.md)의 현행 편집 경로로 DB 확정문과 근거 링크를 맞춘다. DB를 고친 것만으로 블로그가 갱신됐다고 보고하지 않는다. 저장 후 재열람과 공개 본문을 확인하고 기존 이미지·링크·발행·예약 설정을 보존한다. 블로그 제작 도구가 직접 읽는 현재 원고·이미지는 임시 조사 자료와 구별한다.

진행 화면은 [reading-way-progress.mjs](../../scripts/browser/reading-way-progress.mjs)가 `%TEMP%/feelandnote/reading-way-argon-runner-*/stdout.log`의 구조화 이벤트와 DB·실제 프로세스를 읽는다. 기존 `run-with-log.mjs`는 `%TEMP%/feelandnote/reading-way-batch-current/`에 있으며, 전달한 인수로 러너를 실행하고 이 형식의 고유 로그 폴더를 만든다. 파일 존재와 내용을 확인해 재사용한다. 장시간 작업을 새로 독립 실행할 경우 `Start-Process -WindowStyle Hidden -PassThru`로 띄워 PID를 기록하고 stdout을 위 경로에 둔다.

`books_pending`은 책 자료 수신 상태다. 단권 보완의 수신 건수와 인물 전체의 미완료 수를 구별한다. 일부 반영은 `books_partial`과 실제 남은 수를 기록하고 집계용 `books_pending`도 전체 남은 수로 맞춘다. 해당 인물의 책 검증·반영·재조회를 마쳤을 때만 `books_verified`를 기록한다. 러너의 다음 묶음 대기는 마지막 `books_pending/books_verified` 이벤트를 보므로 화면만 보고 완료 상태를 꾸미지 않는다. `--collect-only` 원고는 `draft_ready`여도 아직 DB 미반영이다. 수동 저장을 검증한 뒤 그 실제 결과를 기록한다.

`saveAs()`는 기본 다운로드를 이동하지 않고 사본을 만든다. [다운로드 정리 함수](../../.agents/skills/aside-browser/scripts/download-cleanup.mjs)는 실제 `download.path()`의 파일을 별도 저장본과 해시 대조한 뒤 그 사본만 삭제한다. 독서 방식 러너에는 정상 응답 일치 후 이 처리가 반영돼 있다. 다른 탭 응답과 불일치한 다운로드는 소유가 확정되지 않았으므로 경로를 기록하고 대조하며, 이름 패턴으로 사용자 폴더를 지우지 않는다.

DB 반영·재조회·공개 확인이 끝난 대상의 프롬프트·원본 응답·후보 메타·출처 사본·일회성 실행 파일·다운로드 사본은 전량 정리한다. 여러 미완료 책을 함께 담은 원본은 마지막 사용 대상까지 끝날 때 보존한다. 실행자가 등록하지 않기로 판단한 책이 남은 원본은 사용자가 그 판단을 확인할 때까지 지우지 않는다. Windows 삭제는 절대경로·소유·Git 추적 여부를 확인하고 `Remove-Item -LiteralPath`를 쓴다. 진행 로그와 미완료 자료가 끝난 자료와 섞여 있다는 이유로 통째로 삭제하지 않는다.

실행기나 정리 코드를 변경했을 때 확인할 기존 검사:

```powershell
node --import tsx scripts/browser/reading-way-argon.mjs --self-test
node --test scripts/browser/reading-way-books-apply.test.mjs
node --test .agents/skills/aside-browser/scripts/download-cleanup.test.mjs
node --import tsx --test sw/web-bo/scripts/figure-books/lib/guarded-catalog-repairs.test.mjs
```

데이터 작업만 할 때 이 검사들을 관성적으로 반복하지 않고, 실제 반영 대상의 원본·현재 DB·출처·노출을 확인한다.

## 진행 화면

[진행 화면](http://127.0.0.1:4317/reading-way-progress.html)은 사용자가 중간보고용으로 띄워 두기를 원한다(26.10.29). 작업을 시작할 때 포트의 응답을 먼저 확인하고, 서버가 없을 때만 아래 파일을 별도 숨김 프로세스로 실행한다. 수동 저장·책장 반영 결과도 이 화면에 나오도록 `published`·`books_verified` 이벤트를 실제 반영 뒤에 남긴다. 모델 호출은 별도다.

```powershell
$progress = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('--import','tsx','scripts/browser/reading-way-progress.mjs') -WorkingDirectory 'C:/project/feelandnote' -WindowStyle Hidden -PassThru
$progress.Id
```
