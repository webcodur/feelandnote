/**
 * Speech 파이프라인 1단계 — 대상 선별.
 *
 * 채울 사람을 고르고, 각자의 현재 `lines` 해시를 함께 찍어 둔다.
 * 3단계가 이 해시를 다시 계산해 대조하므로 여기 값은 참고용 스냅샷이다.
 *
 *   pnpm celeb:speech:1-targets --current-dialogue-batch --include-placeholders --include-quote-blanks \
 *     --out .tmp-celeb-fill/targets.json
 *
 * 전체 흐름은 docs/project/celeb/celeb-speech-pipeline.md 가 쥔다.
 * 이 파일은 작업 중 현재값 충돌을 막기 위한 임시 입력이다. DB 진행 원장으로 사용하지 않는다.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { NO_VERIFIED_QUOTE_KO, SPEECH_SITUATIONS, speechLinesSha256 } from '../../lib/celeb-speech-research'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_DB_API_URL
const key = process.env.DB_SECRET_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY 없음')

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
const DIALOGUE_KEYS = SPEECH_SITUATIONS

type Profile = {
  id: string
  slug: string
  nickname: string
  nickname_en: string | null
  title: string | null
  bio: string | null
  profession: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  celeb_tier: string
  publication_status: string
  speech_tone: string | null
}

type Dialogue = { celeb_id: string; lines: Record<string, unknown>; lines_en: Record<string, unknown> | null }

function argOf(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function completeKo(lines: Record<string, unknown>): boolean {
  return DIALOGUE_KEYS.every((key) => {
    const values = lines[key]
    return Array.isArray(values) && values.length === 3
      && values.every((value) => typeof value === 'string' && value.trim().length > 0)
  })
}

function emptyEn(lines: Record<string, unknown> | null): boolean {
  const value = lines ?? {}
  return DIALOGUE_KEYS.every((key) => {
    const values = value[key]
    return !Array.isArray(values) || values.length !== 3
      || values.every((item) => typeof item !== 'string' || item.trim().length === 0)
  })
}

async function allRows<T>(table: string, select: string, orderKey: string, pageSize = 200): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db.from(table).select(select).order(orderKey).range(from, from + pageSize - 1)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    const page = (data ?? []) as T[]
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

async function main() {
  const includeBatch = process.argv.includes('--current-dialogue-batch')
  const includePlaceholders = process.argv.includes('--include-placeholders')
  const includeQuoteBlanks = process.argv.includes('--include-quote-blanks')
  if (!includeBatch && !includePlaceholders && !includeQuoteBlanks) {
    throw new Error('--current-dialogue-batch, --include-placeholders, --include-quote-blanks 중 하나가 필요하다')
  }

  const [profiles, dialogues] = await Promise.all([
    allRows<Profile>(
      'celebs',
      'id,slug,nickname,nickname_en,title,bio,profession,nationality,birth_date,death_date,celeb_tier,publication_status,speech_tone',
      'id',
      1000,
    ),
    allRows<Dialogue>('celeb_dialogues', 'celeb_id,lines,lines_en', 'celeb_id'),
  ])
  const dialogueById = new Map(dialogues.map((row) => [row.celeb_id, row]))

  const people = profiles.flatMap((profile) => {
    const dialogue = dialogueById.get(profile.id)
    const lines = dialogue?.lines ?? {}
    const reasons: string[] = []
    if (
      includeBatch
      && (profile.celeb_tier === 'full' || profile.celeb_tier === 'light')
      && completeKo(lines)
      && emptyEn(dialogue?.lines_en ?? null)
    ) reasons.push('current-dialogue-batch')
    if (includePlaceholders && lines.quote === NO_VERIFIED_QUOTE_KO) reasons.push('placeholder-recheck')
    if (
      includeQuoteBlanks
      && (lines.quote === null || lines.quote === undefined || String(lines.quote).trim().length === 0)
    ) reasons.push('quote-blank')
    if (reasons.length === 0) return []
    return [{
      ...profile,
      targetReasons: reasons,
      expectedLinesSha256: speechLinesSha256(lines),
      lines,
      lines_en: dialogue?.lines_en ?? {},
    }]
  }).sort((a, b) => a.slug.localeCompare(b.slug))

  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    counts: {
      union: people.length,
      currentDialogueBatch: people.filter((person) => person.targetReasons.includes('current-dialogue-batch')).length,
      placeholderRecheck: people.filter((person) => person.targetReasons.includes('placeholder-recheck')).length,
      quoteBlank: people.filter((person) => person.targetReasons.includes('quote-blank')).length,
      multiReason: people.filter((person) => person.targetReasons.length > 1).length,
    },
    people,
  }

  const output = JSON.stringify(result, null, 2)
  const out = argOf('out')
  if (out) {
    const target = path.resolve(out)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, `${output}\n`, 'utf8')
    console.log(JSON.stringify({ out: target, counts: result.counts }, null, 2))
  } else {
    console.log(output)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
