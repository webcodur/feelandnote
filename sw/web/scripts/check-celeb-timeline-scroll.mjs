import puppeteer from "puppeteer";

const baseUrl = process.env.TIMELINE_CHECK_BASE_URL ?? "http://localhost:3000";
const minimumInnerMovement = 80;

async function centerElement(page, selector) {
  const element = await page.$(selector);
  if (!element) throw new Error(`검사 대상을 찾지 못했습니다: ${selector}`);

  await element.evaluate((node) => {
    document.documentElement.style.scrollBehavior = "auto";
    const rect = node.getBoundingClientRect();
    window.scrollTo(
      0,
      window.scrollY + rect.top - (window.innerHeight - rect.height) / 2,
    );
  });

  const box = await element.boundingBox();
  if (!box) throw new Error(`검사 대상의 화면 위치를 읽지 못했습니다: ${selector}`);
  return box;
}

async function readCarouselLayout(page) {
  return page.$eval("[data-timeline-carousel]", (carousel) => {
    const rect = carousel.getBoundingClientRect();
    const rails = [...carousel.querySelectorAll("[data-timeline-rail]")];
    const cards = [...carousel.querySelectorAll("article")];
    const body = carousel.querySelector("[data-timeline-body-scroll]");
    const title = carousel.querySelector("[data-timeline-title-scroll]");
    const range = carousel.querySelector("[data-timeline-mobile-range]");
    const rangeScroll = carousel.querySelector("[data-timeline-range-scroll]");
    const rangeButtons = range?.querySelectorAll("[data-timeline-range-event]") ?? [];
    const unknownRangeStops =
      range?.querySelectorAll("[data-timeline-range-unknown]") ?? [];

    return {
      height: Math.round(rect.height),
      navigationHeights: rails.map((rail) =>
        Math.round(rail.getBoundingClientRect().height),
      ),
      cardHeights: cards.map((card) =>
        Math.round(card.getBoundingClientRect().height),
      ),
      bodyOverflowY: body ? getComputedStyle(body).overflowY : null,
      bodyOverflowAnchor: body ? getComputedStyle(body).overflowAnchor : null,
      bodyOverflow: body ? body.scrollHeight - body.clientHeight : 0,
      titleOverflowX: title ? getComputedStyle(title).overflowX : null,
      titleWhiteSpace: title?.firstElementChild
        ? getComputedStyle(title.firstElementChild).whiteSpace
        : null,
      titleScrollbarWidth: title ? getComputedStyle(title).scrollbarWidth : null,
      rangeVisible: range ? range.getBoundingClientRect().height > 0 : false,
      rangeButtonCount: rangeButtons.length,
      unknownRangeStopCount: unknownRangeStops.length,
      rangeCountLabel:
        range?.querySelector("[data-timeline-range-count]")?.textContent?.trim() ?? null,
      rangeScrollbarWidth: rangeScroll
        ? getComputedStyle(rangeScroll).scrollbarWidth
        : null,
      visibleGlobeCount: [...document.querySelectorAll("#timeline canvas")].filter(
        (canvas) => canvas.getBoundingClientRect().height > 0,
      ).length,
      index: Number(carousel.getAttribute("data-timeline-index") ?? 0),
      total: Number(carousel.getAttribute("data-timeline-total") ?? 0),
    };
  });
}

async function currentTimelineIndex(page) {
  return page.$eval("[data-timeline-carousel]", (carousel) =>
    Number(carousel.getAttribute("data-timeline-index") ?? 0),
  );
}

async function rangeRailPersistsBetweenEvents(page) {
  const rail = await page.$("[data-timeline-range-scroll]");
  if (!rail) throw new Error("모바일 활동 반경 레일을 찾지 못했습니다.");

  await page.click("[data-timeline-next]");
  await new Promise((resolve) => setTimeout(resolve, 80));
  const persisted = await rail.evaluate((element) => element.isConnected);
  await page.click('[data-timeline-rail="previous"]');
  await new Promise((resolve) => setTimeout(resolve, 80));
  await rail.dispose();
  return persisted;
}

async function findMissingRangeStop(page, total) {
  let missing = null;
  for (let index = 0; index < total; index += 1) {
    const represented = await page.$eval(
      "[data-timeline-range-scroll]",
      (range) => Boolean(range.querySelector('[aria-current="step"]')),
    );
    if (!represented) {
      missing = index;
      break;
    }
    if (index < total - 1) {
      await page.click("[data-timeline-next]");
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  let at = await currentTimelineIndex(page);
  while (at > 0) {
    await page.click('[data-timeline-rail="previous"]');
    at -= 1;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return missing;
}

async function bodyOverflowAtCurrent(page) {
  return page.$eval(
    "[data-timeline-current] [data-timeline-body-scroll]",
    (body) => body.scrollHeight - body.clientHeight,
  );
}

async function titleOverflowAtCurrent(page) {
  return page.$eval(
    "[data-timeline-current] [data-timeline-title-scroll]",
    (title) => title.scrollWidth - title.clientWidth,
  );
}

async function findLongestEvent(page, total) {
  let at = await currentTimelineIndex(page);
  while (at > 0) {
    await page.click('[data-timeline-rail="previous"]');
    at -= 1;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  let best = { index: 0, overflow: 0 };
  for (let index = 0; index < total; index += 1) {
    const overflow = await bodyOverflowAtCurrent(page);
    if (overflow > best.overflow) best = { index, overflow };
    if (index < total - 1) {
      await page.click("[data-timeline-next]");
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }
  return best;
}

async function findWidestTitle(page, total) {
  let at = await currentTimelineIndex(page);
  while (at > 0) {
    await page.click('[data-timeline-rail="previous"]');
    at -= 1;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  let best = { index: 0, overflow: 0 };
  for (let index = 0; index < total; index += 1) {
    const overflow = await titleOverflowAtCurrent(page);
    if (overflow > best.overflow) best = { index, overflow };
    if (index < total - 1) {
      await page.click("[data-timeline-next]");
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }
  return best;
}

async function clickRailEdge(page, selector, edge) {
  const box = await centerElement(page, selector);
  const y = edge === "start" ? box.y + 8 : box.y + box.height - 8;
  await page.mouse.click(box.x + box.width / 2, y);
  await new Promise((resolve) => setTimeout(resolve, 340));
  return currentTimelineIndex(page);
}

async function wheelInsideTimelineBody(page) {
  const selector =
    "[data-timeline-current] [data-timeline-body-scroll]";
  const box = await centerElement(page, selector);
  await page.$eval(selector, (body) => {
    body.scrollTop = 0;
  });
  const before = await page.evaluate((bodySelector) => {
    const body = document.querySelector(bodySelector);
    return { inner: body?.scrollTop ?? 0, page: window.scrollY };
  }, selector);

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel({ deltaY: 180 });
  await new Promise((resolve) => setTimeout(resolve, 180));

  const after = await page.evaluate((bodySelector) => {
    const body = document.querySelector(bodySelector);
    return { inner: body?.scrollTop ?? 0, page: window.scrollY };
  }, selector);

  return {
    innerDelta: Math.round(after.inner - before.inner),
    pageDelta: Math.round(after.page - before.page),
  };
}

async function swipeInsideTimelineBody(page) {
  const selector = "[data-timeline-current] [data-timeline-body-scroll]";
  const box = await centerElement(page, selector);
  await page.$eval(selector, (body) => {
    body.scrollTop = 0;
  });
  const client = await page.createCDPSession();
  const x = Math.round(box.x + box.width / 2);
  const startY = Math.round(box.y + box.height * 0.78);
  const before = await page.evaluate((bodySelector) => {
    const body = document.querySelector(bodySelector);
    return { inner: body?.scrollTop ?? 0, page: window.scrollY };
  }, selector);

  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: startY, id: 0 }],
    });
    for (let step = 1; step <= 8; step += 1) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: startY - step * 24, id: 0 }],
      });
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await new Promise((resolve) => setTimeout(resolve, 260));
  } finally {
    await client.detach();
  }

  const after = await page.evaluate((bodySelector) => {
    const body = document.querySelector(bodySelector);
    return { inner: body?.scrollTop ?? 0, page: window.scrollY };
  }, selector);
  return {
    innerDelta: Math.round(after.inner - before.inner),
    pageDelta: Math.round(after.page - before.page),
  };
}

async function swipeTimelineLeft(page) {
  const selector = "[data-timeline-current] [data-timeline-body-scroll]";
  const box = await centerElement(page, selector);
  const client = await page.createCDPSession();
  const startX = Math.round(box.x + box.width * 0.78);
  const y = Math.round(box.y + box.height * 0.55);

  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y, id: 0 }],
    });
    for (let step = 1; step <= 7; step += 1) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX - step * 24, y, id: 0 }],
      });
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await new Promise((resolve) => setTimeout(resolve, 360));
  } finally {
    await client.detach();
  }

  return currentTimelineIndex(page);
}

async function swipeHorizontalScroll(page, selector) {
  const box = await centerElement(page, selector);
  await page.$eval(selector, (title) => {
    title.scrollLeft = 0;
  });
  const client = await page.createCDPSession();
  const startX = Math.round(box.x + box.width * 0.8);
  const y = Math.round(box.y + box.height / 2);

  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y, id: 0 }],
    });
    for (let step = 1; step <= 7; step += 1) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX - step * 24, y, id: 0 }],
      });
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await new Promise((resolve) => setTimeout(resolve, 260));
  } finally {
    await client.detach();
  }

  return page.$eval(selector, (title) => Math.round(title.scrollLeft));
}

async function dragHorizontalScrollWithMouse(page, selector) {
  const box = await centerElement(page, selector);
  await page.$eval(selector, (element) => {
    element.scrollLeft = 0;
  });
  const startX = box.x + box.width * 0.8;
  const y = box.y + box.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - 168, y, { steps: 7 });
  await page.mouse.up();
  await new Promise((resolve) => setTimeout(resolve, 80));
  return page.$eval(selector, (element) => Math.round(element.scrollLeft));
}

const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(`${baseUrl}/ko/celeb/bill-gates`, {
    waitUntil: "networkidle2",
    timeout: 30_000,
  });

  const layout = await readCarouselLayout(page);
  const rangeRailPersisted = await rangeRailPersistsBetweenEvents(page);
  if (!rangeRailPersisted) {
    throw new Error("사건을 넘길 때 활동 반경 레일이 교체되어 지역 이동이 튕깁니다.");
  }
  const missingRangeStop = await findMissingRangeStop(page, layout.total);
  if (missingRangeStop != null) {
    throw new Error(
      `#${missingRangeStop + 1} 사건의 위치가 활동 반경에서 ? 정거장으로 표시되지 않습니다.`,
    );
  }
  const rangeSwipe = await swipeHorizontalScroll(
    page,
    "[data-timeline-current] [data-timeline-range-scroll]",
  );
  const railNavigation = {
    afterNextAtEnd: await clickRailEdge(
      page,
      '[data-timeline-rail="next"]',
      "end",
    ),
    afterPreviousAtStart: await clickRailEdge(
      page,
      '[data-timeline-rail="previous"]',
      "start",
    ),
  };
  const swipeNavigation = {
    afterSwipeLeft: await swipeTimelineLeft(page),
    afterPreviousAtEnd: await clickRailEdge(
      page,
      '[data-timeline-rail="previous"]',
      "end",
    ),
  };
  const longest = await findLongestEvent(page, layout.total);
  const currentAfterScan = await currentTimelineIndex(page);
  for (let step = currentAfterScan; step > longest.index; step -= 1) {
    await page.click('[data-timeline-rail="previous"]');
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  const bodyWheel = await wheelInsideTimelineBody(page);
  const bodyTouch = await swipeInsideTimelineBody(page);
  const widestTitle = await findWidestTitle(page, layout.total);
  const currentAfterTitleScan = await currentTimelineIndex(page);
  for (let step = currentAfterTitleScan; step > widestTitle.index; step -= 1) {
    await page.click('[data-timeline-rail="previous"]');
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  const titleSwipe = await swipeHorizontalScroll(
    page,
    "[data-timeline-current] [data-timeline-title-scroll]",
  );
  const titleMouseDrag = await dragHorizontalScrollWithMouse(
    page,
    "[data-timeline-current] [data-timeline-title-scroll]",
  );

  console.log(
    JSON.stringify(
      {
        layout: { ...layout, longest },
        railNavigation,
        swipeNavigation,
        bodyWheel,
        bodyTouch,
        widestTitle,
        titleSwipe,
        titleMouseDrag,
        rangeSwipe,
        rangeRailPersisted,
        missingRangeStop,
      },
      null,
      2,
    ),
  );

  if (layout.height < 340 || layout.height > 410) {
    throw new Error(`타임라인 높이가 모바일 기준 범위를 벗어났습니다: ${layout.height}`);
  }
  if (
    layout.navigationHeights.length !== 2 ||
    layout.navigationHeights.some((height) => height < 48 || height > 64)
  ) {
    throw new Error("이전·다음 화살표가 제목 행의 양쪽 열을 채우지 않습니다.");
  }
  if (
    layout.cardHeights.length === 0 ||
    layout.cardHeights.some((height) => Math.abs(height - layout.height) > 2)
  ) {
    throw new Error("사건 카드 높이가 고정 타임라인 높이와 일치하지 않습니다.");
  }
  if (layout.bodyOverflowY !== "auto") {
    throw new Error(`타임라인 본문이 내부 스크롤 영역이 아닙니다: ${layout.bodyOverflowY}`);
  }
  if (layout.bodyOverflowAnchor !== "none") {
    throw new Error(
      `타임라인 본문에서 스크롤 앵커링을 끄지 않았습니다: ${layout.bodyOverflowAnchor}`,
    );
  }
  if (layout.titleOverflowX !== "auto" || layout.titleWhiteSpace !== "nowrap") {
    throw new Error("사건 제목이 잘림 없이 내부 가로 스크롤되도록 구성되지 않았습니다.");
  }
  if (
    layout.titleScrollbarWidth !== "none" ||
    layout.rangeScrollbarWidth !== "none"
  ) {
    throw new Error("제목 또는 활동 반경에 가로 스크롤바가 남아 있습니다.");
  }
  if (!layout.rangeVisible || layout.rangeButtonCount === 0) {
    throw new Error("모바일 사건 카드에 활동 반경 경로가 표시되지 않습니다.");
  }
  if (layout.unknownRangeStopCount === 0) {
    throw new Error("장소를 알 수 없는 중간 사건이 ? 정거장으로 표시되지 않습니다.");
  }
  if (!layout.rangeCountLabel?.includes(String(layout.total))) {
    throw new Error(
      `활동 반경 건수가 전체 사건 수를 반영하지 않습니다: ${layout.rangeCountLabel}`,
    );
  }
  if (layout.visibleGlobeCount !== 0) {
    throw new Error("모바일 연대기에 인라인 지구본이 남아 있습니다.");
  }
  if (widestTitle.overflow <= 0 || titleSwipe < 40) {
    throw new Error("긴 사건 제목을 터치로 가로 스크롤할 수 없습니다.");
  }
  if (titleMouseDrag < 40) {
    throw new Error("PC 반응형 화면에서 제목을 마우스로 잡아 밀 수 없습니다.");
  }
  if (rangeSwipe < 40) {
    throw new Error("활동 반경을 손으로 부드럽게 가로 이동할 수 없습니다.");
  }
  if (longest.overflow <= 0) {
    throw new Error("긴 사건 설명에서도 본문 내부 스크롤이 생기지 않습니다.");
  }
  if (
    railNavigation.afterNextAtEnd !== 1 ||
    railNavigation.afterPreviousAtStart !== 0
  ) {
    throw new Error("화살표 열의 위·아래 가장자리에서 사건 이동이 되지 않습니다.");
  }
  if (
    swipeNavigation.afterSwipeLeft !== 1 ||
    swipeNavigation.afterPreviousAtEnd !== 0
  ) {
    throw new Error("본문의 가로 밀기로 다음 사건에 이동하지 못했습니다.");
  }
  if (bodyWheel.innerDelta < minimumInnerMovement) {
    throw new Error("타임라인 본문 위 휠이 내부 내용을 스크롤하지 않습니다.");
  }
  if (Math.abs(bodyWheel.pageDelta) > 20) {
    throw new Error("타임라인 본문을 읽는 동안 바깥 페이지가 함께 움직입니다.");
  }
  if (bodyTouch.innerDelta < minimumInnerMovement) {
    throw new Error("타임라인 본문 위 세로 터치가 내부 내용을 스크롤하지 않습니다.");
  }
  if (Math.abs(bodyTouch.pageDelta) > 20) {
    throw new Error("타임라인 본문을 터치로 읽을 때 바깥 페이지가 함께 움직입니다.");
  }
} finally {
  await browser.close();
}
