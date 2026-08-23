// opencode CLI로 muse-spark를 호출하는 헬퍼.
// 빈 출력 재시도와 리드 문장 제거를 포함한다. 규약을 다시 짜지 말고 이걸 쓴다.
import { spawn } from 'node:child_process'
import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EXE = 'C:/Program Files/nodejs/node_modules/opencode-ai/bin/opencode.exe'
export const MUSE_FREE = 'opencode/muse-spark-1.2-contributor-free'
export const MUSE_GO = 'opencode-go/muse-spark-1.2-contributor'

// 모델이 본문 앞에 흘리는 진행 보고. 실측 사례 기반.
const META = /(독백|초안|본문)[^\n]{0,40}(작성|구성|시작|준비|쓰겠|쓴다)|(생애|이력|기록|연보|사실|입장|정보|자료)[^\n]{0,40}(확인|검증|조사|정리)|먼저 (검증|조사|확인)/
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g')
const BANNER = /^\s*>\s*build\s*\u00b7[^\n]*\n?/

function stripLead(text) {
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i++; continue }
    if (line.length <= 60 && META.test(line)) { i++; continue }
    break
  }
  return lines.slice(i).join('\n').trim()
}

function runOnce(prompt, { model, dir, timeoutMs }) {
  return new Promise((resolve) => {
    const args = ['run', '--dir', dir, '-m', model, prompt]
    // stdin을 ignore로 닫는다. pipe로 두면 opencode가 입력을 기다리며 끝나지 않는다.
    const child = spawn(EXE, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('close', (code) => {
      clearTimeout(timer)
      const body = out.replace(ANSI, '').replace(BANNER, '')
      resolve({ code, text: stripLead(body), raw: out, err })
    })
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ code: -1, text: '', raw: '', err: String(e) })
    })
  })
}

/**
 * muse-spark를 한 번 호출한다. 빈 출력이면 재시도한다.
 * @param {string} prompt 프롬프트 전문
 * @param {{model?:string, dir?:string, timeoutMs?:number, retries?:number, minChars?:number}} opts
 * @returns {Promise<{code:number, text:string, raw:string, err:string, attempts:number}>}
 */
export async function museCall(prompt, opts = {}) {
  const {
    model = MUSE_FREE,
    dir = mkdtempSync(join(tmpdir(), 'muse-')),
    timeoutMs = 300000,
    retries = 3,
    minChars = 100,
  } = opts
  if (!existsSync(EXE)) throw new Error('opencode.exe 없음: ' + EXE)
  let last = null
  for (let attempt = 1; attempt <= retries; attempt++) {
    last = await runOnce(prompt, { model, dir, timeoutMs })
    if (last.text.length >= minChars) return { ...last, attempts: attempt }
  }
  return { ...last, attempts: retries }
}

/** 동시 실행 수를 제한해 배치를 돌린다. 실측에서 20까지 실패 없이 돌았고 12~20에서 포화된다. */
export async function museBatch(items, buildPrompt, opts = {}) {
  const { concurrency = 16, onDone = null, ...callOpts } = opts
  const results = new Array(items.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++
      const r = await museCall(buildPrompt(items[i], i), callOpts)
      results[i] = r
      if (onDone) onDone(items[i], r, i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

// 직접 실행하면 연결만 확인한다.
const invoked = process.argv[1] || ''
if (invoked.split('\\').join('/').endsWith('muse-call.mjs')) {
  const p = process.argv.slice(2).join(' ') || '3 곱하기 7은? 숫자만 답하라.'
  const r = await museCall(p)
  console.log(r.text || '[빈 출력] exit=' + r.code + '\n' + r.err.slice(0, 400))
}
