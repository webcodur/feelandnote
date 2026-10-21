import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

// Exercise the served page, including hydration; component fixtures cannot catch dev-channel failures.
const origins = process.env.ATLAS_CHECK_BASE_URL
  ? [process.env.ATLAS_CHECK_BASE_URL]
  : ['http://[::1]:3000', 'http://127.0.0.1:3000', 'http://localhost:3000'];
const paths = ['/explore/myth/homer-odyssey', '/explore/faction/ww2'];
const browser = await puppeteer.launch({ headless: true });
async function click(page, selector) {
  // Native smooth scrolling can move a distant control under the fixed header during automation.
  await page.$eval(selector, element => element.scrollIntoView({ behavior: 'instant', block: 'center' }));
  await page.locator(selector).click();
}
try {
  for (const origin of origins) {
    for (const path of paths) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 1000 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.setDefaultTimeout(30_000);
      const url = `${origin}${path}#atlas-selection`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        const toggle = '[data-member-description-toggle]';
        await page.waitForFunction(selector => document.querySelector(selector)?.onclick != null, {}, toggle);
        const headings = await page.evaluate(() => ['selection', 'overview', 'members', 'shelf'].map(key => {
          const id = `atlas-${key}`;
          const section = document.getElementById(id);
          return {
            id,
            title: section?.querySelector(':scope > [data-hub-header] > h2')?.textContent,
            number: section?.querySelector(':scope > [data-hub-header] [data-number]')?.getAttribute('data-number'),
            nav: document.querySelector(`[data-atlas-section="${id}"]`)?.textContent,
          };
        }));
        for (const [index, heading] of headings.entries()) {
          assert.ok(heading.title, `Section title missing: ${heading.id}`);
          assert.equal(heading.number, String(index + 1).padStart(2, '0'));
          assert.ok(heading.nav?.includes(heading.title), `Contents title differs from section: ${heading.id}`);
        }
        assert.equal(await page.$('[data-atlas-index]'), null, 'The full catalog belongs on its own page');
        assert.equal(await page.$eval('[data-atlas-catalog-link]', element => element.getAttribute('href')), path.includes('/myth/') ? '/explore/myth' : '/explore/faction');
        const overview = '[data-overview-trigger]';
        assert.equal(await page.$eval(overview, element => element.getAttribute('aria-expanded')), 'true', 'Overview starts expanded');
        await page.waitForSelector('[data-overview-content]', { visible: true });
        const overviewText = await page.$eval('[data-overview-text]', element => element.textContent);
        assert.ok(overviewText.trim().length > 0, 'Overview text must be present on the served page');
        assert.equal(await page.$eval(overview, element => element.closest('[data-overview-content]') !== null), true, 'Collapse belongs at the end of the expanded body');
        await click(page, overview);
        await page.waitForSelector('[data-overview-content]', { hidden: true });
        await page.waitForSelector('[data-overview-preview]', { visible: true });
        const previewText = await page.$eval('[data-overview-preview]', element => element.textContent);
        assert.ok(previewText.length < overviewText.length, 'Collapsed overview keeps a short preview');
        assert.match(previewText, /…$/);
        assert.notEqual(await page.$eval('[data-overview-preview] > span', element => getComputedStyle(element).maskImage), 'none', 'Collapsed text uses the shared end fade');
        assert.equal(await page.$('[role="dialog"]'), null, 'Overview collapses inline');
        await click(page, '[data-overview-preview]');
        await page.waitForSelector('[data-overview-content]', { visible: true });
        await page.waitForSelector('[data-overview-preview]', { hidden: true });
        assert.equal(await page.$eval('[data-overview-text]', element => element.textContent), overviewText);
        assert.equal(await page.$eval('[data-member-group-overview]', element => element.disabled), true, 'All members must disable the group overview');
        assert.match(await page.$eval('[data-atlas-level="2"] [data-atlas-label] [data-atlas-member-count]', element => element.textContent), /\d+/, 'Member count belongs beside the group label');
        assert.equal(await page.$('[data-atlas-value] [data-atlas-member-count]'), null);
        await page.waitForFunction(() => document.querySelector('[data-member-image="portrait"] > button')?.getBoundingClientRect().width >= 280);
        await click(page, toggle);
        await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('aria-checked') === 'false', {}, toggle);
        assert.equal(await page.$('[data-member-description-view]'), null, 'OFF must hide descriptions');
        await click(page, '[data-member-view="avatar"]');
        await click(page, toggle);
        await page.waitForSelector('[data-person-description][data-member-image="avatar"]');
        await click(page, '[data-member-view="portrait"]');
        await page.waitForSelector('[data-person-description][data-member-image="portrait"]');
        await click(page, '[data-atlas-level="1"] [aria-haspopup="dialog"]');
        await page.waitForSelector('[role="dialog"] [data-atlas-picker]');
        await click(page, '[data-atlas-confirm]');
        await page.waitForFunction(() => !document.querySelector('[data-atlas-picker]'));
        const footer = '[data-member-group-footer]';
        await page.waitForSelector(footer, { hidden: true });
        await page.setViewport({ width: 390, height: 844 });
        await page.waitForSelector(footer, { visible: true });
        await click(page, `${footer} [data-atlas-level="2"] > button:last-child`);
        await page.waitForFunction(() => new URLSearchParams(location.search).has('group'));
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'atlas-members', 'Footer navigation starts the new member list');
        const groupNames = await page.$$eval('[data-atlas-level="2"] [data-atlas-value]', elements => elements.map(element => element.textContent));
        assert.equal(groupNames.length, 2);
        assert.equal(groupNames[0], groupNames[1], 'Header and footer must show the same group');
        await click(page, `${footer} [data-atlas-level="2"] > button:first-child`);
        await page.waitForFunction(() => !new URLSearchParams(location.search).has('group'));
        await click(page, `${footer} [aria-haspopup="dialog"]`);
        await page.waitForSelector('[data-atlas-picker]');
        await click(page, '[data-atlas-option]:not([data-atlas-option="all"]):not([disabled])');
        await click(page, '[data-atlas-confirm]');
        await page.waitForSelector('[data-atlas-picker]', { hidden: true });
        await page.waitForFunction(() => new URLSearchParams(location.search).has('group'));
        const memberHeaderTop = await page.$eval('#atlas-members', element => element.getBoundingClientRect().top);
        assert.ok(memberHeaderTop >= 0 && memberHeaderTop < 150, 'Choosing a group from the footer picker must start the member list');
        assert.deepEqual(errors, [], 'Page must not throw during interaction');
        console.log(`PASS ${url}: overview, member views, picker, mobile footer navigation/scroll`);
      } catch (error) {
        throw new Error(`Atlas interaction failed at ${url}: ${error.message}`, { cause: error });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
