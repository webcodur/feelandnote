import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const english = process.argv.includes('--en');
const mobile = process.argv.includes('--mobile');
const labels = english
  ? { start: 'Start battle', auto: 'Auto draft', next: 'Appoint captain', captain: 'Appoint ', battle: 'Choose a figure', result: 'Rematch' }
  : { start: '대전 시작', auto: '자동 선발', next: '주장 임명으로', captain: '주장으로', battle: '출전할 인물을 고르세요', result: '다시 대전' };
const suffix = `${english ? 'en' : 'ko'}-${mobile ? 'mobile' : 'desktop'}`;
try {
  const page = await browser.newPage();
  await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.log('PAGEERROR', error.stack); });
  page.on('console', message => { if (message.type() === 'error') console.log('CONSOLE', message.text()); });
  const text = () => page.$eval('body', element => element.innerText);
  const click = async name => {
    try {
      await page.waitForFunction(name => [...document.querySelectorAll('button')].some(b => b.innerText.trim().startsWith(name) && !b.disabled), {}, name);
    } catch (error) {
      console.log('WAIT FAILED', name, await text());
      console.log('RUNTIME ERRORS', errors);
      throw error;
    }
    for (const button of await page.$$('button')) {
      if (await button.evaluate((b, name) => b.innerText.trim().startsWith(name) && !b.disabled, name)) {
        await button.asLocator().click();
        return;
      }
      await button.dispose();
    }
    throw new Error(`Button disappeared: ${name}`);
  };
  await page.goto(`http://localhost:3000/${english ? 'en/' : ''}rest?dev=1#hegemony`, { waitUntil: 'networkidle2' });
  await click(labels.start);
  await click(labels.auto);
  await page.screenshot({ path: `${process.env.TEMP}/hegemony-draft-${suffix}.png` });
  await click(labels.next);
  await page.waitForFunction(label => [...document.querySelectorAll('button')].some(b => b.innerText.includes(label)), {}, labels.captain);
  const captainLabel = await page.$$eval('button', (buttons, label) => buttons.find(b => b.innerText.includes(label)).innerText.split('\n')[0], labels.captain);
  await click(captainLabel);
  await page.waitForFunction(label => document.body.innerText.includes(label), {}, labels.battle);
  await page.screenshot({ path: `${process.env.TEMP}/hegemony-battle-${suffix}.png` });
  // 진행 상태별 단축키를 사용한다. 접전은 일기토를 거절하고 결산한다.
  for (let i = 0; i < 120; i++) {
    const body = await text();
    if (body.includes(labels.result)) break;
    await page.keyboard.press('2');
    await page.keyboard.press('1');
    await page.keyboard.press('q');
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  assert.ok((await text()).includes(labels.result), 'Battle must reach the result screen');
  await page.screenshot({ path: `${process.env.TEMP}/hegemony-result-${suffix}.png` });
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('feelandnote:hegemony:records:v1')));
  assert.equal(records.recent.length, 1, 'A finished match is recorded once');
  console.log(suffix, 'draft → captain → battle → result', records.recent[0]);
  assert.deepEqual(errors, [], 'Browser runtime errors');
} finally {
  await browser.close();
}
