import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { readFile } from 'node:fs/promises';

const baseUrl = process.env.MODAL_CHECK_BASE_URL ?? 'http://localhost:3000';
const browser = await puppeteer.launch({ headless: true });
// Read the shared policy instead of maintaining a second height setting in this check.
const layout = await readFile(new URL('../src/components/ui/modalLayout.ts', import.meta.url), 'utf8');
const ratio = Number(layout.match(/MODAL_MAX_HEIGHT = "(\d+)dvh"/)[1]) / 100;
const sizes = [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }];

async function open(page, query) {
  await page.$$eval('button', (buttons, query) => {
    const button = buttons.find((button) => button.getBoundingClientRect().height > 0 && (
      query.selector ? button.matches(query.selector) : query.label ? button.getAttribute('aria-label') === query.label :
        query.suffix ? button.getAttribute('aria-label')?.endsWith(query.suffix) :
          button.textContent?.trim() === query.text));
    if (!button) throw new Error(`Button missing: ${JSON.stringify(query)}`);
    button.focus({ preventScroll: true });
    button.click();
  }, query);
  await page.waitForSelector('[role="dialog"]');
  await new Promise((resolve) => setTimeout(resolve, 450));
}

async function measure(page, name, viewport) {
  const result = await page.$eval('[role="dialog"]', (dialog) => {
    const rect = dialog.getBoundingClientRect();
    const scrolls = [...dialog.querySelectorAll('*')].filter((element) => {
      const style = getComputedStyle(element);
      return ['auto', 'scroll'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2;
    });
    for (const element of scrolls) element.scrollTop = element.scrollHeight;
    const last = scrolls.map((element) => {
      const rect = element.getBoundingClientRect();
      return { height: element.clientHeight, reachedEnd: element.scrollTop + element.clientHeight >= element.scrollHeight - 2,
        inside: rect.top >= dialog.getBoundingClientRect().top - 1 && rect.bottom <= dialog.getBoundingClientRect().bottom + 1 };
    });
    return { height: rect.height, top: rect.top, bottom: rect.bottom,
      maxHeight: Number.parseFloat(getComputedStyle(dialog).maxHeight), scrolls: last };
  });
  const limit = viewport.height * ratio;
  assert(result.maxHeight <= limit + 1, `${name}: maximum ${result.maxHeight}px exceeds ${limit}px`);
  assert(result.height <= limit + 1, `${name}: actual ${result.height}px exceeds ${limit}px`);
  assert(result.top >= (viewport.height - limit) / 2 - 1, `${name}: top margin lost`);
  assert(result.bottom <= (viewport.height + limit) / 2 + 1, `${name}: bottom margin lost`);
  for (const scroll of result.scrolls) {
    assert(scroll.height > 0 && scroll.reachedEnd && scroll.inside, `${name}: scroll content is clipped ${JSON.stringify(scroll)}`);
  }
  console.log(JSON.stringify({ name, viewport, ...result }));
}

async function close(page) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
}

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const locale of process.argv.includes('--atlas-only') ? [] : ['ko', 'en']) {
    const messages = JSON.parse(await readFile(new URL(`../messages/${locale}/celeb.json`, import.meta.url), 'utf8')).celebPage;
    for (const viewport of sizes) {
      await page.setViewport(viewport);
      await page.goto(`${baseUrl}/${locale}/celeb/steve-jobs`, { waitUntil: 'networkidle2', timeout: 90_000 });
      await page.$eval('#analysis', section => section.scrollIntoView({ block: 'center' }));
      await page.waitForFunction(label => Array.from(document.querySelectorAll('button'))
        .some(button => button.textContent?.trim() === label), { timeout: 60_000 }, messages.ability);
      for (const mode of ['ability', 'virtue']) {
        await open(page, { text: messages[mode] });
        await measure(page, `${locale}/${mode}`, viewport);
        await close(page);
      }
      await open(page, { label: messages.timeline });
      await measure(page, `${locale}/timeline`, viewport);
      const timeline = await page.$eval('[data-timeline-modal]', (element) => {
        const header = element.querySelector('header').getBoundingClientRect();
        const box = element.closest('[role="dialog"]').getBoundingClientRect();
        return header.top >= box.top - 1 && header.bottom <= box.bottom + 1;
      });
      assert(timeline, 'Timeline header scrolls out of its dialog');
      await close(page);
      await open(page, { suffix: locale === 'ko' ? ' · 리뷰 목록' : ' · Review list' });
      await measure(page, `${locale}/review-index`, viewport);
      await close(page);
      await page.$$eval('[data-review-inline-marker]', (markers) => {
        const marker = markers.find((marker) => marker.parentElement.getBoundingClientRect().height > 0);
        if (!marker) throw new Error('Review preview missing');
        marker.parentElement.click();
      });
      await page.waitForSelector('[role="dialog"]');
      await new Promise((resolve) => setTimeout(resolve, 450));
      await measure(page, `${locale}/reading`, viewport);
      await close(page);
    }
  }
  await page.setViewport(sizes[0]);
  await page.goto(`${baseUrl}/ko/explore/myth`, { waitUntil: 'networkidle2', timeout: 90_000 });
  for (const viewport of sizes) {
    await page.setViewport(viewport);
    await open(page, { selector: '[data-atlas-count]' });
    await measure(page, 'atlas-picker', viewport);
    const controls = await page.$eval('[data-atlas-confirm]', (confirm) => {
      const dialog = confirm.closest('[role="dialog"]').getBoundingClientRect();
      const rect = confirm.getBoundingClientRect();
      const list = document.querySelector('[data-atlas-panel]').getBoundingClientRect();
      const picker = document.querySelector('[data-atlas-picker]');
      return { confirmInside: rect.top >= dialog.top && rect.bottom <= dialog.bottom + 1, listHeight: list.height,
        bodyMax: getComputedStyle(picker).maxHeight, headerHeight: picker.closest('[role="dialog"]').style.getPropertyValue('--modal-header-height'),
        parts: [...picker.children].map((part) => ({ height: part.getBoundingClientRect().height, className: part.className })) };
    });
    assert(controls.confirmInside && controls.listHeight >= 40, `Atlas controls clipped: ${JSON.stringify(controls)}`);
    await page.type('[data-atlas-search] input', '그리스');
    await new Promise((resolve) => setTimeout(resolve, 450));
    await measure(page, 'atlas-search', viewport);
    const searchListHeight = await page.$eval('[data-atlas-panel]', (list) => list.clientHeight);
    assert(searchListHeight >= 40, `Search list collapsed to ${searchListHeight}px`);
    // First Escape clears a pending search; the next one closes without applying it.
    await page.keyboard.press('Escape');
    await close(page);
  }
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/ko/celeb/steve-jobs`, { waitUntil: 'networkidle2', timeout: 90_000 });
  await open(page, { text: '음악' });
  await measure(page, 'music', { width: 390, height: 844 });
  await close(page);
  await open(page, { label: '초상화 크게 보기' });
  const fullScreenHeight = await page.$eval('[role="dialog"]', (dialog) => Number.parseFloat(getComputedStyle(dialog).maxHeight));
  assert(fullScreenHeight > 844 * ratio, 'Full-screen image viewer inherited the regular modal height');
  await close(page);
  assert.deepEqual(errors, [], 'Browser reported a page error');
} finally {
  await browser.close();
}
