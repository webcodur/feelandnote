/**
 * agy(Antigravity/Gemini) 1회 호출 헬퍼.
 *
 *   import { agyCall } from '<skill>/scripts/agy-call.mjs'
 *   const text = await agyCall('프롬프트', { docs: ['docs/.../rules.md'] })
 *
 * 설계 근거:
 *   - Windows에서는 확인된 agy.exe 절대경로를 직접 spawn한다.
 *   - 기본 모델은 품질 검증을 마친 gemini-3.8-flash-high다.
 *   - 다른 모델이 필요한 작업은 호출부가 확인한 모델 ID를 명시한다.
 *   - 긴 한국어는 셸을 거치지 않고 하나의 argv로 넘겨 따옴표 재해석을 막는다.
 *   - 저장소를 어지르지 않도록 전용 임시 cwd에서 실행한다.
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, resolve } from 'node:path'

const AGY_BIN = process.env.AGY_BIN
  ?? 'C:/Users/webco/AppData/Local/agy/bin/agy.exe'
export const AGY_TEXT_MODEL = 'gemini-3.8-flash-high'
export const AGY_OPUS_MODEL = 'claude-opus-4-6-thinking'
const DEFAULT_TIMEOUT_MS = 900_000

/**
 * @param {string} prompt
 * @param {object} [opts]
 * @param {string[]} [opts.docs] 문서 절대경로 또는 repoRoot 기준 상대경로.
 * @param {string} [opts.repoRoot] docs 상대경로 해석 기준.
 * @param {string} [opts.model] `agy models`에서 확인한 명시적 모델 ID.
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<string>} stdout의 최종 텍스트.
 */
export function agyCall(prompt, opts = {}) {
  const {
    docs = [], model = AGY_TEXT_MODEL, repoRoot = process.cwd(), timeoutMs = DEFAULT_TIMEOUT_MS,
  } = opts
  if (!String(model).trim()) throw new Error('agy 모델 ID가 비어 있다.')
  const work = mkdtempSync(resolve(tmpdir(), 'agy-call-'))
  const fullPrompt = withDocs(prompt, docs, repoRoot)
  // Windows CreateProcess의 명령행 길이 제한을 넘는 배치 입력은 임시 파일로 건넨다.
  // agy가 격리된 작업 폴더 안의 파일을 직접 읽게 해 긴 JSON을 argv에 싣지 않는다.
  let promptArgument = fullPrompt
  if (Buffer.byteLength(fullPrompt, 'utf8') > 20_000) {
    const promptPath = resolve(work, 'prompt.txt')
    writeFileSync(promptPath, fullPrompt, 'utf8')
    promptArgument = [
      `Read the complete UTF-8 instruction file at ${promptPath.replace(/\\/g, '/')}.`,
      'Follow it exactly and return only the response format requested in that file.',
    ].join(' ')
  }
  // agy 자체 대기 한도(--print-timeout)는 기본 5분이다. 조사처럼 긴 호출은 여기서 잘리므로
  // 헬퍼의 timeoutMs를 그대로 넘겨 두 한도를 맞춘다.
  const args = [
    '-p', promptArgument,
    '--dangerously-skip-permissions',
    '--model', model,
    '--print-timeout', `${Math.max(1, Math.ceil(timeoutMs / 60_000))}m`,
  ]

  return new Promise((resolveCall, rejectCall) => {
    const child = spawn(AGY_BIN, args, { cwd: work })
    let out = ''
    let err = ''
    let settled = false
    const finish = (callback) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cleanup(work)
      callback()
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(() => rejectCall(new Error(`agy 시간 초과 (${Math.round(timeoutMs / 60000)}분)`)))
    }, timeoutMs)

    child.stdout.on('data', (data) => { out += data.toString() })
    child.stderr.on('data', (data) => { err += data.toString() })
    child.on('error', (error) => finish(() => rejectCall(error)))
    child.on('close', (code) => finish(() => {
      if (code !== 0) {
        rejectCall(new Error(`agy exit ${code}: ${(err || out).slice(0, 500)}`))
        return
      }
      const text = out.trim()
      if (!text) {
        rejectCall(new Error(`agy 빈 응답: ${err.slice(0, 300)}`))
        return
      }
      resolveCall(text)
    }))
  })
}

export const looksQuotaLimited = (message = '') => (
  /quota|rate.?limit|429|resets? in/i.test(message)
)

function withDocs(prompt, docs, repoRoot) {
  if (docs.length === 0) return prompt
  const paths = docs.map((doc) => (isAbsolute(doc) ? doc : resolve(repoRoot, doc)))
  return [
    '시작하기 전에 다음 파일을 반드시 읽고 그 규칙을 그대로 따른다.',
    ...paths.map((path) => `- ${path}`),
    '',
    prompt,
  ].join('\n')
}

function cleanup(directory) {
  try { rmSync(directory, { recursive: true, force: true }) } catch { /* 무해 */ }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const prompt = process.argv.slice(2).join(' ') || '연결 확인. "ok"만 출력하라.'
  agyCall(prompt)
    .then((text) => console.log(text))
    .catch((error) => { console.error(error.message); process.exit(1) })
}
