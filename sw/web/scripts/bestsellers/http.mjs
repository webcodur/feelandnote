// 공개 원천 수집은 요청별 시간과 재시도 횟수를 제한한다.
export async function fetchWithRetry(url, options = {}, retries = 2, delayMs = 500) {
  const attempts = Math.min(3, Math.max(1, retries));
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
      if (res.ok) return res;
      if (res.status < 500 && res.status !== 429) break;
    } catch { /* 마지막 시도 뒤 호출자가 카테고리 실패로 처리한다. */ }
    if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
  }
  throw new Error(`Source request failed (${new URL(url).hostname})`);
}

export async function mapTwo(items, callback) {
  const results = new Array(items.length);
  let cursor = 0;
  let failure;
  await Promise.all(Array.from({ length: Math.min(2, items.length) }, async () => {
    while (!failure && cursor < items.length) {
      const index = cursor++;
      try { results[index] = await callback(items[index], index); }
      catch (error) { failure = error; }
    }
  }));
  if (failure) throw failure;
  return results;
}
