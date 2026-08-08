import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { processNobgAvatar } from './nobg-avatar'
import type { ImageProcessingJob, ImageProcessingJobType } from './types'

const QUEUE_DIR = path.join(process.cwd(), '.tmp', 'image-processing')
const QUEUE_FILE = path.join(QUEUE_DIR, 'queue.json')
const MAX_RETAINED_JOBS = 200

interface PersistedQueue {
  jobs: ImageProcessingJob[]
  pendingIds: string[]
}

const globalQueue = globalThis as typeof globalThis & {
  __imageProcessingJobs?: Map<string, ImageProcessingJob>
  __imageProcessingPending?: string[]
  __imageProcessingLoaded?: Promise<void>
  __imageProcessingMutation?: Promise<unknown>
  __imageProcessingWorkerRunning?: boolean
}

globalQueue.__imageProcessingJobs ??= new Map()
globalQueue.__imageProcessingPending ??= []
globalQueue.__imageProcessingMutation ??= Promise.resolve()
globalQueue.__imageProcessingWorkerRunning ??= false

const jobs = globalQueue.__imageProcessingJobs!
const pendingIds = globalQueue.__imageProcessingPending!

function cloneWithPosition(job: ImageProcessingJob): ImageProcessingJob {
  const queueIndex = pendingIds.indexOf(job.id)
  return {
    ...job,
    queuePosition: job.status === 'queued' && queueIndex >= 0 ? queueIndex + 1 : 0,
  }
}

async function persistQueue(): Promise<void> {
  pendingIds.forEach((id, index) => {
    const job = jobs.get(id)
    if (job?.status === 'queued') job.queuePosition = index + 1
  })
  const completed = [...jobs.values()]
    .filter((job) => job.status === 'done' || job.status === 'error')
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  const keepCompleted = new Set(completed.slice(0, MAX_RETAINED_JOBS).map((job) => job.id))
  for (const [id, job] of jobs) {
    if ((job.status === 'done' || job.status === 'error') && !keepCompleted.has(id)) jobs.delete(id)
  }

  const payload: PersistedQueue = {
    jobs: [...jobs.values()],
    pendingIds: [...pendingIds],
  }
  try {
    await mkdir(QUEUE_DIR, { recursive: true })
    const tempFile = `${QUEUE_FILE}.${process.pid}.tmp`
    await writeFile(tempFile, JSON.stringify(payload, null, 2), 'utf8')
    await rename(tempFile, QUEUE_FILE)
  } catch {
    // Serverless 환경에서는 파일 시스템 쓰기가 불가하다.
    // 인메모리 큐는 MVC 모델 안에서 살아있는 동안만 유지된다.
    // 워커를 띄울 수 없으므로 여기서 persist가 실패해도 문제없다.
  }
}

async function loadQueue(): Promise<void> {
  if (globalQueue.__imageProcessingLoaded) return globalQueue.__imageProcessingLoaded
  globalQueue.__imageProcessingLoaded = (async () => {
    try {
      await mkdir(QUEUE_DIR, { recursive: true })
      const payload = JSON.parse(await readFile(QUEUE_FILE, 'utf8')) as PersistedQueue
      jobs.clear()
      pendingIds.length = 0
      const interruptedIds = (payload.jobs ?? [])
        .filter((job) => job.status === 'running')
        .toSorted((a, b) => (a.startedAt ?? a.createdAt).localeCompare(b.startedAt ?? b.createdAt))
        .map((job) => job.id)
      for (const saved of payload.jobs ?? []) {
        const recovered = saved.status === 'running'
          ? { ...saved, status: 'queued' as const, startedAt: undefined }
          : saved
        jobs.set(recovered.id, recovered)
      }
      const recoverable = new Set(
        [...jobs.values()].filter((job) => job.status === 'queued').map((job) => job.id)
      )
      for (const id of interruptedIds) {
        if (recoverable.delete(id)) pendingIds.push(id)
      }
      for (const id of payload.pendingIds ?? []) {
        if (recoverable.delete(id)) pendingIds.push(id)
      }
      for (const job of [...jobs.values()].toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        if (recoverable.has(job.id)) pendingIds.push(job.id)
      }
      await persistQueue()
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') {
        // 서버리스 등 쓰기 불가 파일시스템 — 인메모리 빈 큐로 시작
        console.warn('[image-processing] loadQueue 실패, 빈 큐로 시작:', code)
        return
      }
      await persistQueue()
    }
  })()
  return globalQueue.__imageProcessingLoaded
}

function mutate<T>(operation: () => Promise<T>): Promise<T> {
  const run = globalQueue.__imageProcessingMutation!.then(operation, operation)
  globalQueue.__imageProcessingMutation = run.then(() => undefined, () => undefined)
  return run
}

async function runJob(job: ImageProcessingJob): Promise<string> {
  switch (job.type) {
    case 'nobg-avatar':
      return processNobgAvatar(job.celebId)
  }
}

function startWorker(): void {
  if (globalQueue.__imageProcessingWorkerRunning) return
  globalQueue.__imageProcessingWorkerRunning = true
  void drainQueue().finally(() => {
    globalQueue.__imageProcessingWorkerRunning = false
    if (pendingIds.length > 0) startWorker()
  })
}

async function drainQueue(): Promise<void> {
  while (pendingIds.length > 0) {
    const job = await mutate(async () => {
      const id = pendingIds.shift()
      const next = id ? jobs.get(id) : undefined
      if (!next) return null
      next.status = 'running'
      next.queuePosition = 0
      next.startedAt = new Date().toISOString()
      next.error = undefined
      await persistQueue()
      return next
    })
    if (!job) continue

    try {
      const resultUrl = await runJob(job)
      await mutate(async () => {
        job.status = 'done'
        job.resultUrl = resultUrl
        job.finishedAt = new Date().toISOString()
        await persistQueue()
      })
    } catch (error) {
      await mutate(async () => {
        job.status = 'error'
        job.error = error instanceof Error ? error.message : '이미지 처리 실패'
        job.finishedAt = new Date().toISOString()
        await persistQueue()
      })
    }
  }
}

export async function enqueueImageProcessingJob(
  type: ImageProcessingJobType,
  celebId: string
): Promise<ImageProcessingJob> {
  await loadQueue()
  const task = await mutate(async () => {
    const existing = [...jobs.values()].find((job) =>
      job.type === type
      && job.celebId === celebId
      && (job.status === 'queued' || job.status === 'running')
    )
    if (existing) return cloneWithPosition(existing)

    const job: ImageProcessingJob = {
      id: crypto.randomUUID(),
      type,
      celebId,
      status: 'queued',
      queuePosition: pendingIds.length + 1,
      createdAt: new Date().toISOString(),
    }
    jobs.set(job.id, job)
    pendingIds.push(job.id)
    await persistQueue()
    return cloneWithPosition(job)
  })
  startWorker()
  return task
}

export async function getImageProcessingJob(id: string): Promise<ImageProcessingJob | null> {
  await loadQueue()
  const job = jobs.get(id)
  return job ? cloneWithPosition(job) : null
}

export async function getImageProcessingJobsForCelebs(
  celebIds: string[]
): Promise<Record<string, ImageProcessingJob>> {
  await loadQueue()
  startWorker()
  const wanted = new Set(celebIds)
  const result: Record<string, ImageProcessingJob> = {}
  for (const job of [...jobs.values()].toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (!wanted.has(job.celebId) || result[job.celebId]) continue
    if (job.status === 'queued' || job.status === 'running') result[job.celebId] = cloneWithPosition(job)
  }
  return result
}

export type { ImageProcessingJob } from './types'
