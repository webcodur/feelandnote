import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const baseUrl = process.env.TIMELINE_CHECK_BASE_URL ?? 'http://localhost:3000';
const browser = await puppeteer.launch({ headless: true });
const scenarios = [
  { name: 'PC inline', width: 1440, locale: 'ko' },
  { name: 'mobile inline', width: 390, locale: 'en' },
  { name: 'PC expanded', width: 1440, locale: 'ko', expanded: true },
  { name: 'mobile expanded', width: 390, locale: 'ko', expanded: true },
];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: scenario.width, height: 900, isMobile: scenario.width < 768, hasTouch: scenario.width < 768 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    // Observe the rendered country coordinates, so a pulse alone cannot pass as a rotation.
    await page.evaluateOnNewDocument(() => {
      window.countryLabels = new WeakMap();
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...rest) {
        let labels = window.countryLabels.get(this.canvas);
        if (!labels) window.countryLabels.set(this.canvas, labels = new Map());
        labels.set(text, { x, y });
        return fillText.call(this, text, x, y, ...rest);
      };
    });
    await page.goto(`${baseUrl}/${scenario.locale}/explore/timeline?country=US`, { waitUntil: 'networkidle2', timeout: 60_000 });
    await page.waitForSelector('[data-timeline-globe] canvas');
    await page.click('[data-timeline-toolbar] button');
    await page.waitForFunction(() => document.querySelectorAll('.collapse-grid[data-open="true"]').length === 0);
    if (scenario.expanded) await page.click('[data-timeline-globe] button.absolute.bottom-2');
    const selector = scenario.expanded ? '[data-timeline-globe-expanded] canvas' : '[data-timeline-globe] canvas';
    const name = scenario.locale === 'ko' ? '캐나다' : 'Canada';
    await page.waitForFunction((selector, name) => {
      const canvas = document.querySelector(selector);
      return canvas && window.countryLabels.get(canvas)?.has(name);
    }, {}, selector, name);
    // Let the initial focus pulse finish before measuring the next selection.
    await new Promise(resolve => setTimeout(resolve, 1100));
    const point = await page.$eval(selector, (canvas, name) => {
      const position = window.countryLabels.get(canvas).get(name);
      const bounds = canvas.getBoundingClientRect();
      return { x: bounds.x + position.x, y: bounds.y + position.y - 4 };
    }, name);
    await page.evaluate((selector, name) => {
      window.selectedCanvas = document.querySelector(selector);
      window.previousEra = document.querySelector('.collapse-grid');
      window.rotationFrames = [];
      const started = performance.now();
      const sample = () => {
        const canvas = document.querySelector(selector);
        const point = canvas && window.countryLabels.get(canvas)?.get(name);
        if (point) window.rotationFrames.push({ x: point.x, y: point.y });
        if (performance.now() - started < 4000) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, selector, name);
    if (scenario.width < 768) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
    await page.waitForFunction(() => document.querySelector('[data-timeline-globe]')?.dataset.country === 'CA', { timeout: 15_000 });
    await new Promise(resolve => setTimeout(resolve, 1800));
    const result = await page.evaluate(selector => ({
      sameCanvas: document.querySelector(selector) === window.selectedCanvas,
      changedEra: document.querySelector('.collapse-grid') !== window.previousEra,
      openEras: document.querySelectorAll('.collapse-grid[data-open="true"]').length,
      expanded: !!document.querySelector('[data-timeline-globe-expanded]'),
      positions: new Set(window.rotationFrames.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)).size,
    }), selector);
    assert.equal(result.sameCanvas, true, `${scenario.name}: country navigation replaced the globe`);
    assert.ok(result.positions >= 8, `${scenario.name}: missing intermediate rotation positions`);
    assert.equal(result.changedEra, true, `${scenario.name}: country figures did not reset`);
    assert.ok(result.openEras > 0, `${scenario.name}: previous country's collapsed state leaked`);
    assert.equal(result.expanded, !!scenario.expanded, `${scenario.name}: expanded view closed during selection`);
    assert.deepEqual(errors, []);
    console.log(`${scenario.name}: PASS (${result.positions} intermediate positions)`);
    await page.close();
  }
} finally {
  await browser.close();
}
