import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDatabaseHostHealth,
  getWebHostHealth,
  getDiskHealth,
  getMaintenanceHealth,
  memoryUsagePercent,
} from './system-status-health'
import type { DatabaseHostStatus, HostMemoryStatus, HostStorageStatus, WebHostStatus } from './system-status-types'

function memory(usedPercent: number): HostMemoryStatus {
  return {
    totalBytes: 100,
    availableBytes: 100 - usedPercent,
    usedBytes: usedPercent,
    swapTotalBytes: 0,
    swapUsedBytes: 0,
  }
}

const healthyWebHost: WebHostStatus = {
  reachable: true,
  activeState: 'active',
  subState: 'running',
  serviceMemoryBytes: 0,
  serviceSwapBytes: 0,
  restarts: 0,
  uptimeSeconds: 1,
  currentPath: null,
  slot: null,
  releaseId: null,
  commit: null,
  memory: memory(40),
  storage: null,
  responseMs: 1,
  error: null,
}

const healthyDatabaseHost: DatabaseHostStatus = {
  reachable: true,
  postgresRunning: true,
  postgresHealth: 'healthy',
  postgresStartedAt: '2026-08-26T11:32:26.588693708Z',
  postgresVersion: '17.6',
  databaseSizeBytes: 1,
  connections: 10,
  maxConnections: 100,
  tableCount: 1,
  backupState: 'active',
  backupSubState: 'waiting',
  backupResult: 'success',
  backupExitCode: 0,
  lastBackupAt: null,
  lastBackupCompletedAt: null,
  nextBackupAt: null,
  uptimeSeconds: 1,
  memory: memory(40),
  storage: null,
  responseMs: 1,
  error: null,
}

test('메모리 사용률을 정수 백분율로 계산한다', () => {
  assert.equal(memoryUsagePercent(memory(87)), 87)
  assert.equal(memoryUsagePercent({ ...memory(0), totalBytes: 0 }), null)
})

test('웹 VM 메모리가 85% 이상이면 확인 필요로 판정한다', () => {
  assert.equal(getWebHostHealth({ ...healthyWebHost, memory: memory(84) }), 'healthy')
  assert.equal(getWebHostHealth({ ...healthyWebHost, memory: memory(85) }), 'warning')
  assert.equal(getWebHostHealth({ ...healthyWebHost, memory: memory(95) }), 'critical')
})

test('DB 컨테이너와 백업 이상은 장애로 판정한다', () => {
  assert.equal(getDatabaseHostHealth(healthyDatabaseHost), 'healthy')
  assert.equal(getDatabaseHostHealth({ ...healthyDatabaseHost, postgresHealth: 'unhealthy' }), 'critical')
  assert.equal(getDatabaseHostHealth({ ...healthyDatabaseHost, backupResult: 'failed' }), 'critical')
})

test('DB 연결 점유율이 80% 이상이면 확인 필요로 판정한다', () => {
  assert.equal(getDatabaseHostHealth({ ...healthyDatabaseHost, connections: 79 }), 'healthy')
  assert.equal(getDatabaseHostHealth({ ...healthyDatabaseHost, connections: 80 }), 'warning')
  assert.equal(getDatabaseHostHealth({ ...healthyDatabaseHost, connections: 95 }), 'critical')
})

test('80% 경계는 반올림하기 전에 판단하고 조회 실패는 정상으로 표시하지 않는다', () => {
  const storage = { disk: { usedPercent: 79.999 }, error: null } as HostStorageStatus
  assert.equal(getDiskHealth(storage, 80), 'healthy')
  assert.equal(getDiskHealth({ ...storage, disk: { ...storage.disk, usedPercent: 80 } }, 80), 'warning')
  assert.equal(getDiskHealth(null, 80), 'unavailable')
  assert.equal(getDiskHealth(storage, null), 'unavailable')
})

test('oneshot 종료는 정상이며 꺼진 타이머와 청소 실패를 구분한다', () => {
  const task = { timerLoaded: true, timerState: 'active', serviceState: 'inactive',
    result: 'success', exitCode: 0, lastFinishedAt: '2026-10-05T10:00:00Z', nextRunAt: null }
  assert.equal(getMaintenanceHealth(task), 'healthy')
  assert.equal(getMaintenanceHealth({ ...task, timerState: 'inactive' }), 'warning')
  assert.equal(getMaintenanceHealth({ ...task, serviceState: 'failed', result: 'exit-code', exitCode: 1 }), 'critical')
  assert.equal(getMaintenanceHealth({ ...task, lastFinishedAt: null }), 'warning')
  assert.equal(getMaintenanceHealth(null), 'unavailable')
})

test('의도적으로 비활성화된 백업을 PostgreSQL 장애로 표시하지 않는다', () => {
  assert.equal(getDatabaseHostHealth({ ...healthyDatabaseHost, backupState: 'inactive' }), 'warning')
})
