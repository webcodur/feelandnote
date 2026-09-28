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

## 주의

- 사용자의 실제 프로필·로그인 세션을 쓴다. 주문·결제·글 작성 같은 실제 상태 변경 행위는 절대 하지 않는다 — 조회·추출 전용.
