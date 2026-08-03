/**
 * 실존 full·light 및 fiction 인물의 한국어 가상 독백 후보 생성기.
 * 규칙 SSoT: docs/project/celeb/virtual-monologue.md
 *
 * 한 번의 모델 호출 안에서 4단계(재료 조사 → 말투·표현 설계 → 작성 → 검토하며 수정)를 거쳐
 * 실존 후보는 .tmp-gpt-mono, fiction 후보는 에피소드별 .tmp-gpt-mono-fiction에
 * 저장한다. 기존 독백 개선은 후보만 만들고, 빈 값만 고르는 신규 배치는 DB 값이 여전히
 * NULL일 때만 조건부로 게시한다. 병렬 처리는 고정 레인별 독립 릴레이이고,
 * fiction은 --fiction-episode로만 진입한다.
 */

import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { spawn, execFile, execSync } from 'child_process'
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
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
const CONCURRENCY = arg('--conc', 12)
const NO_FORCE = process.argv.includes('--no-force')   // 아직 독백이 없는 인물만
const RESUME = process.argv.includes('--resume')       // 이번 회차에 이미 끝낸 인물은 건너뛴다
const PLAN_ONLY = process.argv.includes('--plan')      // 대상만 출력하고 모델을 호출하지 않는다
const FICTION_EPISODE = (() => {
  const i = process.argv.indexOf('--fiction-episode')
  return i >= 0 ? process.argv[i + 1]?.trim() || null : null
})()
const MODE = (() => {
  const i = process.argv.indexOf('--mode')
  const value = i >= 0 ? process.argv[i + 1] : FICTION_EPISODE ? 'new' : 'improve'
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
const PROMPT_VERSION = 'vm-ko-2026-08-04-reader-first-v11-opening'
const TMP = FICTION_EPISODE
  ? resolve(process.cwd(), '.tmp-gpt-mono-fiction', FICTION_EPISODE)
  : resolve(process.cwd(), '.tmp-gpt-mono')
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true })
/** rate limit 으로 끊겨도 --resume 으로 이어붙이기 위한 처리 완료 기록. */
const DONE_LOG = resolve(TMP, 'done.log')
const CANDIDATES_LOG = resolve(TMP, 'candidates.jsonl')
/** 사용자가 허용한 범위: 처음부터 빈 값만 고르는 신규 배치에 한해 직접 게시한다. */
const WRITE_MISSING = MODE === 'new' && (NO_FORCE || Boolean(FICTION_EPISODE))

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const hasHanzi = (s: string) => /[一-鿿]/.test(s)
const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

type Material = {
  name: string
  bio: string
  era: string
  origin: string
  fiction: boolean
  work: string
  orientation: string
}

/**
 * 네 단계는 네 번의 모델 호출이 아니라 한 편을 쓰는 사고 순서다. 한 호출 안에서 조사부터
 * 검토·수정까지 끝내고, 검토에 필요한 재료와 말투 설계 및 최종본문만 구획으로 돌려받는다.
 */
function buildPrompt(m: Material): string {
  const origin = m.origin
    ? `\n[기존 독백 — 표현 참고용이며 사실 근거가 아님]\n${m.origin}\n`
    : ''
  const evidence = m.fiction
    ? `대표 원전 묶음은 ${m.work}이다. 대표 원전의 원문이나 신뢰할 수 있는 원전 번역본을 웹에서 찾아라. 후대 요약이나 아래 내부 방향 정보만으로 사실을 확정하지 마라.

[내부 방향 정보 — 검색어를 잡는 데만 쓰고 사실 근거로 인용하지 말 것]
${m.orientation}`
    : `이 사람이 실제로 한 말을 웹에서 찾아라. 인터뷰, 팟캐스트, 방송, 연설, 저술, 기록을 우선하고 후대 요약만으로 사실이나 말투를 확정하지 마라.`

  return `가상독백은 자신의 입을 통해 독자가 한 사람의 삶과 철학을 쉽게 이해하게 하는 글이다. ${m.name}의 가상독백을 한국어로 완성하라. 독자는 이 사람을 전혀 모른다. 분량 제한은 없다.

[인물]
이름: ${m.name}
${m.era ? `생몰: ${m.era}\n` : ''}소개: ${m.bio}
${origin}
${evidence}

다음 네 단계를 이 한 작업 안에서 순서대로 수행하라.

1. 재료 조사: 원문 URL이 있는 신뢰할 만한 근거를 필요한 만큼만 확인한다. 긴 배경 설명이 필요한 딥 소재는 최대 하나, 성격의 다른 면을 비출 짧은 소재는 한두 개만 고른다. 딥은 소재의 무게와 개수 분류이지 길게 쓰라는 지시가 아니다. 확인 안 되는 사실·동기·감정·인과·직접인용은 쓰지 않는다.
2. 말투와 표현 방식 고민: ${m.fiction ? '원전 속 대사와 행동' : '실제 발화 자료'}에 맞춰 높임말, 1인칭, 문장 호흡, 첫 문장과 결말을 정한다. 첫 문장은 이름표보다 그 인물을 가장 빨리 이해시킬 사건·선택·욕망·모순·실제 말투에서 잡는다. '나는/저는 ○○다/입니다'를 금지하지는 않지만, 정체 자체가 핵심이거나 독자의 혼란을 막는 최선의 시작일 때만 쓴다. 독자의 이해가 문체 과시보다 우선이다.
3. 작성: 딥 소재에서도 인물을 드러내는 한 장면이나 하나의 선택만 꺼내고 배경·결과는 알아들을 만큼만 압축한다. 작품 전체나 생애 전체를 요약하지 않는다. 짧은 소재는 별도 줄거리로 키우지 않는다. 설명하지 않은 인명과 사건을 연달아 던지지 않는다.
4. 검토와 동시 수정: 초안을 별도로 출력하지 말고 바로 고친다. 최종본만 읽고 누구인가, 무엇을 왜 선택했나, 결과가 무엇인가, 그래서 어떤 사람인가에 답할 수 있어야 한다. 첫 문장이 이름과 직함만 알리는 명함식 소개라면 사건이나 선택이 보이는 문장으로 고치되, 첫 단락 안에서는 화자의 정체·역할과 지금 무슨 상황인지 알 수 있게 한다. 사실 오류, 판박이 자기소개, 이력 나열, 평론가 해설, 교훈형 결말, 과장, 반복, 번역투를 걷어낸다. '~을 통해', '~라는 점', '~에 있어', '~을 보여 준다', '~을 드러낸다', 추상명사가 주어인 문장은 실제로 어색할 때만 자연스러운 현대 한국어로 고친다.

아래 세 구획만 정확히 출력하라. 조사 재료에는 확인한 사실·원문 대목과 URL을 간결하게 남긴다. 말투 설계는 짧게 쓴다. 최종본문에는 URL, 마크다운 링크, 한자, em dash를 넣지 않는다.

<<<MATERIALS>>>
조사 재료
<<<VOICE>>>
말투 설계
<<<FINAL>>>
검토와 수정을 끝낸 독백 본문
<<<END>>>`
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
      { shell: true })
    let err = ''
    let timedOut = false
    // Node spawn의 timeout은 Windows 셸의 손자 프로세스를 남겨 릴레이를 영구 정지시킬 수 있다.
    // 부모 셸이 살아 있을 때 트리 전체를 종료해야 다음 인물로 넘어간다.
    const timer = setTimeout(() => {
      timedOut = true
      if (process.platform === 'win32' && ch.pid) {
        execFile('taskkill.exe', ['/PID', String(ch.pid), '/T', '/F'], { windowsHide: true }, () => undefined)
      } else {
        ch.kill('SIGKILL')
      }
    }, 600000)
    ch.stderr.on('data', (d) => { err += d.toString() })
    ch.on('error', (error) => { clearTimeout(timer); rej(error) })
    ch.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) rej(new Error('codex timeout 600s'))
      else if (code === 0) res()
      else rej(new Error(`codex exit ${code}: ${err.slice(0, 300)}`))
    })
    ch.stdin.write(prompt)
    ch.stdin.end()
  })
}

/** 산발 실패(spawn·타임아웃) 흡수용 1회 재시도. rate limit 계열은 재시도해도 소용없어 즉시 던진다. */
async function callModel(prompt: string, outFile: string): Promise<string> {
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

type Generated = { materials: string; voicePlan: string; final: string }

function parseGenerated(raw: string): Generated {
  const materialsStart = raw.indexOf('<<<MATERIALS>>>')
  const voiceStart = raw.indexOf('<<<VOICE>>>')
  const finalStart = raw.indexOf('<<<FINAL>>>')
  const end = raw.indexOf('<<<END>>>')
  if (materialsStart < 0 || voiceStart < 0 || finalStart < 0 || end < 0
      || !(materialsStart < voiceStart && voiceStart < finalStart && finalStart < end)) {
    throw new Error('응답 구획 파싱 실패')
  }
  const materials = raw.slice(materialsStart + '<<<MATERIALS>>>'.length, voiceStart).trim()
  const voicePlan = raw.slice(voiceStart + '<<<VOICE>>>'.length, finalStart).trim()
  const final = raw.slice(finalStart + '<<<FINAL>>>'.length, end).trim()
  if (!materials || !voicePlan || !final) throw new Error('응답 구획 중 빈 값')
  if (!/https?:\/\//.test(materials)) throw new Error('조사 재료에 원문 URL 없음')
  return { materials, voicePlan, final }
}

async function generate(slug: string, m: Material): Promise<Generated> {
  const safe = slug.replace(/[^a-z0-9-]/gi, '_')
  const packet = resolve(TMP, `packet-${safe}.txt`)
  try {
    const raw = await callModel(buildPrompt(m), packet)
    const generated = parseGenerated(raw)
    if (hasHanzi(generated.final)) throw new Error('한자 혼입')
    if (/https?:\/\/|\]\(/.test(generated.final)) throw new Error('링크 혼입') // codex가 웹 근거를 본문에 인라인 인용하는 사고 차단
    return generated
  } finally {
    if (existsSync(packet)) unlinkSync(packet)
  }
}

async function publishIfStillMissing(slug: string, candidate: string): Promise<'written' | 'already-filled'> {
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ virtual_monologue: candidate })
    .eq('slug', slug)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .is('virtual_monologue', null)
    .is('virtual_monologue_locked_at', null)
    .select('slug, virtual_monologue')
    .maybeSingle()
  if (updateError) throw updateError

  if (!updated) {
    const { data: current, error: readError } = await supabase
      .from('profiles')
      .select('virtual_monologue')
      .eq('slug', slug)
      .eq('profile_type', 'CELEB')
      .maybeSingle()
    if (readError) throw readError
    if (current?.virtual_monologue) return 'already-filled'
    throw new Error('빈 값 조건부 UPDATE가 0행을 반환함')
  }

  const { data: verified, error: verifyError } = await supabase
    .from('profiles')
    .select('virtual_monologue')
    .eq('slug', slug)
    .eq('profile_type', 'CELEB')
    .single()
  if (verifyError) throw verifyError
  if (verified.virtual_monologue !== candidate) throw new Error('DB 재조회 결과가 생성 후보와 다름')
  return 'written'
}

type Row = {
  slug: string; nickname: string; bio: string | null
  birth_date: string | null; death_date: string | null; status: string | null; celeb_tier: string | null
  virtual_monologue: string | null
}

type FictionRosterItem = {
  slug?: string
  name?: string
  nameEn?: string
  mythical?: boolean
  epithet?: string
  lines?: string[]
  quoteOrigin?: string
}

function loadFictionRoster(): Map<string, FictionRosterItem> {
  if (!FICTION_EPISODE) return new Map()
  const file = resolve(
    process.cwd(), '..', 'remotion', 'public', 'factions', FICTION_EPISODE, 'faction-data.json',
  )
  if (!existsSync(file)) throw new Error(`fiction 에피소드 파일 없음: ${file}`)
  const data = JSON.parse(readFileSync(file, 'utf-8')) as {
    groups?: Array<{ clusters?: Array<{ people?: FictionRosterItem[] }> }>
  }
  const people = (data.groups ?? []).flatMap((group) =>
    (group.clusters ?? []).flatMap((cluster) => cluster.people ?? []),
  )
  return new Map(people
    .filter((person) => person.mythical === true && person.slug)
    .map((person) => [person.slug!, person]))
}

async function loadAll(): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('profiles')
      .select('slug, nickname, bio, birth_date, death_date, status, celeb_tier, virtual_monologue')
      .eq('profile_type', 'CELEB')
      .order('slug')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as unknown as Row[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

function materialOf(r: Row, fictionRoster: Map<string, FictionRosterItem>): Material {
  const fiction = fictionRoster.get(r.slug)
  return {
    name: r.nickname,
    bio: r.bio ?? '',
    era: [r.birth_date, r.death_date].filter(Boolean).join(' ~ '),
    origin: MODE === 'improve' ? (r.virtual_monologue ?? '') : '',
    fiction: Boolean(fiction),
    work: FICTION_EPISODE ?? '',
    orientation: fiction
      ? [fiction.epithet, ...(fiction.lines ?? []), fiction.quoteOrigin]
        .filter(Boolean).join(' | ')
      : '',
  }
}

async function run() {
  if (!FICTION_EPISODE && !SLUGS && LIMIT === Infinity) {
    throw new Error('안전 중단: --slugs 또는 유한한 --limit을 지정해야 한다. 전량 무검토 생성을 금지한다.')
  }

  const all = await loadAll()
  const fictionRoster = loadFictionRoster()
  let targets = all.filter((r) => {
    if (!r.bio || r.status !== 'active' || (SLUGS && !SLUGS.has(r.slug))) return false
    if (FICTION_EPISODE) {
      return r.celeb_tier === 'fiction' && fictionRoster.has(r.slug) && !r.virtual_monologue
    }
    // relation과 fiction은 기본 실존 배치에 섞지 않는다. fiction은 반드시 에피소드로 진입한다.
    return (r.celeb_tier === 'light' || r.celeb_tier === 'full')
      && (!NO_FORCE || !r.virtual_monologue)
  })

  if (SLUGS) {
    const found = new Set(targets.map((r) => r.slug))
    const missing = [...SLUGS].filter((slug) => !found.has(slug))
    if (missing.length) throw new Error(`대상에서 찾지 못한 slug: ${missing.join(', ')}`)
  }

  if (RESUME && !WRITE_MISSING && existsSync(DONE_LOG)) {
    const done = new Set(readFileSync(DONE_LOG, 'utf-8').split('\n').map((s) => s.trim()).filter(Boolean))
    const before = targets.length
    targets = targets.filter((r) => !done.has(r.slug))
    console.log(`이어서 처리: 이미 끝낸 ${before - targets.length}명 건너뜀`)
  } else if (!WRITE_MISSING && !RESUME && !PLAN_ONLY) {
    writeFileSync(DONE_LOG, '') // 새 회차 시작
    writeFileSync(CANDIDATES_LOG, '')
  }
  if (LIMIT !== Infinity) targets = targets.slice(0, LIMIT)

  const scope = FICTION_EPISODE ? `fiction ${FICTION_EPISODE} | 빈 독백만` : '실존 full/light'
  console.log(`셀럽 ${all.length} | ${scope} | 대상 ${targets.length} | 모델 ${MODEL} | 모드 ${MODE} | 독립 릴레이 ${CONCURRENCY}개${NO_FORCE ? ' | 독백 없는 인물만' : ''} | ${WRITE_MISSING ? 'DB 빈 값 조건부 쓰기' : 'DB 쓰기 0건'}`)
  if (PLAN_ONLY) {
    for (const target of targets) console.log(`PLAN ${target.slug} ${target.nickname}`)
    return
  }

  let done = 0, ok = 0, fail = 0, rateHit = 0
  const laneCount = Math.min(CONCURRENCY, targets.length)
  // 고정 레인별 독립 릴레이: 레인마다 자기 명단을 순서대로 처리한다. 공유 인덱스,
  // Promise.race, 작업 탈취가 없으므로 한 레인의 성공·실패가 다른 레인을 취소하지 않는다.
  const lanes = Array.from({ length: laneCount }, () => [] as Row[])
  targets.forEach((target, index) => lanes[index % laneCount].push(target))
  async function runLane(laneIndex: number, laneTargets: Row[]) {
    for (const r of laneTargets) {
      const t0 = Date.now()
      try {
        const before = r.virtual_monologue?.length ?? 0
        const g = await generate(r.slug, materialOf(r, fictionRoster))
        const record = {
          schemaVersion: 2,
          generatedAt: new Date().toISOString(),
          promptVersion: PROMPT_VERSION,
          model: MODEL,
          mode: MODE,
          profileType: FICTION_EPISODE ? 'fiction' : 'real',
          episode: FICTION_EPISODE,
          slug: r.slug,
          nickname: r.nickname,
          currentText: r.virtual_monologue ?? '',
          currentHash: sha256(r.virtual_monologue ?? ''),
          materials: g.materials,
          voicePlan: g.voicePlan,
          draftText: null,
          candidateText: g.final,
          candidateHash: sha256(g.final),
          status: WRITE_MISSING ? 'publish-pending' : 'draft',
        }
        if (!WRITE_MISSING) appendFileSync(CANDIDATES_LOG, `${JSON.stringify(record)}\n`)
        const publishResult = WRITE_MISSING
          ? await publishIfStillMissing(r.slug, g.final)
          : null
        if (!WRITE_MISSING) appendFileSync(DONE_LOG, `${r.slug}\n`)
        ok++
        console.log(`✓ 레인 ${laneIndex + 1} | ${r.nickname} (${before ? `${before}→` : ''}최종 ${g.final.length}자, ${Math.round((Date.now() - t0) / 1000)}s${publishResult ? `, DB ${publishResult}` : ''})`)
      } catch (e) {
        fail++
        const msg = (e as Error).message || ''
        if (/rate|limit|quota|429|usage/i.test(msg)) { rateHit++; console.error(`⏳ 레인 ${laneIndex + 1} | ${r.nickname}: RATE LIMIT 의심 — ${msg.slice(0, 200)}`) }
        else console.error(`✗ 레인 ${laneIndex + 1} | ${r.nickname}: ${msg.slice(0, 200)}`)
      } finally {
        done++
        if (done % 10 === 0 || done === targets.length) {
          console.log(`  진행 ${done}/${targets.length} (성공 ${ok} / 실패 ${fail}${rateHit ? ` / rate ${rateHit}` : ''})`)
        }
      }
    }
  }
  await Promise.all(lanes.map((lane, index) => runLane(index, lane)))

  console.log(`\n완료. 후보 ${ok} / 실패 ${fail}${rateHit ? ` / rate limit 의심 ${rateHit}` : ''}`)
  if (!WRITE_MISSING) console.log(`후보 파일: ${CANDIDATES_LOG}`)
  if (fail > 0) {
    console.log('※ --resume 으로 재실행하면 못 끝낸 인물만 이어서 처리한다.')
    process.exitCode = 2
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
