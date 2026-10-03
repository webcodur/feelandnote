import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const navSel = 'nav[aria-labelledby="atlas-nav-title"]';
const itemSel = `${navSel} :is(a, button)`;

for (const [url, name, vp] of [
  ['http://localhost:3000/ko/rest', 'rest-wide', { width: 1600, height: 900 }],
  ['http://localhost:3000/ko/rest', 'rest-mb', { width: 390, height: 844, isMobile: true, hasTouch: true }],
  ['http://localhost:3000/ko/explore/works/museum', 'museum-wide', { width: 1600, height: 900 }],
  ['http://localhost:3000/ko/explore/works/museum', 'museum-mb', { width: 390, height: 844, isMobile: true, hasTouch: true }],
]) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector(`${navSel}, [class*="atlasBarInner"]`, { timeout: 30000 }).catch(() => console.log(`== ${name} == NAV MISSING`));
  await new Promise(r => setTimeout(r, 3000));
  const s = await page.evaluate((navSel, itemSel) => {
    const railNav = document.querySelector(navSel);
    const items = railNav ? [...railNav.querySelectorAll('a, button')].map(b => ({
      text: b.textContent?.trim(), href: b.getAttribute('href') ?? null,
    })) : [];
    const railBox = railNav?.closest('div');
    const bar = document.querySelector('[class*="atlasBarInner"]');
    return {
      railCount: items.length, railItems: items,
      railVisible: railBox ? getComputedStyle(railBox).display !== 'none' && railBox.getBoundingClientRect().width > 0 : false,
      barLabel: document.querySelector('[class*="atlasBarCurrent"]')?.textContent?.trim() ?? null,
      barVisible: bar ? getComputedStyle(bar.closest('div[class*="atlasBar"]')).display !== 'none' : false,
      barOverflow: bar ? bar.scrollWidth > bar.clientWidth + 2 : null,
    };
  }, navSel, itemSel);
  console.log(`== ${name} ==`, JSON.stringify(s));
  await page.screenshot({ path: `scratch-${name}.png` });
  await page.close();
}

// rest — 목차 클릭이 /rest#<게임> 해시로 가 게임을 연다
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  await page.goto('http://localhost:3000/ko/rest', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector(`${itemSel}`, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  const href = await page.evaluate((itemSel) => document.querySelector(itemSel)?.getAttribute('href'), itemSel);
  await page.click(itemSel);
  await new Promise(r => setTimeout(r, 1500));
  const after = await page.evaluate(() => ({
    hash: window.location.hash,
    overlay: !!document.querySelector('[class*="fixed"][class*="inset-0"], [role="dialog"], [class*="fullscreen"]'),
    bodyText: document.body.innerText.slice(0, 0),
  }));
  console.log('== rest-click ==', JSON.stringify({ clickedHref: href, hash: after.hash, overlay: after.overlay }));
  await page.screenshot({ path: 'scratch-rest-click.png' });
  await page.close();
}

// museum — 레일 클릭이 부드럽게 굴러 해시·활성 추적이 따라간다
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  await page.goto('http://localhost:3000/ko/explore/works/museum', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector(itemSel, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  const count = await page.evaluate((itemSel) => document.querySelectorAll(itemSel).length, itemSel);
  const lastSel = `${itemSel}:nth-last-of-type(1)`;
  await page.evaluate((itemSel) => {
    const items = [...document.querySelectorAll(itemSel)];
    items[items.length - 1]?.click();
  }, itemSel);
  const y150 = await page.evaluate(() => window.scrollY);
  await new Promise(r => setTimeout(r, 150));
  const yMid = await page.evaluate(() => window.scrollY);
  await new Promise(r => setTimeout(r, 1800));
  const s = await page.evaluate((navSel) => ({
    y: window.scrollY,
    hash: window.location.hash,
    active: document.querySelector(`${navSel} [aria-current="location"]`)?.textContent?.trim() ?? null,
    barLabel: document.querySelector('[class*="atlasBarCurrent"]')?.textContent?.trim() ?? null,
  }), navSel);
  console.log('== museum-jump ==', JSON.stringify({ count, y150, yMid, ...s }));
  await page.close();
}
await browser.close();
