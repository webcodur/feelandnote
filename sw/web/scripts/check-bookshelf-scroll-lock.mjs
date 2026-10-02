import assert from "node:assert/strict";
import puppeteer from "puppeteer";

const baseUrl = process.env.BOOKSHELF_CHECK_BASE_URL ?? "http://localhost:3000";
const pagePath = process.env.BOOKSHELF_CHECK_PATH ?? "/explore/myth#atlas-selection";
const readersSelector = '[data-bookshelf-open-people="read"]';
const portraitSelector = '[data-bookshelf-people-list] button[aria-haspopup="dialog"]';
const gallerySelector = '[role="dialog"][aria-labelledby]';
const browser = await puppeteer.launch({ headless: true });

try {
  for (const viewport of [
    { width: 1440, height: 900, deviceScaleFactor: 1 },
    { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  ]) {
    const page = await browser.newPage();
    try {
      await page.setViewport(viewport);
      for (const mode of ["buttons", "escape", "ancestor-escape", "ancestor-escape"]) {
        await page.goto(`${baseUrl}${pagePath}`, { waitUntil: "networkidle2", timeout: 60_000 });
        await page.waitForSelector(readersSelector, { timeout: 30_000 });
        const originalOverflow = await page.evaluate(() => document.body.style.overflow);
        await page.click(readersSelector);
        await page.waitForSelector(portraitSelector);
        await page.click(portraitSelector);
        await page.waitForFunction((selector) => {
          const gallery = document.querySelector(selector);
          return document.querySelectorAll('[role="dialog"]').length === 2
            && gallery?.contains(document.activeElement);
        }, {}, gallerySelector);

        if (mode === "ancestor-escape") {
          // Focus outside the gallery lets the containing modal close first,
          // unmounting both dialogs in the same update.
          await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
          await page.keyboard.press("Escape");
        } else {
          if (mode === "buttons") await page.click(`${gallerySelector} button`);
          else await page.keyboard.press("Escape");
          await page.waitForSelector(gallerySelector, { hidden: true });
          assert.equal(await page.$$eval('[role="dialog"]', (dialogs) => dialogs.length), 1,
            "Closing the portrait must leave the reader list open.");
          assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden",
            "The page must stay locked while the reader list is open.");
          if (mode === "buttons") await page.click('[role="dialog"] button');
          else await page.keyboard.press("Escape");
        }

        await page.waitForSelector('[role="dialog"]', { hidden: true });
        assert.equal(await page.evaluate(() => document.body.style.overflow), originalOverflow,
          `${viewport.width}px ${mode}: all dialogs closed but body scroll remains locked.`);
        await page.evaluate(() => {
          document.documentElement.style.scrollBehavior = "auto";
          window.scrollTo(0, 300);
        });
        const before = await page.evaluate(() => window.scrollY);
        await page.mouse.move(viewport.width / 2, viewport.height / 2);
        await page.mouse.wheel({ deltaY: 300 });
        await page.waitForFunction((position) => window.scrollY > position, {}, before);
        const after = await page.evaluate(() => window.scrollY);
        console.log(JSON.stringify({ width: viewport.width, mode, overflowRestored: true,
          scrollBefore: before, scrollAfter: after }));
      }
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
