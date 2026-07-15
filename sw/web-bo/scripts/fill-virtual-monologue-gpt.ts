/**
 * profiles.virtual_monologue 전량 생성 (GPT-5.6 sol / effort medium, codex CLI)
 *
 *   - codex(Codex 구독 인증)로 생성 → 종량제 비용 없음. rate limit 존재.
 *   - codex exec --output-last-message 로 순수 독백만 파일 수신.
 *   - 대상: profile_type='CELEB' + bio 있는 인물. 기본 --force(기존값 오버라이드).
 *   - 말투: profession='commander' 만 평어체(~다), 나머지 정중체(~습니다).
 *   - 시험: --limit N. 동시 실행: --conc N (기본 3).
 *
 * 실행: sw/web-bo 에서
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue-gpt.ts --limit 5
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue-gpt.ts        # 전량
 */

import { createClient } from '@supabase/supabase-js'
import { spawn, execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
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
const CONCURRENCY = arg('--conc', 3)
const NO_FORCE = process.argv.includes('--no-force')   // 기본 force(전량 오버라이드)
const SHORT_ONLY = process.argv.includes('--short-only') // 영향력 대비 분량 미달자만 보강

const MODEL = 'gpt-5.6-sol'
const TMP = resolve(process.cwd(), '.tmp-gpt-mono')
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const COMMANDER = new Set(['commander'])
const toneFor = (p: string | null) => (COMMANDER.has(p ?? '') ? '평어체(~다, 단정적 서술체)' : '정중체(~습니다)')
const hasHanzi = (s: string) => /[一-鿿]/.test(s)

/**
 * 영향력(celeb_influence.total_score)을 사상의 두께로 보고 분량 하한을 준다.
 * 자율 분량으로 뒀더니 모델이 위상을 무시하고 균일하게 써서(S급 837자 ≈ C급 815자),
 * 진시황(영향력 73)이 375자로 전체 최단이 되는 역전이 났다.
 */
function lengthGuide(score: number | null): { target: string; min: number } {
  if (score !== null && score >= 65) return { target: '1200자 내외', min: 1100 }
  if (score !== null && score >= 50) return { target: '1000자 내외', min: 900 }
  if (score !== null && score >= 35) return { target: '850자 내외', min: 700 }
  return { target: '800자 내외', min: 0 }
}

function buildPrompt(name: string, bio: string, tone: string, guide?: string): string {
  return `실존 인물의 '가상 독백'을 한국어로 써라. 그 인물이 자기 사상과 신념을 1인칭으로 말하는 독백이다.

규칙:
- 말투: ${tone}.${guide ? `
- 분량: ${guide}. 이 인물은 사상의 층이 두터우니 여러 국면(무엇을 믿었는지, 왜 그렇게 보았는지, 무엇을 세우고 무엇을 버렸는지)을 충분히 풀어낸다. 다만 같은 생각을 되풀이하거나 이력을 나열해 억지로 늘리지 않는다.` : ''}
- 첫 문장은 인물을 관통하는 핵심 사상을 담은 명제로 시작한다(두괄식). 부정형·예고형 도입 금지.
- 이 독백을 처음 읽는 사람이 '이 인물이 누구이고 무엇을 한 사람인지'를 또렷이 알 수 있어야 한다. 추상적 관념만 늘어놓지 말고, 실제로 한 일·역할과 사상을 결합해 쓴다. 다만 생애를 시간순으로 훑지 않는다.
- 실제 근거에 기반하고 확인 안 된 내용은 지어내지 않는다. 불확실한 고유명사는 언급하지 않는다.
- 중국어 한자나 한자 병기를 쓰지 않는다(모두 한글). 단 널리 쓰이는 로마자 약자·고유명사(RSS, JSTOR, AI 등)는 원래 표기 그대로 둔다.
- em dash(—) 금지. 괄호 개념 병기 금지. AI 상투 어휘·번역투 금지. 인생역전·설교조 마무리 금지.
- 독백 본문만 출력한다. 설명·머리말·코드·따옴표 없이 본문 텍스트만.

인물: ${name}
소개: ${bio}`
}

// codex 실행파일 절대경로 해석(.cmd 우선). PATH 의존 시 동시 실행에서 산발적으로
// 'codex' is not recognized 가 터진다(1회차 868건 실패 원인). 1회만 해석해 캐시.
let CODEX_BIN: string | null = null
function codexBin(): string {
  if (CODEX_BIN) return CODEX_BIN
  try {
    const found = execSync(process.platform === 'win32' ? 'where codex' : 'which codex', { encoding: 'utf-8' })
      .split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    const bin = found.find((p) => p.toLowerCase().endsWith('.cmd')) || found[0] || 'codex'
    CODEX_BIN = /\s/.test(bin) ? `"${bin}"` : bin // 경로 공백 대비
  } catch {
    CODEX_BIN = 'codex'
  }
  return CODEX_BIN
}

// codex exec 실행: 프롬프트는 stdin(- 인자)으로 전달해 shell 이스케이프를 피한다.
function runCodex(prompt: string, outFile: string): Promise<void> {
  return new Promise((res, rej) => {
    const ch = spawn(codexBin(), ['exec', '-', '-m', MODEL, '--output-last-message', outFile, '--color', 'never'],
      { shell: true, timeout: 240000 })
    let err = ''
    ch.stderr.on('data', (d) => { err += d.toString() })
    ch.on('error', rej)
    ch.on('close', (code) => (code === 0 ? res() : rej(new Error(`codex exit ${code}: ${err.slice(0, 200)}`))))
    ch.stdin.write(prompt)
    ch.stdin.end()
  })
}

async function generate(slug: string, name: string, bio: string, tone: string, guide?: string, minLen = 0): Promise<string> {
  const outFile = resolve(TMP, `mono-${slug.replace(/[^a-z0-9-]/gi, '_')}.txt`)
  writeFileSync(outFile, '') // 이전 잔재 제거
  await runCodex(buildPrompt(name, bio, tone, guide), outFile)
  const text = readFileSync(outFile, 'utf-8').trim()
  if (!text) throw new Error('빈 응답')
  if (hasHanzi(text)) throw new Error('한자 혼입')
  if (minLen && text.length < minLen) throw new Error(`분량 미달 ${text.length}자 < ${minLen}자`)
  return text
}

type Row = {
  slug: string; nickname: string; bio: string | null; profession: string | null
  virtual_monologue: string | null
  celeb_influence: { total_score: number | null }[] | { total_score: number | null } | null
}

async function loadAll(): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('profiles')
      .select('slug, nickname, bio, profession, virtual_monologue, celeb_influence(total_score)')
      .eq('profile_type', 'CELEB')
      .order('slug')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as unknown as Row[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

const scoreOf = (r: Row): number | null => {
  const ci = Array.isArray(r.celeb_influence) ? r.celeb_influence[0] : r.celeb_influence
  return ci?.total_score ?? null
}

async function run() {
  const all = await loadAll()
  let targets = all.filter((r) => r.bio && (!NO_FORCE || !r.virtual_monologue))

  // --short-only: 영향력 대비 분량 미달자만 (기존 독백 있는 인물 중)
  if (SHORT_ONLY) {
    targets = targets.filter((r) => {
      if (!r.virtual_monologue) return false
      const { min } = lengthGuide(scoreOf(r))
      return min > 0 && r.virtual_monologue.length < min
    })
  }
  if (LIMIT !== Infinity) targets = targets.slice(0, LIMIT)

  console.log(`셀럽 ${all.length} | 대상 ${targets.length} | 모델 ${MODEL} | 동시 ${CONCURRENCY}${SHORT_ONLY ? ' | 분량미달 보강' : NO_FORCE ? ' | NULL만' : ' | 전량 오버라이드'}`)

  let done = 0, ok = 0, fail = 0, rateHit = 0
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (r) => {
      const t0 = Date.now()
      try {
        const score = scoreOf(r)
        const { target, min } = lengthGuide(score)
        const before = r.virtual_monologue?.length ?? 0
        const mono = await generate(r.slug, r.nickname, r.bio!, toneFor(r.profession), SHORT_ONLY ? target : undefined, SHORT_ONLY ? min : 0)
        const { error } = await supabase.from('profiles').update({ virtual_monologue: mono }).eq('slug', r.slug)
        if (error) throw error
        ok++
        console.log(`✓ ${r.nickname} (${before ? `${before}→` : ''}${mono.length}자, 영향력 ${score ?? '-'}, ${Math.round((Date.now() - t0) / 1000)}s)`)
      } catch (e) {
        fail++
        const msg = (e as Error).message || ''
        if (/rate|limit|quota|429|usage/i.test(msg)) { rateHit++; console.error(`⏳ ${r.nickname}: RATE LIMIT 의심 — ${msg.slice(0, 120)}`) }
        else console.error(`✗ ${r.nickname}: ${msg.slice(0, 120)}`)
      } finally {
        done++
      }
    }))
    console.log(`  진행 ${done}/${targets.length} (성공 ${ok} / 실패 ${fail}${rateHit ? ` / rate ${rateHit}` : ''})`)
  }

  console.log(`\n완료. 성공 ${ok} / 실패 ${fail}${rateHit ? ` / rate limit 의심 ${rateHit}` : ''}`)
  if (rateHit > 0) console.log('※ rate limit 로 멈춘 건은 --no-force 로 재실행하면 남은 인물만 이어서 처리한다.')
}

run().catch((e) => { console.error(e); process.exit(1) })
