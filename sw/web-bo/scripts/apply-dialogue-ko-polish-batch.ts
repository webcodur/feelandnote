/**
 * 공개 셀럽의 한국어 게임 대사를 기존값과 정확히 대조한 뒤 교정한다.
 *
 * - 기본은 dry-run이며 `--apply`에서만 저장한다.
 * - 유튜브 업로드 팩션 출연자는 일괄 차단한다.
 * - 영어 대사, greeting, quote, ELE 발화 지시는 건드리지 않는다.
 * - 배치의 expectedKo와 현재 DB가 한 글자라도 다르면 중단한다.
 *
 * 실행:
 *   pnpm exec tsx scripts/apply-dialogue-ko-polish-batch.ts <batch.json>
 *   pnpm exec tsx scripts/apply-dialogue-ko-polish-batch.ts <batch.json> --apply
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

const ALL_SITUATIONS = [
  'greeting',
  'roll_call',
  'deploy',
  'battle_win',
  'battle_draw',
  'battle_lose',
  'clash_attack',
] as const

const POLISH_SITUATIONS = ALL_SITUATIONS.filter(situation => situation !== 'greeting')
const KO_MAX_LENGTH: Record<PolishSituation, number> = {
  roll_call: 40,
  deploy: 35,
  battle_win: 40,
  battle_draw: 40,
  battle_lose: 40,
  clash_attack: 25,
}

type PolishSituation = typeof POLISH_SITUATIONS[number]
type Triple = [string, string, string]
type PolishLines = Partial<Record<PolishSituation, Triple>>

type PolishTarget = {
  id: string
  slug: string
  nickname: string
  birthDate: string | null
  profession: string
  expectedKo: PolishLines
  revisedKo: PolishLines
}

type PolishBatch = {
  batch: string
  targets: PolishTarget[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validateTriple(value: unknown, label: string): asserts value is Triple {
  if (!Array.isArray(value)
    || value.length !== 3
    || value.some(line => typeof line !== 'string' || !line.trim())) {
    throw new Error(`${label}: 비어 있지 않은 문자열 3개가 아님`)
  }
}

function elePrefix(line: string): string {
  return line.match(/^\s*\[[^\]]+\]\s*/)?.[0] ?? ''
}

function validateBatch(batch: PolishBatch) {
  if (!batch.batch?.trim() || !Array.isArray(batch.targets) || !batch.targets.length) {
    throw new Error('batch 이름 또는 targets 없음')
  }
  if (new Set(batch.targets.map(target => target.id)).size !== batch.targets.length) {
    throw new Error('배치 안에 중복 celeb id가 있음')
  }

  for (const target of batch.targets) {
    for (const field of ['id', 'slug', 'nickname', 'profession'] as const) {
      if (!target[field]?.trim()) throw new Error(`${target.nickname || target.id}.${field}: 빈 값`)
    }
    if (target.birthDate !== null && typeof target.birthDate !== 'string') {
      throw new Error(`${target.nickname}.birthDate: 문자열 또는 null이어야 함`)
    }

    const expectedKeys = Object.keys(target.expectedKo).sort()
    const revisedKeys = Object.keys(target.revisedKo).sort()
    if (!expectedKeys.length || JSON.stringify(expectedKeys) !== JSON.stringify(revisedKeys)) {
      throw new Error(`${target.nickname}: expectedKo와 revisedKo 상황 키가 다름`)
    }

    for (const situation of expectedKeys as PolishSituation[]) {
      const expected = target.expectedKo[situation]
      const revised = target.revisedKo[situation]
      validateTriple(expected, `${target.nickname}.expectedKo.${situation}`)
      validateTriple(revised, `${target.nickname}.revisedKo.${situation}`)
      for (let index = 0; index < 3; index += 1) {
        if (elePrefix(expected[index]) !== elePrefix(revised[index])) {
          throw new Error(`${target.nickname}.${situation}[${index}]: ELE 발화 지시 변경 금지`)
        }
        if (!expected[index].includes('—') && revised[index].includes('—')) {
          throw new Error(`${target.nickname}.${situation}[${index}]: 새 em dash 금지`)
        }
        const bodyLength = [...revised[index].replace(/^\s*\[[^\]]+\]\s*/, '')].length
        if (bodyLength > KO_MAX_LENGTH[situation]) {
          throw new Error(
            `${target.nickname}.${situation}[${index}]: ${bodyLength}자, ${KO_MAX_LENGTH[situation]}자 상한 초과`,
          )
        }
      }
    }
  }
}

function validateCompleteKo(lines: Record<string, unknown>, label: string) {
  const normalized: string[] = []
  for (const situation of ALL_SITUATIONS) {
    const value = lines[situation]
    validateTriple(value, `${label}.${situation}`)
    normalized.push(...value.map(line => line.replace(/^\s*\[[^\]]+\]\s*/, '').trim().toLocaleLowerCase()))
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
  const batch = JSON.parse(await readFile(batchPath, 'utf8')) as PolishBatch
  const apply = process.argv.includes('--apply')
  validateBatch(batch)
  await assertNoneUploaded(batch.targets.map(target => target.id))

  let changedPeople = 0
  let changedLines = 0

  for (const target of batch.targets) {
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, slug, nickname, birth_date, profession')
      .eq('id', target.id)
      .single()
    if (profileError) throw new Error(`${target.nickname}: 프로필 조회 실패: ${profileError.message}`)
    if (profile.slug !== target.slug
      || profile.nickname !== target.nickname
      || (profile.birth_date ?? null) !== target.birthDate
      || profile.profession !== target.profession) {
      throw new Error(`${target.nickname}: 동명이인 차단 실패: ${JSON.stringify(profile)}`)
    }

    const { data: dialogue, error: dialogueError } = await db
      .from('celeb_dialogues')
      .select('lines, lines_en')
      .eq('celeb_id', target.id)
      .single()
    if (dialogueError) throw new Error(`${target.nickname}: 대사 조회 실패: ${dialogueError.message}`)
    if (!isRecord(dialogue.lines)) throw new Error(`${target.nickname}: 한국어 대사 객체 없음`)

    const nextLines = { ...dialogue.lines }
    let targetChanges = 0
    for (const situation of Object.keys(target.expectedKo) as PolishSituation[]) {
      const current = dialogue.lines[situation]
      const expected = target.expectedKo[situation]
      const revised = target.revisedKo[situation]
      if (!expected || !revised) {
        throw new Error(`${target.nickname}.${situation}: 기준값 또는 교정값 누락`)
      }
      if (JSON.stringify(current) === JSON.stringify(revised)) continue
      if (JSON.stringify(current) !== JSON.stringify(expected)) {
        throw new Error(`${target.nickname}.${situation}: 현재 DB가 expectedKo와 다름`)
      }
      nextLines[situation] = revised
      targetChanges += revised.filter((line, index) => line !== expected[index]).length
    }
    validateCompleteKo(nextLines, target.nickname)

    if (!targetChanges) {
      console.log(`SKIP ${target.nickname}: 한국어 교정값 이미 일치`)
      continue
    }

    changedPeople += 1
    changedLines += targetChanges
    console.log(`${apply ? 'PLAN' : 'DRY-RUN'} ${target.nickname}: ${targetChanges}줄 교정`)
    if (!apply) continue

    const originalEnglish = JSON.stringify(dialogue.lines_en)
    const originalGreeting = JSON.stringify(dialogue.lines.greeting)
    const originalQuote = JSON.stringify(dialogue.lines.quote)
    const { data: saved, error: updateError } = await db
      .from('celeb_dialogues')
      .update({ lines: nextLines })
      .eq('celeb_id', target.id)
      .select('lines, lines_en')
      .single()
    if (updateError) throw new Error(`${target.nickname}: 한국어 대사 저장 실패: ${updateError.message}`)
    if (!isRecord(saved.lines)
      || JSON.stringify(saved.lines) !== JSON.stringify(nextLines)
      || JSON.stringify(saved.lines_en) !== originalEnglish
      || JSON.stringify(saved.lines.greeting) !== originalGreeting
      || JSON.stringify(saved.lines.quote) !== originalQuote) {
      throw new Error(`${target.nickname}: 저장 뒤 KO/EN·greeting·quote 불변 검증 실패`)
    }
    console.log(`APPLIED ${target.nickname}: 영어·greeting·quote·ELE 불변`)
  }

  if (apply && changedPeople) {
    await revalidateWebCache([CACHE_TAGS.DIALOGUES])
    console.log('CACHE dialogues: 무효화 요청 완료')
  }
  console.log(`${apply ? 'DONE' : 'DRY-RUN'} ${batch.batch}: ${changedPeople}명 · ${changedLines}줄`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
