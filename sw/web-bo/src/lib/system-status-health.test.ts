import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDatabaseHostHealth,
  getWebHostHealth,
  memoryUsagePercent,
} from './system-status-health'
import type { DatabaseHostStatus, HostMemoryStatus, WebHostStatus } from './system-status-types'

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
