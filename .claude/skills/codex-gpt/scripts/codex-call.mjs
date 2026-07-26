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

import { spawn, execSync } from 'child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let CODEX_PATH = null

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
 * @param {{model?: string, timeoutMs?: number}} opts
 * @returns {Promise<string>} 생성된 텍스트
 */
export async function codexCall(prompt, opts = {}) {
  const { model = 'gpt-5.6-sol', timeoutMs = 240000, effort } = opts
  const dir = mkdtempSync(join(tmpdir(), 'codex-call-'))
  const outFile = join(dir, 'out.txt')
  writeFileSync(outFile, '')

  const bin = resolveCodex()
  // 경로에 공백이 있을 수 있어 shell 사용 시 따옴표로 감싼다.
  const cmd = /\s/.test(bin) ? `"${bin}"` : bin

  try {
    await new Promise((res, rej) => {
      const args = ['exec', '-', '-m', model, '--output-last-message', outFile, '--color', 'never']
      // 추론 강도는 호출부가 정한다 — 문장 다듬기에 최고 강도는 시간만 잡아먹는다
      if (effort) args.push('-c', `model_reasoning_effort="${effort}"`)
      const ch = spawn(cmd, args,
        { shell: true, timeout: timeoutMs })
      let err = ''
      ch.stderr.on('data', (d) => { err += d.toString() })
      ch.on('error', rej)
      // stderr 앞부분에 무해한 스킬 로드 경고가 끼므로 넉넉히 남긴다(진짜 원인이 뒤에 있다).
      ch.on('close', (code) => (code === 0 ? res() : rej(new Error(`codex exit ${code}: ${err.slice(0, 400)}`))))
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
export const looksRateLimited = (msg = '') => /rate|limit|quota|429|usage/i.test(msg)
