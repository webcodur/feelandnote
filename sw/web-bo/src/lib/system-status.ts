import 'server-only'

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'
import { parseDatabaseHostOutput, parseWebHostOutput } from './system-status-format'
import type { DatabaseApiStatus, EndpointStatus, SystemStatus } from './system-status-types'

const WEB_HOST = 'ubuntu@168.107.58.90'
const DATABASE_HOST = 'ubuntu@152.67.216.40'
const PUBLIC_WEB_URL = 'https://feelandnote.com'
const SSH_TIMEOUT_MS = 12_000

const WEB_PROBE = `set -eu
systemctl show feelandnote-web.service -p ActiveState -p SubState -p MemoryCurrent -p MemorySwapCurrent -p NRestarts
grep -E '^(MemTotal|MemAvailable|SwapTotal|SwapFree):' /proc/meminfo
printf 'UptimeSeconds='; cut -d. -f1 /proc/uptime
printf 'CurrentPath='; readlink -f /opt/feelandnote/web/current
printf 'ReleaseJson='; tr -d '\n' < /opt/feelandnote/web/current/.feelandnote-release.json
printf '\n'`

const DATABASE_PROBE = `set -eu
docker inspect --format 'PostgresRunning={{.State.Running}}
PostgresHealth={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}
PostgresStartedAt={{.State.StartedAt}}' supabase-db
systemctl show feelandnote-db-backup.timer -p ActiveState -p SubState -p LastTriggerUSec -p NextElapseUSecRealtime
systemctl show feelandnote-db-backup.service -p Result -p ExecMainStatus -p ExecMainExitTimestamp
grep -E '^(MemTotal|MemAvailable|SwapTotal|SwapFree):' /proc/meminfo
printf 'UptimeSeconds='; cut -d. -f1 /proc/uptime
printf 'Postgres='
docker exec -i supabase-db psql -U postgres -d postgres -At -F '|' <<'SQL'
select current_setting('server_version'),
       pg_database_size(current_database()),
       current_setting('max_connections'),
       count(*) filter (where datname = current_database()),
       (select count(*) from pg_tables where schemaname = 'public')
from pg_stat_activity;
SQL`

interface CommandResult {
  output: string
  responseMs: number
  error: string | null
}

function compactError(value: string): string {
  const firstLine = value.trim().split(/\r?\n/u)[0]
  return (firstLine || '상태를 읽지 못했습니다').slice(0, 240)
}

function runSsh(host: string, remoteCommand: string): Promise<CommandResult> {
  const startedAt = performance.now()
  const keyPath = path.join(homedir(), '.ssh', 'feelandnote_oracle')
  if (!existsSync(keyPath)) {
    return Promise.resolve({ output: '', responseMs: 0, error: 'Oracle SSH 키가 없습니다.' })
  }

  return new Promise((resolve) => {
    execFile(
      process.platform === 'win32' ? 'ssh.exe' : 'ssh',
      ['-i', keyPath, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', host, remoteCommand],
      { encoding: 'utf8', timeout: SSH_TIMEOUT_MS, windowsHide: true, maxBuffer: 256 * 1024 },
      (error, stdout, stderr) => {
        const responseMs = Math.round(performance.now() - startedAt)
        const detail = error ? compactError(stderr || error.message) : null
        resolve({ output: stdout, responseMs, error: detail })
      },
    )
  })
}

async function probeEndpoint(): Promise<EndpointStatus> {
  const startedAt = performance.now()
  try {
    const response = await fetch(PUBLIC_WEB_URL, {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(8_000),
    })
    await response.body?.cancel()
    return {
      ok: response.ok,
      statusCode: response.status,
      responseMs: Math.round(performance.now() - startedAt),
      error: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      responseMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? compactError(error.message) : '공개 웹에 연결하지 못했습니다.',
    }
  }
}

async function probeDatabaseApi(): Promise<DatabaseApiStatus> {
  const startedAt = performance.now()
  try {
    const supabase = await createClient()
    const [sizeResult, tableResult] = await Promise.all([
      supabase.rpc('get_database_size').single(),
      supabase.rpc('get_table_count').single(),
    ])
    const error = sizeResult.error?.message ?? tableResult.error?.message ?? null
    return {
      ok: error === null,
      responseMs: Math.round(performance.now() - startedAt),
      sizeBytes: error ? null : Number(sizeResult.data),
      tableCount: error ? null : Number(tableResult.data),
      error,
    }
  } catch (error) {
    return {
      ok: false,
      responseMs: Math.round(performance.now() - startedAt),
      sizeBytes: null,
      tableCount: null,
      error: error instanceof Error ? compactError(error.message) : 'DB API에 연결하지 못했습니다.',
    }
  }
}

export async function getSystemStatus(): Promise<SystemStatus> {
  await requireAdmin()

  const [endpoint, webCommand, databaseApi, databaseCommand] = await Promise.all([
    probeEndpoint(),
    runSsh(WEB_HOST, WEB_PROBE),
    probeDatabaseApi(),
    runSsh(DATABASE_HOST, DATABASE_PROBE),
  ])

  return {
    checkedAt: new Date().toISOString(),
    web: {
      endpoint,
      host: parseWebHostOutput(webCommand.output, webCommand.responseMs, webCommand.error),
    },
    database: {
      api: databaseApi,
      host: parseDatabaseHostOutput(
        databaseCommand.output,
        databaseCommand.responseMs,
        databaseCommand.error,
      ),
    },
  }
}
