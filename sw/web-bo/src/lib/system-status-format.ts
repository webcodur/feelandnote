import type { DatabaseHostStatus, HostMemoryStatus, WebHostStatus } from './system-status-types'

function numericValue(values: Map<string, string>, key: string): number {
  const value = Number.parseFloat(values.get(key) ?? '0')
  return Number.isFinite(value) ? value : 0
}

function parseLines(output: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const rawLine of output.split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (!line) continue
    const equalsAt = line.indexOf('=')
    const colonAt = line.indexOf(':')
    const separatorAt = equalsAt >= 0 ? equalsAt : colonAt
    if (separatorAt < 1) continue
    values.set(line.slice(0, separatorAt).trim(), line.slice(separatorAt + 1).trim())
  }
  return values
}

function parseMemory(values: Map<string, string>): HostMemoryStatus {
  const totalBytes = numericValue(values, 'MemTotal') * 1024
  const availableBytes = numericValue(values, 'MemAvailable') * 1024
  const swapTotalBytes = numericValue(values, 'SwapTotal') * 1024
  const swapFreeBytes = numericValue(values, 'SwapFree') * 1024
  return {
    totalBytes,
    availableBytes,
    usedBytes: Math.max(totalBytes - availableBytes, 0),
    swapTotalBytes,
    swapUsedBytes: Math.max(swapTotalBytes - swapFreeBytes, 0),
  }
}

function parseRelease(value: string | undefined) {
  if (!value) return null
  try {
    const release = JSON.parse(value) as {
      slot?: string
      releaseId?: string
      commit?: string
    }
    return release
  } catch {
    return null
  }
}

export function parseWebHostOutput(
  output: string,
  responseMs: number,
  error: string | null,
): WebHostStatus {
  const values = parseLines(output)
  const release = parseRelease(values.get('ReleaseJson'))
  return {
    reachable: error === null,
    activeState: values.get('ActiveState') ?? null,
    subState: values.get('SubState') ?? null,
    serviceMemoryBytes: numericValue(values, 'MemoryCurrent'),
    serviceSwapBytes: numericValue(values, 'MemorySwapCurrent'),
    restarts: numericValue(values, 'NRestarts'),
    uptimeSeconds: numericValue(values, 'UptimeSeconds'),
    currentPath: values.get('CurrentPath') ?? null,
    slot: release?.slot ?? null,
    releaseId: release?.releaseId ?? null,
    commit: release?.commit ?? null,
    memory: parseMemory(values),
    responseMs,
    error,
  }
}

export function parseDatabaseHostOutput(
  output: string,
  responseMs: number,
  error: string | null,
): DatabaseHostStatus {
  const values = parseLines(output)
  const postgres = (values.get('Postgres') ?? '').split('|')
  return {
    reachable: error === null,
    postgresRunning: values.get('PostgresRunning') === 'true',
    postgresHealth: values.get('PostgresHealth') === 'none'
      ? null
      : values.get('PostgresHealth') ?? null,
    postgresStartedAt: values.get('PostgresStartedAt') ?? null,
    postgresVersion: postgres[0] || null,
    databaseSizeBytes: postgres[1] ? Number(postgres[1]) : null,
    maxConnections: postgres[2] ? Number(postgres[2]) : null,
    connections: postgres[3] ? Number(postgres[3]) : null,
    tableCount: postgres[4] ? Number(postgres[4]) : null,
    backupState: values.get('ActiveState') ?? null,
    backupSubState: values.get('SubState') ?? null,
    backupResult: values.get('Result') ?? null,
    backupExitCode: values.has('ExecMainStatus') ? numericValue(values, 'ExecMainStatus') : null,
    lastBackupAt: values.get('LastTriggerUSec') ?? null,
    lastBackupCompletedAt: values.get('ExecMainExitTimestamp') ?? null,
    nextBackupAt: values.get('NextElapseUSecRealtime') ?? null,
    uptimeSeconds: numericValue(values, 'UptimeSeconds'),
    memory: parseMemory(values),
    responseMs,
    error,
  }
}
