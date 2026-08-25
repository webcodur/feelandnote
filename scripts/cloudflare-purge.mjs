/*
  파일명: /scripts/cloudflare-purge.mjs
  기능: Oracle 코드 배포 뒤 Cloudflare 앞단 캐시를 범위 단위로 비운다.
  책임: `.github/workflows/cloudflare-purge.yml`과 같은 계획·같은 검증·같은 payload를 쓰되,
        GitHub 인증 수단이 없는 로컬에서도 배포를 끝까지 마칠 수 있게 한다.
        전체 존 퍼지는 여기서 다루지 않는다 — 그 권한은 워크플로에만 남긴다.
*/ // ------------------------------

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createManualCloudflarePurgePlan } from './lib/cloudflare-purge-impact.mjs'

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CREDENTIAL_FILE = path.join(SCRIPT_ROOT, 'sw', 'web', '.env')
const PURGE_ENDPOINT = 'https://api.cloudflare.com/client/v4/zones'
const REQUEST_ATTEMPTS = 3
const RETRY_DELAY_MS = 2000
const REQUEST_TIMEOUT_MS = 30000

/*
  분류기가 뽑아 준 URL을 그대로 믿지 않고 한 번 더 막는다. 워크플로도 같은 자리에서
  같은 검사를 하며, 이 중복은 분류기가 변조돼도 남의 host를 지우지 못하게 하는 방어다.
*/
const ALLOWED_PREFIX = 'feelandnote.com/'
const ALLOWED_FILE_ORIGIN = 'https://feelandnote.com/'

function argumentValue(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function hasFlag(name) {
  return process.argv.includes(name)
}

/** 환경변수를 먼저 보고, 없으면 사용자 웹의 .env에서 읽는다 */
function readCredentials() {
  const fromEnv = {
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
  }
  if (fromEnv.zoneId && fromEnv.apiToken) return { ...fromEnv, source: 'environment' }

  if (!existsSync(CREDENTIAL_FILE)) {
    throw new Error(`Cloudflare credentials missing; ${CREDENTIAL_FILE} not found`)
  }

  const parsed = new Map()
  for (const line of readFileSync(CREDENTIAL_FILE, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/u.exec(line)
    if (!match) continue
    parsed.set(match[1], match[2].trim().replace(/^["']|["']$/gu, ''))
  }

  const zoneId = fromEnv.zoneId ?? parsed.get('CLOUDFLARE_ZONE_ID')
  const apiToken = fromEnv.apiToken ?? parsed.get('CLOUDFLARE_API_TOKEN')
  if (!zoneId || !apiToken) {
    throw new Error('Cloudflare credentials missing; refusing to report success')
  }
  return { zoneId, apiToken, source: path.relative(SCRIPT_ROOT, CREDENTIAL_FILE) }
}

/** 계획이 우리 존의 정해진 경로만 겨냥하는지 확인한다 */
export function assertPurgeTargets(plan) {
  if (plan.emergencyZone) {
    throw new Error('emergency-zone is workflow-only; use cloudflare-purge.yml with its confirmation')
  }
  if (!plan.prefixes.every((prefix) => prefix.startsWith(ALLOWED_PREFIX))) {
    throw new Error('Purge plan contains a prefix outside feelandnote.com')
  }
  if (!plan.files.every((file) => file.startsWith(ALLOWED_FILE_ORIGIN))) {
    throw new Error('Purge plan contains a file outside feelandnote.com')
  }
  if (plan.prefixes.length + plan.files.length === 0) {
    throw new Error('Purge plan has no target; refusing to send an empty request')
  }
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

async function purgeRequest(credentials, label, payload) {
  let lastError
  for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${PURGE_ENDPOINT}/${credentials.zoneId}/purge_cache`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || body.success !== true) {
        throw new Error(`HTTP ${response.status} ${JSON.stringify(body.errors ?? body)}`)
      }
      return { label, status: response.status, attempts: attempt }
    } catch (error) {
      lastError = error
      if (attempt < REQUEST_ATTEMPTS) await wait(RETRY_DELAY_MS)
    }
  }
  throw new Error(`${label} request failed: ${lastError?.message ?? 'unknown error'}`)
}

async function main() {
  const scope = argumentValue('--scope')
  if (!scope) {
    throw new Error('Usage: node scripts/cloudflare-purge.mjs --scope <scope> [--execute]')
  }

  // 확인문 자리는 비워 넘긴다 — emergency-zone은 아래 검사에서 어차피 거부된다.
  const plan = createManualCloudflarePurgePlan(scope, '')
  const execute = hasFlag('--execute')

  if (plan.scopes.length === 1 && plan.scopes[0] === 'none') {
    console.log(JSON.stringify({ mode: 'plan', ...plan, purged: false, reason: 'nothing to purge' }, null, 2))
    return
  }

  assertPurgeTargets(plan)

  if (!execute) {
    console.log(JSON.stringify({
      mode: 'plan',
      ...plan,
      purged: false,
      nextCommand: `pnpm purge:web:cloudflare -- --scope ${scope} --execute`,
    }, null, 2))
    return
  }

  const credentials = readCredentials()
  const requests = []
  if (plan.prefixes.length) requests.push(await purgeRequest(credentials, 'prefixes', { prefixes: plan.prefixes }))
  if (plan.files.length) requests.push(await purgeRequest(credentials, 'files', { files: plan.files }))

  console.log(JSON.stringify({
    mode: 'execute',
    ...plan,
    credentialSource: credentials.source,
    requests,
    purged: true,
  }, null, 2))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[cf-purge] ${error.message}`)
    process.exitCode = 1
  })
}
