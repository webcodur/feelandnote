// Search Console URL 하나를 검사하고 「색인 생성 요청」을 누른 뒤 결과 대화상자를 확인·닫는다.
// aside repl 코드로만 쓴다 — _scratch-gsc-aside-queue.mjs가 앞에 `const ARGS = [url];`을 붙여 넘긴다.
// openTab()으로 연 탭은 repl 호출이 끝나면 닫히므로 검사·요청·결과 확인을 이 한 호출(120초) 안에 끝낸다.
const TARGET = ARGS[0];
const T0 = Date.now();
const left = () => 108000 - (Date.now() - T0);
const SC = 'https://search.google.com/search-console?resource_id=sc-domain%3Afeelandnote.com';

const openList = await listBrowserTabs();
const scTab = openList.find((x) => /search\.google\.com\/search-console/.test(x.url));
const pg = scTab ? await attachBrowserTab(scTab.targetId) : await openTab(SC);
if (!/search\.google\.com\/search-console/.test(pg.url())) { await pg.goto(SC); await sleep(3000); }

const bodyText = async () => (await pg.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
const RESULT = /색인 생성 요청됨|할당량 초과|오류 발생|문제가 발생했습니다/;

async function waitResult() {
  while (left() > 3000) {
    const b = await bodyText();
    const m = RESULT.exec(b);
    if (m) {
      const at = b.indexOf(m[0]);
      return { status: m[0], text: b.slice(Math.max(0, at - 40), at + 160) };
    }
    await sleep(2000);
  }
  return { status: 'PENDING' };
}

async function closeDialog() {
  const s = await snapshot(pg, { interactive: true });
  const ref = /dialog[\s\S]*?button "닫기" \[ref=(\w+)\]/.exec(String(s.tree))?.[1];
  if (ref) { await pg.locator(ref).click(); } else { await pg.keyboard.press('Escape'); }
  await sleep(800);
}

// 앞 URL의 결과 대화상자가 남아 있으면 먼저 닫는다(남은 문구로 「요청됨」을 오판하지 않게)
if (RESULT.test(await bodyText())) await closeDialog();
let s = await snapshot(pg, { interactive: true });
const cb = /combobox "[^"]*모든 URL 검사" \[ref=(\w+)\]/.exec(String(s.tree))?.[1];
if (!cb) {
  console.log(JSON.stringify({ target: TARGET, status: 'NO_COMBOBOX' }));
} else {
  await pg.locator(cb).fill(TARGET);
  await pg.keyboard.press('Enter');

  // 검사 완료: 본문에 대상 URL이 보이고 스냅숏에 「색인 생성 요청」 버튼이 있을 때만 누른다
  let reqRef = null;
  let state = '';
  while (left() > 70000) {
    await sleep(1500);
    const b = await bodyText();
    if (!b.includes(TARGET)) continue;
    s = await snapshot(pg, { interactive: true });
    reqRef = /(?:button|link) "[^"]*색인 생성 요청[^"]*" \[ref=(\w+)\]/.exec(String(s.tree))?.[1] ?? null;
    state = (/URL이 Google에 등록되어 있(?:지 않)?음/.exec(b) || [''])[0];
    if (reqRef) break;
  }
  if (!reqRef) {
    console.log(JSON.stringify({ target: TARGET, status: 'NO_REQUEST_BUTTON', state }));
  } else {
    await pg.locator(reqRef).click();
    const r = await waitResult();
    if (r.status !== 'PENDING') await closeDialog();
    console.log(JSON.stringify({ target: TARGET, inspected: state, ...r, ms: Date.now() - T0 }));
  }
}
