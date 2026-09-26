import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer';

const source = await readFile('src/lib/faction-theme.ts', 'utf8');
const requested = new Set(process.argv.slice(2));
const entries = [...source.matchAll(/"([a-z0-9-]+)": "(\/images\/factions\/themes\/[^"]+)"/g)]
  .filter(([, slug]) => !requested.size || requested.has(slug));
assert.ok(entries.length > 0);
const output = resolve('../../data/faction-theme-art/preview', `artwork-${Date.now()}`);
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ headless: true });
const errors = [];
try {
  // 화면 캡처는 한 페이지를 재사용해 백그라운드 탭의 렌더 지연을 피한다.
  let next = 0;
  await Promise.all(Array.from({ length: 1 }, async () => {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1100 });
    page.setDefaultTimeout(60000);
    while (next < entries.length) {
      const [, slug, asset] = entries[next++];
      await page.goto(`http://localhost:3000/explore/faction/${slug}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForFunction(asset => {
        const image = document.querySelector('[data-artwork] img');
        return image?.naturalWidth > 0 && image.getAttribute('src') === asset;
      }, {}, asset);
      const panel = await page.$('[data-artwork]');
      await panel.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      // BlurDissolve가 끝난 화면으로 남긴다.
      await page.waitForFunction(() => {
        const wrapper = document.querySelector('[data-artwork] img')?.parentElement;
        return wrapper && getComputedStyle(wrapper).opacity === '1' && !wrapper.className.includes('[transition:');
      });
      await panel.screenshot({ path: resolve(output, `${slug}.png`) });
      console.log(`PASS ${slug}`);
    }
  }));
  assert.deepEqual(errors, []);
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
}
