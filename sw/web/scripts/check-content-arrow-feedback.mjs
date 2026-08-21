import assert from "node:assert/strict";

import puppeteer from "puppeteer";

const baseUrl = (process.env.DETAIL_ARROW_CHECK_BASE_URL ?? "http://localhost:3000")
  .replace(/\/+$/, "");
const locale = process.env.DETAIL_ARROW_CHECK_LOCALE ?? "ko";
const slug = process.env.DETAIL_ARROW_CHECK_SLUG ?? "bill-gates";
const delayMs = Number(process.env.DETAIL_ARROW_CHECK_DELAY ?? 800);
const timeout = Number(process.env.DETAIL_ARROW_CHECK_TIMEOUT ?? 30_000);

const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1365, height: 768, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);

  let delayNextAction = false;
  let delayedActionCount = 0;
  page.on("request", (request) => {
    const isAction = request.method() === "POST" && Boolean(request.headers()["next-action"]);
    if (!delayNextAction || !isAction) {
      void request.continue();
      return;
    }

    delayNextAction = false;
    delayedActionCount += 1;
    setTimeout(() => void request.continue(), delayMs);
  });

  await page.goto(`${baseUrl}/${locale}/celeb/${slug}`, {
    waitUntil: "networkidle2",
    timeout,
  });
  await page.waitForFunction(
    () => document.querySelectorAll("#library nav button[title]").length >= 2,
    { timeout },
  );
  await page.waitForFunction(
    () => !document.querySelector("#library article .animate-pulse"),
    { timeout },
  );

  const before = await page.evaluate(() => {
    const library = document.querySelector("#library");
    const current = library?.querySelector('nav button[aria-current="true"]');
    const rows = [...(library?.querySelectorAll("nav button[title]") ?? [])];
    const currentIndex = rows.indexOf(current);
    const nextRow = rows[currentIndex + 1] ?? rows[0];
    const article = library?.querySelector("article");
    const review = article?.querySelector(":scope > section");
    return {
      bodyTitle: article?.querySelector("img")?.getAttribute("alt") ?? null,
      expectedTitle: nextRow?.getAttribute("title") ?? null,
      reviewText: review?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      windowY: window.scrollY,
      navScrollTop: library?.querySelector("nav")?.scrollTop ?? null,
    };
  });
  assert.ok(before.expectedTitle, "The next record title is missing.");

  delayNextAction = true;
  const startedAt = Date.now();
  await page.evaluate(() => {
    const next = document.querySelector(
      "#library button[aria-label^='다음'][aria-label$='기록']",
    );
    if (!(next instanceof HTMLButtonElement)) throw new Error("The next-record button is missing.");
    next.click();
  });
  await page.waitForFunction(
    (expectedTitle) => (
      document.querySelector("#library [data-testid='expand-selected-title']")
        ?.textContent?.trim() === expectedTitle
    ),
    { timeout: 1_000 },
    before.expectedTitle,
  );
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  })));

  const pending = await page.evaluate((clickStartedAt) => {
    const library = document.querySelector("#library");
    const article = library?.querySelector("article");
    const review = article?.querySelector(":scope > section");
    return {
      headerTitle: library?.querySelector("[data-testid='expand-selected-title']")
        ?.textContent?.trim() ?? null,
      currentTitle: library?.querySelector('nav button[aria-current="true"]')
        ?.getAttribute("title") ?? null,
      bodyTitle: article?.querySelector("img")?.getAttribute("alt") ?? null,
      introHeading: article?.querySelector(":scope > div h4")?.textContent?.trim() ?? null,
      reviewText: review?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      busy: library?.querySelector("[data-testid='expand-detail-body']")
        ?.getAttribute("aria-busy") ?? null,
      hasSkeleton: Boolean(article?.querySelector(".animate-pulse")),
      feedbackMs: Date.now() - clickStartedAt,
      windowY: window.scrollY,
      navScrollTop: library?.querySelector("nav")?.scrollTop ?? null,
    };
  }, startedAt);

  assert.equal(pending.headerTitle, before.expectedTitle);
  assert.equal(pending.currentTitle, before.expectedTitle);
  assert.equal(pending.bodyTitle, before.expectedTitle, "The body kept showing the previous record.");
  assert.notEqual(pending.reviewText, before.reviewText, "The review kept showing the previous record.");
  assert.ok(pending.reviewText.length > 0, "The selected record review is missing while loading.");
  assert.ok(pending.introHeading, "The selected record intro heading is missing while loading.");
  assert.equal(pending.busy, "true");
  assert.equal(pending.hasSkeleton, true);
  assert.ok(pending.feedbackMs <= 150, `Arrow feedback took ${pending.feedbackMs}ms.`);
  assert.equal(pending.windowY, before.windowY);
  assert.equal(pending.navScrollTop, before.navScrollTop);

  await page.waitForFunction(
    (expectedTitle) => {
      const library = document.querySelector("#library");
      return library?.querySelector("article img")?.getAttribute("alt") === expectedTitle
        && library.querySelector("[data-testid='expand-detail-body']")
          ?.getAttribute("aria-busy") === "false"
        && !library.querySelector("article .animate-pulse");
    },
    { timeout },
    before.expectedTitle,
  );

  console.log(JSON.stringify({
    status: "pass",
    delayedActionCount,
    expectedTitle: before.expectedTitle,
    pending,
  }, null, 2));
} finally {
  await browser.close();
}
