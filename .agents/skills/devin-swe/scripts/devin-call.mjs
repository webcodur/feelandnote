// Devin CLI 비대화 호출 헬퍼 — 실행 파일 해석·격리 cwd·무료 모델 고정·UTF-8 수신·시간 제한을 한곳에 가둔다.
// 쓰는 법: const text = await devinCall('프롬프트', { cwd: 작업폴더, exportPath: '대화기록.md' })
import { execSync, spawn } from 'node:child_process'
import { createWriteStream, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** 무료 모델 — 별칭 `swe`는 SWE-2 묶음이지만 이름이 비슷한 SWE-1.7 Lightning은 유료다(26.09.12 models list) */
export const DEVIN_FREE_MODEL = 'swe-2-max'

/** Devin Desktop만 깔린 PC에서는 CLI가 PATH에 없고 앱 안에 번들로 들어 있다 */
const BUNDLED = join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Devin', 'resources', 'app', 'extensions', 'windsurf', 'devin', 'bin', 'devin.exe')

let resolved = null
export function resolveDevin() {
  if (resolved) return resolved
  try {
    const found = execSync(process.platform === 'win32' ? 'where devin' : 'which devin', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    resolved = found.find((p) => /\.(exe|cmd)$/i.test(p)) ?? found[0] ?? null
  } catch {
    resolved = null
  }
  if (!resolved && existsSync(BUNDLED)) resolved = BUNDLED
  if (!resolved) throw new Error('devin CLI를 찾지 못했다 — PATH에도 Devin Desktop 번들 경로에도 없다')
  return resolved
}

/**
 * 프롬프트 하나를 비대화로 돌려 답(stdout)을 돌려준다.
 * cwd를 주지 않으면 빈 임시 폴더에서 돈다 — 저장소의 AGENTS.md·파일을 물려받지 않게 한다.
 * 로그인이나 첫 실행 설정이 안 되어 있으면 -p가 오류 없이 멈춘다. 시간 초과가 나면 그 둘부터 본다.
 * logPath를 주면 stdout·stderr를 받는 대로 그 파일에 흘린다. --export는 첫 턴이 끝나야 쓰이므로
 * 시작부터 멈춘 세션은 그것만으로 아무 흔적이 없다 — 긴 작업에는 logPath를 함께 준다.
 */
/** 계정 전체 메시지 속도 제한 — 세션이 통째로 실패한다. 안내된 시간을 읽어 쉬었다 다시 건다 */
const RATE_LIMIT = /Reached overall message rate limit[\s\S]*?reset in (\d+)\s*(second|minute)/i
function rateLimitWaitMs(text) {
  const hit = RATE_LIMIT.exec(text ?? '')
  if (!hit) return 0
  const n = Number(hit[1])
  const base = hit[2].toLowerCase().startsWith('minute') ? n * 60_000 : n * 1000
  /* 안내 시간이 0초로 오기도 한다. 30초를 더하고 최소 90초는 쉰다 */
  return Math.max(base + 30_000, 90_000)
}

/**
 * 한도에 걸리면 안내된 시간만큼 쉬었다 다시 건다. 대량 배치에서는 이게 없으면 남은 항목이 몇 초 간격으로 전부 실패한다.
 * 두드릴수록 한도가 늘어나므로 즉시 재시도하지 않는다.
 */
export async function devinCallWithRetry(prompt, options = {}, { tries = 12, onWait } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await devinCall(prompt, options)
    } catch (error) {
      const waitMs = rateLimitWaitMs(error.message)
      if (!waitMs || attempt >= tries) throw error
      onWait?.(waitMs, attempt)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }
}

export function devinCall(prompt, { model = DEVIN_FREE_MODEL, cwd, timeoutMs = 10 * 60_000, exportPath, logPath } = {}) {
  const work = cwd ?? mkdtempSync(join(tmpdir(), 'devin-call-'))
  const promptFile = join(work, `.devin-prompt-${process.pid}-${Date.now()}.md`)
  writeFileSync(promptFile, prompt)
  const args = ['-p', '--model', model, '--permission-mode', 'dangerous', '--respect-workspace-trust', 'false', '--prompt-file', promptFile]
  if (exportPath) args.push('--export', exportPath)

  return new Promise((resolve, reject) => {
    const child = spawn(resolveDevin(), args, { cwd: work, windowsHide: true })
    const log = logPath ? createWriteStream(logPath) : null
    let out = ''
    let err = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (d) => { out += d; log?.write(d) })
    child.stderr.on('data', (d) => { err += d; log?.write(d) })
    let settled = false
    const finish = (fn) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      log?.end()
      rmSync(promptFile, { force: true })
      if (!cwd) rmSync(work, { recursive: true, force: true })
      fn()
    }
    const timer = setTimeout(() => {
      child.kill()
      finish(() => reject(new Error(`시간 초과 ${Math.round(timeoutMs / 1000)}초 — 로그인(auth status)·첫 실행 설정(devin setup)부터 본다`)))
    }, timeoutMs)
    child.on('exit', (code) => finish(() => (code === 0
      ? resolve(out.trim())
      : reject(new Error(`devin exit ${code}: ${(err || out).slice(0, 400)}`)))))
  })
}
