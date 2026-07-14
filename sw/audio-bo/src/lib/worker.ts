import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, openSync } from 'node:fs'
import path from 'node:path'
import { AUDIO_ROOT, CLEANER_ROOT, TOOL_ROOT, WORKER_PATH } from './paths'
import type { JobAction } from './types'

export function startWorker(id: string, action: JobAction): void {
  if (!existsSync(WORKER_PATH)) throw new Error(`작업 실행 파일을 찾지 못했습니다: ${WORKER_PATH}`)
  const log = path.join(AUDIO_ROOT, id, 'launcher.log')
  const output = openSync(log, 'a')
  const child = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', WORKER_PATH, '-JobId', id, '-Operation', action], {
    cwd: process.cwd(), windowsHide: true,
    env: { ...process.env, AUDIO_BO_ROOT: AUDIO_ROOT, AUDIO_BO_JOB_ID: id, AUDIO_BO_ACTION: action, GPT_SOVITS_ROOT: TOOL_ROOT, INTERVIEW_CLEANER_ROOT: CLEANER_ROOT },
    stdio: ['ignore', output, output],
  })
  child.on('error', (error) => appendFileSync(log, `${error.message}\n`, 'utf8'))
}
