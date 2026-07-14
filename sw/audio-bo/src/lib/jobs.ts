import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { AUDIO_ROOT, jobDirectory, jobFile } from './paths'
import type { AudioJob } from './types'

export async function listJobs(): Promise<AudioJob[]> {
  await mkdir(AUDIO_ROOT, { recursive: true })
  const entries = await readdir(AUDIO_ROOT, { withFileTypes: true })
  const jobs = await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => getJob(entry.name)))
  return jobs.filter((job): job is AudioJob => job !== null).toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getJob(id: string): Promise<AudioJob | null> {
  try {
    return JSON.parse(await readFile(jobFile(id), 'utf8')) as AudioJob
  } catch {
    return null
  }
}

export async function saveJob(job: AudioJob): Promise<void> {
  await mkdir(jobDirectory(job.id), { recursive: true })
  await writeFile(jobFile(job.id), JSON.stringify(job, null, 2), 'utf8')
}

export async function createJob(input: Pick<AudioJob, 'name' | 'sourceUrl' | 'startSeconds' | 'endSeconds' | 'speaker'>): Promise<AudioJob> {
  const now = new Date().toISOString()
  const id = `${input.speaker}-${randomUUID().slice(0, 8)}`
  const job: AudioJob = { ...input, id, stage: 'idle', progress: 0, message: '영상 가져오기 전', transcript: '', synthesisText: '', trainingSpeaker: 'A', segments: [], files: {}, createdAt: now, updatedAt: now }
  await Promise.all([
    mkdir(path.join(jobDirectory(id), 'input'), { recursive: true }),
    mkdir(path.join(jobDirectory(id), 'output'), { recursive: true }),
  ])
  await saveJob(job)
  return job
}
