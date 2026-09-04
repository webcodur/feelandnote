import { getBrowser, getNaverPage } from './naver-blog/lib/browser.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const { browser } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await page.bringToFront();
await page.goto('https://blog.naver.com/dmx777/postwrite', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.se-documentTitle .se-text-paragraph', { timeout: 40000 });
await wait(5000);
const items = await page.evaluate(() =>
  [...document.querySelectorAll('.se-toolbar-item')].map((e) => ({
    cls: String(e.className).replace('se-toolbar-item ', '').slice(0, 46),
    txt: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 14),
  })));
items.forEach((i) => console.log(i.txt.padEnd(16), i.cls));
browser.disconnect();
