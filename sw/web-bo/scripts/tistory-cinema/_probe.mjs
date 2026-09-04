import { getBrowser, getTistoryPage, BLOG } from './lib/browser.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const { browser } = await getBrowser();
const page = await getTistoryPage(browser);
await page.bringToFront();
await page.goto(`https://${BLOG}.tistory.com/manage/newpost/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(7000);
const url = page.url();
if (/auth|login|account/.test(url)) { console.log('LOGIN_NEEDED'); browser.disconnect(); process.exit(0); }
const info = await page.evaluate(() => {
  const btn = (re) => [...document.querySelectorAll('button, a')].filter((b) => b.offsetParent && re.test(b.textContent)).map((b) => (b.id || b.className || '').slice(0, 46) + ' :: ' + b.textContent.trim().slice(0, 18));
  return {
    title: [...document.querySelectorAll('input, textarea')].filter((e) => /제목/.test(e.placeholder ?? '')).map((e) => e.id || e.className.slice(0, 40)),
    mode: btn(/기본모드|마크다운|HTML/),
    cat: btn(/카테고리/),
    tag: [...document.querySelectorAll('input')].filter((e) => /태그/.test(e.placeholder ?? '')).map((e) => e.id || e.className.slice(0, 40)),
    done: btn(/완료/),
  };
});
console.log(JSON.stringify(info, null, 1));
browser.disconnect();
