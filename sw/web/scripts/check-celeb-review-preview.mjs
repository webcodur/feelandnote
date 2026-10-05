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
      let selectedWasClipped = null;
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
            interactive: box.getAttribute('role') === 'button',
            width: box.getBoundingClientRect().width,
            height: box.clientHeight,
            scrollHeight: box.scrollHeight,
            lineHeight: Number.parseFloat(style.lineHeight),
            mask: style.maskImage,
            overflow: style.overflowY,
          };
        });
        const clipped = result.scrollHeight > result.height + 1;
        if (width >= 768) {
          assert(result.width < 650, `${locale}/${slug}: desktop reading width grew to ${result.width}px`);
          assert(result.height > result.lineHeight * 1.5, `${locale}/${slug}: desktop review collapsed to one line`);
        } else {
          assert(result.width <= width, 'Mobile review overflows the viewport');
        }
        if (result.interactive) {
          // 상한(INLINE_READING_TEXT_MAX)을 넘는 장문 — 접고 끝을 흐리고 모달로 읽는다
          assert(clipped, `${locale}/${slug} ${width}px: over-cap review must be clipped`);
          assert.notEqual(result.mask, 'none', 'Clipped review lost its continuation fade');
          assert.equal(result.overflow, 'clip', 'Clipped review must clip without an inner scrollbar');
        } else {
          // 상한 안의 글은 통째로 보인다 — 자름·흐림·내부 스크롤·모달 조작 모두 없어야 한다
          assert(!clipped, `${locale}/${slug} ${width}px: inline review must render in full`);
          assert.equal(result.mask, 'none', 'A complete inline review fades away');
          assert.equal(result.overflow, 'visible', 'Inline review created a clipping box');
        }
        if (selectedWasClipped === null) selectedWasClipped = result.interactive;
        assert.equal(result.interactive, selectedWasClipped, 'Clipping must not depend on viewport width');
        measurements.push({ viewport: width, ...result });
      }
      // 긴 카드를 다 읽은 자리에서 넘긴다 — 바닥 이동 바는 넓은 화면에도 보이고 키보드 ←→도 작품을 바꾼다
      await page.setViewport({ width: 1440, height: 900 });
      const navRect = await page.$eval('#library [data-testid="expand-bottom-navigation"]', (nav) => nav.getBoundingClientRect().height);
      assert(navRect > 0, `${locale}/${slug}: bottom navigation hidden on desktop`);
      const itemCount = await page.$eval('#library [data-expand-item-count]', (el) => Number(el.dataset.expandItemCount));
      if (itemCount > 1) {
        const titleBefore = await page.$eval('#library [data-testid="expand-selected-title"]', (el) => el.textContent);
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction((prev) =>
          document.querySelector('#library [data-testid="expand-selected-title"]')?.textContent !== prev,
          { timeout: 10_000 }, titleBefore);
        await page.keyboard.press('ArrowLeft');
        await page.waitForFunction((prev) =>
          document.querySelector('#library [data-testid="expand-selected-title"]')?.textContent === prev,
          { timeout: 10_000 }, titleBefore);
      }
      await page.$$eval('#library [data-review-inline-marker]', (markers) => {
        markers.find((marker) => marker.parentElement.getBoundingClientRect().height > 0).parentElement.click();
      });
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (selectedWasClipped) {
        assert(await page.$eval('[role="dialog"]', (dialog) => dialog.textContent.length > 50), 'Full review did not open');
        await page.keyboard.press('Escape');
      } else {
        assert.equal(await page.$('[role="dialog"]'), null, 'Inline review must not open a modal');
      }
      assert.deepEqual(errors, [], 'Browser reported a page error');
      console.log(JSON.stringify({ locale, slug, clipped: selectedWasClipped, measurements }));
      await page.close();
    }
  }
} finally {
  await browser.close();
}
