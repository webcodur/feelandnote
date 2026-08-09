/**
 * 배우(actor) 개인 대사를 배역 오인 관점에서 감사하고 원문 스냅샷을 보존한다.
 *
 * 기본 실행은 읽기 전용이다. 저장 경로:
 *   docs/celeb-data/dialogue/actor-role-audit-2026-08-03/
 *
 * 실행:
 *   pnpm exec tsx scripts/audit-actor-role-dialogues.ts
 */

import { mkdir, writeFile } from 'node:fs/promises'
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
  'greeting',
  'roll_call',
  'deploy',
  'battle_win',
  'battle_draw',
  'battle_lose',
  'clash_attack',
] as const

type Situation = typeof SITUATIONS[number]
type Json = Record<string, unknown>

type ProfileRow = {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  profession: string | null
  title: string | null
  bio: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  publication_status: string | null
  celeb_tier: string | null
  speech_tone: string | null
}

type DialogueRow = {
  celeb_id: string
  lines: Json | null
  lines_en: Json | null
  updated_at?: string | null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function flat(value: string): string {
  return value.replaceAll('\t', ' ').replaceAll('\r', ' ').replaceAll('\n', ' ')
}

function splitTag(value: string): { tag: string; body: string } {
  const match = value.match(/^(\[[^\]]+\]\s*)/)
  if (!match) return { tag: '', body: value }
  return { tag: match[1], body: value.slice(match[1].length) }
}

async function main() {
  const { data: profiles, error: profileError } = await db
    .from('celebs')
    .select('id,slug,nickname,nickname_en,profession,title,bio,nationality,birth_date,death_date,publication_status,celeb_tier,speech_tone')
    .eq('profession', 'actor')
    .order('nickname')

  if (profileError) throw profileError
  const actorRows = (profiles ?? []) as ProfileRow[]
  const ids = actorRows.map(row => row.id)
  const dialogueRows: DialogueRow[] = []

  for (let offset = 0; offset < ids.length; offset += 200) {
    const chunk = ids.slice(offset, offset + 200)
    const { data, error } = await db
      .from('celeb_dialogues')
      .select('celeb_id,lines,lines_en,updated_at')
      .in('celeb_id', chunk)
    if (error) throw error
    dialogueRows.push(...((data ?? []) as DialogueRow[]))
  }

  const dialogueById = new Map(dialogueRows.map(row => [row.celeb_id, row]))
  const snapshot = actorRows.map(profile => ({
    profile,
    dialogue: dialogueById.get(profile.id) ?? null,
  }))

  const rows: string[] = [
    ['nickname', 'slug', 'celeb_id', 'situation', 'variant', 'emotion_tag', 'body', 'body_length'].join('\t'),
  ]
  let lineCount = 0
  let malformedCount = 0
  let missingCount = 0

  for (const { profile, dialogue } of snapshot) {
    const lines = dialogue?.lines ?? {}
    for (const situation of SITUATIONS) {
      const values = lines[situation]
      if (!Array.isArray(values) || values.length !== 3) malformedCount += 1
      for (let index = 0; index < 3; index += 1) {
        const value = Array.isArray(values) ? text(values[index]) : ''
        if (!value) missingCount += 1
        else lineCount += 1
        const { tag, body } = splitTag(value)
        rows.push([
          flat(profile.nickname ?? ''),
          flat(profile.slug ?? ''),
          profile.id,
          situation,
          String(index),
          flat(tag),
          flat(body),
          String([...body].length),
        ].join('\t'))
      }
    }
  }

  const quoteRows = snapshot.map(({ profile, dialogue }) => ({
    celeb_id: profile.id,
    slug: profile.slug,
    nickname: profile.nickname,
    quote: text(dialogue?.lines?.quote),
  }))

  const outputDir = path.resolve(
    process.cwd(),
    '../../docs/celeb-data/dialogue/actor-role-audit-2026-08-03',
  )
  await mkdir(outputDir, { recursive: true })
  await Promise.all([
    writeFile(path.join(outputDir, 'original-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8'),
    writeFile(path.join(outputDir, 'all-lines.tsv'), `${rows.join('\n')}\n`, 'utf8'),
    writeFile(path.join(outputDir, 'quotes.json'), `${JSON.stringify(quoteRows, null, 2)}\n`, 'utf8'),
  ])

  console.log(JSON.stringify({
    actorCount: actorRows.length,
    dialogueRowCount: dialogueRows.length,
    lineCount,
    expectedLineCount: actorRows.length * 21,
    missingCount,
    malformedSituationCount: malformedCount,
    quoteCount: quoteRows.filter(row => row.quote).length,
    outputDir,
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
