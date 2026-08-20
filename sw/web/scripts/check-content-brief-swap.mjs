import assert from "node:assert/strict";

import puppeteer from "puppeteer";

const baseUrl = (process.env.DETAIL_BRIEF_CHECK_BASE_URL ?? "http://localhost:3000")
  .replace(/\/+$/, "");
const locale = process.env.DETAIL_BRIEF_CHECK_LOCALE ?? "ko";
const slug = process.env.DETAIL_BRIEF_CHECK_SLUG ?? "bill-gates";
const timeout = Number(process.env.DETAIL_BRIEF_CHECK_TIMEOUT ?? 30_000);
const responseDelay = Number(process.env.DETAIL_BRIEF_CHECK_RESPONSE_DELAY ?? 500);
const tolerance = 2;

const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1365, height: 768, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/${locale}/celeb/${slug}`, {
    waitUntil: "networkidle2",
    timeout,
  });
  const viewEntry = await ensureExpandedView(page);
  await page.waitForFunction(
    () => document.querySelectorAll("#library nav button[aria-label]").length >= 35,
    { timeout },
  );
  await waitForSettledCard(page);

  let requestDelayMode = "none";
  let rapidRequestCount = 0;
  let resolveFirstRapidRequest;
  let resolveSecondRapidRequest;
  const firstRapidRequest = new Promise((resolve) => {
    resolveFirstRapidRequest = resolve;
  });
  const secondRapidRequest = new Promise((resolve) => {
    resolveSecondRapidRequest = resolve;
  });
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    let delay = 0;
    if (request.method() === "POST" && requestDelayMode === "single") {
      delay = responseDelay;
    } else if (request.method() === "POST" && requestDelayMode === "rapid") {
      rapidRequestCount += 1;
      if (rapidRequestCount === 1) resolveFirstRapidRequest();
      if (rapidRequestCount === 2) resolveSecondRapidRequest();
      delay = rapidRequestCount === 1 ? 250 : 700;
    }
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    if (!request.isInterceptResolutionHandled()) await request.continue();
  });

  const target = await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const library = document.querySelector("#library");
    const nav = library?.querySelector("nav");
    if (!(library instanceof HTMLElement) || !(nav instanceof HTMLElement)) {
      throw new Error("Missing expanded library index");
    }

    window.scrollTo(0, Math.max(0, window.scrollY + library.getBoundingClientRect().top - 40));
    nav.scrollTop = 0;

    const rows = [...nav.querySelectorAll("button[aria-label]")];
    const candidateRow = rows[Math.min(12, rows.length - 1)];
    if (candidateRow instanceof HTMLElement) {
      candidateRow.scrollIntoView({ block: "center", behavior: "instant" });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    const candidate = candidateRow
      ? { row: candidateRow, index: rows.indexOf(candidateRow), rect: candidateRow.getBoundingClientRect() }
      : null;
    if (!candidate || !(candidate.row instanceof HTMLButtonElement)) {
      throw new Error("Missing a visible, non-neighbor index target");
    }

    const oldArticle = library.querySelector("article");
    const review = oldArticle?.querySelector(":scope > section");
    if (!(oldArticle instanceof HTMLElement) || !(review instanceof HTMLElement)) {
      throw new Error("Missing initial complete card");
    }

    const samples = [];
    const startedAt = performance.now();
    const sample = () => {
      const article = library.querySelector("article");
      const currentReview = article?.querySelector(":scope > section");
      const selected = nav.querySelector('button[aria-current="true"]');
      samples.push({
        at: Math.round((performance.now() - startedAt) * 10) / 10,
        articleChanged: article !== oldArticle,
        reviewTop: currentReview instanceof HTMLElement
          ? Math.round(currentReview.getBoundingClientRect().top * 10) / 10
          : null,
        skeleton: Boolean(article?.querySelector(".animate-pulse")),
        busy: library.querySelector('[data-testid="expand-detail-body"]')?.getAttribute("aria-busy") ?? null,
        title: library.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim() ?? null,
        selectedTitle: selected?.getAttribute("title") ?? null,
        windowY: Math.round(window.scrollY * 10) / 10,
        navScrollTop: Math.round(nav.scrollTop * 10) / 10,
        targetTop: Math.round(candidate.row.getBoundingClientRect().top * 10) / 10,
      });
    };
    sample();
    const intervalId = window.setInterval(sample, 8);
    window.__contentBriefSwapTrace = {
      expectedTitle: candidate.row.title,
      samples,
      stop() {
        window.clearInterval(intervalId);
        sample();
      },
    };

    return {
      expectedTitle: candidate.row.title,
      rowIndex: candidate.index,
      x: candidate.rect.left + candidate.rect.width / 2,
      y: candidate.rect.top + candidate.rect.height / 2,
    };
  });

  requestDelayMode = "single";
  await page.mouse.click(target.x, target.y);

  await page.waitForFunction(
    (expectedTitle) => {
      const library = document.querySelector("#library");
      return library?.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim()
        === expectedTitle
        && library.querySelector('nav button[aria-current="true"]')?.getAttribute("title")
          === expectedTitle;
    },
    { timeout },
    target.expectedTitle,
  );
  await page.waitForFunction(
    () => window.__contentBriefSwapTrace?.samples.some((sample) => sample.articleChanged),
    { timeout },
  );
  await waitForSettledCard(page);
  await new Promise((resolve) => setTimeout(resolve, 350));

  const result = await page.evaluate(() => {
    const trace = window.__contentBriefSwapTrace;
    if (!trace) throw new Error("Missing brief swap trace");
    trace.stop();
    const changed = trace.samples.filter(
      (sample) => sample.articleChanged && sample.reviewTop != null,
    );
    const firstChanged = changed[0];
    const final = changed.at(-1);
    if (!firstChanged || !final) throw new Error("The detail card never changed");
    const reviewTops = changed.map((sample) => sample.reviewTop);
    const windowPositions = trace.samples.map((sample) => sample.windowY);
    const navPositions = trace.samples.map((sample) => sample.navScrollTop);
    const targetPositions = trace.samples.map((sample) => sample.targetTop);
    return {
      expectedTitle: trace.expectedTitle,
      sampleCount: trace.samples.length,
      firstChanged,
      final,
      sawSkeletonAfterSwap: changed.some((sample) => sample.skeleton),
      sawBusyBeforeSwap: trace.samples.some(
        (sample) => !sample.articleChanged && sample.busy === "true",
      ),
      sawSkeletonBeforeSwap: trace.samples.some(
        (sample) => !sample.articleChanged && sample.skeleton,
      ),
      postSwapReviewDelta: Math.round((Math.max(...reviewTops) - Math.min(...reviewTops)) * 10) / 10,
      windowDelta: Math.round((Math.max(...windowPositions) - Math.min(...windowPositions)) * 10) / 10,
      navDelta: Math.round((Math.max(...navPositions) - Math.min(...navPositions)) * 10) / 10,
      targetDelta: Math.round((Math.max(...targetPositions) - Math.min(...targetPositions)) * 10) / 10,
      samples: trace.samples.filter((sample, index, all) => (
        index === 0
        || index === all.length - 1
        || sample.articleChanged !== all[index - 1]?.articleChanged
        || sample.skeleton !== all[index - 1]?.skeleton
        || sample.busy !== all[index - 1]?.busy
      )),
    };
  });

  assert.equal(
    result.sawSkeletonAfterSwap,
    false,
    `A loading skeleton appeared between complete cards: ${JSON.stringify(result)}`,
  );
  assert.equal(
    result.sawBusyBeforeSwap,
    true,
    `The complete previous card was not marked busy while waiting: ${JSON.stringify(result)}`,
  );
  assert.equal(
    result.sawSkeletonBeforeSwap,
    false,
    `The previous complete card regressed to a skeleton while waiting: ${JSON.stringify(result)}`,
  );
  assert(
    result.postSwapReviewDelta <= tolerance,
    `The review moved again after the new card appeared: ${JSON.stringify(result)}`,
  );
  assert(result.windowDelta <= tolerance, `Selection moved document scroll: ${JSON.stringify(result)}`);
  assert(result.navDelta <= tolerance, `Selection moved index scroll: ${JSON.stringify(result)}`);
  assert(result.targetDelta <= tolerance, `Selection moved the clicked index row: ${JSON.stringify(result)}`);

  requestDelayMode = "none";
  await new Promise((resolve) => setTimeout(resolve, responseDelay + 450));
  requestDelayMode = "rapid";
  const rapid = await checkRapidSelection(page, firstRapidRequest, secondRapidRequest);
  assert.equal(
    rapid.intermediateBodyAppeared,
    false,
    `A stale intermediate response replaced the last complete card: ${JSON.stringify(rapid)}`,
  );
  assert.equal(
    rapid.finalBodyTitle,
    rapid.finalTitle,
    `The final body did not match the last selection: ${JSON.stringify(rapid)}`,
  );

  await page.close();
  const initialBriefMismatch = await checkInitialBriefMismatch(browser);

  console.log(JSON.stringify({
    status: "pass",
    viewEntry,
    target,
    result,
    rapid,
    initialBriefMismatch,
  }, null, 2));
} finally {
  await browser.close();
}

async function ensureExpandedView(page) {
  await page.waitForFunction(() => {
    const library = document.querySelector("#library");
    if (!(library instanceof HTMLElement)) return false;
    const isVisible = (element) => element instanceof HTMLElement
      && getComputedStyle(element).display !== "none"
      && getComputedStyle(element).visibility !== "hidden"
      && element.getClientRects().length > 0;
    return [...library.querySelectorAll('[data-testid="archive-view-toggle"]')].some(isVisible)
      || [...library.querySelectorAll('[data-testid="expand-selected-title"]')].some(isVisible);
  }, { timeout });

  const entry = await page.evaluate(() => {
    const library = document.querySelector("#library");
    if (!(library instanceof HTMLElement)) throw new Error("Missing content library");
    const isVisible = (element) => element instanceof HTMLElement
      && getComputedStyle(element).display !== "none"
      && getComputedStyle(element).visibility !== "hidden"
      && element.getClientRects().length > 0;
    const title = [...library.querySelectorAll('[data-testid="expand-selected-title"]')]
      .find(isVisible);
    if (title) return { startedView: "expand", toggledToExpand: false };

    const toggle = [...library.querySelectorAll('[data-testid="archive-view-toggle"]')]
      .find(isVisible);
    if (!(toggle instanceof HTMLButtonElement)) {
      throw new Error("Missing visible archive view toggle");
    }
    const nextViewMode = toggle.dataset.nextViewMode;
    if (nextViewMode !== "expand") {
      throw new Error(`Visible library is not expanded, but its toggle targets ${nextViewMode ?? "unknown"}`);
    }
    toggle.click();
    return { startedView: "list", toggledToExpand: true };
  });

  await page.waitForFunction(() => {
    const library = document.querySelector("#library");
    if (!(library instanceof HTMLElement)) return false;
    const isVisible = (element) => element instanceof HTMLElement
      && getComputedStyle(element).display !== "none"
      && getComputedStyle(element).visibility !== "hidden"
      && element.getClientRects().length > 0;
    return [...library.querySelectorAll('[data-testid="expand-selected-title"]')].some(isVisible)
      && [...library.querySelectorAll("nav button[aria-label]")].some(isVisible);
  }, { timeout });

  return entry;
}

async function checkInitialBriefMismatch(browserInstance) {
  const page = await browserInstance.newPage();
  let briefGate = null;
  const actionRequests = [];

  try {
    await page.setViewport({ width: 1365, height: 768, deviceScaleFactor: 1 });
    await page.goto(`${baseUrl}/${locale}/celeb/${slug}`, {
      waitUntil: "networkidle2",
      timeout,
    });
    await ensureExpandedView(page);
    await page.waitForFunction(
      () => document.querySelectorAll("#library nav button[aria-label]").length >= 35,
      { timeout },
    );
    await waitForSettledCard(page);

    const initial = await readVisibleExpandedCard(page);
    assert.match(
      initial.contentId ?? "",
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/i,
      `The initial expanded card did not expose its content UUID: ${JSON.stringify(initial)}`,
    );

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const action = classifyActionRequest(request);
      if (action) actionRequests.push(action);
      if (
        briefGate
        && !briefGate.request
        && action?.argumentShape === "content-brief"
      ) {
        briefGate.request = request;
        briefGate.action = action;
        briefGate.resolve(action);
        return;
      }
      if (!request.isInterceptResolutionHandled()) void request.continue();
    });

    await clickVisibleViewToggle(page, "list");
    await waitForVisibleList(page, { itemCount: 4 });
    const searchTitle = await page.evaluate((oldTitle) => {
      const grid = findVisibleListGrid();
      if (!(grid instanceof HTMLElement)) throw new Error("Missing visible list grid");
      const titles = [...grid.querySelectorAll("h3[title]")]
        .map((heading) => heading.getAttribute("title")?.trim() ?? "")
        .filter(Boolean);
      const candidate = titles.find((title) => title !== oldTitle);
      if (!candidate) throw new Error("The four-card list has no title distinct from the initial seed");
      return candidate;

      function findVisibleListGrid() {
        const library = document.querySelector("#library");
        return [...(library?.querySelectorAll("div") ?? [])].find((element) => (
          element.style.gridTemplateColumns.includes("minmax(340px")
          && isRendered(element)
        ));
      }
      function isRendered(element) {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        return style.display !== "none"
          && style.visibility !== "hidden"
          && element.getClientRects().length > 0;
      }
    }, initial.title);

    await page.evaluate((query) => {
      const library = document.querySelector("#library");
      const input = library?.querySelector('input[type="text"]');
      if (!(input instanceof HTMLInputElement)) throw new Error("Missing library search input");
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      if (!valueSetter) throw new Error("Missing native input value setter");
      valueSetter.call(input, query);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, searchTitle);
    await page.waitForFunction(
      (query) => document.querySelector("#library input[type='text']")?.value === query,
      { timeout },
      searchTitle,
    );
    await page.evaluate(() => {
      const input = document.querySelector("#library input[type='text']");
      const button = input?.parentElement?.nextElementSibling;
      if (!(button instanceof HTMLButtonElement) || button.disabled) {
        throw new Error("Missing enabled library search button");
      }
      button.click();
    });
    await waitForVisibleList(page, { firstTitle: searchTitle });

    const requestMark = actionRequests.length;
    const briefStarted = new Promise((resolve) => {
      briefGate = { request: null, action: null, resolve };
    });
    await clickVisibleViewToggle(page, "expand");
    const requestedBrief = await withTimeout(
      briefStarted,
      timeout,
      "Changing a filtered list back to expand did not request the new first item's brief",
    );

    await page.waitForFunction(() => {
      const title = [...document.querySelectorAll('#library [data-testid="expand-selected-title"]')]
        .find((element) => isRendered(element));
      const body = title?.closest("section")?.querySelector('[data-testid="expand-detail-body"]');
      return body?.getAttribute("aria-busy") === "true";

      function isRendered(element) {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        return style.display !== "none"
          && style.visibility !== "hidden"
          && element.getClientRects().length > 0;
      }
    }, { timeout });
    const pending = await readVisibleExpandedCard(page);

    assert.notEqual(
      requestedBrief.contentId,
      initial.contentId,
      `The filtered expand view requested the original seed brief again: ${JSON.stringify({ initial, requestedBrief })}`,
    );
    assert.equal(
      pending.title,
      searchTitle,
      `The filtered expand heading did not use the new first item: ${JSON.stringify({ searchTitle, pending })}`,
    );
    assert.equal(
      pending.articleTitle,
      searchTitle,
      `The pending detail body was not built for the new first item: ${JSON.stringify({ searchTitle, pending })}`,
    );
    assert.equal(
      pending.ariaBusy,
      "true",
      `A mismatched initial brief incorrectly settled the new card: ${JSON.stringify(pending)}`,
    );
    assert.equal(
      pending.hasSkeleton,
      true,
      `The new first item did not wait for its own brief: ${JSON.stringify(pending)}`,
    );
    assert.equal(
      includesSignature(pending.articleText, initial.introText),
      false,
      `The old initial introduction leaked into the pending new card: ${JSON.stringify({ initial, pending })}`,
    );
    assert.equal(
      includesSignature(pending.articleText, initial.metadataText),
      false,
      `The old initial metadata leaked into the pending new card: ${JSON.stringify({ initial, pending })}`,
    );

    const heldBriefRequest = briefGate?.request;
    if (!heldBriefRequest) throw new Error("The brief request gate lost its intercepted request");
    if (!heldBriefRequest.isInterceptResolutionHandled()) await heldBriefRequest.continue();
    briefGate = null;

    await page.waitForFunction(
      (expectedTitle) => {
        const title = [...document.querySelectorAll('#library [data-testid="expand-selected-title"]')]
          .find((element) => isRendered(element));
        const body = title?.closest("section")?.querySelector('[data-testid="expand-detail-body"]');
        return title?.textContent?.trim() === expectedTitle
          && body?.getAttribute("aria-busy") === "false"
          && !body.querySelector(".animate-pulse");

        function isRendered(element) {
          if (!(element instanceof HTMLElement)) return false;
          const style = getComputedStyle(element);
          return style.display !== "none"
            && style.visibility !== "hidden"
            && element.getClientRects().length > 0;
        }
      },
      { timeout },
      searchTitle,
    );
    await settleLayout(page);
    const final = await readVisibleExpandedCard(page);
    const transitionBriefRequests = actionRequests
      .slice(requestMark)
      .filter((request) => request.argumentShape === "content-brief");

    assert.equal(
      transitionBriefRequests.length,
      1,
      `The new first item did not issue exactly one brief request: ${JSON.stringify(transitionBriefRequests)}`,
    );
    assert.equal(
      final.contentId,
      requestedBrief.contentId,
      `The settled metadata link does not match the requested brief: ${JSON.stringify({ requestedBrief, final })}`,
    );
    assert.equal(final.title, searchTitle, `The settled heading changed unexpectedly: ${JSON.stringify(final)}`);
    assert.equal(final.articleTitle, searchTitle, `The settled body title is stale: ${JSON.stringify(final)}`);
    assert.equal(final.ariaBusy, "false", `The new brief never settled: ${JSON.stringify(final)}`);
    assert.equal(final.hasSkeleton, false, `The settled new brief retained a skeleton: ${JSON.stringify(final)}`);
    if (initial.introText && final.introText) {
      assert.notEqual(
        final.introText,
        initial.introText,
        `The settled introduction was reused from the initial seed: ${JSON.stringify({ initial, final })}`,
      );
    }
    if (initial.metadataText && final.metadataText) {
      assert.notEqual(
        final.metadataText,
        initial.metadataText,
        `The settled metadata was reused from the initial seed: ${JSON.stringify({ initial, final })}`,
      );
    }

    return {
      initial,
      searchTitle,
      requestedBrief,
      pending,
      final,
      transitionBriefRequestCount: transitionBriefRequests.length,
    };
  } finally {
    const heldRequest = briefGate?.request;
    if (heldRequest && !heldRequest.isInterceptResolutionHandled()) {
      await heldRequest.continue().catch(() => undefined);
    }
    await page.close();
  }
}

async function clickVisibleViewToggle(page, nextViewMode) {
  await page.waitForFunction((expectedMode) => {
    const toggle = [...document.querySelectorAll('#library [data-testid="archive-view-toggle"]')]
      .find((element) => isRendered(element));
    return toggle?.getAttribute("data-next-view-mode") === expectedMode;

    function isRendered(element) {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      return style.display !== "none"
        && style.visibility !== "hidden"
        && element.getClientRects().length > 0;
    }
  }, { timeout }, nextViewMode);
  await page.evaluate((expectedMode) => {
    const toggle = [...document.querySelectorAll('#library [data-testid="archive-view-toggle"]')]
      .find((element) => isRendered(element));
    if (
      !(toggle instanceof HTMLButtonElement)
      || toggle.dataset.nextViewMode !== expectedMode
    ) {
      throw new Error(`Missing visible ${expectedMode} view toggle`);
    }
    toggle.click();

    function isRendered(element) {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      return style.display !== "none"
        && style.visibility !== "hidden"
        && element.getClientRects().length > 0;
    }
  }, nextViewMode);
}

async function waitForVisibleList(page, { itemCount, firstTitle } = {}) {
  await page.waitForFunction(({ expectedCount, expectedFirstTitle }) => {
    const library = document.querySelector("#library");
    const grid = [...(library?.querySelectorAll("div") ?? [])].find((element) => (
      element.style.gridTemplateColumns.includes("minmax(340px")
      && isRendered(element)
    ));
    if (!(grid instanceof HTMLElement)) return false;
    const first = grid.querySelector("h3[title]")?.getAttribute("title")?.trim() ?? null;
    return (expectedCount == null || grid.children.length === expectedCount)
      && (expectedFirstTitle == null || first === expectedFirstTitle)
      && !library?.querySelector(".animate-spin");

    function isRendered(element) {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      return style.display !== "none"
        && style.visibility !== "hidden"
        && element.getClientRects().length > 0;
    }
  }, { timeout }, { expectedCount: itemCount ?? null, expectedFirstTitle: firstTitle ?? null });
  await settleLayout(page);
}

async function readVisibleExpandedCard(page) {
  return page.evaluate(() => {
    const title = [...document.querySelectorAll('#library [data-testid="expand-selected-title"]')]
      .find((element) => isRendered(element));
    const section = title?.closest("section");
    const body = section?.querySelector('[data-testid="expand-detail-body"]');
    const article = body?.querySelector("article");
    if (!(title instanceof HTMLElement) || !(article instanceof HTMLElement)) {
      throw new Error("Missing visible expanded card");
    }
    const intro = article.firstElementChild?.querySelector("section");
    const metadata = article.children.length >= 3 ? article.lastElementChild : null;
    const href = article.querySelector('[data-testid="expand-all-reviews"]')?.getAttribute("href") ?? null;
    const contentId = href?.match(/\/content\/([0-9a-f-]{36})/i)?.[1] ?? null;
    return {
      title: title.textContent?.trim() ?? "",
      articleTitle: article.querySelector("img")?.getAttribute("alt")?.trim() ?? "",
      contentId,
      ariaBusy: body?.getAttribute("aria-busy") ?? null,
      hasSkeleton: Boolean(article.querySelector(".animate-pulse")),
      introText: intro?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      metadataText: metadata?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      articleText: article.textContent?.replace(/\s+/g, " ").trim() ?? "",
    };

    function isRendered(element) {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      return style.display !== "none"
        && style.visibility !== "hidden"
        && element.getClientRects().length > 0;
    }
  });
}

function classifyActionRequest(request) {
  if (request.method() !== "POST") return null;
  const actionId = request.headers()["next-action"] ?? null;
  const postData = request.postData();
  if (!postData) return { actionId, argumentShape: "none", contentId: null };
  try {
    const parsed = JSON.parse(postData);
    if (
      Array.isArray(parsed)
      && parsed.length === 2
      && typeof parsed[0] === "string"
      && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(parsed[0])
      && ["ko", "en"].includes(parsed[1])
    ) {
      return { actionId, argumentShape: "content-brief", contentId: parsed[0] };
    }
    if (
      Array.isArray(parsed)
      && parsed.length === 1
      && parsed[0]
      && typeof parsed[0] === "object"
      && "userId" in parsed[0]
      && "limit" in parsed[0]
    ) {
      return { actionId, argumentShape: "library-list", contentId: null };
    }
    return { actionId, argumentShape: "other", contentId: null };
  } catch {
    return { actionId, argumentShape: "encoded", contentId: null };
  }
}

function includesSignature(text, signature) {
  return signature.length >= 12 && text.includes(signature);
}

async function settleLayout(page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function waitForSettledCard(page) {
  await page.waitForFunction(
    () => {
      const library = document.querySelector("#library");
      return Boolean(
        library?.querySelector("article")
        && !library.querySelector("article .animate-pulse"),
      );
    },
    { timeout },
  );
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function checkRapidSelection(page, firstRequest, secondRequest) {
  const targets = await page.evaluate(() => {
    const library = document.querySelector("#library");
    const rows = [...(library?.querySelectorAll("nav button[aria-label]") ?? [])];
    const intermediate = rows[Math.min(30, rows.length - 2)];
    const final = rows[Math.min(45, rows.length - 1)];
    const article = library?.querySelector("article");
    if (
      !(library instanceof HTMLElement)
      || !(intermediate instanceof HTMLButtonElement)
      || !(final instanceof HTMLButtonElement)
      || !(article instanceof HTMLElement)
    ) {
      throw new Error("Missing rapid selection targets");
    }

    const changes = [];
    let lastArticle = article;
    const readBodyTitle = (current) => current?.querySelector("img")?.getAttribute("alt") ?? null;
    const sample = () => {
      const currentArticle = library.querySelector("article");
      if (currentArticle === lastArticle) return;
      lastArticle = currentArticle;
      changes.push({
        at: Math.round(performance.now() * 10) / 10,
        bodyTitle: readBodyTitle(currentArticle),
        headerTitle: library.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim() ?? null,
      });
    };
    const observer = new MutationObserver(sample);
    observer.observe(library, { subtree: true, childList: true });
    window.__rapidBriefSwapTrace = {
      changes,
      initialBodyTitle: readBodyTitle(article),
      stop() {
        observer.disconnect();
        sample();
      },
    };
    return {
      intermediateIndex: rows.indexOf(intermediate),
      intermediateTitle: intermediate.title,
      finalIndex: rows.indexOf(final),
      finalTitle: final.title,
    };
  });

  await clickIndexRow(page, targets.intermediateIndex);
  await waitForSelectedTitle(page, targets.intermediateTitle);
  await withTimeout(firstRequest, timeout, "The intermediate brief request did not start");

  await clickIndexRow(page, targets.finalIndex);
  await waitForSelectedTitle(page, targets.finalTitle);
  await withTimeout(secondRequest, timeout, "The final brief request did not start");
  await page.waitForFunction(
    (finalTitle) => {
      const library = document.querySelector("#library");
      const bodyTitle = library?.querySelector("article img")?.getAttribute("alt");
      return bodyTitle === finalTitle
        && library?.querySelector('[data-testid="expand-detail-body"]')?.getAttribute("aria-busy") === "false";
    },
    { timeout },
    targets.finalTitle,
  );
  await new Promise((resolve) => setTimeout(resolve, 350));

  return page.evaluate(({ intermediateTitle, finalTitle }) => {
    const trace = window.__rapidBriefSwapTrace;
    if (!trace) throw new Error("Missing rapid brief trace");
    trace.stop();
    const articleChanges = trace.changes.filter((change) => change.bodyTitle != null);
    return {
      intermediateTitle,
      finalTitle,
      initialBodyTitle: trace.initialBodyTitle,
      finalBodyTitle: document.querySelector("#library article img")?.getAttribute("alt") ?? null,
      intermediateBodyAppeared: articleChanges.some(
        (change) => change.bodyTitle === intermediateTitle,
      ),
      articleChanges,
    };
  }, targets);
}

async function clickIndexRow(page, index) {
  await page.evaluate((targetIndex) => {
    const row = document.querySelectorAll("#library nav button[aria-label]")[targetIndex];
    if (!(row instanceof HTMLButtonElement)) throw new Error(`Missing index row ${targetIndex}`);
    row.click();
  }, index);
}

async function waitForSelectedTitle(page, expectedTitle) {
  await page.waitForFunction(
    (title) => {
      const library = document.querySelector("#library");
      return library?.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim()
        === title
        && library.querySelector('nav button[aria-current="true"]')?.getAttribute("title") === title;
    },
    { timeout },
    expectedTitle,
  );
}

async function withTimeout(promise, duration, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), duration);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
