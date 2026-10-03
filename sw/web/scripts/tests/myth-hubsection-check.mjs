import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
for (const [url, name, vp] of [
  ['http://localhost:3000/ko/explore/myth', 'myth-wide', { width: 1600, height: 900 }],
  ['http://localhost:3000/ko/explore/myth', 'myth-mb', { width: 390, height: 844, isMobile: true, hasTouch: true }],
  ['http://localhost:3000/ko/explore/faction/ai-pioneers', 'faction-wide', { width: 1600, height: 900 }],
]) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('section[id^="atlas-"] h2, nav[aria-labelledby="atlas-nav-title"]', { timeout: 30000 }).catch(() => console.log(`== ${name} == NAV MISSING`));
  await new Promise(r => setTimeout(r, 3000));
  const s = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('section[id^="atlas-"]')].map(sec => ({
      id: sec.id,
      number: sec.querySelector('[data-number]')?.getAttribute('data-number') ?? null,
      title: sec.querySelector('h2')?.textContent?.trim() ?? null,
    }));
    const railItems = [...document.querySelectorAll('nav[aria-labelledby="atlas-nav-title"] :is(a,button)')].map(b => b.textContent?.trim());
    return { heads, railItems, bar: document.querySelector('[class*="atlasBarCurrent"]')?.textContent?.trim() ?? null };
  });
  console.log(`== ${name} ==`, JSON.stringify(s));
  await page.screenshot({ path: `scratch-${name}-hs.png` });
  await page.close();
}
await browser.close();
