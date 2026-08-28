import assert from 'node:assert/strict'
import test from 'node:test'
import { parseDatabaseHostOutput, parseWebHostOutput } from './system-status-format'

test('웹 VM 상태와 릴리스 정보를 읽는다', () => {
  const output = [
    'NRestarts=3',
    'MemoryCurrent=562585600',
    'MemorySwapCurrent=443486208',
    'ActiveState=active',
    'SubState=running',
    'MemTotal: 976912 kB',
    'MemAvailable: 104936 kB',
    'SwapTotal: 2097148 kB',
    'SwapFree: 1584440 kB',
    'UptimeSeconds=333643',
    'CurrentPath=/opt/feelandnote/web/slots/blue',
    'ReleaseJson={"slot":"blue","releaseId":"release-1","commit":"abc123"}',
  ].join('\n')

  const result = parseWebHostOutput(output, 42, null)

  assert.equal(result.reachable, true)
  assert.equal(result.activeState, 'active')
  assert.equal(result.serviceMemoryBytes, 562585600)
  assert.equal(result.memory.totalBytes, 976912 * 1024)
  assert.equal(result.memory.usedBytes, (976912 - 104936) * 1024)
  assert.equal(result.slot, 'blue')
  assert.equal(result.releaseId, 'release-1')
})

test('DB VM 상태, PostgreSQL 수치와 백업 시각을 읽는다', () => {
  const output = [
    'PostgresRunning=true',
    'PostgresHealth=healthy',
    'PostgresStartedAt=2026-08-26T11:32:26.588693708Z',
    'NextElapseUSecRealtime=Fri 2026-08-28 18:20:00 UTC',
    'LastTriggerUSec=Thu 2026-08-27 18:20:07 UTC',
    'ActiveState=active',
    'SubState=waiting',
    'Result=success',
    'ExecMainStatus=0',
    'ExecMainExitTimestamp=Thu 2026-08-27 18:25:24 UTC',
    'MemTotal: 976912 kB',
    'MemAvailable: 301780 kB',
    'SwapTotal: 4194300 kB',
    'SwapFree: 3845696 kB',
    'UptimeSeconds=174820',
    'Postgres=17.6|196684947|100|14|67',
  ].join('\n')

  const result = parseDatabaseHostOutput(output, 35, null)

  assert.equal(result.postgresRunning, true)
  assert.equal(result.postgresHealth, 'healthy')
  assert.equal(result.postgresStartedAt, '2026-08-26T11:32:26.588693708Z')
  assert.equal(result.postgresVersion, '17.6')
  assert.equal(result.databaseSizeBytes, 196684947)
  assert.equal(result.connections, 14)
  assert.equal(result.maxConnections, 100)
  assert.equal(result.tableCount, 67)
  assert.equal(result.backupState, 'active')
  assert.equal(result.backupResult, 'success')
  assert.equal(result.backupExitCode, 0)
})

test('SSH 실패를 정상 상태로 바꾸지 않는다', () => {
  const result = parseWebHostOutput('', 10_000, 'SSH 연결 시간 초과')

  assert.equal(result.reachable, false)
  assert.equal(result.activeState, null)
  assert.equal(result.memory.totalBytes, 0)
  assert.equal(result.error, 'SSH 연결 시간 초과')
})
