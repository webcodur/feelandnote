/**
 * profiles.virtual_monologue 후보 생성기 (GPT-5.6 sol / effort medium, codex CLI)
 * ── 문장 작성 규격은 buildPrompt, 전수 운영 규격은 docs/todo/virtual-monologue-quality-overhaul.md ──
 *
 * [무엇을 만드는가]
 *   셀럽 페이지에 실리는 1인칭 독백. 그 인물이 자기 삶·사상·신념을 혼잣말로 풀어낸다.
 *   목적은 이해다 — 처음 읽는 사람이 '이 사람이 누구이고 무엇을 한 사람인지'를 또렷이 알아야 한다.
 *   추상 관념만 늘어놓지 말고, 실제로 한 일·역할과 그 사상을 나란히 잡는다.
 *
 * [저장]
 *   이 스크립트는 DB를 읽기만 한다. 생성 결과는 .tmp-gpt-mono/candidates.jsonl에 후보로 저장한다.
 *   검토·승인·원문 해시 대조를 거치지 않은 생성 결과를 profiles.virtual_monologue에 바로 쓰지 않는다.
 *
 * [생성 루트 — 3단계, 2026-08-02 개편]
 *   인물마다 GPT를 세 번 부른다. 한 번에 쓰게 하면 틀에 박힌 골격이 나와서 단계를 갈랐다.
 *   ① 주제 정리(buildOutlinePrompt): 이 인물의 독백이 다뤄야 할 주제·이야기·감정의 매듭을 먼저 정리
 *   ② 본문 쓰기(buildWritePrompt): ①의 정리를 재료로 삼아 독백 작성 (문장 규격은 여기가 쥔다)
 *   ③ 비판적 검토·1회 수정(buildCritiquePrompt): 초안을 스스로 비판하고 고친 최종본만 출력
 *   중간 산출물(개요·초안)은 candidates.jsonl 레코드에 함께 남겨 검토 때 대조한다.
 *
 * [말투]  정중체('저는'/'~습니다') 기본. 지휘관 직군 + 아래 PLAIN_EXTRA 4명만 평어체('나는'/'~다'). isPlain 참조.
 * [분량]  영향력 등급별 목표만 준다(하한 없음). 자료가 얇으면 짧게 맺는다. lengthTarget 참조.
 * [형식·금지]  두괄식 도입·억지 역설 금지·한국어 호흡·구어 어휘·em dash 금지·한자 금지 등 → buildWritePrompt.
 *
 * [실행 방식]
 *   - codex(Codex 구독 인증)로 생성 → 종량제 비용 없음. rate limit 존재(누적 500~560건, 5시간 주기 회복).
 *   - codex exec --output-last-message 로 순수 독백만 파일 수신.
 *   - 대상: profile_type='CELEB' + bio 있는 인물.
 *   - --mode improve: 기존 독백을 보여주고 개선한다.
 *   - --mode new: 기존 독백을 주지 않고 새로 쓴다.
 *   - 재료는 인물 소개(bio)·생몰뿐이다. cultural_journey(감상 여정)·celeb_persona·celeb_influence 서술·
 *     celeb_dialogues 를 재료로 넣지 마라 — 그쪽 데이터 자체가 정리 대상이라 오염이 독백으로 옮는다.
 *   - bio+생몰만으로는 최종 품질을 보장할 수 없다. 정식 전수 작업에서는 이 파일을 단독 게시 도구로 쓰지 않는다.
 *
 * [명령]  sw/web-bo 에서
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue-gpt.ts --slugs peter-thiel --mode improve
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue-gpt.ts --slugs alex-karp --mode new
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue-gpt.ts --limit 5 --mode improve
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue-gpt.ts --limit 5 --mode improve --resume
 *
 *   --slugs 또는 유한한 --limit 없이 전량을 실수로 돌릴 수 없도록 막는다.
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
const CONCURRENCY = arg('--conc', 3)
const NO_FORCE = process.argv.includes('--no-force')   // 아직 독백이 없는 인물만
const RESUME = process.argv.includes('--resume')       // 이번 회차에 이미 끝낸 인물은 건너뛴다
const MODE = (() => {
  const i = process.argv.indexOf('--mode')
  const value = i >= 0 ? process.argv[i + 1] : 'improve'
  if (value !== 'improve' && value !== 'new') throw new Error(`--mode는 improve 또는 new: ${value}`)
  return value
})() as 'improve' | 'new'
const SLUGS = (() => {
  const i = process.argv.indexOf('--slugs')
  return i >= 0
    ? new Set(process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean))
    : null
})()

const MODEL = 'gpt-5.6-sol'
const PROMPT_VERSION = 'vm-ko-2026-08-02-3stage-v5' // v5: 실발언 조사 기반 + 한 줄 정의 + AI 티 소거(튜링 테스트 기준)
const TMP = resolve(process.cwd(), '.tmp-gpt-mono')
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true })
/** rate limit 으로 끊겨도 --resume 으로 이어붙이기 위한 처리 완료 기록. */
const DONE_LOG = resolve(TMP, 'done.log')
const CANDIDATES_LOG = resolve(TMP, 'candidates.jsonl')

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
const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

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
 * 1단계 — 실제 발언 조사. 인물이 실제로 한 말(인터뷰·팟캐스트·방송·연설·저술·기록)을
 * 찾아 재료로 삼는다. 현대인은 인터뷰·팟캐스트가 몸통이고, 역사 인물은 기록된 발언이다.
 * 재료가 실발언이면 어투가 사람을 따라가고, 재료가 요약문이면 어투가 AI를 따라간다.
 */
function buildOutlinePrompt(m: Material): string {
  return `실존 인물 ${m.name}${m.era ? `(${m.era})` : ''}의 가상독백을 쓰기 위한 재료를 조사하라. (${m.bio})

이 사람이 실제로 한 말을 찾아라 — 인터뷰, 팟캐스트, 방송, 연설, 저술, 기록에 남은 발언.

정리할 것:
- 실제 발언 인용 (한국어 번역, 최대한 그 사람이 말한 그대로)
- 그 발언들에서 드러나는 이 사람 특유의 어투·말버릇·화법
- 본인이 직접 언급한 자기 삶의 사건들

확인 안 되는 것은 싣지 마라. 정리 목록만 출력하라.`
}

/**
 * 2단계 — 본문 쓰기. 옛 규격은 이름·bio 만 주고 규칙 9개 중 6개가 금지였다. 감점을 피하는
 * 최단 경로가 무색무취라 1,691편이 같은 목소리로 말했다(물음표 3편·인용부호 0편·감정 동사
 * 20편, 81%가 명제 오프닝). 지금은 개요를 먼저 확정해 재료로 주고, 금지 대신 무엇을 해야
 * 하는지를 준다.
 */
function buildWritePrompt(m: Material, outline: string): string {
  return `가상독백은 실존 인물이 자기 삶과 신념을 1인칭으로 말하는 글이다. ${m.name}의 가상독백을 한국어로 써라. ${m.plain ? `말투는 평어체('~다'·'나는')` : `말투는 정중체('~습니다'·'저는')`}, 분량 ${m.target}. 본문만 출력한다.

[인물]
이름: ${m.name}
${m.era ? `생몰: ${m.era}\n` : ''}소개: ${m.bio}

[조사 자료 — 이 사람의 실제 발언과 어투]
${outline}`
}

/**
 * 3단계 — AI 티 소거. 목표는 명문이 아니라 튜링 테스트다: AI가 짜낸 글임을 알아볼 수
 * 없어야 한다. 번역투와 AI 특유의 톤(대구 수사, 부정 구문 쌓기, 매끈한 요약체, 총정리
 * 마무리)을 걷어내고 조사된 실제 어투 쪽으로 끌고 간다. 표기류(대시·한자 등) 기계 검사는
 * 프롬프트가 아니라 코드 후보정이 맡는다.
 */
function buildCritiquePrompt(m: Material, outline: string, draft: string): string {
  return `아래는 ${m.name}의 가상독백 초안이다. 문제는 이 글에서 AI가 쓴 티가 난다는 것이다.

읽는 사람이 AI가 짜낸 글임을 알아볼 수 없어야 한다. 명문일 필요 없다. 번역투, AI 특유의 매끈한 수사(대구 반복, 부정 구문 쌓기, 깔끔한 총정리 마무리)를 걷어내고, 조사 자료에 담긴 이 사람의 실제 어투에 가깝게 다시 써라. 말투는 ${m.plain ? `평어체('~다'·'나는')` : `정중체('~습니다'·'저는')`} 유지. 본문만 출력한다.

[초안]
${draft}

[조사 자료 — 이 사람의 실제 발언과 어투]
${outline}`
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
      // v5의 1단계(실발언 조사)는 웹 검색이 겹쳐 4분을 넘기기 일쑤다. 4분 타임아웃으로는
      // 전원이 타임아웃→재시도 루프에 갇힌다(26-08-02 실측: 완료 0명). 10분으로 상향.
      { shell: true, timeout: 600000 })
    let err = ''
    ch.stderr.on('data', (d) => { err += d.toString() })
    ch.on('error', rej)
    ch.on('close', (code) => (code === 0 ? res() : rej(new Error(`codex exit ${code}: ${err.slice(0, 300)}`))))
    ch.stdin.write(prompt)
    ch.stdin.end()
  })
}

/** 산발 실패(spawn·타임아웃) 흡수용 1회 재시도. rate limit 계열은 재시도해도 소용없어 즉시 던진다. */
async function callStage(prompt: string, outFile: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    writeFileSync(outFile, '') // 이전 잔재 제거
    try {
      await runCodex(prompt, outFile)
      const text = readFileSync(outFile, 'utf-8').trim()
      if (!text) throw new Error('빈 응답')
      return text
    } catch (e) {
      const msg = (e as Error).message || ''
      if (attempt >= 2 || /rate|limit|quota|429|usage/i.test(msg)) throw e
    }
  }
}

type Generated = { outline: string; draft: string; final: string }

async function generate(slug: string, m: Material): Promise<Generated> {
  const safe = slug.replace(/[^a-z0-9-]/gi, '_')
  const outline = await callStage(buildOutlinePrompt(m), resolve(TMP, `outline-${safe}.txt`))
  const draft = await callStage(buildWritePrompt(m, outline), resolve(TMP, `draft-${safe}.txt`))
  const final = await callStage(buildCritiquePrompt(m, outline, draft), resolve(TMP, `mono-${safe}.txt`))
  if (hasHanzi(final)) throw new Error('한자 혼입')
  if (/https?:\/\/|\]\(/.test(final)) throw new Error('링크 혼입') // codex가 웹 근거를 본문에 인라인 인용하는 사고 차단
  return { outline, draft, final }
}

type Row = {
  slug: string; nickname: string; bio: string | null; profession: string | null
  birth_date: string | null; death_date: string | null; celeb_tier: string | null
  virtual_monologue: string | null
  celeb_influence: { total_score: number | null }[] | { total_score: number | null } | null
}

async function loadAll(): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('profiles')
      .select('slug, nickname, bio, profession, birth_date, death_date, celeb_tier, virtual_monologue, celeb_influence(total_score)')
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
    origin: MODE === 'improve' ? (r.virtual_monologue ?? '') : '',
    target: lengthTarget(scoreOf(r)),
  }
}

async function run() {
  if (!SLUGS && LIMIT === Infinity) {
    throw new Error('안전 중단: --slugs 또는 유한한 --limit을 지정해야 한다. 전량 무검토 생성을 금지한다.')
  }

  const all = await loadAll()
  let targets = all.filter((r) =>
    r.bio
    // fiction은 전용 트랙(fiction-profile-monologue 스킬: 원전 근거·반복 비판)이 있고,
    // relation은 독백 트랙 자체가 없다. 이 스크립트는 실존 light/full만 다룬다.
    // (2026-08-02: 필터 없이 돌려 fiction 47명·relation 1명 후보가 오발된 사고의 재발 방지)
    && (r.celeb_tier === 'light' || r.celeb_tier === 'full')
    && (!NO_FORCE || !r.virtual_monologue)
    && (!SLUGS || SLUGS.has(r.slug)),
  )

  if (SLUGS) {
    const found = new Set(targets.map((r) => r.slug))
    const missing = [...SLUGS].filter((slug) => !found.has(slug))
    if (missing.length) throw new Error(`대상에서 찾지 못한 slug: ${missing.join(', ')}`)
  }

  if (RESUME && existsSync(DONE_LOG)) {
    const done = new Set(readFileSync(DONE_LOG, 'utf-8').split('\n').map((s) => s.trim()).filter(Boolean))
    const before = targets.length
    targets = targets.filter((r) => !done.has(r.slug))
    console.log(`이어서 처리: 이미 끝낸 ${before - targets.length}명 건너뜀`)
  } else if (!RESUME) {
    writeFileSync(DONE_LOG, '') // 새 회차 시작
    writeFileSync(CANDIDATES_LOG, '')
  }
  if (LIMIT !== Infinity) targets = targets.slice(0, LIMIT)

  console.log(`셀럽 ${all.length} | 대상 ${targets.length} | 모델 ${MODEL} | 모드 ${MODE} | 동시 ${CONCURRENCY}${NO_FORCE ? ' | 독백 없는 인물만' : ''} | DB 쓰기 0건`)

  let done = 0, ok = 0, fail = 0, rateHit = 0
  // 작업자 풀: 묶음 단위 대기(Promise.all 배리어)를 쓰면 가장 느린 한 명이 나머지 슬롯을
  // 전부 놀린다. 슬롯이 비는 즉시 다음 인물을 집도록 인덱스를 공유한다.
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= targets.length) return
      const r = targets[i]
      const t0 = Date.now()
      try {
        const before = r.virtual_monologue?.length ?? 0
        const g = await generate(r.slug, materialOf(r))
        appendFileSync(CANDIDATES_LOG, `${JSON.stringify({
          schemaVersion: 2,
          generatedAt: new Date().toISOString(),
          promptVersion: PROMPT_VERSION,
          model: MODEL,
          mode: MODE,
          slug: r.slug,
          nickname: r.nickname,
          currentText: r.virtual_monologue ?? '',
          currentHash: sha256(r.virtual_monologue ?? ''),
          outline: g.outline,
          draftText: g.draft,
          candidateText: g.final,
          candidateHash: sha256(g.final),
          status: 'draft',
        })}\n`)
        appendFileSync(DONE_LOG, `${r.slug}\n`)
        ok++
        console.log(`✓ ${r.nickname} (${before ? `${before}→` : ''}초안 ${g.draft.length}→최종 ${g.final.length}자, ${isPlain(r.slug, r.profession) ? '반말' : '정중'}, ${Math.round((Date.now() - t0) / 1000)}s)`)
      } catch (e) {
        fail++
        const msg = (e as Error).message || ''
        if (/rate|limit|quota|429|usage/i.test(msg)) { rateHit++; console.error(`⏳ ${r.nickname}: RATE LIMIT 의심 — ${msg.slice(0, 200)}`) }
        else console.error(`✗ ${r.nickname}: ${msg.slice(0, 200)}`)
      } finally {
        done++
        if (done % 10 === 0 || done === targets.length) {
          console.log(`  진행 ${done}/${targets.length} (성공 ${ok} / 실패 ${fail}${rateHit ? ` / rate ${rateHit}` : ''})`)
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()))

  console.log(`\n완료. 후보 ${ok} / 실패 ${fail}${rateHit ? ` / rate limit 의심 ${rateHit}` : ''}`)
  console.log(`후보 파일: ${CANDIDATES_LOG}`)
  if (fail > 0) console.log('※ --resume 으로 재실행하면 못 끝낸 인물만 이어서 처리한다.')
}

run().catch((e) => { console.error(e); process.exit(1) })
