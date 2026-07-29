/**
 * 검증된 셀럽 대사 배치 JSON을 celeb_dialogues에 안전하게 반영한다.
 *
 * - 기본은 dry-run이다. --apply에서만 쓴다.
 * - 유튜브 업로드 팩션 출연자는 일괄 차단한다.
 * - 기존 quote와 greeting 3줄은 바이트 단위로 일치해야 하며 그대로 보존한다.
 * - 새로 채우는 문장에는 ELE 발화 지시 태그를 허용하지 않는다.
 * - 이미 채워진 슬롯은 같은 문장인지 대조하고 절대 덮어쓰지 않는다.
 * - fillKo/fillEn과 상황 키는 결손이 있는 부분만 넣어도 된다.
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
  nicknameEn: string
  /** 조사 후보에는 남기되 실제 반영에서는 제외할 때 사유를 기록한다. */
  skipReason?: string
  /** 익명·필명 인물은 생년을 알 수 없어 null/빈 문자열일 수 있다. DB 값과 정확히 대조한다. */
  birthDate: string | null
  profession: string
  quote: string
  quoteEn: string
  /** 현재 DB greeting이 4줄 이상인 구조 파손을 정리할 때만 쓴다. 최종 greeting은 아래 3줄이다. */
  currentGreetingKo?: string[]
  currentGreetingEn?: string[]
  greetingKo: Triple
  greetingEn: Triple
  fillKo?: FillLines
  fillEn?: FillLines
  sources: string[]
}

type BatchFile = {
  batch: string
  targets: BatchTarget[]
}

type ProfileRow = {
  id: string
  slug: string
  nickname: string
  nickname_en: string
  birth_date: string | null
  profession: string | null
}

type DialogueRow = {
  celeb_id: string
  lines: unknown
  lines_en: unknown
  updated_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sameDialogue(value: unknown, expected: DialogueLines): boolean {
  if (!isRecord(value)) return false
  return SITUATIONS.every(key => JSON.stringify(value[key]) === JSON.stringify(expected[key]))
}

function validateStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || !value.length || value.some(line => typeof line !== 'string' || !line.trim())) {
    throw new Error(`${label}: 비어 있지 않은 문자열 배열이 아님`)
  }
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
    for (const field of ['id', 'slug', 'nickname', 'nicknameEn', 'profession', 'quote', 'quoteEn'] as const) {
      if (!target[field]?.trim()) throw new Error(`${target.nickname || target.id}.${field}: 빈 값`)
    }
    if (target.birthDate !== null && typeof target.birthDate !== 'string') {
      throw new Error(`${target.nickname || target.id}.birthDate: 문자열 또는 null이어야 함`)
    }
    const currentGreetingKo = target.currentGreetingKo ?? target.greetingKo
    const currentGreetingEn = target.currentGreetingEn ?? target.greetingEn
    validateStringArray(currentGreetingKo, `${target.nickname}.currentGreetingKo`)
    validateStringArray(currentGreetingEn, `${target.nickname}.currentGreetingEn`)
    validateTriple(target.greetingKo, `${target.nickname}.greetingKo`, 'all')
    validateTriple(target.greetingEn, `${target.nickname}.greetingEn`, 'all')
    if (!target.fillKo && !target.fillEn) {
      throw new Error(`${target.nickname}: fillKo와 fillEn이 모두 없음`)
    }
    const preservedTaggedKo = new Set(currentGreetingKo.filter(line => !target.greetingKo.includes(line)))
    const preservedTaggedEn = new Set(currentGreetingEn.filter(line => !target.greetingEn.includes(line)))
    for (const situation of FILL_SITUATIONS) {
      const fillKo = target.fillKo?.[situation]
      const fillEn = target.fillEn?.[situation]
      if (fillKo) validateTriple(fillKo, `${target.nickname}.fillKo.${situation}`, preservedTaggedKo)
      if (fillEn) validateTriple(fillEn, `${target.nickname}.fillEn.${situation}`, preservedTaggedEn)
    }
    if (!Array.isArray(target.sources) || !target.sources.length
      || target.sources.some(source => !/^https?:\/\//.test(source))) {
      throw new Error(`${target.nickname}.sources: 출처 URL 없음`)
    }
  }
}

function assertCurrentBase(target: BatchTarget, lines: Record<string, unknown>, linesEn: Record<string, unknown>) {
  if (lines.quote !== target.quote || linesEn.quote !== target.quoteEn) {
    throw new Error(`${target.nickname}: 기존 대표 어록이 배치 기준과 다름`)
  }
  if (JSON.stringify(lines.greeting) !== JSON.stringify(target.currentGreetingKo ?? target.greetingKo)
    || JSON.stringify(linesEn.greeting) !== JSON.stringify(target.currentGreetingEn ?? target.greetingEn)) {
    throw new Error(`${target.nickname}: 기존 greeting이 배치 기준과 다름`)
  }
  if (lines.answer !== undefined || linesEn.answer !== undefined) {
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

async function assertNoneUploaded(ids: string[]) {
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

  const { data: protectedPeople, error: peopleError } = await db
    .from('faction_people')
    .select('celeb_id, name')
    .in('cluster_id', (clusters ?? []).map(row => row.id as string))
    .in('celeb_id', ids)
  if (peopleError) throw new Error(`업로드 출연자 조회 실패: ${peopleError.message}`)
  if ((protectedPeople ?? []).length) {
    throw new Error(`업로드 팩션 출연자 보호: ${(protectedPeople ?? []).map(row => row.name).join(', ')}`)
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
  await assertNoneUploaded(targets.map(target => target.id))

  const ids = targets.map(target => target.id)
  const { data: profileData, error: profileError } = await db
    .from('profiles')
    .select('id, slug, nickname, nickname_en, birth_date, profession')
    .in('id', ids)
  if (profileError) throw new Error(`프로필 조회 실패: ${profileError.message}`)

  const { data: dialogueData, error: dialogueError } = await db
    .from('celeb_dialogues')
    .select('celeb_id, lines, lines_en, updated_at')
    .in('celeb_id', ids)
  if (dialogueError) throw new Error(`대사 조회 실패: ${dialogueError.message}`)

  const profiles = new Map((profileData as unknown as ProfileRow[]).map(row => [row.id, row]))
  const dialogues = new Map((dialogueData as unknown as DialogueRow[]).map(row => [row.celeb_id, row]))
  const work: Array<{
    target: BatchTarget
    dialogue: DialogueRow
    currentLines: Record<string, unknown>
    currentLinesEn: Record<string, unknown>
    lines: DialogueLines
    linesEn: DialogueLines
  }> = []

  for (const target of targets) {
    const profile = profiles.get(target.id)
    if (!profile
      || profile.slug !== target.slug
      || profile.nickname !== target.nickname
      || profile.nickname_en !== target.nicknameEn
      || profile.birth_date !== target.birthDate
      || profile.profession !== target.profession) {
      throw new Error(`${target.nickname}: 동명이인 차단 실패 ${JSON.stringify(profile)}`)
    }

    const dialogue = dialogues.get(target.id)
    if (!dialogue) throw new Error(`${target.nickname}: celeb_dialogues 행 없음`)
    const currentLines = isRecord(dialogue.lines) ? dialogue.lines : {}
    const currentLinesEn = isRecord(dialogue.lines_en) ? dialogue.lines_en : {}
    assertCurrentBase(target, currentLines, currentLinesEn)

    const currentGreetingKo = target.currentGreetingKo ?? target.greetingKo
    const currentGreetingEn = target.currentGreetingEn ?? target.greetingEn
    const preservedTaggedKo = new Set(currentGreetingKo.filter(line => !target.greetingKo.includes(line)))
    const preservedTaggedEn = new Set(currentGreetingEn.filter(line => !target.greetingEn.includes(line)))
    const lines = buildMergedLines(
      target.greetingKo,
      currentLines,
      target.fillKo,
      `${target.nickname}.KO`,
      preservedTaggedKo,
    )
    const linesEn = buildMergedLines(
      target.greetingEn,
      currentLinesEn,
      target.fillEn,
      `${target.nickname}.EN`,
      preservedTaggedEn,
    )
    validateCompleteDialogue(lines, `${target.nickname}.KO`)
    validateCompleteDialogue(linesEn, `${target.nickname}.EN`)

    const alreadyDone = currentLines.quote === target.quote
      && currentLinesEn.quote === target.quoteEn
      && sameDialogue(currentLines, lines)
      && sameDialogue(currentLinesEn, linesEn)
    if (alreadyDone) {
      console.log(`SKIP ${target.nickname}: KO/EN 21줄 이미 일치`)
      continue
    }

    work.push({ target, dialogue, currentLines, currentLinesEn, lines, linesEn })
    console.log(`PLAN ${target.nickname}: 기존 대사·greeting·태그 보존, 빈 슬롯만 보완`)
  }

  if (!apply) {
    console.log(`DRY-RUN ${batch.batch}: 쓰기 0건 · 적용 예정 ${work.length}명`)
    return
  }

  for (const item of work) {
    const { target, dialogue, currentLines, currentLinesEn, lines, linesEn } = item
    const { data: changed, error: updateError } = await db
      .from('celeb_dialogues')
      .update({
        lines: { ...currentLines, quote: target.quote, ...lines },
        lines_en: { ...currentLinesEn, quote: target.quoteEn, ...linesEn },
      })
      .eq('celeb_id', target.id)
      .eq('updated_at', dialogue.updated_at)
      .select('celeb_id, lines, lines_en')
      .maybeSingle()
    if (updateError) throw new Error(`${target.nickname}: 대사 갱신 실패 ${updateError.message}`)
    if (!changed) throw new Error(`${target.nickname}: 대사 갱신 충돌`)
    if (!sameDialogue(changed.lines, lines) || !sameDialogue(changed.lines_en, linesEn)) {
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
