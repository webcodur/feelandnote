// 편집기 정렬 메뉴의 실제 DOM을 찍어 본다. 진단용이며 글을 고치지 않는다.
// 사용: node scripts/naver-blog/inspect-align.mjs   (sw/web-bo 에서)
import puppeteer from 'puppeteer';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null, protocolTimeout: 60000 });
const pages = await browser.pages();
const page = pages.find((p) => p.url().includes('blog.naver.com')) ?? pages[0];
console.log('현재 주소:', page.url().slice(0, 90));

const before = await page.evaluate(() =>
  [...document.querySelectorAll('[class*=se-toolbar-item]')].map((e) => e.className).slice(0, 40));
console.log('\n툴바 항목 클래스');
before.forEach((c) => console.log('  ', String(c).slice(0, 70)));

const t = await page.evaluate(() => {
  const e = document.querySelector('.se-toolbar-item-align .se-property-toolbar-drop-down-button');
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, cls: e.className, vis: r.width > 0 };
});
console.log('\n정렬 드롭다운 단추:', JSON.stringify(t));
if (!t) { await browser.disconnect(); process.exit(0); }

await page.mouse.click(t.x, t.y); await wait(1400);
const items = await page.evaluate(() => {
  const box = document.querySelector('.se-toolbar-item-align');
  const inside = box ? [...box.querySelectorAll('button,li,a')] : [];
  const layers = [...document.querySelectorAll('[class*=layer],[class*=drop-down],[class*=dropdown]')]
    .filter((x) => x.offsetParent)
    .flatMap((x) => [...x.querySelectorAll('button,li,a')]);
  return [...new Set([...inside, ...layers])]
    .filter((x) => x.offsetParent)
    .map((x) => ({ tag: x.tagName, aria: x.getAttribute('aria-label'), txt: (x.textContent || '').trim().slice(0, 24), cls: String(x.className).slice(0, 56) }));
});
console.log('\n정렬 메뉴를 연 뒤 보이는 항목');
items.forEach((i) => console.log('  ', JSON.stringify(i)));

await page.keyboard.press('Escape');
await browser.disconnect();
