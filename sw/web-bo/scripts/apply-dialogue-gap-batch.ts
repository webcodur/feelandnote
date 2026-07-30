/**
 * 검증된 셀럽 대사 배치 JSON을 celeb_dialogues에 안전하게 반영한다.
 *
 * - 기본은 dry-run이다. --apply에서만 쓴다.
 * - 팩션 영상 출연 여부와 무관하게 개인 대사만 다룬다.
 * - 기존 한국어 quote와 greeting 3줄은 바이트 단위로 일치해야 하며 그대로 보존한다.
 * - 새로 채우는 문장에는 ELE 발화 지시 태그를 허용하지 않는다.
 * - 이미 채워진 슬롯은 같은 문장인지 대조하고 절대 덮어쓰지 않는다.
 * - 한국어 빈 슬롯만 채우며 lines_en은 읽거나 쓰지 않는다.
 *
 * 실행:
 *   pnpm exec tsx scripts/apply-dialogue-gap-batch.ts <batch.json>
 *   pnpm exec tsx scripts/apply-dialogue-gap-batch.ts <batch.json> --apply
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { revalidateWebCache } from '../src/lib/revalidate-web'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SITUATIONS = [
  'greeting',
  'roll_call',
  'deploy',
  'battle_win',
  'battle_draw',
  'battle_lose',
  'clash_attack',
] as const
const FILL_SITUATIONS = SITUATIONS.filter(key => key !== 'greeting')

type Situation = typeof SITUATIONS[number]
type FillSituation = Exclude<Situation, 'greeting'>
type Triple = [string, string, string]
type DialogueLines = Record<Situation, Triple>
type FillLines = Partial<Record<FillSituation, Triple>>

type BatchTarget = {
  id: string
  slug: string
  nickname: string
  /** 조사 후보에는 남기되 실제 반영에서는 제외할 때 사유를 기록한다. */
  skipReason?: string
  /** 익명·필명 인물은 생년을 알 수 없어 null/빈 문자열일 수 있다. DB 값과 정확히 대조한다. */
  birthDate: string | null
  profession: string
  quote: string
  /** 현재 DB greeting의 exact 잠금. 전부 비었으면 null, 생략하면 greetingKo와 같다고 본다. */
  currentGreetingKo?: string[] | null
  greetingKo: Triple
  fillKo?: FillLines
}

type BatchFile = {
  batch: string
  targets: BatchTarget[]
}

type ProfileRow = {
  id: string
  slug: string
  nickname: string
  birth_date: string | null
  profession: string | null
}

type DialogueRow = {
  celeb_id: string
  lines: unknown
  updated_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sameDialogue(value: unknown, expected: DialogueLines): boolean {
  if (!isRecord(value)) return false
  return SITUATIONS.every(key => JSON.stringify(value[key]) === JSON.stringify(expected[key]))
}

function validateTriple(
  value: unknown,
  label: string,
  allowedTaggedLines: 'all' | ReadonlySet<string>,
): asserts value is Triple {
  if (!Array.isArray(value) || value.length !== 3 || value.some(line => typeof line !== 'string' || !line.trim())) {
    throw new Error(`${label}: 비어 있지 않은 문자열 3개가 아님`)
  }
  for (const line of value) {
    if (/^\s*\[[^\]]+\]/.test(line)
      && allowedTaggedLines !== 'all'
      && !allowedTaggedLines.has(line)) {
      throw new Error(`${label}: 새 ELE 발화 지시 태그 금지`)
    }
    if (allowedTaggedLines !== 'all' && line.includes('—')) {
      throw new Error(`${label}: 새 대사 em dash 금지`)
    }
  }
}

function validateBatch(batch: BatchFile) {
  if (!batch.batch?.trim() || !Array.isArray(batch.targets) || !batch.targets.length) {
    throw new Error('batch 이름 또는 targets 없음')
  }
  if (new Set(batch.targets.map(target => target.id)).size !== batch.targets.length) {
    throw new Error('배치 안에 중복 celeb id가 있음')
  }

  for (const target of batch.targets) {
    for (const field of ['id', 'slug', 'nickname', 'profession', 'quote'] as const) {
      if (!target[field]?.trim()) throw new Error(`${target.nickname || target.id}.${field}: 빈 값`)
    }
    if (target.birthDate !== null && typeof target.birthDate !== 'string') {
      throw new Error(`${target.nickname || target.id}.birthDate: 문자열 또는 null이어야 함`)
    }
    const currentGreetingKo = target.currentGreetingKo === undefined
      ? target.greetingKo
      : target.currentGreetingKo
    if (currentGreetingKo !== null) {
      if (!Array.isArray(currentGreetingKo)
        || currentGreetingKo.some(line => typeof line !== 'string')) {
        throw new Error(`${target.nickname}.currentGreetingKo: 문자열 배열 또는 null이 아님`)
      }
    }
    validateTriple(target.greetingKo, `${target.nickname}.greetingKo`, 'all')
    if (!target.fillKo) {
      throw new Error(`${target.nickname}: fillKo 없음`)
    }
    const preservedTaggedKo = new Set((currentGreetingKo ?? []).filter(line => !target.greetingKo.includes(line)))
    for (const situation of FILL_SITUATIONS) {
      const fillKo = target.fillKo?.[situation]
      if (fillKo) validateTriple(fillKo, `${target.nickname}.fillKo.${situation}`, preservedTaggedKo)
    }
  }
}

function assertCurrentBase(target: BatchTarget, lines: Record<string, unknown>) {
  if (lines.quote !== target.quote) {
    throw new Error(`${target.nickname}: 기존 대표 어록이 배치 기준과 다름`)
  }
  const expectedGreeting = target.currentGreetingKo === undefined
    ? target.greetingKo
    : target.currentGreetingKo
  const actualGreeting = lines.greeting === undefined ? null : lines.greeting
  const greetingMatchesBase = JSON.stringify(actualGreeting) === JSON.stringify(expectedGreeting)
  const greetingMatchesApplied = JSON.stringify(actualGreeting) === JSON.stringify(target.greetingKo)
  if (!greetingMatchesBase && !greetingMatchesApplied) {
    throw new Error(`${target.nickname}: 기존 greeting이 배치 기준과 다름`)
  }
  if (lines.answer !== undefined) {
    throw new Error(`${target.nickname}: 폐기된 answer 필드가 있어 수동 검토 필요`)
  }
}

function normalizeCurrentTriple(value: unknown, label: string): [string, string, string] {
  if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
    return ['', '', '']
  }
  if (!Array.isArray(value) || value.length !== 3 || value.some(line => typeof line !== 'string')) {
    throw new Error(`${label}: 기존 값이 문자열 3개 배열이 아님`)
  }
  return value as [string, string, string]
}

function mergeTriple(
  currentValue: unknown,
  proposed: Triple | undefined,
  label: string,
  preservedTaggedLines: ReadonlySet<string>,
): Triple {
  const current = normalizeCurrentTriple(currentValue, label)
  if (!proposed) {
    if (current.some(line => !line.trim())) {
      throw new Error(`${label}: 빈 슬롯이 있으나 배치 보완값이 없음`)
    }
    return current
  }

  const merged = current.map((line, index) => {
    const next = proposed[index]
    if (line.trim()) {
      if (line !== next) {
        throw new Error(`${label}[${index}]: 기존 대사 덮어쓰기 차단`)
      }
      return line
    }
    if (/^\s*\[[^\]]+\]/.test(next) && !preservedTaggedLines.has(next)) {
      throw new Error(`${label}[${index}]: 새 ELE 발화 지시 태그 금지`)
    }
    if (next.includes('—')) {
      throw new Error(`${label}[${index}]: 새 대사 em dash 금지`)
    }
    return next
  }) as Triple

  if (merged.some(line => !line.trim())) {
    throw new Error(`${label}: 병합 뒤 빈 슬롯 잔존`)
  }
  return merged
}

function buildMergedLines(
  greeting: Triple,
  current: Record<string, unknown>,
  fill: FillLines | undefined,
  label: string,
  preservedTaggedLines: ReadonlySet<string>,
): DialogueLines {
  const result = { greeting } as DialogueLines
  for (const situation of FILL_SITUATIONS) {
    result[situation] = mergeTriple(
      current[situation],
      fill?.[situation],
      `${label}.${situation}`,
      preservedTaggedLines,
    )
  }
  return result
}

function validateCompleteDialogue(lines: DialogueLines, label: string) {
  const normalized = SITUATIONS.flatMap(situation => lines[situation])
    .map(line => line.replace(/^\s*\[[^\]]+\]\s*/, '').trim().toLocaleLowerCase())
  if (normalized.some(line => !line)) {
    throw new Error(`${label}: 21줄 안에 빈 대사`)
  }
  if (new Set(normalized).size !== 21) {
    throw new Error(`${label}: 21줄 안에 중복 대사`)
  }
}

async function main() {
  const batchArg = process.argv.slice(2).find(arg => !arg.startsWith('--'))
  if (!batchArg) throw new Error('배치 JSON 경로를 지정해야 함')

  const batchPath = path.resolve(process.cwd(), batchArg)
  const batch = JSON.parse(await readFile(batchPath, 'utf8')) as BatchFile
  const apply = process.argv.includes('--apply')

  validateBatch(batch)
  const targets = batch.targets.filter(target => !target.skipReason)
  for (const target of batch.targets.filter(target => target.skipReason)) {
    console.log(`EXCLUDE ${target.nickname}: ${target.skipReason}`)
  }
  if (!targets.length) throw new Error('제외되지 않은 적용 대상 없음')

  const ids = targets.map(target => target.id)
  const { data: profileData, error: profileError } = await db
    .from('profiles')
    .select('id, slug, nickname, birth_date, profession')
    .in('id', ids)
  if (profileError) throw new Error(`프로필 조회 실패: ${profileError.message}`)

  const { data: dialogueData, error: dialogueError } = await db
    .from('celeb_dialogues')
    .select('celeb_id, lines, updated_at')
    .in('celeb_id', ids)
  if (dialogueError) throw new Error(`대사 조회 실패: ${dialogueError.message}`)

  const profiles = new Map((profileData as unknown as ProfileRow[]).map(row => [row.id, row]))
  const dialogues = new Map((dialogueData as unknown as DialogueRow[]).map(row => [row.celeb_id, row]))
  const work: Array<{
    target: BatchTarget
    dialogue: DialogueRow
    currentLines: Record<string, unknown>
    lines: DialogueLines
  }> = []

  for (const target of targets) {
    const profile = profiles.get(target.id)
    if (!profile
      || profile.slug !== target.slug
      || profile.nickname !== target.nickname
      || profile.birth_date !== target.birthDate
      || profile.profession !== target.profession) {
      throw new Error(`${target.nickname}: 동명이인 차단 실패 ${JSON.stringify(profile)}`)
    }

    const dialogue = dialogues.get(target.id)
    if (!dialogue) throw new Error(`${target.nickname}: celeb_dialogues 행 없음`)
    const currentLines = isRecord(dialogue.lines) ? dialogue.lines : {}
    assertCurrentBase(target, currentLines)

    const currentGreetingKo = target.currentGreetingKo === undefined
      ? target.greetingKo
      : target.currentGreetingKo
    const preservedTaggedKo = new Set((currentGreetingKo ?? []).filter(line => !target.greetingKo.includes(line)))
    const lines = buildMergedLines(
      target.greetingKo,
      currentLines,
      target.fillKo,
      `${target.nickname}.KO`,
      preservedTaggedKo,
    )
    validateCompleteDialogue(lines, `${target.nickname}.KO`)

    const alreadyDone = currentLines.quote === target.quote
      && sameDialogue(currentLines, lines)
    if (alreadyDone) {
      console.log(`SKIP ${target.nickname}: KO 21줄 이미 일치`)
      continue
    }

    work.push({ target, dialogue, currentLines, lines })
    console.log(`PLAN ${target.nickname}: 기존 대사·greeting·태그 보존, 빈 슬롯만 보완`)
  }

  if (!apply) {
    console.log(`DRY-RUN ${batch.batch}: 쓰기 0건 · 적용 예정 ${work.length}명`)
    return
  }

  for (const item of work) {
    const { target, dialogue, currentLines, lines } = item
    const { data: changed, error: updateError } = await db
      .from('celeb_dialogues')
      .update({
        lines: { ...currentLines, quote: target.quote, ...lines },
      })
      .eq('celeb_id', target.id)
      .eq('updated_at', dialogue.updated_at)
      .select('celeb_id, lines')
      .maybeSingle()
    if (updateError) throw new Error(`${target.nickname}: 대사 갱신 실패 ${updateError.message}`)
    if (!changed) throw new Error(`${target.nickname}: 대사 갱신 충돌`)
    if (!sameDialogue(changed.lines, lines)) {
      throw new Error(`${target.nickname}: 갱신 후 21줄 검증 실패`)
    }
    console.log(`APPLIED ${target.nickname}: 기존 대사·greeting·태그 보존, 빈 슬롯만 보완`)
  }

  if (work.length) {
    await revalidateWebCache(CACHE_TAGS.DIALOGUES)
    console.log('CACHE dialogues: 무효화 요청 완료')
  }
  console.log(`DONE ${batch.batch}: ${work.length}명 반영`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
