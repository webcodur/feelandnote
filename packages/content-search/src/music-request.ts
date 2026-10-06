/** 전체 음악 소개 탐색의 기한. 후보·언어·출처마다 시간을 다시 시작하지 않는다. */
export const MUSIC_INTRO_BUDGET_MS = 3000

export function musicRequestSignal(signal?: AbortSignal): AbortSignal {
  return signal ?? AbortSignal.timeout(MUSIC_INTRO_BUDGET_MS)
}

/** 같은 탐색에서 요약·Wikidata 문서를 다시 검증할 때 네트워크를 중복 호출하지 않는다. */
export function createMusicJsonReader(signal: AbortSignal) {
  const pending = new Map<string, Promise<unknown>>()
  return function read<T>(url: string): Promise<T | null> {
    signal.throwIfAborted()
    let request = pending.get(url)
    if (!request) {
      request = fetch(url, {
        headers: { 'User-Agent': 'feelandnote/1.0 (https://feelandnote.com)', Accept: 'application/json' },
        signal,
      }).then(async response => response.ok ? response.json() : null).catch(() => {
        signal.throwIfAborted()
        return null
      })
      pending.set(url, request)
    }
    return request as Promise<T | null>
  }
}
