# 브라우저 채팅으로 외부 모델 쓰기

무료로 무제한적인 외부 AI 채팅을 이용하는 경로다. 로그인된 브라우저 세션에서 웹 채팅에 질문을 넣고 답을 받아온다.

CLI 경로(codex·kiro·opencode·agy)와 목적이 다르다. CLI는 결과를 파일로 받아 대량 배치에 강하고, 이 경로는 **API가 없거나 유료인 모델을 화면으로 부린다.**

## 공통 전제

**결제한 구글 계정으로 로그인된 크롬만 확장으로 다룰 수 있다.** 이것이 전제의 전부다. 그 계정의 프로필로 크롬을 열면 붙고, 다른 계정으로 열려 있으면 붙지 않는다.

`list_connected_browsers`가 빈 배열이면 끊긴 것이다. `switch_browser`를 불러도 "No other browsers available"이 나온다.

### 계정부터 맞춘다

**확장이 깔려 있느냐가 아니라 어느 계정으로 로그인됐느냐가 가른다.** 26.09.07 실측 — `Default`(webcodur)에도 확장이 설치돼 있었지만 붙지 않았고, 구독 계정인 `Profile 50`(feelandnote)으로 여니 즉시 붙었다. 그 사이 창을 앞으로 끌어오고 최상위로 올리고 캡처까지 뜨며 헤맸는데 전부 헛수고였다.

**연결은 화면 위치와 무관하다.** 창이 화면 밖에 있든 최소화됐든 다른 앱에 가렸든 상관없다. 창을 쫓는 좌표 작업으로 풀 문제가 아니다.

이 컴퓨터에는 프로필이 스무 개가 넘는다. 맞는 것을 고르려면 계정 목록부터 본다.

```powershell
# 1) 프로필과 로그인 계정 목록
$j = Get-Content "$env:LOCALAPPDATA\Google\Chrome\User Data\Local State" -Raw -Encoding UTF8 | ConvertFrom-Json
$j.profile.info_cache.PSObject.Properties | ForEach-Object {
  [pscustomobject]@{ Dir = $_.Name; Name = $_.Value.name; Email = $_.Value.user_name }
} | Format-Table -AutoSize

# 2) 확장이 설치된 프로필 (참고용 — 설치돼 있어도 계정이 다르면 안 붙는다)
$id = 'fcoeoabgfenejglbffodgkkbkcdhcgfn'
Get-ChildItem "$env:LOCALAPPDATA\Google\Chrome\User Data" -Directory |
  Where-Object { Test-Path (Join-Path $_.FullName "Extensions\$id") } | Select-Object Name

# 3) 결제한 계정의 프로필로 연다. 1) 의 Email 이 그 계정이어야 한다
Start-Process "chrome.exe" -ArgumentList '--profile-directory="Profile 50"', 'about:blank'
```

계정이 맞는데도 빈 배열이면 크롬 툴바의 Claude 아이콘을 눌러 연결을 확인해야 한다. **그 버튼을 좌표로 눌러 통과시키지 않는다** — 사람이 확인하도록 만들어진 장치다.

**답은 화면 캡처로 받지 않는다.** 완료 판정을 브라우저 안에서 시키고 최종 텍스트만 돌려받는다. 도구 호출 1회로 끝나고 토큰은 답변 글자 수만큼만 든다. 캡처는 한 장에 수천 토큰이 나간다.

**새 탭(`chrome://newtab/`)에서는 스크립트가 돌지 않는다.** "Can't interact with browser-internal or unparseable URLs"가 나온다. 웹 페이지로 이동한 뒤 실행한다.

**페이지 이동과 스크립트를 한 묶음에 넣지 않는다.** `location.href`로 옮긴 직후 같은 묶음에서 스크립트를 돌리면 이동 중이라 빈 결과(`{}`)가 온다. 이동을 마친 뒤 따로 부른다.

---

## 구글 AI 모드

주소 한 줄로 질문과 답이 끝난다. 대화 상태를 안 만들어 회차마다 독립이고, 답변에 출처가 함께 붙는다.

```
https://www.google.com/search?udm=50&hl=ko&q=<질문>
```

`udm=50`이 AI 모드다. 로그인 세션이므로 차단되지 않는다. 일반 검색(`udm` 없음)으로는 AI 답변이 안 붙을 때가 많으니 이 값을 반드시 넣는다.

**본문은 `get_page_text`로 안 잡힌다.** AI 모드는 스타일 블록이 먼저 잡혀 CSS만 돌아온다. 아래처럼 직접 잘라낸다. 완료 판정은 답변 글자가 더 늘지 않는 것으로 한다.

```js
const END = 'AI 대답에는 오류가'
const grab = () => { const f = document.body.innerText; const e = f.indexOf(END); return e > 0 ? f.slice(0, e).trim() : '' }
let prev = '', stable = 0
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 1500))
  const cur = grab()
  if (cur.length > 60 && cur === prev) { stable++; if (stable >= 2) break } else stable = 0
  prev = cur
}
JSON.stringify({ chars: prev.length, text: prev })
```

**실측 (2026-09-07)** — 연속 5건 성공, 막힘 없음. 건당 500~1,200자, 대기 6~10초, 도구 호출 1회에 캡처 0장. 연속 대량 한도는 미확인이다.

### 대량 조사에 쓸 때 — 단순하게 묻고, 판정은 스크립트가 한다

**한 번에 하나만 시킨다.** 이 모드는 깊이 대화하지 못한다. 요구를 얹을수록 형식을 버리고 산문 요약으로 도망간다.

| 물음 | 결과 |
|---|---|
| 책 10권 → 인물 나열, 형식만 지정 | 형식대로 10줄, 군더더기 없음 |
| 책 8권 → **「최대한 많이, 각 12명 이상」** 추가 | **목록을 버리고 줄글 요약.** 「『인물 삼국지』는 조조와 유비 등을…」 |

수량을 올리려다 형식을 잃으면 파싱이 통째로 실패한다. **요구는 형식 하나로 좁히고, 수확이 적으면 묶음을 나눠 여러 번 묻는다.**

**묶음 크기도 욕심내지 않는다.** 20권씩 묶으면 책당 답이 얕아지고 혼동이 는다. 8~10개가 형식과 내용을 함께 지키는 선이었다.

**`browser_batch`로 navigate와 회수를 한 호출에 묶는다.** 따로 부르면 묶음당 2회가 나가지만 batch 는 1회로 끝난다.

```
[{name:'navigate', input:{tabId, url}},
 {name:'javascript_tool', input:{action:'javascript_exec', tabId, text: 완료판정+회수}}]
```

**회수는 형식 줄만 가져온다.** 프롬프트가 화면에 두 번 에코되므로 답변 전체를 받으면 같은 글을 세 번 읽는 꼴이다. `>` 가 든 줄만 거르면 토큰이 크게 준다. 다만 **필터를 과하게 걸면 답까지 사라진다** — 빈 결과가 나오면 필터부터 의심하고 `document.body.innerText` 를 직접 떠서 확인한다.

**판정은 모델에게 맡기지 않는다.** 이름은 등록 명단과 대조하고, 책은 카카오로 실재를 확인한다. 브라우저는 후보만 만들고 걸러내기는 스크립트가 한다 — 실측에서 모델이 뱉은 30명 중 8명이 서비스에 없는 인물이었고 전부 자동으로 빠졌다.

### 수백 건을 한 탭에서 돈다 — iframe 순회

묶음 질의는 수확이 얕다. 실측에서 10권을 한 번에 물으면 3명이 나왔고, 한 권씩 물으니 36명이 나왔다. **한 권에 한 번 묻는 것이 맞다.** 그러면 수백 회를 돌려야 하는데, 회당 `navigate` 를 부르면 왕복 비용이 그만큼 든다.

**`window.open` 은 팝업 차단에 막히지만 iframe 은 통한다.** 검색 결과는 같은 오리진이라 `contentDocument` 로 본문을 그대로 읽는다. 탭 하나에 iframe 을 띄웠다 지우며 전체를 돌면 도구 호출은 처음 한 번뿐이다.

```js
const f = document.createElement('iframe')
f.style.cssText = 'position:fixed;left:-9999px;width:1000px;height:700px'
f.src = 'https://www.google.com/search?udm=50&hl=ko&q=' + encodeURIComponent(질문)
document.body.appendChild(f)
// … 완료를 기다린 뒤
f.remove()
```

**CDP `Runtime.evaluate` 는 45초에 끊긴다.** 순회를 `await` 하면 도구 호출이 먼저 죽는다. 백그라운드로 띄우고 결과를 `localStorage` 에 쌓은 뒤, 상태만 따로 물어본다.

```js
localStorage.setItem('run_out','[]'); localStorage.setItem('run_state','running')
window.__run = (async () => { /* … 배치마다 localStorage 갱신 … */
  localStorage.setItem('run_state','done') })()
'시작'   // 즉시 반환한다
```

### 완료는 화면의 신호로 판정한다 — 권당 48초 → 23초

본문이 안 변하는 것으로 완료를 판정하면(«2회 연속 같으면 끝») 답이 다 나온 뒤에도 폴링 간격만큼 더 기다린다. **AI 모드는 끝나면 페이지에 「AI 모드 대답이 준비되었습니다」를 붙인다.** 그 문구를 잡으면 즉시 끝낼 수 있어 폴링 간격도 0.3초까지 줄일 수 있다.

| 방식 | 권당 |
|---|---:|
| 0.9초 폴링 + 2회 연속 동일 판정, 병렬 4 | 48초 |
| 0.3초 폴링 + 완료 신호 감지, 병렬 4 | 23.5초 |

**빈 응답은 한 번 더 묻는다.** 8권 중 2권이 빈 값이었다. 재질의 한 번이면 대부분 채워진다.

### 병렬은 4를 넘기지 않는다 — 넘기면 구글이 IP를 막는다

빨라 보인다고 병렬을 올리면 구글이 「비정상적인 트래픽」 확인 페이지(`/sorry/index`)로 IP 전체를 돌려세운다. **CAPTCHA 는 우리가 풀 수 없고 풀어서도 안 되므로, 그 시점에 조사가 끝난다.** 사람이 브라우저에서 직접 통과해야 재개된다.

| 병렬 | 권당 | 결과 |
|---:|---:|---|
| 4 | 23.5초 | 8권 완주 |
| 6 | 처음 2.6초 → 곧 38초 | **66권째에 차단.** 빈 응답이 35% 로 치솟는 것이 전조다 |

**빈 응답 비율이 갑자기 오르면 이미 조여지고 있는 것이다.** 그때 멈춰야 차단까지 가지 않는다. 순회 코드에 중단 플래그(`localStorage` 를 매 회 확인)를 넣어 두면 새로고침 없이 세울 수 있다.

### 결과 회수는 다운로드로 — 토큰이 들지 않는다

수백 권의 답을 대화로 받으면 그것만으로 수만 토큰이다. **페이지에서 Blob 을 만들어 내려받으면 파일로 떨어지고, 그 파일을 셸로 읽으면 회수 비용이 0이다.**

```js
const a = document.createElement('a')
a.href = URL.createObjectURL(new Blob([텍스트], {type:'text/plain;charset=utf-8'}))
a.download = 'out.txt'; document.body.appendChild(a); a.click()
setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000)
```

`~/Downloads` 에 떨어진다. 사용자 제스처 없이도 동작하지만 **첫 한 번뿐이다.** 크롬은 같은 사이트가 연달아 파일을 내려받으려 하면 두 번째부터 막는다(자동 다운로드 권한). 대량 회수를 하려면 `chrome://settings/content/automaticDownloads` 에서 그 사이트를 허용 목록에 넣어야 하고, 그것은 사람이 눌러야 한다. **회차마다 내려받지 말고 순회를 끝낸 뒤 한 번에 받는다.**

**막힌 회수 경로 두 가지.** 시간을 쓰기 전에 알아 둔다.

- **로컬 HTTP 수신기(`fetch('http://127.0.0.1:…')`)는 안 된다.** CORS 와 Private Network Access 헤더를 모두 갖춰도 요청이 pending 에서 끝나지 않는다.
- **`document.execCommand('copy')` 는 `false` 를 돌려준다.** 사용자 제스처가 없어 클립보드 쓰기가 거부된다.
- **도구 응답으로 길게 받을 수 없다.** `javascript_tool` 의 반환값은 한글 1,100자쯤에서 잘린다. 43건을 받으려면 30회를 넘게 부르게 된다.
- **gzip+base64 로 줄여 받는 길도 막혀 있다.** 도구가 base64 덩어리를 차단한다.

반대 방향(로컬 → 브라우저)은 뚫려 있지 않다. 대상 목록은 **한 번만** `localStorage` 에 심고, 그 뒤 순회와 회수는 무료로 돈다.

---

## ChatGPT

`chatgpt.com`에서 상단 **Chat 모드**를 쓴다. 대화가 계정에 쌓이므로 회차마다 새 채팅을 연다.

**입력** — 한글을 그냥 타이핑하면 IME에 막혀 들어가지 않는다. `computer` 도구로 `type`을 보내면 입력창에 한 글자만 남거나 아무것도 안 들어간다. 자바스크립트로 넣고 Return 키를 보낸다.

```js
const el = document.querySelector('#prompt-textarea')
el.focus()
const sel = window.getSelection(), range = document.createRange()
range.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(range)
document.execCommand('delete', false, null)
document.execCommand('insertText', false, '<질문>')
```

`insertText`를 쓰는 이유는 입력창이 `contenteditable`이라 `value` 대입이 통하지 않고, 이 방식이라야 프레임워크의 입력 이벤트가 함께 발생하기 때문이다.

**완료 판정** — 생성 중에는 정지 버튼이 떠 있다. 그것이 사라지면 끝이다.

```js
let last = ''
for (let i = 0; i < 60; i++) {
  await new Promise(r => setTimeout(r, 1500))
  const streaming = !!document.querySelector('button[data-testid="stop-button"]')
  const a = [...document.querySelectorAll('[data-message-author-role="assistant"]')]
  last = a.length ? a[a.length - 1].innerText.trim() : ''
  if (!streaming && last.length > 0) break
}
JSON.stringify({ chars: last.length, text: last })
```

**실측 (2026-09-07)** — 왕복 1건 성공. GPT-6 Pro는 추론 모델이라 30초 이상 걸린다. 전송 직후에는 답변 요소가 0개이고 정지 버튼만 떠 있으니, 그 상태를 완료로 오인하지 않는다. 주소가 `/c/<id>`로 바뀌면 대화가 만들어진 것이다.

---

## 막히는 경로

- **자동화 전용 브라우저로 구글에 접근하면 첫 요청에서 차단된다.** `/sorry/index`로 튕긴다. 구글은 마우스 속도·키 입력 간격 같은 행동 신호까지 보고 판정하고, 우회 코드를 무력화하려 내부 상수를 수 분 단위로 바꾼다. 반드시 사람이 쓰는 크롬 세션을 쓴다.
- **Playwright 계열 도구는 챗봇 화면을 조작하지 못한다.** 페이지 스크립트가 실행되지 않아 duck.ai는 "requires JavaScript" 안내에서, z.ai는 시작 화면에서 멈춘다. 스크립트로 그리는 채팅 화면은 확장 경로로만 다룬다.
- **duck.ai는 약관이 자동 질의(`automated querying`)를 문자 그대로 금지한다.** 쓰지 않는다.
- OpenAI는 봇·스크립트로 채팅 화면에 접근하는 것을 약관에서 금지한다. 위반이 쌓이면 정지되는 것은 **Codex를 돌리는 그 구독 계정**이다. 대량 반복은 이 위험을 감안해 판단한다.
- **Gemini CLI는 비대화 호출에서 멈춘다.** 로그인이 안 된 상태면 "Opening authentication page… [Y/n]"에서 응답을 기다리다 타임아웃까지 간다. 구글 계정 경로는 이미 로그인된 `agy`로 쓰는 편이 낫다.

## 키 없이 호출되는 익명 API

브라우저를 거치지 않고 계정·카드 없이 붙는 경로다.

| 곳 | 엔드포인트 | 실측 |
|---|---|---|
| LLM7 | `https://api.llm7.io/v1` | OpenAI 호환. 무료 4종 중 한국어가 되는 것은 `minimax-m2.7` 하나 |
| Kilo Gateway | `https://api.kilo.ai/api/gateway/v1/chat/completions` | 무료 17종. 대부분 빈 응답이고 `dots-3-note-preview:free`만 사실·한국어가 맞았다 |

세 가지가 걸린다.

- **동시 실행이 1개다.** LLM7에 4건을 동시에 던지면 3건이 즉시 `concurrent_request_limit_exceeded`로 거절된다. 순차로만 돌아간다.
- **무료 몫을 전 세계가 나눠 쓴다.** Kilo의 `minimax-m3:free`는 호출 시점에 이미 그날 몫이 소진돼 있었다. 내 한도가 아니라 남들이 쓴 것이라 언제 열릴지 예측할 수 없다.
- **품질이 먼저 걸린다.** 무료 모델 12종에 같은 한국어 질문을 던져 쓸 만한 것은 2종뿐이었다. 나머지는 빈 응답, 베트남어 혼입, 연도 오답이었다.

모델 목록에서 무료를 고를 때는 `tier`와 `usage_based_only`를 함께 본다. LLM7은 46종 중 41종이 유료(`pro`)이고 무료는 `turbo` 5종뿐이다.

## 브라우저 UI를 마우스로 다룰 때

탭바·북마크바는 확장으로 조작할 수 없어 좌표로 다뤄야 한다. 순서대로 걸린 것들이다.

**배율을 먼저 처리한다.** PowerShell에서 `SetProcessDPIAware()`를 부르지 않으면 좌표가 배율만큼 어긋난다. 화면이 3440×1440인데 스크립트는 2293×960으로 보고, 그 상태로 누르면 1.5배 떨어진 곳이 눌린다. 커서를 옮기고 읽어도 같은 값이 나와 검증조차 통과한다.

**창을 찾는다.** `Get-Process chrome`의 `MainWindowHandle`은 237×39짜리 보조 창을 잡을 수 있다. `EnumWindows`로 클래스가 `Chrome_WidgetWin*`인 창을 모아 크기로 거른다. **클래스만으로는 부족하다** — VSCode·Antigravity 같은 Electron 앱도 같은 클래스를 쓴다. 창의 PID가 `chrome.exe`인지 함께 확인한다(26.09.07 이 필터가 없어 IDE 창을 크롬으로 알고 앞으로 끌어왔다). 최소화된 창도 후보다 — **확장은 탭 그룹을 만들 때 창을 새로 만들기 때문에** 작업 흔적이 최소화된 빈 창에 남아 있다.

**앞으로 가져온다.** `SetForegroundWindow` 단독으로는 실패한다. `AttachThreadInput`으로 현재 포그라운드 스레드와 대상 스레드를 붙인 뒤 불러야 한다. 매 명령마다 포커스가 돌아가므로 **포그라운드 확보와 클릭을 한 스크립트 안에서** 처리한다. 나눠 부르면 그 사이에 다른 창이 앞으로 온다.

**캡처는 화면에서 뜬다.** `PrintWindow`는 하드웨어 가속 때문에 검은 이미지가 나온다. 창을 앞으로 세운 뒤 `CopyFromScreen`을 쓴다.

**다른 앱의 컨텍스트 메뉴가 최상위로 떠 가린다.** ESC로 안 닫히면 그 앱을 최소화한다. 크롬이 포그라운드라고 보고돼도 화면에는 남의 메뉴가 덮여 있을 수 있다.

**접근성 트리로는 탭바가 안 보인다.** UI Automation으로 크롬 창을 열면 페이지 안의 요소만 잡히고 탭·그룹 헤더는 나오지 않는다. 좌표 방식이 유일하다.

**같은 좌표를 반복해서 누르지 않는다.** 지울 대상이 떨어지면 그 자리에 다른 것이 올라온다. 26.09.07 저장된 탭 그룹을 반복 삭제하다 대상이 바닥난 뒤 그 자리에 온 북마크 폴더를 눌러, 폴더 안 북마크가 통째로 열리며 탭 10개와 그룹 하나가 생겼다. 매 회차 메뉴를 확인하고 누르거나, 남은 개수만큼만 반복한다.

## 탭 그룹 정리

**작업이 끝나면 만든 탭을 `tabs_close_mcp`로 닫는다.** 그룹의 마지막 탭을 닫으면 그룹도 함께 사라진다("Group is now empty (auto-removed)"). 닫지 않으면 창과 그룹이 계속 쌓인다.

다른 세션이 남긴 그룹은 확장에 보이지 않는다. **저장된 탭 그룹은 북마크바에 칩으로 남고**, 북마크바 폭을 넘는 것은 격자 아이콘 목록에 들어간다. 칩을 지우면 목록에 있던 것이 그 자리로 올라온다.

지우는 메뉴는 두 종류이고 항목 구성이 다르다.

| 대상 | 우클릭 메뉴 | 지우는 항목 |
|---|---|---|
| 북마크바의 저장된 그룹 칩 | 그룹 열기 / 새 창에서 열기 / 고정 해제 / **그룹 삭제** | 네 번째 |
| 탭바의 그룹 헤더 | 이름·색 편집 / 새 탭 추가 / 새 창으로 이동 / 그룹 닫기 / 그룹 해제 / **그룹 삭제** | 마지막 |

**파일로 지우려 하지 않는다.** 저장된 탭 그룹은 `Bookmarks` 파일에 없고 `Default/Sync Data/LevelDB`에 들어 있다. 크롬 실행 중에는 잠겨 있고, 잘못 건드리면 북마크·비밀번호까지 위험하다.
