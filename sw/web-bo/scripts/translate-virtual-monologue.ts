/**
 * profiles.virtual_monologue_en 생성기 (Claude Sonnet, claude CLI headless)
 * ── 가상 독백 영문본 작성 규격의 단일원천(SSoT). 규격 상세는 buildPrompt 가 전부 쥔다. ──
 *
 * [무엇을 만드는가]
 *   한국어 가상 독백(profiles.virtual_monologue)의 영문본. 번역이 아니라 같은 사람이 영어로 다시 쓴 독백.
 *   지키는 것은 사실·이름·연대·주장과 그 감정의 무게뿐이다. 문장 경계·문단 구분·서술 순서는
 *   영어 산문이 원하는 대로 다시 짠다(문단 수가 원문과 달라도 된다). 한국어 문장의 골격이
 *   남아 있으면 낱말이 맞아도 실패로 본다. 프로젝트 번역 원칙 '1:1 매핑 금지'(remo-write-7-translation
 *   기둥 2)와 '문체 등가성'(기둥 3)을 독백에 적용한 것이다.
 *
 * [저장]
 *   DB: profiles.virtual_monologue_en (text) · Supabase project wouqtpvfctednlffross · 인물 식별은 slug.
 *   이 스크립트가 응답을 받아 UPDATE 까지 자동 수행한다.
 *
 * [실행 방식]
 *   - claude CLI headless(구독 인증) → 종량제 비용 없음.
 *   - claude -p --model sonnet, 프롬프트는 stdin 전달(shell 이스케이프 회피).
 *   - 대상: profile_type='CELEB' + virtual_monologue 보유 인물.
 *
 * [명령]  sw/web-bo 에서
 *   node --env-file=.env --import tsx scripts/translate-virtual-monologue.ts --limit 5   # 시험(5명)
 *   node --env-file=.env --import tsx scripts/translate-virtual-monologue.ts --no-force  # 영문 없는 인물만
 *   node --env-file=.env --import tsx scripts/translate-virtual-monologue.ts             # 전량 재생성
 *   node --env-file=.env --import tsx scripts/translate-virtual-monologue.ts --resume    # 중단분 이어서
 */

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
/** 특정 인물만 골라 다시 뽑는다. 예: --slugs yi-sun-sin,abraham-lincoln */
const SLUGS = (() => {
  const i = process.argv.indexOf('--slugs')
  return i >= 0 ? new Set(process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean)) : null
})()

const MODEL = 'sonnet'
const TMP = resolve(process.cwd(), '.tmp-mono-en')
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true })
const DONE_LOG = resolve(TMP, 'done.log')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const hasHangul = (s: string) => /[가-힣]/.test(s)
const hasHanzi = (s: string) => /[一-鿿]/.test(s)

type Material = { name: string; era: string; ko: string }

function buildPrompt(m: Material): string {
  return `Below is a first-person monologue written in Korean. The speaker is ${m.name}${m.era ? ` (${m.era})` : ''}, a real historical or public figure reflecting alone on their own life and beliefs.

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

/** 본문 대신 작업 선언("I'll write the monologue directly...")이나 화자 표기("Name: ...")로 시작한 응답. */
const PREAMBLE = /^(here (is|goes)|sure|certainly|below is|okay|i'?ll (write|do|shift|render|give|keep|stay))\b|^[A-Z][A-Za-z.'-]+(?: [A-Z][A-Za-z.'-]+){0,3}:\s/

async function translate(m: Material): Promise<string> {
  const text = (await runClaude(buildPrompt(m))).trim()
  if (!text) throw new Error('빈 응답')
  if (PREAMBLE.test(text.split('\n')[0])) throw new Error(`서두 잔재: ${text.slice(0, 60)}`)
  if (hasHangul(text)) throw new Error('한글 잔존')
  if (hasHanzi(text)) throw new Error('한자 혼입')
  if (text.length < m.ko.length * 0.5) throw new Error(`분량 미달(${text.length}자)`)
  return text.replace(/—/g, ', ')
}

type Row = {
  slug: string; nickname: string; nickname_en: string | null
  birth_date: string | null; death_date: string | null
  virtual_monologue: string | null; virtual_monologue_en: string | null
}

async function loadAll(): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('profiles')
      .select('slug, nickname, nickname_en, birth_date, death_date, virtual_monologue, virtual_monologue_en')
      .eq('profile_type', 'CELEB')
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
})

async function run() {
  const all = await loadAll()
  let targets = all.filter((r) => r.virtual_monologue?.trim()
    && (!SLUGS || SLUGS.has(r.slug))
    && (!NO_FORCE || !r.virtual_monologue_en))

  if (RESUME && existsSync(DONE_LOG)) {
    const done = new Set(readFileSync(DONE_LOG, 'utf-8').split('\n').map((s) => s.trim()).filter(Boolean))
    const before = targets.length
    targets = targets.filter((r) => !done.has(r.slug))
    console.log(`이어서 처리: 이미 끝낸 ${before - targets.length}명 건너뜀`)
  } else if (!RESUME) {
    writeFileSync(DONE_LOG, '')
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
        const { error } = await supabase.from('profiles').update({ virtual_monologue_en: en }).eq('slug', r.slug)
        if (error) throw error
        appendFileSync(DONE_LOG, `${r.slug}\n`)
        ok++
        console.log(`✓ ${r.nickname} (${r.virtual_monologue!.length}→${en.length}자, ${Math.round((Date.now() - t0) / 1000)}s)`)
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
  if (fail > 0) console.log('※ --resume 으로 재실행하면 못 끝낸 인물만 이어서 처리한다.')
}

run().catch((e) => { console.error(e); process.exit(1) })
