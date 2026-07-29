/**
 * 한국어 21줄은 완성됐지만 영문 18줄이 전부 빈 셀럽의 번역 후보 배치를 만든다.
 *
 * - Claude Sonnet 구독 CLI를 사용하며 DB에는 쓰지 않는다.
 * - 기존 quote/greeting/ELE 태그는 후보 배치에 현재값 그대로 잠근다.
 * - 신규 영문 18줄에는 ELE 태그를 만들거나 복제하지 않는다.
 * - 산출물은 apply-dialogue-gap-batch.ts의 dry-run 검증을 다시 통과해야 한다.
 *
 * 실행:
 *   pnpm exec tsx scripts/generate-dialogue-en-backfill-candidates.ts --slugs alex-ferguson,lewis-hamilton --out .tmp-dialogue-en-backfill/candidate.json
 *   pnpm exec tsx scripts/generate-dialogue-en-backfill-candidates.ts --list --limit 30
 *   pnpm exec tsx scripts/generate-dialogue-en-backfill-candidates.ts --limit 10 --conc 3
 */

import { spawn, execSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SITUATIONS = [
  'roll_call',
  'deploy',
  'battle_win',
  'battle_draw',
  'battle_lose',
  'clash_attack',
] as const

type Situation = typeof SITUATIONS[number]
type Triple = [string, string, string]
type FillLines = Record<Situation, Triple>
type ProfileRow = {
  id: string
  slug: string
  nickname: string
  nickname_en: string
  birth_date: string | null
  profession: string | null
  speech_tone: string | null
  celeb_tier: string | null
  status: string | null
}
type DialogueRow = {
  celeb_id: string
  lines: unknown
  lines_en: unknown
}

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const limit = Number.parseInt(argValue('--limit') ?? '', 10)
const concurrency = Math.max(1, Number.parseInt(argValue('--conc') ?? '3', 10))
const selectedSlugs = argValue('--slugs')
  ?.split(',')
  .map(slug => slug.trim())
  .filter(Boolean) ?? null
const excludedSlugs = new Set(argValue('--exclude-slugs')
  ?.split(',')
  .map(slug => slug.trim())
  .filter(Boolean) ?? [])
const listOnly = process.argv.includes('--list')
const outputPath = path.resolve(
  process.cwd(),
  argValue('--out') ?? `.tmp-dialogue-en-backfill/candidate-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function exactTriple(value: unknown): Triple | null {
  if (!Array.isArray(value)
    || value.length !== 3
    || value.some(line => typeof line !== 'string')) {
    return null
  }
  return value as Triple
}

function isComplete(value: unknown): value is Triple {
  const triple = exactTriple(value)
  return Boolean(triple && triple.every(line => line.trim()))
}

function isAllBlank(value: unknown): value is Triple {
  const triple = exactTriple(value)
  return Boolean(triple && triple.every(line => !line.trim()))
}

function stripVoiceTag(line: string): string {
  return line.replace(/^\s*\[[^\]]+\]\s*/, '').trim()
}

function buildPrompt(profile: ProfileRow, ko: Record<string, unknown>): string {
  const source = Object.fromEntries(
    SITUATIONS.map(situation => [situation, (ko[situation] as Triple).map(stripVoiceTag)]),
  )

  return `Translate the following Korean game and website dialogue lines into natural English.

The speaker is ${profile.nickname_en} (${profile.nickname}), profession: ${profile.profession ?? 'unknown'}, dialogue tone: ${profile.speech_tone ?? 'unspecified'}.

[Korean source JSON]
${JSON.stringify(source, null, 2)}

[Requirements]
- Return exactly one JSON object with the same six keys and exactly three strings under each key.
- Translate the meaning of every source line. Do not add facts, names, events, achievements, or interpretations that are absent from that line.
- Make each line sound as if it was originally written in spoken English. Avoid Korean word order and stiff literal translation.
- Preserve the situation: roll_call is an entrance, deploy is an instruction or commitment, battle_win explains a win, battle_draw remains unresolved, battle_lose admits a concrete loss, and clash_attack challenges an opponent.
- Keep the speaker's distinct field vocabulary and degree of formality. Do not turn every line into generic motivation.
- The bracketed voice directions were removed before this prompt because they are user-owned ELE voice data. Never recreate, infer, copy, or output any bracketed tag.
- Never use an em dash.
- Do not output Korean or Chinese characters.
- Do not wrap the JSON in Markdown fences. Do not add commentary.
- Before answering, independently reread once for meaning fidelity and once for natural English and situation fit.`
}

let claudeBinary: string | null = null
function claudeBin(): string {
  if (claudeBinary) return claudeBinary
  try {
    const found = execSync(process.platform === 'win32' ? 'where claude' : 'which claude', { encoding: 'utf8' })
      .split(/\r?\n/)
      .map(value => value.trim())
      .filter(Boolean)
    const binary = found.find(value => value.toLowerCase().endsWith('.cmd')) ?? found[0] ?? 'claude'
    claudeBinary = /\s/.test(binary) ? `"${binary}"` : binary
  } catch {
    claudeBinary = 'claude'
  }
  return claudeBinary
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      claudeBin(),
      ['-p', '--model', 'sonnet', '--output-format', 'text'],
      { shell: true, timeout: 300_000 },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk.toString() })
    child.stderr.on('data', chunk => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve(stdout.trim())
      else reject(new Error(`claude exit ${code}: ${stderr.slice(0, 500)}`))
    })
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

function parseCandidate(raw: string, nickname: string): FillLines {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  const parsed = JSON.parse(cleaned) as unknown
  if (!isRecord(parsed)
    || Object.keys(parsed).length !== SITUATIONS.length
    || Object.keys(parsed).some(key => !SITUATIONS.includes(key as Situation))) {
    throw new Error(`${nickname}: 상황 키 구조 오류`)
  }

  const result = {} as FillLines
  for (const situation of SITUATIONS) {
    const value = exactTriple(parsed[situation])
    if (!value || value.some(line => !line.trim())) {
      throw new Error(`${nickname}.${situation}: 문자열 3개가 아님`)
    }
    for (const line of value) {
      if (/^\s*\[[^\]]+\]/.test(line)) throw new Error(`${nickname}.${situation}: 신규 ELE 태그`)
      if (line.includes('—')) throw new Error(`${nickname}.${situation}: em dash`)
      if (/[가-힣一-鿿]/.test(line)) throw new Error(`${nickname}.${situation}: 한글·한자 잔존`)
    }
    result[situation] = value
  }

  const normalized = SITUATIONS.flatMap(situation => result[situation])
    .map(line => line.trim().toLocaleLowerCase())
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`${nickname}: 신규 영문 18줄 안에 완전 중복`)
  }
  return result
}

async function allRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999)
    if (error) throw new Error(error.message)
    const page = (data ?? []) as T[]
    rows.push(...page)
    if (page.length < 1000) break
  }
  return rows
}

async function main() {
  const protectedCelebIdsPromise = (async () => {
    const lineupPath = path.resolve(process.cwd(), '../remotion/scripts/youtube/faction-lineup.json')
    const lineup = JSON.parse(await readFile(lineupPath, 'utf8')) as Record<string, { uploads?: Record<string, unknown> }>
    const uploadedFolders = Object.entries(lineup)
      .filter(([, value]) => Object.keys(value.uploads ?? {}).length)
      .map(([folder]) => folder)

    const { data: episodes, error: episodeError } = await db
      .from('faction_episodes')
      .select('id')
      .in('folder', uploadedFolders)
    if (episodeError) throw new Error(`업로드 에피소드 조회 실패: ${episodeError.message}`)

    const { data: groups, error: groupError } = await db
      .from('faction_groups')
      .select('id')
      .in('episode_id', (episodes ?? []).map(row => row.id as string))
    if (groupError) throw new Error(`업로드 세력 조회 실패: ${groupError.message}`)

    const { data: clusters, error: clusterError } = await db
      .from('faction_clusters')
      .select('id')
      .in('group_id', (groups ?? []).map(row => row.id as string))
    if (clusterError) throw new Error(`업로드 클러스터 조회 실패: ${clusterError.message}`)

    const { data: people, error: peopleError } = await db
      .from('faction_people')
      .select('celeb_id')
      .in('cluster_id', (clusters ?? []).map(row => row.id as string))
    if (peopleError) throw new Error(`업로드 출연자 조회 실패: ${peopleError.message}`)
    return new Set((people ?? []).map(row => row.celeb_id as string).filter(Boolean))
  })()

  const [profiles, dialogues, protectedCelebIds] = await Promise.all([
    allRows<ProfileRow>((from, to) => db
      .from('profiles')
      .select('id,slug,nickname,nickname_en,birth_date,profession,speech_tone,celeb_tier,status')
      .eq('profile_type', 'CELEB')
      .in('celeb_tier', ['full', 'light'])
      .eq('status', 'active')
      .order('id')
      .range(from, to)),
    allRows<DialogueRow>((from, to) => db
      .from('celeb_dialogues')
      .select('celeb_id,lines,lines_en')
      .order('celeb_id')
      .range(from, to)),
    protectedCelebIdsPromise,
  ])

  const profileById = new Map(profiles.map(profile => [profile.id, profile]))
  const candidates = dialogues.flatMap(dialogue => {
    const profile = profileById.get(dialogue.celeb_id)
    const ko = isRecord(dialogue.lines) ? dialogue.lines : null
    const en = isRecord(dialogue.lines_en) ? dialogue.lines_en : null
    if (!profile || protectedCelebIds.has(dialogue.celeb_id) || !ko || !en
      || typeof ko.quote !== 'string' || !ko.quote.trim()
      || typeof en.quote !== 'string' || !en.quote.trim()
      || !isComplete(ko.greeting) || !isComplete(en.greeting)
      || !SITUATIONS.every(situation => isComplete(ko[situation]) && isAllBlank(en[situation]))) {
      return []
    }
    return [{ profile, ko, en }]
  })
    .filter(candidate => !selectedSlugs || selectedSlugs.includes(candidate.profile.slug))
    .filter(candidate => !excludedSlugs.has(candidate.profile.slug))
    .sort((a, b) => a.profile.nickname.localeCompare(b.profile.nickname, 'ko'))

  if (selectedSlugs) {
    const found = new Set(candidates.map(candidate => candidate.profile.slug))
    const missing = selectedSlugs.filter(slug => !found.has(slug))
    if (missing.length) throw new Error(`선택 slug가 번역 전용 결손 대상이 아님: ${missing.join(', ')}`)
  }

  const targets = candidates.slice(0, Number.isFinite(limit) ? limit : undefined)
  if (!targets.length) throw new Error('번역 대상 없음')
  if (listOnly) {
    for (const target of targets) {
      console.log(`${target.profile.nickname}\t${target.profile.slug}\t${target.profile.id}`)
    }
    console.log(`영문 18줄 전결손 후보 ${candidates.length}명 · 목록 ${targets.length}명 · DB 쓰기 0건`)
    return
  }

  console.log(`영문 18줄 전결손 후보 ${candidates.length}명 · 이번 생성 ${targets.length}명 · 동시 ${concurrency}`)

  const generated = new Array<{
    profile: ProfileRow
    ko: Record<string, unknown>
    en: Record<string, unknown>
    fillEn: FillLines
  }>()

  for (let index = 0; index < targets.length; index += concurrency) {
    const group = targets.slice(index, index + concurrency)
    const groupResults = await Promise.all(group.map(async target => {
      const raw = await runClaude(buildPrompt(target.profile, target.ko))
      const fillEn = parseCandidate(raw, target.profile.nickname)
      console.log(`✓ ${target.profile.nickname}`)
      return { ...target, fillEn }
    }))
    generated.push(...groupResults)
    console.log(`  진행 ${generated.length}/${targets.length}`)
  }

  const batch = {
    batch: `generated-en-backfill-${new Date().toISOString().slice(0, 10)}`,
    translationOnly: true,
    targets: generated.map(({ profile, ko, en, fillEn }) => ({
      id: profile.id,
      slug: profile.slug,
      nickname: profile.nickname,
      nicknameEn: profile.nickname_en,
      birthDate: profile.birth_date,
      profession: profile.profession,
      quote: ko.quote,
      quoteEn: en.quote,
      greetingKo: ko.greeting,
      greetingEn: en.greeting,
      translationSourceKo: Object.fromEntries(
        SITUATIONS.map(situation => [situation, ko[situation]]),
      ),
      fillEn,
      sources: [`https://feelandnote.com/ko/celeb/${profile.slug}`],
    })),
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8')
  console.log(`후보 저장: ${outputPath}`)
  console.log('DB 쓰기 0건. apply-dialogue-gap-batch.ts dry-run과 내용 재독이 다음 단계다.')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
