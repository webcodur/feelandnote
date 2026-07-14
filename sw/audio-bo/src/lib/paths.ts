import path from 'node:path'

export const AUDIO_ROOT = process.env.AUDIO_BO_ROOT ?? 'D:\\audios\\interview-cleaner\\projects'
export const TOOL_ROOT = process.env.GPT_SOVITS_ROOT ?? 'D:\\GPT-SoVITS\\GPT-SoVITS-v2pro-20250604'
export const CLEANER_ROOT = process.env.INTERVIEW_CLEANER_ROOT ?? 'D:\\audios\\interview-cleaner'
const APP_ROOT = process.cwd().endsWith(`${path.sep}audio-bo`) ? process.cwd() : path.join(process.cwd(), 'sw', 'audio-bo')
export const WORKER_PATH = path.join(APP_ROOT, 'scripts', 'audio-worker.ps1')

const JOB_ID = /^[a-z0-9-]+$/

export function jobDirectory(id: string) {
  if (!JOB_ID.test(id)) throw new Error('잘못된 작업 번호입니다.')
  return path.join(AUDIO_ROOT, id)
}
export const jobFile = (id: string) => path.join(jobDirectory(id), 'job.json')
