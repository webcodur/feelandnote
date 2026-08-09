/**
 * 승인된 한국어 가상 독백의 영문 후보 생성기.
 * 규칙 SSoT: docs/project/celeb/virtual-monologue.md
 *
 * 생성 결과는 .tmp-mono-en/candidates.jsonl에만 저장한다.
 * 승인한 JSONL은 --apply-file로 원문 해시를 대조한 뒤 반영한다.
 * 생성에는 --slugs 또는 유한한 --limit이 필수다.
 */

import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { spawn, execSync } from 'child_process'
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

// ── .env 로드 ──
function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const arg = (flag: string, def: number) => {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : def
}
const LIMIT = arg('--limit', Infinity)
const CONCURRENCY = arg('--conc', 6)
const NO_FORCE = process.argv.includes('--no-force')
const RESUME = process.argv.includes('--resume')
const APPLY_FILE = (() => {
  const i = process.argv.indexOf('--apply-file')
  return i >= 0 ? process.argv[i + 1] : null
})()
/** 특정 인물만 골라 다시 뽑는다. 예: --slugs yi-sun-sin,abraham-lincoln */
const SLUGS = (() => {
  const i = process.argv.indexOf('--slugs')
  return i >= 0 ? new Set(process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean)) : null
})()

const MODEL = 'sonnet'
const TMP = resolve(process.cwd(), '.tmp-mono-en')
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true })
const DONE_LOG = resolve(TMP, 'done.log')
const CANDIDATES_LOG = resolve(TMP, 'candidates.jsonl')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const hasHangul = (s: string) => /[가-힣]/.test(s)
const hasHanzi = (s: string) => /[一-鿿]/.test(s)
const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

type Material = { name: string; era: string; ko: string; fiction: boolean }

function buildPrompt(m: Material): string {
  return `Below is a first-person monologue written in Korean. The speaker is ${m.name}${m.era ? ` (${m.era})` : ''}, ${m.fiction ? 'a figure from myth, legend or fiction' : 'a real historical or public figure'} reflecting alone on their own life and beliefs.

Rewrite it as an English monologue.

[Korean original]
${m.ko}

[How to work]
This is not a translation. It is the same monologue written again, in English, by the same person.

What must survive: every fact, every name, every date, every claim about what this person did and believed, and the emotional weight of each. What must not survive: the Korean sentence boundaries, the paragraph divisions, the order in which things were said. Korean and English carry a thought in different shapes. A Korean paragraph that circles a point before landing it may need to land first in English and fill in after. Two Korean paragraphs may belong in one English paragraph, or one may need to become three. The order of episodes in a life can be rearranged if English prose wants it that way, so long as nothing becomes false.

Judge the result only as English prose. Would a reader who has never seen the Korean take this for something written in English from the start? If any sentence still carries the shape of its Korean original, it has failed even when the words are correct.

Where the Korean reaches for an older or more formal register (a classical aphorism, a royal edict, a warrior's oath, a line of verse), do not flatten it into plain modern English. Find the English register of the same weight and let the compression, the parallelism and the cadence carry over as form, not as explanation.

Keep the speaking voice. This is someone talking to themselves, not addressing an audience, not lecturing, not delivering a speech. It never turns to the reader, never instructs, never closes on a moral or a call to action. It ends on the speaker's own story.

The Korean original may use polite endings or plain endings. English has no such distinction — do not simulate it with archaic or stilted phrasing. Register comes from word choice and rhythm instead: a blunt commander sounds blunt, a careful scholar sounds careful.

If this person actually spoke or wrote in English, or if a phrase in the original is a known quotation of theirs, restore the wording they are known by rather than back-translating the Korean.

Breathing matters. Vary sentence length. A person who moved fast writes short and pushes forward; a person who sat with a thought lets the sentence run.

Use plain spoken English. No academic register, no words that only appear in writing, unless this person genuinely used such language in their own field.

Do not invent facts, dates, names or events that are not in the Korean original. Do not drop any that are there.

The opening is yours to choose. Many of these monologues begin in Korean by taking up a label other people have pinned on the speaker. That is one way in, not the way in, and it wears thin when every life opens the same door. Begin wherever this particular person's English would begin, so long as the first paragraph makes plain who is speaking and what they did.

[Output rules]
- Output the English monologue only. No preamble, no title, no quotation marks around it, no commentary. Never announce what you are about to write; the first words are the first words of the monologue itself.
- Break paragraphs wherever English prose wants them. The count need not match the original.
- Never use an em dash (—). Use a comma, a period or a semicolon instead.
- No Korean characters, no Chinese characters in the output.
- Refer to the speaker by the name "${m.name}" if a name is needed.`
}

// claude 실행파일 절대경로 해석(.cmd 우선). PATH 의존 시 동시 실행에서 spawn 실패가 산발한다.
let CLAUDE_BIN: string | null = null
function claudeBin(): string {
  if (CLAUDE_BIN) return CLAUDE_BIN
  try {
    const found = execSync(process.platform === 'win32' ? 'where claude' : 'which claude', { encoding: 'utf-8' })
      .split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    const bin = found.find((p) => p.toLowerCase().endsWith('.cmd')) || found[0] || 'claude'
    CLAUDE_BIN = /\s/.test(bin) ? `"${bin}"` : bin
  } catch {
    CLAUDE_BIN = 'claude'
  }
  return CLAUDE_BIN
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((res, rej) => {
    const ch = spawn(claudeBin(), ['-p', '--model', MODEL, '--output-format', 'text'],
      { shell: true, timeout: 300000 })
    let out = '', err = ''
    ch.stdout.on('data', (d) => { out += d.toString() })
    ch.stderr.on('data', (d) => { err += d.toString() })
    ch.on('error', rej)
    ch.on('close', (code) => (code === 0 ? res(out) : rej(new Error(`claude exit ${code}: ${err.slice(0, 300)}`))))
    ch.stdin.write(prompt)
    ch.stdin.end()
  })
}

/**
 * 본문이 아니라 작업 자체를 말하는 문구. 첫 줄만 검사했더니 본문 중간·끝에 박힌 것을 놓쳐
 * 20편이 서비스에 그대로 나갔다("Let me finalize the full piece and present the complete monologue.").
 * 전문에서 찾는다.
 */
const META_LEAK = /\b(let me (write|finalize|present|give|do|now)|i'?ll (write|finalize|present|give|do|keep|stay|shift|render)\b(?![^.]*\b(my|the) (life|work|name|story)\b)|per (the )?instructions|the (complete|full) monologue|here is the (monologue|piece|rewritten|english)|as requested|i will now (write|present))/i
/** 화자 표기("Egon Schiele: people usually...")로 시작한 응답. */
const SPEAKER_TAG = /^[A-Z][A-Za-z.'-]+(?: [A-Z][A-Za-z.'-]+){0,3}:\s/

async function translate(m: Material): Promise<string> {
  const text = (await runClaude(buildPrompt(m))).trim()
  if (!text) throw new Error('빈 응답')
  const leak = text.match(META_LEAK)
  if (leak) throw new Error(`작업 문구 혼입: ${leak[0]}`)
  if (SPEAKER_TAG.test(text.split('\n')[0])) throw new Error(`화자 표기: ${text.slice(0, 60)}`)
  if (hasHangul(text)) throw new Error('한글 잔존')
  if (hasHanzi(text)) throw new Error('한자 혼입')
  return text.replace(/—/g, ', ')
}

type Row = {
  slug: string; nickname: string; nickname_en: string | null
  birth_date: string | null; death_date: string | null
  publication_status: string | null; celeb_tier: string | null
  virtual_monologue: string | null; virtual_monologue_en: string | null
}

type Candidate = {
  slug: string
  nickname: string
  currentKoHash: string
  currentEnHash: string
  candidateText: string
  candidateHash: string
  status: 'draft' | 'approved'
}

async function loadAll(): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('celebs')
      .select('slug, nickname, nickname_en, birth_date, death_date, publication_status, celeb_tier, virtual_monologue, virtual_monologue_en')
      .order('slug')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

const materialOf = (r: Row): Material => ({
  name: r.nickname_en || r.nickname,
  era: [r.birth_date, r.death_date].filter(Boolean).join(' ~ '),
  ko: r.virtual_monologue!,
  fiction: r.celeb_tier === 'fiction',
})

async function applyCandidates(file: string) {
  const records = readFileSync(resolve(process.cwd(), file), 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line) as Candidate)
    .filter(record => !SLUGS || SLUGS.has(record.slug))
  if (!records.length) throw new Error('적용할 후보가 없습니다.')

  let updated = 0
  let skipped = 0
  for (const record of records) {
    if (record.status !== 'approved') throw new Error(`${record.slug}: status=approved가 아닙니다.`)
    if (!record.candidateText?.trim() || sha256(record.candidateText) !== record.candidateHash) {
      throw new Error(`${record.slug}: 후보 본문 해시가 맞지 않습니다.`)
    }
    if (hasHangul(record.candidateText) || hasHanzi(record.candidateText)
      || record.candidateText.includes('—')) {
      throw new Error(`${record.slug}: 후보 본문이 영문 형식 규칙을 통과하지 못했습니다.`)
    }
    const { data: row, error: readError } = await supabase
      .from('celebs')
      .select('virtual_monologue,virtual_monologue_en')
      .eq('slug', record.slug)
      .single()
    if (readError) throw readError
    if (sha256(row.virtual_monologue ?? '') !== record.currentKoHash
      || sha256(row.virtual_monologue_en ?? '') !== record.currentEnHash) {
      throw new Error(`${record.slug}: 후보 생성 뒤 DB 원문이 바뀌었습니다.`)
    }
    if ((row.virtual_monologue_en ?? '') === record.candidateText) {
      skipped++
      console.log(`SKIP ${record.slug}`)
      continue
    }
    const { error: updateError } = await supabase
      .from('celebs')
      .update({ virtual_monologue_en: record.candidateText })
      .eq('slug', record.slug)
    if (updateError) throw updateError
    updated++
    console.log(`UPDATED ${record.slug}`)
  }
  console.log(JSON.stringify({ total: records.length, updated, skipped }))
}

async function run() {
  if (APPLY_FILE) {
    await applyCandidates(APPLY_FILE)
    return
  }
  if (!SLUGS && LIMIT === Infinity) {
    throw new Error('안전 중단: --slugs 또는 유한한 --limit을 지정해야 합니다.')
  }
  const all = await loadAll()
  let targets = all.filter((r) => r.virtual_monologue?.trim()
    && (!!SLUGS || r.publication_status === 'active')
    && (!SLUGS || SLUGS.has(r.slug))
    && (!NO_FORCE || !r.virtual_monologue_en))

  if (RESUME && existsSync(DONE_LOG)) {
    const done = new Set(readFileSync(DONE_LOG, 'utf-8').split('\n').map((s) => s.trim()).filter(Boolean))
    const before = targets.length
    targets = targets.filter((r) => !done.has(r.slug))
    console.log(`이어서 처리: 이미 끝낸 ${before - targets.length}명 건너뜀`)
  } else if (!RESUME) {
    writeFileSync(DONE_LOG, '')
    writeFileSync(CANDIDATES_LOG, '')
  }
  if (LIMIT !== Infinity) targets = targets.slice(0, LIMIT)

  console.log(`셀럽 ${all.length} | 대상 ${targets.length} | 모델 ${MODEL} | 동시 ${CONCURRENCY}`)

  let done = 0, ok = 0, fail = 0
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (r) => {
      const t0 = Date.now()
      try {
        const en = await translate(materialOf(r))
        const record: Candidate = {
          slug: r.slug,
          nickname: r.nickname,
          currentKoHash: sha256(r.virtual_monologue ?? ''),
          currentEnHash: sha256(r.virtual_monologue_en ?? ''),
          candidateText: en,
          candidateHash: sha256(en),
          status: 'draft',
        }
        appendFileSync(CANDIDATES_LOG, `${JSON.stringify(record)}\n`)
        appendFileSync(DONE_LOG, `${r.slug}\n`)
        ok++
        console.log(`✓ ${r.nickname} 후보 (${r.virtual_monologue!.length}→${en.length}자, ${Math.round((Date.now() - t0) / 1000)}s)`)
      } catch (e) {
        fail++
        console.error(`✗ ${r.nickname}: ${((e as Error).message || '').slice(0, 200)}`)
      } finally {
        done++
      }
    }))
    console.log(`  진행 ${done}/${targets.length} (성공 ${ok} / 실패 ${fail})`)
  }

  console.log(`\n완료. 성공 ${ok} / 실패 ${fail}`)
  console.log(`후보 파일: ${CANDIDATES_LOG} | DB 쓰기 0건`)
  if (fail > 0) console.log('※ --resume 으로 재실행하면 못 끝낸 인물만 이어서 처리한다.')
}

run().catch((e) => { console.error(e); process.exit(1) })
