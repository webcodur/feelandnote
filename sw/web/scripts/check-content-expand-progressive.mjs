import assert from "node:assert/strict";

import puppeteer from "puppeteer";

const baseUrl = (process.env.DETAIL_PROGRESSIVE_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1365, height: 768, deviceScaleFactor: 1 });
  const traces = [];
  const traceByRequestId = new Map();
  const client = await page.createCDPSession();
  await client.send("Network.enable");
  client.on("Network.requestWillBeSent", ({ requestId, request }) => {
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([key, value]) => [key.toLowerCase(), value]),
    );
    if (request.method !== "POST" || !headers["next-action"]) return;
    const trace = { kind: classify(request.postData), decodedBytes: 0, encodedBytes: 0 };
    traces.push(trace);
    traceByRequestId.set(requestId, trace);
  });
  client.on("Network.dataReceived", ({ requestId, dataLength, encodedDataLength }) => {
    const trace = traceByRequestId.get(requestId);
    if (!trace) return;
    trace.decodedBytes += dataLength;
    trace.encodedBytes += encodedDataLength;
  });

  await page.goto(`${baseUrl}/ko/celeb/bill-gates`, {
    waitUntil: "networkidle2",
    timeout: 30_000,
  });
  await page.waitForFunction(
    () => document.querySelectorAll('#library nav button[title]').length >= 100,
    { timeout: 30_000 },
  );

  const indexTrace = traces.find((trace) => trace.kind === "index");
  assert.ok(indexTrace, "the expanded library must request one thin index");
  assert.ok(
    indexTrace.decodedBytes < 250_000,
    `thin index response is unexpectedly large: ${indexTrace.decodedBytes}`,
  );

  const target = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('#library nav button[title]')];
    const button = buttons.find((candidate, index) => index > 12 && candidate.getAttribute("aria-current") !== "true");
    if (!(button instanceof HTMLButtonElement)) throw new Error("progressive target not found");
    const title = button.title;
    button.click();
    return title;
  });

  await page.waitForFunction(
    (expected) => document.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim() === expected,
    { timeout: 2_000 },
    target,
  );
  const immediate = await page.evaluate(() => ({
    title: document.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim(),
    busy: document.querySelector('[data-testid="expand-detail-body"]')?.getAttribute("aria-busy"),
  }));
  assert.equal(immediate.title, target);
  assert.equal(immediate.busy, "true", "new selection must acknowledge loading immediately");

  await page.waitForFunction(
    () => document.querySelector('[data-testid="expand-detail-body"]')?.getAttribute("aria-busy") === "false",
    { timeout: 30_000 },
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(traces.filter((trace) => trace.kind === "record").length, 1);
  assert.equal(traces.filter((trace) => trace.kind === "brief").length, 1);

  await page.evaluate(() => {
    const current = document.querySelector('#library nav button[aria-current="true"]');
    const first = document.querySelector('#library nav button[title]');
    if (current === first) throw new Error("expected a non-first current item");
    first?.click();
  });
  await page.waitForFunction(
    () => document.querySelector('#library nav button[title]')?.getAttribute("aria-current") === "true",
  );
  await page.evaluate((expected) => {
    const targetButton = [...document.querySelectorAll('#library nav button[title]')]
      .find((button) => button.getAttribute("title") === expected);
    targetButton?.click();
  }, target);
  await page.waitForFunction(
    (expected) => document.querySelector('[data-testid="expand-selected-title"]')?.textContent?.trim() === expected,
    {},
    target,
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(traces.filter((trace) => trace.kind === "record").length, 1, "record cache must accumulate");
  assert.equal(traces.filter((trace) => trace.kind === "brief").length, 1, "brief cache must accumulate");

  const screenshotPath = process.env.DETAIL_PROGRESSIVE_SCREENSHOT;
  if (screenshotPath) {
    const article = await page.$('#library [data-testid="expand-detail-body"] article');
    await article?.screenshot({ path: screenshotPath });
  }
  console.log(JSON.stringify({ status: "pass", index: indexTrace, target, traces }, null, 2));
} finally {
  await browser.close();
}

function classify(postData) {
  if (!postData) return "other";
  try {
    const value = JSON.parse(postData);
    if (Array.isArray(value) && value.length === 1 && value[0]?.limit === 200) return "index";
    if (Array.isArray(value) && value.length === 2 && ["ko", "en"].includes(value[1])) return "brief";
    if (Array.isArray(value) && value.length === 2 && value.every(isUuid)) return "record";
  } catch {
    return "encoded";
  }
  return "other";
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
}
