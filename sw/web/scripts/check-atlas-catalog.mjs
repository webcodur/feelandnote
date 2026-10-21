import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const origin = process.env.ATLAS_CHECK_BASE_URL || 'http://[::1]:3000';
const screenshots = process.env.ATLAS_SCREENSHOT_DIR;
if (screenshots) await mkdir(screenshots, { recursive: true });
const browser = await puppeteer.launch({ headless: true });
async function click(page, selector) {
  await page.$eval(selector, element => element.scrollIntoView({ behavior: 'instant', block: 'center' }));
  await page.locator(selector).click();
}
try {
  for (const locale of ['ko', 'en']) for (const mode of ['myth', 'faction']) {
    const page = await browser.newPage();
    const prefix = locale === 'en' ? '/en' : '';
    const base = `${origin}${prefix}/explore/${mode}`;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(60_000);
    try {
      await page.setViewport({ width: 1440, height: 1000 });
      await page.setCookie({ name: mode === 'myth' ? 'fn-last-myth' : 'fn-last-faction', value: mode === 'myth' ? 'homer-odyssey' : 'ww2', url: origin });
      const response = await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      const html = await response.text();
      await page.waitForFunction(() => document.querySelector('[data-atlas-catalog-theme]')?.onclick != null);
      assert.equal(new URL(page.url()).pathname, `${prefix}/explore/${mode}`, 'A saved item must not replace the catalog');
      const total = await page.$$eval('[data-atlas-catalog-entry]', entries => entries.length);
      assert.ok(total > 0);
      assert.equal((html.match(/data-atlas-catalog-entry=/g) || []).length, total, 'Every entry link must be server-rendered');
      assert.equal(await page.$('#atlas-members'), null, 'The catalog must not fetch or render a member list');
      assert.equal(await page.$('[data-atlas-index]'), null);
      const sections = await page.$$eval('[data-atlas-catalog] [data-hub-section]', elements => elements.map(element => ({ id: element.id, title: element.querySelector('h2')?.textContent })));
      assert.deepEqual(await page.$$eval('[data-atlas-section^="atlas-catalog-"]', elements => elements.map(element => ({ id: element.dataset.atlasSection, title: element.textContent }))), sections, 'Desktop contents list matches catalog section names and order');
      await click(page, `[data-atlas-section="${sections[1].id}"]`);
      await page.waitForFunction(id => location.hash === `#${id}`, {}, sections[1].id);
      const completion = await page.$$eval('[data-atlas-catalog] [data-hub-section]', sections => sections.map(section => ({
        id: section.id.replace('atlas-catalog-', ''),
        names: [...section.querySelectorAll('[data-atlas-scenes-complete] h3')].map(title => title.textContent),
      })));
      const completedTotal = completion.reduce((sum, group) => sum + group.names.length, 0);
      for (const group of [{ id: 'all', names: completion.flatMap(group => group.names) }, ...completion]) {
        const chip = `[data-atlas-catalog-theme="${group.id}"]`;
        const badge = `${chip} [data-scene-completion-count]`;
        assert.equal(await page.$eval(chip, element => Number(element.querySelector('[data-scene-completion-count]')?.dataset.sceneCompletionCount ?? 0)), group.names.length, `Completion count for ${group.id}`);
        if (group.names.length) {
          const tooltip = await page.$eval(badge, element => element.title);
          for (const name of group.names) assert.ok(tooltip.includes(name), `Completed title in ${group.id} tooltip`);
        } else assert.equal(await page.$(badge), null, 'Do not show zero completion badges');
        const option = await page.$eval(`[data-atlas-catalog-select] option[value="${group.id === 'all' ? '' : group.id}"]`, element => element.textContent);
        assert.equal(option.includes(' · '), group.names.length > 0, 'Mobile options show counts only for completed groups');
        if (group.names.length) assert.ok(option.endsWith(locale === 'ko' ? `완성 ${group.names.length}편` : `${group.names.length} complete`));
      }
      const totalBadge = '[data-atlas-catalog-total] [data-scene-completion-count]';
      assert.equal(await page.$eval('[data-atlas-catalog-total]', element => Number(element.querySelector('[data-scene-completion-count]')?.dataset.sceneCompletionCount ?? 0)), completedTotal);
      const recent = await page.$eval('[data-atlas-continue]', element => element.getAttribute('href'));
      assert.ok(recent.includes(mode === 'myth' ? 'homer-odyssey' : 'ww2'));
      const firstTheme = await page.$eval('[data-atlas-catalog-theme]:not([data-atlas-catalog-theme="all"])', element => element.dataset.atlasCatalogTheme);
      await click(page, `[data-atlas-catalog-theme="${firstTheme}"]`);
      assert.equal(await page.$$eval('[data-atlas-catalog] [data-hub-section]', sections => sections.length), 1);
      await page.waitForFunction(() => !document.querySelector('[data-atlas-section^="atlas-catalog-"]'));
      const name = await page.$eval('[data-atlas-catalog-entry] h3', element => element.textContent);
      const input = '[data-atlas-catalog] input[type="search"]';
      await page.locator(input).fill(name);
      assert.ok(await page.$('[data-atlas-catalog-entry]'));
      await page.locator(input).fill('__no_such_atlas_entry__');
      await page.waitForFunction(() => !document.querySelector('[data-atlas-catalog-entry]'));
      if (completedTotal) assert.equal(await page.$eval(totalBadge, element => Number(element.dataset.sceneCompletionCount)), completedTotal, 'Catalog completion totals remain stable during search');
      await click(page, '[data-atlas-catalog] input + button');
      await page.waitForSelector('[data-atlas-catalog-entry]');
      await click(page, '[data-atlas-catalog-theme="all"]');
      assert.equal(await page.$$eval('[data-atlas-catalog-entry]', entries => entries.length), total);
      for (const width of [320, 390, 640, 768, 1024, 1440]) {
        await page.setViewport({ width, height: width < 640 ? 844 : 1000 });
        const geometry = await page.$eval('[data-atlas-catalog-entry]', entry => ({
          columns: getComputedStyle(entry.parentElement).gridTemplateColumns.split(' ').length,
          width: entry.getBoundingClientRect().width,
          overflow: document.documentElement.scrollWidth > innerWidth,
        }));
        assert.equal(geometry.overflow, false, `Overflow at ${width}px`);
        assert.equal(geometry.columns, width < 640 ? 1 : width < 1024 ? 2 : 3, `Columns at ${width}px`);
        assert.ok(geometry.width >= 250, `Cards must remain readable at ${width}px`);
      }
      if (screenshots && locale === 'ko') {
        await page.$eval('[data-atlas-catalog]', element => { window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }); });
        await page.screenshot({ path: path.join(screenshots, `atlas-catalog-${mode}-desktop.png`) });
      }
      await page.setViewport({ width: 390, height: 844 });
      const contentsButton = `button[aria-label="${locale === 'ko' ? '구획 목차 열기' : 'Open section menu'}"]`;
      await page.locator(contentsButton).click();
      await page.waitForSelector('[role="dialog"] [data-chapter="02"]');
      await click(page, '[role="dialog"] [data-chapter="02"]');
      await page.waitForSelector('[role="dialog"]', { hidden: true });
      await page.waitForFunction(id => location.hash === `#${id}`, {}, sections[1].id);
      await page.select('[data-atlas-catalog-select]', firstTheme);
      assert.equal(await page.$$eval('[data-atlas-catalog] [data-hub-section]', sections => sections.length), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile must not overflow horizontally');
      if (screenshots && locale === 'ko') {
        await page.$eval('[data-atlas-catalog]', element => { window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - 72, behavior: 'instant' }); });
        await page.screenshot({ path: path.join(screenshots, `atlas-catalog-${mode}-mobile.png`) });
      }
      // Enter follows the real card link, then the detail returns to the catalog.
      await page.focus('[data-atlas-catalog-entry]');
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.keyboard.press('Enter')]);
      await page.waitForSelector('[data-atlas-catalog-link]');
      assert.deepEqual(await page.$$eval('[data-atlas-catalog-link]', elements => elements.map(element => element.getAttribute('href'))), [`${prefix}/explore/${mode}`], 'The current world button returns to its localized catalog');
      assert.ok(await page.$('nav [data-atlas-catalog-link][aria-current="page"]'), 'The active world remains clickable on detail pages');
      assert.equal(await page.$('[data-atlas-mode] [data-atlas-catalog-link]'), null, 'No separate catalog button remains in the detail content');
      assert.equal(await page.$('#atlas-index'), null, 'Detail no longer repeats the full catalog');
      assert.equal(await page.$eval('[data-atlas-catalog-link]', element => element.getAttribute('href')), `${prefix}/explore/${mode}`);
      await page.waitForFunction(() => document.querySelector('[data-atlas-catalog-link]')?.onclick != null);
      await click(page, 'nav [data-atlas-catalog-link]');
      await page.waitForSelector('[data-atlas-catalog]');
      await page.goto(`${base}?section=${encodeURIComponent(firstTheme)}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-atlas-catalog-entry]');
      assert.equal(await page.$$eval('[data-atlas-catalog] [data-hub-section]', sections => sections.length), 1, 'Legacy section links filter the catalog');
      assert.deepEqual(errors, []);
      console.log(`PASS ${locale}/${mode}: ${total} SSR links; ${completedTotal} complete; completion badges, recent, filters, search, mobile, keyboard, detail return`);
    } catch (error) {
      throw new Error(`Catalog check failed for ${locale}/${mode} at ${page.url()}: ${error.message}`, { cause: error });
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
