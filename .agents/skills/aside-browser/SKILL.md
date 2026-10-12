---
name: aside-browser
description: 사용자의 실제 Aside 브라우저(로그인 세션·쿠키·프로필 그대로)를 aside CLI로 제어한다. puppeteer·CDP·curl이 Akamai 등 봇 차단으로 403(Access Denied)을 받는 사이트의 페이지 열람·DOM 추출·스크린샷, 로그인이 필요한 화면 조작에 쓴다. "어사이드", "aside", "403 차단", "Access Denied 우회", "실제 브라우저로 열어", "쿠팡 상품 긁어" 요청에 적용한다.
---

# Aside 브라우저 제어

Aside는 사용자 계정으로 로그인된 실제 브라우저다. CDP로 제어되는 puppeteer와 달리 봇 탐지를 통과한다 — `www.coupang.com` 검색·상품 상세가 puppeteer에서는 전부 403이지만 Aside에서는 정상 열리는 것을 확인했다.

## 전제

- Aside 앱이 실행 중이어야 한다. 확인: `aside account status` → `signed in`과 프로필이 보이면 정상.
- 꺼져 있으면 `"C:\Program Files\Aside\Application\Aside.exe"`를 실행하고 몇 초 뒤 재확인한다.
- `profile is not connected to the daemon` 오류가 나면 앱에서 프로필 창을 한 번 연 뒤 재시도한다.
- CLI 경로: `C:\Users\webco\AppData\Local\Aside\CLI\current\aside.exe`. PATH에 없을 수 있으니 절대 경로로 부른다.
- **Aside에는 계정(브라우저 프로필)이 여럿이다. 로그인 문제를 풀기 전에 `aside account list`부터 본다.** 프로필마다 구글 로그인 묶음이 따로다. `aside account status`는 기본 계정 하나만 보여 주므로 이것만 보고 판단하지 않는다. 필요한 구글 계정이 로그인된 프로필을 찾아 `aside repl --account <id>`로 고른다.
  - 26.09.28 기준: `u0` = Profile 0(구글 `webcodur@gmail.com` 로그인, Search Console 도메인 속성 권한), `u1` = Profile 1(기본, 구글 계정 여러 개), `u2` = Profile 2.
  - 기본 프로필에서 권한 계정이 안 보인다고 구글 전체 로그아웃·재로그인으로 풀지 않는다. 26.09.28에 이 확인을 건너뛰고 Profile 1의 구글 계정 10개를 전부 로그아웃했다가, 이미 로그인된 `u0`를 뒤늦게 찾았다.
  - 구글 계정 목록은 `googleAccounts.list()`(google-accounts 스킬)로 본다. 이 값도 `--account`로 고른 프로필 기준이다.

## 로컬 개발 화면 확인에도 1순위다

`localhost:3001` 백오피스처럼 로그인 뒤에 있는 로컬 화면도 Aside의 세션으로 바로 열린다(26.09.18 실측). Chrome 확장은 연결이 끊겨 있기 일쑤고 obscura는 localhost를 거부하므로, 화면을 봐야 하면 Aside부터 연다.

- `page.waitForTimeout`·`page.setViewportSize`는 없다. 대기는 `sleep(ms)`, 뷰포트는 기본 1440×900을 그대로 쓴다.
- **이동 직후 첫 `page.screenshot`은 CDP 타임아웃이 잦다.** `bringToFront()` → `sleep(1500)` 뒤 다시 찍으면 된다. 재시도 루프를 스크립트 안에 넣는다.
- 스크린샷 타임아웃이 연달아 나면 Aside 데몬이 내려갈 수 있다(`Aside isn't running`). `Start-Process "C:\Program Files\Aside\Application\Aside.exe"`로 다시 띄우고 `aside account status`로 확인한다.
- 다 보고 나면 `for (const t of [...tabs]) await closeTab(t)`로 연 탭을 닫는다.

## 실행 — repl만 쓴다

`aside repl "<JS>"`는 모델을 거치지 않고 브라우저에서 JS를 직접 실행한다 — **무료·결정적**. `aside exec`(자연어 위임)와 `mcp__aside__exec`는 Aside 에이전트의 모델 크레딧을 소모하므로 에이전트가 쓰지 않는다 — 무조건 repl(`aside repl` CLI 또는 `mcp__aside__repl`)로 제어한다. MCP repl 세션이 `Lifetime not alive`로 죽으면 CLI repl로 전환하고, `listBrowserTabs()`→`attachBrowserTab(targetId)`로 열린 탭에 이어 붙는다.

- 한 번의 `aside repl` 호출은 새 세션이다. 탭 오픈부터 데이터 추출까지 한 호출 안에 넣는다 — 이전 호출의 `tabs`는 이어지지 않는다. 타임아웃 120초.
- 전역 함수: `openTab(url)`, `snapshot(page, {interactive})`, `sleep(ms)`, `page.evaluate()`, `page.screenshot()`, `listBrowserTabs()`, `attachActiveBrowserTab()`. `page.waitForTimeout`은 없다 — 전역 `sleep`을 쓴다.
- 페이지 읽기는 `snapshot()`이 기본이고, 셀렉터를 아는 경우 `page.evaluate()`로 직접 뽑는다. 전체 API는 `aside guide repl`을 본다.
- MCP로도 노출돼 있다(`mcp__aside__repl` 등). MCP 호출은 세션 간 REPL 스코프가 유지된다.

## 쿠팡 레시피 (검증됨)

```bash
# 검색 → 상품 ID·이름·가격
aside repl "const p = await openTab('https://www.coupang.com/np/search?q=' + encodeURIComponent('검색어') + '&channel=user'); await sleep(4000); const items = await p.evaluate(() => { const s=new Set(),o=[]; document.querySelectorAll('a[href*=\"/vp/products/\"]').forEach(a=>{const id=a.href.match(/products\\/(\\d+)/)?.[1]; if(!id||s.has(id))return; s.add(id); o.push({id, text:a.textContent.replace(/\\s+/g,' ').trim().slice(0,80)})}); return o.slice(0,10) }); console.log(JSON.stringify(items,null,1))"

# 상세 → 제목·가격·품절·og 메타
aside repl "const p = await openTab('https://www.coupang.com/vp/products/<ID>'); await sleep(3000); const i = await p.evaluate(() => ({ title: document.querySelector('h1.prod-title')?.textContent?.trim(), price: document.querySelector('.total-price strong')?.textContent?.trim(), ogTitle: document.querySelector('meta[property=\"og:title\"]')?.content, ogImage: document.querySelector('meta[property=\"og:image\"]')?.content, head: document.body.innerText.slice(0,400) })); console.log(JSON.stringify(i,null,1))"
```

- `li.search-product` 등 옛 검색 DOM 셀렉터는 현재 안 맞는다 — `a[href*="/vp/products/"]`로 잡는다.
- 품절 상품은 `.total-price strong`이 없다 — `body.innerText`의 가격·`일시품절` 문구로 판정한다.
- 판매 종료 상품은 정상 페이지로 열리되 "상품을 찾을 수 없습니다" 본문이 뜬다 — 차단과 구분한다.
- 도서 제휴 링크 선정 판정은 `../coupang-book-affiliate/SKILL.md`를 따른다. 이 스킬은 화면 접근 수단만 제공한다.

## ChatGPT·Grok 웹 이미지 생성

인물 이미지의 발주·검수 기준은 [대표 사진 룰북](../../../docs/project/celeb/celeb-08-02-hero-photo.md), 같은 생성 원본을 자르는 아바타 경로는 [아바타 룰북](../../../docs/project/celeb/celeb-08-01-avatar.md#대표-사진에서-잘라내기)을 따른다. 스튜디오 발주 전에는 룰북의 「기존 초상화의 스튜디오 사진 확장」을 읽고, 참조에서 유지할 신원 특징과 촬영에 맞게 교정할 표정·시선·방향을 구분한다.

- **인물 제작 작업 탭은 최대 세 개를 재사용한다.** `listBrowserTabs()`로 진행 중인 대화를 먼저 확인하고, 생성 대화 URL을 기억해 재연결한다. 다음 인물은 작업 탭에서 이어가며 작업이 끝나면 자신이 연 탭만 `closeTab()`으로 닫는다.
- **ChatGPT는 Chat 모드에서 얼굴 참조와 인물별 발주문 파일을 함께 첨부한다.** 실제 REPL `pwd` 아래에 파일을 준비한다. 이동 직후에는 `snapshot()`으로 입력창과 모드가 준비됐는지 확인한다. 모드 전환과 첨부를 같은 호출에서 하면 첨부가 반영되지 않을 수 있으므로 Chat 모드 선택 뒤 다음 호출에서 첨부한다. `setInputFiles()`에 여러 파일을 넘겨도 첫 파일만 붙는 경우가 있으므로 빠진 파일은 별도 호출로 추가한다. 참조 이미지와 발주문 파일이 실제 첨부 칩으로 나타나고 처리 완료·전송 버튼 활성화가 확인되면 보낸다. 이미지 뷰어를 닫은 뒤 입력창이 다시 붙을 수 있으므로 편집 지시 입력은 다음 호출에서 한다.
- 첨부 발주문의 구도·시선이 결과에 반영되지 않으면, 전송 문장에도 해당 원 발주 조건을 짧게 반복한다. 새로운 연출 조건을 덧붙이지 않는다.
- **대기와 재개는 실제 대화 상태로 판단한다.** 진행률이나 생성 중 표시의 소멸만으로 완료로 세지 않는다. `snapshot(page, {selector: 'main'})`으로 채팅 본문을 읽으면 긴 사이드바를 반복해서 읽지 않아도 된다. 스냅샷 문자열을 잘라 읽지 않는다. 파일 회수 오류는 같은 대화에서 해결하며 재생성 사유로 삼지 않는다.
- **ChatGPT가 후보 두 장을 내면 둘 다 검수하고 선택한 원본을 회수한다.** 응답의 이미지 버튼 번호와 뷰어의 이미지 번호는 편집 응답에서 다를 수 있다. 여러 뷰어가 DOM에 남기도 하므로 현재 선택한 후보를 화면과 대조하고, 마지막으로 열린 해당 뷰어 이미지의 `alt`, `complete`, `naturalWidth`, `naturalHeight`를 확인한다.
- **다운로드 파일의 이름만으로 인물을 확정하지 않는다.** 여러 ChatGPT 탭에서 다운로드 이벤트가 다른 탭의 파일을 반환한 사례가 있다. 이 경우 선택한 뷰어의 로드된 `blob:` 이미지를 `page.evaluate()` 안에서 원래 `naturalWidth`·`naturalHeight` 크기의 canvas에 그려 `toDataURL('image/png')`로 회수한다. Base64는 REPL의 `fs.writeFile()`로 `pwd` 아래에 저장하고, 얼굴을 참조와 대조한다. 화면 캡처나 썸네일을 생성 원본 대신 쓰지 않는다.
- **Grok 원본 회수는 이미지 출처에 맞춘다.** 외부 이미지 URL은 canvas가 오염될 수 있고, 페이지 내부 `fetch`나 다운로드가 성공처럼 보여도 0바이트 파일이 남을 수 있다. 실제 열린 뷰어에서 확인한 `assets.grok.com` 원본 URL을 Aside REPL 전역의 쿠키가 유지되는 `fetch(url)`로 받아 `fs.writeFile()`로 저장한다. `page.evaluate()` 내부의 `fetch`와 구분한다. HTTP 성공·이미지 MIME·실제 바이트 수·이미지 디코딩과 픽셀 크기를 확인하고, JPEG 등 실제 형식에 맞춰 확장자를 정한다.

## 주의

웹 모델에 작업을 맡기는 디지털 노마드는 사용자가 지시한 모델·계정·로그인 승인 범위에서 실행한다. 룰북과 입력은 파일로 첨부하고, 결과는 웹이 만든 다운로드 파일로 받아 로컬 검사기에 넘긴다. 긴 결과를 작업자 대화에 복사하지 않고 파일 경로·크기·해시·검사 오류만 보고한다.

반복 작업은 `aside mcp`의 `repl`이나 대화형 `aside repl` 연결을 유지한다. 단발 `aside repl "..."`이 끝나면 새로 연 탭도 사라지므로 긴 생성 작업에 쓰지 않는다. `fs`는 프로젝트·세션 밖의 파일을 거부할 수 있다. 호스트에서 전달 파일을 실제 `pwd`의 세션 폴더로 복사한 뒤 `setInputFiles()`로 첨부하고, 결과는 `waitForEvent('download')`와 `download.saveAs()`로 같은 세션 폴더에 저장하여 호스트가 회수한다. 웹 Claude Sonnet에서 JSON 파일 배송을 실제 확인했다. Artifact 뷰어에는 결과 전체가 노출되므로 대기 중에는 상태만 읽고 완료 뒤에도 채팅 feed·다운로드 버튼으로 범위를 좁힌다.

호출은 [`scripts/aside-client.mjs`](scripts/aside-client.mjs)의 `AsideClient`를 재사용한다. 생성자가 초기화하므로 `await client.ready`로 준비를 기다리고 `initialize()`를 다시 호출하지 않는다. 계정·연결을 바꿀 때는 호출 헬퍼도 새 client에 연결하고 전달 파일 경로를 새 REPL `pwd`에 맞춘다. 파일 첨부·대화 재개·다운로드는 [`scripts/browser-helpers.mjs`](scripts/browser-helpers.mjs), 사용자가 맡긴 계정 전환·가입은 [`scripts/auth.mjs`](scripts/auth.mjs)가 쥔다. 로그인된 구글 계정을 먼저 선택하고 Claude만 로그아웃한다. 비밀값은 로컬 메모리에서만 읽으며 보고에는 계정 번호와 성공·보류만 남긴다. 결과 파일의 신원·현재 입력 해시·실제 모델과 원문 근거 검사는 작업별 검사기가 수행한다.

- 사용자의 실제 프로필·로그인 세션을 쓴다. 기본은 조회·추출이며, 웹 모델에 작업 전달·계정 전환·로그인·가입 승인은 사용자가 명시적으로 맡긴 범위에서 실행한다. 주문·결제·유료 구독은 별도 명시 지시가 필요하다.
