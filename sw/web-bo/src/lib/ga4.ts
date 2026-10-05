import 'server-only'
import { readFileSync } from 'node:fs'
import { createSign } from 'node:crypto'
import { resolve } from 'node:path'

/* GA4 Data API 읽기 전용 클라이언트 — 서비스계정 JWT로 runReport를 직접 부른다.
   사용자 웹의 scripts/ga4-celeb-views.mjs와 같은 방식. 의존성 없음.
   과거 commerce_* 이벤트는 여기서만 볼 수 있다 — 커스텀 측정기준(platform 등)은
   GA 콘솔 미등록이라 eventName·날짜·pagePath 까지만 조회 가능하다. */

export interface Ga4Row {
  dimensions: string[]
  metrics: number[]
}

interface ServiceAccount {
  client_email: string
  private_key: string
}

function b64url(data: string | Buffer): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function getToken(cred: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({
    iss: cred.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claim}`)
  const sig = b64url(signer.sign(cred.private_key))

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${sig}`,
    }),
  })
  const json = await res.json()
  if (!json.access_token) throw new Error(`GA4 토큰 발급 실패: ${json.error_description ?? json.error ?? 'unknown'}`)
  return json.access_token as string
}

async function runReport(token: string, propertyId: string, body: object): Promise<Ga4Row[]> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (json.error) throw new Error(`GA4 runReport 실패: ${json.error.message}`)
  return (json.rows ?? []).map((r: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }) => ({
    dimensions: (r.dimensionValues ?? []).map(d => d.value ?? ''),
    metrics: (r.metricValues ?? []).map(m => Number(m.value ?? 0)),
  }))
}

export interface Ga4CommerceReport {
  /** 날짜(YYYYMMDD)·종류별 이벤트 수 */
  daily: { date: string; open: number; click: number }[]
  /** 클릭이 발생한 페이지 경로별 건수 — 상위부터. label은 호출측이 작품·인물명으로 채운다 */
  pages: { path: string; clicks: number; label?: string | null }[]
  totals: { open: number; click: number }
}

/** 최근 days일의 commerce_open·commerce_click 집계. 미설정·실패 시 null */
export async function loadGa4Commerce(days: number): Promise<Ga4CommerceReport | null> {
  const propertyId = process.env.GA_PROPERTY_ID
  const credPath = process.env.GA_CREDENTIALS_PATH
  if (!propertyId || !credPath) return null

  let cred: ServiceAccount
  try {
    cred = JSON.parse(readFileSync(resolve(process.cwd(), credPath), 'utf8'))
  } catch {
    return null
  }

  try {
    const token = await getToken(cred)
    const range = { startDate: `${days}daysAgo`, endDate: 'today' }

    const [dailyRows, pageRows] = await Promise.all([
      runReport(token, propertyId, {
        dateRanges: [range],
        dimensions: [{ name: 'date' }, { name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', inListFilter: { values: ['commerce_open', 'commerce_click'] } },
        },
        limit: 10000,
      }),
      runReport(token, propertyId, {
        dateRanges: [range],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: 'commerce_click' } },
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 20,
      }),
    ])

    const byDate = new Map<string, { open: number; click: number }>()
    let open = 0
    let click = 0
    for (const row of dailyRows) {
      const [date, eventName] = row.dimensions
      const count = row.metrics[0] ?? 0
      const bucket = byDate.get(date) ?? { open: 0, click: 0 }
      if (eventName === 'commerce_open') {
        bucket.open += count
        open += count
      } else {
        bucket.click += count
        click += count
      }
      byDate.set(date, bucket)
    }

    return {
      daily: [...byDate.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, ...v })),
      pages: pageRows
        .filter(r => r.dimensions[0] && r.dimensions[0] !== '(not set)')
        .map(r => ({ path: r.dimensions[0].split('?')[0], clicks: r.metrics[0] ?? 0 })),
      totals: { open, click },
    }
  } catch (error) {
    console.error('[ga4] commerce 보고서 조회 실패:', error instanceof Error ? error.message : error)
    return null
  }
}
