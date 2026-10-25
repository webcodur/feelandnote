import { spawn, type ChildProcess } from 'node:child_process'
import { appendFileSync, existsSync } from 'node:fs'
import path from 'node:path'
const NOBG_BATCH_DIR = 'C:\\project\\nobg\\batch'
const NOBG_SCRIPT = path.join(NOBG_BATCH_DIR, 'batch_nobg.py')
const PROCESS_BASE_TIMEOUT_MS = 2 * 60 * 1000
const PROCESS_PER_IMAGE_TIMEOUT_MS = 60 * 1000
const PROCESS_MAX_TIMEOUT_MS = 30 * 60 * 1000
const NOBG_DEVICE = process.env.NOBG_DEVICE?.trim() || 'cuda'
const NOBG_SPEED = process.env.NOBG_SPEED?.trim() || 'low'

function terminateProcessTree(child: ChildProcess): Promise<void> {
  if (!child.pid) {
    child.kill('SIGKILL')
    return Promise.resolve()
  }
  if (process.platform !== 'win32') {
    child.kill('SIGKILL')
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      shell: false,
      stdio: 'ignore',
      windowsHide: true,
    })
    killer.once('error', () => {
      child.kill('SIGKILL')
      resolve()
    })
    killer.once('close', () => resolve())
  })
}

export function runNobg(workDir: string, imageCount: number, options: { spawnProcess?: typeof spawn; terminate?: typeof terminateProcessTree; timeoutMs?: number; onProgress?: (message: string) => void } = {}): Promise<string> {
  const timeoutMs = options.timeoutMs ?? Math.min(
    PROCESS_MAX_TIMEOUT_MS,
    PROCESS_BASE_TIMEOUT_MS + PROCESS_PER_IMAGE_TIMEOUT_MS * imageCount
  )

  return new Promise<string>((resolve, reject) => {
    const child = (options.spawnProcess ?? spawn)('py', ['-3.12', NOBG_SCRIPT, 'rembg'], {
      cwd: NOBG_BATCH_DIR,
      // 파이썬 출력이 cp949로 나오면 한글 실패 사유를 읽지 못한다.
      env: {
        ...process.env,
        NOBG_WORK_DIR: workDir,
        NOBG_DEVICE,
        NOBG_SPEED,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1',
      },
      shell: false,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    let timedOut = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let pendingLine = ''
    const log = (file: string, chunk: string) => {
      try {
        if (existsSync(workDir)) appendFileSync(path.join(workDir, file), chunk, 'utf8')
      } catch (error) {
        console.warn('nobg 로그 저장 실패:', error)
      }
    }
    const armTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        timedOut = true
        void (options.terminate ?? terminateProcessTree)(child).finally(() => {
          reject(new Error(`nobg 처리 진척이 ${Math.round(timeoutMs / 60000)}분 동안 없어 중단되었습니다.`))
        })
      }, timeoutMs)
    }
    const progress = (line: string) => {
      if (timedOut) return
      if (/^누끼 작업 대기:/.test(line) || /^누끼 자원 대기\(/.test(line)) {
        // 공용 도구가 잠금·자원을 기다리는 동안은 추론 제한시간을 소비하지 않는다.
        clearTimeout(timer)
        options.onProgress?.(line)
      } else if (/^누끼 작업 시작:|^누끼 자원 여유 회복:|^실행 장치:|^\[\d+\/\d+\]/.test(line)) {
        armTimer()
        options.onProgress?.(line.startsWith('[') ? `배경 제거 ${line}` : '배경 제거 처리 중')
      }
    }
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
      log('nobg.stdout.log', chunk)
      pendingLine += chunk
      const lines = pendingLine.split(/\r?\n/)
      pendingLine = lines.pop()!
      for (const line of lines) progress(line.trim())
    })
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
      log('nobg.stderr.log', chunk)
    })
    armTimer()

    child.on('error', (error) => {
      clearTimeout(timer)
      if (timedOut) return
      reject(new Error(`nobg 실행 실패: ${error.message}`))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) return
      if (code === 0) {
        resolve(stdout)
        return
      }
      const detail = stderr.trim() || stdout.trim() || `exit ${code}`
      reject(new Error(`nobg 처리 실패: ${detail.slice(-1200)}`))
    })
  })
}
