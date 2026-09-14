/**
 * codex(GPT) 1회 호출 헬퍼.
 *
 *   import { codexCall } from '<skill>/scripts/codex-call.mjs'
 *   const text = await codexCall('프롬프트', { model: 'gpt-5.6-sol' })
 *
 * 설계 근거(실측):
 *   - 프롬프트는 stdin('-')으로 넣는다 → shell 이스케이프로 깨지지 않는다.
 *   - 결과는 --output-last-message 파일로 받는다 → stdout 헤더 노이즈를 파싱할 필요가 없다.
 *   - codex 실행파일은 .cmd 래퍼라 spawn('codex')가 ENOENT로 죽고, shell:true 만으로도
 *     동시 실행 시 산발적으로 'codex' is not recognized 가 난다 → 절대경로를 미리 해석해 쓴다.
 */

import { spawn, spawnSync, execSync } from 'child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { join } from 'path'

let CODEX_PATH = null

/** 고아 정리는 프로세스당 1회면 된다. 매 호출마다 돌 이유가 없다. */
let SWEPT = false

/** codex 실행파일 절대경로 해석 (Windows는 .cmd 우선). 1회만 수행 후 캐시. */
function resolveCodex() {
  if (CODEX_PATH) return CODEX_PATH
  try {
    const cmd = process.platform === 'win32' ? 'where codex' : 'which codex'
    const found = execSync(cmd, { encoding: 'utf-8' }).split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    CODEX_PATH = found.find((p) => p.toLowerCase().endsWith('.cmd')) || found[0] || 'codex'
  } catch {
    CODEX_PATH = 'codex'
  }
  return CODEX_PATH
}

/**
 * @param {string} prompt  프롬프트 전문
 * @param {{model?: string, timeoutMs?: number, effort?: 'low'|'medium'|'high'|'xhigh', search?: boolean, images?: string[], sandbox?: 'read-only'|'workspace-write'|'danger-full-access'}} opts
 * @returns {Promise<string>} 생성된 텍스트
 */
export async function codexCall(prompt, opts = {}) {
  const {
    model = 'gpt-6-astra',
    timeoutMs = 240000,
    effort = 'xhigh',
    search = false,
    images = [],
    sandbox,
  } = opts
  // 지난 배치가 강제 종료되며 남긴 codex 를 먼저 치운다. 러너마다 부르게 하면 새로 만든
  // 스크립트에서 빠뜨리므로 호출 경로 자체에 둔다.
  if (!SWEPT) {
    SWEPT = true
    const swept = cleanupOrphanCodex()
    if (swept.killed) console.log(`고아 codex ${swept.killed}개 정리 (${swept.freedMb}MB 회수)`)
  }

  const dir = mkdtempSync(join(tmpdir(), 'codex-call-'))
  const outFile = join(dir, 'out.txt')
  writeFileSync(outFile, '')

  const bin = resolveCodex()
  // 경로에 공백이 있을 수 있어 shell 사용 시 따옴표로 감싼다.
  const cmd = /\s/.test(bin) ? `"${bin}"` : bin

  try {
    await new Promise((res, rej) => {
      const args = [...(search ? ['--search'] : []), 'exec', '-', '-m', model, '--output-last-message', outFile, '--color', 'never']
      // 추론 강도는 호출부가 정한다 — 문장 다듬기에 최고 강도는 시간만 잡아먹는다
      if (effort) args.push('-c', `model_reasoning_effort="${effort}"`)
      if (sandbox) args.push('-s', sandbox)
      for (const image of images) args.push('-i', image)
      const ch = spawn(cmd, args,
        {
          shell: true,
          windowsHide: true,
          detached: process.platform !== 'win32',
        })
      let err = ''
      let settled = false
      // codex exec는 마지막 응답을 파일로 쓰더라도 진행 로그를 stdout에 계속 낸다.
      // 파이프를 비우지 않으면 Windows 버퍼가 차서 작업 완료 뒤에도 프로세스가 멈춘다.
      ch.stdout.on('data', () => {})
      const finish = (callback) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        callback()
      }
      const timeout = setTimeout(() => {
        if (process.platform === 'win32' && ch.pid) {
          const killed = spawnSync('taskkill.exe', ['/PID', String(ch.pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
          })
          if (killed.error) ch.kill('SIGKILL')
        } else if (ch.pid) {
          try {
            process.kill(-ch.pid, 'SIGKILL')
          } catch {
            ch.kill('SIGKILL')
          }
        }
        finish(() => rej(new Error(`codex timeout after ${timeoutMs}ms`)))
      }, timeoutMs)
      ch.stderr.on('data', (d) => { err += d.toString() })
      ch.on('error', (error) => finish(() => rej(error)))
      // stderr 앞부분에 무해한 스킬 로드 경고가 끼므로 넉넉히 남긴다(진짜 원인이 뒤에 있다).
      ch.on('close', (code) => finish(() => (code === 0 ? res() : rej(new Error(`codex exit ${code}: ${err.slice(0, 2000)}`)))))
      ch.stdin.write(prompt)
      ch.stdin.end()
    })
    const text = readFileSync(outFile, 'utf-8').trim()
    if (!text) throw new Error('빈 응답')
    return text
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* 정리 실패는 무시 */ }
  }
}

/** rate limit 으로 죽었는지 추정. codex는 한도 도달 시 exit 1 로 죽는다. */



/**
 * 부모가 죽어 고아로 남은 codex 프로세스를 정리하고 회수량을 돌려준다.
 *
 * codex 호출 하나가 자식을 여럿 띄운다(실측: 동시 3에 22개·4.5GB). 배치가 강제 종료되면
 * 그것들이 고아로 남아 메모리를 쥐고, 다음 배치가 같은 이유로 또 죽는다. 배치 러너는
 * 시작할 때 이 함수를 먼저 부른다. 판정은 부모 PID 생존 여부라 다른 세션 것은 건드리지 않는다.
 *
 * 판정·종료 로직은 cleanup-orphan-codex.ps1 에 둔다. 인라인 PowerShell 은 이스케이프가
 * 여러 겹 통과하며 깨지므로 파일로 넘긴다.
 */
export function cleanupOrphanCodex() {
  if (process.platform !== 'win32') return { killed: 0, freedMb: 0 }
  const script = join(dirname(fileURLToPath(import.meta.url)), 'cleanup-orphan-codex.ps1')
  try {
    const out = execSync('powershell -NoProfile -ExecutionPolicy Bypass -File "' + script + '"', { encoding: 'utf-8', windowsHide: true })
    const nums = out.trim().split(String.fromCharCode(10)).map((v) => Number(v.trim()) || 0)
    const [killed, freedMb] = nums
    return { killed, freedMb }
  } catch {
    return { killed: 0, freedMb: 0 }
  }
}

export const looksRateLimited = (msg = '') => /rate|limit|quota|429|usage/i.test(msg)
