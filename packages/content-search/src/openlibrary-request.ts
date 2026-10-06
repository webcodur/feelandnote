export const OPENLIBRARY_BASE_URL = 'https://openlibrary.org'
export const OPENLIBRARY_REQUEST_TIMEOUT_MS = 5000
const USER_AGENT = 'FeelandNote book lookup (contact@feelandnote.com)'
const REQUEST_INTERVAL_MS = 1000
let nextRequestAt = 0

/** One process-wide budget shared by keyword, edition, work, and author requests. */
export async function requestOpenLibrary(url: string, redirect: RequestRedirect = 'manual'): Promise<Response> {
  const target = new URL(url)
  if (target.origin !== OPENLIBRARY_BASE_URL || target.username || target.password) throw new Error('Invalid OpenLibrary URL')
  const now = Date.now()
  const delay = Math.max(nextRequestAt - now, 0)
  nextRequestAt = Math.max(nextRequestAt, now) + REQUEST_INTERVAL_MS
  if (delay) await new Promise(resolve => setTimeout(resolve, delay))
  return fetch(target.toString(), {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(OPENLIBRARY_REQUEST_TIMEOUT_MS), redirect,
  })
}
