/**
 * 조사 엔진 호출. 엔진이 자주 막히므로 한 인터페이스 뒤에 넷을 둔다.
 *   codex  gpt-6-astra / xhigh     .cmd 래퍼가 경로 공백에서 깨져 실체 js를 node로 돌린다
 *   claude sonnet                  .exe 직접
 *   agy    gemini-3.8-flash-high   스킬 헬퍼
 *   opencode  muse-spark           스킬 헬퍼
 * 모두 저장소 밖 빈 임시 폴더에서 돌려 문맥 오염을 막는다.
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { museCall } from '../../../../../.agents/skills/opencode-muse/scripts/muse-call.mjs'
import { agyCall, AGY_TEXT_MODEL } from '../../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const CODEX_CLI = process.env.CODEX_BIN ?? 'C:/Program Files/nodejs/node_modules/@openai/codex/bin/codex.js'
const CODEX_MODEL = process.env.CODEX_MODEL ?? 'gpt-6-astra'
const CODEX_EFFORT = process.env.CODEX_EFFORT ?? 'xhigh'
const CLAUDE_CLI = process.env.CLAUDE_BIN ?? 'C:/Program Files/nodejs/node_modules/@anthropic-ai/claude-code/bin/claude.exe'

function codexCall(prompt, timeoutMs) {
  return new Promise((resolvePromise) => {
    const dir = mkdtempSync(join(tmpdir(), 'cx-'))
    const outFile = join(dir, 'out.txt')
    const args = ['exec', '-', '-m', CODEX_MODEL, '-c', `model_reasoning_effort=${CODEX_EFFORT}`,
      '--skip-git-repo-check', '--output-last-message', outFile, '--color', 'never']
    const child = spawn(process.execPath, [CODEX_CLI, ...args], { cwd: dir, windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] })
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.on('close', () => {
      clearTimeout(timer)
      let text = ''
      try { text = readFileSync(outFile, 'utf8').trim() } catch { /* 산출 없음 */ }
      resolvePromise(text)
    })
    child.on('error', () => { clearTimeout(timer); resolvePromise('') })
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

function claudeCall(prompt, timeoutMs) {
  return new Promise((resolvePromise) => {
    const dir = mkdtempSync(join(tmpdir(), 'cl-'))
    const args = ['-p', prompt, '--model', 'sonnet', '--allowedTools', 'WebSearch', 'WebFetch']
    const child = spawn(CLAUDE_CLI, args, { cwd: dir, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stdout.on('data', (chunk) => { out += chunk })
    child.on('close', () => { clearTimeout(timer); resolvePromise(out.trim()) })
    child.on('error', () => { clearTimeout(timer); resolvePromise('') })
  })
}

/** @returns {Promise<string>} 본문. 실패·빈 응답은 빈 문자열이다. */
export async function research(prompt, { backend = 'codex', timeoutMs = 360000 } = {}) {
  if (backend === 'codex') return codexCall(prompt, timeoutMs)
  if (backend === 'claude') return claudeCall(prompt, timeoutMs)
  if (backend === 'agy') return String(await agyCall(prompt, { model: AGY_TEXT_MODEL, timeoutMs }) ?? '').trim()
  const result = await museCall(prompt, { timeoutMs, retries: 2, minChars: 2 })
  return result.text
}

/** `a | b | c` 꼴 첫 줄을 칸으로 가른다. 머리글 줄은 건너뛴다. */
export function parsePipeRow(text, headerFirstCell) {
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trim().replace(/^[-*\s]+/, '')
    if (!line.includes('|')) continue
    const cells = line.split('|').map((cell) => cell.trim())
    if (headerFirstCell && cells[0] === headerFirstCell) continue
    return cells
  }
  return null
}

export const declaredNone = (text) => /^없음/.test(String(text ?? '').trim())
