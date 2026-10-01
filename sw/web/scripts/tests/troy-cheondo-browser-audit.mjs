import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const locale of ['ko', 'en']) {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      if (!sessionStorage.getItem('games-audit-initialized')) {
        localStorage.removeItem('myth-troy:v1');
        localStorage.removeItem('feelandnote:suikoden:save');
        sessionStorage.setItem('games-audit-initialized', '1');
      }
    });
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    const errors = [];
    const missingModels = [];
    page.on('pageerror', error => { errors.push(error.message); console.log('PAGEERROR', error.stack); });
    page.on('console', message => { if (message.type() === 'error') console.log('CONSOLE', message.text()); });
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log('HTTP', response.status(), response.url());
        if (response.url().includes('/models/myth-troy/')) missingModels.push(response.url());
      }
    });
    const body = () => page.$eval('body', b => b.innerText);
    const click = async label => {
      try {
        await page.waitForFunction(label => [...document.querySelectorAll('button')].some(b => b.innerText.includes(label) && !b.disabled), { timeout: 60000 }, label);
      } catch (error) { console.log('WAIT', label, await body(), errors); throw error; }
      for (const button of await page.$$('button')) {
        if (await button.evaluate((b, label) => b.innerText.includes(label) && !b.disabled, label)) {
          await button.click();
          await button.dispose();
          return;
        }
        await button.dispose();
      }
      throw new Error(`Button disappeared: ${label}`);
    };
    const base = `http://localhost:3000/${locale === 'en' ? 'en/' : ''}rest?dev=1`;
    await page.goto(`${base}#troy`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const newCampaign = locale === 'ko' ? '새로 시작' : 'New campaign';
    await page.waitForFunction(label => [...document.querySelectorAll('button')].some(b => b.innerText.trim() === label), { timeout: 60000 }, newCampaign);
    assert.ok(!(await body()).includes(locale === 'ko' ? 'DB에 연결되지 않아' : 'Not connected to the database'), 'Troy must use actual DB');
    await click(newCampaign);
    await click(locale === 'ko' ? '건너뛰기' : 'Skip');
    await click(locale === 'ko' ? '출진' : 'Deploy');
    await click(locale === 'ko' ? '건너뛰기' : 'Skip');
    await page.waitForFunction(() => !!document.querySelector('canvas'), { timeout: 60000 });
    await page.screenshot({ path: `${process.env.TEMP}/troy-mobile-${locale}.png` });
    console.log(`TROY ${locale}: PASS`);
    assert.deepEqual(errors, []);
    assert.deepEqual(missingModels, [], 'Missing Troy 3D models');
    const quitLabel = locale === 'ko' ? '저장하고 나가기' : 'Save and quit';
    await page.locator(`button[aria-label="${quitLabel}"]`).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await click(locale === 'ko' ? '이어 하기' : 'Continue');
    await page.waitForSelector(`button[aria-label="${quitLabel}"]`);
    await page.evaluate(() => localStorage.removeItem('feelandnote:suikoden:save'));
    await page.goto(`${base}#suikoden`, { waitUntil: 'networkidle2', timeout: 60000 });
    await click(locale === 'ko' ? '새로운 천하 열기' : 'Begin a New Realm');
    console.log(`CHEONDO SCENARIOS ${locale}: PASS`);
    await click(locale === 'ko' ? '삼국쟁패' : 'Three Kingdoms');
    console.log(`CHEONDO LORDS ${locale}: PASS`);
    await click(locale === 'ko' ? '유비' : 'Liu Bei');
    await click(locale === 'ko' ? '유비 세력으로 시작' : 'Start as Liu Bei');
    console.log(`CHEONDO WANDER ${locale}: PASS`);
    await click(locale === 'ko' ? '거병:' : 'Raise Army:');
    await page.waitForFunction(() => {
      const saved = JSON.parse(localStorage.getItem('feelandnote:suikoden:save') || 'null');
      return saved?.state.phase === 'strategy';
    });
    console.log(`CHEONDO STRATEGY ${locale}: PASS`);
    await page.screenshot({ path: `${process.env.TEMP}/cheondo-mobile-${locale}.png` });
    assert.deepEqual(errors, []);
    const overflow = await page.$eval('body', b => b.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false, 'Page horizontal overflow');
    await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    await click(locale === 'ko' ? '정복 이어가기' : 'Continue Conquest');
    await page.waitForFunction(() => document.querySelectorAll('button').length > 0 && document.body.innerText.includes('1002'));
    assert.deepEqual(errors, []);
    console.log(`CHEONDO SAVE/RESUME ${locale}: PASS`);
    await page.close();
  }
} finally {
  await browser.close();
}
