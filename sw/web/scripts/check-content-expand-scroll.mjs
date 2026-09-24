import assert from "node:assert/strict";

import puppeteer from "puppeteer";

const baseUrl = process.env.DETAIL_SCROLL_CHECK_BASE_URL ?? "http://localhost:3000";
const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
const locale = process.env.DETAIL_SCROLL_CHECK_LOCALE ?? "ko";
const timeout = Number(process.env.DETAIL_SCROLL_CHECK_TIMEOUT ?? 30_000);
const entryStableDuration = Number(process.env.DETAIL_SCROLL_CHECK_ENTRY_DURATION ?? 2_500);
const maximumInitialActionRequests = Number(
  process.env.DETAIL_SCROLL_CHECK_MAX_INITIAL_ACTIONS ?? 24,
);
const maximumRepeatedInitialAction = Number(
  process.env.DETAIL_SCROLL_CHECK_MAX_REPEATED_ACTION ?? 8,
);
const tolerance = 2;
// 감상배경 상자의 최소 높이. 15px 본문에 줄높이 1.85, 16줄 기준(약 444px)에서 여유를 뒀다
const minimumReviewBoxHeight = Number(process.env.DETAIL_SCROLL_CHECK_MIN_REVIEW_BOX ?? 380);
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
  });
  const index = await checkExpandIndexContents(selectionPage);
  const selection = await checkDirectSelection(selectionPage);
  const navigation = await checkArrowNavigationReveal(selectionPage);
  await selectionPage.close();

  const reviewMobilePage = await openPage(browser, routes.review, { viewport: viewports.mobile });
  const reviewMobileEntry = await checkStableExpandedEntryMobile(reviewMobilePage, "mobile");
  await reviewMobilePage.close();

  console.log(JSON.stringify({
    status: "pass",
    entry: {
      desktop: reviewEntry,
      mobile: reviewMobileEntry,
    },
    review,
    index,
    selection,
    navigation,
  }, null, 2));
} finally {
  await browser.close();
}

async function openPage(
  browserInstance,
  slug,
  { traceEntry = true, viewport = viewports.desktop } = {},
) {
  const page = await browserInstance.newPage();
  await page.setViewport(viewport);
  installRequestTrace(page);
  if (traceEntry) await installEntryTrace(page);
  await page.goto(`${normalizedBaseUrl}/${locale}/celeb/${slug}`, {
    waitUntil: "networkidle2",
    timeout,
  });
  await page.waitForSelector("#library", { timeout });
  // 인물 서가는 펼침으로 고정이라 보기 전환 버튼이 없다 — 펼침 머리 제목이 뜨면 준비된 것이다
  await page.waitForSelector('#library [data-testid="expand-selected-title"]', { timeout });
  await settleLayout(page);
  return page;
}

/* 색인은 상단 「리뷰 목록」 토글이 여는 공용 모달이다 — 본문 안에 상주하지 않는다.
   고르는 순간 모달이 닫히므로 재는 동안에만 열어 둔다. */
async function openExpandIndexModal(page) {
  const clicked = await page.evaluate(() => {
    const toggle = [...document.querySelectorAll('[data-testid="archive-index-toggle"]')]
      .find((element) => element.getClientRects().length > 0);
    if (!(toggle instanceof HTMLElement)) return false;
    if (toggle.getAttribute("aria-expanded") !== "true") toggle.click();
    return true;
  });
  assert(clicked, "Missing archive index toggle");
  await page.waitForSelector('[role="dialog"] nav button[aria-label]', { timeout });
  await settleLayout(page);
  // 열리면 선택 항목을 가운데로 맞춘다 — 그 배치가 끝나고 재야 수치가 흔들리지 않는다
  await new Promise((resolve) => setTimeout(resolve, 200));
}

async function closeExpandIndexModal(page) {
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => !document.querySelector('[role="dialog"] nav'),
    { timeout },
  );
}

function readExpandIndexNav(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('[role="dialog"] nav');
    if (!(nav instanceof HTMLElement)) return null;
    const items = [...nav.querySelectorAll("button[aria-label]")];
    const selected = nav.querySelector('button[aria-current="true"]');
    const navRect = nav.getBoundingClientRect();
    const selectedRect = selected?.getBoundingClientRect();
    return {
      itemCount: items.length,
      identities: items.map((button) => button.getAttribute("data-original-index") ?? ""),
      selectedLabel: selected?.getAttribute("aria-label") ?? null,
      selectedVisible: Boolean(
        selectedRect
        && selectedRect.top >= navRect.top
        && selectedRect.bottom <= navRect.bottom,
      ),
      navScrollTop: nav.scrollTop,
      navScrollRange: Math.max(0, nav.scrollHeight - nav.clientHeight),
      navWidth: Math.round(navRect.width),
      windowY: window.scrollY,
    };
  });
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
      ({ duration }) => {
        const trace = window.__libraryEntryTrace;
        const current = trace?.lastRecord;
        const stableSince = Math.max(
          trace?.firstExpandAt ?? 0,
          trace?.lastStateChangeAt ?? 0,
        );
        return Boolean(
          trace?.firstExpandAt !== null
          && current?.mode === "expand"
          && current.articleCount === 1
          && !current.hasSkeleton
          && stableSince > 0
          && performance.now() - stableSince >= duration,
        );
      },
      { timeout },
      { duration: entryStableDuration },
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
    const cover = article?.querySelector('[data-testid="expand-cover"]');
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
  assert(result.sectionWidth >= 900, `Desktop expanded presentation is not full-width: ${JSON.stringify(result)}`);
  assert(result.detailWidth >= 600, `Desktop selected detail card is too narrow: ${JSON.stringify(result)}`);
  assert(result.coverWidth >= 180 && result.coverHeight >= 270, `Desktop selected cover is not the large presentation: ${JSON.stringify(result)}`);
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

/* 모바일도 펼침으로 곧장 들어간다 — 첫 그림이 펼침 한 장으로 안정되는지 본다 */
async function checkStableExpandedEntryMobile(page, profile = "mobile") {
  try {
    await page.waitForFunction(
      ({ duration }) => {
        const trace = window.__libraryEntryTrace;
        const current = trace?.lastRecord;
        const stableSince = Math.max(
          trace?.firstExpandAt ?? 0,
          trace?.lastStateChangeAt ?? 0,
        );
        return Boolean(
          trace?.firstExpandAt !== null
          && current?.mode === "expand"
          && current.articleCount === 1
          && !current.hasSkeleton
          && stableSince > 0
          && performance.now() - stableSince >= duration,
        );
      },
      { timeout },
      { duration: entryStableDuration },
    );
  } catch (error) {
    const trace = await page.evaluate(() => window.__libraryEntryTrace);
    throw new Error(`Fresh ${profile} entry did not settle into the expanded library: ${JSON.stringify(trace)}`, { cause: error });
  }

  const baselineAt = await page.evaluate(() => {
    const trace = window.__libraryEntryTrace;
    return trace?.firstExpandAt ?? 0;
  });
  const result = await page.evaluate(({ baselineAt: startedAt }) => {
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
      articleCount: current?.articleCount ?? 0,
      visibleListRecords: paintedRecords
        .filter((record) => record.mode === "list" || record.mode === "conflict")
        .slice(0, 12),
      minHeight: Math.min(...heights),
      maxHeight: Math.max(...heights),
      heightDelta: Math.max(...heights) - Math.min(...heights),
      windowDelta: Math.max(...windowPositions) - Math.min(...windowPositions),
      unexpectedStates: records
        .filter((record) => record.mode !== "expand")
        .slice(0, 12),
      samples: records.slice(0, 12),
    };
  }, { baselineAt });

  assert(result.firstPaintAt !== null, `Fresh ${profile} entry did not expose browser paint timing: ${JSON.stringify(result)}`);
  assert.equal(result.firstPaintedMode, "expand", `Fresh ${profile} first painted library mode was not expanded: ${JSON.stringify(result)}`);
  assert.equal(result.currentMode, "expand", `Fresh ${profile} entry switched view mode without input: ${JSON.stringify(result)}`);
  assert.equal(result.articleCount, 1, `Fresh ${profile} entry must render exactly one detail card: ${JSON.stringify(result)}`);
  assert.deepEqual(result.visibleListRecords, [], `Fresh ${profile} entry visibly rendered the list grid: ${JSON.stringify(result)}`);
  assert.deepEqual(result.unexpectedStates, [], `Fresh ${profile} entry changed mode after its baseline: ${JSON.stringify(result)}`);
  assert(result.windowDelta <= tolerance, `Fresh ${profile} entry moved the document without input: ${JSON.stringify(result)}`);
  assert(result.heightDelta <= 160, `Fresh ${profile} entry caused a large library height flip: ${JSON.stringify(result)}`);
  return result;
}

function readSectionScrollables(page, patterns, label) {
  return page.evaluate(
    (sources, sectionLabel) => {
      const assertElement = (value, name) => {
        if (!(value instanceof Element)) throw new Error(`Missing ${name}`);
      };
      const library = document.querySelector("#library");
      assertElement(library, "#library");
      const regexes = sources.map((source) => new RegExp(source, "i"));
      const heading = [...library.querySelectorAll("h4")].find((item) =>
        regexes.some((pattern) => pattern.test(item.textContent?.trim() ?? "")),
      );
      assertElement(heading, `${sectionLabel} section`);
      const section = heading.closest("section") ?? heading.parentElement;
      assertElement(section, `${sectionLabel} section`);
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
          overscrollY: getComputedStyle(element).overscrollBehaviorY,
          clientHeight: element.clientHeight,
        }))
        .filter((element) => element.range > 0);
      return { label: sectionLabel, scrollables };
    },
    patterns,
    label,
  );
}

async function checkReviewScroll(page) {
  // 소개와 감상 배경이 한 덩어리로 함께 문서에 있다 — 두 칸을 순서대로 잰다
  const intro = await readSectionScrollables(
    page,
    ["작품\\s*소개", "책\\s*소개", "영상\\s*소개", "게임\\s*소개", "음악\\s*소개", "(?:content|book|video|game|music)\\s*intro"],
    "content introduction",
  );
  const review = await readSectionScrollables(page, ["감상\\s*배경", "review"], "review");
  const sections = { intro, review };

  assert.equal(
    sections.intro.scrollables.length,
    0,
    `Content introduction has an inner vertical scroll range: ${JSON.stringify(sections.intro)}`,
  );
  /* 감상배경은 긴 글만 상자 안에서 굴린다. 두 가지를 지켜야 한다.
     하나, 상자가 넉넉해 짧은 글은 아예 스크롤이 생기지 않을 것.
     둘, overscroll을 막지 않아 상자 끝에 닿으면 휠이 페이지로 넘어갈 것.
     예전에 상자를 6줄로 좁힌 채 휠을 코드로 가로채려다 실패했다. 그 조합을 다시 만들지 않는다. */
  for (const scroller of sections.review.scrollables) {
    assert(
      !["contain", "none"].includes(scroller.overscrollY),
      `Review scroller traps overscroll — the wheel cannot reach the page: ${JSON.stringify(scroller)}`,
    );
    assert(
      scroller.clientHeight >= minimumReviewBoxHeight,
      `Review box is too short (${scroller.clientHeight}px < ${minimumReviewBoxHeight}px): ${JSON.stringify(scroller)}`,
    );
  }

  const wheel = await wheelOverReview(page);
  if (wheel.hadInnerRange) {
    assert(
      Math.abs(wheel.innerDelta) > tolerance,
      `Wheel over the long review did not move the review box: ${JSON.stringify(wheel)}`,
    );
    assert(
      Math.abs(wheel.pageDeltaAtBottom) > 20,
      `Wheel at the review box bottom did not chain to the document: ${JSON.stringify(wheel)}`,
    );
  } else {
    assert(
      Math.abs(wheel.pageDelta) > 20,
      `Wheel over the short review did not move the document: ${JSON.stringify(wheel)}`,
    );
  }

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
    const range = section
      ? [section, ...section.querySelectorAll("*")]
          .filter((element) => ["auto", "scroll"].includes(getComputedStyle(element).overflowY))
          .reduce((total, element) => total + Math.max(0, element.scrollHeight - element.clientHeight), 0)
      : 0;
    return { page: window.scrollY, inner, range };
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

  /* 상자를 끝까지 내린 뒤 한 번 더 굴린다. 여기서 페이지가 움직여야 휠이 상자에 갇히지 않는다 —
     예전에 이게 안 돼 휠을 코드로 가로챘고, 그 보정이 브라우저마다 튀어 스크롤을 통째로 걷어냈다. */
  let pageDeltaAtBottom = 0;
  if (before.range > tolerance) {
    await page.evaluate(() => {
      const library = document.querySelector("#library");
      const heading = [...(library?.querySelectorAll("h4") ?? [])].find((item) =>
        /감상\s*배경|review/i.test(item.textContent?.trim() ?? ""),
      );
      const section = heading?.closest("section") ?? heading?.parentElement;
      if (!section) return;
      for (const element of [section, ...section.querySelectorAll("*")]) {
        if (["auto", "scroll"].includes(getComputedStyle(element).overflowY)) {
          element.scrollTop = element.scrollHeight;
        }
      }
    });
    await settleLayout(page);

    const atBottom = await page.evaluate(() => window.scrollY);
    /* 브라우저는 한 손짓이 이어지는 동안 스크롤을 상자에 붙잡아 둔다(래칭).
       사람도 몇 번 더 굴려야 넘어가므로 검사도 여러 번 굴려 본다. */
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.mouse.wheel({ deltaY: 200 });
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    const afterBottom = await page.evaluate(() => window.scrollY);
    pageDeltaAtBottom = Math.round(afterBottom - atBottom);
  }

  return {
    hadInnerRange: before.range > tolerance,
    innerRange: Math.round(before.range),
    pageDelta: Math.round(after.page - before.page),
    innerDelta: Math.round(after.inner - before.inner),
    pageDeltaAtBottom,
  };
}

/* 색인은 모달로 열리고 지금 고른 분류의 목록만 담는다 — 모달이 약속한 수만큼
   빠짐없이 실렸는지, 선택 항목이 표시·노출됐는지 본다. */
async function checkExpandIndexContents(page) {
  await openExpandIndexModal(page);
  const result = await readExpandIndexNav(page);
  assert(result, "Expand index modal did not render its nav");
  const promised = await page.evaluate(() => {
    const checked = document.querySelector('[role="dialog"] [role="radiogroup"] [aria-checked="true"]');
    const countText = checked?.querySelector(".tabular-nums")?.textContent?.trim() ?? "";
    const parsed = Number.parseInt(countText, 10);
    return Number.isFinite(parsed) ? parsed : null;
  });
  assert(result.itemCount >= 1, `Expand index rendered no items: ${JSON.stringify(result)}`);
  if (promised !== null) {
    assert.equal(
      result.itemCount,
      promised,
      `Expand index did not load the promised category list: ${JSON.stringify({ promised, result })}`,
    );
  }
  const identities = result.identities.filter(Boolean);
  assert.equal(
    identities.length,
    result.itemCount,
    `Expand index contains an item without a stable identity: ${JSON.stringify(result)}`,
  );
  assert.equal(
    new Set(identities).size,
    identities.length,
    `Expand index contains duplicate item identities: ${JSON.stringify(result)}`,
  );
  assert(
    result.selectedLabel,
    `Expand index did not mark the selected item: ${JSON.stringify(result)}`,
  );
  assert(
    result.selectedVisible,
    `Expand index did not reveal the selected item: ${JSON.stringify(result)}`,
  );
  assert(result.navWidth >= 170, `Expand index rail is too narrow: ${JSON.stringify(result)}`);
  await closeExpandIndexModal(page);
  return result;
}

/* 색인 항목을 직접 누르면 그 작품이 고르해지고 모달은 닫힌다.
   문서가 밀리지 않는지, 선택 표시가 유지되는지 본다. */
async function checkDirectSelection(page) {
  await openExpandIndexModal(page);

  const target = await page.evaluate(() => {
    const assertElement = (value, label) => {
      if (!(value instanceof Element)) throw new Error(`Missing ${label}`);
    };
    const nav = document.querySelector('[role="dialog"] nav');
    assertElement(nav, "expand index nav");
    const navRect = nav.getBoundingClientRect();
    const candidates = [...nav.querySelectorAll("button[aria-label]")].filter((button) => {
      const rect = button.getBoundingClientRect();
      return (
        button.getAttribute("aria-current") !== "true"
        && rect.top >= navRect.top
        && rect.bottom <= navRect.bottom
      );
    });
    const button = candidates
      .toSorted((left, right) => left.getBoundingClientRect().bottom - right.getBoundingClientRect().bottom)
      .at(-1);
    assertElement(button, "visible non-selected index item");
    const rect = button.getBoundingClientRect();
    return {
      label: button.getAttribute("aria-label"),
      title: button.getAttribute("title")?.trim() ?? "",
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      windowY: window.scrollY,
    };
  });
  assert(target.title, `Direct-click target is missing its content title: ${JSON.stringify(target)}`);

  await page.mouse.click(target.x, target.y);
  // 고르면 색인 모달이 닫히고 머리 제목이 새 작품으로 바뀐다
  await page.waitForFunction(
    (title) => (
      document.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim() === title
      && !document.querySelector('[role="dialog"] nav')
    ),
    { timeout },
    target.title,
  );

  const afterWindowY = await page.evaluate(() => window.scrollY);
  assert(
    Math.abs(afterWindowY - target.windowY) <= tolerance,
    `Direct selection moved the document: ${JSON.stringify({ target, afterWindowY })}`,
  );

  // 모달을 다시 열어 누른 항목에 선택 표시가 남았는지 본다
  await openExpandIndexModal(page);
  const after = await page.evaluate((label) => {
    const button = [...document.querySelectorAll('[role="dialog"] nav button[aria-label]')]
      .find((element) => element.getAttribute("aria-label") === label);
    return {
      isSelected: button?.getAttribute("aria-current") === "true",
      selectedTitle: document.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim() ?? "",
    };
  }, target.label);
  assert(
    after.isSelected,
    `Direct click did not keep the clicked index item selected: ${JSON.stringify({ target, after })}`,
  );
  assert.equal(
    after.selectedTitle,
    target.title,
    `Direct click did not keep the selected detail title in sync: ${JSON.stringify({ target, after })}`,
  );
  await closeExpandIndexModal(page);

  return { target, afterWindowY, after };
}

/* 화살표로 작품을 넘기면 색인을 다시 열었을 때 새 선택 항목이 보여야 한다.
   색인 모달은 열릴 때 선택 항목을 가운데로 맞춘다 — 그 약속을 확인한다. */
async function checkArrowNavigationReveal(page) {
  const before = await page.evaluate(() => ({
    title: document.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim() ?? "",
    windowY: window.scrollY,
  }));

  const navigationSelector = (await page.$('[data-testid="expand-desktop-next"]:not([disabled])'))
    ? '[data-testid="expand-desktop-next"]'
    : '[data-testid="expand-desktop-prev"]:not([disabled])';
  const button = await page.$(navigationSelector);
  assert(button, "enabled previous/next navigation button");
  await page.evaluate((selector) => document.querySelector(selector)?.click(), navigationSelector);
  await settleLayout(page);
  await new Promise((resolve) => setTimeout(resolve, 260));

  const moved = await page.evaluate(() => ({
    title: document.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim() ?? "",
    windowY: window.scrollY,
  }));
  assert(
    moved.title && moved.title !== before.title,
    `Navigation did not change the selected work: ${JSON.stringify({ before, moved })}`,
  );

  await openExpandIndexModal(page);
  const after = await readExpandIndexNav(page);
  assert(after, "Expand index modal did not render its nav after navigation");
  assert(
    after.selectedLabel,
    `Navigation left no selected index item: ${JSON.stringify({ before, after })}`,
  );
  assert(
    after.selectedVisible,
    `Navigation did not reveal the selected item in the index: ${JSON.stringify({ before, after })}`,
  );
  await closeExpandIndexModal(page);

  return { before, moved, after };
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

void assertElement;
