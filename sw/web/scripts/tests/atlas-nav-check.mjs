import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
for (const [url, name, vp] of [
  ['http://localhost:3000/celeb/abraham-lincoln', 'celeb-wide', { width: 1600, height: 900 }],
  ['http://localhost:3000/celeb/abraham-lincoln', 'celeb-mb', { width: 390, height: 844, isMobile: true, hasTouch: true }],
]) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('nav[aria-labelledby="atlas-nav-title"], [class*="atlasBar"]', { timeout: 30000 }).catch(() => console.log(`== ${name} == NAV MISSING`));
  await new Promise(r => setTimeout(r, 2500));
  const s = await page.evaluate(() => {
    const railNav = document.querySelector('nav[aria-labelledby="atlas-nav-title"]');
    const railBox = railNav?.closest('div');
    return {
      railCount: railNav?.querySelectorAll('button').length ?? 0,
      railBox: railBox ? { display: getComputedStyle(railBox).display, left: Math.round(railBox.getBoundingClientRect().left), top: Math.round(railBox.getBoundingClientRect().top) } : null,
      barLabel: document.querySelector('[class*="atlasBarCurrent"]')?.textContent ?? null,
      barOn: !!document.querySelector('[class*="atlasBarInner"]'),
    };
  });
  console.log(`== ${name} ==`, JSON.stringify(s));
  await page.screenshot({ path: `scratch-${name}.png` });
  await page.close();
}
await browser.close();
