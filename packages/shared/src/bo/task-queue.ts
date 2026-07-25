/**
 * 백그라운드 작업 실행기 — 서버 전용.
 *
 * 렌더·음성 합성·유튜브 올리기처럼 오래 걸리는 명령을 관리 화면이 눌러 실행하고,
 * 진행 로그를 모아 두었다가 작업 패널이 조회해 간다. 명령은 모두 렌더 저장소(sw/remotion)에서
 * `pnpm <인자>` 로 돌린다 — 그 위치는 REMOTION_ROOT 로 옮길 수 있다(remotion-root).
 *
 * 세 갈래로 나뉜다.
 *  1) 즉시 실행(runTask) — 누르는 즉시 하나 돈다. 렌더가 이 방식이다.
 *  2) 순차 실행(runTaskSequence) — 앞 단계가 성공했을 때만 다음으로 넘어간다(음성 → 받아쓰기 → 발화시각).
 *  3) 대기줄(queueTask) — 한 번에 하나씩, 누른 순서대로. 유튜브 올리기가 이 방식이다.
 *
 * 상태는 globalThis 에 얹어 개발 중 코드 새로고침(HMR)에도 살아남게 한다.
 */

import { spawn, type ChildProcess } from 'child_process'
import { REMOTION_ROOT } from './remotion-root'

export type TaskStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled'
export type Task = { id: string; type: string; series: string; episode: string; status: TaskStatus; log: string[]; startedAt: string; finishedAt?: string }

const g = globalThis as unknown as {
  __tasks?: Map<string, Task>
  __taskCounter?: number
  __uploadQueue?: { task: Task; args: string[] }[]
  __uploadRunning?: boolean
  __childProcesses?: Map<string, ChildProcess>
}
if (!g.__tasks) g.__tasks = new Map()
if (!g.__taskCounter) g.__taskCounter = 0
if (!g.__uploadQueue) g.__uploadQueue = []
if (g.__uploadRunning == null) g.__uploadRunning = false
if (!g.__childProcesses) g.__childProcesses = new Map()
const tasks = g.__tasks
function nextTaskId() { return ++g.__taskCounter! }

export function getTasks(limit = 20): Task[] {
  return [...tasks.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit)
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id)
}

/** 즉시 실행 태스크 (렌더 등 — 기존 동작) */
export function runTask(type: string, series: string, episode: string, args: string[]): Task {
  const id = `${type}-${nextTaskId()}`
  const task: Task = { id, type, series, episode, status: 'running', log: [], startedAt: new Date().toISOString() }
  tasks.set(id, task)
  spawnTask(task, args)
  return task
}

/**
 * 순차 실행 태스크 — 명령들을 앞에서부터 차례로 실행한다. 직전 단계가 성공(done)했을
 * 때만 다음 단계로 넘어가고, 실패(error)·취소(cancelled) 시 체인을 중단한다.
 * 여러 단계를 하나의 Task 로 묶어 로그를 누적한다. (예: 음성 생성 → 받아쓰기 → 발화시각)
 */
export function runTaskSequence(type: string, series: string, episode: string, argsList: string[][]): Task {
  const id = `${type}-${nextTaskId()}`
  const task: Task = { id, type, series, episode, status: 'running', log: [], startedAt: new Date().toISOString() }
  tasks.set(id, task)
  let i = 0
  const runNext = () => {
    if (i >= argsList.length) return
    const args = argsList[i]
    task.log.push(`[seq ${i + 1}/${argsList.length}] pnpm ${args.join(' ')}`)
    spawnTask(task, args, () => {
      // 직전 단계가 성공하지 못했으면(error/cancelled) 체인 중단 — 그 status 가 최종값으로 남는다
      if (task.status !== 'done') return
      i += 1
      if (i < argsList.length) {
        task.status = 'running' // 다음 단계 진행 (마지막 단계의 done 은 그대로 유지됨)
        runNext()
      }
    })
  }
  runNext()
  return task
}

/** FIFO 업로드 큐 — 한 번에 하나, 누른 순서대로 */
export function queueTask(type: string, series: string, episode: string, args: string[]): Task {
  const id = `${type}-${nextTaskId()}`
  const queuePos = g.__uploadQueue!.length + (g.__uploadRunning ? 1 : 0)
  const task: Task = { id, type, series, episode, status: 'queued', log: [], startedAt: new Date().toISOString() }
  if (queuePos > 0) task.log.push(`[queue] 대기 ${queuePos}번째`)
  tasks.set(id, task)
  g.__uploadQueue!.push({ task, args })
  drainUploadQueue()
  return task
}

function drainUploadQueue() {
  if (g.__uploadRunning || g.__uploadQueue!.length === 0) return
  const { task, args } = g.__uploadQueue!.shift()!
  g.__uploadRunning = true
  task.status = 'running'
  task.log.push(`[queue] 시작`)
  spawnTask(task, args, () => {
    g.__uploadRunning = false
    drainUploadQueue()
  })
}

function spawnTask(task: Task, args: string[], onDone?: () => void) {
  const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const child = spawn(cmd, args, { cwd: REMOTION_ROOT, shell: true })
  g.__childProcesses!.set(task.id, child)

  child.stdout?.on('data', (d: Buffer) => {
    task.log.push(...d.toString().split('\n').filter(Boolean))
  })
  child.stderr?.on('data', (d: Buffer) => {
    task.log.push(...d.toString().split('\n').filter(Boolean))
  })
  child.on('close', (code) => {
    g.__childProcesses!.delete(task.id)
    if (task.status !== 'cancelled') {
      task.status = code === 0 ? 'done' : 'error'
    }
    task.finishedAt = new Date().toISOString()
    onDone?.()
  })
  child.on('error', (err) => {
    g.__childProcesses!.delete(task.id)
    if (task.status !== 'cancelled') {
      task.status = 'error'
      task.log.push(`Error: ${err.message}`)
    }
    task.finishedAt = new Date().toISOString()
    onDone?.()
  })
}

export function cancelTask(id: string): boolean {
  const task = tasks.get(id)
  if (!task) return false
  if (task.status !== 'queued' && task.status !== 'running') return false

  task.status = 'cancelled'
  task.finishedAt = new Date().toISOString()
  task.log.push('[cancelled] 사용자 중단')

  // 큐에서 제거 (queued 상태)
  const qIdx = g.__uploadQueue!.findIndex(q => q.task.id === id)
  if (qIdx >= 0) g.__uploadQueue!.splice(qIdx, 1)

  // 실행 중이면 프로세스 종료 — 자식 트리까지(pnpm → node → remotion-cli → chrome)
  const child = g.__childProcesses!.get(id)
  if (child) {
    killProcessTree(child)
    g.__childProcesses!.delete(id)
    g.__uploadRunning = false
    drainUploadQueue()
  }

  return true
}

/**
 * 프로세스를 자식 트리까지 강제 종료한다.
 *
 * `child.kill()`은 spawn한 최상위 셸(Windows: cmd.exe)만 죽인다. 렌더는
 * pnpm → node → remotion-cli → chrome-headless-shell 로 손자·증손자가 이어져
 * 셸만 죽이면 나머지가 고아로 살아남아 CPU·메모리를 계속 점유한다.
 *   - Windows: `taskkill /PID <pid> /T /F` 로 트리 전체 종료(/T = 자식 포함).
 *     인자를 배열로 넘기므로 한국어 로케일 파싱 문제 없음.
 *   - POSIX: 프로세스 그룹(-pid) 전체에 SIGKILL.
 */
function killProcessTree(child: ChildProcess) {
  if (child.pid == null) { child.kill('SIGKILL'); return }
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'])
  } else {
    try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
  }
}
