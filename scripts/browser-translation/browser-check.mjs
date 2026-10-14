import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { serve } from './serve.mjs';
const require = createRequire(new URL('../../sw/web/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const output = resolve('.artifacts/browser-translation');
await mkdir(output, { recursive: true });
const server = await serve();
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({ headless: true });
const results = [];
const errors = [];
async function testPage({ ua, absent = false, failure = false } = {}) {
  const page = await browser.newPage();
  if (ua) await page.setUserAgent(ua);
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument((absent, failure) => {
    window.__translationMock = true;
    Object.defineProperty(globalThis, 'Translator', { configurable: true, value: absent ? undefined : {
      availability: async () => 'available',
      create: async ({ targetLanguage }) => {
        await new Promise(resolve => setTimeout(resolve, 30));
        if (failure) throw new Error('MOCK model failure');
        return { translate: async text => {
          await new Promise(resolve => setTimeout(resolve, 160));
          return `TEST[${targetLanguage}] · ${text.length}`;
        }, destroy() {} };
      },
    } });
  }, absent, failure);
  await page.goto(url);
  await page.waitForFunction(() => !!window.translationLab);
  return page;
}
const settled = (page, id = 'intro') => page.waitForFunction(id =>
  document.getElementById(id).dataset.state === 'translated', {}, id);
try {
  const page = await testPage();
  await page.waitForFunction(() => !document.querySelector('#start').disabled);
  assert.equal(await page.$eval('#intro', node => node.dataset.state), 'pending');
  await page.click('#start');
  assert.notEqual(await page.$eval('#intro', node => node.textContent), await page.evaluate(() => window.translationLab.sources.intro));
  await settled(page);
  assert.match(await page.$eval('#intro', node => node.textContent), /^TEST\[zh\]/);
  results.push('Pending text never displays the English source before translation');
  await page.click('#open');
  await page.click('#next'); await page.click('#next'); await settled(page, 'review');
  assert.equal(await page.$eval('#review', node => node.textContent), 'TEST[zh] · 43\n\nTEST[zh] · 192\n\nTEST[zh] · 132');
  results.push('Rapid modal data changes cannot show a late result from an older review');
  await page.click('#close');
  const calls = await page.evaluate(() => window.translationLab.engine.metrics.calls);
  await page.click('#open'); await settled(page, 'review');
  assert.equal(await page.evaluate(() => window.translationLab.engine.metrics.calls), calls);
  results.push('Closing and reopening a modal reuses the translated value');
  await page.click('#close');
  await page.select('#language', 'es'); await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await page.click('#start'); await page.select('#language', 'de');
  await page.waitForFunction(() => !document.querySelector('#start').disabled); await page.click('#start'); await settled(page);
  assert.match(await page.$eval('#intro', node => node.textContent), /^TEST\[de\]/);
  results.push('Rapid language switches display only the latest selected language');
  await page.select('#language', 'fr'); await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await page.click('#start'); await page.click('#original');
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(await page.$eval('#intro', node => node.textContent), await page.evaluate(() => window.translationLab.sources.intro));
  results.push('English original remains visible when a cancelled translation completes later');
  await page.select('#language', 'zh'); await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await page.click('#start'); await settled(page);
  const prior = await page.evaluate(() => window.translationLab.engine.metrics.calls);
  await page.reload(); await page.waitForFunction(() => !document.querySelector('#start').disabled);
  await page.click('#start'); await settled(page);
  assert.equal(await page.evaluate(() => window.translationLab.engine.metrics.calls), 0);
  assert(prior > 0);
  results.push('Reloading keeps language preference and reuses persistent device cache');
  await page.close();
  const platforms = [
    ['ios', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605 Safari/604'],
    ['ios-chrome', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605 CriOS/154 Safari/604'],
    ['android', 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537 Chrome/154 Mobile Safari/537'],
    ['ios-wechat', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) MicroMessenger/8.0'],
  ];
  for (const [name, ua] of platforms) {
    const mobile = await testPage({ ua, absent: true }); await mobile.setViewport({ width: 390, height: 844 });
    await mobile.waitForSelector('#fallback:not([hidden])');
    assert(await mobile.$eval('#start', node => node.disabled));
    assert.equal(await mobile.$eval('#intro', node => node.dataset.state), 'unavailable');
    const advice = await mobile.$eval('#advice', node => node.textContent);
    assert(advice.includes(['ios', 'ios-wechat'].includes(name) ? 'Safari' : 'Chrome'));
    const guide = await mobile.$eval('#guide', node => node.href);
    if (name === 'ios-chrome') assert(guide.includes('Platform%3DiOS'));
    if (name === 'ios-wechat') assert(advice.includes('应用菜单'));
    assert(!advice.includes('安装Chrome'));
    await mobile.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied'); } } }));
    await mobile.click('#copy-link'); await mobile.waitForSelector('#page-link:not([hidden])');
    assert.equal(await mobile.$eval('#page-link', node => node.value), url);
    await mobile.click('#original'); await mobile.click('#open');
    assert.equal(await mobile.$eval('#review', node => node.textContent), await mobile.evaluate(() => window.translationLab.sources.reviews[0]));
    await mobile.click('#close');
    assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mobile.screenshot({ path: resolve(output, `${name}-fallback.png`), fullPage: true });
    results.push(`SIMULATED ${name}: localized guidance, manual copy, English modal, no overflow`);
    await mobile.close();
  }
  const failure = await testPage({ failure: true });
  await failure.waitForFunction(() => !document.querySelector('#start').disabled); await failure.click('#start');
  await failure.waitForFunction(() => document.querySelector('#intro').dataset.state === 'failed');
  await failure.click('#original');
  assert.equal(await failure.$eval('#intro', node => node.textContent), await failure.evaluate(() => window.translationLab.sources.intro));
  results.push('Failed model preparation offers a working original view'); await failure.close();
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'browser-check.json'), JSON.stringify({ type: 'MOCK API + desktop browser UA simulation', results, errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length, results, errors }, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
