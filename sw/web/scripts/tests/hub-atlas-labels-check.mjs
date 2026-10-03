import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
for (const [url, name, vp] of [
  ['http://localhost:3000/ko', 'home-wide-ko', { width: 1600, height: 900 }],
  ['http://localhost:3000/ko', 'home-mb-ko', { width: 390, height: 844, isMobile: true, hasTouch: true }],
  ['http://localhost:3000/en', 'home-wide-en', { width: 1600, height: 900 }],
  ['http://localhost:3000/en/explore/works', 'works-mb-en', { width: 390, height: 844, isMobile: true, hasTouch: true }],
  ['http://localhost:3000/en/explore', 'explore-wide-en', { width: 1600, height: 900 }],
]) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  const s = await page.evaluate(() => {
    const railNav = document.querySelector('nav[aria-labelledby="atlas-nav-title"]');
    const items = railNav ? [...railNav.querySelectorAll('button')].map(b => ({ text: b.textContent?.trim(), wrapped: b.scrollHeight > b.clientHeight + 2 })) : [];
    const barLabel = document.querySelector('[class*="atlasBarLabel"]');
    return {
      railItems: items,
      barLabel: barLabel?.textContent?.trim() ?? null,
      barOverflow: barLabel ? barLabel.scrollWidth > barLabel.clientWidth + 1 : null,
    };
  });
  console.log(`== ${name} ==`, JSON.stringify(s));
  await page.screenshot({ path: `scratch-${name}.png` });
  await page.close();
}
await browser.close();
