import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const origin = process.env.ATLAS_CHECK_BASE_URL || 'http://[::1]:3000';
const browser = await puppeteer.launch({ headless: true });
try {
  for (const locale of ['ko', 'en']) for (const mode of ['myth', 'faction']) {
    const page = await browser.newPage();
    const prefix = locale === 'en' ? '/en' : '';
    const source = `${prefix}/explore/${mode}/${mode === 'myth' ? 'myth-japan' : 'ww2'}`;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(15_000);
    try {
      await page.setViewport({ width: locale === 'ko' ? 390 : 1440, height: 1000 });
      // The route payload must arrive after the modal begins closing, as on a cold production route.
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.searchParams.has('_rsc') && url.pathname !== source) {
          void new Promise(resolve => setTimeout(resolve, 300)).then(() => request.continue());
        } else void request.continue();
      });
      await page.goto(`${origin}${source}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      const open = '[data-atlas-level="1"] [aria-haspopup="dialog"]';
      await page.waitForFunction(selector => document.querySelector(selector)?.onclick != null, {}, open);
      await page.$eval(open, element => element.scrollIntoView({ behavior: 'instant', block: 'center' }));
      await page.locator(open).click();
      await page.waitForSelector('[data-atlas-option]');
      const choice = await page.$$eval('[data-atlas-option]:not([disabled])', elements => {
        const option = elements.find(element => element.getAttribute('aria-pressed') !== 'true');
        return option && { id: option.dataset.atlasOption, name: option.querySelector('span.min-w-0.break-keep')?.textContent?.trim() };
      });
      assert.ok(choice?.name, 'The source must offer another published entry');
      await page.locator(`[data-atlas-option="${choice.id}"]`).click();
      await page.locator('[data-atlas-confirm]').click();
      await page.waitForFunction(source => location.pathname !== source, {}, source);
      await page.waitForFunction(name => document.querySelector('h1')?.textContent?.includes(name), {}, choice.name);
      await page.waitForSelector('[data-atlas-picker]', { hidden: true });
      const destination = new URL(page.url()).pathname;
      assert.ok(destination.startsWith(`${prefix}/explore/${mode}/`));
      assert.notEqual(destination, source, 'Confirming another entry must navigate, not merely dismiss the modal');
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(source => location.pathname === source, {}, source);
      assert.equal(await page.$('[data-atlas-picker]'), null, 'Back returns to the source without reopening the old picker');
      await page.waitForFunction(selector => document.querySelector(selector)?.onclick != null, {}, open);
      await page.$eval(open, element => element.scrollIntoView({ behavior: 'instant', block: 'center' }));
      await page.locator(open).click();
      await page.waitForSelector('[data-atlas-worlds]');
      const other = mode === 'myth' ? 'faction' : 'myth';
      await page.locator(`[data-atlas-worlds] button:${other === 'myth' ? 'first' : 'last'}-child`).click();
      await page.waitForSelector(`[data-atlas-world="${other}"] [data-atlas-option]:not([disabled])`);
      await page.locator('[data-atlas-confirm]:not([disabled])').click();
      await page.waitForFunction(path => location.pathname.startsWith(path), {}, `${prefix}/explore/${other}/`);
      await page.waitForSelector('[data-atlas-picker]', { hidden: true });
      assert.deepEqual(errors, []);
      console.log(`PASS ${locale}/${mode}: picker navigates to ${destination}; Back returns to ${source}; switch to ${other} navigates`);
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
