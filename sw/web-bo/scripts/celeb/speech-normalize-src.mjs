/**
 * 대사 산출물의 quote_src 를 순수 URL 로 정규화한다.
 *
 * GPT 가 출전 설명과 마크다운 링크를 섞어 넣는다 —
 *   [『대월사기전서』 외기 권1 「촉기·안양왕」](https://zh.wikisource.org/...)
 * 검사(validateSpeechResearch)는 sourceUrl 에 URL 하나만 받으므로 여기서 뽑아낸다.
 * 버려지는 출전 설명은 inspected 의 finding 에 이미 남아 있다.
 *
 * 실행 (sw/web-bo 에서): node scripts/celeb/speech-normalize-src.mjs [--dry]
 */

import path from 'node:path'
import fs from 'node:fs'

const DIR = path.resolve(process.cwd(), '../../data/celeb/gap-fill/speech')
const DRY = process.argv.includes('--dry')

const isUrl = (s) => { try { new URL(String(s).trim()); return true } catch { return false } }

/** 마크다운 링크 → 괄호 안 URL, 아니면 문자열 안의 첫 http URL */
function extractUrl(raw) {
  const s = String(raw)
  const md = s.match(/\]\((https?:\/\/[^\s)]+)\)/)
  if (md) return md[1]
  const bare = s.match(/https?:\/\/[^\s)\]]+/)
  return bare ? bare[0] : null
}

let fixed = 0, failed = 0, ok = 0
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
  const p = path.join(DIR, f)
  const o = JSON.parse(fs.readFileSync(p, 'utf8'))
  if (!o.quote_src) { ok++; continue }
  if (isUrl(o.quote_src)) { ok++; continue }

  const url = extractUrl(o.quote_src)
  if (!url) { failed++; console.log(`FAIL ${o.slug} — URL 을 뽑지 못했다: ${String(o.quote_src).slice(0, 80)}`); continue }
  console.log(`${o.slug}\n  before: ${String(o.quote_src).slice(0, 90)}\n  after : ${url}`)
  if (!DRY) {
    o.quote_src = url
    fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8')
  }
  fixed++
}
console.log(`\n${DRY ? '(dry) ' : ''}정규화 ${fixed}건 · 원래 정상 ${ok}건 · 실패 ${failed}건`)
