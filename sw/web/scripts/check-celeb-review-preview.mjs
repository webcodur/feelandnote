import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const baseUrl = (process.env.REVIEW_PREVIEW_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const browser = await puppeteer.launch({ headless: true });

try {
  for (const locale of ['ko', 'en']) {
    for (const slug of ['steve-jobs', 'bill-gates']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(`${baseUrl}/${locale}/celeb/${slug}`, { waitUntil: 'networkidle2', timeout: 90_000 });
      await page.waitForSelector('#library');
      await page.$eval('#library', (section) => {
        window.scrollTo(0, window.scrollY + section.getBoundingClientRect().top - 80);
      });
      const measurements = [];
      for (const width of [1920, 1440, 390]) {
        await page.setViewport({ width, height: 1080 });
        await page.waitForFunction(() => Array.from(document.querySelectorAll('#library [data-review-inline-marker]'))
          .some((marker) => marker.parentElement.getBoundingClientRect().height > 0
            && marker.closest('[data-testid="expand-detail-body"]')?.getAttribute('aria-busy') === 'false'));
        // ResizeObserver updates the fade after a width change.
        await new Promise((resolve) => setTimeout(resolve, 350));
        const result = await page.$$eval('#library [data-review-inline-marker]', (markers) => {
          const box = markers.map((marker) => marker.parentElement)
            .find((element) => element.getBoundingClientRect().height > 0);
          const style = getComputedStyle(box);
          return {
            width: box.getBoundingClientRect().width,
            height: box.clientHeight,
            scrollHeight: box.scrollHeight,
            lineHeight: Number.parseFloat(style.lineHeight),
            maxHeight: Number.parseFloat(style.maxHeight),
            mask: style.maskImage,
            overflow: style.overflowY,
          };
        });
        const clipped = result.scrollHeight > result.height + 1;
        if (width >= 768) {
          assert(result.width < 650, `${locale}/${slug}: desktop reading width grew to ${result.width}px`);
          assert(result.height > result.lineHeight * 1.5, `${locale}/${slug}: desktop review collapsed to one line`);
        } else {
          assert.equal(result.maxHeight, 224, 'Mobile preview height changed');
          assert(result.width <= width, 'Mobile review overflows the viewport');
        }
        if (clipped) {
          assert.notEqual(result.mask, 'none', 'Clipped review lost its continuation fade');
        } else {
          assert.equal(result.mask, 'none', 'A complete short review fades away');
        }
        assert.equal(result.overflow, 'clip', 'Review created an inner scrollbar');
        measurements.push({ viewport: width, ...result });
      }
      await page.$$eval('#library [data-review-inline-marker]', (markers) => {
        markers.find((marker) => marker.parentElement.getBoundingClientRect().height > 0).parentElement.click();
      });
      await page.waitForSelector('[role="dialog"]');
      assert(await page.$eval('[role="dialog"]', (dialog) => dialog.textContent.length > 50), 'Full review did not open');
      await page.keyboard.press('Escape');
      assert.deepEqual(errors, [], 'Browser reported a page error');
      console.log(JSON.stringify({ locale, slug, measurements }));
      await page.close();
    }
  }
} finally {
  await browser.close();
}
