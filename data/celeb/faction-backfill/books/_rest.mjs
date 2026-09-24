// PostgREST 직접 접근 헬퍼. supabase-js 없이 ${NEXT_PUBLIC_DB_API_URL}/rest/v1 로 읽고 쓴다.
// 사용: node --env-file=sw/web-bo/.env <script>.mjs  (스크립트는 이 파일과 같은 폴더)
const BASE = () => `${process.env.NEXT_PUBLIC_DB_API_URL}/rest/v1`
const KEY = () => process.env.DB_SECRET_KEY

export function headers(extra = {}) {
  return { apikey: KEY(), Authorization: `Bearer ${KEY()}`, ...extra }
}

/** GET 한 페이지. params는 PostgREST 쿼리 객체. rows 반환. */
export async function restGet(table, params = {}) {
  const url = new URL(`${BASE()}/${table}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, { headers: headers({ Accept: 'application/json' }) })
  if (!res.ok) throw new Error(`GET ${table} ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

/** GET 전량 페이지네이션. */
export async function restAll(table, params = {}, pageSize = 1000) {
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const url = new URL(`${BASE()}/${table}`)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    const res = await fetch(url, {
      headers: headers({ Accept: 'application/json', 'Range-Unit': 'items', Range: `${from}-${from + pageSize - 1}` }),
    })
    if (!res.ok) throw new Error(`GET ${table} ${res.status}: ${(await res.text()).slice(0, 300)}`)
    const page = await res.json()
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

/** head=true 카운트 */
export async function restCount(table, params = {}) {
  const url = new URL(`${BASE()}/${table}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, { method: 'HEAD', headers: headers({ Prefer: 'count=exact' }) })
  if (!res.ok) throw new Error(`HEAD ${table} ${res.status}`)
  const range = res.headers.get('content-range') ?? ''
  return Number(range.split('/')[1] ?? 0)
}

/** in. 필터용 청크 조회. column=col, 값 배열 → 누적 rows. 청크당 전량 페이지네이션. */
export async function restIn(table, column, values, params = {}, chunkSize = 200, pageSize = 1000) {
  const out = []
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize)
    for (let from = 0; ; from += pageSize) {
      const url = new URL(`${BASE()}/${table}`)
      for (const [k, v] of Object.entries({ ...params, [column]: `in.(${chunk.join(',')})` })) url.searchParams.set(k, v)
      const res = await fetch(url, {
        headers: headers({ Accept: 'application/json', 'Range-Unit': 'items', Range: `${from}-${from + pageSize - 1}` }),
      })
      if (!res.ok) throw new Error(`GET ${table} ${res.status}: ${(await res.text()).slice(0, 300)}`)
      const page = await res.json()
      out.push(...page)
      if (page.length < pageSize) break
    }
  }
  return out
}

/** POST insert. rows는 객체 배열. returning='representation'|'minimal' */
export async function restPost(table, rows, { returning = 'representation', onConflict, upsert = false } = {}) {
  const url = new URL(`${BASE()}/${table}`)
  if (onConflict) url.searchParams.set('on_conflict', onConflict)
  const res = await fetch(url, {
    method: 'POST',
    headers: headers({
      'Content-Type': 'application/json',
      Prefer: `return=${returning}${upsert ? ',resolution=merge-duplicates' : ''}`,
    }),
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`POST ${table} ${res.status}: ${(await res.text()).slice(0, 500)}`)
  return returning === 'minimal' ? null : res.json()
}

/** DELETE rows matching params. */
export async function restDelete(table, params = {}) {
  const url = new URL(`${BASE()}/${table}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, { method: 'DELETE', headers: headers({ Prefer: 'return=minimal' }) })
  if (!res.ok) throw new Error(`DELETE ${table} ${res.status}: ${(await res.text()).slice(0, 300)}`)
}
