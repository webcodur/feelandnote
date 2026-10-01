import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
for (const [url, name, vp] of [
  ['http://localhost:3000/ko/explore', 'explore-wide', { width: 1600, height: 900 }],
  ['http://localhost:3000/ko/explore', 'explore-mb', { width: 390, height: 844, isMobile: true, hasTouch: true }],
  ['http://localhost:3000/ko/explore/works', 'works-wide', { width: 1600, height: 900 }],
  ['http://localhost:3000/ko/explore/works', 'works-mb', { width: 390, height: 844, isMobile: true, hasTouch: true }],
  ['http://localhost:3000/ko', 'home-wide', { width: 1600, height: 900 }],
  ['http://localhost:3000/ko', 'home-mb', { width: 390, height: 844, isMobile: true, hasTouch: true }],
]) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[class*="atlasBarInner"], nav[aria-labelledby="atlas-nav-title"]', { timeout: 30000 }).catch(() => console.log(`== ${name} == NAV MISSING`));
  await new Promise(r => setTimeout(r, 2500));
  const s = await page.evaluate(() => {
    const railNav = document.querySelector('nav[aria-labelledby="atlas-nav-title"]');
    const items = railNav ? [...railNav.querySelectorAll('button')].map(b => b.textContent?.trim()) : [];
    return {
      railCount: items.length, railItems: items,
      railVisible: railNav ? getComputedStyle(railNav.closest('div')).display !== 'none' : false,
      barLabel: document.querySelector('[class*="atlasBarCurrent"]')?.textContent?.trim() ?? null,
      barOn: !!document.querySelector('[class*="atlasBarInner"]'),
    };
  });
  console.log(`== ${name} ==`, JSON.stringify(s));
  await page.screenshot({ path: `scratch-${name}.png` });
  await page.close();
}
await browser.close();
