// Conservative request spacing, not a claim about Tistory's service limits.
export const PUBLICATION_REQUESTS = Object.freeze({ listPageMs: 5000, betweenPostsMs: 60000, pollMs: 500 });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Only text actually rendered by the page is inspected. */
function accessFailure() {
  const text = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim();
  if (/과도한 접근 요청으로 블로그 사용이 잠시 중단되었습니다/.test(text)) {
    return { code: 'TISTORY_ACCESS_RESTRICTED', message: '과도한 접근 요청으로 블로그 사용이 잠시 중단되었습니다. 자동 재시도하지 않는다.' };
  }
  const quota = text.match(/하루에 작성할 수 있는 글은 최대\s*\d+\s*개까지[^.\n]*[.]?/);
  return quota ? { code: 'TISTORY_POST_LIMIT', message: quota[0] } : null;
}

export async function assertPageAvailable(page, { navigationPending = false } = {}) {
  let failure;
  try { failure = await page.evaluate(accessFailure); }
  catch (error) {
    // A save can replace the document during this read. Its caller still waits for the destination and verifies the saved ID.
    if (navigationPending && /Execution context was destroyed|Cannot find context with specified id/.test(error.message)) return false;
    throw error;
  }
  if (failure) throw Object.assign(new Error(`${failure.code}: ${failure.message}`), { code: failure.code });
}

/** Local waiting only; checks a displayed restriction without navigating or retrying. */
export async function pauseRequests(page, ms) {
  const deadline = Date.now() + ms;
  do {
    await assertPageAvailable(page);
    const remaining = deadline - Date.now();
    if (remaining <= 0) return;
    await wait(Math.min(remaining, PUBLICATION_REQUESTS.pollMs));
  } while (Date.now() <= deadline);
  await assertPageAvailable(page);
}

export async function waitForAvailablePage(page, predicate, { timeout = 30000, label = '화면 준비' } = {}, ...args) {
  const deadline = Date.now() + timeout;
  do {
    await assertPageAvailable(page);
    if (await page.evaluate(predicate, ...args)) return;
    await wait(Math.min(PUBLICATION_REQUESTS.pollMs, Math.max(0, deadline - Date.now())));
  } while (Date.now() < deadline);
  await assertPageAvailable(page);
  throw new Error(`${label} 대기 시간 ${timeout}ms 초과: ${page.url()}`);
}
