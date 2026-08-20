import assert from "node:assert/strict";

import puppeteer from "puppeteer";

const baseUrl = process.env.DETAIL_SCROLL_CHECK_BASE_URL ?? "http://localhost:3000";
const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
const locale = process.env.DETAIL_SCROLL_CHECK_LOCALE ?? "ko";
const timeout = Number(process.env.DETAIL_SCROLL_CHECK_TIMEOUT ?? 30_000);
const entryStableDuration = Number(process.env.DETAIL_SCROLL_CHECK_ENTRY_DURATION ?? 2_500);
const expectedMobileEntryItems = Number(process.env.DETAIL_SCROLL_CHECK_ENTRY_ITEMS ?? 4);
const minimumExpandedIndexItems = Number(process.env.DETAIL_SCROLL_CHECK_MIN_FULL_ITEMS ?? 35);
const maximumInitialActionRequests = Number(
  process.env.DETAIL_SCROLL_CHECK_MAX_INITIAL_ACTIONS ?? 24,
);
const maximumRepeatedInitialAction = Number(
  process.env.DETAIL_SCROLL_CHECK_MAX_REPEATED_ACTION ?? 8,
);
const tolerance = 2;
const entryRequestTraces = new WeakMap();

const viewports = {
  desktop: { width: 1365, height: 768, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 1 },
};

const routes = {
  review: process.env.DETAIL_SCROLL_CHECK_REVIEW_SLUG ?? "bill-gates",
  selection: process.env.DETAIL_SCROLL_CHECK_SELECTION_SLUG ?? "barack-obama",
};

const browser = await puppeteer.launch({ headless: true });

try {
  const reviewPage = await openPage(browser, routes.review);
  const reviewEntry = await checkStableExpandedEntry(reviewPage);
  const review = await checkReviewScroll(reviewPage);
  await reviewPage.close();

  const selectionPage = await openPage(browser, routes.selection, {
    traceEntry: false,
    traceSeed: true,
  });
  const seedToFull = await checkSeedToFullTransition(selectionPage);
  const selection = await checkDirectSelection(selectionPage);
  const navigation = await checkCollapsedGroupNavigation(selectionPage);
  await selectionPage.close();

  const reviewMobilePage = await openPage(browser, routes.review, { viewport: viewports.mobile });
  const reviewMobileEntry = await checkStableListEntry(reviewMobilePage, "mobile");
  await reviewMobilePage.close();

  console.log(JSON.stringify({
    status: "pass",
    entry: {
      desktop: reviewEntry,
      mobile: reviewMobileEntry,
    },
    review,
    selection,
    seedToFull,
    navigation,
  }, null, 2));
} finally {
  await browser.close();
}

async function openPage(
  browserInstance,
  slug,
  { traceEntry = true, traceSeed = false, viewport = viewports.desktop } = {},
) {
  const page = await browserInstance.newPage();
  await page.setViewport(viewport);
  installRequestTrace(page);
  if (traceEntry) await installEntryTrace(page);
  if (traceSeed) await installSeedTrace(page);
  await page.goto(`${normalizedBaseUrl}/${locale}/celeb/${slug}`, {
    waitUntil: "networkidle2",
    timeout,
  });
  await page.waitForSelector("#library", { timeout });
  await page.waitForSelector('#library [data-testid="archive-view-toggle"]', { timeout });
  await settleLayout(page);
  return page;
}

function installRequestTrace(page) {
  const requests = [];
  entryRequestTraces.set(page, requests);
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    const headers = request.headers();
    const actionId = headers["next-action"] ?? null;
    requests.push({
      actionId,
      argumentShape: classifyActionArguments(request.postData()),
      path: new URL(request.url()).pathname,
    });
  });
}

function classifyActionArguments(postData) {
  if (!postData) return "none";
  try {
    const parsed = JSON.parse(postData);
    if (
      Array.isArray(parsed)
      && parsed.length === 2
      && typeof parsed[0] === "string"
      && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(parsed[0])
      && ["ko", "en"].includes(parsed[1])
    ) {
      return "content-brief";
    }
    if (
      Array.isArray(parsed)
      && parsed.length === 1
      && parsed[0]
      && typeof parsed[0] === "object"
      && "userId" in parsed[0]
      && "limit" in parsed[0]
    ) {
      return "library-list";
    }
    return `json-array-${Array.isArray(parsed) ? parsed.length : "other"}`;
  } catch {
    return "encoded";
  }
}

async function installEntryTrace(page) {
  await page.evaluateOnNewDocument(() => {
    const trace = {
      readyAt: null,
      firstLibraryAt: null,
      firstLibraryRecord: null,
      firstMode: null,
      firstModeAt: null,
      firstExpectedListAt: null,
      firstExpandAt: null,
      lastStateChangeAt: null,
      lastRecord: null,
      records: [],
    };
    window.__libraryEntryTrace = trace;

    const isRendered = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      if (
        style.display === "none"
        || style.visibility === "hidden"
        || style.visibility === "collapse"
        || Number.parseFloat(style.opacity) === 0
      ) {
        return false;
      }
      return [...element.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0);
    };

    const outerHeight = (element) => {
      if (!isRendered(element)) return 0;
      const style = getComputedStyle(element);
      const marginTop = Number.parseFloat(style.marginTop) || 0;
      const marginBottom = Number.parseFloat(style.marginBottom) || 0;
      return element.getBoundingClientRect().height + marginTop + marginBottom;
    };

    const readPagination = (library) => {
      const navs = [...library.querySelectorAll("nav")].filter((nav) =>
        nav.querySelector('button[aria-current="page"]'),
      );
      let visibleCount = 0;
      let wrapperHeight = 0;
      let dividerVisibleCount = 0;
      let footprintHeight = 0;
      for (const nav of navs) {
        const wrapper = nav.parentElement;
        const divider = wrapper?.previousElementSibling?.tagName === "HR"
          ? wrapper.previousElementSibling
          : null;
        if (isRendered(nav)) visibleCount += 1;
        if (wrapper instanceof HTMLElement && isRendered(wrapper)) {
          wrapperHeight += wrapper.getBoundingClientRect().height;
          footprintHeight += outerHeight(wrapper);
        }
        if (divider instanceof HTMLElement && isRendered(divider)) {
          dividerVisibleCount += 1;
          footprintHeight += outerHeight(divider);
        }
      }
      return {
        candidateCount: navs.length,
        visibleCount,
        wrapperHeight: Math.round(wrapperHeight),
        dividerVisibleCount,
        footprintHeight: Math.round(footprintHeight),
      };
    };

    const scan = () => {
      const library = document.querySelector("#library");
      if (!(library instanceof HTMLElement)) return;

      const toggle = library.querySelector('[data-testid="archive-view-toggle"]');
      const visibleExpandTitles = [...library.querySelectorAll('[data-testid="expand-selected-title"]')]
        .filter(isRendered);
      const visibleExpandSections = visibleExpandTitles
        .map((title) => title.closest("section"))
        .filter((section) => section instanceof HTMLElement && isRendered(section));
      const listGrids = [...library.querySelectorAll("div")].filter((element) =>
        element.style.gridTemplateColumns.includes("minmax(340px"),
      );
      const visibleListGrids = listGrids.filter(isRendered);
      const hasVisibleExpand = visibleExpandSections.length > 0;
      const hasVisibleList = visibleListGrids.length > 0;
      const mode = hasVisibleExpand && hasVisibleList
        ? "conflict"
        : hasVisibleExpand
          ? "expand"
          : hasVisibleList
            ? "list"
            : "pending";
      const listItemCount = hasVisibleList
        ? visibleListGrids.reduce((total, grid) => total + grid.children.length, 0)
        : null;
      const expandedSection = visibleExpandSections[0] ?? null;
      const nav = expandedSection?.querySelector("nav") ?? null;
      const visibleArticles = expandedSection
        ? [...expandedSection.querySelectorAll("article")].filter(isRendered)
        : [];
      const pagination = readPagination(library);
      const record = {
        at: Math.round(performance.now()),
        readyState: document.readyState,
        phase: trace.readyAt === null ? "before-load" : "after-load",
        mode,
        togglePresent: toggle instanceof HTMLElement,
        visibleExpandCount: visibleExpandSections.length,
        hiddenExpandCount: Math.max(0, library.querySelectorAll('[data-testid="expand-selected-title"]').length - visibleExpandTitles.length),
        visibleListGridCount: visibleListGrids.length,
        hiddenListGridCount: Math.max(0, listGrids.length - visibleListGrids.length),
        listItemCount,
        indexItemCount: nav?.querySelectorAll("button[aria-label]").length ?? 0,
        articleCount: visibleArticles.length,
        hasSkeleton: visibleArticles.some((article) => article.querySelector(".animate-pulse")),
        visibleListHeight: Math.round(visibleListGrids[0]?.getBoundingClientRect().height ?? 0),
        visibleExpandHeight: Math.round(expandedSection?.getBoundingClientRect().height ?? 0),
        visiblePaginationCount: pagination.visibleCount,
        paginationCandidateCount: pagination.candidateCount,
        paginationWrapperHeight: pagination.wrapperHeight,
        paginationDividerVisibleCount: pagination.dividerVisibleCount,
        paginationFootprintHeight: pagination.footprintHeight,
        libraryHeight: Math.round(library.getBoundingClientRect().height),
        windowY: Math.round(window.scrollY),
        navScrollTop: nav instanceof HTMLElement ? Math.round(nav.scrollTop) : 0,
        url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      };

      if (trace.firstLibraryAt === null) {
        trace.firstLibraryAt = record.at;
        trace.firstLibraryRecord = record;
      }
      if (trace.firstMode === null && record.mode !== "pending") {
        trace.firstMode = record.mode;
        trace.firstModeAt = record.at;
      }
      if (
        record.mode === "list"
        && record.listItemCount > 0
        && trace.firstExpectedListAt === null
      ) {
        trace.firstExpectedListAt = record.at;
      }
      if (record.mode === "expand" && trace.firstExpandAt === null) {
        trace.firstExpandAt = record.at;
      }

      const previous = trace.lastRecord;
      const changed = !previous
        || previous.mode !== record.mode
        || previous.readyState !== record.readyState
        || previous.phase !== record.phase
        || previous.togglePresent !== record.togglePresent
        || previous.visibleExpandCount !== record.visibleExpandCount
        || previous.hiddenExpandCount !== record.hiddenExpandCount
        || previous.visibleListGridCount !== record.visibleListGridCount
        || previous.hiddenListGridCount !== record.hiddenListGridCount
        || previous.listItemCount !== record.listItemCount
        || previous.indexItemCount !== record.indexItemCount
        || previous.articleCount !== record.articleCount
        || previous.hasSkeleton !== record.hasSkeleton
        || previous.visibleListHeight !== record.visibleListHeight
        || previous.visibleExpandHeight !== record.visibleExpandHeight
        || previous.visiblePaginationCount !== record.visiblePaginationCount
        || previous.paginationCandidateCount !== record.paginationCandidateCount
        || previous.paginationWrapperHeight !== record.paginationWrapperHeight
        || previous.paginationDividerVisibleCount !== record.paginationDividerVisibleCount
        || previous.paginationFootprintHeight !== record.paginationFootprintHeight
        || previous.libraryHeight !== record.libraryHeight
        || previous.windowY !== record.windowY
        || previous.navScrollTop !== record.navScrollTop
        || previous.url !== record.url;
      if (changed) trace.lastStateChangeAt = performance.now();
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
        attributeFilter: ["aria-busy", "aria-current", "class"],
      });
      window.addEventListener("scroll", scan, { passive: true });
      const markReady = () => {
        if (trace.readyAt !== null) return;
        trace.readyAt = performance.now();
        scan();
      };
      if (document.readyState === "complete") markReady();
      else window.addEventListener("load", markReady, { once: true, passive: true });
      const intervalId = window.setInterval(scan, 50);
      window.__libraryEntryTraceStop = () => {
        observer.disconnect();
        window.clearInterval(intervalId);
        window.removeEventListener("scroll", scan);
      };
      scan();
    };
    start();
  });
}

async function checkStableExpandedEntry(page) {
  try {
    await page.waitForFunction(
      ({ duration, minimumItems }) => {
        const trace = window.__libraryEntryTrace;
        const current = trace?.lastRecord;
        const stableSince = Math.max(
          trace?.firstExpandAt ?? 0,
          trace?.lastStateChangeAt ?? 0,
        );
        return Boolean(
          trace?.firstExpandAt !== null
          && current?.mode === "expand"
          && current.indexItemCount >= minimumItems
          && current.articleCount === 1
          && !current.hasSkeleton
          && stableSince > 0
          && performance.now() - stableSince >= duration,
        );
      },
      { timeout },
      { duration: entryStableDuration, minimumItems: minimumExpandedIndexItems },
    );
  } catch (error) {
    const trace = await page.evaluate(() => window.__libraryEntryTrace);
    throw new Error(
      `Fresh desktop entry did not settle directly into the large expanded library: ${JSON.stringify(trace)}`,
      { cause: error },
    );
  }

  const result = await page.evaluate(() => {
    const trace = window.__libraryEntryTrace;
    if (!trace) throw new Error("Missing fresh-entry trace");
    const isRendered = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      if (
        style.display === "none"
        || style.visibility === "hidden"
        || style.visibility === "collapse"
        || Number.parseFloat(style.opacity) === 0
      ) {
        return false;
      }
      return [...element.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0);
    };
    const records = trace.records.filter((record) => record.at >= (trace.firstExpandAt ?? 0) - 1);
    const paintEntries = performance.getEntriesByType("paint");
    const firstPaintAt = Math.min(
      ...paintEntries.map((entry) => entry.startTime),
      Number.POSITIVE_INFINITY,
    );
    const paintedRecords = Number.isFinite(firstPaintAt)
      ? trace.records.filter((record) => record.at >= firstPaintAt)
      : [];
    const firstPaintedRecord = paintedRecords.find((record) => record.mode !== "pending") ?? null;
    const windowPositions = records.map((record) => record.windowY);
    const navPositions = records.map((record) => record.navScrollTop);
    const library = document.querySelector("#library");
    const expandedTitle = [...(library?.querySelectorAll('[data-testid="expand-selected-title"]') ?? [])]
      .find(isRendered);
    const expandedSection = expandedTitle?.closest("section");
    const article = expandedSection?.querySelector("article");
    const cover = article?.querySelector("img");
    const articleRect = article?.getBoundingClientRect();
    const coverRect = cover?.getBoundingClientRect();
    const sectionRect = expandedSection?.getBoundingClientRect();
    const nav = expandedSection?.querySelector("nav");
    const navRect = nav?.getBoundingClientRect();
    const listGrid = library
      ? [...library.querySelectorAll("div")].find((element) =>
          element.style.gridTemplateColumns.includes("minmax(340px") && isRendered(element),
        )
      : null;
    const urls = [...new Set(records.map((record) => record.url))];
    window.__libraryEntryTraceStop?.();
    return {
      firstDomMode: trace.firstMode,
      firstModeAt: Math.round(trace.firstModeAt ?? 0),
      firstLibraryAt: Math.round(trace.firstLibraryAt ?? 0),
      firstLibraryRecord: trace.firstLibraryRecord,
      firstPaintAt: Number.isFinite(firstPaintAt) ? Math.round(firstPaintAt) : null,
      firstPaintedMode: firstPaintedRecord?.mode ?? null,
      firstPaintedRecord,
      loadAt: Math.round(trace.readyAt ?? 0),
      currentMode: expandedTitle ? "expand" : "list",
      articleCount: expandedSection?.querySelectorAll("article").length ?? 0,
      listItemCount: listGrid?.children.length ?? 0,
      indexItemCount: nav?.querySelectorAll("button[aria-label]").length ?? 0,
      sectionWidth: Math.round(sectionRect?.width ?? 0),
      detailWidth: Math.round(articleRect?.width ?? 0),
      coverWidth: Math.round(coverRect?.width ?? 0),
      coverHeight: Math.round(coverRect?.height ?? 0),
      indexWidth: Math.round(navRect?.width ?? 0),
      gridTemplateColumns: expandedSection ? getComputedStyle(expandedSection).gridTemplateColumns : "",
      observedListRecords: paintedRecords
        .filter((record) => record.mode === "list" || record.mode === "conflict")
        .slice(0, 12),
      visiblePaginationRecords: paintedRecords
        .filter((record) => (
          record.visiblePaginationCount > 0
          || record.paginationDividerVisibleCount > 0
          || record.paginationFootprintHeight > 0
        ))
        .slice(0, 12),
      pagination: trace.lastRecord
        ? {
            candidateCount: trace.lastRecord.paginationCandidateCount,
            visibleCount: trace.lastRecord.visiblePaginationCount,
            wrapperHeight: trace.lastRecord.paginationWrapperHeight,
            dividerVisibleCount: trace.lastRecord.paginationDividerVisibleCount,
            footprintHeight: trace.lastRecord.paginationFootprintHeight,
          }
        : null,
      windowDelta: Math.max(...windowPositions) - Math.min(...windowPositions),
      navDelta: Math.max(...navPositions) - Math.min(...navPositions),
      urls,
      samples: records.slice(0, 12),
    };
  });
  const requests = summarizeEntryRequests(page);
  result.requests = requests;

  assert(result.firstPaintAt !== null, `Desktop entry did not expose a browser paint timing: ${JSON.stringify(result)}`);
  assert.equal(result.firstPaintedMode, "expand", `Desktop first painted library presentation was not expanded: ${JSON.stringify(result)}`);
  assert.equal(result.currentMode, "expand", `Desktop fresh entry did not remain expanded: ${JSON.stringify(result)}`);
  assert.deepEqual(
    result.observedListRecords,
    [],
    `Desktop fresh entry exposed the four-card list before the expanded view: ${JSON.stringify(result)}`,
  );
  assert.equal(result.articleCount, 1, `Desktop expanded entry must render exactly one detail card: ${JSON.stringify(result)}`);
  assert.equal(result.listItemCount, 0, `Desktop expanded entry rendered the four-card list grid: ${JSON.stringify(result)}`);
  assert.deepEqual(
    result.visiblePaginationRecords,
    [],
    `Desktop expanded entry exposed list pagination or its divider: ${JSON.stringify(result)}`,
  );
  assert.equal(result.pagination?.visibleCount, 0, `Desktop expanded entry kept visible pagination: ${JSON.stringify(result)}`);
  assert.equal(result.pagination?.wrapperHeight, 0, `Desktop hidden pagination occupied layout height: ${JSON.stringify(result)}`);
  assert.equal(result.pagination?.dividerVisibleCount, 0, `Desktop hidden pagination left its divider visible: ${JSON.stringify(result)}`);
  assert.equal(result.pagination?.footprintHeight, 0, `Desktop hidden pagination occupied a layout footprint: ${JSON.stringify(result)}`);
  assert(result.indexItemCount >= minimumExpandedIndexItems, `Desktop expanded index did not load the content list: ${JSON.stringify(result)}`);
  assert(result.sectionWidth >= 900, `Desktop expanded presentation is not full-width: ${JSON.stringify(result)}`);
  assert(result.detailWidth >= 600, `Desktop selected detail card is too narrow: ${JSON.stringify(result)}`);
  assert(result.coverWidth >= 180 && result.coverHeight >= 270, `Desktop selected cover is not the large presentation: ${JSON.stringify(result)}`);
  assert(result.indexWidth >= 170, `Desktop expanded title rail is not open: ${JSON.stringify(result)}`);
  assert(result.windowDelta <= tolerance, `Desktop fresh entry moved the document without input: ${JSON.stringify(result)}`);
  assert(result.navDelta <= tolerance, `Desktop fresh entry moved the expanded index without input: ${JSON.stringify(result)}`);
  assert.equal(result.urls.length, 1, `Desktop fresh entry changed URL/hash without input: ${JSON.stringify(result)}`);
  assert(
    requests.nextActionCount <= maximumInitialActionRequests,
    `Desktop entry issued too many Server Actions (possible per-item detail fan-out): ${JSON.stringify(result)}`,
  );
  assert(
    requests.maximumActionCount <= maximumRepeatedInitialAction,
    `Desktop entry repeated one Server Action per content item: ${JSON.stringify(result)}`,
  );
  assert(
    requests.contentBriefCount <= 2,
    `Desktop entry fetched content briefs for more than the selected detail: ${JSON.stringify(result)}`,
  );
  return result;
}

function summarizeEntryRequests(page) {
  const requests = entryRequestTraces.get(page) ?? [];
  const nextActions = requests.filter((request) => request.actionId);
  const actionCounts = new Map();
  for (const request of nextActions) {
    actionCounts.set(request.actionId, (actionCounts.get(request.actionId) ?? 0) + 1);
  }
  return {
    postCount: requests.length,
    nextActionCount: nextActions.length,
    contentBriefCount: requests.filter((request) => request.argumentShape === "content-brief").length,
    libraryListCount: requests.filter((request) => request.argumentShape === "library-list").length,
    maximumActionCount: Math.max(0, ...actionCounts.values()),
    actionCounts: [...actionCounts.values()].sort((left, right) => right - left),
    argumentShapes: Object.fromEntries(
      [...new Set(requests.map((request) => request.argumentShape))].map((shape) => [
        shape,
        requests.filter((request) => request.argumentShape === shape).length,
      ]),
    ),
  };
}

async function checkStableListEntry(page, profile = "mobile") {
  try {
    await page.waitForFunction(
      ({ duration, itemCount }) => {
        const trace = window.__libraryEntryTrace;
        const current = trace?.lastRecord;
        const stableSince = Math.max(
          trace?.firstExpectedListAt ?? 0,
          trace?.lastStateChangeAt ?? 0,
        );
        return Boolean(
          trace?.firstExpectedListAt !== null
          && current?.mode === "list"
          && current.listItemCount === itemCount
          && stableSince > 0
          && performance.now() - stableSince >= duration,
        );
      },
      { timeout },
      { duration: entryStableDuration, itemCount: expectedMobileEntryItems },
    );
  } catch (error) {
    const trace = await page.evaluate(() => window.__libraryEntryTrace);
    throw new Error(`Fresh ${profile} entry did not keep a ${expectedMobileEntryItems}-item list stable for ${entryStableDuration}ms: ${JSON.stringify(trace)}`, { cause: error });
  }

  const baselineAt = await page.evaluate(() => {
    const trace = window.__libraryEntryTrace;
    return trace?.firstExpectedListAt ?? 0;
  });
  const result = await page.evaluate(({ baselineAt: startedAt, itemCount }) => {
    const trace = window.__libraryEntryTrace;
    if (!trace) throw new Error("Missing fresh-entry trace");
    const paintEntries = performance.getEntriesByType("paint");
    const firstPaintAt = Math.min(
      ...paintEntries.map((entry) => entry.startTime),
      Number.POSITIVE_INFINITY,
    );
    const paintedRecords = Number.isFinite(firstPaintAt)
      ? trace.records.filter((record) => record.at >= firstPaintAt)
      : [];
    const records = paintedRecords.filter((record) => record.at >= startedAt - 1);
    const firstPaintedRecord = paintedRecords.find((record) => record.mode !== "pending") ?? null;
    const heights = records.map((record) => record.libraryHeight);
    const windowPositions = records.map((record) => record.windowY);
    const current = trace.lastRecord;
    window.__libraryEntryTraceStop?.();
    return {
      firstDomMode: trace.firstMode,
      firstPaintAt: Number.isFinite(firstPaintAt) ? Math.round(firstPaintAt) : null,
      firstPaintedMode: firstPaintedRecord?.mode ?? null,
      firstPaintedRecord,
      firstLibraryAt: trace.firstLibraryAt,
      firstLibraryRecord: trace.firstLibraryRecord,
      currentMode: current?.mode ?? "pending",
      currentItemCount: current?.listItemCount ?? 0,
      hiddenExpandCount: current?.hiddenExpandCount ?? 0,
      visibleExpandRecords: paintedRecords
        .filter((record) => record.mode === "expand" || record.mode === "conflict")
        .slice(0, 12),
      pagination: current
        ? {
            candidateCount: current.paginationCandidateCount,
            visibleCount: current.visiblePaginationCount,
            wrapperHeight: current.paginationWrapperHeight,
            dividerVisibleCount: current.paginationDividerVisibleCount,
            footprintHeight: current.paginationFootprintHeight,
          }
        : null,
      minHeight: Math.min(...heights),
      maxHeight: Math.max(...heights),
      heightDelta: Math.max(...heights) - Math.min(...heights),
      windowDelta: Math.max(...windowPositions) - Math.min(...windowPositions),
      unexpectedStates: records
        .filter((record) => record.mode !== "list" || record.listItemCount !== itemCount)
        .slice(0, 12),
      samples: records.slice(0, 12),
    };
  }, { baselineAt, itemCount: expectedMobileEntryItems });

  assert(result.firstPaintAt !== null, `Fresh ${profile} entry did not expose browser paint timing: ${JSON.stringify(result)}`);
  assert.equal(result.firstPaintedMode, "list", `Fresh ${profile} first painted library mode was not the list: ${JSON.stringify(result)}`);
  assert.equal(result.currentMode, "list", `Fresh ${profile} entry switched view mode without input: ${JSON.stringify(result)}`);
  assert.equal(result.currentItemCount, expectedMobileEntryItems, `Fresh ${profile} entry did not retain ${expectedMobileEntryItems} list items: ${JSON.stringify(result)}`);
  assert.deepEqual(result.visibleExpandRecords, [], `Fresh ${profile} entry visibly rendered expand mode: ${JSON.stringify(result)}`);
  assert.deepEqual(result.unexpectedStates, [], `Fresh ${profile} entry changed mode or item count after its baseline: ${JSON.stringify(result)}`);
  assert.equal(result.pagination?.candidateCount, 1, `Fresh ${profile} entry did not retain one pagination block: ${JSON.stringify(result)}`);
  assert.equal(result.pagination?.visibleCount, 1, `Fresh ${profile} list pagination was not visible: ${JSON.stringify(result)}`);
  assert.equal(result.pagination?.dividerVisibleCount, 1, `Fresh ${profile} list pagination divider was not visible: ${JSON.stringify(result)}`);
  assert((result.pagination?.wrapperHeight ?? 0) >= 60, `Fresh ${profile} pagination wrapper lost its full height: ${JSON.stringify(result)}`);
  assert(
    (result.pagination?.footprintHeight ?? 0) >= (result.pagination?.wrapperHeight ?? 0) + 48,
    `Fresh ${profile} pagination divider/margins are missing from its layout footprint: ${JSON.stringify(result)}`,
  );
  assert(result.windowDelta <= tolerance, `Fresh ${profile} entry moved the document without input: ${JSON.stringify(result)}`);
  assert(result.heightDelta <= 160, `Fresh ${profile} entry caused a large library height flip: ${JSON.stringify(result)}`);
  return result;
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
      const ariaLabel = button.getAttribute("aria-label");
      if (ariaLabel) return `aria=${ariaLabel}`;
      return null;
    };

    const scan = () => {
      const library = document.querySelector("#library");
      const nav = library?.querySelector("nav button[aria-label]")?.closest("nav");
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
          initialIdentities: identities,
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
      initialItemsPresentInFinal: trace.baseline.initialIdentities.every((identity) =>
        finalRecord.identities.includes(identity),
      ),
      finalIdentityCount: finalRecord.identities.length,
      finalUniqueIdentityCount: new Set(finalRecord.identities).size,
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
  assert(
    result.firstSelected,
    `Seed-to-full transition did not establish an initially selected item: ${JSON.stringify(result)}`,
  );
  assert.equal(
    result.initialPresentInFinal,
    true,
    `Seed-to-full transition dropped the initially selected item: ${JSON.stringify(result)}`,
  );
  assert.equal(
    result.initialItemsPresentInFinal,
    true,
    `Seed-to-full transition dropped one or more seed items: ${JSON.stringify(result)}`,
  );
  assert.equal(
    result.finalIdentityCount,
    result.final.count,
    `Full index contains an item without a stable identity: ${JSON.stringify(result)}`,
  );
  assert.equal(
    result.finalUniqueIdentityCount,
    result.finalIdentityCount,
    `Full index contains duplicate item identities: ${JSON.stringify(result)}`,
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
  assert.equal(
    result.final.selectedIdentity,
    result.firstSelected,
    `Seed-to-full hydration changed the selected content: ${JSON.stringify(result)}`,
  );

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
    const nav = library.querySelector("nav button[aria-label]")?.closest("nav");
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
    const nav = library.querySelector("nav button[aria-label]")?.closest("nav");
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
      title: button.getAttribute("title")?.trim() ?? "",
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
  assert(target.title, `Direct-click target is missing its content title: ${JSON.stringify(target)}`);
  await page.mouse.click(target.x, target.y);
  await page.waitForFunction(
    ({ label, title }) => {
      const targetButton = [...document.querySelectorAll("#library nav button[aria-label]")].find(
        (button) => button.getAttribute("aria-label") === label,
      );
      const selectedTitle = document
        .querySelector('[data-testid="expand-selected-title"]')
        ?.textContent
        ?.trim();
      return targetButton?.getAttribute("aria-current") === "true" && selectedTitle === title;
    },
    { timeout },
    { label: target.label, title: target.title },
  );
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
    samples.every((sample) => sample.isSelected),
    `Direct click did not keep the clicked index item selected: ${JSON.stringify({ target, before, samples })}`,
  );
  assert(
    samples.every((sample) => sample.selectedTitle === target.title),
    `Direct click did not keep the selected detail title in sync: ${JSON.stringify({ target, before, samples })}`,
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
    const nav = library.querySelector("nav button[aria-label]")?.closest("nav");
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
    const nav = document.querySelector("#library nav button[aria-label]")?.closest("nav");
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
