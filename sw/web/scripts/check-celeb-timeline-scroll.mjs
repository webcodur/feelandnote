import assert from "node:assert/strict";
import puppeteer from "puppeteer";

const baseUrl = process.env.TIMELINE_CHECK_BASE_URL ?? "http://localhost:3000";
const profilePath = process.env.TIMELINE_CHECK_PROFILE ?? "/ko/celeb/bill-gates";
const triggerSelector = '#introduction button[aria-haspopup="dialog"]:is([aria-label="타임라인"], [aria-label="서사 흐름"], [aria-label="Timeline"], [aria-label="Story"])';
const modalSelector = "[data-timeline-modal]";
const scrollSelector = `${modalSelector} > div`;
const browser = await puppeteer.launch({ headless: true });

try {
  for (const viewport of [
    { width: 1440, height: 1000, deviceScaleFactor: 1 },
    { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  ]) {
    const page = await browser.newPage();
    try {
      await page.setViewport(viewport);
      await page.goto(`${baseUrl}${profilePath}`, { waitUntil: "networkidle2", timeout: 60_000 });
      assert.equal(await page.$("#timeline"), null, "본문에 타임라인 섹션이 남아 있습니다.");
      assert.equal(await page.$(modalSelector), null, "클릭하기 전에 연표 모달이 표시됩니다.");
      const trigger = await page.$(triggerSelector);
      assert.ok(trigger, "검사 프로필의 타임라인 버튼이 표시되지 않습니다.");
      await trigger.evaluate((button) => {
        document.documentElement.style.scrollBehavior = "auto";
        button.scrollIntoView({ block: "center" });
      });
      const documentBefore = await page.evaluate(() => window.scrollY);
      await trigger.click();
      await page.waitForSelector(modalSelector, { visible: true, timeout: 30_000 });
      await page.waitForFunction((selector) => {
        const modal = document.querySelector(selector);
        return modal?.closest('[role="dialog"]')?.contains(document.activeElement);
      }, {}, modalSelector);
      const eventCount = await page.$$eval(`${modalSelector} article h3`, (titles) =>
        titles.filter((title) => title.textContent.trim()).length,
      );
      assert.ok(eventCount > 0, "연표 모달에 사건이 표시되지 않습니다.");
      const scrollArea = await page.$(scrollSelector);
      const overflow = await scrollArea.evaluate((element) => element.scrollHeight - element.clientHeight);
      assert.ok(overflow > 80, "검사 프로필의 연표가 내부 스크롤을 검증할 만큼 길지 않습니다.");
      const box = await scrollArea.boundingBox();
      assert.ok(box, "모달 스크롤 영역이 보이지 않습니다.");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel({ deltaY: 260 });
      await page.waitForFunction((selector) => document.querySelector(selector)?.scrollTop >= 80, {}, scrollSelector);
      const afterScroll = await page.evaluate((selector) => ({
        innerScroll: document.querySelector(selector).scrollTop,
        documentScroll: window.scrollY,
      }), scrollSelector);
      assert.ok(Math.abs(afterScroll.documentScroll - documentBefore) <= 2, "연표를 읽는 동안 바깥 페이지가 움직입니다.");
      await page.keyboard.press("Escape");
      await page.waitForSelector(modalSelector, { hidden: true });
      assert.equal(await trigger.evaluate((button) => document.activeElement === button), true, "모달을 닫은 뒤 타임라인 버튼으로 포커스가 돌아오지 않습니다.");
      assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - documentBefore) <= 2, "모달을 닫은 뒤 페이지 스크롤 위치가 바뀝니다.");
      console.log(JSON.stringify({ width: viewport.width, eventCount, innerScroll: afterScroll.innerScroll, pageScrollDelta: afterScroll.documentScroll - documentBefore, escapeClose: true, focusRestored: true }));
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
