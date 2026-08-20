import puppeteer from "puppeteer";

const baseUrl = process.env.GLOBE_LAYOUT_CHECK_BASE_URL ?? "http://localhost:3000";
const route = process.env.GLOBE_LAYOUT_CHECK_ROUTE ?? "/ko/celeb/bill-gates";

const scenarios = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

function expectedHeight(width, maxHeight = 460) {
  return Math.max(280, Math.min(width * 0.9, maxHeight));
}

async function readGeometry(page) {
  return page.$eval("#timeline canvas", (canvas) => {
    const container = canvas.parentElement;
    if (!(container instanceof HTMLElement)) {
      throw new Error("The globe canvas container is missing.");
    }
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
      canvasHeight: canvasRect.height,
      bitmapWidth: canvas.width,
      bitmapHeight: canvas.height,
      containerHeight: containerRect.height,
      contentWidth: container.clientWidth,
      top: containerRect.top,
      viewportHeight: window.innerHeight,
    };
  });
}

async function assertReservedGeometry(page, scenario, phase, maxHeight = 460) {
  const geometry = await readGeometry(page);
  const expected = expectedHeight(geometry.contentWidth, maxHeight);
  if (Math.abs(geometry.canvasHeight - expected) > 2) {
    throw new Error(
      `${scenario}: ${phase} canvas height ${geometry.canvasHeight.toFixed(1)}px does not reserve the final ${expected.toFixed(1)}px height.`,
    );
  }
  if (Math.abs(geometry.containerHeight - expected) > 4) {
    throw new Error(
      `${scenario}: ${phase} globe container height ${geometry.containerHeight.toFixed(1)}px does not reserve the final ${expected.toFixed(1)}px height.`,
    );
  }
  return { geometry, expected };
}

const browser = await puppeteer.launch({ headless: true });

try {
  const results = [];

  for (const scenario of scenarios) {
    const fallbackPage = await browser.newPage();
    await fallbackPage.setViewport({
      width: scenario.width,
      height: scenario.height,
      deviceScaleFactor: 1,
      isMobile: scenario.isMobile ?? false,
      hasTouch: scenario.hasTouch ?? false,
    });
    await fallbackPage.setJavaScriptEnabled(false);
    await fallbackPage.goto(`${baseUrl}${route}`, {
      // Production CSS is emitted as async route chunks. The outer inline frame
      // already reserves geometry before they arrive; wait for those chunks
      // before checking the visual loading layer that depends on utility CSS.
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await fallbackPage.waitForSelector("#timeline [data-globe-frame]", {
      timeout: 15_000,
    });
    const fallback = await fallbackPage.$eval(
      "#timeline [data-globe-frame]",
      (frame) => {
        const loading = frame.querySelector("[data-globe-loading]");
        return {
          frame: frame.getBoundingClientRect().height,
          loading: loading?.getBoundingClientRect().height ?? null,
          width: frame.clientWidth,
        };
      },
    );
    const fallbackExpected = expectedHeight(fallback.width);
    if (
      Math.abs(fallback.frame - fallbackExpected) > 2 ||
      fallback.loading === null ||
      Math.abs(fallback.loading - fallback.frame) > 2
    ) {
      throw new Error(
        `${scenario.name}: server frame/fallback does not reserve the final globe height (frame ${fallback.frame.toFixed(1)}px, loading ${fallback.loading?.toFixed(1) ?? "not rendered"}, expected ${fallbackExpected.toFixed(1)}px).`,
      );
    }
    await fallbackPage.close();

    const page = await browser.newPage();
    await page.setViewport({
      width: scenario.width,
      height: scenario.height,
      deviceScaleFactor: 1,
      isMobile: scenario.isMobile ?? false,
      hasTouch: scenario.hasTouch ?? false,
    });
    await page.goto(`${baseUrl}${route}`, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await page.waitForSelector("#timeline canvas", { timeout: 15_000 });

    const { geometry: before, expected } = await assertReservedGeometry(
      page,
      scenario.name,
      "offscreen",
    );
    if (before.top <= before.viewportHeight) {
      throw new Error(
        `${scenario.name}: the globe must begin offscreen for this regression check.`,
      );
    }
    if (before.bitmapWidth !== 300 || before.bitmapHeight !== 150) {
      throw new Error(
        `${scenario.name}: the offscreen globe initialized its ${before.bitmapWidth}x${before.bitmapHeight} bitmap before viewport entry.`,
      );
    }

    await page.$eval("#timeline canvas", (canvas) => {
      canvas.scrollIntoView({ block: "center" });
    });
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector("#timeline canvas");
        return canvas instanceof HTMLCanvasElement && canvas.width !== 300;
      },
      { timeout: 5_000 },
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    const after = await readGeometry(page);

    if (Math.abs(after.canvasHeight - before.canvasHeight) > 2) {
      throw new Error(
        `${scenario.name}: canvas height changed ${before.canvasHeight.toFixed(1)}px -> ${after.canvasHeight.toFixed(1)}px on viewport entry.`,
      );
    }
    if (Math.abs(after.containerHeight - before.containerHeight) > 2) {
      throw new Error(
        `${scenario.name}: globe container height changed ${before.containerHeight.toFixed(1)}px -> ${after.containerHeight.toFixed(1)}px on viewport entry.`,
      );
    }

    const resizedViewport = {
      width: scenario.isMobile ? 430 : 1024,
      height: scenario.height,
      deviceScaleFactor: 1,
      isMobile: scenario.isMobile ?? false,
      hasTouch: scenario.hasTouch ?? false,
    };
    await page.setViewport(resizedViewport);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const { geometry: resized, expected: resizedExpected } =
      await assertReservedGeometry(page, scenario.name, "resized");

    await page.$$eval("#timeline button[aria-pressed]", (buttons) => {
      const atlas = buttons[2];
      if (!(atlas instanceof HTMLButtonElement)) {
        throw new Error("The activity-radius tab is missing.");
      }
      atlas.click();
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    const { geometry: atlas, expected: atlasExpected } =
      await assertReservedGeometry(page, scenario.name, "atlas", 620);

    await page.$eval("#timeline [data-world-globe]", (globe) => {
      const expand = [...globe.querySelectorAll("button")].find((button) =>
        button.querySelector(".lucide-maximize-2"),
      );
      if (!(expand instanceof HTMLButtonElement)) {
        throw new Error("The fullscreen globe button is missing.");
      }
      expand.click();
    });
    await page.waitForSelector('[role="dialog"] canvas', { timeout: 5_000 });
    const modalBefore = await page.$eval('[role="dialog"] canvas', (canvas) => ({
      canvas: canvas.getBoundingClientRect().height,
      container: canvas.parentElement?.getBoundingClientRect().height ?? 0,
    }));
    await new Promise((resolve) => setTimeout(resolve, 400));
    const modalAfter = await page.$eval('[role="dialog"] canvas', (canvas) => ({
      canvas: canvas.getBoundingClientRect().height,
      container: canvas.parentElement?.getBoundingClientRect().height ?? 0,
    }));
    if (
      Math.abs(modalBefore.canvas - modalBefore.container) > 2 ||
      Math.abs(modalAfter.canvas - modalAfter.container) > 2 ||
      Math.abs(modalAfter.canvas - modalBefore.canvas) > 2
    ) {
      throw new Error(
        `${scenario.name}: fullscreen globe geometry changed on its first draw (${modalBefore.canvas.toFixed(1)}px -> ${modalAfter.canvas.toFixed(1)}px, container ${modalAfter.container.toFixed(1)}px).`,
      );
    }

    results.push({
      scenario: scenario.name,
      fallback: Math.round(fallback.frame),
      bitmap: {
        offscreen: `${before.bitmapWidth}x${before.bitmapHeight}`,
        visible: `${after.bitmapWidth}x${after.bitmapHeight}`,
      },
      expected: Math.round(expected),
      before: {
        canvas: Math.round(before.canvasHeight),
        container: Math.round(before.containerHeight),
      },
      after: {
        canvas: Math.round(after.canvasHeight),
        container: Math.round(after.containerHeight),
      },
      resized: {
        expected: Math.round(resizedExpected),
        canvas: Math.round(resized.canvasHeight),
      },
      atlas: {
        expected: Math.round(atlasExpected),
        canvas: Math.round(atlas.canvasHeight),
      },
      fullscreen: {
        before: Math.round(modalBefore.canvas),
        after: Math.round(modalAfter.canvas),
      },
    });
    await page.close();
  }

  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
