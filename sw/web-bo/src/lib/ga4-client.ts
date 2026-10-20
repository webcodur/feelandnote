import 'server-only'
import { readFileSync } from 'node:fs'
import { createSign } from 'node:crypto'
import { resolve } from 'node:path'

export interface Ga4Row {
  dimensions: string[]
  metrics: number[]
}

export interface Ga4Report {
  rows: Ga4Row[]
  rowCount: number
  metadata: {
    timeZone?: string
    subjectToThresholding?: boolean
    dataLossFromOtherRow?: boolean
    samplingMetadatas?: unknown[]
  }
}

export class Ga4Unavailable extends Error {
  constructor(public readonly reason: 'configuration' | 'authentication' | 'report') {
    super(`GA4 ${reason}`)
  }
}

/** 인증 정보와 Google 오류 원문을 브라우저에 전달하지 않는다. */
export async function createGa4Reporter() {
  const property = process.env.GA_PROPERTY_ID
  const path = process.env.GA_CREDENTIALS_PATH
  if (!property || !/^\d+$/.test(property) || !path) throw new Ga4Unavailable('configuration')
  let cred: { client_email: string; private_key: string }
  try {
    cred = JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'))
    if (!cred.client_email || !cred.private_key) throw new Error('invalid credential')
  } catch { throw new Ga4Unavailable('configuration') }

  let token: string
  try {
    const now = Math.floor(Date.now() / 1000)
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
      iss: cred.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now,
    })}`
    const signature = createSign('RSA-SHA256').update(unsigned).sign(cred.private_key).toString('base64url')
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    })
    const data = await response.json()
    if (!response.ok || !data.access_token) throw new Error('authentication failed')
    token = data.access_token
  } catch { throw new Ga4Unavailable('authentication') }

  return async (body: object): Promise<Ga4Report> => {
    try {
      const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
        method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(20_000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok || data.error) throw new Error('report failed')
      return {
        rows: (data.rows ?? []).map((row: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }) => ({
          dimensions: (row.dimensionValues ?? []).map(value => value.value ?? ''),
          metrics: (row.metricValues ?? []).map(value => Number(value.value ?? 0)),
        })),
        rowCount: data.rowCount ?? 0,
        metadata: data.metadata ?? {},
      }
    } catch { throw new Ga4Unavailable('report') }
  }
}
