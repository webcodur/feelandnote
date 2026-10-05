import { LOCALE_PREFERENCE_COOKIE } from '../sw/web/src/i18n/entryLocale'
import { resolve } from 'node:path'

async function main() {
process.loadEnvFile(resolve(__dirname, '../sw/web/.env'))
const zone = process.env.CLOUDFLARE_ZONE_ID
const token = process.env.CLOUDFLARE_API_TOKEN
if (!zone || !token) throw new Error('Cloudflare credentials unavailable')
const base = `https://api.cloudflare.com/client/v4/zones/${zone}/rulesets`
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const listed = await fetch(base, { headers }).then(r => r.json())
if (!listed.success) throw new Error(JSON.stringify(listed.errors))
const set = listed.result.find((r: { phase: string }) => r.phase === 'http_request_cache_settings')
if (!set) throw new Error('Cache ruleset unavailable')
const current = await fetch(`${base}/${set.id}`, { headers }).then(r => r.json())
if (!current.success) throw new Error(JSON.stringify(current.errors))
const rule = {
  ref: 'bypass-locale-entry-v1',
  description: 'Bypass unprefixed HTML cache for foreign entry and saved English choice',
  enabled: true,
  action: 'set_cache_settings',
  action_parameters: { cache: false },
  expression: `(starts_with(http.request.uri.path, "/celeb/") or starts_with(http.request.uri.path, "/content/") or http.request.uri.path in {"/explore/directory" "/explore/timeline"}) and ((ip.src.country ne "KR" and ip.src.country ne "XX" and ip.src.country ne "T1") or http.cookie contains "${LOCALE_PREFERENCE_COOKIE}=en" or http.cookie contains "NEXT_LOCALE=en")`,
}
const existing = current.result.rules.find((r: { ref: string }) => r.ref === rule.ref)
console.log(JSON.stringify({ mode: process.argv.includes('--execute') ? 'execute' : 'plan', rule }))
if (process.argv.includes('--execute')) {
  const url = `${base}/${set.id}/rules${existing ? `/${existing.id}` : ''}`
  const result = await fetch(url, { method: existing ? 'PATCH' : 'POST', headers, body: JSON.stringify(rule) }).then(r => r.json())
  if (!result.success) throw new Error(JSON.stringify(result.errors))
  const verified = await fetch(`${base}/${set.id}`, { headers }).then(r => r.json())
  const stored = verified.result?.rules?.find((r: { ref: string }) => r.ref === rule.ref)
  if (!stored?.enabled || stored.expression !== rule.expression || stored.action_parameters?.cache !== false) throw new Error('Cache bypass verification failed')
  console.log('Locale entry cache bypass verified')
}
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
