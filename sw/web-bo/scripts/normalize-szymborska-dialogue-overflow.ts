/**
 * 비스와바 심보르스카의 greeting 5줄을 7상황×3 구조로 정규화한다.
 *
 * 기존 5줄 가운데 앞 3줄은 greeting으로 유지하고, 나머지 2줄은 삭제하지 않고
 * archived_greeting_overflow에 태그·본문 그대로 보존한다. 다른 18줄은 수정하지 않는다.
 *
 * 기본 dry-run:
 *   pnpm exec tsx scripts/normalize-szymborska-dialogue-overflow.ts
 * 실제 반영:
 *   pnpm exec tsx scripts/normalize-szymborska-dialogue-overflow.ts --apply
 */

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

const CELEB_ID = '8ec6b66b-79d3-4805-8b29-ad586f66b7a9'
const SLUG = 'wislawa-szymborska'

const CURRENT_KO = [
  "[composed, gentle] ''나는 모른다.'' 이것이 우리 언어에서 가장 중요한 말입니다.",
  '[composed, wry] 한 권의 무거운 책보다, 작은 책 백 권이 저에게는 더 가깝습니다.',
  "[composed, modest] 영감이란 무엇이냐 묻거든, 그저 ''잘 모르겠습니다''라고 답하지요.",
  '[composed, reflective] 시는 단 한 사람이 다른 한 사람에게 건네는 작은 신호일 뿐입니다.',
  '[composed, warm] 어느 책이든, 펼치는 순간 우리는 잠시 자기 자신을 벗어납니다.',
]

const CURRENT_EN = [
  "[composed, gentle] 'I don''t know' — these are the most important words in any language.",
  '[composed, wry] A hundred small books are closer to me than one heavy one.',
  "[composed, modest] If you ask what inspiration is, I can only answer: I''m not quite sure.",
  '[composed, reflective] A poem is only a small signal from one person to another.',
  '[composed, warm] Open any book, and for a moment we step outside ourselves.',
]

const SITUATIONS = [
  'greeting',
  'roll_call',
  'deploy',
  'battle_win',
  'battle_draw',
  'battle_lose',
  'clash_attack',
] as const

type DialogueRow = {
  celeb_id: string
  lines: unknown
  lines_en: unknown
  updated_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isTriple(value: unknown): value is [string, string, string] {
  return Array.isArray(value)
    && value.length === 3
    && value.every(line => typeof line === 'string' && line.trim())
}

function same(value: unknown, expected: unknown): boolean {
  return JSON.stringify(value) === JSON.stringify(expected)
}

function assertOtherSituationsComplete(lines: Record<string, unknown>, language: string) {
  for (const situation of SITUATIONS.filter(value => value !== 'greeting')) {
    if (!isTriple(lines[situation])) {
      throw new Error(`${language}.${situation}: 기존 3줄 구조가 아님`)
    }
  }
}

async function main() {
  const apply = process.argv.includes('--apply')

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, slug, nickname, nickname_en, birth_date, profession')
    .eq('id', CELEB_ID)
    .single()
  if (profileError) throw new Error(`프로필 조회 실패: ${profileError.message}`)
  if (profile.slug !== SLUG
    || profile.nickname !== '비스와바 심보르스카'
    || profile.nickname_en !== 'Wislawa Szymborska'
    || profile.birth_date !== '1923-07-02'
    || profile.profession !== 'author') {
    throw new Error(`동명이인 차단 실패: ${JSON.stringify(profile)}`)
  }

  const { data: factionRows, error: factionError } = await db
    .from('faction_people')
    .select('id, name')
    .eq('celeb_id', CELEB_ID)
  if (factionError) throw new Error(`팩션 출연 조회 실패: ${factionError.message}`)
  if ((factionRows ?? []).length) {
    throw new Error(`팩션 출연자 보호: ${(factionRows ?? []).map(row => row.name).join(', ')}`)
  }

  const { data, error } = await db
    .from('celeb_dialogues')
    .select('celeb_id, lines, lines_en, updated_at')
    .eq('celeb_id', CELEB_ID)
    .single()
  if (error) throw new Error(`대사 조회 실패: ${error.message}`)
  const dialogue = data as unknown as DialogueRow
  if (!isRecord(dialogue.lines) || !isRecord(dialogue.lines_en)) {
    throw new Error('lines / lines_en 객체 아님')
  }

  const alreadyDone = same(dialogue.lines.greeting, CURRENT_KO.slice(0, 3))
    && same(dialogue.lines_en.greeting, CURRENT_EN.slice(0, 3))
    && same(dialogue.lines.archived_greeting_overflow, CURRENT_KO.slice(3))
    && same(dialogue.lines_en.archived_greeting_overflow, CURRENT_EN.slice(3))
  if (alreadyDone) {
    assertOtherSituationsComplete(dialogue.lines, 'KO')
    assertOtherSituationsComplete(dialogue.lines_en, 'EN')
    console.log('SKIP 비스와바 심보르스카: greeting 3줄 + 보존 2줄 이미 일치')
    return
  }

  if (!same(dialogue.lines.greeting, CURRENT_KO) || !same(dialogue.lines_en.greeting, CURRENT_EN)) {
    throw new Error('현재 greeting 5줄이 예상 원문과 다름')
  }
  if (dialogue.lines.archived_greeting_overflow !== undefined
    || dialogue.lines_en.archived_greeting_overflow !== undefined) {
    throw new Error('기존 archived_greeting_overflow가 있어 덮어쓰기 차단')
  }
  assertOtherSituationsComplete(dialogue.lines, 'KO')
  assertOtherSituationsComplete(dialogue.lines_en, 'EN')

  console.log('PLAN 비스와바 심보르스카: greeting 5→3, 초과 2줄은 태그째 archive 보존')
  if (!apply) {
    console.log('DRY-RUN DB 쓰기 0건')
    return
  }

  const nextKo = {
    ...dialogue.lines,
    greeting: CURRENT_KO.slice(0, 3),
    archived_greeting_overflow: CURRENT_KO.slice(3),
  }
  const nextEn = {
    ...dialogue.lines_en,
    greeting: CURRENT_EN.slice(0, 3),
    archived_greeting_overflow: CURRENT_EN.slice(3),
  }
  const { data: changed, error: updateError } = await db
    .from('celeb_dialogues')
    .update({ lines: nextKo, lines_en: nextEn })
    .eq('celeb_id', CELEB_ID)
    .eq('updated_at', dialogue.updated_at)
    .select('lines, lines_en')
    .maybeSingle()
  if (updateError) throw new Error(`대사 갱신 실패: ${updateError.message}`)
  if (!changed) throw new Error('대사 갱신 충돌')
  if (!same(changed.lines.greeting, CURRENT_KO.slice(0, 3))
    || !same(changed.lines_en.greeting, CURRENT_EN.slice(0, 3))
    || !same(changed.lines.archived_greeting_overflow, CURRENT_KO.slice(3))
    || !same(changed.lines_en.archived_greeting_overflow, CURRENT_EN.slice(3))) {
    throw new Error('갱신 후 greeting·archive 검증 실패')
  }

  await revalidateWebCache(CACHE_TAGS.DIALOGUES)
  console.log('APPLIED 비스와바 심보르스카: 초과 2줄 삭제 없이 archive 보존')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
