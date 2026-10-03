import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
for (const [url, name, vp] of [
  ['http://localhost:3000/ko/explore', 'explore-wide', { width: 1600, height: 900 }],
  ['http://localhost:3000/ko/explore', 'explore-mb', { width: 390, height: 844, isMobile: true, hasTouch: true }],
  ['http://localhost:3000/ko', 'home-wide', { width: 1600, height: 900 }],
]) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3500));
  const steps = [];
  // 넓은 화면은 레일 항목을 누르고, 좁은 화면은 띠의 › 버튼을 눌러 다음 구획으로 간다
  if (vp.width >= 1340) {
    const clicked = await page.evaluate(() => {
      const items = [...document.querySelectorAll('nav[aria-labelledby="atlas-nav-title"] button')];
      items[items.length - 1]?.click();
      return items[items.length - 1]?.textContent?.trim();
    });
    await new Promise(r => setTimeout(r, 1600));
    steps.push({ clicked, hash: await page.evaluate(() => location.hash), scrollY: await page.evaluate(() => Math.round(scrollY)) });
  } else {
    const clicked = await page.evaluate(() => {
      const steps = [...document.querySelectorAll('[class*="atlasBarStep"]')];
      const next = steps[steps.length - 1];
      next?.click();
      return next?.getAttribute('aria-label');
    });
    await new Promise(r => setTimeout(r, 1600));
    steps.push({ clicked, hash: await page.evaluate(() => location.hash), barLabel: await page.evaluate(() => document.querySelector('[class*="atlasBarCurrent"]')?.textContent?.trim()) });
  }
  // 현재 구획 표시
  steps.push(await page.evaluate(() => {
    const railNav = document.querySelector('nav[aria-labelledby="atlas-nav-title"]');
    return { active: railNav ? [...railNav.querySelectorAll('button')].find(b => b.getAttribute('aria-current'))?.textContent?.trim() ?? null : null,
             barLabel: document.querySelector('[class*="atlasBarCurrent"]')?.textContent?.trim() };
  }));
  console.log(`== ${name} ==`, JSON.stringify(steps));
  await page.screenshot({ path: `scratch-jump-${name}.png` });
  await page.close();
}
await browser.close();
