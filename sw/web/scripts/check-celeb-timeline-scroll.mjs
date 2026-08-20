import puppeteer from "puppeteer";

const baseUrl = process.env.TIMELINE_CHECK_BASE_URL ?? "http://localhost:3000";
const wheelDistance = 420;
const minimumPageMovement = 300;
const minimumTouchMovement = 120;
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

async function wheelOver(page, selector) {
  const box = await centerElement(page, selector);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.move(
    box.x + box.width / 2,
    box.y + Math.min(box.height / 2, 100),
  );
  await page.mouse.wheel({ deltaY: wheelDistance });
  await new Promise((resolve) => setTimeout(resolve, 180));
  const after = await page.evaluate(() => window.scrollY);

  return Math.round(after - before);
}

async function swipeUpOver(page, selector) {
  const box = await centerElement(page, selector);
  const client = await page.createCDPSession();
  const x = Math.round(box.x + box.width / 2);
  const startY = Math.round(box.y + Math.min(box.height * 0.72, 210));
  const before = await page.evaluate(() => window.scrollY);

  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: startY, id: 0 }],
    });
    for (let step = 1; step <= 8; step += 1) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: startY - step * 28, id: 0 }],
      });
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await new Promise((resolve) => setTimeout(resolve, 280));
  } finally {
    await client.detach();
  }

  const after = await page.evaluate(() => window.scrollY);
  return Math.round(after - before);
}

async function readCarouselLayout(page) {
  return page.$eval("[data-timeline-carousel]", (carousel) => {
    const rect = carousel.getBoundingClientRect();
    const rails = [...carousel.querySelectorAll("[data-timeline-rail]")];
    const cards = [...carousel.querySelectorAll("article")];
    const body = carousel.querySelector("[data-timeline-body-scroll]");

    return {
      height: Math.round(rect.height),
      railHeights: rails.map((rail) =>
        Math.round(rail.getBoundingClientRect().height),
      ),
      cardHeights: cards.map((card) =>
        Math.round(card.getBoundingClientRect().height),
      ),
      bodyOverflowY: body ? getComputedStyle(body).overflowY : null,
      bodyOverflowAnchor: body ? getComputedStyle(body).overflowAnchor : null,
      bodyOverflow: body ? body.scrollHeight - body.clientHeight : 0,
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

async function bodyOverflowAtCurrent(page) {
  return page.$eval(
    "[data-timeline-current] [data-timeline-body-scroll]",
    (body) => body.scrollHeight - body.clientHeight,
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
  const globeDelta = await wheelOver(page, "#timeline canvas");
  const globeTouchDelta = await swipeUpOver(page, "#timeline canvas");
  const globeTouchAction = await page.$eval(
    "#timeline canvas",
    (canvas) => getComputedStyle(canvas).touchAction,
  );

  console.log(
    JSON.stringify(
      {
        layout: { ...layout, longest },
        railNavigation,
        swipeNavigation,
        bodyWheel,
        bodyTouch,
        globeDelta,
        globeTouchDelta,
        globeTouchAction,
      },
      null,
      2,
    ),
  );

  if (layout.height < 340 || layout.height > 410) {
    throw new Error(`타임라인 높이가 모바일 기준 범위를 벗어났습니다: ${layout.height}`);
  }
  if (
    layout.railHeights.length !== 2 ||
    layout.railHeights.some((height) => Math.abs(height - layout.height) > 2)
  ) {
    throw new Error("이전·다음 화살표 열이 타임라인 전체 높이를 채우지 않습니다.");
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
  if (globeDelta < minimumPageMovement) {
    throw new Error("인라인 지구본이 페이지 휠 스크롤을 가로챕니다.");
  }
  if (globeTouchDelta < minimumTouchMovement) {
    throw new Error("인라인 지구본이 페이지의 세로 터치 스크롤을 가로챕니다.");
  }
  if (globeTouchAction !== "pan-y") {
    throw new Error(
      `인라인 지구본의 세로 터치 스크롤이 열려 있지 않습니다: ${globeTouchAction}`,
    );
  }
} finally {
  await browser.close();
}
