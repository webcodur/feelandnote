// 공개 원천 수집은 요청별 시간과 재시도 횟수를 제한한다.
export async function fetchWithRetry(url, options = {}, retries = 3, delayMs = 1500) {
  const attempts = Math.min(3, Math.max(1, Math.floor(retries) || 1));
  const maxDelayMs = 30_000;
  let failure = 'network error';
  let attempted = 0;
  for (let attempt = 0; attempt < attempts; attempt++) {
    attempted++;
    let waitMs = Math.min(maxDelayMs, Math.max(0, delayMs) * 2 ** attempt);
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
      if (res.ok) return res;
      failure = `HTTP ${res.status}`;
      const retryAfter = res.headers.get('retry-after');
      if (retryAfter) {
        const seconds = Number(retryAfter);
        const requestedMs = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
        if (Number.isFinite(requestedMs)) waitMs = Math.min(maxDelayMs, Math.max(waitMs, requestedMs));
      }
      await res.body?.cancel().catch(() => {});
      if (res.status < 500 && res.status !== 429) break;
    } catch (error) {
      const code = error?.cause?.code ?? error?.code;
      // 원본 오류 메시지와 요청 URL에는 API 키가 포함될 수 있다.
      failure = error?.name === 'TimeoutError' ? 'TimeoutError'
        : typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? code : 'network error';
    }
    if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, waitMs));
  }
  throw new Error(`Source request failed (${new URL(url).hostname}) after ${attempted} attempt(s): ${failure}`);
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
