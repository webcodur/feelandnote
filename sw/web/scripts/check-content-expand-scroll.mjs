import assert from "node:assert/strict";

import puppeteer from "puppeteer";

const baseUrl = process.env.DETAIL_SCROLL_CHECK_BASE_URL ?? "http://localhost:3000";
const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
const locale = process.env.DETAIL_SCROLL_CHECK_LOCALE ?? "ko";
const timeout = Number(process.env.DETAIL_SCROLL_CHECK_TIMEOUT ?? 30_000);
const tolerance = 2;

const routes = {
  review: process.env.DETAIL_SCROLL_CHECK_REVIEW_SLUG ?? "bill-gates",
  selection: process.env.DETAIL_SCROLL_CHECK_SELECTION_SLUG ?? "barack-obama",
};

const browser = await puppeteer.launch({ headless: true });

try {
  const reviewPage = await openPage(browser, routes.review);
  const review = await checkReviewScroll(reviewPage);
  await reviewPage.close();

  const selectionPage = await openPage(browser, routes.selection, { traceSeed: true });
  const seedToFull = await checkSeedToFullTransition(selectionPage);
  const selection = await checkDirectSelection(selectionPage);
  const navigation = await checkCollapsedGroupNavigation(selectionPage);
  await selectionPage.close();

  console.log(JSON.stringify({ status: "pass", review, selection, seedToFull, navigation }, null, 2));
} finally {
  await browser.close();
}

async function openPage(browserInstance, slug, { traceSeed = false } = {}) {
  const page = await browserInstance.newPage();
  await page.setViewport({ width: 1365, height: 768, deviceScaleFactor: 1 });
  if (traceSeed) await installSeedTrace(page);
  await page.goto(`${normalizedBaseUrl}/${locale}/celeb/${slug}`, {
    waitUntil: "networkidle2",
    timeout,
  });
  await page.waitForSelector("#library", { timeout });
  await page.waitForSelector("#library nav", { timeout });
  await page.waitForFunction(
    () => Boolean(document.querySelector('#library [data-testid="expand-selected-title"]')),
    { timeout },
  );
  await page.waitForFunction(
    () => document.querySelectorAll("#library h4").length >= 2,
    { timeout },
  );
  await settleLayout(page);
  return page;
}

async function checkReviewScroll(page) {
  const sections = await page.evaluate(() => {
    const assertElement = (value, label) => {
      if (!(value instanceof Element)) throw new Error(`Missing ${label}`);
    };
    const library = document.querySelector("#library");
    assertElement(library, "#library");

    const headings = [...library.querySelectorAll("h4")];
    const findSection = (patterns, label) => {
      const heading = headings.find((item) =>
        patterns.some((pattern) => pattern.test(item.textContent?.trim() ?? "")),
      );
      assertElement(heading, label);
      return heading.closest("section") ?? heading.parentElement;
    };

    const readSection = (section, label) => {
      assertElement(section, label);
      const scrollables = [section, ...section.querySelectorAll("*")]
        .filter((element) => {
          const style = getComputedStyle(element);
          return ["auto", "scroll"].includes(style.overflowY);
        })
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          className: element.className,
          range: Math.max(0, element.scrollHeight - element.clientHeight),
          overflowY: getComputedStyle(element).overflowY,
        }))
        .filter((element) => element.range > 0);

      return { label, scrollables };
    };

    return {
      intro: readSection(
        findSection(
          [/작품\s*소개/, /책\s*소개/, /영상\s*소개/, /게임\s*소개/, /음악\s*소개/, /(?:content|book|video|game|music)\s*intro/i],
          "content introduction section",
        ),
        "content introduction",
      ),
      review: readSection(
        findSection([/감상\s*배경/, /review/i], "review section"),
        "review",
      ),
    };
  });

  assert.equal(
    sections.intro.scrollables.length,
    0,
    `Content introduction has an inner vertical scroll range: ${JSON.stringify(sections.intro)}`,
  );
  assert.equal(
    sections.review.scrollables.length,
    0,
    `Review has an inner vertical scroll range: ${JSON.stringify(sections.review)}`,
  );

  const wheel = await wheelOverReview(page);
  assert(
    Math.abs(wheel.pageDelta) > 20,
    `Wheel over the review did not move the document: ${JSON.stringify(wheel)}`,
  );
  assert(
    Math.abs(wheel.innerDelta) <= tolerance,
    `Wheel over the review moved an inner scroller: ${JSON.stringify(wheel)}`,
  );

  return { sections, wheel };
}

async function wheelOverReview(page) {
  await page.evaluate(() => {
    const assertElement = (value, label) => {
      if (!(value instanceof Element)) throw new Error(`Missing ${label}`);
    };
    document.documentElement.style.scrollBehavior = "auto";
    const library = document.querySelector("#library");
    assertElement(library, "#library");
    const heading = [...library.querySelectorAll("h4")].find((item) =>
      /감상\s*배경|review/i.test(item.textContent?.trim() ?? ""),
    );
    assertElement(heading, "review heading");
    const section = heading.closest("section") ?? heading.parentElement;
    assertElement(section, "review section");
    const rect = section.getBoundingClientRect();
    window.scrollTo({
      top: Math.max(0, window.scrollY + rect.top - window.innerHeight * 0.4),
      behavior: "instant",
    });
  });
  await settleLayout(page);

  const point = await page.evaluate(() => {
    const assertElement = (value, label) => {
      if (!(value instanceof Element)) throw new Error(`Missing ${label}`);
    };
    const library = document.querySelector("#library");
    assertElement(library, "#library");
    const heading = [...library.querySelectorAll("h4")].find((item) =>
      /감상\s*배경|review/i.test(item.textContent?.trim() ?? ""),
    );
    assertElement(heading, "review heading");
    const section = heading.closest("section") ?? heading.parentElement;
    assertElement(section, "review section");
    const rect = section.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + Math.min(120, rect.height / 2) };
  });

  const before = await page.evaluate(() => {
    const library = document.querySelector("#library");
    const heading = [...(library?.querySelectorAll("h4") ?? [])].find((item) =>
      /감상\s*배경|review/i.test(item.textContent?.trim() ?? ""),
    );
    const section = heading?.closest("section") ?? heading?.parentElement;
    const inner = section
      ? [section, ...section.querySelectorAll("*")]
          .filter((element) => ["auto", "scroll"].includes(getComputedStyle(element).overflowY))
          .reduce((total, element) => total + element.scrollTop, 0)
      : 0;
    return { page: window.scrollY, inner };
  });
  await page.mouse.move(point.x, point.y);
  await page.mouse.wheel({ deltaY: 180 });
  await new Promise((resolve) => setTimeout(resolve, 180));
  const after = await page.evaluate(() => {
    const library = document.querySelector("#library");
    const heading = [...(library?.querySelectorAll("h4") ?? [])].find((item) =>
      /감상\s*배경|review/i.test(item.textContent?.trim() ?? ""),
    );
    const section = heading?.closest("section") ?? heading?.parentElement;
    const inner = section
      ? [section, ...section.querySelectorAll("*")]
          .filter((element) => ["auto", "scroll"].includes(getComputedStyle(element).overflowY))
          .reduce((total, element) => total + element.scrollTop, 0)
      : 0;
    return { page: window.scrollY, inner };
  });

  return {
    pageDelta: Math.round(after.page - before.page),
    innerDelta: Math.round(after.inner - before.inner),
  };
}

async function installSeedTrace(page) {
  await page.evaluateOnNewDocument(() => {
    const trace = {
      baseline: null,
      firstSelected: null,
      maxCount: 0,
      lastCountChangeAt: 0,
      records: [],
      lastRecord: null,
      scrolledForCheck: false,
    };
    window.__expandSeedTrace = trace;

    const stableIdentity = (button) => {
      if (!(button instanceof Element)) return null;
      const explicitId = ["id", "data-item-id", "data-content-id", "data-testid"]
        .map((name) => button.getAttribute(name))
        .find(Boolean);
      if (explicitId) return `id=${explicitId}`;
      const title = button.getAttribute("title") ?? button.querySelector("span:last-child")?.textContent?.trim();
      if (title) return `title=${title}`;
      return `aria=${button.getAttribute("aria-label") ?? ""}`;
    };

    const scan = () => {
      const library = document.querySelector("#library");
      const nav = library?.querySelector("nav");
      if (!(library instanceof Element) || !(nav instanceof HTMLElement)) return;
      const buttons = [...nav.querySelectorAll("button[aria-label]")];
      const selected = nav.querySelector('button[aria-current="true"]');
      const selectedIdentity = stableIdentity(selected);
      const identities = buttons.map(stableIdentity).filter(Boolean);

      if (!trace.scrolledForCheck && buttons.length > 0) {
        const rect = library.getBoundingClientRect();
        window.scrollTo({
          top: Math.max(0, window.scrollY + rect.top + 350),
          behavior: "instant",
        });
        trace.scrolledForCheck = true;
        trace.baseline = {
          windowY: window.scrollY,
          navScrollTop: nav.scrollTop,
          libraryTop: library.getBoundingClientRect().top,
          initialCount: buttons.length,
        };
        trace.firstSelected = selectedIdentity;
      }

      if (!trace.scrolledForCheck) return;
      const now = performance.now();
      const record = {
        at: Math.round(now),
        count: buttons.length,
        identities,
        navScrollTop: nav.scrollTop,
        windowY: window.scrollY,
        selectedIdentity,
      };
      trace.maxCount = Math.max(trace.maxCount, record.count);
      if (record.count !== trace.lastRecord?.count) trace.lastCountChangeAt = now;
      const changed =
        !trace.lastRecord ||
        record.count !== trace.lastRecord.count ||
        record.navScrollTop !== trace.lastRecord.navScrollTop ||
        record.windowY !== trace.lastRecord.windowY ||
        record.selectedIdentity !== trace.lastRecord.selectedIdentity;
      if (changed || trace.records.length < 5) trace.records.push(record);
      trace.lastRecord = record;
    };

    const observer = new MutationObserver(scan);
    const start = () => {
      if (!document.documentElement) {
        window.setTimeout(start, 0);
        return;
      }
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["aria-current", "aria-expanded", "class"],
      });
      window.addEventListener("DOMContentLoaded", scan, { once: false, passive: true });
      const intervalId = window.setInterval(scan, 50);
      window.__expandSeedTraceStop = () => {
        observer.disconnect();
        window.clearInterval(intervalId);
      };
      scan();
    };
    start();
  });
}

async function checkSeedToFullTransition(page) {
  const minimumFullItems = Number(process.env.DETAIL_SCROLL_CHECK_MIN_FULL_ITEMS ?? 35);
  const configuredMaximum = process.env.DETAIL_SCROLL_CHECK_MAX_FULL_ITEMS;
  const maximumFullItems = configuredMaximum ? Number(configuredMaximum) : null;

  try {
    await page.waitForFunction(
      ({ minimum }) => {
        const trace = window.__expandSeedTrace;
        return Boolean(
          trace?.scrolledForCheck &&
          trace.maxCount >= minimum &&
          performance.now() - trace.lastCountChangeAt >= 500,
        );
      },
      { timeout },
      { minimum: minimumFullItems },
    );
  } catch (error) {
    const trace = await page.evaluate(() => window.__expandSeedTrace);
    throw new Error(`Seed-to-full trace did not reach ${minimumFullItems} items: ${JSON.stringify(trace)}`, { cause: error });
  }
  await settleLayout(page);

  const result = await page.evaluate(() => {
    const trace = window.__expandSeedTrace;
    if (!trace?.baseline) throw new Error("Seed trace did not establish a scrolled baseline");
    const finalRecord = trace.lastRecord;
    if (!finalRecord) throw new Error("Seed trace did not record a post-baseline sample");
    const navDeltas = trace.records.map((record) =>
      Math.abs(record.navScrollTop - trace.baseline.navScrollTop),
    );
    const windowDeltas = trace.records.map((record) =>
      Math.abs(record.windowY - trace.baseline.windowY),
    );
    const result = {
      baseline: trace.baseline,
      firstSelected: trace.firstSelected,
      maxCount: trace.maxCount,
      final: {
        at: finalRecord.at,
        count: finalRecord.count,
        navScrollTop: finalRecord.navScrollTop,
        windowY: finalRecord.windowY,
        selectedIdentity: finalRecord.selectedIdentity,
      },
      initialPresentInFinal: Boolean(
        trace.firstSelected && finalRecord.identities.includes(trace.firstSelected),
      ),
      maxNavDelta: Math.max(...navDeltas, 0),
      maxWindowDelta: Math.max(...windowDeltas, 0),
      samples: trace.records.slice(0, 12).map((record) => ({
        at: record.at,
        count: record.count,
        navScrollTop: record.navScrollTop,
        windowY: record.windowY,
        selectedIdentity: record.selectedIdentity,
      })),
    };
    window.__expandSeedTraceStop?.();
    return result;
  });

  assert(
    result.maxCount >= minimumFullItems &&
      (maximumFullItems === null || result.maxCount <= maximumFullItems),
    `Unexpected full index count: ${JSON.stringify({ minimumFullItems, maximumFullItems, result })}`,
  );
  assert(
    result.maxCount > result.baseline.initialCount,
    `Seed-to-full transition did not produce a second, larger list state: ${JSON.stringify(result)}`,
  );
  assert.equal(
    result.final.count,
    result.maxCount,
    `Final seed trace sample did not retain the full list count: ${JSON.stringify(result)}`,
  );
  assert(
    result.baseline.libraryTop <= -300,
    `Seed trace did not run with #library scrolled into the page: ${JSON.stringify(result.baseline)}`,
  );
  assert(
    result.maxNavDelta <= tolerance,
    `Seed-to-full hydration moved the index scroll position: ${JSON.stringify(result)}`,
  );
  assert(
    result.maxWindowDelta <= tolerance,
    `Seed-to-full hydration moved the document without input: ${JSON.stringify(result)}`,
  );
  if (result.firstSelected && result.initialPresentInFinal) {
    assert.equal(
      result.final.selectedIdentity,
      result.firstSelected,
      `Seed-to-full hydration changed the selected content: ${JSON.stringify(result)}`,
    );
  }

  return result;
}

async function checkDirectSelection(page) {
  await page.evaluate(() => {
    const assertElement = (value, label) => {
      if (!(value instanceof Element)) throw new Error(`Missing ${label}`);
    };
    const library = document.querySelector("#library");
    assertElement(library, "#library");
    window.scrollTo({
      top: Math.max(0, window.scrollY + library.getBoundingClientRect().top + 350),
      behavior: "instant",
    });
    const nav = library.querySelector("nav");
    assertElement(nav, "expand index nav");
    nav.scrollTop = 0;
  });
  await settleLayout(page);

  const target = await page.evaluate(() => {
    const assertElement = (value, label) => {
      if (!(value instanceof Element)) throw new Error(`Missing ${label}`);
    };
    const library = document.querySelector("#library");
    assertElement(library, "#library");
    const nav = library.querySelector("nav");
    assertElement(nav, "expand index nav");
    const candidates = [...nav.querySelectorAll("button[aria-label]")].filter((button) => {
      const rect = button.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      return (
        button.getAttribute("aria-current") !== "true" &&
        rect.top >= navRect.top &&
        rect.bottom <= navRect.bottom
      );
    });
    const button = candidates
      .toSorted((left, right) => left.getBoundingClientRect().bottom - right.getBoundingClientRect().bottom)
      .at(-1);
    assertElement(button, "visible non-selected index item");
    const rect = button.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    if (!(rect.top >= navRect.top && rect.bottom <= navRect.bottom)) {
      throw new Error("target index item must be visible before click");
    }
    return {
      label: button.getAttribute("aria-label"),
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      navBottom: navRect.bottom,
      targetBottom: rect.bottom,
      bottomGap: navRect.bottom - rect.bottom,
    };
  });

  const before = await readSelectionMetrics(page, target.label);
  assert(
    before.targetBottom >= before.navBottom - 60,
    `Direct-click fixture did not place the target near the index viewport bottom: ${JSON.stringify({ target, before })}`,
  );
  await page.mouse.click(target.x, target.y);
  const samples = [];
  for (const delay of [0, 100, 250, 500, 1_000]) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    samples.push(await readSelectionMetrics(page, target.label));
  }

  const maxDelta = Math.max(
    ...samples.flatMap((sample) => [
      Math.abs(sample.windowY - before.windowY),
      Math.abs(sample.navScrollTop - before.navScrollTop),
      Math.abs(sample.targetTop - before.targetTop),
    ]),
  );
  assert(
    maxDelta <= tolerance,
    `Direct selection moved the document, index, or clicked item: ${JSON.stringify({ before, samples })}`,
  );
  assert(
    samples.some((sample) => sample.isSelected),
    `Direct click did not select the clicked index item: ${JSON.stringify({ target, before, samples })}`,
  );

  return { target, before, samples, maxDelta };
}

async function readSelectionMetrics(page, label) {
  return page.evaluate((targetLabel) => {
    const assertElement = (value, label) => {
      if (!(value instanceof Element)) throw new Error(`Missing ${label}`);
    };
    const library = document.querySelector("#library");
    const target = [...(library?.querySelectorAll("nav button[aria-label]") ?? [])].find(
      (button) => button.getAttribute("aria-label") === targetLabel,
    );
    assertElement(library, "#library");
    assertElement(target, targetLabel);
    const nav = target.closest("nav");
    assertElement(nav, "expand index nav");
    const navRect = nav.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    return {
      windowY: window.scrollY,
      navScrollTop: nav.scrollTop,
      navBottom: navRect.bottom,
      targetTop: targetRect.top,
      targetBottom: targetRect.bottom,
      isSelected: target.getAttribute("aria-current") === "true",
      selectedTitle: document.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim() ?? "",
    };
  }, label);
}

async function checkCollapsedGroupNavigation(page) {
  const before = await page.evaluate(() => {
    const assertElement = (value, label) => {
      if (!(value instanceof Element)) throw new Error(`Missing ${label}`);
    };
    const library = document.querySelector("#library");
    assertElement(library, "#library");
    const nav = library.querySelector("nav");
    assertElement(nav, "expand index nav");
    const selected = nav.querySelector('button[aria-current="true"]');
    assertElement(selected, "selected index item");
    const selectedGroup = selected.closest("section");
    assertElement(selectedGroup, "selected index group");
    const heading = selectedGroup.querySelector("h3 > button[aria-expanded]");
    assertElement(heading, "selected group heading");
    if (heading.getAttribute("aria-expanded") !== "false") heading.click();
    return { group: heading.id, selected: selected.getAttribute("aria-label") };
  });
  await settleLayout(page);

  const expandedGroupIds = await page.$$eval(
    '#library nav h3 > button[aria-expanded="true"]',
    (headings) => headings.map((heading) => heading.id),
  );
  for (const headingId of expandedGroupIds) {
    await page.evaluate((id) => document.getElementById(id)?.click(), headingId);
    await settleLayout(page);
  }

  const collapsed = await page.evaluate(() =>
    [...document.querySelectorAll("#library nav h3 > button[aria-expanded]")].map((heading) => ({
      id: heading.id,
      expanded: heading.getAttribute("aria-expanded"),
    })),
  );
  assert(
    collapsed.every((group) => group.expanded === "false"),
    `Could not close every index group before navigation: ${JSON.stringify(collapsed)}`,
  );

  const navigationSelector = (await page.$('[data-testid="expand-bottom-next"]:not([disabled])'))
    ? '[data-testid="expand-bottom-next"]'
    : '[data-testid="expand-bottom-prev"]:not([disabled])';
  const button = await page.$(navigationSelector);
  assert(button, "enabled previous/next navigation button");
  await page.evaluate((selector) => document.querySelector(selector)?.click(), navigationSelector);
  await settleLayout(page);
  await new Promise((resolve) => setTimeout(resolve, 260));

  const after = await page.evaluate(() => {
    const assertElement = (value, label) => {
      if (!(value instanceof Element)) throw new Error(`Missing ${label}`);
    };
    const nav = document.querySelector("#library nav");
    assertElement(nav, "expand index nav");
    const selected = nav.querySelector('button[aria-current="true"]');
    assertElement(selected, "selected index item after navigation");
    const group = selected.closest("section");
    assertElement(group, "selected index group after navigation");
    const heading = group.querySelector("h3 > button[aria-expanded]");
    assertElement(heading, "selected group heading after navigation");
    const navRect = nav.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    return {
      selected: selected.getAttribute("aria-label"),
      group: heading.id,
      expanded: heading.getAttribute("aria-expanded"),
      visible: selectedRect.top >= navRect.top && selectedRect.bottom <= navRect.bottom,
      navScrollTop: nav.scrollTop,
    };
  });

  assert.equal(after.expanded, "true", `Navigation left the selected group collapsed: ${JSON.stringify({ before, after })}`);
  assert(after.visible, `Navigation did not reveal the selected item: ${JSON.stringify({ before, after })}`);
  return { before, after };
}

async function settleLayout(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

function assertElement(value, label) {
  if (!(value instanceof Element)) throw new Error(`Missing ${label}`);
}

function readInnerScrollRange() {
  const library = document.querySelector("#library");
  if (!(library instanceof Element)) return 0;
  const reviewHeading = [...library.querySelectorAll("h4")].find((item) =>
    /감상\s*배경|review/i.test(item.textContent?.trim() ?? ""),
  );
  if (!(reviewHeading instanceof Element)) return 0;
  const section = reviewHeading.closest("section") ?? reviewHeading.parentElement;
  if (!(section instanceof Element)) return 0;
  return Math.max(
    0,
    ...[section, ...section.querySelectorAll("*")].map((element) =>
      Math.max(0, element.scrollHeight - element.clientHeight),
    ),
  );
}

void assertElement;
void readInnerScrollRange;
