import { getBrowser, getNaverPage } from './naver-blog/lib/browser.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const { browser } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
await page.bringToFront();
await page.goto('https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=224399635555', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.se-component.se-image', { timeout: 40000 });
await wait(6000);
const cls = () => page.evaluate(() => String(document.querySelector('.se-component.se-image')?.className ?? ''));
const pos = await page.evaluate(() => {
  const c = document.querySelector('.se-component.se-image');
  c.scrollIntoView({ block: 'center', behavior: 'instant' });
  const i = c.querySelector('img') ?? c;
  const r = i.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(pos.x, pos.y);
await wait(1500);
console.log('고른 뒤:', await cls());

// 정렬은 「돌려가며 바꾸는」 단추다. 가운데가 될 때까지 최대 세 번 누른다.
for (let i = 0; i < 3; i++) {
  const p = await page.evaluate(() => {
    const e = [...document.querySelectorAll('button.se-context-toolbar-cycle-toggle-button')].find((x) => x.offsetParent && /se-align-/.test(String(x.className)));
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, cls: String(e.className).match(/se-align-\w+/)?.[0] };
  });
  if (!p) { console.log('단추 없음'); break; }
  await page.mouse.click(p.x, p.y);
  await wait(1200);
  console.log(`  ${i + 1}번째 (${p.cls} 눌렀음) →`, await cls());
  if (/se-l-center/.test(await cls())) { console.log('  가운데 성공'); break; }
}
browser.disconnect();
