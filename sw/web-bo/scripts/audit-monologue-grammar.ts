/**
 * 가상 독백 문장 검수기 — 비문·호응 오류만 잡아 그 문장만 갈아 끼운다.
 *
 * [무엇을 하는가]
 *   profiles.virtual_monologue(국문) / virtual_monologue_en(영문)에서 **문법적으로 틀린 문장**만 찾아
 *   해당 문장 하나만 교체한다. 글의 구성·어조·어휘 선택·문단 배치는 건드리지 않는다.
 *
 * [왜 문장 단위 치환인가]
 *   전문 재생성으로 고치면 고칠 필요 없던 부분까지 바뀌어 형식이 매번 새로 뒤틀린다.
 *   실측(2026-07-21): 발주서 개정으로 옛 균질성을 걷어냈더니 새 균질성이 들어섰다
 *   (81% 명제 오프닝 → 26% 딱지 되받기 오프닝). 그래서 이 스크립트는 형식을 개선하지 않는다.
 *   **틀린 것만 고치고 나머지는 한 글자도 손대지 않는다.**
 *
 * [잡는 것]  주어-서술어 호응 파탄 · 목적어 누락으로 뜻이 깨진 문장 · 조사 오용으로 성립 안 되는 문장 ·
 *            수식어가 걸릴 곳이 없는 문장 · 시제 충돌 · 중복 문단 · 작업 문구 혼입(영문).
 * [안 잡는 것] 사물 주어 · 번역투 · 종결 어미 편중 · 상투 표현 · 문단 구성 · 도입부 틀 ·
 *            어휘 취향 · 분량. 전부 문체 영역이라 손대면 형식이 흔들린다.
 *
 * [엔진]  국문은 codex(gpt-5.6-sol) — 한국어 작문·교정은 GPT가 낫다는 실측.
 *         영문은 claude(sonnet).
 *
 * [안전장치]
 *   - 교체 대상 문장이 원문에 정확히 1회 존재할 때만 치환한다. 0회·2회 이상이면 건너뛰고 로그에 남긴다.
 *   - 편당 교체 상한(기본 6문장). 넘으면 전량 거부 — 재작성 시도로 본다.
 *   - 교체 후 글자 수가 원문의 80~125% 밖이면 거부.
 *   - --dry 면 DB를 쓰지 않고 보고서만 낸다.
 *
 * [명령]  sw/web-bo 에서
 *   node --env-file=.env --import tsx scripts/audit-monologue-grammar.ts --lang ko --limit 20 --dry
 *   node --env-file=.env --import tsx scripts/audit-monologue-grammar.ts --lang ko
 *   node --env-file=.env --import tsx scripts/audit-monologue-grammar.ts --lang en --resume
 *   node --env-file=.env --import tsx scripts/audit-monologue-grammar.ts --lang ko --slugs gojong,marilyn-monroe
 */

import { createClient } from '@supabase/supabase-js'
import { spawn, execSync } from 'child_process'
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const argNum = (flag: string, def: number) => {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : def
}
const argStr = (flag: string, def: string) => {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : def
}

const LANG = argStr('--lang', 'ko') as 'ko' | 'en'
const LIMIT = argNum('--limit', Infinity)
const CONCURRENCY = argNum('--conc', 4)
const MAX_FIXES = argNum('--max-fixes', 6)
const DRY = process.argv.includes('--dry')
const RESUME = process.argv.includes('--resume')
const SLUGS = (() => {
  const i = process.argv.indexOf('--slugs')
  return i >= 0 ? new Set(process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean)) : null
})()

/**
 * 국문 기본 엔진은 codex(gpt-5.6-sol)다 — 한국어는 GPT가 낫다는 실측.
 * 다만 그 실측은 **작문** 기준이고 이 작업은 비문 탐지라 성격이 다르다.
 * codex 사용량이 소진되면 `--engine claude` 로 갈아탄다.
 */
const ENGINE = argStr('--engine', LANG === 'ko' ? 'codex' : 'claude') as 'codex' | 'claude'
/** claude 엔진의 모델. 비문 판별은 규칙을 길게 적어 보완할 일이 아니라 모델 성능으로 끝낼 일이다. */
const CLAUDE_MODEL = argStr('--model', 'opus')
const COL = LANG === 'ko' ? 'virtual_monologue' : 'virtual_monologue_en'
const TMP = resolve(process.cwd(), `.tmp-audit-${LANG}`)
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true })
const DONE_LOG = resolve(TMP, 'done.log')
const REPORT = resolve(TMP, 'report.jsonl')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── 프롬프트 ─────────────────────────────────────────────
const KO_PROMPT = (name: string, text: string) => `아래는 서비스에 실려 있는 ${name}의 1인칭 독백이다. 문법적으로 성립하지 않는 문장만 찾아 고쳐라.

[본문]
${text}

성립하지 않는다는 것은 국어 문장으로 틀렸다는 뜻이다. 주술이 어긋났거나, 필수 성분이 빠졌거나, 조사가 잘못 걸렸거나, 수식이 어디에 붙는지 알 수 없거나, 문장 도중 주어가 바뀌어 뜻이 끊기거나, 시제가 충돌하는 경우다. 같은 내용이 두 번 나오는 문단도 잡는다.

문체는 건드리지 마라. 사물 주어, 번역투, 반복되는 종결 어미, 상투적 표현, 문단 구성, 도입과 마무리 방식, 어휘 취향, 분량 — 전부 이 글의 규격이 정한 바다. 틀리지 않은 문장은 한 글자도 바꾸지 않는다. 고칠 때도 틀린 자리만 최소로 손댄다. 더 좋게 만들지 말고 성립하게만 만들어라.

JSON만 출력한다.
{"fixes":[{"before":"원문에 있는 그대로의 문장","after":"고친 문장","reason":"무엇이 틀렸는지 한 줄"}]}
before 는 문장 부호까지 원문과 똑같아야 반영된다. 고칠 것이 없으면 {"fixes":[]}. 멀쩡한 글에서 트집을 잡는 쪽이 틀린 문장을 놓치는 쪽보다 나쁘다.`

const EN_PROMPT = (name: string, text: string) => `Below is a first-person monologue for ${name}, published on a live service. Find **only the sentences that are grammatically broken** and fix them.

[Text]
${text}

Broken means ungrammatical: a subject that cannot perform its verb, a missing required element, a dangling modifier, a subject that shifts mid-clause and breaks the logic, colliding tenses. Also catch duplicated paragraphs, and any text that talks about the writing task instead of the speaker's life ("Let me finalize the full piece", "Here is the monologue", a speaker-name label like "Name: ...") — remove that entirely.

Leave the writing alone otherwise. Voice, register, word choice, rhythm, paragraph structure, how it opens and closes, length, phrasing repeated across the piece — all set by the spec, none of it your concern here. Every sentence that is not broken stays exactly as it is. Fix minimally: repair the break, leave the surrounding wording and order untouched. Do not improve. Make it grammatical, nothing more.

JSON only, no preamble.
{"fixes":[{"before":"the exact sentence as it appears in the text","after":"the corrected sentence","reason":"one line on what was broken"}]}
- "before" must match the text character for character, punctuation included, or it will be discarded.
- If nothing is broken, output {"fixes":[]}. Do not invent problems. Flagging a sound sentence is worse than missing a broken one.`

// ── 엔진 호출 ────────────────────────────────────────────
const binCache: Record<string, string> = {}
function whichBin(name: string): string {
  if (binCache[name]) return binCache[name]
  try {
    const found = execSync(process.platform === 'win32' ? `where ${name}` : `which ${name}`, { encoding: 'utf-8' })
      .split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    const bin = found.find((p) => p.toLowerCase().endsWith('.cmd')) || found[0] || name
    binCache[name] = /\s/.test(bin) ? `"${bin}"` : bin
  } catch {
    binCache[name] = name
  }
  return binCache[name]
}

function runCodex(prompt: string, outFile: string): Promise<string> {
  return new Promise((res, rej) => {
    // cwd 를 임시 폴더로 둔다. 저장소 안에서 돌리면 codex 가 프로젝트 스킬을 읽다 죽는다
    // (.agents/skills/win-lock-bypass-editor 로드 실패 → exit 1). 이 작업은 파일 접근이 없어 무해하다.
    const ch = spawn(whichBin('codex'),
      ['exec', '-', '-m', 'gpt-5.6-sol', '--output-last-message', outFile, '--color', 'never'],
      { shell: true, timeout: 300000, cwd: TMP })
    let err = ''
    ch.stderr.on('data', (d) => { err += d.toString() })
    ch.on('error', rej)
    ch.on('close', (code) => (code === 0 ? res(readFileSync(outFile, 'utf-8')) : rej(new Error(`codex exit ${code}: ${err.slice(0, 200)}`))))
    ch.stdin.write(prompt)
    ch.stdin.end()
  })
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((res, rej) => {
    const ch = spawn(whichBin('claude'), ['-p', '--model', CLAUDE_MODEL, '--output-format', 'text'],
      { shell: true, timeout: 300000 })
    let out = '', err = ''
    ch.stdout.on('data', (d) => { out += d.toString() })
    ch.stderr.on('data', (d) => { err += d.toString() })
    ch.on('error', rej)
    ch.on('close', (code) => (code === 0 ? res(out) : rej(new Error(`claude exit ${code}: ${err.slice(0, 200)}`))))
    ch.stdin.write(prompt)
    ch.stdin.end()
  })
}

type Fix = { before: string; after: string; reason: string }

/** 모델이 코드펜스나 잡문을 섞어 보내도 JSON 본체만 건져낸다. */
function parseFixes(raw: string): Fix[] {
  const m = raw.match(/\{[\s\S]*"fixes"[\s\S]*\}/)
  if (!m) throw new Error('JSON 없음')
  const parsed = JSON.parse(m[0]) as { fixes?: Fix[] }
  if (!Array.isArray(parsed.fixes)) throw new Error('fixes 배열 없음')
  return parsed.fixes.filter((f) => f && typeof f.before === 'string' && typeof f.after === 'string' && f.before !== f.after)
}

type Applied = { applied: Fix[]; skipped: (Fix & { why: string })[]; text: string }

/** before 가 본문에 정확히 1회 있을 때만 치환한다. 애매하면 건드리지 않는다. */
function applyFixes(text: string, fixes: Fix[]): Applied {
  const applied: Fix[] = []
  const skipped: (Fix & { why: string })[] = []
  let out = text
  for (const f of fixes) {
    const count = out.split(f.before).length - 1
    if (count === 0) { skipped.push({ ...f, why: '원문에서 못 찾음' }); continue }
    if (count > 1) { skipped.push({ ...f, why: `${count}곳에 중복` }); continue }
    out = out.replace(f.before, f.after)
    applied.push(f)
  }
  return { applied, skipped, text: out }
}

type Row = { slug: string; nickname: string; text: string | null }

async function loadAll(): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`slug, nickname, ${COL}`)
      .eq('profile_type', 'CELEB')
      .order('slug')
      .range(from, from + 999)
    if (error) throw error
    const chunk = (data ?? []) as unknown as Record<string, string | null>[]
    rows.push(...chunk.map((r) => ({ slug: r.slug as string, nickname: r.nickname as string, text: r[COL] })))
    if (chunk.length < 1000) break
  }
  return rows
}

async function audit(r: Row): Promise<{ applied: Fix[]; skipped: (Fix & { why: string })[]; changed: boolean }> {
  const text = r.text!
  const prompt = LANG === 'ko' ? KO_PROMPT(r.nickname, text) : EN_PROMPT(r.nickname, text)
  const outFile = resolve(TMP, `out-${r.slug.replace(/[^a-z0-9-]/gi, '_')}.txt`)
  const raw = ENGINE === 'codex' ? await runCodex(prompt, outFile) : await runClaude(prompt)
  const fixes = parseFixes(raw)

  if (fixes.length === 0) return { applied: [], skipped: [], changed: false }
  if (fixes.length > MAX_FIXES) throw new Error(`교체 ${fixes.length}건 — 상한 ${MAX_FIXES} 초과. 재작성 시도로 보고 전량 거부`)

  const { applied, skipped, text: next } = applyFixes(text, fixes)
  if (applied.length === 0) return { applied: [], skipped, changed: false }

  const ratio = next.length / text.length
  if (ratio < 0.8 || ratio > 1.25) throw new Error(`분량 ${Math.round(ratio * 100)}% — 거부`)

  if (!DRY) {
    const { error } = await supabase.from('profiles').update({ [COL]: next }).eq('slug', r.slug)
    if (error) throw error
  }
  return { applied, skipped, changed: true }
}

async function run() {
  const all = await loadAll()
  let targets = all.filter((r) => r.text?.trim() && (!SLUGS || SLUGS.has(r.slug)))

  if (RESUME && existsSync(DONE_LOG)) {
    const done = new Set(readFileSync(DONE_LOG, 'utf-8').split('\n').map((s) => s.trim()).filter(Boolean))
    const before = targets.length
    targets = targets.filter((r) => !done.has(r.slug))
    console.log(`이어서 처리: 이미 끝낸 ${before - targets.length}명 건너뜀`)
  } else if (!RESUME) {
    writeFileSync(DONE_LOG, '')
    writeFileSync(REPORT, '')
  }
  if (LIMIT !== Infinity) targets = targets.slice(0, LIMIT)

  console.log(`언어 ${LANG} | 엔진 ${ENGINE} | 대상 ${targets.length} | 동시 ${CONCURRENCY} | 편당 상한 ${MAX_FIXES}문장${DRY ? ' | 시험 실행(DB 미반영)' : ''}`)

  let done = 0, fixedDocs = 0, fixedSents = 0, clean = 0, fail = 0, skippedTotal = 0
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (r) => {
      try {
        const { applied, skipped, changed } = await audit(r)
        appendFileSync(REPORT, JSON.stringify({ slug: r.slug, nickname: r.nickname, applied, skipped }) + '\n')
        appendFileSync(DONE_LOG, `${r.slug}\n`)
        skippedTotal += skipped.length
        if (changed) {
          fixedDocs++; fixedSents += applied.length
          console.log(`✎ ${r.nickname} — ${applied.length}문장`)
          for (const f of applied) console.log(`    · ${f.reason}\n      ${f.before}\n      → ${f.after}`)
        } else {
          clean++
        }
      } catch (e) {
        fail++
        console.error(`✗ ${r.nickname}: ${((e as Error).message || '').slice(0, 160)}`)
      } finally {
        done++
      }
    }))
    console.log(`  진행 ${done}/${targets.length} (수정 ${fixedDocs}편 ${fixedSents}문장 / 이상없음 ${clean} / 실패 ${fail})`)
  }

  console.log(`\n완료. 수정 ${fixedDocs}편 ${fixedSents}문장 / 이상없음 ${clean} / 실패 ${fail}${skippedTotal ? ` / 대조 실패로 건너뛴 교체 ${skippedTotal}` : ''}`)
  console.log(`보고서: ${REPORT}`)
  if (fail > 0) console.log('※ --resume 으로 재실행하면 못 끝낸 인물만 이어서 처리한다.')
}

run().catch((e) => { console.error(e); process.exit(1) })
