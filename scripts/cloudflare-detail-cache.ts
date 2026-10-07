import { resolve } from 'node:path'
import { BOT_SIGNATURES, BROWSER_SIGNATURES } from '../sw/web/src/lib/render-user-agent'

// 앱의 UA 판별과 앞단 캐시가 같은 서명을 쓴다. 봇에는 로딩 중인 HTML을 재사용하지 않는다.
const containsAny = (values: readonly string[]) => `(${values.map(value => `lower(http.user_agent) contains ${JSON.stringify(value)}`).join(' or ')})`
const paths = ['/celeb/', '/en/celeb/', '/content/', '/en/content/']
const rule = {
  ref: 'bypass-detail-non-browser-v1',
  description: 'Bypass streamed detail and timeline HTML cache for bots and unknown user agents',
  enabled: true,
  action: 'set_cache_settings',
  action_parameters: { cache: false },
  expression: `(${paths.map(path => `starts_with(http.request.uri.path, ${JSON.stringify(path)})`).join(' or ')} or http.request.uri.path in {"/explore/timeline" "/en/explore/timeline"}) and (not (${containsAny(BROWSER_SIGNATURES)} and not ${containsAny(BOT_SIGNATURES)}))`,
}

async function main() {
  if (!process.env.CLOUDFLARE_ZONE_ID || !process.env.CLOUDFLARE_API_TOKEN) process.loadEnvFile(resolve(__dirname, '../sw/web/.env'))
  const zone = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!zone || !token) throw new Error('Cloudflare credentials unavailable')
  const base = `https://api.cloudflare.com/client/v4/zones/${zone}/rulesets`
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  async function request(url: string, init: RequestInit = {}) {
    const response = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(30000) })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(`Cloudflare cache rule request failed (${response.status})`)
    return data.result
  }
  const listed = await request(base)
  const set = listed.find((item: { phase: string }) => item.phase === 'http_request_cache_settings')
  if (!set) throw new Error('Cache ruleset unavailable')
  const current = await request(`${base}/${set.id}`)
  const existing = current.rules.find((item: { ref: string }) => item.ref === rule.ref)
  const matches = existing?.enabled && existing.expression === rule.expression && existing.action_parameters?.cache === false
  console.log(JSON.stringify({ mode: process.argv.includes('--execute') ? 'execute' : 'plan', changeRequired: !matches, rule }))
  if (!process.argv.includes('--execute') || matches) return
  await request(`${base}/${set.id}/rules${existing ? `/${existing.id}` : ''}`, {
    method: existing ? 'PATCH' : 'POST', body: JSON.stringify(rule),
  })
  const verified = await request(`${base}/${set.id}`)
  const stored = verified.rules.find((item: { ref: string }) => item.ref === rule.ref)
  if (!stored?.enabled || stored.expression !== rule.expression || stored.action_parameters?.cache !== false) throw new Error('Detail cache bypass verification failed')
  console.log('Detail cache bypass verified')
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
