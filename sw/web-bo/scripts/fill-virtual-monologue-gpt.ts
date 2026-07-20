/**
 * profiles.virtual_monologue 생성기 (GPT-5.6 sol / effort medium, codex CLI)
 * ── 가상 독백 작성 규격의 단일원천(SSoT). 규격 상세는 아래 buildPrompt 가 전부 쥔다. ──
 *
 * [무엇을 만드는가]
 *   셀럽 페이지에 실리는 1인칭 독백. 그 인물이 자기 삶·사상·신념을 혼잣말로 풀어낸다.
 *   목적은 이해다 — 처음 읽는 사람이 '이 사람이 누구이고 무엇을 한 사람인지'를 또렷이 알아야 한다.
 *   추상 관념만 늘어놓지 말고, 실제로 한 일·역할과 그 사상을 나란히 잡는다.
 *
 * [저장]
 *   DB: profiles.virtual_monologue (text) · Supabase project wouqtpvfctednlffross · 인물 식별은 slug.
 *   이 스크립트가 codex 응답을 받아 UPDATE 까지 자동 수행한다(수동 UPDATE 불필요).
 *
 * [말투]  정중체('저는'/'~습니다') 기본. 지휘관 직군 + 아래 PLAIN_EXTRA 4명만 평어체('나는'/'~다'). isPlain 참조.
 * [분량]  영향력 등급별 목표만 준다(하한 없음). 자료가 얇으면 짧게 맺는다. lengthTarget 참조.
 * [형식·금지]  두괄식 도입·억지 역설 금지·한국어 호흡·구어 어휘·em dash 금지·한자 금지 등 → buildPrompt.
 *
 * [실행 방식]
 *   - codex(Codex 구독 인증)로 생성 → 종량제 비용 없음. rate limit 존재(누적 500~560건, 5시간 주기 회복).
 *   - codex exec --output-last-message 로 순수 독백만 파일 수신.
 *   - 대상: profile_type='CELEB' + bio 있는 인물.
 *   - 기존 독백을 보여주고 고치게 한다(백지 생성 아님). 검증된 사실 위에서 목소리만 바꾼다.
 *   - 재료는 인물 소개(bio)·생몰뿐이다. cultural_journey(감상 여정)·celeb_persona·celeb_influence 서술·
 *     celeb_dialogues 를 재료로 넣지 마라 — 그쪽 데이터 자체가 정리 대상이라 오염이 독백으로 옮는다.
 *
 * [명령]  sw/web-bo 에서
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue-gpt.ts --limit 5    # 시험(5명)
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue-gpt.ts --no-force   # 독백 없는 인물만
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue-gpt.ts              # 전량 재생성
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue-gpt.ts --resume     # 중단분 이어서(.tmp-gpt-mono/done.log 기준)
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
const CONCURRENCY = arg('--conc', 3)
const NO_FORCE = process.argv.includes('--no-force')   // 아직 독백이 없는 인물만
const RESUME = process.argv.includes('--resume')       // 이번 회차에 이미 끝낸 인물은 건너뛴다

const MODEL = 'gpt-5.6-sol'
const TMP = resolve(process.cwd(), '.tmp-gpt-mono')
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true })
/** rate limit 으로 끊겨도 --resume 으로 이어붙이기 위한 처리 완료 기록. */
const DONE_LOG = resolve(TMP, 'done.log')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * 평어체 고정 = 지휘관 직군 + 아래 4명. 나머지 전원 정중체 '저는'.
 * 말투를 모델 재량으로 뒀더니 판단은 하는데 1,000자를 쓰는 동안 그 선택을 못 지켰다
 * (니체가 반말로 가다 끝에서 '억울했습니다'로 무너지고, 머큐리는 '제 목소리가 ~했다'로 섞였다).
 */
const COMMANDER = new Set(['commander'])
const PLAIN_EXTRA = new Set<string>([
  'friedrich-nietzsche',  // 선언·경구가 문체 자체. 정중한 어미로는 망치가 안 든다
  // 아래 셋은 군 지휘가 본령인데 직군이 politician 이라 자동 배정에서 빠진다
  'julius-caesar', 'kublai-khan', 'chagatai-khan',
])
const isPlain = (slug: string, p: string | null) => COMMANDER.has(p ?? '') || PLAIN_EXTRA.has(slug)
const hasHanzi = (s: string) => /[一-鿿]/.test(s)

/**
 * 영향력(celeb_influence.total_score)을 사상의 두께로 보고 분량 기준을 준다.
 * 자율 분량으로 뒀더니 모델이 위상을 무시하고 균일하게 써서(S급 837자 ≈ C급 815자),
 * 진시황(영향력 73)이 375자로 전체 최단이 되는 역전이 났다.
 * 하한(min)은 두지 않는다. 자료가 얇은 인물은 덜 쓰는 것이 맞다.
 */
function lengthTarget(score: number | null): string {
  if (score !== null && score >= 65) return '1200자 내외'
  if (score !== null && score >= 50) return '1000자 내외'
  if (score !== null && score >= 35) return '850자 내외'
  return '800자 내외'
}

type Material = {
  name: string; bio: string; era: string; plain: boolean; origin: string; target: string
}

/**
 * 옛 규격은 이름·bio 만 주고 규칙 9개 중 6개가 금지였다. 감점을 피하는 최단 경로가 무색무취라
 * 1,691편이 같은 목소리로 말했다(물음표 3편·인용부호 0편·감정 동사 20편, 81%가 명제 오프닝).
 * 지금은 원본을 주고 고치게 하며, 금지 대신 무엇을 해야 하는지를 준다.
 */
function buildPrompt(m: Material): string {
  return `${m.origin
    ? `아래는 지금 서비스에 실려 있는 ${m.name}의 1인칭 독백이다. 이 글을 고쳐 더 나은 독백으로 만들어라.

[지금 글]
${m.origin}

[지금 글의 문제]
사실 관계와 인물 정보는 대체로 정확하다. 그러나 1,691명의 독백이 전부 같은 목소리로 말한다. 명제 한 줄로 열고, 자기를 소개하고, 업적을 늘어놓고, 신념을 요약하며 닫는 틀이 똑같다. 사람이 자기 인생을 두고 하는 말인데 감정이 없고, 남이 자기를 어떻게 말하는지 되받는 대목도 없다. 조용히 정보만 전달하다 끝난다.

[고치는 법]
살릴 것은 살려라. 사실, 인물의 정체가 또렷이 잡히는 대목, 이해를 돕는 설명은 그대로 두거나 다듬는 선에서 지킨다.
바꿀 것은 이 사람이 실제로 내는 소리로 바꿔라. 감정이 실릴 자리에 실리게 하고, 틀에 박힌 골격을 이 인물에게 맞는 흐름으로 다시 짠다. 다만 원문이 이미 잘하고 있는 것을 굳이 뒤집지 마라.

`
    : ''}실존 인물 ${m.name}이(가) 자기 삶과 신념을 1인칭으로 말하는 독백을 한국어로 ${m.origin ? '완성하라' : '써라'}.

[이 글의 목적]
이 인물을 처음 보는 사람이 읽는다. 다 읽고 나면 이 사람이 무엇을 믿었고 왜 그렇게 살았는지 또렷이 이해하고 오래 기억해야 한다. 이해가 목적이고, 감정과 말투는 그 목적에 봉사하는 수단이다.

[이 말의 자리]
이것은 혼잣말이다. 청중 앞에 선 연설도, 독자를 향한 강연도 아니다. 자기 삶을 혼자 되짚는 사람의 말이다. 그러니 듣는 사람을 불러 세우거나(여러분, 당신들), 무엇을 하라고 권하고 요구하며 끝내지 않는다. 마지막 문장은 교훈이나 당부가 아니라 자기 이야기로 맺는다. 무엇을 느낄지는 읽는 사람이 정한다.

[인물 자료]
이름: ${m.name}
${m.era ? `생몰: ${m.era}\n` : ''}소개: ${m.bio}

[쓰는 법]
사람이 실제로 내는 소리로 써라. 사상을 정리해 알려주는 해설이 아니라, 살아 있는 사람이 자기 인생을 두고 하는 말이다. 감정이 실릴 자리에는 실어라. 억울했으면 억울하다고 말한다. 후회할 것은 후회하고, 굽히지 않을 것은 끝내 굽히지 않는다.

첫 문단 안에서 이 사람이 누구이고 무엇을 한 사람인지 드러나야 한다. 유명한 사건 한복판에서 시작해 읽는 사람이 화자를 추리하게 만들지 마라. 다만 모두를 '저는 ○○입니다'로 똑같이 시작시키지는 않는다. 이름과 한 일이 첫머리에서 자연스럽게 잡히면 그 방식은 자유다.

뒤집어 말해서 깊어 보이려 하지 마라. 'A가 아니라 B였습니다', '~라고 생각하지 않았습니다' 같은 구문이 그렇다. 아무도 그렇게 여긴 적 없는 것을 부정해 놓고 대단한 통찰인 척하는 문장이 된다. 무대는 숨는 곳이 아니었다, 빈손은 수치가 아니었다, 큰 항아리는 궁핍의 상징이 아니었다 같은 문장은 지우고 나면 아무것도 잃지 않는다. 4군 6진을 두고 '따로 떨어진 치적이라고 생각하지 않았습니다'라고 쓰지 말고, 4군 6진을 꾸려 무엇을 했는지 그대로 적어라. 대비는 두 쪽이 실제로 부딪쳐 뜻이 갈릴 때만 쓴다. 나머지는 하려던 말을 그냥 사실대로 적으면 된다.

한국어는 호흡이 생명이다. 문장의 길이, 끊고 잇는 자리, 쉬어 가는 대목이 그 인물과 함께 살아 숨 쉬어야 한다. 급하게 밀어붙인 사람은 문장도 짧게 치고 나가고, 오래 눌러 생각한 사람은 길게 감아 놓는다. 말이 무거운 사람은 쉼이 길고, 거침없는 사람은 쉼 없이 이어 간다. 말투를 갈라 놓아도 호흡이 같으면 결국 같은 사람이 말하는 소리가 된다. 다만 호흡을 의식해 일부러 끊어 치지는 마라. 어설프게 토막 내면 읽기만 어려워진다.

화법은 차분하고 또렷한 것이 기본이다. 남이 붙인 딱지를 끌어와 되받기, 스스로에게 묻기, 비꼼, 짧게 끊어 치기 같은 장치는 이 인물이 실제로 그렇게 말한 사람일 때만 꺼내라. 아무에게나 쓰면 글마다 같은 재주가 반복되고, 재주가 인물을 집어삼킨다. 읽는 사람이 인물을 이해하는 것이 언제나 먼저다.

낱말도 말로 쓰는 낱말을 골라라. 문장 구조만 말이고 어휘가 논문이면 사람이 아니라 학자가 읽는 소리가 된다. 사람이 혼자 중얼거리며 '허무주의자'라고는 하지 않는다. 개념을 꼭 짚어야 하면 입으로 말하듯 풀어라(삶이 헛되다고 떠드는 자들). 학술 용어, 문어체 한자어, 글에서만 보는 표현은 그 인물의 전문 분야에서 그 말을 실제로 입에 올렸을 때만 쓴다.

다만 감정을 쏟는 일기가 아니다. 한 문장이 나갈 때마다 읽는 사람의 이해가 한 걸음 나아가야 한다. 인물이 자기 세계에서만 통하는 말을 하면 처음 읽는 사람은 떨어져 나간다. 배경 지식 없이 따라올 수 있게 하되, 설명하려고 목소리를 죽이지는 마라. 무엇을 한 사람인지는 이력서처럼 소개하지 말고 말 속에서 저절로 드러나게 한다.

분량은 ${m.target}로 한다. 다만 이 인물에 대해 확인된 사실이 얼마 없다면 억지로 채우지 마라. 지어내거나 같은 말을 되풀이하거나 이력을 나열해 늘리느니 짧게 끝내는 편이 낫다.

[말투]
${m.plain
  ? `평어체로 쓴다. 모든 문장을 '~다'로 끝맺고 자기 자신은 '나는'·'내가'로만 가리킨다. '~습니다'와 '저는'을 한 번도 쓰지 않는다.`
  : `정중체로 쓴다. 모든 문장을 '~습니다'로 끝맺고 자기 자신은 '저는'·'제가'로만 가리킨다. 반말 종결과 '나는'을 한 번도 쓰지 않는다.`}
글 전체에서 이 말투를 흔들림 없이 지킨다. 마지막 문단까지 같아야 한다. 다만 매 문장을 자기 지칭으로 시작하지는 않는다.

[표기]
- 확인되지 않은 사실은 지어내지 않는다. 불확실한 고유명사는 언급하지 않는다.
- 한자를 쓰지 않고 한글로 적는다. 단 널리 쓰이는 로마자 약칭·고유명사(RSS, JSTOR, AI 등)는 원래 표기 그대로 둔다.
- em dash(—)를 쓰지 않는다.
- 독백 본문만 출력한다. 설명·머리말·따옴표 없이 본문 텍스트만.`
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
    ch.on('close', (code) => (code === 0 ? res() : rej(new Error(`codex exit ${code}: ${err.slice(0, 300)}`))))
    ch.stdin.write(prompt)
    ch.stdin.end()
  })
}

async function generate(slug: string, m: Material): Promise<string> {
  const outFile = resolve(TMP, `mono-${slug.replace(/[^a-z0-9-]/gi, '_')}.txt`)
  writeFileSync(outFile, '') // 이전 잔재 제거
  await runCodex(buildPrompt(m), outFile)
  const text = readFileSync(outFile, 'utf-8').trim()
  if (!text) throw new Error('빈 응답')
  if (hasHanzi(text)) throw new Error('한자 혼입')
  return text
}

type Row = {
  slug: string; nickname: string; bio: string | null; profession: string | null
  birth_date: string | null; death_date: string | null
  virtual_monologue: string | null
  celeb_influence: { total_score: number | null }[] | { total_score: number | null } | null
}

async function loadAll(): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('profiles')
      .select('slug, nickname, bio, profession, birth_date, death_date, virtual_monologue, celeb_influence(total_score)')
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

function materialOf(r: Row): Material {
  return {
    name: r.nickname,
    bio: r.bio ?? '',
    era: [r.birth_date, r.death_date].filter(Boolean).join(' ~ '),
    plain: isPlain(r.slug, r.profession),
    origin: r.virtual_monologue ?? '',
    target: lengthTarget(scoreOf(r)),
  }
}

async function run() {
  const all = await loadAll()
  let targets = all.filter((r) => r.bio && (!NO_FORCE || !r.virtual_monologue))

  if (RESUME && existsSync(DONE_LOG)) {
    const done = new Set(readFileSync(DONE_LOG, 'utf-8').split('\n').map((s) => s.trim()).filter(Boolean))
    const before = targets.length
    targets = targets.filter((r) => !done.has(r.slug))
    console.log(`이어서 처리: 이미 끝낸 ${before - targets.length}명 건너뜀`)
  } else if (!RESUME) {
    writeFileSync(DONE_LOG, '') // 새 회차 시작
  }
  if (LIMIT !== Infinity) targets = targets.slice(0, LIMIT)

  console.log(`셀럽 ${all.length} | 대상 ${targets.length} | 모델 ${MODEL} | 동시 ${CONCURRENCY}${NO_FORCE ? ' | 독백 없는 인물만' : ''}`)

  let done = 0, ok = 0, fail = 0, rateHit = 0
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (r) => {
      const t0 = Date.now()
      try {
        const before = r.virtual_monologue?.length ?? 0
        const mono = await generate(r.slug, materialOf(r))
        const { error } = await supabase.from('profiles').update({ virtual_monologue: mono }).eq('slug', r.slug)
        if (error) throw error
        appendFileSync(DONE_LOG, `${r.slug}\n`)
        ok++
        console.log(`✓ ${r.nickname} (${before ? `${before}→` : ''}${mono.length}자, ${isPlain(r.slug, r.profession) ? '반말' : '정중'}, ${Math.round((Date.now() - t0) / 1000)}s)`)
      } catch (e) {
        fail++
        const msg = (e as Error).message || ''
        if (/rate|limit|quota|429|usage/i.test(msg)) { rateHit++; console.error(`⏳ ${r.nickname}: RATE LIMIT 의심 — ${msg.slice(0, 200)}`) }
        else console.error(`✗ ${r.nickname}: ${msg.slice(0, 200)}`)
      } finally {
        done++
      }
    }))
    console.log(`  진행 ${done}/${targets.length} (성공 ${ok} / 실패 ${fail}${rateHit ? ` / rate ${rateHit}` : ''})`)
  }

  console.log(`\n완료. 성공 ${ok} / 실패 ${fail}${rateHit ? ` / rate limit 의심 ${rateHit}` : ''}`)
  if (fail > 0) console.log('※ --resume 으로 재실행하면 못 끝낸 인물만 이어서 처리한다.')
}

run().catch((e) => { console.error(e); process.exit(1) })
