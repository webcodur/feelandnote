/**
 * grok 1회 호출 헬퍼.
 *
 *   import { grokCall, grokJson } from '<skill>/scripts/grok-call.mjs'
 *   const { data } = await grokJson('프롬프트', SCHEMA, { docs: ['docs/.../rules.md'] })
 *
 * 설계 근거(실측):
 *   - `grok`은 .cmd 배치 래퍼라 셸을 거치면 --json-schema의 큰따옴표가 깨진다
 *     (`invalid JSON: key must be a string`). node.exe로 bin을 직접 실행해 셸 재해석을 없앤다.
 *   - spawnSync는 이벤트 루프를 막아 병렬을 무력화한다 → 비동기 spawn.
 *   - 프롬프트는 --prompt-file로 넣는다 → 긴 한국어가 이스케이프에서 깨지지 않는다.
 *   - cwd를 저장소 루트로 주면 그록이 조사 중 만든 헬퍼 스크립트가 루트에 쌓인다.
 *     전용 작업 폴더를 cwd로 주고, 문서는 절대경로로 넘긴다.
 */

import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, isAbsolute } from 'node:path'

/** npm 전역 설치 기준 bin 경로. 다른 곳에 깔렸으면 GROK_BIN 환경변수로 덮는다. */
const GROK_BIN = process.env.GROK_BIN
  ?? resolve('C:/Program Files/nodejs/node_modules/@xai-official/grok/bin/grok')

/** 기본 15분. 검증처럼 여러 턴을 도는 호출은 5분을 넘기는 일이 흔하다. */
const DEFAULT_TIMEOUT_MS = 900_000

/**
 * @param {string} prompt
 * @param {object} [opts]
 * @param {object} [opts.schema]      JSON 스키마. 주면 structuredOutput으로 받는다.
 * @param {string} [opts.effort]      low|medium|high. 기본 high.
 * @param {string[]} [opts.docs]      먼저 읽힐 문서 경로. 저장소 상대경로도 받는다.
 * @param {string} [opts.repoRoot]    docs 상대경로 해석 기준. 기본 process.cwd().
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<{raw:object, data:any, text:string, turns:number, costUsd:number}>}
 */
export function grokCall(prompt, opts = {}) {
  const {
    schema, effort = 'high', docs = [],
    repoRoot = process.cwd(), timeoutMs = DEFAULT_TIMEOUT_MS,
  } = opts

  // 그록이 만드는 부산물이 저장소를 어지르지 않도록 전용 폴더에서 돌린다.
  const work = mkdtempSync(resolve(tmpdir(), 'grok-call-'))
  const promptFile = resolve(work, 'prompt.txt')
  writeFileSync(promptFile, withDocs(prompt, docs, repoRoot), 'utf8')

  // --json-schema는 --output-format json을 함축한다. 스키마가 없을 때는 직접 지정해야
  // usage·num_turns가 담긴 같은 봉투로 받는다. 지정하지 않으면 맨 텍스트가 나와 파싱이 깨진다.
  const args = [GROK_BIN, '--prompt-file', promptFile, '--always-approve',
    '--reasoning-effort', effort]
  if (schema) args.push('--json-schema', JSON.stringify(schema))
  else args.push('--output-format', 'json')

  return new Promise((res, rej) => {
    const child = spawn(process.execPath, args, { cwd: work })
    let out = '', err = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      rej(new Error(`grok 시간 초과 (${Math.round(timeoutMs / 60000)}분)`))
    }, timeoutMs)
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('error', (e) => { clearTimeout(timer); cleanup(work); rej(e) })
    child.on('close', (code) => {
      clearTimeout(timer); cleanup(work)
      if (code !== 0) return rej(new Error(`grok exit ${code}: ${err.slice(0, 300)}`))
      let raw
      try { raw = JSON.parse(out) } catch { return rej(new Error(`출력 파싱 실패: ${out.slice(0, 200)}`)) }
      res({
        raw,
        data: raw.structuredOutput ?? null,
        text: raw.text ?? '',
        turns: raw.num_turns ?? 0,
        costUsd: raw.total_cost_usd ?? 0,
      })
    })
  })
}

/** 스키마 필수 버전. 구조화 출력만 쓸 때 쓴다. */
export async function grokJson(prompt, schema, opts = {}) {
  return grokCall(prompt, { ...opts, schema })
}

/** 프로세스 자원 고갈 신호. 이게 뜨면 회차를 끊고 부모를 새로 띄워야 한다. */
export const looksExhausted = (msg = '') => /3221225794|DLL_INIT_FAILED/i.test(msg)

/** effort에 맞는 안전한 묶음 크기. high에서 크게 잡으면 배열이 1개만 돌아온다. */
export const safeBatchSize = (effort = 'high') => (effort === 'high' ? 15 : 50)

function withDocs(prompt, docs, repoRoot) {
  if (docs.length === 0) return prompt
  const paths = docs.map((d) => (isAbsolute(d) ? d : resolve(repoRoot, d)))
  return [
    '시작하기 전에 다음 파일을 반드시 읽고 그 규칙을 그대로 따른다.',
    ...paths.map((p) => `- ${p}`),
    '',
    prompt,
  ].join('\n')
}

function cleanup(dir) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* 지워지지 않아도 무해하다 */ }
}

// 직접 실행하면 연결 확인용 1회 호출을 한다.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const prompt = process.argv.slice(2).join(' ') || '연결 확인. "ok"만 출력하라.'
  grokCall(prompt, { effort: 'low' })
    .then((r) => console.log(r.text || JSON.stringify(r.data)))
    .catch((e) => { console.error(e.message); process.exit(1) })
}
