import assert from "node:assert/strict";

import puppeteer from "puppeteer";

const baseUrl = (process.env.DETAIL_INDEX_CHECK_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const locale = process.env.DETAIL_INDEX_CHECK_LOCALE ?? "ko";
const slug = process.env.DETAIL_INDEX_CHECK_SLUG ?? "bill-gates";
const timeout = Number(process.env.DETAIL_INDEX_CHECK_TIMEOUT ?? 30_000);
const minimumItems = Number(process.env.DETAIL_INDEX_CHECK_MIN_ITEMS ?? 140);
const cpuRate = Number(process.env.DETAIL_INDEX_CHECK_CPU_RATE ?? 6);
const interactionBudget = Number(process.env.DETAIL_INDEX_CHECK_INTERACTION_BUDGET ?? 200);
const selectionFeedbackGapBudget = Number(process.env.DETAIL_INDEX_CHECK_FEEDBACK_GAP_BUDGET ?? 50);
const longTaskBudget = Number(process.env.DETAIL_INDEX_CHECK_LONG_TASK_BUDGET ?? 200);
const hoverBudget = Number(process.env.DETAIL_INDEX_CHECK_HOVER_BUDGET ?? 100);

const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1365, height: 768, deviceScaleFactor: 1 });
  let holdInitialPostRequests = true;
  const heldInitialPostRequests = [];
  const requestRecords = [];
  let listTransitionGate = null;
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const record = describeRequest(request);
    requestRecords.push(record);
    if (holdInitialPostRequests && request.method() === "POST") {
      heldInitialPostRequests.push(request);
      return;
    }
    if (
      listTransitionGate
      && !listTransitionGate.request
      && record.argumentShape === "library-list"
      && record.argumentDetails?.limit === 4
    ) {
      listTransitionGate.request = request;
      listTransitionGate.record = record;
      listTransitionGate.resolve(record);
      return;
    }
    if (!request.isInterceptResolutionHandled()) void request.continue();
  });
  const requestControl = {
    mark: () => requestRecords.length,
    recordsSince: (mark) => requestRecords.slice(mark),
    armListTransition() {
      const started = new Promise((resolve) => {
        listTransitionGate = { request: null, record: null, resolve };
      });
      return started;
    },
    async releaseListTransition() {
      const heldRequest = listTransitionGate?.request;
      listTransitionGate = null;
      if (heldRequest && !heldRequest.isInterceptResolutionHandled()) {
        await heldRequest.continue();
      }
    },
    async failListTransition() {
      const heldRequest = listTransitionGate?.request;
      listTransitionGate = null;
      if (!heldRequest) throw new Error("No held list transition request to fail");
      if (!heldRequest.isInterceptResolutionHandled()) await heldRequest.abort("failed");
    },
  };
  await page.goto(`${baseUrl}/${locale}/celeb/${slug}`, {
    waitUntil: "domcontentloaded",
    timeout,
  });
  await page.waitForSelector('#library [data-testid="archive-view-toggle"]', { timeout });

  const seedSelection = await selectDuringSeed(page);
  holdInitialPostRequests = false;
  await Promise.all(heldInitialPostRequests.map(async (request) => {
    if (!request.isInterceptResolutionHandled()) await request.continue();
  }));
  await page.waitForFunction(
    (minimum) => document.querySelectorAll("#library nav button[aria-label]").length >= minimum,
    { timeout },
    minimumItems,
  );
  await page.waitForFunction(
    () => document.querySelector('#library [aria-busy="false"]') !== null,
    { timeout },
  );
  await settleLayout(page);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const seedToFullSelection = await checkSeedSelectionAfterFull(page, seedSelection);

  const itemCount = await page.$$eval("#library nav button[aria-label]", (items) => items.length);
  assert(
    itemCount >= minimumItems,
    `Large-index fixture has only ${itemCount} items; expected at least ${minimumItems}`,
  );

  const initialSelection = await checkInitialSelection(page);
  const group = await checkGroupAccessibilityAndRowMutations(page);
  const rail = await checkRailRowMutations(page);

  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
  const responsiveness = await checkResponsiveness(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const expandToList = await checkExpandToListTransition(page, requestControl, itemCount);

  const result = {
    status: "pass",
    fixture: { slug, itemCount, cpuRate },
    seedToFullSelection,
    initialSelection,
    group,
    rail,
    responsiveness,
    expandToList,
  };

  assert.equal(
    seedToFullSelection.initialCurrentCount,
    1,
    `The seed index must initially have exactly one aria-current row: ${JSON.stringify(seedToFullSelection)}`,
  );
  assert(
    seedToFullSelection.seedItemCount < itemCount,
    `The selection fixture did not exercise a seed-to-full transition: ${JSON.stringify(seedToFullSelection)}`,
  );
  assert.equal(
    seedToFullSelection.finalCurrentCount,
    1,
    `The full index must retain exactly one aria-current row: ${JSON.stringify(seedToFullSelection)}`,
  );
  assert.equal(
    seedToFullSelection.finalLabel,
    seedToFullSelection.selectedLabel,
    `Seed-to-full reconciliation restored a stale React-owned selection: ${JSON.stringify(seedToFullSelection)}`,
  );
  assert.equal(
    seedToFullSelection.finalTitle,
    seedToFullSelection.selectedTitle,
    `Seed-to-full reconciliation changed the selected title: ${JSON.stringify(seedToFullSelection)}`,
  );
  assert.equal(
    group.collapseRowMutations,
    0,
    `Collapsing a group mutated every row instead of relying on the inert panel: ${JSON.stringify(group)}`,
  );
  assert.equal(
    initialSelection.currentCount,
    1,
    `The initial index must have exactly one aria-current row: ${JSON.stringify(initialSelection)}`,
  );
  assert(
    initialSelection.selectedStyleVisible,
    `The initial aria-current row must have a visible selected style: ${JSON.stringify(initialSelection)}`,
  );
  assert(
    initialSelection.titleMatches,
    `The settled title must match the only aria-current row: ${JSON.stringify(initialSelection)}`,
  );
  assert.equal(
    group.expandRowMutations,
    0,
    `Expanding a group mutated every row instead of relying on the inert panel: ${JSON.stringify(group)}`,
  );
  assert.equal(
    rail.closeRowMutations,
    0,
    `Closing the index rail mutated row presentation state: ${JSON.stringify(rail)}`,
  );
  assert.equal(
    rail.openRowMutations,
    0,
    `Opening the index rail mutated row presentation state: ${JSON.stringify(rail)}`,
  );
  assert(
    responsiveness.selection.p75 <= interactionBudget,
    `Large-index selection exceeded ${interactionBudget}ms at CPU x${cpuRate}: ${JSON.stringify(responsiveness.selection)}`,
  );
  assert(
    responsiveness.selection.titleP75 <= interactionBudget,
    `Large-index title feedback exceeded ${interactionBudget}ms at CPU x${cpuRate}: ${JSON.stringify(responsiveness.selection)}`,
  );
  assert(
    responsiveness.selection.indicatorP75 <= interactionBudget,
    `Large-index selection indicator exceeded ${interactionBudget}ms at CPU x${cpuRate}: ${JSON.stringify(responsiveness.selection)}`,
  );
  assert(
    responsiveness.selection.maxFeedbackGap <= selectionFeedbackGapBudget,
    `Title and selection indicator diverged by more than ${selectionFeedbackGapBudget}ms at CPU x${cpuRate}: ${JSON.stringify(responsiveness.selection)}`,
  );
  assert(
    responsiveness.selection.maxLongTask <= longTaskBudget,
    `Large-index selection produced a task over ${longTaskBudget}ms at CPU x${cpuRate}: ${JSON.stringify(responsiveness.selection)}`,
  );
  assert(
    responsiveness.selection.maxRowMutations <= 2,
    `A direct selection mutated more than the previous/new rows: ${JSON.stringify(responsiveness.selection)}`,
  );
  assert(
    responsiveness.selection.samples.every((sample) => sample.currentCount === 1),
    `A direct selection must leave exactly one aria-current row: ${JSON.stringify(responsiveness.selection)}`,
  );
  assert(
    responsiveness.selection.samples.every((sample) => sample.selectedStyleVisible),
    `The aria-current selector must visibly style every selected row: ${JSON.stringify(responsiveness.selection)}`,
  );
  assert(
    responsiveness.toggles.maxLatency <= interactionBudget,
    `Large-index toggle feedback exceeded ${interactionBudget}ms at CPU x${cpuRate}: ${JSON.stringify(responsiveness.toggles)}`,
  );
  assert(
    responsiveness.toggles.maxLongTask <= longTaskBudget,
    `Large-index toggle produced a task over ${longTaskBudget}ms at CPU x${cpuRate}: ${JSON.stringify(responsiveness.toggles)}`,
  );
  assert(
    responsiveness.hover.latency <= hoverBudget,
    `Large-index hover feedback exceeded ${hoverBudget}ms at CPU x${cpuRate}: ${JSON.stringify(responsiveness.hover)}`,
  );

  console.log(JSON.stringify(result, null, 2));
  await page.close();
} finally {
  await browser.close();
}

async function selectDuringSeed(page) {
  return page.evaluate(({ minimum, waitTimeout }) => {
    const library = document.querySelector("#library");
    if (!(library instanceof HTMLElement)) throw new Error("Missing library for seed selection");
    const isVisible = (element) => element instanceof HTMLElement
      && getComputedStyle(element).display !== "none"
      && getComputedStyle(element).visibility !== "hidden"
      && element.getClientRects().length > 0;
    const visiblePresenter = [...library.querySelectorAll("[data-library-presenter]")]
      .find(isVisible);
    const visibleTitle = [...library.querySelectorAll('[data-testid="expand-selected-title"]')]
      .find(isVisible);
    const startedExpanded = visiblePresenter?.getAttribute("data-library-presenter") === "expand"
      || Boolean(visibleTitle);
    const toggle = [...library.querySelectorAll('[data-testid="archive-view-toggle"]')]
      .find(isVisible);
    if (!startedExpanded && !(toggle instanceof HTMLButtonElement)) {
      throw new Error("Missing visible expand toggle for seed selection");
    }
    if (!startedExpanded && toggle.dataset.nextViewMode !== "expand") {
      throw new Error(
        `Visible library is not expanded, but its toggle targets ${toggle.dataset.nextViewMode ?? "unknown"}`,
      );
    }

    return new Promise((resolve, reject) => {
      let selected = false;
      let seedItemCount = 0;
      let initialCurrentCount = 0;
      let initialLabel = null;
      let selectedLabel = null;
      let selectedTitle = null;
      const timeoutId = window.setTimeout(() => {
        observer.disconnect();
        reject(new Error("Timed out selecting an index row during the seed render"));
      }, waitTimeout);
      const finish = () => {
        window.clearTimeout(timeoutId);
        observer.disconnect();
        resolve({
          seedItemCount,
          initialCurrentCount,
          initialLabel,
          selectedLabel,
          selectedTitle,
          startedView: startedExpanded ? "expand" : "list",
          toggledToExpand: !startedExpanded,
        });
      };
      const check = () => {
        const rows = [...library.querySelectorAll("nav button[aria-label]")];
        if (!selected && rows.length >= 2) {
          if (rows.length >= minimum) {
            window.clearTimeout(timeoutId);
            observer.disconnect();
            reject(new Error(`Full index arrived before seed selection (${rows.length} rows)`));
            return;
          }
          const initialRows = rows.filter((row) => row.getAttribute("aria-current") === "true");
          const target = rows[1];
          if (!(target instanceof HTMLButtonElement)) return;
          seedItemCount = rows.length;
          initialCurrentCount = initialRows.length;
          initialLabel = initialRows[0]?.getAttribute("aria-label") ?? null;
          selectedLabel = target.getAttribute("aria-label");
          selectedTitle = target.title;
          selected = true;
          target.click();
          return;
        }
        if (!selected) return;

        const currentRows = rows.filter((row) => row.getAttribute("aria-current") === "true");
        const current = currentRows[0];
        const title = library.querySelector('[data-testid="expand-selected-title"]');
        if (
          currentRows.length === 1
          && current?.getAttribute("aria-label") === selectedLabel
          && title?.textContent?.trim() === selectedTitle
        ) {
          finish();
        }
      };
      const observer = new MutationObserver(check);
      observer.observe(library, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["aria-current"],
      });
      if (!startedExpanded) toggle.click();
      check();
    });
  }, { minimum: minimumItems, waitTimeout: timeout });
}

async function checkSeedSelectionAfterFull(page, seedSelection) {
  return page.evaluate((seed) => {
    const rows = [...document.querySelectorAll("#library nav button[aria-label]")];
    const currentRows = rows.filter((row) => row.getAttribute("aria-current") === "true");
    const title = document.querySelector('[data-testid="expand-selected-title"]');
    return {
      ...seed,
      finalCurrentCount: currentRows.length,
      finalLabel: currentRows[0]?.getAttribute("aria-label") ?? null,
      finalTitle: title?.textContent?.trim() ?? null,
    };
  }, seedSelection);
}

async function checkInitialSelection(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll("#library nav button[aria-label]")];
    const currentRows = rows.filter((row) => row.getAttribute("aria-current") === "true");
    const current = currentRows[0];
    const unselected = rows.find((row) => row.getAttribute("aria-current") !== "true");
    const title = document.querySelector('[data-testid="expand-selected-title"]');
    if (!(current instanceof HTMLButtonElement) || !(unselected instanceof HTMLButtonElement)) {
      throw new Error("Missing initial selected/unselected index rows");
    }
    if (!(title instanceof HTMLElement)) throw new Error("Missing initial selected title");

    const selectedStyle = getComputedStyle(current);
    const unselectedStyle = getComputedStyle(unselected);
    return {
      currentCount: currentRows.length,
      currentLabel: current.getAttribute("aria-label"),
      title: title.textContent?.trim() ?? "",
      titleMatches: title.textContent?.trim() === current.title,
      selectedStyleVisible: selectedStyle.backgroundColor !== unselectedStyle.backgroundColor
        || selectedStyle.color !== unselectedStyle.color,
    };
  });
}

async function checkGroupAccessibilityAndRowMutations(page) {
  const setup = await page.evaluate(() => {
    const nav = document.querySelector("#library nav");
    const heading = nav?.querySelector("h3 > button[aria-expanded]");
    const row = nav?.querySelector("button[aria-label]");
    if (!(nav instanceof HTMLElement)) throw new Error("Missing expand index nav");
    if (!(heading instanceof HTMLButtonElement)) throw new Error("Missing index group heading");
    if (!(row instanceof HTMLButtonElement)) throw new Error("Missing index row");

    row.focus();
    const focusedBeforeCollapse = document.activeElement === row;
    const records = [];
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target;
        if (!(target instanceof Element)) continue;
        const owner = target.closest("button[aria-label]");
        if (!owner || !nav.contains(owner)) continue;
        records.push({ attribute: mutation.attributeName, label: owner.getAttribute("aria-label") });
      }
    });
    observer.observe(nav, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-hidden", "class", "tabindex"],
    });
    window.__indexRowMutationTrace = {
      readAndReset() {
        const result = records.slice();
        records.length = 0;
        return result;
      },
      stop() {
        observer.disconnect();
      },
    };
    return { headingId: heading.id, rowLabel: row.getAttribute("aria-label"), focusedBeforeCollapse };
  });

  assert(setup.focusedBeforeCollapse, "An expanded index row must accept keyboard focus");
  await page.evaluate((id) => document.getElementById(id)?.click(), setup.headingId);
  await page.waitForFunction(
    (id) => document.getElementById(id)?.getAttribute("aria-expanded") === "false",
    { timeout },
    setup.headingId,
  );
  await settleLayout(page);

  const collapsed = await page.evaluate(({ headingId, rowLabel }) => {
    const heading = document.getElementById(headingId);
    const panelId = heading?.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    const row = [...document.querySelectorAll("#library nav button[aria-label]")]
      .find((item) => item.getAttribute("aria-label") === rowLabel);
    if (!(panel instanceof HTMLElement)) throw new Error("Missing collapsed group panel");
    if (!(row instanceof HTMLButtonElement)) throw new Error("Missing collapsed index row");
    const mutations = window.__indexRowMutationTrace.readAndReset();
    row.focus();
    return {
      mutations,
      inert: panel.inert,
      ariaHidden: panel.getAttribute("aria-hidden"),
      focusRejected: document.activeElement !== row,
    };
  }, setup);

  assert(collapsed.inert, "A collapsed group panel must be inert");
  assert.equal(collapsed.ariaHidden, "true", "A collapsed group panel must be aria-hidden");
  assert(collapsed.focusRejected, "A row inside an inert group must reject programmatic focus");

  await page.evaluate((id) => document.getElementById(id)?.click(), setup.headingId);
  await page.waitForFunction(
    (id) => document.getElementById(id)?.getAttribute("aria-expanded") === "true",
    { timeout },
    setup.headingId,
  );
  await settleLayout(page);

  const expanded = await page.evaluate((rowLabel) => {
    const row = [...document.querySelectorAll("#library nav button[aria-label]")]
      .find((item) => item.getAttribute("aria-label") === rowLabel);
    if (!(row instanceof HTMLButtonElement)) throw new Error("Missing expanded index row");
    const mutations = window.__indexRowMutationTrace.readAndReset();
    window.__indexRowMutationTrace.stop();
    row.focus();
    return { mutations, focusAccepted: document.activeElement === row };
  }, setup.rowLabel);

  assert(expanded.focusAccepted, "A row in an expanded group must accept keyboard focus");
  return {
    headingId: setup.headingId,
    collapseRowMutations: collapsed.mutations.length,
    collapseMutationAttributes: countAttributes(collapsed.mutations),
    expandRowMutations: expanded.mutations.length,
    expandMutationAttributes: countAttributes(expanded.mutations),
    inertFocusContract: true,
  };
}

async function checkRailRowMutations(page) {
  const setup = await page.evaluate(() => {
    const nav = document.querySelector("#library nav");
    const toggle = document.querySelector('#library aside button[aria-controls]');
    const row = nav?.querySelector("button[aria-label]");
    if (!(nav instanceof HTMLElement)) throw new Error("Missing expand index nav");
    if (!(toggle instanceof HTMLButtonElement)) throw new Error("Missing index rail toggle");
    if (!(row instanceof HTMLButtonElement)) throw new Error("Missing index row");
    const title = row.querySelector("span:last-child");
    if (!(title instanceof HTMLElement)) throw new Error("Missing index row title");

    const label = row.getAttribute("aria-label");
    const records = [];
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target;
        if (!(target instanceof Element)) continue;
        const owner = target.closest("button[aria-label]");
        if (!owner || !nav.contains(owner)) continue;
        records.push({ attribute: mutation.attributeName, label: owner.getAttribute("aria-label") });
      }
    });
    observer.observe(nav, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-hidden", "class", "tabindex"],
    });
    window.__indexRailMutationTrace = {
      readAndReset() {
        const result = records.slice();
        records.length = 0;
        return result;
      },
      stop() {
        observer.disconnect();
      },
    };
    return {
      toggleLabel: toggle.getAttribute("aria-label"),
      rowLabel: label,
      accessibleName: row.getAttribute("aria-label"),
    };
  });

  await page.click('#library aside button[aria-controls]');
  await page.waitForFunction(
    () => document.querySelector('#library aside button[aria-controls]')?.getAttribute("aria-expanded") === "false",
    { timeout },
  );
  await page.waitForFunction(() => {
    const row = document.querySelector("#library nav button[aria-label]");
    const title = row?.querySelector("span:last-child");
    return title instanceof HTMLElement && getComputedStyle(title).opacity === "0";
  }, { timeout });

  const closed = await page.evaluate((rowLabel) => {
    const row = [...document.querySelectorAll("#library nav button[aria-label]")]
      .find((item) => item.getAttribute("aria-label") === rowLabel);
    if (!(row instanceof HTMLButtonElement)) throw new Error("Missing index row after rail close");
    const title = row.querySelector("span:last-child");
    if (!(title instanceof HTMLElement)) throw new Error("Missing row title after rail close");
    return {
      mutations: window.__indexRailMutationTrace.readAndReset(),
      titleOpacity: getComputedStyle(title).opacity,
      accessibleName: row.getAttribute("aria-label"),
    };
  }, setup.rowLabel);

  assert.equal(closed.titleOpacity, "0", "Closing the index rail must visually hide row titles");
  assert.equal(closed.accessibleName, setup.accessibleName, "Closing the rail changed the row accessible name");

  await page.click('#library aside button[aria-controls]');
  await page.waitForFunction(
    () => document.querySelector('#library aside button[aria-controls]')?.getAttribute("aria-expanded") === "true",
    { timeout },
  );
  await page.waitForFunction(() => {
    const row = document.querySelector("#library nav button[aria-label]");
    const title = row?.querySelector("span:last-child");
    return title instanceof HTMLElement && getComputedStyle(title).opacity === "1";
  }, { timeout });

  const opened = await page.evaluate((rowLabel) => {
    const row = [...document.querySelectorAll("#library nav button[aria-label]")]
      .find((item) => item.getAttribute("aria-label") === rowLabel);
    if (!(row instanceof HTMLButtonElement)) throw new Error("Missing index row after rail open");
    const title = row.querySelector("span:last-child");
    if (!(title instanceof HTMLElement)) throw new Error("Missing row title after rail open");
    const mutations = window.__indexRailMutationTrace.readAndReset();
    window.__indexRailMutationTrace.stop();
    return {
      mutations,
      titleOpacity: getComputedStyle(title).opacity,
      accessibleName: row.getAttribute("aria-label"),
    };
  }, setup.rowLabel);

  assert.equal(opened.titleOpacity, "1", "Opening the index rail must reveal row titles");
  assert.equal(opened.accessibleName, setup.accessibleName, "Opening the rail changed the row accessible name");
  return {
    closeRowMutations: closed.mutations.length,
    closeMutationAttributes: countAttributes(closed.mutations),
    openRowMutations: opened.mutations.length,
    openMutationAttributes: countAttributes(opened.mutations),
    accessibleNamePreserved: true,
  };
}

async function checkExpandToListTransition(page, requestControl, expandedItemCount) {
  const pageSize = 4;
  const expectedTotalPages = Math.ceil(expandedItemCount / pageSize);
  const requestMark = requestControl.mark();
  const listRequestStarted = requestControl.armListTransition();

  try {
    await settleLayout(page);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const baseline = await page.evaluate(() => {
      const library = document.querySelector("#library");
      if (!(library instanceof HTMLElement)) throw new Error("Missing library for list transition");

      const isRendered = (element) => {
        if (!(element instanceof Element)) return false;
        const style = getComputedStyle(element);
        return style.display !== "none"
          && style.visibility !== "hidden"
          && style.visibility !== "collapse"
          && Number.parseFloat(style.opacity) !== 0
           && element.getClientRects().length > 0;
      };
      const visiblePresenters = () => [...library.querySelectorAll("[data-library-presenter]")]
        .filter(isRendered);
      const visibleToggle = () => [...library.querySelectorAll('[data-testid="archive-view-toggle"]')]
        .find(isRendered) ?? null;
      const visibleSearchInput = () => [...library.querySelectorAll('input[type="text"]')]
        .find(isRendered) ?? null;
      const baselinePresenter = visiblePresenters()[0] ?? null;
      const baselineArticle = baselinePresenter?.querySelector(
        '[data-testid="expand-detail-body"] article',
      ) ?? null;
      const baselineToggle = visibleToggle();
      const baselineSearchInput = visibleSearchInput();
      const baselineActionRow = baselineToggle?.parentElement ?? null;
      if (
        !(baselinePresenter instanceof HTMLElement)
        || baselinePresenter.dataset.libraryPresenter !== "expand"
        || !(baselineArticle instanceof HTMLElement)
        || !(baselineToggle instanceof HTMLButtonElement)
        || baselineToggle.dataset.nextViewMode !== "list"
        || !(baselineSearchInput instanceof HTMLInputElement)
        || !(baselineActionRow instanceof HTMLElement)
      ) {
        throw new Error("Missing stable expanded presenter, article, or controls before list transition");
      }
      const readPagination = () => {
        const navs = [...library.querySelectorAll("nav")].filter((nav) => (
          nav.querySelector('button[aria-current="page"]')
        ));
        const visible = navs.filter(isRendered);
        const nav = visible[0] ?? null;
        const range = nav
          ? [...nav.querySelectorAll("span")]
              .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
              .find((text) => /^\d+\s*-\s*\d+$/.test(text)) ?? null
          : null;
        return {
          candidateCount: navs.length,
          visibleCount: visible.length,
          activePage: Number(nav?.querySelector('button[aria-current="page"]')?.textContent?.trim() ?? 0),
          totalPages: Number(range?.split("-")[1]?.trim() ?? 0),
          range,
        };
      };
      const read = (label) => {
        const presenters = visiblePresenters();
        const presenter = presenters[0] ?? null;
        const presenterMode = presenters.length === 1
          ? presenter?.getAttribute("data-library-presenter") ?? "pending"
          : presenters.length > 1
            ? "conflict"
            : "pending";
        const listGrid = [...(presenter?.querySelectorAll("div") ?? [])].find((element) => (
          element.style.gridTemplateColumns.includes("minmax(340px")
          && isRendered(element)
        ));
        const expandTitle = [...(presenter?.querySelectorAll(
          '[data-testid="expand-selected-title"]',
        ) ?? [])]
          .find(isRendered);
        const article = presenter?.querySelector('[data-testid="expand-detail-body"] article') ?? null;
        const toggle = visibleToggle();
        const searchInput = visibleSearchInput();
        const actionRow = toggle?.parentElement ?? null;
        const alert = [...library.querySelectorAll('[role="alert"]')].find(isRendered) ?? null;
        const retryButton = alert
          ? [...alert.querySelectorAll("button")].find(isRendered) ?? null
          : null;
        const loading = [...library.querySelectorAll(".animate-spin")].some(isRendered);
        const listCardCount = listGrid instanceof HTMLElement ? listGrid.children.length : 0;
        return {
          label,
          at: Math.round(performance.now() * 10) / 10,
          presenterMode,
          presenterCount: presenters.length,
          samePresenter: presenter === baselinePresenter,
          sameArticle: article === baselineArticle,
          sameActionRow: actionRow === baselineActionRow,
          sameToggleButton: toggle === baselineToggle,
          sameSearchInput: searchInput === baselineSearchInput,
          controlsVisible: isRendered(actionRow) && isRendered(searchInput),
          toggleVisible: isRendered(toggle),
          toggleNextMode: toggle?.getAttribute("data-next-view-mode") ?? null,
          actionRowButtonCount: actionRow
            ? [...actionRow.querySelectorAll("button")].filter(isRendered).length
            : 0,
          expandTitle: expandTitle?.textContent?.replace(/\s+/g, " ").trim() ?? null,
          expandIndexRowCount: presenter?.querySelectorAll("nav button[aria-label]").length ?? 0,
          articleHeight: Math.round(article?.getBoundingClientRect().height ?? 0),
          presenterHeight: Math.round(presenter?.getBoundingClientRect().height ?? 0),
          loading,
          refreshing: [...library.querySelectorAll('[aria-busy="true"]')].some(isRendered),
          alertVisible: isRendered(alert),
          alertText: alert?.textContent?.replace(/\s+/g, " ").trim() ?? null,
          retryVisible: isRendered(retryButton),
          listCardCount,
          listHeight: Math.round(listGrid?.getBoundingClientRect().height ?? 0),
          libraryHeight: Math.round(library.getBoundingClientRect().height),
          windowScrollY: Math.round(window.scrollY * 10) / 10,
          pagination: readPagination(),
        };
      };
      const same = (left, right) => left
        && right
        && left.presenterMode === right.presenterMode
        && left.presenterCount === right.presenterCount
        && left.samePresenter === right.samePresenter
        && left.sameArticle === right.sameArticle
        && left.sameActionRow === right.sameActionRow
        && left.sameToggleButton === right.sameToggleButton
        && left.sameSearchInput === right.sameSearchInput
        && left.controlsVisible === right.controlsVisible
        && left.toggleVisible === right.toggleVisible
        && left.toggleNextMode === right.toggleNextMode
        && left.actionRowButtonCount === right.actionRowButtonCount
        && left.expandTitle === right.expandTitle
        && left.expandIndexRowCount === right.expandIndexRowCount
        && left.articleHeight === right.articleHeight
        && left.presenterHeight === right.presenterHeight
        && left.loading === right.loading
        && left.refreshing === right.refreshing
        && left.alertVisible === right.alertVisible
        && left.alertText === right.alertText
        && left.retryVisible === right.retryVisible
        && left.listCardCount === right.listCardCount
        && left.listHeight === right.listHeight
        && left.libraryHeight === right.libraryHeight
        && left.windowScrollY === right.windowScrollY
        && left.pagination.candidateCount === right.pagination.candidateCount
        && left.pagination.visibleCount === right.pagination.visibleCount
        && left.pagination.activePage === right.pagination.activePage
        && left.pagination.totalPages === right.pagination.totalPages;
      const trace = {
        startedAt: null,
        baseline: read("baseline"),
        firstFrame: null,
        records: [],
      };
      const scan = (label) => {
        if (trace.startedAt === null) return;
        const record = read(label);
        if (!same(trace.records.at(-1), record)) trace.records.push(record);
      };
      const observer = new MutationObserver(() => scan("mutation"));
      observer.observe(library, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["aria-busy", "aria-current", "class"],
      });
      const intervalId = window.setInterval(() => scan("interval"), 16);
      window.__expandToListTrace = {
        trace,
        read,
        scan,
        stop() {
          observer.disconnect();
          window.clearInterval(intervalId);
          scan("stop");
        },
      };

      trace.startedAt = performance.now();
      baselineToggle.click();
      requestAnimationFrame(() => {
        trace.firstFrame = read("first-frame");
        scan("first-frame");
      });
      return trace.baseline;
    });

    assert.equal(
      baseline.presenterMode,
      "expand",
      "The transition baseline must have exactly one expanded presenter",
    );
    assert.equal(
      baseline.presenterCount,
      1,
      "The transition baseline exposed conflicting presenters",
    );
    assert.equal(
      baseline.expandIndexRowCount,
      expandedItemCount,
      "The transition baseline did not retain the complete expanded index",
    );
    assert(
      baseline.articleHeight > 0,
      "The transition baseline is missing its expanded article height",
    );
    assert(
      baseline.controlsVisible && baseline.toggleVisible,
      "The transition baseline is missing its controls or view-mode button",
    );

    const readActiveTrace = (label) => page.evaluate((snapshotLabel) => {
      const activeTrace = window.__expandToListTrace;
      if (!activeTrace?.trace || typeof activeTrace.read !== "function") {
        throw new Error("Missing expand-to-list trace");
      }
      const snapshot = activeTrace.read(snapshotLabel);
      activeTrace.scan(snapshotLabel);
      return {
        snapshot,
        firstFrame: activeTrace.trace.firstFrame,
        records: activeTrace.trace.records.slice(),
      };
    }, label);
    const assertStableExpandedSnapshot = (snapshot, label) => {
      assert.equal(
        snapshot.presenterMode,
        "expand",
        label + " replaced the expanded presenter before list data was complete: "
          + JSON.stringify(snapshot),
      );
      assert.equal(
        snapshot.presenterCount,
        1,
        label + " exposed conflicting presenters: " + JSON.stringify(snapshot),
      );
      assert.equal(
        snapshot.samePresenter,
        true,
        label + " remounted the expanded presenter: " + JSON.stringify(snapshot),
      );
      assert.equal(
        snapshot.sameArticle,
        true,
        label + " remounted the expanded article: " + JSON.stringify(snapshot),
      );
      assert.equal(
        snapshot.expandIndexRowCount,
        expandedItemCount,
        label + " replaced the 156-row expanded dataset early: " + JSON.stringify(snapshot),
      );
      assert.equal(
        snapshot.listCardCount,
        0,
        label + " mounted list cards before the four-item response completed: "
          + JSON.stringify(snapshot),
      );
      assert.equal(
        snapshot.pagination.visibleCount,
        0,
        label + " exposed list pagination before the response completed: "
          + JSON.stringify(snapshot),
      );
      assert(
        baseline.libraryHeight - snapshot.libraryHeight <= 2,
        label + " collapsed the library before the list swap: "
          + JSON.stringify({ baseline, snapshot }),
      );
      assert(
        baseline.articleHeight - snapshot.articleHeight <= 2,
        label + " collapsed the expanded article before the list swap: "
          + JSON.stringify({ baseline, snapshot }),
      );
      assert(
        snapshot.controlsVisible
          && snapshot.toggleVisible
          && snapshot.sameActionRow
          && snapshot.sameToggleButton
          && snapshot.sameSearchInput
          && snapshot.actionRowButtonCount === baseline.actionRowButtonCount,
        label + " removed or remounted the controls/view-mode button: "
          + JSON.stringify({ baseline, snapshot }),
      );
      assert(
        Math.abs(snapshot.windowScrollY - baseline.windowScrollY) <= 2,
        label + " moved the document scroll while preserving the expanded presenter: "
          + JSON.stringify({ baseline, snapshot }),
      );
    };

    const listRequest = await withTimeout(
      listRequestStarted,
      timeout,
      "The expand-to-list transition did not request a four-item list",
    );
    await page.waitForFunction(
      () => window.__expandToListTrace?.trace?.firstFrame != null,
      { timeout },
    );
    await new Promise((resolve) => setTimeout(resolve, 250));

    const pending = await readActiveTrace("held");
    const pendingRequests = requestControl.recordsSince(requestMark);
    const pendingCardRequests = pendingRequests.filter(isCardEffectRequest);
    const pendingSnapshots = [
      pending.firstFrame,
      ...pending.records,
      pending.snapshot,
    ].filter(Boolean);

    for (const snapshot of pendingSnapshots) {
      assertStableExpandedSnapshot(snapshot, "Held list refresh");
    }
    assert.equal(
      pendingCardRequests.length,
      0,
      "Card auth/count/edition effects fanned out while the expanded presenter was held: "
        + JSON.stringify(pendingCardRequests),
    );

    await requestControl.failListTransition();
    await page.waitForFunction(() => {
      const isRendered = (element) => element instanceof Element
        && getComputedStyle(element).display !== "none"
        && getComputedStyle(element).visibility !== "hidden"
        && element.getClientRects().length > 0;
      const library = document.querySelector("#library");
      const alert = [...(library?.querySelectorAll('[role="alert"]') ?? [])].find(isRendered);
      return Boolean(alert && [...alert.querySelectorAll("button")].some(isRendered));
    }, { timeout });
    await settleLayout(page);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const failedTrace = await readActiveTrace("failed-refresh");
    const failed = failedTrace.snapshot;
    assertStableExpandedSnapshot(failed, "Failed list refresh");
    assert.equal(
      failed.refreshing,
      false,
      "A failed list refresh left the preserved presenter busy",
    );
    assert(
      failed.alertVisible && failed.retryVisible && Boolean(failed.alertText),
      "A failed list refresh did not expose a retry alert: " + JSON.stringify(failed),
    );

    const retryMark = requestControl.mark();
    const retryRequestStarted = requestControl.armListTransition();
    await page.evaluate(() => {
      const isRendered = (element) => element instanceof Element
        && getComputedStyle(element).display !== "none"
        && getComputedStyle(element).visibility !== "hidden"
        && element.getClientRects().length > 0;
      const library = document.querySelector("#library");
      const alert = [...(library?.querySelectorAll('[role="alert"]') ?? [])].find(isRendered);
      const retry = alert
        ? [...alert.querySelectorAll("button")].find(isRendered)
        : null;
      if (!(retry instanceof HTMLButtonElement)) throw new Error("Missing retry button");
      retry.click();
    });
    const retryRequest = await withTimeout(
      retryRequestStarted,
      timeout,
      "Retry did not request a four-item list",
    );
    await page.waitForFunction(() => {
      const library = document.querySelector("#library");
      if (!(library instanceof HTMLElement)) return false;
      const isRendered = (element) => element instanceof Element
        && getComputedStyle(element).display !== "none"
        && getComputedStyle(element).visibility !== "hidden"
        && element.getClientRects().length > 0;
      return ![...library.querySelectorAll('[role="alert"]')].some(isRendered)
        && [...library.querySelectorAll('[aria-busy="true"]')].some(isRendered);
    }, { timeout });
    await new Promise((resolve) => setTimeout(resolve, 250));
    const retryPendingTrace = await readActiveTrace("retry-held");
    const retryPending = retryPendingTrace.snapshot;
    assertStableExpandedSnapshot(retryPending, "Held retry");
    assert.equal(
      retryPending.alertVisible,
      false,
      "The retry alert remained visible after retry began",
    );
    const retryPendingCardRequests = requestControl.recordsSince(retryMark)
      .filter(isCardEffectRequest);
    assert.equal(
      retryPendingCardRequests.length,
      0,
      "Card effects fanned out while the retry response was held: "
        + JSON.stringify(retryPendingCardRequests),
    );

    await requestControl.releaseListTransition();
    await page.waitForFunction(
      ({ expectedCount, expectedPages }) => {
        const library = document.querySelector("#library");
        if (!(library instanceof HTMLElement)) return false;
        const isRendered = (element) => element instanceof Element
          && getComputedStyle(element).display !== "none"
          && getComputedStyle(element).visibility !== "hidden"
          && element.getClientRects().length > 0;
        const presenter = [...library.querySelectorAll('[data-library-presenter="list"]')]
          .find(isRendered);
        const grid = [...(presenter?.querySelectorAll("div") ?? [])].find((element) => (
          element.style.gridTemplateColumns.includes("minmax(340px")
          && isRendered(element)
        ));
        const pagination = [...library.querySelectorAll("nav")].find((nav) => (
          isRendered(nav) && nav.querySelector('button[aria-current="page"]')
        ));
        const range = pagination
          ? [...pagination.querySelectorAll("span")]
              .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
              .find((text) => /^\d+\s*-\s*\d+$/.test(text)) ?? null
          : null;
        return grid?.children.length === expectedCount
          && presenter
          && pagination?.querySelector('button[aria-current="page"]')?.textContent?.trim() === "1"
          && Number(range?.split("-")[1]?.trim() ?? 0) === expectedPages
          && ![...library.querySelectorAll(".animate-spin")].some(isRendered);
      },
      { timeout },
      { expectedCount: pageSize, expectedPages: expectedTotalPages },
    );
    await settleLayout(page);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const settled = await page.evaluate(({ expectedPages }) => {
      const activeTrace = window.__expandToListTrace;
      const trace = activeTrace?.trace;
      if (!activeTrace || !trace) throw new Error("Missing expand-to-list trace");
      const final = activeTrace.read("final");
      activeTrace.scan("final");
      activeTrace.stop();
      const records = trace.records.slice();
      const transitionRecords = records.filter((record) => record.at >= trace.startedAt);
      const snapshots = [
        trace.baseline,
        trace.firstFrame,
        ...transitionRecords,
        final,
      ].filter(Boolean);
      const presenterModeSequence = [];
      for (const snapshot of snapshots) {
        if (presenterModeSequence.at(-1) !== snapshot.presenterMode) {
          presenterModeSequence.push(snapshot.presenterMode);
        }
      }
      const presenterSwapCount = presenterModeSequence.slice(1).filter(
        (mode, index) => mode !== presenterModeSequence[index],
      ).length;
      const preservedExpandRecords = snapshots.filter(
        (record) => record.presenterMode === "expand",
      );
      const staleListRecords = transitionRecords.filter((record) => record.listCardCount > 4);
      const earlyListCardRecords = preservedExpandRecords.filter(
        (record) => record.listCardCount > 0,
      );
      const wrongPaginationRecords = transitionRecords.filter((record) => (
        record.pagination.visibleCount > 0
        && (
          record.listCardCount !== 4
          || record.pagination.activePage !== 1
          || record.pagination.totalPages !== expectedPages
        )
      ));
      const stableHeightCeiling = Math.max(trace.baseline.libraryHeight, final.libraryHeight);
      const largeHeightSpikeRecords = transitionRecords.filter((record) => (
        record.libraryHeight > stableHeightCeiling + 2
      ));
      const presenterIdentityLossRecords = preservedExpandRecords.filter((record) => (
        !record.samePresenter || !record.sameArticle
      ));
      const controlLossRecords = snapshots.filter((record) => (
        !record.controlsVisible
        || !record.toggleVisible
        || !record.sameActionRow
        || !record.sameToggleButton
        || !record.sameSearchInput
        || record.actionRowButtonCount !== trace.baseline.actionRowButtonCount
      ));
      const maxPreswapLibraryCollapse = Math.max(
        0,
        ...preservedExpandRecords.map(
          (record) => trace.baseline.libraryHeight - record.libraryHeight,
        ),
      );
      const maxPreswapArticleCollapse = Math.max(
        0,
        ...preservedExpandRecords.map(
          (record) => trace.baseline.articleHeight - record.articleHeight,
        ),
      );
      const maxWindowScrollDelta = Math.max(
        0,
        ...snapshots.map(
          (record) => Math.abs(record.windowScrollY - trace.baseline.windowScrollY),
        ),
      );
      return {
        baseline: trace.baseline,
        firstFrame: trace.firstFrame,
        final,
        presenterModeSequence,
        presenterSwapCount,
        maxListCardCount: Math.max(0, ...transitionRecords.map((record) => record.listCardCount)),
        maxLibraryHeight: Math.max(0, ...transitionRecords.map((record) => record.libraryHeight)),
        upwardHeightSpike: Math.max(
          0,
          ...transitionRecords.map((record) => record.libraryHeight - stableHeightCeiling),
        ),
        staleListRecords,
        earlyListCardRecords,
        wrongPaginationRecords,
        largeHeightSpikeRecords,
        presenterIdentityLossRecords,
        controlLossRecords,
        maxPreswapLibraryCollapse,
        maxPreswapArticleCollapse,
        maxWindowScrollDelta,
        windowScrollDelta: Math.round(
          (final.windowScrollY - trace.baseline.windowScrollY) * 10,
        ) / 10,
        samples: transitionRecords,
      };
    }, { expectedPages: expectedTotalPages });
    const transitionRequests = requestControl.recordsSince(requestMark);
    const cardEffectRequests = transitionRequests.filter(isCardEffectRequest);
    const authRequests = cardEffectRequests.filter((request) => request.argumentShape === "auth-user");
    const batchedRequests = cardEffectRequests.filter((request) => (
      request.argumentShape === "uuid-batch"
      || request.argumentShape === "edition-thumbnail"
    ));
    const fanOutViolations = batchedRequests.filter((request) => (
      (request.argumentDetails?.itemCount ?? 0) > pageSize
    ));
    if (authRequests.length > pageSize) {
      fanOutViolations.push(...authRequests.slice(pageSize));
    }

    assert.equal(
      settled.maxListCardCount,
      pageSize,
      "The expand-to-list transition mounted the wrong number of cards: "
        + JSON.stringify(settled),
    );
    assert.deepEqual(
      settled.presenterModeSequence,
      ["expand", "list"],
      "The completed four-item response did not perform one atomic presenter swap: "
        + JSON.stringify(settled.presenterModeSequence),
    );
    assert.equal(
      settled.presenterSwapCount,
      1,
      "The completed list response swapped presenters more than once: "
        + JSON.stringify(settled.presenterModeSequence),
    );
    assert.equal(
      settled.final.presenterMode,
      "list",
      "The settled presenter is not the four-card list: " + JSON.stringify(settled.final),
    );
    assert.equal(
      settled.final.presenterCount,
      1,
      "The settled list exposed conflicting presenters: " + JSON.stringify(settled.final),
    );
    assert.deepEqual(
      settled.staleListRecords,
      [],
      "The 156-item expanded dataset was mounted as list cards: " + JSON.stringify(settled),
    );
    assert.deepEqual(
      settled.earlyListCardRecords,
      [],
      "List cards mounted before the atomic presenter swap: "
        + JSON.stringify(settled.earlyListCardRecords),
    );
    assert.deepEqual(
      settled.presenterIdentityLossRecords,
      [],
      "The expanded presenter/article remounted while list data was pending: "
        + JSON.stringify(settled.presenterIdentityLossRecords),
    );
    assert.deepEqual(
      settled.controlLossRecords,
      [],
      "Library controls or the view-mode button disappeared/remounted during the swap: "
        + JSON.stringify(settled.controlLossRecords),
    );
    assert(
      settled.maxPreswapLibraryCollapse <= 2,
      "The library collapsed before the atomic list swap: " + JSON.stringify(settled),
    );
    assert(
      settled.maxPreswapArticleCollapse <= 2,
      "The expanded article collapsed before the atomic list swap: " + JSON.stringify(settled),
    );
    assert(
      settled.maxWindowScrollDelta <= 2 && Math.abs(settled.windowScrollDelta) <= 2,
      "The expand-to-list swap moved the document scroll: " + JSON.stringify(settled),
    );
    assert.equal(
      settled.final.pagination.visibleCount,
      1,
      "The settled list must expose exactly one pagination block: "
        + JSON.stringify(settled.final),
    );
    assert.equal(
      settled.final.pagination.activePage,
      1,
      "The settled list pagination did not reset to page one: "
        + JSON.stringify(settled.final),
    );
    assert.equal(
      settled.final.pagination.totalPages,
      expectedTotalPages,
      "The settled list pagination used the expanded dataset as one page: "
        + JSON.stringify(settled.final),
    );
    assert.deepEqual(
      settled.wrongPaginationRecords,
      [],
      "The list transition exposed incorrect pagination: "
        + JSON.stringify(settled.wrongPaginationRecords),
    );
    assert.deepEqual(
      settled.largeHeightSpikeRecords,
      [],
      "The list transition caused an upward library height spike: " + JSON.stringify(settled),
    );
    assert.deepEqual(
      fanOutViolations,
      [],
      "Auth/count/edition requests exceeded the four mounted list cards: "
        + JSON.stringify({ cardEffectRequests, fanOutViolations }),
    );

    return {
      pageSize,
      expectedTotalPages,
      listRequest,
      failedRefresh: failed,
      retryRequest,
      pendingCardEffectRequestCount: pendingCardRequests.length,
      retryPendingCardEffectRequestCount: retryPendingCardRequests.length,
      cardEffectRequests,
      fanOutViolationCount: fanOutViolations.length,
      ...settled,
    };
  } finally {
    await requestControl.releaseListTransition().catch(() => undefined);
  }
}

async function checkResponsiveness(page) {
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const library = document.querySelector("#library");
    const nav = library?.querySelector("nav");
    if (!(library instanceof HTMLElement) || !(nav instanceof HTMLElement)) {
      throw new Error("Missing library or index nav for responsiveness check");
    }
    window.scrollTo(0, Math.max(0, window.scrollY + library.getBoundingClientRect().top - 80));
    nav.scrollTop = 0;
  });
  await settleLayout(page);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const selectionSamples = [];
  for (const index of [2, 3, 4, 5, 1]) {
    selectionSamples.push(await measureSelection(page, index));
    await page.waitForFunction(
      () => document.querySelector("#library [aria-busy='true']") === null,
      { timeout },
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const selectionLatencies = selectionSamples.map((sample) => sample.latency);
  const titleLatencies = selectionSamples.map((sample) => sample.titleLatency);
  const indicatorLatencies = selectionSamples.map((sample) => sample.selectionLatency);
  const selectionLongTasks = selectionSamples.flatMap((sample) => sample.longTasks);

  await new Promise((resolve) => setTimeout(resolve, 750));
  const toggleSamples = [
    await measureAttributeToggle(page, "#library nav h3 > button[aria-expanded]", "aria-expanded", "false"),
    await measureAttributeToggle(page, "#library nav h3 > button[aria-expanded]", "aria-expanded", "true"),
    await measureAttributeToggle(page, "#library aside button[aria-controls]", "aria-expanded", "false"),
    await measureAttributeToggle(page, "#library aside button[aria-controls]", "aria-expanded", "true"),
  ];
  const toggleLongTasks = toggleSamples.flatMap((sample) => sample.longTasks);
  const hover = await measureHover(page, 7);

  return {
    selection: {
      samples: selectionSamples,
      p75: percentile(selectionLatencies, 0.75),
      titleP75: percentile(titleLatencies, 0.75),
      indicatorP75: percentile(indicatorLatencies, 0.75),
      maxFeedbackGap: Math.max(...selectionSamples.map((sample) => sample.feedbackGap)),
      max: Math.max(...selectionLatencies),
      maxLongTask: Math.max(0, ...selectionLongTasks),
      maxRowMutations: Math.max(...selectionSamples.map((sample) => sample.rowMutations.length)),
    },
    toggles: {
      samples: toggleSamples,
      maxLatency: Math.max(...toggleSamples.map((sample) => sample.latency)),
      maxLongTask: Math.max(0, ...toggleLongTasks),
    },
    hover,
  };
}

async function measureSelection(page, index) {
  const target = await page.evaluate((targetIndex) => {
    const rows = [...document.querySelectorAll("#library nav button[aria-label]")];
    const row = rows[targetIndex];
    const title = document.querySelector('[data-testid="expand-selected-title"]');
    if (!(row instanceof HTMLButtonElement) || !(title instanceof HTMLElement)) {
      throw new Error(`Missing selection target at ${targetIndex}`);
    }
    const expectedTitle = row.title;
    const rect = row.getBoundingClientRect();
    const nav = row.closest("nav");
    if (!(nav instanceof HTMLElement)) throw new Error("Missing index nav for selection trace");
    const trace = {
      start: null,
      titlePaint: null,
      selectionPaint: null,
      longTasks: [],
      rowMutations: [],
    };
    const onPointerDown = (event) => {
      if (event.target === row || row.contains(event.target)) trace.start = performance.now();
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true, once: true });
    const mutationObserver = new MutationObserver(() => {
      if (title.textContent?.trim() !== expectedTitle || trace.titlePaint !== null) return;
      requestAnimationFrame(() => {
        trace.titlePaint = performance.now();
      });
    });
    mutationObserver.observe(title, { subtree: true, childList: true, characterData: true });
    const selectionObserver = new MutationObserver(() => {
      if (row.getAttribute("aria-current") !== "true" || trace.selectionPaint !== null) return;
      requestAnimationFrame(() => {
        trace.selectionPaint = performance.now();
      });
    });
    selectionObserver.observe(row, { attributes: true, attributeFilter: ["aria-current"] });
    const rowMutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target;
        if (!(target instanceof HTMLButtonElement)) continue;
        trace.rowMutations.push({
          attribute: mutation.attributeName,
          label: target.getAttribute("aria-label"),
          oldValue: mutation.oldValue,
          value: target.getAttribute(mutation.attributeName),
        });
      }
    });
    rowMutationObserver.observe(nav, {
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["aria-current", "class"],
    });
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        trace.longTasks.push({ start: entry.startTime, duration: entry.duration });
      }
    });
    longTaskObserver.observe({ type: "longtask", buffered: false });
    window.__indexInteractionTrace = {
      trace,
      stop() {
        document.removeEventListener("pointerdown", onPointerDown, true);
        mutationObserver.disconnect();
        selectionObserver.disconnect();
        rowMutationObserver.disconnect();
        longTaskObserver.disconnect();
      },
    };
    return {
      expectedTitle,
      label: row.getAttribute("aria-label"),
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      backgroundBefore: getComputedStyle(row).backgroundColor,
      colorBefore: getComputedStyle(row).color,
    };
  }, index);

  await page.mouse.click(target.x, target.y);
  try {
    await page.waitForFunction(
      ({ expectedTitle, label }) => {
        const trace = window.__indexInteractionTrace?.trace;
        const selected = [...document.querySelectorAll("#library nav button[aria-label]")]
          .find((row) => row.getAttribute("aria-label") === label);
        const currentCount = document.querySelectorAll(
          '#library nav button[aria-label][aria-current="true"]',
        ).length;
        return Boolean(
          trace?.start !== null
          && trace.titlePaint !== null
          && trace.selectionPaint !== null
          && selected?.getAttribute("aria-current") === "true"
          && currentCount === 1
          && document.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim() === expectedTitle,
        );
      },
      { timeout },
      target,
    );
  } catch (error) {
    const diagnostic = await page.evaluate(({ label }) => {
      const rows = [...document.querySelectorAll("#library nav button[aria-label]")];
      return {
        trace: window.__indexInteractionTrace?.trace ?? null,
        currentLabels: rows
          .filter((row) => row.getAttribute("aria-current") === "true")
          .map((row) => row.getAttribute("aria-label")),
        targetExists: rows.some((row) => row.getAttribute("aria-label") === label),
        title: document.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim() ?? null,
      };
    }, target);
    throw new Error(`Selection feedback timed out: ${JSON.stringify({ target, diagnostic })}`, {
      cause: error,
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 50));
  await page.mouse.move(1, 1);
  await settleLayout(page);

  return page.evaluate(({ expectedTitle, label, backgroundBefore, colorBefore }) => {
    const activeTrace = window.__indexInteractionTrace;
    if (
      !activeTrace?.trace
      || activeTrace.trace.start === null
      || activeTrace.trace.titlePaint === null
      || activeTrace.trace.selectionPaint === null
    ) {
      throw new Error("Incomplete selection interaction trace");
    }
    const { trace } = activeTrace;
    activeTrace.stop();
    const rows = [...document.querySelectorAll("#library nav button[aria-label]")];
    const selected = rows.find((row) => row.getAttribute("aria-label") === label);
    if (!(selected instanceof HTMLButtonElement)) throw new Error("Missing selected row after trace");
    const selectedStyle = getComputedStyle(selected);
    return {
      expectedTitle,
      label,
      titleLatency: Math.round((trace.titlePaint - trace.start) * 10) / 10,
      selectionLatency: Math.round((trace.selectionPaint - trace.start) * 10) / 10,
      feedbackGap: Math.round(Math.abs(trace.titlePaint - trace.selectionPaint) * 10) / 10,
      latency: Math.round((Math.max(trace.titlePaint, trace.selectionPaint) - trace.start) * 10) / 10,
      currentCount: rows.filter((row) => row.getAttribute("aria-current") === "true").length,
      rowMutations: trace.rowMutations,
      selectedStyleVisible: selectedStyle.backgroundColor !== backgroundBefore
        || selectedStyle.color !== colorBefore,
      longTasks: trace.longTasks
        .filter((entry) => (
          entry.start < Math.max(trace.titlePaint, trace.selectionPaint)
          && entry.start + entry.duration > trace.start
        ))
        .map((entry) => Math.round(entry.duration * 10) / 10),
    };
  }, target);
}

async function measureAttributeToggle(page, selector, attribute, expectedValue) {
  const target = await page.evaluate(({ selector: targetSelector, attribute: targetAttribute, expected }) => {
    const element = document.querySelector(targetSelector);
    if (!(element instanceof HTMLElement)) throw new Error(`Missing toggle ${targetSelector}`);
    const rect = element.getBoundingClientRect();
    const trace = { start: null, paint: null, longTasks: [] };
    const onPointerDown = (event) => {
      if (event.target === element || element.contains(event.target)) trace.start = performance.now();
    };
    document.addEventListener("pointerdown", onPointerDown, { capture: true, once: true });
    const mutationObserver = new MutationObserver(() => {
      if (element.getAttribute(targetAttribute) !== expected || trace.paint !== null) return;
      requestAnimationFrame(() => {
        trace.paint = performance.now();
      });
    });
    mutationObserver.observe(element, { attributes: true, attributeFilter: [targetAttribute] });
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        trace.longTasks.push({ start: entry.startTime, duration: entry.duration });
      }
    });
    longTaskObserver.observe({ type: "longtask", buffered: false });
    window.__indexInteractionTrace = {
      trace,
      stop() {
        document.removeEventListener("pointerdown", onPointerDown, true);
        mutationObserver.disconnect();
        longTaskObserver.disconnect();
      },
    };
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, { selector, attribute, expected: expectedValue });

  await page.mouse.click(target.x, target.y);
  await page.waitForFunction(
    () => window.__indexInteractionTrace?.trace?.start !== null && window.__indexInteractionTrace?.trace?.paint !== null,
    { timeout },
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  return page.evaluate(({ selector: targetSelector, attribute: targetAttribute, expected }) => {
    const element = document.querySelector(targetSelector);
    const activeTrace = window.__indexInteractionTrace;
    if (!(element instanceof HTMLElement) || !activeTrace?.trace) throw new Error("Incomplete toggle trace");
    const { trace } = activeTrace;
    if (trace.start === null || trace.paint === null) throw new Error("Toggle trace has no paint");
    activeTrace.stop();
    return {
      selector: targetSelector,
      value: element.getAttribute(targetAttribute),
      expected,
      latency: Math.round((trace.paint - trace.start) * 10) / 10,
      longTasks: trace.longTasks
        .filter((entry) => entry.start < trace.paint && entry.start + entry.duration > trace.start)
        .map((entry) => Math.round(entry.duration * 10) / 10),
    };
  }, { selector, attribute, expected: expectedValue });
}

async function measureHover(page, index) {
  await page.evaluate(() => {
    const library = document.querySelector("#library");
    const nav = library?.querySelector("nav");
    if (!(library instanceof HTMLElement) || !(nav instanceof HTMLElement)) return;
    window.scrollTo(0, Math.max(0, window.scrollY + library.getBoundingClientRect().top - 80));
    nav.scrollTop = 0;
  });
  await settleLayout(page);
  await page.mouse.move(1, 1);
  const target = await page.evaluate((targetIndex) => {
    const rows = [...document.querySelectorAll("#library nav button[aria-label]")];
    const visibleRows = rows.filter((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    const row = visibleRows.find((candidate) => candidate.getAttribute("aria-current") !== "true")
      ?? visibleRows[Math.min(targetIndex, visibleRows.length - 1)]
      ?? rows[0];
    if (!(row instanceof HTMLButtonElement)) throw new Error(`Missing hover target at ${targetIndex}`);
    const rect = row.getBoundingClientRect();
    const trace = { start: null, paint: null };
    const onMouseMove = (event) => {
      if (event.target !== row && !row.contains(event.target)) return;
      document.removeEventListener("mousemove", onMouseMove, true);
      trace.start = performance.now();
      requestAnimationFrame(() => {
        trace.paint = performance.now();
      });
    };
    document.addEventListener("mousemove", onMouseMove, { capture: true });
    window.__indexHoverTrace = trace;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      backgroundBefore: getComputedStyle(row).backgroundColor,
    };
  }, index);
  await page.mouse.move(target.x, target.y);
  await page.waitForFunction(
    () => window.__indexHoverTrace?.start !== null && window.__indexHoverTrace?.paint !== null,
    { timeout },
  );
  return page.evaluate((backgroundBefore) => {
    const trace = window.__indexHoverTrace;
    const row = document.querySelector("#library nav button[aria-label]:hover");
    if (!trace || trace.start === null || trace.paint === null || !(row instanceof HTMLElement)) {
      throw new Error("Incomplete hover trace");
    }
    return {
      latency: Math.round((trace.paint - trace.start) * 10) / 10,
      matchesHover: row.matches(":hover"),
      backgroundChanged: getComputedStyle(row).backgroundColor !== backgroundBefore,
    };
  }, target.backgroundBefore);
}

async function settleLayout(page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

function countAttributes(records) {
  return records.reduce((counts, record) => {
    const key = record.attribute ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function describeRequest(request) {
  const url = new URL(request.url());
  const base = {
    method: request.method(),
    path: url.pathname,
    actionId: request.headers()["next-action"] ?? null,
    argumentShape: "other",
    argumentDetails: null,
  };

  if (url.pathname.includes("/auth/v1/user")) {
    return { ...base, argumentShape: "auth-user" };
  }
  if (url.pathname.includes("/rest/v1/content_locales")) {
    const contentIdFilter = url.searchParams.get("content_id") ?? "";
    const ids = contentIdFilter.match(/[0-9a-f]{8}-[0-9a-f-]{27}/gi) ?? [];
    return {
      ...base,
      argumentShape: "edition-thumbnail",
      argumentDetails: { itemCount: new Set(ids).size },
    };
  }
  if (request.method() !== "POST" || !request.postData()) return base;

  try {
    const parsed = JSON.parse(request.postData());
    if (
      Array.isArray(parsed)
      && parsed.length === 2
      && typeof parsed[0] === "string"
      && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(parsed[0])
      && ["ko", "en"].includes(parsed[1])
    ) {
      return {
        ...base,
        argumentShape: "content-brief",
        argumentDetails: { contentId: parsed[0], locale: parsed[1] },
      };
    }
    if (
      Array.isArray(parsed)
      && parsed.length === 1
      && parsed[0]
      && typeof parsed[0] === "object"
      && !Array.isArray(parsed[0])
      && "userId" in parsed[0]
      && "limit" in parsed[0]
    ) {
      return {
        ...base,
        argumentShape: "library-list",
        argumentDetails: {
          limit: Number(parsed[0].limit),
          page: Number(parsed[0].page),
          type: parsed[0].type ?? null,
        },
      };
    }
    if (
      Array.isArray(parsed)
      && parsed.length === 1
      && Array.isArray(parsed[0])
      && parsed[0].every((value) => (
        typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)
      ))
    ) {
      return {
        ...base,
        argumentShape: "uuid-batch",
        argumentDetails: { itemCount: new Set(parsed[0]).size },
      };
    }
    return {
      ...base,
      argumentShape: `json-array-${Array.isArray(parsed) ? parsed.length : "other"}`,
    };
  } catch {
    return { ...base, argumentShape: "encoded" };
  }
}

function isCardEffectRequest(request) {
  return ["auth-user", "uuid-batch", "edition-thumbnail"].includes(request.argumentShape);
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

function percentile(values, ratio) {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}
